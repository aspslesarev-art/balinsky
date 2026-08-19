"""Многофакторная модель распроданности рынка.

Одномерные срезы («виллы продаются лучше») смешивают эффекты: виллы стоят
в других районах и стоят других денег. Логистическая регрессия разделяет
их — показывает, что происходит с шансами продажи, если менять один
фактор, а остальные держать неизменными. Плюс проверка хи-квадрат: не
объясняются ли найденные различия размером выборки.

Требует окружения с scipy/statsmodels:
  ~/.venvs/analytics/bin/python scripts/market-model.py
"""
import os, json, urllib.request, urllib.parse
import pandas as pd, numpy as np
import statsmodels.formula.api as smf
from scipy import stats

def env(path):
    out = {}
    for line in open(path, encoding='utf-8'):
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line: continue
        k, v = line.split('=', 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out

E = env(os.path.expanduser('~/balinsky/.env.local'))
BASE, KEY = E['NEXT_PUBLIC_SUPABASE_URL'], E['SUPABASE_SERVICE_KEY']

def fetch(table, select, limit=1000):
    rows, offset = [], 0
    while True:
        url = f"{BASE}/rest/v1/{table}?select={urllib.parse.quote(select)}&limit={limit}&offset={offset}"
        req = urllib.request.Request(url, headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})
        chunk = json.load(urllib.request.urlopen(req, timeout=60))
        rows += chunk
        if len(chunk) < limit: break
        offset += limit
    return pd.DataFrame(rows)

df = fetch('market_core', 'status,kind,district,build_status,price_usd,area_m2,bedrooms,price_per_m2,developer,complex')
print(f'загружено: {len(df)} юнитов\n')

df['sold'] = (df['status'] == 'sold').astype(int)
for c in ['price_usd', 'area_m2', 'price_per_m2', 'bedrooms']:
    df[c] = pd.to_numeric(df[c], errors='coerce')

# --- 1. Значимость одномерных различий -------------------------------
print('=== Проверка: различия — сигнал или шум? ===')
def chi2(name, a_sold, a_n, b_sold, b_n):
    table = np.array([[a_sold, a_n - a_sold], [b_sold, b_n - b_sold]])
    chi, p, _, _ = stats.chi2_contingency(table)
    verdict = 'значимо' if p < 0.05 else 'НЕ значимо (может быть случайностью)'
    print(f'  {name}: p={p:.4f} — {verdict}')

t = df[df.kind.isin(['villa', 'apartment'])]
v, a = t[t.kind == 'villa'], t[t.kind == 'apartment']
chi2('виллы vs апартаменты', v.sold.sum(), len(v), a.sold.sum(), len(a))

ap = t[(t.kind == 'apartment') & t.price_usd.notna()]
hi, lo = ap[ap.price_usd >= 200000], ap[ap.price_usd < 200000]
chi2('апартаменты дороже/дешевле $200k', hi.sold.sum(), len(hi), lo.sold.sum(), len(lo))

st = df[df.build_status.isin(['Построен', 'Строится'])]
b, s = st[st.build_status == 'Построен'], st[st.build_status == 'Строится']
chi2('построен vs строится', b.sold.sum(), len(b), s.sold.sum(), len(s))

bb = df[df.district == 'Batu Bolong']; um = df[df.district == 'Umalas']
chi2('Batu Bolong vs Umalas', bb.sold.sum(), len(bb), um.sold.sum(), len(um))

# --- 2. Многофакторная модель ----------------------------------------
print('\n=== Что влияет при прочих равных (логистическая регрессия) ===')
m = df[df.kind.isin(['villa','apartment']) & df.price_usd.notna() & df.area_m2.notna()].copy()
big = m.district.value_counts()[lambda s: s >= 40].index
m = m[m.district.isin(big)]
m['price_100k'] = m.price_usd / 100_000
m['area_100'] = m.area_m2 / 100
print(f'выборка модели: {len(m)} юнитов, районов: {m.district.nunique()}')

fit = smf.logit('sold ~ price_100k + area_100 + C(kind) + C(district)', data=m).fit(disp=0)
odds = np.exp(fit.params)
res = pd.DataFrame({'эффект (odds ratio)': odds.round(3), 'p-value': fit.pvalues.round(4)})
res = res[~res.index.str.contains('Intercept')]
print(res.sort_values('эффект (odds ratio)', ascending=False).to_string())
print(f'\nPseudo R² = {fit.prsquared:.3f}')
