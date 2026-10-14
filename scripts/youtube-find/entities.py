import json, urllib.request, urllib.parse
env={}
for line in open('.env.local',encoding='utf8'):
    if '=' in line and not line.startswith('#'):
        k,v=line.rstrip('\n').split('=',1); env[k]=v.strip().strip('"\'')
SB=env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')+'/rest/v1'
H={'apikey':env['SUPABASE_SERVICE_KEY'],'Authorization':'Bearer '+env['SUPABASE_SERVICE_KEY']}
def get(t):
    out=[];s=0
    while True:
        r=json.load(urllib.request.urlopen(urllib.request.Request(f'{SB}/{t}?select=airtable_id,data',headers={**H,'Range':f'{s}-{s+999}'})))
        out+=r
        if len(r)<1000: return out
        s+=1000
def first(v):
    if isinstance(v,list): v=v[0] if v else None
    if isinstance(v,dict): v=v.get('name') or v.get('value')
    return v.strip() if isinstance(v,str) else v
idx={it['id']:it['slug'] for it in json.load(open('.tmp-plot/complexes-index.json'))['items']}
cx=[]
for r in get('raw_complexes'):
    if r['airtable_id'] not in idx: continue
    d=r['data']
    cx.append({'id':r['airtable_id'],'slug':idx[r['airtable_id']],'name':first(d.get('Project')) or first(d.get('1')),'developer':first(d.get('Developer1')) or first(d.get('Developer')),'district':first(d.get('Location 2'))})
dv=[]
for r in get('raw_developers'):
    d=r['data']
    if d.get('Публикация') in (False,None,'Нет'): pass
    dv.append({'id':r['airtable_id'],'slug':first(d.get('SEO:Slug')),'name':first(d.get('Developer')),'pub':d.get('Публикация')})
json.dump({'complexes':cx,'developers':dv},open('.tmp-yt/entities.json','w'),ensure_ascii=False,indent=0)
print(len(cx),len(dv)); print(cx[:3]); print(dv[:3])
import collections; print(collections.Counter(str(x['pub']) for x in dv))
