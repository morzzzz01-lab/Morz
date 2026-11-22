# Daily reel task (prompt for the scheduled run)

Make and publish today's MorZ marketing reel. Fully automatic: no approval step. English only.

1. Setup: `git fetch origin ccr-e7127868-lu62c6 && git checkout FETCH_HEAD -- marketing/generator`.
2. History: read Shopify shop metafield `morz_marketing.reel_history` (JSON list of past runs:
   date, product handles, theme, fx, motion, seed, post links). Missing = empty list.
3. Products: query Shopify for ACTIVE products that have a featured image and stock.
   Pick 3–4 not used in the last 7 runs (if not enough, the least recently used).
   Prefer products with a compare-at price. Use real prices from Shopify only. Never invent a discount.
4. Look: pick theme/fx/motion different from yesterday, and a new random seed.
   Write a fresh short `kicker`, `headline` (max ~4 words a line, 3 lines) and `outroHeadline`.
   The outro "Up to X% OFF" must equal the biggest real discount among the chosen products;
   if none are discounted use something like "New for\n*Christmas*" instead.
   Fit the season (Christmas → New Year → Valentine's, etc.). Url: `morz.lol`.
5. Render: `node marketing/generator/render.js cfg.json reel.mp4 --stills` then look at the stills.
   If text overflows or an image is missing, fix the config and re-check. Then render the full video.
6. Host: upload reel.mp4 to Shopify Files and wait until it is READY; use its public CDN URL.
7. Captions: Instagram/Facebook caption (2–3 lines, emojis, price hook, "Shop at morz.lol", 6–8 hashtags)
   and a shorter TikTok caption. No false claims (no "free shipping", "last day", etc. unless true).
8. Publish via the Windsor.ai social connector: Instagram Reel, Facebook Page Reel, TikTok video (public).
   If one platform fails, still publish to the others, and report the error.
9. Append this run to the history metafield (keep the last 60).
10. Finish with a short summary: products, links to the three posts, any errors.
