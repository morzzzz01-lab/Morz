"""Build src/plan-map.json: Whop plan id -> Shopify product, variants and quantity.
Usage: python3 build_plan_map.py <whop_plans.json> <shopify_products.json> <out.json>
whop_plans.json    = list of plan objects from GET /api/v1/plans?account_id=...
shopify_products.json = {"data":{"products":{"nodes":[{id,title,descriptionHtml,variants{nodes{id,title}}}]}}}
A plan is linked to the Shopify product whose description contains its checkout link."""
import json, re, sys
plans = json.load(open(sys.argv[1]))
prods = json.load(open(sys.argv[2]))['data']['products']['nodes']
by_plan = {}
for p in prods:
    for pid in dict.fromkeys(re.findall(r'plan_[A-Za-z0-9]{10,}', p['descriptionHtml'])):
        by_plan[pid] = p
out = {}
for pl in plans:
    title = pl['product']['title']
    m = re.search(r'(\d+)\s*x\b', title, re.I) if re.search(r'bundle', title, re.I) else None
    qty = int(m.group(1)) if m else 1
    sp = by_plan.get(pl['id'])
    out[pl['id']] = {
        't': title, 'q': qty,
        'p': sp['id'] if sp else None,
        'v': [[v['id'], v['title']] for v in sp['variants']['nodes']] if sp else [],
    }
# manual links for plans whose checkout link is not in a product description
import os
ov_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'plan-overrides.json')
if os.path.exists(ov_path):
    by_id = {p['id']: p for p in prods}
    for pid, ov in json.load(open(ov_path)).items():
        if pid.startswith('_') or pid not in out or ov['p'] not in by_id: continue
        vs = [[v['id'], v['title']] for v in by_id[ov['p']]['variants']['nodes']]
        if 'only' in ov: vs = [x for x in vs if x[1] in ov['only']]
        out[pid].update(p=ov['p'], q=ov['q'], v=vs)
json.dump(out, open(sys.argv[3], 'w'), indent=0, ensure_ascii=False)
print(len(out), 'plans;', sum(1 for v in out.values() if v['p']), 'linked to Shopify products')
