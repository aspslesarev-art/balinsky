import json,re,sys,urllib.parse,collections
sys.path.insert(0,sys.argv[1]); import bp_parse as P
A=list(sys.argv); P.page=lambda slug: open(A[2]+'/'+__import__('hashlib').md5(slug.encode()).hexdigest()+'.html',encoding='utf-8').read()
allp=json.load(open(A[3])); old={o['slug']:o for o in json.load(open(A[4]))}
def num(x):
    x=float(x); return str(int(x)) if x==int(x) else str(x)
out=[];skip=collections.Counter();chk=collections.Counter()
seen=set()
for o in allp:
    if o['slug'] in seen: continue
    seen.add(o['slug'])
    if o['tag'] not in('Готовое','Переуступка') or not o['price']: continue
    s=o['slug']; us=urllib.parse.unquote(s)
    p=P.parse(s)
    if not p: skip['noparse']+=1; print('noparse',us); continue
    low=us.lower()
    typ=p['typ'] or ('Таунхаус' if 'townhouse' in low else 'Апартамент' if ('apartment' in low or 'studio' in low) else 'Пентхаус' if 'penthouse' in low else 'Вилла')
    if typ=='Коммерция': skip['commercial']+=1; continue
    if not p['price'] or p['price']<10000: skip['noprice']+=1; print('noprice',us,p['price']); continue
    c=p['comment']
    core=re.sub(r'^(z-)?\d+-','',low)
    m=re.search(r'(?<![\d.])(\d)(?:[–-]\d)?-?(?:bedroom|br\b)',core.replace('br-','br '))
    beds = m.group(1) if m else ('1' if 'studio' in low else None)
    if not beds:
        m=re.search(r'Спальн[а-я]*:\s*(\d+)',c) or re.search(r'(\d)-спальн',c); beds=m.group(1) if m else ('1' if typ=='Апартамент' else None)
    data={'Location 2':p['loc'],'Комнаты':beds,'Площадь':num(p['area']),
          'Тип сделки':'Вторичка' if p['tag']=='Готовое' else 'Перепродажа',
          'Статус':'Готово' if p['tag']=='Готовое' else 'Строится'}
    own=re.search(r'Тип владения:\s*([^\n]+)',c); ownl=own.group(1) if own else ''
    lh=re.search(r'Leasehold\s*(?:на\s*|около\s*|~\s*)?(\d+(?:[.,]\d+)?)',ownl or c)
    if lh: data['Leasehold']=lh.group(1).replace(',','.')
    land=re.search(r'Площадь (?:участка|земли)[^:\n]*:\s*(\d[\d\s ]*(?:[.,]\d+)?)\s*(м|ар|are|сот)?',c)
    if land:
        v=float(re.sub(r'[\s ]','',land.group(1)).replace(',','.'))
        if land.group(2) in('ар','are','сот'): v*=100
        if v>=20: data['Земля']=num(v)
    data['Право собственности']='Freehold' if ('Freehold' in ownl and 'Leasehold' not in ownl) or ('freehold' in low and not lh) else 'Leasehold'
    data['Тип объекта']=typ
    if p['tag']=='Переуступка' and p['year']: data['Year of completion']=p['year']
    data['source']='blackpoint'; data['source_url']=P.BASE+us
    data={k:v for k,v in data.items() if v is not None}
    slug='bp-'+re.sub(r'[^a-z0-9-]+','-',low.replace('–','-')).strip('-')
    slug=re.sub(r'-+','-',slug)
    item=dict(slug=slug,kind='apartment' if typ in('Апартамент','Пентхаус') else 'villa',title=p['title'],
        price_usd=int(round(p['price'],-3)) if p['price']>=100000 else int(p['price']),comment=c,data=data,imgs=p['imgs'][:8])
    # keep known slug for existing items
    for k,v in old.items():
        if urllib.parse.unquote(v['data']['source_url'])==data['source_url']:
            item['slug']=k
            for f in ('Комнаты','Leasehold','Земля','Право собственности'):
                if v['data'].get(f)!=data.get(f): chk[f]+=1; print('DIFF',k[:40],f,v['data'].get(f),data.get(f))
    out.append(item)
print('items',len(out),'new',len([i for i in out if i['slug'] not in old]),dict(skip),dict(chk))
print(collections.Counter(len(i['imgs']) for i in out), collections.Counter(i['kind'] for i in out))
dup=collections.Counter(i['slug'] for i in out); print('DUPS',[k for k,v in dup.items() if v>1]); assert not [k for k,v in dup.items() if v>1]
json.dump(out,open(A[5],'w'),ensure_ascii=False,indent=1)
