'use client'

// PDF-отчёт ИИ-аналитика (владелец 19.11.2026): человек в окне аналитики
// нажимает «Добавить в отчёт» у нужных проверок и скачивает их одним файлом.
// Печатная страница /ru/villy/o/<slug>/otchet?a=<id,id…>, в файл её
// превращает app/api/pdf. Листы A4 альбомом: обложка, потом по листу на
// проверку — те же цифры, источники, графики и вывод, что в окне на сайте.

import { useMemo } from 'react'
import { MONEY_RE, type Analysis } from '@/lib/analytics-panel/types'
import { useCurrency } from '@/components/CurrencyContext'
import { formatMoney } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'
import { PdfShell } from '@/components/pdf/PdfShell'
import { VizView } from './VizView'
import { withMoney } from './AnalyticsPanel'

const COPY = {
  ru: {
    kicker: 'Отчёт ИИ-аналитика Balinsky', inside: 'В отчёте', date: (d: string) => `Собран ${d}`,
    meaning: 'Вывод ИИ:', sources: 'Источники', foot: 'Balinsky · отчёт ИИ-аналитика · цифры из открытых источников, это не обещание дохода',
    print: 'Сохранить в PDF', printHint: 'В окне печати выберите «Сохранить как PDF».',
  },
  en: {
    kicker: 'Balinsky AI analyst report', inside: 'Inside', date: (d: string) => `Generated ${d}`,
    meaning: 'AI verdict:', sources: 'Sources', foot: 'Balinsky · AI analyst report · figures from public sources, not a promise of income',
    print: 'Save as PDF', printHint: 'In the print dialog choose “Save as PDF”.',
  },
}

export function AnalyticsReport({ analyses: raw, lang, title, subtitle, photo, autoPrint }: {
  analyses: Analysis[]
  lang: string
  title: string
  subtitle: string
  photo: string | null
  autoPrint: boolean
}) {
  const c = lang === 'ru' ? COPY.ru : COPY.en
  const { currency } = useCurrency()
  const analyses = useMemo(() => withMoney(raw, s => s.replace(MONEY_RE, (_, n) => formatMoney(Number(n), currency, lang as Lang))), [raw, currency, lang])
  const today = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <PdfShell autoPrint={autoPrint} printLabel={c.print} printHint={c.printHint}>
      <section className="pdf-page">
        <div className="pdf-inner" style={{ flexDirection: 'row', bottom: 0 }}>
          <div className="flex w-[52%] flex-col justify-between gap-8 px-12 py-12">
            <div className="flex flex-col gap-4">
              <div className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#4A5550]">{c.kicker}</div>
              <h1 className="m-0 font-display text-[38px] font-bold leading-[1.1] tracking-[-0.03em]">{title}</h1>
              <p className="m-0 text-[16px] leading-[1.6] text-[#4A5550]">{subtitle}</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#4A5550]">{c.inside}</div>
              <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                {analyses.map((a, i) => (
                  <li key={a.id} className="flex gap-3 border-t border-[#ECEFED] pt-1.5 text-[15px]">
                    <span className="w-6 tabular-nums text-[#8A938E]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-semibold">{a.title}</span>
                    <span className="text-[#6B7570]">· {a.group}</span>
                  </li>
                ))}
              </ol>
              <div className="pt-2 text-[13px] text-[#6B7570]">{c.date(today)} · balinsky.info</div>
            </div>
          </div>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element -- печать: обычная картинка грузится надёжнее
            <img src={photo} alt={title} className="h-full w-[48%] object-cover" />
          )}
        </div>
      </section>

      {analyses.map((a, i) => {
        // Карты, которые в окне рисуются во время сбора (маршруты, что рядом), — тоже в лист.
        const vizs = [...a.sources.flatMap(s => (s.live ? [s.live] : [])), ...a.vizs].slice(0, 4)
        return (
        <section key={a.id} className="pdf-page">
          <div className="pdf-inner px-12 pb-6 pt-10">
            <header className="mb-5 flex items-end justify-between gap-6 border-b border-[#0F1A15] pb-4">
              <div className="flex flex-col gap-1">
                <div className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#4A5550]">{String(i + 1).padStart(2, '0')} · {a.group}</div>
                <h2 className="m-0 font-display text-[28px] font-bold leading-[1.15] tracking-[-0.02em]">{a.title}</h2>
                <p className="m-0 text-[14px] text-[#4A5550]">{a.sub}</p>
              </div>
              <div className="flex shrink-0 gap-10">
                {a.bigs.map(b => (
                  <div key={b.l} className="text-right">
                    <div className="text-[28px] font-bold leading-[1.1] tracking-[-0.02em] tabular-nums">{b.v}</div>
                    <div className="text-[12px] text-[#4A5550]">{b.l}</div>
                  </div>
                ))}
              </div>
            </header>
            <div className="pdf-body">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                  {a.sources.map(s => (
                    <div key={s.name} className="pdf-keep flex flex-col gap-1 border-t border-[#ECEFED] pt-2">
                      <span className="text-[13px] font-semibold">{s.name} <span className="font-normal text-[#6B7570]">· {s.fresh}</span></span>
                      <span className="text-[13px] leading-[1.45]">{s.result}</span>
                    </div>
                  ))}
                </div>
                {vizs.length > 0 && (
                  <div className={`grid gap-4 ${vizs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {vizs.map((v, k) => <div key={k} className="pdf-keep rounded-xl border border-[#ECEFED]"><VizView v={v} lang={lang} /></div>)}
                  </div>
                )}
                <p className="m-0 max-w-[90ch] text-[15px] leading-[1.6]"><b className="font-semibold">{c.meaning}</b> {a.meaning}</p>
                {a.footnote && <p className="m-0 text-[12px] text-[#6B7570]">{a.footnote}</p>}
              </div>
            </div>
          </div>
          <footer className="pdf-foot">{title} · {c.foot}</footer>
        </section>
        )
      })}
    </PdfShell>
  )
}
