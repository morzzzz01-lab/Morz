"""Thumbnail: 'WAIT UNTIL THE LIGHTS TURN ON…' — dark corner with a diagonal glimpse of the lit net."""
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, sys.argv[1])
import render as R

R.PLATES, R.ASSETS = sys.argv[2], sys.argv[3]
out = sys.argv[4]
W, H = R.W, R.H

cx, cy, vh = 1250, 960, 1700
off = R.view(R.plate("p5_off"), cx, cy, vh) * 0.95
on = R.view(R.plate("p5_on"), cx, cy, vh) + R.view(R.plate("p5_led"), cx, cy, vh) * 0.35
# diagonal seam: lit on the right, from x=760 (top) to x=420 (bottom)
y, x = np.mgrid[0:H, 0:W].astype(np.float32)
seam = 760 + (420 - 760) * (y / H)
d = x - seam
m = np.clip(d / 6 + 0.5, 0, 1)[..., None]
img = off * (1 - m) + on * m
img = R.bloom(img, 0.85)
img = R.grade(img, 1.08)
g = (np.exp(-(d / 3.0) ** 2) * 1.1 + np.exp(-(d / 22) ** 2) * 0.45)[..., None]
img += g * np.array([1.0, 0.9, 0.7], np.float32)
# central scrim behind the headline for legibility
yy = np.arange(H, dtype=np.float32)
band = np.exp(-((yy - 840) / 420) ** 2) * 0.62
img *= (1 - band)[:, None, None]
# (no bokeh on the dark side: reads as dust)
R.add_snow(img, 4.0, 0.4, seed=21)
words = R.layout([([("WAIT", "w"), ("UNTIL", "w")], 150), ([("THE", "w"), ("LIGHTS", "w")], 150),
                  ([("TURN", "gold"), ("ON…", "gold")], 190)], y_top=600, t0=-5, stagger=0)
R.draw_words(img, words, 0.0)
logo = Image.open(f"{R.ASSETS}/morz-logo.png").convert("RGBA")
logo = logo.resize((int(logo.width * 150 / logo.height), 150), Image.LANCZOS)
R.paste_rgba(img, logo, 540, 300, 0.95)
R.paste_rgba(img, R.pill_sprite("LED NET LIGHTS  ·  1.5 × 1.5 m", 40, 0, 84, "dark", R.F_BOLD), 540, 1250)
img = R.add_grain(img, 0.0, 0.012)
Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(out)
print("thumb", out)
