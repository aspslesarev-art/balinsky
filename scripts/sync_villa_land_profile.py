#!/usr/bin/env python3
"""
Sync RDTR / land-profile data for every villa in raw_villas with
parseable Geo coordinates. Output → villa_land_profile (one row per
villa). Idempotent: skips villas whose row is fresher than --max-age
days unless --force is passed.

Usage:
  python scripts/sync_villa_land_profile.py
  python scripts/sync_villa_land_profile.py --force --max-age 0
  python scripts/sync_villa_land_profile.py --limit 50         # dev
"""

import argparse
import json
import os
import re
import sys
import time
from dataclasses import asdict
from pathlib import Path

# Re-use the actual profiler — sibling file.
sys.path.insert(0, str(Path(__file__).parent))
from land_profile import make_session, profile_one  # noqa: E402

import requests


def translate_via_azure(p) -> dict | None:
    """One call to Azure OpenAI to translate the Indonesian fields to
    RU + EN. Returns the translations jsonb shape, or None on error
    (sync continues with raw Indonesian — component falls back)."""
    api_key = os.environ.get("AZURE_OPENAI_API_KEY")
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
    deployment = os.environ.get("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-5.4")
    if not api_key or not endpoint:
        return None

    # Compact source dict — only fields that need translating.
    src = {
        "kabupaten": p.Kabupaten,
        "kecamatan": p.Kecamatan,
        "desa": p.Desa,
        "zona_name": p.Zona_Name,
        "subzona_name": p.Subzona_Name,
        "gsb_setback": p.GSB_Setback,
        "building_height": p.Building_Height,
        "regulation": p.Regulation,
    }
    # Strip empties so we don't waste tokens.
    src = {k: v for k, v in src.items() if v}
    if not src:
        return None

    sys_prompt = (
        "You translate Indonesian (Bahasa) land-zoning text into Russian and English. "
        "Output a single JSON object with two keys, `ru` and `en`. Each is an object "
        "with the same keys as the input. Rules:\n"
        "- Place names (kabupaten / kecamatan / desa): transliterate to natural Russian "
        "  (e.g. Канггу, Кута Утара, Бадунг) and use the common English/Indonesian form for `en`. "
        "  Drop the prefix word: 'Kabupaten Badung' → 'Бадунг' / 'Badung'.\n"
        "- Zone / sub-zone names: short semantic translation, no longer than 3 words.\n"
        "- GSB setback rule + building-height rule: rewrite as one short, plain sentence per language. "
        "  Drop Indonesian jargon (Kolektor Primer, Lokal Primer, Lingkungan Primer); use a single number "
        "  if it's the same across road classes, or '15 м на основных дорогах' if you must mention them. "
        "  Be terse — investor needs the takeaway, not the regulation text.\n"
        "- Regulation: keep the doc type + region + year, drop the long official phrasing.\n"
        "- If a field is null/empty in input, omit it from output.\n"
        "Return ONLY the JSON, no prose, no markdown fence."
    )
    user_msg = "Translate to RU + EN:\n" + json.dumps(src, ensure_ascii=False)

    url = f"{endpoint.rstrip('/')}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
    body = {
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    try:
        r = requests.post(url, json=body, headers={"api-key": api_key, "Content-Type": "application/json"}, timeout=30)
        r.raise_for_status()
        msg = r.json()["choices"][0]["message"]["content"]
        parsed = json.loads(msg)
        if isinstance(parsed, dict) and "ru" in parsed and "en" in parsed:
            return parsed
    except Exception as e:
        print(f"  translate failed: {e}", file=sys.stderr)
    return None


def load_env_local() -> None:
    """Manual .env.local loader so the script runs without dotenv."""
    p = Path(".env.local")
    if not p.exists():
        return
    for line in p.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k.strip() not in os.environ:
            os.environ[k.strip()] = v.strip().strip('"').strip("'")


def parse_geo(v) -> float | None:
    """raw_villas stores 'Geo' / 'Geo 2' as free-text — extract first
    finite float. Returns None on garbage."""
    if v is None:
        return None
    if isinstance(v, list):
        for item in v:
            r = parse_geo(item)
            if r is not None:
                return r
        return None
    s = str(v).replace(",", ".").strip()
    m = re.search(r"-?\d+(?:\.\d+)?", s)
    if not m:
        return None
    try:
        f = float(m.group(0))
        return f if f != 0 else None
    except ValueError:
        return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-age", type=int, default=30, help="re-sync villas older than this many days")
    ap.add_argument("--force", action="store_true", help="re-sync everything regardless of age")
    ap.add_argument("--limit", type=int, default=0, help="cap rows for dry-run (0 = all)")
    ap.add_argument("--delay", type=float, default=0.4)
    args = ap.parse_args()

    load_env_local()
    SB_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    SB_KEY = os.environ["SUPABASE_SERVICE_KEY"]
    headers = {
        "apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
        "Content-Type": "application/json",
    }

    sb = requests.Session()
    sb.headers.update(headers)

    # 1. Pull all raw_villas with Geo coords.
    print("loading raw_villas …", file=sys.stderr)
    rows: list[dict] = []
    PAGE = 200
    for offset in range(0, 4000, PAGE):
        r = sb.get(
            f"{SB_URL}/rest/v1/raw_villas?select=airtable_id,data&limit={PAGE}&offset={offset}",
            timeout=30,
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < PAGE:
            break
    print(f"got {len(rows)} villa rows", file=sys.stderr)

    # 2. Pull existing villa_land_profile so we can skip recent ones.
    print("loading existing villa_land_profile …", file=sys.stderr)
    existing: dict[str, str] = {}   # airtable_id → synced_at
    r = sb.get(f"{SB_URL}/rest/v1/villa_land_profile?select=airtable_id,synced_at&limit=20000", timeout=30)
    if r.status_code == 200:
        for row in r.json():
            existing[row["airtable_id"]] = row["synced_at"]
    elif r.status_code == 404:
        raise SystemExit("villa_land_profile table missing — apply migration 025 first")

    # 3. Filter to villas that need work.
    import datetime as dt
    cutoff_iso = (dt.datetime.now(dt.UTC) - dt.timedelta(days=args.max_age)).isoformat()
    queue: list[tuple[str, float, float]] = []
    skipped_no_geo = 0
    skipped_fresh = 0
    for row in rows:
        d = row["data"] or {}
        if d.get("Опубликовать") is not True:
            continue
        lat = parse_geo(d.get("Geo"))
        lon = parse_geo(d.get("Geo 2"))
        if lat is None or lon is None:
            skipped_no_geo += 1
            continue
        if not args.force:
            prev = existing.get(row["airtable_id"])
            if prev and prev > cutoff_iso:
                skipped_fresh += 1
                continue
        queue.append((row["airtable_id"], lat, lon))

    if args.limit:
        queue = queue[: args.limit]

    print(
        f"queue: {len(queue)} villas "
        f"(skipped {skipped_no_geo} without coords, {skipped_fresh} fresh)",
        file=sys.stderr,
    )

    # 4. Profile each, upsert.
    profiler = make_session()
    ok = 0
    failed = 0
    for i, (aid, lat, lon) in enumerate(queue, 1):
        try:
            p = profile_one(profiler, lat, lon)
        except Exception as e:
            print(f"[{i}/{len(queue)}] {aid} {lat:.5f},{lon:.5f} → profile failed: {e}", file=sys.stderr)
            failed += 1
            continue

        # One Azure call to translate the Indonesian fields to RU + EN.
        # Cheap (~$0.0001 / villa) and saves us doing it at render-time.
        translations = translate_via_azure(p) if p.Zona_Name else None

        body = {
            "airtable_id": aid,
            "lat": lat, "lon": lon,
            "kabupaten": p.Kabupaten, "kecamatan": p.Kecamatan, "desa": p.Desa,
            "zona_name": p.Zona_Name, "zona_code": p.Zona_Code,
            "subzona_name": p.Subzona_Name, "subzona_code": p.Subzona_Code,
            "kdb_percent": p.KDB_Percent, "klb_ratio": p.KLB_Ratio,
            "kdh_percent": p.KDH_Percent, "ktb_percent": p.KTB_Percent,
            "gsb_setback": p.GSB_Setback, "building_height": p.Building_Height,
            "allowed_use_count": p.Allowed_Use_Count,
            "regulation": p.Regulation, "regulation_pdf": p.Regulation_PDF,
            "str_likely_allowed": p.STR_Likely_Allowed,
            "translations": translations,
            "error": p.Error,
        }

        r = sb.post(
            f"{SB_URL}/rest/v1/villa_land_profile?on_conflict=airtable_id",
            json=body,
            headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
            timeout=30,
        )
        if r.status_code in (200, 201, 204):
            ok += 1
            tag = p.Subzona_Code or p.Zona_Code or "no-data"
            print(f"[{i}/{len(queue)}] {aid} → {p.Kecamatan or '?'} · {tag} · STR: {p.STR_Likely_Allowed or '?'}", file=sys.stderr)
        else:
            failed += 1
            print(f"[{i}/{len(queue)}] {aid} upsert failed: {r.status_code} {r.text[:200]}", file=sys.stderr)

        if i < len(queue):
            time.sleep(args.delay)

    print(f"\ndone — {ok} ok, {failed} failed", file=sys.stderr)


if __name__ == "__main__":
    main()
