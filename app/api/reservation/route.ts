import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TG_ADMIN_CHAT = process.env.ADMIN_TELEGRAM_CHAT_ID

type Body = {
  listing_kind?: 'villa' | 'apartment'
  listing_id?: string
  listing_slug?: string
  listing_title?: string
  listing_price_usd?: number
  contact_name?: string
  contact_email?: string
  contact_phone?: string
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length === 0 ? null : s
}
function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

// Best-effort Telegram notification to the operator. Skips silently if
// the chat ID isn't configured — the reservation row is the source of
// truth, not the message.
async function notifyAdmin(text: string) {
  if (!TG_TOKEN || !TG_ADMIN_CHAT) return
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_ADMIN_CHAT,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
  } catch (e) {
    console.error('[reservation] tg notify failed:', e)
  }
}

export async function POST(req: Request) {
  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }

  const kind = body.listing_kind === 'villa' || body.listing_kind === 'apartment' ? body.listing_kind : null
  const listingId = trimOrNull(body.listing_id)
  const listingSlug = trimOrNull(body.listing_slug)
  const name = trimOrNull(body.contact_name)
  const email = trimOrNull(body.contact_email)
  const phone = trimOrNull(body.contact_phone)

  if (!kind || !listingId || !listingSlug || !name || !email || !phone) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  }
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: 'bad_email' }, { status: 400 })
  }
  if (name.length > 200 || phone.length > 64) {
    return NextResponse.json({ ok: false, error: 'too_long' }, { status: 400 })
  }

  const { data, error } = await sb.from('reservations').insert({
    listing_kind: kind,
    listing_id: listingId,
    listing_slug: listingSlug,
    listing_title: trimOrNull(body.listing_title),
    listing_price_usd: typeof body.listing_price_usd === 'number' ? body.listing_price_usd : null,
    contact_name: name,
    contact_email: email,
    contact_phone: phone,
  }).select('id, expires_at').single()

  if (error) {
    console.error('[reservation] insert failed:', error.message)
    return NextResponse.json({ ok: false, error: 'db' }, { status: 500 })
  }

  const sectionPath = kind === 'apartment' ? '/ru/apartamenty/o/' : '/ru/villy/o/'
  const url = `https://balinsky.info${sectionPath}${listingSlug}`
  notifyAdmin(
    `<b>📌 Новая бронь</b>\n\n` +
    `<b>${escapeHtml(body.listing_title ?? listingSlug)}</b>\n` +
    `${url}\n\n` +
    `${escapeHtml(name)}\n` +
    `${escapeHtml(email)} · ${escapeHtml(phone)}\n\n` +
    `Открыть в админке: https://balinsky.info/admin/reservations`,
  )

  return NextResponse.json({ ok: true, id: data?.id, expires_at: data?.expires_at })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
