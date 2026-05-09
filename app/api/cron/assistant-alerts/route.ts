// Daily digest cron for saved-search subscriptions.
//
// Vercel cron hits GET with `Authorization: Bearer ${CRON_SECRET}`.
// Schedule: 02:00 UTC = 10:00 Bali (WITA, UTC+8) = 05:00 MSK.
// 10am Bali is when realtors actually check messages — a few hours
// before the typical "looking-at-properties" evening window.
//
// For each active daily subscription whose last_sent_at < 23h ago
// (or null), we run findMatches() against the live catalog,
// subtract objects already in seen_object_ids, and Telegram-push
// the new ones. seen_object_ids is then updated to include both
// old and new ids so we never re-push the same listing.
//
// Failure handling: each subscription is processed in isolation.
// One sub failing (Telegram API hiccup, deleted chat) doesn't break
// the rest. Errors are logged with [alerts] prefix so they surface
// cleanly in Vercel logs.

import { NextResponse } from 'next/server'
import { listDueDaily, findMatches, markSent, deleteSubscription, describeFilter, type Subscription, type MatchedObject } from '@/lib/subscriptions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const TG = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim()

function authOk(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return req.headers.get('authorization') === `Bearer ${expected}`
}

export async function GET(req: Request) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  if (!TG) return NextResponse.json({ ok: false, error: 'no_telegram_token' }, { status: 500 })

  const subs = await listDueDaily().catch(err => {
    console.error('[alerts] listDueDaily failed:', err)
    return [] as Subscription[]
  })

  let sent = 0
  let zeroMatch = 0
  let failed = 0

  for (const sub of subs) {
    try {
      const matches = await findMatches(sub.filter, sub.seenObjectIds, 6)
      if (matches.length === 0) {
        // No new matches → just bump last_sent_at so we don't keep
        // spinning on this subscription every hour. seen stays the same.
        await markSent(sub.id, sub.seenObjectIds)
        zeroMatch++
        continue
      }
      const ok = await sendDigest(sub, matches)
      if (!ok) { failed++; continue }
      const newSeen = Array.from(new Set([...matches.map(m => m.airtableId), ...sub.seenObjectIds]))
      await markSent(sub.id, newSeen)
      sent++
    } catch (err) {
      console.error('[alerts] sub', sub.id, 'failed:', err)
      failed++
    }
  }

  return NextResponse.json({ ok: true, total: subs.length, sent, zeroMatch, failed })
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function formatLine(m: MatchedObject): string {
  const bits: string[] = []
  if (m.district) bits.push(escape(m.district))
  if (m.bedrooms != null) bits.push(`${m.bedrooms} BR`)
  if (m.priceUsd != null) bits.push(`$${m.priceUsd.toLocaleString('en-US')}`)
  if (m.pricePerSqm != null) bits.push(`$${m.pricePerSqm.toLocaleString('en-US')}/м²`)
  return `🏡 <b><a href="${escape(m.url)}">${escape(m.title)}</a></b>\n   ${bits.join(' · ')}`
}

async function sendDigest(sub: Subscription, matches: MatchedObject[]): Promise<boolean> {
  if (sub.chatId == null) return false
  const summary = describeFilter(sub.filter)
  const lines = matches.map(formatLine).join('\n\n')
  const text =
    `<b>🆕 Новое под ваш поиск</b>\n` +
    `<i>${escape(summary)}</i>\n\n` +
    lines +
    `\n\n/мои — управлять подписками · /стоп — отключить`

  try {
    const r = await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: sub.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      // Telegram codes for "user blocked" / "chat not found" → kill the
      // subscription so we don't keep retrying every day.
      const desc = (j.description ?? '') as string
      if (r.status === 403 || /chat not found|bot was blocked|user is deactivated/i.test(desc)) {
        console.warn('[alerts] sub', sub.id, 'chat unreachable, deactivating:', desc)
        await deleteSubscription(sub.id, sub.chatId)
        return false
      }
      console.error('[alerts] telegram err for sub', sub.id, ':', r.status, desc)
      return false
    }
    return true
  } catch (err) {
    console.error('[alerts] sendDigest network error for sub', sub.id, ':', err)
    return false
  }
}
