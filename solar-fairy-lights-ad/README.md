# MORZ · Solar Fairy Lights (39 ft, 100 LED, multicolour) ad

15 s, 1080x1920, 30 fps, for TikTok, Instagram Reels and Facebook Reels. Final file: `solar_fairy_lights_ad.mp4`.

Same toolkit as `../iron-led-lantern-ad`. Every image comes from the Shopify listing (`public/photos/raw/`, 8 photos).
The 4-photo collage (`s5`) was cropped into `desk`, `line`, `garden`, `rail`. Left out: `s3` (shows a remote
control that the store description does not mention), `s6` and `s7` (diagrams with text).

| Time | Scene | Photos |
|---|---|---|
| 0–2 s | Bamboo photo defocused into bokeh, hook "YOUR BACKYARD LOOKS DULL?" | bamboo |
| 2–5 s | The whole string (cut-out) with a colour halo, "SOLAR FAIRY LIGHTS · 39 FT · 100 LED" | string.png |
| 5–9 s | Close-ups: bulb on bamboo, bulbs on the table, crystal-ball bulbs, "SUN BY DAY, GLOW BY NIGHT" | bamboo, cup, string |
| 9–12 s | Fence, desk, rail with SOLAR POWERED / 8 LIGHTING MODES / WATERPROOF, then the solar panel with "TURNS ON BY ITSELF WHEN IT GETS DARK" | fence, desk, rail |
| 12–15 s | Bamboo hero, "LIGHT UP YOUR NIGHTS", MORZ mini logo, SHOP NOW | bamboo |

```bash
npm install
npm run studio
npm run build       # sound + render + mux -> solar_fairy_lights_ad.mp4
```

Text and layout in `src/FairyAd.tsx`, timing in `timeline.json`, sound in `sfx/cues/fairy.py`.
