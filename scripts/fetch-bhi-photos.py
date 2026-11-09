#!/usr/bin/env python3
"""Fetch og:image photos for BHI villas."""

import json, re, sys, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

DATA_DIR = Path(__file__).parent.parent / 'data'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
TIMEOUT = 12
MAX_WORKERS = 4
DELAY = 0.2

OG_PATTERNS = [
    re.compile(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', re.I),
    re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', re.I),
    re.compile(r'og:image["\'][^>]*content=["\']([^"\']+)["\']', re.I),
    re.compile(r'content=["\']([^"\']+)["\'][^>]*og:image', re.I),
]


def build_url(v):
    area = re.sub(r'[^a-z0-9]+', '-', (v.get('area') or '').lower()).strip('-')
    tenure = v.get('tenure', 'leasehold')
    slug = v.get('slug', '')
    return f'https://bali-home-immo.com/realestate-property/for-sale/villa/{tenure}/{area}/{slug}'


def fetch_og_image(url):
    try:
        req = Request(url, headers=HEADERS)
        with urlopen(req, timeout=TIMEOUT) as resp:
            html = resp.read().decode('utf-8', errors='ignore')[:60000]
        for pat in OG_PATTERNS:
            m = pat.search(html)
            if m:
                img = m.group(1).strip()
                if img.startswith('http') and 'logo' not in img.lower():
                    return img
    except (URLError, HTTPError, OSError, TimeoutError):
        pass
    return None


def main():
    path = DATA_DIR / 'bhi_villas.json'
    with open(path) as f:
        data = json.load(f)

    villas = [v for v in data if v.get('type') == 'villa' and v.get('slug') and not v.get('photo')]
    print(f'BHI: {len(villas)} villas need photos', flush=True)

    fetched = 0
    errors = 0

    def do_fetch(v):
        url = build_url(v)
        return v, url, fetch_og_image(url)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {}
        for v in villas:
            f = pool.submit(do_fetch, v)
            futures[f] = v
            time.sleep(DELAY)

        for f in as_completed(futures):
            v, url, photo = f.result()
            if photo:
                v['photo'] = photo
                v['url'] = url
                fetched += 1
            else:
                errors += 1

            done = fetched + errors
            if done % 100 == 0:
                print(f'  progress: {done}/{len(villas)} ({fetched} photos)', flush=True)

    print(f'Done: {fetched} photos, {errors} without', flush=True)

    with open(path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f'Saved: {path.name}', flush=True)


if __name__ == '__main__':
    main()
