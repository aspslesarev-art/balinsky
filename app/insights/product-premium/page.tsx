// Закрытый отчёт для застройщиков: «что строить и в каком районе».
//
// Самостоятельная страница вне локализованной структуры — как /phuket-partners:
// без шапки и футера маркетплейса. Закрыта только от поиска — noindex здесь,
// Disallow /insights в app/robots.ts, вне sitemap и без ссылок с сайта.
// Пароля нет: страницу раздаём ссылкой, и это осознанный выбор простоты.
//
// Вся арифметика — в SQL-функции product_premium_report(); здесь только показ.

import type { Metadata } from 'next'
import { loadPremiumReport } from '@/lib/product-premium-data'
import type { PremiumFeature } from '@/lib/product-premium'
import { ZoneTable } from './_zones'

export const metadata: Metadata = {
  title: 'Что строить на Бали — отчёт по рынку аренды',
  robots: { index: false, follow: false, nocache: true },
}

export const revalidate = 86_400

const FEATURE_LABEL: Record<string, string> = {
  infinity_pool: 'Бассейн-инфинити',
  pool_any: 'Бассейн (любой)',
  ocean_view: 'Вид на океан',
  nature_view: 'Вид на джунгли, реку или рисовые поля',
  open_air_living: 'Гостиная без стен',
  thatch: 'Тростниковая кровля алang-алang',
  sala: 'Сала или газебо у бассейна',
  double_height: 'Двусветное пространство',
  glass_wall: 'Панорамное остекление',
  microcement: 'Микроцемент или терраццо',
  bathtub: 'Ванна',
  outdoor_shower: 'Душ под открытым небом',
  workspace: 'Рабочее место со столом',
  spacious: 'Ощущение простора',
  finish_hi: 'Отделка уровня 4–5',
  bathroom_hi: 'Ванная уровня 4–5',
  kitchen_hi: 'Кухня уровня 4–5',
}

// Признаки, которые модель одинаково видит и на фотографии, и на рендере.
// Всё остальное у рендеров систематически завышено — сравнивать нечестно.
const STRUCTURAL = new Set([
  'infinity_pool', 'pool_any', 'ocean_view', 'nature_view',
  'open_air_living', 'thatch', 'sala', 'double_height', 'glass_wall',
])

const money = (n: number) => n.toLocaleString('ru-RU')

function FeatureRow({ f }: { f: PremiumFeature }) {
  const premium = f.premium ?? 1
  const share = f.share_market ?? 0
  const scarce = share <= 15 && premium >= 1.15
  const delta = Math.round((premium - 1) * 100)
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-neutral-100 px-4 py-3 first:border-t-0">
      <span className="min-w-0 flex-1 text-neutral-900">{FEATURE_LABEL[f.k] ?? f.k}</span>
      {scarce ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
          дефицит на рынке
        </span>
      ) : null}
      <span className="w-28 text-right text-sm tabular-nums text-neutral-400">есть у {share}%</span>
      <span
        className={`w-16 text-right font-medium tabular-nums ${
          delta > 2 ? 'text-emerald-700' : delta < -2 ? 'text-red-700' : 'text-neutral-400'
        }`}
      >
        {delta > 0 ? '+' : ''}{delta}%
      </span>
    </div>
  )
}

function Group({ title, note, items }: { title: string; note: string; items: PremiumFeature[] }) {
  if (!items.length) return null
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        <p className="text-sm text-neutral-500">{note}</p>
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-neutral-200">
        {items.map(f => <FeatureRow key={f.k} f={f} />)}
      </div>
    </div>
  )
}

export default async function ProductPremiumPage() {
  const report = await loadPremiumReport()
  const { meta, features, finish, zones } = report

  const byPremium = [...features].sort((a, b) => (b.premium ?? 0) - (a.premium ?? 0))
  const strong = byPremium.filter(f => (f.premium ?? 1) >= 1.2)
  const normal = byPremium.filter(f => (f.premium ?? 1) >= 1.03 && (f.premium ?? 1) < 1.2)
  const weak = byPremium.filter(f => (f.premium ?? 1) < 1.03)

  // В короткий ответ пускаем только районы с реальной глубиной рынка: в зоне
  // на 50 объектов удвоение ставки за качество — статистика, а не возможность.
  const free = zones
    .filter(z =>
      z.kind === 'villa' && z.n >= 150 && z.share_hi < 50 &&
      z.adr_t3 && z.adr_t45 && z.adr_t45 / z.adr_t3 >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)

  const gapRows = features
    .filter(f => STRUCTURAL.has(f.k) && f.share_ours !== null)
    .sort((a, b) => (b.share_market ?? 0) - (a.share_market ?? 0))

  const updated = meta.updated
    ? new Date(meta.updated).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  return (
    <main className="min-w-0 bg-neutral-50 text-neutral-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-5 py-14 sm:px-8 sm:py-20">

        <header className="flex flex-col gap-6">
          <span className="text-xs uppercase tracking-[0.16em] text-neutral-400">
            Balinsky · закрытый отчёт для застройщиков
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-neutral-900 sm:text-5xl">
            Что строить на Бали<br />и в каком районе
          </h1>
          <p className="max-w-2xl text-lg text-neutral-600">
            Мы разобрали фотографии всего рынка краткосрочной аренды острова и сопоставили увиденное со ставкой
            за ночь и загрузкой. Ниже — за какие решения гость платит больше и где эти решения ещё не заняты
            конкурентами.
          </p>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-neutral-200 ring-1 ring-neutral-200 sm:grid-cols-4">
            {[
              [money(meta.listings), 'объектов аренды разобрано'],
              [money(meta.photos), 'фотографий просмотрено'],
              [money(meta.priced), 'с ценой и загрузкой'],
              [updated, 'данные на'],
            ].map(([v, l]) => (
              <div key={l} className="bg-white px-4 py-4">
                <dt className="text-xl font-semibold tabular-nums text-neutral-900">{v}</dt>
                <dd className="mt-0.5 text-xs leading-snug text-neutral-500">{l}</dd>
              </div>
            ))}
          </dl>
        </header>

        <section className="flex flex-col gap-5">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900">Где строить</h2>
            <p className="mt-1 max-w-2xl text-neutral-600">
              Премия за качество живёт там, где качества мало. Ищите районы с зелёной меткой: в них объект
              с хорошей отделкой стоит вдвое дороже среднего соседа, потому что соседи такими ещё не стали.
            </p>
          </div>
          <ZoneTable zones={zones} />
          {free.length ? (
            <div className="rounded-2xl bg-emerald-50 px-5 py-4 ring-1 ring-emerald-200">
              <p className="text-emerald-900">
                <b>Короткий ответ по виллам:</b>{' '}
                {free.map((z, i) => (
                  <span key={z.zone}>
                    {i > 0 ? ', ' : ''}
                    {z.zone} (${z.adr_t3} → ${z.adr_t45} за ночь)
                  </span>
                ))}
                . Это районы, где качественная вилла уходит минимум вдвое дороже обычной, а таких вилл пока
                меньше половины.
              </p>
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-8">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900">Что строить</h2>
            <p className="mt-1 max-w-2xl text-neutral-600">
              Проценты — насколько дороже стоит объект с этим решением по сравнению с соседями того же типа
              и размера в том же районе. Влияние локации и метража уже вычтено.
            </p>
          </div>
          <Group title="Даёт больше всего" note="Ради этого стоит переделывать проект" items={strong} />
          <Group title="Норма рынка" note="Не выделит, но без этого будете дешевле соседей" items={normal} />
          <Group title="Денег не приносит" note="Экономьте здесь, а не на отделке" items={weak} />
        </section>

        <section className="flex flex-col gap-5">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900">Отделка решает больше всего</h2>
            <p className="mt-1 max-w-2xl text-neutral-600">
              Перелом всегда между «нормально» и «хорошо». Загрузка при этом не падает — рынок принимает
              высокую ставку, а не простаивает.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl bg-neutral-200 ring-1 ring-neutral-200 sm:grid-cols-5">
            {finish.map(t => {
              const delta = Math.round(((t.adr_idx ?? 1) - 1) * 100)
              return (
                <div key={t.tier} className="flex flex-col gap-1 bg-white px-4 py-5">
                  <span className="text-xs uppercase tracking-wide text-neutral-400">Уровень {t.tier}</span>
                  <span
                    className={`text-2xl font-semibold tabular-nums ${
                      delta > 2 ? 'text-emerald-700' : delta < -2 ? 'text-red-700' : 'text-neutral-900'
                    }`}
                  >
                    {delta > 0 ? '+' : ''}{delta}%
                  </span>
                  <span className="text-xs text-neutral-400">{money(t.n)} объектов</span>
                </div>
              )
            })}
          </div>
          <p className="text-sm text-neutral-500">
            Уровень 1 — голая плитка и гипсокартон, 3 — аккуратная современная середина, 5 — авторский проект
            с камнем и столярными изделиями на заказ.
          </p>
        </section>

        {gapRows.length ? (
          <section className="flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-900">Чего не хватает новым проектам</h2>
              <p className="mt-1 max-w-2xl text-neutral-600">
                Слева — насколько это распространено на рынке аренды, справа — в проектах застройщиков
                из нашего каталога. Показаны только решения, которые одинаково видно и на фотографии,
                и на рендере.
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl ring-1 ring-neutral-200">
              <table className="w-full min-w-[560px] border-collapse bg-white text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                    <th className="px-4 py-3 font-medium">Решение</th>
                    <th className="px-4 py-3 text-right font-medium">Премия</th>
                    <th className="px-4 py-3 text-right font-medium">Рынок аренды</th>
                    <th className="px-4 py-3 text-right font-medium">Новые проекты</th>
                  </tr>
                </thead>
                <tbody>
                  {gapRows.map(f => {
                    const mkt = f.share_market ?? 0
                    const ours = f.share_ours ?? 0
                    const behind = mkt - ours >= 10
                    return (
                      <tr key={f.k} className="border-t border-neutral-100">
                        <td className="px-4 py-3 text-neutral-900">{FEATURE_LABEL[f.k] ?? f.k}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
                          +{Math.round(((f.premium ?? 1) - 1) * 100)}%
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-500">{mkt}%</td>
                        <td
                          className={`px-4 py-3 text-right font-medium tabular-nums ${
                            behind ? 'text-amber-700' : 'text-neutral-900'
                          }`}
                        >
                          {ours}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-neutral-500">
              Разрыв в открытой гостиной, тростниковой кровле и сале — самый заметный: рынок аренды платит
              за тропическую полуулицу, а новые проекты чаще строят закрытый остеклённый объём.
            </p>
          </section>
        ) : null}

        <section className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-6 ring-1 ring-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Как это посчитано и чему верить</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-neutral-600">
            <li>
              Источник — {money(meta.listings)} объектов краткосрочной аренды Бали с координатами, ставкой
              и загрузкой. Фотографии каждого объекта разобраны моделью в набор из 31 признака продукта.
            </li>
            <li>
              Каждый объект сравнивается только с соседями своего района, типа и числа спален, поэтому
              «премия за бассейн» не оказывается премией за Улувату.
            </li>
            <li>
              Это связь, а не гарантия: бассейн-инфинити строят там, где есть склон и вид, и премия включает
              всё, что обычно идёт с ним в комплекте.
            </li>
            <li>
              Ставка и загрузка — рыночные наблюдения площадок, а не подтверждённые брони и не чистый доход:
              комиссии, управление и сезонность здесь не учтены.
            </li>
            <li>
              Модель судит по шести кадрам объявления. Чего нет на фотографиях, того для неё не существует —
              поэтому доли по кухням и ванным занижены.
            </li>
          </ul>
          <p className="text-sm text-neutral-500">
            Данные обновляются автоматически. Вопросы и разбор конкретного проекта —{' '}
            <a className="underline underline-offset-2" href="https://t.me/balinsky_info">напишите нам</a>.
          </p>
        </section>

      </div>
    </main>
  )
}
