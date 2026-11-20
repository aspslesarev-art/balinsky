// High Quality Construction (HQC): шахматки берём с их сайта для агентов
// hqc-agent.pro, а не по ссылке из мастер-таблицы.
//
// Почему так (20.11.2026): HQC молча заводит новые файлы шахматок, а старые
// бросает. Таблица Bloom в мастере не менялась с 18.09, Aravita — с 19.10,
// и трекер два месяца видел «0 продаж», хотя в новых файлах было 48 новых
// броней. Страница проекта на сайте агентов всегда ведёт на текущий файл —
// поэтому на каждом обходе сначала читаем страницу, находим кнопку
// «Шахматка» и уже по ней качаем лист.
//
// Разбор без модели: у всех шахматок HQC одна схема — номер, тип, площадь,
// «Price now», статус словом. Колонки ищем по подписям шапки, а не по
// номерам: в новых файлах HQC их переставляет.

import { toGrid, textAt, type Grid } from '../grid'
import { fetchXlsxFromGoogleSheet, parseXlsxBuffer } from '../xlsx'
import { fetchHtml } from './webpage'
import type { ExtractResult, ScrapedUnit, UnitStatus } from '../types'

const HOST = 'hqc-agent.pro'
const DEVELOPER = 'High Quality Construction'

// Комплекс в мастер-таблице → страница проекта на сайте агентов. `label`
// нужен, когда на странице несколько шахматок (у Satori — отель и виллы).
export const HQC_AGENT_PAGES: Record<string, { page: string; label?: RegExp }> = {
  'Bloom': { page: 'bloomru' },
  'Ardhana Residence': { page: 'ardhanaresidence' },
  'Aravita Residence': { page: 'aravita_ru' },
}

export function isHqcAgentSource(url: string): boolean {
  try {
    return new URL(url).hostname.replace(/^www\./, '') === HOST
  } catch {
    return false
  }
}

// Строка мастер-таблицы HQC → адрес страницы на сайте агентов.
export function hqcAgentUrl(developer: string, complex: string): string | null {
  if (developer.trim() !== DEVELOPER) return null
  const p = HQC_AGENT_PAGES[complex.trim()]
  return p ? `https://${HOST}/${p.page}` : null
}

export async function scrapeHqcAgent(pageUrl: string, onGrid?: (grid: Grid) => void): Promise<ExtractResult & { sheetUrl: string }> {
  const sheetUrl = await findSheetLink(pageUrl)
  const grid = await fetchSheet(sheetUrl)
  onGrid?.(grid)
  const result = parseHqcGrid(grid)
  if (!result.units.length) throw new Error(`шахматка ${sheetUrl} прочитана, но юнитов в ней не нашлось — проверить шапку`)
  return { ...result, sheetUrl }
}

async function findSheetLink(pageUrl: string): Promise<string> {
  const html = await fetchHtml(pageUrl)
  const page = Object.values(HQC_AGENT_PAGES).find(p => pageUrl.replace(/\/+$/, '').endsWith(`/${p.page}`))
  const links: Array<{ href: string; text: string }> = []
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    if (/шахматк/i.test(text)) links.push({ href: m[1].replace(/&amp;/g, '&'), text })
  }
  const picked = page?.label ? links.find(l => page.label!.test(l.text)) : links[0]
  if (!picked) throw new Error(`на странице ${pageUrl} нет кнопки «Шахматка» — HQC переделал сайт`)
  return picked.href
}

async function fetchSheet(url: string): Promise<Grid> {
  if (/docs\.google\.com\/spreadsheets\/d\//.test(url)) {
    return toGrid(await fetchXlsxFromGoogleSheet(url))
  }
  const fileId = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/)?.[1]
  if (!fileId) throw new Error(`шахматка лежит не в Google: ${url}`)
  const r = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!r.ok) throw new Error(`Диск вернул ${r.status} на шахматку — файл должен быть открыт по ссылке`)
  const buf = new Uint8Array(await r.arrayBuffer())
  // xlsx — это zip: «PK». Иначе Диск отдал страницу входа или подтверждения.
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error('Диск вместо файла шахматки отдал страницу — файл закрыт по доступу')
  return toGrid(parseXlsxBuffer(buf))
}

// «Not availble» в Aravita с первого дня трекера читается как sold —
// менять нельзя, иначе пять вилл дадут ложное «вернулись в продажу».
const STATUS: Record<string, UnitStatus> = {
  available: 'available', sold: 'sold', deposit: 'reserved', reserved: 'reserved', booked: 'reserved',
  'not availble': 'sold', 'not available': 'sold',
  'resale': 'available', 're-sale': 'available',
}

export function parseHqcGrid(grid: Grid): ExtractResult {
  const header = findHeader(grid)
  if (!header) return { units: [], warnings: ['не найдена шапка с номером и статусом'] }

  const units: ScrapedUnit[] = []
  const warnings: string[] = []
  const seen = new Set<string>()

  for (let r = header.row + 1; r <= grid.rowCount; r++) {
    const key = textAt(grid, r, header.key).replace(/\.0+$/, '').trim()
    const statusText = textAt(grid, r, header.status).replace(/\s+/g, ' ').trim()
    if (!key || !statusText) continue // подзаголовки секций («1 Floor», «Feng Shui villas»)
    const st = statusText.toLowerCase()
    const status = STATUS[st]
    if (!status) {
      warnings.push(`юнит ${key}: незнакомый статус «${statusText}»`)
      continue
    }
    if (seen.has(key)) {
      warnings.push(`юнит ${key} встречается дважды — взят первый`)
      continue
    }
    seen.add(key)

    const type = header.type ? textAt(grid, r, header.type) || null : null
    const area = num(header.area ? textAt(grid, r, header.area) : '')
    const price = num(header.price ? textAt(grid, r, header.price) : '')
    const raw: Record<string, string> = { number: key, status: statusText }
    if (type) raw.type = type
    if (/^re-?sale$/.test(st)) raw.resale = 'true'

    units.push({
      unitKey: key,
      unitType: type,
      bedrooms: bedroomsOf(type),
      areaM2: area,
      landM2: null,
      floor: null,
      status,
      priceUsd: price && price >= 5_000 && price <= 50_000_000 ? price : null,
      pricePerM2: null,
      raw,
    })
  }
  return { units, warnings }
}

type Header = { row: number; key: number; status: number; type?: number; area?: number; price?: number }

function findHeader(grid: Grid): Header | null {
  for (let r = 1; r <= Math.min(grid.rowCount, 30); r++) {
    let key = 0, status = 0, type: number | undefined, area: number | undefined
    const prices: number[] = []
    for (let c = 1; c <= grid.colCount; c++) {
      const t = textAt(grid, r, c).replace(/\s+/g, ' ').trim().toLowerCase()
      if (!t) continue
      if (!key && /^(number|villa no|unit|№)$/.test(t)) key = c
      else if (!status && /^(status|available)$/.test(t)) status = c
      else if (!type && /^(villa )?type$/.test(t)) type = c
      else if (!area && /(room|house|villa) (size|area)/.test(t)) area = c
      else if (/^price now/.test(t)) prices.push(c)
    }
    // Ardhana: подписи площади и цены стоят строкой выше номера и статуса.
    if (key && status) {
      for (let c = 1; c <= grid.colCount; c++) {
        const t = textAt(grid, r - 1, c).replace(/\s+/g, ' ').trim().toLowerCase()
        if (!area && /(room|house|villa) (size|area)/.test(t)) area = c
        if (/^price now/.test(t) && !prices.includes(c)) prices.push(c)
      }
      return { row: r, key, status, type, area, price: pickTotalPrice(grid, r, prices) }
    }
  }
  return null
}

// У Bloom две колонки «Price now*»: за м² и за юнит. Берём ту, где
// значения похожи на цену юнита.
function pickTotalPrice(grid: Grid, headerRow: number, cols: number[]): number | undefined {
  let best: { col: number; median: number } | undefined
  for (const c of cols) {
    const vals: number[] = []
    for (let r = headerRow + 1; r <= grid.rowCount; r++) {
      const n = num(textAt(grid, r, c))
      if (n) vals.push(n)
    }
    if (!vals.length) continue
    vals.sort((a, b) => a - b)
    const median = vals[Math.floor(vals.length / 2)]
    if (median >= 20_000 && (!best || median > best.median)) best = { col: c, median }
  }
  return best?.col
}

function num(text: string): number | null {
  const t = text.replace(/[\s,$]/g, '')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) && n > 0 ? n : null
}

function bedroomsOf(type: string | null): number | null {
  const m = type?.match(/^(\d)\s*(?:br|b)\b/i)
  return m ? Number(m[1]) : null
}
