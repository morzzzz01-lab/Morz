# MORZ · Hand-Painted Christmas Mugs (set of 2) ad

15 s, 1080x1920, 30 fps, for TikTok, Instagram Reels and Facebook Reels. Final file: `christmas_mugs_ad.mp4`.

Same toolkit as `../iron-led-lantern-ad`. Every image comes from the Shopify listing (`public/photos/raw/`):
the snowman mug cut-out (`mug.png`) and the three room photos (`table`, `stack1`, `stack2`).

| Time | Scene | Photos |
|---|---|---|
| 0–2 s | Table photo defocused, hook "YOUR COCOA DESERVES THIS..." | table |
| 2–5 s | Snowman mug in warm light, sheen across the glaze, "HAND-PAINTED CHRISTMAS MUGS · SET OF 2 · 11 OZ" | mug.png |
| 5–9 s | Close-ups: snowman face, heart mitten, candy-cane handle, "PAINTED BY HAND" | mug.png |
| 9–12 s | Room photos with SET OF 2 / DISHWASHER SAFE / MICROWAVE SAFE, then "EACH ONE IS UNIQUE" | table, stack1, stack2 |
| 12–15 s | Snowman mug hero, "MADE FOR COCOA NIGHTS", MORZ mini logo, SHOP NOW | mug.png |

```bash
npm install
npm run studio
npm run build       # sound + render + mux -> christmas_mugs_ad.mp4
```

Text and layout in `src/MugAd.tsx`, timing in `timeline.json`, sound in `sfx/cues/mug.py`.
