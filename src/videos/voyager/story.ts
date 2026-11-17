// Timeline of "One Last Look" (Voyager 1 and the Pale Blue Dot -> Feeloy): shots cut to the ElevenLabs read
// (production-voyager/voice/words.json, words hand-pinned), same camera grammar as Dogs.
export const FPS = 30;
export const TOTAL = 960;
export const D0 = 6.0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

/** interior sets, each far away at its own z; local (x, y, z) -> world. kens = Kensington Palace (the childhood room),
 *  buck = Buckingham Palace (hall + stairs + the tin bath), abbey = Westminster Abbey, homeN = the flat today */
export const ROOMS = { pub: -1500, homeN: -1900, cave: -2400, kens: -2800, buck: -3200, abbey: -3700, office: -4200, cell: -4600 } as const;
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
/** the mayor's desk (office) and Helen's cot behind the bars (cell); BARS_Z = the line of iron bars across the cell */
export const DESK: V3 = [0, 0, -1.0];
export const COT: V3 = [-0.15, 0, -1.3];
export const BARS_Z = 0.7;
/** Sanssouci: the dogs' row of slabs starts at x0 (6 slabs, 0.95 m apart) at z; the king's plot just left of them; palace centre z */
export const DOGS_GRAVES: [number, number] = [4, -2];
export const KING_PLOT: V3 = [2.85, 0, -2];
export const PALACE_Z = -12;
/** deep space: centre SP (high above the unused ground), Earth toward +z; the probe sits at SP, dish toward +z (Earth);
 *  PLAT = the scan platform (probe-local) at the end of the science boom */
export const SP: V3 = [0, 3000, 0];
export const EARTH: V3 = [30, 3008, 160];
export const EARTH_R = 18;
export const PLAT: V3 = [2.45, -0.15, 0];

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
const LAMP = { light: "golden" as Light, sunAz: 160, sunEl: 30 };
const SPACE = { light: "day" as Light, sunAz: 120, sunEl: 25 };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 125, ...SPACE },             // In 1990, Voyager 1 was leaving home forever
  { id: 2, a: 125, b: 228, ...LAMP },            // Carl Sagan asked for one favour
  { id: 3, a: 228, b: 306, ...SPACE },           // turn around, and take a picture of us
  { id: 4, a: 306, b: 425, ...SPACE },           // the photo: smaller than one pixel
  { id: 5, a: 425, b: 571, ...SPACE },           // 34 minutes later: cameras off; never saw home again
  { id: 6, a: 571, b: 735, ...SPACE },           // still out there; a hello takes a whole day
  { id: 7, a: 735, b: 776, light: "night" },     // feeling far from everyone?
  { id: 8, a: 776, b: TOTAL, light: "night" },   // Jenny answers right away; end card
];
export const XFADE: Record<number, number> = { 2: 8, 3: 8, 7: 12 };
export const FLASH_AT = -1000; // no white flash
export const CARD_AT = 850;

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

const P = (x: number, y: number, z: number): V3 => [SP[0] + x, SP[1] + y, SP[2] + z];
const O = (x: number, y: number, z: number) => R("office", x, y, z), H = (x: number, y: number, z: number) => R("homeN", x, y, z);
/** where the probe is: pos, yaw, plat = scan-platform yaw (0: lenses away from Earth, PI: toward Earth) */
export const shipAt = (id: number, f: number): (ShipPose & { scale?: number; plat?: number }) | null => {
  if (id === 1) return { pos: P(0, 0, -0.012 * f), yaw: 0, roll: 0.03, pitch: 0, plat: 0 };
  if (id === 3) return { pos: P(0, 0, 0), yaw: 0, roll: 0.03, pitch: 0, plat: Math.PI * smooth((f - 231) / 22) };
  if (id === 5) return { pos: P(0, 0, -0.01 * Math.max(0, f - 520)), yaw: 0, roll: 0.03, pitch: 0, plat: Math.PI };
  if (id === 6) return { pos: P(0, 10, -40), yaw: 0.5, roll: 0.03, pitch: 0, plat: Math.PI, scale: 4 };
  return null;
};
// 1: ahead of the probe, home behind it; a slow pull back as it comes on
const S1a = (f: number) => dolly(P(-1.2, 1.3, -14.5), P(2.6, 0.2, 18), pushK(f, 0, -0.0012), { fov: 44, roll: 0.02 });
// 2: Sagan at his desk
const S2a = (f: number) => dolly(O(0.3, 1.35, 3.0), O(0.0, 1.05, -1.4), pushK(f, 121, 0.002, 0.008, 30), { fov: 42 });
// 3: from the Earth side: the platform swings round to face us
const S3a = (f: number) => dolly(P(2.95, 0.45, 3.3), P(2.3, -0.1, 0), pushK(f, 224, 0.0022, 0.006, 30), { fov: 38, roll: -0.02 });
// 4: the photo insert
const S4a = (f: number) => dolly(P(0, 0, 20), P(0, 0, 19.5), 1, { fov: 40 });
// 5: close on the lenses; after 'never' the lens pulls back as it drifts on
const S5a = (f: number) => dolly(P(2.75, 0.05, 2.1), P(2.45, -0.15, 0), pushK(f, 421, 0.0016), { fov: 42, roll: 0.02 });
const S5b = (f: number) => dolly(P(5, 1.2, 9), P(1.5, 0, -3), pushK(f, 520, -0.002), { fov: 44, roll: 0.02 });
// 6: the long view: Earth near, the probe far; a hello crawls between
const S6a = (f: number) => dolly(P(26, 34, 196), P(0, 8, -40), pushK(f, 567, 0.0006), { fov: 46, roll: 0.02 });
// 7: the flat today; 8: the phone
const S7a = (f: number) => dolly(H(0.9, 1.5, 2.4), H(-0.2, 1.0, -1.7), pushK(f, 731, 0.003, 0.006, 30), { fov: 44 });
const S8a = (f: number) => dolly(H(-0.38, 1.1, -0.45), H(-0.42, 1.02, -0.95), pushK(f, 772, 0.0008), { fov: 40 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 121, s: S2a }], 3: [{ f: 224, s: S3a }], 4: [{ f: 302, s: S4a }],
  5: [{ f: 421, s: S5a }, { f: 522, dur: 30, s: S5b }], 6: [{ f: 567, s: S6a }], 7: [{ f: 731, s: S7a }], 8: [{ f: 772, s: S8a }],
};

// impact kicks: the snap, cameras off
const KICKS: [number, number][] = [[268, 0.3], [497, 0.25]].map(([f, g]) => [f / FPS, g] as [number, number]);
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
  { f: 0, cInf: 4 }, { f: 125, cInf: 11 }, { f: 228, cInf: 8 }, { f: 306, cInf: 16 }, { f: 425, cInf: 10 }, { f: 522, cInf: 4 },
  { f: 571, cInf: 0 }, { f: 735, cInf: 9 }, { f: 776, cInf: 16 },
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
export const runX = (_f: number) => ({ me: 0, dog: 0, cam: 0 });
export const S = (x: number, y: number, z: number): V3 => [x, y, z];
export const DY = 0;
