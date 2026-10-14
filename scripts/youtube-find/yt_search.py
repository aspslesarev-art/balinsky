import json, re, sys, urllib.request, urllib.parse
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36'
def search(q):
    url='https://www.youtube.com/results?'+urllib.parse.urlencode({'search_query':q,'sp':'EgIQAQ=='})
    h=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA,'Accept-Language':'en'}),timeout=30).read().decode('utf8','ignore')
    m=re.search(r'var ytInitialData = (\{.*?\});</script>',h)
    if not m: raise RuntimeError('no data')
    data=json.loads(m.group(1)); out=[]
    def walk(o):
        if isinstance(o,dict):
            if 'videoRenderer' in o:
                v=o['videoRenderer']
                t=''.join(r.get('text','') for r in v.get('title',{}).get('runs',[]))
                ch=''.join(r.get('text','') for r in v.get('ownerText',{}).get('runs',[]))
                desc=''.join(r.get('text','') for s in v.get('detailedMetadataSnippets',[]) for r in s.get('snippetText',{}).get('runs',[]))
                out.append({'id':v['videoId'],'title':t,'channel':ch,'published':v.get('publishedTimeText',{}).get('simpleText'),'views':v.get('viewCountText',{}).get('simpleText'),'length':v.get('lengthText',{}).get('simpleText'),'desc':desc[:200]})
                return
            for x in o.values(): walk(x)
        elif isinstance(o,list):
            for x in o: walk(x)
    walk(data); return out
if __name__=='__main__':
    for v in search(sys.argv[1])[:10]: print(v['id'],'|',v['title'][:70],'|',v['channel'],'|',v['published'],'|',v['length'])
