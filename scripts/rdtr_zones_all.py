#!/usr/bin/env python3
"""
Зоны RDTR вокруг ВСЕХ вилл и апартаментов (не только CITRINE).

Координаты берём из villa_land_profile / apartment_land_profile. Соседние
объекты (одна клетка ~110 м) делят один файл: feeds/_rdtr-zones/p_<lat>_<lon>.json
(+ .jpg). Какой объект какой файл читает - feeds/_rdtr-zones/_index.json
{airtable_id: key}. Уже скачанные клетки пропускаем - можно перезапускать.

Usage: python3 scripts/rdtr_zones_all.py [--radius 500] [--workers 3] [--force]
"""
import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

sys.path.insert(0, os.path.dirname(__file__))
from rdtr_zones import build, load_env, upload  # noqa: E402


def rows(table, sel, U, H):
    out, off = [], 0
    while True:
        r = requests.get(f"{U}/rest/v1/{table}?select={sel}&limit=1000&offset={off}", headers=H, timeout=60)
        r.raise_for_status()
        j = r.json()
        out += j
        if len(j) < 1000:
            return out
        off += 1000


def main():
    load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("--radius", type=int, default=500)
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    U, K = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
    H = {"apikey": K, "Authorization": f"Bearer {K}"}

    cells, plots = {}, {}
    for t in ("villa_land_profile", "apartment_land_profile"):
        for r in rows(t, "airtable_id,lat,lon,subzona_name,subzona_code", U, H):
            if r["lat"] and r["lon"]:
                key = f"p_{r['lat']:.3f}_{r['lon']:.3f}".replace("-", "m")
                cells.setdefault(key, {"lat": r["lat"], "lon": r["lon"], "ids": []})["ids"].append(r["airtable_id"])
                plots[r["airtable_id"]] = (r.get("subzona_name"), r.get("subzona_code"))

    pub = f"{U}/storage/v1/object/public/feeds/_rdtr-zones"
    old = requests.get(f"{pub}/_index.json", timeout=30)
    index = old.json() if old.ok else {}
    done = {v["k"] if isinstance(v, dict) else v for v in index.values()}
    todo = [k for k in cells if a.force or k not in done]
    if a.limit:
        todo = todo[: a.limit]
    print(f"объектов {sum(len(c['ids']) for c in cells.values())}, клеток {len(cells)}, качать {len(todo)}", flush=True)

    def entry(aid, key):
        # Своя зона участка объекта (land_profile): соседи по клетке ~110 м
        # могут стоять на разных зонах, а файл зон у них общий.
        n, c = plots.get(aid) or (None, None)
        return {"k": key, "n": n, "c": c} if n else key

    def one(key):
        c = cells[key]
        for attempt in range(3):
            try:
                body, thumb = build(c["lat"], c["lon"], a.radius, verbose=False)
                if body is None:
                    return key, "no-rdtr"
                upload(key, body, thumb)
                return key, "ok"
            except Exception as e:  # GISTARU иногда отвечает 5xx - повторяем
                err = e
                time.sleep(10 * (attempt + 1))
        return key, f"err {err}"

    stats, t0 = {}, time.time()
    with ThreadPoolExecutor(a.workers) as ex:
        futs = [ex.submit(one, k) for k in todo]
        for i, f in enumerate(as_completed(futs), 1):
            key, st = f.result()
            stats[st[:6]] = stats.get(st[:6], 0) + 1
            if st == "ok":
                for aid in cells[key]["ids"]:
                    index[aid] = entry(aid, key)
            if st != "ok" or i % 10 == 0:
                print(f"{i}/{len(todo)} {key} {st} | {stats} | {int(time.time() - t0)}s", flush=True)
            if i % 20 == 0 or i == len(todo):
                upload("_index", json.dumps(index, separators=(",", ":")), None)
    for key in cells:  # объекты, добавленные в уже скачанную клетку
        if key in done:
            for aid in cells[key]["ids"]:
                index[aid] = entry(aid, key)
    upload("_index", json.dumps(index, separators=(",", ":")), None)
    print("готово", stats, "объектов в индексе", len(index))


if __name__ == "__main__":
    main()
