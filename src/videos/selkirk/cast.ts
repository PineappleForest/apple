// Our cast as lit flat sprites in the 3D world (template: canvas pool, cardShade cards, contact blobs, blinks).
// stage(id, t, cam) says who is where, in which pose and expression, for every shot of the ELIZA -> Feeloy short.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxPhone, fxShadow, fxContact, fxBadge, fxBubble, fxNote, fxSay, Outfit, Expr, FrontOpts, SideOpts, Prop, BubbleIcon,
  fxCat, CatLook, CatPose, fxGoat, GoatLook, fxRat, fxFlame, fxTally, fxBulldog, fxMeat, fxZzz, fxHalfWord } from "./toon";
import { FPS, SHOTS, V3, R, smooth, clamp01, G, gy, S, HUT, FIRE, TALLY_PALM, runX } from "./story";
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
// ======================= cast of "No Goats Required" =======================
const SAILOR_SELKIRK: Outfit = { jacket: "#2f3f6a", pants: "#e9dfc6", boots: "#3a2a22", hat: "cap", cap: "#c0392b", skin: "#f5d6be" };
const CASTAWAY: Outfit = { jacket: "#c9a87a", pants: "#b08a5e", boots: "#e8c3a0", hat: "hair", hair: "#6b4a2e", longHair: "#6b4a2e", beard: "#6b4a2e", skin: "#efc6a0" };
const CAPTAIN: Outfit = { jacket: "#7a2630", pants: "#2b2732", boots: "#1e1b22", hat: "tricorn", buttons: "#e8c45a", moustache: "#3a2a22", build: "stout", skin: "#f5d6be" };
const SAILOR1: Outfit = { jacket: "#5a8fc2", pants: "#e9dfc6", boots: "#3a2a22", hat: "cap", cap: "#2f3f6a", skin: "#f5c9a0" };
const SAILOR2: Outfit = { jacket: "#e9dfc6", pants: "#3b3f52", boots: "#3a2a22", hat: "cap", cap: "#c0392b", moustache: "#4a3426", skin: "#ecd0b6" };
const LONER: Outfit = { jacket: "#5a8fc2", pants: "#2f3a5a", boots: "#f4f1ea", hat: "hair", hair: "#2a2230", longHair: "#2a2230", skin: "#c99067" };
const CATS: CatLook[] = [{ fur: "#f0a04b", stripes: true }, { fur: "#3a3340" }, { fur: "#9a9aa6", stripes: true }, { fur: "#f4f1ea", patch: "#e0a35a" },
  { fur: "#c98a4b" }, { fur: "#f4f1ea", patch: "#3a3340" }];
const GOATS: GoatLook[] = [{ coat: "#f4f1ea", patch: "#8a5a34" }, { coat: "#c9a06a", patch: "#f4f1ea" }];
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
/** side view (walks/runs): faces screen-right unless `left` */
const putSide = (cam: CamInfo, t: number, out: Stage, o: Outfit, i: number, at: V3, so: SideOpts, left = false, scale = 1) => {
  const pl = person(cam, { i, o, okey: okeyOf(o) }, at[0], at[1], at[2], { side: true, mirror: left }, {}, { ...so, blink: lidAt(t, i) }, scale);
  out.places.push(pl); blob(out, at[0], at[1], at[2], scale);
};
const card = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, h: number, fixed = false, glow?: number, soft?: boolean) =>
  out.fx.push({ key, cw, ch, draw, x: at[0], y: at[1], z: at[2], w, h, orient: fixed ? [0, 0, 0] : undefined, glow, soft });
const bubble = (out: Stage, icon: BubbleIcon, k: number, at: V3, w = 0.46) => { if (k > 0) card(out, `bub|${icon}|${k}`, 500, 420, (p) => fxBubble(p, icon, k), at, w, w * 0.84); };
const badge = (out: Stage, word: string, colr: string, k: number, at: V3, w = 0.9) => { if (k > 0) card(out, `badge|${word}|${colr}`, 520, 180, (p) => fxBadge(p, word, colr), at, w * k, w * 0.346 * k); };
const say = (out: Stage, word: string, k: number, at: V3, w = 0.8, half = false) => { if (k > 0) card(out, `say|${word}|${half}|${k}`, 520, 300, (p) => (half ? fxHalfWord(p, word, k) : fxSay(p, word, k)), at, w, w * 0.577); };
let camLook: V3 = [0, 0, 0];

/** an animal card standing on the island ground at (x, z): w = card width, sole = fraction of the card height where the feet are */
const onGround = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, z: number, w: number, sole: number, k = 1, y0?: number, shadow = 0.5) => {
  if (k <= 0) return;
  const h = (w * ch) / cw, y = y0 ?? gy(x, z);
  card(out, key, cw, ch, draw, [x, y + h * k * (sole - 0.5), z], w * k, h * k);
  if (shadow) blob(out, x, y, z, shadow * w * k, 0.8);
};
const cat = (out: Stage, i: number, c: CatLook, x: number, z: number, w = 0.5, k = 1, y0?: number) => {
  const lk = { ...c, ph: q(c.ph ?? 0, 12), blink: c.blink ?? 0 };
  onGround(out, `cat|${JSON.stringify(lk)}`, 400, 400, (p) => fxCat(p, lk), x, z, w, 0.95, k, y0, 0);
  void i;
};
const goat = (out: Stage, g: GoatLook, x: number, z: number, w = 0.75, k = 1, y0?: number) => {
  const lk = { ...g, ph: q(g.ph ?? 0, 12), blink: g.blink ?? 0 };
  onGround(out, `goat|${JSON.stringify(lk)}`, 420, 400, (p) => { fxGoat(p, lk); }, x, z, w, 0.95, k, y0);
};
const rat = (out: Stage, x: number, z: number, chew: number, mirror = false, w = 0.36) =>
  onGround(out, `rat|${q(chew, 8)}|${mirror}`, 360, 220, (p) => fxRat(p, q(chew, 8), mirror), x, z, w, 0.91, 1, undefined, 0.4);
const flame = (out: Stage, t: number, w = 0.9) => { const [x, z] = FIRE, ph = q((t * 2) % 1, 16);
  card(out, `flame|${ph}`, 400, 500, (p) => fxFlame(p, ph * 0.698), [x, gy(x, z) + 1.25 * w * 0.48, z], w, 1.25 * w, false, 1.7); };
const zzz = (out: Stage, t: number, at: V3, w = 0.4) => { const k = q(t % 1, 12); card(out, `zzz|${k}`, 300, 300, (p) => fxZzz(p, k), at, w, w); };
const sleepers = (() => { // ~70 cat spots in a ring around a sleeper (unit offsets), sorted by distance so the pile grows outward
  const r = (i: number, s: number) => hh(i, s), out: { dx: number; dz: number; c: number; m: boolean; d: number }[] = [];
  for (let i = 0; out.length < 72 && i < 400; i++) {
    const a = r(i, 1) * Math.PI * 2, d = 0.75 + 3.9 * Math.sqrt(r(i, 2)), dx = Math.cos(a) * d, dz = Math.sin(a) * d;
    if (out.some((o) => Math.hypot(o.dx - dx, o.dz - dz) < 0.5)) continue;
    out.push({ dx, dz, c: Math.floor(r(i, 3) * CATS.length), m: r(i, 4) < 0.5, d });
  }
  return out.sort((a, b) => a.d - b.d);
})();

// 1: the hook. a) alone on the shore at sunset; 1704. b) dancing with the cats by the fire
const shot1 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  if (f < 124) {
    put(cam, t, out, { o: CASTAWAY, i: 1, at: G(0.1, 0, -10.6), expr: f >= 88 ? "sad" : "neutral", headTilt: f >= 88 ? -5 : 0, swaps: [88 / FPS] });
    badge(out, "1704", "#3f6fb5", pop(f, 8), G(0.1, 2.55, -10.5), 0.8);
    return;
  }
  const ph = (t * 1.6) % 1;
  put(cam, t, out, { o: CASTAWAY, i: 1, at: G(1.65, 0, -16.6), expr: "laugh", wave: wob(t, 1.6), tilt: 6 * wob(t, 0.8), headTilt: 7 * wob(t, 0.8, 1) });
  flame(out, t);
  ([[0.95, -15.7, 0, 142], [2.35, -15.0, 1, 146], [1.05, -17.2, 3, 150], [2.45, -17.0, 2, 154]] as number[][]).forEach(([x, z, c, f0], i) =>
    cat(out, i, { ...CATS[c], pose: "dance", ph: (ph + i * 0.25) % 1, mirror: i % 2 === 1 }, x, z, 0.5, pop(f, f0)));
};
// 2: on deck: Selkirk tells the captain the ship will sink
const shot2 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  put(cam, t, out, { o: SAILOR_SELKIRK, i: 2, at: S(0.2, 0, 0.6), facing: 1, look: 1, expr: f >= 286 ? "shock" : "nervous", prop: ["point", ramp(f, 262, 10)], swaps: [286 / FPS] });
  put(cam, t, out, { o: CAPTAIN, i: 3, at: S(0.0, 0, -0.6), facing: -1, look: -1, expr: f >= 292 ? "stern" : "neutral", swaps: [292 / FPS] });
  badge(out, "SELKIRK", "#3f6fb5", pop(f, 220), S(0.25, 2.5, 0.45), 0.9);
  say(out, "SINK!", pop(f, 290), S(0.3, 2.3, 0.5), 0.7);
};
// 3: the captain: "then stay here" (the island behind him)
const shot3 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  put(cam, t, out, { o: CAPTAIN, i: 3, at: S(-0.6, 0, -0.3), expr: f >= 344 ? "grin" : "stern", prop: ["point", ramp(f, 343, 8)], swaps: [344 / FPS] });
};
// 4: the beach: he was right; the ship sinks behind him; alone
const shot4 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  const ex: Expr = f >= 462 ? "sad" : f >= 446 ? "nervous" : "grin";
  put(cam, t, out, { o: SAILOR_SELKIRK, i: 2, at: G(0.4, 0, -11.2), expr: ex, prop: f < 446 ? "chin" : null, headTilt: f < 446 ? 6 : f >= 462 ? -6 : 0, swaps: [446 / FPS, 462 / FPS] });
};
// 5: night: rats chew his feet while he sleeps against the hut
const shot5 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), wake = f >= 596;
  const at = G(HUT[0] - 0.2, 0, HUT[1] + 2.3);
  put(cam, t, out, { o: CASTAWAY, i: 1, at, mode: "sit", seat: 0.05, nudge: 0.1, sleep: !wake, expr: wake ? "shock" : "smile_closed", swaps: [596 / FPS] });
  if (!wake) zzz(out, t, [at[0] + 0.35, at[1] + 1.5, at[2] + 0.1], 0.36);
  if (f >= 536) {
    const k = ramp(f, 536, 12), ch = f >= 548 && !wake ? Math.abs(wob(t, 4)) : 0;
    const flee = wake ? ramp(f, 597, 8) : 0;
    rat(out, -4.6 - 1.0 * k + 1.2 * flee, -21.0, ch, flee > 0, 0.44);
    rat(out, -7.3 + 0.8 * k - 1.2 * flee, -21.15, f >= 552 && !wake ? Math.abs(wob(t, 4, 1)) : 0, flee === 0, 0.44);
  }
};
// 6: he feeds the wild cats goat meat; then more cats
const MORE: number[][] = [[-0.45, -15.3, 1, 694], [1.55, -15.6, 2, 700], [0.85, -16.2, 4, 706], [-0.1, -16.4, 5, 712]];
const shot6 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  put(cam, t, out, { o: CASTAWAY, i: 1, at: G(0.2, 0, -14.6), facing: 1, look: 1, expr: f >= 700 ? "grin" : "smile", prop: ["hold", 0.6], swaps: [700 / FPS] });
  const toss = ramp(f, 653, 9), hx = 0.66, hy = 0.82;
  if (f < 664) card(out, "meat", 200, 140, (p) => fxMeat(p), [hx + (1.3 - hx) * toss, gy(1, -14.5) + hy - 0.62 * toss + 0.25 * Math.sin(Math.PI * toss), -14.5], 0.22, 0.154);
  cat(out, 0, { ...CATS[0], pose: f >= 662 ? "eat" : "sit", mirror: true }, 1.3, -14.5, 0.6, pop(f, 646));
  MORE.forEach(([x, z, c, f0], i) => cat(out, i + 1, { ...CATS[c], pose: "sit", mirror: x > 0.5, blink: lidAt(t, 40 + i) }, x, z, 0.56, pop(f, f0)));
};
// 7: hundreds of cats asleep around him
const shot7 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), [cx, cz] = [-1.2, -17.6], at = G(cx, 0, cz);
  put(cam, t, out, { o: CASTAWAY, i: 1, at, mode: "sit", seat: 0.05, nudge: 0.1, sleep: true, expr: "smile_closed" });
  zzz(out, t, [at[0] + 0.4, at[1] + 1.5, at[2]], 0.5);
  flame(out, t, 0.7);
  sleepers.forEach((s, i) => { const x = cx + s.dx, z = cz + s.dz;
    if (Math.hypot(x - FIRE[0], z - FIRE[1]) < 1.1 || Math.hypot(x - HUT[0], z - HUT[1]) < 2.6) return;
    cat(out, i, { ...CATS[s.c], pose: "sleep", mirror: s.m }, x, z, 0.46, pop(f, 737 + Math.round(i * 0.75))); });
};
// 8: baby goats; he sings and dances with all of them by the fire
const shot8 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), dance = f >= 928, ph = (t * 1.6) % 1;
  put(cam, t, out, { o: CASTAWAY, i: 1, at: G(1.8, 0, -16.7), expr: dance ? "laugh" : f >= 912 ? "whistle" : "smile", wave: dance ? wob(t, 1.6) : undefined,
    tilt: dance ? 6 * wob(t, 0.8) : 0, headTilt: dance ? 7 * wob(t, 0.8, 1) : 0, swaps: [912 / FPS, 928 / FPS] });
  flame(out, t);
  goat(out, { ...GOATS[0], pose: dance ? "dance" : "stand", ph, bleat: f >= 845 && f < 856, blink: lidAt(t, 50) }, 1.3, -15.3, 0.85, pop(f, 826));
  goat(out, { ...GOATS[1], pose: dance ? "dance" : "stand", ph: (ph + 0.5) % 1, mirror: true, blink: lidAt(t, 51) }, 2.35, -15.0, 0.78, pop(f, 836));
  if (dance) { cat(out, 0, { ...CATS[0], pose: "dance", ph }, 1.15, -17.4, 0.5, pop(f, 932)); cat(out, 1, { ...CATS[3], pose: "dance", ph: (ph + 0.3) % 1, mirror: true }, 2.5, -17.3, 0.5, pop(f, 936)); }
  if (f >= 913) for (let k = 0; k < 4; k++) { const u = ((f - 913) / 30 + k / 4) % 1;
    if (f - 913 < k * 7) continue;
    card(out, `note|${k % 2}|${q(1 - u, 10)}`, 220, 240, (p) => fxNote(p, k % 2, "#2f3a5a"), G(2.0 + 0.35 * Math.sin(u * 5 + k), 2.1 + 0.9 * u, -16.7), 0.2 * (1 - 0.4 * u), 0.22 * (1 - 0.4 * u)); }
};
// 9: four years and four months of notches
const shot9 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), n = Math.round(52 * smooth((f - 972) / 52));
  const [x, z] = TALLY_PALM;
  card(out, `tally|${n}`, 600, 400, (p) => fxTally(p, n), [x, gy(x, z) + 1.4, z + 0.29], 0.62, 0.413, true);
};
// 10: on the shore: a ship finally came
const shot10 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), ex: Expr = f >= 1058 ? "laugh" : f >= 1036 ? "shock" : "neutral";
  putSide(cam, t, out, CASTAWAY, 1, G(-4.08, 0, -7.15), { mode: "stand", expr: ex, pose: 0 });
  if (f >= 1060) bubble(out, "heart", pop(f, 1062), G(-4.4, 2.5, -7.15), 0.4);
};
// 11: he outruns their bulldog (and comes back with dinner on his shoulders)
const shot11 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), x = runX(f), z = -11.0;
  putSide(cam, t, out, CASTAWAY, 1, G(x.me, 0, z), { mode: "march", phase: (t * 3.2) % 1, stride: 1.7, expr: f >= 1129 ? "laugh" : "grin" });
  const dph = q((t * 4) % 1, 8);
  onGround(out, `dog|${dph}`, 520, 360, (p) => fxBulldog(p, dph), x.dog, z + 0.45, 1.1, 0.944);
  if (f >= 1136) goat(out, { ...GOATS[1], pose: "stand", bleat: f >= 1142 && f < 1152 }, x.me + 0.04, z - 0.05, 0.55, pop(f, 1136), gy(x.me, z) + 1.52);
};
// 12: the sailors can barely understand his half-words
const shot12 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  put(cam, t, out, { o: CASTAWAY, i: 1, at: G(0.0, 0, -12.6), facing: -1, look: -1, expr: f >= 1272 ? "nervous" : "grin", swaps: [1272 / FPS] });
  put(cam, t, out, { o: SAILOR1, i: 4, at: G(1.3, 0, -11.9), facing: 1, look: 1, expr: f >= 1206 ? "dazed" : "neutral", swaps: [1206 / FPS] });
  put(cam, t, out, { o: SAILOR2, i: 5, at: G(2.28, 0, -11.42), facing: 1, look: 1, expr: f >= 1220 ? "nervous" : "neutral", swaps: [1220 / FPS] });
  if (f < 1250) say(out, "HEL", pop(f, 1179), G(0.0, 2.35, -12.5), 0.72, true);
  else say(out, "THA", pop(f, 1252), G(0.0, 2.35, -12.5), 0.72, true);
  bubble(out, "ask", pop(f, 1212), G(1.3, 2.3, -11.9), 0.46);
  bubble(out, "ask", pop(f, 1226), G(2.28, 2.35, -11.42), 0.46);
};
// 13: night: the cats keep away the rats, not the silence
const shot13 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t), [cx, cz] = [1.4, -16.4], at = G(cx, 0, cz);
  put(cam, t, out, { o: CASTAWAY, i: 1, at, mode: "sit", seat: 0.05, nudge: 0.1, expr: f >= 1438 ? "sad" : "neutral", headTilt: f >= 1438 ? -6 : 0, swaps: [1438 / FPS] });
  flame(out, t, 0.75);
  sleepers.slice(0, 26).forEach((s, i) => { const x = cx + s.dx * 1.15, z = cz + s.dz * 1.15;
    if (Math.hypot(x - FIRE[0], z - FIRE[1]) < 1.1 || (Math.abs(x - 1.85) < 0.5 && Math.abs(z + 15.4) < 0.5) || (z > -15.6 && x < 1.6)) return;
    cat(out, i, { ...CATS[s.c], pose: "sleep", mirror: s.m }, x, z, 0.44); });
  const hiss = f >= 1384 && f < 1412;
  cat(out, 99, { ...CATS[1], pose: hiss ? "hiss" : "sit", mirror: true, blink: lidAt(t, 61) }, 1.85, -15.4, 0.5);
  if (f >= 1356 && f < 1410) { const inn = ramp(f, 1356, 26), out2 = ramp(f, 1388, 16);
    rat(out, 0.6 + 0.8 * inn - 1.4 * out2, -15.15, 0, out2 > 0, 0.36); }
};
// 14: a quiet flat today; Jenny on the phone; a goat; end card
const shot14 = (cam: CamInfo, t: number, out: Stage) => {
  const f = F(t);
  if (f < 1534 || f >= 1626) {
    const ex: Expr = f >= 1634 ? "laugh" : f >= 1626 ? "smile" : "sad";
    put(cam, t, out, { o: LONER, i: 14, at: R("homeN", -0.4, 0, -1.75), mode: "sit", seat: 0.42, prop: "phone", shadow: false, expr: ex, swaps: [1634 / FPS] });
    if (f < 1534) bubble(out, "dots", pop(f, 1500), R("homeN", 0.2, 1.75, -1.6), 0.42);
    else { const [x, y, z] = R("homeN", 0.32, 0, -0.95); goat(out, { ...GOATS[0], pose: "stand", mirror: true, bleat: f >= 1636 && f < 1652, blink: lidAt(t, 52) }, x, z, 0.72, pop(f, 1629), y); }
    return;
  }
  const pose = f >= 1546 && f < 1576 ? "wave" : f >= 1583 && f < 1612 ? "listen" : "smile";
  const [icon, f0]: [BubbleIcon, number] = f >= 1598 ? ["heart", 1598] : ["dots", 99999];
  const bb = f >= f0 ? q(smooth((f - f0) / 6), 8) : 0;
  const blink = lidAt(t, 9) >= 1 ? 1 : 0, wv = pose === "wave" ? wob(t, 2.2) : 0;
  out.fx.push({ key: `phone|${pose}|${blink}|${wv}|${bb}|${icon}`, cw: 500, ch: 1000, draw: (p) => fxPhone(p, pose, blink, wv, bb, icon, "11:00"),
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
