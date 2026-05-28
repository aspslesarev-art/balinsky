// Push notifications to agents subscribed to a developer. Used from the
// sync-* scripts after they upsert fresh Airtable rows. We deduplicate via
// public.agent_notification_log so re-running a sync doesn't re-broadcast.
//
// Telegram caps outbound messages at 30/sec. We're nowhere near that, so the
// implementation is a straight per-subscriber loop with 50ms inter-message
// pause — safe and trivially debuggable.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export type AgentNotifySource = 'news' | 'promo' | 'events' | 'villas' | 'apartments' | 'complexes' | 'price_change'

export type AgentNotifyItem = {
  // The unique key that goes into agent_notification_log alongside `source`.
  // Use airtable_id for raw_* sources.
  sourceId: string
  // Airtable id of the developer this item is attributed to. Multiple
  // developers per item are supported — pass them all.
  developerIds: string[]
  // Free-form lines that get formatted into the Telegram message body.
  // First line is bolded as the headline; rest is plain.
  title: string
  body?: string | null
  // Optional path on balinsky.info to deep-link the agent into the item.
  path?: string | null
}

async function alreadyNotified(source: AgentNotifySource, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const { data, error } = await sb
    .from('agent_notification_log')
    .select('source_id')
    .eq('source_table', source)
    .in('source_id', ids)
  if (error) {
    console.warn('[agent-notify] log lookup failed:', error.message)
    // Fail-safe: pretend everything was notified to avoid spamming users on
    // a transient DB hiccup. Operator can manually clear and re-run.
    return new Set(ids)
  }
  return new Set((data ?? []).map(r => r.source_id))
}

async function markNotified(source: AgentNotifySource, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const rows = ids.map(source_id => ({ source_table: source, source_id }))
  const { error } = await sb.from('agent_notification_log').upsert(rows, { onConflict: 'source_table,source_id' })
  if (error) console.warn('[agent-notify] log write failed:', error.message)
}

async function subscribersFor(developerIds: string[]): Promise<number[]> {
  if (developerIds.length === 0) return []
  const { data, error } = await sb
    .from('agent_developer_subscriptions')
    .select('telegram_user_id')
    .in('developer_airtable_id', developerIds)
  if (error) {
    console.warn('[agent-notify] subscribers lookup failed:', error.message)
    return []
  }
  return [...new Set((data ?? []).map(r => Number(r.telegram_user_id)))]
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildMessage(item: AgentNotifyItem, source: AgentNotifySource): string {
  const TYPE_LABEL: Record<AgentNotifySource, string> = {
    news: '📰 Новость',
    promo: '🎁 Акция',
    events: '📅 Мероприятие',
    villas: '🏝 Новая вилла',
    apartments: '🏢 Новый апартамент',
    complexes: '🏗 Новый ЖК',
    price_change: '💰 Изменение цены',
  }
  const lines = [`<b>${TYPE_LABEL[source]}</b>`, `<b>${escapeHtml(item.title)}</b>`]
  if (item.body) lines.push(escapeHtml(item.body))
  if (item.path) lines.push(`${SITE_URL}${item.path}`)
  return lines.join('\n')
}

async function sendOne(chatId: number, text: string): Promise<void> {
  if (!TOKEN) {
    console.warn('[agent-notify] TELEGRAM_BOT_TOKEN missing — skipping send')
    return
  }
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    console.warn(`[agent-notify] sendMessage ${chatId} -> ${r.status}: ${body.slice(0, 200)}`)
  }
}

export async function notifyAgents(source: AgentNotifySource, items: AgentNotifyItem[]): Promise<{ notified: number; recipients: number }> {
  if (items.length === 0) return { notified: 0, recipients: 0 }
  const seen = await alreadyNotified(source, items.map(i => i.sourceId))
  const fresh = items.filter(i => !seen.has(i.sourceId) && i.developerIds.length > 0)
  if (fresh.length === 0) return { notified: 0, recipients: 0 }

  let recipients = 0
  const newlyNotified: string[] = []
  for (const item of fresh) {
    const subs = await subscribersFor(item.developerIds)
    if (subs.length === 0) {
      // Still mark as notified — there's nobody subscribed today, but if a
      // user subscribes tomorrow we don't want to retroactively flood them
      // with everything that landed during this catalog's lifetime.
      newlyNotified.push(item.sourceId)
      continue
    }
    const text = buildMessage(item, source)
    for (const chatId of subs) {
      await sendOne(chatId, text)
      recipients++
      await new Promise(res => setTimeout(res, 50))
    }
    newlyNotified.push(item.sourceId)
  }
  await markNotified(source, newlyNotified)
  console.log(`[agent-notify] ${source}: ${newlyNotified.length} items, ${recipients} messages sent`)
  return { notified: newlyNotified.length, recipients }
}
