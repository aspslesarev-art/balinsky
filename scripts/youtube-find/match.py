import json, re, unicodedata
E=json.load(open('.tmp-yt/entities.json'))
cache=json.load(open('.tmp-yt/search-cache.json'))
known=set(json.load(open('lib/youtube-lang.json')).keys())
GENERIC={'villa','villas','vila','apartments','apartment','apart','residence','residences','resort','complex','hotel','hotels','the','by','bali','estate','homes','house','houses','project','development','developer','developers','group','properties','property','realty','living','life','suites','suite','ii','iii','iv','i','2','3','1','phase','stage','club','boutique','condo','condotel','townhouse','townhouses','loft','lofts','new','at','and','in','of','pt','indonesia','company','co','construction','build'}
def norm(s):
    s=unicodedata.normalize('NFKD',s or '').encode('ascii','ignore').decode().lower() if s and s.isascii() is False and False else (s or '').lower()
    s=unicodedata.normalize('NFKD',s); s=''.join(ch for ch in s if not unicodedata.combining(ch))
    return ' '+re.sub(r'[^a-zа-яё0-9]+',' ',s).strip()+' '
def core(name):
    toks=norm(name).split()
    sig=[t for t in toks if t not in GENERIC]
    return toks, sig
PLACES=['bali','бали','canggu','чангу','ubud','убуд','uluwatu','улувату','seminyak','семиньяк','pererenan','переренан','berawa','берава','sanur','санур','nusa dua','нуса дуа','jimbaran','джимбаран','pandawa','пандава','melasti','меласти','bingin','бингин','tabanan','табанан','kedungu','кедунгу','umalas','умалас','seseh','сесех','cemagi','чемаги','tegallalang','amed','lovina','denpasar','kuta','legian','balangan','ungasan','nyanyi','tumbak bayuh','padang','mengwi','canguu']
def ctx(text,extra=()):
    return any(f' {p} ' in text or p in text for p in PLACES) or any(e and e in text for e in extra)
def phrase_in(ph,text):
    return ph.strip() and f' {ph.strip()} ' in text
dev_by_name={}
for d in E['developers']:
    if d['pub'] is True and d['name']: dev_by_name[norm(d['name']).strip()]=d
res={}
def add(vid,v,kind,ent,why):
    r=res.setdefault(vid,{'video':v,'complexes':{},'developers':{}})
    r['complexes' if kind=='c' else 'developers'][ent['slug']]={'name':ent['name'],'why':why}
for c in E['complexes']:
    if not c['name']: continue
    toks,sig=core(c['name'])
    full=' '.join(toks); coreph=' '.join(t for t in toks if t not in {'villa','villas','apartments','apartment','residence','residences','resort','complex','by','bali'})
    devn=norm(c['developer']).strip() if c['developer'] else ''
    devcore=' '.join(t for t in devn.split() if t not in GENERIC)
    for q in [f'{c["name"]} Bali', f'{c["name"]} {c["developer"]}']:
        for v in cache.get(q,[]):
            if v['id'] in known: continue
            T=norm(v['title']); D=norm(v['desc']); C=norm(v['channel']); ALL=T+D+C
            hit = phrase_in(full,T+D) or (len(coreph.split())>=1 and len(coreph)>=5 and phrase_in(coreph,T+D))
            if not hit: continue
            weak = len(sig)<=1 and len(''.join(sig))<8
            devhit = bool(devcore) and len(devcore)>=3 and devcore in ALL
            if weak and not devhit: continue
            if not (ctx(ALL) or devhit): continue
            add(v['id'],v,'c',c,'dev' if devhit else 'ctx')
for d in E['developers']:
    if d['pub'] is not True or not d['name']: continue
    dn=norm(d['name']).strip(); dcore=' '.join(t for t in dn.split() if t not in GENERIC)
    if len(dcore)<4: dcore=dn
    for q in [f'{d["name"]} Bali', f'{d["name"]} Bali developer']:
        for v in cache.get(q,[]):
            if v['id'] in known: continue
            T=norm(v['title']); D=norm(v['desc']); C=norm(v['channel'])
            if not (phrase_in(dcore,T+D+C)): continue
            if not ctx(T+D+C): continue
            add(v['id'],v,'d',d,'ch' if phrase_in(dcore,C) else 'txt')
json.dump(res,open('.tmp-yt/candidates.json','w'),ensure_ascii=False,indent=0)
print('candidate videos',len(res),'complexes covered',len({s for r in res.values() for s in r['complexes']}),'developers covered',len({s for r in res.values() for s in r['developers']}))
