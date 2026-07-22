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
  de: {
    home: 'Startseite',
    crumb: 'Investment-Tour',
    h1: 'Immobilien-Investment-Tour auf Bali — Besichtigung vor Ort und Due Diligence',
    intro: 'Ein 2–7-tägiges Programm vor Ort für ausländische Investoren, die eine Villa oder ein Apartment auf Bali kaufen. Sie besichtigen persönlich 5–10 Objekte aus Ihrer Auswahlliste, treffen sich mit den Bauträger-Teams, verbringen eine Stunde mit einem auf Ausländer-Deals spezialisierten Anwalt und besichtigen die relevanten Regionen der Insel — Canggu, Bukit, Ubud, Sanur. Logistik, Übersetzung, Verhandlung und Terminplanung übernimmt das Balinsky-Team vor Ort.',
    bookCta: 'Tour buchen',
    contactCta: 'Eine Frage stellen',

    h2Why: 'Warum ein Besuch vor Ort vor dem Immobilienkauf auf Bali wichtig ist',
    why: [
      { Icon: Sparkles, title: 'Die Bauqualität ist nur vor Ort sichtbar',
        body: 'Drohnenaufnahmen und PDF-Präsentationen zeigen ein idealisiertes Bild. Die ersten 15 Minuten auf einer Baustelle beantworten 80 % der Fragen, die Fotos nicht klären können: tatsächliche Verarbeitungsqualität, Umgebungslärm, echter Fußweg zum Strand, Ausrichtung der Fenster, Nähe zur nächsten Baustelle, ob die Entwässerung gelöst ist.' },
      { Icon: Users,    title: 'Direkter Draht zum Projektteam',
        body: 'Kein Verkäufer mit einstudierten Antworten — der tatsächliche Gründer oder kaufmännische Leiter am selben Tisch. Sie können nach Verzögerungen früherer Phasen fragen, der realen Auslastung fertiggestellter Einheiten, Ausstiegsklauseln bei Terminverzug, Rückzahlungsgarantien für Anzahlungen und jeder Frage, die es nie in eine Präsentation schafft.' },
      { Icon: Star,     title: 'Nur für Tour-Teilnehmer geltende Konditionen',
        body: 'Mehrere Bauträger bieten Programmgästen eigene Konditionen: entweder 3–7 % Rabatt auf den offenen Preis, einen flexibleren Zahlungsplan oder tour-exklusive Einheiten in besseren Lagen. Nicht bei jedem Projekt, aber im Schnitt deckt es die Kosten der Reise selbst.' },
    ],

    h2Includes: 'Was in der Investment-Tour enthalten ist',
    includes: [
      { Icon: Plane,     title: 'Abholung am Flughafen Denpasar und Briefing',
        body: 'Wir holen Sie in Ngurah Rai ab, bringen Sie ins Hotel und führen ein 30-minütiges Briefing durch: welche Projekte Sie bereits auf der Website gesehen haben, was seit Ihrer Auswahlliste neu ist, welche Regionen wir abdecken, den Zeitplan der Bauträger- und Anwaltstermine, was Sie zu den Besichtigungen mitnehmen sollten.' },
      { Icon: Car,       title: 'Komfort-Transport während des gesamten Programms',
        body: 'Komfortklasse-Wagen mit Fahrer über das gesamte Programm — zwischen den Objekten, zu Terminen, abends zurück ins Hotel. Die Route wird an den Verkehr in Canggu und Bukit und die tatsächliche Nähe der Projekte angepasst, damit Sie nicht 90 Minuten pro Fahrt verlieren.' },
      { Icon: Building2, title: 'Besichtigung von 5–10 Projekten vor Ort',
        body: 'Villen, Apartments, Wohnanlagen — Formate passend zu Ihrem Budget und Ziel (Mieteinnahmen / Lifestyle / Wiederverkauf). An jedem Standort führt Sie ein Balinsky-Makler durch die im Bau befindlichen Einheiten oder die Musterwohnung, die Historie des Bauträgers, die Grundstücksdokumente, die Umgebung und das Mieterprofil der Region.' },
      { Icon: Users,     title: 'Einzelgespräche mit Bauträgern',
        body: 'Für 2–4 der Projekte, die Sie am vielversprechendsten finden — ein privates Treffen mit dem Gründer oder Vertriebsleiter, je eine Stunde. Wir besprechen Fertigstellungstermine und aktuelle Verzögerungen, Zahlungsmeilensteine, Rückzahlungsgarantien, Ausstiegsklauseln und die Verwaltungsbedingungen nach Übergabe. Vereinbarungen werden direkt nach jedem Treffen schriftlich bestätigt.' },
      { Icon: Scale,     title: 'Rechtsberatung für ausländische Käufer',
        body: '60–90 Minuten mit einem unabhängigen Anwalt, der auf Transaktionen von Nicht-Residenten in Indonesien spezialisiert ist. Auf Ihr Profil zugeschnitten: Leasehold vs. PT PMA, steuerliche Folgen in Ihrem Heimatland (US/UK/EU/AU), KITAS und der Investoren-Visumsweg, die SPA-Klauseln, in denen sich das Risiko meist versteckt.' },
      { Icon: MapPin,    title: 'Überblick über die Investitionsregionen',
        body: 'Eine halbtägige Fahrt durch 2–3 Regionen, die zu Ihrer Strategie passen — Canggu (Berawa, Pererenan, Batu Bolong), Bukit (Uluwatu, Bingin, Pandawa), Ubud, Sanur. Wo die Preise steigen, wo sie stagnieren, wer der typische Mieter ist, wo die Wiederverkaufsliquidität für einen Ausstieg in 3–5 Jahren am besten ist.' },
    ],

    h2Programs: 'Tour-Formate',
    programs: [
      {
        name: 'Express',
        duration: '2 Tage',
        line: '3–5 Projekte · 1 Region',
        body: 'Für Käufer, die bereits 2–3 Objekte auf der Website ausgewählt haben und diese persönlich sehen und entscheiden müssen. Nur Besichtigungen und ein grundlegendes Verkäufergespräch — kein Rechtsblock, keine Regionsfahrt.',
        bestFor: 'Käufer bereit zum Abschluss, Wahl zwischen 2–3 finalen Optionen',
      },
      {
        name: 'Standard',
        duration: '3–4 Tage',
        line: '5–8 Projekte · Anwalt · 2 Regionen',
        body: 'Vollständige Due Diligence vor Ort: Projektbesichtigungen, Treffen mit den Bauträger-Teams, eine Stunde mit dem unabhängigen Anwalt zu Steuern und Deal-Struktur, Fahrt durch zwei relevante Regionen. Das Standard-Format — die meisten unserer Deals werden hierauf abgeschlossen.',
        bestFor: 'Ernsthafter Kauf von $300–800k mit rechtlicher Prüfung und Vergleich von Alternativen',
        highlight: true,
      },
      {
        name: 'Premium',
        duration: '5–7 Tage',
        line: '10+ Projekte · PPAT-Notar · alle Regionen',
        body: 'Erweitertes Programm für größere Investoren: zusätzliche Regionen und Projekte, ein Treffen mit dem PPAT-Notar, Hilfe bei der PT-PMA-Registrierung, falls Sie ein KITAS planen, parallele Ausflüge und Kinderbetreuung für die Familie, Abendessen mit den Gründern der Top-Bauträger.',
        bestFor: 'Budget $1M+, Portfolio aus mehreren Objekten oder Familienumzug nach Bali',
      },
    ],
    programBestFor: 'Ideal für',
    programBook: 'Dieses Format buchen',

    h2Faq: 'Häufige Fragen zur Bali-Investment-Tour',
    faq: [
      { q: 'Wie viel kostet die Teilnahme an der Tour?',
        a: 'Abhängig von Format und Saison. Standard und Premium für ernsthafte Käufer mit bestätigtem Budget — meist $0, wir übernehmen die Logistik aus der Bauträger-Provision nach Abschluss. Express für kalte Leads — $300–500 als Sicherheitsanzahlung, die beim Kauf auf die Maklergebühr angerechnet wird. Das Premium-Familienpaket mit Kinderbetreuung und erweitertem Programm — ab $1500 für 5 Tage. Endgültiger Preis nach einem 30-minütigen Telefonat.' },
      { q: 'Brauche ich ein Visum für Indonesien?',
        a: 'Für Pässe aus den USA, Kanada, Großbritannien, dem Schengen-Raum, Australien und Neuseeland genügt ein 30-tägiges Touristen-VOA — bei Ankunft am Flughafen Denpasar für $35 oder vorab über E-VOA Indonesia ausgestellt. Keine Einladung eines Gastgebers erforderlich. Wollen Sie länger als 30 Tage bleiben, können Sie im Einwanderungsbüro auf Bali um weitere 30 Tage verlängern.' },
      { q: 'Kann ich mit Partner oder Familie kommen?',
        a: 'Ja — über 60 % unserer Touren laufen als Paare oder Familien. Das Programm passt sich an: parallele Tracks für alle, die nicht bei Terminen sind (Ubud-Ausflug, Beach Club, Kochkurs), oder Kinderbetreuung während der Besichtigungen. Sagen Sie uns vorab, wie viele Personen kommen und wie alt die Kinder sind — wir stellen den passenden Plan zusammen.' },
      { q: 'Was, wenn kein Objekt auf der Tour passt?',
        a: 'Das passiert bei etwa 25 % der Besucher und ist selbst ein nützliches Ergebnis — besser 4 Tage aufwenden und erkennen, dass Bali oder bestimmte Projekte nicht Ihr Szenario sind, als blind abzuschließen und ein Jahr später zu bereuen. Es gibt keinen Kaufdruck: Wir verdienen nur an abgeschlossenen Deals, und nur wenn das Objekt wirklich zum Käufer passt — sonst gibt es eine Reklamation, die wir nicht brauchen.' },
      { q: 'Wann ist die beste Jahreszeit zum Kommen?',
        a: 'Die besten Monate für Besichtigungen sind April–Juni und September–November: weniger Verkehr in Canggu und Bukit, mildes Wetter, leichter Termine mit den Bauträger-Teams zu vereinbaren. Dezember–März ist die touristische Hochsaison — Sie können die reale Villen-Auslastung wie ein Mieter beobachten, aber Verkehr und Hotelpreise sind 1,5–2× höher. Juli–August ist der Höhepunkt der europäischen Schulferien, ähnliche Lage.' },
      { q: 'Wie weit im Voraus sollte ich buchen?',
        a: '2–4 Wochen reichen normalerweise für Express und Standard. Für Premium planen Sie 4–6 Wochen im Voraus — wir müssen den PPAT-Notar-Slot, einen englischsprachigen Anwalt und die Termine der Top-Bauträger-Gründer sichern, die sich füllen. Spitzenwochen (Dezember–März): 6–8 Wochen im Voraus buchen.' },
      { q: 'Kann ich das SPA unterschreiben und während der Tour kaufen?',
        a: 'Oft ist genau das der Fall. Das Reservierungsformular wird beim Bauträgertreffen am Besichtigungstag unterschrieben; die Reservierungsanzahlung ($2–10k) geht innerhalb von 1–2 Werktagen auf das Notar-Treuhandkonto. Das SPA selbst wird beim PPAT-Notar 2–4 Wochen nach der Reservierung unterschrieben, nachdem die Due Diligence abgeschlossen ist — dafür müssen Sie nicht zurückkommen, die Papiere werden per Vollmacht aus der Ferne erledigt.' },
      { q: 'Was, wenn ich nach der Tour nachdenken muss?',
        a: 'Die meisten Kunden machen es so — sie kommen zum „Ansehen und Nachdenken“ und entscheiden 1–3 Monate nach der Rückkehr. Wir übergeben ein vollständiges Paket: Aufzeichnungen der Bauträgergespräche, Anwaltsnotizen, Fotos von jeder Besichtigung, direkte Kontakte des Balinsky-Teams auf Bali. Vergleichen Sie in Ruhe zu Hause, schreiben Sie zurück, wenn neue Fragen auftauchen. Entscheiden Sie sich später zum Kauf, schließen wir den Deal aus der Ferne über einen vertrauenswürdigen Notar ab.' },
      { q: 'Welches Mindestbudget lohnt sich für die Tour?',
        a: 'Ab $200k für Apartments in Sanur oder Off-Plan in Ubud, ab $300k für eine Villa auf Bukit oder in Canggu. Darunter verengt sich die Auswahl stark und die Tour kann unverhältnismäßig werden. Liegt Ihr Budget bei $150k und Sie erwägen, zunächst auf Bali zu mieten mit Blick auf einen Kauf in ein bis zwei Jahren — sagen Sie es uns, manchmal wird daraus eine Beratung ohne Reise.' },
      { q: 'Wie wählen Sie die zu zeigenden Objekte aus?',
        a: 'Sie beginnen mit einem kurzen Fragebogen: Budget, Ziel (Mieteinnahmen / Lifestyle / Wiederverkauf), bevorzugte Region, Schlafzimmer, Bereitschaft für ein Off-Plan-Projekt. Aus 700+ Villen und 700+ Apartments in unserer Datenbank wählen wir 8–15 Kandidaten, stimmen die Auswahlliste vor der Ankunft mit Ihnen ab und zeigen auf der Tour 5–10 Finalisten plus 2–3 „Bonus“-Alternativen, die Sie überraschen könnten.' },
    ],

    bookCardHeading: 'Bereit, nach Bali zu kommen',
    bookCardText: 'Senden Sie dem Bot eine kurze Nachricht: Budget, Zieldaten, Zweck (Mieteinnahmen / Lifestyle / Umzug / Wiederverkauf). Wir wählen das Format und erstellen innerhalb von 24 Stunden ein Angebot, unverbindlich.',
    bookCardCta: 'Mit dem Team sprechen',

    perksLabel: 'Inklusive',
  },
  zh: {
    home: '首页',
    crumb: '投资考察',
    h1: '巴厘岛房产投资考察——实地看房与尽职调查',
    intro: '为购买巴厘岛别墅或公寓的外国投资者提供的2–7天实地行程。您将亲自查看候选清单中的5–10处房源，与开发商团队会面，与专精外国人交易的律师相处一小时，并考察岛上的重点区域——Canggu、Bukit、Ubud、Sanur。物流、翻译、谈判和日程安排均由Balinsky当地团队负责。',
    bookCta: '预订考察',
    contactCta: '提出问题',

    h2Why: '为何在巴厘岛买房前实地考察至关重要',
    why: [
      { Icon: Sparkles, title: '建筑质量只有在现场才看得出来',
        body: '无人机视频和PDF演示呈现的是理想化的画面。在工地的头15分钟就能回答照片无法解决的80%问题：真实的装修质量、周边噪音、到海滩的实际步行距离、窗户朝向、隔壁工地有多近、排水是否解决。' },
      { Icon: Users,    title: '与项目团队直接对话',
        body: '不是照本宣科的销售，而是真正的创始人或商务总监与您同桌。您可以询问以往阶段的延期、已交付单元的真实入住率、逾期交付的退出条款、押金退还保证，以及任何绝不会写进演示资料的问题。' },
      { Icon: Star,     title: '考察团专属商务条件',
        body: '部分开发商为项目宾客提供专属条件：或是公开价3–7%的折扣、或是更灵活的付款计划、或是位置更佳的考察专属单元。并非每个项目都有，但平均而言足以覆盖行程本身的费用。' },
    ],

    h2Includes: '投资考察包含哪些内容',
    includes: [
      { Icon: Plane,     title: '登巴萨机场接机与简报',
        body: '我们在Ngurah Rai接您、送至酒店，并进行30分钟简报：您已在网站上看过哪些项目、自您列出清单以来有哪些新项目、我们将走访哪些区域、与开发商和律师会面的日程、看房需带哪些物品。' },
      { Icon: Car,       title: '全程舒适级交通',
        body: '全程配司机的舒适级车辆——在项目之间、赴约会面、傍晚返回酒店。路线会依据Canggu和Bukit的交通状况以及项目间的实际距离预先规划，避免每次转场耗费90分钟。' },
      { Icon: Building2, title: '实地查看5–10个项目',
        body: '别墅、公寓、住宅区——依您的预算和目标（租金收入/生活方式/转售）匹配形式。在每处，Balinsky经纪人会带您查看在建单元或样板单元、开发商历史、土地文件、周边环境以及该区域的租客画像。' },
      { Icon: Users,     title: '与开发商一对一会面',
        body: '针对您最感兴趣的2–4个项目——与创始人或销售总监各进行一小时的私人会面。讨论交付时间和当前延误、付款节点、退还保证、退出条款以及交付后的管理条款。协议在每次会面后立即书面确认。' },
      { Icon: Scale,     title: '面向外国买家的法律咨询',
        body: '与专精印尼非居民交易的独立律师进行60–90分钟咨询。依您的情况量身定制：租赁产权与PT PMA、您所在国（美国/英国/欧盟/澳洲）的税务影响、KITAS及投资签证路径、风险通常藏身其中的SPA条款。' },
      { Icon: MapPin,    title: '岛上投资区域概览',
        body: '半天车程走访契合您策略的2–3个区域——Canggu（Berawa、Pererenan、Batu Bolong）、Bukit（Uluwatu、Bingin、Pandawa）、Ubud、Sanur。哪里价格上涨、哪里持平、各区典型租客是谁、哪里在3–5年退出时转售流动性最佳。' },
    ],

    h2Programs: '考察形式',
    programs: [
      {
        name: 'Express',
        duration: '2天',
        line: '3–5个项目 · 1个区域',
        body: '适合已在网站上选出2–3处房源、需要亲自查看并作决定的买家。仅含看房和基本的卖方会面——无法律环节、无区域走访。',
        bestFor: '买家已准备成交，在2–3个最终选项中抉择',
      },
      {
        name: 'Standard',
        duration: '3–4天',
        line: '5–8个项目 · 律师 · 2个区域',
        body: '完整的实地尽职调查：项目查看、开发商团队会面、与独立律师就税务和交易结构相处一小时、走访两个相关区域。默认档位——我们大多数交易都在此形式下成交。',
        bestFor: '30–80万美元的认真购买，含法律核验并比较备选',
        highlight: true,
      },
      {
        name: 'Premium',
        duration: '5–7天',
        line: '10+个项目 · PPAT公证人 · 所有区域',
        body: '面向大额投资者的扩展行程：额外区域和项目、与PPAT公证人会面、若您计划KITAS则协助PT PMA注册、为家人安排并行的游览和保姆服务、与顶级开发商创始人共进晚餐。',
        bestFor: '预算100万美元以上、多处房产组合或全家搬迁至巴厘岛',
      },
    ],
    programBestFor: '适合',
    programBook: '预订此形式',

    h2Faq: '关于巴厘岛投资考察的常见问题',
    faq: [
      { q: '参加投资考察要多少钱？',
        a: '取决于形式和季节。面向预算已确认的认真买家的Standard和Premium——通常为$0，我们从成交后的开发商佣金中承担物流。面向冷线索的Express——$300–500作为保证金，购买时抵扣经纪费。含保姆和扩展行程的高端家庭套餐——5天起$1500。最终价格将在30分钟通话后确定。' },
      { q: '来考察需要印尼签证吗？',
        a: '美国、加拿大、英国、申根、澳大利亚和新西兰护照，30天旅游VOA即可——在登巴萨机场落地办理$35或提前通过E-VOA Indonesia在线办理。无需接待方邀请函。若计划停留超过30天，可在巴厘岛移民局再延长30天。' },
      { q: '可以带配偶、伴侣或家人吗？',
        a: '可以，我们超过60%的考察是情侣或家庭出行。行程会相应调整：为不参加会面者安排并行活动（Ubud游览、海滩俱乐部、烹饪课），或看房期间为孩子提供保姆服务。请提前告知来的人数和孩子年龄——我们会安排最合适的行程。' },
      { q: '如果考察中没有一处房源合适怎么办？',
        a: '约25%的访客会遇到这种情况，而这本身就是有用的结果——花4天弄清巴厘岛或某些项目不是您的方案，好过盲目成交、一年后后悔。没有任何购买压力：我们只在成交时才有收入，且仅当房产真正适合买家时——否则会招致投诉，这是我们不需要的。' },
      { q: '一年中什么时候来最好？',
        a: '看房最佳月份是4–6月和9–11月：Canggu和Bukit交通更顺畅、天气温和、更易约到开发商团队。12–3月是旅游旺季——您能像租客一样观察别墅的真实入住率，但交通和酒店价格高出1.5–2倍。7–8月是欧洲学校假期高峰，情况类似。' },
      { q: '应提前多久预订？',
        a: 'Express和Standard通常提前2–4周即可。Premium最好提前4–6周——我们需要锁定PPAT公证人档期、讲英语的律师以及顶级开发商创始人的日程，这些都很紧张。旺季周（12–3月）：提前6–8周预订。' },
      { q: '可以在考察期间签署SPA并购买吗？',
        a: '常常正是如此。预订表在看房当天的开发商会面上签署；预留押金（$2–10k）在1–2个工作日内汇入公证人托管账户。SPA本身在预订后2–4周、尽职调查完成后于PPAT公证人处签署——您无需为此返回，文件通过授权委托远程办理。' },
      { q: '如果考察后需要再考虑怎么办？',
        a: '大多数客户都这样——他们来"看看再想想"，回国后1–3个月才决定。我们会交付完整资料：与开发商会面的录音、律师笔记、每次看房的照片、Balinsky巴厘岛团队的直接联系方式。在家从容比较，有新问题随时联系。若日后决定购买，我们会通过可信公证人远程完成交易。' },
      { q: '来考察的最低预算多少才有意义？',
        a: 'Sanur的公寓或Ubud的期房$200k起，Bukit或Canggu的别墅$300k起。低于此选择大幅收窄，考察可能得不偿失。若您预算$150k、考虑先在巴厘岛租住并打算一两年后购买——请告诉我们，有时形式会改为无需出行的咨询。' },
      { q: '你们如何挑选展示的房源？',
        a: '您先填写简短问卷：预算、目标（租金收入/生活方式/转售）、偏好区域、卧室数、是否愿意考虑期房项目。我们从数据库中700+别墅和700+公寓里挑出8–15个候选，抵达前与您敲定清单，考察时展示5–10个入围者外加2–3个可能令您惊喜的"额外"备选。' },
    ],

    bookCardHeading: '准备好来巴厘岛',
    bookCardText: '给机器人发一条简短消息：预算、大致日期、购买目的（租金收入/生活方式/搬迁/转售）。我们会选定考察形式并在24小时内发送报价，无任何义务。',
    bookCardCta: '联系团队',

    perksLabel: '包含',
  },
  nl: {
    home: 'Home',
    crumb: 'Investeringstour',
    h1: 'Vastgoedinvesteringstour op Bali — bezichtigingen ter plaatse en due diligence',
    intro: 'Een programma van 2–7 dagen ter plaatse voor buitenlandse investeerders die een villa of appartement op Bali kopen. U bezichtigt zelf 5–10 objecten van uw shortlist, spreekt met de teams van ontwikkelaars, brengt een uur door met een advocaat gespecialiseerd in transacties voor buitenlanders, en verkent de relevante regio\'s van het eiland — Canggu, Bukit, Ubud, Sanur. Logistiek, vertaling, onderhandeling en planning worden verzorgd door het Balinsky-team ter plaatse.',
    bookCta: 'Boek een tour',
    contactCta: 'Stel een vraag',

    h2Why: 'Waarom een bezoek ter plaatse belangrijk is voordat je vastgoed op Bali koopt',
    why: [
      { Icon: Sparkles, title: 'Bouwkwaliteit is alleen ter plaatse zichtbaar',
        body: 'Dronebeelden en pdf-presentaties tonen een geïdealiseerd beeld. De eerste 15 minuten op een bouwplaats beantwoorden 80% van de vragen die foto\'s niet oplossen: werkelijke afwerkingskwaliteit, omgevingsgeluid, echte loopafstand tot het strand, richting van de ramen, hoe dichtbij de volgende bouwplaats is, of de afwatering opgelost is.' },
      { Icon: Users,    title: 'Directe lijn met het projectteam',
        body: 'Geen verkoper met ingestudeerde antwoorden — de echte oprichter of commercieel directeur aan dezelfde tafel. U kunt vragen naar vertragingen van eerdere fasen, de echte bezetting van opgeleverde units, uitstapclausules bij late oplevering, garanties op teruggave van de aanbetaling, en elke vraag die nooit in een presentatie belandt.' },
      { Icon: Star,     title: 'Commerciële voorwaarden alleen voor tour-deelnemers',
        body: 'Verscheidene ontwikkelaars bieden programmagasten eigen voorwaarden: ofwel 3–7% korting op de openbare prijs, ofwel een soepeler betalingsplan, ofwel tour-exclusieve units op betere posities. Niet bij elk project, maar gemiddeld dekt het de kosten van de reis zelf.' },
    ],

    h2Includes: 'Wat is inbegrepen in de investeringstour',
    includes: [
      { Icon: Plane,     title: 'Ophalen op de luchthaven van Denpasar en briefing',
        body: 'We halen u op bij Ngurah Rai, brengen u naar het hotel en houden een briefing van 30 minuten: welke projecten u al op de site zag, wat nieuw is sinds uw shortlist, welke regio\'s we bezoeken, het schema van ontwikkelaar- en advocaatafspraken, wat u moet meenemen naar bezichtigingen.' },
      { Icon: Car,       title: 'Comfortklasse-vervoer gedurende het hele programma',
        body: 'Comfortklasse-auto met chauffeur voor het hele programma — tussen locaties, naar afspraken, \'s avonds terug naar het hotel. De route wordt gepland rond de verkeerspatronen van Canggu en Bukit en de werkelijke nabijheid van projecten, zodat u niet elke rit 90 minuten verliest.' },
      { Icon: Building2, title: 'Bezichtiging ter plaatse van 5–10 projecten',
        body: 'Villa\'s, appartementen, wooncomplexen — formats afgestemd op uw budget en doel (huurinkomen / lifestyle / doorverkoop). Op elke locatie leidt een Balinsky-makelaar u langs de units in aanbouw of de modelwoning, de historie van de ontwikkelaar, de grondpapieren, de omgeving en het huurdersprofiel van de regio.' },
      { Icon: Users,     title: 'Een-op-een-gesprekken met ontwikkelaars',
        body: 'Voor 2–4 van de projecten die u het meest veelbelovend vindt — een privégesprek met de oprichter of verkoopdirecteur, elk een uur. We bespreken opleveringstermijnen en actuele vertraging, betaalmomenten, teruggavegaranties, uitstapclausules en beheervoorwaarden na oplevering. Afspraken worden direct na elk gesprek schriftelijk bevestigd.' },
      { Icon: Scale,     title: 'Juridisch advies voor buitenlandse kopers',
        body: '60–90 minuten met een onafhankelijke advocaat gespecialiseerd in transacties van niet-ingezetenen in Indonesië. Afgestemd op uw profiel: leasehold vs. PT PMA, fiscale gevolgen in uw thuisland (US/UK/EU/AU), KITAS en de route van het investeerdersvisum, de SPA-clausules waar het risico zich meestal verstopt.' },
      { Icon: MapPin,    title: 'Overzicht van de investeringsregio\'s',
        body: 'Een rit van een halve dag door 2–3 regio\'s die bij uw strategie passen — Canggu (Berawa, Pererenan, Batu Bolong), Bukit (Uluwatu, Bingin, Pandawa), Ubud, Sanur. Waar de prijzen stijgen, waar ze vlak zijn, wie de typische huurder is, waar de doorverkoopliquiditeit het best is voor een exit over 3–5 jaar.' },
    ],

    h2Programs: 'Tour-formats',
    programs: [
      {
        name: 'Express',
        duration: '2 dagen',
        line: '3–5 projecten · 1 regio',
        body: 'Voor kopers die al 2–3 objecten op de site hebben geshortlist en ze persoonlijk moeten zien om te beslissen. Alleen bezichtigingen en een basaal verkopersgesprek — geen juridisch blok, geen regiorit.',
        bestFor: 'Koper klaar om te sluiten, kiezend tussen 2–3 finale opties',
      },
      {
        name: 'Standard',
        duration: '3–4 dagen',
        line: '5–8 projecten · advocaat · 2 regio\'s',
        body: 'Volledige due diligence ter plaatse: projectbezoeken, gesprekken met ontwikkelaarteams, een uur met de onafhankelijke advocaat over belasting en dealstructuur, rit door twee relevante regio\'s. Het standaardniveau — de meeste van onze deals worden op dit format gesloten.',
        bestFor: 'Serieuze aankoop van $300–800k met juridische validatie en vergelijking van alternatieven',
        highlight: true,
      },
      {
        name: 'Premium',
        duration: '5–7 dagen',
        line: '10+ projecten · PPAT-notaris · alle regio\'s',
        body: 'Uitgebreid programma voor grotere investeerders: extra regio\'s en projecten, een gesprek met de PPAT-notaris, hulp bij PT PMA-registratie als u een KITAS plant, parallelle excursies en oppasservice voor het gezin, diners met de oprichters van topontwikkelaars.',
        bestFor: 'Budget $1M+, portefeuille van meerdere objecten of gezinsverhuizing naar Bali',
      },
    ],
    programBestFor: 'Ideaal voor',
    programBook: 'Boek dit format',

    h2Faq: 'Veelgestelde vragen over de Bali-investeringstour',
    faq: [
      { q: 'Hoeveel kost deelname aan de tour?',
        a: 'Afhankelijk van format en seizoen. Standard en Premium voor serieuze kopers met bevestigd budget — meestal $0, wij dekken de logistiek uit de ontwikkelaarcommissie na sluiting. Express voor koude leads — $300–500 als borg die bij aankoop op de makelaarskosten wordt verrekend. Het premium gezinspakket met oppas en uitgebreid programma — vanaf $1500 voor 5 dagen. Definitieve prijs na een gesprek van 30 minuten.' },
      { q: 'Heb ik een visum voor Indonesië nodig?',
        a: 'Voor paspoorten uit de VS, Canada, VK, Schengen, Australië en Nieuw-Zeeland volstaat een 30-daagse toeristen-VOA — bij aankomst op de luchthaven van Denpasar voor $35 of vooraf via E-VOA Indonesia. Geen uitnodiging van een gastheer nodig. Wilt u langer dan 30 dagen blijven, dan kunt u met nog 30 dagen verlengen bij het immigratiekantoor op Bali.' },
      { q: 'Mag ik met partner of gezin komen?',
        a: 'Ja — meer dan 60% van onze tours verloopt als koppels of gezinnen. Het programma past zich aan: parallelle tracks voor wie niet bij afspraken is (Ubud-excursie, beach club, kookles), of oppasservice voor kinderen tijdens bezichtigingen. Laat ons vooraf weten hoeveel personen komen en de leeftijd van de kinderen — we stellen het juiste schema samen.' },
      { q: 'Wat als geen object op de tour past?',
        a: 'Dat gebeurt bij ongeveer 25% van de bezoekers en is zelf een nuttig resultaat — beter 4 dagen besteden en beseffen dat Bali of bepaalde projecten niet uw scenario zijn dan blind te sluiten en een jaar later spijt te hebben. Er is geen koopdruk: wij verdienen alleen aan gesloten deals, en alleen als het object echt bij de koper past — anders krijgen we een klacht, en die hebben we niet nodig.' },
      { q: 'Wanneer is de beste tijd van het jaar om te komen?',
        a: 'De beste maanden voor bezichtigingen zijn april–juni en september–november: lichter verkeer in Canggu en Bukit, mild weer, makkelijker afspraken met ontwikkelaarteams vast te leggen. December–maart is het toeristische hoogseizoen — u kunt de echte villabezetting zien zoals een huurder, maar verkeer en hotelprijzen zijn 1,5–2× hoger. Juli–augustus is de piek van de Europese schoolvakanties, vergelijkbaar verhaal.' },
      { q: 'Hoe ver van tevoren moet ik boeken?',
        a: '2–4 weken is normaal genoeg voor Express en Standard. Voor Premium plant u 4–6 weken vooruit — we moeten de PPAT-notarisslot, een Engelssprekende advocaat en de agenda\'s van topontwikkelaar-oprichters vastleggen, die vol raken. Piekweken (december–maart): 6–8 weken vooruit boeken.' },
      { q: 'Kan ik het SPA tekenen en tijdens de tour kopen?',
        a: 'Vaak is dat precies wat er gebeurt. Het reserveringsformulier wordt getekend op het ontwikkelaargesprek op de bezichtigingsdag; de aanbetaling ($2–10k) gaat binnen 1–2 werkdagen naar de escrow van de notaris. Het SPA zelf wordt bij de PPAT-notaris 2–4 weken na de reservering getekend, nadat de due diligence is afgerond — u hoeft er niet voor terug te komen, de papieren worden op afstand via volmacht afgehandeld.' },
      { q: 'Wat als ik na de tour moet nadenken?',
        a: 'De meeste klanten doen het zo — ze komen om "te kijken en na te denken" en beslissen 1–3 maanden na terugkomst. We overhandigen een volledig pakket: opnames van de ontwikkelaargesprekken, notities van de advocaat, foto\'s van elke bezichtiging, directe contacten van het Balinsky-team op Bali. Vergelijk rustig thuis, schrijf terug als er nieuwe vragen opkomen. Besluit u later te kopen, dan sluiten we de deal op afstand via een vertrouwde notaris.' },
      { q: 'Wat is het minimumbudget waarbij de tour zinvol is?',
        a: 'Vanaf $200k voor appartementen in Sanur of off-plan in Ubud, vanaf $300k voor een villa op Bukit of in Canggu. Daaronder versmalt de keuze sterk en kan de tour een onevenredige inspanning worden. Is uw budget $150k en overweegt u eerst op Bali te huren met het oog op kopen over een jaar of twee — laat het ons weten, soms wordt het format een consultatie zonder de reis.' },
      { q: 'Hoe kiest u de te tonen objecten?',
        a: 'U begint met een korte briefing: budget, doel (huurinkomen / lifestyle / doorverkoop), voorkeursregio, slaapkamers, bereidheid een off-plan-project te overwegen. Uit 700+ villa\'s en 700+ appartementen in onze database kiezen we 8–15 kandidaten, stemmen de shortlist vóór aankomst met u af, en op de tour tonen we 5–10 finalisten plus 2–3 "bonus"-alternatieven die u kunnen verrassen.' },
    ],

    bookCardHeading: 'Klaar om naar Bali te komen',
    bookCardText: 'Stuur de bot een kort bericht: budget, streefdatum, doel (huurinkomen / lifestyle / verhuizing / doorverkoop). We kiezen het format en offreren binnen 24 uur, zonder verplichting.',
    bookCardCta: 'Praat met het team',

    perksLabel: 'Inbegrepen',
  },
  ban: {
    home: 'Beranda',
    crumb: 'Tur investasi',
    h1: 'Tur investasi properti Bali — ningalin langsung lan uji tuntas ring genah',
    intro: 'Program ring genah 2–7 rahina anggen investor jaba sane numbas vila utawi apartemen ring Bali. Ragane mariksa padidi 5–10 listing saking daftar cutet Ragane, matemu sareng tim pangwangun, ngentosang aukud jam sareng pengacara spesialis transaksi anak jaba, lan macecingak ring wewidangan penting ring pulo — Canggu, Bukit, Ubud, Sanur. Logistik, penerjemahan, negosiasi, lan penjadwalan katangani olih tim Balinsky ring genah.',
    bookCta: 'Mesen tur',
    contactCta: 'Ngajuang patakon',

    h2Why: 'Ngudiang macecingak langsung penting sadurung numbas properti ring Bali',
    why: [
      { Icon: Sparkles, title: 'Kualitas wangunan wantah kacingak ring genah',
        body: 'Video drone lan dek PDF nyinahang gambaran ideal. 15 menit kapertama ring genah konstruksi nyawis 80% patakon sane nenten prasida kajawab olih foto: kualitas finishing sujati, uyut sekitar, doh majalan nyata ka pasih, arah adep jendela, sapunapi nampek genah salanturnyane, punapi drainase sampun beres.' },
      { Icon: Users,    title: 'Kontak langsung sareng tim proyek',
        body: 'Boya tenaga adol sareng pasaur apal — nanging founder utawi direktur komersial sujati ring meja sane pateh. Ragane prasida mataken indik keterlambatan fase sadurunge, okupansi nyata unit sane sampun puput, klausul jalan pesu yening telat, jaminan pangwalian deposit, lan patakon napija sane nenten naenin ngranjing dek presentasi.' },
      { Icon: Star,     title: 'Kondisi komersial khusus peserta tur',
        body: 'Makudang pangwangun ngicen syarat khusus anggen tamu program: diskon 3–7% saking aji terbuka, rencana pambayaran sane lebih lentur, utawi unit khusus tur sareng posisi sane becikan. Nenten ring nyabran proyek, nanging rata-rata nutup prabéya pamargin punika padidi.' },
    ],

    h2Includes: 'Sane ngranjing ring tur investasi',
    includes: [
      { Icon: Plane,     title: 'Ngajemput ring bandara Denpasar lan briefing',
        body: 'Tiang ngajemput Ragane ring Ngurah Rai, ngatehang ka hotel, lan ngamargiang briefing 30 menit: proyek sane sampun kacingak ring situs, napi sane anyar ngawit daftar cutet Ragane, wewidangan sane jagi kacingak, jadwal patemon sareng pangwangun lan pengacara, napi sane patut kabakta rikala ningalin.' },
      { Icon: Car,       title: 'Transportasi kelas comfort sepanjang program',
        body: 'Montor kelas comfort sareng sopir sepanjang program — antar genah, ka patemon, mawali ka hotel ring wengi. Rute karencanayang manut pola macet Canggu lan Bukit miwah nampek nyata antar proyek, mangda Ragane nenten kelangan 90 menit ring nyabran paindahan.' },
      { Icon: Building2, title: 'Ningalin langsung 5–10 proyek',
        body: 'Vila, apartemen, kompleks hunian — format manut anggaran lan tetujon Ragane (pikolih sewa / gaya urip / kaadol malih). Ring nyabran genah, broker Balinsky nuntun Ragane ningalin unit sane kantun kawangun utawi unit conto, riwayat pangwangun, dokumen tanah, palemahan sekitar, lan profil sang nyewa wewidangan.' },
      { Icon: Users,     title: 'Patemon papat mata sareng pangwangun',
        body: 'Anggen 2–4 proyek sane pinih menarik pabuat Ragane — patemon pribadi sareng founder utawi direktur adol, suang-suang aukud jam. Tiang ngraosang jadwal puput lan keterlambatan mangkin, tahapan pambayaran, jaminan pangwalian, klausul jalan pesu, lan syarat pangelola sasampun serah terima. Kasepakatan kakonfirmasi tertulis digelis sasampun nyabran patemon.' },
      { Icon: Scale,     title: 'Konsultasi hukum anggen sang numbas jaba',
        body: '60–90 menit sareng pengacara independen spesialis transaksi non-residen ring Indonesia. Kasesuaiang sareng profil Ragane: leasehold vs PT PMA, konsekuensi pajak ring gumi asal Ragane (AS/Inggris/UE/Australia), KITAS lan margi visa investor, klausul SPA genah risiko biasa mengkeb.' },
      { Icon: MapPin,    title: 'Tinjauan wewidangan investasi pulo',
        body: 'Pamargin tengah rahina nglintangin 2–3 wewidangan sane cocok sareng strategi Ragane — Canggu (Berawa, Pererenan, Batu Bolong), Bukit (Uluwatu, Bingin, Pandawa), Ubud, Sanur. Ring dija aji menek, ring dija datar, sira sang nyewa tipikal, ring dija likuiditas adol malih pinih becik anggen pesu 3–5 warsa.' },
    ],

    h2Programs: 'Format tur',
    programs: [
      {
        name: 'Express',
        duration: '2 rahina',
        line: '3–5 proyek · 1 wewidangan',
        body: 'Anggen sang numbas sane sampun ngranjing 2–3 listing ka daftar cutet ring situs lan perlu ningalin langsung raris mutusang. Wantah ningalin lan patemon dasar sareng sang adol — tanpa blok hukum, tanpa macecingak wewidangan.',
        bestFor: 'Sang numbas siap muputang, milih ring pantaraning 2–3 pilihan pamuput',
      },
      {
        name: 'Standard',
        duration: '3–4 rahina',
        line: '5–8 proyek · pengacara · 2 wewidangan',
        body: 'Uji tuntas jangkep ring genah: ningalin proyek, patemon tim pangwangun, aukud jam sareng pengacara independen indik pajak lan struktur transaksi, macecingak kalih wewidangan relevan. Tingkat default — akéhan transaksi tiang kaputus nganggen format puniki.',
        bestFor: 'Panumbasan serius $300–800k sareng validasi hukum lan pambandingan alternatif',
        highlight: true,
      },
      {
        name: 'Premium',
        duration: '5–7 rahina',
        line: '10+ proyek · notaris PPAT · sami wewidangan',
        body: 'Program kaperluas anggen investor ageng: wewidangan lan proyek tambahan, patemon sareng notaris PPAT, wantuan pendaftaran PT PMA yening Ragane ngrencanayang KITAS, tamasya paralel lan layanan pangempu anggen kulawarga, madaar wengi sareng founder pangwangun papan duur.',
        bestFor: 'Anggaran $1M+, portofolio makudang properti utawi relokasi kulawarga ka Bali',
      },
    ],
    programBestFor: 'Cocok anggen',
    programBook: 'Mesen format puniki',

    h2Faq: 'Patakon umum indik tur investasi Bali',
    faq: [
      { q: 'Sapunapi prabéya tur?',
        a: 'Gumantung format lan musim. Standard lan Premium anggen sang numbas serius sareng anggaran sampun kakonfirmasi — biasane $0, tiang nanggung logistik saking komisi pangwangun sasampun transaksi kaputus. Express anggen lead dingin — $300–500 dados deposit keamanan sane kaitung ka prabéya broker rikala numbas. Paket kulawarga premium sareng pangempu lan program kaperluas — ngawit $1500 anggen 5 rahina. Aji pamuput kasampaiang sasampun telepon 30 menit.' },
      { q: 'Punapi tiang perlu visa anggen Indonesia?',
        a: 'Anggen paspor AS, Kanada, Inggris, Schengen, Australia, lan Selandia Anyar, VOA turis 30 rahina sampun cukup — katerbitang rikala rauh ring bandara Denpasar aji $35 utawi sadurunge lewat E-VOA Indonesia. Nenten kaperluang undangan saking sang nampi. Yening meled magenah lebih saking 30 rahina, Ragane prasida nglanturang malih 30 rahina ring kantor imigrasi Bali.' },
      { q: 'Punapi tiang prasida ngajak kurenan utawi kulawarga?',
        a: 'Dados — lebih saking 60% tur tiang mamargi dados pasangan utawi kulawarga. Program nyesuaiang: jalur paralel anggen sang sane nenten sareng patemon (tamasya Ubud, beach club, kelas ngwangun ajengan), utawi layanan pangempu anggen alit-alit rikala ningalin. Uningayang ring tiang saking ngawit sapunapi akéh sane rauh lan yusa alit-alit — tiang jagi nyusun jadwal sane patut.' },
      { q: 'Sapunapi yening nenten wenten listing ring tur sane cocok?',
        a: 'Punika mamargi ring sawatara 25% sang macecingak lan mula asil sane maguna — becikan ngentosang 4 rahina lan uning Bali utawi proyek tertentu boya skenario Ragane tinimbang muputang buta raris nyeselin awarsa salanturnyane. Nenten wenten tekanan numbas: tiang wantah polih saking transaksi sane kaputus, lan wantah yening objekne sujati cocok pabuat sang numbas — yening nenten, tiang nampi keluhan, sane tan tiang kaperluang.' },
      { q: 'Pidan galah pinih becik ring awarsa anggen rauh?',
        a: 'Bulan pinih becik anggen ningalin inggih punika April–Juni lan September–November: lalu lintas Canggu lan Bukit lebih lengang, cuaca sejuk, lebih dangan ngunci patemon tim pangwangun. Desember–Maret musim wisata ramé — Ragane prasida ningalin okupansi vila nyata sakadi sang nyewa, nanging lalu lintas lan tarif hotel 1,5–2× tegehan. Juli–Agustus puncak libur sekolah Eropa, cerita pateh.' },
      { q: 'Sapunapi doh sadurunge tiang patut mesen?',
        a: '2–4 minggu biasane cukup anggen format Express lan Standard. Anggen Premium, rencanayang 4–6 minggu sadurunge — tiang perlu ngunci slot notaris PPAT, pengacara mabasa Inggris, lan jadwal founder pangwangun papan duur, sane gelis bek. Minggu puncak (Desember–Maret): mesen 6–8 minggu sadurunge.' },
      { q: 'Punapi tiang prasida nandatangani SPA lan numbas rikala tur?',
        a: 'Sering pisan sujatine kadi asapunika. Formulir reservasi katandatangani ring patemon pangwangun ring rahina ningalin; deposit panahan ($2–10k) katransfer ka rekening escrow notaris ring 1–2 rahina makarya. SPA-ne padidi katandatangani ring notaris PPAT 2–4 minggu sasampun reservasi, sasampun uji tuntas puput — Ragane nenten perlu mawali, dokumen kaurus saking doh lewat surat kuasa.' },
      { q: 'Sapunapi yening tiang perlu mineh-minehin sasampun tur?',
        a: 'Akéhan klien ngamargiang kadi asapunika — ipun rauh "ningalin lan mineh-minehin" raris mutusang 1–3 bulan sasampun budal. Tiang nyerahang paket jangkep: rekaman patemon sareng pangwangun, catetan pengacara, foto saking nyabran ningalin, kontak langsung tim Balinsky ring Bali. Bandingang anteng ring jero, kirim malih yening wenten patakon anyar. Yening salanturnyane Ragane mutusang numbas, tiang muputang transaksi saking doh lewat notaris kapercaya.' },
      { q: 'Sapunapi anggaran minimum mangda tur maguna?',
        a: 'Ngawit $200k anggen apartemen ring Sanur utawi off-plan ring Ubud, ngawit $300k anggen vila ring Bukit utawi Canggu. Ring sor punika pilihan nyupitang pisan lan tur prasida dados upaya sane tan saimbang. Yening anggaran Ragane $150k lan Ragane mineh-minehin nyewa dumun ring Bali sareng tetujon numbas ring awarsa-kalih warsa — uningayang ring tiang, sané-sané formatne magentos dados konsultasi tanpa pamargin.' },
      { q: 'Sapunapi Ragane milih listing sane kacingak?',
        a: 'Ragane ngawitin sareng brief cutet: anggaran, tetujon (pikolih sewa / gaya urip / kaadol malih), wewidangan sane kaseneng, kamar sirep, kayun mineh-minehin proyek off-plan. Saking 700+ vila lan 700+ apartemen ring basis data tiang, tiang milih 8–15 kandidat, nyepakat daftar cutet sareng Ragane sadurung rauh, lan ring tur nyinahang 5–10 finalis miwah 2–3 alternatif "bonus" sane prasida ngangobin Ragane.' },
    ],

    bookCardHeading: 'Siap rauh ka Bali',
    bookCardText: 'Kirim pesan cutet ka bot: anggaran, perkiraan tanggal, tetujon (pikolih sewa / gaya urip / relokasi / kaadol malih). Tiang jagi milih format lan ngirim penawaran ring 24 jam, tanpa komitmen.',
    bookCardCta: 'Mabaos sareng tim',

    perksLabel: 'Kalebet',
  },
  pl: {
    home: 'Strona główna',
    crumb: 'Tura inwestycyjna',
    h1: 'Tura inwestycyjna po nieruchomościach Bali — oględziny na miejscu i due diligence',
    intro: 'Program na miejscu, 2–7 dni, dla zagranicznych inwestorów kupujących willę lub apartament na Bali. Osobiście oglądasz 5–10 ofert z twojej listy życzeń, spotykasz się z zespołami deweloperów, spędzasz godzinę z prawnikiem specjalizującym się w transakcjach obcokrajowców i objeżdżasz odpowiednie regiony wyspy — Canggu, Bukit, Ubud, Sanur. Logistyką, tłumaczeniem, negocjacjami i harmonogramem zajmuje się zespół Balinsky na miejscu.',
    bookCta: 'Zarezerwuj turę',
    contactCta: 'Zadaj pytanie',

    h2Why: 'Dlaczego wizyta na miejscu ma znaczenie przed zakupem nieruchomości na Bali',
    why: [
      { Icon: Sparkles, title: 'Jakość budowy widać tylko na miejscu',
        body: 'Nagrania z drona i prezentacje PDF pokazują wyidealizowany obraz. Pierwsze 15 minut na placu budowy odpowiada na 80% pytań, których zdjęcia nie zamkną: rzeczywista jakość wykończenia, hałas otoczenia, realna odległość spacerem do plaży, w którą stronę wychodzą okna, jak blisko jest kolejny plac budowy, czy rozwiązano odwodnienie.' },
      { Icon: Users,    title: 'Bezpośredni kontakt z zespołem projektu',
        body: 'Nie przedstawiciel handlowy z wyuczonymi odpowiedziami — sam założyciel lub dyrektor handlowy przy tym samym stole. Możesz zapytać o opóźnienia poprzedniej fazy, realne obłożenie oddanych jednostek, klauzule wyjścia przy spóźnionej dostawie, gwarancje zwrotu depozytu i o każde pytanie, które nigdy nie trafia do prezentacji.' },
      { Icon: Star,     title: 'Warunki handlowe tylko dla uczestników tury',
        body: 'Kilku deweloperów oferuje dedykowane warunki gościom programu: albo 3–7% rabatu od ceny otwartej, albo łagodniejszy plan płatności, albo jednostki tylko dla tury w lepszych lokalizacjach. Nie w każdym projekcie, ale średnio pokrywa to koszt samego wyjazdu.' },
    ],

    h2Includes: 'Co zawiera tura inwestycyjna',
    includes: [
      { Icon: Plane,     title: 'Odbiór z lotniska Denpasar i briefing',
        body: 'Odbieramy cię na Ngurah Rai, zawozimy do hotelu, przeprowadzamy 30-minutowy briefing: które projekty widziałeś już na stronie, co nowego od czasu twojej listy życzeń, które regiony objedziemy, harmonogram spotkań z deweloperami i prawnikiem, co zabrać na oględziny.' },
      { Icon: Car,       title: 'Transport klasy comfort przez cały czas',
        body: 'Samochód klasy comfort z kierowcą przez cały program — między obiektami, na spotkania, wieczorem z powrotem do hotelu. Trasa planowana wokół korków w Canggu i Bukit oraz rzeczywistej bliskości projektów, żebyś nie tracił 90 minut na każdym przejeździe.' },
      { Icon: Building2, title: 'Oględziny 5–10 projektów na miejscu',
        body: 'Wille, apartamenty, kompleksy mieszkaniowe — formaty dobrane do twojego budżetu i celu (dochód z najmu / styl życia / odsprzedaż). Na każdym obiekcie broker Balinsky oprowadza cię po budowanych jednostkach lub jednostce wzorcowej, przedstawia historię dewelopera, dokumenty gruntu, otoczenie i profil najemcy regionu.' },
      { Icon: Users,     title: 'Spotkania jeden na jeden z deweloperami',
        body: 'Dla 2–4 projektów, które uznasz za najbardziej obiecujące — prywatne spotkanie z założycielem lub dyrektorem sprzedaży, po godzinie każde. Omawiamy terminy ukończenia i bieżące poślizgi, kamienie milowe płatności, gwarancje zwrotu, klauzule wyjścia i warunki zarządzania po przekazaniu. Ustalenia są potwierdzane na piśmie zaraz po każdym spotkaniu.' },
      { Icon: Scale,     title: 'Konsultacja prawna dla nabywców zagranicznych',
        body: '60–90 minut z niezależnym prawnikiem specjalizującym się w transakcjach nierezydentów w Indonezji. Dopasowana do twojego profilu: leasehold vs PT PMA, konsekwencje podatkowe w twoim kraju (US/UK/EU/AU), KITAS i ścieżka wizy inwestorskiej, klauzule SPA, w których zwykle kryje się ryzyko.' },
      { Icon: MapPin,    title: 'Przegląd regionów inwestycyjnych',
        body: 'Półdniowy przejazd przez 2–3 regiony pasujące do twojej strategii — Canggu (Berawa, Pererenan, Batu Bolong), Bukit (Uluwatu, Bingin, Pandawa), Ubud, Sanur. Gdzie ceny rosną, gdzie stoją w miejscu, kto jest typowym najemcą w każdym, gdzie płynność odsprzedaży jest najlepsza dla wyjścia w 3–5 lat.' },
    ],

    h2Programs: 'Formaty tury',
    programs: [
      {
        name: 'Express',
        duration: '2 dni',
        line: '3–5 projektów · 1 region',
        body: 'Dla kupujących, którzy już wybrali 2–3 oferty na stronie i muszą zobaczyć je osobiście oraz zdecydować. Tylko oględziny i podstawowe spotkanie ze sprzedającym — bez bloku prawnego, bez przejazdu po regionach.',
        bestFor: 'Kupujący gotowy do zamknięcia, wybierający między 2–3 finałowymi opcjami',
      },
      {
        name: 'Standard',
        duration: '3–4 dni',
        line: '5–8 projektów · prawnik · 2 regiony',
        body: 'Pełne due diligence na miejscu: wizyty w projektach, spotkania z zespołami deweloperów, godzina z niezależnym prawnikiem o podatkach i strukturze transakcji, przejazd przez dwa istotne regiony. Poziom domyślny — większość naszych transakcji zamyka się w tym formacie.',
        bestFor: 'Poważny zakup za 300–800 tys. $ z walidacją prawną i porównaniem alternatyw',
        highlight: true,
      },
      {
        name: 'Premium',
        duration: '5–7 dni',
        line: '10+ projektów · notariusz PPAT · wszystkie regiony',
        body: 'Rozszerzony program dla większych inwestorów: dodatkowe regiony i projekty, spotkanie z notariuszem PPAT, pomoc w rejestracji PT PMA, jeśli planujesz KITAS, równoległe wycieczki i opieka niani dla rodziny, kolacje z założycielami czołowych deweloperów.',
        bestFor: 'Budżet 1 mln $+, portfel wielu nieruchomości lub relokacja rodziny na Bali',
      },
    ],
    programBestFor: 'Najlepszy dla',
    programBook: 'Zarezerwuj ten format',

    h2Faq: 'Najczęstsze pytania o turę inwestycyjną po Bali',
    faq: [
      { q: 'Ile kosztuje tura?',
        a: 'Zależy od formatu i sezonu. Standard i Premium dla poważnych kupujących z potwierdzonym budżetem — zwykle 0 $, logistykę pokrywamy z prowizji dewelopera po zamknięciu transakcji. Express dla zimnych leadów — 300–500 $ jako kaucja zaliczana na poczet opłaty brokerskiej przy zakupie. Premium pakiet rodzinny z nianią i rozszerzonym programem — od 1500 $ za 5 dni. Ostateczna wycena po 30-minutowej rozmowie.' },
      { q: 'Czy potrzebuję wizy do Indonezji?',
        a: 'Dla paszportów USA, Kanady, UK, Schengen, Australii i Nowej Zelandii wystarczy 30-dniowa turystyczna VOA — wydawana po przylocie na lotnisku Denpasar za 35 $ lub z wyprzedzeniem przez E-VOA Indonesia. Zaproszenie od gospodarza nie jest wymagane. Jeśli chcesz zostać dłużej niż 30 dni, możesz przedłużyć o kolejne 30 w biurze imigracyjnym na Bali.' },
      { q: 'Czy mogę zabrać partnera lub rodzinę?',
        a: 'Tak — ponad 60% naszych tur odbywa się w parach lub rodzinach. Program się dostosowuje: równoległe ścieżki dla osób niebiorących udziału w spotkaniach (wycieczka do Ubud, beach club, kurs gotowania) lub opieka niani dla dzieci podczas oględzin. Powiedz nam z góry, ile osób przyjeżdża i w jakim wieku są dzieci — ułożymy odpowiedni harmonogram.' },
      { q: 'Co, jeśli żadna oferta na turze nie pasuje?',
        a: 'Zdarza się to około 25% odwiedzających i samo w sobie jest użytecznym wynikiem — lepiej spędzić 4 dni, uświadamiając sobie, że Bali lub konkretne projekty to nie twój scenariusz, niż zamknąć w ciemno i żałować rok później. Nie ma presji zakupu: zarabiamy tylko na zamkniętych transakcjach i tylko jeśli obiekt faktycznie pasuje kupującemu — inaczej dostajemy skargę, której nie potrzebujemy.' },
      { q: 'Kiedy jest najlepsza pora roku na przyjazd?',
        a: 'Najlepsze miesiące na oględziny to kwiecień–czerwiec i wrzesień–listopad: mniejszy ruch w Canggu i Bukit, łagodna pogoda, łatwiej umówić spotkania z zespołami deweloperów. Grudzień–marzec to wysoki sezon turystyczny — możesz obserwować realne obłożenie willi tak jak najemca, ale ruch i ceny hoteli są 1,5–2× wyższe. Lipiec–sierpień to szczyt europejskich wakacji szkolnych, podobna historia.' },
      { q: 'Z jakim wyprzedzeniem powinienem rezerwować?',
        a: '2–4 tygodnie zwykle wystarczą dla Express i Standard. Dla Premium planuj 4–6 tygodni wcześniej — musimy zarezerwować termin u notariusza PPAT, anglojęzycznego prawnika i harmonogramy założycieli czołowych deweloperów, które się zapełniają. Szczytowe tygodnie (grudzień–marzec): rezerwuj 6–8 tygodni wcześniej.' },
      { q: 'Czy mogę podpisać SPA i kupić podczas tury?',
        a: 'Często dokładnie tak się dzieje. Formularz rezerwacji podpisuje się na spotkaniu z deweloperem w dniu oględzin; zadatek (2–10 tys. $) trafia na escrow notariusza w ciągu 1–2 dni roboczych. Samo SPA podpisuje się u notariusza PPAT 2–4 tygodnie po rezerwacji, po zakończeniu due diligence — nie musisz po nie wracać, formalności załatwiane są zdalnie przez pełnomocnictwo.' },
      { q: 'Co, jeśli muszę się zastanowić po turze?',
        a: 'Większość klientów tak działa — przyjeżdżają „popatrzeć i pomyśleć” i decydują 1–3 miesiące po powrocie. Przekazujemy pełen pakiet: nagrania spotkań z deweloperami, notatki prawnika, zdjęcia z każdych oględzin, bezpośrednie kontakty zespołu Balinsky na Bali. Porównuj spokojnie w domu, odpisz, gdy pojawią się nowe pytania. Jeśli zdecydujesz się kupić później, zamkniemy transakcję zdalnie przez zaufanego notariusza.' },
      { q: 'Jaki jest minimalny budżet, żeby tura miała sens?',
        a: 'Od 200 tys. $ za apartamenty w Sanur lub off-plan w Ubud, od 300 tys. $ za willę na Bukit lub w Canggu. Poniżej tego wybór gwałtownie się zawęża, a tura może stać się nieproporcjonalnym wysiłkiem. Jeśli twój budżet to 150 tys. $ i rozważasz najpierw wynajem na Bali z myślą o zakupie za rok lub dwa — powiedz nam, czasem format staje się konsultacją bez wyjazdu.' },
      { q: 'Jak wybieracie oferty do pokazania?',
        a: 'Zaczynasz od krótkiego briefu: budżet, cel (dochód z najmu / styl życia / odsprzedaż), preferowany region, sypialnie, gotowość do rozważenia projektu off-plan. Z ponad 700 willi i ponad 700 apartamentów w naszej bazie wybieramy 8–15 kandydatów, uzgadniamy listę z tobą przed przyjazdem, a na turze pokazujemy 5–10 finalistów plus 2–3 „bonusowe” alternatywy, które mogą cię zaskoczyć.' },
    ],

    bookCardHeading: 'Gotowy przyjechać na Bali',
    bookCardText: 'Wyślij botowi krótką wiadomość: budżet, docelowe daty, cel (dochód z najmu / styl życia / relokacja / odsprzedaż). Dobierzemy format i wycenę w ciągu 24 godzin, bez zobowiązań.',
    bookCardCta: 'Porozmawiaj z zespołem',

    perksLabel: 'W cenie',
  },
  uk: {
    home: 'Головна',
    crumb: 'Інвестиційний тур',
    h1: 'Інвестиційний тур по нерухомості Балі — огляди на місці та дью-ділідженс',
    intro: 'Програма на місці, 2–7 днів, для іноземних інвесторів, що купують віллу чи апартаменти на Балі. Ви особисто оглядаєте 5–10 обʼєктів зі свого обраного, зустрічаєтеся з командами забудовників, проводите годину з юристом, який спеціалізується на угодах іноземців, і обʼїжджаєте відповідні регіони острова — Canggu, Bukit, Ubud, Sanur. Логістику, переклад, переговори та розклад бере на себе команда Balinsky на місці.',
    bookCta: 'Забронювати тур',
    contactCta: 'Поставити запитання',

    h2Why: 'Чому візит на місце важливий перед купівлею нерухомості на Балі',
    why: [
      { Icon: Sparkles, title: 'Якість будівництва видно лише на місці',
        body: 'Зйомка з дрона та PDF-презентації показують ідеалізовану картину. Перші 15 хвилин на будмайданчику відповідають на 80% питань, які фото не закриють: реальна якість оздоблення, шум довкола, справжня відстань пішки до пляжу, куди виходять вікна, як близько наступний майданчик, чи вирішено дренаж.' },
      { Icon: Users,    title: 'Прямий контакт із командою проєкту',
        body: 'Не торговий представник із завченими відповідями — сам засновник або комерційний директор за одним столом. Ви можете запитати про затримки попередньої фази, реальну заповнюваність зданих обʼєктів, пункти виходу при простроченій здачі, гарантії повернення депозиту та будь-яке питання, яке ніколи не потрапляє в презентацію.' },
      { Icon: Star,     title: 'Комерційні умови лише для учасників туру',
        body: 'Кілька забудовників пропонують спеціальні умови гостям програми: або 3–7% знижки від відкритої ціни, або мʼякший план оплати, або обʼєкти лише для туру в кращих позиціях. Не в кожному проєкті, але в середньому це покриває вартість самої поїздки.' },
    ],

    h2Includes: 'Що входить в інвестиційний тур',
    includes: [
      { Icon: Plane,     title: 'Зустріч в аеропорту Денпасар і брифінг',
        body: 'Зустрічаємо вас у Ngurah Rai, відвозимо в готель, проводимо 30-хвилинний брифінг: які проєкти ви вже бачили на сайті, що нового від часу вашого обраного, які регіони обʼїдемо, розклад зустрічей із забудовниками та юристом, що взяти на огляди.' },
      { Icon: Car,       title: 'Транспорт класу comfort протягом усього туру',
        body: 'Автомобіль класу comfort із водієм на всю програму — між обʼєктами, на зустрічі, увечері назад у готель. Маршрут планується з урахуванням заторів у Canggu та Bukit і реальної близькості проєктів, щоб ви не втрачали 90 хвилин на кожному переїзді.' },
      { Icon: Building2, title: 'Огляди 5–10 проєктів на місці',
        body: 'Вілли, апартаменти, житлові комплекси — формати підібрані під ваш бюджет і мету (дохід від оренди / спосіб життя / перепродаж). На кожному обʼєкті брокер Balinsky проводить вас по обʼєктах у будівництві або зразковому обʼєкті, розповідає історію забудовника, документи на землю, оточення та профіль орендаря регіону.' },
      { Icon: Users,     title: 'Зустрічі один на один із забудовниками',
        body: 'Для 2–4 проєктів, які ви вважаєте найперспективнішими — приватна зустріч із засновником або директором з продажу, по годині кожна. Обговорюємо терміни завершення та поточні затримки, етапи оплати, гарантії повернення, пункти виходу та умови управління після передачі. Домовленості підтверджуються письмово одразу після кожної зустрічі.' },
      { Icon: Scale,     title: 'Консультація юриста для іноземних покупців',
        body: '60–90 хвилин із незалежним юристом, що спеціалізується на угодах нерезидентів в Індонезії. Адаптовано під ваш профіль: leasehold проти PT PMA, податкові наслідки у вашій країні (US/UK/EU/AU), KITAS і шлях інвесторської візи, пункти SPA, де зазвичай ховається ризик.' },
      { Icon: MapPin,    title: 'Огляд інвестиційних регіонів',
        body: 'Переїзд на пів дня через 2–3 регіони, що відповідають вашій стратегії — Canggu (Berawa, Pererenan, Batu Bolong), Bukit (Uluwatu, Bingin, Pandawa), Ubud, Sanur. Де ціни зростають, де стоять на місці, хто типовий орендар у кожному, де ліквідність перепродажу найкраща для виходу через 3–5 років.' },
    ],

    h2Programs: 'Формати туру',
    programs: [
      {
        name: 'Express',
        duration: '2 дні',
        line: '3–5 проєктів · 1 регіон',
        body: 'Для покупців, які вже відібрали 2–3 обʼєкти на сайті й мають побачити їх особисто та вирішити. Лише огляди й базова зустріч із продавцем — без юридичного блоку, без обʼїзду регіонів.',
        bestFor: 'Покупець, готовий закрити угоду, обирає між 2–3 фінальними варіантами',
      },
      {
        name: 'Standard',
        duration: '3–4 дні',
        line: '5–8 проєктів · юрист · 2 регіони',
        body: 'Повний дью-ділідженс на місці: візити на проєкти, зустрічі з командами забудовників, година з незалежним юристом щодо податків і структури угоди, обʼїзд двох релевантних регіонів. Формат за замовчуванням — більшість наших угод закриваються саме в ньому.',
        bestFor: 'Серйозна купівля на 300–800 тис. $ із юридичною перевіркою та порівнянням альтернатив',
        highlight: true,
      },
      {
        name: 'Premium',
        duration: '5–7 днів',
        line: '10+ проєктів · нотаріус PPAT · усі регіони',
        body: 'Розширена програма для більших інвесторів: додаткові регіони й проєкти, зустріч із нотаріусом PPAT, допомога з реєстрацією PT PMA, якщо ви плануєте KITAS, паралельні екскурсії та послуга няні для родини, вечері із засновниками провідних забудовників.',
        bestFor: 'Бюджет 1 млн $+, портфель із кількох обʼєктів або переїзд родини на Балі',
      },
    ],
    programBestFor: 'Найкраще для',
    programBook: 'Забронювати цей формат',

    h2Faq: 'Часті запитання про інвестиційний тур по Балі',
    faq: [
      { q: 'Скільки коштує тур?',
        a: 'Залежить від формату та сезону. Standard і Premium для серйозних покупців із підтвердженим бюджетом — зазвичай 0 $, ми покриваємо логістику з комісії забудовника після закриття угоди. Express для холодних лідів — 300–500 $ як завдаток, що зараховується у брокерську комісію при купівлі. Преміум сімейний пакет із нянею та розширеною програмою — від 1500 $ за 5 днів. Остаточна ціна після 30-хвилинної розмови.' },
      { q: 'Чи потрібна мені віза до Індонезії?',
        a: 'Для паспортів США, Канади, Великої Британії, Шенгену, Австралії та Нової Зеландії достатньо 30-денної туристичної VOA — видається після прильоту в аеропорту Денпасар за 35 $ або заздалегідь через E-VOA Indonesia. Запрошення від приймаючої сторони не потрібне. Якщо хочете залишитися довше 30 днів, можете продовжити ще на 30 в імміграційному офісі Балі.' },
      { q: 'Чи можу я взяти партнера або родину?',
        a: 'Так — понад 60% наших турів проходять парами або родинами. Програма адаптується: паралельні маршрути для тих, хто не на зустрічах (екскурсія в Ubud, beach club, кулінарний майстер-клас), або послуга няні для дітей під час оглядів. Скажіть нам заздалегідь, скільки людей приїжджає та який вік дітей — ми складемо правильний розклад.' },
      { q: 'Що, якщо жоден обʼєкт на турі не підійде?',
        a: 'Це трапляється приблизно у 25% відвідувачів і саме по собі є корисним результатом — краще витратити 4 дні на усвідомлення, що Балі чи конкретні проєкти не ваш сценарій, ніж закрити наосліп і жалкувати через рік. Немає тиску купувати: ми заробляємо лише на закритих угодах і лише якщо обʼєкт справді підходить покупцю — інакше отримуємо скаргу, яка нам не потрібна.' },
      { q: 'Коли найкраща пора року для приїзду?',
        a: 'Найкращі місяці для оглядів — квітень–червень і вересень–листопад: менше заторів у Canggu та Bukit, мʼяка погода, легше домовитися про зустрічі з командами забудовників. Грудень–березень — високий туристичний сезон: можна спостерігати реальну заповнюваність вілл, як орендар, але затори й ціни на готелі в 1,5–2 рази вищі. Липень–серпень — пік європейських шкільних канікул, схожа історія.' },
      { q: 'За скільки часу наперед варто бронювати?',
        a: '2–4 тижні зазвичай достатньо для Express і Standard. Для Premium плануйте за 4–6 тижнів — треба зарезервувати слот нотаріуса PPAT, англомовного юриста та розклади засновників провідних забудовників, які заповнюються. Пікові тижні (грудень–березень): бронюйте за 6–8 тижнів.' },
      { q: 'Чи можу я підписати SPA і купити під час туру?',
        a: 'Часто саме так і буває. Форма бронювання підписується на зустрічі із забудовником у день огляду; завдаток (2–10 тис. $) переказується на ескроу нотаріуса протягом 1–2 робочих днів. Саме SPA підписується в нотаріуса PPAT через 2–4 тижні після бронювання, після завершення дью-ділідженс — повертатися по нього не потрібно, документи оформлюються дистанційно через довіреність.' },
      { q: 'Що, якщо мені треба подумати після туру?',
        a: 'Більшість клієнтів так і працюють — приїжджають «подивитися й подумати» і вирішують через 1–3 місяці після повернення. Ми передаємо повний пакет: записи зустрічей із забудовниками, нотатки юриста, фото з кожного огляду, прямі контакти команди Balinsky на Балі. Порівнюйте спокійно вдома, пишіть, коли виникнуть нові питання. Якщо вирішите купити пізніше, ми закриємо угоду дистанційно через довіреного нотаріуса.' },
      { q: 'Який мінімальний бюджет, щоб тур мав сенс?',
        a: 'Від 200 тис. $ за апартаменти в Sanur або off-plan в Ubud, від 300 тис. $ за віллу на Bukit або в Canggu. Нижче цього вибір різко звужується, і тур може стати непропорційним зусиллям. Якщо ваш бюджет 150 тис. $ і ви розглядаєте спершу оренду на Балі з наміром купити за рік-два — скажіть нам, іноді формат стає консультацією без поїздки.' },
      { q: 'Як ви обираєте обʼєкти для показу?',
        a: 'Ви починаєте з короткого брифу: бюджет, мета (дохід від оренди / спосіб життя / перепродаж), бажаний регіон, спальні, готовність розглянути проєкт off-plan. Із понад 700 вілл і понад 700 апартаментів у нашій базі ми обираємо 8–15 кандидатів, узгоджуємо обране з вами до приїзду, а на турі показуємо 5–10 фіналістів плюс 2–3 «бонусні» альтернативи, які можуть вас здивувати.' },
    ],

    bookCardHeading: 'Готові приїхати на Балі',
    bookCardText: 'Надішліть боту коротке повідомлення: бюджет, цільові дати, мета (дохід від оренди / спосіб життя / переїзд / перепродаж). Ми підберемо формат і ціну протягом 24 годин, без зобовʼязань.',
    bookCardCta: 'Поговорити з командою',

    perksLabel: 'Включено',
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
