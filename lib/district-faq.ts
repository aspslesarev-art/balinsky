// Вопросы-ответы для страницы района (аудит 21.11.2026): раньше у всех ~20
// районов на 9 языках был один и тот же блок из 5 вопросов — Google считает
// такие страницы массовыми. Теперь каждый ответ собран из цифр именно этого
// района: каталог (lib/market-index.json, пересчёт раз в месяц) и наш
// ежедневный сбор загрузки Booking (lib/district-occupancy.json).
// Цифра не показывается, если наблюдений мало. RU-тексты одобрены владельцем
// 21.11.2026, остальные языки — перевод тех же формулировок. Балийский
// закрыт noindex — для него общий блок.
import { MARKET } from './market-index'
import occ from './district-occupancy.json'
import type { Lang } from './i18n'
import { pluralRu } from './plural-ru'

export type FaqItem = { q: string; a: string }

// Район каталога → зона сбора Booking (центры зон — booking_zone(), миграция 062).
// Только там, где зона и район — одно место; спорные (Pandawa, Nyanyi, Batu Belig) без цифры.
const ZONE: Record<string, string> = {
  'Batu Bolong': 'Чангу — Бату-Болонг', Canggu: 'Чангу — Бату-Болонг',
  Berawa: 'Берава', Pererenan: 'Переренан', Seseh: 'Сесех — Чемаги', Cemagi: 'Сесех — Чемаги',
  Umalas: 'Умалас', Kerobokan: 'Керобокан', Uluwatu: 'Улувату — Пекату',
  Melasti: 'Унгасан — Меласти', Ungasan: 'Унгасан — Меласти', 'Nusa Dua': 'Нуса-Дуа',
  Sanur: 'Сануp', Kedungu: 'Кедунгу — Табанан', Ubud: 'Убуд',
  'Nusa Penida': 'Нуса-Пенида — Лембонган', Karanggasem: 'Чандидаса — Карангасем',
}

const MIN_SALE = 5
const MIN_RENT = 5

type OccFile = { from: string; to: string; zones: Record<string, { occupancyPct: number; villas: number }> }
const OCC = occ as OccFile

const usdIntl = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
const usdSpace = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ') + ' $'
const num = (locale: string) => (n: number) => n.toLocaleString(locale).replace(/\s/g, ' ')
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const ruPl = (n: number, f: [string, string, string]) => pluralRu(n, f)

// Фразы по языкам. d — район, остальное — готовые строки/числа.
type Copy = {
  locale: string
  usd: (n: number) => string
  priceQ: (d: string) => string
  priceA: (d: string, median: string, n: number, asOf: string) => string
  range: (a: string, b: string) => string
  perM2: (v: string) => string
  br2: (v: string) => string
  rentQ: (d: string) => string
  night2: (v: string, n: number) => string
  night3: (v: string) => string
  monthly: (v: string, n: number) => string
  total: (d: string, n: number) => string
  occQ: (d: string) => string
  occA: (d: string, period: string, pct: number, villas: number) => string
  period: (from: string, to: string, year: number) => string
  buyQ: (d: string) => string
  buyA: (lease: string) => string
  lease: (d: string, years: number, n: number) => string
  checkQ: (d: string) => string
  checkA: (d: string, offPlan: number, permit: number) => string
}

const COPY: Partial<Record<Lang, Copy>> = {
  ru: {
    locale: 'ru-RU', usd: usdSpace,
    priceQ: d => `Сколько стоит вилла в районе ${d}?`,
    priceA: (d, m, n, a) => `Медианная цена виллы в районе ${d} - ${m} (${n} ${ruPl(n, ['вилла', 'виллы', 'вилл'])} в каталоге Balinsky, ${a}).`,
    range: (a, b) => ` Половина вилл стоит от ${a} до ${b}.`,
    perM2: v => ` Квадратный метр - около ${v}.`,
    br2: v => ` Вилла с двумя спальнями - около ${v}.`,
    rentQ: d => `Сколько можно зарабатывать на аренде виллы в районе ${d}?`,
    night2: (v, n) => `Вилла с двумя спальнями сдаётся посуточно в среднем за ${v} за ночь (медиана по ${n} ${ruPl(n, ['объявлению', 'объявлениям', 'объявлениям'])} на Booking)`,
    night3: v => `с тремя спальнями - ${v}`,
    monthly: (v, n) => `Помесячно двуспальная вилла сдаётся примерно за ${v} в месяц (${n} ${ruPl(n, ['объявление', 'объявления', 'объявлений'])}).`,
    total: (d, n) => ` Всего в районе ${d} на посуточной аренде около ${num('ru-RU')(n)} ${ruPl(n, ['виллы', 'вилл', 'вилл'])}.`,
    occQ: d => `Какая загрузка у вилл в районе ${d}?`,
    occA: (d, p, pct, v) => `Balinsky каждый день отслеживает свободные даты вилл на Booking. ${cap(p)} виллы в районе ${d} были заняты примерно ${pct}% ночей из тех, что были открыты для брони (около ${v} ${ruPl(v, ['виллы', 'вилл', 'вилл'])}). Это один период, не средняя за год: декабрь - март и июль - август обычно загруженнее.`,
    period: (f, t, y) => `с ${f} по ${t} ${y}`,
    buyQ: d => `Может ли иностранец купить виллу в районе ${d}?`,
    buyA: l => `Да, через лизхолд - долгосрочную аренду земли и дома, оформляется у нотариуса PPAT. Всё в каталоге Balinsky продаётся в лизхолде.${l} Продление срока стоит прописать в договоре заранее.`,
    lease: (d, y, n) => ` Медианный срок лизхолда у вилл в районе ${d} - ${y} лет (по ${n} ${ruPl(n, ['объявлению', 'объявлениям', 'объявлениям'])} со сроком).`,
    checkQ: d => `Что проверить перед покупкой виллы в районе ${d}?`,
    checkA: (d, o, p) => `${o}% вилл в районе ${d} продаются на стадии строительства, ${p > 0 ? `а разрешения PBG/SLF указаны у ${p}%` : 'а разрешения PBG/SLF в данных не указаны ни у одной'}. Проверьте разрешения, зону земли (на жёлтой посуточно сдавать нельзя), срок лизхолда и условия продления - на каждой карточке Balinsky это вынесено отдельно.`,
  },
  en: {
    locale: 'en-GB', usd: usdIntl,
    priceQ: d => `How much does a villa in ${d} cost?`,
    priceA: (d, m, n, a) => `The median asking price of a villa in ${d} is ${m} (${n} villas in the Balinsky catalogue, ${a}).`,
    range: (a, b) => ` Half of them are priced between ${a} and ${b}.`,
    perM2: v => ` That is about ${v} per m².`,
    br2: v => ` A 2-bedroom villa is about ${v}.`,
    rentQ: d => `How much does a villa in ${d} rent for?`,
    night2: (v, n) => `A 2-bedroom villa rents for a median ${v} a night (${n} listings on Booking)`,
    night3: v => `a 3-bedroom one for ${v}`,
    monthly: (v, n) => `Monthly, a 2-bedroom villa lets for about ${v} (${n} listings).`,
    total: (d, n) => ` In total, about ${num('en-US')(n)} villas in ${d} are let nightly.`,
    occQ: d => `How busy are villas in ${d}?`,
    occA: (d, p, pct, v) => `Balinsky checks villa availability on Booking every day. ${cap(p)}, villas in ${d} were taken on about ${pct}% of the nights that had been open for booking (about ${v} villas tracked). This is one period, not a yearly average: December to March and July to August are usually busier.`,
    period: (f, t, y) => `from ${f} to ${t} ${y}`,
    buyQ: d => `Can a foreigner buy a villa in ${d}?`,
    buyA: l => `Yes, through leasehold — a long-term lease of the land and house, signed at a PPAT notary. Everything in the Balinsky catalogue is sold leasehold.${l} Agree the extension terms in the contract up front.`,
    lease: (d, y, n) => ` The median leasehold term of villas listed in ${d} is ${y} years (${n} listings with a stated term).`,
    checkQ: d => `What should I check before buying a villa in ${d}?`,
    checkA: (d, o, p) => `${o}% of villas listed in ${d} are sold off-plan, ${p > 0 ? `and ${p}% list PBG/SLF permits` : 'and none of them list PBG/SLF permits yet'}. Check the permits, the land zone (no nightly rental on yellow, residential land), the leasehold term and extension terms — every Balinsky listing shows these separately.`,
  },
  id: {
    locale: 'id-ID', usd: usdIntl,
    priceQ: d => `Berapa harga vila di ${d}?`,
    priceA: (d, m, n, a) => `Harga median vila di ${d} adalah ${m} (${n} vila di katalog Balinsky, ${a}).`,
    range: (a, b) => ` Separuhnya dihargai antara ${a} dan ${b}.`,
    perM2: v => ` Sekitar ${v} per m².`,
    br2: v => ` Vila 2 kamar tidur sekitar ${v}.`,
    rentQ: d => `Berapa harga sewa vila di ${d}?`,
    night2: (v, n) => `Vila 2 kamar tidur disewakan dengan median ${v} per malam (${n} iklan di Booking)`,
    night3: v => `vila 3 kamar tidur ${v}`,
    monthly: (v, n) => `Sewa bulanan vila 2 kamar tidur sekitar ${v} (${n} iklan).`,
    total: (d, n) => ` Secara total, sekitar ${num('id-ID')(n)} vila di ${d} disewakan harian.`,
    occQ: d => `Seberapa tinggi tingkat hunian vila di ${d}?`,
    occA: (d, p, pct, v) => `Balinsky memantau ketersediaan vila di Booking setiap hari. ${cap(p)}, vila di ${d} terisi sekitar ${pct}% dari malam yang dibuka untuk pemesanan (sekitar ${v} vila dipantau). Ini satu periode, bukan rata-rata tahunan: Desember-Maret dan Juli-Agustus biasanya lebih ramai.`,
    period: (f, t, y) => `dari ${f} hingga ${t} ${y}`,
    buyQ: d => `Bisakah orang asing membeli vila di ${d}?`,
    buyA: l => `Ya, melalui leasehold — sewa jangka panjang atas tanah dan bangunan, ditandatangani di notaris PPAT. Semua properti di katalog Balinsky dijual secara leasehold.${l} Sepakati syarat perpanjangan di kontrak sejak awal.`,
    lease: (d, y, n) => ` Median masa leasehold vila di ${d} adalah ${y} tahun (${n} iklan dengan masa sewa tercantum).`,
    checkQ: d => `Apa yang perlu dicek sebelum membeli vila di ${d}?`,
    checkA: (d, o, p) => `${o}% vila di ${d} dijual saat masih dibangun, ${p > 0 ? `dan ${p}% mencantumkan izin PBG/SLF` : 'dan belum ada yang mencantumkan izin PBG/SLF'}. Periksa izin, zona tanah (zona kuning/hunian tidak boleh disewakan harian), masa leasehold dan syarat perpanjangannya — setiap listing Balinsky menampilkannya secara terpisah.`,
  },
  fr: {
    locale: 'fr-FR', usd: usdIntl,
    priceQ: d => `Combien coûte une villa à ${d} ?`,
    priceA: (d, m, n, a) => `Le prix médian d’une villa à ${d} est de ${m} (${n} villas dans le catalogue Balinsky, ${a}).`,
    range: (a, b) => ` La moitié se situe entre ${a} et ${b}.`,
    perM2: v => ` Soit environ ${v} le m².`,
    br2: v => ` Une villa de 2 chambres coûte environ ${v}.`,
    rentQ: d => `Combien rapporte la location d’une villa à ${d} ?`,
    night2: (v, n) => `Une villa de 2 chambres se loue en médiane ${v} la nuit (${n} annonces sur Booking)`,
    night3: v => `une villa de 3 chambres ${v}`,
    monthly: (v, n) => `Au mois, une villa de 2 chambres se loue environ ${v} (${n} annonces).`,
    total: (d, n) => ` Au total, environ ${num('fr-FR')(n)} villas à ${d} sont louées à la nuit.`,
    occQ: d => `Quel est le taux d’occupation des villas à ${d} ?`,
    occA: (d, p, pct, v) => `Balinsky relève chaque jour les disponibilités des villas sur Booking. ${cap(p)}, les villas à ${d} ont été occupées environ ${pct} % des nuits ouvertes à la réservation (environ ${v} villas suivies). C’est une seule période, pas une moyenne annuelle : de décembre à mars et en juillet-août, c’est généralement plus rempli.`,
    period: (f, t, y) => `du ${f} au ${t} ${y}`,
    buyQ: d => `Un étranger peut-il acheter une villa à ${d} ?`,
    buyA: l => `Oui, en leasehold — un bail longue durée sur le terrain et la maison, signé chez un notaire PPAT. Tout le catalogue Balinsky est vendu en leasehold.${l} Prévoyez les conditions de prolongation dans le contrat dès le départ.`,
    lease: (d, y, n) => ` La durée médiane du leasehold des villas à ${d} est de ${y} ans (${n} annonces avec une durée indiquée).`,
    checkQ: d => `Que vérifier avant d’acheter une villa à ${d} ?`,
    checkA: (d, o, p) => `${o} % des villas à ${d} sont vendues sur plan, ${p > 0 ? `et ${p} % indiquent des permis PBG/SLF` : 'et aucune n’indique encore de permis PBG/SLF'}. Vérifiez les permis, la zone du terrain (pas de location à la nuit en zone jaune, résidentielle), la durée du leasehold et les conditions de prolongation — chaque annonce Balinsky les affiche séparément.`,
  },
  de: {
    locale: 'de-DE', usd: usdIntl,
    priceQ: d => `Was kostet eine Villa in ${d}?`,
    priceA: (d, m, n, a) => `Der Median-Angebotspreis einer Villa in ${d} liegt bei ${m} (${n} Villen im Balinsky-Katalog, ${a}).`,
    range: (a, b) => ` Die Hälfte kostet zwischen ${a} und ${b}.`,
    perM2: v => ` Das sind etwa ${v} pro m².`,
    br2: v => ` Eine Villa mit 2 Schlafzimmern kostet etwa ${v}.`,
    rentQ: d => `Wie viel bringt die Vermietung einer Villa in ${d}?`,
    night2: (v, n) => `Eine Villa mit 2 Schlafzimmern kostet im Median ${v} pro Nacht (${n} Inserate auf Booking)`,
    night3: v => `mit 3 Schlafzimmern ${v}`,
    monthly: (v, n) => `Monatlich wird eine Villa mit 2 Schlafzimmern für etwa ${v} vermietet (${n} Inserate).`,
    total: (d, n) => ` Insgesamt werden in ${d} etwa ${num('de-DE')(n)} Villen tageweise vermietet.`,
    occQ: d => `Wie gut sind Villen in ${d} ausgelastet?`,
    occA: (d, p, pct, v) => `Balinsky erfasst täglich die freien Termine von Villen auf Booking. ${cap(p)} waren Villen in ${d} an etwa ${pct} % der buchbaren Nächte belegt (rund ${v} beobachtete Villen). Das ist ein einzelner Zeitraum, kein Jahresdurchschnitt: Dezember bis März und Juli bis August sind meist stärker gebucht.`,
    period: (f, t, y) => `vom ${f} bis ${t} ${y}`,
    buyQ: d => `Kann ein Ausländer eine Villa in ${d} kaufen?`,
    buyA: l => `Ja, über Leasehold — eine langfristige Pacht von Grundstück und Haus, beurkundet bei einem PPAT-Notar. Alles im Balinsky-Katalog wird als Leasehold verkauft.${l} Die Verlängerung sollte von Anfang an im Vertrag geregelt sein.`,
    lease: (d, y, n) => ` Die mediane Leasehold-Laufzeit der Villen in ${d} beträgt ${y} Jahre (${n} Inserate mit Laufzeitangabe).`,
    checkQ: d => `Was sollte man vor dem Kauf einer Villa in ${d} prüfen?`,
    checkA: (d, o, p) => `${o} % der Villen in ${d} werden vor Fertigstellung verkauft, ${p > 0 ? `und ${p} % nennen PBG/SLF-Genehmigungen` : 'und keine nennt bisher PBG/SLF-Genehmigungen'}. Prüfen Sie Genehmigungen, die Grundstückszone (auf gelbem Wohnland ist Tagesvermietung verboten), die Leasehold-Laufzeit und die Verlängerung — jedes Balinsky-Inserat zeigt das gesondert.`,
  },
  zh: {
    locale: 'zh-CN', usd: usdIntl,
    priceQ: d => `${d}的别墅多少钱？`,
    priceA: (d, m, n, a) => `${d}别墅的挂牌价中位数为 ${m}（Balinsky 目录中 ${n} 套别墅，${a}）。`,
    range: (a, b) => `一半的价格在 ${a} 至 ${b} 之间。`,
    perM2: v => `约合每平方米 ${v}。`,
    br2: v => `两居室别墅约 ${v}。`,
    rentQ: d => `${d}的别墅租金是多少？`,
    night2: (v, n) => `两居室别墅日租中位数为每晚 ${v}（Booking 上 ${n} 条房源）`,
    night3: v => `三居室为 ${v}`,
    monthly: (v, n) => `按月出租，两居室别墅约 ${v}（${n} 条房源）。`,
    total: (d, n) => `${d}共有约 ${num('zh-CN')(n)} 套别墅在做日租。`,
    occQ: d => `${d}的别墅入住率如何？`,
    occA: (d, p, pct, v) => `Balinsky 每天跟踪别墅在 Booking 上的空房情况。${p}，${d}的别墅在开放预订的夜晚中约有 ${pct}% 被订出（约 ${v} 套别墅）。这只是一个时段，不是全年平均：12 月至 3 月以及 7 至 8 月通常更满。`,
    period: (f, t, y) => `${y}年${f}至${t}`,
    buyQ: d => `外国人可以在${d}买别墅吗？`,
    buyA: l => `可以，通过租赁产权（leasehold）——长期租赁土地和房屋，在 PPAT 公证处签署。Balinsky 目录中的房产全部以租赁产权出售。${l}续期条款最好一开始就写进合同。`,
    lease: (d, y, n) => `${d}别墅的租赁期限中位数为 ${y} 年（${n} 条注明期限的房源）。`,
    checkQ: d => `在${d}买别墅前要检查什么？`,
    checkA: (d, o, p) => `${d} ${o}% 的别墅为期房出售，${p > 0 ? `${p}% 标注了 PBG/SLF 许可` : '目前没有一套标注 PBG/SLF 许可'}。请检查许可、土地分区（黄色住宅用地禁止日租）、租期及续期条件——Balinsky 每个房源都单独列出这些信息。`,
  },
  nl: {
    locale: 'nl-NL', usd: usdIntl,
    priceQ: d => `Wat kost een villa in ${d}?`,
    priceA: (d, m, n, a) => `De mediane vraagprijs van een villa in ${d} is ${m} (${n} villa's in de Balinsky-catalogus, ${a}).`,
    range: (a, b) => ` De helft kost tussen ${a} en ${b}.`,
    perM2: v => ` Dat is ongeveer ${v} per m².`,
    br2: v => ` Een villa met 2 slaapkamers kost ongeveer ${v}.`,
    rentQ: d => `Wat levert de verhuur van een villa in ${d} op?`,
    night2: (v, n) => `Een villa met 2 slaapkamers wordt verhuurd voor mediaan ${v} per nacht (${n} advertenties op Booking)`,
    night3: v => `met 3 slaapkamers voor ${v}`,
    monthly: (v, n) => `Per maand wordt een villa met 2 slaapkamers verhuurd voor ongeveer ${v} (${n} advertenties).`,
    total: (d, n) => ` In totaal worden in ${d} zo'n ${num('nl-NL')(n)} villa's per nacht verhuurd.`,
    occQ: d => `Hoe goed zijn villa's in ${d} bezet?`,
    occA: (d, p, pct, v) => `Balinsky controleert dagelijks de beschikbaarheid van villa's op Booking. ${cap(p)} waren villa's in ${d} bezet op ongeveer ${pct}% van de nachten die boekbaar waren (zo'n ${v} villa's gevolgd). Dit is één periode, geen jaargemiddelde: december tot maart en juli-augustus zijn meestal drukker.`,
    period: (f, t, y) => `van ${f} tot ${t} ${y}`,
    buyQ: d => `Kan een buitenlander een villa in ${d} kopen?`,
    buyA: l => `Ja, via leasehold — een langlopende pacht van grond en huis, getekend bij een PPAT-notaris. Alles in de Balinsky-catalogus wordt in leasehold verkocht.${l} Leg de verlengingsvoorwaarden vooraf in het contract vast.`,
    lease: (d, y, n) => ` De mediane leasehold-looptijd van villa's in ${d} is ${y} jaar (${n} advertenties met een looptijd).`,
    checkQ: d => `Wat moet je controleren voor je een villa in ${d} koopt?`,
    checkA: (d, o, p) => `${o}% van de villa's in ${d} wordt verkocht vóór oplevering, ${p > 0 ? `en ${p}% vermeldt PBG/SLF-vergunningen` : 'en geen enkele vermeldt nog PBG/SLF-vergunningen'}. Controleer de vergunningen, de grondzone (geen nachtverhuur op gele, residentiële grond), de leasehold-looptijd en de verlenging — elke Balinsky-advertentie toont dit apart.`,
  },
  pl: {
    locale: 'pl-PL', usd: usdIntl,
    priceQ: d => `Ile kosztuje willa w ${d}?`,
    priceA: (d, m, n, a) => `Mediana ceny willi w ${d} to ${m} (${n} willi w katalogu Balinsky, ${a}).`,
    range: (a, b) => ` Połowa kosztuje od ${a} do ${b}.`,
    perM2: v => ` To około ${v} za m².`,
    br2: v => ` Willa z 2 sypialniami kosztuje około ${v}.`,
    rentQ: d => `Ile można zarobić na wynajmie willi w ${d}?`,
    night2: (v, n) => `Willa z 2 sypialniami wynajmuje się średnio za ${v} za noc (mediana z ${n} ogłoszeń na Booking)`,
    night3: v => `z 3 sypialniami za ${v}`,
    monthly: (v, n) => `Miesięcznie willa z 2 sypialniami wynajmuje się za około ${v} (${n} ogłoszeń).`,
    total: (d, n) => ` Łącznie w ${d} na doby wynajmuje się około ${num('pl-PL')(n)} willi.`,
    occQ: d => `Jakie jest obłożenie willi w ${d}?`,
    occA: (d, p, pct, v) => `Balinsky codziennie sprawdza wolne terminy willi na Booking. ${cap(p)} wille w ${d} były zajęte przez około ${pct}% nocy otwartych do rezerwacji (około ${v} śledzonych willi). To jeden okres, a nie średnia roczna: od grudnia do marca oraz w lipcu i sierpniu obłożenie jest zwykle wyższe.`,
    period: (f, t, y) => `od ${f} do ${t} ${y}`,
    buyQ: d => `Czy cudzoziemiec może kupić willę w ${d}?`,
    buyA: l => `Tak, w formie leasehold — długoterminowej dzierżawy gruntu i domu, podpisywanej u notariusza PPAT. Wszystko w katalogu Balinsky jest sprzedawane w leasehold.${l} Warunki przedłużenia warto zapisać w umowie od razu.`,
    lease: (d, y, n) => ` Mediana okresu leasehold willi w ${d} to ${y} lat (${n} ogłoszeń z podanym okresem).`,
    checkQ: d => `Co sprawdzić przed zakupem willi w ${d}?`,
    checkA: (d, o, p) => `${o}% willi w ${d} sprzedaje się na etapie budowy, ${p > 0 ? `a pozwolenia PBG/SLF podaje ${p}%` : 'a żadna nie podaje jeszcze pozwoleń PBG/SLF'}. Sprawdź pozwolenia, strefę gruntu (na żółtej, mieszkaniowej nie wolno wynajmować na doby), okres leasehold i warunki przedłużenia — każde ogłoszenie Balinsky pokazuje to osobno.`,
  },
  uk: {
    locale: 'uk-UA', usd: usdSpace,
    priceQ: d => `Скільки коштує вілла в районі ${d}?`,
    priceA: (d, m, n, a) => `Медіанна ціна вілли в районі ${d} - ${m} (${n} ${ruPl(n, ['вілла', 'вілли', 'вілл'])} у каталозі Balinsky, ${a}).`,
    range: (a, b) => ` Половина вілл коштує від ${a} до ${b}.`,
    perM2: v => ` Квадратний метр - близько ${v}.`,
    br2: v => ` Вілла з двома спальнями - близько ${v}.`,
    rentQ: d => `Скільки можна заробляти на оренді вілли в районі ${d}?`,
    night2: (v, n) => `Вілла з двома спальнями здається подобово в середньому за ${v} за ніч (медіана за ${n} оголошеннями на Booking)`,
    night3: v => `з трьома спальнями - ${v}`,
    monthly: (v, n) => `Помісячно двоспальна вілла здається приблизно за ${v} на місяць (${n} ${ruPl(n, ['оголошення', 'оголошення', 'оголошень'])}).`,
    total: (d, n) => ` Загалом у районі ${d} подобово здається близько ${num('uk-UA')(n)} ${ruPl(n, ['вілли', 'вілл', 'вілл'])}.`,
    occQ: d => `Яке завантаження вілл у районі ${d}?`,
    occA: (d, p, pct, v) => `Balinsky щодня відстежує вільні дати вілл на Booking. ${cap(p)} вілли в районі ${d} були зайняті приблизно ${pct}% ночей із тих, що були відкриті для бронювання (близько ${v} ${ruPl(v, ['вілли', 'вілл', 'вілл'])}). Це один період, а не середнє за рік: грудень - березень і липень - серпень зазвичай завантаженіші.`,
    period: (f, t, y) => `з ${f} по ${t} ${y}`,
    buyQ: d => `Чи може іноземець купити віллу в районі ${d}?`,
    buyA: l => `Так, через лізхолд - довгострокову оренду землі й будинку, оформлюється в нотаріуса PPAT. Усе в каталозі Balinsky продається в лізхолд.${l} Продовження терміну варто прописати в договорі заздалегідь.`,
    lease: (d, y, n) => ` Медіанний термін лізхолду вілл у районі ${d} - ${y} років (за ${n} оголошеннями з терміном).`,
    checkQ: d => `Що перевірити перед купівлею вілли в районі ${d}?`,
    checkA: (d, o, p) => `${o}% вілл у районі ${d} продаються на етапі будівництва, ${p > 0 ? `а дозволи PBG/SLF вказані в ${p}%` : 'а дозволів PBG/SLF у даних не вказано в жодної'}. Перевірте дозволи, зону землі (на жовтій подобово здавати не можна), термін лізхолду та умови продовження - на кожній картці Balinsky це винесено окремо.`,
  },
}

const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const MONTHS_RU_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']

function dayMonth(s: string, lang: Lang, locale: string): string {
  const d = new Date(s)
  if (lang === 'ru') return `${d.getUTCDate()} ${MONTHS_RU[d.getUTCMonth()]}`
  if (lang === 'en') return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' })
}

function monthYear(lang: Lang, locale: string): string {
  const d = new Date(MARKET.asOf)
  if (lang === 'ru') return `${MONTHS_RU_NOM[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/**
 * @param district латинское имя района, как в каталоге (`Uluwatu`)
 * @param name     имя для текста на языке страницы (`Улувату`)
 * @returns null — для языка нет текстов или данных на ответы не хватает (показываем общий блок)
 */
export function districtVillaFaq(district: string, name: string, lang: Lang): FaqItem[] | null {
  const c = COPY[lang]
  if (!c) return null
  const usd = c.usd
  const sale = MARKET.villaDistricts[district]
  const rent = MARKET.rentDistricts[district]
  const monthly = MARKET.monthly.districts[district]
  const zone = ZONE[district] ? OCC.zones[ZONE[district]] : undefined
  const items: FaqItem[] = []

  if (sale && sale.n >= MIN_SALE && sale.median) {
    let a = c.priceA(name, usd(sale.median), sale.n, monthYear(lang, c.locale))
    if (sale.p25 && sale.p75) a += c.range(usd(sale.p25), usd(sale.p75))
    if (sale.perM2) a += c.perM2(usd(sale.perM2))
    if (sale.median2br && sale.n2br >= MIN_SALE) a += c.br2(usd(sale.median2br))
    items.push({ q: c.priceQ(name), a })
  }

  const n2 = rent?.villa2br, n3 = rent?.villa3br, m2r = monthly?.villa2br
  const night2 = n2 && n2.n >= MIN_RENT && n2.median ? n2 : null
  const month2 = m2r && m2r.n >= MIN_RENT && m2r.median ? m2r : null
  if (night2 || month2) {
    const zh = lang === 'zh'
    const parts: string[] = []
    if (night2) parts.push(c.night2(usd(night2.median!), night2.n))
    if (night2 && n3 && n3.n >= MIN_RENT && n3.median) parts.push(c.night3(usd(n3.median)))
    let a = parts.length ? parts.join(zh ? '，' : ', ') + (zh ? '。' : '.') : ''
    if (month2) a += (a && !zh ? ' ' : '') + c.monthly(usd(month2.median!), month2.n)
    if (rent?.villas) a += c.total(name, rent.villas)
    items.push({ q: c.rentQ(name), a })
  }

  if (zone) {
    const period = c.period(dayMonth(OCC.from, lang, c.locale), dayMonth(OCC.to, lang, c.locale), new Date(OCC.to).getUTCFullYear())
    items.push({ q: c.occQ(name), a: c.occA(name, period, Math.round(zone.occupancyPct), zone.villas) })
  }

  if (sale && sale.n >= MIN_SALE) {
    const lease = sale.leaseYears && sale.leaseN >= MIN_SALE ? c.lease(name, sale.leaseYears, sale.leaseN) : ''
    items.push({ q: c.buyQ(name), a: c.buyA(lease) })
    items.push({ q: c.checkQ(name), a: c.checkA(name, sale.offPlanShare, sale.permitShare) })
  }

  return items.length >= 3 ? items : null
}
