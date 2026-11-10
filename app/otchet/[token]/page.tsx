// Отчёт по работе с агентами — открытая страница по секретной ссылке.
//
// Не админка: входа нет, страницу видит любой, у кого есть ссылка
// /otchet/<код>. Код лежит в app_config.crm_report_token; сменить код =
// старая ссылка перестаёт работать. Поисковикам страница закрыта.
//
// Здесь только цифры. Текста переписки на сайте нет вообще, а названия
// встреч из календаря наружу не показываем — только их количество.

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'
import { touchStats } from '@/lib/agents/stats'
import { TOUCH_PERIODS, plural, type TouchPeriodKey, type TouchStats } from '@/lib/agents/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Отчёт по агентам · Balinsky',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

async function validToken(token: string): Promise<boolean> {
  const { data } = await sb.from('app_config').select('value').eq('key', 'crm_report_token').maybeSingle()
  const real = (data as { value: string } | null)?.value
  if (!real || token.length !== real.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(real))
}

const KIND_LABEL: Record<string, string> = { brokers: 'Брокеры Бали', outreach: 'рассылка' }

function fmtDay(day: string): string {
  return new Date(day + 'T00:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' })
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'
}

function msgs(n: number): string {
  return `${n} ${plural(n, ['сообщение', 'сообщения', 'сообщений'])}`
}

export default async function ReportPage({ params, searchParams }: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ p?: string }>
}) {
  const { token } = await params
  if (!(await validToken(token))) notFound()
  const { p } = await searchParams
  const period: TouchPeriodKey = TOUCH_PERIODS.find(x => x.key === p)?.key ?? 'today'
  const s: TouchStats = await touchStats(period)
  const f = s.funnel
  const range = s.from === s.to ? fmtDay(s.from) : `${fmtDay(s.from)} - ${fmtDay(s.to)}`

  const steps: Array<{ label: string; value: number; sub: string; strong?: boolean }> = [
    { label: 'Я написал', value: f.wroteChats, sub: msgs(f.wroteMsgs) },
    { label: 'Мне написали', value: f.gotChats, sub: msgs(f.gotMsgs) },
    { label: 'Диалогов', value: f.dialogs, sub: `писали обе стороны · ${pct(f.dialogs, f.wroteChats)}`, strong: true },
    { label: 'Встречи и зумы', value: f.meetings, sub: s.calendar === 'ok' ? `из них зумов: ${f.zooms}` : 'календарь недоступен' },
    { label: 'Брони', value: f.reservations, sub: 'подтверждённые' },
    { label: 'Сделки', value: f.deals, sub: 'оплаченные брони', strong: true },
  ]

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-[#16201B]">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 py-10 sm:py-14 flex flex-col gap-10">
        <header className="flex flex-col gap-3">
          <p className="text-[12px] uppercase tracking-[0.08em] text-[#5B6B62]">Balinsky · работа с агентами</p>
          <h1 className="text-[28px] sm:text-[36px] font-semibold tracking-tight leading-tight">Отчёт за {period === 'today' ? 'сегодня' : period === 'yesterday' ? 'вчера' : TOUCH_PERIODS.find(x => x.key === period)!.label}</h1>
          <p className="text-[14px] text-[#5B6B62]">{range} · время Бали{s.syncedAt && <> · цифры обновлены {new Date(s.syncedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })}</>}</p>
          <nav className="flex flex-wrap gap-2 pt-1" aria-label="Период">
            {TOUCH_PERIODS.map(x => (
              <a key={x.key} href={`?p=${x.key}`} aria-current={x.key === period ? 'page' : undefined}
                className={`h-9 px-4 inline-flex items-center rounded-lg text-[14px] border transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F8B5F] ${
                  x.key === period ? 'bg-[#1F8B5F] border-[#1F8B5F] text-white' : 'bg-white border-[#DDE3DF] text-[#16201B] hover:border-[#1F8B5F]'
                }`}>
                {x.label}
              </a>
            ))}
          </nav>
        </header>

        <section className="flex flex-col gap-3" aria-labelledby="funnel">
          <h2 id="funnel" className="text-[15px] font-semibold">Воронка</h2>
          <ol className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {steps.map(st => (
              <li key={st.label} className="rounded-xl border border-[#DDE3DF] bg-white p-4 min-w-0">
                <div className="text-[12px] uppercase tracking-[0.06em] text-[#5B6B62]">{st.label}</div>
                <div className={`mt-2 text-[32px] font-semibold tracking-tight tabular-nums leading-none ${st.strong ? 'text-[#1F8B5F]' : ''}`}>{st.value.toLocaleString('ru-RU')}</div>
                <div className="mt-2 text-[13px] text-[#5B6B62] leading-snug">{st.sub}</div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-[#DDE3DF] bg-white p-5 flex flex-wrap items-baseline gap-x-8 gap-y-2" aria-labelledby="outreach">
          <h2 id="outreach" className="text-[15px] font-semibold w-full sm:w-auto">Рассылка знакомства</h2>
          <span className="text-[14px]">ушло <b className="tabular-nums">{f.outreachSent}</b></span>
          <span className="text-[14px]">ответили <b className="tabular-nums">{f.outreachReplied}</b> <span className="text-[#5B6B62]">({pct(f.outreachReplied, f.outreachSent)})</span></span>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="who">
          <h2 id="who" className="text-[15px] font-semibold">С кем была переписка · {s.rows.length}</h2>
          {s.rows.length === 0 ? (
            <p className="rounded-xl border border-[#DDE3DF] bg-white px-5 py-10 text-center text-[14px] text-[#5B6B62]">
              {period === 'today' ? 'Сегодня переписки с агентами ещё не было.' : 'За этот период переписки с агентами не было.'}
            </p>
          ) : (
            <div className="rounded-xl border border-[#DDE3DF] bg-white overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] uppercase tracking-[0.06em] text-[#5B6B62] border-b border-[#DDE3DF]">
                    <th className="pl-4 pr-2 sm:px-4 py-3 font-medium">Агент</th>
                    <th className="px-2 sm:px-4 py-3 font-medium text-right whitespace-nowrap"><span className="sm:hidden">Я</span><span className="hidden sm:inline">Я написал</span></th>
                    <th className="px-2 sm:px-4 py-3 font-medium text-right whitespace-nowrap"><span className="sm:hidden">Мне</span><span className="hidden sm:inline">Мне написали</span></th>
                    <th className="pl-2 pr-4 sm:px-4 py-3 font-medium text-right">Всего</th>
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map(r => (
                    <tr key={r.chat_id} className="border-b border-[#EEF1EF] last:border-0">
                      <td className="pl-4 pr-2 sm:px-4 py-3">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-[12.5px] text-[#5B6B62]">
                          {[r.agency, r.kind && r.kind !== 'agent' ? KIND_LABEL[r.kind] : null].filter(Boolean).join(' · ') || ' '}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-right tabular-nums">{r.outgoing}</td>
                      <td className="px-2 sm:px-4 py-3 text-right tabular-nums">{r.incoming}</td>
                      <td className="pl-2 pr-4 sm:px-4 py-3 text-right tabular-nums font-semibold">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="text-[12.5px] text-[#5B6B62] max-w-[68ch] leading-relaxed">
          Касание - одно сообщение в личной переписке в Телеграме. Диалог - переписка, где за период писали обе стороны. Текст переписки в отчёт не попадает.
        </footer>
      </div>
    </main>
  )
}
