// Expanded SEO copy block injected into HomePageContent, split into
// distinct topic clusters: districts, legal structures, taxes,
// editorial standards, FAQ already lives in the parent. Total RU+EN
// copy is around 1500 words per language as the audit asked for.

import Link from 'next/link'
import { pickCopy, type Lang } from '@/lib/i18n'

type Block = {
  id: string
  h3: string
  paragraphs: string[]
  links?: { label: string; href: string }[]
}

const BLOCKS: Record<'ru' | 'en', Block[]> = {
  ru: [
    {
      id: 'why-bali',
      h3: 'Почему Бали выбирают для инвестиций в 2026',
      paragraphs: [
        'Бали — рекордсмен Юго-Восточной Азии по входящему туризму: 6-7 миллионов международных гостей в год, загрузка отелей и аренд 70-85% в Чангу и на Буките, средний дневной тариф растёт на 8-12% в год с 2023 года. Это даёт основу для устойчивой доходности от посуточной и помесячной аренды — реальные цифры по соседним объектам публично доступны через estatemarket.io (Booking-аналитика по 1 км вокруг любого объекта).',
        'При этом порог входа для иностранца ниже, чем в большинстве конкурирующих рынков: $120-200K за стартовый юнит в инвестиционном районе. Похожих условий в регионе нет — Пхукет и Хошимин дороже и сложнее по сделке, Самуи и Лангкави с меньшим спросом.',
        'Бали остаётся одним из немногих рынков, где иностранец может законно владеть недвижимостью без получения местного гражданства — через лизхолд (долгосрочную аренду земли) или индонезийское юр.лицо PT PMA.',
      ],
      links: [
        { label: 'Полный гайд по инвестициям →', href: '/ru/investicii-v-nedvizhimost-bali' },
      ],
    },
    {
      id: 'districts',
      h3: 'Где покупать — короткий гид по районам',
      paragraphs: [
        'Каждый район Бали имеет свой профиль арендатора, ценовой коридор и инвест-логику. Чангу (Berawa, Batu Bolong, Pererenan) — тренд-район, высокая доходность 10-13%, активная посуточная аренда, premium-аудитория digital nomads. Букит (Uluwatu, Pandawa, Ungasan, Bingin) — премиум-сегмент с океанскими видами, доходность 10-15%, longer stays 5-10 ночей.',
        'Убуд — wellness-центр, доходность 6-9%, длительные аренды 7-14 ночей, подходит для тех, кто планирует совмещать сдачу с собственным проживанием. Санур и Нуса Дуа — семейные курорты с low-risk профилем, доходность 5-8%, стабильная круглогодичная загрузка.',
      ],
      links: [
        { label: 'Виллы в Чангу', href: '/ru/villy/canggu' },
        { label: 'Виллы в Улувату', href: '/ru/villy/uluwatu' },
        { label: 'Виллы в Убуде', href: '/ru/villy/ubud' },
        { label: 'Виллы в Сануре', href: '/ru/villy/sanur' },
      ],
    },
    {
      id: 'structures',
      h3: 'Лизхолд или PT PMA — что выбрать',
      paragraphs: [
        'Лизхолд — долгосрочная аренда земли у местного владельца на 25-80 лет с возможностью продления. Это самая распространённая структура для иностранцев, покупающих 1-2 объекта. Оформление 1-2 месяца через нотариуса PPAT, цена сделки на $5-15K дешевле PT PMA. Земля при этом остаётся за местным владельцем, а покупатель получает только право пользования.',
        'PT PMA — индонезийское юр.лицо с иностранным участием, которое может владеть freehold-земли. Подходит для портфельных инвесторов от 3+ объектов или для коммерческой недвижимости. Требует $25 000 уставного капитала, годовой бухгалтерской отчётности, налога на прибыль 22%.',
        'Универсальное правило: до $500K общего портфеля — лизхолд. Выше — PT PMA. Если планируется официальная сдача в аренду как бизнес-деятельность — только PT PMA.',
      ],
      links: [
        { label: 'Пошаговый гайд «Как купить» →', href: '/ru/kak-kupit' },
      ],
    },
    {
      id: 'taxes',
      h3: 'Налоги и расходы иностранца',
      paragraphs: [
        'При покупке: 5% налог на приобретение (BPHTB) от кадастровой стоимости, 1-2% нотариус PPAT, 3-5% комиссия агента (если есть). При владении: ежегодный PBB (налог на имущество) 0,1-0,3% от кадастра. При сдаче в аренду: 20% подоходный налог для физического лица, ниже через PT PMA. При продаже: 2,5% налог с суммы сделки.',
        'Скрытые расходы: ежегодная аренда офиса для PT PMA (~$1000), бухгалтерская поддержка ($150-300/мес), продление лизхолда (по условиям договора, обычно 50-70% от первоначальной цены), пересмотр кадастра раз в 3 года.',
      ],
    },
    {
      id: 'editorial',
      h3: 'Как мы проверяем объекты в каталоге',
      paragraphs: [
        'Balinsky — это не агрегатор всего подряд. Каждый объект проходит редакторский QA до публикации. Мы сверяем PBG (разрешение на строительство), SLF (сертификат пригодности к эксплуатации), статус земли по RDTR (региональный план зонирования), регистрацию застройщика как PT (индонезийского юр.лица), фактическое состояние объекта своим выездом с фото и видео.',
        'Объекты без PBG, с истёкшим лизхолдом меньше 30 лет, с сельхозземлёй или с неустановленным застройщиком — в каталог не попадают. Это сокращает количество объектов, но даёт гарантию: всё, что вы видите на сайте, можно купить.',
        'Документы и видео с земли доступны на странице каждого объекта. Связь с менеджером застройщика — через @BalinskyBot в Telegram, стандарт ответа в течение часа.',
      ],
      links: [
        { label: 'Подробнее о редакторском подходе →', href: '/ru/o-balinsky' },
      ],
    },
  ],
  en: [
    {
      id: 'why-bali',
      h3: 'Why Bali in 2026',
      paragraphs: [
        'Bali is South-East Asia\'s tourism heavyweight: 6-7 million international visitors annually, 70-85% occupancy in Canggu and Bukit hotels and rentals, ADR growing 8-12% year-over-year since 2023. That gives a solid base for nightly and monthly rental yields — real comparable numbers per neighbour are publicly available via estatemarket.io (Booking analytics by 1 km radius).',
        'Entry barriers for foreigners are lower than in most competing markets: $120-200K for a starter unit in an investment district. Nothing comparable exists in the region — Phuket and Ho Chi Minh are pricier and harder on transactions, Samui and Langkawi see weaker demand.',
        'Bali remains one of the few markets where a foreigner can legally hold property without obtaining local citizenship — through leasehold (long-term land lease) or PT PMA (Indonesian limited liability with foreign shareholders).',
      ],
      links: [
        { label: 'Full Bali investment guide →', href: '/en/bali-property-investment' },
      ],
    },
    {
      id: 'districts',
      h3: 'Where to buy — district quick guide',
      paragraphs: [
        'Each Bali district has its own tenant profile, price corridor and investment logic. Canggu (Berawa, Batu Bolong, Pererenan) is the trend district — 10-13% yield, active short-term rental, premium digital-nomad audience. Bukit (Uluwatu, Pandawa, Ungasan, Bingin) is the premium ocean-view segment — 10-15% yield, longer stays of 5-10 nights.',
        'Ubud is the wellness centre — 6-9% yield, long stays 7-14 nights, ideal if you plan to combine renting with personal use. Sanur and Nusa Dua are family-friendly resorts with a low-risk profile — 5-8% yield, stable year-round occupancy.',
      ],
      links: [
        { label: 'Villas in Canggu', href: '/en/villas/canggu' },
        { label: 'Villas in Uluwatu', href: '/en/villas/uluwatu' },
        { label: 'Villas in Ubud', href: '/en/villas/ubud' },
        { label: 'Villas in Sanur', href: '/en/villas/sanur' },
      ],
    },
    {
      id: 'structures',
      h3: 'Leasehold or PT PMA — which to pick',
      paragraphs: [
        'Leasehold — long-term land lease from a local owner for 25-80 years with extension options. Most common structure for foreigners buying 1-2 properties. Closes in 1-2 months at a PPAT notary, $5-15K cheaper than PT PMA. The land stays with the local owner — the buyer gets the right to use only.',
        'PT PMA — Indonesian company with foreign shareholders that can hold freehold land. Fits portfolio investors with 3+ units or commercial real estate. Requires $25,000 paid-up capital, annual accounting, 22% corporate income tax.',
        'Universal rule: up to $500K total portfolio — leasehold. Above — PT PMA. If you plan official rental as a business activity — PT PMA only.',
      ],
      links: [
        { label: 'Step-by-step «How to buy» →', href: '/en/how-to-buy' },
      ],
    },
    {
      id: 'taxes',
      h3: 'Taxes and ownership costs',
      paragraphs: [
        'On purchase: 5% acquisition tax (BPHTB) on cadastral value, 1-2% PPAT notary, 3-5% agent commission if applicable. On ownership: annual PBB (property tax) 0.1-0.3% of cadastral value. On rental income: 20% personal income tax, lower through PT PMA. On sale: 2.5% income tax on the sale price.',
        'Hidden costs: annual PT PMA office rent (~$1000), bookkeeping support ($150-300/mo), leasehold extension (per contract, typically 50-70% of the original price), cadastral re-assessment every 3 years.',
      ],
    },
    {
      id: 'editorial',
      h3: 'How we verify catalogue properties',
      paragraphs: [
        'Balinsky is not a catch-all aggregator. Every property passes an editorial QA before publication. We verify PBG (building permit), SLF (certificate of fitness for use), land status against RDTR (regional zoning plan), developer registration as PT (Indonesian legal entity), actual property condition through our on-the-ground visit with photo and video.',
        'Properties without PBG, with leasehold below 30 years remaining, on agricultural land, or with unidentified developers do not enter the catalogue. This shrinks the listing count but guarantees that anything you see on the site can actually be bought.',
        'Documents and on-the-ground videos live on every property page. Contact with the developer\'s manager — through @BalinskyBot on Telegram, service standard one-hour response.',
      ],
      links: [
        { label: 'More on our editorial approach →', href: '/en/about' },
      ],
    },
  ],
}

export function HomeSeoBlocks({ lang }: { lang: Lang }) {
  return (
    <div className="space-y-10 max-w-3xl mt-10">
      {pickCopy(BLOCKS, lang).map(b => (
        <section key={b.id}>
          <h3 className="text-[18px] md:text-[20px] font-semibold text-[#111827] mb-3">{b.h3}</h3>
          <div className="space-y-3 text-[15px] leading-[1.7] text-[var(--color-text)]">
            {b.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          {b.links && b.links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
              {b.links.map(l => (
                <Link key={l.href} href={l.href} className="text-[var(--color-primary)] no-underline hover:underline">
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
