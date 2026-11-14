"""Soundtrack for "Asking for Company" (Helen Morrison's 1727 lonely-hearts ad -> Feeloy), 24 s, 48 kHz.
Original score (own additive synthesis from lib/instruments.py) + synthesized SFX (lib/sfx_gen.py + small animal voices
here) + the voice, mixed: music +3 dB, SFX -6 dB relative to their base levels, voice unchanged, music ducked -3 dB under
speech, integrated -15 LUFS, true peak <= -1.2 dBTP. Writes mix.wav, stems/, cues.md.
Picture timing is mirrored from src/videos/ad/story.ts + cast.ts (frames at 30 fps): re-run after any timing change.
usage: python3 -I make_audio.py <production-ad dir>
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
from dsp import SR, ns, tt, rng, dbg, lp, hp, bp, pan, place, fades, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, colored, smooth_noise
import instruments as I
import sfx_gen as G

ROOT = sys.argv[1]
FPS, TOTAL = 30, 720
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

# ================================================================ music (F major minuet -> D minor in the cell -> the Feeloy section)
mus = np.zeros((2, N))
def pad(f0, f1, notes, g=0.2, gain=0.55): put(mus, I.pad([m2f(n) for n in notes], F(f1) - F(f0), g, R, att=0.4, rel=0.5), F(f0), gain)
# 1-3: a dainty Georgian minuet (harpsichord-ish plucks, 3/4 at 132), glock on the heart
MIN_PROG = [(41, [53, 57, 60]), (48, [52, 55, 60]), (46, [50, 53, 58]), (48, [52, 55, 60])]
MIN_MEL = [[77, 76, 77], [79, 77, 76], [74, 76, 77], [76, 0, 72]]
b = 60 / 132; t = 0.05; k = 0
while t < F(205) - 0.2:
    root, ch = MIN_PROG[k % 4]
    put(mus, I.pluck(m2f(root), 0.75, R, 0.9, 0.4), t, 0.7, -0.15)
    for j in (1, 2): put(mus, I.pluck(m2f(ch[0] + 12), 0.4, R, 0.3, 0.7), t + j * b, 0.35, 0.25)
    for j, m in enumerate(MIN_MEL[k % 4]):
        if m: put(mus, I.pluck(m2f(m), 0.6, R, 0.6, 0.8), t + j * b, 0.55, 0.1)
    t += 3 * b; k += 1
put(mus, mx(I.glock(m2f(84), 0.6, R, 1.0), I.glock(m2f(89), 0.5, R, 1.0)), F(181), 0.55, 0.2)
cue(0.0, "music: Georgian minuet (plucks), glock on 'husband'")
# 4: the mayor: a low tuba 'hmm' on 'read', then a brass sting + cymbal on the explosion
put(mus, I.brass(m2f(41), 0.5, 0.7, R, kind="tuba"), F(226), 0.55)
put(mus, mx(I.brass(m2f(53), 0.25, 0.9, R, kind="horn"), I.brass(m2f(52), 0.6, 0.9, R, kind="horn", fall=-4)), F(237), 0.6)
put(mus, I.cymbal(0.5, R, 1.6), F(237), 0.35, -0.2); put(mus, I.timpani(m2f(38), 0.7, R, 1.2), F(237), 0.5)
cue(F(226), "music: tuba on 'read'; horn sting + cymbal + timpani on the mayor's explosion")
# 5-6: the cell: D minor pad, a lone music box; a pluck question on 'so the story goes'; turns major on 'company'
pad(258, 412, [38, 50, 53, 57], 0.25, 0.7)
for k2, m in enumerate((74, 72, 69, 70, 69, 65, 67, 69)): put(mus, I.musicbox(m2f(m + 12), 0.35, R, 1.4), F(300) + k2 * 0.5, 0.45, 0.2 * ((k2 % 3) - 1))
put(mus, I.pluck(m2f(69), 0.5, R, 0.6, 0.7), F(333), 0.5); put(mus, I.pluck(m2f(74), 0.5, R, 0.8, 0.7), F(338), 0.5)
put(mus, I.timpani(m2f(38), 0.5, R, 1.0), F(371), 0.35)
pad(410, 445, [41, 53, 57, 60], 0.3, 0.6)
for m, dt in [(77, 0), (81, 0.12), (84, 0.24)]: put(mus, I.musicbox(m2f(m), 0.5, R, 1.6), F(412) + dt, 0.6, 0.15)
cue(F(258), "music: D minor pad + lone music box in the cell; two plucks on 'so the story goes'; F major on 'company'")
# 7-8: the Feeloy section (D pad, plucked arps, glock), end-card chord
B0, BEAT2, CARD = F(440), 60 / 96, 584
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
cue(B0, "music: modern Feeloy section (D pad, arps; glock from 'talk to Jenny')")
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
def flip(t, g=0.2): n = ns(0.16); put(sfx, bp(colored(n, R, 0.3), 1500, 7000) * np.hanning(n), t, g, 0.2)
def rustle(t, d=0.5, g=0.18): n = ns(d); put(sfx, bp(colored(n, R, 0.4), 1200, 6000) * np.abs(smooth_noise(n, R, 30)) * np.hanning(n), t, g, 0.15)
def thump(t, g=0.35): put(sfx, G.push_thump(R), t, g)
# 1: the street: murmur, birds, her footsteps, a far cart
murmur(0, 98, 0.1); put(sfx, G.bird_chirps(F(98), R, 0.5, "sparrow"), 0.0, 0.1, 0.3)
t = 0.1; k = 0
while t < F(84): put(sfx, G.stroll_step(R, 0.4), t, 0.12, 0.2 * (1 if k % 2 else -1)); t += 0.5; k += 1
popb(F(6), 0.25); popb(F(76), 0.25)
cue(0.0, "sfx: street murmur, sparrows, her steps; pops on the 1727 / Manchester badges")
# 2-3: the paper: a rustle, the ad stamped in, the heart
rustle(F(97), 0.4); thump(F(108), 0.3); popb(F(181), 0.3)
# 4: the office: a page turn, the explosion (paper whoosh)
flip(F(222), 0.2); whoosh(F(240), 0.35, 0.35); popb(F(238), 0.3)
# 5: the cell door slams: a heavy hit + iron rattle; the calendar flips through a month; the '?'
put(sfx, G.hammer_hit(R, 1.4), F(261), 0.35); put(sfx, G.rattle(0.5, R, 40.0, heavy=True), F(262), 0.2, -0.2)
for k2 in range(14): flip(F(294) + k2 * 0.065, 0.1)
popb(F(277), 0.25); popb(F(333), 0.25)
cue(F(261), "sfx: cell door slam + iron rattle; calendar page flips; pops")
n = ns(F(440) - F(258)); put(sfx, fades(lp(colored(n, R, 1.0), 300) * 0.25, 0.2, 0.3), F(258), 0.12)
# 6: the stamp, the heart
thump(F(371), 0.35); popb(F(412), 0.3)
# 7-8: the flat at night: room tone, the badge, the heart; the Feeloy chime; the mayor's heart; end card
n = ns(DUR - F(440)); put(sfx, fades(lp(colored(n, R, 1.0), 400) * 0.25, 0.3, 0.6), F(440), 0.12)
popb(F(444), 0.25); popb(F(482), 0.3)
put(sfx, mx(I.glock(m2f(86), 0.5, R, 0.8), I.glock(m2f(93), 0.4, R, 0.8)), F(505), 0.55); cue(F(505), "sfx: Feeloy chime (phone)")
popb(F(532), 0.3); popb(F(571), 0.35); whoosh(F(584), 0.5, 0.45); cue(F(584), "sfx: end-card whoosh")
whoosh(F(205), 0.35, 0.2); whoosh(F(440), 0.4, 0.25)

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
