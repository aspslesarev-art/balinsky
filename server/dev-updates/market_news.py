#!/usr/bin/env python3
"""Новости рынка Бали → карточки владельцу в @BalinskyBot.

Раз в неделю (systemd timer market-news.timer на smarthouse) Claude по подписке
ищет в интернете свежие новости Бали, важные покупателю и инвестору, читает
первоисточник и пишет короткий черновик. Каждая новость — запись dev_updates
(chat_id = 0, draft.market = true) и карточка с кнопками «Новость / Пропустить».
Дальше всё как у застройщиков: кнопка → worker.py переводит на 8 языков и
публикует (externalUrl = первоисточник), ответ на карточку — правка текста.

Запуск: python3 market_news.py [--dry]  (--dry — только напечатать черновики)
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone

import requests

import worker as w

MARKET_CHAT = 0
MAX_ITEMS = 8

PROMPT = """Ты редактор новостей сайта balinsky.info — независимого информационного каталога
недвижимости Бали. Читатели — покупатели и инвесторы (часто иностранцы), не агенты. Сайт не агентство:
не продаёт, не берёт заявок и комиссий.

Сегодня {today}. Найди новости Бали, вышедшие с {since} по сегодня, которые реально важны тому, кто
покупает или уже владеет недвижимостью на Бали: законы и правила (земля, зонирование, разрешения,
лизхолд, визы для владельцев, налоги, аренда посуточно), мораторий и запреты на стройку, инфраструктура
(дороги, аэропорт, транспорт, вода, свет), туристический поток и загрузка, крупные новые проекты и отели,
курс рупии и ставка Банка Индонезии, мошенничество и суды, связанные с недвижимостью, экология и риски
(наводнения, мусор, оползни). Не берём: светскую хронику, ДТП, мелкий криминал без связи с
недвижимостью, рекламу одного застройщика, туристические советы.

Где искать (WebSearch + WebFetch):
- https://balidiscovery.com/wp-json/wp/v2/posts?after={since}T00:00:00&per_page=50&_fields=date,link,title
- https://en.antaranews.com/search?q=bali
- https://balirealestate.substack.com/archive (еженедельный дайджест рынка — читай последние выпуски)
- thebalitimes.com, thebalisun.com, bisnis.com, balipost.com, kompas.com, detik.com (bali properti)
- поиск: "Bali property", "Bali villa regulation", "Bali moratorium", "Bali leasehold", "Bali tourism arrivals",
  "Bali investment", "Bali tata ruang", "Bali izin vila" и т.п.

Уже опубликованы или уже предлагались — НЕ повторяй эти темы (даже из другого источника):
{known}

Для каждой выбранной новости ОБЯЗАТЕЛЬНО открой первоисточник через WebFetch и пиши только по нему.
Цифры, даты, названия, имена ведомств — только оттуда. Нет данных — не пиши. Не смешивай события.
Если дату публикации не удалось подтвердить или она раньше {since} — не бери.

Стиль текста (по-русски, как для человека с СДВГ):
- title — до 90 знаков, без точки в конце: что случилось и где. Без кликбейта.
- seoDescription — 120–160 знаков.
- body — 2–4 коротких абзаца простыми словами через пустую строку, без терминов и аббревиатур
  (если без термина никак — объясни в скобках). Потом отдельный абзац
  «**Что это значит для покупателя:** ...» — 1–2 предложения, практический вывод без советов
  «покупайте/успейте». Последняя строка: «Источник: <издание>, <дата словами, напр. 18 ноября 2026>.»
- Нейтрально. Без «!», эмодзи, капса, обещаний доходности и роста цен. Заявления чиновников и
  компаний — как их заявления («по словам губернатора…»).
- Не призывай писать Balinsky, оставлять заявки; не упоминай сайт.

Отбери не больше {max_items} самых важных новостей (лучше 3 сильные, чем 8 слабых). Если ничего
стоящего нет — пустой список.

Ответь ОДНИМ JSON-объектом, без текста вокруг:
{{"items": [{{"title": "...", "seoDescription": "...", "body": "...", "date": "YYYY-MM-DD (дата публикации
первоисточника)", "sourceUrl": "https://... первоисточник", "sourceName": "ANTARA",
"why": "одна фраза владельцу: почему это важно покупателю"}}]}}
"""


def known_topics(since_days=60):
    """Заголовки и ссылки недавних новостей сайта и уже предложенных карточек рынка."""
    manifest = w.storage_get_json("news", "_news.json", {"items": []})
    cutoff = (datetime.now(w.WALL) - timedelta(days=since_days)).strftime("%Y-%m-%d")
    lines, urls = [], set()
    for i in manifest.get("items") or []:
        if (i.get("date") or "") >= cutoff:
            lines.append(f"- {i.get('date')} {i.get('title')}")
            if i.get("externalUrl"):
                urls.add(i["externalUrl"])
    since_ts = (datetime.now(timezone.utc) - timedelta(days=since_days)).isoformat()
    for r in w.sb_get("dev_updates", {"select": "status,draft", "chat_id": f"eq.{MARKET_CHAT}",
                                      "created_at": f"gte.{since_ts}"}):
        d = r["draft"] or {}
        if d.get("title"):
            lines.append(f"- (карточка, {r['status']}) {d['title']}")
        if d.get("sourceUrl"):
            urls.add(d["sourceUrl"])
    return lines, urls, manifest


def last_market_date(manifest):
    dates = [i.get("date") for i in manifest.get("items") or [] if i.get("externalUrl") and i.get("date")]
    return max(dates) if dates else None


def ask_claude(prompt):
    args = [w.CLAUDE, "-p", "--model", "sonnet", "--max-turns", "80", "--output-format", "text",
            "--allowedTools", "WebSearch,WebFetch"]
    p = subprocess.run(args, input=prompt, cwd=w.DIR, capture_output=True, text=True, timeout=2400,
                       env={**os.environ, "CLAUDE_CODE_OAUTH_TOKEN": w.ENV["CLAUDE_CODE_OAUTH_TOKEN"]})
    if p.returncode:
        raise RuntimeError(f"claude exit {p.returncode}: {(p.stderr or p.stdout)[-400:]}")
    out = p.stdout
    a, b = out.find("{"), out.rfind("}")
    if a < 0 or b < a:
        raise RuntimeError(f"claude: no json: {out[-300:]}")
    return json.loads(out[a:b + 1])


def source_ok(url):
    """Первоисточник реально открывается (Claude не выдумал ссылку)."""
    try:
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (balinsky-tools/1.0)"}, timeout=30,
                         allow_redirects=True)
        return r.status_code < 400 or r.status_code in (403, 429)  # антибот-защита ≠ битая ссылка
    except requests.RequestException:
        return False


def main():
    dry = "--dry" in sys.argv
    today = w.today_str()
    lines, urls, manifest = known_topics()
    since = last_market_date(manifest) or (datetime.now(w.WALL) - timedelta(days=7)).strftime("%Y-%m-%d")
    # Не дальше двух недель назад — старьё неинтересно, даже если долго не запускались.
    since = max(since, (datetime.now(w.WALL) - timedelta(days=14)).strftime("%Y-%m-%d"))
    w.log("market news since", since, "known", len(lines))

    res = ask_claude(PROMPT.format(today=today, since=since, known="\n".join(lines[:150]) or "- (пусто)",
                                   max_items=MAX_ITEMS))
    items = res.get("items") or []
    sent = 0
    for d in items[:MAX_ITEMS]:
        src = (d.get("sourceUrl") or "").strip()
        if not (d.get("title") and d.get("body") and src.startswith("http")):
            w.log("skip: нет полей", d.get("title"))
            continue
        if src in urls:
            w.log("skip: уже было", src)
            continue
        if not source_ok(src):
            w.log("skip: источник не открывается", src)
            continue
        urls.add(src)
        draft = {**d, "market": True, "kind": "news"}
        if dry:
            w.log("DRY", json.dumps(draft, ensure_ascii=False)[:2000])
            continue
        row = w.sb_insert("dev_updates", {"chat_id": MARKET_CHAT, "developer_name": None, "developer_slug": None,
                                          "msg_ids": [], "last_msg_id": 0, "status": "pending",
                                          "suggested_kind": "news", "draft": draft, "media": []})
        mid = w.send_card(row, None)
        if mid:
            w.sb_update("dev_updates", {"id": row["id"]}, {"tg_message_id": mid})
        sent += 1
        w.log("card", row["id"], d["title"])

    if not dry:
        text = (f"Новости рынка за {since[8:10]}.{since[5:7]}–{today[8:10]}.{today[5:7]}: {sent} шт. выше. "
                "Нажми «Новость» — выйдет на сайте на 10 языках, «Пропустить» — нет."
                if sent else f"Новости рынка: с {since[8:10]}.{since[5:7]} ничего важного для покупателей не нашёл.")
        w.tg("sendMessage", chat_id=w.OWNER, text=text)


if __name__ == "__main__":
    main()
