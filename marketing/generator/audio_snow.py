"""Original 120 BPM Christmas track + sound design for the snowflake projector reel.
Usage: python3 audio_santa.py <config.json> <seconds> <out.wav>   (all sounds synthesized here, no samples)"""
import sys, wave, numpy as np
D = float(sys.argv[2]); out = sys.argv[3]
sr = 44100; N = int(sr*D); mus = np.zeros(N); sfx = np.zeros(N)
rng = np.random.default_rng(23)
BPM = 120; B = 60/BPM
def add(buf, t0, sig):
    i = int(t0*sr)
    if i >= N or i+len(sig) <= 0: return
    j = min(N, i+len(sig)); buf[i:j] += sig[:j-i]
def tt(d): return np.arange(int(d*sr))/sr
m = lambda k: 440*2**((k-69)/12)

# ---------- instruments ----------
def kick(a=1.0):
    t = tt(.35); f = 45+90*np.exp(-t*30); ph = 2*np.pi*np.cumsum(f)/sr
    return a*np.sin(ph)*np.exp(-t*9)
def clap(a=.5):
    t = tt(.2); n = rng.standard_normal(len(t)); n = np.diff(n, prepend=0)
    env = np.exp(-t*28) + .6*np.exp(-np.maximum(t-.012,0)*35)*(t>.012)
    return a*n*env*.35
def hat(a=.12):
    t = tt(.05); n = np.diff(np.diff(rng.standard_normal(len(t)), prepend=0), prepend=0)
    return a*n*np.exp(-t*90)*.4
def sleigh(a=.10):
    t = tt(.16); s = sum(np.sin(2*np.pi*f*t+rng.random()*6) for f in (5200, 6300, 7400, 8800, 9900))
    return a*s/5*np.exp(-t*30)*(1+.5*np.sin(2*np.pi*38*t))
def bass(f, d, a=.32):
    t = tt(d); s = sum(np.sin(2*np.pi*f*k*t)/k for k in range(1, 6))
    return a*s*np.minimum(1, t*150)*np.exp(-t*3)*np.minimum(1, (d-t)*60)
def glock(f, d=1.0, a=.2):
    t = tt(d)
    s = np.sin(2*np.pi*f*t) + .45*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*6) + .2*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*10)
    return a*s*np.exp(-t*4)*np.minimum(1, t*300)

# ---------- music: sections [start, end] where the beat plays ----------
prog = [60, 57, 53, 55]            # C  Am  F  G  (roots)
mel = [76,79,81,79, 76,74,72,74, 76,79,84,83, 81,79,76,79]   # original 8th/quarter bell hook
def groove(a0, a1, intensity=1.0):
    t = a0; i = 0
    while t < a1 - 1e-6:
        beat = i % 4; bar = (i//4) % 4; root = prog[bar]
        add(mus, t, kick(.95*intensity))
        if beat in (1, 3): add(mus, t, clap(.55*intensity))
        for h in range(4): add(mus, t+h*B/4, sleigh(.09 if h % 2 else .13) if h != 0 else hat(.15))
        add(mus, t, bass(m(root-24), B*.45)); add(mus, t+B/2, bass(m(root-12), B*.4, .22))
        add(mus, t, glock(m(mel[i % 16]), .9, .17*intensity))
        if beat == 0: add(mus, t, glock(m(root+12), 1.6, .08))
        t += B; i += 1

# hook: hard hit on the reveal at 0.10 s, groove from the first frame of light
def shimmer(a=.12):
    return sum(glock(m(n), 1.6, a/3) for n in (96, 100, 103, 108))
groove(0.10, 11.5)
for k, n in enumerate([84, 88, 91, 96, 91, 96, 100, 103]): add(mus, 11.0+k*B/8, glock(m(n), .5, .08))
groove(12.0, D-.6, .95)
for n in (72, 76, 79, 84): add(mus, D-.6, glock(m(n), .6, .1))

# ---------- SFX ----------
def whoosh(d=.35, a=.5, up=True):
    t = tt(d); n = rng.standard_normal(len(t)); y = np.zeros_like(n); c = 0.0
    fc = np.linspace(.05, .6, len(t)) if up else np.linspace(.6, .05, len(t))
    for i in range(len(n)): c += fc[i]*(n[i]-c); y[i] = c
    return a*y*np.sin(np.pi*t/d)**2
def impact(a=.9):
    t = tt(.9); f = 30+70*np.exp(-t*10)
    return a*(np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*4) + .3*rng.standard_normal(len(t))*np.exp(-t*25))
def scratch(a=.5):
    t = tt(.45); f = 600+500*np.sin(2*np.pi*3.2*t)
    s = np.sin(2*np.pi*np.cumsum(f)/sr)*.3 + rng.standard_normal(len(t))*.7
    return a*s*(np.abs(np.sin(2*np.pi*3.2*t))**.5)*np.exp(-t*2.5)
def riser(d=1.0, a=.35):
    t = tt(d); f = 200*np.exp(np.log(12)*t/d)
    return a*(np.sin(2*np.pi*np.cumsum(f)/sr)*.4 + rng.standard_normal(len(t))*.3)*(t/d)**2
def recstop(a=.6):
    t = tt(.7); f = 400*np.exp(-t*4)
    return a*np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*1.5)
def boing(a=.45):
    t = tt(.6); f = 180+120*np.sin(2*np.pi*7*t)*np.exp(-t*4)
    return a*np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*5)
def ding(a=.35):
    return glock(m(96), 1.4, a)+glock(m(103), 1.4, a*.6)
def pop(a=.4):
    t = tt(.08); return a*np.sin(2*np.pi*(900-6000*t)*t)*np.exp(-t*50)


add(sfx, 0.06, whoosh(.18, .7)); add(sfx, 0.10, impact(1.0)); add(sfx, 0.10, shimmer(.5))
for t0 in (1.5, 2.25, 3.0, 3.75, 4.5, 5.25, 6.75, 7.5, 8.25, 9.0, 10.0, 11.0): add(sfx, t0-.1, whoosh(.2, .28))
add(sfx, 6.0, impact(.55)); add(sfx, 6.0, shimmer(.25))
add(sfx, 11.0, riser(1.0, .3)); add(sfx, 12.0, impact(.95)); add(sfx, 12.2, ding(.3)); add(sfx, 12.9, pop())
y = mus*0.8 + sfx*0.9
f = int(.6*sr); y[-f:] *= np.linspace(1, 0, f)
y = np.tanh(y*1.6)/np.tanh(1.6); y = y/np.abs(y).max()*.92
st = np.stack([y, y], 1)
with wave.open(out, 'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st*32767).astype(np.int16).tobytes())
