// Timeline of "No Goats Required" (Alexander Selkirk, the real Robinson Crusoe -> Feeloy): shots cut to the ElevenLabs
// read (production-selkirk/voice/words.json, pauses added at four beats, words hand-fixed), same camera grammar as Pigs.
export const FPS = 30;
export const TOTAL = 1785;
export const D0 = 6.0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

/** interior rooms, each far away at its own z; local (x, y, z) -> world */
export const ROOMS = { flat: -1500, homeN: -1900 } as const;
export type Room = keyof typeof ROOMS;
export const R = (room: Room, x: number, y: number, z: number): V3 => [x, D0 + y, ROOMS[room] + z];
/** the template's river town (kept compiling, not built in this short) */
export const QUAY_Z = -33.8, MX = 60, MZ = -170;

// ---------------- the island ----------------
// Más a Tierra as one round island centred at IC: flat top (grass inside ~46 m, sand from there), a beach falling
// DROP m between RF and RB, the sea surface at WY (shoreline ~ r 63.5, i.e. z ~ -6.5 on the camp side). Land lies toward
// -z from the camp, open sea toward +z.
export const IC: [number, number] = [0, -70];
export const RF = 56, RB = 80, DROP = 1.6, WY = D0 - 0.5;
export const gy = (x: number, z: number) => D0 - DROP * clamp01((Math.hypot(x - IC[0], z - IC[1]) - RF) / (RB - RF));
/** ground-relative point */
export const G = (x: number, y: number, z: number): V3 => [x, gy(x, z) + y, z];
export const HUT: [number, number] = [-6, -24];
export const FIRE: [number, number] = [2.9, -15.9];
export const TALLY_PALM: [number, number] = [5.5, -21];
export const BOAT: [number, number] = [3.9, -8.2];
// the ship: origin on the waterline, bow toward +x, deck at DY; masts at x +7 (fore) and -2 (main)
export const DECK = 1.7;
export const SHIP_A: V3 = [40, WY, 140];
export const DY = WY + DECK;
export const S = (x: number, y: number, z: number): V3 => [SHIP_A[0] + x, DY + y, SHIP_A[2] + z];
/** where the ship is in each shot (null = hidden): pos, yaw, roll (sinking), sink depth */
export type ShipPose = { pos: V3; yaw: number; roll: number; pitch: number };
export const shipAt = (id: number, f: number): ShipPose | null => {
  if (id === 2 || id === 3) return { pos: SHIP_A, yaw: 0, roll: 0.012 * Math.sin(f / 24), pitch: 0.006 * Math.sin(f / 31) };
  if (id === 4) { const k = smooth((f - 410) / 40); return { pos: [16, WY - 26 * k ** 1.6, 180], yaw: 0.35, roll: 0, pitch: 0.55 * smooth((f - 410) / 18) }; }
  if (id === 10) { const k = (f - 1030) / 54; return { pos: [8 + 7 * k, WY, 156], yaw: 0.2, roll: 0.01 * Math.sin(f / 20), pitch: 0 }; }
  if (id === 12) return { pos: [32, WY, 66], yaw: -0.5, roll: 0.01 * Math.sin(f / 24), pitch: 0 };
  return null;
};

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 196, light: "golden" },    // hook: 1704, a sailor alone; ... dancing with cats
  { id: 2, a: 196, b: 313, light: "day" },     // on deck: Selkirk tells the captain the ship will sink
  { id: 3, a: 313, b: 381, light: "day" },     // the captain: "then stay here"
  { id: 4, a: 381, b: 510, light: "day" },     // the beach: he was right, the ship sinks, he is alone
  { id: 5, a: 510, b: 606, light: "night" },   // night: rats chew his feet while he sleeps
  { id: 6, a: 606, b: 734, light: "day" },     // he feeds the wild cats goat meat; more cats
  { id: 7, a: 734, b: 806, light: "night" },   // hundreds of cats asleep around him
  { id: 8, a: 806, b: 968, light: "golden", sunAz: 165, sunEl: 12 },  // baby goats; he sings and dances with all of them
  { id: 9, a: 968, b: 1030, light: "day", sunAz: 150, sunEl: 24 },    // four years and four months of notches
  { id: 10, a: 1030, b: 1084, light: "day" },  // a ship finally came
  { id: 11, a: 1084, b: 1167, light: "day" },  // he outruns the bulldog, a goat on his shoulders
  { id: 12, a: 1167, b: 1336, light: "day" },  // the sailors can barely understand his half-words
  { id: 13, a: 1336, b: 1475, light: "night" },// cats keep away the rats, not the silence
  { id: 14, a: 1475, b: TOTAL, light: "night" },// a quiet flat today; Jenny; a goat; end card
];
export const XFADE: Record<number, number> = { 4: 8, 5: 8, 6: 8, 7: 8, 8: 10, 13: 10, 14: 12 };
export const FLASH_AT = 196;
export const CARD_AT = 1664;

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

// 1: the hook. a) alone on the shore at sunset, looking out to sea behind him; b) dancing with the cats by the fire
const S1a = (f: number) => dolly(G(-0.5, 1.5, -16.6), G(0.1, 1.25, -10.6), pushK(f, 0, 0.0016, 0.004, 30), { fov: 42, roll: 0.02 });
const S1b = (f: number) => dolly(G(2.0, 1.75, -9.0), G(2.05, 1.0, -15.6), pushK(f, 124, 0.0022, 0.007, 30), { fov: 44, roll: -0.03 });
// 2-3: on deck, along the ship's length; then the captain against the island
const S2a = (f: number) => dolly(S(7.0, 1.55, 0.25), S(0.2, 1.15, 0.05), pushK(f, 192, 0.0016, 0.005, 30), { fov: 42 });
const S3a = (f: number) => dolly(S(-0.5, 1.5, 2.7), S(-0.6, 1.4, -0.3), pushK(f, 309, 0.0018, 0.006, 30), { fov: 40, roll: 0.03 });
// 4: the beach, the sea and the sinking ship behind him
const S4a = (f: number) => dolly(G(-0.9, 1.45, -16.2), G(0.6, 1.3, -9.8), pushK(f, 377, 0.0015, 0.005, 30), { fov: 42 });
// 5: night, low by his feet at the hut
const S5a = (f: number) => dolly(G(-4.6, 0.75, -16.9), G(-5.9, 0.3, -21.3), pushK(f, 506, 0.0018, 0.006, 30), { fov: 44, roll: -0.03 });
// 6: feeding the cats
const S6a = (f: number) => dolly(G(0.9, 1.05, -8.2), G(0.65, 0.7, -14.8), pushK(f, 602, 0.0014, 0.004, 30), { fov: 42 });
// 7: high and wide over the sleeping cats
const S7a = (f: number) => dolly(G(1.6, 4.2, -11.0), G(-1.0, 0.3, -17.6), pushK(f, 730, 0.0012), { fov: 46, roll: 0.02 });
// 8: by the fire at sunset with the goats
const S8a = (f: number) => dolly(G(2.0, 1.5, -8.8), G(2.0, 0.95, -16.0), pushK(f, 802, 0.0013, 0.004, 30), { fov: 44 });
// 9: the notches on the palm
const S9a = (f: number) => dolly(G(5.6, 1.45, -19.1), G(5.5, 1.4, -20.7), pushK(f, 964, 0.0022), { fov: 40, roll: 0.02 });
// 10: on the shore, a sail on the horizon
const S10a = (f: number) => dolly(G(-5.4, 1.55, -12.4), [-4.31, D0 + 0.72, -6.5] as V3, pushK(f, 1026, 0.0015, 0.004, 30), { fov: 42 });
// 11: tracking along the beach: he outruns the bulldog
export const runX = (f: number) => { const s = (f - 1084) / FPS; return { me: -6.4 + 5.8 * s, dog: -3.2 + 3.6 * s, cam: -4.2 + 4.5 * s }; };
const S11a = (f: number) => { const c = runX(f).cam; return { pos: G(c, 1.25, -4.3), look: G(c + 0.2, 0.9, -11.2), fov: 44, roll: 0 }; };
// 12: the sailors on the beach, the rowboat and the anchored ship behind
const S12a = (f: number) => dolly(G(-2.4, 1.5, -18.0), G(1.0, 1.2, -11.4), pushK(f, 1163, 0.0013, 0.004, 30), { fov: 44 });
// 13: night by the fire; the slow pull back
const S13a = (f: number) => { const k = smooth((f - 1405) / 70);
  return { pos: [1.9 + 1.4 * k, gy(1.9, -11.6) + 1.2 + 2.4 * k, -11.6 + 6.2 * k] as V3, look: G(1.6, 0.75 - 0.15 * k, -15.8), fov: 42 + 4 * k, roll: 0.02 }; };
// 14: the lonely flat at night, then the phone, then the goat
const S14a = (f: number) => dolly(R("homeN", 0.9, 1.5, 2.4), R("homeN", -0.2, 1.0, -1.7), pushK(f, 1471, 0.0018), { fov: 44 });
const S14b = (f: number) => dolly(R("homeN", -0.38, 1.1, -0.45), R("homeN", -0.42, 1.02, -0.95), pushK(f, 1534, 0.0008), { fov: 40 });
const S14c = (f: number) => dolly(R("homeN", 0.7, 1.35, 2.0), R("homeN", -0.1, 0.85, -1.7), pushK(f, 1626, 0.002, 0.006, 30), { fov: 44, roll: -0.02 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 124, cut: true, s: S1b }], 2: [{ f: 192, s: S2a }], 3: [{ f: 309, s: S3a }], 4: [{ f: 377, s: S4a }],
  5: [{ f: 506, s: S5a }], 6: [{ f: 602, s: S6a }], 7: [{ f: 730, s: S7a }], 8: [{ f: 802, s: S8a }], 9: [{ f: 964, s: S9a }],
  10: [{ f: 1026, s: S10a }], 11: [{ f: 1080, s: S11a }], 12: [{ f: 1163, s: S12a }], 13: [{ f: 1332, s: S13a }],
  14: [{ f: 1471, s: S14a }, { f: 1534, cut: true, s: S14b }, { f: 1626, cut: true, s: S14c }],
};

// impact kicks: cats (hook), SINK, here, sank, alone, rats, danced, came, outran, talk, goat
const KICKS: [number, number][] = [[166, 0.6], [292, 0.45], [358, 0.35], [424, 0.4], [466, 0.25], [540, 0.35], [930, 0.4], [1064, 0.4], [1129, 0.35],
  [1630, 0.5]].map(([f, g]) => [f / FPS, g] as [number, number]);
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
  { f: 0, cInf: 10 }, { f: 124, cInf: 9 }, { f: 196, cInf: 9 }, { f: 313, cInf: 13 }, { f: 381, cInf: 6 }, { f: 510, cInf: 14 },
  { f: 606, cInf: 10 }, { f: 734, cInf: 0 }, { f: 806, cInf: 8 }, { f: 968, cInf: 15 }, { f: 1030, cInf: 0 }, { f: 1084, cInf: 6 },
  { f: 1167, cInf: 8 }, { f: 1336, cInf: 10 }, { f: 1405, dur: 60, cInf: 3 }, { f: 1475, cInf: 9 }, { f: 1534, cInf: 16 }, { f: 1626, cInf: 9 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
