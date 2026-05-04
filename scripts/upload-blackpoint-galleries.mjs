// Backfills photo galleries + bot-routed seller contact for the
// `bptest_*` BlackPoint test villas already in raw_villas.
//
// Per villa:
//   - parses the Attachments column (newline-separated framerusercontent
//     URLs) from the source CSV,
//   - downloads up to MAX_PHOTOS images and uploads them to
//     villa-photos/<airtable_id>/<i>.jpg (overwriting cover at index 0),
//   - rewrites the manifest entry,
//   - moves the raw seller URL to data['Контакт продавца изначальный']
//     and replaces data['Контакт продавца'] with a bot deep-link
//     (https://t.me/BalinskyBot?start=seller_<id>) so the chat lands in
//     our bot before the user reaches the seller.
//
// Idempotent: re-runs upsert images and overwrite manifest entries.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const CSV = process.argv[2] || '/Users/andrei/Desktop/blackpoint_for_airtable.csv'
const ID_PREFIX = 'bptest_'
const MAX_PHOTOS = 12 // detail page slices to 12 anyway
const BOT_USERNAME = 'BalinskyBot'

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let inQuote = false
  text = text.replace(/^﻿/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; continue }
      if (c === '"') { inQuote = false; continue }
      cell += c; continue
    }
    if (c === '"') { inQuote = true; continue }
    if (c === ',') { row.push(cell); cell = ''; continue }
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue }
    if (c === '\r') continue
    cell += c
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  return rows
}

const text = fs.readFileSync(CSV, 'utf8')
const rows = parseCsv(text)
const header = rows[0]
const NAME_I = 0
const ATT_I  = header.indexOf('Attachments')
if (ATT_I < 0) throw new Error('Attachments column not found in CSV')

const csvByName = new Map()
for (const r of rows.slice(1)) {
  if (r[NAME_I]) csvByName.set(r[NAME_I].trim(), r)
}
console.log(`csv: ${csvByName.size} rows`)

async function loadManifest() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
  try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? await r.json() : {} }
  catch { return {} }
}
async function saveManifest(manifest) {
  const buf = Buffer.from(JSON.stringify(manifest), 'utf8')
  const { error } = await sb.storage.from('villa-photos').upload('_manifest.json', buf, {
    contentType: 'application/json', upsert: true, cacheControl: '60',
  })
  if (error) throw new Error('manifest upload failed: ' + error.message)
}

async function uploadOne(airtableId, i, srcUrl) {
  const resp = await fetch(srcUrl)
  if (!resp.ok) { console.warn(`  ${airtableId}/${i} fetch ${resp.status} — skip`); return null }
  const buf = Buffer.from(await resp.arrayBuffer())
  const key = `${airtableId}/${i}.jpg`
  const { error } = await sb.storage.from('villa-photos').upload(key, buf, {
    contentType: 'image/jpeg', upsert: true, cacheControl: '604800',
  })
  if (error) { console.warn(`  ${airtableId}/${i} upload ${error.message}`); return null }
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/villa-photos/${key}`
}

const { data: rowsDb, error: listErr } = await sb
  .from('raw_villas').select('airtable_id, data').like('airtable_id', `${ID_PREFIX}%`)
if (listErr) throw new Error(listErr.message)
console.log(`db: ${rowsDb.length} bptest_ rows`)

const manifest = await loadManifest()
let photosTotal = 0, withGallery = 0, sellerRewritten = 0

for (let n = 0; n < rowsDb.length; n++) {
  const row = rowsDb[n]
  const sourceId = row.airtable_id.slice(ID_PREFIX.length)
  const csvRow = csvByName.get(sourceId)
  if (!csvRow) { console.warn(`  ${row.airtable_id}: no CSV row`); continue }

  const urls = String(csvRow[ATT_I] ?? '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => /^https?:\/\//.test(s))
    .slice(0, MAX_PHOTOS)

  const uploaded = []
  for (let i = 0; i < urls.length; i++) {
    const u = await uploadOne(row.airtable_id, i, urls[i])
    if (u) { uploaded.push(u); photosTotal++ }
  }
  if (uploaded.length > 0) {
    manifest[row.airtable_id] = uploaded
    withGallery++
  }

  // Move original seller URL aside, swap in bot-routed link.
  const data = { ...(row.data ?? {}) }
  const current = data['Контакт продавца']
  if (typeof current === 'string' && /^https?:\/\/(t\.me|wa\.me)\//.test(current)
      && !current.includes(`t.me/${BOT_USERNAME}`)) {
    data['Контакт продавца изначальный'] = current
  }
  const botLink = `https://t.me/${BOT_USERNAME}?start=seller_${row.airtable_id}`
  if (data['Контакт продавца'] !== botLink) {
    data['Контакт продавца'] = botLink
    const { error: updErr } = await sb.from('raw_villas').update({ data }).eq('airtable_id', row.airtable_id)
    if (updErr) console.warn(`  ${row.airtable_id} update: ${updErr.message}`)
    else sellerRewritten++
  }

  if ((n + 1) % 10 === 0) console.log(`  ${n + 1}/${rowsDb.length} — photos so far ${photosTotal}`)
}

await saveManifest(manifest)
console.log(`done: ${photosTotal} photos uploaded across ${withGallery}/${rowsDb.length} villas; ` +
  `${sellerRewritten} seller URLs rewritten to bot deep-link.`)
