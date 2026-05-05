import Link from 'next/link'
import type { Lang } from '@/lib/i18n'

// Bottom-of-page editorial copy for the shortlist / comparison route.
// Two jobs:
//   1. Give Google something concrete to index — the page is otherwise
//      driven by per-visitor localStorage and looks empty to a crawler.
//   2. Fill the lower half of the viewport with useful copy when the
//      visitor only has 2-3 saved listings, so the comparison table
//      doesn't sit alone on a 1280px-wide page.

const COPY = {
  ru: {
    h2What: 'Сравнение объектов недвижимости на Бали',
    pWhat: 'Страница собирает все ваши сохранённые виллы, апартаменты и жилые комплексы в одну таблицу — рядом видно цену, цену за квадратный метр, спальни, площадь, оставшийся срок лизхолда, разрешения, заявленную доходность и тип сделки. Виллы и апартаменты сравниваются между собой; жилые комплексы выводятся отдельным списком, потому что у них фазы, очереди и диапазоны цен.',
    h2What2: 'Почему именно эти параметры',
    pWhat2: 'При выборе недвижимости на Бали иностранец смотрит не только на спальни и площадь. Прежде всего важна юридическая структура — на каком основании владеет объект, сколько лет лизхолда осталось, какое разрешение на строительство (PBG / SLF), допускает ли зонирование туристическую сдачу. Дальше — экономика: цена за метр относительно района, заявленная застройщиком доходность, тип сделки (от застройщика или перепродажа). Эти восемь полей закрывают 80% решений на этапе шорт-листа.',
    h2Lease: 'Лизхолд и сроки',
    pLease: 'Иностранец не может оформить freehold (Hak Milik) — землю на Бали нерезидент держит в лизхолде или через PT PMA. Стандартный срок — 25, 30, 50 или 80 лет. Важно смотреть остаток срока на момент покупки и условие продления (extension). Лизхолд с возможностью extension считается ликвидным; без extension — окно выхода равно остатку лизхолда минус 5–7 лет на удобную перепродажу.',
    h2Permit: 'PBG, SLF и Pondok Wisata',
    pPermit: 'PBG (Persetujuan Bangunan Gedung) — разрешение на строительство, без него легально строить нельзя. SLF (Sertifikat Laik Fungsi) — сертификат пригодности к эксплуатации, выдаётся после сдачи. Pondok Wisata — лицензия на легальную краткосрочную сдачу (Airbnb, Booking) для частных вилл и небольших объектов. Если планируете STR-доход, наличие или возможность получить Pondok Wisata критично.',
    h2Roi: 'Заявленная доходность',
    pRoi: 'Цифры доходности в таблице — то, что декларирует застройщик или продавец. Реальная доходность зависит от района, сезонности и управляющей компании. В Чангу (Berawa, Batu Bolong, Pererenan) при загрузке 70–80% обычно выходит 8–12% net годовых, в Букит (Uluwatu, Pandawa) — 9–14%, в Убуде — 6–9% из-за сезонности. Цифры выше 15% в декларации заслуживают отдельной проверки модели.',
    faqHeading: 'Часто задаваемые вопросы',
    faq: [
      { q: 'Как добавить объект в сравнение?',
        a: 'Откройте карточку виллы, апартамента или комплекса и нажмите на сердце в правом верхнем углу галереи. Объект появится здесь.' },
      { q: 'Где хранится мой шортлист?',
        a: 'Только в браузере (localStorage). Между разными устройствами он не синхронизируется — что удобно с точки зрения приватности, но требует пересохранять список с другого устройства.' },
      { q: 'Можно ли отправить шортлист менеджеру?',
        a: 'Да, кнопка «Отправить в Telegram» сверху справа открывает Telegram с готовым сообщением — все ссылки на ваши сохранённые объекты в одном чате.' },
      { q: 'Почему жилые комплексы не сравниваются с виллами?',
        a: 'У комплекса нет одной цены и одной планировки — он состоит из десятков юнитов с разными площадями и ценами. Сравнивать проект с готовой виллой по строке «спальни» бессмысленно. Поэтому комплексы вынесены в отдельную секцию-список.' },
    ],
    ctaHeading: 'Дальше',
    ctaText: 'Шортлист пуст или хочется добавить ещё объектов?',
    ctaVillas: 'Каталог вилл',
    ctaApartments: 'Каталог апартаментов',
    ctaComplexes: 'Жилые комплексы',
    ctaDevelopers: 'Все застройщики',
  },
  en: {
    h2What: 'Compare properties in Bali',
    pWhat: 'This page lines up every saved villa, apartment and residential complex in one comparison table — price, price per square metre, bedrooms, area, remaining leasehold, permits, claimed yield and deal type all sit side by side. Villas and apartments compare against each other; complexes get their own list section because they sell phases and unit ranges, not single units.',
    h2What2: 'Why these fields',
    pWhat2: 'A foreign buyer in Bali looks at far more than bedrooms and area. The legal structure comes first — ownership type, leasehold years left, building permit (PBG / SLF), whether zoning allows short-term tourism. Then the economics — price per square metre against the district, the developer-claimed yield, deal type (off-plan vs resale). These eight fields cover 80% of the shortlist decision.',
    h2Lease: 'Leasehold and terms',
    pLease: 'Foreigners cannot hold freehold (Hak Milik) on Bali — non-residents own through a leasehold or a PT PMA company. Typical leases are 25, 30, 50 or 80 years. The remaining term at the date of purchase matters, and so does the renewal clause (extension). A leasehold with a usable extension is considered liquid; without one, your exit window is the leasehold remainder minus the 5–7 years it usually takes to resell smoothly.',
    h2Permit: 'PBG, SLF and Pondok Wisata',
    pPermit: 'PBG (Persetujuan Bangunan Gedung) is the building permit — no legal construction without it. SLF (Sertifikat Laik Fungsi) is the certificate of fitness for use, issued at handover. Pondok Wisata is the short-term-rental licence (Airbnb, Booking) for private villas and small objects. If you are planning to run STR income, having or being eligible for a Pondok Wisata permit is critical.',
    h2Roi: 'Claimed yield',
    pRoi: 'The yield figure in the table is what the developer or seller declares. The real number depends on the district, seasonality and the management company. In Canggu (Berawa, Batu Bolong, Pererenan) at 70–80% occupancy you typically see 8–12% net per year; in Bukit (Uluwatu, Pandawa) — 9–14%; in Ubud — 6–9% because of seasonality. Anything above 15% claimed deserves a separate look at the underlying model.',
    faqHeading: 'Frequently asked questions',
    faq: [
      { q: 'How do I add a listing to the comparison?',
        a: 'Open a villa, apartment or complex page and tap the heart in the top-right corner of the photo gallery. It will appear here.' },
      { q: 'Where is my shortlist stored?',
        a: 'Only in your browser (localStorage). It does not sync across devices — good for privacy, but you have to re-add listings from a second device.' },
      { q: 'Can I send the shortlist to a manager?',
        a: 'Yes — the "Send to Telegram" button in the top-right opens Telegram with a pre-filled message that contains every saved URL.' },
      { q: 'Why are residential complexes not compared with villas?',
        a: 'A complex does not have one price or one layout — it is dozens of units across different sizes. Comparing a project with a finished villa on a "bedrooms" row is meaningless, so complexes get their own list section.' },
    ],
    ctaHeading: 'What next',
    ctaText: 'Shortlist empty, or want to add more?',
    ctaVillas: 'Villas catalogue',
    ctaApartments: 'Apartments catalogue',
    ctaComplexes: 'Residential complexes',
    ctaDevelopers: 'All developers',
  },
} as const

export function ShortlistSeoContent({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const link = (path: string, label: string) => (
    <Link
      key={label}
      href={path}
      className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[13px] no-underline text-[var(--color-text)] bg-white"
    >
      {label}
    </Link>
  )
  const villasHref     = lang === 'en' ? '/en/villas'      : '/ru/villy'
  const apartmentsHref = lang === 'en' ? '/en/apartments'  : '/ru/apartamenty'
  const complexesHref  = lang === 'en' ? '/en/complexes'   : '/ru/zhilye-kompleksy'
  const developersHref = lang === 'en' ? '/en/developers'  : '/ru/zastrojshhiki'

  // FAQ JSON-LD lets Google render rich Q&A snippets in search even
  // though the rest of the page is per-visitor data.
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <section className="mt-12 max-w-[760px] text-[15px] leading-[1.7] text-[var(--color-text)]">
      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2What}</h2>
      <p className="mb-6">{c.pWhat}</p>

      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2What2}</h2>
      <p className="mb-6">{c.pWhat2}</p>

      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2Lease}</h2>
      <p className="mb-6">{c.pLease}</p>

      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2Permit}</h2>
      <p className="mb-6">{c.pPermit}</p>

      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2Roi}</h2>
      <p className="mb-8">{c.pRoi}</p>

      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">{c.faqHeading}</h2>
      <ul className="mb-8 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {c.faq.map(f => (
          <li key={f.q} className="py-4">
            <h3 className="text-[16px] font-semibold mb-1 text-[#111827]">{f.q}</h3>
            <p className="text-[14px] text-[var(--color-text-muted)]">{f.a}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <h2 className="text-[18px] font-semibold mb-3 text-[#111827]">{c.ctaHeading}</h2>
        <p className="text-[14px] text-[var(--color-text-muted)] mb-3">{c.ctaText}</p>
        <div className="flex flex-wrap gap-2">
          {link(villasHref,     c.ctaVillas)}
          {link(apartmentsHref, c.ctaApartments)}
          {link(complexesHref,  c.ctaComplexes)}
          {link(developersHref, c.ctaDevelopers)}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  )
}
