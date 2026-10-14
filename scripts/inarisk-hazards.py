"""Natural hazard indices at each listing point from InaRISK (BNPB, the national
disaster agency): flood, flash flood, landslide, earthquake, tsunami, volcano.
(Liquefaction exists too but its server times out on every call.)

Source: public ArcGIS ImageServers at gis.bnpb.go.id/server/rest/services/
inarisk/INDEKS_BAHAYA_*. Each pixel is a hazard index 0..1; BNPB's own map
classes are low < 0.333 ≤ medium < 0.666 ≤ high. NoData means the model puts
no hazard of that kind there.

The server drops out often (Cloudflare 521), so answers are cached per point
in .tmp-plot/inarisk.json and the script just keeps retrying the gaps —
run it again until "missing: 0", then with --apply.

Writes listing_geo_facts.climate.hazards.

  ~/.venvs/analytics/bin/python scripts/inarisk-hazards.py            # fetch, dry run
  ~/.venvs/analytics/bin/python scripts/inarisk-hazards.py --apply
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

APPLY = '--apply' in sys.argv
CACHE = os.path.join('.tmp-plot', 'inarisk.json')
BASE = 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_BAHAYA_{}/ImageServer/identify'
BATCH = 200
LAYERS = {
    'flood': 'BANJIR', 'flash_flood': 'BANJIRBANDANG', 'landslide': 'TANAHLONGSOR',
    'earthquake': 'GEMPABUMI', 'tsunami': 'TSUNAMI', 'volcano': 'GUNUNGAPI',
}

env = {}
for line in open('.env.local', encoding='utf8'):
    if '=' in line and not line.startswith('#'):
        k, v = line.rstrip('\n').split('=', 1)
        env[k] = v.strip().strip('"\'')
SB = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/') + '/rest/v1'
HDR = {'apikey': env['SUPABASE_SERVICE_KEY'], 'Authorization': 'Bearer ' + env['SUPABASE_SERVICE_KEY'],
       'Content-Type': 'application/json'}


def sb_get(path):
    out, start = [], 0
    while True:
        req = urllib.request.Request(f'{SB}/{path}', headers={**HDR, 'Range': f'{start}-{start + 999}'})
        rows = json.load(urllib.request.urlopen(req))
        out += rows
        if len(rows) < 1000:
            return out
        start += 1000


def sb_upsert(rows):
    for i in range(0, len(rows), 200):
        body = json.dumps(rows[i:i + 200]).encode()
        req = urllib.request.Request(f'{SB}/listing_geo_facts?on_conflict=kind,airtable_id', data=body, method='POST',
                                     headers={**HDR, 'Prefer': 'resolution=merge-duplicates,return=minimal'})
        urllib.request.urlopen(req).read()


def samples(layer, pts):
    """Index 0..1 per point (None for NoData) in one getSamples call; raises when the server is down."""
    geom = json.dumps({'points': [[lng, lat] for lat, lng in pts], 'spatialReference': {'wkid': 4326}})
    body = urllib.parse.urlencode({'geometry': geom, 'geometryType': 'esriGeometryMultipoint',
                                   'returnFirstValueOnly': 'true', 'f': 'json'}).encode()
    req = urllib.request.Request(BASE.format(layer).replace('/identify', '/getSamples'), data=body,
                                 headers={'User-Agent': 'balinsky-tools/1.0'})
    d = json.load(urllib.request.urlopen(req, timeout=120))
    if 'samples' not in d:
        raise RuntimeError(str(d)[:200])
    out = [None] * len(pts)
    for smp in d['samples']:
        v = smp.get('value')
        out[smp['locationId']] = None if v in ('NoData', '', None) else round(float(str(v).split()[0]), 3)
    return out


def key(lat, lng):
    return f'{lat:.5f},{lng:.5f}'


def main():
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    facts = [r for r in sb_get('listing_geo_facts?select=kind,airtable_id,lat,lng,climate')
             if r['lat'] is not None and r['lng'] is not None]
    points = sorted({key(r['lat'], r['lng']) for r in facts})
    for name, layer in LAYERS.items():
        todo = [p for p in points if name not in cache.get(p, {})]
        for i in range(0, len(todo), BATCH):
            chunk = todo[i:i + BATCH]
            try:
                vals = samples(layer, [tuple(map(float, p.split(','))) for p in chunk])
            except Exception as e:  # server down — keep what we have, run again later
                print(f'  {name}: server failed ({str(e)[:80]})', flush=True)
                break
            for p, v in zip(chunk, vals):
                cache.setdefault(p, {})[name] = v
            json.dump(cache, open(CACHE, 'w'))
            print(f'  {name}: {min(i + BATCH, len(todo))}/{len(todo)}', flush=True)
            time.sleep(1)

    missing = sum(1 for p in points for name in LAYERS if name not in cache.get(p, {}))
    print(f'missing: {missing}')
    if missing:
        return
    rows = []
    for r in facts:
        h = cache[key(r['lat'], r['lng'])]
        c = r['climate'] or {}
        rows.append({'kind': r['kind'], 'airtable_id': r['airtable_id'], 'lat': r['lat'], 'lng': r['lng'],
                     'climate': {**c, 'hazards': {'src': 'InaRISK BNPB', **{k: h[k] for k in LAYERS}}}})
    for name in LAYERS:
        vals = [cache[p][name] for p in points]
        hi = sum(1 for v in vals if v is not None and v >= 0.666)
        mid = sum(1 for v in vals if v is not None and 0.333 <= v < 0.666)
        print(f'{name:13} high {hi:4}  medium {mid:4}  none {sum(1 for v in vals if v is None):4}  of {len(vals)}')
    if APPLY:
        sb_upsert(rows)
        print('written')


if __name__ == '__main__':
    main()
