// Our cast as lit flat sprites in the 3D world (template: canvas pool, cardShade cards, contact blobs, blinks).
// stage(id, t, cam) says who is where, in which pose and expression, for every shot of the ELIZA -> Feeloy short.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxPhone, fxShadow, fxContact, fxBadge, fxBubble, fxNote, fxSay, Outfit, Expr, FrontOpts, SideOpts, Prop, BubbleIcon,
  fxGreyhound, HoundPose, fxCoffin, fxRoute, fxPotato, fxKingSlab } from "./toon";
import { FPS, SHOTS, V3, R, smooth, clamp01, G, KING_PLOT, DOGS_GRAVES } from "./story";
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
// ======================= cast of "Worth the Wait" =======================
const FRED: Outfit = { jacket: "#2f4a7a", pants: "#e9dfc6", boots: "#1e1b22", hat: "tricorn", hair: "#d8d6d0", longHair: "#d8d6d0", collar: "#fbf8f0", buttons: "#e8c45a", skin: "#f2cdb0" };
const NEPHEW: Outfit = { jacket: "#2f4a7a", pants: "#fbf8f0", boots: "#1e1b22", hat: "tricorn", hair: "#ece9e2", longHair: "#ece9e2", collar: "#fbf8f0", buttons: "#e8c45a", sash: "#e8892e", skin: "#f5c9a0" };
const COURTIER: Outfit = { jacket: "#7a5aa0", pants: "#e9dfc6", boots: "#3a2a22", hat: "hair", hair: "#ece9e2", longHair: "#ece9e2", collar: "#fbf8f0", skin: "#f5d6be" };
const MOURN1: Outfit = { jacket: "#2b2f3a", pants: "#2b2f3a", boots: "#1e1b22", hat: "hair", hair: "#8a8a8a", skin: "#f0cdb4" };
const MOURN2: Outfit = { jacket: "#3a2f3a", pants: "#2b2f3a", boots: "#1e1b22", hat: "hair", hair: "#5a3a22", longHair: "#5a3a22", skin: "#e8bfa0" };
const TOURIST: Outfit = { jacket: "#e8a33a", pants: "#3a4a6a", boots: "#f4f1ea", hat: "hair", hair: "#5a3a22", skin: "#f0c8a8" };
const LONER: Outfit = { jacket: "#5a8fc2", pants: "#2f3a5a", boots: "#f4f1ea", hat: "hair", hair: "#2a2230", longHair: "#2a2230", skin: "#c99067" };
const OKEY = new Map<Outfit, string>();
const okeyOf = (o: Outfit) => { let k = OKEY.get(o); if (!k) { k = "o" + OKEY.size; OKEY.set(o, k); } return k; };

const SIT = 0.3;
const F = (t: number) => t * FPS;
const wob = (t: number, hz: number, ph = 0) => q(Math.sin(2 * Math.PI * hz * t + ph), 8);
const pop = (f: number, f0: number) => (f < f0 ? 0 : q(Math.min(1, smooth((f - f0) / 5) * 1.12 - 0.12 * smooth((f - f0 - 5) / 4)), 20));

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
let camLook: V3 = [0, 0, 0];
const BLUE = "#3f6fb5";
const A = (x: number, y: number, z: number) => R("abbey", x, y, z), H = (x: number, y: number, z: number) => R("homeN", x, y, z);
const insert = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, h: number, rot = 0) =>
  out.fx.push({ key, cw, ch, draw, x: camLook[0], y: camLook[1], z: camLook[2], w: (h * cw) / ch, h, rot, front: true });
/** a greyhound standing on the ground at `at` (paws at at[1]); w = card width (an Italian greyhound is small: ~0.7) */
const hound = (out: Stage, t: number, i: number, at: V3, pose: HoundPose, mirror = false, w = 0.72, col = "#b9a596", halo = false, k = 1) => {
  if (k <= 0) return;
  const blink = lidAt(t, 20 + i) >= 1 ? 1 : 0, ph = pose === "run" ? q((t * 2.6) % 1, 8) : 0, h = w * 0.9 * k;
  card(out, `hound|${pose}|${col}|${ph}|${blink}|${mirror}|${halo}`, 400, 360, (p) => fxGreyhound(p, pose, col, ph, blink, mirror, halo), [at[0], at[1] + h * 0.48, at[2]], w * k, h);
  blob(out, at[0], at[1], at[2], 0.55, 0.7);
};

const slabFlat = (out: Stage) => out.fx.push({ key: "kingslab", cw: 600, ch: 360, draw: (p) => fxKingSlab(p), x: KING_PLOT[0], y: G(0, 0.09, 0)[1], z: KING_PLOT[2], w: 1.0, h: 0.6, orient: [-Math.PI / 2, 0, 0] });
const DG = (k: number, dz = 0, y = 0): V3 => G(DOGS_GRAVES[0] + k * 0.95, y, DOGS_GRAVES[1] + dz);

// 1: the king and his greyhounds on the terrace; a courtier bows and is ignored
const shot1 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  put(cam, t, out, { o: FRED, i: 1, at: G(0, 0, -1.2), facing: 1, look: 1, expr: f >= 66 ? "grin" : "smile", headTilt: 5, swaps: [66 / FPS] });
  hound(out, t, 0, G(0.8, 0, -0.9), "sit", true);
  hound(out, t, 1, G(1.55, 0, -1.45), "stand", true, 0.78, "#a8988c");
  hound(out, t, 2, G(-0.85, 0, -0.75), "sit", false, 0.7, "#c9b8a8");
  put(cam, t, out, { o: COURTIER, i: 2, at: G(-1.9, 0, -1.7), facing: 1, look: 1, tilt: 10, expr: f >= 126 ? "sad" : "smile", swaps: [126 / FPS] });
  badge(out, "PRUSSIA", BLUE, pop(f, 47), G(-0.5, 2.7, 0.2), 1.5);
  bubble(out, "heart", pop(f, 68), G(1.15, 1.25, -1.1), 0.36);
  bubble(out, "ask", pop(f, 128), G(-1.6, 2.1, -1.6), 0.36);
};
// 2: "next to them": he points at the row of dogs' graves; up to the palace
const shot2 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  put(cam, t, out, { o: FRED, i: 1, at: G(4.3, 0, -3.4), facing: 1, look: 1, expr: "smile", wave: f >= 186 && f < 226 ? 0.6 : undefined });
  hound(out, t, 0, G(5.8, 0, -1.0), "sit", true);
  badge(out, "SANSSOUCI", BLUE, pop(f, 233), G(2.0, 3.6, -6), 1.5);
};
// 3: the church: the coffin before the altar, the nephew pleased with himself, a greyhound waiting by the door
const shot3 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  card(out, "coffin", 600, 260, (p) => fxCoffin(p), A(0, 0.4, -2.4), 1.9, 0.82);
  put(cam, t, out, { o: NEPHEW, i: 3, at: A(1.05, 0, -1.7), facing: -1, look: -1, scale: 1.05, expr: f >= 296 ? "grin" : "neutral", swaps: [296 / FPS] });
  hound(out, t, 0, A(-0.85, 0, -1.2), "sit", false);
  bubble(out, "ask", pop(f, 330), A(-0.6, 1.0, -1.2), 0.32);
};
// 4: the map: the coffin hops church -> (war) -> mine -> church -> castle
const shot4 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  const hops: [number, number][] = [[382, 398], [429, 445], [466, 482]];
  let n = 1, u = 0;
  for (const [h0, h1] of hops) { if (f >= h1) n++; else if (f >= h0) { u = q(smooth((f - h0) / (h1 - h0)), 16); break; } }
  const war = pop(f, 362), dz = f >= 486 ? q((f - 486) / 30, 10) : 0;
  insert(out, `route|${n}|${u}|${war}|${dz}`, 600, 1000, (p) => fxRoute(p, n, u, war, dz), 0.255 * (1 + 0.0009 * (f - 350)), 0.02);
};
// 5: 1991: the coffin on the terrace beside the dogs; then the slab, and the dogs (with halos) come to sit by him
const shot5 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  if (f < 665) {
    card(out, "coffin", 600, 260, (p) => fxCoffin(p), G(KING_PLOT[0], 0.36, KING_PLOT[2] - 0.2), 1.65, 0.72);
    put(cam, t, out, { o: MOURN1, i: 5, at: G(1.3, 0, -3.1), facing: 1, look: 1, expr: f >= 640 ? "smile" : "neutral", swaps: [640 / FPS] });
    put(cam, t, out, { o: MOURN2, i: 6, at: G(2.0, 0, -3.7), facing: 1, look: 1, expr: f >= 640 ? "smile" : "neutral", swaps: [640 / FPS] });
    badge(out, "1991", BLUE, pop(f, 516), G(2.2, 2.1, -2.0), 0.75);
    badge(out, "205 YEARS", "#7a2630", pop(f, 556), G(3.3, 1.75, -1.7), 0.95);
    return;
  }
  slabFlat(out);
  for (let k = 0; k < 3; k++) hound(out, t, k, G(3.55 + k * 0.5, 0, -1.3 + 0.12 * k), "sit", true, 0.74, ["#b9a596", "#a8988c", "#c9b8a8"][k], true, pop(f, 684 + k * 4));
  bubble(out, "heart", pop(f, 694), G(3.0, 0.75, -1.2), 0.3);
};
// 6: people still leave potatoes on his grave. Long story.
const shot6 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  slabFlat(out);
  const spots: [number, number][] = [[-0.25, 0.1], [0.12, -0.05], [0.3, 0.16], [-0.05, 0.2]];
  spots.forEach(([dx, dz], k) => { const kk = pop(f, 744 + k * 6); if (kk > 0) card(out, `potato|${k % 2}`, 200, 140, (p) => fxPotato(p, k % 2), G(KING_PLOT[0] + dx, 0.15, KING_PLOT[2] + dz), 0.2 * kk, 0.14 * kk); });
  put(cam, t, out, { o: TOURIST, i: 7, at: G(2.2, 0, -2.7), facing: 1, look: 1, expr: f >= 789 ? "nervous" : "smile", swaps: [789 / FPS] });
  bubble(out, "ask", pop(f, 790), G(2.65, 2.05, -2.7), 0.36);
};
// 7: today: the flat, the phone
const shot7 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  put(cam, t, out, { o: LONER, i: 14, at: H(-0.4, 0, -1.75), mode: "sit", seat: 0.42, prop: "phone", shadow: false, expr: f >= 862 ? "smile" : "neutral", swaps: [862 / FPS] });
  bubble(out, "heart", pop(f, 863), H(0.2, 1.7, -1.6), 0.42);
};
// 8: Jenny on the phone; end card
const shot8 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  const pose = f >= 880 && f < 906 ? "wave" : "smile";
  const bb = f >= 900 ? q(smooth((f - 900) / 6), 8) : 0;
  const blink = lidAt(t, 9) >= 1 ? 1 : 0, wv = pose === "wave" ? wob(t, 2.2) : 0;
  out.fx.push({ key: `phone|${pose}|${blink}|${wv}|${bb}`, cw: 500, ch: 1000, draw: (p) => fxPhone(p, pose, blink, wv, bb, "heart", "9:41"),
    x: camLook[0], y: camLook[1] - 0.005, z: camLook[2], w: 0.139, h: 0.278, rot: 0.025, front: true });
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  if (cam.quat) { const fw = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quat); camLook = [cam.pos.x + fw.x * 0.45, cam.pos.y + fw.y * 0.45, cam.pos.z + fw.z * 0.45]; }
  const SH = [shot1, shot2, shot3, shot4, shot5, shot6, shot7, shot8];
  SH[id - 1]?.(cam, t, out);
  return out;
};
export { FPS };
