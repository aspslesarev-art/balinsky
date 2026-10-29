// Тексты страницы подборки для клиента (/p/<token>) на всех языках сайта.
// Язык — по настройкам телефона (Accept-Language), клиент может сменить его
// сам; ?lang= в адресе переносит выбор на страницы объектов.

import { LANGS, type Lang } from '@/lib/i18n'
import { districtNamePairs } from '@/lib/district-ru'

/** ?lang= из адреса, иначе первый подходящий язык телефона, иначе английский. */
export function resolveClientLang(param: string | string[] | undefined, acceptLanguage: string | null): Lang {
  const p = (Array.isArray(param) ? param[0] : param)?.toLowerCase()
  const known = (x: string): Lang | null => {
    const code = x === 'ua' ? 'uk' : x
    return (LANGS as readonly string[]).includes(code) ? (code as Lang) : null
  }
  if (p && known(p)) return known(p)!
  for (const part of (acceptLanguage ?? '').split(',')) {
    const code = part.trim().split(';')[0].split('-')[0].toLowerCase()
    // Балийский не выбираем сам: телефонов на нём не бывает, а читать его труднее индонезийского.
    if (code && code !== 'ban' && known(code)) return known(code)!
  }
  return 'en'
}

const LATIN = new Map(districtNamePairs().map(([lat, ru]) => [ru, lat]))
/** Район из снимка (по-русски) — латиницей для всех языков, кроме русского и украинского. */
export function districtFor(ru: string | null, lang: Lang): string | null {
  if (!ru || lang === 'ru' || lang === 'uk') return ru
  return LATIN.get(ru) ?? ru
}

const slav = (one: string, few: string, many: string) => (n: number) => {
  const m10 = n % 10, m100 = n % 100
  const w = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many
  return `${n} ${w}`
}
const simple = (one: string, many: string) => (n: number) => `${n} ${n === 1 ? one : many}`

type Copy = {
  agentSub: string; telegram: string; collection: string; objects: (n: number) => string
  empty: string; more: string; ask: string; likeTitle: string; likeSub: string; write: string
  source: string; lease: (n: number) => string; noteSr: string; tabsAria: string; cards: string; compare: string
  closedTitle: string; closedSub: (name: string) => string
  cmpTitle: (n: number) => string; cmpBest: string; cmpScroll: string; cmpDiff: string; cmpObject: string
  gPrice: string; gObject: string; gDocs: string; gIncome: string
  rPrice: string; rPriceM2: string; rKind: string; rDistrict: string; rBedrooms: string; rArea: string; rLand: string
  rLease: string; rPermit: string; rBuild: string; rYield: string
  noData: string; moreShort: string; yieldNote: string; years: (n: number) => string
  kind: { villa: string; apartment: string }
  status: { built: string; building: string; order: string }
  back: string; itemTitle: string; langLabel: string
}

const COPY: Record<Lang, Copy> = {
  ru: {
    agentSub: 'ваш агент на Бали', telegram: 'Написать в Telegram', collection: 'Подборка', objects: slav('объект', 'объекта', 'объектов'),
    empty: 'Агент ещё собирает объекты - загляните чуть позже.', more: 'Подробнее об объекте', ask: 'Спросить агента',
    likeTitle: 'Понравилось что-то?', likeSub: 'Напишите номер объекта - агент организует онлайн-показ или встречу на месте.', write: 'Написать агенту',
    source: 'Данные по объектам - balinsky.info, аналитика недвижимости Бали', lease: n => `Лизхолд ${slav('год', 'года', 'лет')(n)}`, noteSr: 'Заметка агента: ',
    tabsAria: 'Как показать объекты', cards: 'Карточки', compare: 'Сравнение',
    closedTitle: 'Подборка закрыта', closedSub: name => `${name} закрыл эту ссылку. Напишите агенту - пришлёт новую.`,
    cmpTitle: n => `Сравниваем ${slav('объект', 'объекта', 'объектов')(n)}`, cmpBest: 'Зелёным - лучшее в строке.', cmpScroll: ' Листайте таблицу вбок →', cmpDiff: 'Только различия', cmpObject: 'Объект',
    gPrice: 'Цена', gObject: 'Объект', gDocs: 'Документы и стройка', gIncome: 'Доход',
    rPrice: 'Цена', rPriceM2: 'Цена за м²', rKind: 'Тип', rDistrict: 'Район', rBedrooms: 'Спальни', rArea: 'Площадь', rLand: 'Земля',
    rLease: 'Лизхолд', rPermit: 'Разрешение', rBuild: 'Стройка', rYield: 'Доходность до налогов',
    noData: 'нет данных', moreShort: 'Подробнее', yieldNote: 'Доходность - наш расчёт по реальным ставкам соседей на Booking и Airbnb, до налогов. Это оценка, а не обещание дохода.',
    years: slav('год', 'года', 'лет'), kind: { villa: 'Вилла', apartment: 'Апартаменты' },
    status: { built: 'Построен', building: 'Строится', order: 'Под заказ' },
    back: '← Вся подборка', itemTitle: 'Объект из подборки', langLabel: 'Язык',
  },
  uk: {
    agentSub: 'ваш агент на Балі', telegram: 'Написати в Telegram', collection: 'Добірка', objects: slav("об'єкт", "об'єкти", "об'єктів"),
    empty: "Агент ще збирає об'єкти - загляньте трохи пізніше.", more: "Докладніше про об'єкт", ask: 'Запитати агента',
    likeTitle: 'Щось сподобалося?', likeSub: "Напишіть номер об'єкта - агент організує онлайн-показ або зустріч на місці.", write: 'Написати агенту',
    source: "Дані про об'єкти - balinsky.info, аналітика нерухомості Балі", lease: n => `Лізхолд ${slav('рік', 'роки', 'років')(n)}`, noteSr: 'Нотатка агента: ',
    tabsAria: "Як показати об'єкти", cards: 'Картки', compare: 'Порівняння',
    closedTitle: 'Добірку закрито', closedSub: name => `${name} закрив це посилання. Напишіть агенту - надішле нове.`,
    cmpTitle: n => `Порівнюємо ${slav("об'єкт", "об'єкти", "об'єктів")(n)}`, cmpBest: 'Зеленим - найкраще в рядку.', cmpScroll: ' Гортайте таблицю вбік →', cmpDiff: 'Лише відмінності', cmpObject: "Об'єкт",
    gPrice: 'Ціна', gObject: "Об'єкт", gDocs: 'Документи й будівництво', gIncome: 'Дохід',
    rPrice: 'Ціна', rPriceM2: 'Ціна за м²', rKind: 'Тип', rDistrict: 'Район', rBedrooms: 'Спальні', rArea: 'Площа', rLand: 'Земля',
    rLease: 'Лізхолд', rPermit: 'Дозвіл', rBuild: 'Будівництво', rYield: 'Дохідність до податків',
    noData: 'немає даних', moreShort: 'Докладніше', yieldNote: 'Дохідність - наш розрахунок за реальними ставками сусідів на Booking і Airbnb, до податків. Це оцінка, а не обіцянка доходу.',
    years: slav('рік', 'роки', 'років'), kind: { villa: 'Вілла', apartment: 'Апартаменти' },
    status: { built: 'Збудовано', building: 'Будується', order: 'Під замовлення' },
    back: '← Уся добірка', itemTitle: "Об'єкт із добірки", langLabel: 'Мова',
  },
  en: {
    agentSub: 'your agent in Bali', telegram: 'Message on Telegram', collection: 'Selection', objects: simple('property', 'properties'),
    empty: 'Your agent is still adding properties - check back a little later.', more: 'Property details', ask: 'Ask the agent',
    likeTitle: 'Like something?', likeSub: 'Send the property number - your agent will set up an online or in-person viewing.', write: 'Message the agent',
    source: 'Property data - balinsky.info, Bali real estate analytics', lease: n => `Leasehold ${n} years`, noteSr: "Agent's note: ",
    tabsAria: 'How to show the properties', cards: 'Cards', compare: 'Compare',
    closedTitle: 'This selection is closed', closedSub: name => `${name} has closed this link. Message your agent for a new one.`,
    cmpTitle: n => `Comparing ${simple('property', 'properties')(n)}`, cmpBest: 'Green marks the best value in each row.', cmpScroll: ' Swipe the table sideways →', cmpDiff: 'Differences only', cmpObject: 'Property',
    gPrice: 'Price', gObject: 'Property', gDocs: 'Documents and construction', gIncome: 'Income',
    rPrice: 'Price', rPriceM2: 'Price per m²', rKind: 'Type', rDistrict: 'Area', rBedrooms: 'Bedrooms', rArea: 'Size', rLand: 'Land',
    rLease: 'Leasehold', rPermit: 'Permit', rBuild: 'Construction', rYield: 'Yield before tax',
    noData: 'no data', moreShort: 'Details', yieldNote: 'Yield is our estimate from real rates of neighbouring listings on Booking and Airbnb, before tax. It is an estimate, not a promise of income.',
    years: n => `${n} years`, kind: { villa: 'Villa', apartment: 'Apartment' },
    status: { built: 'Completed', building: 'Under construction', order: 'Built to order' },
    back: '← Whole selection', itemTitle: 'Property from the selection', langLabel: 'Language',
  },
  id: {
    agentSub: 'agen Anda di Bali', telegram: 'Kirim pesan di Telegram', collection: 'Pilihan', objects: n => `${n} properti`,
    empty: 'Agen masih menambahkan properti - silakan cek lagi nanti.', more: 'Detail properti', ask: 'Tanya agen',
    likeTitle: 'Ada yang Anda suka?', likeSub: 'Kirim nomor properti - agen akan mengatur kunjungan online atau langsung.', write: 'Hubungi agen',
    source: 'Data properti - balinsky.info, analitik properti Bali', lease: n => `Hak sewa ${n} tahun`, noteSr: 'Catatan agen: ',
    tabsAria: 'Cara menampilkan properti', cards: 'Kartu', compare: 'Bandingkan',
    closedTitle: 'Pilihan ini sudah ditutup', closedSub: name => `${name} telah menutup tautan ini. Hubungi agen untuk tautan baru.`,
    cmpTitle: n => `Membandingkan ${n} properti`, cmpBest: 'Hijau menandai nilai terbaik di setiap baris.', cmpScroll: ' Geser tabel ke samping →', cmpDiff: 'Hanya perbedaan', cmpObject: 'Properti',
    gPrice: 'Harga', gObject: 'Properti', gDocs: 'Dokumen dan pembangunan', gIncome: 'Pendapatan',
    rPrice: 'Harga', rPriceM2: 'Harga per m²', rKind: 'Tipe', rDistrict: 'Kawasan', rBedrooms: 'Kamar tidur', rArea: 'Luas', rLand: 'Tanah',
    rLease: 'Hak sewa', rPermit: 'Izin', rBuild: 'Pembangunan', rYield: 'Imbal hasil sebelum pajak',
    noData: 'tidak ada data', moreShort: 'Detail', yieldNote: 'Imbal hasil adalah perkiraan kami dari tarif nyata properti sekitar di Booking dan Airbnb, sebelum pajak. Ini perkiraan, bukan janji pendapatan.',
    years: n => `${n} tahun`, kind: { villa: 'Vila', apartment: 'Apartemen' },
    status: { built: 'Selesai dibangun', building: 'Sedang dibangun', order: 'Dibangun sesuai pesanan' },
    back: '← Semua pilihan', itemTitle: 'Properti dari pilihan', langLabel: 'Bahasa',
  },
  ban: {
    agentSub: 'agen Ragane ring Bali', telegram: 'Kirim pesan ring Telegram', collection: 'Pilihan', objects: n => `${n} properti`,
    empty: 'Agen kantun nambahin properti - cingak malih benjang.', more: 'Detail properti', ask: 'Takenin agen',
    likeTitle: 'Wenten sane kayun?', likeSub: 'Kirim nomer properti - agen jagi ngatur kunjungan online utawi langsung.', write: 'Hubungi agen',
    source: 'Data properti - balinsky.info, analitik properti Bali', lease: n => `Hak sewa ${n} warsa`, noteSr: 'Catetan agen: ',
    tabsAria: 'Cara ngicenin properti', cards: 'Kartu', compare: 'Bandingang',
    closedTitle: 'Pilihan puniki sampun katutup', closedSub: name => `${name} sampun nutup tautan puniki. Hubungi agen anggen tautan anyar.`,
    cmpTitle: n => `Ngabandingang ${n} properti`, cmpBest: 'Gadang nyiriang sane pinih becik ring suang-suang baris.', cmpScroll: ' Geser tabel ka samping →', cmpDiff: 'Wantah sane mabinayan', cmpObject: 'Properti',
    gPrice: 'Aji', gObject: 'Properti', gDocs: 'Dokumen lan pawangunan', gIncome: 'Pikolih',
    rPrice: 'Aji', rPriceM2: 'Aji per m²', rKind: 'Tipe', rDistrict: 'Wewidangan', rBedrooms: 'Kamar pules', rArea: 'Linggah', rLand: 'Tanah',
    rLease: 'Hak sewa', rPermit: 'Izin', rBuild: 'Pawangunan', rYield: 'Pikolih sadurung pajak',
    noData: 'nenten wenten data', moreShort: 'Detail', yieldNote: 'Pikolih punika perkiraan iraga saking tarif nyata properti ring sampingne ring Booking lan Airbnb, sadurung pajak. Puniki perkiraan, nenten janji pikolih.',
    years: n => `${n} warsa`, kind: { villa: 'Vila', apartment: 'Apartemen' },
    status: { built: 'Sampun puput', building: 'Kantun kawangun', order: 'Kawangun manut pesenan' },
    back: '← Sami pilihan', itemTitle: 'Properti saking pilihan', langLabel: 'Basa',
  },
  fr: {
    agentSub: 'votre agent à Bali', telegram: 'Écrire sur Telegram', collection: 'Sélection', objects: simple('bien', 'biens'),
    empty: "Votre agent ajoute encore des biens - revenez un peu plus tard.", more: 'Détails du bien', ask: "Demander à l'agent",
    likeTitle: 'Un bien vous plaît ?', likeSub: "Envoyez le numéro du bien - votre agent organisera une visite en ligne ou sur place.", write: "Écrire à l'agent",
    source: 'Données des biens - balinsky.info, analyse immobilière de Bali', lease: n => `Bail ${n} ans`, noteSr: "Note de l'agent : ",
    tabsAria: 'Affichage des biens', cards: 'Fiches', compare: 'Comparer',
    closedTitle: 'Cette sélection est fermée', closedSub: name => `${name} a fermé ce lien. Écrivez à votre agent pour en obtenir un nouveau.`,
    cmpTitle: n => `Comparaison de ${simple('bien', 'biens')(n)}`, cmpBest: 'En vert : la meilleure valeur de chaque ligne.', cmpScroll: ' Faites défiler le tableau →', cmpDiff: 'Différences seulement', cmpObject: 'Bien',
    gPrice: 'Prix', gObject: 'Bien', gDocs: 'Documents et travaux', gIncome: 'Revenus',
    rPrice: 'Prix', rPriceM2: 'Prix au m²', rKind: 'Type', rDistrict: 'Quartier', rBedrooms: 'Chambres', rArea: 'Surface', rLand: 'Terrain',
    rLease: 'Bail', rPermit: 'Permis', rBuild: 'Travaux', rYield: 'Rendement avant impôts',
    noData: 'pas de données', moreShort: 'Détails', yieldNote: "Le rendement est notre estimation d'après les tarifs réels des biens voisins sur Booking et Airbnb, avant impôts. C'est une estimation, pas une promesse de revenu.",
    years: n => `${n} ans`, kind: { villa: 'Villa', apartment: 'Appartement' },
    status: { built: 'Livré', building: 'En construction', order: 'Sur commande' },
    back: '← Toute la sélection', itemTitle: 'Bien de la sélection', langLabel: 'Langue',
  },
  de: {
    agentSub: 'Ihr Makler auf Bali', telegram: 'Auf Telegram schreiben', collection: 'Auswahl', objects: simple('Objekt', 'Objekte'),
    empty: 'Ihr Makler stellt die Objekte noch zusammen - schauen Sie bald wieder vorbei.', more: 'Objektdetails', ask: 'Makler fragen',
    likeTitle: 'Gefällt Ihnen etwas?', likeSub: 'Schicken Sie die Objektnummer - Ihr Makler organisiert eine Online- oder Vor-Ort-Besichtigung.', write: 'Makler schreiben',
    source: 'Objektdaten - balinsky.info, Immobilienanalyse Bali', lease: n => `Pacht ${n} Jahre`, noteSr: 'Notiz des Maklers: ',
    tabsAria: 'Darstellung der Objekte', cards: 'Karten', compare: 'Vergleich',
    closedTitle: 'Diese Auswahl ist geschlossen', closedSub: name => `${name} hat diesen Link geschlossen. Schreiben Sie Ihrem Makler für einen neuen.`,
    cmpTitle: n => `Vergleich von ${simple('Objekt', 'Objekten')(n)}`, cmpBest: 'Grün markiert den besten Wert jeder Zeile.', cmpScroll: ' Tabelle seitlich wischen →', cmpDiff: 'Nur Unterschiede', cmpObject: 'Objekt',
    gPrice: 'Preis', gObject: 'Objekt', gDocs: 'Dokumente und Bau', gIncome: 'Ertrag',
    rPrice: 'Preis', rPriceM2: 'Preis pro m²', rKind: 'Typ', rDistrict: 'Lage', rBedrooms: 'Schlafzimmer', rArea: 'Fläche', rLand: 'Grundstück',
    rLease: 'Pacht', rPermit: 'Genehmigung', rBuild: 'Bau', rYield: 'Rendite vor Steuern',
    noData: 'keine Daten', moreShort: 'Details', yieldNote: 'Die Rendite ist unsere Schätzung auf Basis realer Preise benachbarter Objekte auf Booking und Airbnb, vor Steuern. Eine Schätzung, kein Ertragsversprechen.',
    years: n => `${n} Jahre`, kind: { villa: 'Villa', apartment: 'Apartment' },
    status: { built: 'Fertiggestellt', building: 'Im Bau', order: 'Auf Bestellung' },
    back: '← Ganze Auswahl', itemTitle: 'Objekt aus der Auswahl', langLabel: 'Sprache',
  },
  nl: {
    agentSub: 'uw makelaar op Bali', telegram: 'Bericht via Telegram', collection: 'Selectie', objects: simple('object', 'objecten'),
    empty: 'Uw makelaar voegt nog objecten toe - kijk straks nog eens.', more: 'Objectdetails', ask: 'Vraag de makelaar',
    likeTitle: 'Iets gevonden?', likeSub: 'Stuur het objectnummer - uw makelaar regelt een bezichtiging online of ter plekke.', write: 'Bericht aan makelaar',
    source: 'Objectgegevens - balinsky.info, vastgoedanalyse Bali', lease: n => `Erfpacht ${n} jaar`, noteSr: 'Notitie van de makelaar: ',
    tabsAria: 'Weergave van objecten', cards: 'Kaarten', compare: 'Vergelijken',
    closedTitle: 'Deze selectie is gesloten', closedSub: name => `${name} heeft deze link gesloten. Vraag uw makelaar om een nieuwe.`,
    cmpTitle: n => `${simple('object', 'objecten')(n)} vergeleken`, cmpBest: 'Groen is de beste waarde per rij.', cmpScroll: ' Veeg de tabel opzij →', cmpDiff: 'Alleen verschillen', cmpObject: 'Object',
    gPrice: 'Prijs', gObject: 'Object', gDocs: 'Documenten en bouw', gIncome: 'Inkomsten',
    rPrice: 'Prijs', rPriceM2: 'Prijs per m²', rKind: 'Type', rDistrict: 'Gebied', rBedrooms: 'Slaapkamers', rArea: 'Oppervlakte', rLand: 'Grond',
    rLease: 'Erfpacht', rPermit: 'Vergunning', rBuild: 'Bouw', rYield: 'Rendement voor belasting',
    noData: 'geen gegevens', moreShort: 'Details', yieldNote: 'Het rendement is onze schatting op basis van echte prijzen van objecten in de buurt op Booking en Airbnb, voor belasting. Een schatting, geen belofte.',
    years: n => `${n} jaar`, kind: { villa: 'Villa', apartment: 'Appartement' },
    status: { built: 'Opgeleverd', building: 'In aanbouw', order: 'Op bestelling' },
    back: '← Hele selectie', itemTitle: 'Object uit de selectie', langLabel: 'Taal',
  },
  pl: {
    agentSub: 'Twój agent na Bali', telegram: 'Napisz na Telegramie', collection: 'Wybór', objects: slav('obiekt', 'obiekty', 'obiektów'),
    empty: 'Agent wciąż dodaje obiekty - zajrzyj trochę później.', more: 'Szczegóły obiektu', ask: 'Zapytaj agenta',
    likeTitle: 'Coś Ci się spodobało?', likeSub: 'Wyślij numer obiektu - agent zorganizuje oglądanie online lub na miejscu.', write: 'Napisz do agenta',
    source: 'Dane o obiektach - balinsky.info, analityka nieruchomości Bali', lease: n => `Dzierżawa ${slav('rok', 'lata', 'lat')(n)}`, noteSr: 'Notatka agenta: ',
    tabsAria: 'Sposób wyświetlania obiektów', cards: 'Karty', compare: 'Porównanie',
    closedTitle: 'Ten wybór jest zamknięty', closedSub: name => `${name} zamknął ten link. Napisz do agenta po nowy.`,
    cmpTitle: n => `Porównujemy ${slav('obiekt', 'obiekty', 'obiektów')(n)}`, cmpBest: 'Na zielono - najlepsza wartość w wierszu.', cmpScroll: ' Przesuń tabelę w bok →', cmpDiff: 'Tylko różnice', cmpObject: 'Obiekt',
    gPrice: 'Cena', gObject: 'Obiekt', gDocs: 'Dokumenty i budowa', gIncome: 'Dochód',
    rPrice: 'Cena', rPriceM2: 'Cena za m²', rKind: 'Typ', rDistrict: 'Okolica', rBedrooms: 'Sypialnie', rArea: 'Powierzchnia', rLand: 'Działka',
    rLease: 'Dzierżawa', rPermit: 'Pozwolenie', rBuild: 'Budowa', rYield: 'Rentowność przed podatkiem',
    noData: 'brak danych', moreShort: 'Szczegóły', yieldNote: 'Rentowność to nasze wyliczenie na podstawie rzeczywistych stawek sąsiednich obiektów na Booking i Airbnb, przed podatkiem. To szacunek, a nie obietnica dochodu.',
    years: slav('rok', 'lata', 'lat'), kind: { villa: 'Willa', apartment: 'Apartament' },
    status: { built: 'Wybudowany', building: 'W budowie', order: 'Na zamówienie' },
    back: '← Cały wybór', itemTitle: 'Obiekt z wyboru', langLabel: 'Język',
  },
  zh: {
    agentSub: '您在巴厘岛的经纪人', telegram: '在 Telegram 上联系', collection: '精选', objects: n => `${n} 套房产`,
    empty: '经纪人仍在添加房产，请稍后再来看看。', more: '房产详情', ask: '咨询经纪人',
    likeTitle: '有喜欢的吗？', likeSub: '发送房产编号，经纪人会安排线上或实地看房。', write: '联系经纪人',
    source: '房产数据来自 balinsky.info，巴厘岛房地产分析', lease: n => `租赁产权 ${n} 年`, noteSr: '经纪人备注：',
    tabsAria: '房产显示方式', cards: '卡片', compare: '对比',
    closedTitle: '此精选已关闭', closedSub: name => `${name} 已关闭此链接。请联系经纪人获取新链接。`,
    cmpTitle: n => `对比 ${n} 套房产`, cmpBest: '绿色标出每行的最佳数值。', cmpScroll: ' 左右滑动表格 →', cmpDiff: '仅显示差异', cmpObject: '房产',
    gPrice: '价格', gObject: '房产', gDocs: '文件与施工', gIncome: '收益',
    rPrice: '价格', rPriceM2: '每平方米价格', rKind: '类型', rDistrict: '区域', rBedrooms: '卧室', rArea: '面积', rLand: '土地',
    rLease: '租赁产权', rPermit: '许可', rBuild: '施工', rYield: '税前收益率',
    noData: '暂无数据', moreShort: '详情', yieldNote: '收益率为我们根据 Booking 和 Airbnb 上周边房源的真实价格估算，税前。这是估算，不是收益承诺。',
    years: n => `${n} 年`, kind: { villa: '别墅', apartment: '公寓' },
    status: { built: '已建成', building: '在建', order: '按订单建造' },
    back: '← 全部精选', itemTitle: '精选中的房产', langLabel: '语言',
  },
}

export function clientCopy(lang: Lang): Copy {
  return COPY[lang] ?? COPY.en
}

/** Статус стройки из базы (по-русски) — на языке клиента. */
export function statusFor(raw: string | null, lang: Lang): string | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  const st = clientCopy(lang).status
  if (/постр|сдан|готов/.test(s)) return st.built
  if (/строит/.test(s)) return st.building
  if (/заказ/.test(s)) return st.order
  return lang === 'ru' || lang === 'uk' ? raw : null
}
