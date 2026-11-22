// Local test: node test/run.mjs  (mocks Whop + Shopify, no network)
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const dir = path.dirname(new URL(import.meta.url).pathname);
const src = fs.readFileSync(path.join(dir, '../src/worker.js'), 'utf8')
  .replace("import PLAN_MAP from './plan-map.json';", "import PLAN_MAP from '../src/plan-map.json' with { type: 'json' };");
fs.writeFileSync(path.join(dir, '.worker.mjs'), src);
const { default: worker } = await import('./.worker.mjs');
const map = JSON.parse(fs.readFileSync(path.join(dir, '../src/plan-map.json')));
const gloves4 = Object.entries(map).find(([, v]) => /Gloves.*4x/.test(v.t))[0];
const single = Object.entries(map).find(([, v]) => v.q === 1 && v.v.length === 1)[0];

let created = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.includes('api.whop.com/api/v1/memberships/')) {
    const isG = url.endsWith('mem_g');
    return new Response(JSON.stringify({ custom_field_responses: [
      ...(isG ? [{ question: 'Color (Red, Pink, Green, Blue, Black) for each of the 4 items', answer: '1) Red, 2) pink 3) Red, 4) Black' }] : []),
      { question: 'Full Name', answer: 'John Q Doe' }, { question: 'Phone Number (with country code)', answer: '+1 234 567 8900' },
      { question: 'Street Address', answer: '123 Main St' }, { question: 'Apartment, Suite, etc. (optional)', answer: '' },
      { question: 'City', answer: 'New York' }, { question: 'State / Province (leave blank if none)', answer: 'new york' },
      { question: 'ZIP / Postal Code', answer: '10001' }, { question: 'Country', answer: 'USA' } ] }));
  }
  if (url.includes('/graphql.json')) {
    const b = JSON.parse(init.body);
    if (b.query.includes('orders(')) return new Response(JSON.stringify({ data: { orders: { nodes: created.some(o => o.tags.includes(b.variables.q.slice(4))) ? [{ id: 'x', name: '#dup' }] : [] } } }));
    created.push(b.variables.order);
    return new Response(JSON.stringify({ data: { orderCreate: { order: { id: 'gid://shopify/Order/1', name: '#100' + created.length }, userErrors: [] } } }));
  }
  throw new Error('unexpected fetch ' + url);
};
const env = { WHOP_WEBHOOK_SECRET: 'ws_' + Buffer.from('testsecret').toString('base64'), WHOP_API_KEY: 'k', SHOPIFY_SHOP: 'fr81ag-tb.myshopify.com', SHOPIFY_ADMIN_TOKEN: 't' };
async function send(payment, secretKey) {
  const body = JSON.stringify({ type: 'payment.succeeded', data: payment });
  const id = 'msg_1', ts = String(Math.floor(Date.now() / 1000));
  const sig = crypto.createHmac('sha256', secretKey).update(`${id}.${ts}.${body}`).digest('base64');
  const r = await worker.fetch(new Request('https://x/webhook', { method: 'POST', body, headers: { 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': 'v1,' + sig } }), env);
  return [r.status, await r.text()];
}
const decoded = Buffer.from('testsecret');
console.log('bad sig  ', await send({ id: 'pay_x' }, 'wrong'));
console.log('gloves 4x', await send({ id: 'pay_g', variant_id: gloves4, membership_id: 'mem_g', total: { amount: '37.99', currency: 'usd' }, customer_email: 'a@b.c' }, decoded));
console.log('single   ', await send({ id: 'pay_s', variant_id: single, membership_id: 'mem_s', total: { amount: '15.99', currency: 'usd' } }, env.WHOP_WEBHOOK_SECRET));
console.log('duplicate', await send({ id: 'pay_s', variant_id: single, membership_id: 'mem_s', total: { amount: '15.99', currency: 'usd' } }, decoded));
console.log(JSON.stringify(created[0], null, 1));
console.log('gloves variants:', map[gloves4].v.map(v => v[1]).join(' | '));
fs.unlinkSync(path.join(dir, '.worker.mjs'));
