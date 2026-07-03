// Pillar #5 — life-in-Bali hub for the relocator audience. Covers
// visas, taxes for individuals, schools, healthcare, daily-life costs.
// Information cluster (vs investment cluster of /investicii-v-nedvizhimost-bali):
// less commercial intent, higher informational depth.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Plane, GraduationCap, Stethoscope, Wallet, Wifi, ChevronRight, FileCheck2 } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 мая 2026 г.'

export const metadata: Metadata = {
  title: 'Жизнь на Бали — ВНЖ, визы, налоги, школы, медицина | Balinsky',
  description: 'Гайд по переезду на Бали: KITAS, Second Home Visa, Golden Visa, налоги для иностранца-резидента, международные школы, медицина BIMC и Siloam, реальные расходы 2026.',
  alternates: {
    canonical: '/ru/zhizn-na-bali',
    languages: {
      ru: `${SITE_URL}/ru/zhizn-na-bali`,
      en: `${SITE_URL}/en/living-in-bali`,
      'x-default': `${SITE_URL}/ru/zhizn-na-bali`,
    },
  },
  openGraph: {
    title: 'Жизнь на Бали — гайд для переезжающих 2026',
    description: 'ВНЖ через KITAS / Second Home Visa / Golden Visa, налоги, школы, медицина, бюджет на семью — на основе опыта операторов сайта.',
    type: 'article',
    url: '/ru/zhizn-na-bali',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Жизнь на Бали — гайд для переезжающих',
    description: 'ВНЖ, визы, налоги, школы, медицина, бюджет.',
    images: ['/balina.jpg'],
  },
}

const FAQ = [
  { q: 'Какая виза подходит для переезда на Бали на долгий срок?',
    a: 'Базовый набор: B211A (туристическая, до 6 месяцев с продлением) — для пробного периода. KITAS Investor (1-2 года, от $40K инвестиций в PT PMA) — для предпринимателей и инвесторов. KITAS Working — через работодателя в Индонезии. Second Home Visa (5-10 лет, депозит $130K в местном банке) — для финансово независимых. Golden Visa (5-10 лет, инвестиции от $350K) — топовый формат для HNW.' },
  { q: 'Какие налоги платит иностранец-резидент Индонезии?',
    a: 'После получения KITAS и пребывания >183 дней в году — налоговый резидент Индонезии. Прогрессивная шкала НДФЛ: 5% до 60 млн рупий (~$4K), 15% до 250 млн, 25% до 500 млн, 30% до 5 млрд, 35% выше. На мировой доход (но есть соглашения об избежании двойного налогообложения, в т.ч. с РФ, Казахстаном, Беларусью).' },
  { q: 'Сколько стоит образование детей в международной школе?',
    a: 'Базовые: Sunrise School (Bumin), Australian Independent School, Cita Hati — $7-15K в год за ребёнка начальной школы. Премиум: Green School Bali — $20-28K, Australian International School — $18-25K. Дошкольное (3-5 лет) — $5-10K в год. Бюджет на двух детей в средней школе — $20-35K в год.' },
  { q: 'Какая медицина доступна на Бали?',
    a: 'Международного уровня: BIMC Kuta (отделение Cleveland Clinic), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu. Цена консультации специалиста — $40-80, КТ/МРТ — $200-400, экстренная операция — $5-15K. Обязательна международная страховка (Allianz, Cigna, Bupa) — $1500-3500/год на взрослого. Серьёзные операции и онкология — обычно эвакуация в Сингапур или Малайзию.' },
  { q: 'Какой бюджет на жизнь семьи из 4 человек на Бали?',
    a: 'Комфортный (двое детей в международной школе, дом 3BR с садом и бассейном в Умаласе, помощница 4 раза в неделю, машина): $5500-7500/мес = $66-90K/год. Премиум (Green School, вилла в Berawa, водитель и помощница full-time, два авто): $9000-13000/мес = $108-156K/год. Минимум (без школы, скромная вилла 2BR в Сануре): $2200-3000/мес.' },
  { q: 'Можно ли работать удалённо с Бали — что с интернетом и инфраструктурой?',
    a: 'Можно. Биз-инфраструктура — на уровне развитых тропических стран: оптика 200-1000 Мбит/с есть в Чангу, Берава, Умалас, Сануре, многих ЖК Букита. Коворкинги (Outpost, Tropical Nomad, Dojo, Soul & Surf) с круглосуточным доступом. Электричество стабильно, перебои редко. Виза KITAS Investor или B211A (с E33G визой digital nomad с октября 2025) легально покрывают удалённую работу.' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/ru` },
      { '@type': 'ListItem', position: 2, name: 'Жизнь на Бали', item: `${SITE_URL}/ru/zhizn-na-bali` },
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

  const SECTIONS = [
    { Icon: Plane, title: 'Визы и ВНЖ', body: 'KITAS Investor от $40K, Second Home Visa от $130K депозита, Golden Visa от $350K инвестиций. Туристическая B211A на 6 месяцев для пробного периода.' },
    { Icon: FileCheck2, title: 'Налоги для резидента', body: 'После 183 дней в году — налоговый резидент. Прогрессивная шкала 5-35%. Соглашения об избежании двойного налогообложения с РФ, Казахстаном, Беларусью.' },
    { Icon: GraduationCap, title: 'Школы для детей', body: 'Sunrise School / AIS / Cita Hati: $7-15K/год. Премиум — Green School ($20-28K) и AIS Premium. Сильное сообщество русскоязычных семей.' },
    { Icon: Stethoscope, title: 'Медицина', body: 'BIMC, Siloam, Kasih Ibu — клиники международного уровня. Обязательна страховка ($1500-3500/год). Серьёзная хирургия — эвакуация в Сингапур.' },
    { Icon: Wallet, title: 'Бюджет семьи', body: 'Семья из 4: комфортный — $66-90K/год, премиум — $108-156K/год. Базовый прожиточный минимум без школ — от $2200/мес.' },
    { Icon: Wifi, title: 'Удалёнка', body: 'Оптика 200-1000 Мбит/с во всех инвест-районах. Коворкинги Outpost / Tropical Nomad / Dojo. KITAS Investor или новая E33G цифровая виза легально покрывают удалёнку.' },
  ]

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Главная', href: '/ru' },
          { label: 'Жизнь на Бали' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Жизнь на Бали — гайд для переезжающих
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              ВНЖ через KITAS, Second Home Visa и Golden Visa, налоги для иностранца-резидента, реальные расходы на семью,
              международные школы, медицина и инфраструктура для удалённой работы — собрано из опыта операторов сайта,
              живущих на острове 5+ лет.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Обновлено: {UPDATED}</p>
          </header>

          <section className="mb-12 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {SECTIONS.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Icon size={22} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[15px] font-semibold text-[#111827] mb-1">{title}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">{body}</p>
              </div>
            ))}
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Визы и ВНЖ — какой формат под какую ситуацию</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>B211A — туристическая виза.</strong> 60 дней с возможностью продления до 6 месяцев. Подходит для пробного периода, разведки острова до решения о переезде. Стоимость $50-100 + услуги агента $50-150.</p>
              <p><strong>E33G — digital nomad visa (с октября 2025).</strong> До 1 года, требует подтверждённый доход от $60K/год извне Индонезии. Не даёт права работать на местные компании, но легализует удалёнку. Идеальна для freelance и remote workers.</p>
              <p><strong>KITAS Investor.</strong> 1-2 года с продлением, привязана к PT PMA с минимум $40K инвестиций. Даёт возможность жить, открыть банковский счёт, купить машину, оформить мед.страховку как резидент. Самый популярный формат для предпринимателей.</p>
              <p><strong>Second Home Visa.</strong> 5-10 лет, требует депозит $130K в индонезийском банке (можно постепенно вывести). Для финансово независимых, пенсионеров, состоятельных семей.</p>
              <p><strong>Golden Visa.</strong> 5-10 лет, инвестиции $350K (физлицо) или $25M (компания). Топовый формат — даёт максимум прав и минимум проверок при продлении.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Налоги для иностранца-резидента</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>После 183 дней пребывания в Индонезии в течение 12 месяцев — налоговый резидент. С 2025 года Индонезия применяет worldwide taxation: НДФЛ платится со всех доходов глобально, не только с местных.</p>
              <p>Прогрессивная шкала: 5% до 60 млн IDR (~$4K), 15% до 250 млн (~$16K), 25% до 500 млн (~$32K), 30% до 5 млрд (~$320K), 35% выше. Налоговый год = календарный год, декларация подаётся до 31 марта.</p>
              <p>Снижают нагрузку соглашения об избежании двойного налогообложения. У Индонезии есть DTA с Россией, Казахстаном, Беларусью, Украиной, всеми странами ЕС, США, UK, Сингапуром, Австралией — около 70 стран. Налог, уплаченный за рубежом, засчитывается в индонезийский.</p>
              <p>Для structuring дохода через PT PMA: корпоративный налог 22% + дивидендный 10% при выплате нерезиденту (с учётом DTA). Часто эффективная нагрузка ниже личной НДФЛ на крупных доходах.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Школы для детей</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Дошкольное образование (3-5 лет):</strong> Sunrise Preschool, Sanggar Anak Tangguh, Australian Independent (early years) — $5-10K в год. Сильные программы Монтессори, Reggio Emilia, Waldorf.</p>
              <p><strong>Начальная и средняя школа базового уровня:</strong> Sunrise School (Bumin Sanur), Australian Independent School (Sanur), Cita Hati (Denpasar), Bali Island School (Sanur) — $7-15K в год. Cambridge и International Baccalaureate программы, английский plus испанский/мандарин/индонезийский.</p>
              <p><strong>Премиум:</strong> Green School Bali ($20-28K/год) — известная во всём мире eco-friendly бамбуковая школа. Australian International School (Sanur, premium tier $18-25K) — Cambridge IGCSE / A-level.</p>
              <p>Сильное русскоязычное сообщество (1000+ семей) — есть русская школа в Чангу (программы РФ), еженедельные клубы, олимпиады по русскому языку. Полное покрытие 1-11 класс.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Медицина</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Клиники международного уровня:</strong> BIMC Kuta (отделение Cleveland Clinic), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu Hospital. Большинство врачей англоговорящие, ряд — с международной сертификацией (US Board, AHPRA, GMC).</p>
              <p><strong>Цены без страховки:</strong> консультация специалиста $40-80, общий анализ крови $25-40, КТ/МРТ $200-400, экстренная операция средней сложности $5-15K, роды (естественные) $2-4K, кесарево $4-7K.</p>
              <p><strong>Страховка обязательна:</strong> Allianz Worldwide Care, Cigna Global, Bupa Global, Aetna International. Базовый план для взрослого 30-40 лет — $1500-2500/год, премиум с госпитализацией в Сингапуре — $3500-6000/год.</p>
              <p>Серьёзная онкология, кардиохирургия, нейрохирургия — обычно эвакуация в Сингапур (Mount Elizabeth, Gleneagles) или Малайзию (Sunway Medical). Большинство страховок покрывают эвакуацию.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Реальный бюджет на жизнь</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Категория</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Минимум</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Комфорт</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Премиум</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:py-2 [&_td]:px-3 [&_td]:border-b [&_td]:border-[var(--color-border)]">
                  <tr><td className="font-semibold">Жильё (аренда 3BR)</td><td>$1000-1500</td><td>$2500-3500</td><td>$5000-9000</td></tr>
                  <tr><td className="font-semibold">Транспорт</td><td>$150 (скутер)</td><td>$500 (авто+скутер)</td><td>$1500 (водитель)</td></tr>
                  <tr><td className="font-semibold">Питание</td><td>$400</td><td>$1200</td><td>$2500</td></tr>
                  <tr><td className="font-semibold">Помощница</td><td>—</td><td>$200 (3 раза/нед)</td><td>$600 (full-time)</td></tr>
                  <tr><td className="font-semibold">Школа на 2 детей</td><td>—</td><td>$1500</td><td>$3500</td></tr>
                  <tr><td className="font-semibold">Страховка семьи</td><td>$300</td><td>$600</td><td>$1200</td></tr>
                  <tr><td className="font-semibold">Прочее</td><td>$200</td><td>$700</td><td>$1500</td></tr>
                  <tr className="font-semibold"><td>ИТОГО /мес</td><td>$2050-2550</td><td>$7200-8200</td><td>$15800-19800</td></tr>
                </tbody>
              </table>
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

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Следующие шаги</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/ru/investicii-v-nedvizhimost-bali" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Инвестиции в недвижимость Бали</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Доходность, лизхолд, налоги, окупаемость — полный гайд для покупателя.</p>
              </Link>
              <Link href="/ru/villy/umalas" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Виллы в Умалас — резидентский район</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Тихий район для семей с детьми, школы и инфраструктура рядом.</p>
              </Link>
              <Link href="/ru/villy/sanur" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Виллы в Санур — спокойный курорт</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Семейная аудитория, прогулочный променад, low risk.</p>
              </Link>
              <Link href="/ru/kontakty" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Связаться</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Telegram, email, контакты для покупателей и партнёров.</p>
              </Link>
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
