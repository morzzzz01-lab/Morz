"""Build compositing plates from the ESRGAN-upscaled MORZ product photos.

For each lit scene we split the real photo into
  base = morphological opening (ambient / broad halo)      -> what stays when LEDs are off
  led  = photo - base (white top-hat: LED cores + wires)   -> the lights themselves
and an 'off' plate (same scene, lights off, dusk-dark) for the light-on moments.
For the multicolour net (p6) LEDs are split into two interleaved channels, matching
the standard 2-circuit 8-function controller shown in the product photos.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

UP, OUT = sys.argv[1], sys.argv[2]


def load(n):
    return np.asarray(Image.open(f"{UP}/{n}.png").convert("RGB")).astype(np.float32) / 255.0


def save(a, path):
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path)


def split(img, size=35, thr=0.07, region=None):
    """Inpaint LED cores/wires out of the photo with normalised convolution (no block artefacts)."""
    L0 = lum(img)
    th = L0 - ndi.grey_opening(L0, size=(size, size))
    m = th > thr
    if region is not None:
        m &= region
    m = ndi.binary_dilation(m, iterations=5)
    w = 1.0 - ndi.gaussian_filter(m.astype(np.float32), 2.0)
    num = ndi.gaussian_filter(img * w[..., None], (14, 14, 0))
    den = ndi.gaussian_filter(w, 14)[..., None]
    fill = num / np.maximum(den, 1e-4)
    # second pass for big holes
    num2 = ndi.gaussian_filter(img * w[..., None], (40, 40, 0))
    den2 = ndi.gaussian_filter(w, 40)[..., None]
    fill = np.where(den < 0.05, num2 / np.maximum(den2, 1e-4), fill)
    base = img * w[..., None] + fill * (1 - w[..., None])
    base = np.minimum(base, img)
    led = img - base
    return base, led


def lum(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def off_plate(base, led, keep=0.42, dark=0.2):
    """Lights-off version: remove LED layer, kill the LED-lit halo, cool dusk tint."""
    il = ndi.gaussian_filter(lum(led), 110)
    il = np.clip(il / np.percentile(il, 99.5), 0, 1)
    k = keep - (keep - dark) * il
    g = lum(base)[..., None]
    des = base * 0.35 + g * 0.65
    tint = np.array([0.80, 0.90, 1.18], np.float32)
    return des * k[..., None] * tint


# ---- p5 : pergola sofa corner (hook + finale)
for name, crop in (("p5", None), ("p3", (0, 0, 2000, 1588))):
    img = load(name)
    if crop:
        x0, y0, x1, y1 = crop
        img = img[y0:y1, x0:x1]
    region = None
    if name == "p5":
        region = np.zeros(img.shape[:2], bool)
        region[:640] = True
    base, led = split(img, region=region)
    save(img, f"{OUT}/{name}_on.png")
    save(base, f"{OUT}/{name}_base.png")
    save(np.clip(led * 1.0, 0, 1), f"{OUT}/{name}_led.png")
    save(off_plate(base, led), f"{OUT}/{name}_off.png")
    print(name, img.shape, "led mean", led.mean())

# ---- p6 : multicolour net -> two interleaved controller channels
img = load("p6")
base, led = split(img, 31, 0.06)
L = lum(led)
mx = ndi.maximum_filter(L, size=27)
peaks = np.argwhere((L == mx) & (L > 0.22))
print("p6 peaks", len(peaks))
order = np.argsort(peaks[:, 1])
peaks = peaks[order]
color = -np.ones(len(peaks), int)
rng = np.random.default_rng(3)
for i, (y, x) in enumerate(peaks):
    cand = np.where((peaks[:i, 1] > x - 120) & (peaks[:i, 1] < x - 25) & (np.abs(peaks[:i, 0] - y) < 22))[0]
    if len(cand):
        j = cand[np.argmin(x - peaks[cand, 1])]
        color[i] = 1 - color[j]
    else:
        color[i] = rng.integers(2)
mask = np.zeros(L.shape, bool)
mask[peaks[:, 0], peaks[:, 1]] = True
idimg = np.full(L.shape, -1, np.int32)
idimg[peaks[:, 0], peaks[:, 1]] = np.arange(len(peaks))
_, (iy, ix) = ndi.distance_transform_edt(~mask, return_indices=True)
chan = color[idimg[iy, ix]]
save(img, f"{OUT}/p6_on.png")
save(base, f"{OUT}/p6_base.png")
save(led * (chan == 0)[..., None], f"{OUT}/p6_ledA.png")
save(led * (chan == 1)[..., None], f"{OUT}/p6_ledB.png")
save(off_plate(base, led, 0.35, 0.12), f"{OUT}/p6_off.png")
print("p6 chan balance", (color == 0).mean())

# ---- straight plates
for n in ("p4", "p7"):
    save(load(n), f"{OUT}/{n}_on.png")
for n in ("p1", "p2"):
    Image.open(f"{UP}/{n}.png").save(f"{OUT}/{n}_cut.png")
np.save(f"{OUT}/p6_peaks.npy", np.c_[peaks, color])
print("done")
