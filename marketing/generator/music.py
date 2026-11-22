"""Original bell/chime backing track. Seed picks key, tempo, progression and melody so each reel sounds different.
Usage: python3 music.py <seed> <seconds> <out.wav>"""
import sys, wave, numpy as np
seed, D, out = int(sys.argv[1]), float(sys.argv[2]), sys.argv[3]
rng = np.random.default_rng(seed); sr = 44100
t = np.arange(int(sr*D))/sr; y = np.zeros_like(t)
def note(f, start, dur, amp):
    i = int(start*sr)
    if i >= len(t): return
    n = min(int(dur*sr), len(t)-i); tt = np.arange(n)/sr
    env = np.exp(-tt*3.2)*np.minimum(1, tt*200)
    s = np.sin(2*np.pi*f*tt) + .5*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*5) + .25*np.sin(2*np.pi*f*5.4*tt)*np.exp(-tt*8)
    y[i:i+n] += amp*env*s
m = lambda k: 440*2**((k-69)/12)
key = int(rng.integers(-3, 5)); bpm = int(rng.choice([104, 112, 120, 128])); beat = 60/bpm
progs = [[0,9,5,7],[0,5,9,7],[9,5,0,7],[0,7,9,5]]
prog = progs[rng.integers(len(progs))]
triad = lambda r: [r, r+(3 if r in (2,4,9) else 4), r+7, r+12]
patterns = [[0,1,2,3,2,1,2,3],[0,2,1,3,0,2,1,3],[0,1,2,1,3,2,1,2]]
pat = patterns[rng.integers(len(patterns))]
scale = [0,2,4,5,7,9,11,12]
bars = int(np.ceil(D/(4*beat)))
for bar in range(bars):
    root = 60+key+prog[bar % 4]; ch = triad(prog[bar % 4]); base = bar*4*beat
    for k in range(8): note(m(60+key+ch[pat[k]]+12), base+k*beat/2, 1.2, .13)
    note(m(root-12 if prog[bar%4] < 7 else root-24), base, 2.5, .22)
    for q in range(0, 4, 2):
        if rng.random() < .8: note(m(72+key+scale[rng.integers(len(scale))]), base+q*beat, 1.6, .15)
for k in range(int(D/beat*2)):
    if k % 2:
        i = int(k*beat/2*sr); n = min(int(.08*sr), len(t)-i)
        if n > 0: y[i:i+n] += .05*rng.standard_normal(n)*np.exp(-np.arange(n)/sr*40)
f = int(1.5*sr); y[-f:] *= np.linspace(1, 0, f)
y = y/np.abs(y).max()*.8
with wave.open(out, 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((y*32767).astype(np.int16).tobytes())
