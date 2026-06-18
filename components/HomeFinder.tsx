'use client'

// Homepage guided finder: goal → budget → vibe → a live, ranked shortlist.
// Three taps, no typing, instant results — the "easy mode" for a buyer who
// doesn't know Bali districts or legal terms. Filters a pre-ranked villa pool
// (lib/home-finder) in-browser; "Спросить Балину" hands the same intent to the
// AI broker, "Смотреть все" drops into the full catalog with the budget applied.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BedDouble, Square, TrendingUp, Check, ArrowRight, Sparkles } from 'lucide-react'
import type { FinderItem } from '@/lib/home-finder'
import type { Lang } from '@/lib/i18n'
import { BalinaCTA } from './BalinaCTA'

type Goal = 'invest' | 'live' | 'both'
type Vibe = 'surf' | 'ocean' | 'calm' | 'family' | 'any'

const VIBE_DISTRICTS: Record<Vibe, string[] | null> = {
  surf: ['canggu', 'berawa', 'pererenan', 'seseh', 'cemagi', 'nyanyi', 'kedungu', 'umalas', 'kerobokan', 'batu-bolong', 'batu-belig'],
  ocean: ['uluwatu', 'ungasan', 'melasti', 'pandawa', 'gwk', 'bukit', 'jimbaran'],
  calm: ['ubud'],
  family: ['sanur', 'nusa-dua'],
  any: null,
}

const COPY = {
  ru: {
    qGoal: 'Зачем покупаете?',
    goals: { invest: 'Для инвестиций', live: 'Для жизни', both: 'И жить, и сдавать' } as Record<Goal, string>,
    qBudget: 'Бюджет',
    budgets: [['до $200k', 200_000], ['до $400k', 400_000], ['до $700k', 700_000], ['до $1.2M', 1_200_000], ['Без потолка', 0]] as [string, number][],
    qVibe: 'Что вокруг?',
    vibes: { surf: 'Сёрф и тусовка', ocean: 'Океан и виды', calm: 'Тихо и природа', family: 'Семья и пляж', any: 'Не важно' } as Record<Vibe, string>,
    found: (n: number) => `${n} ${plural(n, 'вилла', 'виллы', 'вилл')} под ваш запрос`,
    empty: 'Под такой запрос пока пусто. Ослабьте бюджет или район — или спросите Балину.',
    yield: 'дох.',
    ready: 'Готово',
    seeAll: 'Смотреть все в каталоге',
    askBalina: 'Спросить Балину',
    perMo: '',
  },
  en: {
    qGoal: 'Why are you buying?',
    goals: { invest: 'To invest', live: 'To live', both: 'Live & rent out' } as Record<Goal, string>,
    qBudget: 'Budget',
    budgets: [['up to $200k', 200_000], ['up to $400k', 400_000], ['up to $700k', 700_000], ['up to $1.2M', 1_200_000], ['No cap', 0]] as [string, number][],
    qVibe: 'What\'s around?',
    vibes: { surf: 'Surf & buzz', ocean: 'Ocean & views', calm: 'Calm & nature', family: 'Family & beach', any: 'Any' } as Record<Vibe, string>,
    found: (n: number) => `${n} ${n === 1 ? 'villa' : 'villas'} for your brief`,
    empty: 'Nothing fits yet. Loosen the budget or area — or ask Balina.',
    yield: 'yield',
    ready: 'Ready',
    seeAll: 'See all in the catalog',
    askBalina: 'Ask Balina',
    perMo: '',
  },
} as const

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

function fmtPrice(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1000) return `$${Math.round(n / 1000)}k`
  return `$${n}`
}

function chip(active: boolean): string {
  return (
    'shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13.5px] font-medium border transition-colors cursor-pointer ' +
    (active
      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
      : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]')
  )
}

export function HomeFinder({ items, lang = 'ru' }: { items: FinderItem[]; lang?: Lang }) {
  const c = COPY[lang]
  const [goal, setGoal] = useState<Goal | null>(null)
  const [budget, setBudget] = useState<number | null>(null) // 0 = no cap
  const [vibe, setVibe] = useState<Vibe | null>(null)

  const results = useMemo(() => {
    const districts = vibe ? VIBE_DISTRICTS[vibe] : null
    let list = items.filter(it => {
      if (budget && budget > 0 && (it.priceUsd == null || it.priceUsd > budget)) return false
      if (districts && (!it.district || !districts.includes(it.district))) return false
      return true
    })
    // Invest-minded buyers want yield first — but rank by OUR cap rate, not
    // the developer's claimed yield (inflated, esp. inland Ubud). Listings
    // with no cap rate we can stand behind (incl. yellow land) sort last.
    if (goal === 'invest' || goal === 'both') {
      list = [...list].sort((a, b) => (b.capRatePct ?? -1) - (a.capRatePct ?? -1))
    }
    return list
  }, [items, goal, budget, vibe])

  const top = results.slice(0, 6)
  const root = lang === 'en' ? '/en/villas' : '/ru/villy'
  const seeAllHref = budget && budget > 0 ? `${root}?price_max=${budget}` : root

  const balinaText = (() => {
    const parts: string[] = ['Подбери виллу']
    if (lang === 'en') parts[0] = 'Find me a villa'
    if (goal) parts.push(lang === 'en' ? `(${c.goals[goal].toLowerCase()})` : c.goals[goal].toLowerCase())
    if (budget && budget > 0) parts.push(lang === 'en' ? `up to ${fmtPrice(budget)}` : `до ${fmtPrice(budget)}`)
    if (vibe && vibe !== 'any') parts.push(c.vibes[vibe].toLowerCase())
    return parts.join(' ') + '.'
  })()

  return (
    <div>
      <ChipRow label={c.qGoal}>
        {(Object.keys(c.goals) as Goal[]).map(g => (
          <button key={g} type="button" className={chip(goal === g)} onClick={() => setGoal(goal === g ? null : g)}>{c.goals[g]}</button>
        ))}
      </ChipRow>
      <ChipRow label={c.qBudget}>
        {c.budgets.map(([lbl, val]) => (
          <button key={lbl} type="button" className={chip(budget === val)} onClick={() => setBudget(budget === val ? null : val)}>{lbl}</button>
        ))}
      </ChipRow>
      <ChipRow label={c.qVibe}>
        {(Object.keys(c.vibes) as Vibe[]).map(v => (
          <button key={v} type="button" className={chip(vibe === v)} onClick={() => setVibe(vibe === v ? null : v)}>{c.vibes[v]}</button>
        ))}
      </ChipRow>

      {/* Results panel — a closed, framed container so it's unmistakable
          where the finder's filtered output ends. The rails further down the
          homepage ("Только виллы с готовыми документами", "Лучшее в бюджете"
          …) are independent showcases, NOT finder results — without this
          frame a single match reads as if those over-budget / wrong-district
          cards below belong to the query too. */}
      <div className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-search-bg)]/50 p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[14px] font-medium text-[var(--color-text)]">{c.found(results.length)}</div>
        <BalinaCTA
          text={balinaText}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] text-[13px] font-medium hover:bg-[var(--color-primary)] hover:text-white transition-colors cursor-pointer"
        >
          <Sparkles size={14} /> {c.askBalina}
        </BalinaCTA>
      </div>

      {top.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center text-[14px] text-[var(--color-text-muted)]">
          {c.empty}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {top.map(it => (
              <Link
                key={it.slug}
                href={`${root}/o/${it.slug}`}
                className="group block rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="relative w-full aspect-[4/3] bg-[var(--color-search-bg)]">
                  {it.cover ? (
                    <Image src={it.cover} alt={it.title} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🏝️</div>
                  )}
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-black/65 text-white text-[13px] font-semibold backdrop-blur-sm">
                    {fmtPrice(it.priceUsd)}
                  </div>
                  {it.ready && (
                    <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-[10.5px] font-semibold">
                      <Check size={11} strokeWidth={3} /> {c.ready}
                    </div>
                  )}
                  {it.yieldPct != null && (
                    <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 text-[var(--color-primary-pressed)] text-[10.5px] font-semibold backdrop-blur-sm">
                      <TrendingUp size={11} /> {it.yieldPct.toFixed(it.yieldPct >= 10 ? 0 : 1)}% {c.yield}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-[13.5px] font-medium leading-snug line-clamp-2 min-h-[2.6em]">{it.title}</div>
                  <div className="mt-1.5 flex items-center gap-3 text-[12px] text-[var(--color-text-muted)]">
                    {it.bedrooms != null && <span className="inline-flex items-center gap-1"><BedDouble size={13} /> {it.bedrooms}</span>}
                    {it.area != null && <span className="inline-flex items-center gap-1"><Square size={12} /> {it.area} м²</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <Link href={seeAllHref} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-primary)] hover:gap-2.5 transition-all no-underline">
              {c.seeAll} <ArrowRight size={16} />
            </Link>
          </div>
        </>
      )}
      </div>
    </div>
  )
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <span className="shrink-0 w-[92px] text-[12.5px] text-[var(--color-text-muted)] hidden sm:block">{label}</span>
      <div className="flex gap-2 overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0 sm:flex-wrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  )
}
