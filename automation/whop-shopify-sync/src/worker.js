/**
 * Whop -> Shopify order sync (Cloudflare Worker).
 *
 * When a buyer pays on a Whop checkout, Whop sends `payment.succeeded` to POST /webhook.
 * This worker:
 *   1. verifies the Whop webhook signature (Standard Webhooks),
 *   2. reads the buyer's checkout answers (name, phone, address, colour/size) from the membership,
 *   3. creates a PAID order in Shopify with the right product, variant, quantity and shipping address.
 * The dropshipping apps (DSers, DropSure, Dropshipper-ai) then see a normal paid Shopify order and
 * place it with the supplier (turn on "auto order" in each app).
 *
 * Orders the worker could not fully understand get the tag `whop-needs-review` and a note.
 *
 * Secrets (set with `wrangler secret put NAME`):
 *   WHOP_API_KEY           Whop company API key (scopes: member:basic:read, member:email:read, payment:basic:read)
 *   WHOP_WEBHOOK_SECRET    the `webhook_secret` Whop returns when the webhook is created
 *   SHOPIFY_CLIENT_ID      } Dev Dashboard app (client credentials grant)
 *   SHOPIFY_CLIENT_SECRET  }
 *   or SHOPIFY_ADMIN_TOKEN  an Admin API access token (shpat_...) instead of the two above
 * Vars (wrangler.toml): SHOPIFY_SHOP (xxxx.myshopify.com)
 */
import PLAN_MAP from './plan-map.json';

const SHOPIFY_API_VERSION = '2025-10';
const REVIEW_TAG = 'whop-needs-review';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') return new Response('whop-shopify-sync ok');
    if (request.method !== 'POST' || url.pathname !== '/webhook') return new Response('not found', { status: 404 });

    const raw = await request.text();
    if (!(await verifySignature(request.headers, raw, env.WHOP_WEBHOOK_SECRET))) {
      return new Response('bad signature', { status: 401 });
    }
    let event;
    try { event = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }
    if (event.type !== 'payment.succeeded') return new Response('ignored ' + event.type);
    // Whop "send test event" uses placeholder ids like pay_xxxxxxxxxxxxxx: never turn those into orders
    if (!event.data || !event.data.id || /x{8,}$/.test(event.data.id)) return new Response('ignored test event');

    try {
      const result = await handlePayment(event.data, env);
      return Response.json(result);
    } catch (err) {
      console.error('sync failed', err && err.stack || err);
      // 500 -> Whop retries the webhook later
      return new Response('error: ' + (err && err.message || err), { status: 500 });
    }
  },
};

/* ------------------------------------------------------------------ signature */

async function verifySignature(headers, body, secret) {
  if (!secret) return false;
  const id = headers.get('webhook-id'), ts = headers.get('webhook-timestamp'), sigHeader = headers.get('webhook-signature');
  if (!id || !ts || !sigHeader) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const signed = new TextEncoder().encode(`${id}.${ts}.${body}`);
  const given = sigHeader.split(' ').map((s) => s.split(',')[1]).filter(Boolean);
  // Whop secrets are documented as `ws_...`; Standard Webhooks libraries base64-decode the part
  // after the prefix. Accept either key form so both conventions work.
  const after = secret.includes('_') ? secret.slice(secret.indexOf('_') + 1) : secret;
  const keys = [new TextEncoder().encode(secret), new TextEncoder().encode(after)];
  try { keys.push(Uint8Array.from(atob(after), (c) => c.charCodeAt(0))); } catch { /* not base64 */ }
  for (const k of keys) {
    const key = await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, signed))));
    if (given.some((g) => safeEqual(g, mac))) return true;
  }
  return false;
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ------------------------------------------------------------------ main flow */

async function handlePayment(payment, env) {
  const tag = 'whop_' + payment.id;
  const existing = await shopify(env, `query($q:String!){ orders(first:1, query:$q){ nodes{ id name } } }`, { q: `tag:${tag}` });
  if (existing.orders.nodes.length) return { skipped: 'already synced', order: existing.orders.nodes[0].name };

  const answers = await getAnswers(payment, env);
  const review = [];
  const contact = readContact(answers, payment, review);

  const planId = payment.variant_id || payment.plan_id || (payment.line_items && payment.line_items[0] && payment.line_items[0].variant_id) || (payment.plan && payment.plan.id);
  const plan = PLAN_MAP[planId];
  const total = money(payment.total || payment.amount_charged || payment.subtotal);
  const currency = ((payment.total && payment.total.currency) || payment.currency || 'usd').toUpperCase();

  let lines;
  if (!plan || !plan.p) {
    review.push(`Whop plan ${planId} is not linked to a Shopify product`);
    lines = [{ title: (plan && plan.t) || (payment.product && payment.product.title) || 'Whop order', quantity: (plan && plan.q) || 1 }];
  } else {
    lines = pickVariants(plan, answers, review).map((l) => ({ variantId: l.id, quantity: l.qty }));
  }

  const qtyTotal = lines.reduce((s, l) => s + l.quantity, 0);
  const unit = Math.round((total / qtyTotal) * 100) / 100;
  const charged = Math.round(unit * qtyTotal * 100) / 100;
  for (const l of lines) l.priceSet = { shopMoney: { amount: unit.toFixed(2), currencyCode: currency } };

  const noteLines = [
    `Paid on Whop: ${payment.id}${payment.membership_id ? ' / ' + payment.membership_id : ''}`,
    `Whop product: ${(plan && plan.t) || planId}`,
    ...answers.map((a) => `${a.question}: ${a.answer}`),
  ];
  if (review.length) noteLines.unshift('NEEDS REVIEW: ' + review.join('; '));

  const order = {
    email: payment.customer_email || (payment.user && payment.user.email) || undefined,
    phone: contact.phone || undefined,
    currency,
    financialStatus: 'PAID',
    lineItems: lines,
    shippingAddress: contact.address,
    billingAddress: contact.address,
    transactions: [{ kind: 'SALE', status: 'SUCCESS', gateway: 'Whop', amountSet: { shopMoney: { amount: charged.toFixed(2), currencyCode: currency } } }],
    tags: ['whop', tag, ...(review.length ? [REVIEW_TAG] : [])],
    note: noteLines.join('\n'),
    sourceName: 'whop',
    sourceIdentifier: payment.id,
  };
  if (order.email === undefined) delete order.email;
  if (order.phone === undefined) delete order.phone;

  let created;
  try {
    created = await createOrder(env, order);
  } catch (err) {
    // Most likely an address Shopify rejects (unknown province/country). Retry without it and flag.
    if (!/address|province|country|zip/i.test(String(err.message))) throw err;
    order.shippingAddress = { firstName: contact.address.firstName, lastName: contact.address.lastName, phone: contact.address.phone };
    delete order.billingAddress;
    order.tags = [...new Set([...order.tags, REVIEW_TAG])];
    order.note = `NEEDS REVIEW: Shopify rejected the address (${err.message}). Copy it from below.\n` + order.note;
    created = await createOrder(env, order);
  }
  return { created: created.name, id: created.id, review };
}

async function createOrder(env, order) {
  const data = await shopify(env, `mutation($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
      orderCreate(order: $order, options: $options) { order { id name } userErrors { field message } } }`,
    { order, options: { inventoryBehaviour: 'BYPASS', sendReceipt: false, sendFulfillmentReceipt: true } });
  const errs = data.orderCreate.userErrors;
  if (errs && errs.length) throw new Error(errs.map((e) => `${(e.field || []).join('.')}: ${e.message}`).join('; '));
  return data.orderCreate.order;
}

/* ------------------------------------------------------------------ Whop answers */

async function getAnswers(payment, env) {
  let list = payment.custom_field_responses;
  if (!list && payment.membership_id) {
    const r = await fetch(`https://api.whop.com/api/v1/memberships/${payment.membership_id}`, {
      headers: { Authorization: `Bearer ${env.WHOP_API_KEY}` },
    });
    if (!r.ok) throw new Error(`Whop membership ${payment.membership_id}: HTTP ${r.status}`);
    const m = await r.json();
    list = m.custom_field_responses;
  }
  return (list || []).map((a) => ({ question: String(a.question || a.name || ''), answer: String(a.answer ?? a.response ?? '').trim() }));
}

const ADDRESS_Q = /^(full name|phone|street|apartment|city|state|zip|country)/i;
const find = (answers, re) => (answers.find((a) => re.test(a.question)) || {}).answer || '';

function readContact(answers, payment, review) {
  let name = find(answers, /^full name/i), phone = find(answers, /^phone/i);
  let a1 = find(answers, /^street/i), a2 = find(answers, /^apartment/i), city = find(answers, /^city/i);
  let state = find(answers, /^state/i), zip = find(answers, /^zip/i), country = find(answers, /^country/i);

  // Fallbacks: Whop's own shipping address, then the old single-line fields (orders placed before the split).
  const sa = payment.shipping_address || payment.billing_address;
  if (!a1 && sa) {
    name = name || sa.name || ''; a1 = sa.line1 || sa.address1 || ''; a2 = a2 || sa.line2 || sa.address2 || '';
    city = sa.city || ''; state = sa.state || sa.province || ''; zip = sa.postal_code || sa.zip || ''; country = sa.country || '';
  }
  if (!a1) {
    const old = find(answers, /^full shipping address/i), np = find(answers, /^full name & phone/i);
    if (old) { a1 = old; review.push('address is one line; check city/zip/country'); }
    if (np && !name) {
      const m = np.match(/^(.*?)[,;]?\s*(\+?[\d\s().-]{6,})$/);
      name = m ? m[1].trim() : np; phone = phone || (m ? m[2].trim() : '');
    }
  }
  if (!name && payment.user && payment.user.name) name = payment.user.name;

  const parts = name.trim().split(/\s+/);
  const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || '';
  const lastName = parts.length > 1 ? parts[parts.length - 1] : (parts[0] || '-');
  const countryCode = toCountryCode(country);
  if (country && !countryCode) review.push(`unknown country "${country}"`);
  const address = { firstName, lastName, address1: a1, address2: a2 || undefined, city, zip, phone: phone || undefined };
  if (countryCode) address.countryCode = countryCode;
  const prov = toProvinceCode(countryCode, state);
  if (prov) address.provinceCode = prov;
  for (const k of Object.keys(address)) if (address[k] === undefined || address[k] === '') delete address[k];
  if (!a1 || !city || !countryCode) review.push('incomplete address');
  return { address, phone };
}

/* ------------------------------------------------------------------ variants */

function pickVariants(plan, answers, review) {
  const variants = plan.v;
  if (variants.length <= 1) return [{ id: variants[0] && variants[0][0], qty: plan.q }].filter((l) => l.id);

  const optionText = answers.filter((a) => !ADDRESS_Q.test(a.question) && !/^full shipping address/i.test(a.question))
    .map((a) => a.answer).join(' ; ');
  // "1) Red, 2) Blue" / "Red, Blue" / "Red L; Blue M" -> one segment per item
  let segs = optionText.split(/\s*(?:\d+\s*[).:-]\s*|[;\n]|,(?=\s*\d+\s*[).:-]))\s*/).map((s) => s.trim()).filter(Boolean);
  if (plan.q > 1 && segs.length < plan.q && optionText.includes(',')) {
    const c = optionText.split(',').map((s) => s.trim()).filter(Boolean);
    if (c.length >= plan.q) segs = c;
  }
  if (!segs.length) segs = [optionText];

  const chosen = [];
  for (let i = 0; i < plan.q; i++) {
    const seg = segs[Math.min(i, segs.length - 1)];
    const v = bestVariant(variants, seg);
    if (!v) { review.push(`could not match variant for "${seg || '(no answer)'}"`); chosen.push(variants[0][0]); }
    else chosen.push(v);
  }
  const counts = new Map();
  for (const id of chosen) counts.set(id, (counts.get(id) || 0) + 1);
  return [...counts].map(([id, qty]) => ({ id, qty }));
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const SIZE_ALIAS = { '2xl': 'xxl', '3xl': 'xxxl', 'extra large': 'xl', large: 'l', medium: 'm', small: 's' };

function bestVariant(variants, text) {
  let t = ' ' + norm(text) + ' ';
  for (const [a, b] of Object.entries(SIZE_ALIAS)) t = t.replace(new RegExp(' ' + a + ' ', 'g'), ' ' + b + ' ');
  let best = null, bestScore = 0;
  for (const [id, title] of variants) {
    const opts = String(title).split('/').map(norm).filter(Boolean);
    let score = 0;
    for (const o of opts) {
      let oo = o; for (const [a, b] of Object.entries(SIZE_ALIAS)) if (oo === a) oo = b;
      if (t.includes(' ' + oo + ' ')) score += 1 + oo.length / 100;
    }
    const full = score >= opts.length;   // every option of this variant was mentioned
    const s = full ? score + 10 : score;
    if (s > bestScore) { bestScore = s; best = id; }
  }
  return bestScore > 0 ? best : null;
}

/* ------------------------------------------------------------------ Shopify */

let cachedToken = null;
async function shopifyToken(env) {
  if (env.SHOPIFY_ADMIN_TOKEN) return env.SHOPIFY_ADMIN_TOKEN;
  if (cachedToken && cachedToken.exp > Date.now() + 60000) return cachedToken.token;
  const r = await fetch(`https://${env.SHOPIFY_SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET }),
  });
  if (!r.ok) throw new Error(`Shopify token: HTTP ${r.status} ${await r.text()}`);
  const j = await r.json();
  cachedToken = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return cachedToken.token;
}

async function shopify(env, query, variables) {
  const r = await fetch(`https://${env.SHOPIFY_SHOP}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': await shopifyToken(env) },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`Shopify HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  if (j.errors) throw new Error('Shopify: ' + JSON.stringify(j.errors).slice(0, 300));
  return j.data;
}

/* ------------------------------------------------------------------ helpers */

function money(m) {
  if (m == null) return 0;
  if (typeof m === 'number') return m;
  if (typeof m === 'string') return parseFloat(m) || 0;
  return parseFloat(m.amount) || 0;
}

const ISO = 'AD AE AF AG AI AL AM AO AR AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IS IT JE JM JO JP KE KG KH KI KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PS PT PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');
const COUNTRY_ALIAS = { usa: 'US', us: 'US', america: 'US', 'united states of america': 'US', uk: 'GB', england: 'GB', scotland: 'GB', wales: 'GB', 'great britain': 'GB', 'south korea': 'KR', korea: 'KR', russia: 'RU', uae: 'AE', holland: 'NL', 'czech republic': 'CZ', 'ivory coast': 'CI' };
let countryIndex = null;
function toCountryCode(s) {
  const n = norm(s);
  if (!n) return null;
  if (COUNTRY_ALIAS[n]) return COUNTRY_ALIAS[n];
  if (/^[a-z]{2}$/.test(n) && ISO.includes(n.toUpperCase())) return n.toUpperCase();
  if (!countryIndex) {
    countryIndex = {};
    const dn = new Intl.DisplayNames(['en'], { type: 'region' });
    for (const c of ISO) countryIndex[norm(dn.of(c))] = c;
  }
  if (countryIndex[n]) return countryIndex[n];
  for (const [name, c] of Object.entries(countryIndex)) if (name.length > 3 && (n.includes(name) || name.includes(n))) return c;
  return null;
}

const US_STATES = { alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'puerto rico': 'PR' };
const CA_PROV = { alberta: 'AB', 'british columbia': 'BC', manitoba: 'MB', 'new brunswick': 'NB', 'newfoundland and labrador': 'NL', newfoundland: 'NL', 'nova scotia': 'NS', ontario: 'ON', 'prince edward island': 'PE', quebec: 'QC', saskatchewan: 'SK', 'northwest territories': 'NT', nunavut: 'NU', yukon: 'YT' };
const AU_STATES = { 'new south wales': 'NSW', victoria: 'VIC', queensland: 'QLD', 'western australia': 'WA', 'south australia': 'SA', tasmania: 'TAS', 'australian capital territory': 'ACT', 'northern territory': 'NT' };
function toProvinceCode(cc, s) {
  const n = norm(s);
  if (!n) return null;
  const table = cc === 'US' ? US_STATES : cc === 'CA' ? CA_PROV : cc === 'AU' ? AU_STATES : null;
  if (!table) return String(s).trim();
  if (table[n]) return table[n];
  const up = n.toUpperCase();
  if (Object.values(table).includes(up)) return up;
  return String(s).trim();
}

// exported for tests
export const _test = { pickVariants, bestVariant, readContact, toCountryCode, toProvinceCode, verifySignature, handlePayment };
