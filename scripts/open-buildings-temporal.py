"""Buildings around each listing, year by year 2016–2023, from Google Open
Buildings 2.5D Temporal (Sentinel-2 based, ~4 m effective, CC BY 4.0).

Finer and fresher than GHSL (ghsl-builtup.py stops at 2020 and misses the
villa boom). Read straight from the public bucket as cloud-optimised
GeoTIFFs: only the blocks around each listing travel, never whole tiles.

Per listing, within RADIUS_M:
  n        — buildings (sum of building_fractional_count);
  roof_pct — share of the circle under roofs (building_presence > 0.5).
We read the 4 m overview: its pixels are averages, so counts match the full
0.5 m read to within 0.3% (Berawa: 4867 vs 4871). Coarser (8 m) keeps counts
but loses ~1 point of roof share — small roofs blur below the 0.5 cut.

Writes listing_geo_facts.climate.buildings. Free, no key.

  ~/.venvs/analytics/bin/python scripts/open-buildings-temporal.py            # dry run
  ~/.venvs/analytics/bin/python scripts/open-buildings-temporal.py --apply
"""
import json
import math
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.warp import transform
from rasterio.windows import from_bounds

APPLY = '--apply' in sys.argv
CACHE = '.tmp-obt'
YEARS = list(range(2016, 2024))
RADIUS_M = 1000
OV = 8                     # 0.5 m × 8 = 4 m overview, the data's own resolution
GROUP_M = 100              # listings closer than this share one read
BUCKET = 'https://storage.googleapis.com/open-buildings-temporal-data/v1'
UTM50S = CRS.from_epsg(32750)   # Bali lies in UTM zone 50S

os.environ.setdefault('GDAL_DISABLE_READDIR_ON_OPEN', 'EMPTY_DIR')
os.environ.setdefault('CPL_VSIL_CURL_ALLOWED_EXTENSIONS', '.tif')

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


def tile_index(year):
    """(x0, y0, x1, y1, url) of every GeoTIFF in Bali's manifest for a year."""
    path = os.path.join(CACHE, f'm_{year}.json')
    if not os.path.exists(path):
        urllib.request.urlretrieve(f'{BUCKET}/manifests/2d_EPSG_32750_{year}_06_30.json', path)
    m = json.load(open(path))
    prefix = m['uriPrefix'].replace('gs://open-buildings-temporal-data/v1/', f'{BUCKET}/')
    out = []
    for ts in m['tilesets']:
        for s in ts['sources']:
            a, d = s['affineTransform'], s['dimensions']
            x0, x1 = sorted([a['translateX'], a['translateX'] + d['width'] * a['scaleX']])
            y0, y1 = sorted([a['translateY'], a['translateY'] + d['height'] * a['scaleY']])
            out.append((x0, y0, x1, y1, prefix + s['uris'][0]))
    return out


def measure(x, y, tiles):
    """Buildings and roof share within RADIUS_M of (x, y), summed over tiles."""
    n, roof_px, all_px = 0.0, 0, 0
    for x0, y0, x1, y1, url in tiles:
        bx0, bx1 = max(x0, x - RADIUS_M), min(x1, x + RADIUS_M)
        by0, by1 = max(y0, y - RADIUS_M), min(y1, y + RADIUS_M)
        if bx0 >= bx1 or by0 >= by1:
            continue
        with rasterio.open('/vsicurl/' + url) as r:
            win = from_bounds(bx0, by0, bx1, by1, r.transform).round_offsets().round_lengths()
            h, w = max(1, int(win.height) // OV), max(1, int(win.width) // OV)
            count, presence = r.read((1, 3), window=win, out_shape=(2, h, w))
            wt = r.window_transform(win)
        # Pixel centres → keep the circle only.
        cols, rows = np.meshgrid(np.arange(w) + 0.5, np.arange(h) + 0.5)
        px = wt.c + cols * (win.width / w) * wt.a
        py = wt.f + rows * (win.height / h) * wt.e
        inside = (px - x) ** 2 + (py - y) ** 2 <= RADIUS_M ** 2
        valid = inside & (count >= 0)
        n += float(count[valid].sum()) * (win.width / w) * (win.height / h)
        roof_px += int((presence[valid] > 0.5).sum())
        all_px += int(inside.sum())
    if not all_px:
        return None
    return {'n': int(round(n)), 'roof_pct': round(100 * roof_px / all_px, 1)}


def main():
    os.makedirs(CACHE, exist_ok=True)
    index = {y: tile_index(y) for y in YEARS}
    listings = [l for l in sb_get('listing_geo?select=kind,airtable_id,lat,lng') if l['lat'] is not None]
    xs, ys = transform(CRS.from_epsg(4326), UTM50S, [l['lng'] for l in listings], [l['lat'] for l in listings])
    groups = {}
    for l, x, y in zip(listings, xs, ys):
        groups.setdefault((round(x / GROUP_M), round(y / GROUP_M)), []).append(l)
    print(f'listings={len(listings)} points={len(groups)} reads≈{len(groups) * len(YEARS)}', flush=True)

    def job(key):
        x, y = key[0] * GROUP_M, key[1] * GROUP_M
        out = {}
        for year in YEARS:
            near = [t for t in index[year] if t[0] < x + RADIUS_M and t[2] > x - RADIUS_M
                    and t[1] < y + RADIUS_M and t[3] > y - RADIUS_M]
            m = measure(x, y, near)
            if m:
                out[str(year)] = m
        return key, out

    results, done = {}, 0
    with ThreadPoolExecutor(max_workers=16) as pool:
        for key, out in pool.map(job, list(groups)):
            results[key] = out
            done += 1
            if done % 25 == 0 or done == len(groups):
                print(f'\r  points {done}/{len(groups)}', end='', flush=True)
    print()

    def growth(o):
        a, b = o.get('2016', {}).get('n'), o.get('2023', {}).get('n')
        return (b - a) / a if a and b is not None and a >= 20 else None

    rates = sorted(g for g in (growth(o) for o in results.values()) if g is not None)
    existing = {(r['kind'], r['airtable_id']): r['climate'] for r in
                sb_get('listing_geo_facts?select=kind,airtable_id,climate')}
    rows = []
    for key, ls in groups.items():
        o = results.get(key) or {}
        if len(o) < len(YEARS):
            continue   # a year missing (pin at sea or outside coverage) — skip rather than mislead
        g = growth(o)
        data = {'src': 'Google Open Buildings 2.5D Temporal', 'radius_m': RADIUS_M, 'years': o,
                'growth_rank': round(100 * sum(1 for r in rates if r <= g) / len(rates)) if g is not None else None}
        for l in ls:
            climate = existing.get((l['kind'], l['airtable_id'])) or {}
            rows.append({'kind': l['kind'], 'airtable_id': l['airtable_id'], 'lat': l['lat'], 'lng': l['lng'],
                         'climate': {**climate, 'buildings': data}})
    sample = list(results.items())[:4]
    for key, o in sample:
        print(' ', {y: o.get(y) for y in ('2016', '2020', '2023')})
    if APPLY:
        sb_upsert(rows)
        print(f'  written for {len(rows)} listings')
    else:
        print(f'  dry run: would write {len(rows)} listings (pass --apply)')


if __name__ == '__main__':
    main()
