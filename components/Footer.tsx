import Link from 'next/link'
import Image from 'next/image'
import { pickCopy, switchLangPath, langToSegment, LANGS, type Lang } from '@/lib/i18n'

// Подвал «Журнал» — вариант A из макета (владелец 21.11.2026,
// https://claude.ai/artifact/2PonCGZduofYcuwwn6zQMe): толстая чёрная линия
// сверху, шесть колонок с номерами 01–06, строка языков, юридический низ.

// Самоназвания языков: это стандарт для переключателя (человек ищет свой язык
// на своём языке, а не «French») и одновременно осмысленный текст ссылки —
// «Français» описывает цель перехода, в отличие от кода «FR».
const LANG_NATIVE_NAME: Record<Lang, string> = {
  ru: 'Русский', en: 'English', id: 'Bahasa Indonesia', fr: 'Français', de: 'Deutsch',
  zh: '中文', nl: 'Nederlands', ban: 'Basa Bali', pl: 'Polski', uk: 'Українська',
}

type LinkId =
  | 'villas' | 'apartments' | 'complexes' | 'resale' | 'rental'
  | 'developers' | 'agents' | 'events' | 'promo'
  | 'howToBuy' | 'reservation' | 'trip' | 'living'
  | 'prices' | 'rentPrices' | 'investment' | 'methodology'
  | 'news' | 'knowledge' | 'about' | 'contact'
  | 'listProject' | 'devPartner' | 'agencyPartner' | 'advertising' | 'reportError'
  | 'privacy' | 'terms' | 'cookie'

// Адреса в русской форме; switchLangPath переводит их в сегменты языка
// страницы (/ru/villy → /en/villas → /de/villen).
const HREF: Record<LinkId, string> = {
  villas: '/ru/villy',
  apartments: '/ru/apartamenty',
  complexes: '/ru/zhilye-kompleksy',
  resale: '/ru/pereprodazha',
  rental: '/ru/arenda',
  developers: '/ru/zastrojshhiki',
  // Раньше вёл на каталог застройщиков. Отдельного каталога агентов на сайте
  // нет; страница агента — кабинет, где он сам добавляет свои объекты
  // (гость попадает на вход и возвращается сюда же). Не переводится:
  // кабинет один на все языки.
  agents: '/kabinet/objekty',
  events: '/ru/meropriyatiya',
  promo: '/ru/akcii',
  howToBuy: '/ru/kak-kupit',
  reservation: '/ru/rezervirovanie',
  trip: '/ru/invest-tour',
  living: '/ru/zhizn-na-bali',
  prices: '/ru/tseny-na-nedvizhimost-bali',
  rentPrices: '/ru/tseny-arendy-na-bali',
  investment: '/ru/investicii-v-nedvizhimost-bali',
  methodology: '/ru/metodologiya',
  news: '/ru/novosti',
  knowledge: '/ru/znaniya',
  about: '/ru/o-balinsky',
  contact: '/ru/kontakty',
  // Раздел найма убран: площадка никого не нанимает. Осталась точка входа
  // для застройщика, который хочет добавить проект в каталог, и для
  // читателя, нашедшего ошибку в данных.
  listProject: '/ru/kontakty',
  devPartner: '/ru/kontakty',
  agencyPartner: '/ru/kontakty',
  advertising: '/ru/kontakty',
  reportError: '/ru/kontakty',
  privacy: '/ru/politika-konfidencialnosti',
  terms: '/ru/usloviya',
  cookie: '/ru/cookie',
}

const NON_LOCALIZED = new Set<LinkId>(['agents'])

// Подписи ссылок. Нет подписи — нет ссылки в этом языке (перепродажа есть
// только по-русски, «Реклама» — там, где она была).
const LABELS: Record<Lang, Partial<Record<LinkId, string>>> = {
  ru: {
    developers: 'Каталог',
    events: 'Мероприятия',
    promo: 'Акции',
    complexes: 'Жилые комплексы',
    villas: 'Виллы',
    apartments: 'Апартаменты',
    rental: 'Аренда',
    resale: 'Перепродажа',
    investment: 'Инвестиции в недвижимость Бали',
    prices: 'Цены на недвижимость по районам',
    rentPrices: 'Цены аренды на Бали',
    methodology: 'Как мы считаем',
    living: 'Жизнь на Бали — ВНЖ и налоги',
    howToBuy: 'Как купить на Бали',
    trip: 'Поездка на осмотр',
    reservation: 'Как устроена бронь у застройщика',
    news: 'Новости',
    knowledge: 'Знания',
    agents: 'Агенты',
    listProject: 'Разместить проект',
    reportError: 'Сообщить об ошибке в данных',
    about: 'О нас',
    devPartner: 'Сотрудничество с застройщиками',
    agencyPartner: 'Сотрудничество с агентствами',
    privacy: 'Политика конфиденциальности',
    terms: 'Условия использования',
    cookie: 'Cookie',
    contact: 'Связаться',
  },
  en: {
    developers: 'Bali property developers',
    events: 'Events',
    promo: 'Promotions',
    complexes: 'Residential complexes',
    villas: 'Villas',
    apartments: 'Apartments',
    rental: 'Long-term rental',
    investment: 'Bali property investment',
    prices: 'Property prices by area',
    rentPrices: 'Rent prices in Bali',
    methodology: 'How we calculate',
    living: 'Living in Bali — visas & taxes',
    howToBuy: 'How to buy in Bali',
    trip: 'Viewing trip',
    reservation: 'How developer reservations work',
    news: 'News',
    knowledge: 'Knowledge',
    agents: 'Agents',
    listProject: 'List your project',
    reportError: 'Report a data error',
    about: 'About',
    devPartner: 'Developer partnerships',
    agencyPartner: 'Agency partnerships',
    privacy: 'Privacy policy',
    terms: 'Terms of use',
    cookie: 'Cookie',
    contact: 'Contact',
  },
  id: {
    developers: 'Pengembang properti Bali',
    events: 'Acara',
    promo: 'Promo',
    complexes: 'Kompleks hunian',
    villas: 'Vila',
    apartments: 'Apartemen',
    rental: 'Sewa jangka panjang',
    investment: 'Investasi properti Bali',
    prices: 'Harga properti per kawasan',
    rentPrices: 'Harga sewa di Bali',
    methodology: 'Cara kami menghitung',
    living: 'Tinggal di Bali — visa & pajak',
    howToBuy: 'Cara membeli di Bali',
    trip: 'Perjalanan peninjauan',
    reservation: 'Cara kerja reservasi pengembang',
    news: 'Berita',
    knowledge: 'Pengetahuan',
    agents: 'Agen',
    listProject: 'Pasang proyek Anda',
    reportError: 'Laporkan kekeliruan data',
    about: 'Tentang kami',
    advertising: 'Periklanan',
    devPartner: 'Kemitraan dengan pengembang',
    agencyPartner: 'Kemitraan dengan agensi',
    privacy: 'Kebijakan privasi',
    terms: 'Ketentuan penggunaan',
    cookie: 'Cookie',
    contact: 'Kontak',
  },
  fr: {
    developers: 'Promoteurs immobiliers à Bali',
    events: 'Événements',
    promo: 'Promotions',
    complexes: 'Complexes résidentiels',
    villas: 'Villas',
    apartments: 'Appartements',
    rental: 'Location longue durée',
    investment: 'Investissement immobilier à Bali',
    prices: 'Prix de l’immobilier par quartier',
    rentPrices: 'Prix des locations à Bali',
    methodology: 'Notre méthode',
    living: 'Vivre à Bali — visas & impôts',
    howToBuy: 'Comment acheter à Bali',
    trip: 'Voyage de visite',
    reservation: 'Comment fonctionne la réservation',
    news: 'Actualités',
    knowledge: 'Savoir',
    agents: 'Agents',
    listProject: 'Référencer votre projet',
    reportError: 'Signaler une erreur de données',
    about: 'À propos',
    devPartner: 'Partenariats avec les promoteurs',
    agencyPartner: 'Partenariats avec les agences',
    privacy: 'Politique de confidentialité',
    terms: "Conditions d'utilisation",
    cookie: 'Cookies',
    contact: 'Contact',
  },
  de: {
    developers: 'Verzeichnis',
    events: 'Veranstaltungen',
    promo: 'Aktionen',
    complexes: 'Wohnanlagen',
    villas: 'Villen',
    apartments: 'Apartments',
    rental: 'Langzeitmiete',
    investment: 'Immobilieninvestment auf Bali',
    prices: 'Immobilienpreise nach Gegend',
    rentPrices: 'Mietpreise auf Bali',
    methodology: 'So rechnen wir',
    living: 'Leben auf Bali — Visa & Steuern',
    howToBuy: 'Kaufen auf Bali',
    trip: 'Besichtigungsreise',
    reservation: 'So funktioniert die Reservierung',
    news: 'Neuigkeiten',
    knowledge: 'Wissen',
    agents: 'Makler',
    listProject: 'Projekt eintragen',
    reportError: 'Datenfehler melden',
    about: 'Über uns',
    devPartner: 'Partnerschaft mit Bauträgern',
    agencyPartner: 'Partnerschaft mit Agenturen',
    privacy: 'Datenschutzerklärung',
    terms: 'Nutzungsbedingungen',
    cookie: 'Cookies',
    contact: 'Kontakt',
  },
  zh: {
    developers: '开发商目录',
    events: '活动',
    promo: '促销优惠',
    complexes: '住宅综合体',
    villas: '别墅',
    apartments: '公寓',
    rental: '长期租赁',
    investment: '巴厘岛房产投资',
    prices: '各区域房产价格',
    rentPrices: '巴厘岛租金价格',
    methodology: '我们如何计算',
    living: '在巴厘岛生活 — 签证与税务',
    howToBuy: '如何在巴厘岛购房',
    trip: '看房之行',
    reservation: '开发商预订如何运作',
    news: '新闻',
    knowledge: '知识库',
    agents: '经纪人',
    listProject: '刊登您的项目',
    reportError: '报告数据错误',
    about: '关于我们',
    advertising: '广告合作',
    devPartner: '开发商合作',
    agencyPartner: '代理机构合作',
    privacy: '隐私政策',
    terms: '使用条款',
    cookie: 'Cookie',
    contact: '联系我们',
  },
  nl: {
    developers: 'Overzicht',
    events: 'Evenementen',
    promo: 'Acties',
    complexes: 'Wooncomplexen',
    villas: "Villa's",
    apartments: 'Appartementen',
    rental: 'Langlopende verhuur',
    investment: 'Investeren in vastgoed op Bali',
    prices: 'Vastgoedprijzen per gebied',
    rentPrices: 'Huurprijzen op Bali',
    methodology: 'Hoe we rekenen',
    living: 'Wonen op Bali — visa & belastingen',
    howToBuy: 'Kopen op Bali',
    trip: 'Bezichtigingsreis',
    reservation: 'Hoe een reservering werkt',
    news: 'Nieuws',
    knowledge: 'Kennisbank',
    agents: 'Makelaars',
    listProject: 'Uw project plaatsen',
    reportError: 'Een fout in de gegevens melden',
    about: 'Over ons',
    devPartner: 'Samenwerking met ontwikkelaars',
    agencyPartner: 'Samenwerking met bureaus',
    privacy: 'Privacybeleid',
    terms: 'Gebruiksvoorwaarden',
    cookie: 'Cookies',
    contact: 'Contact',
  },
  ban: {
    developers: 'Direktori',
    events: 'Acara',
    promo: 'Promo',
    complexes: 'Kompleks hunian',
    villas: 'Vila',
    apartments: 'Apartemen',
    rental: 'Sewa jangka panjang',
    investment: 'Investasi properti Bali',
    prices: 'Harga properti per kawasan',
    rentPrices: 'Harga sewa di Bali',
    methodology: 'Cara kami menghitung',
    living: 'Tinggal di Bali — visa & pajak',
    howToBuy: 'Cara meli di Bali',
    trip: 'Palancaran nyingakin',
    reservation: 'Cara kerja reservasi pengembang',
    news: 'Berita',
    knowledge: 'Kaweruh',
    agents: 'Agen',
    listProject: 'Ngedaftarang proyek Ragane',
    reportError: 'Nguningayang iwang data',
    about: 'Indik kami',
    advertising: 'Periklanan',
    devPartner: 'Kemitraan sareng pengembang',
    agencyPartner: 'Kemitraan sareng agensi',
    privacy: 'Kebijakan privasi',
    terms: 'Ketentuan panganggo',
    cookie: 'Cookie',
    contact: 'Kontak',
  },
  pl: {
    developers: 'Katalog',
    events: 'Wydarzenia',
    promo: 'Promocje',
    complexes: 'Kompleksy mieszkaniowe',
    villas: 'Wille',
    apartments: 'Apartamenty',
    rental: 'Wynajem długoterminowy',
    investment: 'Inwestycje w nieruchomości na Bali',
    prices: 'Ceny nieruchomości według rejonów',
    rentPrices: 'Ceny najmu na Bali',
    methodology: 'Jak liczymy',
    living: 'Życie na Bali — wizy i podatki',
    howToBuy: 'Jak kupić na Bali',
    trip: 'Wyjazd na oglądanie',
    reservation: 'Jak działa rezerwacja',
    news: 'Aktualności',
    knowledge: 'Wiedza',
    agents: 'Agenci',
    listProject: 'Dodaj swój projekt',
    reportError: 'Zgłoś błąd w danych',
    about: 'O nas',
    devPartner: 'Współpraca z deweloperami',
    agencyPartner: 'Współpraca z agencjami',
    privacy: 'Polityka prywatności',
    terms: 'Warunki korzystania',
    cookie: 'Cookie',
    contact: 'Kontakt',
  },
  uk: {
    developers: 'Каталог',
    events: 'Заходи',
    promo: 'Акції',
    complexes: 'Житлові комплекси',
    villas: 'Вілли',
    apartments: 'Апартаменти',
    rental: 'Довгострокова оренда',
    investment: 'Інвестиції в нерухомість Балі',
    prices: 'Ціни на нерухомість за районами',
    rentPrices: 'Ціни оренди на Балі',
    methodology: 'Як ми рахуємо',
    living: 'Життя на Балі — візи та податки',
    howToBuy: 'Як купити на Балі',
    trip: 'Поїздка на огляд',
    reservation: 'Як влаштована бронь у забудовника',
    news: 'Новини',
    knowledge: 'Знання',
    agents: 'Агенти',
    listProject: 'Розмістити проєкт',
    reportError: 'Повідомити про помилку в даних',
    about: 'Про нас',
    devPartner: 'Співпраця із забудовниками',
    agencyPartner: 'Співпраця з агентствами',
    privacy: 'Політика конфіденційності',
    terms: 'Умови використання',
    cookie: 'Cookie',
    contact: 'Контакти',
  },
}

type ColId = 'realty' | 'developers' | 'buying' | 'data' | 'journal' | 'partnership'

const COLS: { id: ColId; links: LinkId[] }[] = [
  { id: 'realty', links: ['villas', 'apartments', 'complexes', 'resale', 'rental'] },
  { id: 'developers', links: ['developers', 'agents', 'events', 'promo'] },
  { id: 'buying', links: ['howToBuy', 'reservation', 'trip', 'living'] },
  { id: 'data', links: ['prices', 'rentPrices', 'investment', 'methodology'] },
  { id: 'journal', links: ['news', 'knowledge', 'about', 'contact'] },
  { id: 'partnership', links: ['listProject', 'devPartner', 'agencyPartner', 'advertising', 'reportError'] },
]

const LEGAL: LinkId[] = ['privacy', 'terms', 'cookie']

const COL_TITLE: Record<ColId, Record<Lang, string>> = {
  realty: { ru: 'Недвижимость', en: 'Real estate', id: 'Properti', fr: 'Immobilier', de: 'Immobilien', zh: '房产', nl: 'Vastgoed', ban: 'Properti', pl: 'Nieruchomości', uk: 'Нерухомість' },
  developers: { ru: 'Застройщики', en: 'Developers', id: 'Pengembang', fr: 'Promoteurs', de: 'Bauträger', zh: '开发商', nl: 'Ontwikkelaars', ban: 'Pengembang', pl: 'Deweloperzy', uk: 'Забудовники' },
  buying: { ru: 'Покупка', en: 'Buying', id: 'Pembelian', fr: 'Achat', de: 'Kauf', zh: '购房', nl: 'Kopen', ban: 'Numbas', pl: 'Zakup', uk: 'Купівля' },
  data: { ru: 'Цены и данные', en: 'Prices & data', id: 'Harga & data', fr: 'Prix et données', de: 'Preise & Daten', zh: '价格与数据', nl: 'Prijzen & data', ban: 'Harga & data', pl: 'Ceny i dane', uk: 'Ціни та дані' },
  journal: { ru: 'Журнал', en: 'Journal', id: 'Jurnal', fr: 'Journal', de: 'Magazin', zh: '资讯', nl: 'Magazine', ban: 'Jurnal', pl: 'Magazyn', uk: 'Журнал' },
  partnership: { ru: 'Сотрудничество', en: 'Partnership', id: 'Kerja sama', fr: 'Partenariat', de: 'Zusammenarbeit', zh: '合作', nl: 'Samenwerking', ban: 'Kerja sama', pl: 'Współpraca', uk: 'Співпраця' },
}

// Неразрывные пробелы ( ) после коротких слов и перед тире —
// чтобы строки не кончались предлогом и не начинались с «—».
const TAGLINE: Record<Lang, string> = {
  ru: 'Недвижимость Бали в лизхолде для иностранцев. Цены, документы и доход — по каждому объекту.',
  en: 'Bali leasehold property for foreigners. Prices, documents and income — for every listing.',
  id: 'Properti leasehold di Bali untuk warga asing. Harga, dokumen, dan pendapatan — untuk setiap objek.',
  fr: 'L’immobilier en leasehold à Bali pour les étrangers. Prix, documents et revenus — pour chaque bien.',
  de: 'Leasehold-Immobilien auf Bali für Ausländer. Preise, Dokumente und Ertrag — für jedes Objekt.',
  zh: '面向外国人的巴厘岛租赁产权房产。每套房源的价格、文件与收益，一目了然。',
  nl: 'Leasehold-vastgoed op Bali voor buitenlanders. Prijzen, documenten en rendement — per object.',
  ban: 'Properti leasehold ring Bali majeng wong dura negara. Harga, dokumen, miwah pikolih — ring sabilang objek.',
  pl: 'Nieruchomości na Bali w leasehold dla cudzoziemców. Ceny, dokumenty i dochód — dla każdego obiektu.',
  uk: 'Нерухомість Балі в лізхолді для іноземців. Ціни, документи й дохід — по кожному об’єкту.',
}

const FOLLOW: Record<Lang, string> = {
  ru: 'Следить за рынком', en: 'Follow the market', id: 'Ikuti pasar', fr: 'Suivre le marché', de: 'Markt verfolgen',
  zh: '关注市场', nl: 'Volg de markt', ban: 'Ngiringin pasar', pl: 'Śledź rynek', uk: 'Стежити за ринком',
}

const LANGS_LABEL: Record<Lang, string> = {
  ru: 'Языки сайта', en: 'Site languages', id: 'Bahasa situs', fr: 'Langues du site',
  de: 'Sprachen der Website', zh: '网站语言', nl: 'Talen van de site',
  ban: 'Basa ring situs', pl: 'Języki serwisu', uk: 'Мови сайту',
}

// Роль площадки. Персональные данные оператора здесь не публикуются по
// требованию владельца сайта; для связи есть страница контактов.
// Утверждений о доходе сайта тоже нет — только то, чем площадка не является.
const NOT_AGENCY: Record<Lang, string> = {
  ru: 'Balinsky.info — информационный каталог. Сайт не является агентством недвижимости: мы не продаём объекты, не участвуем в сделках и не берём комиссию.',
  en: 'Balinsky.info is an information catalogue. The site is not a real-estate agency: we do not sell properties, take no part in transactions and charge no commission.',
  id: 'Balinsky.info adalah katalog informasi. Situs ini bukan agen properti: kami tidak menjual objek, tidak ikut dalam transaksi, dan tidak memungut komisi.',
  fr: 'Balinsky.info est un catalogue d’information. Le site n’est pas une agence immobilière : nous ne vendons pas de biens, ne participons pas aux transactions et ne percevons aucune commission.',
  de: 'Balinsky.info ist ein Informationskatalog. Die Website ist keine Immobilienagentur: Wir verkaufen keine Objekte, sind an Transaktionen nicht beteiligt und nehmen keine Provision.',
  zh: 'Balinsky.info 是信息目录。本站不是房地产中介：我们不销售房产、不参与交易，也不收取佣金。',
  nl: 'Balinsky.info is een informatiecatalogus. De site is geen makelaar: wij verkopen geen objecten, nemen geen deel aan transacties en rekenen geen commissie.',
  ban: 'Balinsky.info inggih punika katalog informasi. Situs puniki nénten agen properti: tiang nénten ngadol objek, nénten milu ring transaksi, tur nénten nerima komisi.',
  pl: 'Balinsky.info to katalog informacyjny. Serwis nie jest agencją nieruchomości: nie sprzedajemy obiektów, nie uczestniczymy w transakcjach i nie pobieramy prowizji.',
  uk: 'Balinsky.info — інформаційний каталог. Сайт не є агентством нерухомості: ми не продаємо обʼєкти, не беремо участі в угодах і не беремо комісію.',
}

const LICENSE_BY_LANG: Record<Lang, string> = {
  ru: 'Все материалы сайта доступны по лицензии Creative Commons Attribution 4.0 International. Вы должны указать имя автора (создателя) произведения (материала) и стороны атрибуции, уведомление об авторских правах, название лицензии, уведомление об оговорке и ссылку на материал, если они предоставлены вместе с материалом.',
  en: 'All site materials are available under the Creative Commons Attribution 4.0 International licence. You must give appropriate credit to the author of the work, indicate the licence with a notice and link to the material when it is provided alongside the original.',
  id: 'Seluruh materi di situs ini tersedia di bawah lisensi Creative Commons Attribution 4.0 International. Anda wajib mencantumkan kredit yang sesuai kepada penulis karya, menandai lisensi dengan sebuah pemberitahuan, dan menyertakan tautan ke materi apabila disediakan bersama materi aslinya.',
  fr: 'Tous les contenus du site sont disponibles sous licence Creative Commons Attribution 4.0 International. Vous devez créditer de manière appropriée l’auteur de l’œuvre, indiquer la licence au moyen d’une mention et fournir un lien vers le contenu lorsqu’il est fourni avec l’original.',
  de: 'Alle Materialien dieser Website stehen unter der Lizenz Creative Commons Attribution 4.0 International zur Verfügung. Sie müssen den Urheber des Werks angemessen nennen, die Lizenz durch einen Hinweis kennzeichnen und einen Link zum Material angeben, sofern diese zusammen mit dem Originalmaterial bereitgestellt werden.',
  zh: '本网站的所有材料均依据「知识共享署名 4.0 国际」（Creative Commons Attribution 4.0 International）许可协议提供。您必须适当署名原作者，通过声明标明该许可协议，并在材料随原件一同提供时附上材料链接。',
  nl: 'Alle materialen op deze website zijn beschikbaar onder de Creative Commons Attribution 4.0 International-licentie. U moet de auteur van het werk op passende wijze vermelden, de licentie met een kennisgeving aangeven en een link naar het materiaal opnemen wanneer deze samen met het origineel worden verstrekt.',
  ban: 'Sami materi ring situs puniki kasayagayang ring sor lisensi Creative Commons Attribution 4.0 International. Ragane patut nyantenang kredit sane manut ring sang ngwangun karya, nyinahang lisensine antuk pawarah-warah, tur nyantenang tautan ka materine yening kasayagayang sinarengan ring materi aslinnyane.',
  pl: 'Wszystkie materiały w tym serwisie są dostępne na licencji Creative Commons Attribution 4.0 International. Musisz odpowiednio wskazać autora dzieła, oznaczyć licencję stosowną informacją oraz podać link do materiału, jeśli zostały one udostępnione wraz z oryginałem.',
  uk: 'Усі матеріали сайту доступні за ліцензією Creative Commons Attribution 4.0 International. Ви повинні належним чином зазначити автора твору, позначити ліцензію відповідним повідомленням і надати посилання на матеріал, якщо вони надані разом з оригіналом.',
}

const CAP = 'text-[12px] uppercase tracking-[0.08em] text-[#6B7570]'
const LINK = 'rounded-sm no-underline transition-colors duration-[120ms] hover:text-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'

function href(id: LinkId, lang: Lang): string {
  return NON_LOCALIZED.has(id) ? HREF[id] : switchLangPath(HREF[id], lang)
}

export function Footer({ lang = 'ru' }: { lang?: Lang }) {
  const labels = LABELS[lang] ?? LABELS.en
  const cols = COLS.map(c => ({ ...c, links: c.links.filter(id => labels[id]) }))
  return (
    <footer className="mt-auto bg-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-8 border-t-2 border-[#0F1A15] pt-8 pb-8 md:gap-12 md:pt-12">

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
            <div className="flex max-w-[640px] flex-col gap-4">
              <Link href={`/${langToSegment(lang)}`} className={`inline-flex items-center gap-3 self-start ${LINK} text-[#0F1A15]`}>
                <Image src="/logo.svg" alt="" width={36} height={36} className="h-9 w-9" />
                <span className="text-[20px] font-semibold tracking-[-0.02em]">Balinsky</span>
              </Link>
              <p className="text-[20px] font-semibold leading-[1.25] tracking-[-0.02em] [text-wrap:balance] md:text-[28px] md:leading-[1.2]">
                {pickCopy(TAGLINE, lang)}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className={CAP}>{pickCopy(FOLLOW, lang)}</span>
              <div className="flex gap-6 text-[16px] font-medium">
                <a href="https://t.me/itrealtor" target="_blank" rel="noopener noreferrer" className={`${LINK} text-[#0F1A15] underline underline-offset-4`}>Telegram&nbsp;↗</a>
                <a href="https://www.youtube.com/@balinsky_info" target="_blank" rel="noopener noreferrer" className={`${LINK} text-[#0F1A15] underline underline-offset-4`}>YouTube&nbsp;↗</a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-6">
            {cols.map((col, i) => (
              <div key={col.id} className="flex flex-col gap-4">
                <div className={CAP}>
                  <span className="tabular-nums">{String(i + 1).padStart(2, '0')}</span>{'  '}{COL_TITLE[col.id][lang]}
                </div>
                <ul className="flex flex-col gap-3">
                  {col.links.map(id => (
                    <li key={id}>
                      <Link href={href(id, lang)} className={`text-[15px] leading-[1.4] ${LINK} text-[#0F1A15]`}>{labels[id]}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/*
            Единственный краулимый путь между языковыми деревьями сайта.
            Переключатель в шапке (components/LangSwitch.tsx) — это <select>
            с router.push(), он не порождает <a href>, а краулеры не нажимают
            интерактивные контролы. Из-за этого девять локалей (~9 000 URL)
            были достижимы только через сайтмап и hreflang — ни то, ни другое
            не обязывает Google обойти страницу, и URL Inspection показывал 45
            из 78 проверенных в статусе «Discovered — currently not indexed»,
            почти все fr/nl/zh/ua/pl.

            Внутри локали перелинковка нормальная (полсотни ссылок на
            странице), не хватало именно перехода между деревьями — поэтому
            достаточно связать главные страницы локалей. Ссылки видимые:
            прятать их нельзя, скрытая навигация это спам-паттерн.
          */}
          <nav aria-label={LANGS_LABEL[lang]} className="flex flex-col gap-3 border-y border-[#ECEFED] py-4 lg:flex-row lg:items-center lg:gap-6">
            <span className={`${CAP} shrink-0 whitespace-nowrap`} aria-hidden>{LANGS_LABEL[lang]}</span>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[14px] md:gap-x-6">
              {LANGS.map(l => (
                <li key={l}>
                  <Link
                    href={l === 'ru' ? '/' : `/${langToSegment(l)}`}
                    hrefLang={l}
                    lang={l}
                    aria-current={l === lang ? 'true' : undefined}
                    className={`${LINK} text-[#0F1A15] ${l === lang ? 'font-semibold' : ''}`}
                  >
                    {LANG_NATIVE_NAME[l]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid grid-cols-1 gap-6 text-[13px] leading-[1.6] text-[#4A5550] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
            <div className="flex max-w-[68ch] flex-col gap-3">
              <p className="text-[#0F1A15]">{pickCopy(NOT_AGENCY, lang)}</p>
              <p>{pickCopy(LICENSE_BY_LANG, lang)}</p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end lg:text-right">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 lg:justify-end">
                {LEGAL.filter(id => labels[id]).map(id => (
                  <li key={id}>
                    <Link href={href(id, lang)} className={`${LINK} text-[#4A5550]`}>{labels[id]}</Link>
                  </li>
                ))}
              </ul>
              <p>Copyright © 2022–2026 Balinsky.info. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
