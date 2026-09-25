// Счётчик для закрытых лендингов (public/agentskaya-set). Страница шлёт
// накопленные итоги сессии раз в 15 секунд и при уходе со страницы —
// здесь это upsert одной строки в `landing_visits` (миграция 084).
// Первый пинг сессии (first: true) ещё и шлёт владельцу уведомление в
// Telegram: страницу рассылают конкретным застройщикам, и момент, когда
// её открыли, важнее любой сводки.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAdminAlert } from '@/lib/admin-alert'

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

  const { error } = await sb.from('landing_visits').upsert(row, { onConflict: 'id' })
  if (error) {
    console.error('[track-landing]', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  if (body.first) {
    let visitNo = 1
    if (vid) {
      const { count } = await sb.from('landing_visits')
        .select('id', { count: 'exact', head: true })
        .eq('page', body.page).eq('visitor_id', vid)
      visitNo = count ?? 1
    }
    const where = [row.city, row.country].filter(Boolean).join(', ') || 'неизвестно'
    await sendAdminAlert(
      `\u{1F440} Открыли ${PAGE_TITLES[body.page] ?? body.page}\n\n`
      + `Кто: ${who ?? 'без метки в ссылке'}${visitNo > 1 ? ` · заход №${visitNo}` : ''}\n`
      + `Где: ${where} · ${row.device}\n\n`
      + 'Отчёт: https://balinsky.info/admin/lending',
    )
  }

  return NextResponse.json({ ok: true })
}
