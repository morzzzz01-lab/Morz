"""Tiled Real-ESRGAN x4 upscaling of the real MORZ product photos (ONNX, CPU)."""
import sys, time
import numpy as np
from PIL import Image
import onnxruntime as ort

model, src_dir, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
names = sys.argv[4:]

opts = ort.SessionOptions()
opts.intra_op_num_threads = 4
sess = ort.InferenceSession(model, opts, providers=["CPUExecutionProvider"])

TILE, PAD, S = 160, 16, 4


def run(rgb):  # rgb float32 HxWx3 in [0,1]
    h, w, _ = rgb.shape
    out = np.zeros((h * S, w * S, 3), np.float32)
    for y0 in range(0, h, TILE):
        for x0 in range(0, w, TILE):
            y1, x1 = min(y0 + TILE, h), min(x0 + TILE, w)
            py0, px0 = max(y0 - PAD, 0), max(x0 - PAD, 0)
            py1, px1 = min(y1 + PAD, h), min(x1 + PAD, w)
            tile = rgb[py0:py1, px0:px1].transpose(2, 0, 1)[None]
            res = sess.run(None, {"input": np.ascontiguousarray(tile)})[0][0].transpose(1, 2, 0)
            oy, ox = (y0 - py0) * S, (x0 - px0) * S
            out[y0 * S:y1 * S, x0 * S:x1 * S] = res[oy:oy + (y1 - y0) * S, ox:ox + (x1 - x0) * S]
    return np.clip(out, 0, 1)


for n in names:
    t = time.time()
    im = Image.open(f"{src_dir}/{n}.png").convert("RGBA")
    a = np.asarray(im).astype(np.float32) / 255.0
    rgb, alpha = a[..., :3], a[..., 3]
    if alpha.min() < 1:  # premultiply onto black so transparent pixels don't bleed colour
        rgb = rgb * alpha[..., None]
    up = run(rgb)
    o = (up * 255 + 0.5).astype(np.uint8)
    if alpha.min() < 1:
        al = Image.fromarray((alpha * 255).astype(np.uint8)).resize((o.shape[1], o.shape[0]), Image.LANCZOS)
        al = np.asarray(al).astype(np.float32) / 255.0
        un = np.clip(up / np.maximum(al[..., None], 1e-3), 0, 1)  # un-premultiply
        o = np.dstack([(un * 255 + 0.5).astype(np.uint8), (al * 255 + 0.5).astype(np.uint8)])
        Image.fromarray(o, "RGBA").save(f"{out_dir}/{n}.png")
    else:
        Image.fromarray(o).save(f"{out_dir}/{n}.png")
    print(n, f"{time.time() - t:.1f}s", o.shape, flush=True)
