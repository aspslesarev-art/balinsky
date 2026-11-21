"""
Сверка цен с застройщиками в их Telegram-чатах (владелец 21.11.2026).

Раз в неделю бот присылает в чат застройщика, что сейчас на сайте (типы
юнитов и цены), и спрашивает, всё ли верно. Ответ разбирает Claude по
подписке. Есть изменения — бот переспрашивает «правильно понял?», и только
после «да» застройщика вносит их на сайт и пишет владельцу сводку.
Подтверждение текстом, а не кнопками: кнопки пришлось бы обрабатывать на
сайте, а так всё живёт на сервере.

Предохранители: цена, сдвинувшаяся больше чем на 25%, сама не меняется —
вопрос уходит владельцу; новые юниты не заводятся (только заметка владельцу);
на одну сверку — не больше 3 уточнений, без ответа 5 дней — сверка закрыта.

Запуск: таймер раз в 3 минуты (price-checks.timer). Вручную:
  python price_checks.py --preview CHAT_ID   — показать сообщение, ничего не слать
  python price_checks.py --ask CHAT_ID       — спросить сейчас (чат должен быть в dev_price_chats)
Таблицы: dev_price_chats (какие чаты сверяем), dev_price_checks (сверки) — migrations/144.
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

MAX_ROUNDS = 3
EXPIRE_DAYS = 5
MAX_JUMP = 0.25
OPEN = ("asked", "clarifying", "confirming")


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


def listings(dev_name):
    """Опубликованные объявления застройщика, по комплексам."""
    out = []
    for cx in W.complexes_of(dev_name):
        name = (cx["name"] or "").strip()
        if not name:
            continue
        vil = sb_get("raw_villas", {"select": "airtable_id,data", "data->>Комплекс 1": f"eq.{name}"})
        apt = sb_get("raw_apartments", {"select": "airtable_id,data", "data->>SEO:Title": f"ilike.*{name}*"})
        for kind, rows in (("villa", vil), ("apartment", apt)):
            for r in rows:
                d = r["data"] or {}
                if d.get("Опубликовать") is False:
                    continue
                price = _num(d.get("price") if kind == "villa" else d.get("price_usd")) or _num(d.get("Цена"))
                if not price:
                    continue
                out.append({"id": r["airtable_id"], "kind": kind, "complex": name, "complex_id": cx["id"],
                            "complex_slug": cx["slug"], "bedrooms": _num(_first(d.get("Спальни") or d.get("Комнаты"))),
                            "area": _num(d.get("Площадь")), "price": price,
                            "sold": d.get("Продано") is True})
    return out


def groups_of(items):
    """Одинаковые по комплексу, виду, спальням, площади и цене — одна строка."""
    g = {}
    for it in items:
        if it["sold"]:
            continue
        key = (it["complex"], it["kind"], it["bedrooms"], round(it["area"] or 0), round(it["price"]))
        g.setdefault(key, []).append(it["id"])
    rows = []
    for i, (k, ids) in enumerate(sorted(g.items(), key=lambda x: (x[0][0], x[0][1], x[0][2] or 0, x[0][4]))):
        cx, kind, br, area, price = k
        rows.append({"g": f"G{i + 1}", "complex": cx, "kind": kind, "bedrooms": br, "area": area,
                     "price": price, "ids": ids})
    return rows


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


def snapshot_text(rows, lang, limit=45):
    lines, cx = [], None
    for r in rows[:limit]:
        if r["complex"] != cx:
            cx = r["complex"]
            lines.append(f"\n{cx}")
        n = len(r["ids"])
        lines.append(f"• {label(r, lang)} — {money(r['price'])}" + (f" ({n} {'units' if lang == 'en' else 'шт.'})" if n > 1 else ""))
    if len(rows) > limit:
        lines.append(f"\n…{'and' if lang == 'en' else 'и ещё'} {len(rows) - limit}")
    return "\n".join(lines).strip()


def ask_text(rows, lang):
    if lang == "en":
        return ("Hello! This is Balinsky. We're checking the details of your projects on the site so buyers "
                "see current prices.\n\nOn the site now:\n\n" + snapshot_text(rows, lang) +
                "\n\nIs everything correct? Reply \"yes\", or tell us what has changed: new prices, what's sold. "
                "You can also send the price list as a file.")
    return ("Добрый день! Это Balinsky. Сверяем данные о ваших объектах на сайте, чтобы покупатели видели "
            "актуальные цены.\n\nСейчас на сайте:\n\n" + snapshot_text(rows, lang) +
            "\n\nВсё верно? Ответьте «да» или напишите, что изменилось: новые цены, что продано. "
            "Можно прислать прайс файлом.")


# --- разбор ответов ------------------------------------------------------------------

PARSE = """Ты помощник сайта balinsky.info. Застройщику показали список его юнитов на сайте и спросили,
всё ли верно. Ниже список (группы G1…) и ответы из чата (текст, расшифровки голосовых, файлы — пути
к ним даны, открой их инструментом Read). Пойми, что застройщик сообщает о ценах и продажах.

Правила:
- Меняй только то, что сказано явно. Не додумывай цены. Валюта на сайте — доллары США;
  если цена в рупиях, переведи по курсу 16 000 IDR = 1 USD и отметь это в note.
- «Продано всё по этому типу» → sold_out: true. Продана часть — sold_count.
- Прайс файлом: сравни с каждой группой по комплексу, спальням и площади (±3 м²).
- Новые юниты, которых нет в списке, — не группы, а строка в notes.
- Если сообщения вообще не про цены (новость, вопрос, приветствие) — status "not_about_prices".
- Если всё верно («да», «всё актуально», «ок») — status "confirmed_all".
- Если ответ есть, но непонятно, что именно менять, — status "unclear" и один короткий вопрос в question
  на языке застройщика.

Верни только JSON:
{{"status": "confirmed_all"|"changes"|"unclear"|"not_about_prices",
  "changes": [{{"g": "G3", "new_price": 195000 или null, "sold_out": false, "sold_count": null, "note": ""}}],
  "question": "", "notes": ""}}

Список на сайте:
{snapshot}

Ответы из чата (по порядку):
{messages}
"""

CONFIRM = """Застройщику показали список изменений для сайта и спросили «правильно понял?».
Ниже предложенные изменения и его ответ. Определи ответ.
- "yes": согласен («да», «верно», «ок», «👍»).
- "correction": поправляет или добавляет что-то про цены/продажи.
- "no": отказывается, просит ничего не менять.
- "other": не по теме.
Верни только JSON: {{"answer": "yes"|"correction"|"no"|"other"}}

Изменения:
{proposal}

Ответ:
{messages}
"""


def msg_lines(msgs, tmp):
    out = []
    for m in msgs:
        who = m.get("sender_name") or "застройщик"
        t = (m.get("text") or "").strip()
        mt = m.get("media_type")
        if mt in ("voice", "audio", "video_note") and m.get("media_url"):
            try:
                t = (t + " [голосовое] " + W.voice_to_text(m["media_url"])).strip()
            except Exception as e:  # без расшифровки — хотя бы помечаем
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


def snapshot_for_prompt(rows):
    return "\n".join(f"{r['g']}: {r['complex']} · {label(r, 'ru')} · {money(r['price'])} · {len(r['ids'])} шт."
                     for r in rows)


def parse_reply(rows, msgs):
    with tempfile.TemporaryDirectory() as tmp:
        text = msg_lines(msgs, tmp)
        if not text:
            return {"status": "not_about_prices", "changes": []}
        return W.claude(PARSE.format(snapshot=snapshot_for_prompt(rows), messages=text), tmp, tools="Read")


def classify_confirm(proposal_text, msgs):
    with tempfile.TemporaryDirectory() as tmp:
        text = msg_lines(msgs, tmp)
        if not text:
            return "other"
        return W.claude(CONFIRM.format(proposal=proposal_text, messages=text), tmp).get("answer", "other")


# --- изменения -----------------------------------------------------------------------

def build_proposal(rows, parsed):
    """Разобранное → строки изменений; скачки цены больше 25% — владельцу."""
    by_g = {r["g"]: r for r in rows}
    apply, held = [], []
    for c in parsed.get("changes") or []:
        r = by_g.get(c.get("g"))
        if not r:
            continue
        item = {"g": r["g"], "ids": r["ids"], "kind": r["kind"], "complex": r["complex"],
                "label": label(r, "ru"), "old": r["price"], "area": r["area"]}
        if c.get("sold_out"):
            apply.append({**item, "action": "sold_out"})
            continue
        np = _num(c.get("new_price"))
        if np and abs(np - r["price"]) >= 1:
            row = {**item, "action": "price", "new": np, "note": c.get("note") or ""}
            (held if abs(np / r["price"] - 1) > MAX_JUMP else apply).append(row)
        if c.get("sold_count"):
            n = int(c["sold_count"])
            if n >= len(r["ids"]):
                apply.append({**item, "action": "sold_out"})
            else:
                held.append({**item, "action": "sold_some", "count": n})
    return {"apply": apply, "held": held, "notes": parsed.get("notes") or ""}


def proposal_text(p, lang):
    lines = []
    for a in p["apply"]:
        if a["action"] == "price":
            lines.append(f"• {a['complex']}, {a['label']}: {money(a['old'])} → {money(a['new'])}")
        else:
            lines.append(f"• {a['complex']}, {a['label']}: {'sold out, remove from the site' if lang == 'en' else 'всё продано, снимаем с сайта'}")
    return "\n".join(lines)


def apply_changes(p):
    now = datetime.now(timezone.utc).isoformat()
    kinds, cx_ids, done = set(), set(), []
    for a in p["apply"]:
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
        done.append(a)
    for a in done:
        cx = sb_get("raw_complexes", {"select": "airtable_id,data", "data->>Project": f"eq.{a['complex']}"})
        for c in cx:
            cx_ids.add(c["airtable_id"])
    if cx_ids:
        kinds.add("complexes")
    if kinds:
        r = requests.post(f"{SITE}/api/revalidate-content", params={"kinds": ",".join(sorted(kinds))},
                          headers={**UA, "Authorization": "Bearer " + ENV["REVALIDATE_TOKEN"]}, timeout=60)
        if not r.ok:
            log("revalidate", r.status_code, r.text[:200])
    return done


def touch_dates(rows):
    """«Всё верно» — у всех объявлений свежая дата сверки цены."""
    now = datetime.now(timezone.utc).isoformat()
    for kind in ("villa", "apartment"):
        ids = [i for r in rows if r["kind"] == kind for i in r["ids"]]
        if ids:
            requests.post(f"{W.SB}/rest/v1/rpc/market_touch_price_date", headers=W.SBH,
                          json={"p_kind": kind, "p_ids": ids, "p_when": now}, timeout=60)


# --- чат -----------------------------------------------------------------------------

def say(chat_id, text):
    j = tg("sendMessage", chat_id=chat_id, text=text, disable_web_page_preview=True)
    return (j.get("result") or {}).get("message_id")


def tell_owner(text):
    tg("sendMessage", chat_id=OWNER, text=text, disable_web_page_preview=True)


def new_msgs(chk):
    return sb_get("bot_messages", {
        "select": "id,chat_id,created_at,sender_id,sender_name,text,media_type,media_url,media_filename",
        "chat_id": f"eq.{chk['chat_id']}", "direction": "eq.in", "id": f"gt.{chk['last_msg_id']}",
        "order": "id.asc", "limit": "50"})


def ask(chat, dry=False):
    items = listings(chat["developer_name"])
    rows = groups_of(items)
    if not rows:
        log("ask skip: на сайте нет объявлений", chat["chat_id"], chat["developer_name"])
        return None
    text = ask_text(rows, chat.get("lang") or "ru")
    if dry:
        return text
    last = sb_get("bot_messages", {"select": "id", "chat_id": f"eq.{chat['chat_id']}", "order": "id.desc", "limit": "1"})
    tg_id = say(chat["chat_id"], text)
    if not tg_id:
        raise RuntimeError("сообщение не ушло")
    sb_insert("dev_price_checks", {"chat_id": chat["chat_id"], "developer_name": chat["developer_name"],
                                   "snapshot": {"rows": rows, "lang": chat.get("lang") or "ru"},
                                   "last_msg_id": last[0]["id"] if last else 0, "asked_tg_id": tg_id})
    sb_update("dev_price_chats", {"chat_id": chat["chat_id"]}, {"last_asked_at": datetime.now(timezone.utc).isoformat()})
    log("asked", chat["chat_id"], chat["developer_name"], len(rows), "строк")
    return text


def step(chk):
    msgs = [m for m in new_msgs(chk) if m.get("sender_id") != OWNER and m.get("media_type") != "sticker"]
    age = datetime.now(timezone.utc) - datetime.fromisoformat(chk["updated_at"])
    if not msgs:
        if age > timedelta(days=EXPIRE_DAYS):
            sb_update("dev_price_checks", {"id": chk["id"]}, {"state": "expired", "updated_at": datetime.now(timezone.utc).isoformat()})
            log("expired", chk["id"])
        return
    # Ждём, пока человек допишет: 3 минуты тишины.
    if (datetime.now(timezone.utc) - datetime.fromisoformat(msgs[-1]["created_at"])).total_seconds() < 180:
        return
    rows, lang = chk["snapshot"]["rows"], chk["snapshot"].get("lang", "ru")
    patch = {"last_msg_id": msgs[-1]["id"], "msg_ids": list(chk["msg_ids"]) + [m["id"] for m in msgs],
             "updated_at": datetime.now(timezone.utc).isoformat()}

    if chk["state"] == "confirming":
        ans = classify_confirm(proposal_text(chk["proposal"], lang), msgs)
        if ans == "yes":
            done = apply_changes(chk["proposal"])
            say(chk["chat_id"], "Thanks! Updated on the site." if lang == "en" else "Спасибо! Обновили на сайте.")
            owner_summary(chk, done)
            sb_update("dev_price_checks", {"id": chk["id"]}, {**patch, "state": "applied", "result": {"applied": done}})
            log("applied", chk["id"], len(done))
            return
        if ans == "no":
            say(chk["chat_id"], "Understood, we won't change anything." if lang == "en" else "Понял, ничего не меняем.")
            sb_update("dev_price_checks", {"id": chk["id"]}, {**patch, "state": "no_change"})
            return
        if ans == "other":
            sb_update("dev_price_checks", {"id": chk["id"]}, patch)
            return
        # correction — разбираем заново всю переписку сверки
        msgs = sb_get("bot_messages", {"select": "id,chat_id,created_at,sender_id,sender_name,text,media_type,media_url,media_filename",
                                       "id": f"in.({','.join(str(i) for i in patch['msg_ids'])})", "order": "id.asc"})
        msgs = [m for m in msgs if m.get("sender_id") != OWNER]

    parsed = parse_reply(rows, msgs)
    st = parsed.get("status")
    if st == "not_about_prices":
        sb_update("dev_price_checks", {"id": chk["id"]}, {**{k: v for k, v in patch.items() if k != "msg_ids"},
                                                          "last_msg_id": patch["last_msg_id"]})
        return
    if st == "confirmed_all":
        touch_dates(rows)
        say(chk["chat_id"], "Thank you! Everything on the site is current." if lang == "en" else "Спасибо! Значит, на сайте всё актуально.")
        sb_update("dev_price_checks", {"id": chk["id"]}, {**patch, "state": "no_change"})
        log("no_change", chk["id"])
        return
    if st == "unclear" or not parsed.get("changes"):
        if chk["rounds"] >= MAX_ROUNDS:
            tell_owner(f"Сверка цен · {chk['developer_name']}: застройщик ответил, но я не понял, что менять. Посмотри чат.")
            sb_update("dev_price_checks", {"id": chk["id"]}, {**patch, "state": "error", "error": "не понял ответ"})
            return
        q = parsed.get("question") or ("Could you clarify what exactly has changed?" if lang == "en" else "Уточните, пожалуйста, что именно изменилось?")
        say(chk["chat_id"], q)
        sb_update("dev_price_checks", {"id": chk["id"]}, {**patch, "state": "clarifying", "rounds": chk["rounds"] + 1})
        return

    p = build_proposal(rows, parsed)
    if p["held"] or p["notes"]:
        owner_held(chk, p)
    if not p["apply"]:
        say(chk["chat_id"], "Thanks! We'll pass this on and update it." if lang == "en" else "Спасибо! Передали, обновим.")
        sb_update("dev_price_checks", {"id": chk["id"]}, {**patch, "state": "no_change", "proposal": p})
        return
    head = "Did I get it right? We'll change on the site:" if lang == "en" else "Правильно понял? Меняем на сайте:"
    tail = ("Reply \"yes\" and we'll update it. If something is off, just correct me."
            if lang == "en" else "Ответьте «да» — и обновим. Если что-то не так, поправьте сообщением.")
    say(chk["chat_id"], f"{head}\n{proposal_text(p, lang)}\n\n{tail}")
    sb_update("dev_price_checks", {"id": chk["id"]}, {**patch, "state": "confirming", "proposal": p})
    log("confirming", chk["id"], len(p["apply"]))


def owner_summary(chk, done):
    lines = [f"Сверка цен · {chk['developer_name']}: застройщик подтвердил, обновил на сайте:"]
    for a in done:
        lines.append(f"• {a['complex']}, {a['label']}: " + (f"{money(a['old'])} → {money(a['new'])}" if a["action"] == "price" else "продано, снято с сайта"))
    tell_owner("\n".join(lines))


def owner_held(chk, p):
    lines = [f"Сверка цен · {chk['developer_name']}: сам не менял, реши ты:"]
    for h in p["held"]:
        if h["action"] == "price":
            lines.append(f"• {h['complex']}, {h['label']}: {money(h['old'])} → {money(h['new'])} (скачок больше 25%)")
        else:
            lines.append(f"• {h['complex']}, {h['label']}: продано {h['count']} из {len(h['ids'])}")
    if p["notes"]:
        lines.append(f"Ещё: {p['notes']}")
    tell_owner("\n".join(lines))


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
    now = datetime.now(timezone.utc)
    open_chats = {c["chat_id"] for c in sb_get("dev_price_checks", {"select": "chat_id", "state": f"in.({','.join(OPEN)})"})}
    for chat in sb_get("dev_price_chats", {"select": "*", "enabled": "eq.true"}):
        if chat["chat_id"] in open_chats:
            continue
        last = chat.get("last_asked_at")
        if last and now - datetime.fromisoformat(last) < timedelta(days=chat.get("every_days") or 7):
            continue
        # Пишем только днём по Бали (10–17), в будни.
        bali = now.astimezone(W.WALL)
        if bali.weekday() >= 5 or not 10 <= bali.hour < 17:
            continue
        try:
            ask(chat)
        except Exception as e:
            log("ask error", chat["chat_id"], repr(e))


if __name__ == "__main__":
    main()
