import urllib.request,hashlib,os,concurrent.futures as cf
slugs=[l.strip() for l in open('ru.txt') if l.strip()]
def get(s):
    f='bpp/'+hashlib.md5(s.encode()).hexdigest()
    if os.path.exists(f+'.html') and os.path.getsize(f+'.html')>10000: return
    for _ in range(3):
        try:
            r=urllib.request.urlopen(urllib.request.Request('https://www.blackpoint.group/ru/marketplace/'+s,headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read()
            open(f+'.html','wb').write(r); open(f+'.slug','w').write(s); return
        except Exception as e: err=e
    print('FAIL',s,err)
with cf.ThreadPoolExecutor(6) as ex: list(ex.map(get,slugs))
print(len([x for x in os.listdir('bpp') if x.endswith('.slug')]))
