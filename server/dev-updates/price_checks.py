"""
Сверка данных с застройщиками в их Telegram-чатах (владелец 21.11.2026).

Бот ведёт с менеджером застройщика живой разговор: какие комплексы сейчас в
продаже, этап и процент готовности, срок сдачи, где шахматка и актуальна ли
она, верны ли цены и что продано. Сам задаёт недостающие вопросы по одному,
а когда всё ясно — переспрашивает «правильно понял?» и после «да» застройщика
вносит изменения на сайт, владельцу — сводка. Подтверждение текстом, а не
кнопками: кнопки обрабатывал бы сайт, а так всё живёт на сервере.

Когда бот вступает в разговор:
  • раз в неделю сам (будни, 10–17 по Бали) — если чат включён в dev_price_chats;
  • когда к нему обращаются в чате («@бот», «Балинский бот», «бот, …»);
  • пока сверка открыта — отвечает на сообщения застройщика. Сообщения
    владельца и посты не по теме он пропускает.

Предохранители: цена, сдвинувшаяся больше чем на 25%, «продано N из M», новые
комплексы, комплекс снят с продажи и новая ссылка на шахматку — не меняются
сами, а уходят владельцу; не больше 6 вопросов бота за сверку; без ответа
5 дней — сверка закрыта.

Запуск: таймер раз в минуту (price-checks.timer). Вручную:
  python price_checks.py --preview CHAT_ID   — показать первое сообщение, ничего не слать
  python price_checks.py --ask CHAT_ID       — начать сверку сейчас
Таблицы: dev_price_chats, dev_price_checks — migrations/144, 145.
"""
import fcntl
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timedelta, timezone

import requests

import worker as W
from worker import ENV, OWNER, SITE, UA, log, sb_get, sb_insert, sb_update, tg

MAX_BOT_TURNS = 6
EXPIRE_DAYS = 5
MAX_JUMP = 0.25
QUIET_S = 75          # ждём, пока человек допишет
OPEN = ("asked", "clarifying", "confirming")
MENTION = re.compile(r"(@balinsky\w*bot|балинск\w*\s+бот|бот\w*\s+балинск\w*|balinsky\s+bot|^\s*бот[,!\s])", re.I)


# --- что сейчас на сайте ----------------------------------------------------------

def _num(v):
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = re.sub(r"[^\d.,]", "", v).replace(",", ".")
        try:
            return float(s) if s else None
        except ValueError:
            return None
    return None


def _first(v):
    return v[0] if isinstance(v, list) and v else v


def _ready(raw):
    if isinstance(raw, (int, float)):
        return round(raw * 100 if raw <= 1 else raw)
    return None


def chess_of(cid):
    """Ссылка на шахматку комплекса из трекера прайсов (если он её знает)."""
    links = sb_get("market_catalog_links", {"select": "developer,complex", "catalog_id": f"eq.{cid}"})
    for l in links:
        src = sb_get("market_sources", {"select": "source_url,active", "developer": f"eq.{l['developer']}",
                                        "complex": f"eq.{l['complex']}"})
        for s in src:
            if s.get("active") and s.get("source_url"):
                return s["source_url"]
    return None


# подпись → (ключ data, тип). Названия, публикация, фото и логотип — не здесь: их решает владелец.
CX_FIELDS = {
    "Рассрочка": ("Payment plan,%", "text"),
    "Лизхолд, лет": ("Leasehold", "number"),
    "Продление лизхолда": ("Leashold продление", "text"),
    "Разрешение на стройку": ("Разрешительные документы", "permit"),
    "Номер PBG": ("PBG", "text"),
    "Всего юнитов": ("Total quantity of units", "number"),
    "Посёлок или улица": ("Location 2", "text"),
    "Описание комплекса": ("Описание ЖК", "textarea"),
}
DEV_FIELDS = {
    "Описание компании": ("Описание застройщика", "textarea"),
    "Проекты и стройка": ("Строительство и недвижимость", "list"),
    "Репутация и опыт": ("Репутация и опыт", "list"),
    "Команда": ("Команда", "list"),
    "Управляющая компания": ("Управляющая компания", "list"),
    "Бизнес и сервисы": ("Бизнес и сервисы", "list"),
}
PERMITS = ["нет", "Заявка PBG", "PBG", "Заявка SLF", "SLF"]
FIELD_EN = {"Рассрочка": "Payment plan", "Лизхолд, лет": "Leasehold, years", "Продление лизхолда": "Leasehold extension",
            "Разрешение на стройку": "Building permit", "Номер PBG": "PBG number", "Всего юнитов": "Total units",
            "Посёлок или улица": "Area", "Описание комплекса": "Project description", "Описание компании": "Company description",
            "Проекты и стройка": "Projects", "Репутация и опыт": "Track record", "Команда": "Team",
            "Управляющая компания": "Management company", "Бизнес и сервисы": "Business and services"}


def _cur(d, key):
    v = d.get(key)
    return "\n".join(map(str, v)) if isinstance(v, list) else v


def developer_of(dev_name):
    rows = sb_get("raw_developers", {"select": "airtable_id,data", "data->>Developer": f"ilike.{(dev_name or '').strip()}"})
    if not rows:
        return None
    d = rows[0]["data"] or {}
    return {"id": rows[0]["airtable_id"], "name": d.get("Developer"),
            "fields": {lbl: _cur(d, k) for lbl, (k, _) in DEV_FIELDS.items()}}


def complexes(dev_name):
    out = []
    for cx in W.complexes_of(dev_name):
        rows = sb_get("raw_complexes", {"select": "data", "airtable_id": f"eq.{cx['id']}"})
        d = (rows[0]["data"] if rows else {}) or {}
        if d.get("Опубликовать") is False:
            continue
        out.append({"id": cx["id"], "name": (cx["name"] or "").strip(), "slug": cx["slug"],
                    "stage": d.get("Статус"), "ready": _ready(d.get("Готовность")),
                    "sales": d.get("Статус продаж"),
                    "year": d.get("Year of completion ") or d.get("Year of completion"),
                    "chess": chess_of(cx["id"]),
                    "fields": {lbl: _cur(d, k) for lbl, (k, _) in CX_FIELDS.items()}})
    return [c for c in out if c["name"]]


def listings(cxs):
    out = []
    for cx in cxs:
        name = cx["name"]
        vil = sb_get("raw_villas", {"select": "airtable_id,data", 'data->>"Комплекс 1"': f"eq.{name}"})
        apt = sb_get("raw_apartments", {"select": "airtable_id,data", 'data->>"SEO:Title"': f"ilike.*{name}*"})
        for kind, rows in (("villa", vil), ("apartment", apt)):
            for r in rows:
                d = r["data"] or {}
                if d.get("Опубликовать") is False or d.get("Продано") is True:
                    continue
                price = _num(d.get("price") if kind == "villa" else d.get("price_usd")) or _num(d.get("Цена"))
                if not price:
                    continue
                out.append({"id": r["airtable_id"], "kind": kind, "complex": name,
                            "bedrooms": _num(_first(d.get("Спальни") or d.get("Комнаты"))),
                            "area": _num(d.get("Площадь")), "price": price})
    return out


def groups_of(items):
    """Одинаковые по комплексу, виду, спальням, площади и цене — одна строка."""
    g = {}
    for it in items:
        key = (it["complex"], it["kind"], it["bedrooms"], round(it["area"] or 0), round(it["price"]))
        g.setdefault(key, []).append(it["id"])
    rows = []
    for i, (k, ids) in enumerate(sorted(g.items(), key=lambda x: (x[0][0], x[0][1], x[0][2] or 0, x[0][4]))):
        cx, kind, br, area, price = k
        rows.append({"g": f"G{i + 1}", "complex": cx, "kind": kind, "bedrooms": br, "area": area,
                     "price": price, "ids": ids})
    return rows


def snapshot(dev_name, lang):
    cxs = complexes(dev_name)
    return {"complexes": cxs, "rows": groups_of(listings(cxs)), "lang": lang, "developer": developer_of(dev_name)}


# --- тексты --------------------------------------------------------------------------

def money(v):
    return f"${int(round(v)):,}".replace(",", " ")


def label(r, lang):
    br = int(r["bedrooms"]) if r["bedrooms"] else None
    if lang == "en":
        kind = "Villa" if r["kind"] == "villa" else "Apartment"
        parts = [kind] + ([f"{br} BR"] if br else []) + ([f"{r['area']} m²"] if r["area"] else [])
    else:
        kind = "Вилла" if r["kind"] == "villa" else "Апартаменты"
        parts = [kind] + ([f"{br} сп."] if br else []) + ([f"{r['area']} м²"] if r["area"] else [])
    return ", ".join(parts)


def cx_line(c, lang):
    en = lang == "en"
    stage = {"Строится": "under construction", "Построен": "completed"}.get(c["stage"], c["stage"]) if en else (c["stage"] or "").lower()
    bits = [b for b in [stage or None,
                        (f"handover {c['year']}" if en else f"сдача {c['year']}") if c["year"] else None,
                        (f"{c['ready']}% ready" if en else f"готовность {c['ready']}%") if c["ready"] is not None else None] if b]
    head = c["name"] + (f" — {', '.join(bits)}" if bits else "")
    chess = (f"Availability chart: {c['chess']}" if en else f"Шахматка: {c['chess']}") if c["chess"] else \
        ("Availability chart: we don't have it" if en else "Шахматка: у нас её нет")
    return head + "\n" + chess


def snapshot_text(snap, limit=40):
    lang, lines, n = snap["lang"], [], 0
    by_cx = {}
    for r in snap["rows"]:
        by_cx.setdefault(r["complex"], []).append(r)
    for c in snap["complexes"]:
        lines.append("\n" + cx_line(c, lang))
        for r in by_cx.get(c["name"], []):
            n += 1
            if n > limit:
                continue
            k = len(r["ids"])
            lines.append(f"• {label(r, lang)} — {money(r['price'])}" + (f" ({k} {'units' if lang == 'en' else 'шт.'})" if k > 1 else ""))
    if n > limit:
        lines.append(f"\n…{'and' if lang == 'en' else 'и ещё'} {n - limit}")
    return "\n".join(lines).strip()


def ask_text(snap):
    if snap["lang"] == "en":
        return ("Hello! This is the Balinsky bot. We're checking your projects on the site so buyers see current "
                "information. Here's what we have now:\n\n" + snapshot_text(snap) +
                "\n\nCould you help check:\n1. Which projects are on sale now — is everything here, anything new?"
                "\n2. Construction stage, % ready and handover date — correct?\n3. Is the availability chart at the "
                "link current? If not, please send a fresh one.\n4. Are the prices right? What's sold?\n\n"
                "Reply in one message or in parts, voice messages are fine too.")
    return ("Добрый день! Это бот Balinsky. Сверяем данные о ваших объектах на сайте, чтобы покупатели видели "
            "актуальное. Сейчас у нас так:\n\n" + snapshot_text(snap) +
            "\n\nПомогите сверить:\n1. Какие комплексы сейчас в продаже — всё ли здесь, есть ли новые?"
            "\n2. Этап стройки, процент готовности и срок сдачи — верны?\n3. Шахматка по ссылке актуальная? "
            "Если нет — пришлите свежую.\n4. Цены верны? Что продано?\n\n"
            "Можно одним сообщением или по частям, голосом тоже можно.")


# --- разговор -----------------------------------------------------------------------

TASK_CHECK = """Задача — сверить данные о его комплексах на сайте: что в продаже, этап стройки, процент
готовности, срок сдачи, где шахматка и актуальна ли она, верны ли цены, что продано."""

# Владелец 26.11.2026: просьбы «удалите/уберите» — не удалять, а сохранить объект с
# актуальным статусом. Удаление — только если застройщик настаивает, и решает владелец.
TASK_REQUEST = """Ты администратор страницы этого застройщика на сайте. Он пишет в чат, что поменять: цены,
что продано, этап, готовность, срок сдачи, рассрочку, описание и т.п. Сам ты меняешь только то, что есть
в данных ниже: цены и «продано» по юнитам (prices), этап/готовность/срок/«всё продано» по комплексу
(complexes), остальные поля комплекса и компании — через edits (подпись поля ровно как в данных ниже).
Описание пиши на русском, по фактам застройщика, без рекламных превосходных степеней, 2–5 предложений;
если он прислал готовый текст — перескажи его по-русски без потери фактов.
Не можешь сам: добавить новый комплекс или юнит, заменить фото, рендеры или логотип, переименовать,
удалить. На такое отвечай «Передам команде, сделаем» (на его языке) и опиши просьбу в other —
файлы и ссылки укажи. Цифр не придумывай: нет цифры — спроси.
Это не полная сверка: не спрашивай о том, о чём он не писал. Как только ясно, что менять, — ready=true и
reply пустой: бот сам перечислит изменения и спросит «Правильно понял?».
Если он просит убрать или удалить объект:
интерес сайта — ничего не удалять, а держать объекты с актуальным статусом и актуальными ценами:
сданные и распроданные проекты показывают покупателю опыт застройщика, а страницы нужны для поиска.
Отвечай по схеме «переспроси → согласись → добавь», одним сообщением:
1. Переспроси причину, не принимай на веру: начни с «Правильно понимаю, что … распродан(ы) и вы его больше
   не продаёте?» (или: цена изменилась? проект передан другому?).
2. Согласись, в чём он прав (например: цены на распроданный объект показывать не нужно).
3. Предложи сохранить объект с пометкой «Продано» и без цен — покупатели видят его реализованные проекты.
Пример: «Правильно понимаю, что ERA by OXO распродан и вы его больше не продаёте? Если да — согласен,
цены показывать не нужно. Предлагаю оставить его на сайте с пометкой «Продано», без цен: покупатели будут
видеть ваши проекты и что они уже распроданы. Так подойдёт?»
- Проект больше не их (передан, продан другому застройщику) — тоже предложи пометку «Продано» без цен.
- Скрыть цену — уточни: цена изменилась (тогда какая новая) или продано.
- Согласился на «Продано» — sold_out=true у комплекса, agreed=true, ready=true, reply пустой.
- После предложения всё равно настаивает на полном удалении — не спорь: reply — «Хорошо, передам
  команде» только на языке собеседника (не дублируй на втором языке), remove_insist=true, ready=true.
- На вопросы не про эту просьбу (сотрудничество, проверка документов, вопросы Андрею) не отвечай.
- Не обещай ничего, кроме пометки «Продано», правки цены или передачи вопроса команде."""

TALK = """Ты бот сайта balinsky.info (информационный каталог недвижимости Бали) в рабочем чате с менеджером
застройщика. {task}

Ниже — что сейчас на сайте, разговор до этого, уже собранные факты и новые сообщения из чата (текст,
расшифровки голосовых, файлы — пути к ним даны, открой их инструментом Read).

Как себя вести:
- Отвечай коротко (1–3 строки), вежливо, на языке собеседника, без эмодзи и без канцелярита.
- Если новые сообщения не тебе (люди говорят между собой, пост-новость, приветствие всем) — reply пустой.
- Если к тебе обратились с вопросом — ответь по данным сайта ниже. Не обещай сделок, не давай советов
  покупателям, не придумывай цифр. Balinsky — информационный сайт, в сделках не участвует.
- Собирай факты. Меняй факт, только если собеседник сказал его явно. Валюта сайта — USD; цену в рупиях
  переведи по 16 000 IDR = 1 USD и отметь в other.
- Чего-то не хватает и это важно — задай ОДИН короткий вопрос (не повторяй уже отвеченное). Если
  собеседник занят или просит позже — коротко ответь «хорошо» и ready=false.
- ready=true, когда по всем комплексам ясны продажи, этап/готовность/срок, шахматка и цены — или когда
  собеседник ясно дал понять, что больше добавить нечего (при просьбе — когда она решена). Тогда reply
  пустой, если не сказано иначе (бот сам перечислит изменения).
- agreed=true, только если собеседник прямо согласился на изменения, которые ты сам ему предложил.
- Сейчас вопросов бота в разговоре: {turns} из {max_turns}. Если лимит исчерпан — ready=true.

Верни только JSON:
{{"reply": "",
  "ready": false,
  "agreed": false,
  "facts": {{
    "complexes": {{"<точное название с сайта>": {{"on_sale": true|false|null, "stage": "Строится"|"Построен"|null,
        "readiness_pct": число|null, "completion_year": число|null, "chess_url": "ссылка"|null, "chess_ok": true|false|null,
        "prices_ok": true|false|null, "sold_out": true|false|null, "remove_insist": true|false|null}}}},
    "new_complexes": ["название — что известно"],
    "edits": [{{"target": "complex"|"developer", "name": "<комплекс; для developer — пусто>", "field": "<подпись>", "value": "..."}}],
    "prices": [{{"g": "G3", "new_price": 195000|null, "sold_out": false, "sold_count": null}}],
    "other": ""}}}}
В facts верни ВСЕ собранные факты (старые плюс новые), а не только новые.

На сайте сейчас:
{site}

Разговор до этого:
{log}

Собранные факты:
{facts}

Новые сообщения:
{messages}
"""

CONFIRM = """Застройщику показали список изменений для сайта и спросили «правильно понял?».
Определи ответ: "yes" — согласен («да», «верно», «ок», «+»); "correction" — поправляет или добавляет
что-то по существу; "no" — просит ничего не менять; "other" — не по теме.
Верни только JSON: {{"answer": "yes"|"correction"|"no"|"other"}}

Изменения:
{proposal}

Ответ:
{messages}
"""


def msg_lines(msgs, tmp):
    out = []
    for m in msgs:
        who = m.get("sender_name") or "менеджер"
        t = (m.get("text") or "").strip()
        mt = m.get("media_type")
        if mt in ("voice", "audio", "video_note") and m.get("media_url"):
            try:
                t = (t + " [голосовое] " + W.voice_to_text(m["media_url"])).strip()
            except Exception as e:
                t = (t + f" [голосовое, не расшифровано: {e!r}]").strip()
        elif mt in ("document", "photo") and m.get("media_url"):
            name = re.sub(r"[^\w.\-]+", "_", m.get("media_filename") or f"{m['id']}.{'jpg' if mt == 'photo' else 'bin'}")
            path = os.path.join(tmp, f"{m['id']}_{name}")
            try:
                W.download(m["media_url"], path)
                t = (t + f" [файл: {path}]").strip()
            except Exception as e:
                t = (t + f" [файл не скачался: {e!r}]").strip()
        if t:
            out.append(f"{who}: {t}")
    return "\n".join(out)


def site_for_prompt(snap):
    lines = []
    for c in snap["complexes"]:
        lines.append(f"[{c['name']}] этап: {c['stage']}; готовность: {c['ready']}; сдача: {c['year']}; шахматка: {c['chess'] or 'нет'}"
                     + ("; продажи: ВСЁ ПРОДАНО" if c.get("sales") == "Продано" else ""))
        for lbl, v in (c.get("fields") or {}).items():
            lines.append(f"    {lbl}: {(str(v)[:400] if v not in (None, '') else 'пусто')}")
    dv = snap.get("developer")
    if dv:
        lines.append(f"[Компания {dv['name']}]")
        for lbl, v in dv["fields"].items():
            lines.append(f"    {lbl}: {(str(v)[:400] if v not in (None, '') else 'пусто')}")
    for r in snap["rows"]:
        lines.append(f"{r['g']}: {r['complex']} · {label(r, 'ru')} · {money(r['price'])} · {len(r['ids'])} шт.")
    return "\n".join(lines)


def talk(chk, msgs):
    log_ = (chk.get("result") or {}).get("log") or []
    turns = sum(1 for l in log_ if l["who"] == "bot")
    with tempfile.TemporaryDirectory() as tmp:
        text = msg_lines(msgs, tmp)
        if not text:
            return None, text
        task = TASK_REQUEST if (chk.get("result") or {}).get("mode") == "request" else TASK_CHECK
        out = W.claude(TALK.format(task=task, site=site_for_prompt(chk["snapshot"]),
                                   log="\n".join(f"{'бот' if l['who'] == 'bot' else 'менеджер'}: {l['text']}" for l in log_[-30:]) or "(пусто)",
                                   facts=json.dumps(chk.get("proposal") or {}, ensure_ascii=False),
                                   messages=text, turns=turns, max_turns=MAX_BOT_TURNS), tmp, tools="Read")
        return out, text


def classify_confirm(ptext, msgs):
    with tempfile.TemporaryDirectory() as tmp:
        text = msg_lines(msgs, tmp)
        if not text:
            return "other"
        return W.claude(CONFIRM.format(proposal=ptext, messages=text), tmp).get("answer", "other")


# --- изменения -----------------------------------------------------------------------

def build_changes(snap, facts):
    """Факты → что меняем сами (после «да») и что решает владелец."""
    by_g = {r["g"]: r for r in snap["rows"]}
    by_cx = {c["name"]: c for c in snap["complexes"]}
    apply, held = [], []
    for p in facts.get("prices") or []:
        r = by_g.get(p.get("g"))
        if not r:
            continue
        item = {"g": r["g"], "ids": r["ids"], "kind": r["kind"], "complex": r["complex"],
                "label": label(r, "ru"), "label_en": label(r, "en"), "old": r["price"]}
        if p.get("sold_out"):
            apply.append({**item, "action": "sold_out"})
            continue
        np = _num(p.get("new_price"))
        if np and abs(np - r["price"]) >= 1:
            row = {**item, "action": "price", "new": np}
            (held if abs(np / r["price"] - 1) > MAX_JUMP else apply).append(row)
        if p.get("sold_count"):
            n = int(p["sold_count"])
            (apply if n >= len(r["ids"]) else held).append({**item, "action": "sold_out" if n >= len(r["ids"]) else "sold_some", "count": n})
    for name, f in (facts.get("complexes") or {}).items():
        c = by_cx.get(name)
        if not c:
            continue
        base = {"complex": name, "cid": c["id"]}
        rp = f.get("readiness_pct")
        if isinstance(rp, (int, float)) and 0 <= rp <= 100 and rp != c["ready"]:
            apply.append({**base, "action": "ready", "old": c["ready"], "new": int(rp)})
        yr = f.get("completion_year")
        if isinstance(yr, (int, float)) and 2020 <= yr <= 2040 and str(int(yr)) != str(c["year"]):
            apply.append({**base, "action": "year", "old": c["year"], "new": int(yr)})
        st = f.get("stage")
        if st in ("Строится", "Построен") and st != c["stage"]:
            apply.append({**base, "action": "stage", "old": c["stage"], "new": st})
        if f.get("sold_out") is True and c.get("sales") != "Продано":
            units = [(r["kind"], i) for r in snap["rows"] if r["complex"] == name for i in r["ids"]]
            apply.append({**base, "action": "cx_sold", "units": units})
        if f.get("remove_insist") is True:
            held.append({**base, "action": "remove"})
        elif f.get("on_sale") is False and f.get("sold_out") is not True:
            held.append({**base, "action": "off_sale"})
        url = f.get("chess_url")
        if url and url != c["chess"]:
            held.append({**base, "action": "chess", "new": url})
        elif f.get("chess_ok") is False and not url:
            held.append({**base, "action": "chess_stale"})
    dv = snap.get("developer")
    for e in facts.get("edits") or []:
        if e.get("target") == "developer" and dv:
            spec, cur, base = DEV_FIELDS.get(e.get("field")), dv["fields"].get(e.get("field")), {"complex": dv["name"], "dev_id": dv["id"]}
        else:
            c = by_cx.get(e.get("name"))
            if not c:
                continue
            spec, cur, base = CX_FIELDS.get(e.get("field")), (c.get("fields") or {}).get(e.get("field")), {"complex": c["name"], "cid": c["id"]}
        if not spec:
            continue
        key, typ = spec
        v = e.get("value")
        if typ == "number":
            v = _num(v)
            v = int(v) if v is not None and float(v).is_integer() else v
        elif typ == "permit":
            v = v if v in PERMITS else None
        elif typ == "list":
            v = [x.strip(" •-") for x in (v if isinstance(v, list) else str(v or "").split("\n")) if str(x).strip(" •-")]
        else:
            v = str(v or "").strip() or None
        if v in (None, "", []) or str(v) == str(cur):
            continue
        apply.append({**base, "action": "field", "field": e["field"], "key": key, "type": typ, "old": cur, "new": v})
    return {"apply": apply, "held": held, "new_complexes": facts.get("new_complexes") or [],
            "other": facts.get("other") or ""}


def change_line(a, lang):
    en = lang == "en"
    act = a["action"]
    if act == "price":
        return f"• {a['complex']}, {a['label_en' if en else 'label']}: {money(a['old'])} → {money(a['new'])}"
    if act == "sold_out":
        return f"• {a['complex']}, {a['label_en' if en else 'label']}: " + ("sold out, remove from the site" if en else "всё продано, снимаем с сайта")
    if act == "ready":
        was = f"{a['old']}% → " if a["old"] is not None else ""
        return f"• {a['complex']}: " + (f"ready {was}{a['new']}%" if en else f"готовность {was}{a['new']}%")
    if act == "year":
        was = f"{a['old']} → " if a["old"] else ""
        return f"• {a['complex']}: " + (f"handover {was}{a['new']}" if en else f"сдача {was}{a['new']}")
    if act == "field":
        new = a["new"]
        fld = FIELD_EN.get(a["field"], a["field"]) if en else a["field"]
        if a["type"] in ("textarea", "list"):
            txt = "; ".join(new) if isinstance(new, list) else new
            return f"• {a['complex']}, {fld}: " + (f"new text — «{txt[:300]}»" if en else f"новый текст — «{txt[:300]}»")
        was = f"{a['old']} → " if a.get("old") not in (None, "") else ""
        return f"• {a['complex']}, {fld}: {was}{new}"
    if act == "cx_sold":
        return f"• {a['complex']}: " + ("stays on the site marked \"Sold out\", prices removed" if en
                                        else "остаётся на сайте с пометкой «Продано», цены убираем")
    if act == "stage":
        new = {"Строится": "under construction", "Построен": "completed"}[a["new"]] if en else a["new"].lower()
        return f"• {a['complex']}: " + (f"stage → {new}" if en else f"этап → {new}")
    return ""


def apply_changes(ch):
    now = datetime.now(timezone.utc).isoformat()
    kinds, done = set(), []
    for a in ch["apply"]:
        if a["action"] in ("price", "sold_out"):
            table = "raw_villas" if a["kind"] == "villa" else "raw_apartments"
            for lid in a["ids"]:
                rows = sb_get(table, {"select": "data", "airtable_id": f"eq.{lid}"})
                if not rows:
                    continue
                d = rows[0]["data"]
                if a["action"] == "price":
                    new = int(round(a["new"]))
                    d["price" if a["kind"] == "villa" else "price_usd"] = new
                    d["Цена"] = new
                    area = _num(d.get("Площадь"))
                    if a["kind"] == "villa" and area:
                        d["Цена м²"] = round(new / area, 2)
                    d["Обновление цены"] = now
                    # Пара с прайсом застройщика: иначе ночная синхронизация трекера вернёт старую цену.
                    link = sb_get("market_listing_links", {"select": "base_unit_price", "listing_id": f"eq.{lid}"})
                    if link and link[0].get("base_unit_price"):
                        sb_update("market_listing_links", {"listing_id": lid},
                                  {"base_listing_price": new, "price_ratio": new / float(link[0]["base_unit_price"])})
                else:
                    d["Опубликовать"] = False
                    d["Продано"] = True
                sb_update(table, {"airtable_id": lid}, {"data": d})
            kinds.add("villas" if a["kind"] == "villa" else "apartments")
        elif a["action"] == "field" and a.get("dev_id"):
            rows = sb_get("raw_developers", {"select": "data", "airtable_id": f"eq.{a['dev_id']}"})
            if not rows:
                continue
            d = rows[0]["data"]
            d[a["key"]] = a["new"]
            sb_update("raw_developers", {"airtable_id": a["dev_id"]}, {"data": d})
            kinds.add("developers")
        else:
            rows = sb_get("raw_complexes", {"select": "data", "airtable_id": f"eq.{a['cid']}"})
            if not rows:
                continue
            d = rows[0]["data"]
            if a["action"] == "ready":
                d["Готовность"] = a["new"] / 100
            elif a["action"] == "year":
                d["Year of completion "] = d["Year of completion"] = a["new"]
            elif a["action"] == "field":
                d[a["key"]] = a["new"]
            elif a["action"] == "stage":
                d["Статус"] = a["new"]
            elif a["action"] == "cx_sold":
                d["Статус продаж"] = "Продано"
                # Юниты с ценами снимаем (не удаляем): Продано + не публиковать, как у sold_out.
                for kind, lid in a.get("units") or []:
                    table = "raw_villas" if kind == "villa" else "raw_apartments"
                    ur = sb_get(table, {"select": "data", "airtable_id": f"eq.{lid}"})
                    if ur:
                        ud = ur[0]["data"]
                        ud["Опубликовать"], ud["Продано"] = False, True
                        sb_update(table, {"airtable_id": lid}, {"data": ud})
            sb_update("raw_complexes", {"airtable_id": a["cid"]}, {"data": d})
            kinds.update(("complexes", "villas", "apartments"))
        done.append(a)
    if kinds:
        r = requests.post(f"{SITE}/api/revalidate-content", params={"kinds": ",".join(sorted(kinds))},
                          headers={**UA, "Authorization": "Bearer " + ENV["REVALIDATE_TOKEN"]}, timeout=60)
        if not r.ok:
            log("revalidate", r.status_code, r.text[:200])
    return done


def touch_dates(snap):
    now = datetime.now(timezone.utc).isoformat()
    for kind in ("villa", "apartment"):
        ids = [i for r in snap["rows"] if r["kind"] == kind for i in r["ids"]]
        if ids:
            requests.post(f"{W.SB}/rest/v1/rpc/market_touch_price_date", headers=W.SBH,
                          json={"p_kind": kind, "p_ids": ids, "p_when": now}, timeout=60)


# --- чат -----------------------------------------------------------------------------

def say(chat_id, text):
    j = tg("sendMessage", chat_id=chat_id, text=text, disable_web_page_preview=True)
    return (j.get("result") or {}).get("message_id")


def tell_owner(text):
    tg("sendMessage", chat_id=OWNER, text=text, disable_web_page_preview=True)


MSG_COLS = "id,chat_id,created_at,sender_id,sender_name,text,media_type,media_url,media_filename"


def new_msgs(chat_id, after):
    rows = sb_get("bot_messages", {"select": MSG_COLS, "chat_id": f"eq.{chat_id}", "direction": "eq.in",
                                   "id": f"gt.{after}", "order": "id.asc", "limit": "50"})
    return [m for m in rows if m.get("sender_id") != OWNER and m.get("media_type") != "sticker"]


def last_msg_id(chat_id):
    r = sb_get("bot_messages", {"select": "id", "chat_id": f"eq.{chat_id}", "order": "id.desc", "limit": "1"})
    return r[0]["id"] if r else 0


def open_check(chat, first_text=None, start_after=None, mode=None):
    snap = snapshot(chat["developer_name"], chat.get("lang") or "ru")
    if not snap["complexes"]:
        log("skip: у застройщика нет комплексов на сайте", chat["chat_id"], chat["developer_name"])
        return None
    log_ = []
    if first_text:
        tg_id = say(chat["chat_id"], first_text)
        if not tg_id:
            raise RuntimeError("сообщение не ушло")
        log_.append({"who": "bot", "text": first_text})
    row = sb_insert("dev_price_checks", {
        "chat_id": chat["chat_id"], "developer_name": chat["developer_name"], "snapshot": snap,
        "last_msg_id": start_after if start_after is not None else last_msg_id(chat["chat_id"]),
        "state": "asked", "result": {"log": log_, **({"mode": mode} if mode else {})}, "proposal": {}})
    return row


def open_request(chat_id, dev_name, lang, start_after, what=""):
    """Застройщик попросил убрать/скрыть/поправить — бот ведёт разговор (зовёт worker.py)."""
    busy = sb_get("dev_price_checks", {"select": "id", "chat_id": f"eq.{chat_id}", "state": f"in.({','.join(OPEN)})"})
    if busy:
        return None  # уже идёт разговор — новое сообщение он и так прочитает
    row = open_check({"chat_id": chat_id, "developer_name": dev_name, "lang": lang}, start_after=start_after, mode="request")
    if row:
        tell_owner(f"Просьба · {dev_name}: {what or 'изменить данные на сайте'}. Веду разговор в чате сам.")
        log("request", chat_id, dev_name)
    return row


def ask(chat, dry=False):
    snap = snapshot(chat["developer_name"], chat.get("lang") or "ru")
    if not snap["complexes"]:
        return None
    text = ask_text(snap)
    if dry:
        return text
    open_check(chat, first_text=text)
    sb_update("dev_price_chats", {"chat_id": chat["chat_id"]}, {"last_asked_at": datetime.now(timezone.utc).isoformat()})
    log("asked", chat["chat_id"], chat["developer_name"])
    return text


def save(chk, **patch):
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    sb_update("dev_price_checks", {"id": chk["id"]}, patch)


def step(chk):
    msgs = new_msgs(chk["chat_id"], chk["last_msg_id"])
    if not msgs:
        if datetime.now(timezone.utc) - datetime.fromisoformat(chk["updated_at"]) > timedelta(days=EXPIRE_DAYS):
            save(chk, state="expired")
            log("expired", chk["id"])
        return
    if (datetime.now(timezone.utc) - datetime.fromisoformat(msgs[-1]["created_at"])).total_seconds() < QUIET_S:
        return
    snap, lang = chk["snapshot"], chk["snapshot"].get("lang", "ru")
    res = chk.get("result") or {}
    log_ = res.get("log") or []
    base = {"last_msg_id": msgs[-1]["id"]}

    if chk["state"] == "confirming":
        ch = res.get("changes") or {"apply": []}
        ans = classify_confirm("\n".join(change_line(a, lang) for a in ch["apply"]), msgs)
        eaten = list(chk["msg_ids"]) + [m["id"] for m in msgs]
        if ans == "yes":
            done = apply_changes(ch)
            reply = "Thanks! Updated on the site." if lang == "en" else "Спасибо! Обновили на сайте."
            say(chk["chat_id"], reply)
            owner_summary(chk, done, ch)
            save(chk, **base, msg_ids=eaten, state="applied", result={**res, "applied": done, "log": log_ + [{"who": "bot", "text": reply}]})
            log("applied", chk["id"], len(done))
            return
        if ans == "no":
            reply = "Understood, we won't change anything." if lang == "en" else "Понял, ничего не меняем."
            say(chk["chat_id"], reply)
            save(chk, **base, msg_ids=eaten, state="no_change")
            return
        if ans == "other":
            save(chk, **base)
            return
        # correction — продолжаем разговор с поправкой

    out, text = talk(chk, msgs)
    if out is None:
        save(chk, **base)
        return
    facts = out.get("facts") or chk.get("proposal") or {}
    reply = (out.get("reply") or "").strip()
    talked = bool(reply) or out.get("ready")
    eaten = list(chk["msg_ids"]) + ([m["id"] for m in msgs] if talked else [])
    log_ = log_ + ([{"who": "dev", "text": text}] if talked else [])

    if not out.get("ready"):
        if reply:
            say(chk["chat_id"], reply)
            log_.append({"who": "bot", "text": reply})
        save(chk, **base, msg_ids=eaten, proposal=facts, state="clarifying" if talked else chk["state"],
             result={**res, "log": log_})
        return

    ch = build_changes(snap, facts)
    if ch["held"] or ch["new_complexes"] or ch["other"]:
        owner_held(chk, ch)
    if not ch["apply"]:
        if not ch["held"] and not ch["new_complexes"]:
            touch_dates(snap)
            reply = "Thank you! Everything on the site is current." if lang == "en" else "Спасибо! Значит, на сайте всё актуально."
        else:
            reply = "Thank you! We'll update the rest shortly." if lang == "en" else "Спасибо! Остальное обновим в ближайшее время."
        say(chk["chat_id"], reply)
        save(chk, **base, msg_ids=eaten, proposal=facts, state="no_change",
             result={**res, "changes": ch, "log": log_ + [{"who": "bot", "text": reply}]})
        return
    if out.get("agreed") and res.get("mode") == "request":
        done = apply_changes(ch)
        reply = ("Done, thank you! On the site now:\n" if lang == "en" else "Сделали, спасибо! На сайте теперь:\n") + \
            "\n".join(change_line(a, lang) for a in done)
        say(chk["chat_id"], reply)
        owner_summary(chk, done, ch)
        save(chk, **base, msg_ids=eaten, proposal=facts, state="applied",
             result={**res, "changes": ch, "applied": done, "log": log_ + [{"who": "bot", "text": reply}]})
        log("applied", chk["id"], len(done))
        return
    head = "Did I get it right? We'll change on the site:" if lang == "en" else "Правильно понял? Меняем на сайте:"
    tail = ("Reply \"yes\" and we'll update it. If something is off, just correct me."
            if lang == "en" else "Ответьте «да» — и обновим. Если что-то не так, поправьте сообщением.")
    reply = f"{head}\n" + "\n".join(change_line(a, lang) for a in ch["apply"]) + f"\n\n{tail}"
    say(chk["chat_id"], reply)
    save(chk, **base, msg_ids=eaten, proposal=facts, state="confirming",
         result={**res, "changes": ch, "log": log_ + [{"who": "bot", "text": reply}]})
    log("confirming", chk["id"], len(ch["apply"]))


def owner_summary(chk, done, ch):
    lines = [f"Сверка · {chk['developer_name']}: застройщик подтвердил, обновил на сайте:"]
    lines += [change_line(a, "ru") for a in done]
    tell_owner("\n".join(lines))


def owner_held(chk, ch):
    lines = [f"Сверка · {chk['developer_name']}: сам не менял, реши ты:"]
    for h in ch["held"]:
        act = h["action"]
        if act == "price":
            lines.append(f"• {h['complex']}, {h['label']}: {money(h['old'])} → {money(h['new'])} (скачок больше 25%)")
        elif act == "sold_some":
            lines.append(f"• {h['complex']}, {h['label']}: продано {h['count']} из {len(h['ids'])}")
        elif act == "remove":
            lines.append(f"• {h['complex']}: просят убрать с сайта целиком, на «Продано» не согласились")
        elif act == "off_sale":
            lines.append(f"• {h['complex']}: говорят, больше не продаётся")
        elif act == "chess":
            lines.append(f"• {h['complex']}: новая шахматка {h['new']} — добавить в трекер")
        elif act == "chess_stale":
            lines.append(f"• {h['complex']}: шахматка по нашей ссылке устарела, новую не прислали")
    for n in ch["new_complexes"]:
        lines.append(f"• Новый комплекс: {n}")
    if ch["other"]:
        lines.append(f"Ещё: {ch['other']}")
    tell_owner("\n".join(lines))


def watch_mentions(chats, busy):
    """К боту обратились в чате без открытой сверки — открываем разговор."""
    for chat in chats:
        if chat["chat_id"] in busy:
            continue
        after = chat.get("last_seen_msg_id")
        if after is None:  # первый проход: начинаем с текущего места, старое не трогаем
            sb_update("dev_price_chats", {"chat_id": chat["chat_id"]}, {"last_seen_msg_id": last_msg_id(chat["chat_id"])})
            continue
        msgs = new_msgs(chat["chat_id"], after)
        if not msgs:
            continue
        sb_update("dev_price_chats", {"chat_id": chat["chat_id"]}, {"last_seen_msg_id": msgs[-1]["id"]})
        hit = next((m for m in msgs if MENTION.search(m.get("text") or "")), None)
        if hit:
            open_check(chat, start_after=hit["id"] - 1)
            log("mention", chat["chat_id"], chat["developer_name"])


def main():
    lock = open(os.path.join(W.DIR, ".price.lock"), "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        return
    args = sys.argv[1:]
    if args[:1] in (["--preview"], ["--ask"]):
        cid = int(args[1])
        chat = (sb_get("dev_price_chats", {"select": "*", "chat_id": f"eq.{cid}"}) or [None])[0]
        if not chat:
            print("чата нет в dev_price_chats")
            return
        print(ask(chat, dry=args[0] == "--preview"))
        return
    for chk in sb_get("dev_price_checks", {"select": "*", "state": f"in.({','.join(OPEN)})", "order": "id.asc"}):
        try:
            step(chk)
        except Exception as e:
            log("check error", chk["id"], repr(e))
    busy = {c["chat_id"] for c in sb_get("dev_price_checks", {"select": "chat_id", "state": f"in.({','.join(OPEN)})"})}
    chats = sb_get("dev_price_chats", {"select": "*", "enabled": "eq.true"})
    try:
        watch_mentions(chats, busy)
    except Exception as e:
        log("mentions error", repr(e))
    now = datetime.now(timezone.utc)
    bali = now.astimezone(W.WALL)
    if bali.weekday() >= 5 or not 10 <= bali.hour < 17:
        return  # сами пишем только в будни днём по Бали
    busy = {c["chat_id"] for c in sb_get("dev_price_checks", {"select": "chat_id", "state": f"in.({','.join(OPEN)})"})}
    for chat in chats:
        if chat["chat_id"] in busy:
            continue
        last = chat.get("last_asked_at")
        if last and now - datetime.fromisoformat(last) < timedelta(days=chat.get("every_days") or 7):
            continue
        try:
            ask(chat)
        except Exception as e:
            log("ask error", chat["chat_id"], repr(e))


if __name__ == "__main__":
    main()
