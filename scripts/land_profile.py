#!/usr/bin/env python3
"""
Indonesia land-profile fetcher (RDTR via the gistaru rdtrinteraktif API).

For each coordinate, queries `gistaru.atrbpn.go.id/rdtrinteraktif/api/
interactive/data` — the same endpoint the public viewer calls. No
ArcGIS token needed; everything is pre-parsed server-side.

The API requires a `id_wilayah` (kabupaten code) that matches the
point. We don't know the code in advance, so we try each Bali kabupaten
code in order and stop at the first one that returns data.

We profile 5 sample points per villa (centroid + N/S/E/W at ~30 m) so
the report can flag "mixed-zone" boundaries — a critical due-diligence
signal that's invisible from a single centroid pull.

Usage:
  python scripts/land_profile.py --lat -8.515915 --lon 115.287007
  python scripts/land_profile.py --input coords.csv --output report.xlsx
"""

import argparse
import json
import math
import os
import re
import sys
import time
from dataclasses import asdict, dataclass, field
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

# Activity-name dictionary populated from the SPA Vuex store (see
# scripts/rdtr_activities.json). When empty, we fall back to zone-based
# heuristics for use-case classification.
HERE = os.path.dirname(os.path.abspath(__file__))
try:
    with open(os.path.join(HERE, "rdtr_activities.json")) as _f:
        _act_raw = json.load(_f)
    ACTIVITY_NAMES: dict[str, str] = {k: v for k, v in _act_raw.items() if not k.startswith("_")}
except FileNotFoundError:
    ACTIVITY_NAMES = {}

# Substring → use-case marker. Names are lowercased before match. When
# the activity dictionary is populated, sync_villa_land_profile picks up
# the actual statuses by scanning bgnizn/bgntbt/bgnbst/bgntbs.
USECASE_KEYWORDS: dict[str, list[str]] = {
    "hotel": ["hotel bintang", "hotel non bintang", "hotel non-bintang"],
    "villa": ["vila", "villa"],
    "kos_large": ["kos", "pemondokan"],          # filter on "≥15 kamar" downstream
    "kos_small": ["kos", "pemondokan"],
    "restaurant": ["restoran", "rumah makan", "kedai"],
    "spa": ["spa", "wellness", "kebugaran"],
    "shop": ["toko", "minimarket"],
    "office": ["perkantoran", "kantor"],
}


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


_HEIGHT_NUM_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(meter|metre|metres|m\b|метров|м\b)?", re.IGNORECASE)

def simplify_building_height(v: Any) -> Optional[str]:
    """Reduce the raw `ktgbgn` value to a single "N m" height. The
    raw shape varies across kabupatens: sometimes a bare string
    ("15 meter"), sometimes a list with one comma-joined string of
    per-road-class values ("Kolektor Primer: 15 m, Lokal Primer: 15 m
    …"), sometimes a per-road-class dict whose values carry the
    Bhisama / Khayangan religious clause.

    The religious clause is surfaced separately via extract_religious(),
    so it never needs to ride inside Building_Height. We collect every
    numeric height across road classes, dedup; if all classes agree on
    one value we just return "15 m", otherwise "12 m / 15 m".
    """
    if v is None:
        return None
    # Gather candidate strings from whichever shape Airtable gave us.
    strings: list[str] = []
    if isinstance(v, dict):
        strings.extend(str(val) for val in v.values() if val)
    elif isinstance(v, list):
        for item in v:
            if isinstance(item, dict):
                strings.extend(str(val) for val in item.values() if val)
            elif item:
                strings.append(str(item))
    elif v:
        strings.append(str(v))
    if not strings:
        return None
    # Each string can be a comma-joined "road class: height" list.
    # Accept a segment only when it looks like "label: number" or a
    # bare numeric height — never as a free-text segment with numbers,
    # because those almost always belong to the Bhisama buffer clause
    # (e.g. "Khusus Bangunan ... 25 meter ..." is the temple distance,
    # not the building height).
    heights: list[str] = []
    for s in strings:
        for seg in s.split(","):
            seg = seg.strip()
            if not seg:
                continue
            if ":" in seg:
                # Road-class prefix: take the part after the colon.
                tail = seg.split(":", 1)[-1].strip()
            elif re.fullmatch(r"\d+(?:[.,]\d+)?\s*(meter|metre|metres|m|метров|м)?", seg, re.IGNORECASE):
                tail = seg
            else:
                continue
            m = _HEIGHT_NUM_RE.search(tail)
            if not m:
                continue
            n = m.group(1).replace(",", ".")
            if "." in n and n.split(".")[1].rstrip("0") == "":
                n = n.split(".")[0]
            h = f"{n} m"
            if h not in heights:
                heights.append(h)
    if not heights:
        # Fall back to the original raw if no number was found.
        return strings[0][:120]
    if len(heights) == 1:
        return heights[0]
    return " / ".join(heights)


def first_str(v: Any) -> Optional[str]:
    """Flatten {value: x} / [x] / 'x' to a clean string."""
    if v is None:
        return None
    if isinstance(v, list):
        if not v:
            return None
        out: list[str] = []
        for item in v:
            if isinstance(item, dict):
                for k, val in item.items():
                    sv = first_str(val) or ""
                    out.append(f"{k}: {sv}" if k else sv)
            elif item not in (None, ""):
                out.append(str(item))
        return ", ".join(out) or None
    if isinstance(v, dict):
        out = []
        for k, val in v.items():
            sv = first_str(val) or ""
            out.append(f"{k}: {sv}" if k else sv)
        return ", ".join(out) or None
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
#   W*  (Wisata) — tourism, STR legal
#   K*  (Komersial / Perdagangan-Jasa) — STR legal
#   R-1 / R-2 — residential medium/high density, STR usually legal
#   R-3 / R-4 — low density, residential only, STR typically illegal
#   PL (Pelayanan Lokal) — mixed, depends
#   PS / SPU — public service, no STR
#   P / PT — agricultural / plantation, no STR (LP2B-suspect)
#   LP / I  — industrial
#   RTH (Ruang Terbuka Hijau) — green, no STR
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
    ("P-", "No (agricultural / plantation)"),
    ("LP", "No (industrial)"),
    ("RTH", "No (green open space)"),
]:
    STR_BY_PREFIX[code] = status

# Same prefix scheme, but driving the 4 use-case markers shown in the
# UI. Values: 'allowed' / 'limited' / 'conditional' / 'forbidden' /
# 'unknown'. These are first-pass guesses based on the zone family —
# refined later when the activity dictionary is populated.
ZONE_USECASE: dict[str, dict[str, str]] = {
    "W":   {"hotel": "allowed",     "villa": "allowed",  "kos": "allowed",     "restaurant": "allowed"},
    "K":   {"hotel": "allowed",     "villa": "limited",  "kos": "allowed",     "restaurant": "allowed"},
    "R-1": {"hotel": "limited",     "villa": "allowed",  "kos": "allowed",     "restaurant": "limited"},
    "R-2": {"hotel": "limited",     "villa": "allowed",  "kos": "allowed",     "restaurant": "limited"},
    "R-3": {"hotel": "forbidden",   "villa": "limited",  "kos": "limited",     "restaurant": "forbidden"},
    "R-4": {"hotel": "forbidden",   "villa": "limited",  "kos": "forbidden",   "restaurant": "forbidden"},
    "PL":  {"hotel": "limited",     "villa": "limited",  "kos": "limited",     "restaurant": "allowed"},
    "PS":  {"hotel": "forbidden",   "villa": "forbidden","kos": "forbidden",   "restaurant": "forbidden"},
    "SPU": {"hotel": "forbidden",   "villa": "forbidden","kos": "forbidden",   "restaurant": "forbidden"},
    "PT":  {"hotel": "forbidden",   "villa": "forbidden","kos": "forbidden",   "restaurant": "forbidden"},
    "P-":  {"hotel": "forbidden",   "villa": "forbidden","kos": "forbidden",   "restaurant": "forbidden"},
    "LP":  {"hotel": "forbidden",   "villa": "forbidden","kos": "forbidden",   "restaurant": "forbidden"},
    "RTH": {"hotel": "forbidden",   "villa": "forbidden","kos": "forbidden",   "restaurant": "forbidden"},
}


def classify_str(kodszn: Optional[str], kodzon: Optional[str]) -> Optional[str]:
    """Best-effort STR-legality guess based on sub-zone or zone code."""
    for code in (kodszn, kodzon):
        if not code:
            continue
        code = code.upper().strip()
        for key in sorted(STR_BY_PREFIX.keys(), key=len, reverse=True):
            if code.startswith(key):
                return STR_BY_PREFIX[key]
    return None


def classify_usecases_by_zone(kodszn: Optional[str], kodzon: Optional[str]) -> dict[str, str]:
    """Per-use-case status driven by zone-code family alone."""
    for code in (kodszn, kodzon):
        if not code:
            continue
        code = code.upper().strip()
        for key in sorted(ZONE_USECASE.keys(), key=len, reverse=True):
            if code.startswith(key):
                return ZONE_USECASE[key].copy()
    return {"hotel": "unknown", "villa": "unknown", "kos": "unknown", "restaurant": "unknown"}


# Status map (from iznktg/tbtktg/bstktg/tbsktg, when populated):
#   "Izinkan"           → allowed
#   "Terbatas"          → limited
#   "Bersyarat"         → conditional
#   "Terbatas Bersyarat" → limited_conditional
ACT_STATUS_RANK = {
    "allowed": 0, "limited": 1, "conditional": 2,
    "limited_conditional": 3, "forbidden": 4, "unknown": 5,
}

def _coalesce_status(a: str, b: str) -> str:
    """Take the worse of two statuses (higher rank wins)."""
    return a if ACT_STATUS_RANK.get(a, 9) >= ACT_STATUS_RANK.get(b, 9) else b


def classify_usecases_by_activities(
    bgnizn: list[str], bgntbt: list[str], bgnbst: list[str], bgntbs: list[str],
) -> dict[str, str]:
    """Walk the four activity-code lists, map each code → use-case via
    the SPA dictionary + keyword match, take the worst status per use-case."""
    if not ACTIVITY_NAMES:
        return {"hotel": "unknown", "villa": "unknown", "kos": "unknown", "restaurant": "unknown"}

    buckets = [
        (bgnizn or [], "allowed"),
        (bgntbt or [], "limited"),
        (bgnbst or [], "conditional"),
        (bgntbs or [], "limited_conditional"),
    ]

    out: dict[str, str] = {"hotel": "forbidden", "villa": "forbidden",
                           "kos": "forbidden", "restaurant": "forbidden"}
    seen: dict[str, bool] = {k: False for k in out}

    for codes, status in buckets:
        for code in codes:
            code3 = str(code).zfill(3)
            name = (ACTIVITY_NAMES.get(code3) or "").lower()
            if not name:
                continue
            if "hotel" in name and ("bintang" in name or "non" in name):
                out["hotel"] = _coalesce_status(out["hotel"] if seen["hotel"] else status, status); seen["hotel"] = True
            if "vila" in name or "villa" in name:
                out["villa"] = _coalesce_status(out["villa"] if seen["villa"] else status, status); seen["villa"] = True
            if "kos" in name or "pemondokan" in name:
                out["kos"] = _coalesce_status(out["kos"] if seen["kos"] else status, status); seen["kos"] = True
            if "restoran" in name or "rumah makan" in name or "kedai" in name:
                out["restaurant"] = _coalesce_status(out["restaurant"] if seen["restaurant"] else status, status); seen["restaurant"] = True

    for k, was_seen in seen.items():
        if not was_seen:
            out[k] = "unknown"
    return out


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
    # New fields (Mar 2026 — RDTR roadmap):
    Document_Perda_URL: Optional[str] = None     # pp
    Document_Body_URL: Optional[str] = None      # bt
    Document_Verification_URL: Optional[str] = None  # ct
    Uses_Hotel: Optional[str] = None
    Uses_Villa: Optional[str] = None
    Uses_Kos: Optional[str] = None
    Uses_Restaurant: Optional[str] = None
    Religious_Restrictions: Optional[str] = None  # Bhisama / Khayangan text
    Zone_Homogeneity: Optional[str] = None        # 'uniform' | 'mixed'
    Mixed_Zones: Optional[str] = None             # comma-separated when mixed
    Raw_Response: Optional[dict] = field(default=None, repr=False)
    Error: Optional[str] = None


def query_one(session: requests.Session, kab_id: str, lat: float, lon: float) -> Optional[dict]:
    """Hit the API for one kabupaten. Returns the `data` block or None."""
    r = session.get(
        API_URL,
        params={"id_wilayah": kab_id, "latitude": lat, "longitude": lon},
        timeout=TIMEOUT_S,
    )
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


def fetch_raw(session: requests.Session, lat: float, lon: float) -> tuple[Optional[dict], Optional[str], list[str]]:
    """Try each Bali kabupaten code; return (raw data, matched kabupaten label, errors)."""
    errors: list[str] = []
    for kab_id, kab_label in BALI_KABUPATEN:
        try:
            r = query_one(session, kab_id, lat, lon)
        except Exception as e:
            errors.append(f"{kab_label}: {e}")
            continue
        if r is not None:
            return r, kab_label, errors
    return None, None, errors


# Bhisama / Khayangan Pura — Balinese religious-temple buffer rules
# show up inside the `ktgbgn` dict's value strings. We pull them out
# into a dedicated field so the UI can highlight them separately.
RELIGIOUS_KEYWORDS = ("khayangan", "bhisama", "pura")

def extract_religious(data: dict) -> Optional[str]:
    """Look inside ktgbgn / nothpr / any dict value for Balinese temple-buffer rules."""
    hits: list[str] = []
    for k in ("ktgbgn", "gsb", "ketrgn"):
        v = data.get(k)
        if v is None:
            continue
        if isinstance(v, dict):
            for val in v.values():
                s = str(val)
                if any(kw in s.lower() for kw in RELIGIOUS_KEYWORDS):
                    hits.append(s)
        elif isinstance(v, list):
            for item in v:
                s = str(item)
                if any(kw in s.lower() for kw in RELIGIOUS_KEYWORDS):
                    hits.append(s)
        elif isinstance(v, str):
            if any(kw in v.lower() for kw in RELIGIOUS_KEYWORDS):
                hits.append(v)
    if not hits:
        return None
    # Dedup while preserving order
    seen = set()
    uniq = []
    for h in hits:
        if h not in seen:
            seen.add(h)
            uniq.append(h)
    return " | ".join(uniq)


def parse_central(data: dict) -> LandProfile:
    """Map the raw `data` dict into the dataclass — centroid-level fields only."""
    out = LandProfile(Input_Lat=0.0, Input_Lon=0.0)
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
    out.Building_Height = simplify_building_height(data.get("ktgbgn"))

    uses = data.get("bgnizn")
    bgntbt = data.get("bgntbt") or []
    bgnbst = data.get("bgnbst") or []
    bgntbs = data.get("bgntbs") or []
    if isinstance(uses, list):
        out.Allowed_Use_Count = len(uses)
        out.Permitted_Uses = ", ".join(str(u) for u in uses[:10]) + (f", +{len(uses) - 10} more" if len(uses) > 10 else "")

    out.Regulation = first_str(data.get("nothpr"))
    pp = first_str(data.get("pp"))
    bt = first_str(data.get("bt"))
    ct = first_str(data.get("ct"))
    for url, attr in [(pp, "Document_Perda_URL"), (bt, "Document_Body_URL"), (ct, "Document_Verification_URL")]:
        if url and url.lower().startswith("http") and url != "Tidak Ada":
            setattr(out, attr, url)
    if out.Document_Perda_URL:
        out.Regulation_PDF = out.Document_Perda_URL

    out.STR_Likely_Allowed = classify_str(out.Subzona_Code, out.Zona_Code)

    # Per-use-case statuses — prefer activity-dictionary path if it
    # yields anything, otherwise fall back to the zone family.
    via_act = classify_usecases_by_activities(uses if isinstance(uses, list) else [], bgntbt, bgnbst, bgntbs)
    use = {k: v for k, v in via_act.items() if v != "unknown"}
    via_zone = classify_usecases_by_zone(out.Subzona_Code, out.Zona_Code)
    for k in ("hotel", "villa", "kos", "restaurant"):
        if k not in use:
            use[k] = via_zone.get(k, "unknown")
    out.Uses_Hotel = use["hotel"]
    out.Uses_Villa = use["villa"]
    out.Uses_Kos = use["kos"]
    out.Uses_Restaurant = use["restaurant"]

    out.Religious_Restrictions = extract_religious(data)
    return out


# 30 m → degrees: lat is constant, lon depends on latitude. Used for
# multi-point homogeneity sampling.
def offsets(lat: float, meters: float = 30.0) -> list[tuple[float, float]]:
    dlat = meters / 111320.0
    dlon = meters / (111320.0 * max(math.cos(math.radians(lat)), 0.01))
    return [(dlat, 0.0), (-dlat, 0.0), (0.0, dlon), (0.0, -dlon)]


def profile_one(session: requests.Session, lat: float, lon: float) -> LandProfile:
    """Centroid + 4 sample points → final LandProfile with homogeneity."""
    raw, matched_kab, errors = fetch_raw(session, lat, lon)
    if raw is None:
        out = LandProfile(Input_Lat=lat, Input_Lon=lon)
        out.Error = "no RDTR coverage in any Bali kabupaten" + (
            " | " + " | ".join(errors) if errors else ""
        )
        return out

    out = parse_central(raw)
    out.Input_Lat = lat
    out.Input_Lon = lon
    out.Kabupaten = matched_kab
    out.Raw_Response = raw

    # Multi-point check — only run when the centroid succeeded. Same
    # kabupaten code as the centroid (much cheaper, no fallback chain).
    central_zone = (out.Zona_Code or "", out.Subzona_Code or "")
    found_zones: set[tuple[str, str]] = {central_zone}
    kab_id = raw.get("idwlyh") or BALI_KABUPATEN[0][0]
    for dlat, dlon in offsets(lat):
        try:
            r = query_one(session, kab_id, lat + dlat, lon + dlon)
        except Exception:
            continue
        if r is None:
            continue
        z = (first_str(r.get("kodzon")) or "", first_str(r.get("kodszn")) or "")
        found_zones.add(z)

    if len(found_zones) == 1:
        out.Zone_Homogeneity = "uniform"
    else:
        out.Zone_Homogeneity = "mixed"
        out.Mixed_Zones = ", ".join(sorted({z[1] or z[0] for z in found_zones if z != ("", "")}))

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
    df = pd.DataFrame([{k: v for k, v in asdict(r).items() if k != "Raw_Response"} for r in rows])
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
        print(json.dumps({k: v for k, v in asdict(rows[0]).items() if k != "Raw_Response"}, ensure_ascii=False, indent=2))
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
            print(f"  → {tag} ({r.Zone_Homogeneity or '-'})", file=sys.stderr)
            if i + 1 < n:
                time.sleep(args.delay)
        write_output(rows, args.output)
        return

    ap.error("provide either --input CSV or --lat / --lon")


if __name__ == "__main__":
    main()
