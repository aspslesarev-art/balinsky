// Адаптер под сайт VIBE Development (vibedevelopment.pro).
//
// Сайт — SPA: страница проекта приезжает пустой, а инвентарь подтягивает
// из собственного публичного Supabase тем же анонимным ключом, что зашит
// в клиентский код сайта. Мы читаем ровно те же строки, что видит любой
// посетитель, только без браузера — иначе крон такой источник не потянет.

import type { ExtractResult, ScrapedUnit, UnitStatus } from '../types'

const REST = 'https://wpaqyhvhvazhskxjinip.supabase.co/rest/v1'

// Публичный anon-ключ их сайта: он открыто лежит в бандле и нужен, чтобы
// PostgREST вообще ответил. Не секрет и ничего не открывает сверх того,
// что отдаётся посетителю.
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwYXF5aHZodmF6aHNreGppbmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1MjkyODUsImV4cCI6MjA0ODEwNTI4NX0.UfjL0X--ZcDtO_L-5uVyOI-lI4gq1MgGO3sg_SGny5g'

const STATUS_MAP: Record<string, UnitStatus> = {
  sold: 'sold',
  reserved: 'reserved',
  booked: 'reserved',
  available: 'available',
  'for sale': 'available',
}

type VibeUnit = {
  unit_number?: string | null
  unit_name?: string | null
  unit_type?: string | null
  area?: string | number | null
  bedrooms?: string | number | null
  price?: string | number | null
  is_available?: boolean | null
  status?: string | null
  floor_number?: string | number | null
}

export function isVibeSource(sourceUrl: string): boolean {
  return /vibedevelopment\.pro\/project\//i.test(sourceUrl)
}

export async function scrapeVibe(sourceUrl: string): Promise<ExtractResult> {
  const slug = sourceUrl.match(/\/project\/([a-z0-9-]+)/i)?.[1]
  if (!slug) throw new Error('в ссылке VIBE не нашёлся код проекта (/project/<slug>)')

  const projects = await get<Array<{ id: string }>>(`projects?select=id&slug=eq.${encodeURIComponent(slug)}`)
  const projectId = projects[0]?.id
  if (!projectId) throw new Error(`проект «${slug}» не найден в каталоге VIBE`)

  const rows = await get<VibeUnit[]>(
    `project_units?select=unit_number,unit_name,unit_type,area,bedrooms,price,is_available,status,floor_number` +
      `&project_id=eq.${projectId}&order=display_order.asc`,
  )
  if (!rows.length) throw new Error('в каталоге VIBE у этого проекта нет ни одного юнита')

  const warnings: string[] = []
  const units: ScrapedUnit[] = rows.map((u, i) => {
    const areaM2 = numOrNull(u.area)
    const priceUsd = numOrNull(u.price)
    return {
      unitKey: String(u.unit_number ?? '').trim() || `unit-${i + 1}`,
      unitType: u.unit_type?.trim() || null,
      bedrooms: intOrNull(u.bedrooms),
      areaM2,
      landM2: null,
      floor: u.floor_number === null || u.floor_number === undefined ? null : String(u.floor_number),
      status: resolveStatus(u),
      priceUsd,
      pricePerM2: priceUsd && areaM2 ? Math.round(priceUsd / areaM2) : null,
      raw: { unitName: String(u.unit_name ?? ''), status: String(u.status ?? '') },
    }
  })

  const unknown = units.filter(u => u.status === 'unknown').length
  if (unknown) warnings.push(`${unknown} юнитов с незнакомым статусом на сайте`)

  return { units, warnings }
}

// Статус текстом точнее флага: флаг лишь делит на «можно купить» и «нет»,
// а нам важно отличать бронь от продажи.
function resolveStatus(u: VibeUnit): UnitStatus {
  const named = STATUS_MAP[String(u.status ?? '').trim().toLowerCase()]
  if (named) return named
  if (u.is_available === true) return 'available'
  if (u.is_available === false) return 'sold'
  return 'unknown'
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${REST}/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  })
  if (!r.ok) throw new Error(`каталог VIBE вернул ${r.status}`)
  return (await r.json()) as T
}

// Цены на сайте приходят строкой с разделителями разрядов: "345,000".
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function intOrNull(v: unknown): number | null {
  const n = numOrNull(v)
  return n === null ? null : Math.round(n)
}
