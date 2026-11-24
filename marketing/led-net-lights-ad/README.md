# MORZ — LED Net Lights ad ("This room was boring… until this happened")

| Deliverable | Spec |
|---|---|
| `MORZ_LED_NET_LIGHTS_AD.mp4` | 1080×1920 (9:16), 30 fps, 24.0 s, H.264 High (BT.709), AAC 48 kHz stereo, −14 LUFS, ~15 Mbps / 47 MB |
| `MORZ_LED_NET_LIGHTS_THUMBNAIL.png` | 1080×1920 cover, "WAIT UNTIL THE LIGHTS TURN ON…" (text kept in the centre so the 3:4 profile-grid crop still reads) |

## Edit (120 BPM — every scene cut lands on a beat)

| Time | Scene | On-screen text | Footage |
|---|---|---|---|
| 0.0–2.0 | Hook: dark corner → **lights snap on at 0.50 s on the beat drop** | YOUR CHRISTMAS DECOR IS MISSING **THIS.** | Pergola photo, lights-off plate → real lit photo |
| 2.0–5.0 | Before/after slider wipe, settles to a 50/50 split | THE DIFFERENCE IS INSANE. · BEFORE / AFTER | Umbrella-patio photo (same scene off vs on) |
| 5.0–9.0 | Rack-focus macro of the diamond mesh → product with controller & US plug | ONE NET. INSTANT CHRISTMAS VIBES. · 1.5 × 1.5 m · 96 LEDs | Multicolour net photo, product cut-out |
| 9.0–13.0 | Mode demo synced to the music, 8-dot mode indicator | 8 LIGHTING MODES. · MODE 2 In Waves → 5 Chasing/Flash → 7 Twinkle/Flash → 8 Steady On | Multicolour net photo |
| 13.0–17.0 | WALLS / CEILINGS / PATIOS panels slide in, PATIOS expands full-screen | MAKE YOUR SPACE FEEL LIKE CHRISTMAS. | Listing photos (wall, hall ceiling, porch) |
| 17.0–21.0 | Slow cinematic tilt from the sofa up to the glowing ceiling | THE CHRISTMAS GLOW YOU NEED. | Pergola photo (callback to the hook) |
| 21.0–24.0 | Product hero + price slam + CTA | GET YOURS FOR **$29.99** · 1.5 × 1.5 m · 96 LEDs · 8 MODES · SHOP MORZ — LINK IN BIO | Warm-white product cut-out, MORZ logo |

## Claims and where they come from

All claims are taken from the live Shopify listing "LED Net Lights, 1.5 × 1.5 m, 8 Modes" or its own product images:
price $29.99 (all variants), 1.5 × 1.5 m, 96 LEDs, 8 lighting modes, and use on walls, ceilings and patios ("Great for").
The mode names and numbers are printed exactly as they appear on the listing's "8 LIGHTING MODES" image. There are no testimonials, no ratings and no invented features.

## How it was made (honesty notes)

- **Imagery:** only the 8 real MORZ product photos (500 px). These were upscaled 4× with Real-ESRGAN (`upscale.py`), and the supplier text overlays were cropped out. The product design was not changed.
- **"Lights off" plates:** made from the same photos by inpainting the LED points out and darkening the scene (`prep.py`). This lets the before/after and light-on moments show the same real scene.
- **Mode demo:** the 8-function controller in the photos is the standard 2-circuit type. The demo splits the photo's LEDs into two interleaved channels and animates them with each mode's on/off/fade pattern. It is a faithful simulation, not filmed footage, and shows no per-LED or "rainbow chase" effects the product can't do. Real-world timing of each mode may differ slightly.
- **Atmosphere:** snow, bokeh, glow and grain are added lens and atmosphere effects. They do not show the product.
- **Music and sound design:** composed and synthesized from scratch in `audio.py`. It uses no samples and no licensed music, so it's safe to use anywhere.

## Re-render

Needs Python 3 with numpy, scipy, Pillow and onnxruntime, plus ffmpeg and ImageMagick. The Real-ESRGAN x4plus ONNX model comes from Hugging Face.

```
python3 source/upscale.py RealESRGAN_x4plus.onnx src up p1 p2 p3 p4 p5 p6 p7 p8   # src = the 8 listing photos as p1..p8.png
python3 source/prep.py up plates
python3 source/audio.py music.wav            # then loudnorm to -14 LUFS (two-pass)
python3 source/render.py video plates ../../assets out.mp4 music_norm.wav
python3 source/thumb.py source plates ../../assets thumb.png
bash source/qc.sh out.mp4 qc/                # specs, loudness, cut timing, contact sheet
```

The listing photo order (p1…p8) is the order of the product's media in Shopify.
