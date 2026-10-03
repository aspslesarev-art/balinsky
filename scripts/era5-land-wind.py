"""Wind rose per listing from Copernicus ERA5-Land (0.1° ≈ 11 km grid).

Finer than the NASA POWER rose (~50 km cells) that
build-listing-environment.mjs --wind writes, so this one tells a ridge from a
coast. Free: needs a CDS key in ~/.cdsapirc (cds.climate.copernicus.eu →
profile → API key) and the ERA5-Land licence accepted once on the site.

ERA5-Land has no data over the sea, and on Bali's coast the nearest grid cell
is often water. Such a cell comes back empty; we then step to the nearest land
cell around it.

Writes climate.wind in listing_geo_facts (same shape as the NASA leg, src
starting with "ERA5"). Downloads are cached in .tmp-era5/cells, so a rerun
only fetches what is missing.

  ~/.venvs/analytics/bin/python scripts/era5-land-wind.py           # dry run
  ~/.venvs/analytics/bin/python scripts/era5-land-wind.py --apply
"""
import csv
import io
import json
import math
import os
import sys
import threading
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta

import cdsapi

APPLY = '--apply' in sys.argv
STEP = 0.1
CACHE = os.path.join('.tmp-era5', 'cells')
DRY_MONTHS = {4, 5, 6, 7, 8, 9, 10}
CALM_MS = 0.5
BALI_UTC = timedelta(hours=8)

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


def cell_key(lat, lng):
    return (round(lat / STEP), round(lng / STEP))


client = cdsapi.Client(quiet=True, progress=False, timeout=120)
END = (date.today().replace(day=1) - timedelta(days=1)).isoformat()   # last full month
START = f'{date.today().year - 6}-01-01'


_locks, _locks_guard = {}, threading.Lock()


def fetch(key):
    """Hourly (time, u, v) for one grid cell, or [] when it is a sea cell."""
    # Neighbouring listings probe the same land cells; one download per cell.
    with _locks_guard:
        lock = _locks.setdefault(key, threading.Lock())
    with lock:
        return _fetch(key)


def _fetch(key):
    path = os.path.join(CACHE, f'{key[0]}_{key[1]}.csv')
    if not os.path.exists(path):
        tmp = path + '.zip'
        client.retrieve('reanalysis-era5-land-timeseries', {
            'variable': ['10m_u_component_of_wind', '10m_v_component_of_wind'],
            'location': {'latitude': key[0] * STEP, 'longitude': key[1] * STEP},
            'date': [f'{START}/{END}'],
            'data_format': 'csv',
        }).download(tmp)
        with zipfile.ZipFile(tmp) as z, open(path, 'w', encoding='utf8') as f:
            f.write(z.read(z.namelist()[0]).decode())
        os.remove(tmp)
    rows = []
    with open(path, encoding='utf8') as f:
        for r in csv.DictReader(f):
            if r['u10'] and r['v10']:
                rows.append((r['valid_time'], float(r['u10']), float(r['v10'])))
    return rows


def rose(rows):
    def blank():
        return {'n': 0, 'calm': 0, 'sum': 0.0, 'cnt': [0] * 8, 'spd': [0.0] * 8}
    acc = {'all': blank(), 'dry': blank(), 'wet': blank()}
    years = set()
    for t, u, v in rows:
        local = datetime.fromisoformat(t) + BALI_UTC
        years.add(local.year)
        ws = math.hypot(u, v)
        # u/v say where the air goes; a rose shows where it comes FROM.
        wd = (270 - math.degrees(math.atan2(v, u))) % 360
        sector = int(((wd + 22.5) % 360) // 45)
        for b in (acc['all'], acc['dry'] if local.month in DRY_MONTHS else acc['wet']):
            b['n'] += 1
            b['sum'] += ws
            if ws < CALM_MS:
                b['calm'] += 1
                continue
            b['cnt'][sector] += 1
            b['spd'][sector] += ws

    def fold(b):
        return {
            'pct': [round(100 * c / b['n'], 1) for c in b['cnt']],
            'ms': [round(b['spd'][i] / c, 1) if c else None for i, c in enumerate(b['cnt'])],
            'calm_pct': round(100 * b['calm'] / b['n'], 1),
            'avg_ms': round(b['sum'] / b['n'], 1),
        }
    return {'src': 'ERA5-Land (Copernicus), hourly 10 m', 'years': len(years), 'hours': acc['all']['n'],
            'all': fold(acc['all']), 'dry': fold(acc['dry']), 'wet': fold(acc['wet'])}


def land_rose(key):
    """Rose for the cell, or for the nearest land cell around it."""
    rings = [(0, 0)] + sorted(((dy, dx) for dy in range(-2, 3) for dx in range(-2, 3) if (dy, dx) != (0, 0)),
                              key=lambda d: d[0] ** 2 + d[1] ** 2)
    for dy, dx in rings:
        rows = fetch((key[0] + dy, key[1] + dx))
        if rows:
            return rose(rows), (dy, dx)
    return None, None


def main():
    os.makedirs(CACHE, exist_ok=True)
    listings = sb_get('listing_geo?select=kind,airtable_id,lat,lng')
    cells = {}
    for l in listings:
        if l['lat'] is None or l['lng'] is None:
            continue
        cells.setdefault(cell_key(l['lat'], l['lng']), []).append(l)
    print(f'listings={len(listings)} era5-land cells={len(cells)}  {START}..{END}', flush=True)

    results, done = {}, 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(land_rose, k): k for k in cells}
        for fut in futures:
            k = futures[fut]
            try:
                results[k] = fut.result()
            except Exception as e:  # one bad cell must not kill a 20-minute run
                print(f'\n  cell {k} failed: {e}', flush=True)
                results[k] = (None, None)
            done += 1
            print(f'\r  cells {done}/{len(cells)}', end='', flush=True)
    print()

    moved = sum(1 for w, off in results.values() if w and off != (0, 0))
    missing = [k for k, (w, _) in results.items() if not w]
    print(f'  ok={len(cells) - len(missing)}  shifted to land={moved}  no data={len(missing)}')

    existing = {(r['kind'], r['airtable_id']): r['climate'] for r in
                sb_get('listing_geo_facts?select=kind,airtable_id,climate')}
    rows = []
    for k, ls in cells.items():
        wind = results[k][0]
        if not wind:
            continue
        for l in ls:
            climate = existing.get((l['kind'], l['airtable_id'])) or {}
            rows.append({'kind': l['kind'], 'airtable_id': l['airtable_id'], 'lat': l['lat'], 'lng': l['lng'],
                         'climate': {**climate, 'wind': wind}})
    if APPLY:
        sb_upsert(rows)
        print(f'  wind written for {len(rows)} listings')
    else:
        print(f'  dry run: would write {len(rows)} listings (pass --apply)')


if __name__ == '__main__':
    main()
