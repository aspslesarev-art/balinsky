// Shared apartment-detail renderer for both /ru/apartamenty/o/[slug]
// and /en/apartments/o/[slug]. Layout / data fetching live here only.

import type { ReactNode } from 'react'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import {
  BedDouble, Square, Building2, Calendar, FileCheck2, Lock, MapPin, Plane,
  ChevronRight, Layers, HardHat, Star,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { ExpandableText } from '@/components/ExpandableText'
import { PageContainer } from '@/components/PageContainer'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'
import { ApartmentCard, type ApartmentCardData } from '@/components/ApartmentCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { distanceKm as haversineKm } from '@/lib/competitor-utils'
import { getDeveloperStats } from '@/lib/developer-stats'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'
import { isMetaBullet } from '@/lib/developer-highlights'
import { loadAllVideos, matchesLang as videoMatchesLang } from '@/lib/videos'
import { VideoGrid } from '@/components/VideoGrid'
import { PageViewTracker } from '@/components/PageViewTracker'
import dynamic from 'next/dynamic'
// Heavy client widgets — pulled off the initial JS bundle. Both render
// below the fold on detail pages, so late hydration is invisible.
const InvestmentWidget = dynamic(
  () => import('@/components/InvestmentWidget').then(m => ({ default: m.InvestmentWidget })),
)
const LandProfileBlock = dynamic(
  () => import('@/components/LandProfileBlock').then(m => ({ default: m.LandProfileBlock })),
)
import { RentalCompareSection } from '@/components/RentalCompareSection'
import { LazyMount } from '@/components/LazyMount'
import { ManagerCard } from '@/components/ManagerCard'
import { loadNearbyPlaces } from '@/lib/nearby-places'
import { NearbyPlaces } from '@/components/NearbyPlaces'
import { loadManagersByDeveloperName } from '@/lib/managers'
import { PriceCtaCard } from '@/components/PriceCtaCard'
import { findActiveReservation } from '@/lib/reservations'
import { loadLandProfile, landAllowsBuilding } from '@/lib/land-profile'
import { loadMarketStats } from '@/lib/complex-market-stats'
import { MarketStatsBlock } from '@/components/MarketStatsBlock'
import { VillaPresentationButton } from '@/components/VillaPresentation'
import { tField, pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { normalizeSlug } from '@/lib/slug-normalize'
import { loadAllTranslations, mergeAllTranslations } from '@/lib/en-translations'
import { pluralRu } from '@/lib/plural-ru'
import { districtRu } from '@/lib/district-ru'
import { geoChainString } from '@/lib/regency'
import { loadKbPageContent } from '@/lib/kb-page-content'
import { loadListingVision, altFor } from '@/lib/listing-features'
import { DistrictAboutCard } from '@/components/DistrictAboutCard'
import { getDistrictCopy } from '@/lib/districts'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { cdnManifestUrl } from '@/lib/photo-cdn'

const AIRPORT_LAT = -8.7467
const AIRPORT_LNG = 115.1667
function fmtAirportDistance(lat: number | null, lng: number | null, lang: Lang): string | null {
  if (lat == null || lng == null) return null
  const km = haversineKm(lat, lng, AIRPORT_LAT, AIRPORT_LNG)
  if (lang === 'ru') return km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(km < 10 ? 1 : 0)} км`
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
}

const COPY = {
  ru: {
    home: 'Главная', aptCrumb: 'Апартаменты',
    sqm: 'м²', floor: 'Этаж', bali: 'Бали', completed: 'Сдан',
    factsHeading: 'Характеристики',
    factArea: 'Площадь', factFloor: 'Этаж', factCompletion: 'Сдача',
    factPermits: 'Разрешения', factLeasehold: 'Лизхолд', factDistrict: 'Район',
    factAirport: 'До аэропорта', factGround: 'Цокольный',
    factLeaseValue: (l: string) => `${l} лет`,
    descHeading: 'Описание',
    complexLabel: 'Жилой комплекс',
    developerLabel: 'Застройщик',
    openComplex: 'Открыть страницу комплекса',
    openDeveloper: 'Открыть страницу застройщика',
    completedShort: 'сдан',
    completion: (y: string) => `сдача ${y}`,
    units: (n: number) => `${n} ${pluralRu(n, ['юнит', 'юнита', 'юнитов'])}`,
    sellingSeparately: 'Продаётся отдельно (вне комплекса)',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Бали, Индонезия`,
    relatedHeading: 'По теме',
    related: {
      allApartments: 'Все апартаменты Бали',
      complexes: 'Жилые комплексы',
      villas: 'Виллы',
      developers: 'Застройщики Бали',
      apartmentsIn: (d: string) => `Апартаменты в ${d}`,
    },
    faqHeading: 'Часто задаваемые вопросы',
    faq: (title: string, district: string | null, price: string | null, lease: string | null) => [
      { q: `Сколько стоит ${title}?`,
        a: price ? `Текущая цена объекта — ${price}. Актуальный прайс всегда указан в карточке выше.` : 'Цена уточняется. Свяжитесь для актуального прайса.' },
      { q: `Где находится ${title}?`,
        a: district ? `Объект расположен в районе ${district} на Бали. Точные координаты — на карте выше.` : 'Точное расположение и координаты — на карте выше.' },
      { q: 'Можно ли иностранцу купить апартаменты на Бали?',
        a: 'Да. Сделка оформляется по схеме лизхолда (долгосрочной аренды) у нотариуса PPAT. Большинство застройщиков работают с международными покупателями.' },
      { q: 'Какой срок лизхолда?',
        a: lease ? `Базовый срок — ${lease} лет. Условия продления уточняйте у застройщика.` : 'Срок лизхолда уточняйте у застройщика. Стандартно 25–80 лет с возможностью продления.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` в районе ${district}` : ''} на Бали${price ? `. Цена ${price}.` : '.'} Фото, планировка, документы.`,
  },
  en: {
    home: 'Home', aptCrumb: 'Apartments',
    sqm: 'm²', floor: 'Floor', bali: 'Bali', completed: 'Completed',
    factsHeading: 'Specs',
    factArea: 'Area', factFloor: 'Floor', factCompletion: 'Completion',
    factPermits: 'Permits', factLeasehold: 'Leasehold', factDistrict: 'District',
    factAirport: 'To airport', factGround: 'Ground floor',
    factLeaseValue: (l: string) => `${l} years`,
    descHeading: 'Description',
    complexLabel: 'Residential complex',
    developerLabel: 'Developer',
    openComplex: 'Open complex page',
    openDeveloper: 'Open developer page',
    completedShort: 'completed',
    completion: (y: string) => `completion ${y}`,
    units: (n: number) => `${n} units`,
    sellingSeparately: 'Sold separately (not part of a complex)',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonesia`,
    relatedHeading: 'Related',
    related: {
      allApartments: 'All Bali apartments',
      complexes: 'Residential complexes',
      villas: 'Villas',
      developers: 'Bali developers',
      apartmentsIn: (d: string) => `Apartments in ${d}`,
    },
    faqHeading: 'Frequently asked questions',
    faq: (title: string, district: string | null, price: string | null, lease: string | null) => [
      { q: `How much does ${title} cost?`,
        a: price ? `Current asking price is ${price}. Live price is always shown in the card above.` : 'Price on request. Contact us for current pricing.' },
      { q: `Where is ${title} located?`,
        a: district ? `The property is in ${district}, Bali. Exact coordinates on the map above.` : 'Exact location and coordinates on the map above.' },
      { q: 'Can a foreigner buy a Bali apartment?',
        a: 'Yes. The deal is closed via leasehold (long-term lease) at a PPAT notary. Most developers work with international buyers.' },
      { q: 'What is the leasehold term?',
        a: lease ? `Base term is ${lease} years. Check extension conditions with the developer.` : 'Check the leasehold term with the developer — typically 25–80 years with extension options.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` in ${district}` : ''} in Bali${price ? `. Price ${price}.` : '.'} Photos, layout, documents.`,
  },
  id: {
    home: 'Beranda', aptCrumb: 'Apartemen',
    sqm: 'm²', floor: 'Lantai', bali: 'Bali', completed: 'Selesai',
    factsHeading: 'Spesifikasi',
    factArea: 'Luas', factFloor: 'Lantai', factCompletion: 'Serah terima',
    factPermits: 'Izin', factLeasehold: 'Hak sewa', factDistrict: 'Area',
    factAirport: 'Ke bandara', factGround: 'Lantai dasar',
    factLeaseValue: (l: string) => `${l} tahun`,
    descHeading: 'Deskripsi',
    complexLabel: 'Kompleks hunian',
    developerLabel: 'Pengembang',
    openComplex: 'Buka halaman kompleks',
    openDeveloper: 'Buka halaman pengembang',
    completedShort: 'selesai',
    completion: (y: string) => `serah terima ${y}`,
    units: (n: number) => `${n} unit`,
    sellingSeparately: 'Dijual terpisah (bukan bagian dari kompleks)',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonesia`,
    relatedHeading: 'Terkait',
    related: {
      allApartments: 'Semua apartemen Bali',
      complexes: 'Kompleks hunian',
      villas: 'Vila',
      developers: 'Pengembang Bali',
      apartmentsIn: (d: string) => `Apartemen di ${d}`,
    },
    faqHeading: 'Pertanyaan yang sering diajukan',
    faq: (title: string, district: string | null, price: string | null, lease: string | null) => [
      { q: `Berapa harga ${title}?`,
        a: price ? `Harga saat ini adalah ${price}. Harga terkini selalu tercantum pada kartu di atas.` : 'Harga berdasarkan permintaan. Hubungi kami untuk harga terkini.' },
      { q: `Di mana lokasi ${title}?`,
        a: district ? `Properti ini berada di ${district}, Bali. Koordinat tepat ada di peta di atas.` : 'Lokasi dan koordinat tepat ada di peta di atas.' },
      { q: 'Bisakah orang asing membeli apartemen di Bali?',
        a: 'Ya. Transaksi dilakukan melalui skema hak sewa (leasehold/sewa jangka panjang) di hadapan notaris PPAT. Sebagian besar pengembang bekerja dengan pembeli internasional.' },
      { q: 'Berapa jangka waktu hak sewa?',
        a: lease ? `Jangka waktu dasar adalah ${lease} tahun. Tanyakan syarat perpanjangan kepada pengembang.` : 'Tanyakan jangka waktu hak sewa kepada pengembang — biasanya 25–80 tahun dengan opsi perpanjangan.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` di ${district}` : ''} di Bali${price ? `. Harga ${price}.` : '.'} Foto, denah, dokumen.`,
  },
  fr: {
    home: 'Accueil', aptCrumb: 'Appartements',
    sqm: 'm²', floor: 'Étage', bali: 'Bali', completed: 'Livré',
    factsHeading: 'Caractéristiques',
    factArea: 'Surface', factFloor: 'Étage', factCompletion: 'Livraison',
    factPermits: 'Permis', factLeasehold: 'Bail (leasehold)', factDistrict: 'Quartier',
    factAirport: 'Vers l’aéroport', factGround: 'Rez-de-chaussée',
    factLeaseValue: (l: string) => `${l} ans`,
    descHeading: 'Description',
    complexLabel: 'Résidence',
    developerLabel: 'Promoteur',
    openComplex: 'Ouvrir la page de la résidence',
    openDeveloper: 'Ouvrir la page du promoteur',
    completedShort: 'livré',
    completion: (y: string) => `livraison ${y}`,
    units: (n: number) => `${n} unités`,
    sellingSeparately: 'Vendu séparément (hors résidence)',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonésie`,
    relatedHeading: 'À voir aussi',
    related: {
      allApartments: 'Tous les appartements de Bali',
      complexes: 'Résidences',
      villas: 'Villas',
      developers: 'Promoteurs de Bali',
      apartmentsIn: (d: string) => `Appartements à ${d}`,
    },
    faqHeading: 'Questions fréquentes',
    faq: (title: string, district: string | null, price: string | null, lease: string | null) => [
      { q: `Combien coûte ${title} ?`,
        a: price ? `Le prix actuel est ${price}. Le prix à jour est toujours affiché dans la fiche ci-dessus.` : 'Prix sur demande. Contactez-nous pour le prix actuel.' },
      { q: `Où se situe ${title} ?`,
        a: district ? `Le bien se trouve à ${district}, Bali. Les coordonnées exactes sont sur la carte ci-dessus.` : 'L’emplacement et les coordonnées exacts sont sur la carte ci-dessus.' },
      { q: 'Un étranger peut-il acheter un appartement à Bali ?',
        a: 'Oui. La transaction se fait en leasehold (bail longue durée) chez un notaire PPAT. La plupart des promoteurs travaillent avec des acheteurs internationaux.' },
      { q: 'Quelle est la durée du leasehold ?',
        a: lease ? `La durée de base est de ${lease} ans. Vérifiez les conditions de renouvellement auprès du promoteur.` : 'Vérifiez la durée du leasehold auprès du promoteur — généralement 25 à 80 ans avec options de renouvellement.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` à ${district}` : ''} à Bali${price ? `. Prix ${price}.` : '.'} Photos, plan, documents.`,
  },
  de: {
    home: 'Startseite', aptCrumb: 'Apartments',
    sqm: 'm²', floor: 'Etage', bali: 'Bali', completed: 'Fertiggestellt',
    factsHeading: 'Eckdaten',
    factArea: 'Fläche', factFloor: 'Etage', factCompletion: 'Fertigstellung',
    factPermits: 'Genehmigungen', factLeasehold: 'Leasehold', factDistrict: 'Gebiet',
    factAirport: 'Zum Flughafen', factGround: 'Erdgeschoss',
    factLeaseValue: (l: string) => `${l} Jahre`,
    descHeading: 'Beschreibung',
    complexLabel: 'Wohnanlage',
    developerLabel: 'Bauträger',
    openComplex: 'Zur Seite der Wohnanlage',
    openDeveloper: 'Zur Seite des Bauträgers',
    completedShort: 'fertiggestellt',
    completion: (y: string) => `Fertigstellung ${y}`,
    units: (n: number) => `${n} ${n === 1 ? 'Einheit' : 'Einheiten'}`,
    sellingSeparately: 'Einzeln verkauft (nicht Teil einer Wohnanlage)',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonesien`,
    relatedHeading: 'Ähnliches',
    related: {
      allApartments: 'Alle Apartments auf Bali',
      complexes: 'Wohnanlagen',
      villas: 'Villen',
      developers: 'Bauträger auf Bali',
      apartmentsIn: (d: string) => `Apartments in ${d}`,
    },
    faqHeading: 'Häufige Fragen',
    faq: (title: string, district: string | null, price: string | null, lease: string | null) => [
      { q: `Wie viel kostet ${title}?`,
        a: price ? `Der aktuelle Preis beträgt ${price}. Der aktuelle Preis wird immer in der Karte oben angezeigt.` : 'Preis auf Anfrage. Kontaktieren Sie uns für den aktuellen Preis.' },
      { q: `Wo befindet sich ${title}?`,
        a: district ? `Das Objekt liegt in ${district}, Bali. Die genauen Koordinaten finden Sie auf der Karte oben.` : 'Genauer Standort und Koordinaten auf der Karte oben.' },
      { q: 'Kann ein Ausländer ein Apartment auf Bali kaufen?',
        a: 'Ja. Der Kauf erfolgt über Leasehold (langfristige Pacht) bei einem PPAT-Notar. Die meisten Bauträger arbeiten mit internationalen Käufern.' },
      { q: 'Wie lange läuft der Leasehold?',
        a: lease ? `Die Grundlaufzeit beträgt ${lease} Jahre. Verlängerungsbedingungen erfragen Sie beim Bauträger.` : 'Erfragen Sie die Leasehold-Laufzeit beim Bauträger — üblich sind 25–80 Jahre mit Verlängerungsoption.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` in ${district}` : ''} auf Bali${price ? `. Preis ${price}.` : '.'} Fotos, Grundriss, Dokumente.`,
  },
  zh: {
    home: '首页', aptCrumb: '公寓',
    sqm: 'm²', floor: '楼层', bali: '巴厘岛', completed: '已交付',
    factsHeading: '核心信息',
    factArea: '面积', factFloor: '楼层', factCompletion: '交付',
    factPermits: '许可', factLeasehold: '租赁产权', factDistrict: '地区',
    factAirport: '至机场', factGround: '一楼',
    factLeaseValue: (l: string) => `${l} 年`,
    descHeading: '描述',
    complexLabel: '住宅区',
    developerLabel: '开发商',
    openComplex: '打开住宅区页面',
    openDeveloper: '打开开发商页面',
    completedShort: '已交付',
    completion: (y: string) => `${y} 年交付`,
    units: (n: number) => `${n} 套`,
    sellingSeparately: '单独出售（不属于任何住宅区）',
    locationLine: (d: string | null) => `${d ? `${d}，` : ''}印度尼西亚巴厘岛`,
    relatedHeading: '相关',
    related: {
      allApartments: '巴厘岛所有公寓',
      complexes: '住宅区',
      villas: '别墅',
      developers: '巴厘岛开发商',
      apartmentsIn: (d: string) => `${d}的公寓`,
    },
    faqHeading: '常见问题',
    faq: (title: string, district: string | null, price: string | null, lease: string | null) => [
      { q: `${title} 多少钱？`,
        a: price ? `目前的报价为 ${price}。最新价格始终显示在上方的卡片中。` : '价格面议。请联系我们获取最新价格。' },
      { q: `${title} 位于哪里？`,
        a: district ? `该房产位于巴厘岛${district}。精确坐标见上方地图。` : '精确位置和坐标见上方地图。' },
      { q: '外国人可以在巴厘岛购买公寓吗？',
        a: '可以。交易通过租赁产权（leasehold，长期租赁）在 PPAT 公证人处完成。大多数开发商都与国际买家合作。' },
      { q: '租赁产权的期限是多久？',
        a: lease ? `基础期限为 ${lease} 年。续期条件请向开发商咨询。` : '请向开发商咨询租赁产权期限——通常为 25–80 年，可续期。' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? `位于${district}` : ''}，巴厘岛${price ? `。价格 ${price}。` : '。'}照片、户型、文件。`,
  },
  nl: {
    home: 'Home', aptCrumb: 'Appartementen',
    sqm: 'm²', floor: 'Verdieping', bali: 'Bali', completed: 'Opgeleverd',
    factsHeading: 'Kerngegevens',
    factArea: 'Oppervlakte', factFloor: 'Verdieping', factCompletion: 'Oplevering',
    factPermits: 'Vergunningen', factLeasehold: 'Erfpacht', factDistrict: 'Gebied',
    factAirport: 'Naar luchthaven', factGround: 'Begane grond',
    factLeaseValue: (l: string) => `${l} jaar`,
    descHeading: 'Beschrijving',
    complexLabel: 'Wooncomplex',
    developerLabel: 'Ontwikkelaar',
    openComplex: 'Open pagina wooncomplex',
    openDeveloper: 'Open pagina ontwikkelaar',
    completedShort: 'opgeleverd',
    completion: (y: string) => `oplevering ${y}`,
    units: (n: number) => `${n} ${n === 1 ? 'unit' : 'units'}`,
    sellingSeparately: 'Apart verkocht (geen onderdeel van een complex)',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonesië`,
    relatedHeading: 'Gerelateerd',
    related: {
      allApartments: 'Alle appartementen op Bali',
      complexes: 'Wooncomplexen',
      villas: 'Villa\'s',
      developers: 'Ontwikkelaars op Bali',
      apartmentsIn: (d: string) => `Appartementen in ${d}`,
    },
    faqHeading: 'Veelgestelde vragen',
    faq: (title: string, district: string | null, price: string | null, lease: string | null) => [
      { q: `Hoeveel kost ${title}?`,
        a: price ? `De huidige vraagprijs is ${price}. De actuele prijs staat altijd in de kaart hierboven.` : 'Prijs op aanvraag. Neem contact met ons op voor de actuele prijs.' },
      { q: `Waar ligt ${title}?`,
        a: district ? `Het object ligt in ${district}, Bali. De exacte coördinaten staan op de kaart hierboven.` : 'Exacte locatie en coördinaten op de kaart hierboven.' },
      { q: 'Kan een buitenlander een appartement op Bali kopen?',
        a: 'Ja. De transactie verloopt via erfpacht (langlopende huur) bij een PPAT-notaris. De meeste ontwikkelaars werken met internationale kopers.' },
      { q: 'Wat is de erfpachttermijn?',
        a: lease ? `De basistermijn is ${lease} jaar. Vraag de verlengingsvoorwaarden na bij de ontwikkelaar.` : 'Vraag de erfpachttermijn na bij de ontwikkelaar — doorgaans 25–80 jaar met verlengingsopties.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` in ${district}` : ''} op Bali${price ? `. Prijs ${price}.` : '.'} Foto's, plattegrond, documenten.`,
  },
  ban: {
    home: 'Beranda', aptCrumb: 'Apartemen',
    sqm: 'm²', floor: 'Lanté', bali: 'Bali', completed: 'Puput',
    factsHeading: 'Fakta utama',
    factArea: 'Luas', factFloor: 'Lanté', factCompletion: 'Serah terima',
    factPermits: 'Ijin', factLeasehold: 'Hak séwa', factDistrict: 'Wewidangan',
    factAirport: 'Ka bandara', factGround: 'Lanté dasar',
    factLeaseValue: (l: string) => `${l} taun`,
    descHeading: 'Deskripsi',
    complexLabel: 'Kompleks umah',
    developerLabel: 'Pangwangun',
    openComplex: 'Bukak kaca kompleks',
    openDeveloper: 'Bukak kaca pangwangun',
    completedShort: 'puput',
    completion: (y: string) => `serah terima ${y}`,
    units: (n: number) => `${n} unit`,
    sellingSeparately: 'Kaadol soang-soangan (nénten wantah kompleks)',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonésia`,
    relatedHeading: 'Sané pateh',
    related: {
      allApartments: 'Sami apartemen ring Bali',
      complexes: 'Kompleks umah',
      villas: 'Vila',
      developers: 'Pangwangun ring Bali',
      apartmentsIn: (d: string) => `Apartemen ring ${d}`,
    },
    faqHeading: 'Patakon sané sering katakénang',
    faq: (title: string, district: string | null, price: string | null, lease: string | null) => [
      { q: `Ji kuda ${title}?`,
        a: price ? `Aji mangkin inggih punika ${price}. Aji sané anyar setata kacumawis ring kartu baduur.` : 'Aji manut pangaptin. Ngiring hubungin tiang antuk aji sané anyar.' },
      { q: `Ring dija genah ${title}?`,
        a: district ? `Properti puniki magenah ring ${district}, Bali. Koordinat sané pasti wénten ring peta baduur.` : 'Genah lan koordinat sané pasti wénten ring peta baduur.' },
      { q: 'Punapi anak dura negara dados numbas apartemen ring Bali?',
        a: 'Inggih. Transaksi kalaksanayang antuk skéma hak séwa (leasehold) ring notaris PPAT. Akéhan pangwangun makarya sareng pameli internasional.' },
      { q: 'Sapunapi suéné hak séwa?',
        a: lease ? `Suéné dasar inggih punika ${lease} taun. Takénang sarat perpanjangan ring pangwangun.` : 'Takénang suéné hak séwa ring pangwangun — biasané 25–80 taun sareng opsi perpanjangan.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` ring ${district}` : ''} ring Bali${price ? `. Aji ${price}.` : '.'} Foto, denah, dokumen.`,
  },
} as const

export const revalidate = 3600
export function generateStaticParams() { return [] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_manifest.json`
const DEV_LOOKUP_URL = `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_developers.json`
const COMPLEX_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

type Row = { airtable_id: string; data: Record<string, unknown> }
// Slim: проекция только нужных полей вместо всего data (~75кб/строка
// → ~300б/строка, -99% egress). findParentComplex матчит по name;
// карточка parentComplex в правой колонке статьи использует остальное.
type ComplexRow = {
  airtable_id: string
  slug: string | null
  cover_url: string | null
  name: string | null
  district: string | null
  district_alt: string | null
  types: unknown
  year: string | null
  year_trail: string | null
  units: number | null
  status: string | null
}

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}
function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/\s/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}
function parseGeo(v: unknown): number | null {
  // Airtable's «Geo» / «Geo 2» columns surface as arrays of strings
  // (often with stray whitespace, e.g. ['-8.840928 ']) for apartment
  // rows. The original `numberOrNull(v)` didn't recurse into arrays —
  // every apartment ended up with lat=null, lng=null, and the
  // InvestmentWidget + interactive map silently skipped rendering.
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.trim())
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(v) && v.length > 0) return parseGeo(v[0])
  return null
}
function fmtUsd(n: number | null): string | null {
  if (n == null) return null
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' $'
}
function cleanTitle(s: string | null): string | null {
  if (!s) return null
  return s.replace(/\s*\|\s*Balinsky\s*$/i, '').trim() || null
}
// Reject titles whose formula was missing the complex slot ("Апартаменты
// в  - 38 м²"). Same heuristic as in _lib.ts.
function isMalformedAptTitle(s: string | null): boolean {
  if (!s) return false
  return /(?:\s{2}|в\s+-|in\s+-|—\s*-|\bв\s*$)/i.test(s)
}
// Localized parts for the composed fallback apartment title. Mirrors
// apartamenty/_lib.ts APT_TITLE_TERMS so a card and its detail page agree.
// RU keeps its declined plural via pluralRu; every other language gets a
// native noun + district preposition + bedroom word — no English on
// /id, /fr, /de, /zh, /nl, /ban.
const APT_TITLE_TERMS: Record<Exclude<Lang, 'ru'>, {
  noun: string; inDistrict: (d: string) => string; bedroomWord: string
}> = {
  en:  { noun: 'Apartment',   inDistrict: d => `in ${d}`,   bedroomWord: 'BR' },
  id:  { noun: 'Apartemen',   inDistrict: d => `di ${d}`,   bedroomWord: 'kamar tidur' },
  fr:  { noun: 'Appartement', inDistrict: d => `à ${d}`,    bedroomWord: 'chambres' },
  de:  { noun: 'Apartment',   inDistrict: d => `in ${d}`,   bedroomWord: 'Schlafzimmer' },
  zh:  { noun: '公寓',         inDistrict: d => d,           bedroomWord: '卧室' },
  nl:  { noun: 'Appartement', inDistrict: d => `in ${d}`,   bedroomWord: 'slaapkamers' },
  ban: { noun: 'Apartemen',   inDistrict: d => `ring ${d}`, bedroomWord: 'kamar pules' },
}
// Native-language fallback for the Product schema description (only reached
// when the row has no SEO Text). Replaces the old `lang === 'ru' ? RU : EN`
// ternary so non-RU pages never leak English into structured data.
const APT_PRODUCT_DESC: Record<Lang, (bedrooms: number | null, district: string | null) => string> = {
  ru: (b, d) => `${b ? `${b}-комнатные ` : ''}апартаменты${d ? ` в ${d}` : ''} на Бали, Индонезия`,
  en: (b, d) => `${b ? `${b}-bedroom ` : ''}apartment${d ? ` in ${d}` : ''}, Bali, Indonesia`,
  id: (b, d) => `Apartemen${b ? ` ${b} kamar tidur` : ''}${d ? ` di ${d}` : ''}, Bali, Indonesia`,
  fr: (b, d) => `Appartement${b ? ` de ${b} chambres` : ''}${d ? ` à ${d}` : ''}, Bali, Indonésie`,
  de: (b, d) => `${b ? `${b}-Zimmer-` : ''}Apartment${d ? ` in ${d}` : ''}, Bali, Indonesien`,
  zh: (b, d) => `${d ? `${d}` : ''}${b ? `${b}居室` : ''}公寓，印度尼西亚巴厘岛`,
  nl: (b, d) => `${b ? `${b}-slaapkamer ` : ''}appartement${d ? ` in ${d}` : ''}, Bali, Indonesië`,
  ban: (b, d) => `Apartemen${b ? ` ${b} kamar pules` : ''}${d ? ` ring ${d}` : ''}, Bali, Indonesia`,
}
function fallbackAptTitle(district: string | null, area: number | null, bedrooms: number | null, lang: Lang): string {
  const parts: string[] = []
  const tail: string[] = []
  if (lang === 'ru') {
    parts.push('Апартаменты')
    if (district) parts.push(`в ${district}`)
    if (area != null) tail.push(`${area} м²`)
    if (bedrooms != null) tail.push(`${bedrooms} ${pluralRu(bedrooms, ['спальня', 'спальни', 'спален'])}`)
  } else {
    const T = APT_TITLE_TERMS[lang]
    parts.push(T.noun)
    if (district) parts.push(T.inDistrict(district))
    if (area != null) tail.push(`${area} m²`)
    if (bedrooms != null) tail.push(`${bedrooms} ${T.bedroomWord}`)
  }
  return [parts.join(' '), tail.join(', ')].filter(Boolean).join(' — ')
}

// Slug → id index. Loaded from Storage manifest (avoids 14MB raw_apartments query).
// `aliases` carries the legacy "dirty" Airtable slug (cyrillic look-
// alikes, parens, etc.) so old GSC-cached URLs can resolve to the
// same id and 301 to the canonical clean slug.
type AptIndexEntry = { id: string; slug: string; district: string | null; aliases?: string[] }
const APT_INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/feeds/_apartments-index.json`
let _aptIndexCache: { ts: number; data: AptIndexEntry[] } | null = null
let _aptIndexInflight: Promise<AptIndexEntry[]> | null = null

async function _loadApartmentIndex(): Promise<AptIndexEntry[]> {
  if (_aptIndexCache && Date.now() - _aptIndexCache.ts < 30 * 60 * 1000) return _aptIndexCache.data
  if (_aptIndexInflight) return _aptIndexInflight
  _aptIndexInflight = (async () => {
    try {
      const r = await fetch(APT_INDEX_URL, { next: { revalidate: 10 } })
      if (!r.ok) return _aptIndexCache?.data ?? []
      const j = await r.json() as { items: AptIndexEntry[] }
      const items = j.items ?? []
      _aptIndexCache = { ts: Date.now(), data: items }
      return items
    } catch {
      return _aptIndexCache?.data ?? []
    }
  })().finally(() => { _aptIndexInflight = null })
  return _aptIndexInflight
}
const _loadApartmentById = unstable_cache(
  async (id: string): Promise<Row | null> => {
    const [{ data }, enCache] = await Promise.all([
      sb.from('raw_apartments').select('airtable_id, data').eq('airtable_id', id).maybeSingle(),
      loadAllTranslations('apartments'),
    ])
    const raw = (data as Row | null) ?? null
    if (!raw) return null
    // Mirror what the catalog loader does — merge cached EN translations
    // into the row so tField() picks them up. Detail page never hits the
    // catalog loadAllApartments, so the merge has to live here too.
    return { ...raw, data: mergeAllTranslations(raw.data, raw.airtable_id, enCache) }
  },
  ['apartment-by-id-detail-v2'],
  { revalidate: 3600 },
)
const _loadAptManifest = unstable_cache(
  async (): Promise<Record<string, string[]>> => {
    try {
      const r = await fetch(cdnManifestUrl(PHOTO_MANIFEST_URL, 600))
      return r.ok ? r.json() : {}
    } catch { return {} }
  },
  ['apt-manifest-detail'],
  { revalidate: 3600 },
)
const _loadDevLookup = unstable_cache(
  async (): Promise<Record<string, string>> => {
    // Throw on fetch failure so empty {} doesn't get cached for an
    // hour and break developer cross-links on every apartment page.
    const r = await fetch(DEV_LOOKUP_URL)
    if (!r.ok) throw new Error(`dev-lookup http_${r.status}`)
    const j = await r.json() as Record<string, string>
    if (Object.keys(j).length === 0) throw new Error('dev-lookup returned empty — refusing to cache')
    return j
  },
  ['dev-lookup-detail-v2'],
  { revalidate: 600 },
)
// Full developer index (slug + logo + a few highlights) so the apartment
// detail page can render the same rich developer card the villa page
// shows — clickable link to /ru/zastrojshhiki/<slug>, logo, top 3
// editorial bullets from «Репутация и опыт». Mirrors villy/_detail.tsx.
type DeveloperLite = {
  slug: string
  name: string
  logoUrl: string | null
  highlights: string[]
}
// JSON-projection вместо `data` целиком: -98% egress на этом индексе.
type DeveloperSlimRow = {
  airtable_id: string
  logo_url: string | null
  published: boolean | null
  name: string | null
  slug: string | null
  reputation: string | null
  construction: string | null
}
const _loadDevelopersIndex = unstable_cache(
  async (): Promise<DeveloperLite[]> => {
    const { data, error } = await sb.from('raw_developers').select(`
      airtable_id, logo_url,
      published:data->"Публикация",
      name:data->Developer,
      slug:data->"SEO:Slug",
      reputation:data->"Репутация и опыт",
      construction:data->"Строительство и недвижимость"
    `).limit(200)
    if (error) throw new Error(`raw_developers: ${error.message}`)
    const rows = (data ?? []) as DeveloperSlimRow[]
    if (rows.length === 0) throw new Error('raw_developers returned 0 rows — refusing to cache empty')
    const out: DeveloperLite[] = []
    for (const r of rows) {
      if (r.published !== true) continue
      if (!r.name || !r.slug) continue
      const sourceText = r.reputation ?? r.construction ?? ''
      const highlights = sourceText
        .split('\n')
        .map(l => l.replace(/^[\s•\-–—·]+/, '').trim())
        .filter(Boolean)
        .filter(l => !isMetaBullet(l)) // drop AI meta-commentary junk
        .slice(0, 3)
      out.push({ slug: r.slug, name: r.name, logoUrl: r.logo_url, highlights })
    }
    return out
  },
  ['apt-developers-index-v2'],
  { revalidate: 600 },
)
function findDeveloperByName(targetName: string | null, list: DeveloperLite[]): DeveloperLite | null {
  if (!targetName) return null
  const t = targetName.toLowerCase().trim()
  return list.find(d => d.name.toLowerCase() === t)
    ?? list.find(d => d.name.toLowerCase().includes(t) || t.includes(d.name.toLowerCase()))
    ?? null
}
// Complexes — small set (186 rows), but full data ~9MB. Module cache + paginated fetch.
let _complexesCache: { ts: number; data: ComplexRow[] } | null = null
let _complexesInflight: Promise<ComplexRow[]> | null = null

async function _loadAllComplexes(): Promise<ComplexRow[]> {
  if (_complexesCache && Date.now() - _complexesCache.ts < 30 * 60 * 1000) return _complexesCache.data
  if (_complexesInflight) return _complexesInflight
  _complexesInflight = (async () => {
    try {
      const out: ComplexRow[] = []
      for (let from = 0; from < 1000; from += 100) {
        // Slim projection: 189 строк × ~75кб/data = ~14МБ → теперь ~70кб.
        const { data, error } = await sb.from('raw_complexes').select(`
          airtable_id, slug, cover_url,
          name:data->Project,
          district_alt:data->Location,
          district:data->"Location 2",
          types:data->"Типы юнитов",
          year:data->"Year of completion",
          year_trail:data->"Year of completion ",
          units:data->"Total quantity of units",
          status:data->"Статус"
        `).range(from, from + 99)
        if (error || !data || data.length === 0) break
        out.push(...(data as ComplexRow[]))
        if (data.length < 100) break
      }
      // raw_complexes.cover_url указывает на мёртвый путь complex-covers/* (404).
      // Подменяем первым фото из синк-манифеста complex-photos (как ComplexCard),
      // исходный cover_url остаётся fallback'ом.
      try {
        const r = await fetch(cdnManifestUrl(COMPLEX_PHOTO_MANIFEST_URL, 600), { next: { revalidate: 600 } })
        if (r.ok) {
          const manifest = (await r.json()) as Record<string, string[]>
          for (const c of out) c.cover_url = manifest[c.airtable_id]?.[0] ?? c.cover_url
        }
      } catch { /* fallback to cover_url */ }
      _complexesCache = { ts: Date.now(), data: out }
      return out
    } catch { return _complexesCache?.data ?? [] }
  })().finally(() => { _complexesInflight = null })
  return _complexesInflight
}


// Resolve a URL slug (possibly the dirty alias from a legacy GSC link)
// to { row, canonicalSlug }. Detail page redirects 301 when the URL
// slug isn't already canonical.
async function resolveApartment(urlSlug: string): Promise<{ row: Row; canonicalSlug: string } | null> {
  const idx = await _loadApartmentIndex()
  // Direct match on the canonical slug (the common case).
  let entry = idx.find(e => e.slug === urlSlug)
  if (!entry) {
    // Alias lookup: normalised version of the URL slug, then any
    // explicit alias the index carries.
    const normalised = normalizeSlug(urlSlug)
    entry = idx.find(e => e.slug === normalised) || idx.find(e => e.aliases?.includes(urlSlug))
  }
  if (!entry) return null
  const row = await _loadApartmentById(entry.id)
  if (!row) return null
  return { row, canonicalSlug: entry.slug }
}

async function loadApartmentBySlug(slug: string): Promise<Row | null> {
  const r = await resolveApartment(slug)
  return r?.row ?? null
}

// Best-effort match of apartment to its parent complex by extracting the
// complex name from the SEO:Title and finding it in raw_complexes.
function findParentComplex(aptTitle: string, complexes: ComplexRow[]): ComplexRow | null {
  const lower = aptTitle.toLowerCase()
  let best: { c: ComplexRow; len: number } | null = null
  for (const c of complexes) {
    if (!c.name) continue
    const n = c.name.toLowerCase()
    if (n.length < 4) continue
    if (lower.includes(n)) {
      if (!best || n.length > best.len) best = { c, len: n.length }
    }
  }
  return best?.c ?? null
}

async function loadOtherApartmentsInDistrict(district: string | null, exceptId: string, lang: Lang = 'ru') {
  if (!district) return []
  const [idx, manifest] = await Promise.all([_loadApartmentIndex(), _loadAptManifest()])
  const candidates = idx.filter(e => e.id !== exceptId && e.district === district).slice(0, 4)
  const rows = await Promise.all(candidates.map(c => _loadApartmentById(c.id)))
  const out: (ApartmentCardData & { id: string })[] = []
  for (const r of rows) {
    if (!r) continue
    const slug = firstString(r.data['SEO:Slug'])
    if (!slug) continue
    // tField returns EN if available (RU fallback after the i18n fix).
    const titleRaw = tField(r.data, 'SEO:Title', lang) ?? tField(r.data, 'ИИ Имя', lang) ?? slug
    const title = titleRaw.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
    out.push({
      id: r.airtable_id,
      slug,
      title,
      priceUsd: numberOrNull(r.data['price_usd'] ?? r.data['Цена']),
      bedrooms: numberOrNull(r.data['Комнаты']),
      area: numberOrNull(r.data['Площадь']),
      floor: firstString(r.data['Этаж']),
      photos: manifest[r.airtable_id] ?? [],
    })
  }
  return out
}

export async function generateApartmentMetadata(slug: string, lang: Lang) {
  const a = await loadApartmentBySlug(slug)
  if (!a) return { robots: { index: false } }
  const d = a.data
  const c = pickCopy(COPY, lang)
  const titleRaw = tField(d, 'SEO:Title', lang) ?? tField(d, 'ИИ Имя', lang) ?? slug
  let title = cleanTitle(titleRaw) ?? slug
  if (isMalformedAptTitle(title)) {
    title = fallbackAptTitle(firstString(d['Location filter']), numberOrNull(d['Площадь']), numberOrNull(d['Комнаты']), lang)
  }
  const seoTextRaw = tField(d, 'SEO Text', lang) ?? tField(d, 'Notes', lang)
  // A bad AI translation may have stored Russian into `SEO Text EN` (or the
  // suffix is missing and tField returns the raw RU). Never emit Cyrillic on a
  // non-RU page — transliterate to Latin as a last resort.
  const seoText = lang !== 'ru' && seoTextRaw && hasCyrillic(seoTextRaw) ? translitPreserveCase(seoTextRaw) : seoTextRaw
  const districtRaw = firstString(d['Location filter'])
  // Cyrillic district on /ru, raw Latin on /en. Raw is preserved for
  // Schema.org address fields where Latin is canonical.
  const district = lang === 'ru' ? districtRu(districtRaw) : districtRaw
  const price = fmtUsd(numberOrNull(d['price_usd'] ?? d['Цена']))
  const description = seoText
    ? seoText.slice(0, 160).trim() + (seoText.length > 160 ? '…' : '')
    : c.metaFallback(title, district, price)
  const ruPath = `/ru/apartamenty/o/${slug}`
  const enPath = `/en/apartments/o/${slug}`
  const path = switchLangPath(ruPath, lang)
  return {
    title: `${title} | Balinsky`,
    description,
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` , 'x-default': `${SITE_URL}${ruPath}`},
    },
    openGraph: { title, description, type: 'website' as const, url: `${SITE_URL}${path}` },
  }
}

export async function ApartmentDetail({ slug, lang }: { slug: string; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  // Canonical-slug redirect: legacy GSC links carry dirty slugs
  // (cyrillic look-alikes, parens). Resolve resolves either form and
  // tells us the canonical; redirect 301 if the URL doesn't match.
  const resolved = await resolveApartment(slug)
  if (!resolved) notFound()
  if (resolved.canonicalSlug !== slug) {
    const path = switchLangPath(`/ru/apartamenty/o/${resolved.canonicalSlug}`, lang)
    permanentRedirect(path)
  }
  const a = resolved.row

  const d = a.data
  const [manifest, devMap, complexes] = await Promise.all([
    _loadAptManifest(),
    _loadDevLookup(),
    _loadAllComplexes(),
  ])

  const titleRaw = tField(d, 'ИИ Имя', lang) ?? tField(d, 'SEO:Title', lang) ?? slug
  let title = cleanTitle(titleRaw) ?? slug
  const photos = (manifest[a.airtable_id] ?? []).slice(0, 12)
  const districtRaw = firstString(d['Location filter'])
  const district = lang === 'ru' ? districtRu(districtRaw) : districtRaw
  // District orientation card: only when the district maps to a real hub
  // slug (DISTRICT_TO_SLUG) AND we have editorial copy for it.
  const districtSlug = districtRaw ? DISTRICT_TO_SLUG[districtRaw] ?? null : null
  const districtCopy = districtSlug ? getDistrictCopy(districtSlug, lang) : null
  const bedrooms = numberOrNull(d['Комнаты'])
  const area = numberOrNull(d['Площадь'])
  if (isMalformedAptTitle(title)) {
    title = fallbackAptTitle(district, area, bedrooms, lang)
  }
  const floor = firstString(d['Этаж'])
  const priceNum = numberOrNull(d['price_usd'] ?? d['Цена'])
  const priceM2 = numberOrNull(d['Цена м²'])
  const priceUpdatedAt = firstString(d['Обновление цены']) ?? firstString(d['Последнее обновление']) ?? firstString(d['Обновлено'])
  const yearRaw = firstString(d['Year of completion'])
  const status = firstString(d['Статус'])
  const permit = firstString(d['Разрешение'])
  const lease = firstString(d['Leasehold']) ?? firstString(d['Leashold'])
  const lat = parseGeo(d['Geo'])
  const lng = parseGeo(d['Geo 2'])
  const seoTextRaw = tField(d, 'SEO Text', lang) ?? tField(d, 'Notes', lang)
  // De-Cyrillic guard: a bad `SEO Text EN` (or missing suffix) can leak Russian
  // into the on-page description / Product schema on a non-RU page.
  const seoText = lang !== 'ru' && seoTextRaw && hasCyrillic(seoTextRaw) ? translitPreserveCase(seoTextRaw) : seoTextRaw
  const kb = await loadKbPageContent('apartment', a.airtable_id, lang)
  // Non-RU: prefer the native-language SEO Text over the RU/EN-only KB body.
  const pageBodyRaw = lang === 'ru' ? (kb?.body ?? seoText) : (seoText ?? kb?.body ?? null)
  const pageBody = lang !== 'ru' && pageBodyRaw && hasCyrillic(pageBodyRaw) ? translitPreserveCase(pageBodyRaw) : pageBodyRaw
  const vision = await loadListingVision('apartment', a.airtable_id)
  const photoAlts = photos.map((_, i) => altFor(vision, i, lang, title))
  // Resale: drop the developer-manager CTA and route the visitor to
  // the owner's direct link stored in «Контакт продавца».
  const dealTypeRaw = (firstString(d['Тип сделки']) ?? '').toLowerCase()
  const isResale = /перепрод|resale|вторич|secondary/.test(dealTypeRaw)
  const sellerUrl = isResale ? firstString(d['Контакт продавца']) : null

  // Developer lookup via apartment-base devmap
  const devRefs = Array.isArray(d['Developer']) ? (d['Developer'] as unknown[]) : []
  const devName = devRefs
    .map(id => (typeof id === 'string' ? devMap[id] : null))
    .find(n => !!n) ?? null
  const devStats = await getDeveloperStats(devName)

  // Parent complex (best-effort by name match in title)
  const parentComplex = findParentComplex(title, complexes)
  const parentComplexName = parentComplex?.name ?? null

  const [otherApts, managers, activeReservation, landProfile, marketStats, developers, nearby] = await Promise.all([
    loadOtherApartmentsInDistrict(district, a.airtable_id, lang),
    loadManagersByDeveloperName(devName),
    findActiveReservation('apartment', a.airtable_id),
    loadLandProfile('apartment', a.airtable_id),
    loadMarketStats('apartment', a.airtable_id),
    _loadDevelopersIndex(),
    loadNearbyPlaces(a.airtable_id).catch(() => null),
  ])
  const developer = findDeveloperByName(devName, developers)
  const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''

  // Videos for parent complex (or empty), filtered by site language.
  const allVideos = (await loadAllVideos().catch(() => []))
    .filter(v => videoMatchesLang(v, lang))
  const aptVideos = parentComplex?.slug
    ? allVideos.filter(v => v.complexes.some(c => c.slug === parentComplex.slug)).slice(0, 6)
    : []

  const facts: { Icon: typeof BedDouble; label: string; value: ReactNode }[] = [
    bedrooms != null && { Icon: BedDouble, label: pickCopy({ ru: 'Спальни', en: 'Bedrooms', id: 'Kamar tidur', fr: 'Chambres', de: 'Schlafzimmer', zh: '卧室', nl: 'Slaapkamers', ban: 'Kamar pules' }, lang), value: `${bedrooms} BR` },
    area != null && { Icon: Square, label: c.factArea, value: `${area} ${c.sqm}` },
    floor && { Icon: Layers, label: c.factFloor, value: floor === 'GROUND FLOOR' ? c.factGround : floor },
    yearRaw && { Icon: Calendar, label: c.factCompletion, value: status?.toLowerCase().includes('построен') ? c.completed : yearRaw },
    permit && permit.toLowerCase() !== 'нет' && { Icon: FileCheck2, label: c.factPermits, value: permit },
    lease && { Icon: Lock, label: c.factLeasehold, value: c.factLeaseValue(lease) },
    district && { Icon: MapPin, label: c.factDistrict, value: district },
    fmtAirportDistance(lat, lng, lang) && { Icon: Plane, label: c.factAirport, value: fmtAirportDistance(lat, lng, lang)! },
    // Price/m² lives in the PriceCtaCard right under the hero, no need
    // to duplicate it here.
  ].filter(Boolean) as { Icon: typeof BedDouble; label: string; value: ReactNode }[]

  // kb.faq is EN-only (KB stores RU + EN). For non-RU pages prefer the native
  // localized c.faq(...) template so de/zh/nl/id/fr/ban don't render English.
  const faqItems = lang === 'ru'
    ? ((kb?.faq && kb.faq.length) ? kb.faq : c.faq(title, district, fmtUsd(priceNum), lease))
    : c.faq(title, district, fmtUsd(priceNum), lease)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  }

  const productJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    url: `${SITE_URL}${switchLangPath(`/ru/apartamenty/o/${slug}`, lang)}`,
    category: 'Apartment',
  }
  if (photos.length > 0) productJsonLd.image = photos.slice(0, 5)
  productJsonLd.description = seoText?.slice(0, 500)
    ?? pickCopy(APT_PRODUCT_DESC, lang)(bedrooms, district)
  productJsonLd.brand = { '@type': 'Brand', name: devName ?? 'Balinsky' }
  if (priceNum != null) {
    productJsonLd.offers = {
      '@type': 'Offer',
      price: Math.round(priceNum),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}${switchLangPath(`/ru/apartamenty/o/${slug}`, lang)}`,
      // Real-estate sales don't ship and don't return — explicit
      // declarations satisfy Google Merchant validator without faking
      // e-commerce semantics.
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'USD' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'ID' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'ID',
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
      },
    }
  }

  const placeJsonLd: Record<string, unknown> | null =
    lat != null && lng != null
      ? {
          '@context': 'https://schema.org',
          '@type': 'Apartment',
          name: title,
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'ID',
            addressRegion: 'Bali',
            addressLocality: districtRaw ?? 'Bali',
          },
          geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng },
          numberOfRooms: bedrooms ?? undefined,
          floorSize: area != null ? { '@type': 'QuantitativeValue', value: area, unitCode: 'MTK' } : undefined,
          // No offers on Apartment — Schema Validator warns "Offer
          // expected on Product / Service". Price lives on the separate
          // Product JSON-LD a bit below.
        }
      : null

  const home = switchLangPath('/ru', lang)
  const apartmentsRoot = switchLangPath('/ru/apartamenty', lang)
  const complexesRoot = switchLangPath('/ru/zhilye-kompleksy', lang)
  const villasRoot = switchLangPath('/ru/villy', lang)
  const developersRoot = switchLangPath('/ru/zastrojshhiki', lang)

  return (
    <>
      <Header active="apartamenty" />
      <PageViewTracker kind="apartment" slug={slug} title={title} airtableId={a.airtable_id} lang={lang} />
      <PageContainer>
        <Breadcrumbs currentUrl={`${apartmentsRoot}/o/${slug}`} items={[
          { label: c.home, href: home },
          { label: c.aptCrumb, href: apartmentsRoot },
          // Regency crumb dropped (no page → no `item` → GSC error).
          ...(district ? [{ label: district, href: `${apartmentsRoot}/${districtRaw!.toLowerCase().replace(/\s+/g, '-')}` }] : []),
          { label: title },
        ]} />

        <section className="mb-6 mt-2">
          <PhotoGalleryHero
            photos={photos}
            alt={title}
            alts={photoAlts}
            wishlistItem={{
              kind: 'apartment', slug, title,
              photo: photos[0] ?? null,
              priceUsd: priceNum ?? null,
              district: district ?? null,
              bedrooms: bedrooms ?? null,
              area: area ?? null,
              floor: floor ?? null,
              pricePerSqmUsd: priceM2 ?? null,
              pricePerSqmYearUsd: numberOrNull(d['Цена м² в год']),
              leaseYears: lease ? Number(lease) || null : null,
              permit: permit && permit.toLowerCase() !== 'нет' ? permit : null,
              status: status ?? null,
              claimedYieldPct: (() => {
                const y = numberOrNull(d['Заявленная доходность'])
                return y != null ? Math.round(y * 1000) / 10 : null
              })(),
              landUse: firstString(d['Назначение земли']) ?? null,
              developerName: devName,
              developerCompletedCount: devStats?.ready ?? null,
              developerInProgressCount: devStats?.inProgress ?? null,
              airtableId: a.airtable_id,
            }}
          />
        </section>

        <section className="mb-10">
          <div className="text-[13px] text-[var(--color-text-muted)] mb-2">
            <Link href={apartmentsRoot} className="hover:text-[var(--color-text)]">{c.aptCrumb}</Link>
            {district && <> · {district}</>}
          </div>
          <h1 className="text-[18px] sm:text-[24px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.25] md:leading-[1.1] mb-3 [word-break:break-word] [overflow-wrap:anywhere]">
            {title}
          </h1>
          <div className="text-[15px] text-[var(--color-text-muted)] leading-relaxed mb-4 flex items-center flex-wrap gap-x-5 gap-y-1">
            {bedrooms != null && <span>{bedrooms} BR</span>}
            {area != null && <span>{area} {c.sqm}</span>}
            {floor && <span>{c.floor}: {floor}</span>}
            {district && <span>{districtRaw ? geoChainString(districtRaw) : `${district}, ${c.bali}`}</span>}
          </div>
          {priceNum != null && (
            <PriceCtaCard
              priceUsd={priceNum}
              pricePerSqmUsd={priceM2}
              updatedAt={priceUpdatedAt}
              managerId={managers[0]?.id ?? null}
              sellerUrl={sellerUrl}
              listingKind="apartment"
              listingId={a.airtable_id}
              listingSlug={slug}
              listingTitle={title}
              reservedUntil={activeReservation?.expires_at ?? null}
              presentationButton={
                <VillaPresentationButton
                  variant="outline"
                  lang={lang}
                  villaId={a.airtable_id}
                  slug={slug}
                  kind="apartment"
                  title={title}
                  district={district}
                  photos={photos}
                  priceUsd={priceNum}
                  pricePerM2={priceM2}
                  bedrooms={bedrooms}
                  area={area}
                  land={null}
                  yearLabel={yearRaw && status?.toLowerCase().includes('построен') ? c.completed : (yearRaw ?? null)}
                  lease={lease}
                  permit={permit}
                  lat={lat}
                  lng={lng}
                  seoText={pageBody}
                />
              }
            />
          )}
        </section>

        {facts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {c.factsHeading}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {facts.map(({ Icon, label, value }) => (
                <div key={label} className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
                  <div className="flex items-center gap-2 mb-2 text-[var(--color-text-muted)]">
                    <Icon size={16} />
                    <span className="text-[12px] uppercase tracking-wide">{label}</span>
                  </div>
                  <div className="text-[16px] font-semibold text-[#111827]">{value}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {seoText && (
          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              {c.descHeading}
            </h2>
            <ExpandableText className="max-w-3xl" more={pickCopy({ ru: 'Подробнее', en: 'Read more', id: 'Selengkapnya', fr: 'En savoir plus', de: 'Mehr anzeigen', zh: '展开', nl: 'Meer', ban: 'Selengkapnya' }, lang)} less={pickCopy({ ru: 'Свернуть', en: 'Show less', id: 'Tutup', fr: 'Réduire', de: 'Weniger', zh: '收起', nl: 'Minder', ban: 'Tutup' }, lang)}>
              <div className="prose-balinsky text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
                {seoText}
              </div>
            </ExpandableText>
          </section>
        )}

        {/* Investment potential + interactive map — right under the description,
            above the land profile and the neighbour-rental block. */}
        {lat != null && lng != null && (
          <LazyMount fallback={<div className="mt-12 mb-10 min-h-[600px]" />}>
            <InvestmentWidget villaId={a.airtable_id} apiKey={GMAPS_KEY} kind="apartment" lang={lang} />
          </LazyMount>
        )}

        {nearby && (
          <NearbyPlaces categories={nearby.categories} byCategory={nearby.byCategory} lang={lang} />
        )}

        {districtCopy && districtSlug && (
          <DistrictAboutCard copy={districtCopy} lang={lang} kind="apartment" hubHref={`${apartmentsRoot}/${districtSlug}`} />
        )}

        {/* LandProfile + MarketStats — sits right under the description
            on villa pages too, so the buyer sees the zoning + neighbour
            rental data before getting to the developer / manager. */}
        {(
          landAllowsBuilding(landProfile, 'apartment')
          || (marketStats && (marketStats.villa_count > 0 || marketStats.apartment_count > 0))
        ) && (
          <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {landAllowsBuilding(landProfile, 'apartment') && (
              <LazyMount fallback={<div className="min-h-[480px] rounded-2xl bg-[var(--color-search-bg)]" />}>
                <LandProfileBlock data={landProfile!} lang={lang} />
              </LazyMount>
            )}
            {marketStats && (marketStats.villa_count > 0 || marketStats.apartment_count > 0) && (
              <MarketStatsBlock data={marketStats} lang={lang} />
            )}
          </section>
        )}

        {(parentComplex || developer || devName) && (
          <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* COMPLEX (left) */}
            {parentComplex ? (
              <Link
                href={`${complexesRoot}/o/${parentComplex.slug}`}
                className="group block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
              >
                {parentComplex.cover_url && (
                  <div className="relative h-[160px] bg-[var(--color-search-bg)]">
                    <Image src={parentComplex.cover_url} alt={parentComplexName ?? ''} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                    <Building2 size={14} /> {c.complexLabel}
                  </div>
                  <div className="text-[19px] font-semibold text-[#111827] mb-2">{parentComplexName}</div>
                  {(() => {
                    const pcDistrict = parentComplex.district ?? parentComplex.district_alt
                    const pcTypesRaw = Array.isArray(parentComplex.types) ? (parentComplex.types as unknown[]).map(String) : []
                    const pcYearRaw = parentComplex.year_trail ?? parentComplex.year
                    const pcStatus = parentComplex.status
                    const pcUnits = parentComplex.units
                    const hasMeta = pcDistrict || pcTypesRaw.length || pcYearRaw || pcUnits != null
                    return hasMeta ? (
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[13px] text-[var(--color-text-muted)] mb-4">
                        {pcDistrict && <span>{pcDistrict}</span>}
                        {pcTypesRaw.length > 0 && <span>{pcTypesRaw.join(', ')}</span>}
                        {pcYearRaw && (
                          <span>{pcStatus?.toLowerCase().includes('построен') ? c.completedShort : c.completion(pcYearRaw)}</span>
                        )}
                        {pcUnits != null && <span>{c.units(pcUnits)}</span>}
                      </div>
                    ) : null
                  })()}
                  <div className="text-[13px] text-[var(--color-primary-pressed)] font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    {c.openComplex} <ChevronRight size={14} />
                  </div>
                </div>
              </Link>
            ) : (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 opacity-60">
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  <Building2 size={14} /> {c.complexLabel}
                </div>
                <div className="text-[15px] text-[var(--color-text-muted)]">{c.sellingSeparately}</div>
              </div>
            )}

            {/* DEVELOPER (right) */}
            {developer ? (
              <Link
                href={`${developersRoot}/${developer.slug}`}
                className="group block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="p-5 flex items-start gap-4">
                  <div className="shrink-0 w-[72px] h-[72px] rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center p-2">
                    {developer.logoUrl ? (
                      <Image src={developer.logoUrl} alt={developer.name} width={56} height={56} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <HardHat size={28} className="text-[var(--color-text-muted)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                      <HardHat size={14} /> {c.developerLabel}
                    </div>
                    <div className="text-[19px] font-semibold text-[#111827] truncate">{developer.name}</div>
                  </div>
                </div>
                {developer.highlights.length > 0 && (
                  <div className="px-5 pb-2">
                    <ul className="space-y-1.5 text-[13px] text-[var(--color-text)]">
                      {developer.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Star size={12} className="mt-1 shrink-0 text-[var(--color-primary)]" />
                          <span>{lang !== 'ru' && hasCyrillic(h) ? translitPreserveCase(h) : h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="px-5 pb-5 pt-2 text-[13px] text-[var(--color-primary-pressed)] font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  {c.openDeveloper} <ChevronRight size={14} />
                </div>
              </Link>
            ) : devName ? (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  <HardHat size={14} /> {c.developerLabel}
                </div>
                <div className="text-[19px] font-semibold text-[#111827]">{devName}</div>
              </div>
            ) : null}
          </section>
        )}

        {managers.length > 0 && <ManagerCard managers={managers} developerName={devName} />}

        <RentalCompareSection
          district={district}
          bedrooms={bedrooms}
          villaPriceUsd={priceNum}
          lang={lang}
        />

        {aptVideos.length > 0 && (
          <VideoGrid videos={aptVideos} title={parentComplexName ? `${pickCopy({ ru: 'Видео', en: 'Videos', id: 'Video', fr: 'Vidéos', de: 'Videos', zh: '视频', nl: "Video's", ban: 'Video' }, lang)}: ${parentComplexName}` : pickCopy({ ru: 'Видео', en: 'Videos', id: 'Video', fr: 'Vidéos', de: 'Videos', zh: '视频', nl: "Video's", ban: 'Video' }, lang)} />
        )}

        {otherApts.length > 0 && district && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {pickCopy({ ru: `Другие апартаменты в районе ${district}`, en: `Other apartments in ${district}`, id: `Apartemen lain di ${district}`, fr: `Autres appartements à ${district}`, de: `Weitere Apartments in ${district}`, zh: `${district}的其他公寓`, nl: `Andere appartementen in ${district}`, ban: `Apartemen lianan ring ${district}` }, lang)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {otherApts.map(o => <ApartmentCard key={o.id} a={o} lang={lang} />)}
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">{c.relatedHeading}</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-3xl">
            {[
              { href: apartmentsRoot, label: c.related.allApartments },
              { href: complexesRoot, label: c.related.complexes },
              { href: villasRoot, label: c.related.villas },
              { href: developersRoot, label: c.related.developers },
              ...(district ? [
                { href: `${apartmentsRoot}/${districtRaw!.toLowerCase().replace(/\s+/g, '-')}`, label: c.related.apartmentsIn(district) },
              ] : []),
              ...(bedrooms ? [
                { href: `${apartmentsRoot}/${bedrooms}-spaln${bedrooms === 1 ? 'ya' : 'i'}`, label: pickCopy({ ru: `${bedrooms}-комнатные апартаменты`, en: `${bedrooms}-bedroom apartments`, id: `Apartemen ${bedrooms} kamar`, fr: `Appartements ${bedrooms} chambres`, de: `${bedrooms}-Zimmer-Apartments`, zh: `${bedrooms}居室公寓`, nl: `${bedrooms}-slaapkamerappartementen`, ban: `Apartemen ${bedrooms} kamar` }, lang) },
              ] : []),
            ].map(l => (
              <li key={l.href + l.label}>
                <Link href={l.href} className="inline-flex items-center gap-1 text-[14px] text-[var(--color-text)] hover:text-[var(--color-primary-pressed)]">
                  <ChevronRight size={14} className="text-[var(--color-primary)]" /> {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
            {c.faqHeading}
          </h2>
          <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
            {faqItems.map((it, i) => (
              <details key={i} className="group py-4">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-medium text-[#111827]">
                  {it.q}
                  <span className="text-[var(--color-text-muted)] text-[20px] leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">{it.a}</p>
              </details>
            ))}
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
        {placeJsonLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }} />
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
