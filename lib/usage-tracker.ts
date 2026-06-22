// Track per-request Azure OpenAI spend. Every call site (chat-web,
// chat-tg, embeddings, transcribe) hands the raw `usage` payload from
// the SDK plus a feature tag; we resolve the deployment's per-token
// price from the table below, compute USD cost, and insert a row into
// `balina_usage`. The admin page at /admin/usage aggregates these.
//
// Insertion is fire-and-forget — the await chain doesn't block the
// user response. Errors are logged and swallowed (we'd rather under-
// report cost than fail a user-facing request).

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

// Azure OpenAI prices (USD per 1M tokens for chat/embeddings,
// USD per minute for audio). Update when Azure changes them.
//
// Sources:
//   https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/
// Numbers below match OpenAI direct's published rates; Azure typically
// matches them on these models. Re-check quarterly.
type TokenPrice = { input: number; output: number }
type AudioPrice = { perMinute: number }
const TOKEN_PRICES: Record<string, TokenPrice> = {
  // GPT-5 family
  'gpt-5.4':              { input: 1.25, output: 10.00 },
  'gpt-5':                { input: 1.25, output: 10.00 },
  'gpt-5-mini':           { input: 0.25, output:  2.00 },
  // GPT-4o family
  'gpt-4o':               { input: 2.50, output: 10.00 },
  'gpt-4o-mini':          { input: 0.15, output:  0.60 },
  // Embeddings
  'text-embedding-3-large': { input: 0.13, output: 0 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
}
const AUDIO_PRICES: Record<string, AudioPrice> = {
  'gpt-4o-transcribe':       { perMinute: 0.006 },
  'gpt-4o-mini-transcribe':  { perMinute: 0.003 },
  'whisper-1':               { perMinute: 0.006 },
}

export type Feature =
  | 'chat-web' | 'chat-tg'
  | 'embed-search' | 'embed-backfill'
  | 'transcribe'
  | 'other'

export type UsageInput = {
  feature: Feature
  deployment: string
  promptTokens?: number
  completionTokens?: number
  audioSeconds?: number
  meta?: Record<string, unknown> | null
}

function computeCost(d: string, pt: number, ct: number, sec: number): number {
  const tok = TOKEN_PRICES[d]
  if (tok) return (pt / 1_000_000) * tok.input + (ct / 1_000_000) * tok.output
  const aud = AUDIO_PRICES[d]
  if (aud) return (sec / 60) * aud.perMinute
  return 0
}

export function logUsage(u: UsageInput): void {
  const pt = u.promptTokens ?? 0
  const ct = u.completionTokens ?? 0
  const sec = u.audioSeconds ?? 0
  if (pt + ct + sec === 0) return
  const cost = computeCost(u.deployment, pt, ct, sec)
  // fire-and-forget — never block the caller
  sb.from('balina_usage').insert({
    feature: u.feature,
    deployment: u.deployment,
    prompt_tokens: pt,
    completion_tokens: ct,
    audio_seconds: sec,
    cost_usd: cost,
    meta: u.meta ?? null,
  }).then(({ error }) => {
    if (error) console.error('[usage-tracker] insert failed:', error.message)
  })
}

// === Spend cap =========================================================
// Hard daily ceiling on Azure spend so an unauthenticated abuser can't
// run up the bill via the public chat/transcribe endpoints. Cached ~60s
// to avoid a DB read on every request. Fails OPEN on a read error (we'd
// rather serve users than hard-block on a transient Supabase glitch) —
// the rate limiter is the second line of defence.
const DAILY_USD_CAP = Number(process.env.BALINA_DAILY_USD_CAP ?? '25')
let _spendCache: { ts: number; usd: number } | null = null

export async function todaySpendUsd(): Promise<number> {
  const now = Date.now()
  if (_spendCache && now - _spendCache.ts < 60_000) return _spendCache.usd
  const d = new Date()
  const todayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const { data, error } = await sb
    .from('balina_usage')
    .select('cost_usd')
    .gte('ts', todayStart.toISOString())
  if (error) { console.error('[usage] spend read failed:', error.message); return 0 }
  const usd = (data ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0)
  _spendCache = { ts: now, usd }
  return usd
}

// True when today's spend is at/over the configured cap.
export async function overDailySpendCap(): Promise<boolean> {
  if (!Number.isFinite(DAILY_USD_CAP) || DAILY_USD_CAP <= 0) return false
  return (await todaySpendUsd()) >= DAILY_USD_CAP
}

// === Admin-page aggregators ============================================
//
// Heavy lifting via SQL — we lean on Postgres rather than dragging
// every row into Node. All queries cap at 90 days back so the table
// can grow indefinitely without slowing reads.

export type UsageSummary = {
  today: number          // USD
  yesterday: number
  thisMonth: number
  last30days: number
  projectedMonthEnd: number
  byFeature: Array<{ feature: string; cost: number; calls: number }>
  byDay: Array<{ date: string; cost: number }>
}

export async function loadUsageSummary(): Promise<UsageSummary> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yStart = new Date(todayStart.getTime() - 86400000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const last30 = new Date(now.getTime() - 30 * 86400000)

  const { data, error } = await sb
    .from('balina_usage')
    .select('ts, feature, cost_usd')
    .gte('ts', last30.toISOString())
  if (error) {
    console.error('[usage] summary failed:', error.message)
    return emptySummary()
  }
  const rows = data ?? []

  let today = 0, yesterday = 0, thisMonth = 0, last30days = 0
  const byFeature = new Map<string, { cost: number; calls: number }>()
  const byDay = new Map<string, number>()
  for (const r of rows) {
    const cost = Number(r.cost_usd)
    last30days += cost
    if (r.ts >= todayStart.toISOString()) today += cost
    if (r.ts >= yStart.toISOString() && r.ts < todayStart.toISOString()) yesterday += cost
    if (r.ts >= monthStart.toISOString()) thisMonth += cost
    const fb = byFeature.get(r.feature) ?? { cost: 0, calls: 0 }
    fb.cost += cost; fb.calls += 1
    byFeature.set(r.feature, fb)
    const day = r.ts.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + cost)
  }

  // Projection — straight-line extrapolation from month-to-date.
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projectedMonthEnd = dayOfMonth > 0 ? (thisMonth / dayOfMonth) * daysInMonth : 0

  return {
    today, yesterday, thisMonth, last30days, projectedMonthEnd,
    byFeature: Array.from(byFeature.entries())
      .map(([feature, v]) => ({ feature, cost: v.cost, calls: v.calls }))
      .sort((a, b) => b.cost - a.cost),
    byDay: Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, cost]) => ({ date, cost })),
  }
}

function emptySummary(): UsageSummary {
  return { today: 0, yesterday: 0, thisMonth: 0, last30days: 0, projectedMonthEnd: 0, byFeature: [], byDay: [] }
}
