"""Coastal flood margin for listings near the sea.

Copernicus "Global sea level change indicators 1950–2050" (Deltares GTSM,
CMIP6 high-res; sis-water-level-change-indicators-cmip6), 27 coastal points
around Bali:
  - the 100-year total water level (tide + storm surge), 1985–2014 reanalysis;
  - the same for 2021–2050, multi-model ensemble mean;
  - mean sea level change for 2021–2050.
Waves (run-up) are NOT in these numbers — on Bali's surf coasts they add more
than the surge does, which is why the page says so.

For each listing within COAST_MAX_M of the sea (climate.coast_m, written by
ghsl-builtup.py) we take the nearest point and compare against the plot's
height (elevation_m, SRTM 30 m — a few metres of error, biased high under
trees and roofs). Margin = height − (100-year level 2021–2050 + sea level
change); adding the rise on top is the cautious reading.

Writes listing_geo_facts.climate.sea. Free; downloads cached in .tmp-sea.

  ~/.venvs/analytics/bin/python scripts/sea-level-risk.py            # dry run
  ~/.venvs/analytics/bin/python scripts/sea-level-risk.py --apply
"""
import glob
import json
import math
import os
import sys
import urllib.request
import zipfile

import cdsapi
import numpy as np
import xarray as xr

APPLY = '--apply' in sys.argv
CACHE = '.tmp-sea'
COAST_MAX_M = 1500
DATASET = 'sis-water-level-change-indicators-cmip6'
JOBS = {
    'twl_hist': {'variable': ['total_water_level'], 'derived_variable': ['absolute_value'],
                 'product_type': ['reanalysis'], 'statistic': ['100_year'], 'confidence_interval': ['best_fit'],
                 'experiment': ['historical'], 'period': ['1985_2014']},
    'twl_fut': {'variable': ['total_water_level'], 'derived_variable': ['absolute_value'],
                'product_type': ['multi_model_ensemble'], 'multi_model_ensemble_statistic': ['ensemble_mean'],
                'statistic': ['100_year'], 'confidence_interval': ['best_fit'],
                'experiment': ['future'], 'period': ['2021_2050']},
    'msl_change': {'variable': ['mean_sea_level'], 'derived_variable': ['absolute_change'],
                   'product_type': ['multi_model_ensemble'], 'multi_model_ensemble_statistic': ['ensemble_mean'],
                   'experiment': ['future'], 'period': ['2021_2050']},
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


def load(name):
    folder = os.path.join(CACHE, name)
    if not glob.glob(os.path.join(folder, '*.nc')):
        z = os.path.join(CACHE, name + '.zip')
        cdsapi.Client(quiet=True, progress=False, timeout=120).retrieve(DATASET, JOBS[name]).download(z)
        with zipfile.ZipFile(z) as f:
            f.extractall(folder)
    d = xr.open_dataset(glob.glob(os.path.join(folder, '*.nc'))[0])
    var = list(d.data_vars)[0]
    return d['station_y_coordinate'].values, d['station_x_coordinate'].values, d[var].values.squeeze()


def main():
    os.makedirs(CACHE, exist_ok=True)
    lat, lon, hist = load('twl_hist')
    lat2, lon2, fut = load('twl_fut')
    lat3, lon3, msl = load('msl_change')
    assert np.allclose(lat, lat2) and np.allclose(lat, lat3), 'station lists differ between files'
    bali = (lat > -9.2) & (lat < -7.8) & (lon > 114.2) & (lon < 116.0) & np.isfinite(fut) & np.isfinite(hist)
    st = [(float(a), float(b), float(h), float(f), float(m) if np.isfinite(m) else 0.0)
          for a, b, h, f, m in zip(lat[bali], lon[bali], hist[bali], fut[bali], msl[bali])]
    print(f'stations around Bali: {len(st)}')

    facts = sb_get('listing_geo_facts?select=kind,airtable_id,lat,lng,elevation_m,climate')
    rows = []
    for r in facts:
        c = r['climate'] or {}
        coast = c.get('coast_m')
        if coast is None or coast > COAST_MAX_M or r['elevation_m'] is None:
            continue
        kx = math.cos(math.radians(r['lat']))
        s = min(st, key=lambda s: (s[0] - r['lat']) ** 2 + ((s[1] - r['lng']) * kx) ** 2)
        dist_km = 111.32 * math.hypot(s[0] - r['lat'], (s[1] - r['lng']) * kx)
        level = s[3] + s[4]
        sea = {
            'src': 'Copernicus C3S, Deltares GTSM CMIP6',
            'station_km': round(dist_km, 1),
            'twl100_1985_2014': round(s[2], 2),
            'twl100_2021_2050': round(s[3], 2),
            'msl_rise_2050': round(s[4], 2),
            'elevation_m': round(float(r['elevation_m']), 1),
            'margin_m': round(float(r['elevation_m']) - level, 1),
        }
        rows.append({'kind': r['kind'], 'airtable_id': r['airtable_id'], 'lat': r['lat'], 'lng': r['lng'],
                     'climate': {**c, 'sea': sea}})

    margins = sorted(x['climate']['sea']['margin_m'] for x in rows)
    if margins:
        print(f'coastal listings: {len(rows)}; margin min {margins[0]} m, median {margins[len(margins) // 2]} m; '
              f'<3 m: {sum(1 for m in margins if m < 3)}, 3–8 m: {sum(1 for m in margins if 3 <= m < 8)}')
    if APPLY:
        sb_upsert(rows)
        print(f'  written for {len(rows)} listings')
    else:
        print(f'  dry run: would write {len(rows)} listings (pass --apply)')


if __name__ == '__main__':
    main()
