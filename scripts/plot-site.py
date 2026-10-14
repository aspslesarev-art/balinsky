"""What sits right at the plot: slope, the road that leads to it, rivers and the
coast — the things a buyer checks before a builder ever sees the land.

Sources (all free, no key):
  - slope: Copernicus DEM GLO-30 (30 m, AWS open data). A least-squares plane
    over a 5×5 window (~150 m) around the point. It is a surface model —
    roofs and tree crowns are in it, so in built-up or wooded spots the number
    is rough; the page says so.
  - road, rivers, coast: OpenStreetMap via Overpass (one download for all of
    Bali, cached in .tmp-plot/osm.json).

Setback rules shown on the page (national law, Bali follows it):
  - coast: no building within 100 m of the highest tide line
    (Perpres 51/2016 on coastal setbacks);
  - rivers: 3–100 m depending on the river, embankment and town/countryside
    (PP 38/2011 on rivers). We flag a river closer than 50 m — the exact
    setback has to be checked in the KKPR of the plot.

Writes listing_geo_facts.climate.plot.

  ~/.venvs/analytics/bin/python scripts/plot-site.py            # dry run
  ~/.venvs/analytics/bin/python scripts/plot-site.py --apply
"""
import glob
import json
import math
import os
import subprocess
import sys
import urllib.parse
import urllib.request

import numpy as np
import rasterio
from shapely import STRtree
from shapely.geometry import LineString, Point

APPLY = '--apply' in sys.argv
CACHE = '.tmp-plot'
BBOX = '-8.86,114.42,-8.05,115.72'
OVERPASS = 'https://overpass-api.de/api/interpreter'
DEM_TILES = ['S09_00_E114_00', 'S09_00_E115_00']
LAT0 = -8.5
KX = 111320 * math.cos(math.radians(LAT0))
KY = 110574

# What a car can reach, best first. Footpaths, steps and cycleways are not access.
ROAD_RANK = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified',
             'residential', 'living_street', 'service', 'track']
ROAD_RANK += [r + '_link' for r in ROAD_RANK[:5]]

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


def xy(lat, lon):
    return lon * KX, lat * KY


def fetch_osm():
    path = os.path.join(CACHE, 'osm.json')
    if not os.path.exists(path):
        q = (f'[out:json][timeout:600];(way["highway"]({BBOX});'
             f'way["waterway"~"^(river|stream|canal)$"]({BBOX});'
             f'way["natural"="coastline"](-8.95,114.35,-7.95,115.80););out tags geom;')
        data = urllib.parse.urlencode({'data': q}).encode()
        req = urllib.request.Request(OVERPASS, data=data, headers={'User-Agent': 'balinsky-tools/1.0'})
        with open(path, 'wb') as f:
            f.write(urllib.request.urlopen(req, timeout=900).read())
    return json.load(open(path))['elements']


def fetch_dem():
    for t in DEM_TILES:
        name = f'Copernicus_DSM_COG_10_{t}_DEM'
        path = os.path.join(CACHE, name + '.tif')
        if not os.path.exists(path):
            subprocess.run(['curl', '-sf', '-o', path,
                            f'https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif'], check=True)
    return [rasterio.open(p) for p in sorted(glob.glob(os.path.join(CACHE, 'Copernicus_DSM_*.tif')))]


def slope_pct(dems, lat, lon):
    """Plane fit over 5×5 cells; returns the fall in % (rise over run)."""
    for d in dems:
        b = d.bounds
        if not (b.left <= lon < b.right and b.bottom <= lat < b.top):
            continue
        r, c = d.index(lon, lat)
        win = d.read(1, window=((r - 2, r + 3), (c - 2, c + 3)))
        if win.shape != (5, 5) or np.any(win <= -100):
            return None
        dy = abs(d.transform.e) * KY
        dx = abs(d.transform.a) * KX
        ys, xs = np.mgrid[-2:3, -2:3]
        A = np.column_stack([xs.ravel() * dx, -ys.ravel() * dy, np.ones(25)])
        (gx, gy, _), *_ = np.linalg.lstsq(A, win.ravel().astype(float), rcond=None)
        return round(100 * math.hypot(gx, gy), 1)
    return None


def layer(ways):
    geoms = [LineString([xy(p['lat'], p['lon']) for p in w['geometry']]) for w in ways]
    return geoms, STRtree(geoms)


def nearest(index, p):
    geoms, tree = index
    i = tree.nearest(p)
    return i, geoms[i].distance(p)


def width_m(tags):
    w = tags.get('width') or tags.get('est_width')
    try:
        return float(str(w).replace('m', '').replace(',', '.').strip()) if w else None
    except ValueError:
        return None


def main():
    os.makedirs(CACHE, exist_ok=True)
    els = [e for e in fetch_osm() if e.get('type') == 'way' and len(e.get('geometry') or []) >= 2]
    roads = [e for e in els if e['tags'].get('highway') in ROAD_RANK]
    big_roads = [e for e in roads if e['tags']['highway'].replace('_link', '') in ROAD_RANK[:5]]
    rivers = [e for e in els if e['tags'].get('waterway') == 'river']
    streams = [e for e in els if e['tags'].get('waterway') == 'stream']
    coast = [e for e in els if e['tags'].get('natural') == 'coastline']
    print(f'OSM ways: roads {len(roads)} (main {len(big_roads)}), rivers {len(rivers)}, '
          f'streams {len(streams)}, coastline {len(coast)}')
    idx = {k: layer(v) for k, v in
           [('road', roads), ('big', big_roads), ('river', rivers), ('stream', streams), ('coast', coast)]}
    dems = fetch_dem()

    facts = sb_get('listing_geo_facts?select=kind,airtable_id,lat,lng,climate')
    rows, stats = [], {'steep': 0, 'coast100': 0, 'river50': 0, 'far_road': 0}
    for r in facts:
        if r['lat'] is None or r['lng'] is None:
            continue
        p = Point(*xy(r['lat'], r['lng']))
        i, d_road = nearest(idx['road'], p)
        t = roads[i]['tags']
        j, d_big = nearest(idx['big'], p)
        tb = big_roads[j]['tags']
        _, d_river = nearest(idx['river'], p)
        _, d_stream = nearest(idx['stream'], p)
        _, d_coast = nearest(idx['coast'], p)
        plot = {
            'src': 'OpenStreetMap; Copernicus DEM GLO-30',
            'slope_pct': slope_pct(dems, r['lat'], r['lng']),
            'road': {'m': round(d_road), 'class': t['highway'], 'name': t.get('name'),
                     'width_m': width_m(t), 'surface': t.get('surface'), 'lanes': t.get('lanes')},
            'main_road': {'m': round(d_big), 'class': tb['highway'], 'name': tb.get('name')},
            'river_m': round(d_river),
            'stream_m': round(d_stream),
            'coast_m': round(d_coast),
        }
        s = plot['slope_pct']
        stats['steep'] += bool(s is not None and s >= 15)
        stats['coast100'] += d_coast < 100
        stats['river50'] += min(d_river, d_stream) < 50
        stats['far_road'] += d_road > 100
        c = r['climate'] or {}
        rows.append({'kind': r['kind'], 'airtable_id': r['airtable_id'], 'lat': r['lat'], 'lng': r['lng'],
                     'climate': {**c, 'plot': plot}})

    print(f'listings: {len(rows)}; slope ≥15%: {stats["steep"]}; coast <100 m: {stats["coast100"]}; '
          f'river/stream <50 m: {stats["river50"]}; road >100 m away: {stats["far_road"]}')
    for x in rows[:3]:
        print(x['kind'], x['airtable_id'], json.dumps(x['climate']['plot'], ensure_ascii=False))
    if APPLY:
        sb_upsert(rows)
        print('written')


if __name__ == '__main__':
    main()
