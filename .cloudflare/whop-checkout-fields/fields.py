import json,sys
S=sys.argv[1]
m=json.load(open(S+'/plan_map.json'))
shop=json.load(open(S+'/shop_products.json'))
opts={p['id']:[o['name'] for o in p['options']] for p in shop}
allv={v['id']:v for v in json.load(open(S+'/whop_variants.json'))}
ADDR=[("Full Name","e.g. John Doe",True),("Phone Number (with country code)","e.g. +1 234 567 8900",True),("Street Address","e.g. 123 Main St",True),
("Apartment, Suite, etc. (optional)","e.g. Apt 4B",False),("City","e.g. New York",True),("State / Province (leave blank if none)","e.g. NY",False),
("ZIP / Postal Code","e.g. 10001",True),("Country","e.g. United States",True)]
def option_fields(plan):
    v=plan.get('v') or []
    if len(v)<=1 or not plan.get('p'): return []
    names=opts.get(plan['p'],[])
    cols=[]
    for title in [x[1] for x in v]:
        parts=[s.strip() for s in title.split(' / ')]
        for i,pv in enumerate(parts):
            while len(cols)<=i: cols.append([])
            if pv not in cols[i]: cols[i].append(pv)
    ch=[(names[i] if i<len(names) else 'Option %d'%(i+1),vals) for i,vals in enumerate(cols) if len(vals)>1]
    if not ch: return []
    if len(ch)==1:
        base="%s (%s)"%(ch[0][0],", ".join(ch[0][1]))
    else:
        base="%s — %s"%(" / ".join(n for n,_ in ch),"; ".join("%s: %s"%(n,", ".join(vals)) for n,vals in ch))
    ph="e.g. "+" / ".join(vals[0] if len(vals)<3 else vals[min(2,len(vals)-1)] for _,vals in ch)
    q=plan.get('q') or 1
    if q==1: return [(base,ph,True)]
    return [("Item %d: %s"%(i+1,base),ph,True) for i in range(q)]
def build(pid):
    plan=m[pid]
    rows=option_fields(plan)+ADDR
    old={f['name']:f['id'] for f in (allv[pid].get('custom_fields') or [])}
    out=[]
    for i,(name,ph,req) in enumerate(rows):
        f={"field_type":"text","name":name,"order":i,"placeholder":ph,"required":req}
        if name in old: f["id"]=old[name]
        out.append(f)
    return out
if __name__=='__main__':
    res={pid:build(pid) for pid in m}
    json.dump(res,open(S+'/new_fields.json','w'),ensure_ascii=False,indent=1)
    mx=max(len(f['name']) for fs in res.values() for f in fs)
    print('plans:',len(res),'longest name:',mx)
    for pid in ['plan_qH2oFOdS3RLgH']+[k for k,v in m.items() if 'Character Slippers' in v['t']][:2]+[k for k,v in m.items() if 'Cat T-Shirt' in v['t'] and v['q']==2][:1]+[k for k,v in m.items() if v['t'] in ('Morz','Wreath Wood Stud Earrings')]:
        print(pid,m[pid]['t'],'q',m[pid]['q'])
        for f in res[pid][:len(res[pid])-8]: print('    ',f['name'],'|',f['placeholder'])
