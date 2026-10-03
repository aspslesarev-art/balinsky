"""How fast the area around each listing is being built over, plus its distance
to the sea — both from the Copernicus Global Human Settlement Layer (JRC).

  GHS-BUILT-S R2023A, 3 arc-sec (~90 m): built-up surface in m² per cell, every
    5 years 1975–2020 (Landsat/Sentinel-2). The release also has 2025 and 2030,
    but those are a model run forward, and it misses the post-2020 villa boom
    (Pererenan reads flat) — so we stop at 2020, the last observed epoch.
  GHS-LAND R2022A, 100 m: land surface in m² per cell (sea = 0).

For each listing: the share of LAND within 1 km that is built over, per epoch.
Sea is left out of the denominator, otherwise a beachfront plot reads as
"half empty". Distance to the coast = distance to the nearest cell that is
mostly sea.

Writes listing_geo_facts.climate.built and climate.coast_m (no spare column;
same trick as climate.wind). Free; tiles cached in .tmp-ghsl.

  ~/.venvs/analytics/bin/python scripts/ghsl-builtup.py            # dry run
  ~/.venvs/analytics/bin/python scripts/ghsl-builtup.py --apply
"""
import json
import math
import os
import sys
import urllib.request
import zipfile

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject
from scipy.ndimage import distance_transform_edt

APPLY = '--apply' in sys.argv
CACHE = '.tmp-ghsl'
EPOCHS = [1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020]
RADIUS_M = 1000
# Bali plus Nusa Penida / Lembongan / Ceningan.
W, N, E, S = 114.40, -8.03, 115.75, -8.88
RES = 1 / 1200   # 3 arc-seconds, the BUILT grid

BASE = 'https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL'

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


def tile(url, name):
    tif = os.path.join(CACHE, name + '.tif')
    if not os.path.exists(tif):
        z = os.path.join(CACHE, name + '.zip')
        urllib.request.urlretrieve(url, z)
        with zipfile.ZipFile(z) as f:
            f.extract(name + '.tif', CACHE)
    return tif


# Common grid over Bali in lon/lat at 3 arc-seconds.
WIDTH = round((E - W) / RES)
HEIGHT = round((N - S) / RES)
GRID = from_origin(W, N, RES, RES)


def onto_grid(paths, src_resampling):
    out = np.zeros((HEIGHT, WIDTH), dtype=np.float32)
    for p in paths:
        with rasterio.open(p) as src:
            part = np.zeros_like(out)
            reproject(rasterio.band(src, 1), part, dst_transform=GRID, dst_crs=CRS.from_epsg(4326),
                      resampling=src_resampling, src_nodata=src.nodata, dst_nodata=0)
            out = np.maximum(out, part)
    return out


def main():
    os.makedirs(CACHE, exist_ok=True)
    built = {}
    for y in EPOCHS:
        name = f'GHS_BUILT_S_E{y}_GLOBE_R2023A_4326_3ss_V1_0_R10_C30'
        url = f'{BASE}/GHS_BUILT_S_GLOBE_R2023A/GHS_BUILT_S_E{y}_GLOBE_R2023A_4326_3ss/V1-0/tiles/{name}.zip'
        built[y] = onto_grid([tile(url, name)], Resampling.nearest)
    land_paths = []
    for r in (10, 11):
        name = f'GHS_LAND_E2018_GLOBE_R2022A_54009_100_V1_0_R{r}_C30'
        url = f'{BASE}/GHS_LAND_GLOBE_R2022A/GHS_LAND_E2018_GLOBE_R2022A_54009_100/V1-0/tiles/{name}.zip'
        land_paths.append(tile(url, name))
    land_frac = onto_grid(land_paths, Resampling.average) / 10000.0   # m² of a 100 m cell → 0..1
    land_frac = np.clip(land_frac, 0, 1)

    # Metres per grid step at Bali's latitude.
    lat0 = (N + S) / 2
    dy_m = RES * 111_320
    dx_m = RES * 111_320 * math.cos(math.radians(lat0))
    cell_m2 = dx_m * dy_m
    sea = land_frac < 0.5
    dist_to_sea = distance_transform_edt(~sea, sampling=(dy_m, dx_m))

    ry, rx = math.ceil(RADIUS_M / dy_m), math.ceil(RADIUS_M / dx_m)
    yy, xx = np.mgrid[-ry:ry + 1, -rx:rx + 1]
    disk = (yy * dy_m) ** 2 + (xx * dx_m) ** 2 <= RADIUS_M ** 2

    listings = sb_get('listing_geo?select=kind,airtable_id,lat,lng')
    out = {}
    for l in listings:
        lat, lng = l['lat'], l['lng']
        if lat is None or lng is None or not (S < lat < N and W < lng < E):
            continue
        r0, c0 = int((N - lat) / RES), int((lng - W) / RES)
        if r0 - ry < 0 or c0 - rx < 0 or r0 + ry >= HEIGHT or c0 + rx >= WIDTH:
            continue
        win = (slice(r0 - ry, r0 + ry + 1), slice(c0 - rx, c0 + rx + 1))
        land_m2 = float((land_frac[win] * disk).sum() * cell_m2)
        if land_m2 < 0.2 * math.pi * RADIUS_M ** 2:
            continue   # pin in the sea or on a sliver of land — nothing honest to say
        pct = {str(y): round(100 * float((built[y][win] * disk).sum()) / land_m2, 1) for y in EPOCHS}
        out[(l['kind'], l['airtable_id'])] = {
            'built': {'src': 'GHSL R2023A (Copernicus/JRC)', 'radius_m': RADIUS_M, 'pct': pct},
            'coast_m': int(round(float(dist_to_sea[r0, c0]), -1)),
        }

    # Bali-wide context: where does each listing's 2010→2020 growth rank?
    growth = sorted(v['built']['pct']['2020'] - v['built']['pct']['2010'] for v in out.values())
    for v in out.values():
        g = v['built']['pct']['2020'] - v['built']['pct']['2010']
        v['built']['growth_rank'] = round(100 * sum(1 for x in growth if x <= g) / len(growth))

    print(f'listings={len(listings)} with built-up={len(out)}')
    for key in list(out)[:5]:
        b = out[key]['built']
        print(' ', key[1], {k: b['pct'][k] for k in ('2000', '2010', '2020')}, 'rank', b['growth_rank'],
              'coast', out[key]['coast_m'])

    existing = {(r['kind'], r['airtable_id']): r['climate'] for r in
                sb_get('listing_geo_facts?select=kind,airtable_id,climate')}
    by_id = {(l['kind'], l['airtable_id']): l for l in listings}
    rows = []
    for key, v in out.items():
        l = by_id[key]
        climate = existing.get(key) or {}
        rows.append({'kind': key[0], 'airtable_id': key[1], 'lat': l['lat'], 'lng': l['lng'],
                     'climate': {**climate, **v}})
    if APPLY:
        sb_upsert(rows)
        print(f'  written for {len(rows)} listings')
    else:
        print(f'  dry run: would write {len(rows)} listings (pass --apply)')


if __name__ == '__main__':
    main()
