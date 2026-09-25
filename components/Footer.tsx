import Link from 'next/link'
import Image from 'next/image'
import { Send, Play } from 'lucide-react'
import { pickCopy, switchLangPath, langToSegment, LANGS, type Lang } from '@/lib/i18n'

// Самоназвания языков: это стандарт для переключателя (человек ищет свой язык
// на своём языке, а не «French») и одновременно осмысленный текст ссылки —
// «Français» описывает цель перехода, в отличие от кода «FR».
const LANG_NATIVE_NAME: Record<Lang, string> = {
  ru: 'Русский', en: 'English', id: 'Bahasa Indonesia', fr: 'Français', de: 'Deutsch',
  zh: '中文', nl: 'Nederlands', ban: 'Basa Bali', pl: 'Polski', uk: 'Українська',
}

type Col = { title: string; links: { label: string; href: string }[] }

const COLS_BY_LANG: Record<Lang, Col[]> = {
  ru: [
    {
      title: 'Застройщики',
      links: [
        { label: 'Рейтинг', href: '/ru/zastrojshhiki' },
        { label: 'Мероприятия', href: '/ru/meropriyatiya' },
        { label: 'Акции', href: '/ru/akcii' },
      ],
    },
    {
      title: 'Недвижимость',
      links: [
        { label: 'Жилые комплексы', href: '/ru/zhilye-kompleksy' },
        { label: 'Виллы', href: '/ru/villy' },
        { label: 'Апартаменты', href: '/ru/apartamenty' },
        { label: 'Аренда', href: '/ru/arenda' },
        { label: 'Перепродажа', href: '/ru/pereprodazha' },
      ],
    },
    {
      title: 'Информация',
      links: [
        { label: 'Инвестиции в недвижимость Бали', href: '/ru/investicii-v-nedvizhimost-bali' },
        { label: 'Цены на недвижимость по районам', href: '/ru/tseny-na-nedvizhimost-bali' },
        { label: 'Цены аренды на Бали', href: '/ru/tseny-arendy-na-bali' },
        { label: 'Как мы считаем', href: '/ru/metodologiya' },
        { label: 'Жизнь на Бали — ВНЖ и налоги', href: '/ru/zhizn-na-bali' },
        { label: 'Как купить на Бали', href: '/ru/kak-kupit' },
        { label: 'Поездка на осмотр', href: '/ru/invest-tour' },
        { label: 'Бронирование', href: '/ru/rezervirovanie' },
        { label: 'Новости', href: '/ru/novosti' },
        { label: 'Знания', href: '/ru/znaniya' },
      ],
    },
    {
      title: 'Каталог',
      links: [
        { label: 'Агенты', href: '/ru/zastrojshhiki' },
      ],
    },
    {
      title: 'Сотрудничество',
      links: [
        // Раздел найма убран: площадка никого не нанимает. Осталась
        // точка входа для застройщика, который хочет добавить проект
        // в каталог, и для читателя, нашедшего ошибку в данных.
        { label: 'Разместить проект', href: '/ru/kontakty' },
        { label: 'Сообщить об ошибке в данных', href: '/ru/kontakty' },
      ],
    },
  ],
  en: [
    {
      title: 'Developers',
      links: [
        { label: 'Directory', href: '/en/developers' },
        { label: 'Events', href: '/en/events' },
        { label: 'Promotions', href: '/en/promo' },
      ],
    },
    {
      title: 'Real estate',
      links: [
        { label: 'Residential complexes', href: '/en/complexes' },
        { label: 'Villas', href: '/en/villas' },
        { label: 'Apartments', href: '/en/apartments' },
        { label: 'Long-term rental', href: '/en/rental' },
      ],
    },
    {
      title: 'Information',
      links: [
        { label: 'Bali property investment', href: '/en/bali-property-investment' },
        { label: 'Property prices by area', href: '/en/bali-property-prices' },
        { label: 'Rent prices in Bali', href: '/en/bali-rent-prices' },
        { label: 'How we calculate', href: '/en/methodology' },
        { label: 'Living in Bali — visas & taxes', href: '/en/living-in-bali' },
        { label: 'How to buy in Bali', href: '/en/how-to-buy' },
        { label: 'Viewing trip', href: '/en/invest-tour' },
        { label: 'Reservation', href: '/en/reservation' },
        { label: 'News', href: '/en/news' },
        { label: 'Knowledge', href: '/en/knowledge' },
      ],
    },
    {
      title: 'Catalogue',
      links: [
        { label: 'Agents', href: '/en/developers' },
      ],
    },
    {
      title: 'Partnership',
      links: [
        // Раздел найма убран: площадка никого не нанимает. Осталась
        // точка входа для застройщика, который хочет добавить проект
        // в каталог, и для читателя, нашедшего ошибку в данных.
        { label: 'List your project', href: '/en/contact' },
        { label: 'Report a data error', href: '/en/contact' },
      ],
    },
  ],
  id: [
    {
      title: 'Pengembang',
      links: [
        { label: 'Direktori', href: '/en/developers' },
        { label: 'Acara', href: '/en/events' },
        { label: 'Promo', href: '/en/promo' },
      ],
    },
    {
      title: 'Properti',
      links: [
        { label: 'Kompleks hunian', href: '/en/complexes' },
        { label: 'Vila', href: '/en/villas' },
        { label: 'Apartemen', href: '/en/apartments' },
        { label: 'Sewa jangka panjang', href: '/en/rental' },
      ],
    },
    {
      title: 'Informasi',
      links: [
        { label: 'Investasi properti Bali', href: '/en/bali-property-investment' },
        { label: 'Harga properti per kawasan', href: '/en/bali-property-prices' },
        { label: 'Harga sewa di Bali', href: '/en/bali-rent-prices' },
        { label: 'Cara kami menghitung', href: '/en/methodology' },
        { label: 'Tinggal di Bali — visa & pajak', href: '/en/living-in-bali' },
        { label: 'Cara membeli di Bali', href: '/en/how-to-buy' },
        { label: 'Perjalanan peninjauan', href: '/en/invest-tour' },
        { label: 'Reservasi', href: '/en/reservation' },
        { label: 'Berita', href: '/en/news' },
        { label: 'Pengetahuan', href: '/en/knowledge' },
      ],
    },
    {
      title: 'Katalog',
      links: [
        { label: 'Agen', href: '/en/developers' },
      ],
    },
    {
      title: 'Kerja sama',
      links: [
        // Раздел найма убран: площадка никого не нанимает. Осталась
        // точка входа для застройщика, который хочет добавить проект
        // в каталог, и для читателя, нашедшего ошибку в данных.
        { label: 'Pasang proyek Anda', href: '/en/contact' },
        { label: 'Laporkan kekeliruan data', href: '/en/contact' },
      ],
    },
  ],
  fr: [
    {
      title: 'Promoteurs',
      links: [
        { label: 'Annuaire', href: '/en/developers' },
        { label: 'Événements', href: '/en/events' },
        { label: 'Promotions', href: '/en/promo' },
      ],
    },
    {
      title: 'Immobilier',
      links: [
        { label: 'Complexes résidentiels', href: '/en/complexes' },
        { label: 'Villas', href: '/en/villas' },
        { label: 'Appartements', href: '/en/apartments' },
        { label: 'Location longue durée', href: '/en/rental' },
      ],
    },
    {
      title: 'Informations',
      links: [
        { label: 'Investissement immobilier à Bali', href: '/en/bali-property-investment' },
        { label: 'Prix de l’immobilier par quartier', href: '/en/bali-property-prices' },
        { label: 'Prix des locations à Bali', href: '/en/bali-rent-prices' },
        { label: 'Notre méthode', href: '/en/methodology' },
        { label: 'Vivre à Bali — visas & impôts', href: '/en/living-in-bali' },
        { label: 'Comment acheter à Bali', href: '/en/how-to-buy' },
        { label: 'Voyage de visite', href: '/en/invest-tour' },
        { label: 'Réservation', href: '/en/reservation' },
        { label: 'Actualités', href: '/en/news' },
        { label: 'Savoir', href: '/en/knowledge' },
      ],
    },
    {
      title: 'Catalogue',
      links: [
        { label: 'Agents', href: '/en/developers' },
      ],
    },
    {
      title: 'Partenariat',
      links: [
        // Раздел найма убран: площадка никого не нанимает. Осталась
        // точка входа для застройщика, который хочет добавить проект
        // в каталог, и для читателя, нашедшего ошибку в данных.
        { label: 'Référencer votre projet', href: '/en/contact' },
        { label: 'Signaler une erreur de données', href: '/en/contact' },
      ],
    },
  ],
  de: [
    {
      title: 'Bauträger',
      links: [
        { label: 'Verzeichnis', href: '/en/developers' },
        { label: 'Veranstaltungen', href: '/en/events' },
        { label: 'Aktionen', href: '/en/promo' },
      ],
    },
    {
      title: 'Immobilien',
      links: [
        { label: 'Wohnanlagen', href: '/en/complexes' },
        { label: 'Villen', href: '/en/villas' },
        { label: 'Apartments', href: '/en/apartments' },
        { label: 'Langzeitmiete', href: '/en/rental' },
      ],
    },
    {
      title: 'Informationen',
      links: [
        { label: 'Immobilieninvestment auf Bali', href: '/en/bali-property-investment' },
        { label: 'Immobilienpreise nach Gegend', href: '/en/bali-property-prices' },
        { label: 'Mietpreise auf Bali', href: '/en/bali-rent-prices' },
        { label: 'So rechnen wir', href: '/en/methodology' },
        { label: 'Leben auf Bali — Visa & Steuern', href: '/en/living-in-bali' },
        { label: 'Kaufen auf Bali', href: '/en/how-to-buy' },
        { label: 'Besichtigungsreise', href: '/en/invest-tour' },
        { label: 'Reservierung', href: '/en/reservation' },
        { label: 'Neuigkeiten', href: '/en/news' },
        { label: 'Wissen', href: '/en/knowledge' },
      ],
    },
    {
      title: 'Katalog',
      links: [
        { label: 'Makler', href: '/en/developers' },
      ],
    },
    {
      title: 'Zusammenarbeit',
      links: [
        // Раздел найма убран: площадка никого не нанимает. Осталась
        // точка входа для застройщика, который хочет добавить проект
        // в каталог, и для читателя, нашедшего ошибку в данных.
        { label: 'Projekt eintragen', href: '/en/contact' },
        { label: 'Datenfehler melden', href: '/en/contact' },
      ],
    },
  ],
  zh: [
    {
      title: '开发商',
      links: [
        { label: '开发商目录', href: '/en/developers' },
        { label: '活动', href: '/en/events' },
        { label: '促销优惠', href: '/en/promo' },
      ],
    },
    {
      title: '房产',
      links: [
        { label: '住宅综合体', href: '/en/complexes' },
        { label: '别墅', href: '/en/villas' },
        { label: '公寓', href: '/en/apartments' },
        { label: '长期租赁', href: '/en/rental' },
      ],
    },
    {
      title: '信息',
      links: [
        { label: '巴厘岛房产投资', href: '/en/bali-property-investment' },
        { label: '各区域房产价格', href: '/en/bali-property-prices' },
        { label: '巴厘岛租金价格', href: '/en/bali-rent-prices' },
        { label: '我们如何计算', href: '/en/methodology' },
        { label: '在巴厘岛生活 — 签证与税务', href: '/en/living-in-bali' },
        { label: '如何在巴厘岛购房', href: '/en/how-to-buy' },
        { label: '看房之行', href: '/en/invest-tour' },
        { label: '预订', href: '/en/reservation' },
        { label: '新闻', href: '/en/news' },
        { label: '知识库', href: '/en/knowledge' },
      ],
    },
    {
      title: '目录',
      links: [
        { label: '经纪人', href: '/en/developers' },
      ],
    },
    {
      title: '合作',
      links: [
        // Раздел найма убран: площадка никого не нанимает. Осталась
        // точка входа для застройщика, который хочет добавить проект
        // в каталог, и для читателя, нашедшего ошибку в данных.
        { label: '刊登您的项目', href: '/en/contact' },
        { label: '报告数据错误', href: '/en/contact' },
      ],
    },
  ],
  nl: [
    {
      title: 'Projectontwikkelaars',
      links: [
        { label: 'Overzicht', href: '/en/developers' },
        { label: 'Evenementen', href: '/en/events' },
        { label: 'Acties', href: '/en/promo' },
      ],
    },
    {
      title: 'Vastgoed',
      links: [
        { label: 'Wooncomplexen', href: '/en/complexes' },
        { label: "Villa's", href: '/en/villas' },
        { label: 'Appartementen', href: '/en/apartments' },
        { label: 'Langlopende verhuur', href: '/en/rental' },
      ],
    },
    {
      title: 'Informatie',
      links: [
        { label: 'Investeren in vastgoed op Bali', href: '/en/bali-property-investment' },
        { label: 'Vastgoedprijzen per gebied', href: '/en/bali-property-prices' },
        { label: 'Huurprijzen op Bali', href: '/en/bali-rent-prices' },
        { label: 'Hoe we rekenen', href: '/en/methodology' },
        { label: 'Wonen op Bali — visa & belastingen', href: '/en/living-in-bali' },
        { label: 'Kopen op Bali', href: '/en/how-to-buy' },
        { label: 'Bezichtigingsreis', href: '/en/invest-tour' },
        { label: 'Reservering', href: '/en/reservation' },
        { label: 'Nieuws', href: '/en/news' },
        { label: 'Kennisbank', href: '/en/knowledge' },
      ],
    },
    {
      title: 'Catalogus',
      links: [
        { label: 'Makelaars', href: '/en/developers' },
      ],
    },
    {
      title: 'Samenwerking',
      links: [
        // Раздел найма убран: площадка никого не нанимает. Осталась
        // точка входа для застройщика, который хочет добавить проект
        // в каталог, и для читателя, нашедшего ошибку в данных.
        { label: 'Uw project plaatsen', href: '/en/contact' },
        { label: 'Een fout in de gegevens melden', href: '/en/contact' },
      ],
    },
  ],
  ban: [
    {
      title: 'Pengembang',
      links: [
        { label: 'Direktori', href: '/en/developers' },
        { label: 'Acara', href: '/en/events' },
        { label: 'Promo', href: '/en/promo' },
      ],
    },
    {
      title: 'Properti',
      links: [
        { label: 'Kompleks hunian', href: '/en/complexes' },
        { label: 'Vila', href: '/en/villas' },
        { label: 'Apartemen', href: '/en/apartments' },
        { label: 'Sewa jangka panjang', href: '/en/rental' },
      ],
    },
    {
      title: 'Informasi',
      links: [
        { label: 'Investasi properti Bali', href: '/en/bali-property-investment' },
        { label: 'Harga properti per kawasan', href: '/en/bali-property-prices' },
        { label: 'Harga sewa di Bali', href: '/en/bali-rent-prices' },
        { label: 'Cara kami menghitung', href: '/en/methodology' },
        { label: 'Tinggal di Bali — visa & pajak', href: '/en/living-in-bali' },
        { label: 'Cara meli di Bali', href: '/en/how-to-buy' },
        { label: 'Palancaran nyingakin', href: '/en/invest-tour' },
        { label: 'Reservasi', href: '/en/reservation' },
        { label: 'Berita', href: '/en/news' },
        { label: 'Kaweruh', href: '/en/knowledge' },
      ],
    },
    {
      title: 'Katalog',
      links: [
        { label: 'Agen', href: '/en/developers' },
      ],
    },
    {
      title: 'Kerja sama',
      links: [
        // Раздел найма убран: площадка никого не нанимает. Осталась
        // точка входа для застройщика, который хочет добавить проект
        // в каталог, и для читателя, нашедшего ошибку в данных.
        { label: 'Ngedaftarang proyek Ragane', href: '/en/contact' },
        { label: 'Nguningayang iwang data', href: '/en/contact' },
      ],
    },
  ],
  pl: [
    {
      title: 'Deweloperzy',
      links: [
        { label: 'Katalog', href: '/en/developers' },
        { label: 'Wydarzenia', href: '/en/events' },
        { label: 'Promocje', href: '/en/promo' },
      ],
    },
    {
      title: 'Nieruchomości',
      links: [
        { label: 'Kompleksy mieszkaniowe', href: '/en/complexes' },
        { label: 'Wille', href: '/en/villas' },
        { label: 'Apartamenty', href: '/en/apartments' },
        { label: 'Wynajem długoterminowy', href: '/en/rental' },
      ],
    },
    {
      title: 'Informacje',
      links: [
        { label: 'Inwestycje w nieruchomości na Bali', href: '/en/bali-property-investment' },
        { label: 'Ceny nieruchomości według rejonów', href: '/en/bali-property-prices' },
        { label: 'Ceny najmu na Bali', href: '/en/bali-rent-prices' },
        { label: 'Jak liczymy', href: '/en/methodology' },
        { label: 'Życie na Bali — wizy i podatki', href: '/en/living-in-bali' },
        { label: 'Jak kupić na Bali', href: '/en/how-to-buy' },
        { label: 'Wyjazd na oglądanie', href: '/en/invest-tour' },
        { label: 'Rezerwacja', href: '/en/reservation' },
        { label: 'Aktualności', href: '/en/news' },
        { label: 'Wiedza', href: '/en/knowledge' },
      ],
    },
    {
      title: 'Katalog',
      links: [
        { label: 'Agenci', href: '/en/developers' },
      ],
    },
    {
      title: 'Współpraca',
      links: [
        // Раздел найма убран: площадка никого не нанимает. Осталась
        // точка входа для застройщика, который хочет добавить проект
        // в каталог, и для читателя, нашедшего ошибку в данных.
        { label: 'Dodaj swój projekt', href: '/en/contact' },
        { label: 'Zgłoś błąd w danych', href: '/en/contact' },
      ],
    },
  ],
  uk: [
    {
      title: 'Забудовники',
      links: [
        { label: 'Каталог', href: '/en/developers' },
        { label: 'Заходи', href: '/en/events' },
        { label: 'Акції', href: '/en/promo' },
      ],
    },
    {
      title: 'Нерухомість',
      links: [
        { label: 'Житлові комплекси', href: '/en/complexes' },
        { label: 'Вілли', href: '/en/villas' },
        { label: 'Апартаменти', href: '/en/apartments' },
        { label: 'Довгострокова оренда', href: '/en/rental' },
      ],
    },
    {
      title: 'Інформація',
      links: [
        { label: 'Інвестиції в нерухомість Балі', href: '/en/bali-property-investment' },
        { label: 'Ціни на нерухомість за районами', href: '/en/bali-property-prices' },
        { label: 'Ціни оренди на Балі', href: '/en/bali-rent-prices' },
        { label: 'Як ми рахуємо', href: '/en/methodology' },
        { label: 'Життя на Балі — візи та податки', href: '/en/living-in-bali' },
        { label: 'Як купити на Балі', href: '/en/how-to-buy' },
        { label: 'Поїздка на огляд', href: '/en/invest-tour' },
        { label: 'Бронювання', href: '/en/reservation' },
        { label: 'Новини', href: '/en/news' },
        { label: 'Знання', href: '/en/knowledge' },
      ],
    },
    {
      title: 'Каталог',
      links: [
        { label: 'Агенти', href: '/en/developers' },
      ],
    },
    {
      title: 'Співпраця',
      links: [
        // Раздел найма убран: площадка никого не нанимает. Осталась
        // точка входа для застройщика, который хочет добавить проект
        // в каталог, и для читателя, нашедшего ошибку в данных.
        { label: 'Розмістити проєкт', href: '/en/contact' },
        { label: 'Повідомити про помилку в даних', href: '/en/contact' },
      ],
    },
  ],
}

const BOTTOM_BY_LANG: Record<Lang, { label: string; href: string }[]> = {
  ru: [
    { label: 'О нас', href: '/ru/o-balinsky' },
    { label: 'Сотрудничество с застройщиками', href: '/ru/kontakty' },
    { label: 'Сотрудничество с агентствами', href: '/ru/kontakty' },
    { label: 'Политика конфиденциальности', href: '/ru/politika-konfidencialnosti' },
    { label: 'Условия использования', href: '/ru/usloviya' },
    { label: 'Cookie', href: '/ru/cookie' },
    { label: 'Связаться', href: '/ru/kontakty' },
  ],
  en: [
    { label: 'About', href: '/en/about' },
    { label: 'Developer partnerships', href: '/en/contact' },
    { label: 'Agency partnerships', href: '/en/contact' },
    { label: 'Privacy policy', href: '/en/privacy' },
    { label: 'Terms of use', href: '/en/terms' },
    { label: 'Cookie', href: '/en/cookie' },
    { label: 'Contact', href: '/en/contact' },
  ],
  id: [
    { label: 'Tentang kami', href: '/en/about' },
    { label: 'Periklanan', href: '/en/contact' },
    { label: 'Kemitraan dengan pengembang', href: '/en/contact' },
    { label: 'Kemitraan dengan agensi', href: '/en/contact' },
    { label: 'Kebijakan privasi', href: '/en/privacy' },
    { label: 'Ketentuan penggunaan', href: '/en/terms' },
    { label: 'Cookie', href: '/en/cookie' },
    { label: 'Kontak', href: '/en/contact' },
  ],
  fr: [
    { label: 'À propos', href: '/en/about' },
    { label: 'Partenariats avec les promoteurs', href: '/en/contact' },
    { label: 'Partenariats avec les agences', href: '/en/contact' },
    { label: 'Politique de confidentialité', href: '/en/privacy' },
    { label: "Conditions d'utilisation", href: '/en/terms' },
    { label: 'Cookies', href: '/en/cookie' },
    { label: 'Contact', href: '/en/contact' },
  ],
  de: [
    { label: 'Über uns', href: '/en/about' },
    { label: 'Partnerschaft mit Bauträgern', href: '/en/contact' },
    { label: 'Partnerschaft mit Agenturen', href: '/en/contact' },
    { label: 'Datenschutzerklärung', href: '/en/privacy' },
    { label: 'Nutzungsbedingungen', href: '/en/terms' },
    { label: 'Cookies', href: '/en/cookie' },
    { label: 'Kontakt', href: '/en/contact' },
  ],
  zh: [
    { label: '关于我们', href: '/en/about' },
    { label: '广告合作', href: '/en/contact' },
    { label: '开发商合作', href: '/en/contact' },
    { label: '代理机构合作', href: '/en/contact' },
    { label: '隐私政策', href: '/en/privacy' },
    { label: '使用条款', href: '/en/terms' },
    { label: 'Cookie', href: '/en/cookie' },
    { label: '联系我们', href: '/en/contact' },
  ],
  nl: [
    { label: 'Over ons', href: '/en/about' },
    { label: 'Samenwerking met ontwikkelaars', href: '/en/contact' },
    { label: 'Samenwerking met bureaus', href: '/en/contact' },
    { label: 'Privacybeleid', href: '/en/privacy' },
    { label: 'Gebruiksvoorwaarden', href: '/en/terms' },
    { label: 'Cookies', href: '/en/cookie' },
    { label: 'Contact', href: '/en/contact' },
  ],
  ban: [
    { label: 'Indik kami', href: '/en/about' },
    { label: 'Periklanan', href: '/en/contact' },
    { label: 'Kemitraan sareng pengembang', href: '/en/contact' },
    { label: 'Kemitraan sareng agensi', href: '/en/contact' },
    { label: 'Kebijakan privasi', href: '/en/privacy' },
    { label: 'Ketentuan panganggo', href: '/en/terms' },
    { label: 'Cookie', href: '/en/cookie' },
    { label: 'Kontak', href: '/en/contact' },
  ],
  pl: [
    { label: 'O nas', href: '/en/about' },
    { label: 'Współpraca z deweloperami', href: '/en/contact' },
    { label: 'Współpraca z agencjami', href: '/en/contact' },
    { label: 'Polityka prywatności', href: '/en/privacy' },
    { label: 'Warunki korzystania', href: '/en/terms' },
    { label: 'Cookie', href: '/en/cookie' },
    { label: 'Kontakt', href: '/en/contact' },
  ],
  uk: [
    { label: 'Про нас', href: '/en/about' },
    { label: 'Співпраця із забудовниками', href: '/en/contact' },
    { label: 'Співпраця з агентствами', href: '/en/contact' },
    { label: 'Політика конфіденційності', href: '/en/privacy' },
    { label: 'Умови використання', href: '/en/terms' },
    { label: 'Cookie', href: '/en/cookie' },
    { label: 'Контакти', href: '/en/contact' },
  ],
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

export function Footer({ lang = 'ru' }: { lang?: Lang }) {
  const cols = pickCopy(COLS_BY_LANG, lang)
  const bottom = pickCopy(BOTTOM_BY_LANG, lang)
  const license = pickCopy(LICENSE_BY_LANG, lang)
  return (
    <footer className="mt-auto bg-[var(--color-header-bg)] border-t border-[var(--color-border)]">
      <div className="max-w-[1280px] mx-auto px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 lg:col-span-4">
            <Link href={lang === 'ru' ? '/' : `/${langToSegment(lang)}`} aria-label="Balinsky" className="inline-block mb-5">
              <Image src="/logo.svg" alt="Balinsky" width={40} height={40} className="h-10 w-10" />
            </Link>
            <p className="text-[13px] leading-[1.6] text-[var(--color-text-muted)] max-w-[380px]">
              {license}
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a
                href="https://t.me/itrealtor"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="text-[#229ED9] hover:opacity-80"
              >
                <Send size={22} />
              </a>
              <a
                href="https://www.youtube.com/@balinsky_info"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="inline-flex items-center justify-center w-9 h-6 rounded-md bg-[#FF0000] text-white hover:opacity-80"
              >
                <Play size={14} fill="currentColor" />
              </a>
            </div>
          </div>

          <div className="md:col-span-8 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-4">
            {cols.map(col => (
              <div key={col.title}>
                <div className="text-[12px] uppercase tracking-wide font-semibold text-[var(--color-text-muted)] mb-4">
                  {col.title}
                </div>
                <ul className="space-y-3">
                  {col.links.map(l => (
                    <li key={l.label}>
                      <Link
                        href={switchLangPath(l.href, lang)}
                        className="text-[14px] text-[#111827] hover:text-[var(--color-primary-pressed)] no-underline"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--color-border)]">
          <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[13px] text-[var(--color-text)]">
            {bottom.map(l => (
              <li key={l.label}>
                <Link href={switchLangPath(l.href, lang)} className="hover:text-[var(--color-primary-pressed)] no-underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
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
          <nav
            aria-label={pickCopy({
              ru: 'Языки сайта', en: 'Site languages', id: 'Bahasa situs', fr: 'Langues du site',
              de: 'Sprachen der Website', zh: '网站语言', nl: 'Talen van de site',
              ban: 'Basa ring situs', pl: 'Języki serwisu', uk: 'Мови сайту',
            }, lang)}
            className="mt-6"
          >
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-[var(--color-text-muted)]">
              {LANGS.map(l => (
                <li key={l}>
                  <Link
                    href={l === 'ru' ? '/' : `/${langToSegment(l)}`}
                    hrefLang={l}
                    aria-current={l === lang ? 'true' : undefined}
                    className={`no-underline hover:text-[var(--color-primary-pressed)] ${l === lang ? 'font-medium text-[var(--color-text)]' : ''}`}
                  >
                    {LANG_NATIVE_NAME[l]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Роль площадки. Персональные данные оператора здесь не
              публикуются по требованию владельца сайта; для связи есть
              страница контактов. Утверждений о доходе сайта тоже нет —
              только то, чем площадка не является. */}
          <div className="mt-6 mx-auto max-w-[68ch] text-center text-[12px] leading-[1.7] text-[var(--color-text-muted)]">
            <p>
              {pickCopy({
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
              }, lang)}
            </p>
            <p className="mt-3">Copyright © 2022–2026 Balinsky.info. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
