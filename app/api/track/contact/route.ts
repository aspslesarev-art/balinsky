// Клик по кнопке Telegram / WhatsApp. Шлёт components/ContactClickTracker.tsx
// через sendBeacon, пишем одну строку в `contact_clicks` (миграция 086).
// Публичный, только на запись; ботов отсекаем по user-agent, как /api/track/view.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LANGS } from '@/lib/i18n'
import { getSessionTelegramId } from '@/lib/site-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const BOT_RE = /bot|crawler|spider|crawling|googlebot|bingbot|yandex|baidu|duckduckbot|facebookexternalhit|twitterbot|slurp|sogou|exabot|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|applebot|telegrambot|whatsapp|preview/i

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

// Ссылку сводим к адресату: t.me/<handle> или wa.me/<цифры>. Текст
// сообщения и прочие параметры не храним — он длинный и одинаковый.
function normalizeTarget(channel: string, href: string): string | null {
  try {
    const u = new URL(href)
    if (channel === 'whatsapp') {
      const digits = u.hostname === 'wa.me'
        ? u.pathname.replace(/[^\d]/g, '')
        : (u.searchParams.get('phone') ?? '').replace(/[^\d]/g, '')
      return digits ? `wa.me/${digits}` : u.hostname
    }
    if (u.protocol === 'tg:') return `tg:${u.searchParams.get('domain') ?? u.pathname}`
    const handle = u.pathname.replace(/^\/+/, '').split('/')[0]
    return handle ? `t.me/${handle}` : 't.me'
  } catch {
    return null
  }
}

function deviceOf(ua: string): string {
  if (/ipad|tablet/i.test(ua)) return 'tablet'
  if (/mobi|iphone|android/i.test(ua)) return 'mobile'
  return 'desktop'
}

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') ?? ''
  if (BOT_RE.test(ua)) return NextResponse.json({ ok: true, skipped: 'bot' })

  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  const channel = b.channel === 'telegram' || b.channel === 'whatsapp' ? b.channel : null
  const href = str(b.href, 2000)
  if (!channel || !href) return NextResponse.json({ ok: false, error: 'bad input' }, { status: 400 })
  const target = normalizeTarget(channel, href)
  if (!target) return NextResponse.json({ ok: false, error: 'bad href' }, { status: 400 })

  const lang = str(b.lang, 8)
  const row = {
    channel,
    target: target.slice(0, 200),
    placement: str(b.placement, 80),
    page_path: str(b.path, 300),
    page_kind: str(b.pageKind, 40),
    page_slug: str(b.pageSlug, 200),
    page_title: str(b.title, 300),
    manager_id: str(b.managerId, 80),
    manager_name: str(b.managerName, 120),
    developer_name: str(b.developerName, 160),
    lang: lang && (LANGS as readonly string[]).includes(lang) ? lang : null,
    visitor_id: str(b.visitorId, 64),
    telegram_id: await getSessionTelegramId(),
    country: str(req.headers.get('x-vercel-ip-country'), 8),
    device: deviceOf(ua),
  }

  const { error } = await sb.from('contact_clicks').insert(row)
  if (error) {
    console.error('[track-contact]', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
