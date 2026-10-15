// Поиск по каталогам (виллы, апартаменты, комплексы).
//
// Раньше это был один нечёткий поиск Fuse по всему тексту объекта вместе с
// описанием: «maison» находил «Mansion» и «Oma Sora», а «bohem» — одну виллу
// из девяти (жалоба владельца 15.10.2026). Теперь так:
//   1. Каждое слово запроса должно найтись в объекте — как начало слова или
//      часть слова в названии, комплексе, районе, застройщике (`primary`) или
//      в описании (`secondary`). Порядок: сначала совпало в `primary`, ближе к
//      началу слова, потом остальное.
//   2. Только если точных совпадений нет — нечёткий поиск с опечатками, но
//      уже без описания: оно длинное и само по себе «похоже» на что угодно.
// Кириллица в запросе дополнительно ищется транслитом («санур» → sanur).
import Fuse from 'fuse.js'
import { translit, hasCyrillic } from './translit'

export type SearchDoc<T> = { row: T; id: string; primary: string[]; secondary?: string[] }

const norm = (s: string) => s.toLowerCase().replace(/[’'`]/g, '').replace(/ё/g, 'е')
const words = (s: string) => norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean)

export function searchCatalog<T>(docs: SearchDoc<T>[], rawQuery: string): T[] {
  const q = norm(rawQuery.trim())
  if (!q) return docs.map(d => d.row)
  const variants = [q]
  if (hasCyrillic(q)) variants.push(norm(translit(q)))

  const prepared = docs.map(d => {
    const p = d.primary.filter(Boolean).join(' ')
    const s = (d.secondary ?? []).filter(Boolean).join(' ')
    const primary = norm(`${p} ${translit(p)} ${d.id}`)
    return { d, primary, primaryWords: words(primary), secondary: norm(`${s} ${translit(s)}`) }
  })

  // 1. Точные совпадения по словам.
  const scored: { row: T; score: number }[] = []
  for (const it of prepared) {
    let best: number | null = null
    for (const v of variants) {
      const qw = words(v)
      if (!qw.length) continue
      let score = 0
      let ok = true
      for (const w of qw) {
        if (it.primaryWords.some(x => x.startsWith(w))) score += 0
        else if (it.primary.includes(w)) score += 1
        else if (it.secondary.includes(w)) score += 3
        else { ok = false; break }
      }
      if (ok && (best == null || score < best)) best = score
    }
    if (best != null) scored.push({ row: it.d.row, score: best })
  }
  if (scored.length) return scored.sort((a, b) => a.score - b.score).map(x => x.row)

  // 2. Опечатки — только по названию, комплексу, району и застройщику.
  // Транслит русского написания латинского названия неточен («мейсон» →
  // meyson, а не maison), поэтому для него допуск шире.
  const strict = new Fuse(prepared, { keys: ['primary'], threshold: 0.3, ignoreLocation: true, minMatchCharLength: 3, includeScore: true })
  const loose = new Fuse(prepared, { keys: ['primary'], threshold: 0.45, ignoreLocation: true, minMatchCharLength: 3, includeScore: true })
  const best = new Map<T, number>()
  for (const [i, v] of variants.entries()) {
    for (const m of (i === 0 ? strict : loose).search(v)) {
      const s = m.score ?? 1
      const prev = best.get(m.item.d.row)
      if (prev == null || s < prev) best.set(m.item.d.row, s)
    }
  }
  return [...best.entries()].sort((a, b) => a[1] - b[1]).map(([row]) => row)
}
