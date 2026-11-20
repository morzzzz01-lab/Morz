# MORZ · Iron LED Candle Lantern ad

15 s, 1080x1920, 30 fps, for TikTok, Instagram Reels and Facebook Reels. Final file: `iron_led_lantern_ad.mp4`.

Built with Remotion (React → video) and a procedural sound engine (`sfx/`, pure Python, no samples). Every visual
is one of the 10 product photos from the Shopify listing (`public/photos/raw/`), animated with pan, zoom, grading
and light effects. The product itself is not redrawn or changed.

## Storyboard (times live in `timeline.json`)

| Time | Scene | Photos |
|---|---|---|
| 0–2 s | Dark room, hook "YOUR ROOM IS MISSING THIS..." | s10 defocused and dimmed |
| 2–5 s | Lantern in the dark, its light comes up, slow push in, sheen across the metal | s1 (cut-out) |
| 5–9 s | Close-ups (reindeer, snowflake, trees), "INSTANT COZY VIBES" | s8, s7, s9 |
| 9–12 s | Other angles, one per beat | s4, s2, s6, s5 |
| 12–15 s | Hero shot, "MAKE YOUR SPACE FEEL SPECIAL", MORZ, SHOP NOW | s10 |

## Edit and re-render

Needs Node 20+, Python 3 and ffmpeg.

```bash
npm install
npm run studio      # live preview in the browser
npm run build       # sound + render + mux -> iron_led_lantern_ad.mp4
```

- **Text, colours, fonts:** `src/LanternAd.tsx` (one component per scene), palette `C` in `src/lib.ts`.
- **Timing:** edit `timeline.json`; picture and sound both read it, so they stay in sync. Run `npm run build`.
- **Which photo, how the camera moves:** the `CLOSE` and `ANGLES` lists in `src/LanternAd.tsx`.
  `z` is zoom (photo width in frame widths), `x`/`y` the point of the photo kept at the centre.
- **Music and sound effects:** `sfx/cues/lantern.py` (D major, 80 BPM, mastered to -14 LUFS).
- **Swap in new photos:** put them in `public/photos/` and change the `src` names.
