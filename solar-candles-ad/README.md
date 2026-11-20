# MORZ · Solar LED Candles (set of 6) ad

15 s, 1080x1920, 30 fps, for TikTok, Instagram Reels and Facebook Reels. Final file: `solar_candles_ad.mp4`.

Same toolkit as `../iron-led-lantern-ad`. Every image comes from the Shopify listing (`public/photos/raw/`, 9 photos).
Collages were cropped into single photos (`books`, `petals`, `jars`, `teapot`, `twine`, `coolwhite`, `set6`).
Small room photos are shown as cards over a defocused copy, so they are not blown up to full frame.
Left out: `s8` ("SOLAR CHARGING, 6-8 h charge, about 10 h light", which disagrees with the store description:
about 8 h of light after a 10 h charge), `s5` (wavy-top candles, a different look), `s7` (Chinese-English
infographic text).

| Time | Scene | Photos |
|---|---|---|
| 0–2 s | Dark room, hook "CANDLELIGHT WITHOUT FIRE?" | jars (defocused) |
| 2–5 s | One candle, unlit, then the store's lit photo fades in, "SOLAR LED CANDLES · SET OF 6" | unlit.png, lit.png |
| 5–9 s | Close-ups: flame, solar panel, switch, "CHARGED BY THE SUN" | lit, unlit, switch |
| 9–12 s | Room cards with NO FLAME, NO SMOKE / WATERPROOF / ABOUT 8 H OF LIGHT, then 3 LIGHT COLOURS | books, petals, jars, coolwhite |
| 12–15 s | Lit candle hero, "COZY GLOW, ZERO FLAME", MORZ mini logo, SHOP NOW | lit.png |

```bash
npm install
npm run studio
npm run build       # sound + render + mux -> solar_candles_ad.mp4
```

Text and layout in `src/CandleAd.tsx`, timing in `timeline.json`, sound in `sfx/cues/candle.py`.
