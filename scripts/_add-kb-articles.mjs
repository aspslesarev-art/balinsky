#!/usr/bin/env node
// One-shot: add 3 flagship research-based knowledge articles to
// scripts/knowledge-articles.json (RU — the static source merged by
// sync-knowledge.mjs) AND pre-fill their EN translations into the Storage
// cache feeds/_translations-knowledge.json (keyed by article id) so
// /en/knowledge shows hand-written English immediately.
// Idempotent: re-running replaces the same ids.
// After this: run `node scripts/sync-knowledge.mjs` to publish.

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// ---------------------------------------------------------------------------
const RU_YIELD = `[audience:both]
Когда застройщик обещает «гарантированную доходность 12–15% годовых», первый вопрос — на каких данных это построено? Официальная статистика Бали такой цифры не подтверждает. Вот что она показывает на самом деле.

Спрос на пике — это факт. По данным BPS (Статистическое агентство Индонезии), в 2025 году Бали принял 6 948 754 иностранных туриста — рекорд: +9,7% к 2024 году (6 333 360) и выше доковидного 2019-го (6 275 210). Поток реально восстановился и растёт.

Но спрос — ещё не доходность. Ключевая метрика арендного бизнеса — загрузка. По BPS, заполняемость звёздных отелей Бали (TPK) держится примерно в коридоре 57–65% и сильно зависит от сезона: октябрь 2025 — 64,57%, ноябрь 2025 — 57,97%, январь 2026 — 56,67%. У не-звёздного жилья ещё ниже — около 33% в январе 2026. Даже у профессиональных отелей в среднем треть–половина номеров пустует, и для острова с выраженной сезонностью это норма.

Средняя длительность поездки иностранца — около 3 ночей (3,1–3,2 по BPS). Это рынок короткого высокооборотного проживания: больше уборок, выше расходы на управление и сильнее зависимость от непрерывного потока бронирований.

Откуда едут гости (2024, BPS):
— Австралия — 1,54 млн (крупнейший рынок, около четверти потока);
— Индия — 550 тыс.;
— Китай — 448 тыс.;
— Великобритания — 295 тыс.;
— Южная Корея — 294 тыс.;
— США, Франция, Германия, Россия — по 160–260 тыс.
Поток диверсифицирован, но заметно завязан на Австралию: это и плюс (устойчивый спрос), и риск (шок на одном рынке бьёт по загрузке).

Чего в официальной статистике НЕТ. BPS не публикует ни ADR (среднюю цену за ночь), ни данные по доходности вилл и краткосрочной аренды. Любые «средние 15% по виллам» берутся из маркетинговых материалов, а не из первоисточника. Относитесь к таким обещаниям как к гипотезе, которую нужно проверить, а не как к факту.

Как трезво оценить доходность до покупки:
— закладывайте реалистичную загрузку (50–65%, а не 90%), с провалами в низкий сезон;
— вычитайте управление (обычно 15–25% от выручки), уборки, коммуналку, ремонт и износ мебели;
— учитывайте налог на арендный доход — финальный PPh 10% с валовой аренды для резидентов;
— помните про лизхолд: если право на землю на 25–30 лет, доходность должна окупать ещё и «сгорание» срока;
— просите реальные отчёты о загрузке за 12 месяцев, а не прогноз из презентации.

Вывод: фундаментально спрос на Бали сильный и растёт, но устойчивая доходность строится на консервативной модели — честная загрузка, реальные расходы и налоги, — а не на красивой цифре из буклета.

Источники:
— BPS Bali, иностранные туристы 1969–2025: https://bali.bps.go.id/en/statistics-table/1/MjgjMQ==/banyaknya-wisatawan-mancanegara-ke-bali-dan-indonesia--1969-2024.html
— BPS Bali, обзор туризма (загрузка TPK, длительность пребывания), пресс-релиз ноябрь 2025: https://bali.bps.go.id/id/pressrelease/2026/01/05/718008/perkembangan-pariwisata-provinsi-bali-november-2025.html
— BPS Bali, туристы по странам, 2024: https://bali.bps.go.id/en/statistics-table/1/MTkzIzE=/-banyaknya-wisatawan-mancanegara-yang-datang-langsung-ke-bali-menurut-kebangsaan-2019-2024.html`

const EN_YIELD = `[audience:both]
When a developer promises a "guaranteed 12–15% annual return," the first question is: based on what data? Bali's official statistics do not support that figure. Here is what they actually show.

Demand is at a peak — that part is real. According to BPS (Statistics Indonesia), Bali received 6,948,754 foreign tourists in 2025 — a record: +9.7% over 2024 (6,333,360) and above the pre-COVID 2019 level (6,275,210). Arrivals have genuinely recovered and are still growing.

But demand is not yield. The key metric for a rental business is occupancy. Per BPS, star-hotel occupancy on Bali (TPK) sits in a roughly 57–65% band and swings hard with the season: October 2025 — 64.57%, November 2025 — 57.97%, January 2026 — 56.67%. Non-star accommodation is lower still — about 33% in January 2026. Even professional hotels run a third to half of their rooms empty on average, and for a seasonal island that is normal.

The average foreign trip is about 3 nights (3.1–3.2 per BPS). This is a short, high-turnover market: more cleanings, higher management costs, and a heavier dependence on a steady booking flow.

Where guests come from (2024, BPS):
— Australia — 1.54M (the largest market, roughly a quarter of arrivals);
— India — 550K;
— China — 448K;
— United Kingdom — 295K;
— South Korea — 294K;
— USA, France, Germany, Russia — 160–260K each.
The mix is diversified but noticeably Australia-dependent: a strength (steady demand) and a risk (a shock to one market hits occupancy).

What the official statistics do NOT contain. BPS publishes neither ADR (average nightly rate) nor any villa / short-term-rental yield data. Any "average 15% on villas" comes from marketing, not a primary source. Treat such promises as a hypothesis to verify, not a fact.

How to assess yield realistically before buying:
— assume realistic occupancy (50–65%, not 90%), with low-season dips;
— deduct management (typically 15–25% of revenue), cleaning, utilities, repairs and furniture wear;
— factor in rental-income tax — a 10% final PPh on gross rent for residents;
— remember the leasehold: if the land right runs 25–30 years, the return must also pay for the "burn-down" of that term;
— ask for real 12-month occupancy reports, not a projection from a brochure.

Bottom line: demand on Bali is fundamentally strong and growing, but durable yield is built on a conservative model — honest occupancy, real costs and taxes — not on a pretty number in a deck.

Sources:
— BPS Bali, foreign tourists 1969–2025: https://bali.bps.go.id/en/statistics-table/1/MjgjMQ==/banyaknya-wisatawan-mancanegara-ke-bali-dan-indonesia--1969-2024.html
— BPS Bali, tourism overview (TPK occupancy, length of stay), Nov 2025 press release: https://bali.bps.go.id/id/pressrelease/2026/01/05/718008/perkembangan-pariwisata-provinsi-bali-november-2025.html
— BPS Bali, tourists by nationality, 2024: https://bali.bps.go.id/en/statistics-table/1/MTkzIzE=/-banyaknya-wisatawan-mancanegara-yang-datang-langsung-ke-bali-menurut-kebangsaan-2019-2024.html`

// ---------------------------------------------------------------------------
const RU_LEASE = `[audience:both]
Короткий ответ: полноценной собственности на землю («freehold») у иностранца на Бали не будет — это прямо запрещено законом. Зато есть несколько законных форматов. Разберём, что доступно и чем отличается.

Основа — Основной аграрный закон Индонезии (UUPA, Закон № 5 от 1960 года). Он определяет все права на землю.

Hak Milik — фрихолд, полная собственность. Только для граждан Индонезии. Иностранец владеть Hak Milik не может (ст. 21 UUPA). Если такая земля досталась иностранцу по наследству или браку, он обязан передать её в течение года, иначе она отходит государству (ст. 21(3)).

Hak Pakai — право пользования. Легальный титул, который иностранец-резидент (с KITAS/KITAP или подходящей визой) оформляет на себя. По Постановлению PP № 18 от 2021 года сроки на государственной земле: до 30 лет + продление до 20 + возобновление до 30, то есть до 80 лет суммарно. На частной земле (поверх Hak Milik) — до 30 лет с возобновлением по договору. Хороший вариант для жилья «под себя».

Hak Sewa — аренда (leasehold). Самый частый у иностранцев формат: договорная долгосрочная аренда (ст. 44–45 UUPA). Это не регистрируемый титул на землю, а договор: срок и продление определяются соглашением, а не законом. На рынке Бали обычно 25–30 лет, часто с заранее прописанным продлением. Главная защита арендатора — грамотный нотариальный договор (akta sewa) с чёткими условиями продления и наследования.

Hak Guna Bangunan (HGB) — право застройки. Сроки по PP 18/2021: 30 + 20 + 30, до 80 лет. Иностранец-физлицо напрямую HGB держать не может — он доступен гражданам Индонезии и индонезийским юрлицам.

PT PMA — компания с иностранным капиталом. Это индонезийское юрлицо, поэтому может владеть HGB и Hak Pakai (но не Hak Milik). Стандартный путь, когда недвижимость — это бизнес (например, вилла под аренду): права длиннее, передаются и легально используются в коммерции.

Номинал — оформление Hak Milik на индонезийца «за вас» — не работает. По ст. 26(2) UUPA такая сделка ничтожна (batal demi hukum), а земля отходит государству. Индонезийские суды эти договоры не защищают: вы рискуете потерять и деньги, и объект. В 2026 году на Бали обсуждают ужесточение ответственности за номинальные схемы — тем более не стоит в это идти.

Что выбрать:
— живёте для себя и есть резидентство — Hak Pakai;
— берёте на срок и не хотите компанию — Hak Sewa (leasehold) с сильным договором;
— строите арендный бизнес, нужна длина и передаваемость — PT PMA с HGB или Hak Pakai;
— «фрихолд на своё имя» или номинал — нет, это не для иностранца.

Важно: точные сроки, продления и налоги зависят от типа земли и района. До сделки проверяйте сертификат (Hak Milik / HGB / Hak Pakai), зонирование и текст договора у независимого нотариуса-PPAT, а не у продавца.

Источники:
— UUPA, Закон № 5/1960 (англ. перевод): https://www.flevin.com/id/lgso/translations/Laws/Law%20No.%205%20of%201960%20on%20Basic%20Agrarian%20Principles%20(ETLJ).doc
— PP № 18/2021, официальный текст: https://peraturan.go.id/files/pp18-2021bt.pdf
— PP № 18/2021, карточка регулирования (JDIH BPK): https://peraturan.bpk.go.id/Home/Details/161848/pp-no-18-tahun-2021`

const EN_LEASE = `[audience:both]
Short answer: a foreigner will not get true freehold land ownership on Bali — it is explicitly barred by law. But several legal structures are available. Here is what you can use and how they differ.

The foundation is Indonesia's Basic Agrarian Law (UUPA, Law No. 5 of 1960), which defines all land rights.

Hak Milik — freehold, full ownership. Indonesian citizens only. A foreigner cannot hold Hak Milik (UUPA Art. 21). If such land passes to a foreigner by inheritance or marriage, they must transfer it within one year or it reverts to the State (Art. 21(3)).

Hak Pakai — Right to Use. A legal title a resident foreigner (with KITAS/KITAP or a qualifying visa) can hold in their own name. Under Government Regulation PP No. 18 of 2021, terms on state land are: up to 30 years + a 20-year extension + a 30-year renewal — up to 80 years in total. Over private (Hak Milik) land: up to 30 years, renewable by deed. A good fit for a home you live in.

Hak Sewa — lease (leasehold). The most common structure foreigners use: a contractual long-term lease (UUPA Art. 44–45). It is not a registered land title but a contract — the term and extension are set by agreement, not by statute. On the Bali market it is usually 25–30 years, often with a pre-agreed extension. The lessee's main protection is a well-drafted notarial deed (akta sewa) with clear extension and inheritance terms.

Hak Guna Bangunan (HGB) — Right to Build. Terms under PP 18/2021: 30 + 20 + 30, up to 80 years. A foreign individual cannot hold HGB directly — it is available to Indonesian citizens and Indonesian legal entities.

PT PMA — a foreign-owned company. It is an Indonesian legal entity, so it can hold HGB and Hak Pakai (but not Hak Milik). This is the standard route when the property is a business (e.g. a rental villa): the rights are longer, transferable, and can be used commercially.

Nominee arrangements — holding Hak Milik in an Indonesian's name "for you" — do not work. Under UUPA Art. 26(2) such a deal is void (batal demi hukum) and the land goes to the State. Indonesian courts do not enforce these agreements: you risk losing both your money and the property. In 2026 Bali is discussing tougher penalties for nominee schemes — all the more reason to avoid them.

What to choose:
— living there yourself with residency — Hak Pakai;
— buying for a fixed term without a company — Hak Sewa (leasehold) with a strong contract;
— building a rental business needing length and transferability — a PT PMA with HGB or Hak Pakai;
— "freehold in your own name" or a nominee — no, not for a foreigner.

Important: exact terms, extensions and taxes depend on the land type and district. Before any deal, verify the certificate (Hak Milik / HGB / Hak Pakai), the zoning and the contract text with an independent PPAT notary — not with the seller.

Sources:
— UUPA, Law No. 5/1960 (English translation): https://www.flevin.com/id/lgso/translations/Laws/Law%20No.%205%20of%201960%20on%20Basic%20Agrarian%20Principles%20(ETLJ).doc
— PP No. 18/2021, official text: https://peraturan.go.id/files/pp18-2021bt.pdf
— PP No. 18/2021, regulation record (JDIH BPK): https://peraturan.bpk.go.id/Home/Details/161848/pp-no-18-tahun-2021`

// ---------------------------------------------------------------------------
const RU_TAX = `[audience:both]
Налоги на Бали несложные, если разложить их по этапам сделки. Вот полная картина для иностранного покупателя на 2026 год — со ставками и тем, кто платит.

При покупке.
— BPHTB (пошлина покупателя за приобретение прав) — до 5% от стоимости сверх необлагаемого минимума (NPOPTKP: минимум 80 млн рупий, для наследства — от 300 млн). С 2022 года это местный налог (закон UU HKPD № 1/2022), поэтому точная ставка и минимум зависят от района (Бадунг, Гианьяр и т.д.).
— Если покупаете у застройщика — PPN (НДС). Номинально с 2025 года ставка 12%, но для обычного жилья применяется база 11/12, то есть эффективно НДС остаётся 11% (правило PMK 131/2024).
— PPnBM (налог на роскошь) — 20%, но только для элитного жилья ценой от 30 млрд рупий. Большинства сделок не касается.

При владении.
— PBB (ежегодный налог на землю и строение) — до 0,5% от расчётной базы (NJKP, считается от кадастровой стоимости NJOP). Тоже местный налог.

При сдаче в аренду.
— PPh финальный 4(2) с аренды — 10% с валовой аренды для резидентов. Арендатор-компания удерживает налог сама; если арендатор — физлицо, платит собственник.
— Если вы зарегистрированы как плательщик НДС (PKP), к аренде добавляется НДС (эффективно 11%).
— Для нерезидента (меньше 183 дней в году в Индонезии) обычно действует PPh 26 — 20% у источника, но ставку может снижать налоговое соглашение между странами (для России — проверяйте СИДН).

При продаже.
— PPh финальный 2,5% с валовой цены сделки — платит продавец до оформления у нотариуса. Для простого жилья от девелоперов — 1%.

Сборы (это не налоги, но в бюджет сделки заложите).
— Нотариус-PPAT за договор купли-продажи (AJB) — по закону потолок 1% от суммы сделки (PP № 37/1998), на практике 0,5–1% и обсуждается.
— Регистрация титула в BPN — небольшой административный сбор.

Что важно помнить:
— BPHTB и PBB после реформы 2022 года — местные налоги, поэтому точные цифры смотрите по конкретному району (кабупатену), а не «в среднем по Индонезии»;
— ставки меняются: НДС подняли в 2025-м, пороги индексируют — перед сделкой сверяйтесь с актуальной нормой и независимым налоговым консультантом;
— все основные налоги привязаны к официальной оценке (NJOP) или к цене сделки: занижение цены в договоре создаёт риски и по налогам, и по защите сделки.

Источники:
— DJP (налоговая служба Индонезии): https://www.pajak.go.id/en
— PwC Indonesia, Tax Summaries (ставки и базы): https://taxsummaries.pwc.com/indonesia/individual/other-taxes
— Законы: UU HKPD № 1/2022, UU HPP № 7/2021, PP 34/2016, PP 34/2017`

const EN_TAX = `[audience:both]
Taxes on Bali are not complicated once you break them down by deal stage. Here is the full picture for a foreign buyer in 2026 — with rates and who pays.

When buying.
— BPHTB (buyer's acquisition duty) — up to 5% of value above a tax-free threshold (NPOPTKP: minimum IDR 80M, or from IDR 300M for inheritance). Since 2022 it is a local tax (Law UU HKPD No. 1/2022), so the exact rate and threshold depend on the district (Badung, Gianyar, etc.).
— If you buy from a developer — PPN (VAT). The headline rate is 12% from 2025, but ordinary housing uses an 11/12 base, so the effective VAT stays 11% (rule PMK 131/2024).
— PPnBM (luxury sales tax) — 20%, but only for luxury homes priced from IDR 30 billion. Most deals are not affected.

When owning.
— PBB (annual land & building tax) — up to 0.5% of the assessed base (NJKP, derived from the official NJOP value). Also a local tax.

When renting out.
— Final PPh 4(2) on rent — 10% of gross rent for residents. A corporate tenant withholds it; if the tenant is an individual, the owner pays.
— If you are VAT-registered (PKP), VAT (effectively 11%) is added to the rent.
— For a non-resident (under 183 days a year in Indonesia), PPh 26 generally applies — 20% at source, but a tax treaty between the two countries can reduce it (check your country's treaty).

When selling.
— Final PPh 2.5% of the gross transaction price — paid by the seller before the notarial deed. For simple housing from developers it is 1%.

Fees (not taxes, but budget for them).
— PPAT notary for the deed of sale (AJB) — the legal ceiling is 1% of the transaction (PP No. 37/1998); in practice 0.5–1% and negotiable.
— BPN title registration — a small administrative fee.

Key things to remember:
— after the 2022 reform, BPHTB and PBB are local taxes, so check the exact figures for the specific district (kabupaten), not an "Indonesia average";
— rates change: VAT was raised in 2025 and thresholds are indexed — verify the current rule with an independent tax adviser before the deal;
— all the main taxes are tied to the official valuation (NJOP) or the transaction price: under-stating the price in the contract creates risk both on tax and on the security of the deal.

Sources:
— DJP (Indonesian Tax Authority): https://www.pajak.go.id/en
— PwC Indonesia, Tax Summaries (rates and bases): https://taxsummaries.pwc.com/indonesia/individual/other-taxes
— Laws: UU HKPD No. 1/2022, UU HPP No. 7/2021, PP 34/2016, PP 34/2017`

// ---------------------------------------------------------------------------
const now = new Date()
const articles = [
  { id: 'kb-rental-yield-2026', name: 'Доходность аренды на Бали: что реально показывают данные (2026)', ru: RU_YIELD, enTitle: 'Bali rental yield: what the data actually shows (2026)', en: EN_YIELD, externalUrl: 'https://bali.bps.go.id/en/statistics-table/1/MjgjMQ==/banyaknya-wisatawan-mancanegara-ke-bali-dan-indonesia--1969-2024.html' },
  { id: 'kb-leasehold-freehold-2026', name: 'Leasehold или Freehold на Бали: что доступно иностранцу в 2026', ru: RU_LEASE, enTitle: 'Leasehold vs Freehold in Bali: what a foreigner can hold in 2026', en: EN_LEASE, externalUrl: 'https://peraturan.go.id/files/pp18-2021bt.pdf' },
  { id: 'kb-property-taxes-bali', name: 'Налоги на недвижимость на Бали: покупка, владение, аренда, продажа (2026)', ru: RU_TAX, enTitle: 'Bali property taxes: buying, owning, renting, selling (2026)', en: EN_TAX, externalUrl: 'https://taxsummaries.pwc.com/indonesia/individual/other-taxes' },
]

// 1) Update the static RU articles file.
const PATH = 'scripts/knowledge-articles.json'
const list = JSON.parse(fs.readFileSync(PATH, 'utf8'))
const ids = new Set(articles.map(a => a.id))
const kept = list.filter(a => !ids.has(a.id))
let i = 0
for (const a of articles) {
  kept.push({
    id: a.id,
    name: a.name,
    notes: a.ru,
    audience: 'both',
    photo: null,
    externalUrl: a.externalUrl,
    createdTime: new Date(now.getTime() - i * 1000).toISOString(),
  })
  i++
}
fs.writeFileSync(PATH, JSON.stringify(kept, null, 2))
console.log(`knowledge-articles.json: ${kept.length} total (added/updated ${articles.length})`)

// 2) Merge EN translations into the Storage cache (keyed by article id).
const TR_KEY = '_translations-knowledge.json'
let cache = {}
const { data: dl, error: dlErr } = await sb.storage.from('feeds').download(TR_KEY)
if (dlErr) console.log('  no existing translations file (will create):', dlErr.message)
else { try { cache = JSON.parse(await dl.text()) } catch { cache = {} } }
// The RU manifest body has its [audience:...] marker stripped by
// sync-knowledge; the EN translation replaces that body, so strip the marker
// here too or it would render literally on /en/knowledge.
const stripMarker = s => s.replace(/^\s*\[audience:[^\]]*\]\s*\n?/i, '')
for (const a of articles) cache[a.id] = { title: a.enTitle, body: stripMarker(a.en) }
const body = JSON.stringify(cache)
const { error: upErr } = await sb.storage.from('feeds').upload(TR_KEY, body, { contentType: 'application/json', upsert: true })
if (upErr) console.error('  EN translations upload FAILED:', upErr.message)
else console.log(`  EN translations merged into feeds/${TR_KEY} (${Object.keys(cache).length} keys)`)

console.log('\nNext: node scripts/sync-knowledge.mjs')
