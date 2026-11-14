// Timeline of "Asking for Company" (Helen Morrison's lonely-hearts ad, Manchester 1727 -> Feeloy): shots cut to the
// ElevenLabs read (production-ad/voice/words.json, words hand-pinned), same camera grammar as Dash.
export const FPS = 30;
export const TOTAL = 720;
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

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
const LAMP = { light: "golden" as Light, sunAz: 160, sunEl: 30 };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 98, light: "day", sunAz: 150 },  // 1727, Manchester: Helen walks down the street
  { id: 2, a: 98, b: 157, light: "day" },          // ...put an ad in the newspaper (insert)
  { id: 3, a: 157, b: 205, light: "day" },         // she was looking for a husband
  { id: 4, a: 205, b: 258, ...LAMP },              // the mayor read it...
  { id: 5, a: 258, b: 362, ...LAMP },              // ...locked in an asylum for a month. So the story goes.
  { id: 6, a: 362, b: 440, ...LAMP },              // Her crime? Asking for company.
  { id: 7, a: 440, b: 505, light: "night" },       // Today, that's just called an app.
  { id: 8, a: 505, b: TOTAL, light: "night" },     // Jenny on Feeloy; no mayor will mind; end card
];
export const XFADE: Record<number, number> = { 4: 8, 7: 12 };
export const FLASH_AT = -1000; // no white flash
export const CARD_AT = 584;

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
const O = (x: number, y: number, z: number) => R("office", x, y, z);
const Ce = (x: number, y: number, z: number) => R("cell", x, y, z);
const H = (x: number, y: number, z: number) => R("homeN", x, y, z);
/** Helen's walk down the street in shot 1 (z of her soles) */
export const walkZ = (f: number) => -6.2 + 4.2 * smooth(f / 84);
// 1: down the street toward the lens; 2: the newspaper insert (card at the lens, kens behind, blurred)
const S1a = (f: number) => dolly(G(0.9, 1.55, 4.6), G(-0.35, 1.45, -2.4), pushK(f, 0, 0.0016, 0.004, 30), { fov: 44, roll: 0.015 });
const S2a = (f: number) => dolly(K(0.6, 1.3, 1.6), K(0.56, 1.28, 1.1), 1, { fov: 40, roll: -0.02 });
// 3: Helen at the window
const S3a = (f: number) => dolly(K(0.35, 1.4, 2.6), K(-0.45, 1.1, -1.5), pushK(f, 153, 0.0022, 0.006, 30), { fov: 42 });
// 4: the mayor at his desk
const S4a = (f: number) => dolly(O(0.35, 1.3, 2.3), O(0.05, 1.0, -1.4), pushK(f, 201, 0.002, 0.008, 30), { fov: 42 });
// 5: the cell through the bars; 6: closer, between the bars
const S5a = (f: number) => dolly(Ce(0.5, 1.45, 3.6), Ce(-0.1, 1.05, -1.3), pushK(f, 254, 0.0018, 0.005, 30), { fov: 44, roll: 0.02 });
const S6a = (f: number) => dolly(Ce(-0.12, 1.2, 1.8), Ce(-0.15, 1.0, -1.0), pushK(f, 358, 0.0022, 0.007, 30), { fov: 42, roll: -0.02 });
// 7: the flat today; 8: a) the phone, b) the flat again, the mayor drops in
const S7a = (f: number) => dolly(H(0.9, 1.5, 2.4), H(-0.2, 1.0, -1.7), pushK(f, 436, 0.0018, 0.005, 30), { fov: 44 });
const S8a = (f: number) => dolly(H(-0.38, 1.1, -0.45), H(-0.42, 1.02, -0.95), pushK(f, 501, 0.0008), { fov: 40 });
const S8b = (f: number) => dolly(H(0.45, 1.4, 2.6), H(0.05, 0.95, -1.7), pushK(f, 552, 0.002, 0.006, 30), { fov: 46, roll: -0.02 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }], 2: [{ f: 94, s: S2a }], 3: [{ f: 153, s: S3a }], 4: [{ f: 201, s: S4a }],
  5: [{ f: 254, s: S5a }], 6: [{ f: 358, s: S6a }], 7: [{ f: 436, s: S7a }], 8: [{ f: 501, s: S8a }, { f: 552, cut: true, s: S8b }],
};

// impact kicks: ad, shock, locked (door slam), crime, no mayor
const KICKS: [number, number][] = [[109, 0.3], [237, 0.45], [261, 0.45], [372, 0.3], [571, 0.3]].map(([f, g]) => [f / FPS, g] as [number, number]);
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
  { f: 0, cInf: 6 }, { f: 98, cInf: 16 }, { f: 157, cInf: 10 }, { f: 205, cInf: 11 }, { f: 258, cInf: 8 }, { f: 362, cInf: 13 },
  { f: 440, cInf: 9 }, { f: 505, cInf: 16 }, { f: 552, cInf: 9 },
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
  id === 99 ? { pos: [6 - 4 * smooth((f - 672) / 160), WY, 30 + 26 * smooth((f - 690) / 140)], yaw: -1.2, roll: 0.012 * Math.sin(f / 20), pitch: 0, scale: 0.45 } : null;
export const runX = (_f: number) => ({ me: 0, dog: 0, cam: 0 });
export const S = (x: number, y: number, z: number): V3 => [x, y, z];
export const DY = 0;
