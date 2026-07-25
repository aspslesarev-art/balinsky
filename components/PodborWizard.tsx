'use client'
// /podbor — a deliberately tiny, ADHD-friendly finder: one decision per screen,
// big tap targets, immediate payoff. Two doors (invest / family) → budget →
// three best matches. Filters a pre-loaded pool client-side (no round-trips).
import { useState } from 'react'
import { PiggyBank, Home, ArrowLeft, BedDouble, Maximize2, MapPin } from 'lucide-react'
import type { PodborItem } from '@/lib/home-collections'
import type { Lang } from '@/lib/i18n'
import { pickCopy } from '@/lib/i18n'

type Intent = 'invest' | 'family'
type Step = 'intent' | 'budget' | 'results'

const BUDGETS = [200_000, 300_000, 500_000] as const

const COPY = {
  ru: {
    title: 'Подбор за 2 шага', step: (n: number) => `Шаг ${n} из 2`,
    q1: 'Что ищем?', invest: 'Инвестиции', investSub: 'сдавать и зарабатывать',
    family: 'Жильё для семьи', familySub: 'жить всей семьёй',
    q2: 'Какой бюджет?', upTo: (s: string) => `до ${s}`, anyBudget: 'Бюджет неважен',
    results: 'Вот 3 варианта', nothing: 'Под эти условия ничего не нашлось',
    changeBudget: 'Другой бюджет', allAreas: 'Все районы',
    more: 'Показать ещё', restart: 'Начать заново', back: 'Назад',
    from: 'от', beds: (n: number) => `${n} спл.`, sqm: (n: number) => `${n} м²`,
    neighborNote: 'Доходность и заработок соседних вилл и отелей — на странице объекта.',
  },
  en: {
    title: 'Find it in 2 steps', step: (n: number) => `Step ${n} of 2`,
    q1: 'What are you after?', invest: 'Investment', investSub: 'rent it out, earn',
    family: 'A family home', familySub: 'live here with family',
    q2: 'Your budget?', upTo: (s: string) => `up to ${s}`, anyBudget: 'Budget doesn’t matter',
    results: 'Here are 3 options', nothing: 'Nothing matched these filters',
    changeBudget: 'Other budget', allAreas: 'All areas',
    more: 'Show more', restart: 'Start over', back: 'Back',
    from: 'from', beds: (n: number) => `${n} bd`, sqm: (n: number) => `${n} m²`,
    neighborNote: 'Yield and what neighbouring villas & hotels earn — on the listing page.',
  },
} as const

function fmtUsd(v: number): string {
  return v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
}

function detailHref(item: PodborItem): string {
  const seg = item.type === 'villa' ? 'villy' : 'apartamenty'
  return `/ru/${seg}/o/${item.slug}`
}

export function PodborWizard({ items, lang = 'ru' }: { items: PodborItem[]; lang?: Lang }) {
  const c = pickCopy(COPY, lang)
  const [step, setStep] = useState<Step>('intent')
  const [intent, setIntent] = useState<Intent | null>(null)
  const [budget, setBudget] = useState<number | null>(null)
  const [district, setDistrict] = useState<string | null>(null)
  const [limit, setLimit] = useState(3)

  const chooseIntent = (i: Intent) => { setIntent(i); setStep('budget') }
  const chooseBudget = (b: number | null) => { setBudget(b); setDistrict(null); setLimit(3); setStep('results') }
  const restart = () => { setStep('intent'); setIntent(null); setBudget(null); setDistrict(null); setLimit(3) }

  // Pool filtered by budget only — drives both the district chips and results.
  const byBudget = items.filter((it) => it.priceUsd != null && (budget == null || it.priceUsd <= budget))
  const districts = Array.from(
    new Map(byBudget.map((it) => [it.districtSlug, it.districtName])).entries(),
  ).map(([slug, name]) => ({ slug, name }))

  let matched = district ? byBudget.filter((it) => it.districtSlug === district) : byBudget
  if (intent === 'family') {
    // Family cares about space first, then price; invest keeps the smart/
    // investment rank the pool already arrives in.
    matched = [...matched].sort(
      (a, b) => (b.bedrooms ?? 0) - (a.bedrooms ?? 0) || (a.priceUsd ?? 0) - (b.priceUsd ?? 0),
    )
  }
  const shown = matched.slice(0, limit)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-[#111827]">{c.title}</h1>
        <Dots active={step === 'intent' ? 1 : step === 'budget' ? 2 : 3} />
      </div>

      {step === 'intent' && (
        <div className="grid grid-cols-1 gap-4">
          <p className="text-[15px] text-[var(--color-text-muted)]">{c.q1}</p>
          <Door Icon={PiggyBank} title={c.invest} sub={c.investSub} onClick={() => chooseIntent('invest')} />
          <Door Icon={Home} title={c.family} sub={c.familySub} onClick={() => chooseIntent('family')} />
        </div>
      )}

      {step === 'budget' && (
        <div>
          <button onClick={() => setStep('intent')} className="mb-4 inline-flex items-center gap-1.5 text-[14px] text-[var(--color-text-muted)] hover:text-[#111827]">
            <ArrowLeft size={16} /> {c.back}
          </button>
          <p className="mb-4 text-[15px] text-[var(--color-text-muted)]">{c.q2}</p>
          <div className="grid grid-cols-1 gap-3">
            {BUDGETS.map((b) => (
              <BigChip key={b} label={c.upTo(fmtUsd(b))} onClick={() => chooseBudget(b)} />
            ))}
            <BigChip label={c.anyBudget} onClick={() => chooseBudget(null)} muted />
          </div>
        </div>
      )}

      {step === 'results' && (
        <div>
          <button onClick={() => setStep('budget')} className="mb-4 inline-flex items-center gap-1.5 text-[14px] text-[var(--color-text-muted)] hover:text-[#111827]">
            <ArrowLeft size={16} /> {c.changeBudget}
          </button>
          <h2 className="mb-4 text-[18px] font-semibold text-[#111827]">{c.results}</h2>

          {districts.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2">
              <FilterChip label={c.allAreas} active={district == null} onClick={() => { setDistrict(null); setLimit(3) }} />
              {districts.map((d) => (
                <FilterChip key={d.slug} label={d.name} active={district === d.slug} onClick={() => { setDistrict(d.slug); setLimit(3) }} />
              ))}
            </div>
          )}

          {shown.length === 0 ? (
            <p className="rounded-2xl border border-[var(--color-border)] bg-white p-6 text-center text-[15px] text-[var(--color-text-muted)]">{c.nothing}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {shown.map((it) => (
                <ResultCard key={`${it.type}:${it.slug}`} item={it} c={c} />
              ))}
            </div>
          )}

          {matched.length > shown.length && (
            <button onClick={() => setLimit((n) => n + 3)} className="mt-5 w-full rounded-xl border border-[var(--color-border)] bg-white py-3 text-[15px] font-medium text-[#111827] hover:border-[var(--color-primary)]">
              {c.more}
            </button>
          )}

          {intent === 'invest' && shown.length > 0 && (
            <p className="mt-4 text-[13px] text-[var(--color-text-muted)]">{c.neighborNote}</p>
          )}

          <button onClick={restart} className="mt-6 text-[14px] text-[var(--color-text-muted)] underline hover:text-[#111827]">
            {c.restart}
          </button>
        </div>
      )}
    </div>
  )
}

function Dots({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`h-2 w-2 rounded-full ${n <= active ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
      ))}
    </div>
  )
}

function Door({ Icon, title, sub, onClick }: { Icon: typeof Home; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-6 text-left transition hover:border-[var(--color-primary)] hover:shadow-sm">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-search-bg)]">
        <Icon size={28} className="text-[var(--color-primary)]" />
      </span>
      <span className="min-w-0">
        <span className="block text-[19px] font-semibold text-[#111827]">{title}</span>
        <span className="block text-[14px] text-[var(--color-text-muted)]">{sub}</span>
      </span>
    </button>
  )
}

function BigChip({ label, onClick, muted }: { label: string; onClick: () => void; muted?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full rounded-2xl border border-[var(--color-border)] bg-white px-6 py-5 text-left text-[17px] font-semibold transition hover:border-[var(--color-primary)] hover:shadow-sm ${muted ? 'text-[var(--color-text-muted)]' : 'text-[#111827]'}`}>
      {label}
    </button>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-full px-4 py-2 text-[14px] font-medium transition ${active ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] bg-white text-[#111827] hover:border-[var(--color-primary)]'}`}>
      {label}
    </button>
  )
}

type Copy = (typeof COPY)[keyof typeof COPY]

function ResultCard({ item, c }: { item: PodborItem; c: Copy }) {
  return (
    <a href={detailHref(item)} className="group block overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white transition hover:border-[var(--color-primary)] hover:shadow-sm">
      <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--color-search-bg)]">
        {item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover} alt={item.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        ) : null}
      </div>
      <div className="p-4">
        <div className="mb-1 flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
          <MapPin size={12} /> {item.districtName}
        </div>
        <div className="mb-2 line-clamp-2 text-[14px] font-medium text-[#111827]">{item.title}</div>
        {item.priceUsd != null && (
          <div className="text-[18px] font-semibold text-[#16A34A]">
            {c.from} {fmtUsd(item.priceUsd)}
          </div>
        )}
        <div className="mt-1 flex items-center gap-3 text-[12.5px] text-[var(--color-text-muted)]">
          {item.bedrooms != null && <span className="inline-flex items-center gap-1"><BedDouble size={13} /> {c.beds(item.bedrooms)}</span>}
          {item.area != null && <span className="inline-flex items-center gap-1"><Maximize2 size={13} /> {c.sqm(item.area)}</span>}
        </div>
      </div>
    </a>
  )
}
