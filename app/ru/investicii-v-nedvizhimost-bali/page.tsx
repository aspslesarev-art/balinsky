// Pillar page — central commercial hub for the «инвестиции в недвижимость Бали»
// keyword cluster. Audit Sprint 2 P1: needs to outrank Tranio/Prian on
// nichev quereies (доходность, лизхолд, окупаемость) via real data
// from estatemarket.io and our own catalogue numbers.

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp, Building2, FileCheck2, Calculator, ShieldCheck, BarChart3, ChevronRight, AlertTriangle, MapPin } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 мая 2026 г.'

export const metadata: Metadata = {
  title: 'Инвестиции в недвижимость на Бали 2026 — доходность, лизхолд, налоги | Balinsky',
  description: 'Полный гайд по инвестициям в недвижимость Бали: реальная доходность 8-15% годовых, схемы лизхолд и PT PMA, налоги для иностранцев, расчёт окупаемости и кейсы по районам Чангу, Букит, Убуд.',
  alternates: {
    canonical: '/ru/investicii-v-nedvizhimost-bali',
    languages: {
      ru: `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
      en: `${SITE_URL}/en/bali-property-investment`,
      'x-default': `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
    },
  },
  openGraph: {
    title: 'Инвестиции в недвижимость на Бали 2026 — гайд для иностранцев',
    description: 'Доходность 8-15%, лизхолд vs PT PMA, налоги, окупаемость по 6 районам. Реальные цифры от Booking-аналитики и кейсы покупателей.',
    type: 'article',
    url: '/ru/investicii-v-nedvizhimost-bali',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Инвестиции в недвижимость на Бали 2026',
    description: 'Доходность, лизхолд, налоги, окупаемость по районам. Реальные цифры.',
    images: ['/balina.jpg'],
  },
}

const FAQ = [
  { q: 'Какая реальная доходность от сдачи виллы на Бали в 2026 году?',
    a: 'По актуальным данным Booking-аналитики через estatemarket.io: в Чангу и на Буките реальная чистая доходность 8-12% годовых при загрузке 70-80% через профессиональную управляющую компанию. В премиум-сегменте (новые виллы с океанским видом, 4+ спальни) — до 15%. В Убуде и Сануре — 6-9% из-за более низких ADR. Это после вычета всех расходов: УК (15-20% от выручки), коммунальные, амортизация, налоги, простои.' },
  { q: 'Лизхолд или PT PMA — что выбрать иностранному инвестору?',
    a: 'Лизхолд (долгосрочная аренда земли, 25-80 лет) подходит для покупки одного-двух объектов на инвест. Дешевле, быстрее оформление (1-2 месяца), не нужна корпоративная структура. PT PMA (индонезийское юр.лицо с иностранным участием) — для портфеля из 3+ объектов или коммерческой недвижимости. Даёт фрихолд, но требует $25K уставного капитала, годовой отчётности и налогов на компанию.' },
  { q: 'Какие налоги платит иностранец при покупке и владении недвижимостью?',
    a: 'При покупке: 5% налог на приобретение (BPHTB) + нотариус 1-2% + комиссия агента 3-5% (если есть). При владении: PBB (налог на имущество) 0,1-0,3% от кадастровой стоимости в год. При сдаче в аренду: 20% подоходный налог с выручки для иностранцев (можно снизить через PT PMA). При продаже: 2,5% подоходный налог с цены продажи.' },
  { q: 'За сколько лет окупается покупка виллы на Бали?',
    a: 'При доходности 10% годовых — за 10 лет, при 12% — за 8,3 года. Это математически. На практике 7-10 лет в Чангу/Буките с активным управлением; 12-15 лет в более тихих районах. Объекты с лизхолдом меньше 30 лет на дату покупки часто не успевают окупиться полностью + продаться — будьте внимательны.' },
  { q: 'Что такое PBG и SLF, и почему это критично?',
    a: 'PBG (Persetujuan Bangunan Gedung) — разрешение на строительство, выдаётся до начала стройки. SLF (Sertifikat Laik Fungsi) — сертификат пригодности к эксплуатации, выдаётся после завершения. Без SLF юнит нельзя легально сдавать в аренду — это значит, ваша инвестиционная модель не работает официально. Все объекты в каталоге Balinsky проходят QA на наличие документов — это и есть редакторский шорт-лист.' },
  { q: 'Можно ли получить ВНЖ Индонезии через инвестиции в недвижимость?',
    a: 'Прямой схемы «гражданство/ВНЖ за недвижимость» нет. Но есть KITAS Investor Visa (от $40K инвестиций в PT PMA), Second Home Visa (от $130K на счету в индонезийском банке), Golden Visa (от $350K инвестиций для индивидов, от $25M для компаний). Покупка виллы сама по себе ВНЖ не даёт — нужна корпоративная или депозитная структура.' },
]

const REGIONS = [
  { name: 'Чангу', slug: 'canggu', yieldRange: '10-13%', priceFrom: '$180K', niche: 'тренд-район, ивенты, нетворкинг, аренда суточно' },
  { name: 'Букит (Улувату/Пандава/Унгасан)', slug: 'uluwatu', yieldRange: '10-15%', priceFrom: '$130K', niche: 'премиум-виды на океан, surf community, дорогой ADR' },
  { name: 'Убуд', slug: 'ubud', yieldRange: '6-9%', priceFrom: '$120K', niche: 'wellness, йога-туризм, длительные аренды' },
  { name: 'Санур', slug: 'sanur', yieldRange: '5-8%', priceFrom: '$150K', niche: 'family-сегмент, низкие риски, спокойный спрос' },
  { name: 'Нуса Дуа', slug: 'nusa-dua', yieldRange: '7-10%', priceFrom: '$200K', niche: 'премиум-отели рядом, корпоративный туризм' },
  { name: 'Переренан', slug: 'pererenan', yieldRange: '9-12%', priceFrom: '$160K', niche: 'тише Чангу, растущий тренд-район' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/ru` },
      { '@type': 'ListItem', position: 2, name: 'Инвестиции в недвижимость на Бали', item: `${SITE_URL}/ru/investicii-v-nedvizhimost-bali` },
    ],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Главная', href: '/ru' },
          { label: 'Инвестиции в недвижимость на Бали' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Инвестиции в недвижимость на Бали — гайд 2026
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Реальная доходность 8-15% годовых, расчёт окупаемости по 6 районам, юридические схемы (лизхолд и PT PMA),
              налоги для иностранцев и редакторский шорт-лист объектов с проверенными документами.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Обновлено: {UPDATED}</p>
          </header>

          <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { Icon: TrendingUp, n: '8–15%', label: 'годовых доходность' },
              { Icon: Building2, n: '828+', label: 'объектов в каталоге' },
              { Icon: ShieldCheck, n: '100%', label: 'проверка PBG + SLF' },
              { Icon: BarChart3, n: '6', label: 'инвест-районов' },
            ].map(({ Icon, n, label }) => (
              <div key={label} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Icon size={20} className="text-[var(--color-primary)] mb-2" />
                <div className="text-[24px] font-semibold text-[#111827]">{n}</div>
                <div className="text-[13px] text-[var(--color-text-muted)]">{label}</div>
              </div>
            ))}
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Почему Бали — рынок №1 для иностранных инвесторов в 2026
            </h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>
                Бали — единственный туристический рынок Юго-Восточной Азии, где иностранец может купить недвижимость
                в обход индонезийского запрета на freehold-владение землёй для нерезидентов. Через структуры лизхолда
                и PT PMA сделка оформляется быстро и легально, а налоги — одни из самых низких в регионе.
              </p>
              <p>
                Параллельно остров остаётся рекордсменом по входящему туризму: 6-7 миллионов международных гостей в год,
                загрузка отелей и аренд 70-85% в Чангу и на Буките, средний дневной тариф (ADR) растёт на 8-12% год к году
                с 2023 года. По данным <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a> —
                публичной Booking-аналитики, которую мы используем в карточках объектов, — реальные данные по доходности
                соседей доступны буквально по каждой улице в радиусе километра.
              </p>
              <p>
                Это и есть редкое сочетание: <strong>высокий tourist demand + легальная структура для иностранца + низкая
                стоимость входа</strong> ($120-200K за стартовый юнит). Похожих рынков в Юго-Восточной Азии нет — Пхукет
                и Хошимин дороже и сложнее по сделке, Самуи и Лангкави — с меньшим спросом.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Доходность по районам — реальные цифры 2026
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-6">
              Цифры ниже — средние по выборкам соседних объектов на Booking за последние 12 месяцев,
              чистые после расходов на УК, амортизации и налогов. Разброс показан как 5-й и 95-й перцентиль.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Район</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Доходность</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">От</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)] hidden md:table-cell">Что внутри</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {REGIONS.map(r => (
                    <tr key={r.slug} className="border-b border-[var(--color-border)]">
                      <td className="py-3 px-3 font-semibold text-[#111827]">{r.name}</td>
                      <td className="py-3 px-3 text-[var(--color-primary)] font-semibold">{r.yieldRange}</td>
                      <td className="py-3 px-3">{r.priceFrom}</td>
                      <td className="py-3 px-3 hidden md:table-cell text-[var(--color-text-muted)]">{r.niche}</td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/ru/villy/${r.slug}`} className="text-[var(--color-primary)] text-[13px] inline-flex items-center gap-1 no-underline hover:underline">
                          смотреть <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Юридические схемы — лизхолд vs PT PMA
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">Лизхолд</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Долгосрочная аренда земли у местного владельца — 25-80 лет с возможностью продления.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Минимум документов и формальностей</li>
                  <li>Оформление 1-2 месяца через нотариуса PPAT</li>
                  <li>Подходит для 1-2 объектов</li>
                  <li>Дешевле PT PMA на $5-15K на сделке</li>
                  <li className="text-[var(--color-text-muted)]">Земля не ваша — только право пользования</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">PT PMA</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Индонезийское юр.лицо с иностранным участием — может владеть freehold-земли.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Freehold-собственность</li>
                  <li>Подходит для портфеля 3+ объектов</li>
                  <li>Открывает легальную сдачу в аренду</li>
                  <li>$25K уставного капитала + годовая отчётность</li>
                  <li className="text-[var(--color-text-muted)]">Налог на прибыль компании 22%</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
              Подробный гайд по сделке — на странице <Link href="/ru/kak-kupit" className="text-[var(--color-primary)] no-underline hover:underline">«Как купить недвижимость на Бали»</Link>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Расчёт окупаемости — типовой кейс
            </h2>
            <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={20} className="text-[var(--color-primary)]" />
                <strong>Вилла 2BR в Чангу, $250K, лизхолд 30 лет</strong>
              </div>
              <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                <li>Цена покупки: $250 000</li>
                <li>Расходы на сделку (нотариус, налог BPHTB, due diligence): ~$15 000</li>
                <li>Средняя ставка аренды: $200/ночь × 75% загрузки × 365 дней = $54 750/год</li>
                <li>Расходы (УК 18%, коммунальные, амортизация мебели, налог 20%): ~$23 500/год</li>
                <li>Чистый кэшфлоу: ~$31 250/год → доходность 12,5% годовых от вложений $250K</li>
                <li>Срок окупаемости: ~8 лет до выхода в плюс, 22 года полезной аренды остаётся</li>
              </ul>
              <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
                Подобный расчёт автоматически считается на каждой странице виллы в нашем каталоге — с подстановкой реальных
                цифр по соседним объектам из <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a>.
              </p>
            </div>
          </section>

          <section className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Главные риски, о которых не пишут продавцы</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li><strong>Лизхолд короче 30 лет.</strong> Не успеете отбить вложения + продать с прибылью. Минимум 35 лет на дату покупки — критично.</li>
                  <li><strong>Объект без SLF.</strong> Легально сдавать в аренду нельзя — модель доходности не работает.</li>
                  <li><strong>Застройщик без PBG.</strong> Стройка может быть остановлена властями, депозит не вернётся.</li>
                  <li><strong>Зона сельхозземель.</strong> Часть участков в Чангу/Переренан закрывают под девелопмент — проверяйте RDTR.</li>
                  <li><strong>Реальная загрузка ниже обещанной.</strong> «Гарантированная доходность от застройщика» обычно завышена на 30-50%. Сверяйте с Booking-данными по соседям.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Как мы проверяем объекты в каталоге
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-4">
              Каждый объект в Balinsky проходит редакторский QA до публикации. Это не агрегатор всего подряд —
              только проекты, где документы (PBG, SLF), структура земли (зонирование, RDTR), и застройщик (юр.лицо PT) проверены вручную.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <FileCheck2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Документы</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">PBG, SLF, IMB, AJB / Notarial Deed — сверка с реестрами Министерства ATR/BPN.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Building2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Застройщик</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">PT-регистрация, портфолио завершённых проектов, репутация в комьюнити агентов.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <MapPin size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Локация</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Свой выезд, фото и видео с земли, проверка инфраструктуры в радиусе 500м.</p>
              </div>
            </div>
            <div className="mt-6 text-[14px]">
              Подробнее — на странице <Link href="/ru/o-balinsky" className="text-[var(--color-primary)] no-underline hover:underline">«О Balinsky»</Link>.
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Следующие шаги
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/ru/villy" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Каталог вилл</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Все виллы с фото, ценами, документами и расчётом доходности.</p>
              </Link>
              <Link href="/ru/apartamenty" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Каталог апартаментов</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Юниты в комплексах с управляющей компанией — стартовый порог входа.</p>
              </Link>
              <Link href="/ru/zhilye-kompleksy" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Жилые комплексы</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Off-plan и готовые ЖК с УК, рендерами и сроками сдачи.</p>
              </Link>
              <Link href="/ru/kak-kupit" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Как купить — пошаговый гайд</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Семь шагов сделки, структуры владения, реальные расходы и подводные камни.</p>
              </Link>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Часто задаваемые вопросы
            </h2>
            <div className="space-y-3">
              {FAQ.map((it, i) => (
                <details key={i} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-semibold text-[#111827]">
                    <span>{it.q}</span>
                    <ChevronRight size={18} className="shrink-0 transition-transform [details[open]_&]:rotate-90" />
                  </summary>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)]">{it.a}</p>
                </details>
              ))}
            </div>
          </section>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </PageContainer>
      <Footer lang="ru" />
    </>
  )
}
