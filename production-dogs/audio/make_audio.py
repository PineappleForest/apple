"""Soundtrack for "Worth the Wait" (Frederick the Great and his greyhounds -> Feeloy), 36.7 s, 48 kHz.
Original score (own additive synthesis from lib/instruments.py) + synthesized SFX (lib/sfx_gen.py + small animal voices
here) + the voice, mixed: music +3 dB, SFX -6 dB relative to their base levels, voice unchanged, music ducked -3 dB under
speech, integrated -15 LUFS, true peak <= -1.2 dBTP. Writes mix.wav, stems/, cues.md.
Picture timing is mirrored from src/videos/dogs/story.ts + cast.ts (frames at 30 fps): re-run after any timing change.
usage: python3 -I make_audio.py <production-dogs dir>
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
from dsp import SR, ns, tt, rng, dbg, lp, hp, bp, pan, place, fades, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, colored, smooth_noise
import instruments as I
import sfx_gen as G

ROOT = sys.argv[1]
FPS, TOTAL = 30, 1100
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

# ================================================================ music (G major baroque flute: the king played the flute)
mus = np.zeros((2, N))
def pad(f0, f1, notes, g=0.2, gain=0.55): put(mus, I.pad([m2f(n) for n in notes], F(f1) - F(f0), g, R, att=0.4, rel=0.5), F(f0), gain)
PROG = [(43, [55, 59, 62]), (38, [54, 57, 62]), (40, [52, 55, 59]), (36, [52, 55, 60]), (38, [54, 57, 62]), (43, [55, 59, 62])]
MEL = [[(0, 79, 1), (1, 81, 0.5), (1.5, 83, 0.5), (2, 81, 1), (3, 79, 1)], [(0, 78, 1.5), (1.5, 76, 0.5), (2, 74, 2)],
       [(0, 76, 1), (1, 79, 1), (2, 83, 1.5), (3.5, 81, 0.5)], [(0, 79, 2), (2, 76, 1), (3, 72, 1)],
       [(0, 74, 1), (1, 78, 1), (2, 81, 1), (3, 78, 1)], [(0, 79, 3)]]
def baroque(f0, f1, bpm=104, flute=True, start=0, vel=0.7):
    b = 60 / bpm; t = F(f0); k = start
    while t < F(f1) - 0.3:
        root, ch = PROG[k % 6]
        put(mus, I.pluck(m2f(root), 0.75 * vel, R, 1.0, 0.4), t, 0.65, -0.15)
        for j in range(8): put(mus, I.pluck(m2f(ch[j % 3] + 12), 0.35 * vel, R, 0.3, 0.75), t + j * b / 2, 0.35, 0.3 * (1 if j % 2 else -1))
        if flute:
            for (o, m, d) in MEL[k % 6]:
                if t + o * b < F(f1) - 0.2: put(mus, I.fife(m2f(m), d * b * 0.95, 0.5 * vel, R), t + o * b, 0.5, 0.1)
        t += 4 * b; k += 1
baroque(0, 262); put(mus, mx(I.glock(m2f(91), 0.5, R, 1.0), I.glock(m2f(95), 0.4, R, 1.0)), F(68), 0.5, 0.2)
cue(0.0, "music: baroque flute + harpsichord (he played the flute); glock on 'loved'")
# 3: the church: low organ-ish pad, a bell on 'church'
pad(262, 352, [31, 43, 50, 55, 59], 0.3, 0.75)
put(mus, mx(I.brass(m2f(43), 0.3, 0.7, R, kind="tuba"), I.brass(m2f(42), 0.6, 0.7, R, kind="tuba", fall=-3)), F(296), 0.5)
bell = lambda f: (np.sin(2 * np.pi * f * tt(2.5)) + 0.5 * np.sin(2 * np.pi * f * 2.76 * tt(2.5)) + 0.25 * np.sin(2 * np.pi * f * 5.4 * tt(2.5))) * np.exp(-tt(2.5) / 0.9)
put(mus, bell(196.0) * 0.5, F(327), 0.6)
cue(F(262), "music: organ pad in the church, tuba 'wah' on the nephew, a bell on 'church'")
# 4: the journey: a timpani roll + snare on 'war', a pluck glissando for every hop and a thump on every landing
put(mus, I.timpani(m2f(38), 0.8, R, 1.4), F(363), 0.55); put(mus, I.snare(0.6, R), F(364), 0.35)
pad(350, 512, [43, 55, 59, 62], 0.15, 0.4)
for h0, h1 in [(382, 398), (429, 445), (466, 482)]:
    for k2 in range(6): put(mus, I.pluck(m2f(67 + k2 * 2), 0.4, R, 0.3, 0.8), F(h0) + k2 * (F(h1) - F(h0)) / 7, 0.45, 0.2)
    put(mus, I.timpani(m2f(43), 0.6, R, 0.8), F(h1), 0.45)
for k2, m in enumerate((79, 78, 77, 76)): put(mus, I.pluck(m2f(m), 0.4, R, 0.4, 0.7), F(488) + k2 * 0.12, 0.45)
cue(F(363), "music: timpani + snare on 'war'; pluck run on each hop, timpani on each landing; dizzy descending plucks")
# 5: 1991: the flute theme again, slower and warm; glock on 'dogs'
baroque(512, 722, 88, True, 0, 0.6); put(mus, mx(I.glock(m2f(86), 0.5, R, 1.4), I.glock(m2f(91), 0.4, R, 1.4), I.glock(m2f(95), 0.3, R, 1.4)), F(692), 0.6, 0.2)
cue(F(512), "music: the flute theme, slower; glock chord on 'dogs'")
# 6: potatoes: harpsichord only, a pluck per potato, a tuba 'hm' on 'long story'
baroque(722, 822, 104, False, 2, 0.6)
for k2 in range(4): put(mus, I.pluck(m2f(74 + 3 * k2), 0.5, R, 0.4, 0.8), F(744 + k2 * 6), 0.5, 0.2)
put(mus, I.brass(m2f(38), 0.45, 0.7, R, kind="tuba", fall=-2), F(789), 0.5)
# 7-8: the Feeloy section, end-card chord
B0, BEAT2, CARD = F(822), 60 / 96, 944
PROG2 = [(50, [62, 66, 69, 74]), (47, [59, 62, 66, 71]), (43, [55, 59, 62, 67]), (45, [57, 61, 64, 69])]
MEL2 = [[(0, 78, 1.5), (2, 76, 1), (3, 74, 1)], [(0, 76, 2), (2.5, 78, 1.5)], [(0, 81, 1), (1, 79, 1), (2, 76, 2)], [(0, 74, 1.5), (2, 78, 2)]]
b = 0
while B0 + b * 4 * BEAT2 < F(CARD):
    tb = B0 + b * 4 * BEAT2; root, ch = PROG2[b % 4]
    put(mus, I.pad([m2f(n) for n in ch], 4 * BEAT2 + 0.3, 0.3, R, att=0.3, rel=0.6), tb, 0.7)
    put(mus, I.pluck(m2f(root - 12), 0.7, R, 1.4, 0.3), tb, 0.9, -0.1)
    for k2 in range(8): put(mus, I.pluck(m2f(ch[k2 % 4] + 12), 0.32, R, 0.5, 0.6), tb + k2 * BEAT2 / 2, 0.55, 0.35 * (1 if k2 % 2 else -1))
    if b >= 1:
        for (o, m, d) in MEL2[b % 4]: put(mus, I.glock(m2f(m), 0.45, R, d * BEAT2 + 0.8), tb + o * BEAT2, 0.7, 0.15)
    b += 1
cue(B0, "music: modern Feeloy section (D pad, arps; glock from 'Jenny')")
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
def murmur(f0, f1, g=0.14):
    n = ns(F(f1) - F(f0)); x = bp(colored(n, R, 0.6), 250, 1400) * (0.6 + 0.4 * np.abs(smooth_noise(n, R, 6)))
    put(sfx, fades(np.vstack([x, np.roll(x, ns(0.02))]), 0.3, 0.3), F(f0), g)
def thump(t, g=0.35): put(sfx, G.push_thump(R), t, g)
def yip(t, g=0.2, p=0.0):
    d = 0.11; u = np.linspace(0, 1, ns(d)); f = 1000 + 500 * np.sin(np.pi * u)
    ph = 2 * np.pi * np.cumsum(f) / SR; x = bp(sum(np.sin(k * ph) / k for k in range(1, 8)), 600, 4000) * np.sin(np.pi * u)
    put(sfx, x * 0.5, t, g, p)
def garden(f0, f1, g=0.12):
    put(sfx, G.bird_chirps(F(f1) - F(f0), R, 0.5, "sparrow"), F(f0), g, 0.3); put(sfx, fades(G.breeze(F(f1) - F(f0), R, 0.5), 0.3, 0.3), F(f0), g * 0.8)
garden(0, 262); garden(512, 822, 0.1)
yip(F(70), 0.18, 0.3); yip(F(76), 0.15, 0.3); popb(F(47), 0.25); popb(F(68), 0.25); popb(F(128), 0.22); popb(F(233), 0.25)
cue(0.0, "sfx: palace garden (sparrows, breeze), happy yips on 'loved', pops on badges/bubbles")
murmur(262, 350, 0.08); popb(F(330), 0.22)
for f0 in (398, 445, 482): thump(F(f0), 0.3)
for k in range(3): put(sfx, mx(I.glock(m2f(98 + 2 * k), 0.25, R, 0.4)), F(488) + k * 0.15, 0.3, 0.3 * (k - 1))
popb(F(516), 0.25); popb(F(556), 0.25)
for k in range(3): popb(F(684 + 4 * k), 0.22, 0.2 * (k - 1))
popb(F(694), 0.3); cue(F(684), "sfx: the dogs pop in beside him")
for k in range(4): thump(F(744 + 6 * k), 0.15)
popb(F(790), 0.25)
n = ns(DUR - F(822)); put(sfx, fades(lp(colored(n, R, 1.0), 400) * 0.25, 0.3, 0.6), F(822), 0.12)
popb(F(863), 0.3)
put(sfx, mx(I.glock(m2f(86), 0.5, R, 0.8), I.glock(m2f(93), 0.4, R, 0.8)), F(870), 0.55); cue(F(870), "sfx: Feeloy chime (phone)")
popb(F(900), 0.3); whoosh(F(944), 0.5, 0.45); cue(F(944), "sfx: end-card whoosh")
whoosh(F(262), 0.4, 0.2); whoosh(F(350), 0.35, 0.25); whoosh(F(512), 0.4, 0.2); whoosh(F(822), 0.4, 0.25)

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
