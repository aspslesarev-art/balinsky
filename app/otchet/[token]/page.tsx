// Отчёт по работе с агентами — открытая страница по секретной ссылке.
//
// Не админка: входа нет, страницу видит любой, у кого есть ссылка
// /otchet/<код>. Код лежит в app_config.crm_report_token; сменить код =
// старая ссылка перестаёт работать. Поисковикам страница закрыта.
//
// Видно, с какими агентами шла переписка, звонки и встречи, но не текст переписки.

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

function fmtDay(day: string): string {
  return new Date(day + 'T00:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' })
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'
}

// «Встреча: Oleg M. — Студия On Air» → кто: Oleg M., о чём: Студия On Air.
// Ники из Телеграма (@...) в отчёт не попадают.
function meetingParts(title: string): { who: string; what: string } {
  const clean = title.replace(/\s*\(@[^)]*\)/g, '').replace(/@\w+/g, '').trim()
  const m = clean.match(/^([^:—]{1,20}):\s*(.+)$/)
  const kind = m ? m[1].trim() : ''
  const rest = m ? m[2] : clean
  const [who, ...tail] = rest.split(/\s+[—-]\s+/)
  const what = [kind && !/^встреча$/i.test(kind) ? kind : '', tail.join(' - ')].filter(Boolean).join(' · ')
  return { who: who.trim() || clean, what }
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'Asia/Makassar' })}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })}`
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
    { label: 'Звонки', value: f.calls, sub: `${f.callsMin} мин в Телеграме` },
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
          <ol className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {steps.map(st => (
              <li key={st.label} className="rounded-xl border border-[#DDE3DF] bg-white p-4 min-w-0">
                <div className="text-[12px] uppercase tracking-[0.06em] text-[#5B6B62]">{st.label}</div>
                <div className={`mt-2 text-[32px] font-semibold tracking-tight tabular-nums leading-none ${st.strong ? 'text-[#1F8B5F]' : ''}`}>{st.value.toLocaleString('ru-RU')}</div>
                <div className="mt-2 text-[13px] text-[#5B6B62] leading-snug">{st.sub}</div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="agents">
          <h2 id="agents" className="text-[15px] font-semibold">С кем шла работа</h2>
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
                    <th className="pl-2 pr-4 sm:px-4 py-3 font-medium text-right">Звонки</th>
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map(r => (
                    <tr key={r.chat_id} className="border-b border-[#EEF1EF] last:border-0 align-top">
                      <td className="pl-4 pr-2 sm:px-4 py-3 min-w-[140px]">
                        <div className="font-medium break-words">{r.name}</div>
                        {r.agency && <div className="text-[12.5px] text-[#5B6B62] break-words">{r.agency}</div>}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-right tabular-nums">{r.outgoing || <span className="text-[#5B6B62]">—</span>}</td>
                      <td className="px-2 sm:px-4 py-3 text-right tabular-nums">{r.incoming || <span className="text-[#5B6B62]">—</span>}</td>
                      <td className="pl-2 pr-4 sm:px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {r.calls > 0 ? <><span className="font-semibold">{r.calls}</span> <span className="text-[#5B6B62] text-[12.5px]">· {Math.max(1, Math.round(r.calls_sec / 60))} мин</span></> : <span className="text-[#5B6B62]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-3 text-[12.5px] text-[#5B6B62] border-t border-[#EEF1EF]">Число сообщений за период · звонки в Телеграме</p>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="meetings">
          <h2 id="meetings" className="text-[15px] font-semibold">Встречи и зумы</h2>
          {s.calendar !== 'ok' ? (
            <p className="rounded-xl border border-[#DDE3DF] bg-white px-5 py-6 text-[14px] text-[#5B6B62]">Календарь сейчас недоступен, список встреч появится позже.</p>
          ) : s.meetings.length === 0 ? (
            <p className="rounded-xl border border-[#DDE3DF] bg-white px-5 py-6 text-[14px] text-[#5B6B62]">{period === 'today' ? 'Сегодня встреч нет.' : 'За этот период встреч не было.'}</p>
          ) : (
            <ul className="rounded-xl border border-[#DDE3DF] bg-white">
              {[...s.meetings].sort((a, b) => b.start.localeCompare(a.start)).map((m, i) => {
                const { who, what } = meetingParts(m.title)
                return (
                  <li key={i} className="flex gap-4 px-4 py-3 border-b border-[#EEF1EF] last:border-0">
                    <span className="w-[104px] shrink-0 text-[13px] text-[#5B6B62] tabular-nums pt-px">{fmtTime(m.start)}</span>
                    <span className="min-w-0">
                      <span className="font-medium break-words">{who}</span>{m.zoom && <span className="ml-2 text-[12.5px] text-[#1F8B5F]">зум</span>}
                      {what && <span className="block text-[13px] text-[#5B6B62] break-words">{what}</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="days">
          <h2 id="days" className="text-[15px] font-semibold">По дням</h2>
          {s.byDay.length === 0 ? (
            <p className="rounded-xl border border-[#DDE3DF] bg-white px-5 py-10 text-center text-[14px] text-[#5B6B62]">
              {period === 'today' ? 'Сегодня переписки с агентами ещё не было.' : 'За этот период переписки с агентами не было.'}
            </p>
          ) : (
            <div className="rounded-xl border border-[#DDE3DF] bg-white overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] uppercase tracking-[0.06em] text-[#5B6B62] border-b border-[#DDE3DF]">
                    <th className="pl-4 pr-2 sm:px-4 py-3 font-medium">День</th>
                    <th className="px-2 sm:px-4 py-3 font-medium text-right whitespace-nowrap"><span className="sm:hidden">Я</span><span className="hidden sm:inline">Я написал</span></th>
                    <th className="px-2 sm:px-4 py-3 font-medium text-right whitespace-nowrap"><span className="sm:hidden">Мне</span><span className="hidden sm:inline">Мне написали</span></th>
                    <th className="px-2 sm:px-4 py-3 font-medium text-right">Диалогов</th>
                    <th className="pl-2 pr-4 sm:px-4 py-3 font-medium text-right">Звонков</th>
                  </tr>
                </thead>
                <tbody>
                  {s.byDay.map(d => (
                    <tr key={d.day} className="border-b border-[#EEF1EF] last:border-0">
                      <td className="pl-4 pr-2 sm:px-4 py-3 whitespace-nowrap">{fmtDay(d.day)}</td>
                      <td className="px-2 sm:px-4 py-3 text-right tabular-nums">{d.wroteChats} <span className="text-[#5B6B62] text-[12.5px]">· {d.wroteMsgs}</span></td>
                      <td className="px-2 sm:px-4 py-3 text-right tabular-nums">{d.gotChats} <span className="text-[#5B6B62] text-[12.5px]">· {d.gotMsgs}</span></td>
                      <td className="px-2 sm:px-4 py-3 text-right tabular-nums font-semibold">{d.dialogs}</td>
                      <td className="pl-2 pr-4 sm:px-4 py-3 text-right tabular-nums font-semibold">{d.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-3 text-[12.5px] text-[#5B6B62] border-t border-[#EEF1EF]">Число агентов · число сообщений</p>
            </div>
          )}
        </section>

        <footer className="text-[12.5px] text-[#5B6B62] max-w-[68ch] leading-relaxed">
          В отчёте только агенты по недвижимости. Касание - одно сообщение в личной переписке в Телеграме. Звонок - состоявшийся звонок в Телеграме. Диалог - переписка, где за период писали обе стороны. Текст переписки в отчёт не попадает.
        </footer>
      </div>
    </main>
  )
}
