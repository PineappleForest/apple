"""Soundtrack for "Lonely for Hire" (Georgian ornamental hermits -> Feeloy), 60.7 s, 48 kHz.
Original score (own additive synthesis from lib/instruments.py) + synthesized SFX (lib/sfx_gen.py + small animal voices
here) + the voice, mixed: music +3 dB, SFX -6 dB relative to their base levels, voice unchanged, music ducked -3 dB under
speech, integrated -15 LUFS, true peak <= -1.2 dBTP. Writes mix.wav, stems/, cues.md.
Picture timing is mirrored from src/videos/hermit/story.ts + cast.ts (frames at 30 fps): re-run after any timing change.
usage: python3 -I make_audio.py <production-hermit dir>
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
from dsp import SR, ns, tt, rng, dbg, lp, hp, bp, pan, place, fades, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, colored, smooth_noise
import instruments as I
import sfx_gen as G

ROOT = sys.argv[1]
FPS, TOTAL = 30, 1820
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

# ================================================================ music (D major; a Georgian minuet on plucked "harpsichord", a pub jig)
mus = np.zeros((2, N))
CH = {"D": [50, 54, 57], "Dm": [50, 53, 57], "G": [55, 59, 62], "A": [57, 61, 64], "Bm": [47, 50, 54], "Em": [52, 55, 59], "F#m": [54, 57, 61]}
def pad(f0, f1, notes, g=0.2, gain=0.55): put(mus, I.pad([m2f(n) for n in notes], F(f1) - F(f0), g, R, att=0.4, rel=0.5), F(f0), gain)
def harp(m, t, g=0.42, d=0.5, p=0.0): put(mus, I.pluck(m2f(m), g, R, d, 0.85), t, 0.55, p)
MIN = [[78, 76, 74], [73, 74, 76], [74, 69, 71], [73, 0, 0], [76, 78, 79], [81, 79, 78], [76, 74, 73], [74, 0, 0]]
MPROG = ["D", "A", "Bm", "A", "G", "D", "A", "D"]
def minuet(f0, f1, vel=0.8, start=0):
    """3/4: bass on 1, chord on 2 and 3, melody in quarters"""
    b = 60 / 132; t = F(f0); k = start
    while t < F(f1) - 0.2:
        ch = CH[MPROG[k % 8]]
        harp(ch[0] - 12, t, 0.5 * vel, 0.9, -0.15)
        for j in (1, 2): put(mus, mx(*[I.pluck(m2f(n + 12), 0.2 * vel, R, 0.3, 0.8) for n in ch]), t + j * b, 0.4, 0.2)
        for j, m in enumerate(MIN[k % 8]):
            if m: harp(m + 12, t + j * b, 0.45 * vel, 0.45, 0.1)
        t += 3 * b; k += 1
    return k
def jig(f0, f1, vel=0.85):
    e = 60 / 132 / 2; t = F(f0); k = 0
    mel = [[(0, 74), (1, 76), (2, 78), (3, 79), (5, 78)], [(0, 76), (2, 74), (3, 73), (5, 71)], [(0, 69), (1, 71), (2, 73), (3, 74), (4, 76), (5, 78)], [(0, 76), (3, 74)]]
    while t < F(f1) - 0.25:
        ch = CH[["D", "G", "A", "D"][k % 4]]
        put(mus, I.brass(m2f(ch[0] - 12), 0.2, 0.45 * vel, R, kind="tuba"), t, 0.55); put(mus, I.brass(m2f(ch[2] - 12), 0.2, 0.4 * vel, R, kind="tuba"), t + 3 * e, 0.5)
        for j in (2, 5): put(mus, mx(*[I.pluck(m2f(n + 12), 0.24 * vel, R, 0.25, 0.6) for n in ch]), t + j * e, 0.4, 0.25 * (1 if j == 2 else -1))
        for o, m in mel[k % 4]: put(mus, I.fife(m2f(m), e * 0.9, 0.5 * vel, R), t + o * e, 0.55, 0.15)
        t += 6 * e; k += 1
# 1-3: the park: the minuet (soft under the hook, fuller for the fashion and the advert); sting on 'gawk' and 'strict'
pad(0, 146, (50, 57, 62, 66), 0.2); k = minuet(0, 400, 0.75)
put(mus, mx(I.brass(m2f(62), 0.2, 0.7, R, kind="horn"), I.brass(m2f(66), 0.2, 0.7, R, kind="horn")), F(279), 0.5)
put(mus, mx(I.brass(m2f(45), 0.35, 0.8, R, kind="tuba"), I.brass(m2f(44), 0.6, 0.8, R, kind="tuba", fall=-3)), F(381), 0.6)
cue(0.0, "music: Georgian minuet on plucked harpsichord (the park); horn on 'gawk', tuba on 'strict'")
# 4: the rules: a pizzicato stab on each rule, a poof-glissando when the beard grows
pad(400, 600, (50, 57, 62), 0.16)
for f0 in (406, 441, 476, 553): put(mus, mx(I.pluck(m2f(38), 0.7, R, 0.6, 0.3), I.pluck(m2f(50), 0.6, R, 0.5, 0.5)), F(f0), 0.6)
for k2 in range(8): put(mus, I.glock(m2f(74 + k2 * 2), 0.28, R, 0.4), F(500) + k2 * 0.03, 0.4, 0.2)
# 5: the kit: one rising music-box note per item
for k2, f0 in enumerate((622, 636, 662, 684, 714)): put(mus, I.musicbox(m2f(74 + [0, 2, 4, 5, 7][k2] + 12), 0.36, R, 1.2), F(f0), 0.55, 0.25 * ((k2 % 3) - 1))
pad(600, 736, (55, 59, 62), 0.16)
# 6: £700 (a fanfare-let) and nothing (a sad trombone)
minuet(736, 838, 0.6, 4)
for k2, (m, d) in enumerate([(62, 0.15), (66, 0.15), (69, 0.5)]): put(mus, mx(I.brass(m2f(m), d, 0.75, R, kind="horn"), I.brass(m2f(m - 12), d, 0.5, R, kind="horn")), F(798) + k2 * 0.15, 0.5)
for k2, (m, d) in enumerate([(55, 0.3), (54, 0.3), (53, 0.3), (52, 0.9)]): put(mus, I.brass(m2f(m - 12), d, 0.75, R, kind="tuba", fall=-2 if k2 == 3 else 0), F(866) + k2 * 0.3, 0.6)
cue(F(798), "music: fanfare on £700, sad trombone on 'get nothing'")
# 7: Remington takes the job (a perky two-bar minuet); 8: three weeks later (ticking glock), the empty stool (a question)
minuet(905, 970, 0.7, 0)
for k2 in range(6): put(mus, I.glock(m2f(81 if k2 % 2 else 76), 0.26, R, 0.4), F(972) + k2 * 0.3, 0.4, 0.3 * (1 if k2 % 2 else -1))
put(mus, mx(I.musicbox(m2f(86), 0.34, R, 1.0), I.musicbox(m2f(91), 0.3, R, 1.0)), F(1004), 0.5)
pad(970, 1030, (55, 59, 62), 0.16)
# 9: the pub: a rowdy jig, louder on the cheer
jig(1030, 1185, 0.85); put(mus, I.cymbal(0.4, R, 1.4), F(1041), 0.35, 0.2); put(mus, I.cymbal(0.4, R, 1.6), F(1150), 0.4, -0.2)
cue(F(1030), "music: rowdy pub jig (fife + tuba + plucks)")
# 10-12: Hawkstone: the minuet again (fuller), a horn flourish for the pub sign, a 'boing' for the dummy
k = minuet(1185, 1440, 0.85, 0)
for k2, (m, d) in enumerate([(69, 0.15), (74, 0.15), (78, 0.5)]): put(mus, mx(I.brass(m2f(m), d, 0.7, R, kind="horn"), I.brass(m2f(m - 12), d, 0.45, R, kind="horn")), F(1286) + k2 * 0.15, 0.5)
put(mus, mx(I.brass(m2f(45), 0.25, 0.8, R, kind="tuba"), I.brass(m2f(57), 0.45, 0.8, R, kind="tuba", fall=-5)), F(1398), 0.6)
cue(F(1185), "music: the minuet returns at Hawkstone; horns for the pub sign; tuba 'boing' for the dummy")
# 13: today: the minuet on a lone music box; a coin-less ding on 'for free'
pad(1440, 1540, (50, 57, 62, 66), 0.2)
for k2, m in enumerate((78, 76, 74, 73, 74)): put(mus, I.musicbox(m2f(m + 12), 0.34, R, 1.3), F(1446) + k2 * 0.42, 0.55, 0.2 * ((k2 % 3) - 1))
put(mus, I.triangle(0.35, R, 1.6), F(1515), 0.4, 0.3)
# 14: the Feeloy section (warm D pad, pluck arps, glock), end-card chord
B0, BEAT2, CARD = F(1540), 60 / 96, 1706
PROG2 = [(50, [62, 66, 69, 74]), (47, [59, 62, 66, 71]), (43, [55, 59, 62, 67]), (45, [57, 61, 64, 69])]
MEL2 = [[(0, 78, 1.5), (2, 76, 1), (3, 74, 1)], [(0, 76, 2), (2.5, 78, 1.5)], [(0, 81, 1), (1, 79, 1), (2, 76, 2)], [(0, 74, 1.5), (2, 78, 2)]]
b = 0
while B0 + b * 4 * BEAT2 < F(CARD):
    tb = B0 + b * 4 * BEAT2; root, ch = PROG2[b % 4]; quiet = b == 0
    put(mus, I.pad([m2f(n) for n in ch], 4 * BEAT2 + 0.3, 0.3, R, att=0.4, rel=0.6), tb, 0.7)
    put(mus, I.pluck(m2f(root - 12), 0.7, R, 1.4, 0.3), tb, 0.9, -0.1)
    if not quiet:
        for k2 in range(8): put(mus, I.pluck(m2f(ch[k2 % 4] + 12), 0.32, R, 0.5, 0.6), tb + k2 * BEAT2 / 2, 0.55, 0.35 * (1 if k2 % 2 else -1))
        for (o, m, d) in MEL2[b % 4]: put(mus, I.glock(m2f(m), 0.45, R, d * BEAT2 + 0.8), tb + o * BEAT2, 0.7, 0.15)
    b += 1
cue(B0, "music: modern Feeloy section (D pad; arps + glock from 'talk to Jenny')")
for m, dt in [(62, 0), (66, 0.12), (69, 0.24), (74, 0.36)]: put(mus, I.musicbox(m2f(m + 12), 0.55, R, 2.2), F(CARD) + dt, 0.9, 0.2)
put(mus, I.pad([m2f(n) for n in (38, 50, 54, 57, 62)], DUR - F(CARD), 0.4, R, att=0.2, rel=1.0), F(CARD), 0.9)
put(mus, I.triangle(0.4, R, 2.4), F(CARD), 0.5, 0.3)
cue(F(CARD), "music: end-card chord + music box + triangle")
ir = make_ir(1.0, 11, hf=0.8)
mus = mus * 0.82 + convolve_st(mus, ir)[:, :N] * 0.18
mus[:, :] *= np.clip((DUR - np.arange(N) / SR) / 0.6, 0, 1)

# ================================================================ SFX
sfx = np.zeros((2, N))
def popb(t, g=0.4, p=0.0): put(sfx, fades(np.sin(2 * np.pi * np.cumsum(np.linspace(500, 1100, ns(0.09))) / SR) * np.hanning(ns(0.09)), 0.0, 0.01), t, g, p)
def whoosh(t, d=0.45, g=0.5, p=0.0): put(sfx, G.whoosh(d, R, peak=d * 0.55), t - d * 0.55, g, p)
def coins(t, n=8, g=0.25):
    for k in range(n): put(sfx, G.clink(R, 2800 + 900 * R.random(), 0.05, 0.6), t + k * 0.045 + 0.02 * R.random(), g * (0.6 + 0.4 * R.random()), 0.5 * (R.random() - 0.5))
def poof(t, g=0.3): n = ns(0.35); put(sfx, bp(colored(n, R, 0.5), 400, 3000) * np.exp(-np.linspace(0, 5, n)), t, g, 0.1)
def bell(t, n=3, g=0.3):
    for k in range(n): d = 1.0; x = (np.sin(2 * np.pi * 1320 * tt(d)) + 0.5 * np.sin(2 * np.pi * 2980 * tt(d))) * np.exp(-tt(d) / 0.35); put(sfx, x * 0.4, t + k * 0.22, g, -0.3)
def murmur(f0, f1, g=0.14):
    n = ns(F(f1) - F(f0)); x = bp(colored(n, R, 0.6), 250, 1400) * (0.6 + 0.4 * np.abs(smooth_noise(n, R, 6)))
    put(sfx, fades(np.vstack([x, np.roll(x, ns(0.02))]), 0.3, 0.3), F(f0), g)
def clink(t, g=0.3): put(sfx, mx(G.clink(R, 1900, 0.08, 0.5), G.clink(R, 2300, 0.07, 0.5)), t, g, 0.1)
def laugh(t, g=0.2, p=0.0, n=4):
    for k in range(n): d = 0.11; u = tt(d); x = bp(colored(ns(d), R, 0.3) * 0.4 + np.sin(2 * np.pi * (300 + 40 * k) * u), 400, 2400) * np.sin(np.pi * u / d); put(sfx, x * 0.6, t + k * 0.14, g, p)
put(sfx, G.bird_chirps(F(1030), R, 0.5, "sparrow"), 0, 0.12, 0.3); put(sfx, fades(G.breeze(F(1030), R, 0.5), 0.3, 0.3), 0, 0.12)
put(sfx, G.bird_chirps(F(1540) - F(1185), R, 0.5, "sparrow"), F(1185), 0.12, -0.3); put(sfx, fades(G.breeze(F(1540) - F(1185), R, 0.5), 0.3, 0.3), F(1185), 0.12)
cue(0.0, "sfx: birdsong + breeze in the park")
coins(F(94), 6, 0.22); laugh(F(279), 0.22, -0.3); laugh(F(283), 0.18, 0.3)
put(sfx, mx(G.boot(R, 0.7)), F(342), 0.3); put(sfx, mx(G.boot(R, 0.6)), F(350), 0.25); cue(F(342), "sfx: the advert nailed to the post")
poof(F(503), 0.35)
for f0 in (622, 636, 662, 684, 714): popb(F(f0), 0.3)
coins(F(798), 10, 0.28); poof(F(866), 0.35); cue(F(798), "sfx: coins on £700, a poof as the purse vanishes")
popb(F(925), 0.3); popb(F(978), 0.3); popb(F(1004), 0.3)
murmur(1030, 1185, 0.16); clink(F(1036)); clink(F(1100)); clink(F(1150), 0.36); laugh(F(1150), 0.25, -0.2, 5); laugh(F(1156), 0.22, 0.3, 5)
cue(F(1030), "sfx: pub murmur, mug clinks, a cheer and laughter")
bell(F(1196), 3, 0.32); cue(F(1196), "sfx: the visitors' bell at Hawkstone")
popb(F(1286), 0.35); murmur(1276, 1330, 0.12); clink(F(1300), 0.25)
for k in range(8): put(sfx, mx(G.stroll_step(R, 0.7)), F(1352) + k * 0.24, 0.12, 0.2)
popb(F(1398), 0.4); laugh(F(1412), 0.16, -0.3)
popb(F(1446), 0.3); popb(F(1515), 0.35)
n = ns(DUR - F(1540)); put(sfx, fades(lp(colored(n, R, 1.0), 400) * 0.25, 0.3, 0.6), F(1540), 0.12)
popb(F(1566), 0.3)
put(sfx, mx(I.glock(m2f(86), 0.5, R, 0.8), I.glock(m2f(93), 0.4, R, 0.8)), F(1601), 0.55); cue(F(1601), "sfx: Feeloy chime (phone)")
popb(F(1676), 0.35); whoosh(F(1706), 0.5, 0.45); cue(F(1706), "sfx: end-card whoosh")
whoosh(F(1030), 0.35, 0.25); whoosh(F(1185), 0.35, 0.2); whoosh(F(1540), 0.4, 0.25)

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
