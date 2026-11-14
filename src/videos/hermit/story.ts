// Timeline of "Lonely for Hire" (Georgian ornamental hermits, Painshill + Hawkstone -> Feeloy): shots cut to the
// ElevenLabs read (production-hermit/voice/words.json, words hand-pinned), same camera grammar as Siffre.
export const FPS = 30;
export const TOTAL = 1820;
export const D0 = 6.0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

/** interior sets, each far away at its own z; local (x, y, z) -> world. pub = the village pub, homeN = the flat today */
export const ROOMS = { pub: -1500, homeN: -1900, cave: -2400 } as const;
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

// ---------------- the Georgian park (world origin) ----------------
// Painshill: the hermitage HUT1 (door toward +z) with the hermit's stool STOOL1 and the advert post POST1; a lake and a
// rotunda temple behind. Hawkstone (a second estate, same lawn further along +x): HUT2 + STOOL2 + the visitors' bell
// BELL2, and the Hawkstone Arms pub PUB (front face toward +z).
export const HUT1: [number, number] = [0, -4], STOOL1: [number, number] = [0.9, -2.0], POST1: [number, number] = [-1.45, -2.3];
export const HUT2: [number, number] = [40, -4], STOOL2: [number, number] = [40.9, -2.0], BELL2: [number, number] = [39.2, -2.2];
export const PUB: [number, number] = [52, -12];
export const STOOL_H = 0.45;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 146, light: "day" },        // hook: the park; a gentleman pays a man to be lonely
  { id: 2, a: 146, b: 306, light: "day" },      // the fashion: guests gawk at the hermit
  { id: 3, a: 306, b: 400, light: "day" },      // Hamilton pins up the job advert at Painshill
  { id: 4, a: 400, b: 600, light: "day" },      // the rules: 7 years, never speak, hair/beard/nails, never leave
  { id: 5, a: 600, b: 736, light: "day" },      // the kit: Bible, glasses, mat, hourglass, water
  { id: 6, a: 736, b: 905, light: "day" },      // £700 if he lasts; nothing if he quits
  { id: 7, a: 905, b: 970, light: "day" },      // Remington takes the job
  { id: 8, a: 970, b: 1030, light: "day" },     // three weeks later: an empty stool
  { id: 9, a: 1030, b: 1185, light: "golden", sunAz: 160, sunEl: 26 }, // found drinking in the pub; a terrible job
  { id: 10, a: 1185, b: 1276, light: "day" },   // Hawkstone: the hermit is so popular there's a queue
  { id: 11, a: 1276, b: 1330, light: "day" },   // ...they built a pub for his visitors
  { id: 12, a: 1330, b: 1440, light: "day" },   // off duty: a dummy in his place
  { id: 13, a: 1440, b: 1540, light: "day" },   // today: the garden gnome, for free
  { id: 14, a: 1540, b: TOTAL, light: "night" },// a quiet flat today; Jenny; end card
];
export const XFADE: Record<number, number> = { 10: 8, 13: 12, 14: 12 };
export const FLASH_AT = -1000; // no white flash
export const CARD_AT = 1706;

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

// 1: a) wide over the park to the hermitage; b) the gentleman paying the hermit by the hut
const S1a = (f: number) => dolly(G(3.2, 3.4, 15.5), G(0.4, 1.5, -4.5), pushK(f, 0, 0.0028), { fov: 44, roll: 0.01 });
const S1b = (f: number) => dolly(G(0.9, 1.6, 4.8), G(0.15, 1.15, -2.0), pushK(f, 90, 0.002, 0.006, 30), { fov: 44, roll: -0.02 });
// 2: the guests gawking (they stand between us and the hut)
const S2a = (f: number) => dolly(G(0.4, 1.7, 7.2), G(0.4, 1.15, -2.0), pushK(f, 142, 0.0016, 0.006, 30), { fov: 50 });
// 3: Hamilton at the advert post
const S3a = (f: number) => dolly(G(-0.2, 1.6, 2.8), G(-0.95, 1.45, -2.2), pushK(f, 302, 0.002, 0.006, 30), { fov: 42, roll: 0.02 });
// 4: close on the applicant while the rules land
const S4a = (f: number) => dolly(G(0.4, 1.55, 2.0), G(0.3, 1.45, -1.2), pushK(f, 396, 0.0012, 0.004, 30), { fov: 42 });
// 5: low over the kit on the grass, the hermit behind on his stool
const S5a = (f: number) => dolly(G(0.95, 1.25, 2.6), G(0.85, 0.75, -1.4), pushK(f, 596, 0.0016), { fov: 44, roll: 0.02 });
// 6: Hamilton with the purse
const S6a = (f: number) => dolly(G(0.25, 1.6, 3.8), G(0.25, 1.25, -1.6), pushK(f, 732, 0.0014, 0.005, 30), { fov: 44 });
// 7: Remington on the stool; 8: the same stool three weeks later, empty
const S7a = (f: number) => dolly(G(1.4, 1.55, 3.4), G(0.85, 1.1, -2.0), pushK(f, 901, 0.002, 0.006, 30), { fov: 42, roll: 0.02 });
const S8a = (f: number) => dolly(G(0.8, 1.6, 4.6), G(0.4, 1.2, -2.0), pushK(f, 966, 0.0016, 0.005, 30), { fov: 44 });
// 9: the pub: a) Hamilton finds him; b) wider, the regulars cheering
const S9a = (f: number) => dolly(R("pub", -0.2, 1.6, 4.0), R("pub", -0.6, 1.2, -0.6), pushK(f, 1026, 0.002, 0.007, 30), { fov: 44 });
const S9b = (f: number) => dolly(R("pub", 0.25, 1.65, 4.2), R("pub", 0.25, 1.2, -0.8), pushK(f, 1095, 0.0016, 0.005, 30), { fov: 50, roll: -0.02 });
// 10: Hawkstone: the queue at the hermit's hut; 11: the Hawkstone Arms
const S10a = (f: number) => dolly(G(41.0, 1.65, 6.2), G(39.8, 1.2, -1.6), pushK(f, 1181, 0.0016, 0.005, 30), { fov: 46 });
const S11a = (f: number) => dolly(G(51.4, 1.85, 1.8), G(51.2, 2.4, -9.0), pushK(f, 1272, 0.0016, 0.006, 30), { fov: 46 });
// 12: off duty: the hermit leaves, the dummy appears
const S12a = (f: number) => dolly(G(41.8, 1.55, 4.4), G(40.2, 1.15, -1.8), pushK(f, 1326, 0.0016, 0.006, 30), { fov: 44 });
// 13: today: the gnome on the stool
const S13a = (f: number) => dolly(G(1.3, 1.0, 2.2), G(0.9, 0.75, -2.0), pushK(f, 1436, 0.0022, 0.007, 30), { fov: 42 });
// 14: the lonely flat at night, then the phone
const S14a = (f: number) => dolly(R("homeN", 0.9, 1.5, 2.4), R("homeN", -0.2, 1.0, -1.7), pushK(f, 1536, 0.0018), { fov: 44 });
const S14b = (f: number) => dolly(R("homeN", -0.38, 1.1, -0.45), R("homeN", -0.42, 1.02, -0.95), pushK(f, 1601, 0.0008), { fov: 40 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 90, cut: true, s: S1b }], 2: [{ f: 142, s: S2a }], 3: [{ f: 302, s: S3a }], 4: [{ f: 396, s: S4a }],
  5: [{ f: 596, s: S5a }], 6: [{ f: 732, s: S6a }], 7: [{ f: 901, s: S7a }], 8: [{ f: 966, s: S8a }],
  9: [{ f: 1026, s: S9a }, { f: 1095, cut: true, s: S9b }], 10: [{ f: 1181, s: S10a }], 11: [{ f: 1272, s: S11a }], 12: [{ f: 1326, s: S12a }],
  13: [{ f: 1436, s: S13a }], 14: [{ f: 1536, s: S14a }, { f: 1601, cut: true, s: S14b }],
};

// impact kicks: lonely, gawk, strict, never-speak, beard, nothing, job, found, pub, popular, pub (sign), dummy, free
const KICKS: [number, number][] = [[96, 0.3], [281, 0.35], [383, 0.35], [441, 0.3], [505, 0.35], [868, 0.4], [956, 0.3], [1041, 0.45],
  [1080, 0.35], [1240, 0.3], [1288, 0.4], [1400, 0.45], [1516, 0.5]].map(([f, g]) => [f / FPS, g] as [number, number]);
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
  { f: 0, cInf: 0 }, { f: 90, cInf: 9 }, { f: 146, cInf: 7 }, { f: 306, cInf: 10 }, { f: 400, cInf: 13 }, { f: 600, cInf: 12 },
  { f: 736, cInf: 9 }, { f: 905, cInf: 10 }, { f: 970, cInf: 8 }, { f: 1030, cInf: 10 }, { f: 1095, cInf: 8 }, { f: 1185, cInf: 6 },
  { f: 1276, cInf: 4 }, { f: 1330, cInf: 8 }, { f: 1440, cInf: 13 }, { f: 1540, cInf: 9 }, { f: 1601, cInf: 16 },
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
export const shipAt = (_id: number, _f: number): ShipPose | null => null;
export const runX = (_f: number) => ({ me: 0, dog: 0, cam: 0 });
export const S = (x: number, y: number, z: number): V3 => [x, y, z];
export const DY = 0;
