// Timeline of "Three Days Late" (Michel Siffre, two months alone in a cave without clocks, 1962 -> Feeloy): shots cut
// to the ElevenLabs read (production-siffre/voice/words.json, words hand-pinned), same camera grammar as Selkirk.
export const FPS = 30;
export const TOTAL = 1950;
export const D0 = 6.0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

/** interior sets, each far away at its own z; local (x, y, z) -> world.
 *  hq = the surface team's hut (1962), homeN = the lonely flat today, cave = the ice cave (dome + shaft) */
export const ROOMS = { hq: -1500, homeN: -1900, cave: -2400 } as const;
export type Room = keyof typeof ROOMS;
export const R = (room: Room, x: number, y: number, z: number): V3 => [x, D0 + y, ROOMS[room] + z];
/** the template's river town and island (kept compiling, not built in this short) */
export const QUAY_Z = -33.8, MX = 60, MZ = -170;
export const IC: [number, number] = [0, -70];
export const RF = 56, RB = 80, DROP = 1.6, WY = D0 - 0.5;
export const gy = (_x: number, _z: number) => D0;
export const G = (x: number, y: number, z: number): V3 => [x, D0 + y, z];
export const HUT: [number, number] = [-6, -24], FIRE: [number, number] = [2.9, -15.9], TALLY_PALM: [number, number] = [5.5, -21], BOAT: [number, number] = [3.9, -8.2];
export const DECK = 1.7;

// ---------------- the cave (local coords of room "cave") ----------------
// dome: radius CR, height CH, with a hole at the top (radius HOLE) under a vertical shaft up to SHAFT_TOP. The rope
// ladder hangs from the hole's -x edge at LADDER_X down to the floor. Camp: table TABLE (lamp + phone), tent TENT.
export const CR = 13, CH = 8, HOLE = 2.3, SHAFT_TOP = 34, LADDER_X = -1.95;
export const TABLE: [number, number] = [0.9, -2.6];
export const TENT: [number, number] = [3.8, -4.6];
export const C = (x: number, y: number, z: number) => R("cave", x, y, z);
/** the exterior: the cave mouth on an alpine meadow at the world origin */
export const MOUTH: [number, number] = [0.2, -3.4];

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type ShotDef = { id: number; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
// the cave is lamplit: the golden preset lit from behind the lens (warm faces, violet shade)
const LAMP = { light: "golden" as Light, sunAz: 160, sunEl: 26 };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 182, ...LAMP },              // hook: 1962, alone in a cave; the calendar pages fly away (a month)
  { id: 2, a: 182, b: 245, light: "day" },       // outside: Michel Siffre, 23, at the cave mouth in the Alps
  { id: 3, a: 245, b: 366, ...LAMP },            // down the shaft on the rope ladder: 130 m, into the ice cave
  { id: 4, a: 366, b: 512, ...LAMP },            // no watch, no sunlight; just a tent, and a phone to the surface
  { id: 5, a: 512, b: 722, ...LAMP },            // he called: woke / ate / slept
  { id: 6, a: 722, b: 830, light: "day" },       // the surface team writes it down; the clock gets covered
  { id: 7, a: 830, b: 946, ...LAMP },            // counting to 120
  { id: 8, a: 946, b: 996, light: "day" },       // ...took him five minutes (stopwatch)
  { id: 9, a: 996, b: 1092, ...LAMP },           // the phone rings: it's over
  { id: 10, a: 1092, b: 1152, light: "day" },    // September 14
  { id: 11, a: 1152, b: 1311, ...LAMP },         // he thought August 20; 25 days fly away
  { id: 12, a: 1311, b: 1450, ...LAMP },         // alone, nothing marks the time; the same day, three times
  { id: 13, a: 1450, b: 1660, ...LAMP },         // 1999: back underground for the year 2000; three days late
  { id: 14, a: 1660, b: TOTAL, light: "night" }, // a quiet flat today; Jenny; end card
];
export const XFADE: Record<number, number> = { 2: 8, 3: 8, 13: 12, 14: 12 };
export const FLASH_AT = -1000; // no white flash in this short
export const CARD_AT = 1845;

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

/** where Siffre is on the ladder in shot 3 (local y of his soles) */
export const climbY = (f: number) => 26 * (1 - smooth((f - 248) / 92));
// 1: a) the camp in the dark cave, pushing in on him at the table; b) close on him as the month flies off the calendar
const S1a = (f: number) => dolly(C(1.3, 1.6, 3.6), C(0.6, 1.05, -2.2), pushK(f, 0, 0.0018, 0.004, 40), { fov: 44, roll: 0.02 });
const S1b = (f: number) => dolly(C(0.85, 1.45, 0.2), C(0.45, 1.25, -2.3), pushK(f, 122, 0.0022, 0.007, 30), { fov: 42, roll: -0.03 });
// 2: outside, at the cave mouth
const S2a = (f: number) => dolly(G(0.7, 1.55, 5.6), G(0.0, 1.7, -6.0), pushK(f, 178, 0.0018, 0.005, 30), { fov: 42 });
// 3: down the shaft beside him, then out under the ceiling into the cave
const S3a = (f: number): Shot => { const y = climbY(f), k = smooth((f - 318) / 40);
  return { pos: C(1.2 + 3.2 * k, y + 1.5 + 1.2 * k, 0.6 + 4.8 * k), look: C(LADDER_X + 0.4 + 1.6 * k, y + 1.3 - 0.6 * k, -0.2 - 1.4 * k), fov: 46, roll: 0.02 }; };
// 4: a) close on him (no watch, no sunlight); b) a glide from the tent to the phone, then up the cable to the shaft
const S4a = (f: number) => dolly(C(0.3, 1.5, 1.2), C(0.25, 1.4, -2.0), pushK(f, 362, 0.0016, 0.005, 30), { fov: 42 });
const S4b = (f: number): Shot => ({ pos: C(2.6, 1.5, 0.4), look: C(3.6, 1.0, -4.4), fov: 42, roll: 0 });
const S4c = (f: number): Shot => ({ pos: C(0.95, 1.35, -1.1), look: C(0.6, 0.95, -2.65), fov: 40, roll: 0 });
const S4d = (f: number): Shot => ({ pos: C(1.1, 1.3, 0.2), look: C(LADDER_X + 0.3, 7.5, -0.1), fov: 46, roll: 0.03 });
// 5: the calls: woke (by the tent) / ate (at the table) / slept (in the tent mouth)
const S5a = (f: number) => dolly(C(2.6, 1.5, 0.3), C(3.4, 1.1, -3.2), pushK(f, 512, 0.0018, 0.006, 30), { fov: 42 });
const S5b = (f: number) => dolly(C(1.2, 1.5, 1.4), C(0.7, 1.0, -2.0), pushK(f, 580, 0.0018, 0.006, 30), { fov: 42, roll: 0.02 });
const S5c = (f: number) => dolly(C(2.9, 1.2, 0.6), C(3.7, 0.7, -3.2), pushK(f, 643, 0.0018, 0.006, 30), { fov: 42, roll: -0.02 });
// 6: the surface hut: the team at the table
const S6a = (f: number) => dolly(R("hq", 0.0, 1.55, 3.7), R("hq", -0.2, 1.2, -1.5), pushK(f, 718, 0.0016, 0.005, 30), { fov: 46 });
// 7: counting, close; 8: the stopwatch in the hut
const S7a = (f: number) => dolly(C(0.55, 1.5, 0.0), C(0.35, 1.4, -2.4), pushK(f, 826, 0.0024), { fov: 40 });
const S8a = (f: number) => dolly(R("hq", -0.2, 1.55, 0.9), R("hq", -0.45, 1.5, -1.5), pushK(f, 942, 0.002, 0.007, 30), { fov: 42 });
// 9: the phone rings on the table; 10: the team holds up the date
const S9a = (f: number) => dolly(C(1.3, 1.5, 0.9), C(1.0, 1.15, -2.4), pushK(f, 992, 0.0018, 0.006, 30), { fov: 42 });
const S10a = (f: number) => dolly(R("hq", 0.2, 1.55, 1.2), R("hq", 0.35, 1.45, -1.5), pushK(f, 1088, 0.002, 0.005, 30), { fov: 42 });
// 11: close on him: August 20; 25 days fly off
const S11a = (f: number) => dolly(C(0.6, 1.55, 1.0), C(0.35, 1.5, -2.4), pushK(f, 1148, 0.0016, 0.006, 30), { fov: 44 });
// 12: a) the slow pull back to a tiny camp in the dark; b) the same shot three times
export const SAME = [1389, 1409, 1429];
const S12a = (f: number): Shot => { const k = smooth((f - 1311) / 75);
  return { pos: C(1.0 + 2.0 * k, 1.6 + 3.2 * k, 1.2 + 8.0 * k), look: C(0.6, 1.1 - 0.3 * k, -2.6), fov: 42 + 6 * k, roll: 0.02 }; };
const S12b = (f: number): Shot => { const s0 = SAME.filter((s) => f >= s).pop() ?? SAME[0];
  return dolly(C(1.3, 1.5, 1.4), C(0.75, 1.0, -2.2), pushK(f, s0, 0.003), { fov: 42 }); };
// 13: 1999: the party in the cave
const S13a = (f: number) => dolly(C(1.3, 1.5, 1.4), C(0.6, 1.3, -2.5), pushK(f, 1446, 0.0014, 0.005, 30), { fov: 44, roll: -0.02 });
// 14: the lonely flat at night, then the phone
const S14a = (f: number) => dolly(R("homeN", 0.9, 1.5, 2.4), R("homeN", -0.2, 1.0, -1.7), pushK(f, 1656, 0.0018), { fov: 44 });
const S14b = (f: number) => dolly(R("homeN", -0.38, 1.1, -0.45), R("homeN", -0.42, 1.02, -0.95), pushK(f, 1716, 0.0008), { fov: 40 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 122, cut: true, s: S1b }], 2: [{ f: 178, s: S2a }], 3: [{ f: 241, s: S3a }],
  4: [{ f: 362, s: S4a }, { f: 432, cut: true, s: S4b }, { f: 452, dur: 14, s: S4c }, { f: 486, dur: 22, s: S4d }],
  5: [{ f: 512, s: S5a }, { f: 580, cut: true, s: S5b }, { f: 643, cut: true, s: S5c }], 6: [{ f: 718, s: S6a }],
  7: [{ f: 826, s: S7a }], 8: [{ f: 942, s: S8a }], 9: [{ f: 992, s: S9a }], 10: [{ f: 1088, s: S10a }], 11: [{ f: 1148, s: S11a }],
  12: [{ f: 1311, s: S12a }, ...SAME.map((s) => ({ f: s, cut: true, s: S12b }))], 13: [{ f: 1446, s: S13a }],
  14: [{ f: 1656, s: S14a }, { f: 1716, cut: true, s: S14b }],
};

// impact kicks: month, metres, sunlight, called x3, time(clock covered), five, rang, over, days, late
const KICKS: [number, number][] = [[161, 0.45], [289, 0.3], [402, 0.35], [552, 0.3], [615, 0.3], [687, 0.3], [787, 0.3], [961, 0.45],
  [1022, 0.45], [1071, 0.35], [1282, 0.45], [1635, 0.5]].map(([f, g]) => [f / FPS, g] as [number, number]);
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
  { f: 0, cInf: 8 }, { f: 122, cInf: 13 }, { f: 182, cInf: 6 }, { f: 245, cInf: 8 }, { f: 300, dur: 40, cInf: 3 }, { f: 366, cInf: 13 },
  { f: 432, cInf: 9 }, { f: 512, cInf: 10 }, { f: 722, cInf: 9 }, { f: 830, cInf: 14 }, { f: 946, cInf: 14 }, { f: 996, cInf: 11 },
  { f: 1092, cInf: 12 }, { f: 1152, cInf: 13 }, { f: 1311, dur: 60, cInf: 2 }, { f: 1389, cInf: 10 }, { f: 1450, cInf: 10 },
  { f: 1660, cInf: 9 }, { f: 1716, cInf: 16 },
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
