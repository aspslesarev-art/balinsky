"""Bali's climate around 2050 from CMIP6 (Copernicus Interactive Climate Atlas,
dataset multi-origin-c3s-atlas, 1° grid, 19–30 models per scenario).

One island-wide answer, not per listing: a 1° cell (~110 km) covers all of
Bali. We take the cell centred on 8.5°S 115.5°E.

Models disagree on absolute values (a cold model reads Bali at 24°C), so we
never quote a model's raw number. For each model: mean of 2041–2060 minus
mean of 1995–2014 (the IPCC AR6 baseline); then the median and the 10–90%
spread across models. Two scenarios: SSP2-4.5 (middle road) and SSP5-8.5
(high emissions).

Writes lib/bali-climate-2050.json, rendered by ClimateBlock. Free; needs a
CDS key in ~/.cdsapirc. Downloads cached in .tmp-cmip6.

  ~/.venvs/analytics/bin/python scripts/cmip6-bali-2050.py
"""
import glob
import json
import os
import zipfile

import cdsapi
import numpy as np
import xarray as xr

CACHE = '.tmp-cmip6'
OUT = os.path.join('lib', 'bali-climate-2050.json')
LAT, LON = -8.5, 115.5
BASE = (1995, 2014)
FUT = (2041, 2060)
SCENARIOS = ['ssp2_4_5', 'ssp5_8_5']
# variable → (file prefix in the atlas, how to summarise a year, change kind)
VARS = {
    'monthly_temperature': ('t', 'mean', 'abs'),
    'monthly_daily_maximum_temperature': ('tx', 'mean', 'abs'),
    'monthly_precipitation': ('pr', 'sum', 'pct'),
    'annual_cooling_degree_days': ('cd', 'sum', 'pct'),
}


def load(exp, var):
    folder = os.path.join(CACHE, f'{exp}_{var}')
    if not glob.glob(os.path.join(folder, '*.nc')):
        z = folder + '.zip'
        if not os.path.exists(z):
            period = '1850-2014' if exp == 'historical' else '2015-2100'
            cdsapi.Client(quiet=True, progress=False, timeout=300).retrieve('multi-origin-c3s-atlas', {
                'origin': 'cmip6', 'experiment': exp, 'domain': 'global', 'period': period,
                'variable': var, 'area': [-7.5, 114, -9.5, 116.5]}).download(z)
        with zipfile.ZipFile(z) as f:
            f.extractall(folder)
    d = xr.open_dataset(glob.glob(os.path.join(folder, '*.nc'))[0])
    name = [v for v in d.data_vars if d[v].ndim >= 3][0]
    # `member` is a bare 0..N index that differs between files; the model name
    # lives in member_id. Matching on the index pairs one model's past with
    # another model's future (it once gave Bali a 1.3°C cooling by 2050).
    da = d[name].assign_coords(member=[str(m) for m in d['member_id'].values])
    return da.sel(lat=LAT, lon=LON, method='nearest')


def yearly(da, how):
    g = da.groupby('time.year')
    return g.mean() if how == 'mean' else g.sum()


def main():
    out = {'src': 'Copernicus C3S Atlas, CMIP6', 'cell': [LAT, LON], 'baseline': list(BASE), 'future': list(FUT)}
    for var, (key, how, kind) in VARS.items():
        hist = yearly(load('historical', var), how).sel(year=slice(*BASE)).mean('year')
        for exp in SCENARIOS:
            fut = yearly(load(exp, var), how).sel(year=slice(*FUT)).mean('year')
            members = sorted(set(hist['member'].values) & set(fut['member'].values))
            h = hist.sel(member=members).values
            f = fut.sel(member=members).values
            delta = f - h if kind == 'abs' else 100 * (f - h) / h
            delta = delta[np.isfinite(delta)]
            out.setdefault(key, {})[exp] = {
                'median': round(float(np.median(delta)), 1),
                'p10': round(float(np.percentile(delta, 10)), 1),
                'p90': round(float(np.percentile(delta, 90)), 1),
                'models': int(delta.size),
                'unit': '°C' if kind == 'abs' else '%',
            }
    with open(OUT, 'w', encoding='utf8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
