# MORZ · Hooded Heated Flannel Blanket ad

15 s, 1080x1920, 30 fps, for TikTok, Instagram Reels and Facebook Reels. Final file: `heated_robe_ad.mp4`.

Same toolkit as `../iron-led-lantern-ad`: Remotion (React → video) plus the procedural sound engine in `sfx/`.
Every image is a MORZ store photo of the product (`public/photos/raw/`). `front.png` and `back.png` are the
1024 px photos you sent, cut out with the alpha mask of the store's own transparent PNGs (same shot,
pixel-aligned), so they can sit on a dark backdrop. The fabric keeps its real gray. Only the background and
the light around it change colour. The supplier infographic (`p3.jpg`, "100% ETL certified", "NTC+PTC") is
left out because those claims are not in the store description.

## Storyboard (times live in `timeline.json`)

| Time | Scene | Photos |
|---|---|---|
| 0–2 s | Cold night, snow, hook "STILL FREEZING AT HOME?" | none |
| 2–5 s | The robe in cold blue light, then warm light floods in | front.png |
| 5–9 s | Close-ups: sherpa-lined hood, control panel, cuff and pocket, "WARMTH YOU CAN WEAR" | front.png |
| 9–12 s | Worn, its controller, the back, the front, chips SOFT FLANNEL / COZY HOOD / PLUG-IN WARMTH | model.jpg, back.png, front.png |
| 12–15 s | Hero, "STAY COZY ALL WINTER", MORZ mini logo, SHOP NOW | front.png, `public/logo/morz-logo-mini-light.png` |

## Edit and re-render

```bash
npm install
npm run studio      # live preview
npm run build       # sound + render + mux -> heated_robe_ad.mp4
```

- Text and layout: `src/RobeAd.tsx`; palette `C` in `src/lib.ts`; timing `timeline.json` (sound follows it).
- Camera moves: the `CLOSE` list and the `from`/`to` props (`z` zoom, `x`/`y` the photo point at the centre).
- Sound: `sfx/cues/robe.py` (cold wind, D major bed at 80 BPM, -14 LUFS).
