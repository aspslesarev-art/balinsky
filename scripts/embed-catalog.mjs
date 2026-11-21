#!/usr/bin/env node
// Backfill embeddings on raw_villas, raw_apartments, raw_complexes.
// Run from project root: `node scripts/embed-catalog.mjs`.
//
// Idempotent: skips rows whose embedding_text already matches the
// freshly-built text. Pass --force to re-embed everything (e.g. after
// changing the buildUnitEmbedText function).
//
// Cost ballpark: ~1.5k villas + ~5k apartments + ~200 complexes =
// ~7k rows × ~2-3k chars each ≈ 15M tokens × $0.13/M = ~$2.
//
// PAID (OpenAI): rows are collected first (free), then without --yes-paid
// the script prints the count and stops before any embedding request.
// Model is pinned in _openai.mjs: text-embedding-3-large @1536 — the same
// vector space as the existing index.

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { embed, EMBEDDINGS_MODEL, EMBEDDING_DIMS, requirePaid } from './_openai.mjs'

// Manual .env.local loader so the script runs without extra setup.
try {
  const txt = fs.readFileSync('.env.local', 'utf8')
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch {}

const force = process.argv.includes('--force')
const onlyArg = process.argv.find(a => a.startsWith('--only='))
const only = onlyArg ? onlyArg.slice('--only='.length).split(',') : ['villa', 'apartment', 'complex']

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function fs1(v) {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return fs1(v[0])
  if (v && typeof v === 'object' && 'value' in v) return fs1(v.value)
  return null
}
function num1(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') { const n = Number(v.replace(/[^\d.\-]/g, '')); return Number.isFinite(n) ? n : null }
  if (Array.isArray(v) && v.length) return num1(v[0])
  return null
}
function buildUnitText(row, kind) {
  const d = row.data
  const parts = []
  parts.push(kind === 'villa' ? 'Вилла' : 'Апартамент')
  const project = fs1(d['Комплекс 1']) ?? fs1(d['Project']); if (project) parts.push(`в проекте ${project}`)
  const district = fs1(d['Location 2']) ?? fs1(d['Location']); if (district) parts.push(`район ${district}`)
  const br = num1(d['Комнаты']) ?? num1(d['Спальни']); if (br != null) parts.push(`${br} спальни`)
  const area = num1(d['Площадь']); if (area != null) parts.push(`${area} м²`)
  const land = num1(d['Земля']); if (land != null) parts.push(`земля ${land} м²`)
  const view = fs1(d['Вид']) ?? fs1(d['View']); if (view) parts.push(`вид: ${view}`)
  const status = fs1(d['Статус']); if (status) parts.push(status)
  const lease = num1(d['Leasehold']) ?? num1(d['Leashold']); if (lease) parts.push(`leasehold ${lease}л`)
  const priceUsd = kind === 'villa' ? (num1(d['price']) ?? num1(d['Цена'])) : (num1(d['price_usd']) ?? num1(d['Цена']))
  if (priceUsd) parts.push(`$${priceUsd.toLocaleString('en-US')}`)
  const body = fs1(d['SEO Text']) ?? fs1(d['Notes']) ?? fs1(d['ИИ описание'])
  if (body) parts.push(body.slice(0, 2000))
  return parts.join(' · ')
}
function buildComplexText(row) {
  const d = row.data
  const parts = []
  parts.push('Жилой комплекс')
  const project = fs1(d['Project']); if (project) parts.push(project)
  const district = fs1(d['Location 2']) ?? fs1(d['Location']); if (district) parts.push(`район ${district}`)
  const status = fs1(d['Статус']); if (status) parts.push(status)
  const year = fs1(d['Year of completion ']) ?? fs1(d['Year of completion']); if (year) parts.push(`сдача ${year}`)
  const total = num1(d['Total quantity of units']); if (total) parts.push(`${total} юнитов`)
  const types = Array.isArray(d['Типы юнитов']) ? d['Типы юнитов'].map(String).join(', ') : fs1(d['Типы юнитов'])
  if (types) parts.push(`типы: ${types}`)
  const aggregator = fs1(d['Aggregator:RU']) ?? fs1(d['ИИ описание']) ?? fs1(d['Описание комплекса'])
  if (aggregator) parts.push(aggregator.slice(0, 2000))
  return parts.join(' · ')
}

// HNSW caps at 2000 dims; text-embedding-3-large natively outputs 3072
// but is Matryoshka-trained so we can request 1536 with negligible
// quality loss. Must match vector(1536) in migration 023 — EMBEDDING_DIMS
// comes from _openai.mjs, which pins it.

async function embedBatch(texts) {
  const r = await embed(texts.map(t => t.slice(0, 8000) || ' '))
  return r.data.map(d => d.embedding)
}

// Pass 1 (free): read the table, build text per row, keep what changed.
async function collectTable(table, buildText, label, kind) {
  let processed = 0, skipped = 0
  const queue = []
  const PAGE = 200
  for (let from = 0; from < 10000; from += PAGE) {
    const { data, error } = await sb.from(table)
      .select('airtable_id, data, embedding_text')
      .range(from, from + PAGE - 1)
    if (error) { console.error(error); break }
    if (!data || data.length === 0) break
    for (const row of data) {
      processed++
      const text = kind === 'complex' ? buildText(row) : buildText(row, kind)
      if (!force && row.embedding_text === text) { skipped++; continue }
      queue.push({ id: row.airtable_id, text })
    }
    if (data.length < PAGE) break
  }
  console.log(`  ${label}: ${queue.length} to embed, ${skipped} unchanged, ${processed} total`)
  return { table, label, queue, processed, skipped }
}

// Pass 2 (paid): embed in groups of 16 and write back.
async function embedTable({ table, label, queue, processed, skipped }) {
  console.log(`\n=== ${label} ===`)
  let embedded = 0
  const BATCH = 16
  for (let i = 0; i < queue.length; i += BATCH) {
    const batch = queue.slice(i, i + BATCH)
    const vectors = await embedBatch(batch.map(b => b.text))
    // Update rows one by one (Supabase upsert is heavy for vector).
    for (let j = 0; j < batch.length; j++) {
      const literal = '[' + vectors[j].join(',') + ']'
      const { error: upErr } = await sb.from(table).update({
        embedding: literal,
        embedding_text: batch[j].text,
        embedded_at: new Date().toISOString(),
      }).eq('airtable_id', batch[j].id)
      if (upErr) { console.error('  upd err', batch[j].id, upErr.message); continue }
      embedded++
    }
    process.stdout.write(`\r  ${embedded}/${queue.length} embedded (${skipped} unchanged)`)
  }
  console.log()
  console.log(`  done: ${embedded} embedded, ${skipped} unchanged, ${processed} total`)
}

console.log('Catalog embedding backfill — OpenAI', EMBEDDINGS_MODEL, `@${EMBEDDING_DIMS}`)
if (force) console.log('--force: re-embedding every row regardless of cache')
const start = Date.now()

const tables = []
if (only.includes('villa'))     tables.push(await collectTable('raw_villas',     buildUnitText,    'villas (raw_villas)',         'villa'))
if (only.includes('apartment')) tables.push(await collectTable('raw_apartments', buildUnitText,    'apartments (raw_apartments)', 'apartment'))
if (only.includes('complex'))   tables.push(await collectTable('raw_complexes',  buildComplexText, 'complexes (raw_complexes)',   'complex'))
requirePaid({ what: `эмбеддинги каталога ${EMBEDDINGS_MODEL}@${EMBEDDING_DIMS}`, items: tables.reduce((a, t) => a + t.queue.length, 0) })
for (const t of tables) await embedTable(t)

console.log(`\ndone in ${Math.round((Date.now() - start) / 1000)}s`)
