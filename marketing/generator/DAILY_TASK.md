# Daily reel task (prompt for the scheduled run)

Make and publish today's MorZ marketing reel. Fully automatic: no approval step. English only.

1. Setup: `git fetch origin ccr-e7127868-lu62c6 && git checkout FETCH_HEAD -- marketing/generator`.
2. History: read the last 7 days of Instagram posts (connector `instagram`, fields media_caption,
   media_permalink, date_preset last_7dT) to see which products were already featured.
3. Products: query Shopify for ACTIVE products that have a featured image and stock.
   Pick 3–4 not named in those captions (if not enough, the least recently used).
   Prefer products with a compare-at price. Use real prices from Shopify only. Never invent a discount.
4. Look: pick theme/fx/motion different from yesterday, and a new random seed.
   Write a fresh short `kicker`, `headline` (max ~4 words a line, 3 lines) and `outroHeadline`.
   The outro "Up to X% OFF" must equal the biggest real discount among the chosen products;
   if none are discounted use something like "New for\n*Christmas*" instead.
   Fit the season (Christmas → New Year → Valentine's, etc.). Url: `morz.lol`.
5. Render: `node marketing/generator/render.js cfg.json reel.mp4 --stills` then look at the stills.
   If text overflows or an image is missing, fix the config and re-check. Then render the full video.
6. Host: the repo (morzzzz01-lab/Morz) is public, so commit the video as
   `marketing/reels/<YYYY-MM-DD>.mp4` on this session's own branch, push, and use
   `https://raw.githubusercontent.com/morzzzz01-lab/Morz/<branch>/marketing/reels/<YYYY-MM-DD>.mp4`.
   Check it returns 200 with `curl -sI` first. Do NOT use the Shopify CDN: Facebook gets 429 from it.
7. Captions: Instagram/Facebook caption (2–3 lines, emojis, price hook, "Shop at morz.lol", 6–8 hashtags)
   and a shorter TikTok caption. No false claims (no "free shipping", "last day", etc. unless true).
8. Publish via the Windsor.ai connector, one call at a time (not in parallel):
   - Instagram: connector `instagram`, account `17841432304404614`, action `create_video_post`
     (video_url, caption, share_to_feed true, thumb_offset 1500).
   - Facebook: connector `facebook_organic`, account `1562781753576390`, action `create_reel`
     (video_url, description with the full https://morz.lol link).
   - If a call times out, the post may still have been made: read Instagram `media_caption`/`media_permalink`
     with get_data (date_preset last_1dT, filter caption contains a phrase from today's caption)
     before retrying. Never publish the same reel twice.
   - TikTok: Windsor cannot post to TikTok. Skip it; the owner uploads it by hand (the video link is in the summary).
   If one platform fails, still publish to the other, and report the error.
9. Finish with a short summary: products, links to the three posts, any errors.
