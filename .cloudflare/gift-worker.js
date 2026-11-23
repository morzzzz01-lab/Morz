// Gift scratch card endpoint for morz.lol.
// Deployed as the main module of the Cloudflare Worker "morz-whop-shopify-sync";
// it wraps the existing sync worker (uploaded unchanged as ./worker.js) and adds:
//   POST /gift         {email} -> checks the email is real, makes a personal Whop promo code that
//                                 Whop expires after GIFT_MINUTES, emails it, saves the email as a
//                                 Whop lead. The code itself is NOT returned: it only goes by email.
//   POST /gift/verify  {code}  -> {code, expires_at, percent} when the code is a running gift code
// One gift per email. Emails are kept in the KV namespace GIFT_KV ("morz-gift-emails").
// Needs: WHOP_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD (secrets), GIFT_KV (KV binding).
import { connect } from "cloudflare:sockets";
import base from "./worker.js";
import { parseEmail, typoFix, isDisposable, domainTakesMail, buildMessage, smtpSend, giftEmail } from "./gift-lib.js";
export * from "./worker.js";

const ACCOUNT_ID = "biz_bo6V3yGMsRjruK";
const SHOP_URL = "https://morz.lol";
const GIFT_PERCENT = 10;
const GIFT_MINUTES = 10;
const MAX_NEW_EMAILS_PER_IP_PER_DAY = 5;
const ORIGIN_OK = /^https:\/\/([a-z0-9-]+\.)*(morz\.lol|myshopify\.com|shopifypreview\.com)$/i;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o, 1/l/i
const WHOP = "https://api.whop.com/api/v1";

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
function sameperson(p) {
  let user = p.user.split("+")[0], domain = p.domain;
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") user = user.replace(/\./g, "");
  return user + "@" + domain;
}

function makeCode() {
  for (;;) {
    const b = crypto.getRandomValues(new Uint8Array(6));
    const s = Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("");
    if (/[a-z]/.test(s) && /\d/.test(s)) return "mz" + s; // always letters AND digits
  }
}

const whopHeaders = (env) => ({ Authorization: `Bearer ${env.WHOP_API_KEY}`, "Content-Type": "application/json" });

async function createWhopCode(env, expiresAt) {
  for (let i = 0; i < 4; i++) {
    const code = makeCode();
    const r = await fetch(WHOP + "/promo_codes", {
      method: "POST",
      headers: whopHeaders(env),
      body: JSON.stringify({
        account_id: ACCOUNT_ID, code, amount_off: GIFT_PERCENT, promo_type: "percentage", base_currency: "usd",
        new_users_only: false, promo_duration_months: 1, expires_at: expiresAt,
        stock: 1, unlimited_stock: false, one_per_customer: true,
      }),
    });
    if (r.ok) { const j = await r.json(); return { code: j.code || code, id: j.id }; }
    if (r.status !== 409) throw new Error("whop " + r.status + " " + (await r.text()).slice(0, 200));
  }
  throw new Error("could not find a free code");
}

async function deleteWhopCode(env, id) {
  try { await fetch(WHOP + "/promo_codes/" + id, { method: "DELETE", headers: whopHeaders(env) }); } catch { /* ignore */ }
}

// Save the email as a lead in Whop (People).
async function whopLead(env, email, country) {
  try {
    const r = await fetch(WHOP + "/events", {
      method: "POST",
      headers: whopHeaders(env),
      body: JSON.stringify({
        account_id: ACCOUNT_ID, event_name: "lead", action_source: "website", url: SHOP_URL + "/",
        user: { email, country: country || null },
      }),
    });
    if (!r.ok) console.error("whop lead failed", r.status, (await r.text()).slice(0, 200));
  } catch (err) { console.error("whop lead failed", err && err.message); }
}

async function sendGiftMail(env, to, code) {
  const { subject, text, html } = giftEmail({ code, percent: GIFT_PERCENT, minutes: GIFT_MINUTES, shopUrl: SHOP_URL });
  const user = String(env.GMAIL_USER).trim(), pass = String(env.GMAIL_APP_PASSWORD).replace(/\s+/g, "");
  const message = buildMessage({ from: user, fromName: "MORZ", to, subject, text, html });
  const sock = connect({ hostname: "smtp.gmail.com", port: 465 }, { secureTransport: "on", allowHalfOpen: false });
  try { await smtpSend(sock, { user, pass, to, message }); }
  finally { try { await sock.close(); } catch { /* ignore */ } }
}

async function readJson(request) {
  try { return JSON.parse(await request.text()); } catch { return {}; }
}

async function gift(request, env, ctx) {
  const origin = request.headers.get("Origin") || "";
  const body = await readJson(request);
  const p = parseEmail(body.email);
  if (!p) return reply(origin, 400, { error: "email" });
  const fix = typoFix(p);
  if (fix) return reply(origin, 400, { error: "typo", suggest: fix });
  if (isDisposable(p.domain)) return reply(origin, 400, { error: "temp" });
  if ((await domainTakesMail(p.domain)) === false) return reply(origin, 400, { error: "nomail" });

  const key = "email:" + sameperson(p);
  const prev = await env.GIFT_KV.get(key, "json");
  if (prev) {
    // same email again: while its code is still running, point to the email already sent
    if (Date.parse(prev.expires_at) > Date.now()) return reply(origin, 200, { sent: true, again: true, expires_at: prev.expires_at, percent: prev.percent });
    return reply(origin, 409, { error: "used" });
  }

  const ip = request.headers.get("CF-Connecting-IP") || "?";
  const ipKey = "ip:" + ip + ":" + new Date().toISOString().slice(0, 10);
  const n = Number(await env.GIFT_KV.get(ipKey)) || 0;
  if (n >= MAX_NEW_EMAILS_PER_IP_PER_DAY) return reply(origin, 429, { error: "limit" });

  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) { console.error("gift: Gmail secrets missing"); return reply(origin, 503, { error: "setup" }); }

  const expiresAt = new Date(Date.now() + GIFT_MINUTES * 60000).toISOString();
  let made;
  try { made = await createWhopCode(env, expiresAt); }
  catch (err) { console.error("gift: whop failed", err && err.message); return reply(origin, 502, { error: "server" }); }

  try { await sendGiftMail(env, p.email, made.code); }
  catch (err) {
    console.error("gift: mail failed", err && err.message);
    await deleteWhopCode(env, made.id);
    return reply(origin, 502, { error: "send" });
  }

  const country = request.headers.get("CF-IPCountry") || "";
  const rec = { code: made.code, promo_id: made.id, expires_at: expiresAt, percent: GIFT_PERCENT, email: p.email, created_at: new Date().toISOString(), country };
  await env.GIFT_KV.put(key, JSON.stringify(rec));
  await env.GIFT_KV.put("code:" + made.code, JSON.stringify({ expires_at: expiresAt, percent: GIFT_PERCENT }), { expirationTtl: 86400 });
  await env.GIFT_KV.put(ipKey, String(n + 1), { expirationTtl: 172800 });
  ctx.waitUntil(whopLead(env, p.email, country));
  return reply(origin, 200, { sent: true, expires_at: expiresAt, percent: GIFT_PERCENT });
}

async function verify(request, env) {
  const origin = request.headers.get("Origin") || "";
  const body = await readJson(request);
  const code = String(body.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!/^mz[a-z0-9]{6}$/.test(code)) return reply(origin, 400, { error: "code" });
  const rec = await env.GIFT_KV.get("code:" + code, "json");
  if (!rec) return reply(origin, 404, { error: "code" });
  if (Date.parse(rec.expires_at) <= Date.now()) return reply(origin, 410, { error: "expired" });
  return reply(origin, 200, { code, expires_at: rec.expires_at, percent: rec.percent });
}

export default {
  ...base,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/gift" || url.pathname === "/gift/verify") {
      const origin = request.headers.get("Origin") || "";
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
      if (request.method !== "POST") return reply(origin, 405, { error: "method" });
      if (!ORIGIN_OK.test(origin)) return reply(origin, 403, { error: "origin" });
      return url.pathname === "/gift" ? gift(request, env, ctx) : verify(request, env);
    }
    return base.fetch(request, env, ctx);
  },
};
