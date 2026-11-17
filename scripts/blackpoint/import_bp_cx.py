#!/usr/bin/env python3
"""Import Blackpoint off-plan complexes (researched) into Balinsky. Usage: python3 import_bp_cx.py [--apply]"""
import json, re, os, sys, hashlib, urllib.request, urllib.error, datetime, subprocess, glob
S = os.path.dirname(os.path.abspath(__file__)); APPLY = '--apply' in sys.argv
env = {}
for line in open(os.path.expanduser('~/balinsky/.env.local')):
    m = re.match(r'^([A-Z0-9_]+)=(.*)$', line.strip())
    if m: env[m.group(1)] = m.group(2).strip().strip('"')
U = env['NEXT_PUBLIC_SUPABASE_URL']; K = env['SUPABASE_SERVICE_KEY']; CDN = 'https://images.balinsky.info'
NOW = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z'); TODAY = '17.11.2026'
UA = 'Mozilla/5.0 (Macintosh) Chrome/131.0'
report = {'developers': [], 'complexes': [], 'units': [], 'skipped': [], 'photo_fail': []}
def rid(key): return 'adm_' + hashlib.sha1(('bp:' + key).encode()).hexdigest()[:10]
def slugify(s):
    s = s.lower().replace('&', 'and').replace('’', '').replace("'", '')
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s)).strip('-')
def http(method, url, body=None, headers=None, raw=False):
    h = {'apikey': K, 'Authorization': 'Bearer ' + K}
    if headers: h.update(headers)
    data = body if raw else (json.dumps(body).encode() if body is not None else None)
    if not raw and body is not None: h.setdefault('Content-Type', 'application/json')
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as r: return r.status, r.read()
    except urllib.error.HTTPError as e: return e.code, e.read()
def upsert(table, rows):
    if not APPLY or not rows: return
    st, b = http('POST', f'{U}/rest/v1/{table}?on_conflict=airtable_id', rows, {'Prefer': 'resolution=merge-duplicates,return=minimal'})
    if st >= 300: raise SystemExit(f'{table}: {st} {b[:400]}')
def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r: return r.read(), r.headers.get('Content-Type', '')
def upload(bucket, key, buf, ctype):
    if not APPLY: return f'{CDN}/storage/v1/object/public/{bucket}/{key}'
    st, b = http('POST', f'{U}/storage/v1/object/{bucket}/{key}', buf, {'Content-Type': ctype, 'x-upsert': 'true', 'cache-control': '31536000'}, raw=True)
    if st >= 300: raise SystemExit(f'upload {bucket}/{key}: {st} {b[:300]}')
    return f'{CDN}/storage/v1/object/public/{bucket}/{key}'
def manifest(bucket):
    st, b = http('GET', f'{U}/storage/v1/object/public/{bucket}/_manifest.json?t={NOW}')
    return json.loads(b) if st == 200 else None
def save_manifest(bucket, m):
    if APPLY: upload(bucket, '_manifest.json', json.dumps(m).encode(), 'application/json')
def photos_for(slug, urls, limit=10):
    out = []
    for u in urls:
        if len(out) >= limit: break
        try:
            buf, ct = fetch(u + '?scale-down-to=2048')
            ct = ct.split(';')[0]
            if len(buf) < 15000 or not ct.startswith('image/'): continue
            ext = {'image/webp': 'webp', 'image/png': 'png'}.get(ct, 'jpg')
            out.append(upload('complex-photos', f'bp/{slug}/{len(out)+1}.{ext}', buf, ct))
        except Exception as e: report['photo_fail'].append(f'{slug}: {u} ({e})')
    return out
def logo(dev_id, url):
    try:
        buf, ct = fetch(url); src = f'{S}/logo_src_{dev_id}'; dst = f'{S}/logo_{dev_id}.png'
        open(src, 'wb').write(buf)
        subprocess.run(['sips', '-s', 'format', 'png', '-Z', '512', src, '--out', dst], check=True, capture_output=True)
        return upload('developer-logos', f'admin/{dev_id}-logo.png', open(dst, 'rb').read(), 'image/png')
    except Exception as e: report['photo_fail'].append(f'logo {dev_id}: {url} ({e})'); return None

DISTRICT = {'Other Bali Area': None, 'Other Indonesian islands': None, 'Karanggasem': 'Karangasem'}
def norm_completion(c, fallback_year):
    c = (c or '').strip()
    m = re.search(r'([1-4])\s*(?:кв|q|quarter)[^\d]*(20\d\d)', c, re.I) or re.search(r'Q([1-4])\D*(20\d\d)', c, re.I)
    if m: return f'{m.group(1)} кв. {m.group(2)}'
    MON = {'январ':1,'феврал':1,'март':1,'апрел':2,'ма':2,'июн':2,'июл':3,'август':3,'сентябр':3,'октябр':4,'ноябр':4,'декабр':4}
    m = re.search(r'([а-я]+)\s+(20\d\d)', c.lower())
    if m:
        for k, q in MON.items():
            if m.group(1).startswith(k): return f'{q} кв. {m.group(2)}'
    m = re.search(r'(20\d\d)', c)
    return m.group(1) if m else (fallback_year or None)

full = json.load(open(f'{S}/offplan_full.json'))
by_name = {x['name'].strip(): x for x in full}
res = [r for f in sorted(glob.glob(f'{S}/group*_result.json')) for r in json.load(open(f))]
SKIP = {'Whales & Waves': 'West Sumbawa — не Бали'}
DEV_OVERRIDE = {'Horizon Blue Boutique Hotel': 'Horizon Blue', 'Bingin Resort': None}
DIST_OVERRIDE = {'Maison Bedugul': 'Bedugul', 'Tumbak Bayuh Private Suite': 'Tumbak Bayuh', 'Kerobokan Residence': 'Kerobokan', 'Horizon Blue Boutique Hotel': 'Bingin'}
for r in res:
    k = r['name'].strip()
    if k in SKIP: r['status'] = 'skip'; r['reason'] = SKIP[k]
    if k in DEV_OVERRIDE: r['developer'] = DEV_OVERRIDE[k]
cx_existing = json.load(open(f'{S}/raw_complexes.json'))
ex_slugs = {r['slug'] for r in cx_existing if r.get('slug')}
devs_existing = json.load(open(f'{S}/raw_developers.json'))
dev_by_name = {}
for d in devs_existing:
    n = (d['data'].get('Developer') or '').strip()
    if n: dev_by_name.setdefault(n.lower(), (d['airtable_id'], n))
used_unit_slugs = {r['slug'] for t in ('raw_villas', 'raw_apartments') for r in json.load(open(f'{S}/{t}_slugs.json')) if r.get('slug')}

dev_rows, cx_rows, villa_rows, apt_rows = [], [], [], []
cx_photos, unit_photos = {}, {'villa-photos': {}, 'apartment-photos': {}}
new_devs = {}
for r in res:
    if r.get('status') != 'new':
        report['skipped'].append(dict(n=r.get('n'), name=r.get('name'), status=r.get('status'), existing=r.get('existing_name'), reason=r.get('reason'))); continue
    src = by_name[r['name'].strip()]
    name = re.split(r'\s[—–]\s', (r.get('project_name') or src['name']).strip())[0]
    # developer
    dev_name, dev_id = None, None
    if r.get('developer'):
        hit = dev_by_name.get(r['developer'].strip().lower())
        if hit: dev_id, dev_name = hit
        elif r.get('developer_text_ru'):
            dev_name = r['developer'].strip(); key = slugify(dev_name)
            if key not in new_devs:
                dev_id = rid('dev:' + key)
                new_devs[key] = dict(id=dev_id, name=dev_name, ru=r['developer_text_ru'], en=r.get('developer_text_en') or '', site=r.get('developer_website'), projects=[])
            dev_id = new_devs[key]['id']; new_devs[key]['projects'].append(name)
        else:
            dev_name = r['developer'].strip()  # name only, no card
    slug = slugify(name)
    district = DIST_OVERRIDE.get(src['name'].strip()) or DISTRICT.get(src['loc'], src['loc']) or (r.get('district') or '').split(' (')[0].split(',')[0] or None
    if slug in ex_slugs: slug = slugify(name + ' ' + (district or 'bali'))
    ex_slugs.add(slug); cid = rid('cx:' + slug)
    lat, lng = (src['geo'] or (None, None)) if src.get('geo') else (r.get('lat'), r.get('lng'))
    units = [u for u in (r.get('units') or []) if u.get('price_usd')]
    price_from = min([u['price_usd'] for u in units] or [0]) or (int(src['price']) if src.get('price') and src['price'] != '0' else None)
    kinds = {u.get('kind') for u in r.get('units') or []} or {'apartment' if src['typ'] == 'Апартамент' else 'villa'}
    types_ru = sorted({{'villa': 'Виллы', 'apartment': 'Апартаменты', 'townhouse': 'Таунхаусы'}.get(k, 'Виллы') for k in kinds})
    data = {'Project': name, 'Location': district or 'Bali', 'Location 2': district or 'Bali', 'Статус': 'Строится', 'TOP': False,
            'Типы юнитов': types_ru, 'Опубликовать': True, 'Обновлено': NOW, 'SEO Text': r.get('text_ru'), 'SEO Text EN': r.get('text_en'),
            'Источник данных': 'Blackpoint ' + src['bp_url'] if 'bp_url' in src else 'Blackpoint https://www.blackpoint.group/ru/marketplace/' + src['slug']}
    srcs = [s for s in (r.get('sources') or []) if s][:3]
    if srcs: data['Источник данных'] += '; ' + ', '.join(srcs)
    data['Источник данных'] += f', импорт {TODAY}'
    if dev_name: data['Developer'] = data['Developer1'] = dev_name
    if lat is not None and lng is not None: data['Geo'] = str(lat); data['Geo 2'] = str(lng)
    if price_from: data['price_usd'] = int(price_from)
    comp = norm_completion(r.get('completion'), src.get('deliv'))
    if comp: data['Year of completion'] = data['Year of completion '] = comp
    if r.get('total_units'): data['Total quantity of units'] = r['total_units']
    if r.get('leasehold_years'): data['Leasehold'] = str(r['leasehold_years'])
    data = {k: v for k, v in data.items() if v is not None}
    cx_rows.append({'airtable_id': cid, 'slug': slug, 'data': data, 'synced_at': NOW, 'cover_url': None})
    report['complexes'].append(dict(n=r.get('n'), id=cid, slug=slug, name=name, dev=dev_name, geo=lat is not None, units=len(units), price_from=price_from, conf=r.get('confidence')))
    full_src = src
    cx_photos[cid] = (slug, full_src.get('imgs') or [])
    seen = set()
    for u in units:
        kind = u.get('kind') or 'villa'; b = int(u.get('bedrooms') or 0); a = u.get('area_m2'); p = int(u['price_usd'])
        a_i = int(round(float(a))) if a else None
        if (kind, b, a_i, p) in seen: continue
        seen.add((kind, b, a_i, p))
        uslug = f"{slug}-{a_i or 0}m2-{b}-bedroom"
        if uslug in used_unit_slugs: uslug += f'-{p}'
        used_unit_slugs.add(uslug); uid = rid('unit:' + uslug + f':{p}')
        sub = district or 'Bali'
        bed_ru = 'студия' if b == 0 else f'{b} спальн' + ('я' if b == 1 else 'и' if b < 5 else 'ей')
        bed_en = 'Studio' if b == 0 else f'{b}-Bedroom'
        kind_ru = {'villa': 'Вилла', 'townhouse': 'Таунхаус', 'apartment': 'Апартаменты'}[kind]
        kind_en = {'villa': 'Villa', 'townhouse': 'Townhouse', 'apartment': 'Apartment'}[kind]
        ud = {'Geo': [str(lat)] if lat is not None else None, 'Geo 2': [str(lng)] if lng is not None else None,
              'TOP': False, 'Location': sub, 'Location 2': sub, 'SEO:Slug': uslug, 'Цена': p,
              'Developer': [dev_id] if dev_id else None, 'Developer1': dev_name, 'SEO:Index': '1',
              'SEO:Title': f"{kind_ru} {name} в {sub} - {a_i or ''} м², {bed_ru} | Balinsky".replace(' -  м², ', ' - '),
              'SEO:Title EN': f"{name} {kind_en} in {sub} – {a_i or ''} m², {bed_en} | Balinsky".replace(' –  m², ', ' – '),
              'Статус': 'Строится', 'Комнаты': b, 'Площадь': a_i, 'Цена м²': round(p / float(a), 2) if a else None,
              'Комплекс': [cid], 'Комплекс 1': name, 'Опубликовать': True, 'Обновление цены': NOW,
              'Источник данных': f"{', '.join(srcs) or 'Blackpoint'}, цена на {TODAY}"}
        if kind == 'apartment': ud['price_usd'] = p; ud['Location filter'] = sub
        else: ud['price'] = p; ud['Type'] = kind_en
        ud = {k: v for k, v in ud.items() if v is not None}
        (apt_rows if kind == 'apartment' else villa_rows).append({'airtable_id': uid, 'data': ud, 'synced_at': NOW})
        unit_photos['apartment-photos' if kind == 'apartment' else 'villa-photos'][uid] = cid
        report['units'].append(dict(id=uid, slug=uslug, kind=kind, price=p, bed=b, area=a_i))

for key, d in new_devs.items():
    projects = ', '.join(d['projects'])
    dd = {'SEO Text': d['ru'], 'SEO Text EN': d['en'], 'SEO:Slug': key + '-bali-developer', 'Developer': d['name'], 'SEO:Index': '1',
          'Developer_key': d['name'].lower(), 'Обновлено': NOW, 'Публикация': True,
          'Добавление': f'Добавлен {TODAY} (сверка с каталогом Blackpoint); описание — факты с официального сайта или каталога.',
          'Строительство и недвижимость': projects, 'Строительство и недвижимость EN': projects}
    if d.get('site'): dd["Link on developer's website"] = d['site']
    dev_rows.append({'airtable_id': d['id'], 'data': dd, 'synced_at': NOW})
    report['developers'].append(dict(id=d['id'], name=d['name'], projects=projects))

print('DEVELOPERS', len(dev_rows)); [print('  ', x) for x in report['developers']]
print('COMPLEXES', len(cx_rows)); [print('  ', x) for x in report['complexes']]
print('UNITS', len(villa_rows) + len(apt_rows)); print('SKIPPED', len(report['skipped'])); [print('  ', x) for x in report['skipped']]
if not APPLY: sys.exit(0)
upsert('raw_developers', dev_rows)
cm = manifest('complex-photos'); assert cm is not None and len(cm) > 100, 'complex manifest unreadable'
for r in cx_rows:
    slug, urls = cx_photos[r['airtable_id']]
    ph = photos_for(slug, urls)
    if ph: cm[r['airtable_id']] = ph; r['cover_url'] = ph[0]
upsert('raw_complexes', cx_rows); save_manifest('complex-photos', cm)
upsert('raw_villas', villa_rows); upsert('raw_apartments', apt_rows)
for bucket, mp in unit_photos.items():
    if not mp: continue
    m = manifest(bucket); assert m is not None and len(m) > 100, f'{bucket} manifest unreadable'
    for uid, cid in mp.items():
        if cm.get(cid): m[uid] = cm[cid]
    save_manifest(bucket, m)
json.dump(report, open(f'{S}/import_bp_cx_report.json', 'w'), ensure_ascii=False, indent=1)
print('DONE; photo failures:', len(report['photo_fail'])); [print('  ', x) for x in report['photo_fail'][:20]]
