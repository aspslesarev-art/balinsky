import Link from 'next/link'
import type { VillaFilterState } from '@/app/ru/villy/_lib'
import { STATUS_TO_SLUG } from '@/lib/villa-seo-routes'
import { DISTRICT_TO_SLUG, BEDROOM_TO_SLUG } from '@/lib/seo-routes'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const POPULAR_DISTRICTS = ['Berawa', 'Sanur', 'Ubud', 'Uluwatu', 'Pererenan', 'Pandawa', 'Batu Bolong', 'Cemagi']

type Variant = 'list' | 'map'

const COPY = {
  ru: {
    introWhereDistrict: (d: string) => `района ${d}`,
    introWhereDistricts: (d: string[]) => `районов ${d.join(', ')}`,
    introWhereBali: 'Бали',
    introBeds1: (n: string) => ` с ${n} спальней`,
    introBedsN: (a: string[]) => ` с ${a.join('/')} спальнями`,
    introMap: (where: string, beds: string) => `На странице — виллы и дома${beds} в пределах ${where} с отметками на карте.`,
    introList: (where: string, beds: string) => `На странице — виллы и дома${beds} в пределах ${where}.`,
    introTail: ' Смотрите фото, площадь дома и участка, цены и характеристики.',
    ctxUbud: 'В Убуде — виллы среди джунглей и рисовых террас. Подходит тем, кто ищет приватность и природу подальше от пляжа.',
    ctxCanggu: (d: string) => `${d} — Чангу: виллы для жизни на сёрфе, удалённой работы и сдачи в посуточную аренду.`,
    ctxBukit: (d: string) => `${d} — Букит: видовые виллы на утёсах, премиальный сегмент с высоким спросом на аренду.`,
    ctxSanur: 'Санур — виллы для семейного формата и долгосрочного переезда, спокойный восточный берег.',
    ctxDefault: 'Виллы на Бали покупают для жизни, для аренды и под перепродажу. Самые ликвидные локации — Чангу (Berawa, Batu Bolong, Pererenan), Букит (Uluwatu, Pandawa) и Убуд. Большинство сделок — лизхолд от 25 до 80 лет, формат собственности через нотариуса PPAT.',
    titleAdj: (n: string) => `${n}-комнатные`,
    titleNoun: 'виллы и дома',
    titleNounCap: 'Виллы и дома',
    titleInDistrict: (d: string) => ` в районе ${d}`,
    titleMapTail: ' на карте Бали',
    titleListTail: ' на Бали — каталог',
    districtsHeading: 'Виллы по районам',
    bedsStatusHeading: 'По спальням и статусу',
    bedroomsLabel: (n: string) => `${n}-комнатные`,
    statusBuilding: 'Строящиеся',
    statusBuilt: 'Готовые',
    villasInComplexes: 'Виллы в комплексах',
    faqHeading: 'Часто задаваемые вопросы',
    faq: [
      { q: 'Чем отличается вилла от апартамента?', a: 'Вилла — отдельно стоящий дом с участком, бассейном и приватным двором. Апартамент — юнит в общем комплексе с инфраструктурой и обычно без своей земли.' },
      { q: 'Сколько стоит вилла на Бали?',         a: '1-bedroom виллы стартуют от 150–250 тыс. $, 2–3-bedroom в Чангу/Букит — от 350 тыс. $. Премиальные видовые виллы доходят до 1.5–3 млн $.' },
      { q: 'Можно ли иностранцу купить виллу на Бали?', a: 'Да — через лизхолд (долгосрочная аренда земли, обычно 25–80 лет) или через юр. лицо PT PMA. Сделка оформляется у нотариуса PPAT.' },
      { q: 'Какая доходность у виллы под аренду?', a: 'В Чангу и на Буките — 8–12% годовых при загрузке 70–80% через управляющую компанию. Сезонность сильно влияет: декабрь–март и июль–август — пик.' },
      { q: 'Что важно проверить перед покупкой?', a: 'Срок лизхолда и условия продления, разрешения PBG / SLF, назначение земли (зонирование), подключение к воде/электричеству, наличие управляющей компании и путь к собственности (нотариус PPAT).' },
    ],
  },
  en: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (d: string[]) => `${d.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` with ${n} bedroom`,
    introBedsN: (a: string[]) => ` with ${a.join('/')} bedrooms`,
    introMap: (where: string, beds: string) => `Villas and houses${beds} in ${where}, marked on a map.`,
    introList: (where: string, beds: string) => `Villas and houses${beds} in ${where}.`,
    introTail: ' See photos, plot and house size, prices and details.',
    ctxUbud: 'Ubud — villas among jungle and rice terraces. Best for buyers wanting privacy and nature away from the beach.',
    ctxCanggu: (d: string) => `${d} — Canggu: villas for surfing, remote work and short-term rentals.`,
    ctxBukit: (d: string) => `${d} — Bukit: clifftop view villas, premium segment with strong rental demand.`,
    ctxSanur: 'Sanur — family-friendly villas for long-term relocation on the calm east coast.',
    ctxDefault: 'Bali villas are bought to live in, to rent out and to flip. The most liquid locations are Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa) and Ubud. Most deals are 25–80 year leaseholds closed at a PPAT notary.',
    titleAdj: (n: string) => `${n}-bedroom`,
    titleNoun: 'villas and houses',
    titleNounCap: 'Villas and houses',
    titleInDistrict: (d: string) => ` in ${d}`,
    titleMapTail: ' on the Bali map',
    titleListTail: ' in Bali — catalogue',
    districtsHeading: 'Villas by district',
    bedsStatusHeading: 'By bedrooms and status',
    bedroomsLabel: (n: string) => `${n}-bedroom`,
    statusBuilding: 'Under construction',
    statusBuilt: 'Completed',
    villasInComplexes: 'Villas in complexes',
    faqHeading: 'Frequently asked questions',
    faq: [
      { q: 'How does a villa differ from an apartment?', a: 'A villa is a standalone house on its own plot with a pool and private garden. An apartment is a unit inside a shared complex, usually without its own land.' },
      { q: 'How much does a Bali villa cost?',           a: '1-bedroom villas start at $150–250k. 2–3-bedroom villas in Canggu/Bukit start at $350k. Premium view villas reach $1.5–3M.' },
      { q: 'Can a foreigner buy a Bali villa?',          a: 'Yes — via leasehold (typically 25–80 years) or through a PT PMA company. The deal is closed at a PPAT notary.' },
      { q: 'What yield do rental villas earn?',          a: 'In Canggu and Bukit — 8–12% per year at 70–80% occupancy with a management company. Seasonality matters: Dec–Mar and Jul–Aug are peak.' },
      { q: 'What should I check before buying?',         a: 'Leasehold term and extension, PBG / SLF permits, land zoning, water/electricity connection, management company in place, and the ownership path (PPAT notary).' },
    ],
  },
  id: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (d: string[]) => `${d.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` dengan ${n} kamar tidur`,
    introBedsN: (a: string[]) => ` dengan ${a.join('/')} kamar tidur`,
    introMap: (where: string, beds: string) => `Vila dan rumah${beds} di ${where}, ditandai pada peta.`,
    introList: (where: string, beds: string) => `Vila dan rumah${beds} di ${where}.`,
    introTail: ' Lihat foto, luas tanah dan bangunan, harga, dan detailnya.',
    ctxUbud: 'Ubud — vila di antara hutan dan sawah terasering. Cocok bagi pembeli yang menginginkan privasi dan alam jauh dari pantai.',
    ctxCanggu: (d: string) => `${d} — Canggu: vila untuk berselancar, kerja jarak jauh, dan sewa jangka pendek.`,
    ctxBukit: (d: string) => `${d} — Bukit: vila dengan pemandangan di atas tebing, segmen premium dengan permintaan sewa yang kuat.`,
    ctxSanur: 'Sanur — vila ramah keluarga untuk relokasi jangka panjang di pantai timur yang tenang.',
    ctxDefault: 'Vila di Bali dibeli untuk ditinggali, disewakan, dan dijual kembali. Lokasi paling likuid adalah Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa), dan Ubud. Sebagian besar transaksi adalah hak sewa 25–80 tahun yang ditutup di notaris PPAT.',
    titleAdj: (n: string) => `${n} kamar tidur`,
    titleNoun: 'vila dan rumah',
    titleNounCap: 'Vila dan rumah',
    titleInDistrict: (d: string) => ` di ${d}`,
    titleMapTail: ' di peta Bali',
    titleListTail: ' di Bali — katalog',
    districtsHeading: 'Vila berdasarkan kawasan',
    bedsStatusHeading: 'Berdasarkan kamar tidur dan status',
    bedroomsLabel: (n: string) => `${n} kamar tidur`,
    statusBuilding: 'Dalam pembangunan',
    statusBuilt: 'Selesai',
    villasInComplexes: 'Vila di dalam kompleks',
    faqHeading: 'Pertanyaan yang sering diajukan',
    faq: [
      { q: 'Apa beda vila dan apartemen?', a: 'Vila adalah rumah berdiri sendiri di atas lahannya sendiri dengan kolam renang dan taman pribadi. Apartemen adalah unit di dalam kompleks bersama, biasanya tanpa lahan sendiri.' },
      { q: 'Berapa harga vila di Bali?',           a: 'Vila 1 kamar tidur mulai dari $150–250 rb. Vila 2–3 kamar tidur di Canggu/Bukit mulai dari $350 rb. Vila premium dengan pemandangan mencapai $1,5–3 jt.' },
      { q: 'Bisakah orang asing membeli vila di Bali?',          a: 'Ya — melalui hak sewa (biasanya 25–80 tahun) atau melalui perusahaan PT PMA. Transaksi ditutup di notaris PPAT.' },
      { q: 'Berapa imbal hasil vila sewa?',          a: 'Di Canggu dan Bukit — 8–12% per tahun pada okupansi 70–80% dengan perusahaan pengelola. Musim berpengaruh: Des–Mar dan Jul–Agu adalah puncaknya.' },
      { q: 'Apa yang perlu diperiksa sebelum membeli?',         a: 'Masa hak sewa dan perpanjangan, izin PBG / SLF, zonasi tanah, sambungan air/listrik, adanya perusahaan pengelola, dan jalur kepemilikan (notaris PPAT).' },
    ],
  },
  fr: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (d: string[]) => `${d.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` avec ${n} chambre`,
    introBedsN: (a: string[]) => ` avec ${a.join('/')} chambres`,
    introMap: (where: string, beds: string) => `Villas et maisons${beds} à ${where}, indiquées sur une carte.`,
    introList: (where: string, beds: string) => `Villas et maisons${beds} à ${where}.`,
    introTail: ' Voir les photos, la surface du terrain et de la maison, les prix et les détails.',
    ctxUbud: 'Ubud — des villas au cœur de la jungle et des rizières en terrasses. Idéal pour les acheteurs recherchant intimité et nature loin de la plage.',
    ctxCanggu: (d: string) => `${d} — Canggu : villas pour le surf, le télétravail et la location courte durée.`,
    ctxBukit: (d: string) => `${d} — Bukit : villas vue mer en haut des falaises, segment premium avec une forte demande locative.`,
    ctxSanur: 'Sanur — villas familiales pour une installation longue durée sur la côte est paisible.',
    ctxDefault: "Les villas de Bali s'achètent pour y vivre, pour les louer et pour les revendre. Les emplacements les plus liquides sont Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa) et Ubud. La plupart des transactions sont des baux de 25 à 80 ans conclus chez un notaire PPAT.",
    titleAdj: (n: string) => `${n} chambres`,
    titleNoun: 'villas et maisons',
    titleNounCap: 'Villas et maisons',
    titleInDistrict: (d: string) => ` à ${d}`,
    titleMapTail: ' sur la carte de Bali',
    titleListTail: ' à Bali — catalogue',
    districtsHeading: 'Villas par quartier',
    bedsStatusHeading: 'Par chambres et statut',
    bedroomsLabel: (n: string) => `${n} chambres`,
    statusBuilding: 'En construction',
    statusBuilt: 'Livrées',
    villasInComplexes: 'Villas en résidence',
    faqHeading: 'Questions fréquentes',
    faq: [
      { q: "Quelle différence entre une villa et un appartement ?", a: "Une villa est une maison individuelle sur son propre terrain, avec piscine et jardin privé. Un appartement est un logement au sein d'une résidence partagée, généralement sans terrain propre." },
      { q: 'Combien coûte une villa à Bali ?',           a: 'Les villas 1 chambre démarrent à 150–250 k$. Les villas 2–3 chambres à Canggu/Bukit démarrent à 350 k$. Les villas vue mer premium atteignent 1,5–3 M$.' },
      { q: 'Un étranger peut-il acheter une villa à Bali ?',          a: "Oui — via un bail (généralement 25–80 ans) ou via une société PT PMA. La transaction est conclue chez un notaire PPAT." },
      { q: 'Quel rendement offrent les villas en location ?',          a: 'À Canggu et Bukit — 8–12% par an avec un taux d\'occupation de 70–80% et une société de gestion. La saisonnalité compte : déc.–mars et juil.–août sont les pics.' },
      { q: 'Que faut-il vérifier avant d\'acheter ?',         a: "La durée du bail et son renouvellement, les permis PBG / SLF, le zonage du terrain, le raccordement eau/électricité, la présence d'une société de gestion et le parcours de propriété (notaire PPAT)." },
    ],
  },
  de: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (d: string[]) => `${d.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` mit ${n} Schlafzimmer`,
    introBedsN: (a: string[]) => ` mit ${a.join('/')} Schlafzimmern`,
    introMap: (where: string, beds: string) => `Villen und Häuser${beds} in ${where}, auf einer Karte markiert.`,
    introList: (where: string, beds: string) => `Villen und Häuser${beds} in ${where}.`,
    introTail: ' Sehen Sie Fotos, Grundstücks- und Hausgröße, Preise und Details.',
    ctxUbud: 'Ubud — Villen inmitten von Dschungel und Reisterrassen. Ideal für Käufer, die Privatsphäre und Natur abseits des Strandes suchen.',
    ctxCanggu: (d: string) => `${d} — Canggu: Villen zum Surfen, für Remote-Arbeit und Kurzzeitvermietung.`,
    ctxBukit: (d: string) => `${d} — Bukit: Villen mit Meerblick auf den Klippen, Premiumsegment mit starker Mietnachfrage.`,
    ctxSanur: 'Sanur — familienfreundliche Villen für einen langfristigen Umzug an der ruhigen Ostküste.',
    ctxDefault: 'Villen auf Bali werden zum Wohnen, zum Vermieten und zum Weiterverkauf gekauft. Die liquidesten Lagen sind Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa) und Ubud. Die meisten Geschäfte sind Pachtverträge von 25–80 Jahren, die bei einem PPAT-Notar abgeschlossen werden.',
    titleAdj: (n: string) => `${n}-Zimmer`,
    titleNoun: 'Villen und Häuser',
    titleNounCap: 'Villen und Häuser',
    titleInDistrict: (d: string) => ` in ${d}`,
    titleMapTail: ' auf der Bali-Karte',
    titleListTail: ' auf Bali — Katalog',
    districtsHeading: 'Villen nach Lage',
    bedsStatusHeading: 'Nach Schlafzimmern und Status',
    bedroomsLabel: (n: string) => `${n}-Zimmer`,
    statusBuilding: 'Im Bau',
    statusBuilt: 'Fertiggestellt',
    villasInComplexes: 'Villen in Wohnanlagen',
    faqHeading: 'Häufig gestellte Fragen',
    faq: [
      { q: 'Worin unterscheidet sich eine Villa von einem Apartment?', a: 'Eine Villa ist ein freistehendes Haus auf eigenem Grundstück mit Pool und privatem Garten. Ein Apartment ist eine Einheit innerhalb einer gemeinsamen Anlage, meist ohne eigenes Grundstück.' },
      { q: 'Wie viel kostet eine Villa auf Bali?',           a: '1-Schlafzimmer-Villen beginnen bei 150–250 Tsd. $. 2–3-Schlafzimmer-Villen in Canggu/Bukit ab 350 Tsd. $. Premium-Villen mit Meerblick erreichen 1,5–3 Mio. $.' },
      { q: 'Kann ein Ausländer eine Villa auf Bali kaufen?',          a: 'Ja — über Leasehold (in der Regel 25–80 Jahre) oder über eine PT-PMA-Gesellschaft. Das Geschäft wird bei einem PPAT-Notar abgeschlossen.' },
      { q: 'Welche Rendite bringen Mietvillen?',          a: 'In Canggu und Bukit — 8–12% pro Jahr bei 70–80% Auslastung mit einer Verwaltungsgesellschaft. Die Saisonalität spielt eine Rolle: Dez.–März und Juli–Aug. sind Hochsaison.' },
      { q: 'Was sollte ich vor dem Kauf prüfen?',         a: 'Leasehold-Dauer und Verlängerung, PBG- / SLF-Genehmigungen, Grundstückszonierung, Wasser-/Stromanschluss, vorhandene Verwaltungsgesellschaft und den Eigentumsweg (PPAT-Notar).' },
    ],
  },
  zh: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (d: string[]) => `${d.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` ${n} 间卧室`,
    introBedsN: (a: string[]) => ` ${a.join('/')} 间卧室`,
    introMap: (where: string, beds: string) => `位于${where}的别墅和房屋${beds}，并在地图上标注。`,
    introList: (where: string, beds: string) => `位于${where}的别墅和房屋${beds}。`,
    introTail: ' 查看照片、地块与房屋面积、价格及详情。',
    ctxUbud: 'Ubud — 丛林与梯田间的别墅。适合希望远离海滩、享受私密与自然的买家。',
    ctxCanggu: (d: string) => `${d} — Canggu：适合冲浪、远程办公和短租的别墅。`,
    ctxBukit: (d: string) => `${d} — Bukit：悬崖上的海景别墅，租赁需求旺盛的高端板块。`,
    ctxSanur: 'Sanur — 适合家庭长期定居的别墅，位于宁静的东海岸。',
    ctxDefault: 'Bali 的别墅用于自住、出租和转售。流动性最强的地段是 Canggu（Berawa、Batu Bolong、Pererenan）、Bukit（Uluwatu、Pandawa）和 Ubud。大多数交易为 25–80 年的租赁产权，在 PPAT 公证人处完成。',
    titleAdj: (n: string) => `${n} 居室`,
    titleNoun: '别墅和房屋',
    titleNounCap: '别墅和房屋',
    titleInDistrict: (d: string) => ` 位于 ${d}`,
    titleMapTail: ' 在 Bali 地图上',
    titleListTail: ' 在 Bali — 目录',
    districtsHeading: '按地区浏览别墅',
    bedsStatusHeading: '按卧室数和状态',
    bedroomsLabel: (n: string) => `${n} 居室`,
    statusBuilding: '在建',
    statusBuilt: '现房',
    villasInComplexes: '住宅区内的别墅',
    faqHeading: '常见问题',
    faq: [
      { q: '别墅和公寓有什么区别？', a: '别墅是拥有独立地块、泳池和私家花园的独栋房屋。公寓是共享住宅区内的一个单元，通常没有自己的土地。' },
      { q: 'Bali 的别墅多少钱？',           a: '1 居室别墅起价 15–25 万美元。Canggu/Bukit 的 2–3 居室别墅起价 35 万美元。高端海景别墅可达 150–300 万美元。' },
      { q: '外国人能在 Bali 购买别墅吗？',          a: '可以 — 通过租赁产权（通常 25–80 年）或通过 PT PMA 公司。交易在 PPAT 公证人处完成。' },
      { q: '出租别墅的收益率是多少？',          a: '在 Canggu 和 Bukit — 由管理公司运营、入住率 70–80% 时，年收益率为 8–12%。季节性影响明显：12 月–3 月和 7 月–8 月为旺季。' },
      { q: '购买前应检查什么？',         a: '租赁期限及续期、PBG / SLF 许可、土地分区、水电接入、是否配有管理公司，以及产权路径（PPAT 公证人）。' },
    ],
  },
  nl: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (d: string[]) => `${d.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` met ${n} slaapkamer`,
    introBedsN: (a: string[]) => ` met ${a.join('/')} slaapkamers`,
    introMap: (where: string, beds: string) => `Villa's en huizen${beds} in ${where}, aangegeven op een kaart.`,
    introList: (where: string, beds: string) => `Villa's en huizen${beds} in ${where}.`,
    introTail: " Bekijk foto's, kavel- en huisoppervlakte, prijzen en details.",
    ctxUbud: "Ubud — villa's tussen jungle en rijstterrassen. Ideaal voor kopers die privacy en natuur zoeken, weg van het strand.",
    ctxCanggu: (d: string) => `${d} — Canggu: villa's voor surfen, thuiswerken en kortetermijnverhuur.`,
    ctxBukit: (d: string) => `${d} — Bukit: villa's met uitzicht op de kliffen, premiumsegment met sterke verhuurvraag.`,
    ctxSanur: "Sanur — gezinsvriendelijke villa's voor een langdurige verhuizing aan de rustige oostkust.",
    ctxDefault: "Villa's op Bali worden gekocht om in te wonen, te verhuren en door te verkopen. De meest liquide locaties zijn Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa) en Ubud. De meeste transacties zijn erfpacht van 25–80 jaar, afgesloten bij een PPAT-notaris.",
    titleAdj: (n: string) => `${n}-slaapkamer`,
    titleNoun: "villa's en huizen",
    titleNounCap: "Villa's en huizen",
    titleInDistrict: (d: string) => ` in ${d}`,
    titleMapTail: ' op de kaart van Bali',
    titleListTail: ' op Bali — catalogus',
    districtsHeading: "Villa's per regio",
    bedsStatusHeading: 'Op slaapkamers en status',
    bedroomsLabel: (n: string) => `${n}-slaapkamer`,
    statusBuilding: 'In aanbouw',
    statusBuilt: 'Opgeleverd',
    villasInComplexes: "Villa's in wooncomplexen",
    faqHeading: 'Veelgestelde vragen',
    faq: [
      { q: 'Wat is het verschil tussen een villa en een appartement?', a: 'Een villa is een vrijstaand huis op een eigen kavel met zwembad en privétuin. Een appartement is een unit binnen een gedeeld complex, meestal zonder eigen grond.' },
      { q: 'Hoeveel kost een villa op Bali?',           a: "Villa's met 1 slaapkamer beginnen bij $150–250k. Villa's met 2–3 slaapkamers in Canggu/Bukit beginnen bij $350k. Premium villa's met uitzicht bereiken $1,5–3 mln." },
      { q: 'Kan een buitenlander een villa op Bali kopen?',          a: 'Ja — via erfpacht (meestal 25–80 jaar) of via een PT PMA-vennootschap. De transactie wordt afgesloten bij een PPAT-notaris.' },
      { q: "Welk rendement leveren huurvilla's op?",          a: 'In Canggu en Bukit — 8–12% per jaar bij een bezetting van 70–80% met een beheermaatschappij. Seizoensinvloeden tellen mee: dec–mrt en jul–aug zijn piek.' },
      { q: 'Wat moet ik controleren voor aankoop?',         a: 'De erfpachtduur en verlenging, PBG- / SLF-vergunningen, bestemmingsplan van de grond, water-/elektriciteitsaansluiting, aanwezige beheermaatschappij en het eigendomstraject (PPAT-notaris).' },
    ],
  },
  ban: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (d: string[]) => `${d.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` madue ${n} kamar`,
    introBedsN: (a: string[]) => ` madue ${a.join('/')} kamar`,
    introMap: (where: string, beds: string) => `Vila lan umah${beds} ring ${where}, katandain ring peta.`,
    introList: (where: string, beds: string) => `Vila lan umah${beds} ring ${where}.`,
    introTail: ' Cingakin foto, luas tanah lan umah, aji, lan detailnyane.',
    ctxUbud: 'Ubud — vila ring tengah alas lan sawah terasering. Cocok anggen sane ngrereh privasi lan alam doh saking pasih.',
    ctxCanggu: (d: string) => `${d} — Canggu: vila anggen selancar, makarya jarak jaoh, lan sewa jangka bawak.`,
    ctxBukit: (d: string) => `${d} — Bukit: vila madue pemandangan ring duur tebing, segmen premium sane akeh karerehin anggen sewa.`,
    ctxSanur: 'Sanur — vila sane becik anggen kulawarga sane jagi magingsir suwe ring pasisi kangin sane tenang.',
    ctxDefault: 'Vila ring Bali katumbas anggen magenah, kasewaang, lan kaadol malih. Genah sane pinih likuid inggih punika Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa), lan Ubud. Akehan transaksi inggih punika hak sewa 25–80 warsa sane kapuputang ring notaris PPAT.',
    titleAdj: (n: string) => `${n} kamar`,
    titleNoun: 'vila lan umah',
    titleNounCap: 'Vila lan umah',
    titleInDistrict: (d: string) => ` ring ${d}`,
    titleMapTail: ' ring peta Bali',
    titleListTail: ' ring Bali — katalog',
    districtsHeading: 'Vila manut genah',
    bedsStatusHeading: 'Manut kamar lan status',
    bedroomsLabel: (n: string) => `${n} kamar`,
    statusBuilding: 'Sedeng kawangun',
    statusBuilt: 'Puput',
    villasInComplexes: 'Vila ring kompleks',
    faqHeading: 'Patakon sane sering katakenang',
    faq: [
      { q: 'Napi bina vila sareng apartemen?', a: 'Vila inggih punika umah madiri ring tanahnyane niri madue kolam renang lan taman pribadi. Apartemen inggih punika unit ring kompleks sareng-sareng, biasane tanpa tanah niri.' },
      { q: 'Kuda ajin vila ring Bali?',           a: 'Vila 1 kamar ngawit saking $150–250 rb. Vila 2–3 kamar ring Canggu/Bukit ngawit saking $350 rb. Vila premium madue pemandangan ngantos $1,5–3 jt.' },
      { q: 'Punapi anak asing dados numbas vila ring Bali?',          a: 'Nggih — nganggen hak sewa (biasane 25–80 warsa) utawi nganggen perusahaan PT PMA. Transaksi kapuputang ring notaris PPAT.' },
      { q: 'Kuda imbal hasil vila sewa?',          a: 'Ring Canggu lan Bukit — 8–12% sabilang warsa ring okupansi 70–80% sareng perusahaan pengelola. Musim mapengaruh: Des–Mar lan Jul–Agu inggih punika puncaknyane.' },
      { q: 'Napi sane patut kacingak sadurung numbas?',         a: 'Masa hak sewa lan perpanjangan, ijin PBG / SLF, zonasi tanah, sambungan toya/listrik, wentennyane perusahaan pengelola, lan margi kepemilikan (notaris PPAT).' },
    ],
  },
  pl: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (d: string[]) => `${d.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` z ${n} sypialnią`,
    introBedsN: (a: string[]) => ` z ${a.join('/')} sypialniami`,
    introMap: (where: string, beds: string) => `Wille i domy${beds} w ${where}, zaznaczone na mapie.`,
    introList: (where: string, beds: string) => `Wille i domy${beds} w ${where}.`,
    introTail: ' Zobacz zdjęcia, powierzchnię działki i domu, ceny oraz szczegóły.',
    ctxUbud: 'Ubud — wille wśród dżungli i tarasów ryżowych. Najlepsze dla kupujących, którzy szukają prywatności i natury z dala od plaży.',
    ctxCanggu: (d: string) => `${d} — Canggu: wille do surfingu, pracy zdalnej i najmu krótkoterminowego.`,
    ctxBukit: (d: string) => `${d} — Bukit: wille z widokiem na klifach, segment premium z silnym popytem na najem.`,
    ctxSanur: 'Sanur — przyjazne rodzinom wille pod długoterminową przeprowadzkę na spokojnym wschodnim wybrzeżu.',
    ctxDefault: 'Wille na Bali kupuje się na własne życie, pod wynajem i pod odsprzedaż. Najbardziej płynne lokalizacje to Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa) i Ubud. Większość transakcji to leasehold na 25–80 lat zawierany u notariusza PPAT.',
    titleAdj: (n: string) => `${n}-pokojowe`,
    titleNoun: 'wille i domy',
    titleNounCap: 'Wille i domy',
    titleInDistrict: (d: string) => ` w ${d}`,
    titleMapTail: ' na mapie Bali',
    titleListTail: ' na Bali — katalog',
    districtsHeading: 'Wille według rejonu',
    bedsStatusHeading: 'Według sypialni i statusu',
    bedroomsLabel: (n: string) => `${n}-pokojowe`,
    statusBuilding: 'W budowie',
    statusBuilt: 'Gotowe',
    villasInComplexes: 'Wille w kompleksach',
    faqHeading: 'Najczęściej zadawane pytania',
    faq: [
      { q: 'Czym różni się willa od apartamentu?', a: 'Willa to wolnostojący dom na własnej działce z basenem i prywatnym ogrodem. Apartament to lokal w ramach wspólnego kompleksu, zwykle bez własnej ziemi.' },
      { q: 'Ile kosztuje willa na Bali?',           a: 'Wille 1-pokojowe zaczynają się od 150–250 tys. $. Wille 2–3-pokojowe w Canggu/Bukit od 350 tys. $. Wille premium z widokiem sięgają 1,5–3 mln $.' },
      { q: 'Czy obcokrajowiec może kupić willę na Bali?',          a: 'Tak — poprzez leasehold (zwykle 25–80 lat) lub przez spółkę PT PMA. Transakcja jest zawierana u notariusza PPAT.' },
      { q: 'Jaką rentowność dają wille pod wynajem?',          a: 'W Canggu i na Bukit — 8–12% rocznie przy obłożeniu 70–80% z firmą zarządzającą. Sezonowość ma znaczenie: grudzień–marzec i lipiec–sierpień to szczyt.' },
      { q: 'Co warto sprawdzić przed zakupem?',         a: 'Okres leasehold i jego przedłużenie, pozwolenia PBG / SLF, przeznaczenie działki, przyłącza wody/prądu, obecność firmy zarządzającej oraz ścieżkę własności (notariusz PPAT).' },
    ],
  },
  uk: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (d: string[]) => `${d.join(', ')}`,
    introWhereBali: 'Балі',
    introBeds1: (n: string) => ` з ${n} спальнею`,
    introBedsN: (a: string[]) => ` з ${a.join('/')} спальнями`,
    introMap: (where: string, beds: string) => `Вілли й будинки${beds} у ${where}, позначені на карті.`,
    introList: (where: string, beds: string) => `Вілли й будинки${beds} у ${where}.`,
    introTail: ' Дивіться фото, площу будинку та ділянки, ціни й характеристики.',
    ctxUbud: 'Убуд — вілли серед джунглів і рисових терас. Найкраще для покупців, які прагнуть приватності та природи подалі від пляжу.',
    ctxCanggu: (d: string) => `${d} — Чангу: вілли для серфінгу, віддаленої роботи та подобової оренди.`,
    ctxBukit: (d: string) => `${d} — Букіт: видові вілли на урвищах, преміальний сегмент із високим попитом на оренду.`,
    ctxSanur: 'Санур — сімейні вілли для довгострокового переїзду на спокійному східному узбережжі.',
    ctxDefault: 'Вілли на Балі купують для життя, під оренду та для перепродажу. Найліквідніші локації — Чангу (Berawa, Batu Bolong, Pererenan), Букіт (Uluwatu, Pandawa) та Убуд. Більшість угод — лізхолд на 25–80 років, що оформлюється в нотаріуса PPAT.',
    titleAdj: (n: string) => `${n}-кімнатні`,
    titleNoun: 'вілли й будинки',
    titleNounCap: 'Вілли й будинки',
    titleInDistrict: (d: string) => ` у ${d}`,
    titleMapTail: ' на карті Балі',
    titleListTail: ' на Балі — каталог',
    districtsHeading: 'Вілли за районом',
    bedsStatusHeading: 'За спальнями та статусом',
    bedroomsLabel: (n: string) => `${n}-кімнатні`,
    statusBuilding: 'Що будуються',
    statusBuilt: 'Готові',
    villasInComplexes: 'Вілли в комплексах',
    faqHeading: 'Часті запитання',
    faq: [
      { q: 'Чим вілла відрізняється від апартаментів?', a: 'Вілла — окремий будинок на власній ділянці з басейном і приватним двором. Апартаменти — юніт у спільному комплексі, зазвичай без власної землі.' },
      { q: 'Скільки коштує вілла на Балі?',           a: 'Вілли 1-кімнатні стартують від 150–250 тис. $. Вілли 2–3-кімнатні в Чангу/Букіті — від 350 тис. $. Преміальні видові вілли сягають 1,5–3 млн $.' },
      { q: 'Чи може іноземець купити віллу на Балі?',          a: 'Так — через лізхолд (зазвичай 25–80 років) або через компанію PT PMA. Угода оформлюється в нотаріуса PPAT.' },
      { q: 'Яку дохідність дають вілли під оренду?',          a: 'У Чангу та на Букіті — 8–12% річних за завантаження 70–80% із керуючою компанією. Сезонність важлива: грудень–березень і липень–серпень — пік.' },
      { q: 'Що важливо перевірити перед купівлею?',         a: 'Строк лізхолду та умови продовження, дозволи PBG / SLF, зонування ділянки, підключення води/електрики, наявність керуючої компанії та шлях до власності (нотаріус PPAT).' },
    ],
  },
} as const

function intro(f: VillaFilterState, variant: Variant, lang: Lang): string {
  const C = pickCopy(COPY, lang)
  const where =
    f.district.length === 1 ? C.introWhereDistrict(f.district[0]) :
    f.district.length > 1 ? C.introWhereDistricts(f.district) :
    C.introWhereBali
  const beds = f.bedrooms.length === 1 ? C.introBeds1(f.bedrooms[0])
    : f.bedrooms.length > 1 ? C.introBedsN(f.bedrooms) : ''
  const lead = variant === 'map' ? C.introMap(where, beds) : C.introList(where, beds)
  return lead + C.introTail
}

function context(f: VillaFilterState, lang: Lang): string {
  const C = pickCopy(COPY, lang)
  const dist = f.district[0]
  if (dist === 'Ubud') return C.ctxUbud
  if (dist === 'Berawa' || dist === 'Batu Bolong' || dist === 'Pererenan') return C.ctxCanggu(dist)
  if (dist === 'Uluwatu' || dist === 'Pandawa' || dist === 'Melasti') return C.ctxBukit(dist)
  if (dist === 'Sanur') return C.ctxSanur
  return C.ctxDefault
}

function buildSeoTitle(f: VillaFilterState, variant: Variant, lang: Lang): string {
  const C = pickCopy(COPY, lang)
  const adj: string[] = []
  if (f.bedrooms.length === 1) adj.push(C.titleAdj(f.bedrooms[0]))
  let s = adj.length ? `${adj.join(' ')} ${C.titleNoun}` : C.titleNounCap
  if (f.district.length === 1) s += C.titleInDistrict(f.district[0])
  s += variant === 'map' ? C.titleMapTail : C.titleListTail
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function VillasSeoContent({
  filters,
  variant = 'list',
  lang = 'ru',
}: {
  filters: VillaFilterState
  variant?: Variant
  lang?: Lang
}) {
  const C = pickCopy(COPY, lang)
  const h2 = buildSeoTitle(filters, variant, lang)
  const currentDistrict = filters.district[0]
  const districts = POPULAR_DISTRICTS.filter(d => d !== currentDistrict).slice(0, 6)
    .map(d => ({ name: d, slug: DISTRICT_TO_SLUG[d] })).filter(x => x.slug)
  const villasRoot = switchLangPath('/ru/villy', lang)
  const complexesVillasRoot = switchLangPath('/ru/zhilye-kompleksy/villy', lang)

  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: C.faq.map(item => ({
      '@type': 'Question', name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <section className="mt-12 pt-10 border-t border-[var(--color-border)]">
      <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[var(--color-text)] mb-4">{h2}</h2>
      <div className="prose-balinsky max-w-3xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
        <p>{intro(filters, variant, lang)}</p>
        <p className="text-[var(--color-text-muted)]">{context(filters, lang)}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{C.districtsHeading}</h3>
          <ul className="flex flex-wrap gap-2">
            {districts.map(d => (
              <li key={d.slug}>
                <Link
                  href={`${villasRoot}/${d.slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{C.bedsStatusHeading}</h3>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(BEDROOM_TO_SLUG).map(([n, slug]) => (
              <li key={slug}>
                <Link
                  href={`${villasRoot}/${slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {C.bedroomsLabel(n)}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`${villasRoot}/${STATUS_TO_SLUG.building}`}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {C.statusBuilding}
              </Link>
            </li>
            <li>
              <Link
                href={`${villasRoot}/${STATUS_TO_SLUG.built}`}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {C.statusBuilt}
              </Link>
            </li>
            <li>
              <Link
                href={complexesVillasRoot}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {C.villasInComplexes}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12">
        <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-4">{C.faqHeading}</h3>
        <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
          {C.faq.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-medium text-[var(--color-text)]">
                {item.q}
                <span className="text-[var(--color-text-muted)] text-[20px] leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  )
}
