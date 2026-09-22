// Перенос застройщиков в CRM (/admin/zastroyshchiki) из трёх источников.
//
//   npx tsx --env-file=.env.local scripts/import-developers-crm.ts \
//     "<общая база .md>" "<отбор владельца .csv>" [--dry]
//
// Источников три, и ни один не полный:
//   1. Общая база (.md) — выгрузка таблицы Developer из Airtable, 204
//      компании: контакты строкой, проекты, пометки вида «контакт СЛАБЫЙ».
//   2. Отбор владельца (.csv) — 46 компаний, с которыми решено
//      разговаривать: основатели, их Telegram и колонка «Отклик».
//   3. raw_developers в Supabase — 115 компаний, которые есть на сайте:
//      ключ связи, slug страницы, комиссия, рейтинг.
//
// Названия в трёх источниках написаны по-разному («Oceaniq» /
// «OceaniQ Villas», «LB Group» / «LB Group (LOYO&BONDAR)»), поэтому
// сведение двухступенчатое: точное совпадение имени без правовых форм и
// общих слов — сводим сами; совпадение по части названия — НЕ сводим, а
// кладём в dev_merge_pairs, чтобы владелец решил во вкладке «Похожие».
// Автоматическая склейка по части названия слепила бы «Taryan group» с
// «Arya Properties» — проверено на этих же данных.
//
// Повторный запуск не плодит дубли: карточка ищется по ключу сайта,
// иначе по нормализованному названию. Совпала — заполняем только
// пустое, чтобы не затереть правку, сделанную в админке. Человек
// ищется по нику, иначе по имени внутри своей компании.

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
// Разбор ника и нормализация названия — общие с админкой, чтобы
// «t.me/user» и «@user» сходились в одно и то же и здесь, и при ручной
// правке карточки.
import { nameKey, nameTokens, normalizeTelegram } from '../lib/dev-crm/types'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const mdFile = process.argv[2]
const csvFile = process.argv[3]
const dry = process.argv.includes('--dry')
if (!mdFile || !csvFile) {
  console.error('Укажите путь к общей базе (.md) и к отбору владельца (.csv)')
  process.exit(1)
}

type Prospect = 'yes' | 'maybe' | 'unknown' | 'no'
type Role = 'founder' | 'staff' | 'via'

type PersonDraft = {
  name: string
  role: Role
  position?: string | null
  telegram?: string | null
  tg_channel?: string | null
  instagram?: string | null
  whatsapp?: string | null
  phone?: string | null
  email?: string | null
  access_note?: string | null
}

type Draft = {
  name: string
  key: string
  prospect: Prospect | null
  in_work: boolean
  site_developer_key: string | null
  site_slug: string | null
  website: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  telegram: string | null
  instagram: string | null
  projects: string | null
  commission: string | null
  data: Record<string, string>
  people: PersonDraft[]
  sources: Set<string>
}

// --- разбор CSV --------------------------------------------------------
// Свой парсер, а не зависимость: в выгрузке есть кавычки внутри ячеек
// («связь через чат "Our Place Invest | Balinsky"»).
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

// --- вытаскивание контактов из свободного текста -----------------------

const NOT_A_SITE = /^(t\.me|telegram\.me|wa\.me|api\.whatsapp\.com|instagram\.com|www\.instagram\.com|facebook\.com|drive\.google\.com|youtube\.com|youtu\.be|balinsky\.info|hatamatata\.com)$/i

function firstEmail(s: string): string | null {
  return s.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null
}

function firstWebsite(s: string): string | null {
  // Сначала явные ссылки, потом «голые» домены вида «axmbali.com».
  const links = s.match(/https?:\/\/[^\s,;\]]+/gi) ?? []
  for (const l of links) {
    const host = l.replace(/^https?:\/\//i, '').split('/')[0]
    if (!NOT_A_SITE.test(host)) return l.replace(/[.,;]+$/, '')
  }
  const bare = s.match(/\b(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|ai|info|ru|id|co|properties|estate|group|dev|online|site|asia|pro)\b/gi) ?? []
  for (const b of bare) {
    // «info@artvillasbali.com» — это почта, а не сайт.
    if (new RegExp(`@${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(s)) continue
    if (!NOT_A_SITE.test(b)) return b
  }
  return null
}

function whatsappFrom(s: string): string | null {
  const link = s.match(/(?:https?:\/\/)?(?:api\.whatsapp\.com\/send\?phone=|wa\.me\/)(\+?\d[\d\s-]*)/i)?.[1]
  if (link) return `+${link.replace(/\D/g, '')}`
  // «WhatsApp +62 823-2253-8699» и «+7 9150853969 (WhatsApp)»
  const near = s.match(/WhatsApp[^\d+]{0,12}(\+?\d[\d\s\-()]{7,})/i)?.[1]
    ?? s.match(/(\+?\d[\d\s\-()]{7,})\s*\(\s*WhatsApp/i)?.[1]
  return near ? near.trim().replace(/[\s()-]+$/, '') : null
}

function firstPhone(s: string): string | null {
  const all = s.match(/\+\d[\d\s\-()]{7,}/g) ?? []
  for (const p of all) {
    const clean = p.trim().replace(/[\s()-]+$/, '')
    // Дата в пометке («+62 812…» не путаем с «26.08.2026») — уже
    // отфильтровано требованием «+» в начале.
    if (clean.replace(/\D/g, '').length >= 9) return clean
  }
  return null
}

function instagramFrom(s: string): string | null {
  const handle = s.match(/(?:IG|Instagram|инстаграм)\s*[:@]?\s*@?([A-Za-z0-9_.]{3,30})/i)?.[1]
  if (handle) return `@${handle}`
  const link = s.match(/instagram\.com\/([A-Za-z0-9_.]{3,30})/i)?.[1]
  return link ? `@${link}` : null
}

// Ники Telegram вместе с именем, которое стоит перед ними.
//
// В общей базе люди записаны на удивление однообразно: «Имя Фамилия TG
// @nick», иногда «Валерия: @nick», иногда просто «@nick» без имени.
// Имя берём максимум из трёх слов с большой буквы — иначе в имя
// уезжает половина предложения вместе с пометкой.
//
// Два ограничителя по краям обязательны. Слева — что перед «@» не
// буква (иначе ник находится внутри адреса почты), справа — что после
// ника не точка с буквой: в нике Telegram точек не бывает, а в
// инстаграмовском бывают, и «@palm.leylines» давала несуществующего
// «@palm».
const WORD = "[A-ZА-ЯЁ][A-Za-zА-Яа-яёЁ'’-]+"
const NICK_RE = new RegExp(
  `(?:(${WORD}(?:\\s+${WORD}){0,2})\\s*[:,]?\\s*)?` +
  `(?:TG|Telegram|ТГ)?\\s*(?:https?:\\/\\/)?(?<![A-Za-z0-9_.+-])(?:t\\.me\\/|@)([A-Za-z][A-Za-z0-9_]{3,31})(?![.@][A-Za-z])`,
  'g',
)

function telegramPeople(src: string): Array<{ name: string | null; nick: string }> {
  const out: Array<{ name: string | null; nick: string }> = []
  const seen = new Set<string>()
  // Адреса почты выбрасываем до поиска ников: «neobali@gmail.com» иначе
  // даёт ник «gmail», и в карточке появляется человек @gmail. Заодно
  // выбрасываем помеченные инстаграм-ники: «IG/Threads @palm.leylines»
  // давала телеграм-ник @palm, которого не существует.
  const s = src
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, ' ')
    .replace(/(?:IG|Instagram|Threads|инстаграм)[\s/]*(?:Threads)?\s*@[A-Za-z0-9_.]+/gi, ' ')
  for (const m of s.matchAll(NICK_RE)) {
    const nick = normalizeTelegram(m[2])
    if (!nick || seen.has(nick)) continue
    seen.add(nick)
    // Указатель «TG» стоит между именем и ником и попадает в группу
    // имени, потому что тоже написан с большой буквы: «Alena Yushina TG».
    const name = (m[1] ?? '').trim().replace(/\s*(?:TG|Telegram|ТГ)$/i, '').trim()
    // «WhatsApp», «Instagram» и прочие слова-указатели именем не являются.
    const bad = /^(whatsapp|telegram|instagram|tg|ig|сайт|почта|телефон|контакт|подписка)$/i.test(name)
    out.push({ name: name && !bad ? name : null, nick })
  }
  return out
}

// Ник принадлежит компании, а не человеку: «Axiom Development Bali TG
// @AxiomAsia», «TG @julia_sales_bigbali». Признаки — имени нет и ник
// похож на название, либо в имени стоит само название.
function looksLikeCompanyNick(company: string, name: string | null, nick: string): boolean {
  const tokens = nameTokens(company)
  const flat = nick.toLowerCase().replace(/[^a-z0-9]/g, '')
  const byNick = tokens.some(t => t.length >= 4 && flat.includes(t))
  if (!name) return byNick
  return nameKey(name) === nameKey(company) || (byNick && nameTokens(name).some(t => tokens.includes(t)))
}

// --- источник 1: общая база (.md) --------------------------------------

type MdRow = { name: string; contacts: string; projects: string; country: string; notes: string; hasContacts: boolean }

function readMd(path: string): MdRow[] {
  const rows: MdRow[] = []
  let section: 'with' | 'without' | null = null
  for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
    if (line.startsWith('## 1.')) { section = 'with'; continue }
    if (line.startsWith('## 2.')) { section = 'without'; continue }
    if (!line.startsWith('|') || !section) continue
    // Внутри ячеек встречается экранированная черта: названия чатов
    // вида «ALPHA DEVELOPMENT \| RISE REAL». Без этой замены строка
    // разъезжается по колонкам, и в «Проекты» приезжает текст пометки.
    const cells = line.trim()
      .replace(/\\\|/g, '\u0001')
      .replace(/^\|/, '').replace(/\|$/, '')
      .split('|')
      .map(c => c.replace(/\u0001/g, '|').trim())
    if (!/^\d+$/.test(cells[0] ?? '')) continue
    const name = (cells[1] ?? '').replace(/\*\*/g, '').trim()
    if (!name) continue
    if (section === 'with') {
      rows.push({
        name, contacts: cells[2] ?? '', projects: cells[3] ?? '',
        country: cells[4] ?? '', notes: cells[5] ?? '', hasContacts: true,
      })
    } else {
      rows.push({
        name, contacts: '', projects: cells[2] ?? '',
        country: '', notes: cells[3] ?? '', hasContacts: false,
      })
    }
  }
  return rows
}

// --- источник 2: отбор владельца (.csv) --------------------------------

const PROSPECT_BY_WORD: Record<string, Prospect> = {
  'да': 'yes', 'возможно': 'maybe', 'хз': 'unknown', 'нет': 'no',
}

type CsvDev = { n: number; name: string; prospect: Prospect | null; people: PersonDraft[] }

// «связь через Ирину https://t.me/IrynaMikhaleva» — выход есть, но не
// напрямую. Такое нельзя записать основателю в Telegram: ник чужой.
// Внимание: \w в JS без флага u не матчит кириллицу, поэтому окончание
// слова пишем явным диапазоном. С \w* «Приглашение через» не ловилось, и
// ник посредника уезжал основателю в Telegram.
const VIA_RE = /(?:связь|приглаш[а-яё]*|выход)\s+через|^\s*через\s/i

function readCsv(path: string): CsvDev[] {
  const raw = fs.readFileSync(path, 'utf8').replace(/^﻿/, '')
  const [header, ...lines] = parseCsv(raw)
  const cols = header.map(h => h.trim())
  const idx = (want: string) => cols.findIndex(c => c === want)
  const iNum = idx('№ пп'), iDev = idx('Застройщик'), iProspect = idx('Отклик')
  const iName = idx('Имя Фамилия основателя'), iTg = idx('Телеграм, WA')
  const iChannel = idx('ТГ канал'), iIg = idx('Инстаграм')

  const out: CsvDev[] = []
  let cur: CsvDev | null = null
  for (const r of lines) {
    const cell = (i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')
    const num = cell(iNum), dev = cell(iDev)
    if (num && dev) {
      cur = { n: Number(num), name: dev, prospect: PROSPECT_BY_WORD[cell(iProspect).toLowerCase()] ?? null, people: [] }
      out.push(cur)
    }
    if (!cur) continue

    const rawName = cell(iName), tg = cell(iTg), channel = cell(iChannel), ig = cell(iIg)
    if (!rawName && !tg && !channel && !ig) continue

    const combined = `${rawName} ${tg}`.trim()
    const via = VIA_RE.test(combined)
    const nicks = telegramPeople(combined)
    const wa = whatsappFrom(combined)

    // Имя: до маркера «через», без служебной приставки должности.
    let name = rawName.replace(/https?:\/\/\S+/g, '').trim()
    let position: string | null = null
    const viaAt = name.search(VIA_RE)
    // viaAt === 0 — строка начинается с «связь через…», значит имени
    // основателя в ней нет вовсе («связь через чат "Our Place Invest"»).
    if (via && viaAt >= 0) name = name.slice(0, viaAt).trim()
    const posMatch = name.match(/^(CEO|СЕО|основатель|владелец|директор)\s+(.+)$/i)
    if (posMatch) { position = posMatch[1]; name = posMatch[2].trim() }
    name = name.replace(/[,;]+$/, '').trim()

    if (via) {
      // Ник в такой строке принадлежит посреднику, а не основателю:
      // основателю оставляем пустой Telegram и пишем, как до него дойти.
      const note = combined.replace(/\s+/g, ' ').trim()
      if (name) {
        // «англоговорящий, живёт в Малайзии» — это описание, а не имя.
        // Человек начинается с заглавной буквы; если её нет, это не
        // основатель, а способ до него добраться.
        const isPerson = /[A-ZА-ЯЁ]/.test(name[0] ?? '')
        cur.people.push({
          name, role: isPerson ? 'founder' : 'via',
          position, access_note: note, whatsapp: wa ?? null,
        })
      }
      for (const { name: n, nick } of nicks) {
        cur.people.push({ name: n ?? `@${nick}`, role: 'via', telegram: nick, access_note: note })
      }
      // «связь через чат "Our Place Invest | Balinsky"» — ни имени, ни ника.
      if (!name && nicks.length === 0) {
        cur.people.push({ name: note.slice(0, 80), role: 'via', access_note: note, whatsapp: wa ?? null })
      }
      continue
    }

    const nick = nicks[0]?.nick ?? null
    if (!name && nick) name = `@${nick}`
    if (!name) continue
    cur.people.push({
      name,
      role: 'founder',
      position,
      telegram: nick,
      // «1» в колонке канала — обломок таблицы, а не канал.
      tg_channel: /^https?:\/\/|^@|t\.me\//i.test(channel) ? channel : null,
      instagram: ig ? (ig.startsWith('@') || ig.startsWith('http') ? ig : `@${ig}`) : null,
      whatsapp: wa ?? null,
    })
  }
  return out
}

// --- сведение ----------------------------------------------------------

function blank(): Omit<Draft, 'name' | 'key'> {
  return {
    prospect: null, in_work: false,
    site_developer_key: null, site_slug: null,
    website: null, email: null, phone: null, whatsapp: null, telegram: null, instagram: null,
    projects: null, commission: null,
    data: {}, people: [], sources: new Set<string>(),
  }
}

function fill<T extends object, K extends keyof T>(obj: T, key: K, value: T[K] | null): void {
  if (obj[key] == null && value != null) obj[key] = value
}

async function main() {
  const md = readMd(mdFile)
  const csv = readCsv(csvFile)

  const { data: siteRows, error: siteErr } = await sb.from('raw_developers').select('data')
  if (siteErr) throw new Error(`raw_developers: ${siteErr.message}`)

  const drafts = new Map<string, Draft>()
  const get = (name: string): Draft => {
    const key = nameKey(name)
    const found = drafts.get(key)
    if (found) return found
    const d: Draft = { name, key, ...blank() }
    drafts.set(key, d)
    return d
  }

  // 1. Сайт — он даёт связку со страницей и комиссию.
  for (const row of siteRows ?? []) {
    const sd = (row.data ?? {}) as Record<string, unknown>
    const name = String(sd['Developer'] ?? '').trim()
    if (!name) continue
    const d = get(name)
    d.sources.add('сайт')
    fill(d, 'site_developer_key', String(sd['Developer_key'] ?? sd['Developer'] ?? '') || null)
    fill(d, 'site_slug', sd['SEO:Slug'] ? String(sd['SEO:Slug']) : null)
    fill(d, 'website', sd["Link on developer's website"] ? String(sd["Link on developer's website"]) : null)
    const commission = sd['Комиссия отображение'] ?? sd['Комиссия']
    fill(d, 'commission', commission == null ? null : String(commission))
    if (sd['Публикация'] !== true) d.data['На сайте'] = 'карточка есть, но не опубликована'
  }

  // 2. Общая база — контакты и проекты.
  for (const row of md) {
    const d = get(row.name)
    d.sources.add('общая база')
    // Пометки в квадратных скобках — это история поиска контакта
    // («контакт СЛАБЫЙ», «номер российский»). Из строки контактов их
    // убираем, но сохраняем: по ним понятно, чему верить.
    const notes: string[] = []
    const contacts = row.contacts.replace(/\[([^\]]*)\]/g, (_, t) => { notes.push(String(t).trim()); return ' ' })
    if (row.projects && row.projects !== '—') fill(d, 'projects', row.projects)
    if (row.country && row.country !== '—') d.data['Страна / язык'] = row.country
    if (row.notes && row.notes !== '—') d.data['Пометка базы'] = row.notes
    if (notes.length) d.data['Как искали контакт'] = notes.join('\n\n')
    if (!row.hasContacts) {
      d.data['Контакты'] = 'в общей базе контактов нет'
      continue
    }
    if (contacts.trim()) d.data['Сырые контакты'] = row.contacts.trim()

    fill(d, 'email', firstEmail(contacts))
    fill(d, 'website', firstWebsite(contacts))
    fill(d, 'whatsapp', whatsappFrom(contacts))
    fill(d, 'phone', firstPhone(contacts))
    fill(d, 'instagram', instagramFrom(contacts))

    for (const { name, nick } of telegramPeople(contacts)) {
      if (looksLikeCompanyNick(row.name, name, nick)) { fill(d, 'telegram', nick); continue }
      d.people.push({ name: name ?? `@${nick}`, role: 'staff', telegram: nick })
    }
  }

  // 3. Отбор владельца — отклик, основатели и признак «в работе».
  for (const dev of csv) {
    const d = get(dev.name)
    d.sources.add('отбор владельца')
    d.in_work = true
    if (dev.prospect) d.prospect = dev.prospect
    d.data['Номер в отборе'] = String(dev.n)
    d.people.push(...dev.people)
  }

  // Люди внутри компании: один и тот же человек мог приехать и из
  // отбора, и из общей базы. Сводим по нику, иначе по имени; роль
  // основателя важнее роли сотрудника.
  const ROLE_RANK: Record<Role, number> = { founder: 0, via: 1, staff: 2 }
  for (const d of drafts.values()) {
    const merged = new Map<string, PersonDraft>()
    for (const p of d.people) {
      const key = p.telegram ? `n:${p.telegram}` : `m:${p.name.toLowerCase()}`
      const prev = merged.get(key)
      if (!prev) { merged.set(key, { ...p }); continue }
      if (ROLE_RANK[p.role] < ROLE_RANK[prev.role]) {
        prev.role = p.role
        // Имя из отбора владельца полнее: в общей базе тот же человек
        // подписан «Marina», а у владельца — «Марина Билобровская».
        if (p.name.split(/\s+/).length > prev.name.split(/\s+/).length) prev.name = p.name
      }
      for (const f of ['position', 'telegram', 'tg_channel', 'instagram', 'whatsapp', 'phone', 'email', 'access_note'] as const) {
        if (prev[f] == null && p[f] != null) prev[f] = p[f]
      }
      // «@nick» как имя хуже настоящего имени.
      if (prev.name.startsWith('@') && !p.name.startsWith('@')) prev.name = p.name
    }

    // Второй проход: один и тот же человек мог приехать из отбора без
    // ника («Алексей Исаев») и из общей базы с ником («Алексей Исаев TG
    // @alexisaev85»). По ключу они разошлись — сводим по имени.
    const flat = [...merged.values()]
    const byName = new Map<string, PersonDraft>()
    for (const p of flat) if (p.telegram) byName.set(p.name.toLowerCase().replace(/ё/g, 'е'), p)
    const out: PersonDraft[] = []
    for (const p of flat) {
      if (!p.telegram) {
        const twin = byName.get(p.name.toLowerCase().replace(/ё/g, 'е'))
        if (twin) {
          if (ROLE_RANK[p.role] < ROLE_RANK[twin.role]) twin.role = p.role
          for (const f of ['position', 'tg_channel', 'instagram', 'whatsapp', 'phone', 'email', 'access_note'] as const) {
            if (twin[f] == null && p[f] != null) twin[f] = p[f]
          }
          continue
        }
      }
      out.push(p)
    }
    d.people = out
    d.data['Источник'] = [...d.sources].join(' + ')
  }

  // --- спорные пары ----------------------------------------------------
  // Точные совпадения уже свелись в один Draft выше. Здесь ищем то, что
  // похоже, но не совпало. Такие пары НЕ склеиваем.
  //
  // Сравниваем НАБОРЫ слов, а не склеенную строку. Первая версия
  // сравнивала строки через includes и выдавала «Ilotproperty» ~ «Pro
  // Bali Development»: у второго после выброса общих слов остаётся
  // «pro», а оно содержится в первом. По словам такой пары не бывает.
  //
  // Общее редкое слово в отдельное правило не выделяем: «Fund Bridge
  // Indonesia» ~ «Vertikal Indonesia» и «Dream House» ~ «Bali Dream
  // Homes» — это разные компании, а спрашивать про них владельца
  // десятками значит утопить настоящие дубли в шуме.
  const list = [...drafts.values()]

  // Похожесть двух названий: доля совпадения по Левенштейну. Ловит
  // опечатки и число — «DM Projects» против «DM Project».
  const ratio = (a: string, b: string): number => {
    if (a === b) return 1
    const m = a.length, n = b.length
    if (!m || !n) return 0
    let prev = Array.from({ length: n + 1 }, (_, j) => j)
    for (let i = 1; i <= m; i++) {
      const cur = [i]
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      }
      prev = cur
    }
    return 1 - prev[n] / Math.max(m, n)
  }

  const pairs: Array<{ a: Draft; b: Draft; reason: string }> = []
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j]
      if (!a.key || !b.key || a.key === b.key) continue
      const ta = nameTokens(a.name), tb = nameTokens(b.name)
      if (!ta.length || !tb.length) continue
      const sa = new Set(ta), sb = new Set(tb)
      const [small, big] = ta.length <= tb.length ? [ta, sb] : [tb, sa]
      // Все слова одного названия входят во второе: «OXO» внутри «OXO
      // living», «LB Group» внутри «LB Group (LOYO&BONDAR)». Двух букв
      // мало — «DM» нашлось бы в половине базы.
      if (small.join('').length >= 3 && small.every(t => big.has(t))) {
        pairs.push({ a, b, reason: 'по части названия' })
        continue
      }
      if (a.key.length >= 5 && b.key.length >= 5 && ratio(a.key, b.key) >= 0.86) {
        pairs.push({ a, b, reason: 'названия почти одинаковые' })
      }
    }
  }

  // --- отчёт -----------------------------------------------------------
  const withPeople = list.filter(d => d.people.length > 0).length
  const withNick = list.filter(d => d.people.some(p => p.telegram)).length
  console.log(`Общая база: ${md.length} · отбор: ${csv.length} · сайт: ${(siteRows ?? []).length}`)
  console.log(`Сведено в ${list.length} застройщиков`)
  console.log(`  в работу (из отбора): ${list.filter(d => d.in_work).length}`)
  console.log(`  с людьми: ${withPeople}, из них с Telegram: ${withNick}`)
  console.log(`  людей всего: ${list.reduce((s, d) => s + d.people.length, 0)}`)
  console.log(`  на сайте: ${list.filter(d => d.site_developer_key).length}`)
  console.log(`Спорных пар на проверку: ${pairs.length}`)
  if (dry) {
    for (const { a, b, reason } of pairs) console.log(`  ? «${a.name}» ~ «${b.name}» (${reason})`)
    console.log('\nЛюди, как их разобрал скрипт:')
    for (const d of list.filter(x => x.people.length).slice(0, 30)) {
      const who = d.people.map(p => {
        const tail = p.telegram ? ` @${p.telegram}` : p.access_note ? ' [через посредника]' : ''
        return `${p.role === 'founder' ? '★' : p.role === 'via' ? '→' : '·'} ${p.name}${tail}`
      }).join(', ')
      console.log(`  ${d.name}: ${who}`)
    }
    console.log('\n--dry: в базу ничего не записано')
    return
  }

  // --- запись ----------------------------------------------------------
  const { data: existing, error: exErr } = await sb.from('dev_partners').select('id,name,site_developer_key')
  if (exErr) throw new Error(exErr.message)
  const byKey = new Map<string, string>()
  const bySite = new Map<string, string>()
  for (const e of existing ?? []) {
    byKey.set(nameKey(e.name), e.id)
    if (e.site_developer_key) bySite.set(e.site_developer_key, e.id)
  }

  const idOf = new Map<string, string>()
  let created = 0, updated = 0, peopleAdded = 0

  for (const d of list) {
    const found = (d.site_developer_key ? bySite.get(d.site_developer_key) : undefined) ?? byKey.get(d.key)
    const row = {
      name: d.name,
      site_developer_key: d.site_developer_key,
      site_slug: d.site_slug,
      prospect: d.prospect,
      in_work: d.in_work,
      website: d.website,
      email: d.email,
      phone: d.phone,
      whatsapp: d.whatsapp,
      telegram: d.telegram,
      instagram: d.instagram,
      projects: d.projects,
      commission: d.commission,
      data: d.data,
      source: 'import',
      // Взятые в работу встают в колонку «Связаться»: это и есть
      // первый шаг, а «Без статуса» заставлял бы двигать их дважды.
      status: d.in_work ? 'contact' : 'new',
    }

    if (!found) {
      const { data: ins, error } = await sb.from('dev_partners').insert(row).select('id').single()
      if (error) { console.error(`  ! ${d.name}: ${error.message}`); continue }
      idOf.set(d.key, ins.id)
      byKey.set(d.key, ins.id)
      created++
    } else {
      // Заполняем только пустое: правка, сделанная руками в админке,
      // важнее того, что приехало из выгрузки.
      const { data: cur } = await sb.from('dev_partners').select('*').eq('id', found).maybeSingle()
      const patch: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(row)) {
        if (k === 'data' || k === 'name' || k === 'source' || k === 'status' || k === 'in_work') continue
        if (v != null && cur && (cur as Record<string, unknown>)[k] == null) patch[k] = v
      }
      // Анкета: свои ключи не трогаем, новые дописываем.
      patch.data = { ...d.data, ...((cur?.data ?? {}) as Record<string, string>) }
      if (d.in_work && cur && !cur.in_work) { patch.in_work = true; if (cur.status === 'new') patch.status = 'contact' }
      if (d.prospect && cur && cur.prospect == null) patch.prospect = d.prospect
      patch.updated_at = new Date().toISOString()
      const { error } = await sb.from('dev_partners').update(patch).eq('id', found)
      if (error) { console.error(`  ! ${d.name}: ${error.message}`); continue }
      idOf.set(d.key, found)
      updated++
    }
  }

  // Люди. Ищем по нику, иначе по имени внутри своей компании.
  for (const d of list) {
    const partnerId = idOf.get(d.key)
    if (!partnerId || !d.people.length) continue
    const { data: have } = await sb.from('dev_people').select('id,name,telegram').eq('partner_id', partnerId)
    const haveNick = new Set((have ?? []).map(p => p.telegram).filter(Boolean) as string[])
    const haveName = new Set((have ?? []).map(p => p.name.toLowerCase()))
    for (const p of d.people) {
      if (p.telegram && haveNick.has(p.telegram)) continue
      if (!p.telegram && haveName.has(p.name.toLowerCase())) continue
      const { error } = await sb.from('dev_people').insert({
        partner_id: partnerId,
        name: p.name,
        role: p.role,
        position: p.position ?? null,
        telegram: p.telegram ?? null,
        tg_channel: p.tg_channel ?? null,
        instagram: p.instagram ?? null,
        whatsapp: p.whatsapp ?? null,
        phone: p.phone ?? null,
        email: p.email ?? null,
        access_note: p.access_note ?? null,
        sort: Date.now(),
      })
      if (error) { console.error(`  ! ${d.name} / ${p.name}: ${error.message}`); continue }
      if (p.telegram) haveNick.add(p.telegram)
      haveName.add(p.name.toLowerCase())
      peopleAdded++
    }
  }

  // Спорные пары. Уже решённые («разные») не заводим повторно — на это
  // и нужна память о решении.
  const { data: decided } = await sb.from('dev_merge_pairs').select('left_id,right_id,state')
  const known = new Set((decided ?? []).map(p => [p.left_id, p.right_id].sort().join('|')))
  let pairsAdded = 0
  for (const { a, b, reason } of pairs) {
    const ia = idOf.get(a.key), ib = idOf.get(b.key)
    if (!ia || !ib || ia === ib) continue
    if (known.has([ia, ib].sort().join('|'))) continue
    const { error } = await sb.from('dev_merge_pairs').insert({ left_id: ia, right_id: ib, reason })
    if (error) { console.error(`  ! пара ${a.name} ~ ${b.name}: ${error.message}`); continue }
    known.add([ia, ib].sort().join('|'))
    pairsAdded++
  }

  console.log(`\nЗаписано: создано ${created}, дополнено ${updated}, людей добавлено ${peopleAdded}, пар на проверку ${pairsAdded}`)
}

main().catch(e => { console.error(e); process.exit(1) })
