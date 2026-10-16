'use client'

// Переключатель «Для дохода / Для жизни» над итогом объекта. Оба итога
// приходят с сервера готовыми, переключатель только показывает нужный.
// В режиме «Для жизни» главы про аренду и доходность (#arenda, #dokhodnost)
// прячутся стилем из globals.css по html[data-goal="live"].
// Выбор помнится (localStorage); пришёл с фильтра «Для жизни» — сразу он.
import { useEffect, useState, type ReactNode } from 'react'
import { pickCopy, type Lang } from '@/lib/i18n'

type Goal = 'income' | 'live'
const KEY = 'balinsky.goal'

const COPY = {
  ru: { income: 'Для дохода', live: 'Для жизни', label: 'Зачем покупаете' },
  en: { income: 'For income', live: 'For living', label: 'Why are you buying' },
  id: { income: 'Untuk pendapatan', live: 'Untuk tinggal', label: 'Tujuan membeli' },
  fr: { income: 'Pour le revenu', live: 'Pour y vivre', label: 'Pourquoi acheter' },
  de: { income: 'Für Einnahmen', live: 'Zum Wohnen', label: 'Wozu kaufen Sie' },
  zh: { income: '用于收益', live: '用于自住', label: '购买目的' },
  nl: { income: 'Voor inkomen', live: 'Om te wonen', label: 'Waarom koopt u' },
  ban: { income: 'Anggen pikolih', live: 'Anggen magenah', label: 'Tetujon numbas' },
  pl: { income: 'Dla dochodu', live: 'Do mieszkania', label: 'Po co kupujesz' },
  uk: { income: 'Для доходу', live: 'Для життя', label: 'Навіщо купуєте' },
}

export function GoalSwitch({ income, live, lang }: { income: ReactNode; live: ReactNode | null; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const [goal, setGoal] = useState<Goal>('income')

  useEffect(() => {
    if (!live) return
    let start: Goal | null = null
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('goal')
      if (fromUrl === 'live' || /[?&]goal=live\b/.test(document.referrer)) start = 'live'
      else if (fromUrl === 'invest') start = 'income'
      else {
        const saved = localStorage.getItem(KEY)
        if (saved === 'live' || saved === 'income') start = saved
      }
    } catch { /* приватный режим — просто без памяти */ }
    // Одноразовое чтение сохранённого выбора после гидрации.
    if (start) setGoal(start)
  }, [live])

  useEffect(() => {
    document.documentElement.dataset.goal = goal
    return () => { delete document.documentElement.dataset.goal }
  }, [goal])

  if (!live) return <>{income}</>

  const pick = (g: Goal) => {
    setGoal(g)
    try { localStorage.setItem(KEY, g) } catch { /* без памяти */ }
  }

  return (
    <div>
      <div role="tablist" aria-label={c.label} className="mb-8 inline-flex rounded-full border border-[var(--color-border)] bg-white p-1">
        {(['income', 'live'] as const).map(g => (
          <button key={g} type="button" role="tab" aria-selected={goal === g} onClick={() => pick(g)}
            className={`rounded-full px-5 py-2.5 text-[15px] font-semibold transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${goal === g ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
            {g === 'income' ? c.income : c.live}
          </button>
        ))}
      </div>
      <div hidden={goal !== 'income'}>{income}</div>
      <div hidden={goal !== 'live'}>{live}</div>
    </div>
  )
}
