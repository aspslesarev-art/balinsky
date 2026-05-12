#!/usr/bin/env python3
"""
Indonesia land-profile fetcher (RDTR zoning + LSD + BHUMI cadastral).

Hits the public ArcGIS REST endpoints that gistaru.atrbpn.go.id and
bhumi.atrbpn.go.id rely on, runs a point-in-polygon query for each
coordinate, and writes an investor-ready table:

  Input_Lat, Input_Lon, Zonasi_Type, Zonasi_Code, KDB_Percentage,
  KLB_Ratio, LSD_Status, NIB_Status, Ownership_Type, Error

Endpoints occasionally rotate. If a URL below 404s, open the relevant
portal in a browser (gistaru.atrbpn.go.id/rdtrinteraktif/ or
bhumi.atrbpn.go.id), DevTools → Network, look at the XHR call when
you click on the map, and copy the live `MapServer/<n>` URL.

Usage:
  python scripts/land_profile.py --input coords.csv --output report.xlsx
  python scripts/land_profile.py --lat -8.65 --lon 115.13

CSV input expects columns named lat/latitude and lon/lng/longitude.
"""

import argparse
import json
import sys
import time
from dataclasses import asdict, dataclass
from typing import Any, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# === Endpoint config — verify in browser DevTools if 404 ==============
# RDTR_OL is the public "Rencana Detail Tata Ruang" interactive map
# service. Layer 0 is usually the zoning polygons.
RDTR_QUERY_URL = (
    "https://gistaru.atrbpn.go.id/arcgis/rest/services/"
    "RDTR_OL/MapServer/0/query"
)
# Lahan Sawah Dilindungi — government-protected rice paddies.
LSD_QUERY_URL = (
    "https://gistaru.atrbpn.go.id/arcgis/rest/services/"
    "LSD/MapServer/0/query"
)
# BHUMI cadastral parcel layer — returns NIB + ownership for plots
# that have been registered with BPN. Most agricultural land in Bali
# isn't here; absence ≠ "no owner", just "no public registration".
BHUMI_PARCEL_URL = (
    "https://bhumi.atrbpn.go.id/arcgis/rest/services/"
    "PUBLIK/PETA_NIB/MapServer/0/query"
)

TIMEOUT_S = 20


def make_session() -> requests.Session:
    """Indonesian gov servers regularly 5xx or hang. Aggressive retries
    + a polite UA string. Backoff doubles each attempt."""
    s = requests.Session()
    retry = Retry(
        total=4,
        backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    s.mount("https://", HTTPAdapter(max_retries=retry))
    s.headers.update({
        "User-Agent": "balinsky-land-profile/1.0 (research)",
        "Accept": "application/json",
    })
    return s


def point_geom(lat: float, lon: float) -> str:
    """ArcGIS expects {x: lon, y: lat} with the spatial reference."""
    return json.dumps({"x": lon, "y": lat, "spatialReference": {"wkid": 4326}})


def arcgis_query(session: requests.Session, url: str, lat: float, lon: float) -> dict:
    """Point-in-polygon query against an ArcGIS MapServer layer."""
    params = {
        "geometry": point_geom(lat, lon),
        "geometryType": "esriGeometryPoint",
        "inSR": 4326,
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "*",
        "returnGeometry": "false",
        "f": "json",
    }
    r = session.get(url, params=params, timeout=TIMEOUT_S)
    r.raise_for_status()
    j = r.json()
    if "error" in j:
        raise RuntimeError(f"ArcGIS error: {j['error'].get('message', j['error'])}")
    return j


def first_attr(features: list, *keys: str) -> Optional[Any]:
    """Pull the first non-empty attribute matching any of the candidate
    keys (case-insensitive). Indonesian gov layers use inconsistent
    naming — NAMOBJ vs ZONA vs JENIS_ZONA across services — so we try
    several before giving up."""
    if not features:
        return None
    attrs = features[0].get("attributes", {})
    norm = {str(k).lower(): v for k, v in attrs.items()}
    for k in keys:
        v = norm.get(k.lower())
        if v not in (None, "", -1, "Null"):
            return v
    return None


@dataclass
class LandProfile:
    Input_Lat: float
    Input_Lon: float
    Zonasi_Type: Optional[str] = None
    Zonasi_Code: Optional[str] = None
    KDB_Percentage: Optional[float] = None  # Koefisien Dasar Bangunan
    KLB_Ratio: Optional[float] = None       # Koefisien Lantai Bangunan
    LSD_Status: Optional[str] = None        # "Yes" / "No"
    NIB_Status: Optional[str] = None        # "Registered" / "Unregistered"
    Ownership_Type: Optional[str] = None    # Hak Milik / HGB / Hak Pakai
    Error: Optional[str] = None


def safe_float(v: Any) -> Optional[float]:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def profile_one(session: requests.Session, lat: float, lon: float) -> LandProfile:
    out = LandProfile(Input_Lat=lat, Input_Lon=lon)
    errors: list[str] = []

    # 1. RDTR zoning — gives Zonasi type/code + KDB + KLB.
    try:
        rdtr = arcgis_query(session, RDTR_QUERY_URL, lat, lon)
        feats = rdtr.get("features", [])
        out.Zonasi_Type = first_attr(
            feats, "NAMOBJ", "ZONA", "JENIS_ZONA", "ZONA_TIPE",
            "ZONA_NAMA", "FUNGSI_LAH", "FUNGSI",
        )
        out.Zonasi_Code = first_attr(
            feats, "KODE_ZONA", "ZONA_KODE", "ZONA_KD", "KODA",
            "KODE_SUBZONA", "SUB_KODE",
        )
        out.KDB_Percentage = safe_float(first_attr(feats, "KDB", "NILAI_KDB", "KDB_MAX"))
        out.KLB_Ratio = safe_float(first_attr(feats, "KLB", "NILAI_KLB", "KLB_MAX"))
    except Exception as e:
        errors.append(f"RDTR: {e}")

    # 2. LSD — protected rice fields. Presence of any feature = inside.
    try:
        lsd = arcgis_query(session, LSD_QUERY_URL, lat, lon)
        out.LSD_Status = "Yes" if lsd.get("features") else "No"
    except Exception as e:
        errors.append(f"LSD: {e}")

    # 3. BHUMI cadastral — NIB + ownership type.
    try:
        parcel = arcgis_query(session, BHUMI_PARCEL_URL, lat, lon)
        feats = parcel.get("features", [])
        if feats:
            out.NIB_Status = "Registered"
            out.Ownership_Type = first_attr(
                feats, "TIPE_HAK", "JENIS_HAK", "HAK", "STATUS_HAK",
            )
        else:
            out.NIB_Status = "Unregistered"
    except Exception as e:
        errors.append(f"BHUMI: {e}")

    if errors:
        out.Error = " | ".join(errors)
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
            # openpyxl missing → fall back to CSV with adjusted name.
            fallback = output.rsplit(".", 1)[0] + ".csv"
            df.to_csv(fallback, index=False)
            print(f"openpyxl not installed; wrote CSV to {fallback}", file=sys.stderr)
            return
    print(df.to_string(index=False))
    print(f"\nWrote {len(df)} rows → {output}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Indonesia land profile fetcher")
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
    elif args.input:
        df_in, lat_col, lon_col = read_input_csv(args.input)
        n = len(df_in)
        for i, row in df_in.iterrows():
            lat, lon = float(row[lat_col]), float(row[lon_col])
            print(f"[{i + 1}/{n}] {lat:.5f}, {lon:.5f}", file=sys.stderr)
            rows.append(profile_one(session, lat, lon))
            if i + 1 < n:
                time.sleep(args.delay)
    else:
        ap.error("provide either --input CSV or --lat / --lon")

    if args.input:
        write_output(rows, args.output)
    else:
        # Single-point mode → just print JSON for piping.
        print(json.dumps(asdict(rows[0]), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
