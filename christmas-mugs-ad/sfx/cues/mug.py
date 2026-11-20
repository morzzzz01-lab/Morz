"""Sound design and music bed for the MORZ hand-painted Christmas mugs ad. Every time comes from timeline.json.

    python3 -m sfx sfx/cues/lantern.py

Key: D major, 80 BPM (one beat = 0.75 s, so the scene 4 cuts land on the beat).
Bed: Dmaj9 -> Bm7 -> Gmaj7 -> A6 -> Dmaj9, a soft kick from the moment the light comes on,
a plucked arpeggio under the close-ups, offbeat shakers under the fast angles.
"""

import math
import random

from sfx.synth import SR, bandnoise, blip, chime, envelope, impact, pad, pop, riser, whoosh

TIMELINE = "timeline.json"
OUT = "public/mug.wav"
TARGET_LUFS = -14.0

D, Fs, A, B, Cs, E, G = 146.83, 185.0, 220.0, 246.94, 277.18, 164.81, 196.0
CHORDS = {
    "Dmaj9": [D, A, 2 * Fs, 2 * Cs, 4 * E],
    "Bm7": [B / 2 * 2, 2 * D, 2 * Fs, 2 * A],
    "Gmaj7": [G, 2 * D, 2 * Fs, 2 * B],
    "A6": [A, 2 * Cs, 2 * E, 2 * Fs],
}
ARP = {
    "Bm7": [493.88, 587.33, 739.99, 880.0],
    "Gmaj7": [392.0, 493.88, 587.33, 739.99],
}


def kick(dur=0.45):
    """Soft, round kick: a sine sweeping 120 -> 48 Hz."""
    n = int(dur * SR)
    out, ph = [], 0.0
    for i in range(n):
        t = i / SR
        f = 48 + 72 * math.exp(-t * 28)
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.exp(-t * 7) * min(1, i / 60))
    return out


def shaker(dur=0.09):
    """Brushed shaker: band-passed noise, fast decay."""
    n = int(dur * SR)
    noise = bandnoise(n, lambda k: 7000, q=0.7)
    return [noise[i] * math.exp(-i / SR * 45) for i in range(n)]


def pluck(freq, dur=0.9):
    """Warm plucked note (two detuned partials with a quick decay)."""
    n = int(dur * SR)
    out = []
    for i in range(n):
        t = i / SR
        env = math.exp(-t * 5.5) * min(1, i / 90)
        out.append(env * (math.sin(2 * math.pi * freq * t) + 0.35 * math.sin(2 * math.pi * freq * 2.003 * t)))
    return out


def score(mix, tl):
    random.seed(7)
    s1, s2, s3, s4, s5 = tl["s1"], tl["s2"], tl["s3"], tl["s4"], tl["s5"]
    dur = tl["duration"]
    beat = 60 / tl["bpm"]
    put = mix.put

    # music bed: quiet in the dark, opens up when the light comes on, ducks for the hero hit
    volume = envelope([
        (0, 0.35), (s2["glow"], 0.5), (s2["glow"] + 0.6, 1.0),
        (s5["start"] - 0.05, 1.0), (s5["start"] + 0.1, 0.45), (s5["start"] + 0.9, 1.1),
        (dur - 0.6, 1.1), (dur, 0),
    ])
    chords = [
        (0, CHORDS["Dmaj9"]), (s3["start"], CHORDS["Bm7"]), (s3["shots"][2], CHORDS["Gmaj7"]),
        (s4["shots"][2], CHORDS["A6"]), (s5["start"], CHORDS["Dmaj9"]),
    ]
    mix.put_stereo(0, *pad(dur, chords, volume=volume, tremolo=1 / (beat * 2)), gain=0.05)

    # scene 1: the hook punches in, one low hit per word
    for i, w in enumerate(s1["words"]):
        tw = max(0.0, w + 0.04)
        put(tw, whoosh(0.22, 400, 2600, peak=0.6), 0.07, -0.3 + i * 0.15)
        put(tw + 0.05, blip(D if i < 4 else A, dur=0.3, tau=0.07), 0.2)
    put(s1["exit"] - 0.1, whoosh(0.5, 3000, 500, peak=0.4), 0.1)

    # scene 2: the light comes on
    put(s2["glow"] - 0.02, whoosh(0.6, 300, 2000, peak=0.3), 0.12)
    put(s2["glow"], chime([587.33, 880.0, 1174.66, 1479.98], dur=2.4, tau=0.9), 0.16)
    put(s2["sweep"], whoosh(0.9, 1500, 6500, peak=0.5, q=0.5), 0.06, 0.3)
    put(s2["glow"] + 0.05, chime([2349.3, 3135.9], dur=0.6, tau=0.12), 0.06, -0.2)
    put(s2["label"], blip(1174.66, dur=0.4, tau=0.1), 0.08)
    put(s2["exit"] - 0.1, whoosh(0.5, 500, 3200, peak=0.7), 0.14)

    # rhythm: soft kick on every beat from light-on to the end, shakers through scene 4
    t = s2["glow"]
    while t < dur - 0.3:
        put(t, kick(), 0.28 if t >= s3["start"] else 0.18)
        t += beat
    t = s4["start"] + beat / 2
    while t < s4["end"]:
        put(t, shaker(), 0.06, 0.4)
        t += beat / 2 if t < s4["shots"][2] else beat / 4

    # scene 3: plucked arpeggio in eighths under the close-ups, a lift on the caption
    t, k = s3["start"], 0
    while t < s3["end"] - 0.05:
        notes = ARP["Bm7"] if t < s3["shots"][2] else ARP["Gmaj7"]
        put(t, pluck(notes[k % 4]), 0.07, -0.4 + 0.8 * (k % 4) / 3)
        t += beat / 2
        k += 1
    for i, sh in enumerate(s3["shots"][1:]):
        put(sh - 0.2, whoosh(0.45, 600, 2600, peak=0.6), 0.09, [-0.4, 0.4][i])
    put(s3["text"], whoosh(0.35, 500, 2400, peak=0.5), 0.09)
    put(s3["text"] + 0.15, blip(739.99, dur=0.45, tau=0.12), 0.1)

    # scene 4: a short whoosh into every angle, then the build to the hero shot
    for i, sh in enumerate(s4["shots"]):
        put(sh - 0.14, whoosh(0.3, 900, 4200, peak=0.75), 0.11, [-0.5, 0.5, -0.3, 0.3][i])
    for i, c in enumerate(s4["chips"]):
        put(c, pop(700 + i * 160, 320 + i * 70), 0.2, [-0.2, 0.0, 0.2][i])
    put(s4["unique"], chime([1174.66, 1479.98], dur=1.0, tau=0.35), 0.1)
    put(s4["shots"][2], riser(s5["start"] - s4["shots"][2], f0=300, f1=4200), 0.07)

    # scene 5: the hit, the line, the brand, the call to action
    put(s5["start"], impact(1.6), 0.3)
    put(s5["start"], chime([293.66, 440.0, 587.33, 739.99, 1108.73], dur=2.6, tau=1.1), 0.12)
    put(s5["line1"], whoosh(0.4, 500, 2400, peak=0.5), 0.07)
    put(s5["brand"], whoosh(0.7, 2400, 600, peak=0.3), 0.08)
    put(s5["cta"] + 0.05, blip(1174.66, dur=0.5, tau=0.14), 0.14)
    put(s5["cta"] + 0.1, chime([1174.66, 1479.98, 1760.0], dur=1.6, tau=0.6), 0.1)
