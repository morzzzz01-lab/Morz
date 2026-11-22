# MorZ reel generator

Builds a 9:16 (1080×1920) marketing reel from Shopify products, with an original music track.

```
node render.js config.json out.mp4            # full video (~1 min to render)
node render.js config.json out.mp4 --stills   # quick preview PNGs
```

Needs: Node + Playwright (Chromium), ffmpeg, Python 3 + numpy, Inter font.

## Config (see `config.example.json`)
| key | values |
|---|---|
| `theme` | `night`, `snow`, `candy`, `midnight` |
| `fx` | `snow`, `sparkle` |
| `motion` | `slide`, `zoom`, `drop` |
| `seed` | any integer: changes the music (key, tempo, melody) and particles |
| `headline`, `outroHeadline` | `\n` = line break, `*word*` = hot colour, `_word_` = second colour |
| `products[]` | `name`, `now`, `was` (optional), `img` (URL or file) |

Length = 2.5 s intro + 2.5 s per product + 2.5 s outro. Use 3–5 products.

## Automated run (each scheduled post)
1. Query Shopify for ACTIVE products with an image; skip ones featured on Instagram in the last 7 days.
2. Pick 3–5 products, a theme/fx/motion/seed different from the last run, write a fresh headline.
3. Render, check the stills, then push the MP4 to the public repo and use its raw GitHub URL.
4. Publish to Instagram and Facebook as Reels via Windsor.ai (TikTok: manual upload).
5. See DAILY_TASK.md for the full scheduled-run steps.
