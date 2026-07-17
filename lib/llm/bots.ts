// Access gate for the LLM text layer (Level 2 protection).
//
// The clean `.md` / `.json` views are served only to verified AI crawlers, so
// competitors can't trivially dump the catalog. Verification is by reverse-DNS
// forward-confirm (the Googlebot method): the UA must name a known bot AND the
// client IP's PTR record must resolve back to that vendor's domain. UA strings
// alone are trivially spoofed, so they are necessary but not sufficient.
//
// A static preview token (`?preview=` or `x-llm-preview` header) lets the owner
// and automated checks read the endpoint without pretending to be a bot.
import { promises as dns } from 'node:dns'

// Long, non-secret constant — this only unlocks a public text view, it guards
// no data that isn't already reachable by a verified crawler. Rotate freely.
export const PREVIEW_TOKEN = 'balinsky-llm-preview-9f3c1a7e42'

type BotRule = { ua: RegExp; domains: string[] }

const BOTS: BotRule[] = [
  { ua: /GPTBot|OAI-SearchBot|ChatGPT-User/i, domains: ['openai.com'] },
  { ua: /ClaudeBot|Claude-SearchBot|anthropic-ai/i, domains: ['anthropic.com', 'claude.ai'] },
  { ua: /PerplexityBot|Perplexity-User/i, domains: ['perplexity.ai'] },
  { ua: /Googlebot|Google-Extended|GoogleOther/i, domains: ['googlebot.com', 'google.com'] },
  { ua: /bingbot|BingPreview/i, domains: ['search.msn.com'] },
  { ua: /Applebot/i, domains: ['applebot.apple.com', 'apple.com'] },
  { ua: /YandexBot|YandexAdditional/i, domains: ['yandex.com', 'yandex.ru', 'yandex.net'] },
  { ua: /Amazonbot/i, domains: ['crawl.amazon.com', 'amazon.com'] },
  { ua: /DuckDuckBot|DuckAssistBot/i, domains: ['duckduckgo.com'] },
  { ua: /GrokBot|xAI/i, domains: ['x.ai'] },
  { ua: /meta-externalagent|FacebookBot/i, domains: ['facebook.com'] },
]

export type GateResult = { allowed: boolean; bot: string | null; reason: string }

// Cache verified/failed IPs so we don't re-run DNS on every request from the
// same crawler. Serverless instances are short-lived, so a plain Map is fine.
const cache = new Map<string, GateResult>()
const CACHE_MAX = 2000

function clientIp(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return headers.get('x-real-ip')
}

async function forwardConfirm(ip: string, domains: string[]): Promise<boolean> {
  let hostnames: string[]
  try {
    hostnames = await dns.reverse(ip)
  } catch {
    return false
  }
  const match = hostnames.find(h => domains.some(d => h === d || h.endsWith('.' + d)))
  if (!match) return false
  try {
    const forward = ip.includes(':') ? await dns.resolve6(match) : await dns.resolve4(match)
    return forward.includes(ip)
  } catch {
    return false
  }
}

export async function gate(req: Request): Promise<GateResult> {
  const url = new URL(req.url)
  const token = url.searchParams.get('preview') || req.headers.get('x-llm-preview')
  if (token && token === PREVIEW_TOKEN) return { allowed: true, bot: 'preview', reason: 'preview-token' }

  const ua = req.headers.get('user-agent') || ''
  const rule = BOTS.find(b => b.ua.test(ua))
  if (!rule) return { allowed: false, bot: null, reason: 'not-an-ai-crawler' }

  const ip = clientIp(req.headers)
  if (!ip) return { allowed: false, bot: null, reason: 'no-client-ip' }

  const key = ip + '|' + rule.domains[0]
  const cached = cache.get(key)
  if (cached) return cached

  const ok = await forwardConfirm(ip, rule.domains)
  const botName = rule.ua.source.split('|')[0]
  const result: GateResult = ok
    ? { allowed: true, bot: botName, reason: 'verified-reverse-dns' }
    : { allowed: false, bot: botName, reason: 'reverse-dns-unverified' }

  if (cache.size >= CACHE_MAX) cache.clear()
  cache.set(key, result)
  return result
}
