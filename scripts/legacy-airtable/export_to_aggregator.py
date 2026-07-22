#!/usr/bin/env python3
"""Generate aggregator XML feed from Balinsky villa database.

Schema target: realting.com `<object type="3">` (sample_import_object_ru.xml).

Data source:
  - Villa records: Airtable directly (uses AIRTABLE_TOKEN)
  - Descriptions RU/EN: from Airtable columns ` Aggregator:RU ` / `Aggregator:EN`
    (manually rewritten by user — no Claude call here)
  - Photos: Supabase Storage public manifest
  - Nearby places (for location tags): Supabase Storage public manifest

SEO-protection per villa:
  - Top-100 by price desc, must have non-empty Aggregator:RU + ≥3 photos
  - Coords rounded to 2 decimals (~1km accuracy)
  - Address truncated to "district, country" (no streets)
  - <external_url> NOT emitted (no backlink to deep pages)
  - Descriptions taken as-is from Airtable (already rewritten by user)

Usage:
  pip install -r scripts/requirements.txt
  python scripts/export_to_aggregator.py --dry-run     # first 3 villas
  python scripts/export_to_aggregator.py               # full 100 villas
"""

import argparse
import json
import math
import os
import re
import sys
from pathlib import Path
from typing import Any

import requests
from lxml import etree

# --- constants

HERE = Path(__file__).resolve().parent
ENV_FILE = HERE.parent / '.env.local'
OUT_PATH = HERE / 'out' / 'villas-aggregator.xml'

MAX_VILLAS = 100
MAX_PHOTOS = 5
MIN_PHOTOS = 3
DRY_RUN_LIMIT = 3

TARGET_LANGS = ['ru', 'en']

AIRTABLE_BASE = 'appAwgCAwOIQs2DJh'
AIRTABLE_TABLE = 'tblRD00AhDNrpW3DA'

# Aggregator-specific Airtable column names (note the leading/trailing space in `Aggregator:RU `)
COL_AGG_RU = ' Aggregator:RU '   # Airtable preserves spaces — match exactly
COL_AGG_EN = 'Aggregator:EN'
COL_AGG_TITLE_RU = 'Aggregator:Title:RU'
COL_AGG_TITLE_EN = 'Aggregator:Title:EN'

# Bali airport (Ngurah Rai)
AIRPORT_LAT = -8.7467
AIRPORT_LNG = 115.1667

DEFAULT_SELLER = {
    'user_name': {'ru': 'Андрей', 'en': 'Andrei'},
    'user_surname': {'ru': 'Слесарев', 'en': 'Slesarev'},
    'user_email': 'asp.slesarev@gmail.com',
    'user_phone': '+62 821 0000 0000',  # TODO: replace with real number
    'user_avatar_url': None,
}


# --- env / utils

def load_env() -> None:
    if not ENV_FILE.exists():
        sys.exit(f'Missing env file: {ENV_FILE}')
    for raw in ENV_FILE.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        m = re.match(r'^([A-Z_][A-Z0-9_]*)=(.*)$', line)
        if not m:
            continue
        k = m.group(1)
        v = m.group(2).strip().strip('"').strip("'")
        os.environ.setdefault(k, v)


def first_string(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, str):
        s = v.strip()
        return s or None
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list) and v:
        return first_string(v[0])
    if isinstance(v, dict) and 'value' in v:
        return first_string(v['value'])
    return None


def number_or_none(v: Any) -> float | None:
    if v is None:
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v) if math.isfinite(float(v)) else None
    if isinstance(v, str):
        try:
            n = float(v.replace(' ', '').replace(',', '.'))
            return n if math.isfinite(n) else None
        except ValueError:
            return None
    if isinstance(v, list) and v:
        return number_or_none(v[0])
    if isinstance(v, dict) and 'value' in v:
        return number_or_none(v['value'])
    return None


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLng = math.radians(lng2 - lng1)
    a = (math.sin(dLat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLng / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


# --- tag heuristics

def detect_view_tags(text: str | None) -> list[int]:
    if not text:
        return []
    t = text.lower()
    tags = []
    if re.search(r'(вид на море|sea view|ocean view|вид на океан|on the ocean)', t):
        tags.append(426)  # Вид на море
    if re.search(r'(вид на горы|mountain view)', t):
        tags.append(395)  # Вид на горы
    if re.search(r'(панорам|panoram)', t):
        tags.append(1569)  # Панорамный вид
    if re.search(r'(вид на сад|garden view|вид на двор|courtyard)', t):
        tags.append(1591)  # Вид на двор
    if re.search(r'(вид на природ|nature view|jungle|джунгл|rice field|рисов)', t):
        tags.append(1931)  # Вид на природу
    return list(set(tags))


def detect_exterior_tags(d: dict, all_text: str) -> list[int]:
    tags = []
    pool = first_string(d.get('Бассейн')) or first_string(d.get('Pool'))
    if pool and not re.search(r'\b(нет|no)\b', pool, re.I):
        tags.append(495)  # Бассейн
    t = all_text.lower()
    if re.search(r'(сад\b|garden)', t): tags.append(29)
    if re.search(r'(терраса|terrace|rooftop|крыш)', t): tags.append(273)
    if re.search(r'(гараж|garage|carport|парковк|parking)', t): tags.append(8)
    if re.search(r'(беседк|gazebo)', t): tags.append(1704)
    if re.search(r'(патио|patio)', t): tags.append(128)
    if re.search(r'(барбекю|bbq|barbecue|мангал)', t): tags.append(283)
    if re.search(r'(детск[аи][ея] площадк|playground)', t): tags.append(960)
    if re.search(r'(тренаж[её]р|gym\b|fitness)', t): tags.append(1564)
    return sorted(set(tags))


def detect_interior_tags(d: dict, all_text: str) -> list[int]:
    tags = []
    t = all_text.lower()
    if re.search(r'(меблир|furnish|с мебелью)', t): tags.append(1)
    if re.search(r'(джакузи|jacuzzi)', t): tags.append(3)
    if re.search(r'(камин|fireplace)', t): tags.append(33)
    if re.search(r'(сауна|sauna)', t): tags.append(100)
    if re.search(r'(гардероб|walk-in|wardrobe)', t): tags.append(326)
    if re.search(r'(высокие потолки|high ceiling|vaulted)', t): tags.append(2998)
    if re.search(r'(кладов|storage room)', t): tags.append(278)
    if re.search(r'(прачечн|laundry)', t): tags.append(1576)
    return sorted(set(tags))


def detect_location_tags(lat: float, lng: float, beaches: list[dict]) -> list[int]:
    tags = []
    if haversine_km(lat, lng, AIRPORT_LAT, AIRPORT_LNG) < 10:
        tags.append(5059)  # Близко к аэропорту
    if beaches:
        nearest = sorted(beaches, key=lambda b: b.get('distanceKm', 999))[0]
        d_m = nearest.get('distanceKm', 999) * 1000 * 1.3  # walking est
        if d_m < 100:
            tags.append(1621)  # Первая береговая линия
            tags.append(577)   # Возле пляжа
        elif d_m < 500:
            tags.append(577)
        elif d_m < 1500:
            tags.append(674)   # Возле моря
    return sorted(set(tags))


def detect_additionally_tags(leasehold_years: float | None) -> list[int]:
    # Default for Bali: рассрочка/ВНЖ часто доступны через пакет, удалённая сделка возможна
    tags = [6839]  # Удаленная сделка
    if leasehold_years is None or leasehold_years > 25:
        tags.append(6837)  # Предоставление ВНЖ (через инвестиции в недвижимость)
    return tags


# --- airtable data load

def fetch_villas_from_airtable(token: str) -> list[dict]:
    """Returns Airtable records (with `id` and `fields`)."""
    out = []
    offset = None
    while True:
        params = {'pageSize': '100'}
        if offset:
            params['offset'] = offset
        r = requests.get(
            f'https://api.airtable.com/v0/{AIRTABLE_BASE}/{AIRTABLE_TABLE}',
            headers={'Authorization': f'Bearer {token}'},
            params=params,
            timeout=60,
        )
        if not r.ok:
            sys.exit(f'Airtable {r.status_code}: {r.text[:200]}')
        j = r.json()
        out.extend(j.get('records', []))
        offset = j.get('offset')
        if not offset:
            break
    return out


def fetch_photo_manifest(base_url: str) -> dict[str, list[str]]:
    url = f'{base_url}/storage/v1/object/public/villa-photos/_manifest.json'
    r = requests.get(url, timeout=30)
    if not r.ok:
        return {}
    return r.json() or {}


def fetch_nearby_places(base_url: str) -> dict:
    url = f'{base_url}/storage/v1/object/public/competitors/_nearby_places.json'
    r = requests.get(url, timeout=60)
    if not r.ok:
        return {}
    return r.json() or {}


# --- mapping

def extract_villa(record: dict, photo_manifest: dict, nearby_places: dict) -> dict | None:
    d = record.get('fields') or {}
    villa_id = record['id']

    if d.get('Опубликовать') is not True:
        return None

    lat = number_or_none(d.get('Geo'))
    lng = number_or_none(d.get('Geo 2'))
    if lat is None or lng is None:
        return None

    price = number_or_none(d.get('price')) or number_or_none(d.get('Цена'))
    if price is None or price <= 0:
        return None

    photos = (photo_manifest.get(villa_id) or [])[:MAX_PHOTOS]
    if len(photos) < MIN_PHOTOS:
        return None

    # Aggregator-specific descriptions (manually written by user in Airtable)
    desc_agg_ru = first_string(d.get(COL_AGG_RU)) or first_string(d.get(COL_AGG_RU.strip()))
    desc_agg_en = first_string(d.get(COL_AGG_EN))
    if not desc_agg_ru and not desc_agg_en:
        return None  # no manual rewrite — skip

    # Aggregator titles (optional; not used in XML schema directly, kept for future)
    title_agg_ru = first_string(d.get(COL_AGG_TITLE_RU))
    title_agg_en = first_string(d.get(COL_AGG_TITLE_EN))

    title_ru = (first_string(d.get('SEO:Title')) or first_string(d.get('ИИ Имя')) or '').strip()
    title_ru = re.sub(r'\s*\|\s*Balinsky\s*$', '', title_ru, flags=re.I).strip() or None
    title_en = first_string(d.get('SEO_Title_EN')) or first_string(d.get('Имя ENG'))

    bedrooms_raw = number_or_none(d.get('Комнаты'))
    bedrooms = int(bedrooms_raw) if bedrooms_raw is not None else None
    area_raw = number_or_none(d.get('Площадь'))
    area = int(area_raw) if area_raw is not None else None
    land_raw = number_or_none(d.get('Земля'))
    land = int(land_raw) if land_raw is not None else None
    year_raw = first_string(d.get('Year of completion'))
    building_year: int | None = None
    if year_raw:
        m = re.search(r'\d{4}', year_raw)
        if m:
            building_year = int(m.group(0))

    currency = (first_string(d.get('currency')) or 'USD').upper()
    if currency not in {'USD', 'EUR', 'RUB', 'IDR'}:
        currency = 'USD'

    district = first_string(d.get('Location 2')) or first_string(d.get('Location'))
    leasehold = number_or_none(d.get('Leasehold')) or number_or_none(d.get('Leashold'))

    all_text = ' '.join(filter(None, [
        title_ru, title_en, desc_agg_ru, desc_agg_en,
        first_string(d.get('SEO Text')),
        first_string(d.get('Notes')),
        first_string(d.get('Post Text')),
    ]))

    beaches = (nearby_places.get('villas', {}).get(villa_id, {}).get('beach', []) or [])

    return {
        'id': villa_id,
        'title_ru': title_ru,
        'title_en': title_en,
        'title_agg_ru': title_agg_ru,
        'title_agg_en': title_agg_en,
        'desc_ru': desc_agg_ru,
        'desc_en': desc_agg_en,
        'lat': round(lat, 2),
        'lng': round(lng, 2),
        'price': price,
        'currency': currency,
        'bedrooms': bedrooms,
        'area': area,
        'land': land,
        'building_year': building_year,
        'district': district,
        'photos': photos,
        'leasehold_years': leasehold,
        'view_tags': detect_view_tags(all_text),
        'exterior_tags': detect_exterior_tags(d, all_text),
        'interior_tags': detect_interior_tags(d, all_text),
        'location_tags': detect_location_tags(lat, lng, beaches),
        'additionally_tags': detect_additionally_tags(leasehold),
    }


# --- xml building

def add_tag_set(parent, name: str, ids: list[int]) -> None:
    if not ids:
        return
    grp = etree.SubElement(parent, name)
    for id_ in ids:
        etree.SubElement(grp, 'tag').text = str(id_)


def add_multilang(parent, ids: dict[str, str]) -> None:
    """Adds <ru>..</ru><en>..</en> children with text values."""
    for lang in TARGET_LANGS:
        if lang in ids and ids[lang]:
            etree.SubElement(parent, lang).text = ids[lang]


def build_object_xml(villa: dict, descriptions: dict[str, str]) -> etree._Element:
    el = etree.Element('object')

    # seller_info
    si = etree.SubElement(el, 'seller_info')
    add_multilang(etree.SubElement(si, 'user_name'), DEFAULT_SELLER['user_name'])
    add_multilang(etree.SubElement(si, 'user_surname'), DEFAULT_SELLER['user_surname'])
    if DEFAULT_SELLER.get('user_avatar_url'):
        etree.SubElement(si, 'user_avatar_url').text = DEFAULT_SELLER['user_avatar_url']
    etree.SubElement(si, 'user_email').text = DEFAULT_SELLER['user_email']
    etree.SubElement(si, 'user_phone').text = DEFAULT_SELLER['user_phone']

    # core required
    etree.SubElement(el, 'external_id').text = str(villa['id'])
    etree.SubElement(el, 'deal_type').text = 'sale'
    etree.SubElement(el, 'type').text = '3'  # Вилла
    etree.SubElement(el, 'country_code').text = 'ID'
    etree.SubElement(el, 'lat').text = f'{villa["lat"]:.2f}'
    etree.SubElement(el, 'lng').text = f'{villa["lng"]:.2f}'
    addr = (villa.get('district') or 'Bali') + ', Indonesia'
    etree.SubElement(el, 'address').text = addr
    # external_url intentionally omitted (SEO protection)
    etree.SubElement(el, 'currency').text = villa['currency']
    etree.SubElement(el, 'price').text = str(int(round(villa['price'])))

    if villa.get('building_year'):
        etree.SubElement(el, 'building_year').text = str(villa['building_year'])
    if villa.get('bedrooms') is not None:
        etree.SubElement(el, 'rooms').text = str(villa['bedrooms'])
        etree.SubElement(el, 'bedrooms').text = str(villa['bedrooms'])
    if villa.get('area') is not None:
        etree.SubElement(el, 'area').text = str(villa['area'])
    if villa.get('land') is not None:
        etree.SubElement(el, 'area_ground').text = str(villa['land'])

    # photos
    photos_el = etree.SubElement(el, 'photos')
    for u in villa['photos']:
        etree.SubElement(photos_el, 'url').text = u

    # tags
    tags_el = etree.SubElement(el, 'tags')
    add_tag_set(tags_el, 'interior_features', villa.get('interior_tags', []))
    add_tag_set(tags_el, 'exterior_features', villa.get('exterior_tags', []))
    add_tag_set(tags_el, 'view', villa.get('view_tags', []))
    add_tag_set(tags_el, 'location', villa.get('location_tags', []))
    add_tag_set(tags_el, 'cooling', [459])  # AC default for Bali
    add_tag_set(tags_el, 'architectural_style', [1521])  # Modern default
    add_tag_set(tags_el, 'additionally', villa.get('additionally_tags', []))

    # description (multilang, CDATA)
    desc_el = etree.SubElement(el, 'description')
    for lang in TARGET_LANGS:
        text = descriptions.get(lang, '').strip()
        if not text:
            continue
        sub = etree.SubElement(desc_el, lang)
        sub.text = etree.CDATA(text)

    # vat
    etree.SubElement(el, 'vat_type').text = '3'  # Нет НДС

    return el


# --- main

def main() -> int:
    parser = argparse.ArgumentParser(description='Generate Realting-style aggregator XML.')
    parser.add_argument('--dry-run', action='store_true', help='Process only first 3 villas')
    parser.add_argument('--limit', type=int, default=None, help='Override max villas')
    args = parser.parse_args()

    load_env()
    sb_url = os.environ['NEXT_PUBLIC_SUPABASE_URL']
    airtable_token = os.environ.get('AIRTABLE_TOKEN')
    if not airtable_token:
        sys.exit('AIRTABLE_TOKEN not set in .env.local')

    print('▶ loading data ...')
    records = fetch_villas_from_airtable(airtable_token)
    photo_manifest = fetch_photo_manifest(sb_url)
    nearby_places = fetch_nearby_places(sb_url)
    published = [r for r in records if (r.get('fields') or {}).get('Опубликовать') is True]
    has_agg = [r for r in published
               if first_string((r.get('fields') or {}).get(COL_AGG_RU))
               or first_string((r.get('fields') or {}).get(COL_AGG_EN))]
    print(f'  airtable total:           {len(records)}')
    print(f'  published:                {len(published)}')
    print(f'  with Aggregator:RU/EN:    {len(has_agg)}')
    print(f'  photo manifest entries:   {len(photo_manifest)}')
    print(f'  nearby places villas:     {len(nearby_places.get("villas", {}))}')

    extracted: list[dict] = []
    skip_no_agg = skip_no_coords = skip_no_price = skip_few_photos = 0
    for r in published:
        d = r.get('fields') or {}
        if not first_string(d.get(COL_AGG_RU)) and not first_string(d.get(COL_AGG_EN)):
            skip_no_agg += 1
            continue
        if number_or_none(d.get('Geo')) is None or number_or_none(d.get('Geo 2')) is None:
            skip_no_coords += 1
            continue
        if (number_or_none(d.get('price')) or number_or_none(d.get('Цена'))) is None:
            skip_no_price += 1
            continue
        photos = (photo_manifest.get(r['id']) or [])
        if len(photos) < MIN_PHOTOS:
            skip_few_photos += 1
            continue
        v = extract_villa(r, photo_manifest, nearby_places)
        if v:
            extracted.append(v)
    print(f'  extracted: {len(extracted)} (skipped: no_agg_text={skip_no_agg}, '
          f'no_coords={skip_no_coords}, no_price={skip_no_price}, <{MIN_PHOTOS}_photos={skip_few_photos})')

    # Sort by price desc
    extracted.sort(key=lambda v: v['price'], reverse=True)

    cap = (args.limit or DRY_RUN_LIMIT) if args.dry_run else (args.limit or MAX_VILLAS)
    selected = extracted[:cap]
    print(f'▶ selected: {len(selected)} (sorted by price desc, cap={cap}{" dry-run" if args.dry_run else ""})')

    root = etree.Element('objects')
    etree.SubElement(root, 'version').text = '2.0'

    for i, villa in enumerate(selected, 1):
        descs: dict[str, str] = {}
        if villa.get('desc_ru'):
            descs['ru'] = villa['desc_ru']
        if villa.get('desc_en'):
            descs['en'] = villa['desc_en']
        if not descs:
            print(f'  [{i}/{len(selected)}] skip (no aggregator description): {villa["id"]}')
            continue
        obj = build_object_xml(villa, descs)
        root.append(obj)
        langs = '+'.join(descs.keys())
        print(f'  [{i}/{len(selected)}] {villa["id"]} · {villa["district"]} · '
              f'{villa["price"]:.0f} {villa["currency"]} · photos={len(villa["photos"])} · descs={langs}')

    # Write XML
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    tree = etree.ElementTree(root)
    tree.write(OUT_PATH, xml_declaration=True, encoding='UTF-8', pretty_print=True)
    print(f'▶ written: {OUT_PATH} ({OUT_PATH.stat().st_size // 1024} KB)')

    # Validate by re-parsing
    try:
        parser_obj = etree.XMLParser(huge_tree=True)
        re_parsed = etree.parse(str(OUT_PATH), parser_obj)
        n_obj = len(re_parsed.findall('object'))
        print(f'▶ validated: parsed back, {n_obj} <object> nodes')
    except etree.XMLSyntaxError as e:
        print(f'✖ XML INVALID: {e}')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
