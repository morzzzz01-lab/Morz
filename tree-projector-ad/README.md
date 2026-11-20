# MORZ · Christmas Tree Projection Light ad

15 s, 1080x1920, 30 fps, for TikTok, Instagram Reels and Facebook Reels. Final file: `tree_projector_ad.mp4`.
Listing: "Christmas Projection Light for Ceiling and Walls, Indoor".

Same toolkit as `../iron-led-lantern-ad`. Images come only from the Shopify listing (`public/photos/raw/`):
the product cut-out (`tree.png`, 340 px source), the ceiling photo cropped out of the "6+ Magical Designs"
infographic (`ceiling.jpg`, no text), and the gift box cropped out of "The Perfect Gift" image (`gift.jpg`).
The TikTok clip sent earlier in the chat (ssstik download) is someone else's video and is not used.

| Time | Scene | Photos |
|---|---|---|
| 0–2 s | Ceiling photo dark and out of focus, hook "WHAT IF YOUR CEILING DID THIS?" | ceiling |
| 2–5 s | Focus pulls in on the projected ceiling, slow tilt, "CHRISTMAS PROJECTION LIGHT" | ceiling |
| 5–9 s | Close-ups: lens on top of the tree, lit wreath, USB plug, "TINY TREE, BIG MAGIC" | tree.png |
| 9–12 s | Ceiling, whole tree, ceiling, gift box with NOTHING TO HANG / QUICK TO SET UP / MOVES ROOM TO ROOM, then "A GIFT THEY'LL LOVE" | ceiling, tree, gift |
| 12–15 s | Tree hero, "INSTANT CHRISTMAS MAGIC", MORZ mini logo, SHOP NOW | tree.png |

```bash
npm install
npm run studio
npm run build       # sound + render + mux -> tree_projector_ad.mp4
```

Text and layout in `src/ProjectorAd.tsx`, timing in `timeline.json`, sound in `sfx/cues/projector.py`.
