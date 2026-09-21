// Разовый перенос базы агентов из выгрузки Notion в таблицу `agents`.
//
//   node scripts/import-agents-notion.mjs "<путь к .csv>" [--dry]
//
// Повторный запуск не плодит дубли: карточка ищется по нику в Telegram,
// иначе по паре «имя + агентство». Совпала — поля дополняются (пустое в
// базе заполняем из Notion, заполненное не трогаем, чтобы не затереть
// правку, сделанную уже в админке).
//
// Поля, которые стали колонками, разложены по колонкам; вся остальная
// анкета уезжает в jsonb `data` под своими названиями из Notion.

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const file = process.argv[2]
const dry = process.argv.includes('--dry')
if (!file) { console.error('Укажите путь к CSV-выгрузке Notion'); process.exit(1) }

// --- разбор CSV --------------------------------------------------------
// Свой парсер, а не зависимость: в выгрузке есть кавычки и переводы
// строк внутри ячеек («Любимый подарок» — список через запятую).
function parseCsv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (c !== '\r') cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}

const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '')
const [header, ...lines] = parseCsv(raw)
const cols = header.map(h => h.trim())
const records = lines
  .filter(r => r.some(v => v.trim()))
  .map(r => Object.fromEntries(cols.map((c, i) => [c, (r[i] ?? '').trim()])))

// --- преобразования значений ------------------------------------------
const NOTHING = new Set(['', 'null', 'undefined', 'No'])
const val = v => (NOTHING.has(v) ? null : v)

function telegram(v) {
  if (!v) return null
  const m = v.match(/(?:t\.me\/|@)?([A-Za-z0-9_]{3,})/)
  return m ? m[1].toLowerCase() : null
}

// «$785,580.00» → 785580
function money(v) {
  if (!v) return null
  const n = Number(v.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function int(v) {
  const n = Number((v ?? '').replace(/[^0-9]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Notion пишет даты как «May 14, 2025».
const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}
function date(v) {
  if (!v) return null
  const m = v.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/)
  if (!m) return null
  const mo = MONTHS[m[1].toLowerCase()]
  if (!mo) return null
  return `${m[3]}-${String(mo).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`
}

const STATUS = {
  'Связаться': 'contact',
  'Назначить встречу': 'to_schedule',
  'Назначена встреча': 'scheduled',
  'Проведена встреча': 'met',
}

// Колонки таблицы ← поля Notion. Всё, чего нет в этом списке и в
// SKIP, попадает в jsonb `data` как есть.
const SKIP = new Set(['Агенты', 'Статус', 'Агентство', 'Менеджер', 'Должность', 'Локация',
  'Telegram', 'WhatsApp', 'Номер телефона', 'Email', 'Сделок, шт', 'Объём сделок, $',
  'Последний контакт', 'Следующий контакт', 'Следующий шаг',
  'Checkbox', 'Сделки', 'Last edited by', 'Обновление', 'Шахматка Ubud Dream', '😎 Агентства'])

function toAgent(r) {
  const name = val(r['Агенты'])
  if (!name) return null
  const data = {}
  for (const [k, v] of Object.entries(r)) {
    if (SKIP.has(k)) continue
    const clean = val(v)
    // Ведущий таб в заголовке «\tГде вам удобнее всего общаться?» — артефакт выгрузки.
    if (clean) data[k.replace(/^\t+/, '')] = clean
  }
  return {
    name,
    agency: val(r['Агентство']),
    status: STATUS[r['Статус']] ?? 'new',
    manager: val(r['Менеджер']),
    position: val(r['Должность']),
    location: val(r['Локация']),
    telegram: telegram(val(r['Telegram'])),
    whatsapp: val(r['WhatsApp']),
    phone: val(r['Номер телефона']),
    email: val(r['Email']),
    deals_count: int(r['Сделок, шт']),
    deals_volume_usd: money(r['Объём сделок, $']),
    last_contact: date(r['Последний контакт']),
    next_contact: date(r['Следующий контакт']),
    next_step: val(r['Следующий шаг']),
    data,
    source: 'notion',
  }
}

const incoming = records.map(toAgent).filter(Boolean)
console.log(`В выгрузке: ${records.length} строк → ${incoming.length} карточек с именем`)

// --- привязка к перепискам бота ---------------------------------------
// По нику в Telegram чат находится сразу; остальные владелец свяжет
// руками в карточке (в выгрузке ник заполнен у меньшинства).
const { data: chats, error: chatErr } = await sb.rpc('tg_chat_list')
if (chatErr) console.warn('Чаты бота недоступны, привязку пропускаю:', chatErr.message)
const chatByNick = new Map()
for (const c of chats ?? []) {
  const m = (c.contact ?? '').match(/@([A-Za-z0-9_]+)/)
  if (m) chatByNick.set(m[1].toLowerCase(), c.chat_id)
}

// --- существующие карточки --------------------------------------------
const { data: existing, error: exErr } = await sb.from('agents').select('*')
if (exErr) { console.error('Не читается таблица agents:', exErr.message); process.exit(1) }
const byNick = new Map()
const byName = new Map()
for (const a of existing ?? []) {
  if (a.telegram) byNick.set(a.telegram, a)
  byName.set(`${a.name.toLowerCase()}|${(a.agency ?? '').toLowerCase()}`, a)
}
const usedChats = new Set((existing ?? []).map(a => a.tg_chat_id).filter(v => v != null))

let created = 0, updated = 0, linked = 0, skipped = 0
for (const a of incoming) {
  const found = (a.telegram && byNick.get(a.telegram))
    || byName.get(`${a.name.toLowerCase()}|${(a.agency ?? '').toLowerCase()}`)

  const chatId = a.telegram ? chatByNick.get(a.telegram) : undefined

  if (found) {
    // Дополняем только пустое — правки, сделанные уже в админке, важнее выгрузки.
    const patch = {}
    for (const [k, v] of Object.entries(a)) {
      if (k === 'data' || k === 'source' || k === 'status') continue
      if (v != null && (found[k] == null || found[k] === '')) patch[k] = v
    }
    const mergedData = { ...a.data, ...(found.data ?? {}) }
    if (JSON.stringify(mergedData) !== JSON.stringify(found.data ?? {})) patch.data = mergedData
    if (found.tg_chat_id == null && chatId != null && !usedChats.has(chatId)) {
      patch.tg_chat_id = chatId; usedChats.add(chatId); linked++
    }
    if (!Object.keys(patch).length) { skipped++; continue }
    if (!dry) {
      const { error } = await sb.from('agents').update(patch).eq('id', found.id)
      if (error) { console.error('update', a.name, error.message); continue }
    }
    updated++
  } else {
    const row = { ...a }
    if (chatId != null && !usedChats.has(chatId)) { row.tg_chat_id = chatId; usedChats.add(chatId); linked++ }
    if (!dry) {
      const { error } = await sb.from('agents').insert(row)
      if (error) { console.error('insert', a.name, error.message); continue }
    }
    created++
  }
}

console.log(`${dry ? '[проверка] ' : ''}создано ${created}, дополнено ${updated}, без изменений ${skipped}, привязано переписок ${linked}`)
