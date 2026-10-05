#!/usr/bin/env python3
"""Обновления из чатов застройщиков → готовая статья на balinsky.info.

Крутится на домашнем сервере (smarthouse) по таймеру systemd раз в 2 минуты.
Тексты пишет Claude по подписке (claude -p), платных API нет.

Шаги одного прогона:
  1. collect — новые сообщения из групп, привязанных к застройщику
     (raw_developers.telegram_chat_id), склеиваются в пачку: текст + альбом.
     Пачка готова, когда в чате тихо QUIET_S секунд. Claude решает, новость ли
     это, и пишет черновик. Не новость → dev_updates.status = noise, владельца
     не дёргаем. Новость → карточка владельцу в @BalinskyBot с кнопками.
  2. revise — владелец ответил на карточку правкой (текстом или голосом),
     webhook положил её в draft.revise: переписываем и обновляем карточку.
  3. publish — владелец нажал кнопку (status = approved): переводим на 8
     языков, копируем фото и видео в бакет раздела, дописываем запись в
     манифест, для «Хода стройки» обновляем процент готовности комплекса,
     сбрасываем кэш сайта, проверяем, что страница открывается.

Схема таблицы — migrations/093_dev_updates.sql, кнопки — lib/dev-updates.ts.
"""

import asyncio
import fcntl
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timedelta, timezone
from html import escape

import requests

DIR = os.path.dirname(os.path.abspath(__file__))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(DIR, "worker.env")) if "=" in l and not l.startswith("#"))
SB = ENV["SUPABASE_URL"].rstrip("/")
SBH = {"apikey": ENV["SUPABASE_SERVICE_KEY"], "Authorization": "Bearer " + ENV["SUPABASE_SERVICE_KEY"]}
TG = "https://api.telegram.org/bot" + ENV["TG_TOKEN"]
OWNER = int(ENV.get("OWNER_CHAT", "555450800"))
SITE = ENV.get("SITE", "https://balinsky.info")
START_AT = ENV.get("START_AT", "2026-10-05T00:00:00Z")  # раньше этого чаты не разбираем
CLAUDE = os.path.expanduser("~/.local/bin/claude")
QUIET_S = 240         # пачка закрыта, если 4 минуты в чате тихо
GAP_S = 300           # больше 5 минут между сообщениями — уже другая пачка
WALL = timezone(timedelta(hours=8))  # время Бали
LANGS = ["en", "id", "fr", "de", "zh", "nl", "pl", "uk"]  # ban берёт id сам
STT = ("127.0.0.1", 10303)  # мост ElevenLabs → whisper, тот же, что у casa-bot
UA = {"User-Agent": "balinsky-tools/1.0"}

KIND = {
    "news": {"label": "Новость", "icon": "📰", "bucket": "news", "manifest": "_news.json", "photos": "news-photos", "path": "novosti", "section": "news"},
    "construction": {"label": "Ход стройки", "icon": "🏗", "bucket": "news", "manifest": "_news.json", "photos": "news-photos", "path": "novosti", "section": "news"},
    "promo": {"label": "Акция", "icon": "🏷", "bucket": "promo", "manifest": "_promo.json", "photos": "promo-photos", "path": "akcii", "section": "promo"},
    "event": {"label": "Мероприятие", "icon": "📅", "bucket": "events", "manifest": "_events.json", "photos": "event-photos", "path": "meropriyatiya", "section": "events"},
}


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


# --- Supabase -----------------------------------------------------------------

def sb_get(table, params):
    r = requests.get(f"{SB}/rest/v1/{table}", headers=SBH, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_insert(table, row):
    r = requests.post(f"{SB}/rest/v1/{table}", headers={**SBH, "Prefer": "return=representation"}, json=row, timeout=30)
    r.raise_for_status()
    return r.json()[0]


def sb_update(table, match, patch):
    r = requests.patch(f"{SB}/rest/v1/{table}", headers={**SBH, "Prefer": "return=representation"},
                       params={k: f"eq.{v}" for k, v in match.items()}, json=patch, timeout=30)
    r.raise_for_status()
    return r.json()


def storage_get_json(bucket, key, default):
    r = requests.get(f"{SB}/storage/v1/object/{bucket}/{key}", headers=SBH, timeout=60)
    if r.status_code in (400, 404):
        return default
    r.raise_for_status()
    return r.json()


def storage_put(bucket, key, data, ctype, cache="3600"):
    r = requests.post(f"{SB}/storage/v1/object/{bucket}/{key}",
                      headers={**SBH, "Content-Type": ctype, "x-upsert": "true", "cache-control": f"max-age={cache}"},
                      data=data, timeout=180)
    r.raise_for_status()
    return f"https://images.balinsky.info/storage/v1/object/public/{bucket}/{key}"


# --- Telegram -----------------------------------------------------------------

def tg(method, **kw):
    r = requests.post(f"{TG}/{method}", json=kw, timeout=90)
    j = r.json()
    if not j.get("ok"):
        log("tg", method, j.get("description"))
    return j


def keyboard(uid, suggested):
    def b(kind):
        k = KIND[kind]
        mark = "✅ " if kind == suggested else ""
        return {"text": f"{mark}{k['icon']} {k['label']}", "callback_data": f"dvu:{uid}:{kind}"}
    return {"inline_keyboard": [[b("news"), b("promo")], [b("event"), b("construction")],
                                [{"text": "✖️ Пропустить", "callback_data": f"dvu:{uid}:skip"}]]}


def card_text(row, cx):
    d = row["draft"]
    head = f"<b>{escape(row['developer_name'] or '')}</b>"
    if cx:
        head += f" · {escape(cx['name'])}"
    lines = [head]
    k = KIND.get(row["suggested_kind"] or "news")
    advice = f"Советую: {k['icon']} {k['label']}"
    if d.get("expiresAt"):
        advice += f", до {d['expiresAt']}"
    if d.get("startsAt"):
        advice += f", {d['startsAt'][:16].replace('T', ' ')}"
    lines.append(advice)
    if row["suggested_kind"] == "construction" and d.get("readinessPct") is not None:
        was = f"{cx['ready']}% → " if cx and cx.get("ready") is not None else ""
        lines.append(f"Готовность на сайте: {was}{d['readinessPct']}%")
    if d.get("skipHint"):
        lines.append(f"⚠️ {escape(d['skipHint'])}")
    lines.append("")
    lines.append(f"<b>{escape(d.get('title', ''))}</b>")
    lines.append("")
    lines.append(escape(d.get("body", "")))
    media = row["media"]
    nph = sum(1 for m in media if m["type"] == "photo")
    nvid = sum(1 for m in media if m["type"] == "video" and m.get("url"))
    lost = sum(1 for m in media if m["type"] == "video" and not m.get("url"))
    extra = []
    if nph:
        extra.append(f"фото: {nph}")
    if nvid:
        extra.append(f"видео: {nvid}")
    if lost:
        extra.append(f"видео больше 20 МБ не скачалось: {lost}")
    if extra:
        lines.append("")
        lines.append("В статье " + ", ".join(extra) + ".")
    lines.append("")
    lines.append("<i>Поправить текст — ответь на это сообщение, можно голосом.</i>")
    text = "\n".join(lines)
    return text if len(text) <= 4000 else text[:3990] + "…"


# --- Claude -------------------------------------------------------------------

def claude(prompt, cwd, tools=""):
    args = [CLAUDE, "-p", "--model", "sonnet", "--max-turns", "30", "--output-format", "text"]
    if tools:
        args += ["--allowedTools", tools]
    p = subprocess.run(args, input=prompt, cwd=cwd, capture_output=True, text=True, timeout=900,
                       env={**os.environ, "CLAUDE_CODE_OAUTH_TOKEN": ENV["CLAUDE_CODE_OAUTH_TOKEN"]})
    if p.returncode:
        raise RuntimeError(f"claude exit {p.returncode}: {(p.stderr or p.stdout)[-400:]}")
    out = p.stdout
    a, b = out.find("{"), out.rfind("}")
    if a < 0 or b < a:
        raise RuntimeError(f"claude: no json: {out[-300:]}")
    return json.loads(out[a:b + 1])


RULES = """Ты редактор сайта balinsky.info — независимого информационного каталога недвижимости Бали.
Читатели — покупатели и инвесторы, не агенты. Сайт не агентство: не продаёт, не принимает заявки,
не берёт комиссию и не участвует в сделках.

Правила текста:
- Только факты из сообщений и фото. Цифры, даты, названия не придумывать. Нет данных — не пиши.
- Нейтрально и понятно, как новость: короткие предложения, простые слова. Без эмодзи, капса, «!»,
  «успейте», «лучшая локация», «уникальное предложение».
- Обещания застройщика (доходность, «гарантированный доход», ROI, рост цены) — только как его
  заявление: «застройщик заявляет доходность 12% годовых в течение двух лет». Не как факт.
- Не пиши: призывы оставить заявку или написать Balinsky; комиссии и бонусы агентам; телефоны,
  ники и имена сотрудников; ссылки на чужие формы. Это не для покупателя.
- Даты — абсолютные (сегодня {today}). «До конца октября» → 31 октября 2026.
- Формат body: 3–8 коротких абзацев через пустую строку, перечни строками «- пункт».
  Без markdown (**, #). Последняя строка: «Источник: сообщение застройщика {dev}, {date}.»
- title — до 90 знаков, без точки в конце, по сути: что произошло и где.
- seoDescription — 120–160 знаков, одно-два предложения.
"""


def draft_prompt(dev, complexes, msgs, photos, today):
    cx = "\n".join(f"- {c['slug']} | {c['name']} | {c['status'] or '?'} | готовность {c['ready'] if c['ready'] is not None else '?'}%"
                   for c in complexes) or "- (комплексов в каталоге нет)"
    chat = "\n\n".join(f"[{m['created_at'][:16].replace('T', ' ')} UTC] {m.get('sender_name') or '?'}"
                       f"{' (' + m['media_type'] + ')' if m.get('media_type') else ''}:\n{m.get('text') or ''}" for m in msgs)
    ph = "\n".join(f"- {i + 1}: {p}" for i, p in enumerate(photos)) or "- (фото нет)"
    return RULES.format(today=today, dev=dev["name"], date=msgs[-1]["created_at"][:10]) + f"""
Застройщик: {dev['name']}. Его комплексы в каталоге (slug | название | статус | готовность):
{cx}

Сообщения застройщика в общем чате с Balinsky:
{chat}

Фото из этих сообщений лежат в текущей папке, посмотри их инструментом Read:
{ph}

Задача: реши, стоит ли это публиковать, и напиши черновик.

kind:
- construction — отчёт о ходе стройки (фото/видео со стройки, этап работ, процент готовности);
- promo — особые условия покупки со сроком: скидка, рассрочка, фикс. доходность «до даты»;
- event — мероприятие с датой: презентация, брокер-тур, открытие, день открытых дверей;
- news — прочие новости проекта: старт продаж, новый проект, сдача, документы, новые цены;
- none — не для сайта: болтовня, приветствия, вопросы, организационное, благодарности,
  материалы только для агентов (комиссии, бонусы, рекламные креативы без новости).

Ответь ОДНИМ JSON-объектом, без пояснений вокруг:
{{"kind": "...", "reason": "одна фраза, почему такой выбор",
 "title": "...", "seoDescription": "...", "body": "...",
 "complexSlug": "slug из списка выше или null",
 "expiresAt": "YYYY-MM-DD или null (для promo — до какого числа действует)",
 "startsAt": "YYYY-MM-DDTHH:MM:00+08:00 или null (для event)", "endsAt": "... или null",
 "format": "Живой | Онлайн | null (для event)",
 "locationUrl": "ссылка на карту из сообщения или null", "registerUrl": "ссылка регистрации или null",
 "readinessPct": "целое 0–100, только если застройщик прямо назвал процент готовности, иначе null",
 "photoOrder": [номера фото для статьи, лучшее первым; без скриншотов чата, мемов, дублей],
 "skipHint": "если лучше не публиковать, хотя это не none — почему (одна фраза), иначе null"}}
Для kind = none остальные поля можно оставить пустыми.
"""


def revise_prompt(row, feedback, today):
    d = row["draft"]
    return RULES.format(today=today, dev=row["developer_name"], date=row["created_at"][:10]) + f"""
Вот черновик статьи (JSON):
{json.dumps({k: d.get(k) for k in ('title', 'seoDescription', 'body', 'expiresAt', 'startsAt', 'endsAt', 'readinessPct')}, ensure_ascii=False, indent=1)}

Владелец сайта просит поправить: «{feedback}»

Внеси правку, остальное не трогай. Ответь тем же JSON-объектом с теми же ключами, без пояснений.
"""


def translate_prompt(d):
    src = {k: d[k] for k in ("title", "seoDescription", "body") if d.get(k)}
    return f"""Translate this Bali real-estate news item from Russian for balinsky.info.
Languages: en, id, fr, de, zh, nl, pl, uk. Keep project, developer and place names in Latin as in the
source. Keep numbers, dates, currency and the line structure of body (blank lines, "- " bullets).
Neutral journalistic tone, natural native phrasing, not a calque. No markdown.

Source (JSON):
{json.dumps(src, ensure_ascii=False, indent=1)}

Answer with ONE JSON object only:
{{"en": {{"title": "...", "seoDescription": "...", "body": "..."}}, "id": {{...}}, "fr": {{...}}, "de": {{...}},
 "zh": {{...}}, "nl": {{...}}, "pl": {{...}}, "uk": {{...}}}}
"""


# --- helpers ------------------------------------------------------------------

def developers():
    rows = sb_get("raw_developers", {"select": "telegram_chat_id,data", "telegram_chat_id": "not.is.null"})
    out = {}
    for r in rows:
        try:
            cid = int(str(r["telegram_chat_id"]).strip())
        except ValueError:
            continue
        d = r["data"] or {}
        out[cid] = {"name": (d.get("Developer") or "").strip(), "slug": d.get("SEO:Slug")}
    return out


def complexes_of(dev_name):
    if not dev_name:
        return []
    rows = sb_get("raw_complexes", {"select": "airtable_id,data", "data->>Developer": f"ilike.{dev_name.strip()}*"})
    out = []
    for r in rows:
        d = r["data"] or {}
        raw = d.get("Готовность")
        ready = None
        if isinstance(raw, (int, float)):
            ready = round(raw * 100 if raw <= 1 else raw)
        out.append({"id": r["airtable_id"], "name": d.get("Project") or "", "slug": d.get("SEO:Slug"),
                    "status": d.get("Статус"), "ready": ready})
    return [c for c in out if c["slug"]]


def bursts(msgs):
    """Делит сообщения одного чата на пачки по паузам."""
    groups, cur = [], []
    for m in msgs:
        t = datetime.fromisoformat(m["created_at"])
        if cur and (t - datetime.fromisoformat(cur[-1]["created_at"])).total_seconds() > GAP_S:
            groups.append(cur)
            cur = []
        cur.append(m)
    if cur:
        groups.append(cur)
    return groups


def download(url, path):
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    with open(path, "wb") as f:
        f.write(r.content)
    return r.content


def slugify_en(s):
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))[:80].rstrip("-")


def tr_hash(src):
    ordered = "".join(f"{k} {src[k]}" for k in sorted(src))
    return hashlib.sha1(ordered.encode()).hexdigest()[:16]


def voice_to_text(url):
    from wyoming.asr import Transcribe, Transcript
    from wyoming.audio import AudioChunk, AudioStart, AudioStop
    from wyoming.client import AsyncTcpClient

    ogg = requests.get(url, timeout=60).content
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", "16000", "pipe:1"],
                         input=ogg, capture_output=True, check=True).stdout

    async def stt():
        async with AsyncTcpClient(*STT) as c:
            await c.write_event(Transcribe(language="ru").event())
            await c.write_event(AudioStart(rate=16000, width=2, channels=1).event())
            for i in range(0, len(pcm), 32000):
                await c.write_event(AudioChunk(rate=16000, width=2, channels=1, audio=pcm[i:i + 32000]).event())
            await c.write_event(AudioStop().event())
            while True:
                ev = await asyncio.wait_for(c.read_event(), 60)
                if ev is None:
                    return ""
                if Transcript.is_type(ev.type):
                    return Transcript.from_event(ev).text.strip()
    return asyncio.run(stt())


def today_str():
    return datetime.now(WALL).strftime("%Y-%m-%d")


def find_cx(complexes, slug):
    return next((c for c in complexes if c["slug"] == slug), None) if slug else None


def send_card(row, cx):
    photos = [m["url"] for m in row["media"] if m["type"] == "photo"]
    if photos:
        tg("sendMediaGroup", chat_id=OWNER, media=[{"type": "photo", "media": u} for u in photos[:10]])
    j = tg("sendMessage", chat_id=OWNER, text=card_text(row, cx), parse_mode="HTML",
           disable_web_page_preview=True, reply_markup=keyboard(row["id"], row["suggested_kind"]))
    return (j.get("result") or {}).get("message_id")


FAILS_PATH = os.path.join(DIR, "fails.json")
FAILS = json.load(open(FAILS_PATH)) if os.path.exists(FAILS_PATH) else {}


def save_fails():
    with open(FAILS_PATH, "w") as f:
        json.dump(FAILS, f)


# --- 1. collect ---------------------------------------------------------------

def collect(dry=False):
    devs = developers()
    if not devs:
        return
    done = sb_get("dev_updates", {"select": "chat_id,last_msg_id", "order": "last_msg_id.desc", "limit": "2000"})
    cursor = {}
    for r in done:
        cursor.setdefault(r["chat_id"], r["last_msg_id"])
    since = max(START_AT, (datetime.now(timezone.utc) - timedelta(days=7)).isoformat())
    msgs = sb_get("bot_messages", {
        "select": "id,chat_id,created_at,sender_id,sender_name,text,media_type,media_url",
        "chat_id": f"in.({','.join(str(c) for c in devs)})",
        "direction": "eq.in", "created_at": f"gte.{since}", "order": "id.asc", "limit": "2000",
    })
    by_chat = {}
    for m in msgs:
        if m["id"] <= cursor.get(m["chat_id"], 0) or m.get("sender_id") == OWNER or m.get("media_type") == "sticker":
            continue
        by_chat.setdefault(m["chat_id"], []).append(m)

    now = datetime.now(timezone.utc)
    for chat_id, cm in by_chat.items():
        dev = devs[chat_id]
        for b in bursts(cm):
            if (now - datetime.fromisoformat(b[-1]["created_at"])).total_seconds() < QUIET_S:
                continue  # ещё досылают альбом
            if not any((m.get("text") or "").strip() for m in b) and not any(m.get("media_url") for m in b):
                continue
            key = f"{chat_id}:{b[-1]['id']}"
            try:
                handle_burst(chat_id, dev, b, dry)
                FAILS.pop(key, None)
            except Exception as e:
                # Сбой Claude/сети — пачка не помечена, следующий прогон
                # попробует снова. После 3 неудач откладываем её как error,
                # чтобы не жечь лимит подписки по кругу.
                FAILS[key] = FAILS.get(key, 0) + 1
                log("burst error", key, FAILS[key], repr(e))
                if FAILS[key] >= 3 and not dry:
                    sb_insert("dev_updates", {"chat_id": chat_id, "developer_slug": dev["slug"],
                                              "developer_name": dev["name"], "msg_ids": [m["id"] for m in b],
                                              "last_msg_id": b[-1]["id"], "status": "error", "error": str(e)[:1000]})
                    FAILS.pop(key, None)
    save_fails()


def handle_burst(chat_id, dev, msgs, dry):
    ids = [m["id"] for m in msgs]
    complexes = complexes_of(dev["name"])
    photos_src = [m["media_url"] for m in msgs if m.get("media_type") == "photo" and m.get("media_url")][:10]
    videos = [{"type": "video", "url": m.get("media_url")} for m in msgs if m.get("media_type") in ("video", "video_note")]
    tmp = tempfile.mkdtemp(prefix="dvu-")
    try:
        names = []
        for i, u in enumerate(photos_src):
            n = f"photo{i + 1}.jpg"
            download(u, os.path.join(tmp, n))
            names.append(n)
        d = claude(draft_prompt(dev, complexes, msgs, names, today_str()), tmp, "Read")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    kind = d.get("kind")
    base = {"chat_id": chat_id, "developer_slug": dev["slug"], "developer_name": dev["name"],
            "msg_ids": ids, "last_msg_id": ids[-1]}
    if kind not in KIND:
        log("noise", dev["name"], ids[0], "-", d.get("reason"))
        if not dry:
            sb_insert("dev_updates", {**base, "status": "noise", "draft": d})
        return
    order = [int(x) - 1 for x in (d.get("photoOrder") or []) if str(x).isdigit() and 0 < int(x) <= len(photos_src)]
    if not order:
        order = list(range(len(photos_src)))
    media = [{"type": "photo", "url": photos_src[i]} for i in order] + videos
    cx = find_cx(complexes, d.get("complexSlug"))
    if cx:
        d["complexName"], d["complexId"] = cx["name"], cx["id"]
    row = {**base, "status": "pending", "suggested_kind": kind, "draft": d, "media": media}
    if dry:
        log("DRY", dev["name"], kind, json.dumps(d, ensure_ascii=False)[:1500])
        return
    row = sb_insert("dev_updates", row)
    mid = send_card(row, cx)
    if mid:
        sb_update("dev_updates", {"id": row["id"]}, {"tg_message_id": mid})
    log("card", row["id"], dev["name"], kind)


# --- 2. revise ----------------------------------------------------------------

def revise():
    rows = sb_get("dev_updates", {"select": "*", "status": "eq.pending", "draft->revise": "not.is.null"})
    for row in rows:
        rv = row["draft"].get("revise") or {}
        feedback = (rv.get("text") or "").strip()
        if not feedback and rv.get("voiceUrl"):
            feedback = voice_to_text(rv["voiceUrl"])
        d = dict(row["draft"])
        d.pop("revise", None)
        if not feedback:
            sb_update("dev_updates", {"id": row["id"]}, {"draft": d})
            tg("sendMessage", chat_id=OWNER, text="Не разобрал правку. Напиши текстом ответом на карточку.",
               reply_to_message_id=row["tg_message_id"])
            continue
        new = claude(revise_prompt(row, feedback, today_str()), DIR)
        for k in ("title", "seoDescription", "body", "expiresAt", "startsAt", "endsAt", "readinessPct"):
            if k in new:
                d[k] = new[k]
        d.setdefault("edits", []).append(feedback)
        row = sb_update("dev_updates", {"id": row["id"]}, {"draft": d})[0]
        cx = find_cx(complexes_of(row["developer_name"]), d.get("complexSlug"))
        # Старую карточку закрываем, новую шлём ниже — так она не теряется в чате.
        tg("editMessageReplyMarkup", chat_id=OWNER, message_id=row["tg_message_id"],
           reply_markup={"inline_keyboard": [[{"text": "↩️ Переделано, см. ниже", "callback_data": "dvu:noop"}]]})
        j = tg("sendMessage", chat_id=OWNER, text=card_text(row, cx), parse_mode="HTML",
               disable_web_page_preview=True, reply_markup=keyboard(row["id"], row["suggested_kind"]))
        mid = (j.get("result") or {}).get("message_id")
        if mid:
            sb_update("dev_updates", {"id": row["id"]}, {"tg_message_id": mid})
        log("revised", row["id"], feedback[:80])


# --- 3. publish ---------------------------------------------------------------

def copy_media(row, bucket):
    photos, videos = [], []
    for i, m in enumerate(row["media"]):
        if not m.get("url"):
            continue
        r = requests.get(m["url"], timeout=300)
        r.raise_for_status()
        ext = os.path.splitext(m["url"].split("?")[0])[1] or (".jpg" if m["type"] == "photo" else ".mp4")
        ctype = "image/jpeg" if m["type"] == "photo" else "video/mp4"
        url = storage_put(bucket, f"devupd/{row['id']}-{i + 1}{ext}", r.content, ctype, "31536000")
        (photos if m["type"] == "photo" else videos).append(url)
    return photos, videos


def publish():
    rows = sb_get("dev_updates", {"select": "*", "status": "eq.approved", "order": "id.asc"})
    for row in rows:
        try:
            publish_one(row)
        except Exception as e:  # одна сломанная запись не держит остальные
            log("publish error", row["id"], repr(e))
            sb_update("dev_updates", {"id": row["id"]}, {"status": "error", "error": str(e)[:1000]})
            tg("sendMessage", chat_id=OWNER, reply_to_message_id=row["tg_message_id"],
               text="Не получилось опубликовать, разбираюсь. Ничего нажимать не надо.")


def publish_one(row):
    kind = row["kind"]
    k = KIND[kind]
    d = row["draft"]
    tr = claude(translate_prompt(d), DIR)
    en_title = (tr.get("en") or {}).get("title") or d["title"]

    manifest = storage_get_json(k["bucket"], k["manifest"], {"items": []})
    items = manifest.get("items") or []
    item_id = f"dvu_{row['id']}"
    if any(i.get("id") == item_id for i in items):
        raise RuntimeError(f"{item_id} уже в манифесте")
    taken = {i.get("slug") for i in items} | {a for i in items for a in (i.get("aliases") or [])}
    slug = slugify_en(en_title) or item_id
    base, n = slug, 2
    while slug in taken:
        slug = f"{base[:76]}-{n}"
        n += 1

    photos, videos = copy_media(row, k["photos"])
    dev = {"name": row["developer_name"], "slug": row["developer_slug"]}
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    common = {
        "id": item_id, "slug": slug, "title": d["title"], "seoDescription": d.get("seoDescription"),
        "body": d.get("body"), "photo": photos[0] if photos else None, "photos": photos, "videos": videos,
        "pinned": False, "developers": [dev],
    }
    if k["bucket"] == "news":
        item = {**common, "aliases": [], "status": "published", "date": today_str(), "createdAt": now,
                "externalUrl": None, "videoUrl": None, "complexNames": [d.get("complexName") or dev["name"]]}
    elif kind == "promo":
        item = {**common, "expiresAt": d.get("expiresAt"), "externalUrl": None, "top10": False,
                "complexNames": [d.get("complexName") or dev["name"]]}
    else:
        item = {**common, "startsAt": d.get("startsAt"), "endsAt": d.get("endsAt"), "format": d.get("format"),
                "locationUrl": d.get("locationUrl"), "registerUrl": d.get("registerUrl"), "videoUrl": None}

    # Бэкап манифеста перед записью — откатить руками, если что.
    os.makedirs(os.path.join(DIR, "backups"), exist_ok=True)
    with open(os.path.join(DIR, "backups", f"{k['bucket']}-{int(time.time())}.json"), "w") as f:
        json.dump(manifest, f, ensure_ascii=False)

    # Переводы — до манифеста, чтобы страница сразу вышла на всех языках.
    src = {f: d[f] for f in ("title", "seoDescription", "body") if d.get(f)}
    h = tr_hash(src)
    for lang in LANGS:
        t = tr.get(lang) or {}
        if not t.get("title"):
            continue
        key = f"_translations-{k['section']}{'' if lang == 'en' else '-' + lang}.json"
        cache = storage_get_json("feeds", key, {})
        cache[item_id] = {**{f: t[f] for f in ("title", "seoDescription", "body") if t.get(f)}, "_hash": h}
        storage_put("feeds", key, json.dumps(cache, ensure_ascii=False, indent=2).encode(), "application/json", "60")

    items.insert(0, item)
    body = json.dumps({"generatedAt": now, "count": len(items), "items": items}, ensure_ascii=False).encode()
    storage_put(k["bucket"], k["manifest"], body, "application/json", "60")

    kinds = [k["section"]]
    ready_note = ""
    if kind == "construction" and d.get("complexId") and isinstance(d.get("readinessPct"), (int, float)):
        cxrow = sb_get("raw_complexes", {"select": "data", "airtable_id": f"eq.{d['complexId']}"})
        if cxrow:
            data = cxrow[0]["data"]
            data["Готовность"] = max(0, min(100, int(d["readinessPct"]))) / 100
            sb_update("raw_complexes", {"airtable_id": d["complexId"]}, {"data": data})
            kinds.append("complexes")
            ready_note = f"\nГотовность «{d.get('complexName')}» на сайте: {int(d['readinessPct'])}%."

    r = requests.post(f"{SITE}/api/revalidate-content", params={"kinds": ",".join(kinds)},
                      headers={**UA, "Authorization": "Bearer " + ENV["REVALIDATE_TOKEN"]}, timeout=60)
    if not r.ok:
        log("revalidate", r.status_code, r.text[:200])

    url = f"{SITE}/ru/{k['path']}/{slug}"
    ok = False
    for _ in range(6):
        time.sleep(10)
        try:
            ok = requests.get(url, headers=UA, timeout=60).status_code == 200
        except requests.RequestException:
            ok = False
        if ok:
            break

    sb_update("dev_updates", {"id": row["id"]}, {"status": "published", "published_url": url,
                                                  "published_at": datetime.now(timezone.utc).isoformat()})
    tg("editMessageReplyMarkup", chat_id=OWNER, message_id=row["tg_message_id"],
       reply_markup={"inline_keyboard": [[{"text": f"✅ На сайте: {k['label']}", "url": url}]]})
    msg = f"Опубликовано на 10 языках: {url}{ready_note}"
    if not ok:
        msg += "\nСтраница пока не открылась — проверю ещё раз сам."
    tg("sendMessage", chat_id=OWNER, text=msg, reply_to_message_id=row["tg_message_id"], disable_web_page_preview=True)
    log("published", row["id"], url, "ok" if ok else "NOT 200")


def main():
    lock = open(os.path.join(DIR, ".lock"), "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        return  # прошлый прогон ещё идёт (Claude думает долго)
    dry = "--dry" in sys.argv
    for step in ((lambda: collect(dry)),) if dry else (publish, revise, lambda: collect(False)):
        try:
            step()
        except Exception as e:
            log("step error", repr(e))


if __name__ == "__main__":
    main()
