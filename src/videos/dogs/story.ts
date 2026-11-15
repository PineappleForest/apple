// Timeline of "Worth the Wait" (Frederick the Great, buried beside his greyhounds 205 years late -> Feeloy): shots cut
// to the ElevenLabs read (production-dogs/voice/words.json, words hand-pinned), same camera grammar as Ad.
export const FPS = 30;
export const TOTAL = 1100;
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

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
const LAMP = { light: "golden" as Light, sunAz: 160, sunEl: 30 };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 158, light: "day", sunAz: 150 },   // Frederick the Great, King of Prussia, loved his greyhounds more than most people
  { id: 2, a: 158, b: 262, light: "day", sunAz: 150 }, // buried next to them, on the terrace of his palace
  { id: 3, a: 262, b: 350, ...LAMP },                  // his nephew buried him in a church
  { id: 4, a: 350, b: 512, ...LAMP },                  // a war, a mine, another church, a castle (the map insert)
  { id: 5, a: 512, b: 720, light: "golden", sunAz: 165, sunEl: 14 }, // 1991, 205 years late: next to the dogs
  { id: 6, a: 720, b: 822, light: "day", sunAz: 150 }, // potatoes. Long story.
  { id: 7, a: 822, b: 870, light: "night" },           // some friends are worth the wait
  { id: 8, a: 870, b: TOTAL, light: "night" },         // Jenny on Feeloy; end card
];
export const XFADE: Record<number, number> = { 3: 8, 5: 10, 7: 12 };
export const FLASH_AT = -1000; // no white flash
export const CARD_AT = 944;

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

const A = (x: number, y: number, z: number) => R("abbey", x, y, z);
const H = (x: number, y: number, z: number) => R("homeN", x, y, z);
// 1: a crane in from the vineyard terraces up to the king and his dogs; then a medium on him
const S1a = (f: number) => dolly(G(-6.5, 3.2, 14), G(-0.3, 1.2, -2), pushK(f, 0, 0.001), { fov: 44, roll: 0.015 });
const S1b = (f: number) => dolly(G(-1.2, 1.75, 6.5), G(0, 1.2, -1.5), pushK(f, 95, 0.0015), { fov: 42, roll: 0.015 });
const S1c = (f: number) => dolly(G(1.5, 1.3, 4.6), G(0.65, 0.85, -1.1), pushK(f, 100, 0.0022, 0.006, 30), { fov: 46, roll: -0.02 });
// 2: the dogs' graves, then up to the palace
const S2a = (f: number) => dolly(G(6.4, 1.5, 3.4), G(5.0, 0.75, -2.4), pushK(f, 154, 0.002), { fov: 44, roll: 0.02 });
const S2b = (f: number) => dolly(G(5.6, 2.2, 7.5), G(2.0, 4.0, -12), pushK(f, 212, 0.0012), { fov: 46 });
// 3: the church: the coffin before the altar, the nephew
const S3a = (f: number) => dolly(A(0.3, 1.6, 4.4), A(0.25, 1.0, -2.2), pushK(f, 258, 0.0022, 0.007, 30), { fov: 42 });
// 4: the map insert (the card rides at the lens; the look point 0.5 m ahead keeps it in focus)
const S4a = (f: number) => dolly(A(0, 1.6, 4), A(0, 1.6, 3.5), 1, { fov: 40, roll: -0.015 });
// 5: 1991, evening: the coffin on the terrace beside the dogs; then above the slabs
const S5a = (f: number) => dolly(G(4.4, 1.6, 4.8), G(2.8, 0.75, -2.4), pushK(f, 508, 0.0016, 0.005, 30), { fov: 44, roll: 0.02 });
const S5b = (f: number) => dolly(G(3.45, 2.4, 1.9), G(3.4, 0.2, -1.9), pushK(f, 662, 0.0022), { fov: 44 });
// 6: the potatoes
const S6a = (f: number) => dolly(G(3.05, 1.35, 1.9), G(2.75, 0.5, -2.0), pushK(f, 716, 0.002, 0.006, 30), { fov: 44, roll: -0.02 });
// 7: the flat today; 8: the phone
const S7a = (f: number) => dolly(H(0.9, 1.5, 2.4), H(-0.2, 1.0, -1.7), pushK(f, 818, 0.002, 0.005, 30), { fov: 44 });
const S8a = (f: number) => dolly(H(-0.38, 1.1, -0.45), H(-0.42, 1.02, -0.95), pushK(f, 866, 0.0008), { fov: 40 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 8, dur: 88, s: S1b }, { f: 100, cut: true, s: S1c }],
  2: [{ f: 154, s: S2a }, { f: 212, dur: 30, s: S2b }],
  3: [{ f: 258, s: S3a }], 4: [{ f: 346, s: S4a }],
  5: [{ f: 508, s: S5a }, { f: 662, cut: true, s: S5b }], 6: [{ f: 716, s: S6a }],
  7: [{ f: 818, s: S7a }], 8: [{ f: 866, s: S8a }],
};

// impact kicks: church, mine, church, castle
const KICKS: [number, number][] = [[327, 0.35], [397, 0.25], [444, 0.2], [481, 0.25]].map(([f, g]) => [f / FPS, g] as [number, number]);
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
  { f: 0, cInf: 0 }, { f: 100, cInf: 10 }, { f: 158, cInf: 7 }, { f: 212, cInf: 0 }, { f: 262, cInf: 11 }, { f: 350, cInf: 16 },
  { f: 512, cInf: 6 }, { f: 665, cInf: 8 }, { f: 720, cInf: 10 }, { f: 822, cInf: 9 }, { f: 870, cInf: 16 },
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
