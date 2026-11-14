"""Soundtrack for "No Goats Required" (Alexander Selkirk -> Feeloy), 59.5 s, 48 kHz.
Original score (own additive synthesis from lib/instruments.py) + synthesized SFX (lib/sfx_gen.py + small animal voices
here) + the voice, mixed: music +3 dB, SFX -6 dB relative to their base levels, voice unchanged, music ducked -3 dB under
speech, integrated -15 LUFS, true peak <= -1.2 dBTP. Writes mix.wav, stems/, cues.md.
Picture timing is mirrored from src/videos/selkirk/story.ts + cast.ts (frames at 30 fps): re-run after any timing change.
usage: python3 -I make_audio.py <production-selkirk dir>
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
from dsp import SR, ns, tt, rng, dbg, lp, hp, bp, pan, place, fades, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, colored, smooth_noise
import instruments as I
import sfx_gen as G

ROOT = sys.argv[1]
FPS, TOTAL = 30, 1785
DUR = TOTAL / FPS
N = ns(DUR)
F = lambda f: f / FPS
m2f = I.m2f
R = rng(11)
cues = []
def cue(t, what): cues.append((t, what))
def mx(*xs):
    n = max(len(x) for x in xs); out = np.zeros(n)
    for x in xs: out[: len(x)] += x
    return out
def put(buf, x, t, g=1.0, p=0.0):
    if x.ndim == 1: x = pan(x, p)
    place(buf, x, t, g)

# ================================================================ music (D: a sea-shanty / jig palette)
mus = np.zeros((2, N))
CH = {"D": [50, 54, 57], "Dm": [50, 53, 57], "G": [55, 59, 62], "A": [57, 61, 64], "Bb": [58, 62, 65], "C": [48, 52, 55], "Gm": [55, 58, 62], "F": [53, 57, 60]}
def jig(f0, f1, prog, mel, bpm=116, vel=0.8, inst="pluck", bass=True):
    """6/8: bass on 1 and 4, chord plucks on 3 and 6, melody in eighths"""
    e = 60 / bpm / 2; t = F(f0); k = 0
    while t < F(f1) - 0.25:
        ch = CH[prog[k % len(prog)]]
        if bass:
            put(mus, I.brass(m2f(ch[0] - 12), 0.2, 0.5 * vel, R, kind="tuba"), t, 0.6)
            put(mus, I.brass(m2f(ch[2] - 12), 0.2, 0.42 * vel, R, kind="tuba"), t + 3 * e, 0.55)
        for j in (2, 5): put(mus, mx(*[I.pluck(m2f(n + 12), 0.26 * vel, R, 0.25, 0.6) for n in ch]), t + j * e, 0.42, 0.25 * (1 if j == 2 else -1))
        for (o, m, d) in mel[k % len(mel)]:
            x = {"glock": lambda: I.glock(m2f(m), 0.4 * vel, R, d * e + 0.5), "fife": lambda: I.fife(m2f(m), d * e * 0.9, 0.5 * vel, R),
                 "pluck": lambda: I.pluck(m2f(m), 0.5 * vel, R, d * e + 0.4, 0.75)}[inst]()
            put(mus, x, t + o * e, 0.6, 0.15)
        t += 6 * e; k += 1
JIG = [[(0, 74, 1), (1, 76, 1), (2, 78, 1), (3, 79, 2), (5, 78, 1)], [(0, 76, 2), (2, 74, 1), (3, 73, 2), (5, 71, 1)],
       [(0, 69, 1), (1, 71, 1), (2, 73, 1), (3, 74, 1), (4, 76, 1), (5, 78, 1)], [(0, 76, 3), (3, 74, 3)]]
JIGm = [[(0, 74, 1), (1, 72, 1), (2, 70, 1), (3, 69, 3)], [(0, 70, 1), (1, 69, 1), (2, 67, 1), (3, 65, 2), (5, 67, 1)],
        [(0, 69, 2), (2, 70, 1), (3, 72, 2), (5, 74, 1)], [(0, 69, 3), (3, 62, 3)]]
# 1a: sunset, alone: a soft Dm pad and a music-box line
put(mus, I.pad([m2f(n) for n in (50, 57, 62, 65)], F(124), 0.26, R, att=0.6, rel=0.4), 0, 0.7)
for o, m in [(0.3, 74), (1.1, 77), (1.9, 76), (2.7, 72), (3.5, 74)]: put(mus, I.musicbox(m2f(m + 12), 0.34, R, 1.6), o, 0.55, 0.15)
cue(0.0, "music: Dm pad + music box (alone at sunset)")
# 1b: the dance with the cats: a bright D-major jig
jig(124, 196, ["D", "G", "A", "D"], JIG, bpm=126, vel=0.85, inst="glock"); cue(F(124), "music: D jig (dancing with cats)")
# 2-3: the ship: a minor shanty, stab on SINK, wah on 'stay here'
jig(196, 381, ["Dm", "C", "Dm", "A"], JIGm, bpm=104, vel=0.75, inst="fife"); cue(F(196), "music: Dm shanty on deck (fife)")
put(mus, mx(I.brass(m2f(50), 0.35, 0.9, R, kind="stab"), I.brass(m2f(53), 0.35, 0.85, R, kind="stab"), I.brass(m2f(56), 0.35, 0.85, R, kind="stab")), F(290), 0.7)
cue(F(290), "music: brass stab on SINK")
put(mus, mx(I.brass(m2f(45), 0.3, 0.8, R, kind="tuba"), I.brass(m2f(44), 0.6, 0.8, R, kind="tuba", fall=-3)), F(356), 0.7); cue(F(356), "music: wah tuba on 'here'")
# 4: smug pluck, the ship goes down (sliding tuba), then alone (one music-box note per beat, a cold pad)
for k, m in enumerate((62, 66, 69, 74)): put(mus, I.pluck(m2f(m + 12), 0.5, R, 0.4, 0.7), F(382) + k * 0.12, 0.55, 0.2)
put(mus, mx(I.brass(m2f(43), 0.5, 0.85, R, kind="tuba"), I.brass(m2f(41), 0.6, 0.8, R, kind="tuba"), I.brass(m2f(38), 1.0, 0.8, R, kind="tuba", fall=-5)), F(412), 0.7)
cue(F(412), "music: descending tuba as the ship sinks")
put(mus, I.pad([m2f(n) for n in (50, 57, 62)], F(510) - F(446), 0.22, R, att=0.5, rel=0.5), F(446), 0.6)
for o, m in [(0, 69), (0.7, 65), (1.4, 62)]: put(mus, I.musicbox(m2f(m + 12), 0.36, R, 1.5), F(462) + o, 0.6, -0.1)
cue(F(462), "music: music box on 'alone'")
# 5: night, the rats: sneaky low pizzicato
t = F(536); k = 0
while t < F(600):
    put(mus, I.pluck(m2f([38, 41, 44, 41][k % 4] + 12), 0.45, R, 0.3, 0.35), t, 0.6, -0.2); t += 0.24; k += 1
cue(F(536), "music: sneaky low pizzicato (rats)")
put(mus, mx(I.brass(m2f(57), 0.25, 0.85, R, kind="stab"), I.brass(m2f(63), 0.25, 0.85, R, kind="stab")), F(596), 0.6)
# 6: feeding the cats: a light walking pluck in G, then 7: a lullaby for the sleeping pile
jig(606, 734, ["G", "D", "G", "A"], [[(0, 71, 2), (3, 74, 2)], [(0, 73, 2), (3, 69, 2)], [(0, 71, 1), (1, 74, 1), (2, 79, 1), (3, 78, 3)], [(0, 76, 3)]], bpm=108, vel=0.65, inst="pluck", bass=False)
put(mus, I.pad([m2f(n) for n in (55, 59, 62)], F(734) - F(606), 0.18, R, att=0.5, rel=0.4), F(606), 0.6)
put(mus, I.pad([m2f(n) for n in (50, 54, 57, 62)], F(806) - F(734), 0.24, R, att=0.4, rel=0.5), F(734), 0.65)
for k, m in enumerate((74, 78, 81, 78, 76, 74)): put(mus, I.musicbox(m2f(m + 12), 0.34, R, 1.3), F(737) + k * 0.36, 0.55, 0.2 * ((k % 3) - 1))
cue(F(734), "music: music-box lullaby (hundreds of cats asleep)")
# 8: goats, singing and dancing: the jig returns and builds; fife on 'sang', cymbal on 'danced'
jig(806, 912, ["D", "G", "A", "D"], JIG, bpm=126, vel=0.6, inst="pluck")
jig(912, 968, ["D", "G", "A", "D"], JIG, bpm=126, vel=0.95, inst="fife")
put(mus, I.cymbal(0.4, R, 1.8), F(930), 0.4, 0.2); cue(F(912), "music: jig builds; fife on 'sang', cymbal on 'danced'")
# 9-10: years pass (glock ticks), then a fanfare for the ship
for k in range(14): put(mus, I.glock(m2f([81, 76][k % 2]), 0.28, R, 0.5), F(972) + k * 0.36, 0.45, 0.25 * (1 if k % 2 else -1))
put(mus, I.pad([m2f(n) for n in (50, 57, 62, 66)], F(1036) - F(968), 0.18, R, att=0.5, rel=0.3), F(968), 0.55)
for k, (m, d) in enumerate([(62, 0.18), (66, 0.18), (69, 0.18), (74, 0.9)]):
    put(mus, mx(I.brass(m2f(m), d, 0.85, R, kind="horn"), I.brass(m2f(m - 12), d, 0.6, R, kind="horn")), F(1037) + k * 0.2, 0.6)
put(mus, I.timpani(m2f(38), 0.7, R, 1.6), F(1064), 0.6); cue(F(1037), "music: brass fanfare (a ship!)")
# 11: the race: a galloping 2/4 oompah
b = 60 / 168; t = F(1084); k = 0
while t < F(1167) - 0.15:
    ch = CH[["D", "A", "D", "G"][(k // 2) % 4]]
    put(mus, I.brass(m2f(ch[0] - 12), 0.13, 0.55, R, kind="tuba"), t, 0.6)
    put(mus, mx(*[I.pluck(m2f(n + 12), 0.26, R, 0.2, 0.6) for n in ch]), t + b / 2, 0.42, 0.2)
    put(mus, I.fife(m2f([74, 76, 78, 81, 79, 78, 76, 74][k % 8]), b * 0.45, 0.45, R), t, 0.5, 0.15)
    put(mus, I.fife(m2f([78, 79, 81, 83, 81, 79, 78, 76][k % 8]), b * 0.45, 0.45, R), t + b / 2, 0.5, 0.15)
    t += b; k += 1
cue(F(1084), "music: galop (the bulldog race)")
# 12: half-words: hesitant plucks that stop mid-phrase
for k, (f0, ms) in enumerate([(1179, (74, 76)), (1214, (71,)), (1226, (69,)), (1252, (74, 76)), (1276, (69, 65)), (1300, (62,))]):
    for j, m in enumerate(ms): put(mus, I.pluck(m2f(m + 12), 0.45, R, 0.35, 0.7), F(f0) + j * 0.18, 0.5, 0.2 * ((k % 3) - 1))
put(mus, I.pad([m2f(n) for n in (50, 55, 59)], F(1336) - F(1167), 0.16, R, att=0.5, rel=0.4), F(1167), 0.55)
cue(F(1179), "music: hesitant plucks that stop mid-phrase (half-words)")
# 13: night, the silence: a lone music box over a dark pad, thinning out
put(mus, I.pad([m2f(n) for n in (50, 53, 57, 62)], F(1475) - F(1336), 0.24, R, att=0.6, rel=0.6), F(1336), 0.6)
for o, m in [(0.5, 74), (1.3, 72), (2.1, 69), (3.4, 65), (4.6, 62)]: put(mus, I.musicbox(m2f(m + 12), 0.32, R, 1.6), F(1336) + o, 0.55, -0.1)
cue(F(1336), "music: lone music box, dark pad (the silence)")
# 14: the Feeloy section (warm D pad, pluck arps, glock), the goat gag, the end-card chord
B0, BEAT2, CARD = F(1475), 60 / 96, 1664
PROG2 = [(50, [62, 66, 69, 74]), (47, [59, 62, 66, 71]), (43, [55, 59, 62, 67]), (45, [57, 61, 64, 69])]
MEL2 = [[(0, 78, 1.5), (2, 76, 1), (3, 74, 1)], [(0, 76, 2), (2.5, 78, 1.5)], [(0, 81, 1), (1, 79, 1), (2, 76, 2)], [(0, 74, 1.5), (2, 78, 2)]]
b = 0
while B0 + b * 4 * BEAT2 < F(CARD):
    tb = B0 + b * 4 * BEAT2; root, ch = PROG2[b % 4]; quiet = b == 0
    put(mus, I.pad([m2f(n) for n in ch], 4 * BEAT2 + 0.3, 0.3, R, att=0.4, rel=0.6), tb, 0.7)
    put(mus, I.pluck(m2f(root - 12), 0.7, R, 1.4, 0.3), tb, 0.9, -0.1)
    if not quiet:
        for k in range(8): put(mus, I.pluck(m2f(ch[k % 4] + 12), 0.32, R, 0.5, 0.6), tb + k * BEAT2 / 2, 0.55, 0.35 * (1 if k % 2 else -1))
        for (o, m, d) in MEL2[b % 4]: put(mus, I.glock(m2f(m), 0.45, R, d * BEAT2 + 0.8), tb + o * BEAT2, 0.7, 0.15)
    b += 1
cue(B0, "music: modern Feeloy section (D pad; arps + glock from 'talk to Jenny')")
for m, dt in [(62, 0), (66, 0.12), (69, 0.24), (74, 0.36)]: put(mus, I.musicbox(m2f(m + 12), 0.55, R, 2.2), F(CARD) + dt, 0.9, 0.2)
put(mus, I.pad([m2f(n) for n in (38, 50, 54, 57, 62)], DUR - F(CARD), 0.4, R, att=0.2, rel=1.0), F(CARD), 0.9)
put(mus, I.triangle(0.4, R, 2.4), F(CARD), 0.5, 0.3)
cue(F(CARD), "music: end-card chord + music box + triangle")
ir = make_ir(1.1, 11, hf=0.8)
mus = mus * 0.82 + convolve_st(mus, ir)[:, :N] * 0.18
mus[:, :] *= np.clip((DUR - np.arange(N) / SR) / 0.6, 0, 1)

# ================================================================ SFX
sfx = np.zeros((2, N))
def saw(f):
    ph = 2 * np.pi * np.cumsum(f) / SR; return sum(np.sin(k * ph) / k for k in range(1, 12))
def meow(t, g=0.3, p=0.0, k=1.0):
    d = 0.5 * k; n = ns(d); u = np.linspace(0, 1, n)
    f = (520 + 380 * np.sin(np.pi * u ** 0.8) - 120 * u) * (1 + 0.01 * np.sin(2 * np.pi * 6 * u * d))
    x = bp(saw(f), 700, 3200) * np.sin(np.pi * u) ** 0.6; put(sfx, fades(x * 0.5, 0.01, 0.05), t, g, p)
def bleat(t, g=0.3, p=0.0):
    d = 0.55; n = ns(d); u = np.linspace(0, 1, n); f = 420 - 60 * u
    x = bp(saw(f), 500, 2600) * (0.55 + 0.45 * np.sin(2 * np.pi * 9 * u * d)) * np.sin(np.pi * u) ** 0.5; put(sfx, fades(x * 0.5, 0.01, 0.05), t, g, p)
def bark(t, g=0.3, p=0.0):
    for j in range(2):
        d = 0.13; n = ns(d); u = np.linspace(0, 1, n); f = 340 - 160 * u
        x = (bp(saw(f), 300, 2400) * 0.6 + bp(colored(n, R, 0.5), 600, 2400) * 0.3) * np.exp(-u * 4); put(sfx, fades(x, 0.004, 0.02), t + j * 0.2, g, p)
def squeak(t, g=0.2, p=0.0):
    d = 0.08; put(sfx, np.sin(2 * np.pi * np.cumsum(np.linspace(3200, 4300, ns(d))) / SR) * np.hanning(ns(d)), t, g, p)
def hiss(t, g=0.3, p=0.0): n = ns(0.6); put(sfx, fades(hp(colored(n, R, 0.0), 3000) * np.exp(-np.linspace(0, 3, n)), 0.01, 0.1), t, g, p)
def popb(t, g=0.4, p=0.0): put(sfx, fades(np.sin(2 * np.pi * np.cumsum(np.linspace(500, 1100, ns(0.09))) / SR) * np.hanning(ns(0.09)), 0.0, 0.01), t, g, p)
def whoosh(t, d=0.45, g=0.5, p=0.0): put(sfx, G.whoosh(d, R, peak=d * 0.55), t - d * 0.55, g, p)
def surf(t0, t1, g=0.3):
    d = t1 - t0; n = ns(d); sw = 0.55 + 0.45 * np.sin(2 * np.pi * np.arange(n) / SR / 5.5) ** 2
    x = lp(colored(n, R, 0.6), 1400) * sw; put(sfx, fades(np.vstack([x, np.roll(x, ns(0.02))]) * 0.35, 0.3, 0.3), t0, g)
def crackle(t0, t1, g=0.2):
    d = t1 - t0; n = ns(d); y = np.zeros(n)
    for _ in range(int(d * 18)):
        i = int(R.random() * (n - 400)); y[i:i + 300] += hp(colored(300, R, 0.0), 2000) * np.exp(-np.linspace(0, 6, 300)) * R.random()
    put(sfx, y + lp(colored(n, R, 1.0), 300) * 0.15, t0, g, 0.3)
def creak(t, g=0.2): put(sfx, G.creak(0.6, R), t, g, -0.2)
# beds
surf(0, F(196), 0.3); crackle(F(124), F(196), 0.18)
surf(F(196), F(381), 0.22); creak(F(210)); creak(F(330), 0.15); put(sfx, fades(G.breeze(F(381) - F(196), R, 0.6), 0.2, 0.2), F(196), 0.15)
surf(F(381), F(510), 0.32); cue(0.0, "sfx: surf, fire crackle by the dance; ship creaks + breeze on deck")
put(sfx, G.splash_big(R), F(414), 0.25, 0.4); put(sfx, G.bubbles(1.4, R, 22), F(424), 0.2, 0.4); cue(F(414), "sfx: distant splash + bubbles as the ship sinks")
put(sfx, G.crickets(F(606) - F(510), R, 3), F(510), 0.2, 0.3); surf(F(510), F(606), 0.12)
for k in range(5): squeak(F(538) + k * 0.31, 0.22, 0.3 * (1 if k % 2 else -1))
for k in range(14): put(sfx, G.clink(R, 2400, 0.03, 0.6), F(549) + k * 0.13, 0.12, 0.2)
put(sfx, mx(G.oof(R, "oof")), F(596), 0.35); cue(F(538), "sfx: rat squeaks, nibbling clicks, a startled 'oof'")
surf(F(606), F(734), 0.2); meow(F(648), 0.3, 0.3); popb(F(653), 0.25); for_ = [meow(F(f), 0.22, 0.4 * ((i % 3) - 1), 0.8) for i, f in enumerate((694, 700, 706, 712))]
put(sfx, G.crickets(F(806) - F(734), R, 3), F(734), 0.18, 0.3)
for k in range(10): meow(F(737) + k * 0.2, 0.08, 0.5 * ((k % 3) - 1), 0.6)
cue(F(648), "sfx: meows as the cats arrive; a soft chorus of sleepy mews")
crackle(F(806), F(968), 0.2); bleat(F(845), 0.3, -0.2); bleat(F(900), 0.18, 0.3)
for k in range(6): put(sfx, mx(G.boot(R, 0.4)), F(930) + k * 0.31, 0.15, 0.2 * (1 if k % 2 else -1))
cue(F(845), "sfx: goat bleats; dancing feet")
for k in range(14): put(sfx, mx(G.clink(R, 700, 0.06, 0.5), lp(colored(ns(0.05), R, 0.3), 3000) * 0.3), F(972) + k * 0.36, 0.2, 0.1)
cue(F(972), "sfx: knife notches in the bark")
surf(F(1030), F(1336), 0.26); whoosh(F(1030), 0.4, 0.3)
bark(F(1090), 0.32, 0.2); bark(F(1132), 0.28, -0.1)
for k in range(12): put(sfx, mx(G.stroll_step(R, 0.8)), F(1086) + k * 0.16, 0.12, 0.1)
bleat(F(1142), 0.3, 0.2); cue(F(1090), "sfx: bulldog barks, running feet in sand, the caught goat's bleat")
for f in (1212, 1226): put(sfx, np.sin(2 * np.pi * np.cumsum(np.linspace(300, 700, ns(0.2))) / SR) * np.exp(-tt(0.2) / 0.08), F(f), 0.2, 0.2)
put(sfx, G.crickets(F(1475) - F(1336), R, 3), F(1336), 0.2, 0.3); crackle(F(1336), F(1475), 0.14); surf(F(1336), F(1475), 0.12)
for k in range(3): squeak(F(1360) + k * 0.35, 0.18, -0.4)
hiss(F(1386), 0.3, 0.1); for_ = [squeak(F(1392) + k * 0.08, 0.2, -0.5) for k in range(3)]; cue(F(1386), "sfx: rat squeaks, cat hiss, rat flees")
n = ns(DUR - F(1475)); put(sfx, fades(lp(colored(n, R, 1.0), 400) * 0.25, 0.3, 0.6), F(1475), 0.12)
popb(F(1500), 0.3)
put(sfx, mx(I.glock(m2f(86), 0.5, R, 0.8), I.glock(m2f(93), 0.4, R, 0.8)), F(1534), 0.55); cue(F(1534), "sfx: Feeloy chime (phone)")
popb(F(1598), 0.35); popb(F(1629), 0.4); bleat(F(1636), 0.34, 0.25); cue(F(1636), "sfx: the goat's bleat in the flat")
whoosh(F(1664), 0.5, 0.45); whoosh(F(196), 0.5, 0.55); whoosh(F(124), 0.35, 0.3)
cue(F(1664), "sfx: end-card whoosh")

# ================================================================ mix
v_raw, v_sr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
assert v_sr == SR, v_sr
v = v_raw.mean(0)
voice = np.zeros(N); voice[: min(N, len(v))] = v[:N]
words = json.load(open(os.path.join(ROOT, "voice", "words.json")))["words"]
V = np.vstack([voice, voice])
Lv = integrated(V)
def to(x, lu):
    L = integrated(x); return x * dbg(lu - L) if np.isfinite(L) else x
mus_b = to(mus, Lv - 15.0) * dbg(+3.0)
sfx_b = to(sfx, Lv - 12.0) * dbg(-6.0)
duck = np.zeros(N)
for w in words:
    a, b2 = ns(max(0, w["s"] - 0.08)), ns(w["e"] + 0.12); duck[a:b2] = 1
k = ns(0.12); duck = np.convolve(duck, np.ones(k) / k, "same")
mus_d = mus_b * dbg(-3.0 * duck)[None, :]
mix = V + mus_d + sfx_b
g = dbg(-15.0 - integrated(mix)); mix *= g
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ceil = dbg(-1.9); win = ns(0.004)
pk = np.max(np.abs(mix), 0)
env = maximum_filter1d(pk, size=2 * win + 1)
gain = uniform_filter1d(np.minimum(1.0, ceil / np.maximum(env, 1e-9)), size=win)
gain = np.minimum(gain, ceil / np.maximum(pk, 1e-9))
mix *= gain[None, :]
os.makedirs(os.path.join(ROOT, "audio", "stems"), exist_ok=True)
write_wav(os.path.join(ROOT, "audio", "mix.wav"), mix)
for name, x in [("voice", V * g), ("music", mus_d * g), ("sfx", sfx_b * g)]: write_wav(os.path.join(ROOT, "audio", "stems", name + ".wav"), x)
rep = f"integrated {integrated(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP, length {mix.shape[1]/SR:.3f} s"
with open(os.path.join(ROOT, "audio", "cues.md"), "w") as fh:
    fh.write("# Cues (seconds)\n\n" + rep + "\n\nMix: voice unchanged; music base voice-15 LU then +3 dB, ducked -3 dB under words; SFX base voice-12 LU then -6 dB.\n\n")
    for t, w in sorted(cues): fh.write(f"- {t:6.2f}  {w}\n")
print(rep)
