// Foreign-buyer landing page. Explains the full path from "I saw a
// villa I like" to "I own a leasehold (or PT PMA share) on Bali" with
// real timelines, taxes, and the most common mistakes. Optimised for
// search — every section has its own H2 + body text, and a FAQPage
// JSON-LD block at the bottom for rich snippets.

import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import {
  ClipboardList, FileSearch, Stamp, CreditCard, KeyRound,
  Building2, Settings2, AlertTriangle, Lock, Globe, MessageCircle,
} from 'lucide-react'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    home: 'Главная',
    crumb: 'Как купить на Бали',
    h1: 'Как купить недвижимость на Бали — для иностранца',
    intro: 'На Бали покупают виллы и апартаменты в инвестиционных целях, для жизни и под перепродажу. Иностранец не может оформить freehold, но через лизхолд и PT PMA сделка проходит у нотариуса PPAT и юридически защищает покупателя так же, как любая другая. Эта страница — пошаговая карта процесса со всеми реальными цифрами, сроками и местами, где обычно теряют деньги.',
    tocTitle: 'Содержание',
    tocSteps: 'Шаги покупки',
    tocOwnership: 'Структура владения',
    tocCosts: 'Реальные расходы',
    tocMistakes: 'Типовые ошибки',
    tocCountries: 'Страновые особенности',
    tocFaq: 'FAQ',

    h2Steps: 'Семь шагов сделки',
    stepsLead: 'Стандартный путь покупки off-plan недвижимости (от застройщика). Resale-сделки идут быстрее и без рассрочки, но шаги 2 и 3 такие же.',
    steps: [
      { Icon: ClipboardList, title: 'Резервирование', time: '1–3 дня', body: 'Подписываете reservation form, вносите holding deposit (обычно $2 000–10 000). Объект снимается с продажи на 14 дней. Депозит возвращается, если вы откажетесь после due diligence — это закрепляет цену, но не обязывает покупать.' },
      { Icon: FileSearch, title: 'Due diligence', time: '2–3 недели', body: 'Юрист проверяет: номер сертификата на землю (SHM/HGB/Hak Pakai), действующий PBG, зонирование, отсутствие обременений, право застройщика на продажу. Параллельно — финансовое DD по застройщику: сданные проекты, судебные споры, регистрация PT.' },
      { Icon: Stamp, title: 'Нотариус (PPAT)', time: '4–6 недель', body: 'Подписание SPA (Sale & Purchase Agreement) или Lease Agreement в присутствии нотариуса PPAT — государственный чиновник, единственное лицо имеющее право регистрировать сделки с землёй на Бали. Без PPAT сделка не считается совершённой.' },
      { Icon: CreditCard, title: 'Транши', time: 'по графику застройщика', body: 'Off-plan оплачивается обычно в 3–4 транша: 30/40/30 или 50/50. Каждый транш привязан к этапу стройки (foundation, topping out, handover). Деньги переводятся напрямую застройщику или на эскроу-счёт нотариуса в зависимости от условий SPA.' },
      { Icon: KeyRound, title: 'Сдача и handover', time: 'дата по SPA', body: 'Финальный платёж, осмотр объекта (snag list), получение SLF (сертификат пригодности). Ключи передают только после полной оплаты. Расхождения с проектной документацией фиксируете на handover — потом доказать сложнее.' },
      { Icon: Building2, title: 'PT PMA или ownership-структура', time: '4–8 недель', body: 'Если покупаете через PT PMA (иностранную компанию-резидента), регистрация занимает 4–8 недель и стоит $1 500–3 500. Лизхолд оформляется напрямую — PT PMA не нужен, кроме случаев когда хотите KITAS (вид на жительство через инвестиции).' },
      { Icon: Settings2, title: 'Управление и сдача', time: 'по факту', body: 'Управляющая компания берёт 18–25% от валовой выручки и обеспечивает уборку, маркетинг, чек-ин гостей. Альтернатива — самостоятельная сдача через Booking + личный staff (выше маржа, ниже устойчивость, нужно физическое присутствие).' },
    ],

    h2Ownership: 'Структуры владения',
    ownershipLead: 'У иностранца три варианта. Каждый закрывает свою задачу — выбирайте от горизонта и от того, нужен ли вам KITAS.',
    ownership: [
      {
        title: 'Лизхолд (Hak Sewa)',
        body: 'Долгосрочная аренда земли — обычно 25, 30, 50 или 80 лет. Самый быстрый и дешёвый путь: заключаете договор у нотариуса напрямую с владельцем или застройщиком. Можно продлить, если предусмотрено в договоре. Подходит для виллы под аренду или второго дома. Минус — ограниченный горизонт владения; при остатке менее 15 лет ликвидность падает.',
      },
      {
        title: 'PT PMA',
        body: 'Иностранная компания-резидент Индонезии. Через неё можно владеть Hak Guna Bangunan (HGB) — правом застройки на 30 лет с продлением до 80. PT PMA позволяет получить KITAS (резидентскую визу), нанимать сотрудников, легально вести бизнес. Минимальный уставной капитал — IDR 10 млрд (≈$640 000), но фактически нужно показать только IDR 2.5 млрд. Подходит инвесторам с долгосрочным горизонтом.',
      },
      {
        title: 'Hak Pakai',
        body: 'Право пользования землёй для иностранца с KITAP (постоянным ВНЖ). Срок — 30 лет с продлением. Применим только если уже есть KITAP, поэтому редко используется на старте. Полезен как «чистый» путь для тех, кто планирует жить на Бали постоянно.',
      },
    ],

    h2Costs: 'Реальные расходы — пример на $400 000 (off-plan вилла)',
    costsLead: 'Сверху указана цена объекта. Налоги и сборы добавляются к ней — закладывайте +12–14% поверх стоимости. Числа ниже — для leasehold-сделки; PT PMA добавит ещё ~$2 000–3 500 единоразово.',
    costsRows: [
      { label: 'Стоимость объекта', value: '$400 000', note: 'базовая цена по SPA' },
      { label: 'PPN (НДС)', value: '$44 000', note: '11% для новостроек; resale — 0%' },
      { label: 'BPHTB (налог на передачу прав)', value: '$20 000', note: '5% от сделки, платит покупатель' },
      { label: 'Нотариус (PPAT)', value: '$4 000–6 000', note: '1–1.5%, обычно 50/50 покупатель и продавец' },
      { label: 'Юрист (DD + сопровождение)', value: '$1 500–3 500', note: 'опционально, но строго рекомендуем' },
      { label: 'Управление и регистрация', value: '$0–500', note: 'BPN регистрация леза' },
      { label: 'Итого сверху', value: '$69 500–73 500', note: '+17–18% к цене объекта' },
    ],
    costsFooter: 'PT PMA как структура владения — отдельные $1 500–3 500 на регистрацию и ~$1 200–1 800/год на бухгалтерию и налоговую отчётность.',

    h2Mistakes: 'Семь типовых ошибок иностранца',
    mistakes: [
      'Не проверить PBG/IMB до подписания SPA. Нет PBG — нет легального строительства; объект может быть снесён по решению regency.',
      'Купить leasehold без условия extension. Через 25 лет вы теряете объект; с extension — продлеваете до 50–80.',
      'Перевести деньги на личный счёт продавца, а не на нотариальный счёт. В случае спора деньги уже не вернуть.',
      'Сэкономить на юристе. Стандартный template SPA от застройщика всегда написан в его пользу — нужен независимый юрист, который перепишет рисковые пункты.',
      'Не получить Pondok Wisata, но рассчитывать на STR-доход. Без лицензии Airbnb формально вне закона; могут оштрафовать или закрыть.',
      'Поверить цифрам ROI на сайте без модели. Цифра 12% net годовых требует загрузки 75%+ и ADR в верхнем квартиле района — реалистично, но не гарантировано.',
      'Игнорировать статус земли. Зона «жилая» (residensial) запрещает коммерческую аренду. Зона «туристическая» (pariwisata) — разрешает. Проверяется по zoning map regency.',
    ],

    h2Countries: 'Особенности по странам',
    countries: [
      {
        title: 'США',
        body: 'IRS требует декларировать иностранную недвижимость через FBAR (FinCEN 114) если совокупные иностранные счета превышают $10 000, и через Form 8938 при крупных активах. Доход от аренды декларируется в Schedule E; индонезийский 10% withholding можно зачесть как foreign tax credit. Передача на наследников — через PT PMA проще оформляется.',
      },
      {
        title: 'Австралия',
        body: 'FIRB (Foreign Investment Review Board) формально не распространяется на покупку через лизхолд за рубежом — это не австралийская земля. Но при репатриации дохода CGT применяется, и для tax residents Австралии иностранный rental income подлежит декларации. Учитывайте 15-летний срок declaration на foreign tax offset.',
      },
      {
        title: 'EU',
        body: 'Внутри ЕС — стандартное AML/KYC при переводе крупной суммы. Бельгия / Германия / Франция применяют гражданский налог на недвижимость в зарубежных юрисдикциях по правилам tax treaties с Индонезией. Польша / Чехия / Прибалтика — режимы мягче, обычно зачёт по уплаченному в Индонезии PPh.',
      },
      {
        title: 'Китай',
        body: 'Индивидуальный лимит на вывод капитала из КНР — $50 000/год. Для покупки на $400 000 нужно использовать схемы (несколько лиц, инвестиционные счета, корпоративный путь через Гонконг). Это отдельная задача, обычно решается с китайским налоговым консультантом до перевода депозита. Cделка по сути не отличается от европейской — те же шаги у нотариуса PPAT.',
      },
    ],

    faqHeading: 'Часто задаваемые вопросы',
    faq: [
      { q: 'Может ли иностранец купить freehold на Бали?',
        a: 'Нет. Hak Milik (freehold) доступен только гражданам Индонезии. Иностранец владеет через лизхолд (до 80 лет с продлением) или через индонезийскую компанию PT PMA, которая держит HGB (Hak Guna Bangunan).' },
      { q: 'Что такое PT PMA и нужен ли он мне?',
        a: 'PT PMA — индонезийская компания со 100% иностранным капиталом, легальный способ владеть HGB и вести бизнес. Если планируете жить на Бали (KITAS), нанимать персонал, или иметь несколько объектов — PT PMA удобнее. Для одной виллы под пассивную аренду достаточно лизхолда.' },
      { q: 'Сколько занимает покупка по времени?',
        a: 'Off-plan — 6–12 месяцев от резервирования до handover (зависит от стадии стройки). Сама юридическая часть (DD + нотариус) — 4–6 недель. Resale-сделка может закрыться за 6–8 недель целиком.' },
      { q: 'Безопасно ли переводить деньги в Индонезию?',
        a: 'Да, при условии что платежи идут через нотариальный или эскроу-счёт, а не на личный счёт продавца. Обязательно требуйте wire instructions из SPA, а не из мессенджера — это самый частый канал мошенничества.' },
      { q: 'Можно ли получить визу на Бали через покупку?',
        a: 'Сама по себе покупка не даёт визу. Через регистрацию PT PMA с уставным капиталом и сотрудником вы получаете KITAS на 1–2 года с правом продления. Для пенсионеров есть отдельная Retirement KITAS (с 55 лет, под депозит ~$45 000).' },
      { q: 'Какая реальная доходность у виллы под аренду?',
        a: 'В Чангу и на Буките при загрузке 70–80% — обычно 8–12% net годовых. В Убуде — 6–9% из-за сезонности. Цифры выше 14% в декларации застройщика всегда стоит проверить отдельной финансовой моделью с учётом ADR района и комиссии управляющей компании (18–25%).' },
      { q: 'Что если застройщик не сдаст объект?',
        a: 'Стандартный SPA содержит штрафы за просрочку (обычно 0.05–0.1% от стоимости в день после grace-периода в 3–6 месяцев) и право расторжения с возвратом средств. На практике крупные застройщики сдают с просрочкой 2–6 месяцев; полный фейл — большая редкость, и проверяется на этапе DD по track record.' },
      { q: 'Можно ли продать лизхолд позже?',
        a: 'Да, leasehold переуступается у того же нотариуса PPAT. На рынке Бали есть вторичный спрос на 2–3-летние объекты с заполненной историей аренды. Ликвидность падает когда остаток лизхолда меньше 15 лет — закладывайте это в стратегию выхода.' },
    ],

    ctaHeading: 'Что делать дальше',
    ctaText: 'Готовы посмотреть конкретные объекты или хотите обсудить стратегию вживую?',
    ctaCatalog: 'Открыть каталог',
    ctaCall: 'Связаться с менеджером',
  },
  en: {
    home: 'Home',
    crumb: 'How to buy in Bali',
    h1: 'Buying property in Bali as a foreigner',
    intro: 'Bali real estate is bought for investment, lifestyle, or to flip. Foreigners cannot hold freehold, but through leasehold and PT PMA the deal closes at a PPAT notary and legally protects you the same way any property purchase would. This page is a step-by-step map of the process — real timelines, real fees, and the spots where most foreigners lose money.',
    tocTitle: 'On this page',
    tocSteps: 'The seven steps',
    tocOwnership: 'Ownership structures',
    tocCosts: 'Real all-in costs',
    tocMistakes: 'Common mistakes',
    tocCountries: 'Country-specific notes',
    tocFaq: 'FAQ',

    h2Steps: 'The seven steps',
    stepsLead: 'Standard path for off-plan property (bought from a developer). Resale deals are faster and skip the tranches, but steps 2 and 3 are identical.',
    steps: [
      { Icon: ClipboardList, title: 'Reservation', time: '1–3 days', body: 'You sign a reservation form and pay a holding deposit (typically $2,000–10,000). The unit is taken off market for 14 days. The deposit is refundable if you walk away after due diligence — it locks the price without committing you.' },
      { Icon: FileSearch, title: 'Due diligence', time: '2–3 weeks', body: 'A lawyer verifies the land certificate (SHM / HGB / Hak Pakai), valid PBG, zoning, no liens, and the developer’s right to sell. In parallel, financial DD on the developer: delivered projects, court filings, PT registration.' },
      { Icon: Stamp, title: 'Notary (PPAT)', time: '4–6 weeks', body: 'You sign the SPA (Sale & Purchase Agreement) or Lease Agreement before a PPAT notary — a state official, the only person legally authorised to register Bali land transactions. No PPAT, no completed deal.' },
      { Icon: CreditCard, title: 'Tranches', time: 'developer schedule', body: 'Off-plan typically pays in 3–4 tranches: 30/40/30 or 50/50. Each tranche ties to a build milestone (foundation, topping out, handover). Funds wire directly to the developer or to the notary’s escrow account, per SPA terms.' },
      { Icon: KeyRound, title: 'Handover', time: 'SPA date', body: 'Final payment, snag-list inspection, SLF (certificate of fitness) issued. Keys are released only after full payment. Any deviation from the design package gets recorded at handover — proving anything later is hard.' },
      { Icon: Building2, title: 'PT PMA / ownership setup', time: '4–8 weeks', body: 'If you are buying through a PT PMA (foreign-owned Indonesian company), registration takes 4–8 weeks and costs $1,500–3,500. Pure leasehold skips this — PT PMA is needed only if you also want a KITAS (residence visa via investment).' },
      { Icon: Settings2, title: 'Management and rentals', time: 'ongoing', body: 'A management company takes 18–25% of gross revenue and handles cleaning, marketing, guest check-ins. Alternative: self-manage via Booking + your own staff (higher margin, lower resilience, requires physical presence).' },
    ],

    h2Ownership: 'Ownership structures',
    ownershipLead: 'Three options for foreigners. Each fits a different goal — pick based on your horizon and whether you also want a KITAS visa.',
    ownership: [
      {
        title: 'Leasehold (Hak Sewa)',
        body: 'Long-term land lease — typically 25, 30, 50 or 80 years. Fastest and cheapest path: signed at a notary directly with the owner or developer. Renewable if the contract allows. Fits villa-for-rent or a second home. Downside: limited ownership horizon — once under 15 years remaining, liquidity drops.',
      },
      {
        title: 'PT PMA',
        body: 'Foreign-owned Indonesian company, resident in Indonesia. Owns HGB (Hak Guna Bangunan) — building rights for 30 years, extendable to 80. PT PMA also unlocks KITAS (resident visa), the right to hire local staff, and legal business operation. Minimum nominal capital is IDR 10B (≈$640k), in practice you must show IDR 2.5B paid up. Best for long-horizon investors.',
      },
      {
        title: 'Hak Pakai',
        body: 'Use right granted to a foreigner with KITAP (permanent residence). Term 30 years, extendable. Only applicable if you already hold KITAP, so rarely used at entry. Useful as the "clean" path for those committed to living on Bali full-time.',
      },
    ],

    h2Costs: 'Real all-in costs — example on a $400,000 off-plan villa',
    costsLead: 'The headline price is the contract price. Taxes and fees stack on top — budget +12–14% over the listed price. Numbers below are for a leasehold deal; PT PMA adds ~$2,000–3,500 one-off.',
    costsRows: [
      { label: 'Property price', value: '$400,000', note: 'base SPA price' },
      { label: 'PPN (VAT)', value: '$44,000', note: '11% on new-build; 0% on resale' },
      { label: 'BPHTB (transfer tax)', value: '$20,000', note: '5% of deal, paid by buyer' },
      { label: 'Notary (PPAT)', value: '$4,000–6,000', note: '1–1.5%, typically split 50/50 with seller' },
      { label: 'Lawyer (DD + closing)', value: '$1,500–3,500', note: 'optional but strongly recommended' },
      { label: 'BPN registration', value: '$0–500', note: 'leasehold registration' },
      { label: 'Total on top', value: '$69,500–73,500', note: '+17–18% over property price' },
    ],
    costsFooter: 'PT PMA as the holding structure — separate $1,500–3,500 to register and ~$1,200–1,800/year for accounting and tax filings.',

    h2Mistakes: 'Seven common foreigner mistakes',
    mistakes: [
      'Not checking PBG / IMB before signing the SPA. No PBG = illegal construction; the regency can order demolition.',
      'Buying leasehold without an extension clause. After 25 years you lose the property; with extension you continue to 50–80.',
      'Wiring funds to the seller’s personal account instead of the notary escrow. In a dispute, that money is gone.',
      'Skipping the lawyer. The developer’s template SPA is always written in their favour — an independent lawyer rewrites the risky clauses.',
      'No Pondok Wisata licence but planning STR income. Without it, Airbnb is technically illegal; you risk fines or shutdown.',
      'Trusting the headline ROI. A 12% net claim assumes 75%+ occupancy and top-quartile ADR for the district — possible, not guaranteed.',
      'Ignoring zoning. Residential zoning bans commercial rental; tourism zoning allows it. Check the regency zoning map.',
    ],

    h2Countries: 'Country-specific notes',
    countries: [
      {
        title: 'United States',
        body: 'IRS requires reporting foreign property via FBAR (FinCEN 114) if combined foreign accounts cross $10,000, and Form 8938 for larger holdings. Rental income reports on Schedule E; the Indonesian 10% withholding is creditable as a foreign tax credit. Inheritance is cleaner via PT PMA.',
      },
      {
        title: 'Australia',
        body: 'FIRB rules don’t apply to leasehold purchases overseas — that isn’t Australian land. But repatriated income is subject to CGT, and Australian tax residents must declare foreign rental income. Watch the 15-year window for foreign tax offsets.',
      },
      {
        title: 'EU',
        body: 'Standard AML/KYC on large outbound transfers. Belgium / Germany / France apply civil tax on overseas property under their tax treaties with Indonesia. Poland / Czech Republic / Baltics are softer — usually a credit for Indonesian PPh paid.',
      },
      {
        title: 'China',
        body: 'PRC capital outflow limit is $50,000 per individual per year. A $400k purchase needs structuring (multiple persons, investment accounts, Hong Kong corporate route). This is a separate task — typically solved with a Chinese tax adviser before any deposit. The Bali side of the deal looks identical to a European purchase: same notary, same SPA.',
      },
    ],

    faqHeading: 'Frequently asked questions',
    faq: [
      { q: 'Can a foreigner buy freehold in Bali?',
        a: 'No. Hak Milik (freehold) is restricted to Indonesian citizens. Foreigners hold through leasehold (up to 80 years with extension) or via an Indonesian PT PMA company holding HGB (Hak Guna Bangunan).' },
      { q: 'What is a PT PMA and do I need one?',
        a: 'A PT PMA is an Indonesian company with 100% foreign capital — the legal way to own HGB and run a business. Best if you plan to live on Bali (KITAS), employ staff, or hold multiple properties. For a single rental villa, leasehold is enough.' },
      { q: 'How long does the purchase take?',
        a: 'Off-plan — 6–12 months from reservation to handover (depends on construction stage). The legal part alone (DD + notary) is 4–6 weeks. A resale deal can close in 6–8 weeks total.' },
      { q: 'Is wiring money to Indonesia safe?',
        a: 'Yes, provided payments go to the notary or escrow account, not to the seller’s personal account. Always require wire instructions from the SPA itself, never from a messenger — that is the most common fraud channel.' },
      { q: 'Can I get a visa via the purchase?',
        a: 'The purchase alone doesn’t grant a visa. By registering a PT PMA with paid-up capital and a local employee, you qualify for a KITAS valid 1–2 years and renewable. Retirees have a separate Retirement KITAS from age 55, with a deposit of ~$45,000.' },
      { q: 'What’s the realistic rental yield?',
        a: 'In Canggu and Bukit at 70–80% occupancy: usually 8–12% net per year. Ubud: 6–9% due to seasonality. Anything above 14% in a developer claim deserves a separate financial model with district ADR and management fee (18–25%).' },
      { q: 'What if the developer fails to deliver?',
        a: 'Standard SPAs include late-delivery penalties (typically 0.05–0.1% of price per day after a 3–6 month grace period) and a right of rescission with refund. In practice large developers slip 2–6 months; full failures are rare and screened during DD via track record.' },
      { q: 'Can I sell the leasehold later?',
        a: 'Yes — leasehold transfers happen at the same PPAT notary. There’s active secondary demand for 2–3 year-old units with rental history. Liquidity drops once the leasehold remainder is below 15 years — bake that into your exit strategy.' },
    ],

    ctaHeading: 'What next',
    ctaText: 'Want to look at specific listings or talk strategy live?',
    ctaCatalog: 'Open the catalogue',
    ctaCall: 'Talk to a manager',
  },
} as const

export function BuyingGuide({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const home = lang === 'en' ? '/en' : '/ru'
  const villasHref = lang === 'en' ? '/en/villas' : '/ru/villy'

  // Surface every Q+A as JSON-LD so Google can render Q&A rich
  // snippets for "how to buy property in Bali" queries.
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
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.crumb },
        ]} />

        <article className="mt-4 max-w-[760px]">
          <h1 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-5">
            {c.h1}
          </h1>
          <p className="text-[16px] md:text-[17px] leading-[1.7] text-[var(--color-text)] mb-8">
            {c.intro}
          </p>

          {/* Inline TOC — anchor links jump to each H2 below. */}
          <nav className="mb-12 rounded-2xl border border-[var(--color-border)] bg-white p-5">
            <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-3">{c.tocTitle}</div>
            <ul className="space-y-1.5 text-[14px]">
              <li><a href="#steps"     className="text-[var(--color-text)] hover:text-[var(--color-primary)] no-underline">1. {c.tocSteps}</a></li>
              <li><a href="#ownership" className="text-[var(--color-text)] hover:text-[var(--color-primary)] no-underline">2. {c.tocOwnership}</a></li>
              <li><a href="#costs"     className="text-[var(--color-text)] hover:text-[var(--color-primary)] no-underline">3. {c.tocCosts}</a></li>
              <li><a href="#mistakes"  className="text-[var(--color-text)] hover:text-[var(--color-primary)] no-underline">4. {c.tocMistakes}</a></li>
              <li><a href="#countries" className="text-[var(--color-text)] hover:text-[var(--color-primary)] no-underline">5. {c.tocCountries}</a></li>
              <li><a href="#faq"       className="text-[var(--color-text)] hover:text-[var(--color-primary)] no-underline">6. {c.tocFaq}</a></li>
            </ul>
          </nav>

          {/* STEPS */}
          <h2 id="steps" className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-3 scroll-mt-24">
            {c.h2Steps}
          </h2>
          <p className="text-[15px] leading-[1.7] text-[var(--color-text-muted)] mb-6">{c.stepsLead}</p>
          <ol className="space-y-5 mb-12">
            {c.steps.map(({ Icon, title, time, body }, i) => (
              <li key={i} className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-search-bg)] text-[var(--color-primary)] flex items-center justify-center">
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="flex items-baseline flex-wrap gap-x-3 gap-y-0.5">
                    <span className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)]">Step {i + 1}</span>
                    <h3 className="text-[17px] font-semibold text-[#111827]">{title}</h3>
                    <span className="text-[12px] text-[var(--color-text-muted)]">· {time}</span>
                  </div>
                  <p className="text-[15px] leading-[1.65] text-[var(--color-text)] mt-1">{body}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* OWNERSHIP */}
          <h2 id="ownership" className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-3 scroll-mt-24">
            {c.h2Ownership}
          </h2>
          <p className="text-[15px] leading-[1.7] text-[var(--color-text-muted)] mb-6">{c.ownershipLead}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {c.ownership.map((o, i) => {
              const Icon = i === 0 ? Lock : i === 1 ? Building2 : KeyRound
              return (
                <div key={o.title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                  <Icon size={20} strokeWidth={1.8} className="text-[var(--color-primary)] mb-3" />
                  <h3 className="text-[16px] font-semibold mb-2">{o.title}</h3>
                  <p className="text-[14px] leading-[1.65] text-[var(--color-text-muted)]">{o.body}</p>
                </div>
              )
            })}
          </div>

          {/* COSTS */}
          <h2 id="costs" className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-3 scroll-mt-24">
            {c.h2Costs}
          </h2>
          <p className="text-[15px] leading-[1.7] text-[var(--color-text-muted)] mb-6">{c.costsLead}</p>
          <div className="overflow-x-auto -mx-4 px-4 mb-3">
            <table className="w-full border border-[var(--color-border)] rounded-2xl overflow-hidden text-[14px]">
              <tbody className="divide-y divide-[var(--color-border)]">
                {c.costsRows.map((r, i) => {
                  const isTotal = i === c.costsRows.length - 1
                  return (
                    <tr key={r.label} className={isTotal ? 'bg-[var(--color-search-bg)] font-semibold' : 'bg-white'}>
                      <td className="px-4 py-3 text-[var(--color-text)]">{r.label}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)] whitespace-nowrap">{r.value}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--color-text-muted)] hidden md:table-cell">{r.note}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)] mb-12 italic">{c.costsFooter}</p>

          {/* MISTAKES */}
          <h2 id="mistakes" className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5 scroll-mt-24">
            {c.h2Mistakes}
          </h2>
          <ul className="space-y-3 mb-12">
            {c.mistakes.map((m, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-[#FEF3C7]/40 border border-[#FCD34D]/40 p-4">
                <AlertTriangle size={18} strokeWidth={1.8} className="text-[#92400E] shrink-0 mt-0.5" />
                <span className="text-[14px] leading-[1.6] text-[#1F2937]">{m}</span>
              </li>
            ))}
          </ul>

          {/* COUNTRIES */}
          <h2 id="countries" className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5 scroll-mt-24">
            {c.h2Countries}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {c.countries.map(co => (
              <div key={co.title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={16} strokeWidth={1.8} className="text-[var(--color-primary)]" />
                  <h3 className="text-[16px] font-semibold">{co.title}</h3>
                </div>
                <p className="text-[14px] leading-[1.65] text-[var(--color-text-muted)]">{co.body}</p>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <h2 id="faq" className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5 scroll-mt-24">
            {c.faqHeading}
          </h2>
          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] mb-12">
            {c.faq.map(f => (
              <li key={f.q} className="py-4">
                <h3 className="text-[16px] font-semibold mb-1 text-[#111827]">{f.q}</h3>
                <p className="text-[14px] leading-[1.65] text-[var(--color-text-muted)]">{f.a}</p>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="rounded-2xl bg-[var(--color-search-bg)] p-6 mb-8">
            <h2 className="text-[20px] font-semibold text-[#111827] mb-2">{c.ctaHeading}</h2>
            <p className="text-[15px] text-[var(--color-text-muted)] mb-4">{c.ctaText}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={villasHref} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[13px] font-medium no-underline">
                {c.ctaCatalog}
              </Link>
              <a href="https://t.me/balinsky_bot" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] bg-white">
                <MessageCircle size={14} /> {c.ctaCall}
              </a>
            </div>
          </div>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
