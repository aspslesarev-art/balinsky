#!/usr/bin/env python3
"""
Indonesia land-profile fetcher (RDTR via the gistaru rdtrinteraktif API).

For each coordinate, queries `gistaru.atrbpn.go.id/rdtrinteraktif/api/
interactive/data` — the same endpoint the public viewer calls. No
ArcGIS token needed; everything is pre-parsed server-side.

The API requires a `id_wilayah` (kabupaten code) that matches the
point. We don't know the code in advance, so we try each Bali kabupaten
code in order and stop at the first one that returns data.

Output columns:
  Input_Lat, Input_Lon,
  Kabupaten, Kecamatan, Desa,
  Zona_Name, Zona_Code, Subzona_Name, Subzona_Code,
  KDB_Percent (max building footprint),
  KLB_Ratio   (max floor-area ratio),
  KDH_Percent (min green area),
  KTB_Percent (basement),
  GSB_Setback,
  Building_Height,
  Allowed_Use_Count, Permitted_Uses,
  Regulation,
  Regulation_PDF,
  STR_Likely_Allowed (heuristic from zone code),
  Error

Usage:
  python scripts/land_profile.py --lat -8.515915 --lon 115.287007
  python scripts/land_profile.py --input coords.csv --output report.xlsx
"""

import argparse
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from typing import Any, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

API_URL = "https://gistaru.atrbpn.go.id/rdtrinteraktif/api/interactive/data"

# Bali kabupaten codes — checked in this order. First one that returns
# non-empty data wins. Denpasar listed first because it's the smallest
# and most coverage-friendly; the rest follow geographic likelihood.
BALI_KABUPATEN = [
    ("5171000000", "Kota Denpasar"),
    ("5103000000", "Kabupaten Badung"),
    ("5104000000", "Kabupaten Gianyar"),
    ("5102000000", "Kabupaten Tabanan"),
    ("5105000000", "Kabupaten Klungkung"),
    ("5106000000", "Kabupaten Bangli"),
    ("5107000000", "Kabupaten Karangasem"),
    ("5108000000", "Kabupaten Buleleng"),
    ("5101000000", "Kabupaten Jembrana"),
]

TIMEOUT_S = 20


def make_session() -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=4, backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    s.mount("https://", HTTPAdapter(max_retries=retry))
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (balinsky-land-profile)",
        "Accept": "application/json",
        "Referer": "https://gistaru.atrbpn.go.id/rdtrinteraktif/",
    })
    return s


def first_str(v: Any) -> Optional[str]:
    """Flatten {value: x} / [x] / 'x' to a clean string."""
    if v is None:
        return None
    if isinstance(v, list):
        if not v:
            return None
        return ", ".join(str(x) for x in v if x not in (None, ""))
    return str(v).strip() or None


def parse_percent(s: Optional[str]) -> Optional[float]:
    """`"maksimum: 60%"` → 60.0; `"-"` → None."""
    if not s:
        return None
    m = re.search(r"(\d+(?:[.,]\d+)?)", s)
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", "."))
    except ValueError:
        return None


# Bali RDTR zone-code prefix → likely short-term-rental status.
#   W* (Wisata) — tourism, STR legal
#   K* (Komersial / Perdagangan-Jasa) — STR legal
#   R-1 / R-2 — residential medium/high density, STR usually legal
#   R-3 / R-4 — low density, residential only, STR typically illegal
#   PL (Pelayanan Lokal) — mixed, depends
#   PS / SPU — public service, no STR
#   PT (Pertanian) — agricultural, no STR
STR_BY_PREFIX: dict[str, str] = {}
for code, status in [
    ("W", "Likely yes (Tourism zone)"),
    ("K", "Likely yes (Commercial)"),
    ("R-1", "Likely yes (R-1 high density)"),
    ("R-2", "Likely yes (R-2 medium)"),
    ("R-3", "Probably no (R-3 residential)"),
    ("R-4", "Probably no (R-4 low density)"),
    ("PL", "Check zoning text"),
    ("PS", "No (public-service zone)"),
    ("SPU", "No (public-facility zone)"),
    ("PT", "No (agricultural)"),
    ("LP", "No (industrial)"),
    ("RTH", "No (green open space)"),
]:
    STR_BY_PREFIX[code] = status


def classify_str(kodszn: Optional[str], kodzon: Optional[str]) -> Optional[str]:
    """Best-effort STR-legality guess based on sub-zone or zone code."""
    for code in (kodszn, kodzon):
        if not code:
            continue
        code = code.upper().strip()
        # Try exact 2-3-letter match, then single letter.
        for key in sorted(STR_BY_PREFIX.keys(), key=len, reverse=True):
            if code.startswith(key):
                return STR_BY_PREFIX[key]
    return None


@dataclass
class LandProfile:
    Input_Lat: float
    Input_Lon: float
    Kabupaten: Optional[str] = None
    Kecamatan: Optional[str] = None
    Desa: Optional[str] = None
    Zona_Name: Optional[str] = None
    Zona_Code: Optional[str] = None
    Subzona_Name: Optional[str] = None
    Subzona_Code: Optional[str] = None
    KDB_Percent: Optional[float] = None
    KLB_Ratio: Optional[float] = None
    KDH_Percent: Optional[float] = None
    KTB_Percent: Optional[float] = None
    GSB_Setback: Optional[str] = None
    Building_Height: Optional[str] = None
    Allowed_Use_Count: Optional[int] = None
    Permitted_Uses: Optional[str] = None
    Regulation: Optional[str] = None
    Regulation_PDF: Optional[str] = None
    STR_Likely_Allowed: Optional[str] = None
    Error: Optional[str] = None


def query_one(session: requests.Session, kab_id: str, lat: float, lon: float) -> Optional[dict]:
    """Hit the API for one kabupaten. Returns the `data` block or None."""
    r = session.get(
        API_URL,
        params={"id_wilayah": kab_id, "latitude": lat, "longitude": lon},
        timeout=TIMEOUT_S,
    )
    # The API returns a 200 with an empty body when the point is
    # outside the kabupaten's RDTR coverage. Treat that as "miss".
    if r.status_code != 200:
        return None
    body = r.text.strip()
    if not body:
        return None
    try:
        j = r.json()
    except json.JSONDecodeError:
        return None
    if not isinstance(j, dict) or j.get("status") != 200:
        return None
    data = j.get("data")
    if not isinstance(data, dict) or not data.get("rtr"):
        return None
    return data


def profile_one(session: requests.Session, lat: float, lon: float) -> LandProfile:
    out = LandProfile(Input_Lat=lat, Input_Lon=lon)
    data: Optional[dict] = None
    matched_kabupaten: Optional[str] = None
    errors: list[str] = []

    for kab_id, kab_label in BALI_KABUPATEN:
        try:
            r = query_one(session, kab_id, lat, lon)
        except Exception as e:
            errors.append(f"{kab_label}: {e}")
            continue
        if r is not None:
            data = r
            matched_kabupaten = kab_label
            break

    if data is None:
        out.Error = "no RDTR coverage in any Bali kabupaten" + (" | " + " | ".join(errors) if errors else "")
        return out

    out.Kabupaten = matched_kabupaten
    out.Kecamatan = first_str(data.get("wadmkc"))
    out.Desa = first_str(data.get("wadmkd"))
    out.Zona_Name = first_str(data.get("namzon"))
    out.Zona_Code = first_str(data.get("kodzon"))
    out.Subzona_Name = first_str(data.get("namszn"))
    out.Subzona_Code = first_str(data.get("kodszn"))
    out.KDB_Percent = parse_percent(first_str(data.get("kdb")))
    out.KLB_Ratio = parse_percent(first_str(data.get("klb")))
    out.KDH_Percent = parse_percent(first_str(data.get("kdh")))
    out.KTB_Percent = parse_percent(first_str(data.get("ktb")))
    out.GSB_Setback = first_str(data.get("gsb"))
    out.Building_Height = first_str(data.get("ktgbgn"))

    uses = data.get("bgnizn")
    if isinstance(uses, list):
        out.Allowed_Use_Count = len(uses)
        # First 10 only — full list is hundreds of codes and bloats the table.
        out.Permitted_Uses = ", ".join(str(u) for u in uses[:10]) + (f", +{len(uses) - 10} more" if len(uses) > 10 else "")
    out.Regulation = first_str(data.get("nothpr"))
    pp = first_str(data.get("pp"))
    if pp and pp.lower().startswith("http"):
        out.Regulation_PDF = pp

    out.STR_Likely_Allowed = classify_str(out.Subzona_Code, out.Zona_Code)
    return out


def read_input_csv(path: str):
    import pandas as pd
    df_in = pd.read_csv(path)
    lat_col = next((c for c in df_in.columns if c.lower() in ("lat", "latitude")), None)
    lon_col = next((c for c in df_in.columns if c.lower() in ("lon", "lng", "longitude")), None)
    if not lat_col or not lon_col:
        raise SystemExit(f"input {path} has no lat/lon columns; found: {list(df_in.columns)}")
    return df_in, lat_col, lon_col


def write_output(rows: list[LandProfile], output: str) -> None:
    import pandas as pd
    df = pd.DataFrame([asdict(r) for r in rows])
    if output.lower().endswith(".csv"):
        df.to_csv(output, index=False)
    else:
        try:
            df.to_excel(output, index=False)
        except ImportError:
            fallback = output.rsplit(".", 1)[0] + ".csv"
            df.to_csv(fallback, index=False)
            print(f"openpyxl not installed; wrote CSV to {fallback}", file=sys.stderr)
            return
    print(df.to_string(index=False))
    print(f"\nWrote {len(df)} rows → {output}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Indonesia / Bali land profile fetcher")
    ap.add_argument("--input", help="CSV with lat/lon columns")
    ap.add_argument("--output", default="land_report.xlsx", help="output path (.xlsx or .csv)")
    ap.add_argument("--lat", type=float, help="single-point lat (use with --lon)")
    ap.add_argument("--lon", type=float, help="single-point lon (use with --lat)")
    ap.add_argument("--delay", type=float, default=0.5, help="seconds between requests")
    args = ap.parse_args()

    session = make_session()
    rows: list[LandProfile] = []

    if args.lat is not None and args.lon is not None:
        rows.append(profile_one(session, args.lat, args.lon))
        print(json.dumps(asdict(rows[0]), ensure_ascii=False, indent=2))
        return

    if args.input:
        df_in, lat_col, lon_col = read_input_csv(args.input)
        n = len(df_in)
        for i, row in df_in.iterrows():
            lat, lon = float(row[lat_col]), float(row[lon_col])
            print(f"[{i + 1}/{n}] {lat:.5f}, {lon:.5f}", file=sys.stderr, end="")
            r = profile_one(session, lat, lon)
            rows.append(r)
            tag = r.Subzona_Code or r.Zona_Code or "no-data"
            print(f"  → {tag}", file=sys.stderr)
            if i + 1 < n:
                time.sleep(args.delay)
        write_output(rows, args.output)
        return

    ap.error("provide either --input CSV or --lat / --lon")


if __name__ == "__main__":
    main()
