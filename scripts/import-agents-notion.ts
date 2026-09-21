// Разовый перенос базы агентов из выгрузки Notion в таблицу `agents`.
//
//   npx tsx --env-file=.env.local scripts/import-agents-notion.ts "<путь к .csv>" [--dry]
//
// Повторный запуск не плодит дубли: карточка ищется по нику в Telegram,
// иначе по паре «имя + агентство». Совпала — поля дополняются (пустое в
// базе заполняем из Notion, заполненное не трогаем, чтобы не затереть
// правку, сделанную уже в админке).
//
// Исключение из «заполненное не трогаем» — сломанный ник: если в базе
// лежит не имя пользователя (обломок ссылки, телефон), он заменяется
// разобранным из выгрузки. Первая версия скрипта резала «https://t.me/user»
// до «https», и 21 карточка осталась без переписки.
//
// Поля, которые стали колонками, разложены по колонкам; вся остальная
// анкета уезжает в jsonb `data` под своими названиями из Notion.

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
// Разбор ника — общий с админкой, чтобы «t.me/user» и «@user» сходились
// в одно и то же и здесь, и при ручной правке карточки.
import { normalizeTelegram } from '../lib/agents/types'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const file = process.argv[2]
const dry = process.argv.includes('--dry')
if (!file) { console.error('Укажите путь к CSV-выгрузке Notion'); process.exit(1) }

// --- разбор CSV --------------------------------------------------------
// Свой парсер, а не зависимость: в выгрузке есть кавычки и переводы
// строк внутри ячеек («Любимый подарок» — список через запятую).
type Row = Record<string, string>

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
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
const records: Row[] = lines
  .filter(r => r.some(v => v.trim()))
  .map(r => Object.fromEntries(cols.map((c, i) => [c, (r[i] ?? '').trim()])))

// --- преобразования значений ------------------------------------------
const NOTHING = new Set(['', 'null', 'undefined', 'No'])
const val = (v: string | undefined): string | null => (!v || NOTHING.has(v) ? null : v)

// «$785,580.00» → 785580
function money(v: string | undefined): number | null {
  if (!v) return null
  const n = Number(v.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function int(v: string | undefined): number | null {
  const n = Number((v ?? '').replace(/[^0-9]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Notion пишет даты как «May 14, 2025».
const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}
function date(v: string | undefined): string | null {
  if (!v) return null
  const m = v.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/)
  if (!m) return null
  const mo = MONTHS[m[1].toLowerCase()]
  if (!mo) return null
  return `${m[3]}-${String(mo).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`
}

const STATUS: Record<string, string> = {
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

type Incoming = ReturnType<typeof buildAgent>

function toAgent(r: Row) {
  const name = val(r['Агенты'])
  if (!name) return null
  return buildAgent(r, name)
}

function buildAgent(r: Row, name: string) {
  const data: Record<string, string> = {}
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
    telegram: normalizeTelegram(val(r['Telegram'])),
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

const incoming = records.map(toAgent).filter((a): a is Incoming => a != null)
console.log(`В выгрузке: ${records.length} строк → ${incoming.length} карточек с именем`)

async function main() {
  // --- привязка к перепискам бота ---------------------------------------
  // По нику в Telegram чат находится сразу; остальные владелец свяжет
  // руками в карточке (в выгрузке ник заполнен у меньшинства).
  const { data: chats, error: chatErr } = await sb.rpc('tg_chat_list')
  if (chatErr) console.warn('Чаты бота недоступны, привязку пропускаю:', chatErr.message)
  const chatByNick = new Map<string, number>()
  for (const c of (chats ?? []) as Array<{ contact: string | null; chat_id: number }>) {
    const nick = normalizeTelegram(c.contact?.match(/@([A-Za-z0-9_]+)/)?.[1])
    if (nick) chatByNick.set(nick, c.chat_id)
  }

  // --- существующие карточки --------------------------------------------
  type Existing = Record<string, unknown> & { id: string; name: string; agency: string | null; telegram: string | null; phone: string | null; tg_chat_id: number | null; data: Record<string, string> | null }
  const { data: existing, error: exErr } = await sb.from('agents').select('*')
  if (exErr) { console.error('Не читается таблица agents:', exErr.message); process.exit(1) }
  const rows = (existing ?? []) as Existing[]

  const nameKey = (name: string, agency: string | null) => `${name.toLowerCase()}|${(agency ?? '').toLowerCase()}`

  const byNick = new Map<string, Existing>()
  // Тёзки — норма: в выгрузке четыре «Дмитрия» и пять «Екатерин». Поэтому
  // по имени храним ВСЕ совпадения и разбираем их по одному, иначе повторный
  // запуск сведёт всех однофамильцев в одну карточку.
  const byName = new Map<string, Existing[]>()
  for (const a of rows) {
    if (a.telegram) byNick.set(a.telegram, a)
    const k = nameKey(a.name, a.agency)
    byName.set(k, [...(byName.get(k) ?? []), a])
  }
  const usedChats = new Set(rows.map(a => a.tg_chat_id).filter((v): v is number => v != null))
  const claimed = new Set<string>()

  let created = 0, updated = 0, linked = 0, fixedNick = 0, clearedNick = 0, skipped = 0
  for (const a of incoming) {
    const found = (a.telegram ? byNick.get(a.telegram) : undefined)
      ?? (byName.get(nameKey(a.name, a.agency)) ?? []).find(r => !claimed.has(r.id))

    if (found) {
      claimed.add(found.id)
      // Дополняем только пустое — правки, сделанные уже в админке, важнее выгрузки.
      const patch: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(a)) {
        if (k === 'data' || k === 'source' || k === 'status' || k === 'telegram') continue
        if (v != null && (found[k] == null || found[k] === '')) patch[k] = v
      }
      // Ник — особый случай. В базе может лежать не ник, а обломок ссылки
      // от прошлой версии разбора или телефон, попавший не в ту колонку.
      // Такое значение заменяем разобранным из выгрузки, а если в выгрузке
      // ника нет — чистим, чтобы мусор не мешал искать переписку.
      // Нормальный ник не трогаем: он мог быть вписан руками в админке и
      // быть свежее выгрузки.
      if (found.telegram && normalizeTelegram(found.telegram) == null) {
        patch.telegram = a.telegram
        if (a.telegram) fixedNick++; else clearedNick++
        // Телефон, записанный в поле Telegram, не теряем.
        const digits = found.telegram.replace(/\D/g, '')
        if (!a.telegram && digits.length >= 7 && found.phone == null) patch.phone = found.telegram
      } else if (a.telegram && !found.telegram) {
        patch.telegram = a.telegram
      }

      // Переписку ищем по нику, который останется в карточке ПОСЛЕ правок,
      // а не по тому, что лежит в выгрузке: ник, вписанный руками, обычно
      // и есть актуальный.
      const nick = (patch.telegram as string | null | undefined) ?? found.telegram ?? null
      const chatId = nick ? chatByNick.get(nick) : undefined

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
      const row: Record<string, unknown> = { ...a }
      const chatId = a.telegram ? chatByNick.get(a.telegram) : undefined
      if (chatId != null && !usedChats.has(chatId)) { row.tg_chat_id = chatId; usedChats.add(chatId); linked++ }
      if (!dry) {
        const { error } = await sb.from('agents').insert(row)
        if (error) { console.error('insert', a.name, error.message); continue }
      }
      created++
    }
  }

  console.log(`${dry ? '[проверка] ' : ''}создано ${created}, дополнено ${updated}, без изменений ${skipped}, починено ников ${fixedNick}, вычищено мусорных ников ${clearedNick}, привязано переписок ${linked}`)
}

main()
