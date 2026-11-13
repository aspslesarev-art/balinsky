// Названия соседей с Booking собраны по-русски («Двухместный номер Делюкс»).
// Английский словарь {ru: en} лежит в Storage competitors/_names-en.json,
// переведён вручную (без платных нейросетей, 14.11.2026). На не-RU страницах
// подменяем имя, комплекс и вариант; чего нет в словаре — остаётся как было.
import type { InvestmentSnapshot, NearbyMatchCard } from './investment/snapshot'

const URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/competitors/_names-en.json`

let _names: { ts: number; data: Record<string, string> } | null = null

async function loadNamesEn(): Promise<Record<string, string>> {
  if (_names && Date.now() - _names.ts < 10 * 60 * 1000) return _names.data
  try {
    const r = await fetch(URL, { next: { revalidate: 604800, tags: ['content:rental'] } })
    const data = r.ok ? ((await r.json()) as Record<string, string>) : {}
    _names = { ts: Date.now(), data }
    return data
  } catch (e) {
    console.error('[competitor-names-en] load failed:', e)
    return _names?.data ?? {}
  }
}

const tr = (names: Record<string, string>, s: string | null | undefined) =>
  s ? names[s] ?? names[s.trim()] ?? s : (s ?? null)

function card(names: Record<string, string>, c: NearbyMatchCard): NearbyMatchCard {
  return {
    ...c,
    name: tr(names, c.name) ?? c.name,
    complex: tr(names, c.complex),
    facts: c.facts ? { ...c.facts, roomType: tr(names, c.facts.roomType) } : c.facts,
  }
}

export async function localizeSnapshot<T extends InvestmentSnapshot | null>(snap: T, lang: string): Promise<T> {
  if (!snap || lang === 'ru') return snap
  const names = await loadNamesEn()
  if (Object.keys(names).length === 0) return snap
  return {
    ...snap,
    competitors: snap.competitors.map(c => card(names, c)),
    references: snap.references ? snap.references.map(c => card(names, c)) : snap.references,
  }
}
