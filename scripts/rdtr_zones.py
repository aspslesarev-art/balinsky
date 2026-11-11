#!/usr/bin/env python3
"""
Зоны плана застройки (RDTR) вокруг объекта - для карты «Зоны вокруг» в
разделе «Участок» (components/ZoningMap.tsx, владелец 2026-11-11).

Источник - GISTARU ATR/BPN, тот же, что в scripts/land_profile.py:
  1. /rdtrinteraktif/api/interactive/data - зона точки и её правила;
  2. /rdtrinteraktif/api/interactive/rdtr/<kab> - слои RDTR кабупатена;
  3. полигоны слоёв в радиусе - через публичный прокси просмотрщика
     (gistaru-proxy.atrbpn.go.id/proxy.ashx), цвета - из легенды слоя.
Скачиваем один раз на объект и кладём в Storage, сайт GISTARU не дёргаем
на каждого посетителя.

Usage:
  python scripts/rdtr_zones.py --slug citrine --lat -8.559895 --lon 115.263228
  (env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY - берутся из .env.local)
"""
import argparse
import json
import math
import os
import sys
import urllib.parse

import requests
from shapely.geometry import Point, mapping, shape
from shapely.ops import transform, unary_union

API = "https://gistaru.atrbpn.go.id/rdtrinteraktif/api/interactive"
PROXY = "https://gistaru-proxy.atrbpn.go.id/proxy.ashx?"
ARCGIS = "https://gistaru.atrbpn.go.id/arcgis/rest/services/"
HEADERS = {"User-Agent": "Mozilla/5.0", "Referer": "https://gistaru.atrbpn.go.id/rdtrinteraktif/"}
BALI_KAB = ["5171000000", "5103000000", "5104000000", "5102000000", "5105000000",
            "5106000000", "5107000000", "5108000000", "5101000000"]


def load_env():
    path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    if not os.path.exists(path):
        return
    for line in open(path):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k, v.strip().strip('"'))


def get(url, **params):
    r = requests.get(url, params=params or None, headers=HEADERS, timeout=60)
    r.raise_for_status()
    return r.json()


def point_zone(lat, lon):
    for kab in BALI_KAB:
        try:
            j = get(f"{API}/data", id_wilayah=kab, latitude=lat, longitude=lon)
        except Exception:
            continue
        d = j.get("data")
        if isinstance(d, dict) and d.get("kodszn"):
            return kab, d
    return None, None


def first(v):
    return v[0] if isinstance(v, list) and v else v


def main():
    load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug", required=True)
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--radius", type=int, default=1000)
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()

    kab, pz = point_zone(a.lat, a.lon)
    if not kab:
        sys.exit("RDTR для точки не найден")
    layers = get(f"{API}/rdtr/{kab}")["data"]

    kx = 111320 * math.cos(math.radians(a.lat))
    to_m = lambda x, y, z=None: ((x - a.lon) * kx, (y - a.lat) * 111320)
    to_ll = lambda x, y, z=None: (round(x / kx + a.lon, 6), round(y / 111320 + a.lat, 6))
    circle = Point(0, 0).buffer(a.radius, 128)

    colors, parts = {}, {}
    for L in layers:
        base = ARCGIS + L["url_mapserver"] + f"/{L.get('sublayer_mapserver') or 0}"
        q = urllib.parse.urlencode({
            "f": "geojson", "geometry": f"{a.lon},{a.lat}", "geometryType": "esriGeometryPoint", "inSR": 4326,
            "distance": a.radius + 50, "units": "esriSRUnit_Meter", "spatialRel": "esriSpatialRelIntersects",
            "outFields": "NAMSZN,KODSZN", "returnGeometry": "true", "outSR": 4326, "geometryPrecision": 6,
        })
        try:
            fc = get(PROXY + base + "/query?" + q)
        except Exception as e:
            print("skip", L["rtr"], e)
            continue
        feats = fc.get("features") or []
        if not feats:
            continue
        info = get(PROXY + base + "?f=json")
        for u in info.get("drawingInfo", {}).get("renderer", {}).get("uniqueValueInfos", []):
            colors[u["value"]] = "#%02X%02X%02X" % tuple(u["symbol"]["color"][:3])
        for f in feats:
            p = f.get("properties") or {}
            name = p.get("NAMSZN")
            if not name or not f.get("geometry"):
                continue
            g = transform(to_m, shape(f["geometry"])).buffer(0).intersection(circle)
            if g.is_empty:
                continue
            parts.setdefault((name, p.get("KODSZN")), []).append(g)
        print(L["rtr"], len(feats))

    zones, total = [], circle.area
    for (name, code), gs in parts.items():
        g = unary_union(gs).simplify(1.0)
        if g.is_empty:
            continue
        zones.append({
            "name": name, "code": code, "color": colors.get(name, "#BBBBBB"),
            "share": round(g.area / total, 4),
            "geometry": mapping(transform(to_ll, g)),
        })
    zones.sort(key=lambda z: -z["share"])

    out = {
        "center": [a.lon, a.lat], "radius": a.radius, "source": "GISTARU ATR/BPN",
        "regulation": pz.get("nothpr"), "fetchedAt": __import__("datetime").date.today().isoformat(),
        "plot": {"name": pz.get("namszn"), "code": pz.get("kodszn"), "kdb": first(pz.get("kdb")),
                 "kdh": first(pz.get("kdh")), "klb": first(pz.get("klb")), "village": pz.get("wadmkd")},
        "zones": zones,
    }
    body = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    print(f"zones={len(zones)} size={len(body)//1024}KB plot={out['plot']['code']}")
    for z in zones[:12]:
        print(f"  {z['share']*100:5.1f}%  {z['code']}  {z['name']}")
    if a.dry:
        return
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"] + f"/storage/v1/object/feeds/_rdtr-zones/{a.slug}.json"
    key = os.environ["SUPABASE_SERVICE_KEY"]
    r = requests.post(url, data=body.encode(), headers={"apikey": key, "Authorization": f"Bearer {key}",
                                                         "Content-Type": "application/json", "x-upsert": "true",
                                                         "Cache-Control": "max-age=86400"}, timeout=60)
    r.raise_for_status()
    print("uploaded", url.replace("/object/", "/object/public/"))


if __name__ == "__main__":
    main()
