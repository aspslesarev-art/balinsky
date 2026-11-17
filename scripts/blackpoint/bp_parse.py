import re,json,html as H,hashlib,urllib.parse,sys
BASE='https://www.blackpoint.group/ru/marketplace/'
def page(slug): return open(sys.argv[1]+'/'+hashlib.md5(slug.encode()).hexdigest()+'.html',encoding='utf-8').read()
def rt(node):
    if isinstance(node,list):
        if node and node[0]==5: return node[1]
        if node and node[0]==4:
            tag=node[1]; kids=node[3:]
            if tag=='br': return '\n'
            inner=''.join(rt(k) for k in kids)
            if tag in('p','h1','h2','h3','h4','h5','h6'): return '\x00'+inner+'\x00'
            if tag=='li': return '\x01'+inner
            return inner
        return ''.join(rt(k) for k in node)
    return ''
def richtext(s):
    t=rt(json.loads(s))
    parts=[p.strip() for p in re.split(r'\x00+',t)]
    parts=[p for p in parts if p and not re.match(r'(Локация|Типы юнитов):',p)]
    txt='\n\n'.join(parts).replace('\x01','\n').strip()
    return re.sub(r'\n{3,}','\n\n',txt)
def parse(slug):
    t=page(slug)
    m=re.search(r'"(Готовое|Переуступка)",\{"type":\d+,"value":\d+\},"[^"]+",\{"type":\d+,"value":\d+\},(?:"number",)?([\d.]+),\{"type":\d+,"value":\d+\},([\d.]+)',t)
    if not m: return None
    tag,area,price=m.group(1),m.group(2),float(m.group(3))
    after=t[m.end():m.end()+800]
    y=re.search(r'(?:"boolean",)?(?:true|false),\{"type":\d+,"value":\d+\},(\d{4})',after)
    r=re.search(r'"(\[1,\[(?:[^"\\]|\\.)*)"',t[m.end():m.end()+80000])
    comment=richtext(json.loads('"'+r.group(1)+'"')) if r else ''
    before=t[max(0,m.start()-60000):m.start()]
    # main gallery = image src list contiguous before the record
    imgs=[]
    for u in re.findall(r'"(https://framerusercontent\.com/images/[A-Za-z0-9]+\.(?:jpg|jpeg|png|webp))\?[^"]*"',before):
        # rv36ey… — иконка чата с их сайта, не фото объекта
        if u not in imgs and 'rv36eytZWWfc0DEEuTBakqJ9Qo' not in u: imgs.append(u)
    clean=re.sub(r'<script.*?</script>|<style.*?</style>','',t,flags=re.S)
    L=[l.strip() for l in H.unescape(re.sub(r'<[^>]+>','\n',clean)).split('\n') if l.strip() and l.strip()!='\')">']
    i=L.index('Локация'); title=L[i-1]; loc=L[i+1]
    typ=next((x for x in L[i:i+12] if x in('Вилла','Апартамент','Таунхаус','Пентхаус','Коммерция')),'')
    return dict(tag=tag,area=area,price=price,year=y.group(1) if y else None,comment=comment,imgs=imgs,title=title,loc=loc,typ=typ)
if __name__=='__main__':
    old=json.load(open(sys.argv[2]))
    bad=0
    for o in old:
        s=urllib.parse.unquote(o['data']['source_url'].rsplit('/',1)[1])
        # slug in ru.txt is percent-encoded form; try both
        p=None
        for cand in (s, urllib.parse.quote(s,safe='-.()')):
            try: p=parse(cand); break
            except FileNotFoundError: pass
        if not p: print('NOPARSE',s); bad+=1; continue
        diffs=[]
        if p['price']!=o['price_usd']: diffs.append(('price',p['price'],o['price_usd']))
        if p['area']!=o['data']['Площадь']: diffs.append(('area',p['area'],o['data']['Площадь']))
        if p['title']!=o['title']: diffs.append(('title',p['title'],o['title']))
        if p['loc']!=o['data']['Location 2']: diffs.append(('loc',p['loc'],o['data']['Location 2']))
        if p['typ']!=o['data']['Тип объекта']: diffs.append(('typ',p['typ'],o['data']['Тип объекта']))
        if p['year']!=o['data'].get('Year of completion') and o['data'].get('Year of completion'): diffs.append(('year',p['year'],o['data'].get('Year of completion')))
        if p['comment']!=(o['comment'] or ''): diffs.append(('comment',len(p['comment']),len(o['comment'] or '')))
        if p['imgs'][:len(o['imgs'])]!=o['imgs'] and set(o['imgs'])-set(p['imgs']): diffs.append(('imgs',len(p['imgs']),len(o['imgs']), o['imgs'][0] in p['imgs']))
        if diffs: bad+=1; print(s[:50],diffs)
    print('bad',bad,'of',len(old))
