// Our cast as lit flat sprites in the 3D world (template: canvas pool, cardShade cards, contact blobs, blinks).
// stage(id, t, cam) says who is where, in which pose and expression, for every shot of the ELIZA -> Feeloy short.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxPhone, fxShadow, fxContact, fxBadge, fxBubble, fxNote, fxSay, Outfit, Expr, FrontOpts, SideOpts, Prop, BubbleIcon,
  fxZzz, fxNope, fxCalendar, fxBanner, fxConfetti, fxPlate, fxFieldPhone, fxHandset, fxStopwatch, fxDate, fxLantern, fxBottle } from "./toon";
import { FPS, SHOTS, V3, R, smooth, clamp01, G, C, TABLE, TENT, LADDER_X, climbY, SAME } from "./story";
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
// ======================= cast of "Three Days Late" =======================
const SIFFRE: Outfit = { jacket: "#c0392b", pants: "#3b3f52", boots: "#3a2a22", hat: "helmet", cap: "#f2c94c", skin: "#f5d6be" };
const OLD_SIFFRE: Outfit = { jacket: "#2f6a8a", pants: "#3b3f52", boots: "#3a2a22", hat: "party", hair: "#ece9e2", beard: "#ece9e2", glasses: true, skin: "#f0cdb4" };
const TEAM1: Outfit = { jacket: "#e9dfc6", pants: "#5a4a3a", boots: "#3a2a22", hat: "hair", hair: "#3a2a22", glasses: true, skin: "#f5c9a0" };
const TEAM2: Outfit = { jacket: "#5a8fc2", pants: "#2f3a5a", boots: "#3a2a22", hat: "hair", hair: "#c98a4b", moustache: "#8a5a34", skin: "#ecd0b6" };
const LONER: Outfit = { jacket: "#5a8fc2", pants: "#2f3a5a", boots: "#f4f1ea", hat: "hair", hair: "#2a2230", longHair: "#2a2230", skin: "#c99067" };
const OKEY = new Map<Outfit, string>();
const okeyOf = (o: Outfit) => { let k = OKEY.get(o); if (!k) { k = "o" + OKEY.size; OKEY.set(o, k); } return k; };

const SIT = 0.3;
const F = (t: number) => t * FPS;
const wob = (t: number, hz: number, ph = 0) => q(Math.sin(2 * Math.PI * hz * t + ph), 8);
const pop = (f: number, f0: number) => (f < f0 ? 0 : q(Math.min(1, smooth((f - f0) / 5) * 1.12 - 0.12 * smooth((f - f0 - 5) / 4)), 20));
const ramp = (f: number, f0: number, n: number) => q(smooth((f - f0) / n), 20);

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
const card = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, h: number, fixed = false, glow?: number, soft?: boolean) =>
  out.fx.push({ key, cw, ch, draw, x: at[0], y: at[1], z: at[2], w, h, orient: fixed ? [0, 0, 0] : undefined, glow, soft });
const bubble = (out: Stage, icon: BubbleIcon, k: number, at: V3, w = 0.46) => { if (k > 0) card(out, `bub|${icon}|${k}`, 500, 420, (p) => fxBubble(p, icon, k), at, w, w * 0.84); };
const badge = (out: Stage, word: string, colr: string, k: number, at: V3, w = 0.9) => { if (k > 0) card(out, `badge|${word}|${colr}`, 520, 180, (p) => fxBadge(p, word, colr), at, w * k, w * 0.346 * k); };
const say = (out: Stage, word: string, k: number, at: V3, w = 0.8) => { if (k > 0) card(out, `say|${word}|${k}`, 520, 300, (p) => fxSay(p, word, k), at, w, w * 0.577); };
const nope = (out: Stage, word: string, k: number, strike: number, at: V3, w = 0.8) => { if (k > 0) card(out, `nope|${word}|${q(strike, 12)}`, 520, 180, (p) => fxNope(p, word, q(strike, 12)), at, w * k, w * 0.346 * k); };
let camLook: V3 = [0, 0, 0];
/** a card standing on a surface at height y0: sole = fraction of the card height where its base is */
const stand = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, sole: number, k = 1, glow?: number) => {
  if (k <= 0) return; const h = (w * ch) / cw;
  card(out, key, cw, ch, draw, [at[0], at[1] + h * k * (sole - 0.5), at[2]], w * k, h * k, false, glow);
};
const lantern = (out: Stage) => stand(out, "lantern", 200, 300, (p) => fxLantern(p), C(TABLE[0] + 0.38, 0.72, TABLE[1] - 0.1), 0.22, 0.933, 1, 1.6);
const phone = (out: Stage, ring = 0, off = false) => stand(out, `fphone|${q(ring, 30)}|${off}`, 400, 360, (p) => fxFieldPhone(p, q(ring, 30), off), C(TABLE[0] - 0.35, 0.72, TABLE[1] - 0.05), 0.4, 0.972);
const handset = (out: Stage, at: V3, headY: number, side = 1, k = 1) => { if (k > 0) card(out, "handset", 300, 160, (p) => fxHandset(p), [at[0] + 0.25 * side, at[1] + headY, at[2] + 0.06], 0.3 * k, 0.16 * k); };
const camp = (out: Stage) => { lantern(out); };
const HEAD = 1.5, HEAD_SIT = 1.08; // handset heights above the soles (standing / sitting on the stool)
const STOOL = C(TABLE[0] - 0.2, 0, TABLE[1] + 0.75);

// 1: the hook: alone at the camp table in the cave; then the month flies off the calendar
const shot1 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  camp(out); phone(out);
  put(cam, t, out, { o: SIFFRE, i: 1, at: STOOL, mode: "sit", seat: 0.45, nudge: 0.24, expr: f >= 140 ? "dazed" : f >= 72 ? "sad" : "neutral", headTilt: f >= 72 && f < 140 ? -5 : 0, swaps: [72 / FPS, 140 / FPS] });
  badge(out, "1962", "#3f6fb5", pop(f, 10), [STOOL[0], STOOL[1] + 2.25, STOOL[2]], 0.8);
  if (f >= 122) { // the calendar on the crate, its pages tearing off and flying past him
    const base = C(-0.35, 0.45, -3.4);
    stand(out, "cal|JULY", 300, 360, (p) => fxCalendar(p, "JULY"), base, 0.42, 0.96);
    for (let k = 0; k < 7; k++) { const f0 = 131 + k * 5, u = clamp01((f - f0) / 26); if (f < f0 || u >= 1) continue;
      const a = k * 2.1; card(out, `cal|AUG|${k % 2}`, 300, 360, (p) => fxCalendar(p, k % 2 ? "AUG" : "SEPT"), [base[0] + 1.6 * u * Math.cos(a) + 0.3 * u, base[1] + 0.25 + 1.7 * u, base[2] + 1.8 * u], 0.3, 0.36); }
  }
};
// 2: outside at the cave mouth: Michel Siffre, 23
const shot2 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  put(cam, t, out, { o: SIFFRE, i: 1, at: G(0.55, 0, -1.4), expr: "grin", wave: f < 230 ? wob(t, 1.6) : undefined });
  put(cam, t, out, { o: TEAM1, i: 2, at: G(-0.75, 0, -2.3), facing: 1, look: 1, prop: "clipboard", expr: "smile" });
  badge(out, "AGE 23", "#3f6fb5", pop(f, 216), G(0.55, 2.5, -1.3), 0.8);
};
// 3: down the shaft on the rope ladder, 130 m, into the ice cave
const shot3 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), y = climbY(f);
  put(cam, t, out, { o: SIFFRE, i: 1, at: C(LADDER_X + 0.28, y, 0.0), facing: 1, look: 1, expr: f >= 330 ? "grin" : "nervous", shadow: y < 0.05, swaps: [330 / FPS] });
  badge(out, "130 m", "#3f6fb5", pop(f, 287), C(LADDER_X + 0.4, y + 2.4, 0.1), 0.7);
  if (f >= 318) { camp(out); phone(out); }
};
// 4: no watch, no sunlight; just a tent, and a phone to the surface
const shot4 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  camp(out); phone(out);
  if (f < 432) {
    put(cam, t, out, { o: SIFFRE, i: 1, at: C(0.25, 0, -2.0), expr: f >= 398 ? "dazed" : "nervous", headTilt: f >= 398 ? 8 : 0, swaps: [398 / FPS] });
    nope(out, "WATCH", pop(f, 368), ramp(f, 374, 10), C(-0.02, 2.25, -1.9), 0.5);
    nope(out, "SUN", pop(f, 399), ramp(f, 405, 10), C(0.55, 2.02, -1.9), 0.46);
  }
};
// 5: he called: woke / ate / slept
const shot5 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  camp(out); phone(out, 0, true);
  if (f < 580) { const at = C(3.4, 0, -2.9), call = f >= 548;
    put(cam, t, out, { o: SIFFRE, i: 1, at, expr: call ? "smile" : "dazed", wave: !call ? wob(t, 0.5) * 0.4 + 0.6 : undefined, swaps: [548 / FPS] });
    handset(out, at, HEAD, 1, pop(f, 548));
  } else if (f < 643) {
    put(cam, t, out, { o: SIFFRE, i: 1, at: STOOL, mode: "sit", seat: 0.45, nudge: 0.24, expr: f >= 612 ? "smile" : "grin", swaps: [612 / FPS] });
    stand(out, "plate", 320, 200, (p) => fxPlate(p), C(TABLE[0] + 0.1, 0.72, TABLE[1] + 0.25), 0.3, 0.9);
    handset(out, [STOOL[0] + 0.05, STOOL[1], STOOL[2] + 0.05], 0.45 + HEAD_SIT, 1, pop(f, 612));
  } else { const at = C(3.75, 0, -3.15), sleep = f >= 700;
    put(cam, t, out, { o: SIFFRE, i: 1, at, mode: "sit", seat: 0.05, nudge: 0.1, sleep, expr: sleep ? "smile_closed" : "dazed", swaps: [700 / FPS] });
    if (!sleep) handset(out, [at[0] + 0.1, at[1], at[2] + 0.1], 0.05 + HEAD_SIT, 1, pop(f, 684));
    else card(out, `zzz|${q(t % 1, 12)}`, 300, 300, (p) => fxZzz(p, q(t % 1, 12)), [at[0] + 0.4, at[1] + 1.6, at[2] + 0.1], 0.36, 0.36);
  }
};
// 6: the surface hut: the team writes it all down, and covers the clock
const shot6 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), at1 = R("hq", -0.75, 0, -0.55);
  put(cam, t, out, { o: TEAM1, i: 2, at: at1, mode: "sit", seat: 0.5, expr: "smile" });
  handset(out, [at1[0] + 0.05, at1[1], at1[2] + 0.1], 0.5 + HEAD_SIT, 1);
  put(cam, t, out, { o: TEAM2, i: 3, at: R("hq", 0.45, 0, -1.0), facing: -1, look: -1, prop: "clipboard", expr: f >= 780 ? "grin" : "neutral", swaps: [780 / FPS] });
  const k = pop(f, 784);
  if (k > 0) card(out, "cloth", 300, 300, (p) => { p.poly([[20, 40], [280, 30], [262, 290], [150, 270], [40, 292]], "#e2563f", 10); p.stroke([[80, 60], [70, 270]], 6, "#b8423a"); p.stroke([[200, 50], [214, 260]], 6, "#b8423a"); },
    R("hq", -0.7, 1.9, -2.42), 0.62 * k, 0.62 * k, true);
};
// 7: counting to 120, one per second (slowly)
const shot7 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), n = Math.max(1, Math.min(9, 1 + Math.floor((f - 846) / 13)));
  camp(out); phone(out);
  put(cam, t, out, { o: SIFFRE, i: 1, at: C(0.35, 0, -2.4), expr: n % 2 ? "whistle" : "neutral", look: 1 });
  if (f >= 846) say(out, String(n), 1, C(0.72, 1.95, -2.3), 0.48);
};
// 8: ...it took him five minutes (the team's stopwatch)
const shot8 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), at = R("hq", -0.45, 0, -1.6);
  put(cam, t, out, { o: TEAM2, i: 3, at, expr: f >= 960 ? "shock" : "neutral", swaps: [960 / FPS] });
  const txt = f >= 960 ? "5:00" : f >= 952 ? "4:58" : "4:51";
  card(out, `stopwatch|${txt}`, 300, 360, (p) => fxStopwatch(p, txt), [at[0] + 0.22, at[1] + 1.32, at[2] + 0.3], 0.36, 0.43);
};
// 9: the phone rings: the experiment is over
const shot9 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), up = f >= 1040, ring = f >= 1012 && !up ? ((f - 1012) / 30) % 1 + 0.01 : 0;
  camp(out); phone(out, ring, up);
  const at = C(1.45, 0, -2.2);
  put(cam, t, out, { o: SIFFRE, i: 1, at, facing: -1, look: -1, expr: f >= 1068 ? "relief_open" : f >= 1020 ? "shock" : "neutral", swaps: [1020 / FPS, 1068 / FPS] });
  handset(out, at, HEAD, -1, pop(f, 1040));
};
// 10: the team holds up the date: September 14
const shot10 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), at = R("hq", 0.25, 0, -1.55);
  put(cam, t, out, { o: TEAM1, i: 2, at, expr: "grin" });
  handset(out, at, HEAD, -1);
  const k = pop(f, 1104);
  if (k > 0) card(out, "date|SEPT|14", 300, 360, (p) => fxDate(p, "SEPT", "14"), [at[0] + 0.42, at[1] + 1.55, at[2] + 0.2], 0.42 * k, 0.5 * k);
};
// 11: he thought it was August 20; 25 days fly off
const shot11 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  camp(out); phone(out, 0, true);
  const at = C(0.35, 0, -2.4);
  put(cam, t, out, { o: SIFFRE, i: 1, at, expr: f >= 1226 ? "shock" : "smile", swaps: [1226 / FPS] });
  handset(out, at, HEAD, 1, f < 1226 ? 1 : 0);
  const th: V3 = C(-0.05, 2.25, -2.3), k = pop(f, 1188);
  if (k > 0) { for (const [dx, dy, s] of [[0.35, -0.42, 0.05], [0.22, -0.3, 0.07]]) card(out, "thdot", 100, 100, (p) => p.ell(50, 50, 40, 40, "#ffffff", 8), [th[0] + dx, th[1] + dy, th[2]], s, s);
    card(out, "date|AUG|20", 300, 360, (p) => fxDate(p, "AUG", "20", "#3f6fb5"), th, 0.42 * k, 0.5 * k); }
  for (let i = 0; i < 25; i++) { const f0 = 1236 + i * 2, u = clamp01((f - f0) / 22); if (f < f0 || u >= 1) continue;
    const a = i * 2.4, day = String(21 + (i % 10)), mo = i < 11 ? "AUG" : "SEPT";
    card(out, `date|${mo}|${day}`, 300, 360, (p) => fxDate(p, mo, day, "#3f6fb5"), [th[0] + 1.3 * u * Math.cos(a), th[1] + 0.9 * u * Math.sin(a) + 0.5 * u, th[2] + 0.6 * u], 0.2, 0.24); }
};
// 12: alone, nothing marks the time; the same day three times
const shot12 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  camp(out); phone(out);
  if (f < SAME[0]) { put(cam, t, out, { o: SIFFRE, i: 1, at: STOOL, mode: "sit", seat: 0.45, nudge: 0.24, expr: "sad" }); return; }
  const s0 = SAME.filter((s) => f >= s).pop()!, tt = 12.3 + (f - s0) / FPS; // identical each time
  put(cam, tt, out, { o: SIFFRE, i: 1, at: STOOL, mode: "sit", seat: 0.45, nudge: 0.24, expr: "neutral" });
  stand(out, "plate", 320, 200, (p) => fxPlate(p), C(TABLE[0] + 0.1, 0.72, TABLE[1] + 0.25), 0.3, 0.9);
};
// 13: 1999: back underground to welcome the year 2000; three days late
const shot13 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), at = C(0.3, 0, -2.3);
  camp(out);
  const late = f >= 1632;
  put(cam, t, out, { o: OLD_SIFFRE, i: 5, at, expr: late ? "nervous" : f >= 1598 ? "laugh" : "grin", headTilt: late ? -5 : 0, swaps: [1598 / FPS, 1632 / FPS] });
  badge(out, "1999", "#3f6fb5", pop(f, 1458), C(0.9, 2.0, -2.2), 0.55);
  const kb = pop(f, 1548);
  if (kb > 0) card(out, "banner|2000", 900, 200, (p) => fxBanner(p, "HAPPY 2000!", "#7b5ac9"), C(0.45, 2.55, -4.3), 1.2 * kb, 0.267 * kb, true);
  stand(out, `bottle|${ramp(f, 1598, 8)}`, 200, 420, (p) => fxBottle(p, ramp(f, 1598, 8)), C(0.85, 0.72, -2.55), 0.16, 0.976, pop(f, 1585));
  if (f >= 1598 && f < 1650) { const k = q((f - 1598) / 52, 26); card(out, `confetti|${k}`, 600, 600, (p) => fxConfetti(p, k), C(0.4, 1.9, -2.0), 1.6, 1.6); }
  const kd = pop(f, 1620);
  if (kd > 0) card(out, "date|JAN|3", 300, 360, (p) => fxDate(p, "JAN", "3"), C(0.95, 1.62, -1.9), 0.42 * kd, 0.5 * kd);
};
// 14: a quiet flat today; the days blur on the wall calendar; Jenny; end card
const shot14 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  if (f < 1716) {
    put(cam, t, out, { o: LONER, i: 14, at: R("homeN", -0.4, 0, -1.75), mode: "sit", seat: 0.42, prop: "phone", shadow: false, expr: "sad" });
    const d = String(1 + (Math.floor(f / 3) % 28));
    card(out, `wcal|${d}`, 300, 360, (p) => fxDate(p, "DAY", d, "#5a8fc2"), R("homeN", -1.0, 1.45, -2.46), 0.36, 0.43, true);
    bubble(out, "dots", pop(f, 1680), R("homeN", 0.2, 1.75, -1.6), 0.42);
    return;
  }
  const pose = f >= 1726 && f < 1760 ? "wave" : f >= 1772 && f < 1808 ? "ask" : "smile";
  const [icon, f0]: [BubbleIcon, number] = f >= 1814 ? ["heart", 1814] : ["dots", 99999];
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
