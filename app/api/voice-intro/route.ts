// Озвучка объекта прямо на его странице: кнопка Play рядом с названием.
//
// Два уровня кэша, потому что оба шага стоят денег:
//   1) сценарий (Azure) — генерится один раз и ложится в JSONB-поле
//      «Озвучка: текст», дальше его можно править руками в /admin/data;
//   2) аудио (ElevenLabs) — один раз синтезируется и кладётся в Storage,
//      дальше страница отдаёт готовый mp3 без обращения к провайдеру.
// Ключ аудио завязан на хэш текста: поправили сценарий — озвучка
// пересинтезируется сама, старый файл просто перестаёт использоваться.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { VOICE_FIELD, buildVoicePrompt, buildVoiceTranslatePrompt, ttsLanguageCode, type VoiceListing } from '@/lib/voice-intro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'voice'
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_turbo_v2_5'
const MAX_CHARS = 1200
const LANGS = new Set(['ru', 'en', 'id', 'fr', 'de', 'zh', 'nl', 'ban', 'pl', 'uk'])

// Голос по умолчанию — тот же «Андрей», что говорит в чате: узнаваемость
// важнее. Но у русского голоса на других языках слышен акцент, поэтому
// каждый язык можно посадить на свой голос из библиотеки ElevenLabs, не
// трогая код: ELEVENLABS_VOICE_ID_EN, _DE, _FR, _ID, _ZH, _NL, _PL, _UK.
function voiceIdFor(lang: string): string {
  const perLang = process.env[`ELEVENLABS_VOICE_ID_${lang.toUpperCase()}`]
  return perLang || process.env.ELEVENLABS_VOICE_ID || 'S11sP4AlwO2syH23EFcx'
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const firstString = (v: unknown): string | null => {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}

async function ensureBucket() {
  const { data: list } = await sb.storage.listBuckets()
  if (!list?.some(b => b.name === BUCKET)) {
    await sb.storage.createBucket(BUCKET, { public: true }).catch(() => null)
  }
}

const sha = (s: string) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12)

async function askAzure(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const model = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'
  const version = process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview'
  if (!apiKey || !endpoint) return null

  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${model}/chat/completions?api-version=${version}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0.6, max_completion_tokens: 700, messages }),
  })
  if (!res.ok) return null
  const json = await res.json()
  return String(json.choices?.[0]?.message?.content ?? '').trim() || null
}

/** Русский сценарий — источник правды: из поля, иначе генерируем и сохраняем. */
async function loadRuScript(
  row: { airtable_id: string; data: Record<string, unknown> },
  listing: VoiceListing,
): Promise<string | null> {
  const existing = firstString(row.data[VOICE_FIELD])
  if (existing) return existing

  const text = await askAzure(buildVoicePrompt(listing))
  if (!text) return null

  // Кладём обратно в запись — второй раз генерировать не нужно, и текст
  // становится редактируемым в админке.
  await sb.from('raw_complexes')
    .update({ data: { ...row.data, [VOICE_FIELD]: text } })
    .eq('airtable_id', row.airtable_id)
  return text
}

/**
 * Сценарий на языке страницы. Хранится в Storage рядом с аудио и привязан к
 * хэшу русского источника: поправили русский текст в админке — версии на всех
 * языках автоматически считаются устаревшими и переписываются.
 */
async function loadLangScript(
  id: string,
  lang: string,
  ruScript: string,
  names: { project?: string | null; developer?: string | null },
): Promise<string | null> {
  if (lang === 'ru') return ruScript
  const key = `scripts/${id}-${lang}.json`
  const hash = sha(ruScript)

  const cached = await sb.storage.from(BUCKET).download(key)
  if (cached.data) {
    try {
      const parsed = JSON.parse(await cached.data.text()) as { hash?: string; text?: string }
      if (parsed.hash === hash && parsed.text) return parsed.text
    } catch { /* битый кэш — просто перегенерируем */ }
  }

  const text = await askAzure(buildVoiceTranslatePrompt(ruScript, lang, names))
  if (!text) return null
  await sb.storage.from(BUCKET)
    .upload(key, JSON.stringify({ hash, text }), { contentType: 'application/json', upsert: true })
    .catch(() => null)
  return text
}

export async function POST(req: Request) {
  const elevenKey = process.env.ELEVENLABS_API_KEY
  if (!elevenKey) return NextResponse.json({ error: 'tts_unconfigured' }, { status: 503 })
  if (!rateLimit(`voice-intro:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let id: string
  let lang = 'ru'
  try {
    const body = await req.json()
    id = String(body?.id ?? '').trim()
    const raw = String(body?.lang ?? 'ru').trim()
    if (LANGS.has(raw)) lang = raw
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }
  if (!/^rec[A-Za-z0-9]{10,20}$/.test(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 })

  const { data: row } = await sb
    .from('raw_complexes')
    .select('airtable_id, slug, data')
    .eq('airtable_id', id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const d = row.data as Record<string, unknown>
  const listing: VoiceListing = {
    name: firstString(d['Project']) ?? String(row.slug ?? id),
    district: firstString(d['Location 2']) ?? firstString(d['Location']),
    developer: firstString(d['Developer1']),
    unitTypes: firstString(d['Типы юнитов']),
    status: firstString(d['Статус']),
    completionYear: firstString(d['Year of completion ']) ?? firstString(d['Year of completion']),
    leaseYears: firstString(d['Leasehold']),
    permits: firstString(d['Разрешительные документы']),
    claimedYield: firstString(d['Доходность']),
    priceFromUsd: firstString(d['price_usd']) ?? firstString(d['price']),
    description: firstString(d['ИИ Описание']) ?? firstString(d['Описание']) ?? firstString(d['SEO Text']),
  }

  const ruScript = await loadRuScript({ airtable_id: row.airtable_id as string, data: d }, listing)
  if (!ruScript) return NextResponse.json({ error: 'script_failed' }, { status: 502 })
  const script = await loadLangScript(id, lang, ruScript, {
    project: listing.name, developer: listing.developer,
  })
  if (!script) return NextResponse.json({ error: 'script_failed' }, { status: 502 })

  const text = script.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS)
  const key = `complex/${id}-${lang}-${sha(text)}.mp3`

  // Уже синтезировали этот текст — отдаём из Storage, ElevenLabs не трогаем.
  const cached = await sb.storage.from(BUCKET).download(key)
  if (cached.data) {
    return new NextResponse(await cached.data.arrayBuffer(), {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  }

  let upstream: Response
  try {
    upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceIdFor(lang)}`, {
      method: 'POST',
      headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        // Явный язык — turbo v2.5 иначе угадывает по тексту и на коротких
        // фразах путает близкие языки (nl/de, pl/uk).
        language_code: ttsLanguageCode(lang),
        // Чуть выше стабильность, чем в чате: это заранее написанный текст,
        // его лучше читать ровно, без импровизации в интонации.
        voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.2 },
      }),
    })
  } catch {
    return NextResponse.json({ error: 'tts_upstream' }, { status: 502 })
  }
  if (!upstream.ok) return NextResponse.json({ error: 'tts_failed', status: upstream.status }, { status: 502 })

  const audio = await upstream.arrayBuffer()
  await ensureBucket()
  await sb.storage.from(BUCKET).upload(key, audio, {
    contentType: 'audio/mpeg', upsert: true, cacheControl: '31536000',
  }).catch(() => null)

  return new NextResponse(audio, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  })
}
