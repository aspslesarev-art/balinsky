#!/usr/bin/env python3
"""Fetch og:image photos for sale comp villas. Saves incrementally."""

import json, re, sys, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

DATA_DIR = Path(__file__).parent.parent / 'data'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
TIMEOUT = 5
WORKERS = 8
SAVE_EVERY = 200

OG_RE = [
    re.compile(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', re.I),
    re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', re.I),
    re.compile(r'og:image["\'][^>]*content=["\']([^"\']+)["\']', re.I),
    re.compile(r'content=["\']([^"\']+)["\'][^>]*og:image', re.I),
]


def fetch_og(url):
    try:
        req = Request(url, headers={'User-Agent': UA})
        with urlopen(req, timeout=TIMEOUT) as r:
            html = r.read().decode('utf-8', errors='ignore')[:40000]
        for pat in OG_RE:
            m = pat.search(html)
            if m:
                img = m.group(1).strip()
                if img.startswith('http') and 'logo' not in img.lower():
                    return img
    except Exception:
        pass
    return None


def process(path, save_path=None):
    if not path.exists():
        return
    with open(path) as f:
        data = json.load(f)
    need = [(i, v) for i, v in enumerate(data) if v.get('url') and v['url'].startswith('http') and not v.get('photo')]
    total = len(need)
    print(f'  {path.name}: {total} need photos', flush=True)
    if not total:
        return

    ok = 0
    fail = 0

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = {pool.submit(fetch_og, v['url']): (i, v) for i, v in need}
        for fut in as_completed(futs, timeout=total * 2 + 60):
            idx, item = futs[fut]
            try:
                photo = fut.result(timeout=1)
            except Exception:
                photo = None
            if photo:
                item['photo'] = photo
                ok += 1
            else:
                fail += 1
            done = ok + fail
            if done % SAVE_EVERY == 0 or done == total:
                with open(save_path or path, 'w') as f:
                    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
                print(f'    {done}/{total} — {ok} photos, saved', flush=True)

    with open(save_path or path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f'  DONE: {ok} photos, {fail} without', flush=True)


if __name__ == '__main__':
    t0 = time.time()
    print('[new_sources_villas.json]', flush=True)
    process(DATA_DIR / 'new_sources_villas.json')
    print(f'\n[propertia_villas.json]', flush=True)
    process(DATA_DIR / 'propertia_villas.json')
    dt = time.time() - t0
    print(f'\nTotal: {dt:.0f}s', flush=True)
