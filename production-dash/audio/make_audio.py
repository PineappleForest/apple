"""Soundtrack for "Dash Comes First" (Queen Victoria and her spaniel Dash -> Feeloy), 64 s, 48 kHz.
Original score (own additive synthesis from lib/instruments.py) + synthesized SFX (lib/sfx_gen.py + small animal voices
here) + the voice, mixed: music +3 dB, SFX -6 dB relative to their base levels, voice unchanged, music ducked -3 dB under
speech, integrated -15 LUFS, true peak <= -1.2 dBTP. Writes mix.wav, stems/, cues.md.
Picture timing is mirrored from src/videos/dash/story.ts + cast.ts (frames at 30 fps): re-run after any timing change.
usage: python3 -I make_audio.py <production-dash dir>
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
from dsp import SR, ns, tt, rng, dbg, lp, hp, bp, pan, place, fades, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, colored, smooth_noise
import instruments as I
import sfx_gen as G

ROOT = sys.argv[1]
FPS, TOTAL = 30, 1920
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

# ================================================================ music (D major; a music-box waltz, a coronation fanfare, a galop)
mus = np.zeros((2, N))
CH = {"D": [50, 54, 57], "A": [57, 61, 64], "G": [55, 59, 62], "Bm": [47, 50, 54], "Em": [52, 55, 59], "F#m": [54, 57, 61], "Dm": [50, 53, 57], "Gm": [55, 58, 62]}
def pad(f0, f1, notes, g=0.2, gain=0.55): put(mus, I.pad([m2f(n) for n in notes], F(f1) - F(f0), g, R, att=0.4, rel=0.5), F(f0), gain)
WMEL = [[78, 0, 76], [74, 0, 0], [76, 78, 79], [81, 0, 0], [83, 0, 81], [79, 0, 78], [76, 74, 76], [74, 0, 0]]
WPROG = ["D", "A", "G", "D", "G", "D", "A", "D"]
def waltz(f0, f1, vel=0.7, inst="musicbox", minor=False, start=0):
    b = 60 / 150; t = F(f0); k = start
    while t < F(f1) - 0.2:
        ch = CH[("Dm" if WPROG[k % 8] == "D" else "Gm" if WPROG[k % 8] == "G" else WPROG[k % 8]) if minor else WPROG[k % 8]]
        put(mus, I.pluck(m2f(ch[0] - 12), 0.5 * vel, R, 0.8, 0.3), t, 0.6, -0.1)
        for j in (1, 2): put(mus, mx(*[I.pluck(m2f(n + 12), 0.18 * vel, R, 0.3, 0.7) for n in ch]), t + j * b, 0.38, 0.2)
        for j, m in enumerate(WMEL[k % 8]):
            if not m: continue
            m2 = m - (1 if minor and m % 12 in (6, 11) else 0)
            x = I.musicbox(m2f(m2 + 12), 0.36 * vel, R, 1.0) if inst == "musicbox" else I.glock(m2f(m2), 0.4 * vel, R, 0.7)
            put(mus, x, t + j * b, 0.55, 0.15)
        t += 3 * b; k += 1
    return k
def fanfare(f0, notes, g=0.8):
    for k, (m, d) in enumerate(notes): put(mus, mx(I.brass(m2f(m), d, g, R, kind="horn"), I.brass(m2f(m - 12), d, 0.6 * g, R, kind="horn")), F(f0) + sum(x[1] for x in notes[:k]), 0.6)
# 1: hook: a bright fanfare-let for 'crowned queen', then a bubbly waltz for the bath
fanfare(28, [(62, 0.14), (66, 0.14), (69, 0.14), (74, 0.6)]); put(mus, I.timpani(m2f(38), 0.6, R, 1.4), F(40), 0.5)
waltz(74, 150, 0.75, "glock"); cue(0.0, "music: fanfare on 'crowned queen', glock waltz for the bath")
# 2-5: Kensington: a lonely minor waltz turns major when Dash arrives; the gifts; the portrait
pad(150, 296, (50, 53, 57, 62), 0.22); waltz(150, 296, 0.55, "musicbox", minor=True)
k = waltz(296, 672, 0.7, "musicbox"); pad(296, 672, (50, 54, 57, 62), 0.16)
for f0 in (352, 462, 585): put(mus, I.glock(m2f(86), 0.4, R, 0.8), F(f0), 0.5, 0.2)
cue(F(150), "music: minor music-box waltz (lonely), major from 'Dash'; glock dings on jacket/gifts/portrait")
# 6: the sea: the waltz lifts on glock; a rising run as he jumps
waltz(672, 836, 0.8, "glock", start=4)
for k2 in range(8): put(mus, I.glock(m2f(74 + k2 * 2), 0.32, R, 0.4), F(752) + k2 * 0.05, 0.45, 0.2)
# 7: the Abbey: an organ-ish low pad, trumpets on 'crowned', bells
pad(836, 950, (38, 50, 57, 62, 66), 0.32, 0.7)
fanfare(912, [(62, 0.18), (66, 0.18), (69, 0.18), (74, 0.18), (78, 0.8)], 0.9); put(mus, I.cymbal(0.45, R, 2.0), F(917), 0.4)
cue(F(836), "music: organ pad in the Abbey; trumpets + cymbal on 'crowned'")
# 8: it went badly: a comic tuba 'wah' on the ring, two quick page-flip plucks then a 'boing'
put(mus, mx(I.brass(m2f(45), 0.35, 0.8, R, kind="tuba"), I.brass(m2f(44), 0.7, 0.8, R, kind="tuba", fall=-3)), F(998), 0.6)
pad(950, 1110, (50, 53, 57), 0.18)
for k2 in range(2): put(mus, I.pluck(m2f(81 + k2 * 5), 0.5, R, 0.3, 0.8), F(1078) + k2 * 0.12, 0.5)
put(mus, mx(I.brass(m2f(45), 0.25, 0.8, R, kind="tuba"), I.brass(m2f(57), 0.45, 0.8, R, kind="tuba", fall=-5)), F(1092), 0.55)
cue(F(998), "music: tuba 'wah' on the ring; two plucks + boing on the skipped pages")
# 9: the run: a galop (2/4) up the stairs, then the bath waltz with a cymbal on 'bath'
b = 60 / 168; t = F(1110); k2 = 0
while t < F(1226) - 0.1:
    ch = CH[["D", "A", "D", "G"][(k2 // 2) % 4]]
    put(mus, I.brass(m2f(ch[0] - 12), 0.13, 0.5, R, kind="tuba"), t, 0.55); put(mus, mx(*[I.pluck(m2f(n + 12), 0.24, R, 0.2, 0.6) for n in ch]), t + b / 2, 0.4, 0.2)
    put(mus, I.fife(m2f([74, 76, 78, 81, 79, 78, 76, 74][k2 % 8] + (0 if t < F(1194) else 5)), b * 0.45, 0.45, R), t, 0.5, 0.15); t += b; k2 += 1
waltz(1226, 1272, 0.8, "glock"); put(mus, I.cymbal(0.35, R, 1.4), F(1253), 0.35, 0.2)
cue(F(1110), "music: galop for the run (up a fourth on the stairs); bath waltz")
# 10: courtiers: busy staccato plucks; then the bath: a single happy music-box phrase
t = F(1272)
while t < F(1346): put(mus, I.pluck(m2f([69, 71, 69, 66][int((t - F(1272)) / 0.18) % 4] + 12), 0.3, R, 0.2, 0.8), t, 0.4, 0.3); t += 0.18
for k2, m in enumerate((74, 78, 81, 86)): put(mus, I.musicbox(m2f(m + 12), 0.4, R, 1.2), F(1350) + k2 * 0.2, 0.55, 0.15)
pad(1346, 1410, (50, 54, 57, 62), 0.2)
# 11: the grave: the waltz melody slow on a lone music box over a soft pad
pad(1410, 1600, (50, 54, 57, 62), 0.24, 0.6)
for k2, m in enumerate((78, 76, 74, 76, 78, 81, 79, 78, 76, 74)): put(mus, I.musicbox(m2f(m + 12), 0.32, R, 1.6), F(1418) + k2 * 0.58, 0.5, 0.2 * ((k2 % 3) - 1))
cue(F(1410), "music: the waltz, slow, on a lone music box (the grave)")
# 12: the Feeloy section, end-card chord
B0, BEAT2, CARD = F(1600), 60 / 96, 1806
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
ir = make_ir(1.2, 11, hf=0.8)
mus = mus * 0.8 + convolve_st(mus, ir)[:, :N] * 0.2
mus[:, :] *= np.clip((DUR - np.arange(N) / SR) / 0.6, 0, 1)

# ================================================================ SFX
sfx = np.zeros((2, N))
def popb(t, g=0.4, p=0.0): put(sfx, fades(np.sin(2 * np.pi * np.cumsum(np.linspace(500, 1100, ns(0.09))) / SR) * np.hanning(ns(0.09)), 0.0, 0.01), t, g, p)
def whoosh(t, d=0.45, g=0.5, p=0.0): put(sfx, G.whoosh(d, R, peak=d * 0.55), t - d * 0.55, g, p)
def yip(t, g=0.25, p=0.0):
    d = 0.12; u = np.linspace(0, 1, ns(d)); f = 900 + 500 * np.sin(np.pi * u)
    ph = 2 * np.pi * np.cumsum(f) / SR; x = bp(sum(np.sin(k * ph) / k for k in range(1, 8)), 600, 4000) * np.sin(np.pi * u)
    put(sfx, x * 0.5, t, g, p)
def suds(t0, t1, g=0.15):
    for _ in range(int((t1 - t0) * 7)):
        tt0 = t0 + R.random() * (t1 - t0); d = 0.06; f = 700 + 900 * R.random()
        put(sfx, np.sin(2 * np.pi * np.cumsum(np.linspace(f, f * 1.6, ns(d))) / SR) * np.hanning(ns(d)), tt0, g * R.random(), 0.6 * (R.random() - 0.5))
def splash(t, g=0.3): put(sfx, G.splash_big(R), t, g, 0.1)
def surf(t0, t1, g=0.25):
    n = ns(t1 - t0); sw = 0.55 + 0.45 * np.sin(2 * np.pi * np.arange(n) / SR / 5.5) ** 2
    x = lp(colored(n, R, 0.6), 1400) * sw; put(sfx, fades(np.vstack([x, np.roll(x, ns(0.02))]) * 0.35, 0.3, 0.3), t0, g)
def murmur(f0, f1, g=0.14):
    n = ns(F(f1) - F(f0)); x = bp(colored(n, R, 0.6), 250, 1400) * (0.6 + 0.4 * np.abs(smooth_noise(n, R, 6)))
    put(sfx, fades(np.vstack([x, np.roll(x, ns(0.02))]), 0.3, 0.3), F(f0), g)
def bells(t, n=6, g=0.25):
    for k in range(n): d = 2.0; f = [523, 659, 587, 784, 698, 880][k % 6]; x = (np.sin(2 * np.pi * f * tt(d)) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt(d))) * np.exp(-tt(d) / 0.8); put(sfx, x * 0.3, t + k * 0.32, g, 0.4 * ((k % 3) - 1))
def flip(t, g=0.2): n = ns(0.16); put(sfx, bp(colored(n, R, 0.3), 1500, 7000) * np.hanning(n), t, g, 0.2)
def steps(t0, t1, rate, g=0.14, step_up=False):
    k = 0; t = t0
    while t < t1: put(sfx, mx(G.boot(R, 0.5 + (0.2 if step_up else 0))), t, g, 0.2 * (1 if k % 2 else -1)); t += rate; k += 1
suds(F(80), F(150)); splash(F(120), 0.15); yip(F(126), 0.25)
murmur(0, 74, 0.08); cue(0.0, "sfx: palace murmur, bath suds, a happy yip")
yip(F(300), 0.22); popb(F(352), 0.3); popb(F(462), 0.3); yip(F(474), 0.2); popb(F(585), 0.3)
surf(F(672), F(836), 0.3); put(sfx, fades(G.breeze(F(836) - F(672), R, 0.6), 0.2, 0.2), F(672), 0.15)
yip(F(716), 0.25, 0.1); yip(F(740), 0.25, 0.1); splash(F(760), 0.4)
for k in range(10): put(sfx, G.bubbles(0.3, R, 6), F(770) + k * 0.25, 0.08, 0.2)
cue(F(760), "sfx: surf, yips, the splash as he jumps in, paddling")
murmur(836, 1110, 0.12); bells(F(917), 8, 0.22); cue(F(917), "sfx: abbey murmur, bells on 'crowned'")
put(sfx, G.creak(0.5, R), F(1000), 0.2, 0.2); flip(F(1078)); flip(F(1082))
steps(F(1112), F(1194), 0.19); steps(F(1194), F(1226), 0.16, 0.16, True)
suds(F(1226), F(1272)); splash(F(1250), 0.18); yip(F(1256), 0.25)
murmur(1272, 1346, 0.16)
for f0 in (1290, 1300, 1310): popb(F(f0), 0.25)
suds(F(1346), F(1410), 0.12); yip(F(1385), 0.22); cue(F(1226), "sfx: running feet (up the stairs), the bath, a yip; courtiers' murmur")
put(sfx, G.bird_chirps(F(1600) - F(1410), R, 0.5, "sparrow"), F(1410), 0.12, 0.3); put(sfx, fades(G.breeze(F(1600) - F(1410), R, 0.5), 0.3, 0.3), F(1410), 0.1)
n = ns(DUR - F(1600)); put(sfx, fades(lp(colored(n, R, 1.0), 400) * 0.25, 0.3, 0.6), F(1600), 0.12)
popb(F(1620), 0.3)
put(sfx, mx(I.glock(m2f(86), 0.5, R, 0.8), I.glock(m2f(93), 0.4, R, 0.8)), F(1656), 0.55); cue(F(1656), "sfx: Feeloy chime (phone)")
popb(F(1730), 0.3); popb(F(1776), 0.35); whoosh(F(1806), 0.5, 0.45); cue(F(1806), "sfx: end-card whoosh")
whoosh(F(150), 0.35, 0.2); whoosh(F(672), 0.35, 0.2); whoosh(F(836), 0.4, 0.25); whoosh(F(1410), 0.4, 0.2)

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
ceil = dbg(-2.7); win = ns(0.004)
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
