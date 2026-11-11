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
import io
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
    thumb = render_thumb(a.lat, a.lon, a.radius, zones)
    if a.dry:
        open(f"/tmp/rdtr-{a.slug}.jpg", "wb").write(thumb)
        return
    for name, data, ctype in ((f"{a.slug}.json", body.encode(), "application/json"), (f"{a.slug}.jpg", thumb, "image/jpeg")):
        url = os.environ["NEXT_PUBLIC_SUPABASE_URL"] + f"/storage/v1/object/feeds/_rdtr-zones/{name}"
        key = os.environ["SUPABASE_SERVICE_KEY"]
        r = requests.post(url, data=data, headers={"apikey": key, "Authorization": f"Bearer {key}",
                                                   "Content-Type": ctype, "x-upsert": "true",
                                                   "Cache-Control": "max-age=86400"}, timeout=60)
        r.raise_for_status()
        print("uploaded", url.replace("/object/", "/object/public/"))


def render_thumb(lat, lon, radius, zones, size=480):
    """Квадратная картинка для карточки: спутник Esri, зоны, круг, точка."""
    from PIL import Image, ImageDraw
    mpp_target = radius / (size * 0.42)
    z = max(1, min(19, round(math.log2(156543.03392 * math.cos(math.radians(lat)) / mpp_target))))

    def px(la, lo):
        s_ = math.sin(math.radians(la)); n = 2 ** z * 256
        return (lo + 180) / 360 * n, (0.5 - math.log((1 + s_) / (1 - s_)) / (4 * math.pi)) * n

    cx, cy = px(lat, lon)
    x0, y0 = cx - size / 2, cy - size / 2
    img = Image.new("RGB", (size, size))
    for tx in range(int(x0 // 256), int((x0 + size) // 256) + 1):
        for ty in range(int(y0 // 256), int((y0 + size) // 256) + 1):
            u = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{ty}/{tx}"
            t = Image.open(io.BytesIO(requests.get(u, headers=HEADERS, timeout=30).content)).convert("RGB")
            img.paste(t, (int(tx * 256 - x0), int(ty * 256 - y0)))
    img = img.convert("RGBA")
    over = Image.new("RGBA", img.size, (0, 0, 0, 0))
    for zn in zones:
        col = tuple(int(zn["color"][i:i + 2], 16) for i in (1, 3, 5))
        g = zn["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"] if g["type"] == "MultiPolygon" else []
        for poly in polys:
            # Свой слой на полигон: внешний контур закрашиваем, дыры (кварталы
            # внутри сети дорог) вырезаем, иначе дорога заливает весь квартал.
            layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
            dl = ImageDraw.Draw(layer)
            rings = [[(px(la, lo)[0] - x0, px(la, lo)[1] - y0) for lo, la in ring] for ring in poly]
            if len(rings[0]) < 3:
                continue
            dl.polygon(rings[0], fill=col + (150,))
            for hole in rings[1:]:
                if len(hole) > 2:
                    dl.polygon(hole, fill=(0, 0, 0, 0))
            for ring in rings:
                dl.line(ring + [ring[0]], fill=(255, 255, 255, 150), width=1)
            over = Image.alpha_composite(over, layer)
    mpp = 156543.03392 * math.cos(math.radians(lat)) / 2 ** z
    R = radius / mpp
    img = Image.alpha_composite(img, over)
    dim = Image.new("RGBA", img.size, (12, 16, 14, 140))
    mask = Image.new("L", img.size, 255)
    ImageDraw.Draw(mask).ellipse([size / 2 - R, size / 2 - R, size / 2 + R, size / 2 + R], fill=0)
    img = Image.alpha_composite(img, Image.composite(dim, Image.new("RGBA", img.size, (0, 0, 0, 0)), mask))
    dd = ImageDraw.Draw(img)
    dd.ellipse([size / 2 - R, size / 2 - R, size / 2 + R, size / 2 + R], outline=(255, 255, 255, 230), width=3)
    dd.ellipse([size / 2 - 9, size / 2 - 9, size / 2 + 9, size / 2 + 9], fill=(229, 72, 77, 255), outline=(255, 255, 255, 255), width=3)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=82)
    return buf.getvalue()


if __name__ == "__main__":
    main()
