"""Original soundtrack + sound design for the MORZ LED Net Lights ad.

120 BPM, D major.  Light-on DROP at 0.50 s.  Bar downbeats at 1, 3, 5, ... 23 s so
every scene cut (5, 9, 13, 17, 21) lands on a downbeat.  Everything is synthesised
here from scratch (no samples, no third-party music).
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 24.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

BEAT = 0.5
BAR0 = 1.0  # first downbeat


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


class Bus:
    def __init__(self):
        self.x = np.zeros((N, 2), np.float64)

    def add(self, sig, t0, gain=1.0, pan=0.0):
        if sig.ndim == 1:
            l = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
            r = np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
            sig = np.stack([sig * l, sig * r], 1)
        i0 = int(round(t0 * SR))
        if i0 < 0:
            sig = sig[-i0:]
            i0 = 0
        i1 = min(N, i0 + len(sig))
        if i1 > i0:
            self.x[i0:i1] += sig[: i1 - i0] * gain


drums, bass, pad, bells, sfx, verb_send = Bus(), Bus(), Bus(), Bus(), Bus(), Bus()

# ----------------------------------------------------------------- instruments

def kick(level=1.0):
    t = tt(0.55)
    f = 46 + 120 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.30)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.003) * 0.35
    return np.tanh(2.2 * (body + click)) * 0.9 * level


def clap():
    t = tt(0.45)
    n = rng.standard_normal(len(t))
    env = np.zeros_like(t)
    for d in (0.0, 0.011, 0.022):
        env += (t >= d) * np.exp(-np.clip(t - d, 0, None) / 0.007)
    env += (t >= 0.03) * np.exp(-np.clip(t - 0.03, 0, None) / 0.11) * 0.8
    return bp(n * env, 900, 3800) * 0.55


def hat(dec=0.03):
    t = tt(0.15)
    return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t / dec) * 0.5


_bell_bank = []
for _ in range(10):
    t = tt(0.22)
    s = np.zeros_like(t)
    for _ in range(7):
        f = rng.uniform(3200, 9800)
        s += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / rng.uniform(0.04, 0.11))
    rattle = np.zeros_like(t)
    for d in rng.uniform(0, 0.025, 4):
        rattle += (t >= d) * np.exp(-np.clip(t - d, 0, None) / 0.012)
    s = s * 0.12 * (0.4 + rattle) + hp(rng.standard_normal(len(t)), 6000) * np.exp(-t / 0.03) * 0.25
    _bell_bank.append(s * 0.45)


def sleigh():
    return _bell_bank[rng.integers(len(_bell_bank))]


def crash(d=2.2):
    t = tt(d)
    n = hp(rng.standard_normal(len(t)), 3500)
    s = np.zeros_like(t)
    for f in rng.uniform(3000, 11000, 12):
        s += np.sin(2 * np.pi * f * t + rng.uniform(0, 6))
    return (n * 0.6 + s * 0.04) * np.exp(-t / (d / 4)) * 0.16


def glock(m, d=1.6, vel=1.0):
    f = mtof(m)
    t = tt(d)
    idx = 2.2 * np.exp(-t / 0.05)
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * 3.5 * f * t)) * np.exp(-t / 0.55)
    s += 0.25 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.08)
    s += 0.08 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t / 0.03)
    return s * 0.32 * vel


def saw_voice(f, d, harm_max=9000):
    t = tt(d)
    s = np.zeros_like(t)
    k = 1
    while k * f < harm_max and k < 60:
        s += np.sin(2 * np.pi * k * f * t) / k
        k += 1
    return s


def pad_chord(notes, d, cutoff=1600, att=0.35, rel=0.6):
    t = tt(d + rel)
    out = np.zeros((len(t), 2))
    for i, m in enumerate(notes):
        for j, det in enumerate((-0.09, 0.09)):
            v = saw_voice(mtof(m + det), d + rel)
            out[:, j] += v * (0.7 if i else 1.0)
    env = np.minimum(1, t / att) * np.clip((d + rel - t) / rel, 0, 1)
    out = lp(out * env[:, None], cutoff) * 0.06
    return out


def sub808(m, d):
    t = tt(d)
    f = mtof(m) * (1 + 0.6 * np.exp(-t / 0.02))
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.minimum(1, t / 0.004) * np.exp(-t / 1.4) * np.clip((d - t) / 0.04, 0, 1)
    s = np.sin(ph) * env
    return np.tanh(2.8 * s) * 0.42  # saturation -> harmonics audible on phone speakers


def noise_sweep(d, f0, f1, shape="up"):
    """Time-varying low-pass noise (riser / whoosh core)."""
    n = rng.standard_normal(int(d * SR))
    out = np.zeros_like(n)
    y = 0.0
    fc = np.geomspace(f0, f1, len(n))
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    for i in range(len(n)):  # one-pole sweep
        y += a[i] * (n[i] - y)
        out[i] = y
    return out


def riser(d):
    t = tt(d)
    s = noise_sweep(d, 300, 14000)
    s = s * (t / d) ** 2.2 * 0.45
    tone = np.sin(2 * np.pi * np.cumsum(np.geomspace(220, 880, len(t))) / SR) * (t / d) ** 3 * 0.12
    return s + tone


def whoosh(d=0.55):
    t = tt(d)
    pk = d * 0.55
    env = np.where(t < pk, (t / pk) ** 2.5, np.exp(-(t - pk) / (d * 0.18)))
    up = noise_sweep(d, 500, 9000)
    s = up * env * 0.5
    pan = np.linspace(-0.8, 0.8, len(t))
    return np.stack([s * np.cos((pan + 1) * np.pi / 4), s * np.sin((pan + 1) * np.pi / 4)], 1) * 1.3


def impact(level=1.0, d=1.8):
    t = tt(d)
    f = 30 + 45 * np.exp(-t / 0.12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.6)
    thud = np.sin(2 * np.pi * 110 * t) * np.exp(-t / 0.08) * 0.5
    nz = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.09) * 0.6
    return np.tanh(1.8 * (boom + thud + nz)) * 0.85 * level


def shimmer(d=0.9, count=46, lo=2000, hi=7000):
    out = np.zeros((int(d * SR) + SR, 2))
    for _ in range(count):
        t0 = rng.uniform(0, d) ** 1.6 / d ** 0.6
        f = rng.uniform(lo, hi)
        t = tt(0.35)
        p = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.09) * rng.uniform(0.02, 0.06)
        pan = rng.uniform(-0.9, 0.9)
        i0 = int(t0 * SR)
        out[i0:i0 + len(t), 0] += p * np.cos((pan + 1) * np.pi / 4)
        out[i0:i0 + len(t), 1] += p * np.sin((pan + 1) * np.pi / 4)
    return out


def buzz(d):
    t = tt(d)
    s = np.sign(np.sin(2 * np.pi * 120 * t)) * 0.3 + rng.standard_normal(len(t)) * 0.2
    gate = (rng.random(len(t) // 240 + 1).repeat(240)[: len(t)] > 0.35).astype(float)
    return bp(s * gate, 300, 4000) * np.minimum(1, t / 0.005) * np.clip((d - t) / 0.01, 0, 1) * 0.35


def switch_click():
    t = tt(0.06)
    s = hp(rng.standard_normal(len(t)), 1500) * np.exp(-t / 0.0015)
    s += np.sin(2 * np.pi * 2600 * t) * np.exp(-t / 0.012) * 0.4
    s2 = np.zeros_like(s)
    s2[int(0.012 * SR):] = s[: len(s) - int(0.012 * SR)] * 0.6
    return (s + s2) * 0.7


# ----------------------------------------------------------------- arrangement
# chord per bar (bar k starts at BAR0 + 2k)
CH = {
    "D": [62, 66, 69], "Bm": [59, 62, 66], "G": [55, 59, 62], "A": [57, 61, 64],
}
ROOT = {"D": 38, "Bm": 35, "G": 31, "A": 33}
PROG = ["D", "Bm", "G", "A", "D", "Bm", "G", "A", "G", "A", "D", "D"]
MEL = {  # original eighth-note motif per chord (None = rest)
    "D": [81, None, 78, 81, 86, None, 85, 81],
    "Bm": [83, None, 78, 83, 86, None, 85, 83],
    "G": [79, None, 74, 79, 83, None, 81, 79],
    "A": [76, None, 81, 85, 88, None, 86, 85],
}


def bar_t(k):
    return BAR0 + 2 * k


# --- intro tension 0.0 - 0.5
rev = crash(1.2)[::-1][-int(0.5 * SR):]
sfx.add(rev, 0.0, 0.55)
drone_t = tt(0.55)
drone = (np.sin(2 * np.pi * 73.4 * drone_t) + 0.5 * np.sin(2 * np.pi * 110 * drone_t)) * np.minimum(1, drone_t / 0.1) * 0.12
pad.add(drone, 0.0)
sfx.add(switch_click(), 0.455, 1.0)

# --- DROP at 0.5 : lights on
sfx.add(impact(1.1), 0.5)
drums.add(crash(2.6), 0.5, 0.9)
sfx.add(shimmer(0.9, 60), 0.5, 1.2)
verb_send.add(shimmer(0.9, 30), 0.5, 0.8)
bass.add(sub808(ROOT["D"], 0.5), 0.5)
pad.add(pad_chord(CH["D"], 0.5, 2200), 0.5)
for i, m in enumerate([81, 86]):
    bells.add(glock(m), 0.5 + 0.25 * i, 0.9)

# --- groove sections
GROOVE_BARS = [0, 1, 2, 3, 4, 5, 6, 7, 10]  # full drums
for k, ch in enumerate(PROG):
    t0 = bar_t(k)
    if t0 >= DUR:
        break
    last_bar = k == 11
    blen = min(2.0, DUR - t0)
    # pad + bass every bar
    cutoff = 1300 if k in (8, 9) else 2000
    if not last_bar:
        pad.add(pad_chord(CH[ch], 2.0, cutoff), t0, 1.0 if k not in (8, 9) else 1.3)
        if k in (8,):
            bass.add(sub808(ROOT[ch], 1.9), t0, 0.8)
        else:
            for b in (0, 1.5) if k != 9 else (0, 0.75, 1.5):
                bass.add(sub808(ROOT[ch], 0.45 if b else 1.4), t0 + b, 1.0)
    # melody bells
    if not last_bar:
        for i, m in enumerate(MEL[ch]):
            if m is None:
                continue
            vel = 0.75 + 0.25 * (i % 4 == 0)
            if k in (8, 9):
                vel *= 0.9
            bells.add(glock(m, vel=vel), t0 + 0.25 * i, 1.0, pan=0.25 if i % 2 else -0.25)
            verb_send.add(glock(m, vel=vel), t0 + 0.25 * i, 0.5)
    # drums
    if k in GROOVE_BARS:
        for b in range(4):
            tb = t0 + b * BEAT
            drums.add(kick(), tb, 1.0)
            if b in (1, 3):
                drums.add(clap(), tb, 0.55)
                verb_send.add(clap(), tb, 0.35)
            drums.add(hat(), tb + 0.25, 0.45, 0.3)
        for s in range(16):
            ts = t0 + s * 0.125
            acc = 1.0 if s % 4 == 2 else (0.7 if s % 2 else 0.5)
            drums.add(sleigh(), ts + rng.normal(0, 0.003), 0.55 * acc, pan=-0.35)
    elif k == 8:  # breakdown: soft heartbeat kick + slow sleigh shake
        for b in (0, 3):
            drums.add(lp(kick(0.6), 400), t0 + b * BEAT, 0.8)
        for s in range(8):
            drums.add(sleigh(), t0 + s * 0.25, 0.35, pan=-0.4)
    elif k == 9:  # build back
        for b in range(4):
            drums.add(kick(0.8), t0 + b * BEAT, 0.9)
        for s in range(16):
            drums.add(sleigh(), t0 + s * 0.125, 0.25 + 0.4 * s / 16, pan=-0.35)
    elif last_bar:  # final hit at 23.0
        drums.add(kick(1.1), t0)
        drums.add(crash(2.0), t0, 0.8)
        sfx.add(impact(0.8, 1.2), t0)
        bass.add(sub808(ROOT["D"], 1.0), t0, 1.0)
        pad.add(pad_chord([62, 66, 69, 74], 0.7, 2400, rel=0.35), t0, 1.2)
        for i, m in enumerate([74, 78, 81, 86, 90]):
            bells.add(glock(m, 1.0), t0 + 0.06 * i, 0.9)
            verb_send.add(glock(m, 1.0), t0 + 0.06 * i, 0.9)

# snare-roll builds into 9.0 and 21.0, risers, crashes, impacts
for end, dur in ((9.0, 1.0), (21.0, 1.0)):
    n = 16
    for i in range(n):
        tr = end - dur + dur * (1 - (1 - i / n) ** 1.3)
        drums.add(clap(), tr, 0.18 + 0.4 * i / n)
for end, dur in ((9.0, 1.6), (21.0, 2.0), (5.0, 0.9)):
    sfx.add(riser(dur), end - dur, 0.55 if end != 5.0 else 0.3)
for tc, lv in ((5.0, 0.7), (9.0, 1.0), (13.0, 0.75), (17.0, 0.6), (21.0, 1.0)):
    drums.add(crash(2.4), tc, lv)
for tc, lv in ((9.0, 1.35), (13.0, 0.55), (17.0, 0.3), (21.0, 1.4)):
    sfx.add(impact(lv), tc)
# whooshes centred on cuts (peak at 55% of length)
for tc in (2.0, 5.0, 7.0, 13.0, 15.0, 17.0, 21.0):
    w = whoosh(0.55)
    sfx.add(w, tc - 0.55 * 0.55, 0.55)
for tc in (13.5, 14.0):
    sfx.add(whoosh(0.4), tc - 0.22, 0.35)
# before/after slider swoosh + sparkle
sfx.add(whoosh(0.9), 2.35, 0.4)
sfx.add(shimmer(0.7, 30, 3000, 8000), 3.12, 1.0)
# mode-change chimes (ascending D-major), on each mode switch
for i, (tm, m) in enumerate(((9.0, 86), (10.0, 90), (11.0, 93), (12.0, 98))):
    bells.add(glock(m, 0.9, 1.1), tm, 0.8)
    sfx.add(shimmer(0.35, 14, 4000, 9000), tm, 0.8)
# chasing / twinkle accents synced to the visual
for i in range(8):
    drums.add(hat(0.02), 10.0 + i * 0.125, 0.4, 0.5 if i % 2 else -0.5)
for i in range(16):
    drums.add(hat(0.015), 11.0 + i * 0.0625, 0.25, -0.5)
# steady-on lock at 12.0
sfx.add(impact(0.5, 0.8), 12.0)
# product reveal + price sparkle
sfx.add(shimmer(0.6, 26), 7.0, 0.8)
sfx.add(shimmer(0.8, 40, 2500, 8000), 21.5, 1.0)
bells.add(glock(86, 1.4, 1.1), 21.5, 0.8)
bells.add(glock(93, 1.4, 1.0), 21.62, 0.7)

# ----------------------------------------------------------------- mix
# sidechain envelope from kick times (pumps pad + bass slightly)
side = np.ones(N)
for k in range(12):
    if k in GROOVE_BARS:
        for b in range(4):
            i0 = int((bar_t(k) + b * BEAT) * SR)
            L = int(0.22 * SR)
            if i0 + L < N:
                side[i0:i0 + L] = np.minimum(side[i0:i0 + L], 0.45 + 0.55 * np.linspace(0, 1, L) ** 0.7)

# reverb IR
ir_t = tt(2.2)
ir = rng.standard_normal((len(ir_t), 2)) * np.exp(-ir_t / 0.45)[:, None]
ir = lp(ir, 5000)
ir[: int(0.02 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum(0))
verb = np.stack([fftconvolve(verb_send.x[:, c] + 0.3 * pad.x[:, c] + 0.25 * bells.x[:, c], ir[:, c])[:N] for c in range(2)], 1)

# stereo widen bells (Haas)
d = int(0.011 * SR)
bw = bells.x.copy()
bw[d:, 1] = bells.x[:-d, 1] * 0.85 + bells.x[d:, 1] * 0.15

stems = {"drums": drums.x, "bass": bass.x * side[:, None], "pad": pad.x * side[:, None],
         "bells": bw, "sfx": sfx.x, "verb": verb}
TARGET = {"drums": -17.0, "bass": -19.0, "pad": -25.0, "bells": -21.0, "sfx": -22.0, "verb": -25.0}
mix = np.zeros((N, 2))
for nm, b in stems.items():
    r = 20 * np.log10(np.sqrt((b ** 2).mean()) + 1e-12)
    g = 10 ** ((TARGET[nm] - r) / 20)
    mix += b * g
    print(f"{nm:6s} rms={r:6.1f} -> {TARGET[nm]} dB (gain {20*np.log10(g):+.1f})  peak_after={20*np.log10(np.abs(b*g).max()):+.1f}")
mix = hp(mix, 28)
# pre-drop gaps: cut riser/roll for ~120 ms right before the big drops (classic punch trick)
for tg in (9.0, 21.0):
    i0, i1 = int((tg - 0.12) * SR), int(tg * SR) - int(0.002 * SR)
    r = int(0.006 * SR)
    env = np.ones(N)
    env[i0:i1] = 0.12
    env[i0 - r:i0] = np.linspace(1, 0.12, r)
    mix[i0 - r:i1] *= env[i0 - r:i1, None]
# look-ahead peak limiter (5 ms look-ahead, 80 ms release)
thr = 0.89
pk = np.abs(mix).max(1)
la = int(0.005 * SR)
need = np.minimum(1.0, thr / np.maximum(pk, 1e-9))
from scipy.ndimage import minimum_filter1d
g = minimum_filter1d(need, la * 2 + 1)
rel = np.exp(-1 / (0.08 * SR))
gs = np.empty_like(g); cur = 1.0
for i in range(len(g)):
    cur = g[i] if g[i] < cur else cur * rel + g[i] * (1 - rel)
    gs[i] = cur
mix *= gs[:, None]
print("limiter max reduction dB", 20*np.log10(gs.min()))
fade = np.ones(N)
f0 = int(23.75 * SR)
fade[f0:] = np.linspace(1, 0, N - f0) ** 1.5
mix *= fade[:, None]
mix = np.clip(mix, -0.99, 0.99)

out = sys.argv[1]
import wave
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("wrote", out, mix.shape)
