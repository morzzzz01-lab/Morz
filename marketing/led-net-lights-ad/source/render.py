"""MORZ LED Net Lights — 9:16 vertical ad renderer (1080x1920, 30 fps, 24 s).

All product imagery comes from the real MORZ store photos (Real-ESRGAN upscaled).
Usage:
  python3 render.py frames <plates> <assets> <out_dir> <t1> <t2> ...   # stills for review
  python3 render.py video  <plates> <assets> <out.mp4> <audio.wav>     # full render
"""
import math
import os
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, DUR = 1080, 1920, 30, 24.0
NF = int(DUR * FPS)
FONT_DIR = "/usr/share/fonts/opentype/inter/"
F_BLACK = FONT_DIR + "InterDisplay-Black.otf"
F_XB = FONT_DIR + "InterDisplay-ExtraBold.otf"
F_SEMI = FONT_DIR + "Inter-SemiBold.otf"
F_BOLD = FONT_DIR + "Inter-Bold.otf"

GOLD_TOP = np.array([255, 243, 200]) / 255
GOLD_BOT = np.array([255, 184, 64]) / 255
NAVY = np.array([0.012, 0.02, 0.05], np.float32)

PLATES = ASSETS = None
G = {}  # per-process cache


# ----------------------------------------------------------------------------- utils
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def lerp(a, b, u):
    return a + (b - a) * u


def e_out(u, p=3):
    u = clamp(u)
    return 1 - (1 - u) ** p


def e_inout(u):
    u = clamp(u)
    return 0.5 - 0.5 * math.cos(math.pi * u)


def e_back(u, s=1.9):
    u = clamp(u)
    u -= 1
    return u * u * ((s + 1) * u + s) + 1


def prog(t, t0, d):
    return clamp((t - t0) / d)


def lum(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def to_pil(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def to_np(im):
    return np.asarray(im, dtype=np.float32) / 255.0


def plate(name):
    if name not in G:
        G[name] = Image.open(f"{PLATES}/{name}.png").convert("RGB")
    return G[name]


def view(im, cx, cy, vh, rot=0.0, size=(W, H), resample=Image.BICUBIC):
    """Camera: window centred at (cx,cy) in plate px, vertical extent vh plate px -> size."""
    ow, oh = size
    s = vh / oh
    c, sn = math.cos(rot), math.sin(rot)
    a, b, d, e = s * c, -s * sn, s * sn, s * c
    xo = cx - a * ow / 2 - b * oh / 2
    yo = cy - d * ow / 2 - e * oh / 2
    return to_np(im.transform(size, Image.AFFINE, (a, b, xo, d, e, yo), resample=resample, fillcolor=(0, 0, 0)))


def shake(t, t0, amp=16, dec=0.22, seed=0):
    if t < t0:
        return 0.0, 0.0
    k = math.exp(-(t - t0) / dec)
    r = np.random.default_rng(int((t - t0) * FPS) + seed * 1000)
    return float(r.uniform(-1, 1) * amp * k), float(r.uniform(-1, 1) * amp * k)


# ----------------------------------------------------------------------------- post
def bloom(img, strength=0.6, thr=0.6, tint=(1.0, 0.92, 0.78)):
    if strength <= 0:
        return img
    L = lum(img)
    br = img * np.clip((L - thr) / (1 - thr), 0, 1)[..., None]
    small = to_pil(br).resize((W // 4, H // 4), Image.BOX)
    b1 = to_np(small.filter(ImageFilter.GaussianBlur(3)).resize((W, H), Image.BILINEAR))
    b2 = to_np(small.resize((W // 8, H // 8), Image.BOX).filter(ImageFilter.GaussianBlur(7)).resize((W, H), Image.BILINEAR))
    return img + strength * (0.7 * b1 + 1.1 * b2) * np.array(tint, np.float32)


@lru_cache(None)
def vignette_map(strength=0.42):
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((x - W / 2) / (W * 0.62)) ** 2 + ((y - H / 2) / (H * 0.6)) ** 2)
    return (1 - strength * np.clip(d - 0.35, 0, 1) ** 1.6)[..., None].astype(np.float32)


@lru_cache(None)
def scrim(y0, y1, k):
    y = np.arange(H, dtype=np.float32)
    g = np.clip((y1 - y) / (y1 - y0), 0, 1) * (y >= 0)
    g = np.where(y < y0, 1.0, g) ** 1.4
    return (1 - k * g)[:, None, None].astype(np.float32)


@lru_cache(None)
def scrim_bottom(y0, y1, k):
    y = np.arange(H, dtype=np.float32)
    g = np.clip((y - y0) / (y1 - y0), 0, 1) ** 1.4
    return (1 - k * g)[:, None, None].astype(np.float32)


def grade(img, sat=1.08):
    img = np.maximum(img, 0)
    # soft highlight shoulder
    img = np.where(img > 0.82, 0.82 + 0.18 * np.tanh((img - 0.82) / 0.18), img)
    L = lum(img)[..., None]
    img = L + (img - L) * sat
    # gentle S curve
    img = np.clip(img, 0, 1)
    img = img + 0.22 * (img * img * (3 - 2 * img) - img)
    # lift blacks toward deep navy
    img = img * (1 - 0.04) + NAVY
    return img * vignette_map()


@lru_cache(None)
def grain_frames():
    r = np.random.default_rng(11)
    out = []
    for _ in range(8):
        g = r.standard_normal((H // 2, W // 2)).astype(np.float32)
        g = np.asarray(Image.fromarray(g, "F").resize((W, H), Image.BILINEAR))
        out.append(g[..., None])
    return out


def add_grain(img, t, amt=0.015):
    g = grain_frames()[int(t * FPS) % 8]
    L = lum(img)[..., None]
    return img + g * amt * (0.35 + 0.65 * (1 - L))


def zoom_blur(img, amount, n=7, cx=W / 2, cy=H / 2):
    if amount < 0.003:
        return img
    im = to_pil(img)
    acc = np.zeros_like(img)
    for i in range(n):
        s = 1 + amount * i / (n - 1)
        a = 1 / s
        xo = cx - a * cx
        yo = cy - a * cy
        acc += to_np(im.transform((W, H), Image.AFFINE, (a, 0, xo, 0, a, yo), resample=Image.BILINEAR))
    return acc / n


def whip(img, amount, n=9, axis=1):
    if amount < 1:
        return img
    acc = np.zeros_like(img)
    for i in range(n):
        acc += np.roll(img, int(amount * (i / (n - 1) - 0.5)), axis=axis)
    return acc / n


def gblur(img, r):
    if r < 0.3:
        return img
    return to_np(to_pil(img).filter(ImageFilter.GaussianBlur(r)))


# ----------------------------------------------------------------------------- particles
@lru_cache(None)
def disc_sprite(r, soft):
    s = int(r * 2 + soft * 4 + 4)
    y, x = np.mgrid[0:s, 0:s].astype(np.float32) - (s - 1) / 2
    d = np.sqrt(x * x + y * y)
    a = np.clip((r - d) / max(soft, 0.8) + 0.5, 0, 1)
    return a


@lru_cache(None)
def snow_field(n=140, seed=5):
    r = np.random.default_rng(seed)
    z = r.random(n) ** 1.7
    return dict(
        x=r.uniform(0, W, n), y=r.uniform(0, H + 200, n), z=z,
        vy=40 + 220 * z, sw=r.uniform(10, 50, n), sf=r.uniform(0.2, 0.7, n), ph=r.uniform(0, 6.28, n),
        op=r.uniform(0.35, 0.9, n),
    )


def add_snow(img, t, density=1.0, seed=5, drift=0.0):
    f = snow_field(140, seed)
    n = int(140 * density)
    for i in range(n):
        z = f["z"][i]
        r = 2.2 + 13 * z ** 2
        soft = 0.8 + 9 * z ** 3
        y = (f["y"][i] + f["vy"][i] * t) % (H + 200) - 100
        x = (f["x"][i] + f["sw"][i] * math.sin(f["sf"][i] * t * 6.28 + f["ph"][i]) + drift * (0.3 + z)) % (W + 100) - 50
        spr = disc_sprite(round(r * 2) / 2, round(soft * 2) / 2)
        a = spr * f["op"][i] * (0.55 + 0.45 * (1 - z))
        _blend_sprite(img, a, x, y, (0.95, 0.97, 1.0))
    return img


def _blend_sprite(img, a, x, y, col, add=False):
    s = a.shape[0]
    x0, y0 = int(x - s / 2), int(y - s / 2)
    x1, y1 = x0 + s, y0 + s
    cx0, cy0, cx1, cy1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
    if cx1 <= cx0 or cy1 <= cy0:
        return
    aa = a[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0, None]
    reg = img[cy0:cy1, cx0:cx1]
    c = np.array(col, np.float32)
    if add:
        reg += aa * c
    else:
        reg *= 1 - aa
        reg += aa * c


@lru_cache(None)
def bokeh_field(n=18, seed=9):
    r = np.random.default_rng(seed)
    return dict(
        x=r.uniform(-50, W + 50, n), y=r.uniform(-50, H + 50, n), r=r.uniform(28, 95, n),
        vx=r.uniform(-14, 14, n), vy=r.uniform(-26, -6, n), op=r.uniform(0.05, 0.16, n),
        hue=r.integers(0, 3, n), ph=r.uniform(0, 6.28, n),
    )


BOKEH_COLS = [(1.0, 0.7, 0.3), (1.0, 0.84, 0.55), (1.0, 0.55, 0.25)]


def add_bokeh(img, t, amt=1.0, par=(0.0, 0.0), seed=9):
    f = bokeh_field(18, seed)
    for i in range(len(f["x"])):
        x = (f["x"][i] + f["vx"][i] * t + par[0]) % (W + 200) - 100
        y = (f["y"][i] + f["vy"][i] * t + par[1]) % (H + 200) - 100
        spr = disc_sprite(round(f["r"][i]), 6.0)
        tw = 0.75 + 0.25 * math.sin(t * 1.7 + f["ph"][i])
        _blend_sprite(img, spr * f["op"][i] * amt * tw, x, y, BOKEH_COLS[f["hue"][i]], add=True)
    return img


# ----------------------------------------------------------------------------- text
@lru_cache(None)
def font(path, size):
    return ImageFont.truetype(path, size)


@lru_cache(None)
def word_sprite(text, size, style, path=F_BLACK, track=0):
    """RGBA sprite with soft shadow (+ glow for gold). Returns (img, pad)."""
    f = font(path, size)
    bbox = f.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = int(size * 0.55)
    cw, ch = tw + 2 * pad, int(size * 1.25) + 2 * pad
    mask = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(mask).text((pad - bbox[0], pad + int(size * 0.08)), text, font=f, fill=255)
    m = np.asarray(mask, np.float32) / 255
    out = np.zeros((ch, cw, 4), np.float32)
    # shadow
    sh = np.asarray(mask.filter(ImageFilter.GaussianBlur(size * 0.16)), np.float32) / 255
    sh = np.roll(sh, int(size * 0.06), axis=0)
    sh_a = np.clip(sh * (0.85 if style != "dark" else 0.0), 0, 1)
    if style == "gold":
        glow = np.asarray(mask.filter(ImageFilter.GaussianBlur(size * 0.22)), np.float32) / 255
        ga = np.clip(glow * 1.3, 0, 1) * 0.75
        yy = np.linspace(0, 1, ch, dtype=np.float32)[:, None, None]
        fill = GOLD_TOP * (1 - yy) + GOLD_BOT * yy
        col = np.broadcast_to(fill, (ch, cw, 3))
        # composite: shadow (black) -> glow (gold) -> fill
        rgb = np.zeros((ch, cw, 3), np.float32)
        a = sh_a * 0.7
        rgb = rgb * (1 - ga[..., None]) + np.array([1.0, 0.7, 0.25]) * ga[..., None]
        a = a + ga * (1 - a)
        rgb = rgb * (1 - m[..., None]) + col * m[..., None]
        a = m + a * (1 - m)
        rgb = np.where(a[..., None] > 0, rgb, 0)
        # un-premultiply-ish: rgb already straight where m=1; glow region straight colour
        out[..., :3], out[..., 3] = rgb, a
    elif style == "dark":
        out[..., :3] = np.array([0.08, 0.05, 0.02])
        out[..., 3] = m
    else:
        a = sh_a * 0.75
        rgb = np.zeros((ch, cw, 3), np.float32)
        rgb = rgb * (1 - m[..., None]) + 1.0 * m[..., None]
        a = m + a * (1 - m)
        out[..., :3], out[..., 3] = rgb, a
    im = Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    return im, pad, tw, th, bbox


class Word:
    def __init__(self, text, size, style, x, y, t0, path=F_BLACK, anim="pop", dur=0.24):
        self.text, self.size, self.style, self.path = text, size, style, path
        self.x, self.y, self.t0, self.anim, self.dur = x, y, t0, anim, dur  # x,y = top-left of glyph box


def layout(lines, y_top, max_w=950, t0=0.0, stagger=0.07, line_gap=0.06, anim="pop", cx=W / 2, dur=0.24):
    """lines: list of (list of (word, style), size). Auto-shrinks lines wider than max_w."""
    words, y, k = [], y_top, 0
    for line, size, *opt in lines:
        path = opt[0] if opt else F_BLACK
        f = font(path, size)
        sp = f.getlength(" ")
        ws = [f.getbbox(w)[2] - f.getbbox(w)[0] for w, _ in line]
        tot = sum(ws) + sp * (len(ws) - 1)
        if tot > max_w:
            size = int(size * max_w / tot)
            f = font(path, size)
            sp = f.getlength(" ")
            ws = [f.getbbox(w)[2] - f.getbbox(w)[0] for w, _ in line]
            tot = sum(ws) + sp * (len(ws) - 1)
        x = cx - tot / 2
        for (w, st), ww in zip(line, ws):
            words.append(Word(w, size, st, x, y, t0 + k * stagger, path, anim, dur))
            x += ww + sp
            k += 1
        y += size * (1.0 + line_gap)
    return words


def draw_words(img, words, t, t_out=None, out_d=0.12):
    layer = None
    for w in words:
        p = (t - w.t0) / w.dur
        if p <= 0:
            continue
        spr, pad, tw, th, bbox = word_sprite(w.text, w.size, w.style, w.path)
        if w.anim == "slam":
            sc = lerp(2.3, 1.0, e_out(p, 4)) if p < 1 else 1.0
            al = clamp(p * 3)
            dy = 0
        elif w.anim == "rise":
            sc = lerp(1.08, 1.0, e_out(p))
            al = e_out(p, 2)
            dy = (1 - e_out(p)) * 26
        else:  # pop
            sc = lerp(1.45, 1.0, e_back(p)) if p < 1 else 1.0
            al = clamp(p * 2.5)
            dy = (1 - e_out(p)) * 22
        if t_out is not None and t > t_out - out_d:
            q = clamp((t - (t_out - out_d)) / out_d)
            al *= 1 - q
            sc *= 1 + 0.06 * q
        if al <= 0.01:
            continue
        if layer is None:
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        cxw = w.x + tw / 2
        cyw = w.y + th / 2 + w.size * 0.08 + dy
        s = spr
        if abs(sc - 1) > 0.004:
            s = spr.resize((max(1, int(spr.width * sc)), max(1, int(spr.height * sc))), Image.BICUBIC)
        if al < 0.999:
            a = s.getchannel("A").point(lambda v: int(v * al))
            s = s.copy()
            s.putalpha(a)
        ox = int(round(cxw - s.width / 2 + (pad + bbox[0] - pad) * 0))
        oy = int(round(cyw - s.height / 2))
        # sprite glyph box centre is at (pad + tw/2, pad + 0.08size + th/2) in sprite coords
        gx = (pad + tw / 2) * sc
        gy = (pad + w.size * 0.08 + th / 2) * sc
        ox = int(round(cxw - gx))
        oy = int(round(cyw - gy))
        layer.alpha_composite(s, (max(ox, 0), max(oy, 0)), (max(-ox, 0), max(-oy, 0)))
    if layer is not None:
        L = to_np(layer)
        a = L[..., 3:4]
        img[:] = img * (1 - a) + L[..., :3] * a
    return img


@lru_cache(None)
def pill_sprite(text, size, w, h, style="dark", path=F_BOLD):
    """Rounded pill with text. style dark (glass), gold (CTA), white."""
    S = 2
    if w == 0:
        w = int(font(path, size).getlength(text) + h * 1.1)
    im = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if style == "gold":
        grad = np.linspace(0, 1, h * S)[:, None, None]
        col = (GOLD_TOP * (1 - grad) + GOLD_BOT * grad) * 255
        base = Image.fromarray(np.broadcast_to(col, (h * S, w * S, 3)).astype(np.uint8))
        m = Image.new("L", (w * S, h * S), 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, w * S - 1, h * S - 1), radius=h * S // 2, fill=255)
        im.paste(base, (0, 0), m)
        tcol = (28, 16, 4, 255)
    elif style == "white":
        d.rounded_rectangle((0, 0, w * S - 1, h * S - 1), radius=h * S // 2, fill=(255, 255, 255, 240))
        tcol = (20, 20, 28, 255)
    else:
        d.rounded_rectangle((0, 0, w * S - 1, h * S - 1), radius=h * S // 2, fill=(10, 12, 24, 170),
                            outline=(255, 210, 120, 235), width=3 * S)
        tcol = (255, 255, 255, 255)
    f = font(path, size * S)
    bb = f.getbbox(text)
    d.text(((w * S - (bb[2] - bb[0])) / 2 - bb[0], (h * S - (bb[3] - bb[1])) / 2 - bb[1]), text, font=f, fill=tcol)
    return im.resize((w, h), Image.LANCZOS)


def paste_rgba(img, spr, cx, cy, alpha=1.0, scale=1.0, add_glow=0.0):
    if alpha <= 0.01:
        return img
    s = spr
    if abs(scale - 1) > 0.004:
        s = spr.resize((max(1, int(spr.width * scale)), max(1, int(spr.height * scale))), Image.BICUBIC)
    a = np.asarray(s, np.float32) / 255
    x0, y0 = int(round(cx - s.width / 2)), int(round(cy - s.height / 2))
    x1, y1 = x0 + s.width, y0 + s.height
    cx0, cy0, cx1, cy1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
    if cx1 <= cx0 or cy1 <= cy0:
        return img
    sub = a[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0]
    al = sub[..., 3:4] * alpha
    img[cy0:cy1, cx0:cx1] = img[cy0:cy1, cx0:cx1] * (1 - al) + sub[..., :3] * al
    return img


def shadow_ellipse(img, cx, cy, rx, ry, k=0.6):
    y, x = np.ogrid[0:H, 0:W]
    d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
    m = np.clip(1 - d, 0, 1) ** 1.5 * k
    img *= (1 - m)[..., None]
    return img


@lru_cache(None)
def radial_bg(c_in=(0.10, 0.07, 0.05), c_out=(0.008, 0.012, 0.03), cy=0.52, r=0.75):
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((x - W / 2) / W) ** 2 + ((y - H * cy) / (W * 1.0)) ** 2) / r
    k = np.clip(d, 0, 1)[..., None] ** 1.2
    return (np.array(c_in, np.float32) * (1 - k) + np.array(c_out, np.float32) * k).astype(np.float32)


@lru_cache(None)
def light_leak():
    y, x = np.mgrid[0:H // 4, 0:W // 4].astype(np.float32)
    a = np.exp(-(((x - W / 8) / (W / 5)) ** 2 + ((y - H / 8) / (H / 5)) ** 2))
    b = np.exp(-(((x - W / 5) / (W / 9)) ** 2 + ((y - H / 6) / (H / 9)) ** 2))
    col = a[..., None] * np.array([1.0, 0.55, 0.2]) + b[..., None] * np.array([1.0, 0.85, 0.55])
    im = to_pil(np.clip(col, 0, 1)).resize((W, H), Image.BILINEAR)
    return to_np(im)


# ----------------------------------------------------------------------------- scenes
T_DROP = 0.5

S1_TEXT = layout([([("YOUR", "w"), ("CHRISTMAS", "w")], 104), ([("DECOR", "w"), ("IS", "w"), ("MISSING", "w")], 104)],
                 y_top=250, t0=-0.3, stagger=0.0)
# make second line appear just before the drop
for w in S1_TEXT[2:]:
    w.t0 = 0.12 + 0.07 * S1_TEXT[2:].index(w)
    w.dur = 0.18
S1_THIS = layout([([("THIS.", "gold")], 250)], y_top=470, t0=T_DROP, anim="slam")
for w in S1_THIS:
    w.anim, w.dur = "slam", 0.16


def scene1(t):
    on, off, led = plate("p5_on"), plate("p5_off"), plate("p5_led")
    u = clamp(t / 2.0)
    vh = lerp(1760, 1560, e_inout(u))
    cy = lerp(1010, 930, e_inout(u))
    cx = 1300
    if t >= T_DROP:
        vh *= 1 - 0.085 * math.exp(-(t - T_DROP) / 0.16)
    sx, sy = shake(t, T_DROP, 18, 0.18)
    s = vh / H
    cx -= sx * s
    cy -= sy * s
    if t < T_DROP:
        img = view(off, cx, cy, vh) * 1.35
        bl = 0.3
    else:
        dt = t - T_DROP
        boost = 1 + 1.6 * math.exp(-dt / 0.13)
        img = view(on, cx, cy, vh) + view(led, cx, cy, vh) * (boost - 1)
        img *= 1 + 0.12 * math.exp(-dt / 0.07)
        bl = 0.55 + 0.6 * math.exp(-dt / 0.16)
    img = bloom(img, bl)
    img = grade(img)
    img *= scrim(0, 900, 0.62)
    if t >= T_DROP:
        add_bokeh(img, t, 0.7 * clamp((t - T_DROP) / 0.4))
        add_snow(img, t, 0.35 * clamp((t - T_DROP) / 0.3), seed=21)
        fl = math.exp(-(t - T_DROP) / 0.045) * 0.4
        img += fl * np.array([1.0, 0.95, 0.85], np.float32)
    draw_words(img, S1_TEXT, t)
    draw_words(img, S1_THIS, t)
    # exit: zoom-in blur into the cut
    if t > 1.88:
        img = zoom_blur(img, 0.16 * e_out((t - 1.88) / 0.12, 2))
    return img


S2_TEXT = layout([([("THE", "w"), ("DIFFERENCE", "w")], 112), ([("IS", "w"), ("INSANE.", "gold")], 150)],
                 y_top=230, t0=2.05, stagger=0.09)


@lru_cache(None)
def handle_sprite():
    S = 2
    r = 46
    im = Image.new("RGBA", (r * 2 * S + 8, r * 2 * S + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = r * S + 4
    d.ellipse((c - r * S, c - r * S, c + r * S, c + r * S), fill=(255, 255, 255, 250))
    a = 14 * S
    d.polygon([(c - 8 * S, c - a), (c - 8 * S, c + a), (c - 8 * S - a, c)], fill=(30, 24, 18, 255))
    d.polygon([(c + 8 * S, c - a), (c + 8 * S, c + a), (c + 8 * S + a, c)], fill=(30, 24, 18, 255))
    return im.resize((im.width // S, im.height // S), Image.LANCZOS)


def scene2(t):
    on, off = plate("p3_on"), plate("p3_off")
    lt = t - 2.0
    u = clamp(lt / 3.0)
    vh = lerp(1588, 1470, e_inout(u))
    cx, cy = 1150, lerp(800, 770, u)
    # entry: zoom-out from blur
    if lt < 0.14:
        vh *= 1 - 0.12 * (1 - e_out(lt / 0.14))
    A = gblur(view(off, cx, cy, vh), 1.5) * 1.55
    B = view(on, cx, cy, vh)
    # divider: right edge -> overshoot -> centre
    if lt < 0.45:
        X = W + 60
    elif lt < 1.15:
        X = lerp(W + 60, 455, e_inout((lt - 0.45) / 0.7))
    else:
        X = lerp(455, 540, e_out((lt - 1.15) / 0.4))
    xs = np.arange(W, dtype=np.float32)
    m = np.clip((xs - X) / 3 + 0.5, 0, 1)[None, :, None]
    img = A * (1 - m) + B * m
    img = bloom(img, 0.7)
    img = grade(img)
    img *= scrim(0, 820, 0.6)
    # divider line glow
    if X < W:
        xi = int(X)
        lo, hi = max(xi - 30, 0), min(xi + 30, W)
        d = np.abs(np.arange(lo, hi) - X)
        g = (np.exp(-(d / 2.2) ** 2) * 1.0 + np.exp(-(d / 12) ** 2) * 0.35)[None, :, None]
        img[:, lo:hi] += g * np.array([1.0, 0.92, 0.75], np.float32)
        paste_rgba(img, handle_sprite(), X, 1060)
    # labels
    pb = pill_sprite("BEFORE", 40, 250, 78, "dark")
    pa = pill_sprite("AFTER", 40, 250, 78, "gold", F_BLACK)
    pbp = e_back(prog(lt, 0.12, 0.25))
    paste_rgba(img, pb, 270, 640, clamp(prog(lt, 0.12, 0.12)), 0.6 + 0.4 * pbp)
    pap = e_back(prog(lt, 1.15, 0.25))
    paste_rgba(img, pa, 810, 640, clamp(prog(lt, 1.15, 0.12)), 0.6 + 0.4 * pap)
    draw_words(img, S2_TEXT, t)
    if lt < 0.12:
        img = zoom_blur(img, 0.14 * (1 - lt / 0.12))
    return img


S3_TEXT = layout([([("ONE", "w"), ("NET.", "w")], 150), ([("INSTANT", "w"), ("CHRISTMAS", "gold")], 100), ([("VIBES.", "gold")], 100)],
                 y_top=235, t0=5.02, stagger=0.1)
S3_TEXT[1].t0 = S3_TEXT[0].t0 + 0.12
for i, w in enumerate(S3_TEXT[2:]):
    w.t0 = 5.5 + 0.12 * i


def scene3(t):
    lt = t - 5.0
    if t < 7.0:
        u = clamp(lt / 2.0)
        im = plate("p6_on")
        vh = lerp(1050, 860, e_inout(u))
        cx = lerp(1180, 1280, u)
        cy = lerp(820, 760, u)
        rot = math.radians(lerp(-5, -1, e_out(u)))
        img = view(im, cx, cy, vh, rot)
        foc = 16 * (1 - e_out(lt / 0.55, 3))
        img = gblur(img, foc)
        img = bloom(img, 0.85 + 0.5 * (foc / 16))
        img = grade(img, 1.12)
        img *= scrim(0, 760, 0.66)
        # flash-in from previous scene
        img += math.exp(-lt / 0.07) * 0.9 * light_leak() + math.exp(-lt / 0.05) * 0.4
        if t > 6.9:
            img = whip(img, 260 * e_out((t - 6.9) / 0.1, 2))
    else:
        lt2 = t - 7.0
        img = radial_bg((0.13, 0.08, 0.10), (0.01, 0.012, 0.03), 0.6, 0.8).copy()
        add_bokeh(img, t, 1.4, seed=4)
        spr = G.get("p2s")
        if spr is None:
            spr = Image.open(f"{PLATES}/p2_cut.png").convert("RGBA").resize((1040, 1040), Image.LANCZOS)
            G["p2s"] = spr
        sc = lerp(0.9, 1.0, e_out(lt2 / 0.6)) * (1 + 0.025 * lt2)
        rot = lerp(4, -1.5, e_out(lt2 / 2.0))
        r = spr.rotate(rot, Image.BICUBIC, expand=False)
        x_in = lerp(-420, 0, e_out(lt2 / 0.22, 3))
        shadow_ellipse(img, 470 + x_in * 0.5, 1520, 330 * sc, 42 * sc, 0.65)
        paste_rgba(img, r, 500 + x_in, 1190, 1.0, sc)
        img = bloom(img, 0.95, 0.55, (1.0, 0.95, 0.9))
        img = grade(img, 1.1)
        img *= scrim(0, 760, 0.4)
        # spec chips (accurate per product listing)
        for i, (txt, tx) in enumerate((("1.5 × 1.5 m", 330), ("96 LEDs", 760))):
            p = prog(lt2, 0.35 + 0.25 * i, 0.25)
            paste_rgba(img, pill_sprite(txt, 44, 0, 86, "dark"), tx, 790, clamp(p * 2), 0.6 + 0.4 * e_back(p))
        if lt2 < 0.1:
            img = whip(img, 260 * (1 - lt2 / 0.1))
    draw_words(img, S3_TEXT, t)
    if t > 8.9:
        img = zoom_blur(img, 0.2 * e_out((t - 8.9) / 0.1, 2))
    return img


# 2-channel controller modes (names/numbers exactly as printed on the product image)
MODES = [(9.0, 2, "IN WAVES"), (10.0, 5, "CHASING / FLASH"), (11.0, 7, "TWINKLE / FLASH"), (12.0, 8, "STEADY ON")]
TW_A = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0]
TW_B = [0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1]


def mode_levels(t):
    if t < 10.0:
        u = (t - 9.0) * 2
        a = 0.5 + 0.5 * math.cos(2 * math.pi * u)
        return 0.06 + 0.94 * a, 0.06 + 0.94 * (1 - a)
    if t < 11.0:
        k = int((t - 10.0) * 8)
        return (1.0, 0.04) if k % 2 == 0 else (0.04, 1.0)
    if t < 12.0:
        k = int((t - 11.0) * 16) % 16
        return 0.04 + 0.96 * TW_A[k], 0.04 + 0.96 * TW_B[k]
    return 1.0, 1.0


S4_8 = layout([([("8", "gold")], 330)], y_top=150, t0=9.0)
for w in S4_8:
    w.anim, w.dur = "slam", 0.16
S4_TEXT = layout([([("LIGHTING", "w"), ("MODES.", "w")], 104)], y_top=520, t0=9.12, stagger=0.1)


@lru_cache(None)
def dots_sprite(active):
    S = 2
    n, r, gap = 8, 11, 40
    w = (n - 1) * gap + 2 * r + 20
    im = Image.new("RGBA", (w * S, 60 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i in range(n):
        cx, cy = (10 + r + i * gap) * S, 30 * S
        if i + 1 == active:
            d.ellipse((cx - (r + 5) * S, cy - (r + 5) * S, cx + (r + 5) * S, cy + (r + 5) * S), fill=(255, 200, 90, 255))
        else:
            d.ellipse((cx - r * S, cy - r * S, cx + r * S, cy + r * S), outline=(255, 255, 255, 200), width=3 * S,
                      fill=(255, 255, 255, 40))
    return im.resize((w, 60), Image.LANCZOS)


def scene4(t):
    lt = t - 9.0
    u = clamp(lt / 4.0)
    vh = lerp(1720, 1540, e_inout(u))
    cx, cy = lerp(1230, 1270, u), lerp(880, 830, u)
    if lt < 0.16:
        vh *= 1 - 0.1 * (1 - e_out(lt / 0.16))
    sx, sy = shake(t, 9.0, 14, 0.15, 3)
    cx -= sx
    cy -= sy
    a, b = mode_levels(t)
    base = view(plate("p6_base"), cx, cy, vh)
    la = view(plate("p6_ledA"), cx, cy, vh)
    lb = view(plate("p6_ledB"), cx, cy, vh)
    lock = 1 + 0.8 * math.exp(-(t - 12.0) / 0.15) if t >= 12.0 else 1.0
    amb = 0.3 + 0.7 * (a + b) / 2
    img = base * amb + (la * a + lb * b) * 1.15 * lock
    img = bloom(img, 0.9 + 0.6 * (lock - 1), 0.5, (1, 1, 1))
    img = grade(img, 1.12)
    img *= scrim(0, 820, 0.62)
    img *= scrim_bottom(1150, 1700, 0.45)
    if lt < 0.1:
        img += (1 - lt / 0.1) * 0.6
    # mode UI
    idx = max(i for i, m in enumerate(MODES) if t >= m[0])
    t0, num, name = MODES[idx]
    pp = prog(t, t0, 0.2)
    pill = pill_sprite(f"MODE {num}  ·  {name}", 46, 0, 96, "dark")
    paste_rgba(img, pill, 540, 1270, clamp(pp * 3), 0.85 + 0.15 * e_back(pp))
    paste_rgba(img, dots_sprite(num), 540, 1370, clamp(prog(t, 9.1, 0.2)))
    draw_words(img, S4_8, t)
    draw_words(img, S4_TEXT, t)
    if t > 12.9:
        img = zoom_blur(img, 0.18 * e_out((t - 12.9) / 0.1, 2))
    return img


S5_TEXT = layout([([("MAKE", "w"), ("YOUR", "w"), ("SPACE", "w")], 100), ([("FEEL", "w"), ("LIKE", "w"), ("CHRISTMAS.", "gold")], 100)],
                 y_top=225, t0=13.05, stagger=0.08)
# panels: (plate, label, cam centre x, y, window width)
PANELS = [("p7_on", "WALLS", 640, 690, 700), ("p7_on", "CEILINGS", 1000, 1380, 1700), ("p4_on", "PATIOS", 1000, 760, 1880)]
PR = [(60, 560, 1020, 935), (60, 955, 1020, 1330), (60, 1350, 1020, 1725)]


@lru_cache(None)
def round_mask(w, h, r):
    m = Image.new("L", (w * 2, h * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * 2 - 1, h * 2 - 1), radius=r * 2, fill=255)
    return np.asarray(m.resize((w, h), Image.LANCZOS), np.float32)[..., None] / 255


def panel_img(name, cx, cy, ww, w, h, drift):
    vh = ww * h / w
    return view(plate(name), cx + drift, cy, vh, size=(w, h))


def scene5(t):
    lt = t - 13.0
    bg = radial_bg((0.06, 0.05, 0.08), (0.006, 0.01, 0.025), 0.55, 0.8).copy()
    img = bg
    ex = e_inout(prog(t, 15.0, 0.42))  # expansion of PATIOS panel
    for i, ((pn, label, cx, cy, ww), (x0, y0, x1, y1)) in enumerate(zip(PANELS, PR)):
        tin = 13.0 + 0.5 * i
        p = prog(t, tin, 0.34)
        if p <= 0:
            continue
        off = (1 - e_out(p, 3)) * 1150
        if i == 2:
            # expand to full frame
            x0, y0, x1, y1 = (lerp(x0, 0, ex), lerp(y0, 0, ex), lerp(x1, W, ex), lerp(y1, H, ex))
            s0 = ww / (PR[2][2] - PR[2][0])
            s1 = 1430 / H
            s = math.exp(lerp(math.log(s0), math.log(s1), ex))
            pan = lerp(0, 1, e_inout(prog(t, 15.2, 1.8)))
            ccx = lerp(cx, lerp(820, 1240, pan), ex)
            ccy = lerp(cy, 722, ex)
            w_, h_ = int(round(x1 - x0)), int(round(y1 - y0))
            vh = s * h_
            sub = view(plate(pn), ccx, ccy, vh, size=(w_, h_))
            rad = int(lerp(30, 0, ex))
        else:
            w_, h_ = x1 - x0, y1 - y0
            sub = panel_img(pn, cx, cy, ww, w_, h_, -30 * lt) * 0.82
            rad = 30
            if ex > 0.97:
                continue
        xo = int(round(x0 + off))
        m = round_mask(w_, h_, max(rad, 1)) if rad > 0 else np.ones((h_, w_, 1), np.float32)
        yo = int(round(y0))
        cx0, cx1 = max(xo, 0), min(xo + w_, W)
        if cx1 <= cx0:
            continue
        reg = img[yo:yo + h_, cx0:cx1]
        mm = m[:, cx0 - xo:cx1 - xo] * (1.0 if i == 2 else 1 - ex)
        reg[:] = reg * (1 - mm) + sub[:, cx0 - xo:cx1 - xo] * mm
    img = bloom(img, 0.35 + 0.4 * ex)
    img = grade(img, 1.1)
    img *= scrim(0, 560, 0.55 + 0.1 * ex)
    # panel labels
    for i, ((pn, label, *_), (x0, y0, x1, y1)) in enumerate(zip(PANELS, PR)):
        p = prog(t, 13.12 + 0.5 * i, 0.25)
        al = clamp(p * 3) * (1 - ex)
        if al > 0.01:
            spr = pill_sprite(label, 34, 230 if label != "CEILINGS" else 270, 64, "dark", F_BLACK)
            paste_rgba(img, spr, x0 + 40 + spr.width / 2 + (1 - e_out(p)) * 300, y0 + 52, al)
    add_snow(img, t, 0.45 + 0.5 * ex, seed=7, drift=0)
    if ex > 0:
        add_bokeh(img, t, 0.8 * ex, seed=12)
    draw_words(img, S5_TEXT, t)
    if lt < 0.1:
        img = zoom_blur(img, 0.14 * (1 - lt / 0.1))
    # soft light-leak dissolve into scene 6
    return img


S6_TEXT = layout([([("THE", "w"), ("CHRISTMAS", "w"), ("GLOW", "gold")], 104), ([("YOU", "w"), ("NEED.", "w")], 150)],
                 y_top=1080, t0=17.35, stagger=0.13, anim="rise", dur=0.45)


def scene6(t):
    lt = t - 17.0
    u = clamp(lt / 4.0)
    eu = e_inout(u)
    vh = lerp(1560, 1400, eu)
    cx = lerp(1340, 1290, eu)
    cy = lerp(1150, 790, eu)
    rot = math.radians(lerp(1.6, 0, eu))
    img = view(plate("p5_on"), cx, cy, vh, rot)
    img = bloom(img, 0.75 + 0.1 * math.sin(lt * 2))
    img = grade(img, 1.06)
    img *= scrim_bottom(950, 1650, 0.55)
    img *= scrim(0, 300, 0.25)
    add_bokeh(img, t, 0.55, par=(0, (cy - 1150) * -0.9), seed=17)
    add_snow(img, t, 0.7, seed=3)
    draw_words(img, S6_TEXT, t)
    if t > 20.9:
        img = zoom_blur(img, 0.2 * e_out((t - 20.9) / 0.1, 2))
    return img


S7_TOP = layout([([("GET", "w"), ("YOURS", "w"), ("FOR", "w")], 86)], y_top=395, t0=21.12, stagger=0.08)
S7_PRICE = layout([([("$29.99", "gold")], 230)], y_top=500, t0=21.5)
for w in S7_PRICE:
    w.anim, w.dur = "slam", 0.17


def scene7(t):
    lt = t - 21.0
    img = radial_bg((0.16, 0.10, 0.05), (0.006, 0.008, 0.02), 0.56, 0.78).copy()
    add_bokeh(img, t, 1.5, seed=31)
    spr = G.get("p1s")
    if spr is None:
        spr = Image.open(f"{PLATES}/p1_cut.png").convert("RGBA").resize((900, 900), Image.LANCZOS)
        G["p1s"] = spr
    sc = lerp(0.82, 1.0, e_out(lt / 0.5, 3)) * (1 + 0.012 * math.sin(lt * 2.2))
    rot = 2.0 * math.sin(lt * 0.9)
    r = spr.rotate(rot, Image.BICUBIC)
    cy = 1040 + 8 * math.sin(lt * 1.6)
    shadow_ellipse(img, 540, 1335, 330 * sc, 40 * sc, 0.7)
    paste_rgba(img, r, 540, cy, clamp(lt / 0.12), sc)
    hit = math.exp(-(t - 23.0) / 0.2) if t >= 23.0 else 0
    img = bloom(img, 1.0 + 0.6 * math.exp(-lt / 0.2) + 0.5 * hit, 0.55)
    img = grade(img, 1.08)
    add_snow(img, t, 0.55, seed=8)
    # logo
    logo = G.get("logo")
    if logo is None:
        lg = Image.open(f"{ASSETS}/morz-logo.png").convert("RGBA")
        lg = lg.resize((int(lg.width * 200 / lg.height), 200), Image.LANCZOS)
        glow = lg.getchannel("A").filter(ImageFilter.GaussianBlur(9))
        g = Image.new("RGBA", (lg.width + 60, lg.height + 60), (0, 0, 0, 0))
        gl = Image.new("RGBA", g.size, (255, 196, 90, 0))
        gl.putalpha(Image.new("L", g.size, 0))
        gm = Image.new("L", g.size, 0)
        gm.paste(glow, (30, 30))
        gl.putalpha(gm.point(lambda v: int(v * 0.9)))
        g.alpha_composite(gl)
        g.alpha_composite(lg, (30, 30))
        logo = G["logo"] = g
    paste_rgba(img, logo, 540, 235, clamp(prog(lt, 0.05, 0.3)))
    draw_words(img, S7_TOP, t)
    draw_words(img, S7_PRICE, t)
    # spec line (from the product listing)
    p = prog(t, 21.9, 0.3)
    spec = pill_sprite("1.5 × 1.5 m   ·   96 LEDs   ·   8 MODES", 36, 760, 64, "dark", F_SEMI)
    paste_rgba(img, spec, 540, 1395, clamp(p * 2), 0.9 + 0.1 * e_out(p))
    # CTA
    p = prog(t, 22.15, 0.28)
    pulse = 1 + 0.03 * math.sin(max(0, t - 22.5) * 7) * (t > 22.5)
    cta = pill_sprite("SHOP MORZ — LINK IN BIO", 46, 800, 118, "gold", F_BLACK)
    paste_rgba(img, cta, 540, 1510, clamp(p * 2.5), (0.7 + 0.3 * e_back(p)) * pulse)
    # shine sweep on CTA
    if 22.55 < t < 23.1:
        q = (t - 22.55) / 0.55
        sx = lerp(140, 940, q)
        xs = np.arange(140, 940)
        band = np.exp(-((xs - sx) / 40) ** 2)[None, :, None] * 0.35
        img[1455:1567, 140:940] += band
    img += 0.35 * hit
    if lt < 0.1:
        img += (1 - lt / 0.1) * 0.7
    return img


SCENES = [(0.0, 2.0, scene1), (2.0, 5.0, scene2), (5.0, 9.0, scene3), (9.0, 13.0, scene4),
          (13.0, 17.0, scene5), (17.0, 21.0, scene6), (21.0, 24.01, scene7)]


def render(t):
    for a, b, fn in SCENES:
        if a <= t < b:
            img = fn(t)
            break
    # cross-dissolve with light leak 5 -> 6
    if 16.82 <= t < 17.0:
        q = (t - 16.82) / 0.18
        img = img * (1 - q) + scene6(17.0) * q + light_leak() * 0.8 * math.sin(math.pi * q)
    if 17.0 <= t < 17.2:
        q = (t - 17.0) / 0.2
        img = img + light_leak() * 0.8 * (1 - q) * math.cos(math.pi / 2 * q)
    img = add_grain(img, t)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def init(plates, assets):
    global PLATES, ASSETS
    PLATES, ASSETS = plates, assets


def job(i):
    return render(i / FPS).tobytes()


if __name__ == "__main__":
    mode, PLATES, ASSETS = sys.argv[1], sys.argv[2], sys.argv[3]
    if mode == "frames":
        out = sys.argv[4]
        os.makedirs(out, exist_ok=True)
        for ts in sys.argv[5:]:
            tt = float(ts)
            Image.fromarray(render(tt)).save(f"{out}/f_{tt:05.2f}.png")
            print("frame", tt, flush=True)
    else:
        out, audio = sys.argv[4], sys.argv[5]
        cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", audio,
               "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
               "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-maxrate", "15M", "-bufsize", "30M", "-profile:v", "high", "-level", "4.2",
               "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
               "-x264-params", "keyint=60:min-keyint=30",
               "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", "-shortest", out]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        with Pool(4, initializer=init, initargs=(PLATES, ASSETS)) as pool:
            for k, buf in enumerate(pool.imap(job, range(NF), chunksize=4)):
                ff.stdin.write(buf)
                if k % 60 == 0:
                    print("frame", k, flush=True)
        ff.stdin.close()
        ff.wait()
        print("done", out)
