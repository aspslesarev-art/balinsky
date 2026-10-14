import json, sys, time, re, urllib.request, datetime
sys.path.insert(0,'scripts')
APPLY='--apply' in sys.argv
exec(open('scripts/youtube-languages.py').read().split("def main():")[0])  # env, fetch, spoken_language, STORAGE
E=json.load(open('.tmp-yt/entities.json'))
cname={c['slug']:c['name'] for c in E['complexes']}
dname={d['slug']:d['name'] for d in E['developers']}
rows=[]; verd=[]
for j in range(5):
    rows+=json.load(open(f'.tmp-yt/chunk{j}.json')); verd+=json.load(open(f'.tmp-yt/verdict{j}.json'))
assert len(rows)==len(verd)
info={r['id']:r for r in rows}
acc={}
for r,v in zip(rows,verd):
    assert r['id']==v['id'] and r['slug']==v['slug']
    if not v['ok']: continue
    a=acc.setdefault(r['id'],{'c':[],'d':[]})
    a[r['kind']].append(r['slug'])
print('accepted videos',len(acc),'complex links',sum(len(a['c']) for a in acc.values()),'developer links',sum(len(a['d']) for a in acc.values()))
LCACHE='.tmp-yt/lang.json'
lang=json.load(open(LCACHE)) if __import__('os').path.exists(LCACHE) else {}
for vid in acc:
    if vid in lang: continue
    try: lang[vid]=spoken_language(vid)
    except Exception as e: print('lang fail',vid,e)
    time.sleep(0.5)
json.dump(lang,open(LCACHE,'w'))
SITE={'ru','en','id','fr','de','zh','nl','pl','uk'}
CYR=re.compile(r'[А-Яа-яЁёІіЇїЄє]')
def tags(vid,title):
    l=lang.get(vid)
    if l=='ru': return ['ru']
    if l=='uk': return ['uk','ru']
    if l in (None,'none','en'): return ['ru','uk'] if CYR.search(title) else []
    if l=='in': l='id'
    return [l] if l in SITE else ([] if not CYR.search(title) else ['ru','uk'])
url=f'{STORAGE}/feeds/_videos.json'
man=json.loads(fetch(url+f'?t={int(time.time())}'))
existing={m.group(1) for it in man['items'] for m in [re.search(r'(?:youtu\.be/|v=|shorts/|embed/)([\w-]{11})',it.get('url',''))] if m}
today=datetime.date.today().isoformat(); new=[]
for vid,a in acc.items():
    if vid in existing: continue
    t=info[vid]['title']
    new.append({'id':'yt_'+vid,'name':t,'url':f'https://www.youtube.com/watch?v={vid}','addedAt':today,'embedUrl':'',
        'languages':tags(vid,t),
        'complexes':[{'name':cname[s],'slug':s} for s in dict.fromkeys(a['c'])],
        'developers':[{'name':dname[s],'slug':s} for s in dict.fromkeys(a['d'])]})
import collections
print('new items',len(new),'lang',collections.Counter(lang.get(n['id'][3:]) for n in new),'tags',collections.Counter(tuple(n['languages']) for n in new))
json.dump(man,open('.tmp-yt/videos-backup.json','w'),ensure_ascii=False)
if APPLY and new:
    items=man['items']+new
    body=json.dumps({'generatedAt':datetime.datetime.utcnow().isoformat()+'Z','count':len(items),'items':items},ensure_ascii=False).encode()
    sb=env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
    req=urllib.request.Request(f'{sb}/storage/v1/object/feeds/_videos.json',data=body,method='POST',headers={'apikey':env['SUPABASE_SERVICE_KEY'],'Authorization':'Bearer '+env['SUPABASE_SERVICE_KEY'],'Content-Type':'application/json','x-upsert':'true','cache-control':'max-age=60'})
    print(urllib.request.urlopen(req).read()[:200]); print('written',len(items))
