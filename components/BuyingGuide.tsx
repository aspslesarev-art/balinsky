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
