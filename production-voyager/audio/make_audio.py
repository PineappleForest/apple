"""Soundtrack for "One Last Look" (Voyager 1 and the Pale Blue Dot -> Feeloy), 32 s, 48 kHz.
Original score (own additive synthesis from lib/instruments.py) + synthesized SFX (lib/sfx_gen.py + small animal voices
here) + the voice, mixed: music +3 dB, SFX -6 dB relative to their base levels, voice unchanged, music ducked -3 dB under
speech, integrated -15 LUFS, true peak <= -1.2 dBTP. Writes mix.wav, stems/, cues.md.
Picture timing is mirrored from src/videos/voyager/story.ts + cast.ts (frames at 30 fps): re-run after any timing change.
usage: python3 -I make_audio.py <production-voyager dir>
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
from dsp import SR, ns, tt, rng, dbg, lp, hp, bp, pan, place, fades, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, colored, smooth_noise
import instruments as I
import sfx_gen as G

ROOT = sys.argv[1]
FPS, TOTAL = 30, 960
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

# ================================================================ music (space lullaby in A minor -> C major on the photo)
mus = np.zeros((2, N))
def pad(f0, f1, notes, g=0.2, gain=0.55): put(mus, I.pad([m2f(n) for n in notes], F(f1) - F(f0), g, R, att=0.6, rel=0.8), F(f0), gain)
def mbox(f0, notes, step=0.42, g=0.5, oct=12):
    for k, m in enumerate(notes):
        if m: put(mus, I.musicbox(m2f(m + oct), 0.45, R, 1.8), F(f0) + k * step, g, 0.25 * ((k % 3) - 1))
# 1: drifting away: Am pad + music-box theme
pad(0, 128, [45, 57, 60, 64], 0.25, 0.75); mbox(4, [76, 72, 69, 71, 72, 0, 74, 72, 71])
cue(0.0, "music: A minor pad + music box theme (drifting away)")
# 2: Sagan: warm F major pad, plucked arps, a rising glock on 'favour'
pad(122, 232, [41, 53, 57, 60], 0.25, 0.7)
for k in range(8): put(mus, I.pluck(m2f([65, 69, 72, 77][k % 4]), 0.35, R, 0.5, 0.7), F(128) + k * 0.4, 0.4, 0.3 * (1 if k % 2 else -1))
for k, m in enumerate((77, 81, 84)): put(mus, I.glock(m2f(m), 0.45, R, 1.0), F(195) + k * 0.1, 0.5, 0.2)
# 3: turn around: a rising swell into the click
pad(228, 310, [48, 55, 60, 64, 67], 0.3, 0.8)
for k in range(10): put(mus, I.pluck(m2f(60 + k * 2), 0.32, R, 0.4, 0.8), F(231) + k * 0.07, 0.4, 0.3)
cue(F(231), "music: rising pluck run on 'turn around', C major swell")
# 4: the photo: everything stops; one soft high bell on 'one pixel'
pad(306, 428, [36, 48, 55, 64, 67], 0.15, 0.5)
put(mus, I.glock(m2f(88), 0.55, R, 2.6), F(399), 0.6, 0.0); put(mus, I.musicbox(m2f(100), 0.35, R, 2.2), F(401), 0.45, 0.2)
cue(F(399), "music: a single bell on 'one pixel'")
# 5: 34 minutes later: the theme again, slower, ending unresolved as the cameras go off
pad(425, 575, [45, 57, 60, 64], 0.25, 0.65); mbox(430, [76, 72, 69, 71, 72], 0.55, 0.45)
put(mus, I.musicbox(m2f(83), 0.4, R, 2.5), F(522), 0.4, 0.2)
# 6: still out there: wide, slow pad; a two-note 'hello' figure on 'hello' that never resolves
pad(571, 740, [40, 52, 59, 64, 67], 0.3, 0.7)
for k, m in enumerate((79, 76, 79, 76)): put(mus, I.glock(m2f(m), 0.35 - 0.06 * k, R, 1.2), F(654) + k * 0.8, 0.45, 0.3 * (1 if k % 2 else -1))
# 7-8: Feeloy: the theme turns major and warm
B0, BEAT2, CARD = F(735), 60 / 96, 850
PROG2 = [(45, [57, 60, 64, 69]), (41, [53, 57, 60, 65]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 67])]
MEL2 = [[(0, 76, 1.5), (2, 72, 1), (3, 74, 1)], [(0, 72, 2), (2.5, 77, 1.5)], [(0, 79, 1), (1, 76, 1), (2, 72, 2)], [(0, 74, 1.5), (2, 79, 2)]]
b = 0
while B0 + b * 4 * BEAT2 < F(CARD):
    tb = B0 + b * 4 * BEAT2; root, ch = PROG2[b % 4]
    put(mus, I.pad([m2f(n) for n in ch], 4 * BEAT2 + 0.3, 0.3, R, att=0.3, rel=0.6), tb, 0.7)
    put(mus, I.pluck(m2f(root - 12), 0.7, R, 1.4, 0.3), tb, 0.9, -0.1)
    for k2 in range(8): put(mus, I.pluck(m2f(ch[k2 % 4] + 12), 0.32, R, 0.5, 0.6), tb + k2 * BEAT2 / 2, 0.55, 0.35 * (1 if k2 % 2 else -1))
    if b >= 1:
        for (o, m, d) in MEL2[b % 4]: put(mus, I.glock(m2f(m), 0.45, R, d * BEAT2 + 0.8), tb + o * BEAT2, 0.7, 0.15)
    b += 1
cue(B0, "music: Feeloy section (A minor -> F -> C -> G, arps; glock from 'Jenny')")
for m, dt in [(60, 0), (64, 0.12), (67, 0.24), (72, 0.36)]: put(mus, I.musicbox(m2f(m + 12), 0.55, R, 2.2), F(CARD) + dt, 0.9, 0.2)
put(mus, I.pad([m2f(n) for n in (36, 48, 52, 55, 60)], DUR - F(CARD), 0.4, R, att=0.2, rel=1.0), F(CARD), 0.9)
put(mus, I.triangle(0.4, R, 2.4), F(CARD), 0.5, 0.3)
cue(F(CARD), "music: end-card chord + music box + triangle")
ir = make_ir(2.2, 11, hf=0.7)
mus = mus * 0.7 + convolve_st(mus, ir)[:, :N] * 0.3
mus[:, :] *= np.clip((DUR - np.arange(N) / SR) / 0.6, 0, 1)

# ================================================================ SFX
sfx = np.zeros((2, N))
def popb(t, g=0.4, p=0.0): put(sfx, fades(np.sin(2 * np.pi * np.cumsum(np.linspace(500, 1100, ns(0.09))) / SR) * np.hanning(ns(0.09)), 0.0, 0.01), t, g, p)
def whoosh(t, d=0.45, g=0.5, p=0.0): put(sfx, G.whoosh(d, R, peak=d * 0.55), t - d * 0.55, g, p)
def beep(t, f=1800, d=0.08, g=0.2, p=0.0): u = tt(d); put(sfx, np.sin(2 * np.pi * f * u) * np.hanning(len(u)), t, g, p)
def whir(t, d=0.7, f0=180, f1=320, g=0.2):
    n = ns(d); fr = np.linspace(f0, f1, n); ph = 2 * np.pi * np.cumsum(fr) / SR
    x = (np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.hanning(n) * (0.7 + 0.3 * np.abs(smooth_noise(n, R, 40))); put(sfx, x, t, g, 0.2)
def shutter(t, g=0.4):
    for dt, gg in ((0, 1.0), (0.07, 0.7)):
        n = ns(0.05); x = bp(colored(n, R, 0.2), 1500, 8000) * np.exp(-np.arange(n) / (0.008 * SR)); put(sfx, x, t + dt, g * gg, 0.2)
# space room tone (very low rumble) under the space shots
for f0, f1 in ((0, 125), (228, 571), (571, 735)):
    n = ns(F(f1) - F(f0)); put(sfx, fades(lp(colored(n, R, 1.2), 160) * 0.5, 0.3, 0.3), F(f0), 0.12)
# telemetry beeps from the probe
for k in range(5): beep(F(10) + k * 0.8, 1760 if k % 2 else 2093, 0.06, 0.08, 0.3)
popb(F(5), 0.25); popb(F(42), 0.25)
cue(0.0, "sfx: deep-space rumble, soft telemetry beeps, badge pops")
# 2: the office: a clock tick, the badge, the 'please' pop
for k in range(6): put(sfx, bp(colored(ns(0.02), R, 0.2), 2000, 6000) * np.hanning(ns(0.02)), F(128) + k * 0.5, 0.05, -0.3)
popb(F(156), 0.25); popb(F(195), 0.3)
# 3: the platform motor whirs round; shutter click
whir(F(231), 0.75, 200, 340, 0.22); shutter(F(268), 0.45); popb(F(268), 0.25)
cue(F(231), "sfx: platform motor whir on 'turn around'; shutter click on 'picture'")
# 5: stopwatch tick; power-down on 'off'
popb(F(428), 0.22)
whir(F(490), 1.0, 320, 60, 0.25); beep(F(489), 1046, 0.12, 0.12)
cue(F(490), "sfx: power-down whine as the cameras go off")
# 6: the hello: a paper flutter + soft pop; the 24h tick
whoosh(F(654), 0.6, 0.25); popb(F(680), 0.25)
# 7-8: the flat: room tone; a quick reply ping
n = ns(DUR - F(735)); put(sfx, fades(lp(colored(n, R, 1.0), 400) * 0.25, 0.3, 0.6), F(735), 0.12)
put(sfx, mx(I.glock(m2f(86), 0.5, R, 0.8), I.glock(m2f(93), 0.4, R, 0.8)), F(779), 0.5); cue(F(779), "sfx: Feeloy chime")
popb(F(812), 0.35); beep(F(812), 1568, 0.07, 0.15); beep(F(815), 2093, 0.08, 0.15)
cue(F(812), "sfx: instant reply ping on 'answers right away'")
whoosh(F(850), 0.5, 0.45); cue(F(850), "sfx: end-card whoosh")
whoosh(F(125), 0.35, 0.2); whoosh(F(306), 0.4, 0.2); whoosh(F(735), 0.4, 0.25)

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
