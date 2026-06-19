#!/usr/bin/env node
// Batch 2: 4 research-based articles → scripts/knowledge-articles.json (RU) +
// EN into feeds/_translations-knowledge.json. Idempotent. Then run
// `node scripts/sync-knowledge.mjs`. See scripts/_add-kb-articles.mjs for the
// pattern; all facts are from primary sources (BPS, Bali Perda, imigrasi.go.id,
// Bank Indonesia).

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const RU_SEASON = `[audience:both]
Спрос на Бали сильный, но НЕ равномерный. Если считать доходность аренды «по среднему», легко промахнуться: между пиком и провалом разница в загрузке почти полуторакратная. Вот реальная картина по месяцам за 2025 год — загрузка звёздных отелей по данным BPS.

— январь — 60,3%
— февраль — 51,6%
— март — 46,6% (минимум года)
— апрель — 57,2%
— май — 58,1%
— июнь — 64,7%
— июль — 67,8%
— август — 69,5% (пик года)
— сентябрь — 68,2%
— октябрь — 64,6%
— ноябрь — 58,0%
— декабрь — 60,9%

Высокий сезон — июль–август, плюс всплеск в декабре на новогодние праздники. Турпоток в июле 2025 был рекордным — 697 107 человек, а в августе загрузка дошла почти до 70%. Низкий сезон — февраль–март: в марте загрузка падает до 46,6% (сказывается Ньепи, балийский день тишины), а февраль — самый малолюдный месяц по приездам (450 697). Дальше — плавный спад в сентябре–ноябре и новогодний отскок в декабре. Тот же рисунок повторялся и в 2024-м: пик в июле–августе (до 70,2% в августе), минимумы в начале года.

Почему это важно инвестору:
— «средняя» годовая доходность скрывает, что 3–4 месяца объект работает вполовину силы;
— годовая выручка во многом решается тем, как отработают июль–август и декабрь — провалите высокий сезон, и год не вытянуть;
— тариф нужно гибко поднимать в пик и опускать в низкий сезон, иначе пустые ночи съедят доход;
— расходы (управление, обслуживание, зарплаты) идут все 12 месяцев — считайте их против неровной выручки, а не против пиковой;
— если планируете жить в вилле сами — занимайте её в низкий сезон (февраль–март), а пик отдавайте под аренду.

Важно: это данные по звёздным отелям — у вилл и апартаментов свои цифры, но сезонный РИСУНОК тот же. Перед покупкой просите у управляющей компании помесячную загрузку за год, а не один «средний» процент.

Источники:
— BPS Bali, помесячный турпоток: https://bali.bps.go.id/id/statistics-table/2/MTA2IzI=/banyaknya-wisatawan-mancanegara-bulanan-ke-bali-menurut-pintu-masuk.html
— BPS Bali, обзоры туризма (загрузка TPK), пресс-релизы 2025–2026: https://bali.bps.go.id/en/pressrelease/2026/02/02/718014/tourism-overview-of-bali-province--december-2025.html`

const EN_SEASON = `[audience:both]
Demand on Bali is strong but NOT even. If you calculate rental yield "on the average," it is easy to miss the mark: the gap in occupancy between peak and trough is nearly 1.5×. Here is the real month-by-month picture for 2025 — star-hotel occupancy per BPS.

— January — 60.3%
— February — 51.6%
— March — 46.6% (year low)
— April — 57.2%
— May — 58.1%
— June — 64.7%
— July — 67.8%
— August — 69.5% (year peak)
— September — 68.2%
— October — 64.6%
— November — 58.0%
— December — 60.9%

High season is July–August, plus a year-end spike in December. July 2025 arrivals were a record — 697,107 people — and August occupancy reached nearly 70%. Low season is February–March: March occupancy drops to 46.6% (Nyepi, the Balinese Day of Silence, weighs on it), and February is the thinnest month by arrivals (450,697). Then a gradual decline through September–November and a New-Year rebound in December. The same shape repeated in 2024: a July–August peak (up to 70.2% in August), with the lows at the start of the year.

Why it matters to an investor:
— an "average" annual yield hides that for 3–4 months the property runs at half strength;
— the year's revenue is largely decided by how July–August and December perform — miss the high season and the year won't recover;
— pricing must flex up at the peak and down in the low season, or empty nights eat the income;
— costs (management, maintenance, salaries) run all 12 months — budget them against uneven revenue, not against the peak;
— if you plan to use the villa yourself, take it in the low season (February–March) and rent out the peak.

Important: this is star-hotel data — villas and apartments have their own numbers, but the seasonal SHAPE is the same. Before buying, ask the management company for month-by-month occupancy over a year, not a single "average" percentage.

Sources:
— BPS Bali, monthly arrivals: https://bali.bps.go.id/id/statistics-table/2/MTA2IzI=/banyaknya-wisatawan-mancanegara-bulanan-ke-bali-menurut-pintu-masuk.html
— BPS Bali, tourism overviews (TPK occupancy), 2025–2026 press releases: https://bali.bps.go.id/en/pressrelease/2026/02/02/718014/tourism-overview-of-bali-province--december-2025.html`

const RU_LEVY = `[audience:both]
С 14 февраля 2024 года каждый иностранный турист платит при посещении Бали сбор — 150 000 рупий (примерно $9–10), один раз за поездку. Разбираем, что это, кто освобождён и почему это касается инвестора и арендодателя.

Что это. Туристический сбор (Pungutan Wisatawan Asing) введён региональным законом Бали — Perda № 6 от 2023 года «о сборе с иностранных туристов для защиты культуры и природы Бали». Порядок оплаты установлен постановлением губернатора № 2/2024.

Сколько и как. 150 000 рупий с человека, один раз за визит, независимо от срока пребывания. Оплата только безналичная — через официальную платформу и приложение Love Bali (карта, банковский перевод, виртуальный счёт, QRIS). Платить можно заранее или уже во время поездки.

Кто освобождён (7 категорий):
— держатели KITAS и KITAP (временный и постоянный ВНЖ);
— дипломатические и служебные визы;
— экипажи транспорта;
— визы воссоединения семьи;
— студенческие визы;
— Golden Visa;
— некоторые иные визы.
Категории по ВНЖ и большинству виз подтверждают статус документом на месте; держатели Golden Visa и «иных» виз оформляют освобождение заранее через Love Bali.

На что идут деньги. По данным провинции — на защиту природы, сохранение балийской культуры, поддержку традиционных деревень (desa adat) и системы орошения Subak, храмов и церемоний, на управление отходами. За 2024 год собрали более 318 млрд рупий.

Почему это важно инвестору и арендодателю:
— если вы живёте на Бали по KITAS/KITAP — вы НЕ платите этот сбор (резиденты освобождены);
— ваши гости-туристы платят его сами — мелочь, но лучше предупредить при заселении;
— это сигнал тренда: Бали усиливает регулирование туризма (сбор, контроль аренды — см. правила APOA), и регуляторная среда будет только строже. Закладывайте это в горизонт инвестиции.

Важно: правила и суммы могут меняться (в 2025 году в закон вносили поправки). Перед поездкой сверяйтесь с официальным Love Bali.

Источники:
— Love Bali (официальная платформа): https://lovebali.baliprov.go.id/
— Perda Bali № 6/2023 (JDIH): https://jdih.baliprov.go.id/produk-hukum/peraturan-perundang-undangan/perda/29179
— Динас туризма провинции Бали: https://disparda.baliprov.go.id/`

const EN_LEVY = `[audience:both]
Since 14 February 2024, every foreign tourist pays a levy when visiting Bali — IDR 150,000 (about USD 9–10), once per trip. Here is what it is, who is exempt, and why it matters to an investor and a landlord.

What it is. The foreign-tourist levy (Pungutan Wisatawan Asing) was introduced by a Bali regional law — Perda No. 6 of 2023, "on the levy for foreign tourists to protect Balinese culture and nature." The payment procedure is set by Governor Regulation No. 2/2024.

How much and how. IDR 150,000 per person, once per visit, regardless of length of stay. Payment is cashless only — via the official Love Bali platform and app (card, bank transfer, virtual account, QRIS). You can pay in advance or during the trip.

Who is exempt (7 categories):
— KITAS and KITAP holders (temporary and permanent stay permits);
— diplomatic and service visas;
— transport crew;
— family-reunification visas;
— student visas;
— Golden Visa;
— certain other visas.
Stay-permit and most visa holders prove status with a document on the spot; Golden Visa and "other" visa holders arrange the exemption in advance through Love Bali.

Where the money goes. Per the provincial government — protecting nature, advancing Balinese culture, supporting traditional villages (desa adat) and the Subak irrigation system, temples and ceremonies, and waste management. In 2024 it collected more than IDR 318 billion.

Why it matters to an investor and a landlord:
— if you live on Bali on a KITAS/KITAP, you do NOT pay this levy (residents are exempt);
— your tourist guests pay it themselves — a small thing, but worth flagging at check-in;
— it signals a trend: Bali is tightening tourism regulation (the levy, rental controls — see the APOA rules), and the regulatory environment will only get stricter. Factor that into your investment horizon.

Important: rules and amounts can change (the law was amended in 2025). Check the official Love Bali before traveling.

Sources:
— Love Bali (official platform): https://lovebali.baliprov.go.id/
— Perda Bali No. 6/2023 (JDIH): https://jdih.baliprov.go.id/produk-hukum/peraturan-perundang-undangan/perda/29179
— Bali Provincial Tourism Office: https://disparda.baliprov.go.id/`

const RU_VISA = `[audience:both]
Не всем, кто хочет жить на Бали подолгу, нужно покупать недвижимость. Виза второго дома (Second Home Visa) даёт право находиться в стране 5 или 10 лет без местного работодателя-спонсора. Разбираем, кому она подходит и чем отличается от покупки.

Что это. Долгосрочная виза/ВНЖ для состоятельных иностранцев, запущенная иммиграционной службой Индонезии в октябре 2022 года (входит в семейство виз E33). Даёт длительное проживание без привязки к работе или компании.

Базовые условия:
— срок пребывания — 5 или 10 лет;
— финансовое подтверждение — депозит не менее 2 млрд рупий (примерно $130 тыс.) на счёте в индонезийском банке; как альтернатива — владение подходящей недвижимостью в Индонезии (с высоким ценовым порогом);
— работодатель-спонсор не нужен;
— государственная пошлина за оформление — 3 млн рупий.

Что можно и нельзя:
— можно: проживать, учиться, инвестировать;
— нельзя: работать по найму в Индонезии — это не рабочая виза.

Чем отличается от других путей:
— инвесторский KITAS требует открыть компанию PT PMA и вести бизнес; виза второго дома требует лишь «замороженного» депозита (или недвижимости), но не даёт права вести операционный бизнес;
— это не туристическая виза и не виза цифрового кочевника — для удалёнщиков есть отдельный KITAS (E33G) с другими условиями.

Связь с недвижимостью. Виза второго дома даёт легальное резидентство, а оно — условие, при котором иностранец может оформить на себя титул Hak Pakai (право пользования). То есть длинная виза и покупка через Hak Pakai могут идти в связке (подробнее — в нашей статье про leasehold и freehold).

Кому подходит:
— хотите жить на Бали 5–10 лет, но не готовы заводить компанию или покупать недвижимость прямо сейчас;
— есть капитал, который можно «заморозить» на депозите;
— нужен стабильный статус без ежегодных продлений KITAS.

Важно: точные суммы, требования к банку и список документов иммиграция периодически меняет. Перед подачей сверяйтесь с официальным сайтом imigrasi.go.id, а не с блогами.

Источники:
— Ditjen Imigrasi, пресс-релиз о запуске Second Home Visa (25.10.2022): https://www.imigrasi.go.id/siaran_pers/2022/10/25/siaran-pers-ditjen-imigrasi-resmi-luncurkan-aturan-second-home-visa
— Иммиграционная служба Индонезии: https://www.imigrasi.go.id/`

const EN_VISA = `[audience:both]
Not everyone who wants to live on Bali long-term needs to buy property. The Second Home Visa grants the right to stay in the country for 5 or 10 years without a local employer-sponsor. Here is who it suits and how it differs from buying.

What it is. A long-term visa / stay permit for well-funded foreigners, launched by Indonesia's immigration service in October 2022 (part of the E33 visa family). It allows long residence with no tie to a job or company.

Core requirements:
— stay of 5 or 10 years;
— proof of funds — a deposit of at least IDR 2 billion (about USD 130,000) in an Indonesian bank account; as an alternative — ownership of qualifying property in Indonesia (at a high price threshold);
— no employer-sponsor required;
— a government fee of IDR 3 million to apply.

What you can and cannot do:
— allowed: residence, study, investment;
— not allowed: working in employment in Indonesia — it is not a work visa.

How it differs from other routes:
— an investor KITAS requires setting up a PT PMA company and running a business; the Second Home Visa requires only a "parked" deposit (or property) but does not allow running an operating business;
— it is not a tourist visa and not a digital-nomad visa — remote workers have a separate KITAS (E33G) with different terms.

Link to property. The Second Home Visa gives legal residency, which is the condition under which a foreigner can hold a Hak Pakai (right-to-use) title in their own name. So a long visa and a purchase via Hak Pakai can work together (more in our leasehold-vs-freehold article).

Who it suits:
— you want to live on Bali for 5–10 years but aren't ready to set up a company or buy property right now;
— you have capital you can "freeze" on deposit;
— you want a stable status without annual KITAS renewals.

Important: immigration periodically changes the exact amounts, bank requirements and document list. Before applying, check the official imigrasi.go.id — not blogs.

Sources:
— Ditjen Imigrasi, Second Home Visa launch press release (25 Oct 2022): https://www.imigrasi.go.id/siaran_pers/2022/10/25/siaran-pers-ditjen-imigrasi-resmi-luncurkan-aturan-second-home-visa
— Indonesia Immigration: https://www.imigrasi.go.id/`

const RU_FX = `[audience:both]
Цены на виллы и многие краткосрочные аренды на Бали номинированы в долларах, а налоги, содержание, зарплаты персонала и часть долгой аренды — в рупиях. Этот валютный разрыв напрямую влияет на вашу реальную доходность. Вот цифры и что с ними делать.

Как двигался курс (среднегодовой, рупий за доллар):
— 2019 — около 14 150;
— 2022 — около 14 850;
— 2023 — около 15 240;
— 2024 — около 15 855;
— ноябрь 2025 — около 16 735;
— июнь 2026 — около 17 800 (официальный курс Bank Indonesia, JISDOR).
За 2019–2026 рупия ослабла к доллару примерно на четверть.

Контекст от регулятора. Инфляция в Индонезии в мае 2026 — 3,08% годовых, в пределах целевого коридора Bank Indonesia 2,5% ±1%. Ключевую ставку (BI-Rate) в июне 2026 подняли до 5,75% — регулятор прямо называет это мерой стабилизации рупии. МВФ в обзоре 2025 года оценивает внешнюю позицию Индонезии как устойчивую, а курс — как «амортизатор шоков».

Где сидит риск для инвестора:
— покупаете и оцениваете объект в долларах, а налоги (PBB и BPHTB считаются от рупиевой оценки NJOP), коммуналку, ремонт, управление и зарплаты платите в рупиях;
— краткосрочная аренда для иностранцев часто в долларах — тогда ослабление рупии вам скорее на руку: рупиевые расходы дешевеют в долларах;
— но если доход в рупиях (долгая местная аренда), а считаете вы в долларах — ослабление рупии съедает долларовую доходность;
— при выходе из инвестиции: продали в рупиях — конвертация в доллар по ослабшему курсу уменьшает результат.

Что с этим делать:
— считайте доходность в той валюте, в которой реально получаете доход, и отдельно — после конвертации;
— не закладывайте стабильный курс на 5–10 лет вперёд: тренд последних лет — постепенное ослабление рупии;
— держите подушку расходов в рупиях, чтобы не конвертировать в невыгодный момент;
— помните, что лизхолд и налоги привязаны к рупиевым величинам — это частично сглаживает валютный риск по расходам.

Важно: курсы и ставки меняются быстро — актуальные цифры смотрите на сайте Bank Indonesia.

Источники:
— Bank Indonesia, официальный курс JISDOR: https://www.bi.go.id/en/statistik/informasi-kurs/jisdor/default.aspx
— Bank Indonesia, пресс-релизы по ставке и инфляции: https://www.bi.go.id/en/publikasi/ruang-media/news-release/Default.aspx
— World Bank (среднегодовой курс), IMF Article IV 2025`

const EN_FX = `[audience:both]
On Bali, villa prices and many short-term rentals are denominated in US dollars, while taxes, upkeep, staff salaries and some long-term rents are in rupiah. This currency gap directly affects your real return. Here are the numbers and what to do about them.

How the rate moved (annual average, rupiah per US dollar):
— 2019 — about 14,150;
— 2022 — about 14,850;
— 2023 — about 15,240;
— 2024 — about 15,855;
— November 2025 — about 16,735;
— June 2026 — about 17,800 (Bank Indonesia official rate, JISDOR).
Over 2019–2026 the rupiah weakened against the dollar by roughly a quarter.

Context from the regulator. Indonesia's inflation in May 2026 was 3.08% year-on-year, within Bank Indonesia's target band of 2.5% ±1%. The policy rate (BI-Rate) was raised to 5.75% in June 2026 — the central bank explicitly calls this a step to stabilize the rupiah. The IMF's 2025 review assesses Indonesia's external position as resilient and the exchange rate as a "shock absorber."

Where the risk sits for an investor:
— you buy and value the property in dollars, but pay taxes (PBB and BPHTB are based on the rupiah NJOP valuation), utilities, repairs, management and salaries in rupiah;
— short-term rental to foreigners is often in dollars — then a weaker rupiah tends to help you: rupiah costs get cheaper in dollar terms;
— but if income is in rupiah (long-term local rent) while you account in dollars, a weaker rupiah erodes your dollar yield;
— at exit: if you sell in rupiah, converting to dollars at a weaker rate reduces the result.

What to do about it:
— calculate yield in the currency you actually earn in, and separately after conversion;
— don't assume a stable rate 5–10 years out: the recent trend is a gradual rupiah depreciation;
— keep a cost buffer in rupiah so you don't have to convert at a bad moment;
— remember that leasehold and taxes are tied to rupiah values — which partly smooths the currency risk on the cost side.

Important: rates and policy move fast — check current figures on the Bank Indonesia site.

Sources:
— Bank Indonesia, official JISDOR rate: https://www.bi.go.id/en/statistik/informasi-kurs/jisdor/default.aspx
— Bank Indonesia, rate and inflation press releases: https://www.bi.go.id/en/publikasi/ruang-media/news-release/Default.aspx
— World Bank (annual average rate), IMF Article IV 2025`

const now = new Date()
const articles = [
  { id: 'kb-seasonality-bali-2026', name: 'Сезонность аренды на Бали: когда пик, а когда простой (данные BPS)', ru: RU_SEASON, enTitle: 'Bali rental seasonality: when it peaks and when it sits empty (BPS data)', en: EN_SEASON, externalUrl: 'https://bali.bps.go.id/id/statistics-table/2/MTA2IzI=/banyaknya-wisatawan-mancanegara-bulanan-ke-bali-menurut-pintu-masuk.html' },
  { id: 'kb-tourist-levy-bali', name: 'Туристический сбор на Бали (IDR 150 000): кто платит и зачем инвестору это знать', ru: RU_LEVY, enTitle: 'Bali tourist levy (IDR 150,000): who pays and why an investor should know', en: EN_LEVY, externalUrl: 'https://lovebali.baliprov.go.id/' },
  { id: 'kb-second-home-visa-bali', name: 'Виза второго дома на Бали (Second Home Visa): альтернатива покупке для долгого проживания', ru: RU_VISA, enTitle: 'Bali Second Home Visa: an alternative to buying for long-term living', en: EN_VISA, externalUrl: 'https://www.imigrasi.go.id/siaran_pers/2022/10/25/siaran-pers-ditjen-imigrasi-resmi-luncurkan-aturan-second-home-visa' },
  { id: 'kb-currency-risk-idr-usd', name: 'Рупия и доллар: валютный риск инвестора в недвижимость Бали', ru: RU_FX, enTitle: 'Rupiah vs dollar: currency risk for a Bali property investor', en: EN_FX, externalUrl: 'https://www.bi.go.id/en/statistik/informasi-kurs/jisdor/default.aspx' },
]

// 1) RU static articles file.
const PATH = 'scripts/knowledge-articles.json'
const list = JSON.parse(fs.readFileSync(PATH, 'utf8'))
const ids = new Set(articles.map(a => a.id))
const kept = list.filter(a => !ids.has(a.id))
let i = 0
for (const a of articles) {
  kept.push({ id: a.id, name: a.name, notes: a.ru, audience: 'both', photo: null, externalUrl: a.externalUrl, createdTime: new Date(now.getTime() - i * 1000).toISOString() })
  i++
}
fs.writeFileSync(PATH, JSON.stringify(kept, null, 2))
console.log(`knowledge-articles.json: ${kept.length} total (added/updated ${articles.length})`)

// 2) EN translations cache (marker stripped — RU manifest body has none).
const TR_KEY = '_translations-knowledge.json'
let cache = {}
const { data: dl, error: dlErr } = await sb.storage.from('feeds').download(TR_KEY)
if (dlErr) console.log('  no existing translations file:', dlErr.message)
else { try { cache = JSON.parse(await dl.text()) } catch { cache = {} } }
const stripMarker = s => s.replace(/^\s*\[audience:[^\]]*\]\s*\n?/i, '')
for (const a of articles) cache[a.id] = { title: a.enTitle, body: stripMarker(a.en) }
const { error: upErr } = await sb.storage.from('feeds').upload(TR_KEY, JSON.stringify(cache), { contentType: 'application/json', upsert: true })
if (upErr) console.error('  EN upload FAILED:', upErr.message)
else console.log(`  EN translations merged (${Object.keys(cache).length} keys)`)
console.log('\nNext: node scripts/sync-knowledge.mjs')
