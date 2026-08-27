import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { getSiteUser } from '@/lib/site-auth'
import { hasMarketAccess } from '@/lib/market/access'
import { loadMarketReport } from '@/lib/market/report'
import { loadScanLog } from '@/lib/market/scan-log'
import { Card, Empty, EventFeed, Kpis, PriceFeed, StockList } from './_sections'
import { LoginGate, NoAccessGate } from './_gate'

// Закрытый отчёт о движении рынка для приглашённых.
//
// Те же данные, что в /admin/market, но без кухни трекера (журнал обходов,
// состояние парсеров, странности): читателю нужен рынок, а не то, как мы
// его собираем. Доступ — по списку market_access, см. lib/market/access.ts.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Движение рынка | Balinsky',
  // Персональная страница за логином — в индексе ей делать нечего.
  robots: { index: false, follow: false, nocache: true },
}

const BOT_URL = 'https://t.me/BalinskyBot'
// Комплексов в прайсах сотни; в отчёте показываем те, где реально есть что
// покупать, остальное — длинный хвост нулей.
const STOCK_LIMIT = 40
const TZ = 'Asia/Makassar'

export default async function RynokPage() {
  const user = await getSiteUser()

  if (!user) return <Page><LoginGate /></Page>
  if (!(await hasMarketAccess(user))) return <Page><NoAccessGate user={user} botUrl={BOT_URL} /></Page>

  const [r, log] = await Promise.all([loadMarketReport(), loadScanLog()])
  const stock = r.stock.filter(s => Number(s.available ?? 0) > 0).slice(0, STOCK_LIMIT)

  return (
    <Page wide>
      <header>
        <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)]">
          Прайсы застройщиков Бали
        </div>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-[#111827] sm:text-[32px]">
          Движение рынка
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-muted)]">
          Мы каждый день обходим прайсы застройщиков и сравниваем со вчерашним срезом. Ниже — что
          вернулось в продажу, как двигались цены и что ушло с рынка за последние 30 дней.
        </p>
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
          Обновлено: {fmt(log.lastSourceScanAt ?? log.lastRunAt)} · прайсов в обходе{' '}
          {log.sources.ok} из {log.sources.total}
        </p>
      </header>

      <Kpis r={r} />

      <Card
        title="Вернулось в продажу"
        count={r.returned.length}
        hint="юнит был продан или в брони, а потом снова стал свободен — обычно это сорвавшаяся сделка"
      >
        {r.returned.length ? <EventFeed rows={r.returned} /> : <Empty>за последний месяц таких не было</Empty>}
      </Card>

      <Card title="Движение цен" count={r.priceMoves.length} hint="за последние 30 дней">
        {r.priceMoves.length ? <PriceFeed rows={r.priceMoves} /> : <Empty>цены не менялись</Empty>}
      </Card>

      <Card title="Ушло с рынка" count={r.recentSold.length} hint="переходы в «продано» за последние 30 дней">
        {r.recentSold.length ? <EventFeed rows={r.recentSold} /> : <Empty>продаж пока не зафиксировано</Empty>}
      </Card>

      <Card
        title="Что сейчас в продаже"
        hint={`комплексы со свободными юнитами${r.stock.length > STOCK_LIMIT ? `, первые ${STOCK_LIMIT} по объёму` : ''}`}
      >
        {stock.length ? <StockList rows={stock} /> : <Empty>свободных юнитов не нашлось</Empty>}
      </Card>

      <p className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
        Данные собираются автоматически из открытых прайсов и таблиц застройщиков. Ошибка в прайсе
        доезжает и до отчёта — перед сделкой цифры стоит подтвердить у застройщика.
      </p>
    </Page>
  )
}

function Page({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <Header />
      <main
        className={`mx-auto w-full min-w-0 px-4 py-8 sm:px-6 sm:py-12 ${
          wide ? 'max-w-5xl space-y-5' : 'max-w-5xl'
        }`}
      >
        {children}
      </main>
    </>
  )
}

function fmt(iso: string | null): string {
  if (!iso) return 'ещё ни разу'
  return new Date(iso).toLocaleString('ru-RU', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}
