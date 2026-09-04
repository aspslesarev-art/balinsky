// Факты объекта в том виде, в каком они показываются на карточке.
// Один список на публичную страницу и на форму — чтобы агент видел ровно то,
// что увидит его клиент.

import type { AgentListing } from './types'
import { districtRu } from '@/lib/district-ru'

export type Fact = { label: string; value: string }

function str(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return str(v[0])
  if (v && typeof v === 'object' && 'value' in v) return str((v as { value: unknown }).value)
  return null
}

export function listingFacts(listing: AgentListing): Fact[] {
  const d = listing.data
  const out: Fact[] = []
  const push = (label: string, value: string | null | undefined) => {
    if (value) out.push({ label, value })
  }

  const district = str(d['Location 2']) ?? str(d['Location']) ?? str(d['Location filter'])
  push('Район', district ? (districtRu(district) ?? district) : null)
  push('Комплекс', str(d['Комплекс 1']))
  push('Спальни', str(d['Комнаты']))
  const area = str(d['Площадь'])
  push('Площадь', area ? `${area} м²` : null)
  const land = str(d['Земля'])
  push('Участок', land ? `${land} м²` : null)
  push('Этаж', str(d['Этаж']))
  const leasehold = str(d['Leasehold'])
  push('Leasehold', leasehold ? `${leasehold} лет` : null)
  push('Разрешение', str(d['Разрешение']))
  push('Статус', str(d['Статус']))
  push('Сдача', str(d['Year of completion']))
  push('Застройщик', str(d['Developer1']))
  return out
}
