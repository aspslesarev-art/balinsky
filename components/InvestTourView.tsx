// Premium concierge "fly to Bali for 5 days, we run the tour" landing
// page. Targets serious foreign investors who'll fly anyway — better
// they fly with us than with a competitor. Pattern lifted from
// blackpoint.group/invest-tour but with our own positioning, copy and
// structure.

import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { botLink } from '@/lib/bot-link'
import {
  Plane, Car, Building2, Users, Scale, MapPin, Send,
  Clock, Star, Sparkles, ChevronRight,
} from 'lucide-react'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    home: 'Главная',
    crumb: 'Инвест-тур',
    h1: 'Инвест-тур по недвижимости Бали — личный осмотр и due diligence на месте',
    intro: 'Программа выезда на Бали для покупки виллы или апартаментов в инвестиционных целях. За 2–7 дней вы лично осматриваете 5–10 проектов из вашего шорт-листа, встречаетесь с командами застройщиков, проводите час с юристом по сделкам для иностранцев и получаете обзор перспективных районов острова — Чангу, Букит, Убуд, Санур. Логистику, перевод, переговоры и расписание берёт на себя команда Balinsky на земле.',
    bookCta: 'Забронировать тур',
    contactCta: 'Задать вопрос',

    h2Why: 'Почему живой осмотр перед покупкой недвижимости на Бали критичен',
    why: [
      { Icon: Sparkles, title: 'Качество стройки видно только на земле',
        body: 'Drone-видео и pdf-презентации показывают идеализированную картинку. Первые 15 минут на стройплощадке отвечают на 80% вопросов, которые не закрываются по фотографиям: реальное качество отделки и материалов, шум окружения, фактический доступ к пляжу, в какую сторону выходят окна, насколько близко соседние стройки, есть ли проблемы с водоотведением.' },
      { Icon: Users,    title: 'Прямой контакт с командой проекта',
        body: 'Не sales-менеджер с заготовленными скриптами, а founder проекта или его коммерческий директор за одним столом. Можно спрашивать про задержки прошлых очередей, реальную occupancy сданных объектов, escape-clause при срыве сроков, гарантии возврата депозита, и любые вопросы которые в presentation deck никогда не пишут.' },
      { Icon: Star,     title: 'Эксклюзивные условия для участников тура',
        body: 'У части застройщиков для гостей программы — отдельные коммерческие условия: либо скидка 3–7% к открытой цене, либо более гибкий payment plan, либо tour-only единицы с лучшим расположением. Не на всех проектах, но в среднем перекрывает стоимость самой поездки.' },
    ],

    h2Includes: 'Что входит в программу инвест-тура',
    includes: [
      { Icon: Plane,     title: 'Встреча в аэропорту Денпасар и брифинг',
        body: 'Встречаем по прилёту в Ngurah Rai, везём в гостиницу, проводим 30-минутный брифинг: какие проекты вы уже видели по сайту, какие появились новые с момента вашего шорт-листа, какие районы посетим, расписание встреч с застройщиками и юристом, что взять с собой на осмотры.' },
      { Icon: Car,       title: 'Комфорт-транспорт по программе',
        body: 'Comfort-класс с водителем на весь тур — между объектами, на встречи, в гостиницу вечером. Маршрут планируется заранее с учётом пробок Чангу и Букита и реальной близости проектов друг к другу, чтобы не уходило по 90 минут на каждый переезд.' },
      { Icon: Building2, title: 'Осмотр 5–10 проектов вживую',
        body: 'Виллы, апартаменты, жилые комплексы — формат под ваш бюджет и цель (аренда / лайфстайл / перепродажа). На каждом объекте брокер из команды Balinsky показывает строящиеся юниты или sample unit, рассказывает специфику застройщика, документы по земле, окрестности, профиль арендатора района.' },
      { Icon: Users,     title: 'Встречи 1-на-1 с застройщиками',
        body: 'По 2–4 интересующим вас проектам — личная встреча с founder или sales директором за час. Обсуждаются: сроки сдачи и текущие задержки, рассрочки и payment milestones, гарантии возврата, escape-clauses, условия управления после сдачи. Договорённости фиксируем в письме сразу после встречи.' },
      { Icon: Scale,     title: 'Юридическая консультация для иностранца',
        body: '60–90 минут с независимым юристом, специализирующимся на сделках с нерезидентами Индонезии. Разбираем под ваш профиль: leasehold vs PT PMA, налоговые последствия в стране резидентства (USA/UK/EU/AU), KITAS и инвестиционный визовый путь, ключевые пункты SPA в которых обычно прячутся риски.' },
      { Icon: MapPin,    title: 'Обзор инвестиционных районов острова',
        body: 'Полудневная поездка по 2–3 районам Бали под вашу стратегию — Чангу (Berawa, Pererenan, Batu Bolong), Букит (Uluwatu, Bingin, Pandawa), Убуд, Санур. Где сейчас рост цен, где стагнация, кто типичный арендатор района, где лучше держать ликвидность для перепродажи через 3–5 лет.' },
    ],

    h2Programs: 'Форматы инвест-тура',
    programs: [
      {
        name: 'Express',
        duration: '2 дня',
        line: '3–5 проектов · 1 район',
        body: 'Если у вас уже есть шорт-лист из 2–3 объектов с сайта и нужно лично посмотреть и принять решение. Только осмотры и базовая встреча с продавцом — без юридического блока и без обзора районов.',
        bestFor: 'Покупатель готов закрыть сделку и выбирает между 2–3 финальными вариантами',
      },
      {
        name: 'Standard',
        duration: '3–4 дня',
        line: '5–8 проектов · юрист · 2 района',
        body: 'Полный цикл due diligence на месте: осмотры объектов, встречи с командами проектов, час с независимым юристом по налогам и структуре сделки, обзор двух релевантных районов. На этом тире закрывается большинство сделок наших клиентов.',
        bestFor: 'Серьёзная покупка $300–800k с проверкой юр. стороны и сравнением альтернатив',
        highlight: true,
      },
      {
        name: 'Premium',
        duration: '5–7 дней',
        line: '10+ проектов · нотариус PPAT · все районы',
        body: 'Расширенная программа для крупного инвестора: дополнительные районы и проекты, встреча с нотариусом PPAT, помощь с регистрацией PT PMA если планируете KITAS, экскурсии и нянька для семьи на параллельных треках, ужины с командами топ-застройщиков.',
        bestFor: 'Бюджет $1M+, портфель из нескольких объектов или релокация семьи на Бали',
      },
    ],
    programBestFor: 'Подходит',
    programBook: 'Забронировать формат',

    h2Faq: 'Частые вопросы про инвест-тур на Бали',
    faq: [
      { q: 'Сколько стоит участие в инвест-туре?',
        a: 'Зависит от формата и сезона. Standard и Premium для серьёзных покупателей с подтверждённым бюджетом — обычно $0, мы покрываем логистику из комиссии застройщика после закрытия сделки. Express для холодных лидов — $300–500 как security-депозит, который засчитывается в комиссию при покупке. Премиум-семейный пакет с няней и расширенной программой — от $1500 за 5 дней. Финальную цену назовём после 30-минутного звонка.' },
      { q: 'Нужна ли виза в Индонезию для приезда на тур?',
        a: 'Для граждан США, Канады, Великобритании, Шенгена, Австралии и Новой Зеландии достаточно туристической VOA на 30 дней — оформляется на стойке по прилёту в аэропорту Денпасар за $35 или заранее онлайн через E-VOA Indonesia. Приглашение от принимающей стороны не требуется. Если планируете остаться больше 30 дней — можно продлить ещё на 30 дней через иммиграционный офис на Бали.' },
      { q: 'Можно ли приехать с супругом, партнёром или семьёй?',
        a: 'Да, более 60% наших туров проходят парами или семьями. Программа подстраивается: параллельные треки для тех кто не на встречах (экскурсия по Убуду, пляжный клуб, кулинарный мастер-класс), или нянька для детей на время осмотров. Скажите заранее сколько человек приезжает и возраст детей — соберём оптимальную программу.' },
      { q: 'Что делать если ни один объект на туре не подойдёт?',
        a: 'Это нормальный исход примерно у 25% посетителей, и это уже полезный результат — лучше потратить 4 дня и понять, что Бали или конкретные проекты не ваш сценарий, чем закрыть сделку вслепую и пожалеть через год. Никакого давления купить нет: мы зарабатываем только на закрытых сделках, и то только если объект реально подходит покупателю — иначе будет рекламация, что нам не нужно.' },
      { q: 'Когда лучше всего планировать тур по сезону?',
        a: 'Лучшие месяцы для осмотра объектов — апрель–июнь и сентябрь–ноябрь: меньше пробок в Чангу/Букит, мягкая погода, легче зафиксировать встречи с командами застройщиков. Декабрь–март — высокий туристический сезон, можно увидеть реальную загрузку сданных вилл «как у арендатора», но пробки и цены на отели в 1.5–2 раза выше. Июль–август — пик европейских школьных каникул, та же ситуация.' },
      { q: 'Сколько времени нужно бронировать тур заранее?',
        a: 'За 2–4 недели обычно достаточно для Express и Standard форматов. Для Premium лучше за 4–6 недель — нужно зафиксировать слоты у нотариуса PPAT, юриста с английским и команд топ-застройщиков, у них расписание плотное. На пиковые недели (декабрь–март) бронируйте за 6–8 недель.' },
      { q: 'Можно ли подписать SPA и купить недвижимость прямо во время тура?',
        a: 'Часто так и происходит. Reservation form подписывается прямо на встрече с застройщиком в день осмотра, holding deposit ($2–10k) вносится на эскроу-счёт нотариуса в течение 1–2 рабочих дней. Сама SPA подписывается у нотариуса PPAT обычно через 2–4 недели после reservation, после прохождения due diligence — для этого вам не нужно возвращаться на Бали, документы оформляются дистанционно через доверенность.' },
      { q: 'Что делать после тура, если решение нужно обдумать?',
        a: 'Большинство клиентов так и делают — приезжают «посмотреть и подумать», а решение принимают через 1–3 месяца после возвращения. Мы передаём полный пакет: записи встреч с застройщиками, заметки юриста, фото с осмотров, контакты команды Balinsky на Бали. Сравнивайте дома спокойно, пишите когда появляются новые вопросы. Если потом захотите купить — поможем закрыть сделку дистанционно через доверенного нотариуса.' },
      { q: 'Какой минимальный бюджет имеет смысл для приезда на тур?',
        a: 'От $200k для апартаментов в Sanur или off-plan в Убуде, от $300k для виллы на Букит или в Чангу. Ниже этого бюджета выбор сильно сужается, тур может оказаться непропорциональным усилием. Если бюджет $150k и вы рассматриваете аренду на Бали с прицелом на покупку через год-два — расскажите, иногда формат меняется на консультацию без поездки.' },
      { q: 'Как вы выбираете объекты для показа?',
        a: 'Сначала вы заполняете короткую анкету: бюджет, цель (под аренду / для жизни / под перепродажу), желательный район, спальни, готовность ехать в строящийся проект. Из 700+ виллах и 700+ апартаментов в нашей базе мы отбираем 8–15 кандидатов, согласовываем с вами шорт-лист до приезда, и в туре показываем 5–10 финалистов плюс 2–3 «бонусных» альтернативы которые могут вас удивить.' },
    ],

    bookCardHeading: 'Готовы приехать на Бали',
    bookCardText: 'Напишите боту короткое сообщение: бюджет, ориентировочные даты, цель покупки (под аренду / лайфстайл / релокация / перепродажа). Подберём формат тура и пришлём расчёт за 24 часа, без обязательств.',
    bookCardCta: 'Связаться с командой',

    perksLabel: 'Включено',
  },
  en: {
    home: 'Home',
    crumb: 'Invest tour',
    h1: 'Bali property investment tour — on-site viewings and due diligence',
    intro: 'A 2–7 day on-the-ground programme for foreign investors buying a villa or apartment on Bali. You personally inspect 5–10 listings from your shortlist, sit down with developer teams, spend an hour with a lawyer who specialises in foreigner deals, and tour the relevant districts of the island — Canggu, Bukit, Ubud, Sanur. Logistics, translation, negotiation and scheduling are handled by the Balinsky team on the ground.',
    bookCta: 'Book a tour',
    contactCta: 'Ask a question',

    h2Why: 'Why an on-site visit matters before buying property in Bali',
    why: [
      { Icon: Sparkles, title: 'Build quality is only visible on the ground',
        body: 'Drone footage and PDF decks show an idealised picture. The first 15 minutes on a construction site answer 80% of questions photos can\'t close: actual finish quality, ambient noise, real walking distance to the beach, which way the windows face, how close the next site is, whether drainage is solved.' },
      { Icon: Users,    title: 'Direct line to the project team',
        body: 'Not a sales rep with rehearsed answers — the actual founder or commercial director at the same table. You can ask about previous-phase delays, real occupancy of delivered units, escape clauses for late delivery, deposit return guarantees, and any question that never makes it into a presentation deck.' },
      { Icon: Star,     title: 'Tour-only commercial conditions',
        body: 'Several developers offer dedicated terms to programme guests: either a 3–7% discount off the open price, or a softer payment plan, or tour-only units in better positions. Not on every project, but on average it covers the cost of the trip itself.' },
    ],

    h2Includes: 'What\'s included in the investment tour',
    includes: [
      { Icon: Plane,     title: 'Pickup at Denpasar airport and briefing',
        body: 'We meet you at Ngurah Rai, drive you to the hotel, run a 30-minute briefing: which projects you already saw on the site, what is new since your shortlist, which districts we\'ll cover, the schedule of developer and lawyer meetings, what to bring on viewings.' },
      { Icon: Car,       title: 'Comfort-class transport throughout',
        body: 'Comfort-class car with driver across the entire programme — between sites, to meetings, back to the hotel in the evening. The route is planned around Canggu and Bukit traffic patterns and actual proximity between projects, so you don\'t lose 90 minutes on every transfer.' },
      { Icon: Building2, title: 'On-site viewings of 5–10 projects',
        body: 'Villas, apartments, residential complexes — formats matched to your budget and goal (rental income / lifestyle / resale). At each site a Balinsky broker walks you through under-construction units or the sample unit, the developer\'s history, land documents, surroundings, and the renter profile of the district.' },
      { Icon: Users,     title: 'One-on-one developer meetings',
        body: 'For 2–4 of the projects you find most promising — a private meeting with the founder or sales director, an hour each. We discuss completion timelines and current slippage, payment milestones, return guarantees, escape clauses, and post-handover management terms. Agreements are confirmed in writing right after each meeting.' },
      { Icon: Scale,     title: 'Lawyer consultation for foreign buyers',
        body: '60–90 minutes with an independent lawyer who specialises in non-resident transactions in Indonesia. Tailored to your profile: leasehold vs PT PMA, tax implications in your home country (US/UK/EU/AU), KITAS and the investor visa route, the SPA clauses where risk usually hides.' },
      { Icon: MapPin,    title: 'Investment districts overview',
        body: 'A half-day drive through 2–3 districts that match your strategy — Canggu (Berawa, Pererenan, Batu Bolong), Bukit (Uluwatu, Bingin, Pandawa), Ubud, Sanur. Where prices are rising, where they are flat, who the typical renter is in each, where resale liquidity is best for a 3–5 year exit.' },
    ],

    h2Programs: 'Tour formats',
    programs: [
      {
        name: 'Express',
        duration: '2 days',
        line: '3–5 projects · 1 district',
        body: 'For buyers who already shortlisted 2–3 listings on the site and need to see them in person and decide. Viewings and a basic seller meeting only — no legal block, no district drive.',
        bestFor: 'Buyer ready to close, choosing between 2–3 final options',
      },
      {
        name: 'Standard',
        duration: '3–4 days',
        line: '5–8 projects · lawyer · 2 districts',
        body: 'Full on-site due diligence: project visits, developer team meetings, an hour with the independent lawyer on tax and deal structure, drive through two relevant districts. The default tier — most of our deals close on this format.',
        bestFor: 'Serious $300–800k purchase with legal validation and alternatives compared',
        highlight: true,
      },
      {
        name: 'Premium',
        duration: '5–7 days',
        line: '10+ projects · PPAT notary · all districts',
        body: 'Extended programme for larger investors: additional districts and projects, a meeting with the PPAT notary, help with PT PMA registration if you plan a KITAS, parallel excursions and nanny service for the family, dinners with top-developer founders.',
        bestFor: '$1M+ budget, multi-property portfolio or family relocation to Bali',
      },
    ],
    programBestFor: 'Best for',
    programBook: 'Book this format',

    h2Faq: 'Frequently asked about the Bali investment tour',
    faq: [
      { q: 'How much does the tour cost?',
        a: 'Depends on format and season. Standard and Premium for serious buyers with confirmed budget — typically $0, we cover logistics from the developer commission after the deal closes. Express for cold leads — $300–500 as a security deposit applied to the broker fee at purchase. The premium family package with nanny and extended programme — from $1500 for 5 days. Final quote after a 30-minute call.' },
      { q: 'Do I need a visa for Indonesia?',
        a: 'For US, Canadian, UK, Schengen, Australian and New Zealand passports a 30-day tourist VOA is enough — issued on arrival at Denpasar airport for $35 or in advance via E-VOA Indonesia. No invitation from a host required. If you want to stay longer than 30 days, you can extend another 30 at the Bali immigration office.' },
      { q: 'Can I bring a partner or family?',
        a: 'Yes — over 60% of our tours run as couples or families. The programme adapts: parallel tracks for those not on meetings (Ubud excursion, beach club, cooking class), or a nanny service for children during viewings. Tell us upfront how many people are coming and the children\'s ages — we\'ll build the right schedule.' },
      { q: 'What if no listing on the tour fits?',
        a: 'That happens for about 25% of visitors and is itself a useful outcome — better to spend 4 days realising Bali or specific projects aren\'t your scenario than to close blind and regret a year later. There is no pressure to buy: we earn only on closed deals, and only if the object actually fits the buyer — otherwise we get a complaint, which we don\'t need.' },
      { q: 'When is the best time of year to come?',
        a: 'The best months for viewings are April–June and September–November: lighter Canggu and Bukit traffic, mild weather, easier to lock in developer team meetings. December–March is the high tourism season — you can observe real villa occupancy as a renter would, but traffic and hotel rates are 1.5–2× higher. July–August is the European school holidays peak, similar story.' },
      { q: 'How far in advance should I book?',
        a: '2–4 weeks is normally enough for Express and Standard. For Premium plan 4–6 weeks ahead — we need to lock in the PPAT notary slot, an English-speaking lawyer, and the top-developer founder schedules, which fill up. Peak weeks (December–March): book 6–8 weeks ahead.' },
      { q: 'Can I sign the SPA and buy during the tour?',
        a: 'Often that\'s exactly what happens. The reservation form is signed at the developer meeting on viewing day; the holding deposit ($2–10k) wires to the notary escrow within 1–2 working days. The SPA itself is signed at the PPAT notary 2–4 weeks after reservation, after due diligence is cleared — you don\'t need to come back for it, the paperwork is handled remotely via power of attorney.' },
      { q: 'What if I need to think after the tour?',
        a: 'Most clients work that way — they come to "look and think" and decide 1–3 months after returning. We hand over a full package: meeting recordings with the developers, lawyer notes, photos from each viewing, direct contacts of the Balinsky team on Bali. Compare quietly at home, write back when new questions come up. If you decide to buy later, we close the deal remotely via a trusted notary.' },
      { q: 'What\'s the minimum budget for the tour to make sense?',
        a: 'From $200k for apartments in Sanur or off-plan in Ubud, from $300k for a villa on Bukit or in Canggu. Below that the choice narrows sharply and the tour can become disproportionate effort. If your budget is $150k and you\'re considering renting on Bali first with a view to buy in a year or two — tell us, sometimes the format becomes a consultation without the trip.' },
      { q: 'How do you choose the listings to show?',
        a: 'You start with a short brief: budget, goal (rental income / lifestyle / resale), preferred district, bedrooms, willingness to consider an off-plan project. From 700+ villas and 700+ apartments in our database we pick 8–15 candidates, agree the shortlist with you before arrival, and on the tour show 5–10 finalists plus 2–3 "bonus" alternatives that might surprise you.' },
    ],

    bookCardHeading: 'Ready to come to Bali',
    bookCardText: 'Send the bot a short message: budget, target dates, purpose (rental income / lifestyle / relocation / resale). We\'ll pick the format and quote within 24 hours, no commitment.',
    bookCardCta: 'Talk to the team',

    perksLabel: 'Included',
  },
  id: {
    home: 'Beranda',
    crumb: 'Tur investasi',
    h1: 'Tur investasi properti Bali — kunjungan langsung dan uji tuntas di lokasi',
    intro: 'Program di lokasi selama 2–7 hari untuk investor asing yang membeli vila atau apartemen di Bali. Anda memeriksa sendiri 5–10 listing dari daftar pendek Anda, bertemu tim pengembang, menghabiskan satu jam dengan pengacara spesialis transaksi orang asing, dan berkeliling kawasan penting di pulau ini — Canggu, Bukit, Ubud, Sanur. Logistik, penerjemahan, negosiasi, dan penjadwalan ditangani oleh tim Balinsky di lokasi.',
    bookCta: 'Pesan tur',
    contactCta: 'Ajukan pertanyaan',

    h2Why: 'Mengapa kunjungan langsung penting sebelum membeli properti di Bali',
    why: [
      { Icon: Sparkles, title: 'Kualitas bangunan hanya terlihat di lokasi',
        body: 'Video drone dan dek PDF menampilkan gambaran ideal. 15 menit pertama di lokasi konstruksi menjawab 80% pertanyaan yang tak bisa dijawab foto: kualitas finishing sebenarnya, kebisingan sekitar, jarak jalan kaki nyata ke pantai, arah hadap jendela, seberapa dekat lokasi berikutnya, apakah drainase sudah beres.' },
      { Icon: Users,    title: 'Kontak langsung dengan tim proyek',
        body: 'Bukan tenaga penjualan dengan jawaban hafalan — melainkan founder atau direktur komersial yang sebenarnya di meja yang sama. Anda bisa bertanya soal keterlambatan fase sebelumnya, okupansi nyata unit yang telah selesai, klausul jalan keluar untuk keterlambatan, jaminan pengembalian deposit, dan pertanyaan apa pun yang tak pernah masuk dek presentasi.' },
      { Icon: Star,     title: 'Kondisi komersial khusus peserta tur',
        body: 'Beberapa pengembang menawarkan syarat khusus untuk tamu program: diskon 3–7% dari harga terbuka, rencana pembayaran lebih lentur, atau unit khusus tur dengan posisi lebih baik. Tidak di setiap proyek, tetapi rata-rata menutup biaya perjalanan itu sendiri.' },
    ],

    h2Includes: 'Yang termasuk dalam tur investasi',
    includes: [
      { Icon: Plane,     title: 'Penjemputan di bandara Denpasar dan briefing',
        body: 'Kami menjemput Anda di Ngurah Rai, mengantar ke hotel, dan melakukan briefing 30 menit: proyek mana yang sudah Anda lihat di situs, apa yang baru sejak daftar pendek Anda, kawasan mana yang akan dikunjungi, jadwal pertemuan dengan pengembang dan pengacara, apa yang perlu dibawa saat kunjungan.' },
      { Icon: Car,       title: 'Transportasi kelas comfort sepanjang program',
        body: 'Mobil kelas comfort dengan sopir sepanjang program — antar lokasi, ke pertemuan, kembali ke hotel di malam hari. Rute direncanakan sesuai pola kemacetan Canggu dan Bukit serta kedekatan nyata antarproyek, agar Anda tidak kehilangan 90 menit di setiap perpindahan.' },
      { Icon: Building2, title: 'Kunjungan langsung ke 5–10 proyek',
        body: 'Vila, apartemen, kompleks hunian — format sesuai anggaran dan tujuan Anda (pendapatan sewa / gaya hidup / dijual kembali). Di setiap lokasi, broker Balinsky memandu Anda melihat unit yang sedang dibangun atau unit contoh, riwayat pengembang, dokumen tanah, lingkungan sekitar, dan profil penyewa kawasan.' },
      { Icon: Users,     title: 'Pertemuan empat mata dengan pengembang',
        body: 'Untuk 2–4 proyek yang paling menarik bagi Anda — pertemuan pribadi dengan founder atau direktur penjualan, masing-masing satu jam. Kami membahas jadwal penyelesaian dan keterlambatan saat ini, tahapan pembayaran, jaminan pengembalian, klausul jalan keluar, dan syarat pengelolaan setelah serah terima. Kesepakatan dikonfirmasi tertulis segera setelah setiap pertemuan.' },
      { Icon: Scale,     title: 'Konsultasi hukum untuk pembeli asing',
        body: '60–90 menit dengan pengacara independen spesialis transaksi non-residen di Indonesia. Disesuaikan dengan profil Anda: leasehold vs PT PMA, konsekuensi pajak di negara asal Anda (AS/Inggris/UE/Australia), KITAS dan jalur visa investor, klausul SPA tempat risiko biasa bersembunyi.' },
      { Icon: MapPin,    title: 'Tinjauan kawasan investasi pulau',
        body: 'Perjalanan setengah hari melewati 2–3 kawasan yang cocok dengan strategi Anda — Canggu (Berawa, Pererenan, Batu Bolong), Bukit (Uluwatu, Bingin, Pandawa), Ubud, Sanur. Di mana harga naik, di mana datar, siapa penyewa tipikal di tiap kawasan, di mana likuiditas jual kembali terbaik untuk keluar dalam 3–5 tahun.' },
    ],

    h2Programs: 'Format tur',
    programs: [
      {
        name: 'Express',
        duration: '2 hari',
        line: '3–5 proyek · 1 kawasan',
        body: 'Untuk pembeli yang sudah memasukkan 2–3 listing ke daftar pendek di situs dan perlu melihatnya langsung lalu memutuskan. Hanya kunjungan dan pertemuan dasar dengan penjual — tanpa blok hukum, tanpa keliling kawasan.',
        bestFor: 'Pembeli siap menutup transaksi, memilih di antara 2–3 opsi akhir',
      },
      {
        name: 'Standard',
        duration: '3–4 hari',
        line: '5–8 proyek · pengacara · 2 kawasan',
        body: 'Uji tuntas lengkap di lokasi: kunjungan proyek, pertemuan tim pengembang, satu jam dengan pengacara independen soal pajak dan struktur transaksi, keliling dua kawasan relevan. Tingkat default — sebagian besar transaksi kami ditutup dengan format ini.',
        bestFor: 'Pembelian serius $300–800k dengan validasi hukum dan perbandingan alternatif',
        highlight: true,
      },
      {
        name: 'Premium',
        duration: '5–7 hari',
        line: '10+ proyek · notaris PPAT · semua kawasan',
        body: 'Program diperluas untuk investor besar: kawasan dan proyek tambahan, pertemuan dengan notaris PPAT, bantuan pendaftaran PT PMA jika Anda berencana KITAS, tamasya paralel dan layanan pengasuh untuk keluarga, makan malam dengan founder pengembang papan atas.',
        bestFor: 'Anggaran $1M+, portofolio beberapa properti atau relokasi keluarga ke Bali',
      },
    ],
    programBestFor: 'Cocok untuk',
    programBook: 'Pesan format ini',

    h2Faq: 'Pertanyaan umum tentang tur investasi Bali',
    faq: [
      { q: 'Berapa biaya tur?',
        a: 'Tergantung format dan musim. Standard dan Premium untuk pembeli serius dengan anggaran terkonfirmasi — biasanya $0, kami menanggung logistik dari komisi pengembang setelah transaksi ditutup. Express untuk lead dingin — $300–500 sebagai deposit keamanan yang diperhitungkan ke biaya broker saat pembelian. Paket keluarga premium dengan pengasuh dan program diperluas — mulai $1500 untuk 5 hari. Harga final disampaikan setelah panggilan 30 menit.' },
      { q: 'Apakah saya perlu visa untuk Indonesia?',
        a: 'Untuk paspor AS, Kanada, Inggris, Schengen, Australia, dan Selandia Baru, VOA turis 30 hari sudah cukup — diterbitkan saat tiba di bandara Denpasar seharga $35 atau sebelumnya lewat E-VOA Indonesia. Tidak diperlukan undangan dari pihak tuan rumah. Jika ingin tinggal lebih dari 30 hari, Anda bisa memperpanjang 30 hari lagi di kantor imigrasi Bali.' },
      { q: 'Bisakah saya mengajak pasangan atau keluarga?',
        a: 'Ya — lebih dari 60% tur kami berjalan sebagai pasangan atau keluarga. Program menyesuaikan: jalur paralel bagi yang tidak ikut pertemuan (tamasya Ubud, beach club, kelas memasak), atau layanan pengasuh untuk anak saat kunjungan. Beri tahu kami di awal berapa orang yang datang dan usia anak — kami akan menyusun jadwal yang tepat.' },
      { q: 'Bagaimana jika tidak ada listing di tur yang cocok?',
        a: 'Itu terjadi pada sekitar 25% pengunjung dan justru hasil yang berguna — lebih baik menghabiskan 4 hari dan menyadari bahwa Bali atau proyek tertentu bukan skenario Anda daripada menutup transaksi buta dan menyesal setahun kemudian. Tidak ada tekanan untuk membeli: kami hanya menghasilkan dari transaksi yang ditutup, dan hanya jika objeknya benar-benar cocok bagi pembeli — jika tidak, kami menerima keluhan, yang tak kami inginkan.' },
      { q: 'Kapan waktu terbaik dalam setahun untuk datang?',
        a: 'Bulan terbaik untuk kunjungan adalah April–Juni dan September–November: lalu lintas Canggu dan Bukit lebih lengang, cuaca sejuk, lebih mudah mengunci pertemuan tim pengembang. Desember–Maret musim wisata ramai — Anda bisa melihat okupansi vila nyata seperti seorang penyewa, tetapi lalu lintas dan tarif hotel 1,5–2× lebih tinggi. Juli–Agustus puncak liburan sekolah Eropa, cerita serupa.' },
      { q: 'Seberapa jauh sebelumnya saya harus memesan?',
        a: '2–4 minggu biasanya cukup untuk format Express dan Standard. Untuk Premium, rencanakan 4–6 minggu sebelumnya — kami perlu mengunci slot notaris PPAT, pengacara berbahasa Inggris, dan jadwal founder pengembang papan atas, yang cepat penuh. Pekan puncak (Desember–Maret): pesan 6–8 minggu sebelumnya.' },
      { q: 'Bisakah saya menandatangani SPA dan membeli selama tur?',
        a: 'Sering kali memang begitu. Formulir reservasi ditandatangani di pertemuan pengembang pada hari kunjungan; deposit penahan ($2–10k) ditransfer ke rekening escrow notaris dalam 1–2 hari kerja. SPA-nya sendiri ditandatangani di notaris PPAT 2–4 minggu setelah reservasi, setelah uji tuntas selesai — Anda tidak perlu kembali untuk itu, dokumen diurus jarak jauh lewat surat kuasa.' },
      { q: 'Bagaimana jika saya perlu berpikir setelah tur?',
        a: 'Sebagian besar klien melakukannya — mereka datang untuk "melihat dan berpikir" lalu memutuskan 1–3 bulan setelah pulang. Kami menyerahkan paket lengkap: rekaman pertemuan dengan pengembang, catatan pengacara, foto dari setiap kunjungan, kontak langsung tim Balinsky di Bali. Bandingkan dengan tenang di rumah, hubungi kami saat muncul pertanyaan baru. Jika kemudian Anda memutuskan membeli, kami menutup transaksi jarak jauh lewat notaris tepercaya.' },
      { q: 'Berapa anggaran minimum agar tur masuk akal?',
        a: 'Mulai $200k untuk apartemen di Sanur atau off-plan di Ubud, mulai $300k untuk vila di Bukit atau Canggu. Di bawah itu pilihan menyempit tajam dan tur bisa jadi upaya yang tak sepadan. Jika anggaran Anda $150k dan Anda mempertimbangkan menyewa dulu di Bali dengan niat membeli dalam satu-dua tahun — beri tahu kami, kadang formatnya berubah jadi konsultasi tanpa perjalanan.' },
      { q: 'Bagaimana Anda memilih listing yang ditampilkan?',
        a: 'Anda mulai dengan brief singkat: anggaran, tujuan (pendapatan sewa / gaya hidup / dijual kembali), kawasan yang disukai, kamar tidur, kesediaan mempertimbangkan proyek off-plan. Dari 700+ vila dan 700+ apartemen di basis data kami, kami memilih 8–15 kandidat, menyepakati daftar pendek dengan Anda sebelum kedatangan, dan di tur menampilkan 5–10 finalis plus 2–3 alternatif "bonus" yang mungkin mengejutkan Anda.' },
    ],

    bookCardHeading: 'Siap datang ke Bali',
    bookCardText: 'Kirim pesan singkat ke bot: anggaran, perkiraan tanggal, tujuan (pendapatan sewa / gaya hidup / relokasi / dijual kembali). Kami akan memilih format dan mengirim penawaran dalam 24 jam, tanpa komitmen.',
    bookCardCta: 'Hubungi tim',

    perksLabel: 'Termasuk',
  },
  fr: {
    home: 'Accueil',
    crumb: "Tour d'investissement",
    h1: "Tour d'investissement immobilier à Bali — visites sur place et due diligence",
    intro: "Un programme sur le terrain de 2 à 7 jours pour les investisseurs étrangers achetant une villa ou un appartement à Bali. Vous inspectez vous-même 5 à 10 biens de votre présélection, rencontrez les équipes des promoteurs, passez une heure avec un avocat spécialisé dans les transactions pour étrangers et parcourez les quartiers clés de l'île — Canggu, Bukit, Ubud, Sanur. Logistique, traduction, négociation et planning sont gérés par l'équipe Balinsky sur place.",
    bookCta: 'Réserver un tour',
    contactCta: 'Poser une question',

    h2Why: "Pourquoi une visite sur place est essentielle avant d'acheter à Bali",
    why: [
      { Icon: Sparkles, title: 'La qualité de construction ne se voit que sur le terrain',
        body: "Les vidéos par drone et les dossiers PDF montrent une image idéalisée. Les 15 premières minutes sur un chantier répondent à 80 % des questions que les photos ne règlent pas : la qualité réelle des finitions, le bruit ambiant, la distance réelle à pied jusqu'à la plage, l'orientation des fenêtres, la proximité du chantier voisin, si le drainage est résolu." },
      { Icon: Users,    title: "Contact direct avec l'équipe du projet",
        body: "Pas un commercial aux réponses toutes faites — le fondateur ou le directeur commercial en personne, à la même table. Vous pouvez interroger sur les retards des phases précédentes, l'occupation réelle des unités livrées, les clauses de sortie en cas de retard, les garanties de remboursement du dépôt, et toute question qui ne figure jamais dans un dossier de présentation." },
      { Icon: Star,     title: 'Conditions commerciales réservées au tour',
        body: "Plusieurs promoteurs offrent des conditions dédiées aux participants du programme : une remise de 3 à 7 % sur le prix public, un plan de paiement plus souple, ou des unités réservées au tour dans de meilleures positions. Pas sur tous les projets, mais en moyenne cela couvre le coût du voyage lui-même." },
    ],

    h2Includes: "Ce qui est compris dans le tour d'investissement",
    includes: [
      { Icon: Plane,     title: "Accueil à l'aéroport de Denpasar et briefing",
        body: "Nous vous accueillons à Ngurah Rai, vous conduisons à l'hôtel et menons un briefing de 30 minutes : quels projets vous avez déjà vus sur le site, ce qui est nouveau depuis votre présélection, quels quartiers nous couvrirons, le programme des rendez-vous avec les promoteurs et l'avocat, quoi apporter aux visites." },
      { Icon: Car,       title: 'Transport confort tout au long du séjour',
        body: "Voiture de classe confort avec chauffeur sur tout le programme — entre les sites, aux rendez-vous, retour à l'hôtel le soir. L'itinéraire est planifié selon les embouteillages de Canggu et Bukit et la proximité réelle entre les projets, pour ne pas perdre 90 minutes à chaque trajet." },
      { Icon: Building2, title: 'Visites sur place de 5 à 10 projets',
        body: "Villas, appartements, résidences — des formats adaptés à votre budget et votre objectif (revenu locatif / art de vivre / revente). Sur chaque site, un courtier Balinsky vous fait visiter les unités en construction ou l'unité témoin, l'historique du promoteur, les documents fonciers, les alentours et le profil des locataires du quartier." },
      { Icon: Users,     title: 'Rendez-vous en tête-à-tête avec les promoteurs',
        body: "Pour 2 à 4 des projets qui vous intéressent le plus — un entretien privé d'une heure avec le fondateur ou le directeur des ventes. Nous abordons les délais de livraison et les retards actuels, les échéances de paiement, les garanties de remboursement, les clauses de sortie et les conditions de gestion après la livraison. Les accords sont confirmés par écrit juste après chaque rendez-vous." },
      { Icon: Scale,     title: 'Consultation juridique pour acheteurs étrangers',
        body: "60 à 90 minutes avec un avocat indépendant spécialisé dans les transactions de non-résidents en Indonésie. Adapté à votre profil : leasehold vs PT PMA, conséquences fiscales dans votre pays (US/UK/UE/AU), le KITAS et la voie du visa investisseur, les clauses du SPA où se cache généralement le risque." },
      { Icon: MapPin,    title: "Aperçu des quartiers d'investissement",
        body: "Une demi-journée de route à travers 2 à 3 quartiers correspondant à votre stratégie — Canggu (Berawa, Pererenan, Batu Bolong), Bukit (Uluwatu, Bingin, Pandawa), Ubud, Sanur. Où les prix montent, où ils stagnent, qui est le locataire type de chacun, où la liquidité de revente est la meilleure pour une sortie à 3–5 ans." },
    ],

    h2Programs: 'Formats du tour',
    programs: [
      {
        name: 'Express',
        duration: '2 jours',
        line: '3–5 projets · 1 quartier',
        body: 'Pour les acheteurs ayant déjà présélectionné 2 à 3 biens sur le site et devant les voir en personne pour décider. Uniquement les visites et un rendez-vous vendeur de base — pas de volet juridique, pas de tour des quartiers.',
        bestFor: 'Acheteur prêt à conclure, hésitant entre 2 à 3 options finales',
      },
      {
        name: 'Standard',
        duration: '3–4 jours',
        line: '5–8 projets · avocat · 2 quartiers',
        body: "Due diligence complète sur place : visites de projets, rendez-vous avec les équipes des promoteurs, une heure avec l'avocat indépendant sur la fiscalité et la structure de la transaction, tour de deux quartiers pertinents. Le niveau par défaut — la plupart de nos transactions se concluent sur ce format.",
        bestFor: 'Achat sérieux de $300–800k avec validation juridique et comparaison des alternatives',
        highlight: true,
      },
      {
        name: 'Premium',
        duration: '5–7 jours',
        line: '10+ projets · notaire PPAT · tous les quartiers',
        body: "Programme étendu pour les investisseurs importants : quartiers et projets supplémentaires, un rendez-vous avec le notaire PPAT, aide à l'enregistrement d'une PT PMA si vous prévoyez un KITAS, excursions en parallèle et service de garde d'enfants pour la famille, dîners avec les fondateurs des meilleurs promoteurs.",
        bestFor: 'Budget $1M+, portefeuille de plusieurs biens ou relocalisation familiale à Bali',
      },
    ],
    programBestFor: 'Idéal pour',
    programBook: 'Réserver ce format',

    h2Faq: "Questions fréquentes sur le tour d'investissement à Bali",
    faq: [
      { q: 'Combien coûte le tour ?',
        a: "Cela dépend du format et de la saison. Standard et Premium pour les acheteurs sérieux au budget confirmé — généralement $0, nous couvrons la logistique sur la commission du promoteur après la conclusion. Express pour les leads froids — $300–500 de dépôt de garantie imputé sur les honoraires de courtage à l'achat. Le pack famille premium avec garde d'enfants et programme étendu — à partir de $1500 pour 5 jours. Devis final après un appel de 30 minutes." },
      { q: "Ai-je besoin d'un visa pour l'Indonésie ?",
        a: "Pour les passeports américain, canadien, britannique, Schengen, australien et néo-zélandais, un VOA touristique de 30 jours suffit — délivré à l'arrivée à l'aéroport de Denpasar pour $35 ou à l'avance via E-VOA Indonesia. Aucune invitation d'un hôte n'est requise. Pour rester plus de 30 jours, vous pouvez prolonger de 30 jours au bureau d'immigration de Bali." },
      { q: 'Puis-je venir avec un partenaire ou ma famille ?',
        a: "Oui — plus de 60 % de nos tours se déroulent en couple ou en famille. Le programme s'adapte : des parcours parallèles pour ceux qui ne sont pas aux rendez-vous (excursion à Ubud, beach club, cours de cuisine), ou un service de garde pour les enfants pendant les visites. Dites-nous à l'avance combien de personnes viennent et l'âge des enfants — nous bâtirons le bon programme." },
      { q: 'Et si aucun bien du tour ne convient ?',
        a: "Cela arrive pour environ 25 % des visiteurs et c'est en soi un résultat utile — mieux vaut passer 4 jours et réaliser que Bali ou certains projets ne sont pas votre scénario que de conclure à l'aveugle et le regretter un an plus tard. Aucune pression d'achat : nous ne gagnons que sur les transactions conclues, et seulement si le bien convient réellement à l'acheteur — sinon nous récoltons une réclamation, dont nous n'avons pas besoin." },
      { q: "Quelle est la meilleure période de l'année pour venir ?",
        a: "Les meilleurs mois pour les visites sont avril–juin et septembre–novembre : trafic plus fluide à Canggu et Bukit, météo douce, plus facile de caler les rendez-vous avec les équipes des promoteurs. Décembre–mars est la haute saison touristique — vous pouvez observer l'occupation réelle des villas comme le ferait un locataire, mais le trafic et les tarifs hôteliers sont 1,5 à 2× plus élevés. Juillet–août, pic des vacances scolaires européennes, même situation." },
      { q: "Combien de temps à l'avance faut-il réserver ?",
        a: "2 à 4 semaines suffisent normalement pour Express et Standard. Pour Premium, prévoyez 4 à 6 semaines à l'avance — il faut réserver le créneau du notaire PPAT, un avocat anglophone et l'agenda des fondateurs des meilleurs promoteurs, qui se remplissent vite. Semaines de pointe (décembre–mars) : réservez 6 à 8 semaines à l'avance." },
      { q: 'Puis-je signer le SPA et acheter pendant le tour ?',
        a: "C'est souvent ce qui arrive. Le formulaire de réservation est signé au rendez-vous avec le promoteur le jour de la visite ; le dépôt de réservation ($2–10k) est viré sur le compte séquestre du notaire sous 1 à 2 jours ouvrés. Le SPA lui-même est signé chez le notaire PPAT 2 à 4 semaines après la réservation, une fois la due diligence terminée — vous n'avez pas besoin de revenir, les documents sont traités à distance par procuration." },
      { q: 'Et si je dois réfléchir après le tour ?',
        a: "La plupart des clients procèdent ainsi — ils viennent « voir et réfléchir » et décident 1 à 3 mois après leur retour. Nous remettons un dossier complet : enregistrements des rendez-vous avec les promoteurs, notes de l'avocat, photos de chaque visite, contacts directs de l'équipe Balinsky à Bali. Comparez tranquillement chez vous, écrivez-nous dès que de nouvelles questions surgissent. Si vous décidez d'acheter plus tard, nous concluons la transaction à distance via un notaire de confiance." },
      { q: 'Quel est le budget minimum pour que le tour ait du sens ?',
        a: "À partir de $200k pour des appartements à Sanur ou en off-plan à Ubud, à partir de $300k pour une villa à Bukit ou à Canggu. En dessous, le choix se réduit fortement et le tour peut devenir un effort disproportionné. Si votre budget est de $150k et que vous envisagez de louer d'abord à Bali en vue d'acheter dans un an ou deux — dites-le-nous, le format devient parfois une consultation sans le voyage." },
      { q: 'Comment choisissez-vous les biens à montrer ?',
        a: "Vous commencez par un bref questionnaire : budget, objectif (revenu locatif / art de vivre / revente), quartier préféré, chambres, disposition à envisager un projet off-plan. Parmi les 700+ villas et 700+ appartements de notre base, nous retenons 8 à 15 candidats, validons la présélection avec vous avant l'arrivée, et sur le tour montrons 5 à 10 finalistes plus 2 à 3 alternatives « bonus » qui pourraient vous surprendre." },
    ],

    bookCardHeading: 'Prêt à venir à Bali',
    bookCardText: "Envoyez un court message au bot : budget, dates envisagées, objectif (revenu locatif / art de vivre / relocalisation / revente). Nous choisirons le format et vous ferons un devis sous 24 heures, sans engagement.",
    bookCardCta: "Parler à l'équipe",

    perksLabel: 'Compris',
  },
} as const

export function InvestTourView({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const home = switchLangPath('/ru', lang)
  const contact = botLink('manager', '')

  // FAQ JSON-LD so Google can pick this up as a rich-snippet candidate.
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const offerJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: c.h1,
    description: c.intro,
    touristType: 'Property investor',
    provider: { '@type': 'Organization', name: 'Balinsky', url: 'https://balinsky.info' },
    location: { '@type': 'Place', name: 'Bali, Indonesia' },
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.crumb },
        ]} />

        {/* HERO */}
        <section className="mt-4 mb-14 max-w-[760px]">
          <h1 className="text-[28px] md:text-[44px] font-semibold tracking-tight text-[#111827] leading-[1.05] mb-5">
            {c.h1}
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[1.65] text-[var(--color-text)] mb-7">
            {c.intro}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={contact}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[14px] font-medium no-underline"
            >
              <Send size={16} /> {c.bookCta}
            </a>
            <a
              href="#programs"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[var(--color-border)] text-[14px] no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] bg-white"
            >
              {c.h2Programs} <ChevronRight size={14} />
            </a>
          </div>
        </section>

        {/* WHY */}
        <section className="mb-14">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-6">
            {c.h2Why}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {c.why.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                <Icon size={20} strokeWidth={1.6} className="text-[var(--color-primary)] mb-3" />
                <h3 className="text-[16px] font-semibold mb-2">{title}</h3>
                <p className="text-[14px] leading-[1.6] text-[var(--color-text-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* INCLUDED */}
        <section className="mb-14">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-6">
            {c.h2Includes}
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {c.includes.map(({ Icon, title, body }) => (
              <li key={title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5 flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-search-bg)] text-[var(--color-primary)] flex items-center justify-center">
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold mb-1">{title}</h3>
                  <p className="text-[13px] leading-[1.6] text-[var(--color-text-muted)]">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* PROGRAMS */}
        <section id="programs" className="mb-14 scroll-mt-24">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-6">
            {c.h2Programs}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {c.programs.map(p => (
              <div
                key={p.name}
                className={`rounded-2xl border-2 p-6 flex flex-col ${
                  ('highlight' in p && p.highlight)
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                    : 'border-[var(--color-border)] bg-white'
                }`}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-[20px] font-semibold text-[#111827]">{p.name}</h3>
                  <span className="text-[12px] text-[var(--color-text-muted)] inline-flex items-center gap-1">
                    <Clock size={11} /> {p.duration}
                  </span>
                </div>
                <div className="text-[13px] text-[var(--color-text-muted)] mb-3">{p.line}</div>
                <p className="text-[14px] leading-[1.6] text-[var(--color-text)] mb-4">{p.body}</p>
                <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5 mt-auto">
                  {c.programBestFor}
                </div>
                <p className="text-[13px] text-[var(--color-text)] mb-4">{p.bestFor}</p>
                <a
                  href={contact}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium no-underline mt-2 ${
                    ('highlight' in p && p.highlight)
                      ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white'
                      : 'border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] bg-white'
                  }`}
                >
                  <Send size={13} /> {c.programBook}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-14 max-w-[760px]">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">
            {c.h2Faq}
          </h2>
          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {c.faq.map(f => (
              <li key={f.q} className="py-4">
                <h3 className="text-[16px] font-semibold mb-1.5 text-[#111827]">{f.q}</h3>
                <p className="text-[14px] leading-[1.65] text-[var(--color-text-muted)]">{f.a}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* CONTACT CARD */}
        <section className="mb-12 max-w-[760px]">
          <div className="rounded-2xl bg-[var(--color-search-bg)] p-6 md:p-8">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-3">
              {c.bookCardHeading}
            </h2>
            <p className="text-[15px] leading-[1.65] text-[var(--color-text)] mb-5">{c.bookCardText}</p>
            <a
              href={contact}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[14px] font-medium no-underline"
            >
              <Send size={16} /> {c.bookCardCta}
            </a>
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
