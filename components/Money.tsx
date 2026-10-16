'use client'

import { useCurrency } from './CurrencyContext'
import { NumberTicker } from './NumberTicker'
import { formatMoney } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

// Сумма в валюте посетителя для серверных блоков, где раньше был зашит «$»
// (lib/currency.ts → formatMoney). Одна валюта на странице: та же, что в
// карточках и на странице объекта. Не переносится посередине числа.
export function Money({ usd, lang = 'ru', className = '' }: { usd: number; lang?: Lang; className?: string }) {
  const { currency } = useCurrency()
  return <span className={`whitespace-nowrap [overflow-wrap:normal] ${className}`}>{formatMoney(usd, currency, lang)}</span>
}

// Хвост заголовка каталога с ценой из фильтра: «… до 16,8 млн ₽». Сам
// заголовок строится на сервере без цены (там нет валюты посетителя), цена
// дописывается здесь — та же, что в фильтре и карточках.
const PRICE_WORDS: Record<Lang, { sep: string; upTo: string; from: string; range: string }> = {
  ru: { sep: ' ', upTo: 'до', from: 'от', range: 'за' },
  uk: { sep: ' ', upTo: 'до', from: 'від', range: 'за' },
  en: { sep: ', ', upTo: 'up to', from: 'from', range: '' },
  id: { sep: ' · ', upTo: 'hingga', from: 'mulai', range: '' },
  fr: { sep: ' · ', upTo: 'jusqu’à', from: 'à partir de', range: '' },
  de: { sep: ' · ', upTo: 'bis', from: 'ab', range: '' },
  zh: { sep: ' · ', upTo: '最高', from: '起价', range: '' },
  nl: { sep: ' · ', upTo: 'tot', from: 'vanaf', range: '' },
  ban: { sep: ' · ', upTo: 'nyantos', from: 'ngawit', range: '' },
  pl: { sep: ' · ', upTo: 'do', from: 'od', range: '' },
}

export function HeadingPrice({ min, max, lang = 'ru' }: { min: number | null; max: number | null; lang?: Lang }) {
  const w = PRICE_WORDS[lang] ?? PRICE_WORDS.en
  if (min == null && max == null) return null
  return (
    <>
      {w.sep}
      {min != null && max != null ? (
        <>{w.range ? `${w.range} ` : ''}<Money usd={min} lang={lang} /> – <Money usd={max} lang={lang} /></>
      ) : max != null ? (
        <>{w.upTo} <Money usd={max} lang={lang} /></>
      ) : (
        <>{w.from} <Money usd={min!} lang={lang} /></>
      )}
    </>
  )
}

// То же с анимацией счётчика — для плиток «Рынок в цифрах».
export function MoneyTicker({ usd, lang = 'ru', className = '' }: { usd: number; lang?: Lang; className?: string }) {
  const { currency } = useCurrency()
  return <NumberTicker value={formatMoney(usd, currency, lang)} className={`whitespace-nowrap [overflow-wrap:normal] ${className}`} />
}
