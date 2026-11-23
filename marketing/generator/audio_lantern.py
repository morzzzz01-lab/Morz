"""Original warm, upbeat 120 BPM track + sound design for the iron LED lantern reel (all synthesized).
Usage: python3 audio_lantern.py <config.json> <seconds> <out.wav>"""
import sys, wave, numpy as np
D = float(sys.argv[2]); out = sys.argv[3]; sr = 44100; N = int(sr*D)
L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(31); B = .5
def add(t0, s, a=1.0, pan=0.0):
    i = int(t0*sr)
    if i >= N or i+len(s) <= 0: return
    j = min(N, i+len(s)); s = s[:j-i]*a; L[i:j] += s*(1-max(0, pan)); R[i:j] += s*(1+min(0, pan))
tt = lambda d: np.arange(int(d*sr))/sr
m = lambda k: 440*2**((k-69)/12)
def lp(x, a):
    y = np.empty_like(x); c = 0.0
    for i in range(len(x)): c += a*(x[i]-c); y[i] = c
    return y
def kick(a=.8):
    t = tt(.32); f = 48+85*np.exp(-t*32); return a*np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*10)
def clap(a=.35):
    t = tt(.18); n = rng.standard_normal(len(t)); n = n-lp(n, .25); return a*n*np.exp(-t*30)*.5
def shaker(a=.07):
    t = tt(.07); n = rng.standard_normal(len(t)); n = n-lp(n, .5); return a*n*np.exp(-t*60)*np.minimum(1, t*400)
def bass(f, d, a=.26):
    t = tt(d); s = sum(np.sin(2*np.pi*f*k*t)/k**1.4 for k in range(1, 5)); return a*s*np.minimum(1, t*200)*np.exp(-t*2.5)*np.minimum(1, (d-t)*50)
def keys(notes, d, a=.07):  # warm electric-piano chord
    t = tt(d); s = np.zeros_like(t)
    for n in notes:
        f = m(n); s += (np.sin(2*np.pi*f*t)+.3*np.sin(2*np.pi*2*f*t)*np.exp(-t*3)+.08*np.sin(2*np.pi*7*f*t)*np.exp(-t*12))*(1+.15*np.sin(2*np.pi*5*t))
    return a*s/len(notes)*np.exp(-t*1.1)*np.minimum(1, t*300)*np.minimum(1, (d-t)*30)
def pluck(f, a=.12):
    t = tt(.7); s = np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*2*f*t)*np.exp(-t*8)+.2*np.sin(2*np.pi*3*f*t)*np.exp(-t*14)
    return a*s*np.exp(-t*5)*np.minimum(1, t*500)
def bell(f, d=2.0, a=.1):
    t = tt(d); return a*(np.sin(2*np.pi*f*t)+.45*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*3))*np.exp(-t*1.6)*np.minimum(1, t*500)
# ---- music: F  Dm  Bb  C  (warm, festive)
prog = [(53, [65, 69, 72, 76]), (50, [62, 65, 69, 72]), (46, [62, 65, 70, 74]), (48, [64, 67, 70, 72])]
mel = [81, 79, 77, 76, 77, 79, 81, 84, 81, 77, 74, 77, 76, 74, 72, 76]
def groove(a0, a1, kick_on=True, inten=1.0):
    t = a0; i = int(round(a0/B))
    while t < a1-1e-6:
        beat = i % 4; root, ch = prog[(i//4) % 4]
        if kick_on: add(t, kick(.75*inten))
        if beat in (1, 3): add(t, clap(.33*inten))
        for h in range(4): add(t+h*B/4, shaker(.09 if h == 2 else .05), pan=.3)
        add(t, bass(m(root-12), B*.9)); 
        if beat == 0: add(t, keys(ch, 4*B, .08*inten))
        add(t+B/2, pluck(m(mel[i % 16]), .085*inten), pan=-.2)
        t += B; i += 1
groove(0.0, 2.0)
groove(2.0, 6.0, kick_on=False, inten=.85)       # curiosity: lighter, no kick
groove(6.0, 14.5)
groove(14.5, D-.6, inten=.95)
for n in (65, 69, 72, 77): add(D-.6, bell(m(n+12), .6, .08))
# ---- sound design
def whoosh(d=.35, a=.3, up=True):
    n = rng.standard_normal(int(d*sr)); fc = np.linspace(.03, .4, len(n)) if up else np.linspace(.4, .03, len(n))
    y = np.empty_like(n); c = 0.0
    for i in range(len(n)): c += fc[i]*(n[i]-c); y[i] = c
    return a*y*np.sin(np.pi*np.arange(len(n))/len(n))**2*2
def click(a=.5):  # small switch click (the candle is switched on)
    t = tt(.04); return a*(rng.standard_normal(len(t))*np.exp(-t*250) + np.sin(2*np.pi*2400*t)*np.exp(-t*150))
def thump(a=.5):
    t = tt(.6); f = 40+50*np.exp(-t*8); return a*np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*5)
def sparkle(a=.08):
    return sum(bell(m(n), 1.4, a/3) for n in (96, 100, 103))
add(0.0, click(.55)); add(0.02, thump(.7)); add(0.05, sparkle(.12))
add(0.45, whoosh(.5, .45))                                  # pull-back reveal
for t0 in (2.0, 3.33, 4.67): add(t0-.15, whoosh(.3, .18, up=False))
for t0 in (6.0, 7.25, 8.5, 9.75): add(t0-.06, whoosh(.14, .22)); add(t0, thump(.35))
add(10.9, whoosh(.45, .25)); add(11.0, sparkle(.09))
add(14.4, whoosh(.3, .4)); add(14.5, thump(.6)); add(15.1, bell(m(96), 1.5, .16)); add(15.6, click(.35))
y = np.stack([L, R], 1); y[:int(.01*sr)] *= np.linspace(0, 1, int(.01*sr))[:, None]
f = int(.5*sr); y[-f:] *= np.linspace(1, 0, f)[:, None]
y = y/np.abs(y).max(); y = np.tanh(y*2.2)/np.tanh(2.2); y = y/np.abs(y).max()*.92
with wave.open(out, 'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((y*32767).astype(np.int16).tobytes())
