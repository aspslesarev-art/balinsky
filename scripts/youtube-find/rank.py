import json, re
sys_path='.tmp-yt'
exec(open('.tmp-yt/match.py').read().split("res={}")[0])  # reuse norm, E
cand=json.load(open('.tmp-yt/candidates.json'))
def age_days(p):
    if not p: return 9999
    m=re.match(r'(\d+)\s*(second|minute|hour|day|week|month|mo|year|y)',p.replace('Streamed ',''))
    if not m: return 9999
    n=int(m.group(1)); u=m.group(2)
    return n*{'second':0,'minute':0,'hour':0,'day':1,'week':7,'month':30,'mo':30,'year':365,'y':365}[u]
PROG=re.compile(r'progress|construction update|отч[её]т|ход строител|ход будів|прогресс|update|апдейт|progres|perkembangan',re.I)
OVER=re.compile(r'tour|обзор|огляд|review|presentation|презентац|walkthrough|show unit|интервью|interview|разбор|экскурси',re.I)
devname={c['slug']:(c.get('developer') or '') for c in E['complexes']}
per={}
for vid,x in cand.items():
    v=x['video']
    for kind in ('complexes','developers'):
        for slug,info in x[kind].items():
            C=norm(v['channel']); T=norm(v['title'])
            nm=norm(info['name']).strip()
            dv=norm(devname.get(slug,'') if kind=='complexes' else info['name']).strip()
            official = (dv and dv in C) or (nm and nm in C)
            s=(3 if official else 0)+(2 if nm and nm in T else 0)+(1 if OVER.search(v['title']) else 0)
            per.setdefault((kind,slug),[]).append({'id':vid,'score':s,'age':age_days(v['published']),'prog':bool(PROG.search(v['title'])),'v':v,'name':info['name']})
keep={}
for (kind,slug),lst in per.items():
    lst.sort(key=lambda r:(-r['score'],r['age']))
    cap=6 if kind=='complexes' else 8
    out=[];prog=0
    for r in lst:
        if r['prog']:
            if prog>=2: continue
            prog+=1
        out.append(r)
        if len(out)>=cap: break
    keep[(kind,slug)]=out
rows=[]
for (kind,slug),lst in sorted(keep.items()):
    for r in lst:
        v=r['v']; rows.append({'kind':kind[0],'slug':slug,'name':r['name'],'id':r['id'],'title':v['title'],'channel':v['channel'],'pub':v['published'],'len':v['length'],'desc':v['desc'][:120]})
json.dump(rows,open('.tmp-yt/review.json','w'),ensure_ascii=False,indent=0)
print('rows',len(rows),'unique videos',len({r['id'] for r in rows}),'entities',len(keep))
