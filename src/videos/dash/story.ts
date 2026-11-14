// Timeline of "Dash Comes First" (Queen Victoria and her spaniel Dash, coronation day 1838 -> Feeloy): shots cut to the
// ElevenLabs read (production-dash/voice/words.json, words hand-pinned), same camera grammar as Hermit.
export const FPS = 30;
export const TOTAL = 1920;
export const D0 = 6.0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

/** interior sets, each far away at its own z; local (x, y, z) -> world. kens = Kensington Palace (the childhood room),
 *  buck = Buckingham Palace (hall + stairs + the tin bath), abbey = Westminster Abbey, homeN = the flat today */
export const ROOMS = { pub: -1500, homeN: -1900, cave: -2400, kens: -2800, buck: -3200, abbey: -3700 } as const;
export type Room = keyof typeof ROOMS;
export const R = (room: Room, x: number, y: number, z: number): V3 => [x, D0 + y, ROOMS[room] + z];
/** the template's river town / island / cave (kept compiling, not built in this short) */
export const QUAY_Z = -33.8, MX = 60, MZ = -170;
export const IC: [number, number] = [0, -70];
export const RF = 56, RB = 80, DROP = 1.6, WY = D0 - 0.5;
export const gy = (_x: number, _z: number) => D0;
export const G = (x: number, y: number, z: number): V3 => [x, D0 + y, z];
export const HUT: [number, number] = [-6, -24], FIRE: [number, number] = [2.9, -15.9], TALLY_PALM: [number, number] = [5.5, -21], BOAT: [number, number] = [3.9, -8.2];
export const DECK = 1.7;
export const CR = 13, CH = 8, HOLE = 2.3, SHAFT_TOP = 34, LADDER_X = -1.95;
export const TABLE: [number, number] = [0.9, -2.6];
export const TENT: [number, number] = [3.8, -4.6];
export const C = (x: number, y: number, z: number) => R("cave", x, y, z);
export const MOUTH: [number, number] = [0.2, -3.4];

// ---------------- the outdoor set (world origin) ----------------
// a lawn (z <= 0) ending at a low sea wall + sand strip, the open sea toward +z (WY); Dash's grave GRAVE on the lawn.
// The yacht is the shared ship group (shipAt), scaled down. Kensington: window at the back, Dash's cushion CUSHION.
// Buckingham: the tin bath TUB, the stairs on the left (x < -1.4). The Abbey: the throne THRONE on a dais, red carpet.
export const HUT1: [number, number] = [0, -4], STOOL1: [number, number] = [0.9, -2.0], POST1: [number, number] = [-1.45, -2.3];
export const HUT2: [number, number] = [40, -4], STOOL2: [number, number] = [40.9, -2.0], BELL2: [number, number] = [39.2, -2.2];
export const PUB: [number, number] = [52, -12];
export const STOOL_H = 0.45;
export const GRAVE: [number, number] = [-30, -14];
export const TUB: V3 = [0.6, 0, -1.4];
export const THRONE: V3 = [0, 0.6, -4.6];
export const CUSHION: V3 = [0.9, 0, -1.6];
export const SHORE_Z = 0;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
const LAMP = { light: "golden" as Light, sunAz: 160, sunEl: 30 };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 150, light: "day" },          // hook: crowned queen... rushed home to give her dog a bath
  { id: 2, a: 150, b: 320, light: "day" },        // Kensington: a lonely childhood; her closest friend, Dash
  { id: 3, a: 320, b: 418, light: "day" },        // the scarlet jacket and blue trousers
  { id: 4, a: 418, b: 532, light: "day" },        // Christmas: rubber balls, two pieces of gingerbread
  { id: 5, a: 532, b: 672, light: "day" },        // Landseer paints his portrait
  { id: 6, a: 672, b: 836, light: "day" },        // she sails off; Dash jumps in and swims after her
  { id: 7, a: 836, b: 950, ...LAMP },             // Westminster Abbey, 1838, at nineteen: crowned
  { id: 8, a: 950, b: 1110, ...LAMP },            // it went badly: the ring, the bishop's two pages
  { id: 9, a: 1110, b: 1272, light: "day" },      // she hurries back, runs upstairs, gives Dash his bath
  { id: 10, a: 1272, b: 1410, light: "day" },     // everyone wanted something; Dash just wanted his bath
  { id: 11, a: 1410, b: 1600, light: "day" },     // the gravestone
  { id: 12, a: 1600, b: TOTAL, light: "night" },  // a quiet flat today; Jenny; no bath required; end card
];
export const XFADE: Record<number, number> = { 2: 10, 7: 10, 11: 12, 12: 12 };
export const FLASH_AT = -1000; // no white flash
export const CARD_AT = 1806;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

const K = (x: number, y: number, z: number) => R("kens", x, y, z);
const B = (x: number, y: number, z: number) => R("buck", x, y, z);
const A = (x: number, y: number, z: number) => R("abbey", x, y, z);
/** the queen's run through the hall in shot 9 (local x of her soles) */
export const runQ = (f: number) => -2.6 + 5.2 * smooth((f - 1112) / 106);
// 1: a) the newly crowned queen in her robes; b) the tin bath, Dash in the suds
const S1a = (f: number) => dolly(B(0.2, 1.6, 2.6), B(-0.4, 1.5, -1.0), pushK(f, 0, 0.0018, 0.005, 30), { fov: 44, roll: 0.02 });
const S1b = (f: number) => dolly(B(0.55, 1.15, 1.9), B(0.35, 0.75, -1.5), pushK(f, 74, 0.0022, 0.007, 30), { fov: 44, roll: -0.02 });
// 2: Kensington: the princess alone at the window, then Dash at her side
const S2a = (f: number) => dolly(K(0.3, 1.45, 3.0), K(-0.15, 1.05, -1.4), pushK(f, 146, 0.0016, 0.005, 30), { fov: 44 });
// 3: close on Dash in his jacket; 4: the Christmas gifts
const S3a = (f: number) => dolly(K(1.05, 0.75, 0.4), K(0.9, 0.45, -1.6), pushK(f, 316, 0.0022, 0.007, 30), { fov: 40 });
const S4a = (f: number) => dolly(K(0.4, 1.1, 2.6), K(0.1, 0.7, -1.3), pushK(f, 414, 0.0016, 0.005, 30), { fov: 44 });
// 5: the painter at his easel, Dash posing on the cushion
const S5a = (f: number) => dolly(K(-0.15, 1.4, 3.4), K(-0.15, 1.0, -1.2), pushK(f, 528, 0.0016, 0.006, 30), { fov: 50 });
// 6: on the shore: the yacht leaves, Dash leaps in and swims after it
export const swimZ = (f: number) => 1.2 + 9 * smooth((f - 760) / 76);
const S6a = (f: number): Shot => { const k = smooth((f - 752) / 60); return { pos: G(-0.4 + 0.2 * k, 1.0 + 0.6 * k, -4.6 + 2.0 * k), look: G(0.3, 0.45, 8 + 8 * k), fov: 44, roll: 0.01 }; };
// 7: the Abbey: the throne up the aisle; 8: a) the stuck ring, close; b) the bishop and his book
const S7a = (f: number) => dolly(A(0.6, 1.95, 0.6), A(0.35, 1.65, -4.4), pushK(f, 832, 0.0024, 0.006, 30), { fov: 46 });
const S8a = (f: number) => dolly(A(0.45, 1.95, -1.3), A(0.2, 1.65, -4.3), pushK(f, 946, 0.0018, 0.006, 30), { fov: 42 });
const S8b = (f: number) => dolly(A(1.6, 1.85, -1.0), A(1.5, 1.5, -3.6), pushK(f, 1062, 0.002, 0.007, 30), { fov: 42, roll: -0.03 });
// 9: a) tracking her run through the hall; b) the bath
const S9a = (f: number): Shot => { const x = runQ(f); return { pos: B(x + 0.6, 1.5, 3.2), look: B(x + 0.4, 1.2, -1.0), fov: 46, roll: 0 }; };
const S9b = (f: number) => dolly(B(1.4, 1.45, 1.4), B(0.6, 0.85, -1.4), pushK(f, 1226, 0.0022, 0.007, 30), { fov: 44, roll: 0.02 });
// 10: a) the courtiers crowding her; b) Dash alone in the bath, perfectly happy
const S10a = (f: number) => dolly(B(-0.4, 1.7, 4.2), B(-0.5, 1.2, -1.0), pushK(f, 1268, 0.0016, 0.006, 30), { fov: 50 });
const S10b = (f: number) => dolly(B(0.85, 1.05, 0.6), B(0.6, 0.75, -1.4), pushK(f, 1346, 0.0026), { fov: 40 });
// 11: the grave on the lawn: a slow push
const S11a = (f: number) => dolly(G(GRAVE[0] - 0.2, 1.45, GRAVE[1] + 5.4), G(GRAVE[0] - 0.45, 0.9, GRAVE[1]), pushK(f, 1406, 0.0024), { fov: 42, roll: 0.01 });
// 12: the flat, the phone, the flat again (no bath required)
const S12a = (f: number) => dolly(R("homeN", 0.9, 1.5, 2.4), R("homeN", -0.2, 1.0, -1.7), pushK(f, 1596, 0.0018), { fov: 44 });
const S12b = (f: number) => dolly(R("homeN", -0.38, 1.1, -0.45), R("homeN", -0.42, 1.02, -0.95), pushK(f, 1656, 0.0008), { fov: 40 });
const S12c = (f: number) => dolly(R("homeN", 0.7, 1.35, 2.0), R("homeN", -0.1, 0.85, -1.7), pushK(f, 1762, 0.002, 0.006, 30), { fov: 44, roll: -0.02 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 74, cut: true, s: S1b }], 2: [{ f: 146, s: S2a }], 3: [{ f: 316, s: S3a }], 4: [{ f: 414, s: S4a }],
  5: [{ f: 528, s: S5a }], 6: [{ f: 668, s: S6a }], 7: [{ f: 832, s: S7a }], 8: [{ f: 946, s: S8a }, { f: 1062, cut: true, s: S8b }],
  9: [{ f: 1106, s: S9a }, { f: 1226, cut: true, s: S9b }], 10: [{ f: 1268, s: S10a }, { f: 1346, cut: true, s: S10b }],
  11: [{ f: 1406, s: S11a }], 12: [{ f: 1596, s: S12a }, { f: 1656, cut: true, s: S12b }, { f: 1762, cut: true, s: S12c }],
};

// impact kicks: bath, Dash, scarlet, Landseer, jumped, crowned, ring, two pages, upstairs, bath, Dash (alone), no bath
const KICKS: [number, number][] = [[122, 0.35], [298, 0.35], [353, 0.3], [585, 0.3], [756, 0.45], [917, 0.45], [1000, 0.4], [1080, 0.4],
  [1205, 0.3], [1253, 0.4], [1350, 0.3], [1772, 0.45]].map(([f, g]) => [f / FPS, g] as [number, number]);
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 10 }, { f: 74, cInf: 12 }, { f: 150, cInf: 9 }, { f: 320, cInf: 15 }, { f: 418, cInf: 10 }, { f: 532, cInf: 9 },
  { f: 672, cInf: 4 }, { f: 836, cInf: 3 }, { f: 950, cInf: 12 }, { f: 1062, cInf: 12 }, { f: 1110, cInf: 7 }, { f: 1226, cInf: 12 },
  { f: 1272, cInf: 8 }, { f: 1346, cInf: 15 }, { f: 1410, cInf: 10 }, { f: 1600, cInf: 9 }, { f: 1656, cInf: 16 }, { f: 1762, cInf: 9 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
// not used in this short (kept so shared code compiles)
export type ShipPose = { pos: V3; yaw: number; roll: number; pitch: number };
/** the yacht in shot 6: sailing away from the shore (scaled down from the shared ship) */
export const shipAt = (id: number, f: number): (ShipPose & { scale?: number }) | null =>
  id === 6 ? { pos: [6 - 4 * smooth((f - 672) / 160), WY, 30 + 26 * smooth((f - 690) / 140)], yaw: -1.2, roll: 0.012 * Math.sin(f / 20), pitch: 0, scale: 0.45 } : null;
export const runX = (_f: number) => ({ me: 0, dog: 0, cam: 0 });
export const S = (x: number, y: number, z: number): V3 => [x, y, z];
export const DY = 0;
