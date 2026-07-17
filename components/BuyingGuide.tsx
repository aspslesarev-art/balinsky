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
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

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
  id: {
    home: 'Beranda',
    crumb: 'Cara membeli di Bali',
    h1: 'Membeli properti di Bali sebagai orang asing',
    intro: 'Properti Bali dibeli untuk investasi, gaya hidup, atau untuk dijual kembali. Orang asing tidak dapat memegang hak milik (freehold), tetapi melalui leasehold dan PT PMA transaksi diselesaikan di hadapan notaris PPAT dan melindungi Anda secara hukum sama seperti pembelian properti lainnya. Halaman ini adalah peta langkah demi langkah dari prosesnya — jangka waktu nyata, biaya nyata, dan titik-titik di mana kebanyakan orang asing kehilangan uang.',
    tocTitle: 'Di halaman ini',
    tocSteps: 'Tujuh langkah',
    tocOwnership: 'Struktur kepemilikan',
    tocCosts: 'Biaya total sebenarnya',
    tocMistakes: 'Kesalahan umum',
    tocCountries: 'Catatan per negara',
    tocFaq: 'FAQ',

    h2Steps: 'Tujuh langkah',
    stepsLead: 'Jalur standar untuk properti off-plan (dibeli dari pengembang). Transaksi resale lebih cepat dan melewati tahap angsuran, tetapi langkah 2 dan 3 sama persis.',
    steps: [
      { Icon: ClipboardList, title: 'Reservasi', time: '1–3 hari', body: 'Anda menandatangani formulir reservasi dan membayar holding deposit (biasanya $2.000–10.000). Unit ditarik dari pasar selama 14 hari. Deposit dapat dikembalikan jika Anda mundur setelah uji tuntas — ini mengunci harga tanpa mengikat Anda untuk membeli.' },
      { Icon: FileSearch, title: 'Uji tuntas (due diligence)', time: '2–3 minggu', body: 'Pengacara memverifikasi sertifikat tanah (SHM / HGB / Hak Pakai), PBG yang sah, zonasi, tidak ada sengketa, dan hak pengembang untuk menjual. Secara paralel, uji tuntas keuangan atas pengembang: proyek yang telah selesai, perkara pengadilan, registrasi PT.' },
      { Icon: Stamp, title: 'Notaris (PPAT)', time: '4–6 minggu', body: 'Anda menandatangani SPA (Sale & Purchase Agreement) atau Perjanjian Sewa di hadapan notaris PPAT — pejabat negara, satu-satunya orang yang berwenang secara hukum untuk mendaftarkan transaksi tanah di Bali. Tanpa PPAT, transaksi tidak dianggap selesai.' },
      { Icon: CreditCard, title: 'Angsuran', time: 'jadwal pengembang', body: 'Off-plan biasanya dibayar dalam 3–4 angsuran: 30/40/30 atau 50/50. Setiap angsuran terikat pada tahap pembangunan (fondasi, topping out, serah terima). Dana ditransfer langsung ke pengembang atau ke rekening escrow notaris, sesuai ketentuan SPA.' },
      { Icon: KeyRound, title: 'Serah terima', time: 'tanggal sesuai SPA', body: 'Pembayaran akhir, inspeksi daftar cacat (snag list), penerbitan SLF (sertifikat laik fungsi). Kunci diserahkan hanya setelah pembayaran penuh. Setiap penyimpangan dari paket desain dicatat saat serah terima — membuktikannya kemudian akan sulit.' },
      { Icon: Building2, title: 'PT PMA / penyiapan kepemilikan', time: '4–8 minggu', body: 'Jika Anda membeli melalui PT PMA (perusahaan Indonesia milik asing), registrasi memakan waktu 4–8 minggu dan biayanya $1.500–3.500. Leasehold murni melewati tahap ini — PT PMA hanya diperlukan jika Anda juga menginginkan KITAS (visa tinggal melalui investasi).' },
      { Icon: Settings2, title: 'Pengelolaan dan penyewaan', time: 'berkelanjutan', body: 'Perusahaan pengelola mengambil 18–25% dari pendapatan kotor dan menangani kebersihan, pemasaran, check-in tamu. Alternatif: kelola sendiri lewat Booking + staf Anda sendiri (margin lebih tinggi, ketahanan lebih rendah, membutuhkan kehadiran fisik).' },
    ],

    h2Ownership: 'Struktur kepemilikan',
    ownershipLead: 'Tiga pilihan untuk orang asing. Masing-masing cocok untuk tujuan berbeda — pilih berdasarkan horizon Anda dan apakah Anda juga menginginkan visa KITAS.',
    ownership: [
      {
        title: 'Leasehold (Hak Sewa)',
        body: 'Sewa tanah jangka panjang — biasanya 25, 30, 50 atau 80 tahun. Jalur tercepat dan termurah: ditandatangani di hadapan notaris langsung dengan pemilik atau pengembang. Dapat diperpanjang jika kontrak mengizinkan. Cocok untuk vila sewa atau rumah kedua. Kekurangan: horizon kepemilikan terbatas — begitu sisa masa kurang dari 15 tahun, likuiditas menurun.',
      },
      {
        title: 'PT PMA',
        body: 'Perusahaan Indonesia milik asing, berkedudukan di Indonesia. Memiliki HGB (Hak Guna Bangunan) — hak membangun selama 30 tahun, dapat diperpanjang hingga 80. PT PMA juga membuka KITAS (visa tinggal), hak mempekerjakan staf lokal, dan operasi bisnis yang legal. Modal dasar minimum adalah IDR 10 miliar (≈$640rb), dalam praktiknya Anda harus menunjukkan IDR 2,5 miliar yang disetor. Terbaik untuk investor berhorizon panjang.',
      },
      {
        title: 'Hak Pakai',
        body: 'Hak pakai yang diberikan kepada orang asing dengan KITAP (izin tinggal tetap). Jangka waktu 30 tahun, dapat diperpanjang. Hanya berlaku jika Anda sudah memegang KITAP, sehingga jarang digunakan di awal. Berguna sebagai jalur "bersih" bagi mereka yang berkomitmen tinggal di Bali secara penuh.',
      },
    ],

    h2Costs: 'Biaya total sebenarnya — contoh pada vila off-plan $400.000',
    costsLead: 'Harga utama adalah harga kontrak. Pajak dan biaya bertumpuk di atasnya — anggarkan +12–14% di atas harga yang tercantum. Angka di bawah untuk transaksi leasehold; PT PMA menambah ~$2.000–3.500 sekali bayar.',
    costsRows: [
      { label: 'Harga properti', value: '$400,000', note: 'harga dasar SPA' },
      { label: 'PPN', value: '$44,000', note: '11% untuk bangunan baru; 0% untuk resale' },
      { label: 'BPHTB (pajak peralihan)', value: '$20,000', note: '5% dari transaksi, dibayar pembeli' },
      { label: 'Notaris (PPAT)', value: '$4,000–6,000', note: '1–1,5%, biasanya dibagi 50/50 dengan penjual' },
      { label: 'Pengacara (DD + penutupan)', value: '$1,500–3,500', note: 'opsional tetapi sangat disarankan' },
      { label: 'Registrasi BPN', value: '$0–500', note: 'registrasi leasehold' },
      { label: 'Total tambahan', value: '$69,500–73,500', note: '+17–18% di atas harga properti' },
    ],
    costsFooter: 'PT PMA sebagai struktur kepemilikan — terpisah $1.500–3.500 untuk registrasi dan ~$1.200–1.800/tahun untuk akuntansi dan pelaporan pajak.',

    h2Mistakes: 'Tujuh kesalahan umum orang asing',
    mistakes: [
      'Tidak memeriksa PBG / IMB sebelum menandatangani SPA. Tanpa PBG = konstruksi ilegal; regency dapat memerintahkan pembongkaran.',
      'Membeli leasehold tanpa klausul perpanjangan. Setelah 25 tahun Anda kehilangan properti; dengan perpanjangan Anda berlanjut hingga 50–80.',
      'Mentransfer dana ke rekening pribadi penjual alih-alih ke escrow notaris. Dalam sengketa, uang itu hilang.',
      'Melewatkan pengacara. Template SPA pengembang selalu ditulis untuk kepentingan mereka — pengacara independen menulis ulang klausul-klausul berisiko.',
      'Tidak punya izin Pondok Wisata tetapi merencanakan pendapatan sewa jangka pendek. Tanpa itu, Airbnb secara teknis ilegal; Anda berisiko denda atau penutupan.',
      'Mempercayai ROI utama begitu saja. Klaim 12% net mengasumsikan okupansi 75%+ dan ADR kuartil teratas untuk distrik tersebut — mungkin, tapi tidak dijamin.',
      'Mengabaikan zonasi. Zonasi hunian melarang sewa komersial; zonasi pariwisata mengizinkannya. Periksa peta zonasi regency.',
    ],

    h2Countries: 'Catatan per negara',
    countries: [
      {
        title: 'Amerika Serikat',
        body: 'IRS mewajibkan pelaporan properti asing melalui FBAR (FinCEN 114) jika total rekening asing melewati $10.000, dan Form 8938 untuk kepemilikan lebih besar. Pendapatan sewa dilaporkan pada Schedule E; withholding Indonesia 10% dapat dikreditkan sebagai foreign tax credit. Pewarisan lebih rapi melalui PT PMA.',
      },
      {
        title: 'Australia',
        body: 'Aturan FIRB tidak berlaku untuk pembelian leasehold di luar negeri — itu bukan tanah Australia. Namun pendapatan yang direpatriasi dikenai CGT, dan penduduk pajak Australia harus melaporkan pendapatan sewa asing. Perhatikan jendela 15 tahun untuk foreign tax offset.',
      },
      {
        title: 'Uni Eropa',
        body: 'AML/KYC standar untuk transfer keluar dalam jumlah besar. Belgia / Jerman / Prancis menerapkan pajak sipil atas properti luar negeri berdasarkan perjanjian pajak mereka dengan Indonesia. Polandia / Ceko / Baltik lebih lunak — biasanya kredit untuk PPh Indonesia yang dibayar.',
      },
      {
        title: 'Tiongkok',
        body: 'Batas arus keluar modal RRT adalah $50.000 per individu per tahun. Pembelian $400rb membutuhkan penataan (banyak orang, rekening investasi, jalur korporat Hong Kong). Ini tugas tersendiri — biasanya diselesaikan dengan penasihat pajak Tiongkok sebelum deposit apa pun. Sisi Bali dari transaksi ini terlihat identik dengan pembelian oleh warga Eropa: notaris yang sama, SPA yang sama.',
      },
    ],

    faqHeading: 'Pertanyaan yang sering diajukan',
    faq: [
      { q: 'Bisakah orang asing membeli hak milik (freehold) di Bali?',
        a: 'Tidak. Hak Milik (freehold) terbatas untuk warga negara Indonesia. Orang asing memiliki melalui leasehold (hingga 80 tahun dengan perpanjangan) atau melalui perusahaan Indonesia PT PMA yang memegang HGB (Hak Guna Bangunan).' },
      { q: 'Apa itu PT PMA dan apakah saya membutuhkannya?',
        a: 'PT PMA adalah perusahaan Indonesia dengan 100% modal asing — cara legal untuk memiliki HGB dan menjalankan bisnis. Terbaik jika Anda berencana tinggal di Bali (KITAS), mempekerjakan staf, atau memiliki beberapa properti. Untuk satu vila sewa, leasehold sudah cukup.' },
      { q: 'Berapa lama proses pembeliannya?',
        a: 'Off-plan — 6–12 bulan dari reservasi hingga serah terima (tergantung tahap konstruksi). Bagian hukumnya saja (DD + notaris) adalah 4–6 minggu. Transaksi resale bisa selesai dalam 6–8 minggu secara keseluruhan.' },
      { q: 'Apakah aman mentransfer uang ke Indonesia?',
        a: 'Ya, asalkan pembayaran masuk ke rekening notaris atau escrow, bukan ke rekening pribadi penjual. Selalu minta instruksi transfer dari SPA itu sendiri, bukan dari aplikasi pesan — itulah saluran penipuan paling umum.' },
      { q: 'Bisakah saya mendapatkan visa melalui pembelian?',
        a: 'Pembelian saja tidak memberikan visa. Dengan mendaftarkan PT PMA dengan modal disetor dan karyawan lokal, Anda memenuhi syarat KITAS yang berlaku 1–2 tahun dan dapat diperpanjang. Pensiunan memiliki Retirement KITAS terpisah mulai usia 55, dengan deposit ~$45.000.' },
      { q: 'Berapa imbal hasil sewa yang realistis?',
        a: 'Di Canggu dan Bukit pada okupansi 70–80%: biasanya 8–12% net per tahun. Ubud: 6–9% karena musiman. Apa pun di atas 14% dalam klaim pengembang layak diuji dengan model keuangan tersendiri dengan ADR distrik dan biaya pengelolaan (18–25%).' },
      { q: 'Bagaimana jika pengembang gagal menyerahkan?',
        a: 'SPA standar mencakup penalti keterlambatan (biasanya 0,05–0,1% dari harga per hari setelah masa tenggang 3–6 bulan) dan hak pembatalan dengan pengembalian dana. Dalam praktiknya pengembang besar terlambat 2–6 bulan; kegagalan total jarang terjadi dan disaring saat DD melalui rekam jejak.' },
      { q: 'Bisakah saya menjual leasehold di kemudian hari?',
        a: 'Ya — peralihan leasehold dilakukan di notaris PPAT yang sama. Ada permintaan sekunder yang aktif untuk unit berusia 2–3 tahun dengan riwayat sewa. Likuiditas menurun begitu sisa leasehold di bawah 15 tahun — perhitungkan itu dalam strategi keluar Anda.' },
    ],

    ctaHeading: 'Apa selanjutnya',
    ctaText: 'Ingin melihat listing tertentu atau membahas strategi secara langsung?',
    ctaCatalog: 'Buka katalog',
    ctaCall: 'Bicara dengan manajer',
  },
  fr: {
    home: 'Accueil',
    crumb: 'Comment acheter à Bali',
    h1: 'Acheter un bien immobilier à Bali en tant qu’étranger',
    intro: 'L’immobilier à Bali s’achète pour investir, pour y vivre ou pour revendre. Les étrangers ne peuvent pas détenir la pleine propriété, mais via le leasehold et la PT PMA, la transaction se conclut chez un notaire PPAT et vous protège juridiquement comme n’importe quel achat immobilier. Cette page est une carte étape par étape du processus — délais réels, frais réels, et les endroits où la plupart des étrangers perdent de l’argent.',
    tocTitle: 'Sur cette page',
    tocSteps: 'Les sept étapes',
    tocOwnership: 'Structures de propriété',
    tocCosts: 'Coûts réels tout compris',
    tocMistakes: 'Erreurs fréquentes',
    tocCountries: 'Notes par pays',
    tocFaq: 'FAQ',

    h2Steps: 'Les sept étapes',
    stepsLead: 'Parcours standard pour un bien off-plan (acheté auprès d’un promoteur). Les transactions de revente sont plus rapides et sautent les tranches, mais les étapes 2 et 3 sont identiques.',
    steps: [
      { Icon: ClipboardList, title: 'Réservation', time: '1–3 jours', body: 'Vous signez un formulaire de réservation et versez un acompte de blocage (généralement 2 000–10 000 $). Le bien est retiré du marché pendant 14 jours. L’acompte est remboursable si vous vous retirez après la due diligence — cela verrouille le prix sans vous engager.' },
      { Icon: FileSearch, title: 'Due diligence', time: '2–3 semaines', body: 'Un avocat vérifie le titre foncier (SHM / HGB / Hak Pakai), un PBG valide, le zonage, l’absence de charges et le droit du promoteur à vendre. En parallèle, une due diligence financière sur le promoteur : projets livrés, procédures judiciaires, enregistrement de la PT.' },
      { Icon: Stamp, title: 'Notaire (PPAT)', time: '4–6 semaines', body: 'Vous signez le SPA (Sale & Purchase Agreement) ou le contrat de bail devant un notaire PPAT — un officier public, la seule personne légalement habilitée à enregistrer les transactions foncières à Bali. Pas de PPAT, pas de transaction conclue.' },
      { Icon: CreditCard, title: 'Tranches', time: 'échéancier du promoteur', body: 'L’off-plan se paie généralement en 3–4 tranches : 30/40/30 ou 50/50. Chaque tranche est liée à un jalon de construction (fondations, gros œuvre achevé, livraison). Les fonds sont virés directement au promoteur ou sur le compte séquestre du notaire, selon les termes du SPA.' },
      { Icon: KeyRound, title: 'Livraison', time: 'date du SPA', body: 'Paiement final, inspection de la liste des réserves (snag list), délivrance du SLF (certificat de conformité). Les clés ne sont remises qu’après le paiement intégral. Tout écart par rapport au dossier de conception est consigné à la livraison — le prouver plus tard est difficile.' },
      { Icon: Building2, title: 'Mise en place PT PMA / propriété', time: '4–8 semaines', body: 'Si vous achetez via une PT PMA (société indonésienne à capitaux étrangers), l’enregistrement prend 4–8 semaines et coûte 1 500–3 500 $. Le leasehold pur saute cette étape — la PT PMA n’est nécessaire que si vous voulez aussi un KITAS (visa de résidence par investissement).' },
      { Icon: Settings2, title: 'Gestion et location', time: 'en continu', body: 'Une société de gestion prend 18–25 % des revenus bruts et s’occupe du ménage, du marketing, de l’accueil des voyageurs. Alternative : autogestion via Booking + votre propre personnel (marge supérieure, résilience moindre, présence physique requise).' },
    ],

    h2Ownership: 'Structures de propriété',
    ownershipLead: 'Trois options pour les étrangers. Chacune répond à un objectif différent — choisissez selon votre horizon et selon que vous voulez aussi un visa KITAS.',
    ownership: [
      {
        title: 'Leasehold (Hak Sewa)',
        body: 'Bail foncier de longue durée — généralement 25, 30, 50 ou 80 ans. La voie la plus rapide et la moins chère : signé chez un notaire directement avec le propriétaire ou le promoteur. Renouvelable si le contrat le permet. Convient à une villa locative ou une résidence secondaire. Inconvénient : horizon de propriété limité — dès qu’il reste moins de 15 ans, la liquidité chute.',
      },
      {
        title: 'PT PMA',
        body: 'Société indonésienne à capitaux étrangers, résidente en Indonésie. Détient un HGB (Hak Guna Bangunan) — droit de construire pour 30 ans, extensible à 80. La PT PMA ouvre aussi le KITAS (visa de résident), le droit d’embaucher du personnel local et l’exploitation légale d’une entreprise. Le capital nominal minimum est de 10 milliards IDR (≈640 k$), en pratique vous devez montrer 2,5 milliards IDR libérés. Idéal pour les investisseurs à long horizon.',
      },
      {
        title: 'Hak Pakai',
        body: 'Droit d’usage accordé à un étranger titulaire d’un KITAP (résidence permanente). Durée de 30 ans, extensible. Applicable uniquement si vous détenez déjà un KITAP, donc rarement utilisé au départ. Utile comme voie « propre » pour ceux qui s’installent à Bali à plein temps.',
      },
    ],

    h2Costs: 'Coûts réels tout compris — exemple sur une villa off-plan à 400 000 $',
    costsLead: 'Le prix affiché est le prix du contrat. Les taxes et frais s’ajoutent par-dessus — prévoyez +12–14 % au-dessus du prix indiqué. Les chiffres ci-dessous concernent une transaction leasehold ; la PT PMA ajoute ~2 000–3 500 $ en une fois.',
    costsRows: [
      { label: 'Prix du bien', value: '$400,000', note: 'prix de base du SPA' },
      { label: 'PPN (TVA)', value: '$44,000', note: '11 % sur le neuf ; 0 % sur la revente' },
      { label: 'BPHTB (droit de mutation)', value: '$20,000', note: '5 % de la transaction, payé par l’acheteur' },
      { label: 'Notaire (PPAT)', value: '$4,000–6,000', note: '1–1,5 %, généralement partagé 50/50 avec le vendeur' },
      { label: 'Avocat (DD + closing)', value: '$1,500–3,500', note: 'facultatif mais fortement recommandé' },
      { label: 'Enregistrement BPN', value: '$0–500', note: 'enregistrement du leasehold' },
      { label: 'Total en sus', value: '$69,500–73,500', note: '+17–18 % au-dessus du prix du bien' },
    ],
    costsFooter: 'La PT PMA comme structure de détention — 1 500–3 500 $ à part pour l’enregistrement et ~1 200–1 800 $/an pour la comptabilité et les déclarations fiscales.',

    h2Mistakes: 'Sept erreurs fréquentes des étrangers',
    mistakes: [
      'Ne pas vérifier le PBG / IMB avant de signer le SPA. Pas de PBG = construction illégale ; la regency peut ordonner la démolition.',
      'Acheter un leasehold sans clause de renouvellement. Après 25 ans vous perdez le bien ; avec renouvellement vous continuez jusqu’à 50–80.',
      'Virer les fonds sur le compte personnel du vendeur au lieu du séquestre du notaire. En cas de litige, cet argent est perdu.',
      'Faire l’impasse sur l’avocat. Le SPA type du promoteur est toujours rédigé en sa faveur — un avocat indépendant réécrit les clauses à risque.',
      'Pas de licence Pondok Wisata mais des revenus de location courte durée prévus. Sans elle, Airbnb est techniquement illégal ; vous risquez des amendes ou une fermeture.',
      'Croire le ROI affiché. Une promesse de 12 % net suppose un taux d’occupation de 75 %+ et un ADR du quartile supérieur pour le quartier — possible, pas garanti.',
      'Ignorer le zonage. Le zonage résidentiel interdit la location commerciale ; le zonage touristique l’autorise. Vérifiez la carte de zonage de la regency.',
    ],

    h2Countries: 'Notes par pays',
    countries: [
      {
        title: 'États-Unis',
        body: 'L’IRS impose de déclarer les biens étrangers via le FBAR (FinCEN 114) si le total des comptes étrangers dépasse 10 000 $, et le Form 8938 pour les avoirs plus importants. Les revenus locatifs se déclarent au Schedule E ; la retenue indonésienne de 10 % est imputable en foreign tax credit. La transmission est plus simple via une PT PMA.',
      },
      {
        title: 'Australie',
        body: 'Les règles du FIRB ne s’appliquent pas aux achats en leasehold à l’étranger — ce n’est pas un terrain australien. Mais les revenus rapatriés sont soumis à la CGT, et les résidents fiscaux australiens doivent déclarer les revenus locatifs étrangers. Attention à la fenêtre de 15 ans pour le foreign tax offset.',
      },
      {
        title: 'UE',
        body: 'AML/KYC standard sur les transferts sortants importants. Belgique / Allemagne / France appliquent un impôt civil sur les biens à l’étranger selon leurs conventions fiscales avec l’Indonésie. Pologne / Tchéquie / pays baltes sont plus souples — généralement un crédit pour le PPh indonésien payé.',
      },
      {
        title: 'Chine',
        body: 'La limite de sortie de capitaux de la RPC est de 50 000 $ par personne et par an. Un achat de 400 k$ nécessite un montage (plusieurs personnes, comptes d’investissement, voie corporative de Hong Kong). C’est une tâche à part — généralement réglée avec un conseiller fiscal chinois avant tout acompte. Le volet balinais de la transaction est identique à un achat européen : même notaire, même SPA.',
      },
    ],

    faqHeading: 'Questions fréquentes',
    faq: [
      { q: 'Un étranger peut-il acheter en pleine propriété à Bali ?',
        a: 'Non. Le Hak Milik (pleine propriété) est réservé aux citoyens indonésiens. Les étrangers détiennent via le leasehold (jusqu’à 80 ans avec renouvellement) ou via une société indonésienne PT PMA détenant un HGB (Hak Guna Bangunan).' },
      { q: 'Qu’est-ce qu’une PT PMA et en ai-je besoin ?',
        a: 'Une PT PMA est une société indonésienne à 100 % de capitaux étrangers — la voie légale pour détenir un HGB et exploiter une entreprise. Idéale si vous prévoyez de vivre à Bali (KITAS), d’employer du personnel ou de détenir plusieurs biens. Pour une seule villa locative, le leasehold suffit.' },
      { q: 'Combien de temps prend l’achat ?',
        a: 'Off-plan — 6–12 mois de la réservation à la livraison (selon l’état d’avancement). La seule partie juridique (DD + notaire) prend 4–6 semaines. Une transaction de revente peut se conclure en 6–8 semaines au total.' },
      { q: 'Est-il sûr de virer de l’argent vers l’Indonésie ?',
        a: 'Oui, à condition que les paiements aillent au compte du notaire ou au séquestre, et non au compte personnel du vendeur. Exigez toujours les instructions de virement du SPA lui-même, jamais d’une messagerie — c’est le canal de fraude le plus courant.' },
      { q: 'Puis-je obtenir un visa via l’achat ?',
        a: 'L’achat seul ne donne pas de visa. En enregistrant une PT PMA avec un capital libéré et un employé local, vous êtes éligible à un KITAS valable 1–2 ans et renouvelable. Les retraités disposent d’un Retirement KITAS distinct à partir de 55 ans, avec un dépôt de ~45 000 $.' },
      { q: 'Quel est le rendement locatif réaliste ?',
        a: 'À Canggu et Bukit avec 70–80 % d’occupation : généralement 8–12 % net par an. Ubud : 6–9 % du fait de la saisonnalité. Tout ce qui dépasse 14 % dans une promesse de promoteur mérite un modèle financier distinct intégrant l’ADR du quartier et les frais de gestion (18–25 %).' },
      { q: 'Que se passe-t-il si le promoteur ne livre pas ?',
        a: 'Les SPA standard prévoient des pénalités de retard (généralement 0,05–0,1 % du prix par jour après un délai de grâce de 3–6 mois) et un droit de résiliation avec remboursement. En pratique, les grands promoteurs accusent 2–6 mois de retard ; les échecs complets sont rares et détectés lors de la DD via l’historique.' },
      { q: 'Puis-je revendre le leasehold plus tard ?',
        a: 'Oui — les cessions de leasehold se font chez le même notaire PPAT. Il existe une demande secondaire active pour des biens de 2–3 ans avec un historique locatif. La liquidité chute dès que la durée restante du leasehold passe sous 15 ans — intégrez cela dans votre stratégie de sortie.' },
    ],

    ctaHeading: 'Et ensuite',
    ctaText: 'Envie de voir des annonces précises ou de parler stratégie en direct ?',
    ctaCatalog: 'Ouvrir le catalogue',
    ctaCall: 'Parler à un gestionnaire',
  },
  de: {
    home: 'Startseite',
    crumb: 'Wie man auf Bali kauft',
    h1: 'Immobilien auf Bali als Ausländer kaufen',
    intro: 'Bali-Immobilien werden zur Kapitalanlage, für den eigenen Lebensstil oder zum Weiterverkauf gekauft. Ausländer können kein Volleigentum halten, aber über Leasehold und PT PMA wird der Deal bei einem PPAT-Notar abgeschlossen und schützt Sie rechtlich genauso wie jeder andere Immobilienkauf. Diese Seite ist eine Schritt-für-Schritt-Karte des Prozesses — echte Zeitpläne, echte Gebühren und die Stellen, an denen die meisten Ausländer Geld verlieren.',
    tocTitle: 'Auf dieser Seite',
    tocSteps: 'Die sieben Schritte',
    tocOwnership: 'Eigentumsstrukturen',
    tocCosts: 'Echte Gesamtkosten',
    tocMistakes: 'Häufige Fehler',
    tocCountries: 'Länderspezifische Hinweise',
    tocFaq: 'Häufige Fragen',

    h2Steps: 'Die sieben Schritte',
    stepsLead: 'Standardweg für Off-Plan-Immobilien (vom Bauträger gekauft). Wiederverkaufs-Deals sind schneller und überspringen die Tranchen, aber die Schritte 2 und 3 sind identisch.',
    steps: [
      { Icon: ClipboardList, title: 'Reservierung', time: '1–3 Tage', body: 'Sie unterschreiben ein Reservierungsformular und zahlen eine Reservierungsgebühr (typischerweise $2.000–10.000). Die Einheit wird 14 Tage vom Markt genommen. Die Anzahlung ist erstattungsfähig, wenn Sie nach der Due Diligence zurücktreten — sie sichert den Preis, ohne Sie zu verpflichten.' },
      { Icon: FileSearch, title: 'Due Diligence', time: '2–3 Wochen', body: 'Ein Anwalt prüft das Landzertifikat (SHM / HGB / Hak Pakai), ein gültiges PBG, die Zonierung, das Fehlen von Belastungen und das Verkaufsrecht des Bauträgers. Parallel dazu finanzielle DD zum Bauträger: gelieferte Projekte, Gerichtsverfahren, PT-Registrierung.' },
      { Icon: Stamp, title: 'Notar (PPAT)', time: '4–6 Wochen', body: 'Sie unterschreiben das SPA (Sale & Purchase Agreement) oder den Pachtvertrag vor einem PPAT-Notar — ein Staatsbeamter, die einzige Person, die rechtlich befugt ist, Landtransaktionen auf Bali zu registrieren. Kein PPAT, kein abgeschlossener Deal.' },
      { Icon: CreditCard, title: 'Tranchen', time: 'Bauträger-Zeitplan', body: 'Off-Plan wird typischerweise in 3–4 Tranchen gezahlt: 30/40/30 oder 50/50. Jede Tranche ist an einen Baumeilenstein gebunden (Fundament, Rohbau, Übergabe). Die Gelder werden direkt an den Bauträger oder auf das Treuhandkonto des Notars überwiesen, gemäß SPA-Bedingungen.' },
      { Icon: KeyRound, title: 'Übergabe', time: 'SPA-Datum', body: 'Schlusszahlung, Mängellisten-Inspektion (Snag List), Ausstellung des SLF (Nutzungstauglichkeitszertifikat). Die Schlüssel werden erst nach vollständiger Zahlung übergeben. Jede Abweichung vom Planungspaket wird bei der Übergabe festgehalten — später etwas zu beweisen ist schwer.' },
      { Icon: Building2, title: 'PT PMA / Eigentumsstruktur', time: '4–8 Wochen', body: 'Wenn Sie über eine PT PMA (ausländisch geführte indonesische Gesellschaft) kaufen, dauert die Registrierung 4–8 Wochen und kostet $1.500–3.500. Reines Leasehold überspringt dies — eine PT PMA ist nur nötig, wenn Sie auch ein KITAS (Aufenthaltsvisum per Investition) möchten.' },
      { Icon: Settings2, title: 'Verwaltung und Vermietung', time: 'laufend', body: 'Eine Verwaltungsgesellschaft nimmt 18–25 % des Bruttoumsatzes und übernimmt Reinigung, Marketing, Gäste-Check-in. Alternative: Selbstverwaltung über Booking + eigenes Personal (höhere Marge, geringere Robustheit, physische Präsenz erforderlich).' },
    ],

    h2Ownership: 'Eigentumsstrukturen',
    ownershipLead: 'Drei Optionen für Ausländer. Jede passt zu einem anderen Ziel — wählen Sie nach Ihrem Horizont und danach, ob Sie auch ein KITAS-Visum möchten.',
    ownership: [
      {
        title: 'Leasehold (Hak Sewa)',
        body: 'Langfristige Landpacht — typischerweise 25, 30, 50 oder 80 Jahre. Schnellster und günstigster Weg: beim Notar direkt mit dem Eigentümer oder Bauträger unterzeichnet. Verlängerbar, wenn der Vertrag es zulässt. Passt für eine Mietvilla oder ein Zweitwohnsitz. Nachteil: begrenzter Eigentumshorizont — sobald weniger als 15 Jahre verbleiben, sinkt die Liquidität.',
      },
      {
        title: 'PT PMA',
        body: 'Ausländisch geführte indonesische Gesellschaft mit Sitz in Indonesien. Hält HGB (Hak Guna Bangunan) — Baurecht für 30 Jahre, verlängerbar auf 80. Die PT PMA schaltet außerdem KITAS (Aufenthaltsvisum), das Recht, lokales Personal einzustellen, und den legalen Geschäftsbetrieb frei. Das Mindestnennkapital beträgt IDR 10 Mrd. (≈$640k), in der Praxis müssen Sie IDR 2,5 Mrd. eingezahlt nachweisen. Am besten für Investoren mit langem Horizont.',
      },
      {
        title: 'Hak Pakai',
        body: 'Nutzungsrecht, das einem Ausländer mit KITAP (dauerhaftem Aufenthalt) gewährt wird. Laufzeit 30 Jahre, verlängerbar. Nur anwendbar, wenn Sie bereits ein KITAP besitzen, daher zu Beginn selten genutzt. Nützlich als „sauberer“ Weg für diejenigen, die dauerhaft auf Bali leben.',
      },
    ],

    h2Costs: 'Echte Gesamtkosten — Beispiel für eine Off-Plan-Villa zu $400.000',
    costsLead: 'Der ausgewiesene Preis ist der Vertragspreis. Steuern und Gebühren kommen obendrauf — kalkulieren Sie +12–14 % über dem gelisteten Preis. Die Zahlen unten gelten für einen Leasehold-Deal; PT PMA fügt einmalig ~$2.000–3.500 hinzu.',
    costsRows: [
      { label: 'Immobilienpreis', value: '$400,000', note: 'SPA-Basispreis' },
      { label: 'PPN (MwSt.)', value: '$44,000', note: '11 % auf Neubau; 0 % auf Wiederverkauf' },
      { label: 'BPHTB (Übertragungssteuer)', value: '$20,000', note: '5 % des Deals, vom Käufer gezahlt' },
      { label: 'Notar (PPAT)', value: '$4,000–6,000', note: '1–1,5 %, meist 50/50 mit dem Verkäufer geteilt' },
      { label: 'Anwalt (DD + Abschluss)', value: '$1,500–3,500', note: 'optional, aber dringend empfohlen' },
      { label: 'BPN-Registrierung', value: '$0–500', note: 'Leasehold-Registrierung' },
      { label: 'Gesamt obendrauf', value: '$69,500–73,500', note: '+17–18 % über dem Immobilienpreis' },
    ],
    costsFooter: 'PT PMA als Haltestruktur — separate $1.500–3.500 für die Registrierung und ~$1.200–1.800/Jahr für Buchhaltung und Steuererklärungen.',

    h2Mistakes: 'Sieben häufige Fehler von Ausländern',
    mistakes: [
      'PBG / IMB vor der SPA-Unterschrift nicht prüfen. Kein PBG = illegaler Bau; die Regency kann den Abriss anordnen.',
      'Leasehold ohne Verlängerungsklausel kaufen. Nach 25 Jahren verlieren Sie die Immobilie; mit Verlängerung geht es bis 50–80 weiter.',
      'Gelder auf das Privatkonto des Verkäufers statt auf das Notartreuhandkonto überweisen. Im Streitfall ist dieses Geld weg.',
      'Am Anwalt sparen. Das Muster-SPA des Bauträgers ist immer zu seinen Gunsten formuliert — ein unabhängiger Anwalt schreibt die riskanten Klauseln um.',
      'Keine Pondok-Wisata-Lizenz, aber STR-Einnahmen einplanen. Ohne sie ist Airbnb technisch illegal; Sie riskieren Bußgelder oder Schließung.',
      'Dem ausgewiesenen ROI vertrauen. Eine 12-%-Netto-Angabe setzt 75 %+ Auslastung und einen ADR im oberen Quartil des Bezirks voraus — möglich, nicht garantiert.',
      'Die Zonierung ignorieren. Wohnzonierung verbietet gewerbliche Vermietung; Tourismuszonierung erlaubt sie. Prüfen Sie die Zonierungskarte der Regency.',
    ],

    h2Countries: 'Länderspezifische Hinweise',
    countries: [
      {
        title: 'USA',
        body: 'Der IRS verlangt die Meldung ausländischen Eigentums über FBAR (FinCEN 114), wenn kombinierte Auslandskonten $10.000 überschreiten, und Form 8938 bei größeren Beständen. Mieteinnahmen werden in Schedule E gemeldet; die indonesische 10-%-Quellensteuer ist als Foreign Tax Credit anrechenbar. Die Vererbung ist über eine PT PMA einfacher.',
      },
      {
        title: 'Australien',
        body: 'FIRB-Regeln gelten nicht für Leasehold-Käufe im Ausland — das ist kein australisches Land. Aber repatriierte Erträge unterliegen der CGT, und australische Steueransässige müssen ausländische Mieteinnahmen deklarieren. Beachten Sie das 15-Jahres-Fenster für den Foreign Tax Offset.',
      },
      {
        title: 'EU',
        body: 'Standard-AML/KYC bei großen ausgehenden Überweisungen. Belgien / Deutschland / Frankreich erheben zivile Steuern auf Auslandsimmobilien nach ihren Steuerabkommen mit Indonesien. Polen / Tschechien / Baltikum sind milder — meist eine Anrechnung der gezahlten indonesischen PPh.',
      },
      {
        title: 'China',
        body: 'Das Kapitalabflusslimit der VR China beträgt $50.000 pro Person und Jahr. Ein Kauf über $400k erfordert eine Strukturierung (mehrere Personen, Investmentkonten, Hongkonger Firmenweg). Das ist eine separate Aufgabe — typischerweise vor jeder Anzahlung mit einem chinesischen Steuerberater gelöst. Die Bali-Seite des Deals sieht identisch aus wie ein europäischer Kauf: derselbe Notar, dasselbe SPA.',
      },
    ],

    faqHeading: 'Häufig gestellte Fragen',
    faq: [
      { q: 'Kann ein Ausländer auf Bali Volleigentum kaufen?',
        a: 'Nein. Hak Milik (Volleigentum) ist indonesischen Staatsbürgern vorbehalten. Ausländer halten über Leasehold (bis zu 80 Jahre mit Verlängerung) oder über eine indonesische PT PMA, die HGB (Hak Guna Bangunan) hält.' },
      { q: 'Was ist eine PT PMA und brauche ich eine?',
        a: 'Eine PT PMA ist eine indonesische Gesellschaft mit 100 % ausländischem Kapital — der legale Weg, HGB zu halten und ein Geschäft zu betreiben. Am besten, wenn Sie planen, auf Bali zu leben (KITAS), Personal zu beschäftigen oder mehrere Immobilien zu halten. Für eine einzelne Mietvilla genügt Leasehold.' },
      { q: 'Wie lange dauert der Kauf?',
        a: 'Off-Plan — 6–12 Monate von der Reservierung bis zur Übergabe (je nach Bauphase). Der rechtliche Teil allein (DD + Notar) dauert 4–6 Wochen. Ein Wiederverkaufs-Deal kann insgesamt in 6–8 Wochen abgeschlossen werden.' },
      { q: 'Ist es sicher, Geld nach Indonesien zu überweisen?',
        a: 'Ja, sofern Zahlungen auf das Notar- oder Treuhandkonto gehen, nicht auf das Privatkonto des Verkäufers. Verlangen Sie die Überweisungsanweisungen immer aus dem SPA selbst, nie aus einem Messenger — das ist der häufigste Betrugskanal.' },
      { q: 'Kann ich über den Kauf ein Visum erhalten?',
        a: 'Der Kauf allein gewährt kein Visum. Durch die Registrierung einer PT PMA mit eingezahltem Kapital und einem lokalen Mitarbeiter qualifizieren Sie sich für ein KITAS, gültig 1–2 Jahre und verlängerbar. Ruheständler haben ein separates Retirement KITAS ab 55 Jahren, mit einer Einlage von ~$45.000.' },
      { q: 'Wie hoch ist die realistische Mietrendite?',
        a: 'In Canggu und Bukit bei 70–80 % Auslastung: meist 8–12 % netto pro Jahr. Ubud: 6–9 % wegen Saisonalität. Alles über 14 % in einer Bauträger-Angabe verdient ein separates Finanzmodell mit Bezirks-ADR und Verwaltungsgebühr (18–25 %).' },
      { q: 'Was, wenn der Bauträger nicht liefert?',
        a: 'Standard-SPAs enthalten Verzugsstrafen (typischerweise 0,05–0,1 % des Preises pro Tag nach einer Kulanzfrist von 3–6 Monaten) und ein Rücktrittsrecht mit Rückerstattung. In der Praxis verzögern große Bauträger 2–6 Monate; komplette Ausfälle sind selten und werden bei der DD über den Track Record geprüft.' },
      { q: 'Kann ich das Leasehold später verkaufen?',
        a: 'Ja — Leasehold-Übertragungen erfolgen beim selben PPAT-Notar. Es gibt aktive Nachfrage auf dem Zweitmarkt für 2–3 Jahre alte Einheiten mit Vermietungshistorie. Die Liquidität sinkt, sobald die Leasehold-Restlaufzeit unter 15 Jahre fällt — kalkulieren Sie das in Ihre Ausstiegsstrategie ein.' },
    ],

    ctaHeading: 'Wie geht es weiter',
    ctaText: 'Möchten Sie konkrete Angebote ansehen oder live über die Strategie sprechen?',
    ctaCatalog: 'Katalog öffnen',
    ctaCall: 'Mit einem Manager sprechen',
  },
  zh: {
    home: '首页',
    crumb: '如何在巴厘岛购买',
    h1: '外国人如何在巴厘岛购买房产',
    intro: '巴厘岛房产用于投资、自住或转手。外国人无法持有永久产权，但通过租赁权和 PT PMA，交易在 PPAT 公证人处完成，在法律上对您的保护与任何其他房产购买相同。本页是流程的分步地图——真实的时间线、真实的费用，以及大多数外国人亏钱的环节。',
    tocTitle: '本页内容',
    tocSteps: '七个步骤',
    tocOwnership: '产权结构',
    tocCosts: '真实的全部成本',
    tocMistakes: '常见错误',
    tocCountries: '各国须知',
    tocFaq: '常见问题',

    h2Steps: '七个步骤',
    stepsLead: '期房（从开发商购买）的标准流程。转售交易更快，跳过分期付款，但第 2 步和第 3 步完全相同。',
    steps: [
      { Icon: ClipboardList, title: '预订', time: '1–3 天', body: '您签署预订表并支付保留定金（通常为 $2,000–10,000）。房源从市场下架 14 天。如果您在尽职调查后退出，定金可退还——它锁定价格而不使您承担购买义务。' },
      { Icon: FileSearch, title: '尽职调查', time: '2–3 周', body: '律师核验土地证（SHM / HGB / Hak Pakai）、有效的 PBG、分区、无留置权，以及开发商的出售权。同时对开发商进行财务尽职调查：已交付项目、法院立案、PT 注册。' },
      { Icon: Stamp, title: '公证人（PPAT）', time: '4–6 周', body: '您在 PPAT 公证人面前签署 SPA（买卖协议）或租赁协议——公证人是国家官员，是唯一在法律上有权登记巴厘岛土地交易的人。没有 PPAT，交易就未完成。' },
      { Icon: CreditCard, title: '分期付款', time: '开发商时间表', body: '期房通常分 3–4 期付款：30/40/30 或 50/50。每一期都与建设里程碑挂钩（地基、封顶、交付）。资金按 SPA 条款直接汇给开发商或汇入公证人的托管账户。' },
      { Icon: KeyRound, title: '交付', time: 'SPA 日期', body: '最终付款、缺陷清单检查、颁发 SLF（适用证书）。只有在全额付款后才交付钥匙。任何与设计方案的偏差都在交付时记录——事后再证明会很困难。' },
      { Icon: Building2, title: 'PT PMA / 产权设立', time: '4–8 周', body: '如果您通过 PT PMA（外资印尼公司）购买，注册需 4–8 周，费用为 $1,500–3,500。纯租赁权可跳过此步——只有当您还想要 KITAS（投资居留签证）时才需要 PT PMA。' },
      { Icon: Settings2, title: '管理与出租', time: '持续进行', body: '管理公司收取毛收入的 18–25%，负责清洁、营销、客人入住。替代方案：通过 Booking + 自己的员工自行管理（利润率更高、韧性更低、需要亲自到场）。' },
    ],

    h2Ownership: '产权结构',
    ownershipLead: '外国人有三种选择。每种适合不同目标——根据您的时间跨度以及是否还想要 KITAS 签证来选择。',
    ownership: [
      {
        title: '租赁权（Hak Sewa）',
        body: '长期土地租赁——通常为 25、30、50 或 80 年。最快最便宜的途径：在公证人处直接与业主或开发商签署。若合同允许可续期。适合出租别墅或第二居所。缺点：产权期限有限——一旦剩余不足 15 年，流动性下降。',
      },
      {
        title: 'PT PMA',
        body: '在印尼注册的外资公司。通过它可持有 HGB（Hak Guna Bangunan）——30 年建筑权，可延长至 80 年。PT PMA 还可解锁 KITAS（居留签证）、雇用本地员工的权利以及合法经营。最低名义资本为 100 亿印尼盾（约 $640k），实际上您只需出示已缴的 25 亿印尼盾。最适合长线投资者。',
      },
      {
        title: 'Hak Pakai',
        body: '授予持有 KITAP（永久居留）的外国人的使用权。期限 30 年，可续期。仅在您已持有 KITAP 时适用，因此在起步阶段很少使用。对于打算长期定居巴厘岛的人来说，是一条"干净"的途径。',
      },
    ],

    h2Costs: '真实的全部成本——以一套 $400,000 期房别墅为例',
    costsLead: '标价即合同价。税费叠加在其上——预留高于标价 +12–14% 的预算。以下数字针对租赁权交易；PT PMA 会再一次性增加约 $2,000–3,500。',
    costsRows: [
      { label: '房产价格', value: '$400,000', note: 'SPA 基础价' },
      { label: 'PPN（增值税）', value: '$44,000', note: '新建房 11%；转售 0%' },
      { label: 'BPHTB（转让税）', value: '$20,000', note: '交易额的 5%，由买方支付' },
      { label: '公证人（PPAT）', value: '$4,000–6,000', note: '1–1.5%，通常与卖方 50/50 分摊' },
      { label: '律师（尽调 + 交割）', value: '$1,500–3,500', note: '可选，但强烈推荐' },
      { label: 'BPN 登记', value: '$0–500', note: '租赁权登记' },
      { label: '额外合计', value: '$69,500–73,500', note: '高于房产价格 +17–18%' },
    ],
    costsFooter: 'PT PMA 作为持有结构——另需 $1,500–3,500 用于注册，以及约 $1,200–1,800/年 用于会计和税务申报。',

    h2Mistakes: '外国人常见的七个错误',
    mistakes: [
      '签署 SPA 前未核查 PBG / IMB。没有 PBG = 非法建设；regency 可下令拆除。',
      '购买租赁权时未附续期条款。25 年后您将失去房产；有续期则可延续至 50–80 年。',
      '将资金汇入卖方个人账户而非公证人托管账户。一旦发生纠纷，这笔钱就要不回来了。',
      '在律师上省钱。开发商的模板 SPA 总是写得对其有利——需要独立律师改写有风险的条款。',
      '没有 Pondok Wisata 许可证却指望短租收入。没有它，Airbnb 在技术上属违法；您可能被罚款或勒令停业。',
      '轻信标示的 ROI。12% 净收益的说法假定入住率 75%+ 且该区 ADR 处于前四分之一——有可能，但无保证。',
      '忽视分区。住宅分区禁止商业出租；旅游分区则允许。请查阅 regency 的分区图。',
    ],

    h2Countries: '各国须知',
    countries: [
      {
        title: '美国',
        body: '若境外账户合计超过 $10,000，IRS 要求通过 FBAR（FinCEN 114）申报境外房产，较大资产则需 Form 8938。租金收入在 Schedule E 申报；印尼 10% 预扣税可作为外国税收抵免。通过 PT PMA 继承更为顺畅。',
      },
      {
        title: '澳大利亚',
        body: 'FIRB 规则不适用于海外租赁权购买——那不是澳大利亚土地。但汇回的收入需缴纳 CGT，且澳大利亚税务居民必须申报境外租金收入。注意外国税收抵免的 15 年期限。',
      },
      {
        title: '欧盟',
        body: '大额境外转账需进行标准 AML/KYC。比利时 / 德国 / 法国依据与印尼的税收协定对境外房产征收民事税。波兰 / 捷克 / 波罗的海国家较为宽松——通常对已缴的印尼 PPh 给予抵免。',
      },
      {
        title: '中国',
        body: '中国个人年度资本流出限额为 $50,000。购买 $400k 需要结构化安排（多人、投资账户、香港公司路径）。这是一项独立任务——通常在支付任何定金前与中国税务顾问一起解决。交易的巴厘岛一侧与欧洲人的购买完全相同：同一位公证人、同一份 SPA。',
      },
    ],

    faqHeading: '常见问题',
    faq: [
      { q: '外国人能在巴厘岛购买永久产权吗？',
        a: '不能。Hak Milik（永久产权）仅限印尼公民。外国人通过租赁权（含续期最长 80 年）或通过持有 HGB（Hak Guna Bangunan）的印尼 PT PMA 公司持有。' },
      { q: '什么是 PT PMA，我需要吗？',
        a: 'PT PMA 是 100% 外资的印尼公司——持有 HGB 并经营业务的合法方式。若您打算在巴厘岛居住（KITAS）、雇用员工或持有多处房产，PT PMA 更佳。对于单套出租别墅，租赁权即已足够。' },
      { q: '购买需要多长时间？',
        a: '期房——从预订到交付需 6–12 个月（取决于施工阶段）。仅法律部分（尽调 + 公证）为 4–6 周。转售交易整体可在 6–8 周内完成。' },
      { q: '向印尼汇款安全吗？',
        a: '安全，前提是付款进入公证人或托管账户，而非卖方个人账户。务必从 SPA 本身获取汇款指示，切勿从聊天软件获取——那是最常见的欺诈渠道。' },
      { q: '我能通过购买获得签证吗？',
        a: '仅凭购买不能获得签证。通过注册具有实缴资本和本地员工的 PT PMA，您可申请有效期 1–2 年且可续期的 KITAS。退休人员另有 Retirement KITAS，年满 55 岁，需存入约 $45,000。' },
      { q: '出租别墅的现实收益率是多少？',
        a: '在 Canggu 和 Bukit，入住率 70–80% 时：通常为每年 8–12% 净收益。Ubud：因季节性为 6–9%。开发商声称高于 14% 的任何数字，都值得用单独的财务模型来核验，纳入该区 ADR 和管理费（18–25%）。' },
      { q: '如果开发商未能交付怎么办？',
        a: '标准 SPA 包含逾期交付罚款（通常在 3–6 个月宽限期后，每天为价格的 0.05–0.1%）以及退款解约权。实际上大型开发商会逾期 2–6 个月；彻底失败罕见，并在尽调时通过过往业绩加以筛查。' },
      { q: '我以后能出售租赁权吗？',
        a: '能——租赁权转让在同一位 PPAT 公证人处办理。巴厘岛市场对有出租记录的 2–3 年房源存在活跃的二手需求。一旦租赁权剩余不足 15 年，流动性下降——请将此纳入您的退出策略。' },
    ],

    ctaHeading: '接下来做什么',
    ctaText: '想查看具体房源或当面聊聊策略吗？',
    ctaCatalog: '打开目录',
    ctaCall: '联系经理',
  },
  nl: {
    home: 'Home',
    crumb: 'Hoe kopen op Bali',
    h1: 'Vastgoed kopen op Bali als buitenlander',
    intro: 'Vastgoed op Bali wordt gekocht als belegging, voor de levensstijl of om door te verkopen. Buitenlanders kunnen geen volledig eigendom houden, maar via leasehold en PT PMA wordt de deal gesloten bij een PPAT-notaris en beschermt die u juridisch net zo goed als elke andere vastgoedaankoop. Deze pagina is een stap-voor-stap kaart van het proces — echte doorlooptijden, echte kosten, en de plekken waar de meeste buitenlanders geld verliezen.',
    tocTitle: 'Op deze pagina',
    tocSteps: 'De zeven stappen',
    tocOwnership: 'Eigendomsstructuren',
    tocCosts: 'Echte totale kosten',
    tocMistakes: 'Veelgemaakte fouten',
    tocCountries: 'Landspecifieke aandachtspunten',
    tocFaq: 'Veelgestelde vragen',

    h2Steps: 'De zeven stappen',
    stepsLead: 'Standaardtraject voor off-plan vastgoed (gekocht van een ontwikkelaar). Doorverkoopdeals zijn sneller en slaan de termijnen over, maar stap 2 en 3 zijn identiek.',
    steps: [
      { Icon: ClipboardList, title: 'Reservering', time: '1–3 dagen', body: 'U tekent een reserveringsformulier en betaalt een reserveringsdepot (doorgaans $2.000–10.000). De unit wordt 14 dagen uit de markt gehaald. Het depot is terugbetaalbaar als u na de due diligence afziet — het zet de prijs vast zonder u te verplichten.' },
      { Icon: FileSearch, title: 'Due diligence', time: '2–3 weken', body: 'Een advocaat verifieert het grondcertificaat (SHM / HGB / Hak Pakai), een geldig PBG, de bestemming, het ontbreken van lasten en het verkooprecht van de ontwikkelaar. Parallel financiële DD op de ontwikkelaar: opgeleverde projecten, rechtszaken, PT-registratie.' },
      { Icon: Stamp, title: 'Notaris (PPAT)', time: '4–6 weken', body: 'U tekent de SPA (Sale & Purchase Agreement) of het huurcontract bij een PPAT-notaris — een overheidsfunctionaris, de enige persoon die wettelijk bevoegd is om grondtransacties op Bali te registreren. Geen PPAT, geen voltooide deal.' },
      { Icon: CreditCard, title: 'Termijnen', time: 'schema ontwikkelaar', body: 'Off-plan wordt doorgaans in 3–4 termijnen betaald: 30/40/30 of 50/50. Elke termijn is gekoppeld aan een bouwmijlpaal (fundering, ruwbouw gereed, oplevering). De gelden worden rechtstreeks naar de ontwikkelaar of naar de escrowrekening van de notaris overgemaakt, volgens de SPA-voorwaarden.' },
      { Icon: KeyRound, title: 'Oplevering', time: 'SPA-datum', body: 'Slotbetaling, inspectie van de gebrekenlijst (snag list), afgifte van het SLF (bewijs van geschiktheid). De sleutels worden pas na volledige betaling overhandigd. Elke afwijking van het ontwerppakket wordt bij de oplevering vastgelegd — het later bewijzen is lastig.' },
      { Icon: Building2, title: 'PT PMA / eigendomsopzet', time: '4–8 weken', body: 'Koopt u via een PT PMA (Indonesisch bedrijf in buitenlandse handen), dan duurt de registratie 4–8 weken en kost $1.500–3.500. Puur leasehold slaat dit over — een PT PMA is alleen nodig als u ook een KITAS (verblijfsvisum via investering) wilt.' },
      { Icon: Settings2, title: 'Beheer en verhuur', time: 'doorlopend', body: 'Een beheerbedrijf neemt 18–25% van de bruto-omzet en verzorgt schoonmaak, marketing, check-in van gasten. Alternatief: zelf beheren via Booking + eigen personeel (hogere marge, lagere weerbaarheid, vereist fysieke aanwezigheid).' },
    ],

    h2Ownership: 'Eigendomsstructuren',
    ownershipLead: 'Drie opties voor buitenlanders. Elk past bij een ander doel — kies op basis van uw horizon en of u ook een KITAS-visum wilt.',
    ownership: [
      {
        title: 'Leasehold (Hak Sewa)',
        body: 'Langlopende grondhuur — doorgaans 25, 30, 50 of 80 jaar. Snelste en goedkoopste weg: bij een notaris rechtstreeks met de eigenaar of ontwikkelaar getekend. Verlengbaar als het contract dat toestaat. Past bij een huurvilla of tweede woning. Nadeel: beperkte eigendomshorizon — zodra er minder dan 15 jaar resteert, daalt de liquiditeit.',
      },
      {
        title: 'PT PMA',
        body: 'Indonesisch bedrijf in buitenlandse handen, gevestigd in Indonesië. Houdt HGB (Hak Guna Bangunan) — bouwrecht voor 30 jaar, te verlengen tot 80. Een PT PMA ontsluit ook KITAS (verblijfsvisum), het recht om lokaal personeel aan te nemen en legale bedrijfsvoering. Het minimale nominale kapitaal is IDR 10 mld (≈$640k), in de praktijk moet u IDR 2,5 mld gestort aantonen. Het best voor beleggers met een lange horizon.',
      },
      {
        title: 'Hak Pakai',
        body: 'Gebruiksrecht verleend aan een buitenlander met KITAP (permanent verblijf). Looptijd 30 jaar, verlengbaar. Alleen van toepassing als u al een KITAP heeft, dus zelden gebruikt bij aanvang. Nuttig als de "schone" weg voor wie zich vast op Bali vestigt.',
      },
    ],

    h2Costs: 'Echte totale kosten — voorbeeld bij een off-plan villa van $400.000',
    costsLead: 'De vermelde prijs is de contractprijs. Belastingen en kosten komen erbovenop — reken op +12–14% boven de vermelde prijs. Onderstaande cijfers gelden voor een leasehold-deal; PT PMA voegt eenmalig ~$2.000–3.500 toe.',
    costsRows: [
      { label: 'Vastgoedprijs', value: '$400,000', note: 'SPA-basisprijs' },
      { label: 'PPN (btw)', value: '$44,000', note: '11% op nieuwbouw; 0% op doorverkoop' },
      { label: 'BPHTB (overdrachtsbelasting)', value: '$20,000', note: '5% van de deal, betaald door koper' },
      { label: 'Notaris (PPAT)', value: '$4,000–6,000', note: '1–1,5%, meestal 50/50 gedeeld met verkoper' },
      { label: 'Advocaat (DD + closing)', value: '$1,500–3,500', note: 'optioneel maar sterk aanbevolen' },
      { label: 'BPN-registratie', value: '$0–500', note: 'leasehold-registratie' },
      { label: 'Totaal erbovenop', value: '$69,500–73,500', note: '+17–18% boven de vastgoedprijs' },
    ],
    costsFooter: 'PT PMA als houdstructuur — apart $1.500–3.500 om te registreren en ~$1.200–1.800/jaar voor boekhouding en belastingaangiften.',

    h2Mistakes: 'Zeven veelgemaakte fouten van buitenlanders',
    mistakes: [
      'Het PBG / IMB niet controleren vóór ondertekening van de SPA. Geen PBG = illegale bouw; de regency kan sloop bevelen.',
      'Leasehold kopen zonder verlengingsclausule. Na 25 jaar verliest u het object; met verlenging gaat u door tot 50–80.',
      'Gelden overmaken naar de privérekening van de verkoper in plaats van de notariële escrow. Bij een geschil is dat geld weg.',
      'Bezuinigen op de advocaat. De model-SPA van de ontwikkelaar is altijd in hun voordeel opgesteld — een onafhankelijke advocaat herschrijft de risicovolle clausules.',
      'Geen Pondok Wisata-vergunning maar wel rekenen op STR-inkomsten. Zonder deze is Airbnb technisch illegaal; u riskeert boetes of sluiting.',
      'De vermelde ROI vertrouwen. Een claim van 12% netto veronderstelt 75%+ bezetting en een ADR in het bovenste kwartiel van de wijk — mogelijk, niet gegarandeerd.',
      'De bestemming negeren. Woonbestemming verbiedt commerciële verhuur; toeristische bestemming staat die toe. Controleer de bestemmingskaart van de regency.',
    ],

    h2Countries: 'Landspecifieke aandachtspunten',
    countries: [
      {
        title: 'Verenigde Staten',
        body: 'De IRS vereist het melden van buitenlands vastgoed via FBAR (FinCEN 114) als de gecombineerde buitenlandse rekeningen $10.000 overschrijden, en Form 8938 voor grotere bezittingen. Huurinkomsten worden aangegeven op Schedule E; de Indonesische 10% bronbelasting is verrekenbaar als foreign tax credit. Vererving verloopt soepeler via een PT PMA.',
      },
      {
        title: 'Australië',
        body: 'FIRB-regels gelden niet voor leasehold-aankopen in het buitenland — dat is geen Australische grond. Maar gerepatrieerde inkomsten vallen onder CGT, en Australische fiscale inwoners moeten buitenlandse huurinkomsten aangeven. Let op het venster van 15 jaar voor de foreign tax offset.',
      },
      {
        title: 'EU',
        body: 'Standaard AML/KYC bij grote uitgaande overboekingen. België / Duitsland / Frankrijk heffen burgerlijke belasting op buitenlands vastgoed volgens hun belastingverdragen met Indonesië. Polen / Tsjechië / Baltische staten zijn milder — meestal een verrekening voor betaalde Indonesische PPh.',
      },
      {
        title: 'China',
        body: 'De limiet op kapitaaluitvoer uit de VRC is $50.000 per persoon per jaar. Een aankoop van $400k vereist structurering (meerdere personen, beleggingsrekeningen, corporate route via Hongkong). Dat is een aparte taak — meestal opgelost met een Chinese belastingadviseur vóór enige aanbetaling. De Bali-kant van de deal ziet er identiek uit als een Europese aankoop: dezelfde notaris, dezelfde SPA.',
      },
    ],

    faqHeading: 'Veelgestelde vragen',
    faq: [
      { q: 'Kan een buitenlander volledig eigendom kopen op Bali?',
        a: 'Nee. Hak Milik (volledig eigendom) is voorbehouden aan Indonesische staatsburgers. Buitenlanders houden via leasehold (tot 80 jaar met verlenging) of via een Indonesisch PT PMA-bedrijf dat HGB (Hak Guna Bangunan) houdt.' },
      { q: 'Wat is een PT PMA en heb ik er een nodig?',
        a: 'Een PT PMA is een Indonesisch bedrijf met 100% buitenlands kapitaal — de legale manier om HGB te houden en een bedrijf te runnen. Het best als u van plan bent op Bali te wonen (KITAS), personeel in dienst te nemen of meerdere objecten te houden. Voor één huurvilla volstaat leasehold.' },
      { q: 'Hoe lang duurt de aankoop?',
        a: 'Off-plan — 6–12 maanden van reservering tot oplevering (afhankelijk van de bouwfase). Het juridische deel alleen (DD + notaris) is 4–6 weken. Een doorverkoopdeal kan in totaal in 6–8 weken worden gesloten.' },
      { q: 'Is geld overmaken naar Indonesië veilig?',
        a: 'Ja, mits betalingen naar de notaris- of escrowrekening gaan, niet naar de privérekening van de verkoper. Vraag de overboekingsinstructies altijd uit de SPA zelf, nooit uit een berichtenapp — dat is het meest voorkomende fraudekanaal.' },
      { q: 'Kan ik via de aankoop een visum krijgen?',
        a: 'De aankoop alleen geeft geen visum. Door een PT PMA te registreren met gestort kapitaal en een lokale werknemer, komt u in aanmerking voor een KITAS die 1–2 jaar geldig en verlengbaar is. Gepensioneerden hebben een aparte Retirement KITAS vanaf 55 jaar, met een depot van ~$45.000.' },
      { q: 'Wat is het realistische huurrendement?',
        a: 'In Canggu en Bukit bij 70–80% bezetting: doorgaans 8–12% netto per jaar. Ubud: 6–9% door seizoensinvloeden. Alles boven 14% in een claim van een ontwikkelaar verdient een apart financieel model met de wijk-ADR en beheerkosten (18–25%).' },
      { q: 'Wat als de ontwikkelaar niet oplevert?',
        a: 'Standaard-SPA\'s bevatten boetes bij late oplevering (doorgaans 0,05–0,1% van de prijs per dag na een respijtperiode van 3–6 maanden) en een recht op ontbinding met terugbetaling. In de praktijk lopen grote ontwikkelaars 2–6 maanden uit; volledige mislukkingen zijn zeldzaam en worden bij de DD getoetst aan de hand van het trackrecord.' },
      { q: 'Kan ik de leasehold later verkopen?',
        a: 'Ja — leasehold-overdrachten gebeuren bij dezelfde PPAT-notaris. Er is actieve secundaire vraag naar units van 2–3 jaar oud met verhuurgeschiedenis. De liquiditeit daalt zodra het leasehold-restant onder de 15 jaar komt — verwerk dat in uw exitstrategie.' },
    ],

    ctaHeading: 'Wat nu',
    ctaText: 'Wilt u specifieke aanbiedingen bekijken of live over strategie praten?',
    ctaCatalog: 'Open de catalogus',
    ctaCall: 'Praat met een manager',
  },
  ban: {
    home: 'Beranda',
    crumb: 'Sapunapi numbas ring Bali',
    h1: 'Numbas properti ring Bali dados wong dura negara',
    intro: 'Properti Bali katumbas buat investasi, gaya hidup, utawi buat kaadol malih. Wong dura negara nenten dados ngamel hak milik, sakewanten lewat leasehold miwah PT PMA transaksi kapuputang ring ajeng notaris PPAT tur nyayubin Ragane sacara hukum pateh sekadi numbas properti sane lianan. Lembar puniki inggih punika peta langkah demi langkah saking prosesipun — jangka waktu sujati, prabea sujati, miwah genah dija akehan wong dura negara ical jinah.',
    tocTitle: 'Ring lembar puniki',
    tocSteps: 'Pitung langkah',
    tocOwnership: 'Struktur kepemilikan',
    tocCosts: 'Prabea total sujati',
    tocMistakes: 'Kaiwangan umum',
    tocCountries: 'Catetan manut negara',
    tocFaq: 'Patakon',

    h2Steps: 'Pitung langkah',
    stepsLead: 'Margi standar buat properti off-plan (katumbas saking pangwangun). Transaksi adol malih gelisan tur nglangkungin tahap angsuran, sakewanten langkah 2 miwah 3 pateh pisan.',
    steps: [
      { Icon: ClipboardList, title: 'Reservasi', time: '1–3 rahina', body: 'Ragane nandatangin formulir reservasi tur mayah holding deposit (biasane $2.000–10.000). Unit kaangkat saking pasar sajeroning 14 rahina. Deposit dados kawaliang yening Ragane mundur sasampun uji tuntas — puniki ngunci aji nenten ngiket Ragane buat numbas.' },
      { Icon: FileSearch, title: 'Uji tuntas', time: '2–3 minggu', body: 'Pengacara ngverifikasi sertifikat tanah (SHM / HGB / Hak Pakai), PBG sane sah, zonasi, nenten wenten sengketa, miwah hak pangwangun buat ngadol. Sinarengan, uji tuntas keuangan indik pangwangun: proyek sane sampun puput, perkara pengadilan, registrasi PT.' },
      { Icon: Stamp, title: 'Notaris (PPAT)', time: '4–6 minggu', body: 'Ragane nandatangin SPA (Sale & Purchase Agreement) utawi Perjanjian Sewa ring ajeng notaris PPAT — pejabat negara, wantah asiki jadma sane madue wewenang sacara hukum buat ngadaftarang transaksi tanah ring Bali. Yening nenten wenten PPAT, transaksi nenten kaanggep puput.' },
      { Icon: CreditCard, title: 'Angsuran', time: 'jadwal pangwangun', body: 'Off-plan biasane kabayah sajeroning 3–4 angsuran: 30/40/30 utawi 50/50. Sabilang angsuran keiket ring tahap pembangunan (fondasi, topping out, serah terima). Jinah kakirim langsung ka pangwangun utawi ka rekening escrow notaris, manut ketentuan SPA.' },
      { Icon: KeyRound, title: 'Serah terima', time: 'tanggal manut SPA', body: 'Pembayaran pamuput, inspeksi daftar cacat (snag list), penerbitan SLF (sertifikat laik fungsi). Kunci kaserahang wantah sasampun pembayaran jangkep. Sabilang penyimpangan saking paket desain kacatet rikala serah terima — buktiang benjang pungkur meweh.' },
      { Icon: Building2, title: 'PT PMA / penyiapan kepemilikan', time: '4–8 minggu', body: 'Yening Ragane numbas lewat PT PMA (perusahaan Indonesia druen dura negara), registrasi ngambil 4–8 minggu tur prabeanipun $1.500–3.500. Leasehold murni nglangkungin puniki — PT PMA wantah kaperluang yening Ragane taler meled KITAS (visa tinggal lewat investasi).' },
      { Icon: Settings2, title: 'Pengelolaan miwah panyewaan', time: 'malanturan', body: 'Perusahaan pengelola ngambil 18–25% saking pikolih kotor tur ngurus kebersihan, pemasaran, check-in tamu. Alternatif: kelola padidi lewat Booking + staf Ragane padidi (margin tegehan, ketahanan endepan, ngamerluang kehadiran fisik).' },
    ],

    h2Ownership: 'Struktur kepemilikan',
    ownershipLead: 'Tigang pilihan buat wong dura negara. Sabilang cocok buat tetujon sane malianan — pilih manut horizon Ragane miwah punapi Ragane taler meled visa KITAS.',
    ownership: [
      {
        title: 'Leasehold (Hak Sewa)',
        body: 'Sewa tanah jangka panjang — biasane 25, 30, 50 utawi 80 warsa. Margi gelisan tur mudahan: kadatanganin ring notaris langsung sareng pemilik utawi pangwangun. Dados kaperpanjang yening kontrak nglugrain. Cocok buat vila sewa utawi umah kaping kalih. Kakirangan: horizon kepemilikan winates — yening sisa masa kirang saking 15 warsa, likuiditas nedunang.',
      },
      {
        title: 'PT PMA',
        body: 'Perusahaan Indonesia druen dura negara, magenah ring Indonesia. Ngamel HGB (Hak Guna Bangunan) — hak ngwangun sajeroning 30 warsa, dados kaperpanjang kantos 80. PT PMA taler mbukak KITAS (visa tinggal), hak nyewa staf lokal, miwah operasi bisnis sane legal. Modal dasar minimum inggih IDR 10 miliar (≈$640rb), ring praktik Ragane patut nyantenang IDR 2,5 miliar sane kasetor. Pinih becik buat investor sane madue horizon panjang.',
      },
      {
        title: 'Hak Pakai',
        body: 'Hak pakai sane kaicen ring wong dura negara sane madue KITAP (izin tinggal tetep). Jangka waktu 30 warsa, dados kaperpanjang. Wantah malaku yening Ragane sampun ngamel KITAP, kenten arang kaanggen ring pangawit. Maguna dados margi "resik" buat sane madewek jagi magenah ring Bali sacara jangkep.',
      },
    ],

    h2Costs: 'Prabea total sujati — conto ring vila off-plan $400.000',
    costsLead: 'Aji utama inggih aji kontrak. Pajak miwah prabea numpuk ring baduuripun — anggarang +12–14% ring baduur aji sane kacantumang. Angka ring sor buat transaksi leasehold; PT PMA nambahin ~$2.000–3.500 sarahina.',
    costsRows: [
      { label: 'Aji properti', value: '$400,000', note: 'aji dasar SPA' },
      { label: 'PPN', value: '$44,000', note: '11% buat wangunan anyar; 0% buat adol malih' },
      { label: 'BPHTB (pajak peralihan)', value: '$20,000', note: '5% saking transaksi, kabayah pameli' },
      { label: 'Notaris (PPAT)', value: '$4,000–6,000', note: '1–1,5%, biasane kabagi 50/50 sareng pengadol' },
      { label: 'Pengacara (DD + penutupan)', value: '$1,500–3,500', note: 'opsional sakewanten kasaranang pisan' },
      { label: 'Registrasi BPN', value: '$0–500', note: 'registrasi leasehold' },
      { label: 'Total tambahan', value: '$69,500–73,500', note: '+17–18% ring baduur aji properti' },
    ],
    costsFooter: 'PT PMA dados struktur kepemilikan — malianan $1.500–3.500 buat registrasi tur ~$1.200–1.800/warsa buat akuntansi miwah pelaporan pajak.',

    h2Mistakes: 'Pitung kaiwangan umum wong dura negara',
    mistakes: [
      'Nenten mriksa PBG / IMB sadurung nandatangin SPA. Yening nenten wenten PBG = konstruksi ilegal; regency dados mrentahang pembongkaran.',
      'Numbas leasehold nenten sareng klausul perpanjangan. Sasampun 25 warsa Ragane ical properti; sareng perpanjangan Ragane malanturang kantos 50–80.',
      'Ngirim jinah ka rekening pribadi pengadol boya ka escrow notaris. Rikala sengketa, jinah punika sampun ical.',
      'Nglangkungin pengacara. Template SPA pangwangun setata katulis buat kapentingan ipun — pengacara independen nulis malih klausul-klausul sane madue risiko.',
      'Nenten madue izin Pondok Wisata sakewanten ngrencanayang pikolih sewa jangka gelis. Yening nenten wenten, Airbnb sacara teknis ilegal; Ragane madue risiko denda utawi katutup.',
      'Percaya ring ROI utama nenten sareng model. Klaim 12% net ngasumsiang okupansi 75%+ miwah ADR kuartil tegeh buat distrik punika — dados, sakewanten nenten kajamin.',
      'Nglemenahang zonasi. Zonasi hunian nglarang sewa komersial; zonasi pariwisata nglugrain. Mriksa peta zonasi regency.',
    ],

    h2Countries: 'Catetan manut negara',
    countries: [
      {
        title: 'Amerika Serikat',
        body: 'IRS mewajibang pelaporan properti dura negara lewat FBAR (FinCEN 114) yening total rekening dura negara nglintangin $10.000, miwah Form 8938 buat kepemilikan agengan. Pikolih sewa kalaporang ring Schedule E; withholding Indonesia 10% dados kakreditang dados foreign tax credit. Pewarisan resikan lewat PT PMA.',
      },
      {
        title: 'Australia',
        body: 'Aturan FIRB nenten malaku buat numbas leasehold ring dura negara — punika boya tanah Australia. Sakewanten pikolih sane kawaliang keni CGT, miwah penduduk pajak Australia patut nglaporang pikolih sewa dura negara. Perhatikan jendela 15 warsa buat foreign tax offset.',
      },
      {
        title: 'Uni Eropa',
        body: 'AML/KYC standar buat transfer medal sane akeh. Belgia / Jerman / Prancis nglaksanayang pajak sipil ring properti dura negara manut perjanjian pajak ipun sareng Indonesia. Polandia / Ceko / Baltik lemuhan — biasane kredit buat PPh Indonesia sane kabayah.',
      },
      {
        title: 'Tiongkok',
        body: 'Wates arus medal modal RRT inggih $50.000 sabilang jadma sabilang warsa. Numbas $400rb ngamerluang penataan (akeh jadma, rekening investasi, margi korporat Hong Kong). Puniki tugas malianan — biasane kapuputang sareng penasihat pajak Tiongkok sadurung deposit napi ja. Sisi Bali saking transaksi puniki katon pateh sareng numbas krama Eropa: notaris sane pateh, SPA sane pateh.',
      },
    ],

    faqHeading: 'Patakon sane sering kaajukang',
    faq: [
      { q: 'Punapi wong dura negara dados numbas hak milik ring Bali?',
        a: 'Nenten. Hak Milik winates buat warga negara Indonesia. Wong dura negara ngamel lewat leasehold (kantos 80 warsa sareng perpanjangan) utawi lewat perusahaan Indonesia PT PMA sane ngamel HGB (Hak Guna Bangunan).' },
      { q: 'Napi punika PT PMA tur punapi tiang merluang punika?',
        a: 'PT PMA inggih perusahaan Indonesia sareng 100% modal dura negara — margi legal buat ngamel HGB tur ngamargiang bisnis. Pinih becik yening Ragane ngrencanayang magenah ring Bali (KITAS), nyewa staf, utawi ngamel makudang properti. Buat asiki vila sewa, leasehold sampun cukup.' },
      { q: 'Sapunapi sue proses numbasipun?',
        a: 'Off-plan — 6–12 sasih saking reservasi kantos serah terima (gumantung tahap konstruksi). Bagian hukumipun kemanten (DD + notaris) inggih 4–6 minggu. Transaksi adol malih dados puput sajeroning 6–8 minggu makasami.' },
      { q: 'Punapi aman ngirim jinah ka Indonesia?',
        a: 'Inggih, asalkan pembayaran ngranjing ka rekening notaris utawi escrow, boya ka rekening pribadi pengadol. Setata tunas instruksi transfer saking SPA punika padidi, boya saking aplikasi pesan — punika saluran penipuan sane pinih umum.' },
      { q: 'Punapi tiang polih visa lewat numbas?',
        a: 'Numbas kemanten nenten ngicen visa. Lewat ngadaftarang PT PMA sareng modal kasetor miwah karyawan lokal, Ragane menuhin syarat KITAS sane malaku 1–2 warsa tur dados kaperpanjang. Pensiunan madue Retirement KITAS malianan ngawit umur 55, sareng deposit ~$45.000.' },
      { q: 'Napi imbal hasil sewa sane realistis?',
        a: 'Ring Canggu miwah Bukit ring okupansi 70–80%: biasane 8–12% net sabilang warsa. Ubud: 6–9% krana musiman. Napi ja ring baduur 14% ring klaim pangwangun patut kauji sareng model keuangan malianan sareng ADR distrik miwah prabea pengelolaan (18–25%).' },
      { q: 'Sapunapi yening pangwangun nenten nyerahang?',
        a: 'SPA standar ngranjingang penalti kaselatan (biasane 0,05–0,1% saking aji sabilang rahina sasampun masa tenggang 3–6 sasih) miwah hak pembatalan sareng pengembalian jinah. Ring praktik pangwangun ageng telat 2–6 sasih; kagagalan total arang mamargi tur kasaring rikala DD lewat rekam jejak.' },
      { q: 'Punapi tiang dados ngadol leasehold benjang?',
        a: 'Inggih — peralihan leasehold kalaksanayang ring notaris PPAT sane pateh. Wenten permintaan sekunder sane aktif buat unit mayusa 2–3 warsa sareng riwayat sewa. Likuiditas nedunang yening sisa leasehold ring sor 15 warsa — itung punika ring strategi medal Ragane.' },
    ],

    ctaHeading: 'Napi salanturipun',
    ctaText: 'Meled nyingak listing tinutu utawi ngraosang strategi langsung?',
    ctaCatalog: 'Bukak katalog',
    ctaCall: 'Ngraos sareng manajer',
  },
} as const

export function BuyingGuide({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const home = switchLangPath('/ru', lang)
  const villasHref = switchLangPath('/ru/villy', lang)

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
