#!/usr/bin/env python3
"""
Sync RDTR / land-profile data for every villa OR apartment OR complex
in raw_<kind>s with parseable Geo coordinates. Output → <kind>_land_profile.
Idempotent: skips rows fresher than --max-age days unless --force.

Usage:
  python scripts/sync_land_profile.py --kind villa
  python scripts/sync_land_profile.py --kind apartment --force
  python scripts/sync_land_profile.py --kind complex --limit 20
  python scripts/sync_land_profile.py --kind all      # do all three sequentially
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from land_profile import make_session, profile_one  # noqa: E402

import requests

KIND_TO_TABLES = {
    "villa":     ("raw_villas",      "villa_land_profile"),
    "apartment": ("raw_apartments",  "apartment_land_profile"),
    "complex":   ("raw_complexes",   "complex_land_profile"),
}


def translate_via_azure(p) -> dict | None:
    api_key = os.environ.get("AZURE_OPENAI_API_KEY")
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
    deployment = os.environ.get("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-5.4")
    if not api_key or not endpoint:
        return None

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
    src = {k: v for k, v in src.items() if v}
    if not src:
        return None

    sys_prompt = (
        "You translate Indonesian (Bahasa) land-zoning text into Russian and English. "
        "Output a single JSON object with two keys, `ru` and `en`. Each is an object "
        "with the same keys as the input. Rules:\n"
        "- Place names: transliterate to natural Russian (e.g. Канггу, Кута Утара, Бадунг) "
        "  and use the common English/Indonesian form for `en`. "
        "  Drop the prefix word: 'Kabupaten Badung' → 'Бадунг' / 'Badung'.\n"
        "- Zone / sub-zone names: short semantic translation, no longer than 3 words.\n"
        "- GSB setback + building-height rule: rewrite as one short, plain sentence per language. "
        "  Drop Indonesian jargon (Kolektor Primer, Lokal Primer, Lingkungan Primer); use a single number "
        "  if it's the same across road classes. Be terse — investor needs the takeaway.\n"
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


def compute_trust_score(p) -> int:
    score = 100
    if p.Uses_Hotel == "forbidden" and p.Uses_Villa == "forbidden":
        score -= 40
    if p.Zone_Homogeneity == "mixed":
        score -= 15
    if not p.Zona_Code and not p.Subzona_Code:
        score -= 30
    for v in (p.Uses_Hotel, p.Uses_Villa, p.Uses_Kos, p.Uses_Restaurant):
        if v == "limited":
            score -= 3
        elif v == "limited_conditional":
            score -= 5
    if p.Document_Body_URL and p.Document_Verification_URL:
        score += 5
    return max(0, min(100, score))


def load_env_local() -> None:
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


def sync_kind(kind: str, args) -> tuple[int, int]:
    raw_table, dest_table = KIND_TO_TABLES[kind]
    SB_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    SB_KEY = os.environ["SUPABASE_SERVICE_KEY"]
    headers = {
        "apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
        "Content-Type": "application/json",
    }
    sb = requests.Session()
    sb.headers.update(headers)

    print(f"\n=== {kind} ===", file=sys.stderr)

    rows: list[dict] = []
    PAGE = 200
    for offset in range(0, 8000, PAGE):
        r = sb.get(
            f"{SB_URL}/rest/v1/{raw_table}?select=airtable_id,data&limit={PAGE}&offset={offset}",
            timeout=30,
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < PAGE:
            break
    print(f"got {len(rows)} {kind} rows", file=sys.stderr)

    existing: dict[str, str] = {}
    r = sb.get(f"{SB_URL}/rest/v1/{dest_table}?select=airtable_id,synced_at&limit=20000", timeout=30)
    if r.status_code == 200:
        for row in r.json():
            existing[row["airtable_id"]] = row["synced_at"]
    elif r.status_code == 404:
        raise SystemExit(f"{dest_table} missing — apply migration first")

    import datetime as dt
    cutoff_iso = (dt.datetime.now(dt.UTC) - dt.timedelta(days=args.max_age)).isoformat()
    queue: list[tuple[str, float, float]] = []
    skipped_no_geo = 0
    skipped_fresh = 0
    for row in rows:
        d = row["data"] or {}
        # Villas + apartments use the explicit `Опубликовать` checkbox.
        # Complexes don't have that field — they're gated by `Статус`
        # ("Строится" / "Построен" / "Под заказ" all count as live).
        if kind == "complex":
            status = str(d.get("Статус") or "").lower()
            if not status or "архив" in status or "не публик" in status:
                continue
        else:
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
        f"queue: {len(queue)} {kind}s "
        f"(skipped {skipped_no_geo} without coords, {skipped_fresh} fresh)",
        file=sys.stderr,
    )

    profiler = make_session()
    ok = 0
    failed = 0
    for i, (aid, lat, lon) in enumerate(queue, 1):
        try:
            p = profile_one(profiler, lat, lon)
        except Exception as e:
            print(f"[{i}/{len(queue)}] {aid} → profile failed: {e}", file=sys.stderr)
            failed += 1
            continue

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
            "document_perda_url": p.Document_Perda_URL,
            "document_body_url": p.Document_Body_URL,
            "document_verification_url": p.Document_Verification_URL,
            "uses_hotel": p.Uses_Hotel,
            "uses_villa": p.Uses_Villa,
            "uses_kos": p.Uses_Kos,
            "uses_restaurant": p.Uses_Restaurant,
            "religious_restrictions": p.Religious_Restrictions,
            "zone_homogeneity": p.Zone_Homogeneity,
            "mixed_zones": p.Mixed_Zones,
            "trust_score": compute_trust_score(p),
            "raw_response": p.Raw_Response,
            "translations": translations,
            "error": p.Error,
        }

        r = sb.post(
            f"{SB_URL}/rest/v1/{dest_table}?on_conflict=airtable_id",
            json=body,
            headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
            timeout=30,
        )
        if r.status_code in (200, 201, 204):
            ok += 1
            tag = p.Subzona_Code or p.Zona_Code or "no-data"
            ts = p.Zone_Homogeneity or "-"
            print(f"[{i}/{len(queue)}] {aid} → {p.Kecamatan or '?'} · {tag} · {ts}", file=sys.stderr)
        else:
            failed += 1
            print(f"[{i}/{len(queue)}] {aid} upsert failed: {r.status_code} {r.text[:200]}", file=sys.stderr)

        if i < len(queue):
            time.sleep(args.delay)

    print(f"{kind} done — {ok} ok, {failed} failed", file=sys.stderr)
    return ok, failed


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--kind", choices=["villa", "apartment", "complex", "all"], default="all")
    ap.add_argument("--max-age", type=int, default=30)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--delay", type=float, default=0.4)
    args = ap.parse_args()

    load_env_local()

    kinds = ["villa", "apartment", "complex"] if args.kind == "all" else [args.kind]
    totals = {"ok": 0, "failed": 0}
    for k in kinds:
        ok, failed = sync_kind(k, args)
        totals["ok"] += ok
        totals["failed"] += failed

    print(f"\n=== ALL DONE — {totals['ok']} ok, {totals['failed']} failed ===", file=sys.stderr)


if __name__ == "__main__":
    main()
