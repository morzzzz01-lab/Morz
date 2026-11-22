"""Original cinematic ambient score + sound design for the apple-candle reel (all synthesized).
Usage: python3 audio_apple.py <config.json> <seconds> <out.wav>"""
import sys, wave, numpy as np
D = float(sys.argv[2]); out = sys.argv[3]; sr = 44100; N = int(sr*D)
L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(8)
def add(t0, sig, a=1.0, pan=0.0):
    i = int(t0*sr)
    if i >= N: return
    j = min(N, i+len(sig)); s = sig[:j-i]*a
    L[i:j] += s*np.sqrt((1-pan)/2*2/2+.25); R[i:j] += s*np.sqrt((1+pan)/2*2/2+.25)
tt = lambda d: np.arange(int(d*sr))/sr
m = lambda k: 440*2**((k-69)/12)
def lp(x, a):  # one-pole low-pass
    y = np.empty_like(x); c = 0.0
    for i in range(len(x)): c += a*(x[i]-c); y[i] = c
    return y
def pad(notes, d, a=.08, att=1.2, rel=1.5):
    t = tt(d); s = np.zeros_like(t)
    for n in notes:
        f = m(n)
        for det in (-.12, 0, .11): s += np.sin(2*np.pi*f*(1+det/100)*t + rng.random()*6) + .25*np.sin(2*np.pi*2*f*(1+det/100)*t)
    env = np.minimum(1, t/att)*np.minimum(1, (d-t)/rel)
    return a*s/len(notes)/3*env
def piano(f, d=2.5, a=.16):
    t = tt(d); s = sum(np.sin(2*np.pi*f*k*t)*np.exp(-t*(1.2+k*.9))/k**1.3 for k in range(1, 7))
    return a*s*np.minimum(1, t*400)
def chime(f, d=3.0, a=.12):
    t = tt(d); return a*(np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*2)+.2*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*4))*np.exp(-t*1.3)*np.minimum(1, t*500)
def noise(d): return rng.standard_normal(int(d*sr))
def boom(a=.6):
    t = tt(2.5); f = 32+30*np.exp(-t*3); return a*np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*1.4)
def whoosh(d=.8, a=.25, lo=.01, hi=.12):
    n = noise(d); fc = np.linspace(lo, hi, len(n)); y = np.empty_like(n); c = 0.0
    for i in range(len(n)): c += fc[i]*(n[i]-c); y[i] = c
    return a*y*np.sin(np.pi*np.arange(len(n))/len(n))**2*3
def shimmer(a=.05):
    s = sum(chime(m(n), 2.0, 1) for n in (96, 100, 103)); return a*s
def match(a=.7):  # strike: gritty scrape then flare
    t = tt(.22); scr = noise(.22)*(np.abs(np.sin(2*np.pi*14*t))**3)*np.exp(-t*6)
    scr = scr - lp(scr, .3)
    fl = lp(noise(.9), .06)*np.exp(-tt(.9)*3.5)*4
    s = np.zeros(int(1.0*sr)); s[:len(scr)] += scr*.8; s[int(.12*sr):int(.12*sr)+len(fl)] += fl[:len(s)-int(.12*sr)]
    return a*s
def crackle(d, a=.05):
    s = np.zeros(int(d*sr))
    for _ in range(int(d*6)):
        i = rng.integers(0, len(s)-400); k = rng.random()
        s[i:i+300] += (rng.standard_normal(300)*np.exp(-np.arange(300)/40))*(.3+k)
    return a*(s - lp(s, .2))

# ---- score: Am9 -> Fmaj7 (mystery) ... lifts to C / G / Am / F after the reveal, resolves on C
add(0.0, pad([45, 57, 64, 71], 3.4, .10, 1.5, 1.0))
add(0.0, boom(.5)); add(0.0, whoosh(1.4, .18, .005, .05))
for t0, n in ((0.45, 88), (1.15, 91)): add(t0, shimmer(.035), pan=.3)
add(2.2, whoosh(.9, .22, .01, .2))            # inhale before the reveal
add(3.0, match(.75), pan=-.15)
add(3.25, boom(.35))
add(3.3, crackle(3.6, .045))
prog = [(3.3, [48, 60, 64, 67, 71]), (5.3, [43, 55, 62, 67, 71]), (7.3, [45, 57, 60, 64, 69]), (9.3, [41, 53, 60, 64, 69]),
        (11.3, [48, 60, 64, 67, 72]), (13.3, [43, 55, 62, 67, 74]), (15.3, [41, 53, 57, 64, 69]), (16.9, [48, 60, 64, 67, 72, 76])]
for i, (t0, ch) in enumerate(prog):
    d = (prog[i+1][0]-t0+1.2) if i+1 < len(prog) else D-t0
    add(t0, pad(ch, d, .085, 1.0, 1.2))
# piano motif (original): sparse, starts at the reveal, a note every 0.5-1 s
mel = [(4.1, 76), (4.6, 79), (5.6, 74), (6.1, 79), (7.25, 81), (7.75, 76), (8.7, 72), (9.2, 76), (9.7, 77), (10.4, 76),
       (11.2, 72), (12.0, 79), (12.5, 84), (13.3, 83), (14.0, 79), (14.6, 81), (15.3, 77), (16.35, 79), (16.75, 84), (17.35, 88)]
for t0, n in mel: add(t0, piano(m(n), 2.6, .12), pan=(n-80)/20)
# transitions + end
for t0 in (6.85, 8.55, 10.25, 11.85, 15.7): add(t0, whoosh(.7, .12, .01, .08))
add(12.1, crackle(3.6, .04))
add(16.35, chime(m(96), 3, .07)); add(16.75, chime(m(100), 3, .06)); add(17.35, chime(m(103), 2.5, .06))
y = np.stack([L, R], 1)
f = int(.5*sr); y[-f:] *= np.linspace(1, 0, f)[:, None]; y[:int(.05*sr)] *= np.linspace(0, 1, int(.05*sr))[:, None]
y = y/np.abs(y).max(); y = np.tanh(y*3.2)/np.tanh(3.2); y = y/np.abs(y).max()*.93
with wave.open(out, 'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((y*32767).astype(np.int16).tobytes())
