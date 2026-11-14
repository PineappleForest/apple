// Our cast as lit flat sprites in the 3D world (template: canvas pool, cardShade cards, contact blobs, blinks).
// stage(id, t, cam) says who is where, in which pose and expression, for every shot of the ELIZA -> Feeloy short.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxPhone, fxShadow, fxContact, fxBadge, fxBubble, fxNote, fxSay, Outfit, Expr, FrontOpts, SideOpts, Prop, BubbleIcon,
  fxNope, fxPuff, fxAdvert, fxThing, Thing, fxMoneyBag, fxDummy, fxGnome, fxPubSign, fxBell } from "./toon";
import { FPS, SHOTS, V3, R, smooth, clamp01, G, STOOL1, STOOL2, POST1, BELL2, PUB, STOOL_H } from "./story";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null; front = false;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = this.front ? 10 : 0; }
  }
}

export type Stage = { places: Place[]; fx: FxPlace[] };
// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean;
  /** fixed Euler orientation (YXZ) instead of facing the camera; front = drawn last (phone insert) */
  orient?: [number, number, number]; front?: boolean; glow?: number };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3; quat?: THREE.Quaternion };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" | "night" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = {};
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden" | "night", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], night: [0.3, 0.3, 0.45] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};
// ======================= cast of "Lonely for Hire" =======================
const HAMILTON: Outfit = { jacket: "#3f6fb5", pants: "#e9dfc6", boots: "#1e1b22", hat: "tricorn", buttons: "#e8c45a", skin: "#f5d6be" };
const REM: Outfit = { jacket: "#8a6a4a", pants: "#8a6a4a", boots: "#6b4a33", hat: "hair", hair: "#6b4a2e", skin: "#f0c8a6" };
const REM_B: Outfit = { ...REM, longHair: "#6b4a2e", beard: "#6b4a2e" };
const FRANCIS: Outfit = { jacket: "#7a7a86", pants: "#7a7a86", boots: "#4a4650", hat: "hair", hair: "#ece9e2", longHair: "#ece9e2", beard: "#ece9e2", skin: "#f0cdb4" };
const LADY1: Outfit = { jacket: "#e88aa8", pants: "#e88aa8", boots: "#5a3b26", hat: "bonnet", hair: "#c98a4b", skin: "#f5d6be" };
const LADY2: Outfit = { jacket: "#9ac7e8", pants: "#9ac7e8", boots: "#5a3b26", hat: "bonnet", hair: "#3a2a22", skin: "#ecd0b6" };
const GENT: Outfit = { jacket: "#5a8a5a", pants: "#e9dfc6", boots: "#1e1b22", hat: "tricorn", buttons: "#e8c45a", moustache: "#8a5a34", skin: "#f5c9a0" };
const LOCAL1: Outfit = { jacket: "#c0392b", pants: "#3b3f52", boots: "#3a2a22", hat: "cap", cap: "#2f3f6a", skin: "#f5c9a0" };
const LOCAL2: Outfit = { jacket: "#e9dfc6", pants: "#5a4a3a", boots: "#3a2a22", hat: "hair", hair: "#3a2a22", moustache: "#3a2a22", build: "stout", skin: "#ecd0b6" };
const LONER: Outfit = { jacket: "#5a8fc2", pants: "#2f3a5a", boots: "#f4f1ea", hat: "hair", hair: "#2a2230", longHair: "#2a2230", skin: "#c99067" };
const OKEY = new Map<Outfit, string>();
const okeyOf = (o: Outfit) => { let k = OKEY.get(o); if (!k) { k = "o" + OKEY.size; OKEY.set(o, k); } return k; };

const SIT = 0.3;
const F = (t: number) => t * FPS;
const wob = (t: number, hz: number, ph = 0) => q(Math.sin(2 * Math.PI * hz * t + ph), 8);
const pop = (f: number, f0: number) => (f < f0 ? 0 : q(Math.min(1, smooth((f - f0) / 5) * 1.12 - 0.12 * smooth((f - f0 - 5) / 4)), 20));
const ramp = (f: number, f0: number, n: number) => q(smooth((f - f0) / n), 20);
const win = (f: number, a: number, b: number) => (f < a || f >= b ? 0 : pop(f, a));

type Act = { o: Outfit; i: number; at: V3; mode?: FrontOpts["mode"]; expr?: Expr; prop?: Prop; facing?: -1 | 0 | 1; look?: number; wave?: number;
  tilt?: number; headTilt?: number; phase?: number; scale?: number; shadow?: boolean; swaps?: number[]; nudge?: number; mirror?: boolean; seat?: number; sleep?: boolean };
const put = (cam: CamInfo, t: number, out: Stage, a: Act) => {
  const sitting = a.mode === "sit", y = a.at[1] + (sitting ? a.seat ?? SIT : 0), nd = a.nudge ?? (sitting ? 0.45 : 0);
  if (nd) {
    const dx = cam.pos.x - a.at[0], dz = cam.pos.z - a.at[2], l = Math.hypot(dx, dz) || 1;
    a = { ...a, at: [a.at[0] + (dx / l) * nd, a.at[1], a.at[2] + (dz / l) * nd] };
  }
  const blink = a.sleep ? 1 : lidAt(t, a.i, a.swaps ?? []);
  const fo: FrontOpts = { mode: a.mode ?? "stand", expr: a.expr ?? "neutral", prop: a.prop ?? null, facing: a.facing ?? 0, look: a.look ?? 0, blink,
    wave: a.wave, tilt: a.tilt ?? 0, headTilt: a.headTilt ?? 0, phase: a.phase ?? 0, lift: 30 };
  const pl = person(cam, { i: a.i, o: a.o, okey: okeyOf(a.o) }, a.at[0], y, a.at[2], { side: false, mirror: false }, fo, {}, a.scale ?? 1);
  if (a.mirror) pl.mirror = true;
  out.places.push(pl);
  if (a.shadow !== false) blob(out, a.at[0], a.at[1], a.at[2], (a.scale ?? 1) * (sitting ? 1.1 : 1), sitting ? 0.7 : 1);
};
const putSide = (cam: CamInfo, t: number, out: Stage, o: Outfit, i: number, at: V3, so: SideOpts, left = false, scale = 1) => {
  const pl = person(cam, { i, o, okey: okeyOf(o) }, at[0], at[1], at[2], { side: true, mirror: left }, {}, { ...so, blink: lidAt(t, i) }, scale);
  out.places.push(pl); blob(out, at[0], at[1], at[2], scale);
};
const card = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, h: number, fixed = false, glow?: number, soft?: boolean) =>
  out.fx.push({ key, cw, ch, draw, x: at[0], y: at[1], z: at[2], w, h, orient: fixed ? [0, 0, 0] : undefined, glow, soft });
const bubble = (out: Stage, icon: BubbleIcon, k: number, at: V3, w = 0.46) => { if (k > 0) card(out, `bub|${icon}|${k}`, 500, 420, (p) => fxBubble(p, icon, k), at, w, w * 0.84); };
const badge = (out: Stage, word: string, colr: string, k: number, at: V3, w = 0.9) => { if (k > 0) card(out, `badge|${word}|${colr}`, 520, 180, (p) => fxBadge(p, word, colr), at, w * k, w * 0.346 * k); };
const nope = (out: Stage, word: string, k: number, strike: number, at: V3, w = 0.8) => { if (k > 0) card(out, `nope|${word}|${q(strike, 12)}`, 520, 180, (p) => fxNope(p, word, q(strike, 12)), at, w * k, w * 0.346 * k); };
let camLook: V3 = [0, 0, 0];
const stand = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, sole: number, k = 1, glow?: number) => {
  if (k <= 0) return; const h = (w * ch) / cw;
  card(out, key, cw, ch, draw, [at[0], at[1] + h * k * (sole - 0.5), at[2]], w * k, h * k, false, glow);
};
const BLUE = "#3f6fb5";
const ST1 = G(STOOL1[0], 0, STOOL1[1]), ST2 = G(STOOL2[0], 0, STOOL2[1]);
const hermitOnStool = (cam: CamInfo, t: number, out: Stage, o: Outfit, i: number, st: V3, expr: Expr, swaps: number[] = []) =>
  put(cam, t, out, { o, i, at: st, mode: "sit", seat: STOOL_H, nudge: 0.24, expr, swaps });
const purse = (out: Stage, label: string, at: V3, w: number, k: number) => stand(out, `bag|${label}`, 360, 400, (p) => fxMoneyBag(p, label), at, w, 0.95, k);
const puff = (out: Stage, f: number, f0: number, at: V3, w = 0.6) => { const u = (f - f0) / 14; if (u >= 0 && u < 1) card(out, `puff|${q(u, 14)}`, 300, 300, (p) => fxPuff(p, q(u, 14)), at, w, w); };

// 1: the hook: a) wide over the park to the hermitage (1700s); b) a gentleman paying a man to be lonely
const shot1 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  hermitOnStool(cam, t, out, REM_B, 1, ST1, f >= 96 ? "sad" : "neutral", [96 / FPS]);
  if (f < 90) { badge(out, "1700s", BLUE, pop(f, 12), G(0.4, 4.2, -2.6), 2.6); return; }
  put(cam, t, out, { o: HAMILTON, i: 2, at: G(-0.45, 0, -1.3), facing: 1, look: 1, expr: "grin" });
  purse(out, "£", G(0.2, 0.62, -1.35), 0.36, pop(f, 94));
};
// 2: the fashion: guests gawk at the hermit
const shot2 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), gawk = f >= 279;
  hermitOnStool(cam, t, out, REM_B, 1, ST1, gawk ? "nervous" : "sad", [279 / FPS]);
  put(cam, t, out, { o: LADY1, i: 3, at: G(-0.55, 0, -0.3), facing: 1, look: 1, expr: gawk ? "laugh" : "grin", prop: gawk ? ["point", 1] : null, swaps: [279 / FPS] });
  put(cam, t, out, { o: GENT, i: 4, at: G(-1.05, 0, -1.0), facing: 1, look: 1, expr: gawk ? "laugh" : "smile", swaps: [279 / FPS] });
  put(cam, t, out, { o: LADY2, i: 5, at: G(1.75, 0, -0.6), facing: -1, look: -1, expr: gawk ? "shock" : "smile", swaps: [279 / FPS] });
};
// 3: Hamilton pins up his job advert at Painshill
const shot3 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  put(cam, t, out, { o: HAMILTON, i: 2, at: G(-0.55, 0, -1.55), facing: -1, look: -1, expr: f >= 381 ? "stern" : "grin", prop: ["point", ramp(f, 348, 8)], swaps: [381 / FPS] });
  const k = pop(f, 342);
  if (k > 0) card(out, "advert", 500, 640, (p) => fxAdvert(p), G(POST1[0], 1.5, POST1[1] + 0.1), 0.52 * k, 0.666 * k, true);
  badge(out, "PAINSHILL", BLUE, pop(f, 356), G(-0.95, 2.45, -1.9), 0.95);
};
// 4: the rules, close on the applicant
const shot4 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), beard = f >= 505, at = G(0.3, 0, -1.2);
  const ex: Expr = f >= 553 ? "sad" : beard ? "dazed" : f >= 441 ? "nervous" : "neutral";
  put(cam, t, out, { o: beard ? REM_B : REM, i: 1, at, expr: ex, swaps: [441 / FPS, 505 / FPS, 553 / FPS] });
  puff(out, f, 503, G(0.3, 1.55, -1.0), 0.7);
  badge(out, "7 YEARS", BLUE, win(f, 405, 440), G(-0.1, 2.2, -1.1), 0.6);
  nope(out, "TALK", win(f, 440, 476), ramp(f, 446, 8), G(0.72, 2.05, -1.1), 0.5);
  nope(out, "BARBER", win(f, 476, 552), ramp(f, 484, 8), G(0.22, 2.25, -1.1), 0.55);
  nope(out, "LEAVE", pop(f, 552), ramp(f, 560, 8), G(0.72, 2.0, -1.1), 0.5);
};
// 5: the kit on the grass in front of him
const KIT: [Thing, number, number, number][] = [["mat", 0.9, -0.85, 660], ["bible", 0.42, -0.95, 620], ["glasses", 0.66, -0.75, 634], ["hourglass", 1.14, -0.9, 682], ["jug", 1.38, -0.8, 712]];
const shot5 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  hermitOnStool(cam, t, out, REM_B, 1, ST1, f >= 712 ? "nervous" : "neutral", [712 / FPS]);
  for (const [k, x, z, f0] of KIT) stand(out, `thing|${k}`, 300, 300, (p) => fxThing(p, k), G(x, 0, z), k === "mat" ? 0.5 : 0.24, 0.94, pop(f, f0));
};
// 6: £700 if he lasts seven years; nothing if he quits
const shot6 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), gone = f >= 868;
  put(cam, t, out, { o: HAMILTON, i: 2, at: G(-0.45, 0, -1.4), facing: 1, look: 1, expr: f >= 840 ? "stern" : "grin", swaps: [840 / FPS] });
  put(cam, t, out, { o: REM_B, i: 1, at: G(0.95, 0, -1.7), facing: -1, look: -1, expr: gone ? "sad" : f >= 798 ? "grin" : "neutral", swaps: [798 / FPS, 868 / FPS] });
  if (!gone) purse(out, "£700", G(0.18, 0.62, -1.2), 0.44, pop(f, 796));
  puff(out, f, 866, G(0.18, 1.0, -1.15), 0.7);
};
// 7: Remington takes the job
const shot7 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  hermitOnStool(cam, t, out, REM_B, 1, ST1, "grin");
  badge(out, "REMINGTON", BLUE, pop(f, 925), G(0.9, 2.0, -1.8), 0.95);
};
// 8: three weeks later: the stool is empty
const shot8 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  badge(out, "3 WEEKS LATER", BLUE, pop(f, 978), G(0.5, 2.4, -2.0), 1.25);
  put(cam, t, out, { o: HAMILTON, i: 2, at: G(-0.15, 0, -1.0), facing: 1, look: 1, expr: f >= 1000 ? "dazed" : "neutral", swaps: [1000 / FPS] });
  if (f >= 1004) bubble(out, "ask", pop(f, 1004), G(-0.15, 2.35, -0.9), 0.42);
};
// 9: found drinking in the local pub; loneliness is a terrible job
const shot9 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  if (f < 1095) {
    put(cam, t, out, { o: REM_B, i: 1, at: R("pub", -0.1, 0, -0.85), expr: "laugh", prop: "mug", tilt: 4 * wob(t, 1) });
    put(cam, t, out, { o: HAMILTON, i: 2, at: R("pub", -1.2, 0, 0.5), facing: 1, look: 1, expr: f >= 1040 ? "shock" : "neutral", swaps: [1040 / FPS] });
    return;
  }
  const cheer = f >= 1150;
  put(cam, t, out, { o: REM_B, i: 1, at: R("pub", 0.25, 0, -0.85), expr: "laugh", prop: "mug", tilt: 5 * wob(t, 1.2) });
  put(cam, t, out, { o: LOCAL1, i: 6, at: R("pub", -0.7, 0, -0.65), facing: 1, look: 1, expr: cheer ? "laugh" : "grin", prop: "mug", swaps: [1150 / FPS] });
  put(cam, t, out, { o: LOCAL2, i: 7, at: R("pub", 1.2, 0, -0.5), facing: -1, look: -1, expr: cheer ? "laugh" : "grin", prop: "mug", swaps: [1150 / FPS] });
};
// 10: Hawkstone: the hermit is so popular there's a queue (and a bell)
const QUEUE: [Outfit, number, number, number, number][] = [[LADY1, 3, 39.45, -0.9, 0], [GENT, 4, 38.65, -0.4, 0], [LADY2, 5, 37.85, 0.1, 0],
  [LOCAL1, 6, 37.05, 0.6, 1238], [LOCAL2, 7, 36.25, 1.1, 1244]]; // the queue runs off to the left
const shot10 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  hermitOnStool(cam, t, out, FRANCIS, 8, ST2, "smile");
  const ring = f >= 1196 && f < 1222 ? (f - 1196) / 26 + 0.01 : 0;
  stand(out, `bell|${q(ring, 26)}`, 200, 500, (p) => fxBell(p, q(ring, 26)), G(BELL2[0], 0, BELL2[1]), 0.36, 0.98);
  for (const [o, i, x, z, f0] of QUEUE) { if (f < f0) continue; put(cam, t, out, { o, i, at: G(x, 0, z), facing: 1, look: 1, expr: "grin" }); }
};
// 11: ...so they built a pub for his visitors
const shot11 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), k = pop(f, 1286);
  if (k > 0) card(out, "pubsign", 520, 420, (p) => fxPubSign(p, "HAWKSTONE", "ARMS"), G(PUB[0] - 1.9, 3.1, PUB[1] + 2.8), 1.7 * k, 1.37 * k, true);
  ([[LADY1, 3, 50.7, -7.4], [GENT, 4, 52.3, -7.0], [LOCAL2, 7, 53.7, -7.6]] as [Outfit, number, number, number][]).forEach(([o, i, x, z]) =>
    put(cam, t, out, { o, i, at: G(x, 0, z), expr: "laugh", prop: "mug" }));
};
// 12: off duty: the hermit leaves, a dummy takes his stool, nobody notices
const shot12 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  if (f < 1352) hermitOnStool(cam, t, out, FRANCIS, 8, ST2, f >= 1340 ? "whistle" : "smile");
  else if (f < 1398) { const u = (f - 1352) / 44; putSide(cam, t, out, FRANCIS, 8, G(41.2 + 2.6 * u, 0, -1.6), { mode: "march", phase: (t * 2) % 1, stride: 0.9, expr: "whistle" }); }
  stand(out, "dummy", 400, 700, (p) => fxDummy(p), G(STOOL2[0], STOOL_H, STOOL2[1] + 0.1), 0.75, 0.914, pop(f, 1398));
  put(cam, t, out, { o: LADY1, i: 3, at: G(39.45, 0, -0.9), facing: 1, look: 1, expr: f >= 1412 ? "laugh" : "grin", swaps: [1412 / FPS] });
  put(cam, t, out, { o: GENT, i: 4, at: G(38.65, 0, -0.4), facing: 1, look: 1, expr: "grin" });
};
// 13: today: the garden gnome does the job, for free
const shot13 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), blink = f >= 1480 && f < 1484 ? 1 : 0;
  stand(out, `gnome|${blink}`, 300, 520, (p) => fxGnome(p, blink), G(STOOL1[0], STOOL_H, STOOL1[1] + 0.05), 0.34, 0.96);
  badge(out, "TODAY", BLUE, pop(f, 1446), G(0.9, 1.5, -1.9), 0.62);
  badge(out, "£0", "#2f6a3a", pop(f, 1515), G(1.3, 1.15, -1.85), 0.55);
};
// 14: a quiet flat today; Jenny; end card
const shot14 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  if (f < 1601) {
    put(cam, t, out, { o: LONER, i: 14, at: R("homeN", -0.4, 0, -1.75), mode: "sit", seat: 0.42, prop: "phone", shadow: false, expr: "sad" });
    bubble(out, "dots", pop(f, 1566), R("homeN", 0.2, 1.75, -1.6), 0.42);
    return;
  }
  const pose = f >= 1618 && f < 1650 ? "wave" : f >= 1655 && f < 1700 ? "listen" : "smile";
  const [icon, f0]: [BubbleIcon, number] = f >= 1676 ? ["heart", 1676] : ["dots", 99999];
  const bb = f >= f0 ? q(smooth((f - f0) / 6), 8) : 0;
  const blink = lidAt(t, 9) >= 1 ? 1 : 0, wv = pose === "wave" ? wob(t, 2.2) : 0;
  out.fx.push({ key: `phone|${pose}|${blink}|${wv}|${bb}|${icon}`, cw: 500, ch: 1000, draw: (p) => fxPhone(p, pose, blink, wv, bb, icon, "9:41"),
    x: camLook[0], y: camLook[1] - 0.005, z: camLook[2], w: 0.139, h: 0.278, rot: 0.025, front: true });
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  if (cam.quat) { const fw = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quat); camLook = [cam.pos.x + fw.x * 0.45, cam.pos.y + fw.y * 0.45, cam.pos.z + fw.z * 0.45]; }
  const SH = [shot1, shot2, shot3, shot4, shot5, shot6, shot7, shot8, shot9, shot10, shot11, shot12, shot13, shot14];
  SH[id - 1]?.(cam, t, out);
  return out;
};
export { FPS };
