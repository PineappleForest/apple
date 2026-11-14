"""Soundtrack for "Three Days Late" (Michel Siffre, alone in a cave, 1962 -> Feeloy), 65 s, 48 kHz.
Original score (own additive synthesis from lib/instruments.py) + synthesized SFX (lib/sfx_gen.py + small animal voices
here) + the voice, mixed: music +3 dB, SFX -6 dB relative to their base levels, voice unchanged, music ducked -3 dB under
speech, integrated -15 LUFS, true peak <= -1.2 dBTP. Writes mix.wav, stems/, cues.md.
Picture timing is mirrored from src/videos/siffre/story.ts + cast.ts (frames at 30 fps): re-run after any timing change.
usage: python3 -I make_audio.py <production-siffre dir>
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
from dsp import SR, ns, tt, rng, dbg, lp, hp, bp, pan, place, fades, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, colored, smooth_noise
import instruments as I
import sfx_gen as G

ROOT = sys.argv[1]
FPS, TOTAL = 30, 1950
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

# ================================================================ music (D minor / D major; music box, pluck, glock, a ticking motif)
mus = np.zeros((2, N))
CH = {"D": [50, 54, 57], "Dm": [50, 53, 57], "G": [55, 59, 62], "A": [57, 61, 64], "Bb": [58, 62, 65], "C": [48, 52, 55], "Gm": [55, 58, 62], "F": [53, 57, 60]}
def pad(f0, f1, notes, g=0.22, gain=0.6): put(mus, I.pad([m2f(n) for n in notes], F(f1) - F(f0), g, R, att=0.5, rel=0.5), F(f0), gain)
def mbox(f0, notes, step=0.4, g=0.34, gain=0.55): [put(mus, I.musicbox(m2f(m + 12), g, R, 1.5), F(f0) + k * step, gain, 0.25 * ((k % 3) - 1)) for k, m in enumerate(notes)]
def plucks(f0, f1, prog, step, mel=None, vel=0.6):
    t = F(f0); k = 0
    while t < F(f1) - 0.1:
        ch = CH[prog[(k // 4) % len(prog)]]
        put(mus, I.pluck(m2f(ch[k % 3] + 12), 0.3 * vel, R, 0.35, 0.6), t, 0.5, 0.3 * (1 if k % 2 else -1))
        if k % 4 == 0: put(mus, I.pluck(m2f(ch[0] - 12), 0.6 * vel, R, 0.8, 0.3), t, 0.7, -0.1)
        if mel: m = mel[k % len(mel)]; (m and put(mus, I.glock(m2f(m), 0.36 * vel, R, step + 0.4), t, 0.55, 0.15))
        t += step; k += 1
# 1: alone in the cave: a dark Dm pad, a music-box line; the month flies away: falling glock run
pad(0, 182, (50, 57, 62, 65), 0.26); mbox(4, (74, 77, 76, 72, 74, 69), 0.62)
for k in range(7): put(mus, I.glock(m2f(88 - k * 2), 0.32, R, 0.5), F(131) + k * 0.12, 0.5, 0.3 * (1 if k % 2 else -1))
cue(0.0, "music: Dm pad + music box (alone in the cave); falling glock as the month flies away")
# 2: outside in the Alps: bright D-major plucks; 3: down the ladder: a descending pluck line into the dark
plucks(182, 248, ["D", "G"], 0.24, [78, 0, 81, 0, 79, 0, 76, 0], 0.7)
t = F(248)
for k in range(18): put(mus, I.pluck(m2f(81 - k), 0.4, R, 0.4, 0.6), t + k * 0.28, 0.5, 0.2 * (1 if k % 2 else -1))
pad(300, 366, (50, 53, 57, 62), 0.24); put(mus, I.timpani(m2f(38), 0.6, R, 1.6), F(289), 0.5)
cue(F(182), "music: bright plucks outside; descending pluck line down the shaft; timpani on '130 m'")
# 4: no watch / no sunlight (two stabs), the tent and the phone (music box), up the cable (rising glock)
for f0 in (374, 405): put(mus, mx(I.brass(m2f(50), 0.25, 0.8, R, kind="stab"), I.brass(m2f(56), 0.25, 0.8, R, kind="stab")), F(f0), 0.55)
pad(366, 512, (50, 57, 62), 0.18); mbox(440, (69, 74, 78), 0.3)
for k in range(6): put(mus, I.glock(m2f(74 + k * 2), 0.32, R, 0.5), F(486) + k * 0.13, 0.45, 0.15)
# 5: the calls montage: a perky pluck loop; a little 'ding' on each 'called'
plucks(512, 722, ["D", "A", "G", "A"], 0.26, [74, 0, 78, 0, 76, 0, 73, 0], 0.65)
for f0 in (552, 615, 687): put(mus, I.glock(m2f(86), 0.4, R, 0.8), F(f0), 0.55, 0.2)
cue(F(512), "music: perky pluck loop for the calls, glock ding on each 'called'")
# 6: the hut: a busy little tick-tock pluck; cloth over the clock = the ticking stops
t = F(722); k = 0
while t < F(787): put(mus, I.pluck(m2f([69, 74][k % 2] + 12), 0.36, R, 0.25, 0.8), t, 0.45, 0.4 * (1 if k % 2 else -1)); t += 0.5; k += 1
pad(722, 830, (55, 59, 62), 0.16); put(mus, I.pluck(m2f(45), 0.6, R, 1.0, 0.3), F(787), 0.6)
# 7: counting: slow ticking music box under the numbers; 8: stopwatch: a 'boing' on five minutes
for k in range(9): put(mus, I.musicbox(m2f(81 if k % 2 else 76), 0.28, R, 1.0), F(846) + k * 0.43, 0.45, 0.2 * (1 if k % 2 else -1))
pad(830, 996, (50, 57, 60), 0.16)
put(mus, mx(I.brass(m2f(45), 0.25, 0.8, R, kind="tuba"), I.brass(m2f(57), 0.45, 0.8, R, kind="tuba", fall=-5)), F(961), 0.65)
cue(F(846), "music: slow ticking music box (counting); tuba 'boing' on five minutes")
# 9-10: the phone rings (tension plucks) -> it's over (bright brass) -> September 14 (fanfare)
t = F(996)
for k in range(10): put(mus, I.pluck(m2f([62, 63][k % 2]), 0.4, R, 0.25, 0.5), t + k * 0.16, 0.5, 0.2)
for k, (m, d) in enumerate([(62, 0.18), (66, 0.18), (69, 0.18), (74, 0.6)]):
    put(mus, mx(I.brass(m2f(m), d, 0.8, R, kind="horn"), I.brass(m2f(m - 12), d, 0.55, R, kind="horn")), F(1069) + k * 0.16, 0.55)
put(mus, I.cymbal(0.35, R, 1.4), F(1106), 0.35, 0.2); pad(1092, 1152, (50, 54, 57, 62), 0.2)
cue(F(1012), "music: tension plucks under the ring; brass on 'over'; cymbal on September 14")
# 11: August 20?: a puzzled two-note music box; then 25 pages flutter off: a fast falling glock cascade, wah on 'days'
pad(1152, 1311, (50, 53, 57), 0.2); mbox(1188, (74, 70), 0.45)
for k in range(25): put(mus, I.glock(m2f(93 - (k % 12) * 2), 0.24, R, 0.35), F(1236) + k * 0.07, 0.4, 0.4 * ((k % 3) - 1))
put(mus, mx(I.brass(m2f(43), 0.4, 0.8, R, kind="tuba"), I.brass(m2f(41), 0.9, 0.8, R, kind="tuba", fall=-4)), F(1278), 0.6)
cue(F(1236), "music: glock cascade (25 days fly off), tuba wah on 'days'")
# 12: alone, nothing marks the time: sparse music box; the same day x3: the SAME two-bar phrase three times, identical
pad(1311, 1389, (50, 53, 57, 62), 0.24); mbox(1316, (74, 72, 69, 65), 0.65)
for s0 in (1389, 1409, 1429):
    for k, m in enumerate((74, 77, 81)): put(mus, I.musicbox(m2f(m + 12), 0.34, R, 0.6), F(s0) + k * 0.16, 0.55, 0.0)
cue(F(1389), "music: the same three-note phrase three times, identical (same day)")
# 13: 1999 -> 2000: a party polka in D builds; pop + cymbal on 'celebrated'; a sad trombone on 'late'
pad(1450, 1530, (50, 57, 62), 0.18); mbox(1460, (69, 74, 78, 81), 0.35)
b = 60 / 150; t = F(1535); k = 0
while t < F(1630):
    ch = CH[["D", "A", "D", "G"][(k // 2) % 4]]
    put(mus, I.brass(m2f(ch[0] - 12), 0.15, 0.5, R, kind="tuba"), t, 0.55)
    put(mus, mx(*[I.pluck(m2f(n + 12), 0.26, R, 0.2, 0.6) for n in ch]), t + b / 2, 0.4, 0.2)
    put(mus, I.glock(m2f([78, 81, 86, 81, 78, 76, 74, 76][k % 8]), 0.4, R, 0.5), t, 0.5, 0.15)
    t += b; k += 1
put(mus, I.cymbal(0.45, R, 1.8), F(1600), 0.45, 0.2)
for k, (m, d) in enumerate([(55, 0.3), (54, 0.3), (53, 0.3), (52, 1.0)]): put(mus, I.brass(m2f(m - 12), d, 0.75, R, kind="tuba", fall=-2 if k == 3 else 0), F(1632) + k * 0.32, 0.6)
cue(F(1535), "music: party polka for 2000; cymbal on 'celebrated'; sad trombone on 'three days late'")
# 14: the Feeloy section (warm D pad, pluck arps, glock), end-card chord
B0, BEAT2, CARD = F(1660), 60 / 96, 1845
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
ir = make_ir(1.4, 11, hf=0.75)
mus = mus * 0.78 + convolve_st(mus, ir)[:, :N] * 0.22
mus[:, :] *= np.clip((DUR - np.arange(N) / SR) / 0.6, 0, 1)

# ================================================================ SFX
sfx = np.zeros((2, N))
def popb(t, g=0.4, p=0.0): put(sfx, fades(np.sin(2 * np.pi * np.cumsum(np.linspace(500, 1100, ns(0.09))) / SR) * np.hanning(ns(0.09)), 0.0, 0.01), t, g, p)
def whoosh(t, d=0.45, g=0.5, p=0.0): put(sfx, G.whoosh(d, R, peak=d * 0.55), t - d * 0.55, g, p)
def drips(f0, f1, g=0.18):
    t = F(f0)
    while t < F(f1) - 0.2:
        d = 0.05; x = np.sin(2 * np.pi * np.cumsum(np.linspace(1400 + 900 * R.random(), 2600, ns(d))) / SR) * np.exp(-tt(d) / 0.012)
        put(sfx, x, t, g * (0.5 + 0.5 * R.random()), 0.8 * (R.random() - 0.5)); t += 0.5 + 1.1 * R.random()
def cave_bed(f0, f1, g=0.2):
    n = ns(F(f1) - F(f0)); x = lp(colored(n, R, 1.0), 220) * 0.6 + bp(colored(n, R, 0.5), 300, 900) * 0.15
    put(sfx, fades(np.vstack([x, np.roll(x, ns(0.03))]), 0.3, 0.3), F(f0), g); drips(f0, f1)
def bell_ring(t0, n=2, g=0.3):
    for k in range(n):
        d = 0.9; m = (np.sin(2 * np.pi * 22 * tt(d)) > 0).astype(float)
        x = (np.sin(2 * np.pi * 1180 * tt(d)) + 0.6 * np.sin(2 * np.pi * 1560 * tt(d))) * (0.4 + 0.6 * m) * np.exp(-tt(d) / 0.6)
        put(sfx, fades(x * 0.4, 0.005, 0.1), t0 + k * 1.2, g, 0.2)
def tick(t, g=0.15, p=0.0): put(sfx, G.clink(R, 2600, 0.025, 0.6), t, g, p)
def flutter(t, g=0.12, p=0.0): n = ns(0.18); put(sfx, bp(colored(n, R, 0.3), 1500, 6000) * np.abs(np.sin(np.linspace(0, 9 * np.pi, n))) * np.hanning(n), t, g, p)
def clatter(t, g=0.3): put(sfx, mx(G.clink(R, 900, 0.06, 0.5), lp(colored(ns(0.12), R, 0.3), 2500) * np.exp(-tt(0.12) / 0.04)), t, g, 0.1)
cave_bed(0, 182); cave_bed(245, 722); cave_bed(830, 946); cave_bed(996, 1092); cave_bed(1152, 1660, 0.17)
cue(0.0, "sfx: cave bed (low rumble, drips) under every cave shot")
for k in range(7): flutter(F(131) + k * 0.17, 0.14, 0.3 * ((k % 3) - 1))
put(sfx, fades(G.breeze(F(245) - F(182), R, 0.6), 0.2, 0.2), F(182), 0.2); put(sfx, G.bird_chirps(F(245) - F(182), R, 0.5, "sparrow"), F(182), 0.12, 0.4)
whoosh(F(182), 0.4, 0.3)
for k in range(18): put(sfx, mx(G.creak(0.18, R)), F(250) + k * 0.28, 0.08, -0.2)
put(sfx, mx(G.boot(R, 0.6)), F(340), 0.3); cue(F(250), "sfx: alpine breeze + birds outside; ladder creaks down the shaft, boots land")
for f0 in (552, 615, 687): clatter(F(f0) - 0.1, 0.22)
put(sfx, mx(G.oof(R, "oof")), F(530), 0.2)
for k in range(int((F(787) - F(722)) / 0.5)): tick(F(722) + k * 0.5, 0.14, 0.4 * (1 if k % 2 else -1))
whoosh(F(784), 0.3, 0.25); cue(F(722), "sfx: the hut clock ticking, stops when covered")
for k in range(int((F(996) - F(946)) / 0.5) + 1): tick(F(946) + k * 0.5, 0.2, 0.3)
put(sfx, G.clink(R, 3200, 0.2, 0.7), F(960), 0.35); cue(F(946), "sfx: stopwatch ticks, ding at 5:00")
bell_ring(F(1012), 2, 0.32); clatter(F(1040), 0.3); cue(F(1012), "sfx: field telephone bell rings twice, handset lifted")
popb(F(1104), 0.35); popb(F(1188), 0.3)
for k in range(25): flutter(F(1236) + k * 0.066, 0.1, 0.5 * ((k % 3) - 1))
cue(F(1236), "sfx: 25 paper flutters")
popb(F(1458), 0.3); popb(F(1548), 0.35)
put(sfx, mx(G.clink(R, 600, 0.05, 0.4), lp(colored(ns(0.08), R, 0.0), 4000) * np.exp(-tt(0.08) / 0.02) * 2), F(1600), 0.45, 0.2)
for k in range(10): flutter(F(1602) + k * 0.05, 0.08, 0.5 * ((k % 3) - 1))
popb(F(1620), 0.35); cue(F(1600), "sfx: champagne cork pop + confetti")
n = ns(DUR - F(1660)); put(sfx, fades(lp(colored(n, R, 1.0), 400) * 0.25, 0.3, 0.6), F(1660), 0.12)
for k in range(int((F(1716) - F(1660)) / 0.1)): flutter(F(1660) + k * 0.1, 0.04, 0.6)
popb(F(1680), 0.3)
put(sfx, mx(I.glock(m2f(86), 0.5, R, 0.8), I.glock(m2f(93), 0.4, R, 0.8)), F(1716), 0.55); cue(F(1716), "sfx: Feeloy chime (phone)")
popb(F(1814), 0.35); whoosh(F(1845), 0.5, 0.45); cue(F(1845), "sfx: end-card whoosh")
for f0 in (1389, 1409, 1429): whoosh(F(f0), 0.2, 0.15)

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
