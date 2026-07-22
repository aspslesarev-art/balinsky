'use client'

// Semantic search hero page. Big textbox + grid of result cards.
// Investor describes their dream property in natural Russian; we
// embed the query and surface the closest matches across villas,
// apartments and complexes.

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Sparkles, ArrowRight } from 'lucide-react'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

type Card = {
  kind: 'villa' | 'apartment' | 'complex'
  airtable_id: string
  slug: string | null
  title: string
  district: string | null
  bedrooms: number | null
  area: number | null
  priceUsd: number | null
  photo: string | null
  distance: number
  href: string
}

const SUGGESTIONS = [
  'вилла с инфинити-бассейном рядом с океаном в Чангу до 600k',
  'апартамент 2 спальни в Убуде среди джунглей для сдачи',
  'дом для семьи с двумя детьми, тихое место, школа рядом',
  'инвестиция до 250k с хорошей доходностью',
]

export function SemanticSearchClient({ lang }: { lang: Lang }) {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<Card[] | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const c = pickCopy({
    en: {
      title: 'Describe your dream property',
      hint: 'Type freely — we find by meaning, not just filters.',
      placeholder: 'e.g. villa with infinity pool 5 min from beach in Canggu, under $600k',
      cta: 'Find',
      busy: 'Searching…',
      examples: 'Try:',
      empty: 'No matches yet — try rephrasing or broadening.',
      headline: (n: number) => `${n} matches`,
    },
    ru: {
      title: 'Опишите идеальный объект',
      hint: 'Пишите как угодно — ищем по смыслу, а не по галочкам в фильтре.',
      placeholder: 'например, вилла с инфинити-бассейном в 5 минутах от океана в Чангу до $600k',
      cta: 'Найти',
      busy: 'Ищем…',
      examples: 'Попробуйте:',
      empty: 'Ничего не нашли — попробуй переформулировать.',
      headline: (n: number) => `${n} ${n === 1 ? 'совпадение' : n < 5 ? 'совпадения' : 'совпадений'}`,
    },
    id: {
      title: 'Jelaskan properti impian Anda',
      hint: 'Tulis dengan bebas — kami mencari berdasarkan makna, bukan sekadar filter.',
      placeholder: 'mis. vila dengan kolam infinity 5 menit dari pantai di Canggu, di bawah $600k',
      cta: 'Cari',
      busy: 'Mencari…',
      examples: 'Coba:',
      empty: 'Belum ada yang cocok — coba ubah kata atau perluas pencarian.',
      headline: (n: number) => `${n} hasil`,
    },
    fr: {
      title: 'Décrivez le bien de vos rêves',
      hint: 'Écrivez librement — nous cherchons par le sens, pas seulement par filtres.',
      placeholder: 'ex. villa avec piscine à débordement à 5 min de la plage à Canggu, moins de $600k',
      cta: 'Rechercher',
      busy: 'Recherche…',
      examples: 'Essayez :',
      empty: 'Aucun résultat — reformulez ou élargissez la recherche.',
      headline: (n: number) => `${n} résultats`,
    },
    de: {
      title: 'Beschreiben Sie Ihre Traumimmobilie',
      hint: 'Schreiben Sie frei — wir suchen nach Bedeutung, nicht nur nach Filtern.',
      placeholder: 'z. B. Villa mit Infinity-Pool 5 Min. vom Strand in Canggu, unter $600k',
      cta: 'Suchen',
      busy: 'Suche…',
      examples: 'Versuchen Sie:',
      empty: 'Noch keine Treffer — formulieren Sie um oder erweitern Sie die Suche.',
      headline: (n: number) => `${n} Treffer`,
    },
    zh: {
      title: '描述您理想的房产',
      hint: '自由输入——我们按语义查找，而不仅仅是筛选条件。',
      placeholder: '例如：Canggu 海滩 5 分钟车程、带无边泳池的别墅，$600k 以内',
      cta: '查找',
      busy: '搜索中…',
      examples: '试试：',
      empty: '暂无匹配——试试换个说法或放宽条件。',
      headline: (n: number) => `${n} 个匹配结果`,
    },
    nl: {
      title: 'Beschrijf uw droomwoning',
      hint: 'Schrijf vrijuit — we zoeken op betekenis, niet alleen op filters.',
      placeholder: 'bijv. villa met infinity pool 5 min van het strand in Canggu, onder $600k',
      cta: 'Zoeken',
      busy: 'Zoeken…',
      examples: 'Probeer:',
      empty: 'Nog geen resultaten — herformuleer of verbreed de zoekopdracht.',
      headline: (n: number) => `${n} resultaten`,
    },
    ban: {
      title: 'Sambatang properti sane kaaptiang',
      hint: 'Nulisang sakita arep — tiang ngrereh manut arti, boya ja saking filter kemanten.',
      placeholder: 'conto: vila madue kolam infinity 5 menit saking pasih ring Canggu, kirang saking $600k',
      cta: 'Rereh',
      busy: 'Ngrereh…',
      examples: 'Cobain:',
      empty: 'Durung wenten sane cocok — cobain ubah kruna utawi linggahang panyeledikan.',
      headline: (n: number) => `${n} hasil`,
    },
    pl: {
      title: 'Opisz swoją wymarzoną nieruchomość',
      hint: 'Pisz swobodnie — szukamy po znaczeniu, nie tylko po filtrach.',
      placeholder: 'np. willa z basenem infinity 5 min od plaży w Canggu, poniżej $600k',
      cta: 'Znajdź',
      busy: 'Szukamy…',
      examples: 'Spróbuj:',
      empty: 'Brak wyników — spróbuj przeformułować lub poszerzyć zapytanie.',
      headline: (n: number) => `${n} dopasowań`,
    },
    uk: {
      title: 'Опишіть ідеальний об’єкт',
      hint: 'Пишіть як завгодно — шукаємо за змістом, а не за галочками у фільтрі.',
      placeholder: 'наприклад, вілла з інфініті-басейном за 5 хвилин від океану в Чангу до $600k',
      cta: 'Знайти',
      busy: 'Шукаємо…',
      examples: 'Спробуйте:',
      empty: 'Нічого не знайшли — спробуйте переформулювати або розширити запит.',
      headline: (n: number) => `${n} збігів`,
    },
  }, lang)

  async function submit(text?: string) {
    const q = (text ?? query).trim()
    if (q.length < 3) return
    setBusy(true); setErrorMsg(null)
    try {
      const r = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, limit: 20 }),
      })
      if (!r.ok) throw new Error(`http_${r.status}`)
      const data = await r.json() as { results: Card[] }
      setResults(data.results)
    } catch (e) {
      setErrorMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  function applySuggestion(s: string) {
    setQuery(s)
    submit(s)
    inputRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <main className="max-w-[1180px] mx-auto px-5 sm:px-8 py-10 sm:py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-[12px] font-medium mb-4">
            <Sparkles size={13} /> AI-поиск
          </div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold tracking-tight leading-[1.1] mb-3">
            {c.title}
          </h1>
          <p className="text-[14px] sm:text-[15.5px] text-[var(--color-text-muted)] max-w-[640px] mx-auto">
            {c.hint}
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); submit() }}
          className="mx-auto max-w-[720px] bg-white border border-[var(--color-border)] rounded-2xl shadow-sm focus-within:border-[var(--color-primary)] focus-within:shadow-md transition-shadow"
        >
          <textarea
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={c.placeholder}
            rows={3}
            className="w-full resize-none px-5 py-4 text-[15px] bg-transparent rounded-2xl focus:outline-none placeholder:text-[#9CA3AF]"
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit() } }}
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="text-[11.5px] text-[#9CA3AF] pl-2">⌘+Enter</div>
            <button
              type="submit"
              disabled={busy || query.trim().length < 3}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium text-[14px] disabled:opacity-50"
            >
              <Search size={15} />
              {busy ? c.busy : c.cta}
            </button>
          </div>
        </form>

        {results == null && (
          <div className="mt-6 text-center">
            <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] mb-2.5">{c.examples}</div>
            <div className="flex flex-wrap justify-center gap-2 max-w-[860px] mx-auto">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="px-3.5 py-2 rounded-full bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[12.5px] text-[var(--color-text)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mt-6 text-center text-[13px] text-red-600">Ошибка: {errorMsg}</div>
        )}

        {results && results.length === 0 && !busy && (
          <div className="mt-12 text-center text-[14px] text-[var(--color-text-muted)]">{c.empty}</div>
        )}

        {results && results.length > 0 && (
          <div className="mt-10">
            <div className="text-[12.5px] uppercase tracking-wide text-[#6B7280] mb-3">
              {c.headline(results.length)}
            </div>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {results.map(r => (
                <li key={`${r.kind}:${r.airtable_id}`}>
                  <Link
                    href={r.href}
                    className="block bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)] rounded-2xl overflow-hidden no-underline text-[var(--color-text)] transition-colors"
                  >
                    {r.photo ? (
                      <div className="relative w-full aspect-[4/3]">
                        <Image src={r.photo} alt={r.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/3] bg-[#F3F4F6]" />
                    )}
                    <div className="p-3">
                      <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] mb-1">
                        {r.kind === 'villa' ? 'Вилла' : r.kind === 'apartment' ? 'Апартамент' : 'Жилой комплекс'}
                        {r.district && <> · {r.district}</>}
                      </div>
                      <div className="text-[13px] font-medium leading-snug mb-1 line-clamp-2">{r.title}</div>
                      <div className="text-[12px] text-[#6B7280] mb-1 flex items-center gap-1 flex-wrap">
                        {r.bedrooms != null && <span>{r.bedrooms} BR</span>}
                        {r.area != null && <span>· {r.area} м²</span>}
                      </div>
                      {r.priceUsd != null && (
                        <div className="text-[14px] font-semibold text-[#16A34A]">
                          ${r.priceUsd.toLocaleString('en-US')}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href={switchLangPath('/ru', lang)} className="text-[13px] text-[#6B7280] hover:text-[var(--color-primary)] inline-flex items-center gap-1">
            <ArrowRight size={13} className="rotate-180" /> {pickCopy({ ru: 'К каталогу', en: 'Back to catalog', id: 'Ke katalog', fr: 'Retour au catalogue', de: 'Zurück zum Katalog', zh: '返回目录', nl: 'Terug naar catalogus', ban: 'Mawali ka katalog', pl: 'Powrót do katalogu', uk: 'До каталогу' }, lang)}
          </Link>
        </div>
      </main>
    </div>
  )
}
