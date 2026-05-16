// Public contact endpoint. Site-wide ContactBlock and per-listing
// inline forms POST here. The lead is forwarded to the admin Telegram
// chat (same one the reservation confirmer uses) so the team sees it
// alongside its existing notifications.
//
// Rate-limit + honeypot guard the endpoint against simple form spam.
// No captcha yet — if we start seeing automated submissions, swap
// in hCaptcha / Cloudflare Turnstile.

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TG_TOKEN = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim()
const ADMIN_CHAT = (process.env.ADMIN_TELEGRAM_CHAT_ID ?? '').trim()

// In-memory IP throttle. Per Vercel-region instance — good enough for
// the threat model (low-volume form, not a hardened API). Allows 5
// submissions per 10 minutes per IP before returning 429.
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const _hits = new Map<string, number[]>()
function rateLimit(ip: string): boolean {
  const now = Date.now()
  const arr = (_hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  if (arr.length >= MAX_PER_WINDOW) return false
  arr.push(now)
  _hits.set(ip, arr)
  return true
}

type Body = {
  name?: string
  email?: string
  phone?: string
  message?: string
  // Listing context (optional, set when form is on a detail page)
  listingKind?: string
  listingSlug?: string
  listingTitle?: string
  // Honeypot — bots typically fill every input; real users don't see
  // this field (CSS-hidden in the form component).
  website?: string
  // Where on the site the visitor submitted from, for routing context.
  page?: string
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

async function sendToTelegram(text: string): Promise<void> {
  if (!TG_TOKEN || !ADMIN_CHAT) return
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  }).catch(err => console.error('[contact] telegram send failed:', err))
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = await req.json() as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  // Honeypot: bots fill `website` → silently accept-and-drop so they
  // don't retry. From the bot's POV nothing happened.
  if (body.website && body.website.trim()) {
    return NextResponse.json({ ok: true, leadId: 'spam-trap' })
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim()
  const phone = (body.phone ?? '').trim()
  const message = (body.message ?? '').trim()

  if (!name || name.length > 100) {
    return NextResponse.json({ ok: false, error: 'invalid_name' }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
  }
  if (!message || message.length > 4000) {
    return NextResponse.json({ ok: false, error: 'invalid_message' }, { status: 400 })
  }

  // Vercel forwards the visitor IP in x-forwarded-for. Use the first
  // hop only — subsequent hops are Vercel's own infra.
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(ip)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  const leadId = `lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  const lines: string[] = [
    '🆕 <b>Новая заявка с сайта</b>',
    '',
    `<b>Имя:</b> ${escapeHtml(name)}`,
    `<b>Email:</b> ${escapeHtml(email)}`,
  ]
  if (phone) lines.push(`<b>Телефон:</b> ${escapeHtml(phone)}`)
  if (body.listingTitle) {
    lines.push('')
    lines.push(`<b>Объект:</b> ${escapeHtml(body.listingTitle)}`)
    if (body.listingKind && body.listingSlug) {
      lines.push(`<i>${escapeHtml(body.listingKind)} · ${escapeHtml(body.listingSlug)}</i>`)
    }
  }
  if (body.page) lines.push(`<i>Со страницы: ${escapeHtml(body.page)}</i>`)
  lines.push('')
  lines.push('<b>Сообщение:</b>')
  lines.push(escapeHtml(message))
  lines.push('')
  lines.push(`<code>${leadId}</code>`)

  await sendToTelegram(lines.join('\n'))

  return NextResponse.json({ ok: true, leadId })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
