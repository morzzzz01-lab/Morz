# MORZ · Gnome Christmas Stocking ad

15 s, 1080x1920, 30 fps, for TikTok, Instagram Reels and Facebook Reels. Final file: `gnome_stocking_ad.mp4`.

Same toolkit as `../iron-led-lantern-ad`. Every image is a store photo of the product (`public/photos/raw/`, the 6
unique photos from the Shopify listing; the listing has 8, two are duplicates).

| Time | Scene | Photos |
|---|---|---|
| 0–2 s | Fireplace photo defocused, hook "YOUR FIREPLACE LOOKS EMPTY?" | s4 |
| 2–5 s | The pair in warm light, push in, sheen | s1 (transparent cut-out) |
| 5–9 s | Close-ups: plaid hat and nose, beard, snowflake, "FESTIVE GNOME CHARM" | s1 |
| 9–12 s | Mantel, staircase, fireplace with chips ROOMY FOR GIFTS / HANG IT ANYWHERE / REUSABLE FOR YEARS, then RED or GREY | s2, s3, s4, s5, s6 |
| 12–15 s | Mantel hero, "FILL THEM WITH CHRISTMAS MAGIC", MORZ mini logo, SHOP NOW | s2 |

```bash
npm install
npm run studio      # live preview
npm run build       # sound + render + mux -> gnome_stocking_ad.mp4
```

Text and layout in `src/StockingAd.tsx`, timing in `timeline.json`, sound in `sfx/cues/stocking.py`.
