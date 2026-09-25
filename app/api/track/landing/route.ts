// Счётчик для закрытых лендингов (public/agentskaya-set). Страница шлёт
// накопленные итоги сессии раз в 15 секунд и при уходе со страницы —
// здесь это upsert одной строки в `landing_visits` (миграция 084).
// Первый пинг сессии (first: true) шлёт владельцу уведомление в Telegram,
// а следующие пинги дописывают в это же сообщение время, прокрутку и
// прочитанные блоки — одна живая карточка на заход, а не лента сообщений.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAdminAlertWithId, editAdminAlert } from '@/lib/admin-alert'
import { LANDING_SECTIONS, LANDING_SEEN_SEC, fmtDur } from '@/lib/landing-sections'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const PAGES = new Set(['agentskaya-set'])
const PAGE_TITLES: Record<string, string> = { 'agentskaya-set': 'предложение застройщикам' }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SECTION_RE = /^s\d{1,2}$/
const BOT_RE = /bot|crawler|spider|crawling|googlebot|bingbot|yandex|baidu|duckduckbot|facebookexternalhit|twitterbot|slurp|semrushbot|ahrefsbot|petalbot|applebot|telegrambot|whatsapp|preview|headless/i
const DAY = 86_400

type Body = {
  id?: string
  page?: string
  who?: string | null
  vid?: string
  first?: boolean
  active?: number
  scroll?: number
  sections?: Record<string, number>
  cta?: number
  ref?: string
}

function int(v: unknown, max: number): number {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0
}

function device(ua: string): string {
  if (/iPad/.test(ua)) return 'iPad'
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android' : 'Android-планшет'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return 'другое'
}

function header(req: Request, name: string): string | null {
  const v = req.headers.get(name)
  if (!v) return null
  try { return decodeURIComponent(v) } catch { return v }
}

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') ?? ''
  if (BOT_RE.test(ua)) return NextResponse.json({ ok: true, skipped: 'bot' })

  let body: Body
  try { body = JSON.parse(await req.text()) }
  catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  if (!body.id || !UUID_RE.test(body.id) || !body.page || !PAGES.has(body.page)) {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 })
  }

  const sections: Record<string, number> = {}
  if (body.sections && typeof body.sections === 'object') {
    for (const [k, v] of Object.entries(body.sections)) {
      if (SECTION_RE.test(k)) sections[k] = int(v, DAY)
    }
  }
  const who = typeof body.who === 'string'
    ? body.who.replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 60) || null
    : null
  const vid = typeof body.vid === 'string' ? body.vid.slice(0, 64) : null

  const row = {
    id:           body.id,
    page:         body.page,
    who,
    visitor_id:   vid,
    last_seen_at: new Date().toISOString(),
    active_sec:   int(body.active, DAY),
    max_scroll:   int(body.scroll, 100),
    sections,
    cta_clicks:   int(body.cta, 1000),
    city:         header(req, 'x-vercel-ip-city'),
    country:      header(req, 'x-vercel-ip-country'),
    device:       device(ua),
    referrer:     typeof body.ref === 'string' ? body.ref.slice(0, 300) || null : null,
    user_agent:   ua.slice(0, 400),
  }

  type Saved = { started_at: string; tg_message_id: number | null }
  let saved: Saved | null = null
  const res = await sb.from('landing_visits').upsert(row, { onConflict: 'id' })
    .select('started_at, tg_message_id').single()
  if (res.error) {
    // До миграции 085 колонки tg_message_id нет — пишем визит без карточки.
    if (!/tg_message_id/.test(res.error.message)) {
      console.error('[track-landing]', res.error.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }
    const plain = await sb.from('landing_visits').upsert(row, { onConflict: 'id' })
    if (plain.error) {
      console.error('[track-landing]', plain.error.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }
  } else {
    saved = res.data as Saved
  }

  if (body.first || saved?.tg_message_id) {
    let visitNo = 1
    if (vid && saved) {
      const { count } = await sb.from('landing_visits')
        .select('id', { count: 'exact', head: true })
        .eq('page', body.page).eq('visitor_id', vid).lte('started_at', saved.started_at)
      visitNo = count ?? 1
    }
    const text = card({ page: body.page, who, visitNo, row })
    if (body.first) {
      const messageId = await sendAdminAlertWithId(text)
      if (messageId && saved) {
        await sb.from('landing_visits').update({ tg_message_id: messageId }).eq('id', row.id)
      }
    } else if (saved?.tg_message_id) {
      await editAdminAlert(saved.tg_message_id, text)
    }
  }

  return NextResponse.json({ ok: true })
}

function card({ page, who, visitNo, row }: {
  page: string
  who: string | null
  visitNo: number
  row: { city: string | null; country: string | null; device: string; active_sec: number; max_scroll: number; sections: Record<string, number>; cta_clicks: number }
}): string {
  const where = [row.city, row.country].filter(Boolean).join(', ') || 'неизвестно'
  const lines = [
    `\u{1F440} Открыли ${PAGE_TITLES[page] ?? page}`,
    '',
    `Кто: ${who ?? 'без метки в ссылке'}${visitNo > 1 ? ` · заход №${visitNo}` : ''}`,
    `Где: ${where} · ${row.device}`,
    '',
  ]
  if (row.active_sec < LANDING_SEEN_SEC) {
    lines.push('Только что открыл')
  } else {
    lines.push(`\u{23F1} ${fmtDur(row.active_sec)} на странице · долистал до ${row.max_scroll}%`)
    const read = LANDING_SECTIONS
      .filter(([k]) => (row.sections[k] ?? 0) >= LANDING_SEEN_SEC)
      .sort((a, b) => (row.sections[b[0]] ?? 0) - (row.sections[a[0]] ?? 0))
    if (read.length) {
      lines.push(`\u{1F4D6} Читал ${read.length} из ${LANDING_SECTIONS.length} блоков, дольше всего:`)
      for (const [k, label] of read.slice(0, 4)) lines.push(`   ${label} — ${fmtDur(row.sections[k] ?? 0)}`)
    }
  }
  if (row.cta_clicks > 0) lines.push('\u{270D}\u{FE0F} Нажал «Написать в Telegram»')
  const at = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' })
  lines.push('', `Обновлено в ${at} (Бали)`, 'Отчёт: https://balinsky.info/admin/lending')
  return lines.join('\n')
}
