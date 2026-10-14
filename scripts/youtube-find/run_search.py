import json, os, sys, time
sys.path.insert(0, '.tmp-yt')
from yt_search import search
E=json.load(open('.tmp-yt/entities.json'))
CACHE='.tmp-yt/search-cache.json'
cache=json.load(open(CACHE)) if os.path.exists(CACHE) else {}
HIDDEN={'unit','unit bali','unit bali developer'}
qs=[]
for c in E['complexes']:
    if not c['name']: continue
    qs.append(f'{c["name"]} Bali')
    if c['developer']: qs.append(f'{c["name"]} {c["developer"]}')
for d in E['developers']:
    if d['pub'] is not True or not d['name'] or d['name'].lower().strip(' .') in HIDDEN: continue
    qs.append(f'{d["name"]} Bali')
    qs.append(f'{d["name"]} Bali developer')
qs=list(dict.fromkeys(qs))
todo=[q for q in qs if q not in cache]
print('queries',len(qs),'todo',len(todo),flush=True)
from concurrent.futures import ThreadPoolExecutor
import threading
lock=threading.Lock(); done=[0]
def job(q):
    for attempt in range(3):
        try:
            r=search(q)
            with lock:
                cache[q]=r; done[0]+=1
                if done[0]%50==0:
                    json.dump(cache,open(CACHE,'w')); print(done[0],len(todo),flush=True)
            return
        except Exception as e:
            print('fail',q,str(e)[:60],flush=True); time.sleep(10*(attempt+1))
with ThreadPoolExecutor(4) as ex: list(ex.map(job,todo))
json.dump(cache,open(CACHE,'w')); print('done',len(cache),flush=True)
