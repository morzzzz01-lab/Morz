# Whop → Shopify автомат захиалга

Whop дээр төлбөр орох бүрт энэ сервер Shopify дээр **төлөгдсөн (PAID) захиалга** автоматаар үүсгэнэ:
зөв бараа, өнгө/хэмжээ, тоо ширхэг (bundle 2x/3x/4x), хүргэлтийн хаягтай.
Дараа нь DSers / DropSure / Dropshipper-ai апп уг захиалгыг нийлүүлэгч рүү өөрөө явуулна.

Ойлгоход хэцүү захиалга (өнгө таарахгүй, хаяг дутуу гэх мэт) `whop-needs-review` tag-тай,
тайлбар (note)-той үүснэ — Shopify → Orders дээр тэр tag-аар шүүж шалгаарай.

## Тохируулах алхам

1. **Dropship аппуудад "Auto order"-ыг асаах** (DSers: Settings → Automation; DropSure, Dropshipper-ai: тохиргоонд Auto fulfill / Auto order).
2. **Shopify апп** — dev.shopify.com (Dev Dashboard) → Create app → scopes: `write_orders`, `read_orders`, `read_products` → MorZ дэлгүүрт суулгах → Client ID, Client secret-ийг авах.
3. **Whop API key** — Whop → Developer → API keys → шинэ key (эрх: `member:basic:read`, `member:email:read`, `payment:basic:read`).
4. **Cloudflare** — cloudflare.com дээр үнэгүй бүртгүүлэх. Дараа нь энэ хавтсанд:
   ```
   npm install
   npx wrangler login
   npx wrangler secret put WHOP_API_KEY
   npx wrangler secret put SHOPIFY_CLIENT_ID
   npx wrangler secret put SHOPIFY_CLIENT_SECRET
   npx wrangler deploy
   ```
   Deploy хийхэд `https://morz-whop-shopify-sync.<нэр>.workers.dev` хаяг гарна.
5. **Whop webhook** — Whop → Developer → Webhooks → URL: `https://...workers.dev/webhook`, event: `payment.succeeded`.
   Гарч ирэх `webhook_secret`-ийг: `npx wrangler secret put WHOP_WEBHOOK_SECRET`.
6. **Тест** — хямд бараа нэгийг өөрөө худалдаж аваад Shopify → Orders дээр захиалга гарч ирж байгааг шалгах.

## Шинэ бараа нэмэх үед

`src/plan-map.json` нь Whop plan → Shopify барааны холбоо. Shopify барааны тайлбарт Whop checkout линк
байгаа бол `tools/build_plan_map.py`-ээр дахин үүсгээд `npx wrangler deploy` хийнэ.
Холбоогүй plan-ийн захиалга ч үүснэ, гэхдээ `whop-needs-review` tag-тай.

## Тест

`npm test` — Whop болон Shopify-г дуурайлгаж (интернэтгүй) шалгана.
