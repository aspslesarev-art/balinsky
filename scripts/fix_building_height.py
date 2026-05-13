#!/usr/bin/env python3
"""
One-shot cleanup: walk every villa/apartment/complex_land_profile row
that has the raw GISTARU response cached in `raw_response`, recompute
Building_Height via the cleaner simplify_building_height() helper, and
rewrite it back. Avoids hitting the GISTARU API since we already have
the source payload.
"""
import os, sys
from pathlib import Path
import requests

sys.path.insert(0, str(Path(__file__).parent))
from land_profile import simplify_building_height  # noqa: E402

def load_env():
    p = Path('.env.local')
    for line in p.read_text().splitlines():
        if not line or line.startswith('#') or '=' not in line: continue
        k, v = line.split('=', 1)
        if k.strip() not in os.environ:
            os.environ[k.strip()] = v.strip().strip('"').strip("'")

def main():
    load_env()
    SB = os.environ['NEXT_PUBLIC_SUPABASE_URL']
    KEY = os.environ['SUPABASE_SERVICE_KEY']
    h = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

    tables = ['villa_land_profile', 'apartment_land_profile', 'complex_land_profile']
    for tab in tables:
        print(f'\n=== {tab} ===', file=sys.stderr)
        # Pull rows that have a raw response + a probably-bad building_height
        # (long string). We re-derive for every row anyway since the new
        # logic is idempotent for clean strings ("15 m" stays "15 m").
        page = 200
        offset = 0
        updated = 0
        unchanged = 0
        while True:
            r = requests.get(
                f'{SB}/rest/v1/{tab}?select=airtable_id,building_height,raw_response&limit={page}&offset={offset}',
                headers=h, timeout=30,
            )
            r.raise_for_status()
            batch = r.json()
            if not batch:
                break
            for row in batch:
                raw = row.get('raw_response') or {}
                ktgbgn = raw.get('ktgbgn')
                new_h = simplify_building_height(ktgbgn)
                if new_h == row.get('building_height'):
                    unchanged += 1
                    continue
                u = requests.patch(
                    f'{SB}/rest/v1/{tab}?airtable_id=eq.{row["airtable_id"]}',
                    json={'building_height': new_h},
                    headers={**h, 'Prefer': 'return=minimal'}, timeout=30,
                )
                if u.status_code in (200, 204):
                    updated += 1
                else:
                    print(f'  patch {row["airtable_id"]} failed: {u.status_code} {u.text[:100]}', file=sys.stderr)
            if len(batch) < page:
                break
            offset += page
        print(f'  {tab}: updated {updated}, unchanged {unchanged}', file=sys.stderr)

if __name__ == '__main__':
    main()
