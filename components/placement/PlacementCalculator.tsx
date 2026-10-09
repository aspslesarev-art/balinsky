'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus, Check, Copy, Mail } from 'lucide-react'

// Цены — тот же прайс, что в документе для застройщиков (2026-10-09).
const PRICE = {
  profile: 300,
  complex: 400,
  unitsIncluded: 20, // юнитов в цене каждого ЖК
  unit: 5,
  news: 250,
  tgChannel: 150,
  tgChat: 50,
  priceUpdate: 50, // в месяц за ЖК
  starterDiscount: 150, // профиль + ЖК + новость = $800 вместо $950
}

const MAX_COMPLEXES = 20
const MAX_UNITS = 2000
const CONTACT_EMAIL = 'i@balinsky.info'

const usd = (n: number) => '$' + n.toLocaleString('ru-RU')

type Line = { label: string; amount: number }

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.round(n)))
}

function Stepper({ label, hint, value, min, max, onChange }: {
  label: string; hint: string; value: number; min: number; max: number; onChange: (n: number) => void
}) {
  const btn = 'w-11 h-11 shrink-0 grid place-items-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] transition-colors duration-[120ms] hover:border-[var(--color-primary)] active:bg-[var(--color-primary-soft)] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
  return (
    <div className="py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
      <div className="flex-1 min-w-0">
        <div className="text-[16px] font-semibold text-[var(--color-text)]">{label}</div>
        <div className="text-[14px] text-[var(--color-text-muted)] mt-0.5">{hint}</div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Уменьшить: ${label}`} className={btn} disabled={value <= min} onClick={() => onChange(clamp(value - 1, min, max))}>
          <Minus size={18} />
        </button>
        <input
          type="number"
          inputMode="numeric"
          aria-label={label}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
          className="w-20 h-11 rounded-xl border border-[var(--color-border)] bg-white text-center text-[16px] font-semibold tabular-nums text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button type="button" aria-label={`Увеличить: ${label}`} className={btn} disabled={value >= max} onClick={() => onChange(clamp(value + 1, min, max))}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}

function Toggle({ label, hint, price, checked, onChange }: {
  label: string; hint: string; price: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="py-4 flex items-start gap-4 cursor-pointer group">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className={`mt-0.5 w-6 h-6 shrink-0 grid place-items-center rounded-md border transition-colors duration-[120ms] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-primary)] ${checked ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'bg-white border-[var(--color-neutral-300)] group-hover:border-[var(--color-primary)]'}`}
      >
        {checked && <Check size={16} strokeWidth={3} />}
      </span>
      <span className="flex-1 min-w-0 sm:flex sm:items-start sm:gap-4">
        <span className="block flex-1 min-w-0">
          <span className="block text-[16px] font-semibold text-[var(--color-text)]">{label}</span>
          <span className="block text-[14px] text-[var(--color-text-muted)] mt-0.5">{hint}</span>
        </span>
        <span className="block mt-1 sm:mt-0 text-[16px] font-semibold tabular-nums text-[var(--color-text)] sm:shrink-0">{price}</span>
      </span>
    </label>
  )
}

export function PlacementCalculator() {
  const [profile, setProfile] = useState(true)
  const [complexes, setComplexes] = useState(1)
  const [units, setUnits] = useState(20)
  const [news, setNews] = useState(true)
  const [tgChannel, setTgChannel] = useState(false)
  const [tgChat, setTgChat] = useState(false)
  const [priceUpdates, setPriceUpdates] = useState(false)
  const [copied, setCopied] = useState(false)
  // Нижняя полоска с итогом прячется, когда сам блок расчёта на экране.
  const asideRef = useRef<HTMLElement>(null)
  const [asideVisible, setAsideVisible] = useState(false)
  useEffect(() => {
    const el = asideRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setAsideVisible(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const calc = useMemo(() => {
    const lines: Line[] = []
    if (profile) lines.push({ label: 'Профиль застройщика', amount: PRICE.profile })
    if (complexes > 0) lines.push({ label: `Жилые комплексы: ${complexes} × ${usd(PRICE.complex)}`, amount: complexes * PRICE.complex })
    const extraUnits = Math.max(0, units - complexes * PRICE.unitsIncluded)
    if (extraUnits > 0) lines.push({ label: `Юниты сверх включённых: ${extraUnits} × ${usd(PRICE.unit)}`, amount: extraUnits * PRICE.unit })
    if (news) lines.push({ label: 'Новость на сайте', amount: PRICE.news })
    if (tgChannel) lines.push({ label: 'Пост в Telegram-канале', amount: PRICE.tgChannel })
    if (tgChat) lines.push({ label: 'Пост в Telegram-чате', amount: PRICE.tgChat })
    const starter = profile && complexes > 0 && news
    if (starter) lines.push({ label: 'Пакет «Старт»: профиль + ЖК + новость', amount: -PRICE.starterDiscount })
    const once = lines.reduce((s, l) => s + l.amount, 0)
    const monthly = priceUpdates ? complexes * PRICE.priceUpdate : 0
    return { lines, once, monthly, extraUnits, starter }
  }, [profile, complexes, units, news, tgChannel, tgChat, priceUpdates])

  const summaryText = [
    'Расчёт размещения на Balinsky',
    ...calc.lines.map((l) => `${l.label}: ${l.amount < 0 ? '−' + usd(-l.amount) : usd(l.amount)}`),
    `Итого разово: ${usd(calc.once)}`,
    calc.monthly > 0 ? `Обновление прайсов: ${usd(calc.monthly)} в месяц` : '',
    `Юнитов всего: ${units}`,
  ].filter(Boolean).join('\n')

  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Размещение на Balinsky')}&body=${encodeURIComponent(summaryText)}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('clipboard write failed', err)
    }
  }

  const empty = calc.lines.length === 0

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
      <div className="rounded-2xl border border-[var(--color-border)] bg-white px-5 md:px-6">
        <div className="divide-y divide-[var(--color-border)]">
          <Toggle
            label="Профиль застройщика"
            hint="Страница компании: о вас, сданные и строящиеся проекты, контакты"
            price={usd(PRICE.profile)}
            checked={profile}
            onChange={setProfile}
          />
          <Stepper
            label="Жилые комплексы"
            hint={`${usd(PRICE.complex)} за ЖК: страница, доходность, карта, район, до ${PRICE.unitsIncluded} юнитов`}
            value={complexes}
            min={0}
            max={MAX_COMPLEXES}
            onChange={setComplexes}
          />
          <Stepper
            label="Юниты, всего"
            hint={`${complexes * PRICE.unitsIncluded} уже в цене ЖК, каждый следующий — ${usd(PRICE.unit)}`}
            value={units}
            min={0}
            max={MAX_UNITS}
            onChange={setUnits}
          />
          <Toggle
            label="Новость на сайте"
            hint="«Новый застройщик на Balinsky» в разделе новостей, на 10 языках"
            price={usd(PRICE.news)}
            checked={news}
            onChange={setNews}
          />
          <Toggle
            label="Пост в Telegram-канале"
            hint="Публикация о вас в канале @itrealtor"
            price={usd(PRICE.tgChannel)}
            checked={tgChannel}
            onChange={setTgChannel}
          />
          <Toggle
            label="Пост в Telegram-чате"
            hint="Публикация о вас в нашем Telegram-чате"
            price={usd(PRICE.tgChat)}
            checked={tgChat}
            onChange={setTgChat}
          />
          <Toggle
            label="Обновление прайсов"
            hint="Каждый месяц сверяем цены и свободные юниты, проданное снимаем"
            price={`${usd(PRICE.priceUpdate)}/мес за ЖК`}
            checked={priceUpdates}
            onChange={setPriceUpdates}
          />
        </div>
      </div>

      <aside ref={asideRef} id="vash-raschet" className="scroll-mt-24 lg:sticky lg:top-24 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-5 md:p-6" aria-live="polite">
        <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] font-semibold mb-4">Ваш расчёт</div>
        {empty ? (
          <p className="text-[14px] text-[var(--color-text-muted)] mb-6">Выберите хотя бы одну услугу слева.</p>
        ) : (
          <ul className="space-y-2.5 mb-5">
            {calc.lines.map((l) => (
              <li key={l.label} className="flex items-start justify-between gap-4 text-[14px]">
                <span className={l.amount < 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}>{l.label}</span>
                <span className={`tabular-nums shrink-0 ${l.amount < 0 ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-text)]'}`}>
                  {l.amount < 0 ? '−' + usd(-l.amount) : usd(l.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-[var(--color-border)] pt-4">
          <div className="text-[14px] text-[var(--color-text-muted)]">Итого разово</div>
          <div className="text-[40px] font-semibold tracking-tight tabular-nums text-[var(--color-text)] leading-[1.1]">{usd(calc.once)}</div>
          {calc.monthly > 0 && (
            <div className="text-[14px] text-[var(--color-text)] mt-1">+ {usd(calc.monthly)} в месяц за обновление прайсов</div>
          )}
          {!calc.starter && profile && complexes > 0 && (
            <div className="text-[14px] text-[var(--color-primary)] mt-3">Добавьте новость — сработает пакет «Старт», скидка {usd(PRICE.starterDiscount)}</div>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <a
            href={mailto}
            aria-disabled={empty}
            className={`h-12 rounded-xl bg-[var(--color-primary)] text-white text-[16px] font-semibold flex items-center justify-center gap-2 no-underline transition-colors duration-[120ms] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${empty ? 'opacity-40 pointer-events-none' : ''}`}
          >
            <Mail size={18} /> Отправить расчёт
          </a>
          <button
            type="button"
            onClick={copy}
            disabled={empty}
            className="h-12 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] text-[16px] font-semibold flex items-center justify-center gap-2 transition-colors duration-[120ms] hover:border-[var(--color-primary)] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {copied ? <><Check size={18} /> Скопировано</> : <><Copy size={18} /> Скопировать расчёт</>}
          </button>
          <p className="text-[13px] text-[var(--color-text-muted)] mt-2">Цены в долларах США. Без процентов со сделок.</p>
        </div>
      </aside>
    </div>

    {/* Телефон: итог всегда под пальцем, полный расчёт — ниже формы */}
    <a
      href="#vash-raschet"
      aria-hidden={asideVisible}
      tabIndex={asideVisible ? -1 : undefined}
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 transition-[transform,opacity] duration-200 motion-reduce:transition-none ${asideVisible ? 'translate-y-full opacity-0 pointer-events-none' : ''} border-t border-[var(--color-border)] bg-white/95 backdrop-blur px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center justify-between gap-4 no-underline shadow-[var(--shadow-popover)]`}
    >
      <span className="min-w-0">
        <span className="block text-[13px] text-[var(--color-text-muted)]">Итого разово{calc.monthly > 0 ? ` + ${usd(calc.monthly)}/мес` : ''}</span>
        <span className="block text-[24px] font-semibold tracking-tight tabular-nums text-[var(--color-text)] leading-[1.15]">{usd(calc.once)}</span>
      </span>
      <span className="h-11 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold flex items-center shrink-0">Смотреть расчёт</span>
    </a>
    </>
  )
}
