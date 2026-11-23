// Gift scratch card endpoint for morz.lol.
// Deployed as the main module of the Cloudflare Worker "morz-whop-shopify-sync";
// it wraps the existing sync worker (uploaded unchanged as ./worker.js) and adds one route:
//   POST /gift  {email}  ->  {code, expires_at, percent}
// Each email gets ONE personal Whop promo code (letters + digits) that Whop itself expires
// after GIFT_MINUTES. Emails are kept in the KV namespace GIFT_KV ("morz-gift-emails").
// Needs: WHOP_API_KEY (already on the worker), GIFT_KV binding.
import base from "./worker.js";
export * from "./worker.js";

const ACCOUNT_ID = "biz_bo6V3yGMsRjruK";
const GIFT_PERCENT = 10;
const GIFT_MINUTES = 10;
const MAX_NEW_EMAILS_PER_IP_PER_DAY = 5;
const ORIGIN_OK = /^https:\/\/([a-z0-9-]+\.)*(morz\.lol|myshopify\.com|shopifypreview\.com)$/i;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o, 1/l/i

function cors(origin) {
  const h = { "Vary": "Origin" };
  if (origin && ORIGIN_OK.test(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}
function reply(origin, status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });
}

// a.b.c+promo@gmail.com and abc@gmail.com count as the same person
function normEmail(raw) {
  const e = String(raw || "").trim().toLowerCase();
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e)) return null;
  let [user, domain] = e.split("@");
  if (domain === "googlemail.com") domain = "gmail.com";
  user = user.split("+")[0];
  if (domain === "gmail.com") user = user.replace(/\./g, "");
  return user ? user + "@" + domain : null;
}

function makeCode() {
  for (;;) {
    const b = crypto.getRandomValues(new Uint8Array(6));
    const s = Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("");
    if (/[a-z]/.test(s) && /\d/.test(s)) return "mz" + s; // always letters AND digits
  }
}

async function createWhopCode(env, expiresAt) {
  for (let i = 0; i < 4; i++) {
    const code = makeCode();
    const r = await fetch("https://api.whop.com/api/v1/promo_codes", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHOP_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: ACCOUNT_ID,
        code,
        amount_off: GIFT_PERCENT,
        promo_type: "percentage",
        base_currency: "usd",
        new_users_only: false,
        promo_duration_months: 1,
        expires_at: expiresAt,
        stock: 1,
        unlimited_stock: false,
        one_per_customer: true,
      }),
    });
    if (r.ok) { const j = await r.json(); return { code: j.code || code, id: j.id }; }
    if (r.status !== 409) throw new Error("whop " + r.status + " " + (await r.text()).slice(0, 200));
  }
  throw new Error("could not find a free code");
}

async function gift(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== "POST") return reply(origin, 405, { error: "method" });
  if (!ORIGIN_OK.test(origin)) return reply(origin, 403, { error: "origin" });

  let body = {};
  try { body = JSON.parse(await request.text()); } catch { /* empty */ }
  const email = normEmail(body.email);
  if (!email) return reply(origin, 400, { error: "email" });

  const key = "email:" + email;
  const prev = await env.GIFT_KV.get(key, "json");
  if (prev) {
    // same email again: show the same code while it is still running, otherwise refuse
    if (Date.parse(prev.expires_at) > Date.now()) return reply(origin, 200, { code: prev.code, expires_at: prev.expires_at, percent: prev.percent, again: true });
    return reply(origin, 409, { error: "used" });
  }

  const ip = request.headers.get("CF-Connecting-IP") || "?";
  const ipKey = "ip:" + ip + ":" + new Date().toISOString().slice(0, 10);
  const n = Number(await env.GIFT_KV.get(ipKey)) || 0;
  if (n >= MAX_NEW_EMAILS_PER_IP_PER_DAY) return reply(origin, 429, { error: "limit" });

  const expiresAt = new Date(Date.now() + GIFT_MINUTES * 60000).toISOString();
  let made;
  try { made = await createWhopCode(env, expiresAt); }
  catch (err) { console.error("gift failed", err && err.message); return reply(origin, 502, { error: "server" }); }

  const rec = { code: made.code, promo_id: made.id, expires_at: expiresAt, percent: GIFT_PERCENT, email: String(body.email).trim(), created_at: new Date().toISOString(), country: request.headers.get("CF-IPCountry") || "" };
  await env.GIFT_KV.put(key, JSON.stringify(rec));
  await env.GIFT_KV.put(ipKey, String(n + 1), { expirationTtl: 172800 });
  return reply(origin, 200, { code: rec.code, expires_at: expiresAt, percent: GIFT_PERCENT });
}

export default {
  ...base,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/gift") return gift(request, env);
    return base.fetch(request, env, ctx);
  },
};
