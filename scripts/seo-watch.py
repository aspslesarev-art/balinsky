#!/usr/bin/env python3
# SEO-сторож balinsky.info — раз в неделю (чт 09:00, launchd com.andrei.balinsky-seo-watch).
# Бесплатно: только Search Console API (чтение) + проверка сайта. Платных нейросетей нет.
# Шлёт в Telegram короткую сводку, полный список — в reports/seo-watch/latest.md
# (по нему в пятницу перед выкладкой правим заголовки).
import json, os, random, re, subprocess, sys, time, urllib.request, datetime as dt

ROOT = os.path.expanduser("~/balinsky")
OUT = f"{ROOT}/reports/seo-watch"
UA = {"User-Agent": "balinsky-tools/1.0"}  # без него сайт отвечает 429
# Запросы покупателя, за которыми следим каждую неделю (позиция 28 дней).
TRACK = [
    "bali villas for sale", "bali villa for sale", "buy villa in bali", "buy villa bali",
    "canggu villas for sale", "2 bedroom villa for sale bali", "3 bedroom villa for sale bali",
    "bali apartments for sale", "bali property for sale", "bali leasehold villa",
    "купить виллу на бали", "купить апартаменты на бали", "недвижимость на бали",
]


def env(name):
    try:
        for line in open(f"{ROOT}/.env.local"):
            if line.startswith(name + "="):
                v = line.split("=", 1)[1].strip().strip('"')
                return None if v.startswith("[") else v
    except FileNotFoundError:
        pass
    return None


def tg(text):
    token = env("TELEGRAM_BOT_TOKEN")
    if not token:
        print("нет TELEGRAM_BOT_TOKEN — только в файл", file=sys.stderr)
        return
    data = json.dumps({"chat_id": env("ADMIN_TELEGRAM_CHAT_ID") or "555450800", "text": text,
                       "disable_web_page_preview": True}).encode()
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage",
                                 data=data, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=20)


def fetch(url):
    try:
        req = urllib.request.Request(url, headers=UA, method="GET")
        # без автоперехода: редирект из карты сайта — тоже проблема
        opener = urllib.request.build_opener(NoRedirect)
        r = opener.open(req, timeout=30)
        return r.status, r.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:  # сеть/таймаут
        return 0, str(e)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def run(cmd):
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=600)
    return p.returncode, p.stdout + p.stderr


def main():
    os.makedirs(OUT, exist_ok=True)
    today = dt.date.today().isoformat()
    problems, lines = [], []

    # 1. Данные Google за 28 дней
    code, out = run(["node", "scripts/gsc-report.mjs", "28"])
    if code != 0 or not os.path.exists(f"{ROOT}/reports/gsc-latest.json"):
        tg("SEO-сторож: не смог взять данные из Google (истёк вход). Напиши Claude: «почини SEO-сторожа»")
        print(out[-2000:], file=sys.stderr)
        sys.exit(1)
    d = json.load(open(f"{ROOT}/reports/gsc-latest.json"))
    if d.get("endDate") and d["endDate"] < (dt.date.today() - dt.timedelta(days=6)).isoformat():
        problems.append("данные Google старые — проверить скрипт")
    q = {r["keys"][0]: r for r in d["byQuery"]}
    pages = d["byPage"]
    clicks = sum(r["clicks"] for r in pages)
    impr = sum(r["impressions"] for r in pages)

    prev = None
    snaps = sorted(f for f in os.listdir(OUT) if re.match(r"\d{4}-\d\d-\d\d\.json$", f) and f[:10] != today)
    if snaps:
        prev = json.load(open(f"{OUT}/{snaps[-1]}"))

    # 2. Запросы покупателя
    track = []
    for k in TRACK:
        r = q.get(k)
        pos = round(r["position"], 1) if r else None
        was = (prev or {}).get("track", {}).get(k)
        track.append((k, pos, was, r["impressions"] if r else 0))

    # 3. Почти в топе: позиция 8–20, есть показы
    near = sorted([r for r in d["byQuery"] if 8 <= r["position"] <= 20 and r["impressions"] >= 20],
                  key=lambda r: -r["impressions"])[:15]

    # 4. Показываются, но не нажимают: топ-10, показов много, CTR < 1%
    lowctr = sorted([r for r in pages if r["position"] <= 10 and r["impressions"] >= 150 and r["ctr"] < 0.01],
                    key=lambda r: -r["impressions"])[:10]

    # 5. Карта сайта: части, которых Google не получал
    code, sm_out = run(["node", "scripts/gsc-sitemaps.mjs"])
    registered = set(re.findall(r"https://balinsky\.info/sitemap/[\w-]+\.xml", sm_out))
    sm_err = re.findall(r"\[(ERRORS:\d+|WARN:\d+)\s*\].*?(https://\S+)", sm_out)
    st, idx = fetch("https://balinsky.info/sitemap/index.xml")
    shards = re.findall(r"<loc>([^<]+)</loc>", idx) if st == 200 else []
    if st != 200:
        problems.append(f"карта сайта не открывается (код {st})")
    missing = [s for s in shards if s not in registered]
    gone = [s for s in registered if s not in shards and not s.endswith("/index.xml")]

    # 6. Выборочная проверка страниц из карты сайта (размеренно — Vercel режет всплески)
    urls = []
    for s in shards:
        st2, xml = fetch(s)
        if st2 == 200:
            urls += re.findall(r"<loc>([^<]+)</loc>", xml)
        time.sleep(1)
    random.seed(today)
    sample = random.sample(urls, min(80, len(urls)))
    bad = []
    for u in sample:
        st3, _ = fetch(u)
        if st3 != 200:
            bad.append((st3, u))
        time.sleep(1.5)

    # --- отчёт ---
    snap = {"date": today, "clicks": clicks, "impressions": impr,
            "track": {k: p for k, p, _, _ in track if p is not None}}
    json.dump(snap, open(f"{OUT}/{today}.json", "w"), ensure_ascii=False, indent=1)

    def arrow(now, was):
        if now is None or was is None:
            return ""
        diff = was - now
        return f" (↑{diff:.0f})" if diff >= 1 else f" (↓{-diff:.0f})" if diff <= -1 else ""

    md = [f"# SEO-сторож · {today}", "",
          f"28 дней (1000 главных страниц): {clicks} переходов, {impr} показов" + (
              f" (неделю назад {prev['clicks']} / {prev['impressions']})" if prev else ""), "",
          "## Запросы покупателя (место в Google)"]
    md += [f"- {k}: {p if p is not None else 'нет показов'}{arrow(p, w)} · показов {i}" for k, p, w, i in track]
    md += ["", "## Почти в топе (8–20 место) — дожать заголовком/текстом"]
    md += [f"- {r['keys'][0]} — место {r['position']:.1f}, показов {r['impressions']}" for r in near]
    md += ["", "## Показываются, но не нажимают (CTR < 1%) — переписать заголовок"]
    md += [f"- {r['keys'][0]} — место {r['position']:.1f}, показов {r['impressions']}, CTR {r['ctr']*100:.1f}%" for r in lowctr]
    md += ["", "## Карта сайта"]
    md += [f"- НЕ отправлено в Google: {s}" for s in missing] or ["- все части отправлены"]
    md += [f"- лишняя регистрация (части больше нет): {s}" for s in gone]
    md += [f"- {e}: {u}" for e, u in sm_err]
    md += ["", f"## Проверка {len(sample)} случайных страниц"]
    md += [f"- {c}: {u}" for c, u in bad] or ["- все открываются"]
    if problems:
        md += ["", "## Проблемы"] + [f"- {p}" for p in problems]
    open(f"{OUT}/latest.md", "w").write("\n".join(md) + "\n")

    # Короткая сводка в Telegram
    tl = [f"SEO-сторож, {dt.date.today():%d.%m}",
          f"За 28 дней: {clicks} переходов из Google" + (f" (было {prev['clicks']})" if prev else "")]
    top = [t for t in track if t[1] is not None][:5]
    if top:
        tl.append("Главные запросы, место: " + "; ".join(f"{k} {p}{arrow(p, w)}" for k, p, w, _ in top))
    tl.append(f"Почти в топе: {len(near)} запросов. Не нажимают: {len(lowctr)} страниц.")
    todo = []
    if missing:
        todo.append(f"{len(missing)} новых частей карты сайта не отправлены в Google")
    if gone or sm_err:
        todo.append(f"{len(gone) + len(sm_err)} ошибок карты сайта")
    if bad:
        todo.append(f"{len(bad)} из {len(sample)} проверенных страниц не открываются")
    todo += problems
    tl.append(("Надо починить: " + "; ".join(todo)) if todo else "Поломок нет.")
    tl.append("Напиши Claude: «разбери SEO-сторожа» — поправлю к пятничной выкладке")
    tg("\n".join(tl))
    print("\n".join(md))


if __name__ == "__main__":
    main()
