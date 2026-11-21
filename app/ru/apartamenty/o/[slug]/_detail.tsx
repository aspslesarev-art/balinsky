// Shared apartment-detail renderer for both /ru/apartamenty/o/[slug]
// and /en/apartments/o/[slug]. Layout / data fetching live here only.

import { getApartment3DPlanUrl } from '@/lib/villa-3d-plans'
import { TouristHeatMap } from '@/components/TouristHeatMap'
import { ProPendingNote } from '@/components/ProPendingNote'
import type { ReactNode } from 'react'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { revisionedCache } from '@/lib/revisioned-cache'
import {
  BedDouble, Square, Calendar, FileCheck2, Lock, MapPin, Plane,
  Layers, FileText,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { ExpandableText } from '@/components/ExpandableText'
import { PageContainer } from '@/components/PageContainer'
import { VillaGallery, type ViewerTab } from '@/components/VillaGallery'
import { ZoningMap } from '@/components/ZoningMap'
import { ZoningCard } from '@/components/ZoningCard'
import { loadLandmarks } from '@/lib/landmarks'
import { LandmarksList } from '@/components/NearbyHighlights'
import { RDTR_BASE, loadRdtr, pctText, plotLabel, zoneRows } from '@/lib/rdtr-zones'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { distanceKm as haversineKm } from '@/lib/competitor-utils'
import { getDeveloperStats } from '@/lib/developer-stats'
import { isHiddenDeveloper } from '@/lib/hidden-developers'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'
import { isMetaBullet } from '@/lib/developer-highlights'
import { loadAllVideos, matchesLang as videoMatchesLang } from '@/lib/videos'
import { VideoGrid } from '@/components/VideoGrid'
import { PageViewTracker } from '@/components/PageViewTracker'
import { PageEditButton } from '@/components/page-edit/PageEditButton'
import dynamic from 'next/dynamic'
// Heavy client widgets — pulled off the initial JS bundle. Both render
// below the fold on detail pages, so late hydration is invisible.
const InvestmentWidget = dynamic(
  () => import('@/components/InvestmentWidget').then(m => ({ default: m.InvestmentWidget })),
)
const LandProfileBlock = dynamic(
  () => import('@/components/LandProfileBlock').then(m => ({ default: m.LandProfileBlock })),
)
import { LazyMount } from '@/components/LazyMount'
import { ManagerContactButtons } from '@/components/ManagerContactButtons'
import { VillaActions } from '@/components/VillaActions'
import { VillaChapter, ProNo } from '@/components/VillaChapter'
import { AnalyticsPanel } from '@/components/analytics-panel/AnalyticsPanel'
import { buildVillaAnalyses } from '@/lib/analytics-panel/villa'
import { loadSurroundings } from '@/lib/surroundings'
import { loadTourism } from '@/lib/analytics-panel/tourism'
import { BALI_HUBS, loadExtraRoutes, loadTravelTimes, type ExtraDest } from '@/lib/analytics-panel/extra-routes'
import { loadBookingFit } from '@/lib/analytics-panel/booking-fit'
import { IncomeCalculator } from '@/components/IncomeCalculator'
import { LeadHeroCard, LeadStickyBar } from '@/components/LeadHeroCard'
import { LocationView } from '@/components/LocationView'
import { managerLanguagesEn } from '@/lib/manager-lang'
import { loadNearbyPlaces } from '@/lib/nearby-places'
import { computeLivingFacts, loadLivingNoise } from '@/lib/living'
import { LivingList } from '@/components/LivingVerdict'
import { BeachBlock } from '@/components/BeachBlock'
import { nearestBeachProfile, nearestBeachProfileByPoint } from '@/lib/beaches'
import { GoalSwitch } from '@/components/GoalSwitch'
import { loadGeoFacts } from '@/lib/complex-access'
import { ComplexAccessBlock } from '@/components/ComplexAccessBlock'
import { ClimateBlock } from '@/components/ClimateBlock'
import { loadVerdictSnapshot, loadComplexFacts, computeYieldFacts, buildVerdict, yieldScenarios } from '@/lib/listing-verdict'
import { localizeSnapshot } from '@/lib/competitor-names-en'
import { ListingVerdict, SafetyCards, SafetyChecks, DemandSummary, DemandBandsPdf, YieldScenariosTable, questionHeaders, TONE_PILL_CLASS } from '@/components/ListingVerdict'
import { PdfDocument, NEAR_COLORS } from '@/components/pdf/PdfDocument'
import type { PdfRequest } from '@/lib/pdf-request'
import { anonListingTitle } from '@/lib/listing-title'
import { loadManagersByDeveloperName } from '@/lib/managers'
import { PriceCtaCard } from '@/components/PriceCtaCard'
import { findActiveReservation } from '@/lib/reservations'
import { loadLandProfile, landAllowsBuilding } from '@/lib/land-profile'
import { parseProjectPermits, hasProjectPermits } from '@/lib/project-permits'
import { loadMarketStats } from '@/lib/complex-market-stats'
import { loadOneUnitDemand } from '@/lib/unit-demand'
import { DataChapter } from '@/components/DataChapters'
import { GatedBlock } from '@/components/GatedBlock'
import { permitLabel } from '@/components/presentation-copy'
import { VillaPresentationButton } from '@/components/VillaPresentation'
import { AddToCollection } from '@/components/collections/AddToCollection'
import { tField, pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { normalizeSlug } from '@/lib/slug-normalize'
import { loadAllTranslations, mergeAllTranslations } from '@/lib/en-translations'
import { pluralRu } from '@/lib/plural-ru'
import { plural, nPlural, BEDROOMS, BATHROOMS, YEARS, SQM, KM, METERS, MIN, decSep } from '@/lib/l10n-plural'
import { APT, COMFORT, COMFORT_AMEN, COMFORT_OUT, DETAIL_LINES, KEYLINE, NEAR, PAY_MONTHS, PAY_UPFRONT, TILE, UNITS_IN } from '@/lib/listing-l10n'
import { districtRu, districtLatin } from '@/lib/district-ru'
import { loadKbPageContent } from '@/lib/kb-page-content'
import { loadAirbnbNearby } from '@/lib/airbnb-nearby'
import { loadListingVision, altFor } from '@/lib/listing-features'
import { loadListingCopy } from '@/lib/listing-copy'
import { loadComplexMedia } from '@/lib/complex-media'
import { complexDocs } from '@/lib/complex-docs'
import { ComplexDocsView } from '@/components/ComplexDocsView'
import { curatePhotos } from '@/lib/listing-photos'
import { DistrictAboutCard } from '@/components/DistrictAboutCard'
import { getDistrictCopy } from '@/lib/districts'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { cdnManifestUrl } from '@/lib/photo-cdn'
import { hreflangMap } from '@/lib/hreflang'
import { metaSnippet } from '@/lib/seo'

const AIRPORT_LAT = -8.7467
const AIRPORT_LNG = 115.1667
function fmtAirportDistance(lat: number | null, lng: number | null, lang: Lang): string | null {
  if (lat == null || lng == null) return null
  const km = haversineKm(lat, lng, AIRPORT_LAT, AIRPORT_LNG)
  if (lang === 'ru') return km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} км`
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
    factLeaseValue: (l: string) => `${l} ${Number.isFinite(Number(l)) ? pluralRu(Number(l), ['год', 'года', 'лет']) : 'лет'}`,
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
        a: lease ? `Базовый срок — ${lease} ${Number.isFinite(Number(lease)) ? pluralRu(Number(lease), ['год', 'года', 'лет']) : 'лет'}. Условия продления уточняйте у застройщика.` : 'Срок лизхолда уточняйте у застройщика. Стандартно 25–80 лет с возможностью продления.' },
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
  pl: {
    home: 'Strona główna', aptCrumb: 'Apartamenty',
    sqm: 'm²', floor: 'Piętro', bali: 'Bali', completed: 'Ukończony',
    factsHeading: 'Parametry',
    factArea: 'Powierzchnia', factFloor: 'Piętro', factCompletion: 'Oddanie',
    factPermits: 'Pozwolenia', factLeasehold: 'Leasehold', factDistrict: 'Rejon',
    factAirport: 'Na lotnisko', factGround: 'Parter',
    factLeaseValue: (l: string) => `${l} lat`,
    descHeading: 'Opis',
    complexLabel: 'Kompleks mieszkaniowy',
    developerLabel: 'Deweloper',
    openComplex: 'Otwórz stronę kompleksu',
    openDeveloper: 'Otwórz stronę dewelopera',
    completedShort: 'ukończony',
    completion: (y: string) => `oddanie ${y}`,
    units: (n: number) => `${n} lokali`,
    sellingSeparately: 'Sprzedawany oddzielnie (poza kompleksem)',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonezja`,
    relatedHeading: 'Powiązane',
    related: {
      allApartments: 'Wszystkie apartamenty na Bali',
      complexes: 'Kompleksy mieszkaniowe',
      villas: 'Wille',
      developers: 'Deweloperzy na Bali',
      apartmentsIn: (d: string) => `Apartamenty w ${d}`,
    },
    faqHeading: 'Najczęściej zadawane pytania',
    faq: (title: string, district: string | null, price: string | null, lease: string | null) => [
      { q: `Ile kosztuje ${title}?`,
        a: price ? `Aktualna cena ofertowa to ${price}. Bieżąca cena jest zawsze pokazana w karcie powyżej.` : 'Cena na zapytanie. Skontaktuj się z nami, aby poznać aktualną cenę.' },
      { q: `Gdzie znajduje się ${title}?`,
        a: district ? `Nieruchomość znajduje się w ${district}, Bali. Dokładne współrzędne na mapie powyżej.` : 'Dokładna lokalizacja i współrzędne na mapie powyżej.' },
      { q: 'Czy obcokrajowiec może kupić apartament na Bali?',
        a: 'Tak. Transakcja odbywa się w ramach leasehold (długoterminowa dzierżawa) u notariusza PPAT. Większość deweloperów współpracuje z nabywcami z zagranicy.' },
      { q: 'Jaki jest okres leasehold?',
        a: lease ? `Podstawowy okres to ${lease} lat. Sprawdź warunki przedłużenia u dewelopera.` : 'Sprawdź okres leasehold u dewelopera — zazwyczaj 25–80 lat z opcją przedłużenia.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` w ${district}` : ''} na Bali${price ? `. Cena ${price}.` : '.'} Zdjęcia, układ, dokumenty.`,
  },
  uk: {
    home: 'Головна', aptCrumb: 'Апартаменти',
    sqm: 'м²', floor: 'Поверх', bali: 'Балі', completed: 'Зданий',
    factsHeading: 'Характеристики',
    factArea: 'Площа', factFloor: 'Поверх', factCompletion: 'Здача',
    factPermits: 'Дозволи', factLeasehold: 'Leasehold', factDistrict: 'Район',
    factAirport: 'До аеропорту', factGround: 'Перший поверх',
    factLeaseValue: (l: string) => `${l} років`,
    descHeading: 'Опис',
    complexLabel: 'Житловий комплекс',
    developerLabel: 'Забудовник',
    openComplex: 'Відкрити сторінку комплексу',
    openDeveloper: 'Відкрити сторінку забудовника',
    completedShort: 'зданий',
    completion: (y: string) => `здача ${y}`,
    units: (n: number) => `${n} юнітів`,
    sellingSeparately: 'Продається окремо (поза комплексом)',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Балі, Індонезія`,
    relatedHeading: 'Схоже',
    related: {
      allApartments: 'Усі апартаменти Балі',
      complexes: 'Житлові комплекси',
      villas: 'Вілли',
      developers: 'Забудовники Балі',
      apartmentsIn: (d: string) => `Апартаменти в ${d}`,
    },
    faqHeading: 'Часті запитання',
    faq: (title: string, district: string | null, price: string | null, lease: string | null) => [
      { q: `Скільки коштує ${title}?`,
        a: price ? `Поточна ціна пропозиції — ${price}. Актуальна ціна завжди показана в картці вище.` : 'Ціна за запитом. Зв’яжіться з нами, щоб дізнатися актуальну ціну.' },
      { q: `Де розташований ${title}?`,
        a: district ? `Об’єкт розташований у ${district}, Балі. Точні координати на карті вище.` : 'Точне розташування та координати на карті вище.' },
      { q: 'Чи може іноземець купити апартаменти на Балі?',
        a: 'Так. Угода укладається за схемою leasehold (довгострокова оренда) у нотаріуса PPAT. Більшість забудовників працюють з покупцями з-за кордону.' },
      { q: 'Який термін leasehold?',
        a: lease ? `Базовий термін — ${lease} років. Уточніть умови продовження у забудовника.` : 'Уточніть термін leasehold у забудовника — зазвичай 25–80 років з можливістю продовження.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` у ${district}` : ''} на Балі${price ? `. Ціна ${price}.` : '.'} Фото, планування, документи.`,
  },
} as const

export const revalidate = 604800
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
function fmtUsd(n: number | null, lang: Lang = 'ru'): string | null {
  if (n == null) return null
  // «869 800 $» reads right in Russian; English-style «$869,800» elsewhere.
  if (lang !== 'ru' && lang !== 'uk') return '$' + Math.round(n).toLocaleString('en-US')
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
  pl:  { noun: 'Apartament',  inDistrict: d => `w ${d}`,    bedroomWord: 'sypialnie' },
  uk:  { noun: 'Апартаменти', inDistrict: d => `в ${d}`,    bedroomWord: 'спальні' },
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
  pl: (b, d) => `Apartament${b ? ` z ${b} sypialniami` : ''}${d ? ` w ${d}` : ''}, Bali, Indonezja`,
  uk: (b, d) => `Апартаменти${b ? ` з ${b} спальнями` : ''}${d ? ` в ${d}` : ''}, Балі, Індонезія`,
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
let _lastGoodAptIndex: AptIndexEntry[] = []

// See villy/o/[slug]/_detail.tsx — revisionedCache lets an admin edit flush
// this in-process index instead of waiting out the 30-min TTL.
const _loadApartmentIndex = revisionedCache(['apartments'], 30 * 60 * 1000, async (): Promise<AptIndexEntry[]> => {
  try {
    const r = await fetch(APT_INDEX_URL, { next: { revalidate: 604800, tags: ['content:apartments'] } })
    if (!r.ok) throw new Error(`apartment index: ${r.status}`)
    const j = await r.json() as { items: AptIndexEntry[] }
    const items = j.items ?? []
    if (!items.length) throw new Error('apartment index: empty')
    _lastGoodAptIndex = items
    return items
  } catch (e) {
    // Пустой список не кэшируем — иначе после сбоя на холодном старте все
    // страницы полчаса отдают 404 (см. villy/o/[slug]/_detail.tsx).
    if (_lastGoodAptIndex.length) return _lastGoodAptIndex
    throw e
  }
})
const _loadApartmentById = unstable_cache(
  async (id: string): Promise<Row | null> => {
    const [{ data, error }, enCache] = await Promise.all([
      sb.from('raw_apartments').select('airtable_id, data').eq('airtable_id', id).maybeSingle(),
      loadAllTranslations('apartments'),
    ])
    // Сбой базы бросаем: unstable_cache не запишет null на сутки, а страница
    // не станет 404.
    if (error) throw new Error(`raw_apartments ${id}: ${error.message}`)
    const raw = (data as Row | null) ?? null
    if (!raw) return null
    // Mirror what the catalog loader does — merge cached EN translations
    // into the row so tField() picks them up. Detail page never hits the
    // catalog loadAllApartments, so the merge has to live here too.
    return { ...raw, data: mergeAllTranslations(raw.data, raw.airtable_id, enCache) }
  },
  ['apartment-by-id-detail-v3'],
  { revalidate: 604800, tags: ['content:apartments'] },
)
const _loadAptManifest = unstable_cache(
  async (): Promise<Record<string, string[]>> => {
    try {
      const r = await fetch(cdnManifestUrl(PHOTO_MANIFEST_URL, 600))
      return r.ok ? r.json() : {}
    } catch { return {} }
  },
  ['apt-manifest-detail-v2'],
  { revalidate: 604800, tags: ['content:apartments'] },
)
const _loadDevLookup = unstable_cache(
  async (): Promise<Record<string, string>> => {
    // Throw on fetch failure so empty {} doesn't get cached for an
    // hour and break developer cross-links on every apartment page.
    const r = await fetch(DEV_LOOKUP_URL)
    if (!r.ok) throw new Error(`dev-lookup http_${r.status}`)
    const j = await r.json() as Record<string, string>
    if (Object.keys(j).length === 0) throw new Error('dev-lookup returned empty — refusing to cache')
    // The manifest was written by the retired Airtable sync and only knows
    // old rec ids — apartments linked since then point straight at
    // raw_developers.airtable_id, so resolve those from the table.
    const { data, error } = await sb.from('raw_developers').select('airtable_id, name:data->Developer').limit(1000)
    if (error) throw new Error(`raw_developers: ${error.message}`)
    const out: Record<string, string> = {}
    for (const row of (data ?? []) as { airtable_id: string; name: unknown }[]) {
      if (typeof row.name === 'string' && row.name.trim()) out[row.airtable_id] = row.name.trim()
    }
    return { ...out, ...j }
  },
  ['dev-lookup-detail-v3'],
  { revalidate: 604800, tags: ['content:developers'] },
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
    `).limit(1000)
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
  ['apt-developers-index-v4'],
  { revalidate: 604800, tags: ['content:developers'] },
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
        const r = await fetch(cdnManifestUrl(COMPLEX_PHOTO_MANIFEST_URL, 600), { next: { revalidate: 604800, tags: ['content:complexes'] } })
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
  // Индекс не загрузился (и прошлой копии нет) — это сбой, а не 404.
  const idx = await _loadApartmentIndex().catch((e: unknown) => {
    console.error('[apartment]', e instanceof Error ? e.message : e)
    throw e
  })
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
function findParentComplex(aptTitle: string, complexes: ComplexRow[], complexName?: string | null): ComplexRow | null {
  // The «Комплекс 1» field is what the complex page lists its units by, so
  // trust it first — the title match below misses or mislinks units whose
  // title doesn't spell the complex name.
  const want = complexName?.trim().toLowerCase()
  if (want) {
    const exact = complexes.find(c => c.name?.trim().toLowerCase() === want)
    if (exact) return exact
  }
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

export async function generateApartmentMetadata(slug: string, lang: Lang) {
  const a = await loadApartmentBySlug(slug)
  if (!a) return { robots: { index: false } }
  const d = a.data
  const c = pickCopy(COPY, lang)
  // Сгенерированная копия — русская; на других локалях источник прежний.
  const gen = lang === 'ru' ? await loadListingCopy('apartment', a.airtable_id) : null
  const titleRaw = gen?.title ?? tField(d, 'SEO:Title', lang) ?? tField(d, 'ИИ Имя', lang) ?? slug
  let title = cleanTitle(titleRaw) ?? slug
  if (isMalformedAptTitle(title)) {
    title = fallbackAptTitle(firstString(d['Location filter']), numberOrNull(d['Площадь']), numberOrNull(d['Комнаты']), lang)
  }
  const seoTextRaw = tField(d, 'SEO Text', lang) ?? tField(d, 'Notes', lang)
  // A bad AI translation may have stored Russian into `SEO Text EN` (or the
  // suffix is missing and tField returns the raw RU). Never emit Cyrillic on a
  // non-RU page — transliterate to Latin as a last resort.
  const seoText = lang !== 'ru' && lang !== 'uk' && seoTextRaw && hasCyrillic(seoTextRaw) ? translitPreserveCase(seoTextRaw) : seoTextRaw
  const districtRaw = firstString(d['Location filter'])
  // Cyrillic district on /ru, raw Latin on /en. Raw is preserved for
  // Schema.org address fields where Latin is canonical.
  const district = lang === 'ru' ? districtRu(districtRaw) : districtLatin(districtRaw)
  const price = fmtUsd(numberOrNull(d['price_usd'] ?? d['Цена']), lang)
  const description = gen?.meta
    ? metaSnippet(gen.meta)
    : seoText
      ? metaSnippet(seoText)
      : c.metaFallback(title, district, price)
  const ruPath = `/ru/apartamenty/o/${slug}`
  const path = switchLangPath(ruPath, lang)
  // Rows with no district, area or bedroom count say nothing in a search
  // result — keep them live but out of the index. Same rule as villas.
  const isDataless = !firstString(d['Location filter'])
    && numberOrNull(d['Площадь']) == null
    && firstString(d['Комнаты']) == null
  // EN (21.11.2026): заголовок в форме запроса — «<Название> for Sale in <Район>, Bali — $цена».
  const dashPrice = price ? ` — ${price}` : ''
  const enTitle = lang === 'en' && district ? (() => {
    const esc = district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const base = (title.split(/\s[-—–]\s(?=\d)/)[0] || title)
      .replace(new RegExp(`\\s+(in|on|at)\\s+${esc}(,?\\s*Bali)?\\s*$`, 'i'), '')
      .trim()
    const t = `${base} for Sale in ${district}, Bali`
    return `${t}${price && (t + dashPrice).length <= 70 ? dashPrice : ''} | Balinsky`
  })() : null
  return {
    title: enTitle ?? `${title} | Balinsky`,
    description,
    ...(isDataless ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: path,
      languages: hreflangMap(ruPath),
    },
    openGraph: { title, description, type: 'website' as const, url: `${SITE_URL}${path}` },
  }
}

export async function ApartmentDetail({ slug, lang, pdf, analyticsOnly = false }: { slug: string; lang: Lang; pdf?: PdfRequest; analyticsOnly?: boolean }) {
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
  // Hidden developers (lib/hidden-developers.ts) must not appear anywhere —
  // the catalog already drops them; the detail URL has to 404 as well.
  {
    const links = Array.isArray(d['Developer']) ? d['Developer'] : [d['Developer']]
    if (isHiddenDeveloper(firstString(d['Developer1']), ...links.map(id => (typeof id === 'string' ? devMap[id] ?? id : null)))) notFound()
  }

  const titleRaw = tField(d, 'ИИ Имя', lang) ?? tField(d, 'SEO:Title', lang) ?? slug
  let title = cleanTitle(titleRaw) ?? slug
  // Фото-аудит до нарезки: обложка обязана попасть в первые 12 кадров.
  const visionRaw = await loadListingVision('apartment', a.airtable_id)
  const curated = curatePhotos(manifest[a.airtable_id] ?? [], visionRaw)
  const photos = curated.photos.slice(0, 12)
  // Район не заполнен у ~300 апартаментов — берём район их жилого комплекса
  // (владелец 20.11.2026: «мы же знаем, что он в Сануре»).
  const districtRaw = firstString(d['Location filter'])
    ?? (() => { const pc = findParentComplex(title, complexes, firstString(d['Комплекс 1'])); return firstString(pc?.district) ?? firstString(pc?.district_alt) })()
  const district = lang === 'ru' ? districtRu(districtRaw) : districtLatin(districtRaw)
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
  const seoText = lang !== 'ru' && lang !== 'uk' && seoTextRaw && hasCyrillic(seoTextRaw) ? translitPreserveCase(seoTextRaw) : seoTextRaw
  const kb = await loadKbPageContent('apartment', a.airtable_id, lang)
  // Non-RU: prefer the native-language SEO Text over the RU/EN-only KB body.
  const vision = curated.vision
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
  const parentComplex = findParentComplex(title, complexes, firstString(d['Комплекс 1']))
  const parentComplexName = parentComplex?.name ?? null
  // 3D-тур комплекса — плиткой «3D-тур» в галерее.
  const aptComplex = await loadComplexMedia(firstString(d['Комплекс']), firstString(d['Комплекс 1'])).catch(() => ({ id: null, slug: null, tourUrl: null, data: null }))
  const aptTourUrl = aptComplex.tourUrl
  // Зоны плана застройки вокруг (scripts/rdtr_zones_all.py) - как у вилл:
  // карточка в разделе «Участок» и вкладка «Зоны» в окне галереи.
  const rdtrHit = await loadRdtr(a.airtable_id, aptComplex.slug)
  const rdtr = rdtrHit?.data ?? null
  const rdtrAround = (() => {
    const rows = rdtr ? zoneRows(rdtr, lang) : []
    const b = rows.find(r => r.group === 'build')
    const n = rows.find(r => r.group === 'nobuild')
    const parts = [b ? `${pctText(b.share)} ${b.label.toLowerCase()}` : null, n ? `${pctText(n.share)} ${n.label.toLowerCase()}` : null].filter(Boolean)
    return parts.length ? parts.join(', ') : null
  })()
  const zoningCard = rdtr && rdtrHit
    ? <ZoningCard thumb={`${RDTR_BASE}/${rdtrHit.key}.jpg?ver=${rdtr.fetchedAt ?? ''}-${rdtr.radius}`} plot={plotLabel(rdtr, lang)} around={rdtrAround} lang={lang} />
    : null
  const aptViewerTabs: ViewerTab[] = rdtr && rdtrHit ? [{
    key: 'zones',
    label: pickCopy({ ru: 'Зоны', en: 'Zoning', id: 'Zonasi', fr: 'Zonage', de: 'Zonen', zh: '规划分区', nl: 'Bestemming', ban: 'Zonasi', pl: 'Strefy', uk: 'Зони' }, lang),
    icon: <Layers size={18} aria-hidden />,
    hideTile: true,
    bleed: true,
    content: <ZoningMap slug={rdtrHit.key} plotOverride={rdtr.plot} lang={lang} ver={`${rdtr.fetchedAt ?? ''}-${rdtr.radius}`} />,
  }] : []
  // Документы комплекса (только Pro) — плиткой, как на странице виллы.
  const aptDocs = complexDocs(aptComplex.slug)
  if (aptDocs) {
    aptViewerTabs.push({
      key: 'docs',
      label: pickCopy({ ru: 'Документы', en: 'Documents', id: 'Dokumen', fr: 'Documents', de: 'Dokumente', zh: '文件', nl: 'Documenten', ban: 'Dokumen', pl: 'Dokumenty', uk: 'Документи' }, lang),
      icon: <FileText size={18} aria-hidden />,
      cover: photos[3] ?? photos[0] ?? null,
      count: aptDocs.docs.length,
      content: <ComplexDocsView docs={aptDocs} lang={lang} listingTitle={title} />,
      bleed: true,
    })
  }

  const [managers, activeReservation, landProfile, marketStats, developers, nearby, geoFacts, demand, verdictSnap, complexFacts, airbnbComps, landmarks] = await Promise.all([
    loadManagersByDeveloperName(devName),
    findActiveReservation('apartment', a.airtable_id),
    loadLandProfile('apartment', a.airtable_id),
    loadMarketStats('apartment', a.airtable_id),
    _loadDevelopersIndex(),
    loadNearbyPlaces(a.airtable_id).catch(() => null),
    loadGeoFacts('apartment', a.airtable_id).catch(() => null),
    loadOneUnitDemand('apartment', a.airtable_id, lang).catch(() => null),
    loadVerdictSnapshot(a.airtable_id, 'apartment').then(snap => localizeSnapshot(snap, lang)),
    loadComplexFacts(firstString(d['Комплекс'])).catch(() => null),
    loadAirbnbNearby(lat, lng, bedrooms),
    // «Что посмотреть рядом» с местом в топе TripAdvisor - как у вилл.
    lat != null && lng != null ? loadLandmarks(lat, lng).catch(e => { console.error(e); return [] }) : [],
  ])
  // Разрешения самого проекта (KKKPR / PBG / KBLI) — второй уровень блока
  // зонирования. Переводы пока генерятся только для ЖК, поэтому на
  // неруских страницах юнит показывает русский исходник — как и юр-проверка
  // до прогона переводчика.
  const projectPermits = parseProjectPermits(d)
  const developer = findDeveloperByName(devName, developers)
  const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''

  // Videos for parent complex (or empty), filtered by site language.
  const allVideos = (await loadAllVideos().catch(() => []))
    .filter(v => videoMatchesLang(v, lang))
  const aptVideos = parentComplex?.slug
    ? allVideos.filter(v => v.complexes.some(c => c.slug === parentComplex.slug)).slice(0, 6)
    : []

  const facts: { Icon: typeof BedDouble; label: string; value: ReactNode }[] = [
    bedrooms != null && { Icon: BedDouble, label: pickCopy({ ru: 'Спальни', en: 'Bedrooms', id: 'Kamar tidur', fr: 'Chambres', de: 'Schlafzimmer', zh: '卧室', nl: 'Slaapkamers', ban: 'Kamar pules', pl: 'Sypialnie', uk: 'Спальні' }, lang), value: lang === 'en' ? `${bedrooms} BR` : String(bedrooms) },
    area != null && { Icon: Square, label: c.factArea, value: `${area} ${c.sqm}` },
    floor && { Icon: Layers, label: c.factFloor, value: floor === 'GROUND FLOOR' ? c.factGround : floor },
    yearRaw && { Icon: Calendar, label: c.factCompletion, value: status?.toLowerCase().includes('построен') ? c.completed : yearRaw },
    permitLabel(permit, lang) && { Icon: FileCheck2, label: c.factPermits, value: permitLabel(permit, lang)! },
    lease && { Icon: Lock, label: c.factLeasehold, value: c.factLeaseValue(lease) },
    district && { Icon: MapPin, label: c.factDistrict, value: district },
    fmtAirportDistance(lat, lng, lang) && { Icon: Plane, label: c.factAirport, value: fmtAirportDistance(lat, lng, lang)! },
    // Price/m² lives in the PriceCtaCard right under the hero, no need
    // to duplicate it here.
  ].filter(Boolean) as { Icon: typeof BedDouble; label: string; value: ReactNode }[]

  // kb.faq is EN-only (KB stores RU + EN). For non-RU pages prefer the native
  // localized c.faq(...) template so de/zh/nl/id/fr/ban don't render English.
  const faqItems = lang === 'ru'
    ? ((kb?.faq && kb.faq.length) ? kb.faq : c.faq(title, district, fmtUsd(priceNum, lang), lease))
    : c.faq(title, district, fmtUsd(priceNum, lang), lease)
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
  // Бренд и продавец — только застройщик, «Balinsky» не подставляем:
  // сайт информационный и объекты не продаёт.
  if (devName) productJsonLd.brand = { '@type': 'Brand', name: devName }
  if (priceNum != null) {
    productJsonLd.offers = {
      '@type': 'Offer',
      price: Math.round(priceNum),
      priceCurrency: 'USD',
      url: `${SITE_URL}${switchLangPath(`/ru/apartamenty/o/${slug}`, lang)}`,
      // Продавец — застройщик, если известен. Balinsky объекты не продаёт:
      // ни бренда, ни продавца «Balinsky», ни доставки с возвратом.
      ...(devName ? { seller: { '@type': 'Organization', name: devName } } : {}),
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
  const developersRoot = switchLangPath('/ru/zastrojshhiki', lang)


  const landOk = !!landProfile && (landAllowsBuilding(landProfile, 'apartment') || hasProjectPermits(projectPermits))
  const plotSite = geoFacts?.climate?.plot ?? null
  const marketOk = !!marketStats && (marketStats.villa_count > 0 || marketStats.apartment_count > 0)
  const hasPlace = !!(geoFacts || nearby || (districtCopy && districtSlug))
  const hasRent = marketOk || !!demand
  const hasYield = lat != null && lng != null
  // «Стоит ли брать» и разделы-вопросы — как у вилл (components/ListingVerdict).
  const monthly = verdictSnap?.monthly ?? null
  const landYellow = /yellow|жёлт|желт/i.test(firstString(d['Land color']) ?? '')
  const rentalRestricted = !!verdictSnap?.flags.rentalRestricted || landYellow
  const yields = computeYieldFacts(verdictSnap)
  const airportS = geoFacts?.routes?.airport?.s
  const underConstruction = !!status && /строит|under construction|planned/i.test(status)
  const leaseYears = lease && /^\d+(\.\d+)?$/.test(lease.trim()) ? Number(lease.trim()) : null
  const aptMarket = marketOk && marketStats!.apartment_count > 0
  const dailyFacts = marketOk ? {
    count: aptMarket ? marketStats!.apartment_count : marketStats!.villa_count,
    adrUsd: aptMarket ? marketStats!.apartment_adr_usd : marketStats!.villa_adr_usd,
    // Та же загрузка района, что в калькуляторе (без закрытых календарей).
    occupancyPct: verdictSnap?.marketOccupancy ? Math.round(verdictSnap.marketOccupancy.occupancy * 100)
      : aptMarket ? marketStats!.apartment_occupancy_pct : marketStats!.villa_occupancy_pct,
  } : null
  // «Для жизни»: места вокруг, дорога в час пик и остаток срока аренды земли.
  const livingNoise = await loadLivingNoise('apartment', a.airtable_id).catch(() => null)
  const livingFacts = computeLivingFacts({
    byCategory: nearby?.byCategory ?? null,
    routes: geoFacts?.routes ?? null,
    leaseYears: verdictSnap?.villa.leaseholdYearsLeft ?? null,
    bedrooms: verdictSnap?.villa.bedrooms ?? null,
    noise: livingNoise,
    climate: geoFacts?.climate ?? null,
    point: { lat, lng },
  })
  // Ближайший пляж с описанием (lib/beaches.ts) — карточкой в разделе «Место».
  const beachRow = livingFacts?.rows.find(r => r.key === 'beach') ?? null
  const beachPick = nearestBeachProfile(nearby?.byCategory?.beach) ?? nearestBeachProfileByPoint(lat, lng)
  const beach = beachPick?.beach ?? null
  // Строку «пляж» в «Главном рядом» прячем, только если карточка о том же пляже.
  const beachIsNearest = !!beachPick && (beachPick.placeId === beachRow?.placeId || beachRow?.km == null)
  const verdict = buildVerdict({
    living: livingFacts,
    status, yearRaw, permit, leaseYears, rentalRestricted, complex: complexFacts,
    dev: devStats ? { name: devName, total: devStats.total, ready: devStats.ready } : null,
    climate: geoFacts?.climate ?? null,
    airportMin: airportS ? Math.round(airportS / 60) : null,
    monthly, daily: dailyFacts, yields, saleDiffPct: null,
    hasPool: verdictSnap?.villa.hasPool ?? null,
    ownOccupancy: verdictSnap?.ownBooking?.occupancy ?? null,
  })
  const qh = questionHeaders(verdict, yields, monthly, null, underConstruction, lang)
  const asQuestion = (h: typeof qh.safety) => ({ kicker: h.kicker, title: h.title, status: h.status, pillClass: TONE_PILL_CLASS[h.tone], lead: h.lead })

  // Печатная презентация для Pro — как у виллы (components/pdf/PdfDocument.tsx).
  if (pdf) {
    const head = (h: typeof qh.safety) => ({ kicker: h.kicker, title: h.title, lead: h.lead })
    const nearPoints = Object.entries(nearby?.byCategory ?? {}).flatMap(([cat, list]) =>
      NEAR_COLORS[cat] ? list.filter(p => p.distanceKm <= 1.1).map(p => ({ lat: p.lat, lng: p.lng, color: NEAR_COLORS[cat], size: cat === 'restaurant' || cat === 'cafe' ? 4 : 6 })) : [])
    // Подборка агента для клиента (/p/…): клиент не должен узнать ни комплекс,
    // ни застройщика — заголовок собираем из района, площади и спален, описание
    // не берём, а имена, если всплывут в блоках, PdfShell вычищает из текста.
    const anon = pdf.anon === true
    const pdfTitle = anon ? anonListingTitle({ kind: 'apartment', district: district ?? null, area: area ?? null, bedrooms: bedrooms != null ? String(bedrooms) : null, lang }) : title
    const secret = anon ? [firstString(d['Комплекс 1']), parentComplex?.name, devName].filter((x): x is string => !!x && x.trim().length > 2) : []
    return (
      <PdfDocument lang={lang} title={pdfTitle} scrub={secret} back={pdf.back} district={district} photos={photos} priceUsd={priceNum} pricePerM2={priceM2}
        chips={[bedrooms != null ? `${bedrooms} BR` : '', area != null ? `${area} ${c.sqm}` : '', lease ? c.factLeaseValue(lease) : ''].filter(Boolean)}
        facts={facts.filter(f => typeof f.value === 'string').map(f => ({ label: f.label, value: f.value as string }))}
        about={anon ? null : seoText} lat={lat} lng={lng} url={anon ? '' : `${SITE_URL}${switchLangPath(`/ru/apartamenty/o/${slug}`, lang)}`}
        blocks={pdf.blocks} agent={pdf.agent} autoPrint={pdf.autoPrint} portrait={pdf.portrait} snap={verdictSnap} calcSettings={pdf.calc}
        heads={{ safety: head(qh.safety), comfort: head(qh.comfort), demand: head(qh.demand), money: head(qh.money) }}
        nearPoints={nearPoints}
        nearLegend={livingFacts ? <LivingList facts={livingFacts} lang={lang} hideBeach={beachIsNearest} map={null} /> : null}
        nodes={{
          verdict: <ListingVerdict verdict={verdict} yields={yields} monthly={monthly} saleDiff={null}
            underConstruction={underConstruction} lang={lang} lat={lat} lng={lng}
            neighbourPhotos={(verdictSnap?.competitors ?? []).map(x => x.photo).filter((x): x is string => !!x)}
            dev={devStats ? { total: devStats.total, ready: devStats.ready } : null}
            anchors={{ safety: 'uchastok', comfort: 'mesto', demand: 'arenda', money: 'dokhodnost' }} />,
          safety: (
            <>
            <div className={`grid grid-cols-1 items-start gap-6 ${landOk ? 'lg:grid-cols-2' : ''}`}>
              <SafetyCards verdict={verdict} permit={permit} status={status} yearRaw={yearRaw} complex={complexFacts}
                leaseYears={leaseYears} landYellow={rentalRestricted}
                dev={devStats ? { name: anon ? null : devName, total: devStats.total, ready: devStats.ready } : null} plot={plotSite}
                coast={geoFacts ? { coastM: geoFacts.climate?.coast_m ?? null, elevationM: geoFacts.climate?.sea?.elevation_m ?? geoFacts.elevation_m, marginM: geoFacts.climate?.sea?.margin_m ?? null } : null} lang={lang} />
              {landOk && <div className="flex flex-col gap-6">{zoningCard}<LandProfileBlock data={landProfile!} permits={projectPermits} lang={lang} /><SafetyChecks verdict={verdict} lang={lang} /></div>}
            </div>
            {!landOk && zoningCard && <div className="lg:w-1/2 lg:pr-3">{zoningCard}</div>}
            </>
          ),
          living: (geoFacts || beach) ? (
            <div className="flex flex-col gap-4 [&>*]:mb-0">
              {geoFacts && <ComplexAccessBlock lang={lang} routes={geoFacts.routes} map={null} />}
              {beach && beachPick && <BeachBlock beach={beach} km={beachPick.km} google={beachPick.google} lang={lang} />}
            </div>
          ) : null,
          climate: geoFacts ? <ClimateBlock climate={geoFacts.climate} air={geoFacts.air} lang={lang} lat={lat} lng={lng} wide /> : null,
          daily: verdictSnap ? <DemandBandsPdf kind="daily" snap={verdictSnap} dailyComps={verdictSnap.competitors ?? []} airbnbComps={airbnbComps} lang={lang} /> : null,
          monthly: verdictSnap?.monthly ? <DemandBandsPdf kind="monthly" snap={verdictSnap} monthly={verdictSnap.monthly} lang={lang} /> : null,
          calc: hasYield ? <YieldScenariosTable data={yieldScenarios(verdictSnap, null)} verified={yields?.ownSource === 'actual'} lang={lang} /> : null,
        }} />
    )
  }
  const hasDemand = hasRent || !!monthly

  // Pro-аналитика отдельно: её же показывает страница жилого комплекса (analyticsOnly).
  // Итог «для жизни» - и в переключателе, и один на странице ЖК (там нет спроса и дохода).
  const liveVerdict = livingFacts ? (
            <ListingVerdict mode="live" verdict={verdict} yields={yields} monthly={monthly} saleDiff={null}
              underConstruction={underConstruction} lang={lang} lat={lat} lng={lng}
              neighbourPhotos={(verdictSnap?.competitors ?? []).map(x => x.photo).filter((x): x is string => !!x)}
              dev={devStats ? { total: devStats.total, ready: devStats.ready } : null}
              anchors={{ safety: 'uchastok', comfort: hasPlace ? 'mesto' : 'uchastok', demand: hasDemand ? 'arenda' : 'dokhodnost', money: 'dokhodnost' }} />
          ) : null
  const analytics = (
    <>
        <ProPendingNote lang={lang} />
        <div className="bx-auth-block">
        {analyticsOnly ? liveVerdict : <GoalSwitch lang={lang}
          income={
            <ListingVerdict verdict={verdict} yields={yields} monthly={monthly} saleDiff={null}
              underConstruction={underConstruction} lang={lang} lat={lat} lng={lng}
              neighbourPhotos={(verdictSnap?.competitors ?? []).map(x => x.photo).filter((x): x is string => !!x)}
              dev={devStats ? { total: devStats.total, ready: devStats.ready } : null}
              anchors={{ safety: 'uchastok', comfort: hasPlace ? 'mesto' : 'uchastok', demand: hasDemand ? 'arenda' : 'dokhodnost', money: 'dokhodnost' }} />
          }
          live={liveVerdict} />}
        <DataChapter id="uchastok" n={1} lang={lang} question={asQuestion(qh.safety)}>
          {/* Слева - документы, стройка, земля; справа - что можно делать с участком. */}
          <div className={`grid grid-cols-1 items-stretch gap-6 ${landOk ? 'lg:grid-cols-2' : ''}`}>
          <SafetyCards verdict={verdict} permit={permit} status={status} yearRaw={yearRaw} complex={complexFacts}
            leaseYears={leaseYears} landYellow={rentalRestricted}
            dev={devStats ? { name: devName, total: devStats.total, ready: devStats.ready } : null} plot={plotSite}
            coast={geoFacts ? { coastM: geoFacts.climate?.coast_m ?? null, elevationM: geoFacts.climate?.sea?.elevation_m ?? geoFacts.elevation_m, marginM: geoFacts.climate?.sea?.margin_m ?? null } : null} lang={lang} />
          {landOk && (
            <div className="flex flex-col gap-6 [&>*:last-child]:flex-1">
              {zoningCard}
              <LazyMount fallback={<div className="min-h-[480px] rounded-2xl bg-[var(--color-search-bg)]" />}>
                <LandProfileBlock data={landProfile!} permits={projectPermits} lang={lang} />
              </LazyMount>
              <SafetyChecks verdict={verdict} lang={lang} />
            </div>
          )}
          </div>
          {!landOk && zoningCard && <div className="lg:w-1/2 lg:pr-3">{zoningCard}</div>}
        </DataChapter>

        {hasPlace && (
          <DataChapter id="mesto" n={2} lang={lang} question={asQuestion(qh.comfort)}>
            {/* «О районе» — первым в разделе, над «Как добраться» (владелец 23.10.2026). */}
            {districtCopy && districtSlug && (
              <div className="[&>section]:!mb-0"><DistrictAboutCard aerial={lat != null && lng != null ? { lat, lng } : null} copy={districtCopy} lang={lang} kind="apartment" hubHref={`${apartmentsRoot}/${districtSlug}`} /></div>
            )}
            {/* Три полосы друг под другом: текст слева, карта справа — «Солнце и погода»,
                «Как добраться», «Главное рядом» (макет «Удобно ли там жить?», B —
                владелец 23.10.2026). «Район и берег» убран: высота и океан — в «Безопасно ли
                это?». Пляж — ниже, во всю ширину. */}
            {(livingFacts || geoFacts) && (
              <div className="mb-4 flex flex-col gap-4 [&>*]:mb-0">
                {/* «Солнце и погода» — сразу под «О районе» (владелец 23.10.2026). */}
                {geoFacts && <ClimateBlock climate={geoFacts.climate} air={geoFacts.air} lang={lang} lat={lat} lng={lng} wide />}
                {geoFacts && <ComplexAccessBlock lang={lang} routes={geoFacts.routes}
                  map={geoFacts.route_lines && lat != null && lng != null ? { lines: geoFacts.route_lines, lat, lng, name: parentComplex?.name ?? title } : null} />}
                {livingFacts && <LivingList facts={livingFacts} lang={lang} hideBeach={beachIsNearest}
                  map={nearby && lat != null && lng != null ? { byCategory: nearby.byCategory, lat, lng, name: parentComplex?.name ?? title } : null} />}
              </div>
            )}
            {beach && beachPick && <div className="mb-4"><BeachBlock beach={beach} km={beachPick.km} google={beachPick.google} lang={lang} /></div>}
            {landmarks.length > 0 && <div className="mb-4"><LandmarksList items={landmarks} lang={lang} /></div>}
            {/* «Что рядом» списком убран 23.10.2026: повторял «Главное рядом» и карту с точками. */}
            {lat != null && lng != null && (
              <div className="mt-4"><TouristHeatMap lat={lat} lng={lng} name={parentComplex?.name ?? title} lang={lang} /></div>
            )}
          </DataChapter>
        )}

        {!analyticsOnly && hasDemand && (
          <DataChapter id="arenda" n={3} lang={lang} question={asQuestion(qh.demand)}>
            <DemandSummary snap={verdictSnap} verdict={verdict} monthly={monthly} bedrooms={bedrooms} lang={lang} dailyComps={verdictSnap?.competitors ?? []} airbnbComps={airbnbComps} daily={dailyFacts} />
            {/* «Почём сдают соседи» (estatemarket.io) и «Востребованность в районе» убраны
                по решению владельца 16.10.2026: непонятны и повторяют сводку выше. */}
          </DataChapter>
        )}

        {!analyticsOnly && hasYield && (
          <DataChapter id="dokhodnost" n={4} lang={lang} question={asQuestion(qh.money)}>
            {/* Три варианта вместо карточки, которая повторяла ответ раздела. */}
            <YieldScenariosTable data={yieldScenarios(verdictSnap, null)} verified={yields?.ownSource === 'actual'} lang={lang} />
            <div id="kalkulyator" className="scroll-mt-24" />
            <GatedBlock kind="investment" lang={lang}>
              <LazyMount fallback={<div className="min-h-[600px]" />}>
                <InvestmentWidget villaId={a.airtable_id} apiKey={GMAPS_KEY} kind="apartment" lang={lang} showMap={false} />
              </LazyMount>
            </GatedBlock>
          </DataChapter>
        )}
        </div>
    </>
  )
  if (analyticsOnly) return analytics

  // «Проверьте апартаменты с ИИ» — тот же набор анализов, что у виллы
  // (lib/analytics-panel/villa.ts, kind 'apartment'); продаж вилл рядом и цен
  // земли у апартаментов нет — эти анализы просто не строятся.
  const [around, tourism] = await Promise.all([
    loadSurroundings('apartment', a.airtable_id).catch(() => null),
    lat != null && lng != null ? loadTourism(lat, lng).catch(e => { console.error(e); return null }) : null,
  ])
  const nearestBeach = nearby?.byCategory?.beach?.filter(p => (p.primaryType === 'beach' || p.types?.includes('beach')) && !/warung|уорунг|варунг|caf[eé]|кафе|bar\b|бар\b|restaurant|ресторан|club|клуб/i.test(p.name ?? '')).sort((x, y) => x.distanceKm - y.distanceKm)[0] ?? null
  const extraDests: ExtraDest[] = [
    ...(nearestBeach?.name ? [{ key: `b:${nearestBeach.id}`, name: nearestBeach.name, lat: nearestBeach.lat, lng: nearestBeach.lng, kind: 'beach' as const }] : []),
    ...(tourism?.ta ?? []).filter(p => p.km <= 15).slice(0, 3).map(p => ({ key: `ta:${p.rank}`, name: `#${p.rank} ${p.name}`, lat: p.lat, lng: p.lng, kind: 'ta' as const })),
  ]
  const hubDests = lat != null && lng != null ? BALI_HUBS.filter(h => Math.hypot((h.lat - lat) * 111, (h.lng - lng) * 110) > (h.rKm ?? 0) + 0.3) : []
  const bookingFitP = loadBookingFit('apartment', a.airtable_id).catch(e => { console.error('booking-fit', e); return null })
  const [extraRoutes, hubRoutes] = lat != null && lng != null ? await Promise.all([
    extraDests.length ? loadExtraRoutes(lat, lng, extraDests).catch(() => []) : [],
    hubDests.length ? loadExtraRoutes(lat, lng, hubDests).catch(e => { console.error(e); return [] }) : [],
  ]) : [[], []]
  const travelPts = [
    ...(tourism?.ta ?? []).filter(p => p.km <= 10).map(p => ({ key: `ta:${p.rank}`, lat: p.lat, lng: p.lng })),
    ...landmarks.filter(l => l.lat != null && l.lng != null).map(l => ({ key: `lm:${l.id}`, lat: l.lat!, lng: l.lng! })),
  ]
  const bookingFit = await bookingFitP
  const travel = lat != null && lng != null && travelPts.length ? await loadTravelTimes(lat, lng, travelPts).catch(e => { console.error(e); return {} }) : {}
  const analyses = buildVillaAnalyses({
    kind: 'apartment',
    lang, lat, lng, bedrooms, priceUsd: priceNum, status, permit, yearRaw, leaseYears,
    snap: verdictSnap, airbnb: airbnbComps, sale: null, geo: geoFacts, nearby,
    around1km: around?.r1 ?? null,
    landPrices: null, landM2: null, tourism, landmarks, touristShare: around?.touristShare ?? null, aroundTop: around?.top ?? [], extraRoutes, hubRoutes, travel, demand, bookingFit,
    rdtr: rdtrHit && rdtr ? { data: rdtr, image: `${RDTR_BASE}/${rdtrHit.key}.jpg?ver=${rdtr.fetchedAt ?? ''}-${rdtr.radius}` } : null,
  })
  // Калькулятор дохода под «Сдавать посуточно» — как у виллы.
  const calcBlock = hasYield && verdictSnap && verdictSnap.villa.askingPrice != null ? (
    <section key="calc" id="kalkulyator" className="scroll-mt-24 rounded-2xl border border-[#E4E9E6] bg-white p-5 lg:p-6">
      <IncomeCalculator
        kind="apartment"
        villa={{
          askingPrice: verdictSnap.villa.askingPrice,
          area: verdictSnap.villa.area,
          bedrooms: verdictSnap.villa.bedrooms,
          leaseholdYearsLeft: verdictSnap.villa.leaseholdYearsLeft,
          furnished: verdictSnap.villa.furnished,
          landRentYear: verdictSnap.villa.landRentYear,
          district: district ?? verdictSnap.villa.district,
        }}
        region={verdictSnap.region}
        dailyPresets={verdictSnap.scenarios && !verdictSnap.flags.rentalRestricted ? {
          p25: verdictSnap.scenarios.bad.adrAsking,
          p50: verdictSnap.scenarios.median.adrAsking,
          p75: verdictSnap.scenarios.good.adrAsking,
        } : null}
        monthlyPresets={monthly ? { p25: monthly.p25, p50: monthly.p50, p75: monthly.p75 } : null}
        defaultOccupancyPct={Math.round((verdictSnap.ownBooking?.occupancy ?? verdictSnap.region.occupancyByScenario.median) * 100)}
        dailyCompCount={(verdictSnap.competitors?.length ?? 0) + airbnbComps.length}
        monthlyCompCount={monthly?.n ?? 0}
        restricted={!!verdictSnap.flags.rentalRestricted}
        lang={lang}
      />
    </section>
  ) : null

  // «Локация» в окне медиа — как у вилл (владелец 20.11.2026, макет LocA).
  if (lat != null && lng != null) {
    const en = lang !== 'ru'
    const z = 16, n2 = 2 ** z
    const tx = Math.floor(((lng + 180) / 360) * n2)
    const ty = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n2)
    const dist = (km: number) => km < 1 ? `${Math.round(km * 1000)} ${METERS[lang]}` : `${km.toFixed(1).replace('.', decSep(lang))} ${KM[lang]}`
    const row = (k: string) => livingFacts?.rows.find(r => r.key === k)?.km ?? null
    const near: { label: string; value: string }[] = []
    if (beachPick?.km != null) near.push({ label: [pickCopy(NEAR.beach, lang), (en ? (beach?.name_en ?? beach?.name_ru) : (beach?.name_ru ?? beach?.name_en))?.replace(/^(Пляж|Beach|Pantai)\s+/i, '')].filter(Boolean).join(' '), value: dist(beachPick.km) })
    if (row('shop') != null) near.push({ label: pickCopy(NEAR.shop, lang), value: dist(row('shop')!) })
    if (row('school') != null) near.push({ label: pickCopy(NEAR.school, lang), value: dist(row('school')!) })
    if (livingFacts?.airportMin != null) near.push({ label: pickCopy(NEAR.airport, lang), value: `${livingFacts.airportMin} ${MIN[lang]}` })
    aptViewerTabs.unshift({
      key: 'location',
      label: pickCopy({ ru: 'Локация', en: 'Location', id: 'Lokasi', fr: 'Emplacement', de: 'Lage', zh: '位置', nl: 'Locatie', ban: 'Genah', pl: 'Lokalizacja', uk: 'Локація' }, lang),
      icon: <MapPin size={18} aria-hidden />,
      cover: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`,
      bleed: true,
      content: <LocationView lat={lat} lng={lng} place={district ? `${district}, ${pickCopy(NEAR.bali, lang)}` : null} near={near} lang={lang} />,
    })
  }

  // Форма записи и «Написать менеджеру» поверх фото — как на странице виллы
  // (владелец 20.11.2026). Не для переуступок и не для брони.
  const leadOn = priceNum != null && !sellerUrl && !activeReservation
  const m0 = managers[0]
  const leadManager = m0 ? {
    photo: m0.photo ?? null,
    name: lang === 'ru' ? m0.name : (m0.nameEn || (hasCyrillic(m0.name) ? translitPreserveCase(m0.name) : m0.name)),
    langs: lang === 'ru' ? m0.languages : managerLanguagesEn(m0.languages, m0.languagesEn),
  } : null
  // Главы страницы — те же, что у виллы (макет «Журнал», 19.11.2026).
  const CH = pickCopy({
    ru: { obekt: 'Объект', analitika: 'Аналитика', zastroyshchik: 'Застройщик', voprosy: 'Вопросы' },
    en: { obekt: 'Property', analitika: 'Analytics', zastroyshchik: 'Developer', voprosy: 'FAQ' },
    id: { obekt: 'Properti', analitika: 'Analitik', zastroyshchik: 'Pengembang', voprosy: 'Pertanyaan' },
    fr: { obekt: 'Le bien', analitika: 'Analyse', zastroyshchik: 'Promoteur', voprosy: 'Questions' },
    de: { obekt: 'Objekt', analitika: 'Analyse', zastroyshchik: 'Bauträger', voprosy: 'Fragen' },
    zh: { obekt: '房源', analitika: '分析', zastroyshchik: '开发商', voprosy: '常见问题' },
    nl: { obekt: 'Object', analitika: 'Analyse', zastroyshchik: 'Ontwikkelaar', voprosy: 'Vragen' },
    ban: { obekt: 'Properti', analitika: 'Analitik', zastroyshchik: 'Pangwangun', voprosy: 'Pitaken' },
    pl: { obekt: 'Obiekt', analitika: 'Analityka', zastroyshchik: 'Deweloper', voprosy: 'Pytania' },
    uk: { obekt: 'Об’єкт', analitika: 'Аналітика', zastroyshchik: 'Забудовник', voprosy: 'Запитання' },
  }, lang)
  const MGR_ROLE = { ru: 'Менеджер застройщика', en: 'Developer’s manager', id: 'Manajer pengembang', fr: 'Responsable du promoteur', de: 'Ansprechpartner des Bauträgers', zh: '开发商经理', nl: 'Manager van de ontwikkelaar', ban: 'Manajer pengembang', pl: 'Menedżer dewelopera', uk: 'Менеджер забудовника' }
  const PLAN_LABEL = { ru: 'Рассрочка', en: 'Payment plan', id: 'Cicilan', fr: 'Échéancier', de: 'Ratenplan', zh: '分期付款', nl: 'Betaalplan', ban: 'Cicilan', pl: 'Raty', uk: 'Розстрочка' }
  // Рассрочка комплекса («Payment plan,%») — как у виллы: «30 / 20 / 50% · на 12 мес.».
  const paymentPlanText = (() => {
    const raw = (firstString(aptComplex.data?.['Payment plan,%']) ?? '').replace(/\s+/g, ' ').trim()
    if (!raw || raw.includes('...')) return null
    if (/^100\s*%?$/.test(raw)) return pickCopy(PAY_UPFRONT, lang)
    const m = raw.match(/^(.*?)\s*\/\s*(\d+)$/)
    const parts = (m ? m[1] : raw).split('+').map(x => x.replace(/[^\d.]/g, '')).filter(Boolean)
    if (parts.length < 2) return null
    return `${parts.join(' / ')}%${m ? ` · ${pickCopy(PAY_MONTHS, lang)(m[2])}` : ''}`
  })()
  const dealRows = () => paymentPlanText ? [{ label: pickCopy(PLAN_LABEL, lang), valueText: paymentPlanText }] : null
  const leadPrice = (size: 'lg' | 'sm') => priceNum != null && (
    <PriceCtaCard key={`p-${size}`} compact={size} priceUsd={priceNum} updatedAt={priceUpdatedAt} presentationButton={null} />
  )
  const leadCard = (id: string, framed: boolean) => (
    <LeadHeroCard key={id} id={id} framed={framed} lang={lang} price={leadPrice('lg')}
      priceNote={priceNum != null && <PriceCtaCard key="upd" compact="updated" priceUsd={priceNum} updatedAt={priceUpdatedAt} presentationButton={null} />}
      priceMeta={priceNum != null && <PriceCtaCard key="meta" compact="meta" priceUsd={priceNum} pricePerSqmUsd={priceM2} presentationButton={null} dealRows={dealRows()} />}
      manager={leadManager} developerName={devName ?? null} managerName={m0?.name ?? null} managerId={m0?.id ?? null} listingTitle={title} />
  )

  const presentationPdf = (variant: 'link' | 'icon') => (
    <VillaPresentationButton
      key={variant}
      variant={variant}
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
      seoText={seoText}
    />
  )
  const aptWishlist = {
    kind: 'apartment' as const, slug, title,
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
  }
  // Кнопки: сохранить, поделиться, PDF (Pro), сообщить об ошибке — как у виллы.
  const aptActions = (icons = false) => (
    <VillaActions key={icons ? 'ai' : 'al'} icons={icons} lang={lang} title={title} item={aptWishlist} proLinks={
      <span key="pro" className="bx-pro-only">
        {icons ? presentationPdf('icon') : <span className="inline-flex flex-wrap items-center gap-x-6 gap-y-2">{presentationPdf('link')}</span>}
      </span>
    } />
  )
  // Без формы (переуступка или бронь) — цена карточкой, как у виллы.
  const priceCard = priceNum != null && (
    <PriceCtaCard
      journal
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
      presentationButton={null}
      dealRows={dealRows()}
      links={
        <div className="bx-pro-only">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-start">
            <AddToCollection asLink kind="apartment" slug={slug} lang={lang} snapshot={{
              title, photo: photos[0] ?? null, priceUsd: priceNum ?? null,
              district: district ?? null, bedrooms: bedrooms ?? null, area: area ?? null,
              leaseYears: lease ? Number(lease) || null : null, status: status ?? null,
              id: a.airtable_id, land: null, pricePerSqmUsd: priceM2 ?? null, permit: permitLabel(permit, lang) ?? null,
            }} />
            {presentationPdf('link')}
          </div>
        </div>
      }
    />
  )
  const makePriceBar = () => priceNum != null && (
    <PriceCtaCard
      journal
      bar
      hideMain={leadOn}
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
      presentationButton={null}
      dealRows={dealRows()}
      links={aptActions()}
    />
  )

  // «01 Объект» — крупные цифры с короткой подписью, как у виллы.
  const built = !!status && /построен|сдан|ready|completed/i.test(status)
  const leaseUntil = firstString(d['Leasehold до'])
  const ext = firstString(d['Продление аренды']) ?? firstString(d['Продление'])
  const baths = numberOrNull(d['Ванные'] ?? d['Санузлы'])
  const isGround = floor === 'GROUND FLOOR'
  const yearShort = yearRaw && /^\d{4}$/.test(yearRaw.trim()) ? yearRaw.trim() : null
  const plotZone = rdtr ? plotLabel(rdtr, lang) : null
  const objTiles = [
    area != null && { v: `${Math.round(area)} ${SQM[lang]}`, l: pickCopy(APT.area, lang) },
    bedrooms != null && { v: String(bedrooms), l: lang === 'en' ? 'bedrooms' : plural(lang, bedrooms, BEDROOMS) },
    baths != null && { v: String(baths), l: lang === 'en' ? 'bathrooms' : plural(lang, baths, BATHROOMS) },
    floor && { v: isGround ? c.factGround : floor, l: isGround ? c.factFloor.toLowerCase() : pickCopy(APT.floor, lang) },
    leaseYears != null && { v: lang === 'ru' ? `${Math.round(leaseYears)} лет` : nPlural(lang, Math.round(leaseYears), YEARS), l: pickCopy(TILE.lease, lang)(leaseUntil ? leaseUntil.slice(0, 4) : null, !!ext) },
    (built || yearShort) && { v: yearShort ?? '✓', l: built ? pickCopy(TILE.completed, lang) : pickCopy(TILE.completion, lang) },
    plotZone && { v: plotZone.label.split('·').pop()!.trim(), l: plotZone.label.split('·')[0].trim() },
  ].filter(Boolean) as { v: string; l: string }[]
  const vf = visionRaw?.features
  const comforts = [
    vf?.pool ? pickCopy(COMFORT.pool, lang) : null,
    ...(vf?.outdoor ?? []).map(o => COMFORT_OUT[o] ? pickCopy(COMFORT_OUT[o], lang) : null),
    ...(vf?.amenities ?? []).map(o => COMFORT_AMEN[o] ? pickCopy(COMFORT_AMEN[o], lang) : null),
  ].filter(Boolean) as string[]
  const placeNote = firstString(d['Расположение'])
  const permitText = permitLabel(permit, lang)
  const airportText = fmtAirportDistance(lat, lng, lang)
  // Строка ключевых цифр под названием: площадь · спальни · этаж · аренда земли.
  const keyLine = [
    area != null ? `${Math.round(area)} ${SQM[lang]}` : null,
    bedrooms != null ? nPlural(lang, bedrooms, BEDROOMS) : null,
    floor ? (isGround ? pickCopy(APT.groundFloor, lang) : pickCopy(APT.floorN, lang)(floor)) : null,
    (() => {
      const left = leaseYears != null ? Math.round(leaseYears)
        : leaseUntil && /^\d{4}/.test(leaseUntil) ? Number(leaseUntil.slice(0, 4)) - new Date().getFullYear() : null
      if (left == null || left <= 0) return null
      const m10 = left % 10, m100 = left % 100
      const ru = m10 === 1 && m100 !== 11 ? 'год' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'года' : 'лет'
      return lang === 'ru' ? `аренда земли ${left} ${ru}` : pickCopy(KEYLINE.lease, lang)(left)
    })(),
  ].filter(Boolean).join(' · ')

  const hasObjekt = objTiles.length > 0 || !!seoText || !!district || comforts.length > 0 || !!placeNote
  const objektChapter = () => hasObjekt && (
          <VillaChapter id="obekt" no="01" eyebrow={CH.obekt} journal>
            {objTiles.length > 0 && (
              <div className={`grid grid-cols-2 ${leadOn ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
                {objTiles.map(k => (
                  <div key={k.l} className="flex min-w-0 flex-col gap-0.5 border-b border-[#ECEFED] py-[14px] pr-3 md:gap-1 md:py-5 md:pr-6">
                    <div className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#0F1A15] tabular-nums md:text-[32px]">{k.v}</div>
                    <div className="text-[13px] text-[#6B7570] md:text-[14px]">{k.l}</div>
                  </div>
                ))}
              </div>
            )}
            {seoText && (
              <section>
                <p className="m-0 max-w-[68ch] text-[16px] leading-[1.65] text-[#26302B] md:text-[18px] md:leading-[1.7]">{seoText.split('\n')[0]}</p>
                {seoText.includes('\n') && (
                  <ExpandableText className="max-w-[68ch] mt-2" more={pickCopy({ ru: 'Подробнее', en: 'Read more', id: 'Selengkapnya', fr: 'En savoir plus', de: 'Mehr anzeigen', zh: '展开', nl: 'Meer', ban: 'Selengkapnya', pl: 'Więcej', uk: 'Докладніше' }, lang)} less={pickCopy({ ru: 'Свернуть', en: 'Show less', id: 'Tutup', fr: 'Réduire', de: 'Weniger', zh: '收起', nl: 'Minder', ban: 'Tutup', pl: 'Zwiń', uk: 'Згорнути' }, lang)}>
                    <div className="prose-balinsky whitespace-pre-line text-[16px] leading-[1.65] text-[#26302B] md:text-[18px] md:leading-[1.7]">
                      {seoText.split('\n').slice(1).join('\n')}
                    </div>
                  </ExpandableText>
                )}
              </section>
            )}
            {/* Короткие строки: локация, удобства, расположение; у апартаментов ещё
                разрешения и дорога до аэропорта (были в «Характеристиках»). */}
            {(district || comforts.length > 0 || placeNote || permitText || airportText) && (
              <div className="flex max-w-[68ch] flex-col gap-1.5 text-[15px] leading-[1.6] text-[#0F1A15]">
                {district && <div><span className="text-[#6B7570]">{pickCopy(DETAIL_LINES.location, lang)}</span> {district}</div>}
                {comforts.length > 0 && <div><span className="text-[#6B7570]">{pickCopy(DETAIL_LINES.amenities, lang)}</span> {comforts.join(', ')} <span className="text-[#6B7570]">{pickCopy(DETAIL_LINES.fromPhotos, lang)}</span></div>}
                {placeNote && <div><span className="text-[#6B7570]">{pickCopy(DETAIL_LINES.setting, lang)}</span> {placeNote}</div>}
                {permitText && <div><span className="text-[#6B7570]">{c.factPermits}:</span> {permitText}</div>}
                {airportText && <div><span className="text-[#6B7570]">{c.factAirport}:</span> {airportText}</div>}
              </div>
            )}
          </VillaChapter>
        )
  const hasDevChapter = !!(developer || devName || (parentComplex?.slug && parentComplex.name))
  // Без Pro глава «Проверьте с ИИ» скрыта — номера сдвигаются на одну.
  const ai = analyses.length > 0 ? 1 : 0
  const nn = (k: number) => String(k).padStart(2, '0')
  const noDev = hasDevChapter ? <ProNo pro={nn(2 + ai)} guest="02" /> : null
  const noFaq = <ProNo pro={nn((hasDevChapter ? 3 : 2) + ai)} guest={nn(hasDevChapter ? 3 : 2)} />

  return (
    <>
      <Header active="apartamenty" />
      <PageViewTracker kind="apartment" slug={slug} title={title} airtableId={a.airtable_id} lang={lang} />
      <PageEditButton kind="apartment" id={a.airtable_id} lang={lang} />
      <PageContainer>
        <Breadcrumbs hideLast currentUrl={`${apartmentsRoot}/o/${slug}`} items={[
          { label: c.home, href: home },
          { label: c.aptCrumb, href: apartmentsRoot },
          // Regency crumb dropped (no page → no `item` → GSC error).
          ...(district ? [{ label: district, href: districtSlug ? `${apartmentsRoot}/${districtSlug}` : undefined }] : []),
          // Жилой комплекс — ступенью перед названием (владелец 20.11.2026).
          ...(parentComplex?.slug && parentComplex.name ? [{ label: parentComplex.name, href: `${complexesRoot}/o/${parentComplex.slug}` }] : []),
          { label: title },
        ]} />

        {/* Верх — как у виллы (макет «Журнал»): название и строка фактов. */}
        <section className="pb-5 md:pb-6">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="m-0 font-display text-[28px] font-bold leading-[1.12] tracking-[-0.03em] text-[#0F1A15] [overflow-wrap:anywhere] md:text-[40px] lg:text-[44px] lg:leading-[1.1]">
              {/* Без «— 62 м² с 1 спальней»: эти цифры стоят строкой ниже. */}
              {(() => { const h = title.split(/\s[-—–]\s(?=\d)/)[0] || title; return lang === 'en' ? h.replace(/\son\s(?=[A-Z][\w'’\- ]*$)/, ' in ') : h })()}
            </h1>
            {keyLine && <p className="m-0 text-[15px] leading-[1.5] text-[#4A5550] md:text-[18px]">{keyLine}</p>}
          </div>
        </section>

        <VillaGallery
          photos={photos}
          alts={photoAlts}
          plans={curated.plans}
          plan3dUrl={getApartment3DPlanUrl(slug)}
          videos={aptVideos.map(vd => ({ url: vd.url, name: vd.name }))}
          tourUrl={aptTourUrl}
          viewerTabs={aptViewerTabs}
          title={title}
          lang={lang}
          bleed
          tilesAs="text"
          belowHero={!leadOn && priceNum != null ? <div key="bar" className="hidden lg:block">{makePriceBar()}</div> : null}
          aside={leadOn ? leadCard('zapis', true) : null}
          topRight={aptActions(true)}
          afterTiles={leadOn ? <div key="obj" className="mt-16 lg:mt-20">{objektChapter()}</div> : null}
          ambient={(() => {
            // Звук под слайд-шоу — как у вилл: у моря волны, в глубине острова джунгли, иначе сад.
            if ((beachPick?.km ?? 99) <= 1) return '/ambient/ocean.mp3'
            const where = `${firstString(d['Location']) ?? ''} ${districtRaw ?? ''}`
            if (/ubud|tabanan|mengwi|payangan|gianyar|tegal|sidemen|munduk|bedugul|убуд|табанан|менгви/i.test(where)) return '/ambient/jungle.mp3'
            return '/ambient/garden.mp3'
          })()}
        />

        {leadOn ? <LeadStickyBar lang={lang} targetId="zapis" price={leadPrice('sm')} />
          : priceCard && <div className="mt-8 lg:hidden">{priceCard}</div>}

        {/* Разделы 01–04; между ними 64 / 96 px. */}
        <div className="mt-16 flex flex-col gap-16 lg:mt-24 lg:gap-24">
        {!leadOn && objektChapter()}

        {/* Аналитика — одна глава «02 Проверьте апартаменты с ИИ», как у виллы. */}
        {analyses.length > 0 && (
          // Только Pro (владелец 21.11.2026): аналитика ещё не готова для всех.
          <div className="bx-pro-only">
          <VillaChapter id="analitika" no="02" plain eyebrow={CH.analitika}>
            <AnalyticsPanel analyses={analyses} lang={lang} signInHref={`/pro?next=${encodeURIComponent(`${apartmentsRoot}/o/${slug}`)}`} no="02"
              heading={pickCopy(APT.aiHeading, lang)}
              extras={{ daily: calcBlock }} />
          </VillaChapter>
          </div>
        )}

        {/* Застройщик и вопросы — рядом на компьютере, как у виллы. */}
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2">
        {hasDevChapter && noDev && (
          <VillaChapter id="zastroyshchik" no={noDev} eyebrow={CH.zastroyshchik} journal>
            <div className="flex flex-col gap-5 md:gap-6">
              {(developer || devName) && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[20px] font-semibold tracking-[-0.01em] text-[#0F1A15] md:text-[24px]">{developer?.name ?? devName}</span>
                  {developer?.logoUrl && (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ECEFED] bg-white p-1">
                      <Image src={developer.logoUrl} alt={developer.name} width={40} height={40} className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                </div>
              )}
              {(devStats || parentComplex?.units) && (
                <div className="flex flex-wrap gap-x-8 gap-y-4 md:gap-x-12">
                  {devStats && (
                    <span className="flex flex-col gap-0.5 md:gap-1">
                      <span className="text-[24px] font-semibold leading-[1.15] tabular-nums md:text-[28px]">{devStats.ready} {pickCopy({ ru: 'из', en: 'of', id: 'dari', fr: 'sur', de: 'von', zh: '/', nl: 'van', ban: 'saking', pl: 'z', uk: 'з' }, lang)} {devStats.total}</span>
                      <span className="text-[13px] text-[#6B7570] md:text-[14px]">{pickCopy({ ru: 'проектов сдано', en: 'projects completed', id: 'proyek selesai', fr: 'projets livrés', de: 'Projekte fertiggestellt', zh: '个项目已交付', nl: 'projecten opgeleverd', ban: 'proyek sampun puput', pl: 'projektów ukończonych', uk: 'проєктів здано' }, lang)}</span>
                    </span>
                  )}
                  {devStats && devStats.inProgress > 0 && (
                    <span className="flex flex-col gap-0.5 md:gap-1">
                      <span className="text-[24px] font-semibold leading-[1.15] tabular-nums md:text-[28px]">{devStats.inProgress}</span>
                      <span className="text-[13px] text-[#6B7570] md:text-[14px]">{pickCopy({ ru: 'строится', en: 'under construction', id: 'sedang dibangun', fr: 'en construction', de: 'im Bau', zh: '在建', nl: 'in aanbouw', ban: 'kantun kabangun', pl: 'w budowie', uk: 'будується' }, lang)}</span>
                    </span>
                  )}
                  {parentComplex?.units ? (
                    <span className="flex flex-col gap-0.5 md:gap-1">
                      <span className="text-[24px] font-semibold leading-[1.15] tabular-nums md:text-[28px]">{parentComplex.units}</span>
                      <span className="text-[13px] text-[#6B7570] md:text-[14px]">{c.units(parentComplex.units).replace(/^\d+\s*/, '')} {pickCopy(UNITS_IN, lang)} {parentComplex.name}</span>
                    </span>
                  ) : null}
                </div>
              )}
              {/* Комплекс — карточкой с фото, нажимается целиком. */}
              {parentComplex?.slug && parentComplex.name && (
                <Link href={`${complexesRoot}/o/${parentComplex.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-[#ECEFED] p-2 pr-4 text-[#0F1A15] no-underline transition-colors duration-[120ms] hover:border-[#C9D3CE] md:gap-4">
                  <span className="relative aspect-[16/10] w-[112px] shrink-0 overflow-hidden rounded-lg bg-[#F6F8F7] md:w-[168px]">
                    {parentComplex.cover_url && (
                      <Image src={parentComplex.cover_url} alt={parentComplex.name} fill sizes="168px" className="object-cover" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-1">
                    <span className="text-[13px] text-[#6B7570]">{pickCopy({ ru: 'Комплекс', en: 'Complex', id: 'Kompleks', fr: 'Résidence', de: 'Anlage', zh: '项目', nl: 'Complex', ban: 'Kompleks', pl: 'Kompleks', uk: 'Комплекс' }, lang)}</span>
                    <span className="truncate text-[16px] font-semibold md:text-[17px]">{parentComplex.name}</span>
                    <span className="text-[13px] leading-[1.4] text-[#4A5550] md:text-[14px]">{pickCopy({ ru: 'Все апартаменты, генплан и фото комплекса', en: 'All apartments, master plan and photos', id: 'Semua apartemen, rencana induk dan foto', fr: 'Tous les appartements, plan de masse et photos', de: 'Alle Apartments, Lageplan und Fotos', zh: '全部公寓、总平面图和照片', nl: 'Alle appartementen, masterplan en foto’s', ban: 'Sami apartemen, rencana induk lan foto', pl: 'Wszystkie apartamenty, plan zagospodarowania i zdjęcia', uk: 'Усі апартаменти, генплан і фото комплексу' }, lang)}</span>
                  </span>
                  <span className="shrink-0 text-[22px] leading-none text-[#6B7570] transition-transform duration-[120ms] group-hover:translate-x-0.5" aria-hidden>›</span>
                </Link>
              )}
              {developer && (
                <Link href={`${developersRoot}/${developer.slug}`} className="self-start py-1 text-[15px] text-[#0F1A15] underline underline-offset-4 transition-colors duration-[120ms] hover:text-[var(--color-primary)]">
                  {c.openDeveloper}
                </Link>
              )}
              {/* Менеджер застройщика — сюда ведёт зелёная кнопка «Связаться». */}
              {m0 && leadManager && (
                <div id="kontakty-operatora" className="flex scroll-mt-[136px] flex-col gap-4 border-t border-[#ECEFED] pt-5">
                <div className="flex items-center gap-3">
                  {m0.photo ? (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#F6F8F7]">
                      <Image src={m0.photo} alt={leadManager.name} fill sizes="48px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F6F8F7] text-[18px] text-[#6B7570]">
                      {leadManager.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-[#0F1A15]">
                      {leadManager.name}{devName ? `, ${devName}` : ''}
                    </div>
                    <div className="text-[13px] text-[#6B7570]">
                      {pickCopy(MGR_ROLE, lang)}
                    </div>
                  </div>
                </div>
                <ManagerContactButtons lang={lang} managerId={m0.id} managerName={m0.name} developerName={devName ?? null} listingTitle={title} />
                </div>
              )}
            </div>
          </VillaChapter>
        )}

        {aptVideos.length > 0 && (
          <VideoGrid jsonLdOnly videos={aptVideos} title={parentComplexName ? `${pickCopy({ ru: 'Видео', en: 'Videos', id: 'Video', fr: 'Vidéos', de: 'Videos', zh: '视频', nl: "Video's", ban: 'Video', pl: 'Filmy', uk: 'Відео' }, lang)}: ${parentComplexName}` : pickCopy({ ru: 'Видео', en: 'Videos', id: 'Video', fr: 'Vidéos', de: 'Videos', zh: '视频', nl: "Video's", ban: 'Video', pl: 'Filmy', uk: 'Відео' }, lang)} />
        )}

        <VillaChapter id="voprosy" no={noFaq} eyebrow={CH.voprosy} journal>
          <div className="-mt-2 md:-mt-4">
            {faqItems.map((it, i) => (
              <details key={i} className="group border-b border-[#ECEFED]">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[16px] text-[#0F1A15] transition-colors duration-[120ms] hover:text-[var(--color-primary)] md:text-[17px] [&::-webkit-details-marker]:hidden">
                  {it.q}
                  <span className="shrink-0 text-[22px] leading-none text-[#6B7570]" aria-hidden><span className="group-open:hidden">+</span><span className="hidden group-open:inline">&minus;</span></span>
                </summary>
                <div className="max-w-[68ch] pb-4 text-[15px] leading-[1.6] text-[#4A5550]">{it.a}</div>
              </details>
            ))}
          </div>
        </VillaChapter>
        </div>

        </div>

        {/* Emit the Product/merchant-listing schema ONLY when it carries an
            image — Google's merchant validator marks an image-less Product
            invalid ("Отсутствует поле image"), and an image-less listing
            can't be a valid rich result anyway. The page keeps its
            Apartment (place) + FAQ schema regardless. */}
        {photos.length > 0 && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
        )}
        {placeJsonLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }} />
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
