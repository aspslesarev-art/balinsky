// Azure OpenAI embeddings — `text-embedding-3-large` (3072 dims).
// Used by:
//   - scripts/embed-catalog.mjs to backfill the catalog
//   - lib/semantic-search.ts for the query-time vector lookup

import { AzureOpenAI } from 'openai'

const _client = (() => {
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview'
  if (!apiKey || !endpoint) return null
  return new AzureOpenAI({ apiKey, endpoint, apiVersion })
})()

const DEPLOYMENT = process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT ?? 'text-embedding-3-large'

export const EMBEDDING_DIMS = 3072

export async function embedText(text: string): Promise<number[] | null> {
  if (!_client) return null
  const t = text.trim().slice(0, 8000)
  if (!t) return null
  const r = await _client.embeddings.create({
    model: DEPLOYMENT,
    input: t,
  })
  const vec = r.data[0]?.embedding
  return vec ?? null
}

// Batch helper — Azure accepts an array of strings per call. We chunk
// at 16 to stay well under any token-count limits (~50k tokens per
// batch is the practical ceiling for this model).
export async function embedBatch(texts: string[]): Promise<Array<number[] | null>> {
  if (!_client) return texts.map(() => null)
  const out: Array<number[] | null> = []
  const BATCH = 16
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH).map(t => t.trim().slice(0, 8000) || ' ')
    const r = await _client.embeddings.create({ model: DEPLOYMENT, input: slice })
    for (const e of r.data) out.push(e.embedding ?? null)
  }
  return out
}

// Compact representative text for a unit / complex row. Tailored to
// what an investor actually says when searching — area, district,
// features, price band — rather than dumping raw JSON.
type Row = { data: Record<string, unknown> }

function fs1(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return fs1(v[0])
  if (v && typeof v === 'object' && 'value' in v) return fs1((v as { value: unknown }).value)
  return null
}
function num1(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') { const n = Number(v.replace(/[^\d.\-]/g, '')); return Number.isFinite(n) ? n : null }
  if (Array.isArray(v) && v.length > 0) return num1(v[0])
  return null
}

export function buildUnitEmbedText(row: Row, kind: 'villa' | 'apartment'): string {
  const d = row.data
  const parts: string[] = []
  parts.push(kind === 'villa' ? 'Вилла' : 'Апартамент')
  const project = fs1(d['Комплекс 1']) ?? fs1(d['Project'])
  if (project) parts.push(`в проекте ${project}`)
  const district = fs1(d['Location 2']) ?? fs1(d['Location'])
  if (district) parts.push(`район ${district}`)
  const bedrooms = num1(d['Комнаты']) ?? num1(d['Спальни'])
  if (bedrooms != null) parts.push(`${bedrooms} спальни`)
  const area = num1(d['Площадь'])
  if (area != null) parts.push(`${area} м²`)
  const land = num1(d['Земля'])
  if (land != null) parts.push(`земля ${land} м²`)
  const view = fs1(d['Вид']) ?? fs1(d['View'])
  if (view) parts.push(`вид: ${view}`)
  const status = fs1(d['Статус'])
  if (status) parts.push(status)
  const lease = num1(d['Leasehold']) ?? num1(d['Leashold'])
  if (lease) parts.push(`leasehold ${lease}л`)
  const priceUsd = kind === 'villa'
    ? (num1(d['price']) ?? num1(d['Цена']))
    : (num1(d['price_usd']) ?? num1(d['Цена']))
  if (priceUsd) parts.push(`$${priceUsd.toLocaleString('en-US')}`)
  // Body description gives the semantic signal.
  const body = fs1(d['SEO Text']) ?? fs1(d['Notes']) ?? fs1(d['ИИ описание'])
  if (body) parts.push(body.slice(0, 2000))
  return parts.join(' · ')
}

export function buildComplexEmbedText(row: Row): string {
  const d = row.data
  const parts: string[] = []
  parts.push('Жилой комплекс')
  const project = fs1(d['Project'])
  if (project) parts.push(project)
  const district = fs1(d['Location 2']) ?? fs1(d['Location'])
  if (district) parts.push(`район ${district}`)
  const status = fs1(d['Статус'])
  if (status) parts.push(status)
  const year = fs1(d['Year of completion ']) ?? fs1(d['Year of completion'])
  if (year) parts.push(`сдача ${year}`)
  const total = num1(d['Total quantity of units'])
  if (total) parts.push(`${total} юнитов`)
  const types = Array.isArray(d['Типы юнитов']) ? (d['Типы юнитов'] as unknown[]).map(String).join(', ') : fs1(d['Типы юнитов'])
  if (types) parts.push(`типы: ${types}`)
  const aggregator = fs1(d['Aggregator:RU']) ?? fs1(d['ИИ описание']) ?? fs1(d['Описание комплекса'])
  if (aggregator) parts.push(aggregator.slice(0, 2000))
  return parts.join(' · ')
}
