// Shared villa-detail renderer for both /ru/villy/o/[slug] and
// /en/villas/o/[slug]. Layout, data fetching and section order live
// here; locale-specific copy is in the COPY table below.

import { TouristHeatMap } from '@/components/TouristHeatMap'
import { ProPendingNote } from '@/components/ProPendingNote'
import { isHiddenDeveloper } from '@/lib/hidden-developers'
import type { ReactNode } from 'react'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { revisionedCache } from '@/lib/revisioned-cache'
import { contentRev } from '@/lib/content-version'
import {
  BedDouble, Square, Trees, Calendar, FileCheck2, Lock, MapPin, Plane,
  ChevronRight, HardHat, Star, Palette, Sun, Globe, FileText, Layers,
} from 'lucide-react'
import { distanceKm as haversineKm } from '@/lib/competitor-utils'

const AIRPORT_LAT = -8.7467
const AIRPORT_LNG = 115.1667
function fmtAirportDistance(lat: number | null, lng: number | null, lang: Lang): string | null {
  if (lat == null || lng == null) return null
  const km = haversineKm(lat, lng, AIRPORT_LAT, AIRPORT_LNG)
  if (lang !== 'ru') return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
  return km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} км`
}
import { Header } from '@/components/Header'
import { ExpandableText } from '@/components/ExpandableText'
import { PageContainer } from '@/components/PageContainer'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'
import { loadVillaLandProfile, landAllowsBuilding } from '@/lib/land-profile'
import { parseProjectPermits, hasProjectPermits } from '@/lib/project-permits'
import { loadMarketStats } from '@/lib/complex-market-stats'
import { loadOneUnitDemand } from '@/lib/unit-demand'
import { GatedBlock } from '@/components/GatedBlock'
import { cdnManifestUrl } from '@/lib/photo-cdn'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import dynamic from 'next/dynamic'
import { listLayers, listHotspots } from '@/lib/complex-visualizations'
import { loadComplexMedia } from '@/lib/complex-media'
import { loadPromoKit } from '@/lib/promo-kits'
import { complexDocs } from '@/lib/complex-docs'
import { ComplexDocsView } from '@/components/ComplexDocsView'
import { MasterplanWithList, type MasterplanRow } from '@/components/MasterplanWithList'
import { VillaChapter, VillaBlock } from '@/components/VillaChapter'
import { VillaChapterNav } from '@/components/VillaChapterNav'
import { ZoningMap } from '@/components/ZoningMap'
import { ZoningCard } from '@/components/ZoningCard'
import { KeyFactsInline } from '@/components/KeyFactsInline'
import { Money } from '@/components/Money'
import { RDTR_BASE, loadRdtr, pctText, plotLabel, zoneRows, type RdtrData } from '@/lib/rdtr-zones'
import { LegalAudit } from '@/components/LegalAudit'
import { LEGAL_OK_FIELD, LEGAL_QUESTIONS_FIELD, LEGAL_BALANCE_FIELD, LEGAL_BALANCE_NOTES_FIELD, parseAuditItems, parseBalance } from '@/lib/legal-audit'
import { loadComplexAudit } from '@/lib/complex-legal-i18n'
import type { Wind } from '@/lib/complex-access'
import { getSitePlan } from '@/lib/complex-sun-plan'
import { loadSunSettings } from '@/lib/complex-sun'
const SunShadowBlock = dynamic(() => import('@/components/sun/SunShadowBlock').then(m => ({ default: m.SunShadowBlock })))
const Google3DMapBlock = dynamic(() => import('@/components/sun/Google3DMapBlock').then(m => ({ default: m.Google3DMapBlock })))
const ComplexVisualizationViewer = dynamic(
  () => import('@/components/ComplexVisualizationViewer').then(m => ({ default: m.ComplexVisualizationViewer })),
)
// Heavy client widgets — pulled off the initial JS bundle. Both
// render below the fold on detail pages, so late hydration is invisible.
// LandProfileBlock — 474 LOC of charts/sliders; InvestmentWidget — 626 +
// Google Maps loader. Together ~30 KB gzipped that no longer ships in
// the initial chunk.
const InvestmentWidget = dynamic(
  () => import('@/components/InvestmentWidget').then(m => ({ default: m.InvestmentWidget })),
)
const LandProfileBlock = dynamic(
  () => import('@/components/LandProfileBlock').then(m => ({ default: m.LandProfileBlock })),
)
import { saleCompsNear, type CatalogSale } from '@/lib/sale-comps'
import { landPricesNear } from '@/lib/land-prices'
import { loadAll as loadVillaCatalog } from '@/app/ru/villy/_lib'
import { SaleCompsBlock } from '@/components/SaleCompsBlock'
import { LazyMount } from '@/components/LazyMount'
import { ManagerCard } from '@/components/ManagerCard'
import { loadNearbyPlaces } from '@/lib/nearby-places'
import { loadLandmarks } from '@/lib/landmarks'
import { computeLivingFacts, loadLivingNoise } from '@/lib/living'
import { LivingList } from '@/components/LivingVerdict'
import { BeachBlock } from '@/components/BeachBlock'
import { nearestBeachProfile, nearestBeachProfileByPoint } from '@/lib/beaches'
import { loadGeoFacts } from '@/lib/complex-access'
import { ComplexAccessBlock } from '@/components/ComplexAccessBlock'
import { VerifiedYieldBadge } from '@/components/VerifiedYieldBadge'
import { ClimateBlock } from '@/components/ClimateBlock'
import { loadVerdictSnapshot, loadComplexFacts, computeYieldFacts, buildVerdict, yieldScenarios } from '@/lib/listing-verdict'
import { ListingVerdict, SafetyCards, SafetyChecks, DemandSummary, DemandBandsPdf, YieldScenariosTable, questionHeaders, TONE_PILL_CLASS } from '@/components/ListingVerdict'
import { IncomeCalculator } from '@/components/IncomeCalculator'
import { BeachWeatherDesign } from '@/components/BeachWeatherDesign'
import { LocationSection } from '@/components/LocationSection'
import { PdfDocument, NEAR_COLORS } from '@/components/pdf/PdfDocument'
import type { PdfRequest } from '@/lib/pdf-request'
import { loadManagersByDeveloperName, loadManagersByDeveloperSlug } from '@/lib/managers'
import { getDeveloperStats } from '@/lib/developer-stats'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'
import { cleanDeveloperBullets } from '@/lib/developer-highlights'
import { PriceCtaCard } from '@/components/PriceCtaCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { loadAllVideos, matchesLang as videoMatchesLang } from '@/lib/videos'
import { loadVillaStyles } from '@/lib/villa-styles'
import { loadAllVillaScores } from '@/lib/investment/batch-scores'
import { findActiveReservation } from '@/lib/reservations'
import { VideoGrid } from '@/components/VideoGrid'
import { PageViewTracker } from '@/components/PageViewTracker'
import { PageEditButton } from '@/components/page-edit/PageEditButton'
import { permitLabel } from '@/components/presentation-copy'
import { VillaPresentationButton } from '@/components/VillaPresentation'
import { AddToCollection } from '@/components/collections/AddToCollection'
import { tField, pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { normalizeSlug } from '@/lib/slug-normalize'
import { resolveListingTitle, anonListingTitle } from '@/lib/listing-title'
import { loadAllTranslations, mergeAllTranslations, loadTranslations } from '@/lib/en-translations'
import { pluralRu } from '@/lib/plural-ru'
import { districtRu } from '@/lib/district-ru'
import { geoChainString } from '@/lib/regency'
import { loadKbPageContent } from '@/lib/kb-page-content'
import { loadAirbnbNearby } from '@/lib/airbnb-nearby'
import { CompareButton, type CompareData, type CompareSaleItem, type CompareDailyItem, type CompareMonthlyItem } from '@/components/NeighborComparePopup'
import { loadListingVision, altFor } from '@/lib/listing-features'
import { loadListingCopy } from '@/lib/listing-copy'
import { curatePhotos } from '@/lib/listing-photos'
import { DistrictAboutCard } from '@/components/DistrictAboutCard'
import { getDistrictCopy, getBuyAnchor } from '@/lib/districts'
import { DISTRICT_TO_SLUG, BEDROOM_TO_SLUG } from '@/lib/seo-routes'
import { facetLabel } from '@/lib/filter-i18n'
import { hreflangMap } from '@/lib/hreflang'
import { getVilla3DPlanUrl } from '@/lib/villa-3d-plans'
import { VillaGallery, type ViewerTab } from '@/components/VillaGallery'
import { metaSnippet } from '@/lib/seo'

const COPY = {
  ru: {
    home: 'Главная', villasCrumb: 'Виллы и дома',
    sqm: 'м²', house: 'дом', land: 'земля', bali: 'Бали',
    completed: 'Сдан',
    factsHeading: 'Характеристики',
    aboutVillaHeading: 'О вилле', aboutLandHeading: 'Участок',
    factBedrooms: 'Спальни', factHouse: 'Площадь дома', factLand: 'Земля', factCompletion: 'Сдача',
    factPermits: 'Разрешение на стройку', factLeasehold: 'Срок аренды', factDistrict: 'Район',
    factAirport: 'До аэропорта', factStyle: 'Стиль', factPriceM2: 'Цена за м²',
    factType: 'Тип', factTypeVilla: 'Вилла', factTypeVillaComplex: 'Вилла в комплексе',
    factOwnership: 'Право', factOwnershipLease: 'Аренда земли (лизхолд)',
    factSeller: 'Продаёт', factSellerDev: 'Застройщик', factSellerResale: 'Перепродажа',
    factPricePerYear: 'Год владения обходится',
    sidebarPriceNormal: 'Цена обычная для района',
    sidebarSaveCompare: 'Сохранить и сравнить',
    readMore: 'Узнать больше',
    factLeaseValue: (l: string) => `${l} ${Number.isFinite(Number(l)) ? pluralRu(Number(l), ['год', 'года', 'лет']) : 'лет'}`,
    descHeading: 'Описание',
    complexLabel: 'Жилой комплекс',
    completedShort: 'Сдан',
    completion: (y: string) => `Сдача ${y}`,
    units: (n: number) => `${n} ${pluralRu(n, ['юнит', 'юнита', 'юнитов'])}`,
    openComplex: 'Открыть страницу комплекса',
    sellingSeparately: 'Объект продаётся отдельно (не в составе комплекса)',
    developerLabel: 'Застройщик',
    openDeveloper: 'Подробнее о застройщике',
    devStatTotal: (n: number) => `${n} ${pluralRu(n, ['вилла построена', 'виллы построено', 'вилл построено'])}`,
    devStatReady: (n: number) => `${n} ${pluralRu(n, ['сдана', 'сданы', 'сданы'])}`,
    devStatBuilding: (n: number) => `${n} ${pluralRu(n, ['строится', 'строятся', 'строятся'])}`,
    videosTitleComplex: (n: string) => `Видео: ${n}`,
    videosTitleDev: (n: string) => `Видео: ${n}`,
    videosTitleDefault: 'Видео',
    otherVillas: (d: string) => `Другие виллы в районе ${d}`,
    relatedHeading: 'По теме',
    related: {
      allVillas: 'Все виллы и дома Бали',
      apartments: 'Апартаменты на Бали',
      complexes: 'Жилые комплексы',
      developers: 'Застройщики Бали',
      villasIn: (d: string) => `Виллы в ${d}`,
    },
    faqHeading: 'Частые вопросы',
    faq: (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
      { q: `Сколько стоит ${title}?`,
        a: price ? `Текущая цена объекта — ${price}. Актуальный прайс всегда указан в карточке выше.` : 'Цена уточняется. Свяжитесь для актуального прайса.' },
      { q: `Где находится ${title}?`,
        a: district ? `Объект расположен в районе ${district} на Бали. Точные координаты — на карте выше.` : 'Точное расположение и координаты — на карте выше.' },
      { q: 'Можно ли иностранцу купить виллу на Бали?',
        a: 'Да. Сделка оформляется по схеме лизхолда (долгосрочной аренды земли) у нотариуса PPAT, либо через индонезийское юр. лицо PT PMA.' },
      { q: 'Какой срок лизхолда?',
        a: lease ? `Базовый срок — ${lease} ${pluralRu(Number(lease), ['год', 'года', 'лет'])}. Условия продления уточняйте у застройщика.` : 'Срок лизхолда уточняйте у застройщика. Стандартно 25–80 лет с возможностью продления.' },
      { q: 'Какая земля прилагается к вилле?',
        a: land != null ? `${land} м² собственного участка с виллой.` : 'Площадь участка уточняйте — указывается в карточке выше.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` в ${district}` : ''} на Бали${price ? `. Цена ${price}.` : '.'} Фото, площадь, земля, документы.`,
  },
  en: {
    home: 'Home', villasCrumb: 'Villas',
    sqm: 'm²', house: 'house', land: 'land', bali: 'Bali',
    completed: 'Completed',
    factsHeading: 'Specs',
    aboutVillaHeading: 'About the villa', aboutLandHeading: 'Land',
    factBedrooms: 'Bedrooms', factHouse: 'House area', factLand: 'Land', factCompletion: 'Completion',
    factPermits: 'Building permit', factLeasehold: 'Lease term', factDistrict: 'District',
    factAirport: 'To airport', factStyle: 'Style', factPriceM2: 'Price per m²',
    factType: 'Type', factTypeVilla: 'Villa', factTypeVillaComplex: 'Villa in a complex',
    factOwnership: 'Ownership', factOwnershipLease: 'Leasehold',
    factSeller: 'Sold by', factSellerDev: 'Developer', factSellerResale: 'Resale',
    factPricePerYear: 'Annual cost of ownership',
    sidebarPriceNormal: 'Normal price for the area',
    sidebarSaveCompare: 'Save & compare',
    readMore: 'Learn more',
    factLeaseValue: (l: string) => `${l} years`,
    descHeading: 'Description',
    complexLabel: 'Residential complex',
    completedShort: 'Completed',
    completion: (y: string) => `Completion ${y}`,
    units: (n: number) => `${n} units`,
    openComplex: 'Open complex page',
    sellingSeparately: 'Sold separately (not part of a complex)',
    developerLabel: 'Developer',
    openDeveloper: 'More about the developer',
    devStatTotal: (n: number) => `${n} villas built`,
    devStatReady: (n: number) => `${n} completed`,
    devStatBuilding: (n: number) => `${n} under construction`,
    videosTitleComplex: (n: string) => `Videos: ${n}`,
    videosTitleDev: (n: string) => `Videos: ${n}`,
    videosTitleDefault: 'Videos',
    otherVillas: (d: string) => `Other villas in ${d}`,
    relatedHeading: 'Related',
    related: {
      allVillas: 'All Bali villas and houses',
      apartments: 'Apartments in Bali',
      complexes: 'Residential complexes',
      developers: 'Bali developers',
      villasIn: (d: string) => `Villas in ${d}`,
    },
    faqHeading: 'Frequently asked questions',
    faq: (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
      { q: `How much does ${title} cost?`,
        a: price ? `Current asking price is ${price}. Live price is always shown in the card above.` : 'Price on request. Contact us for current pricing.' },
      { q: `Where is ${title} located?`,
        a: district ? `The property is in ${district}, Bali. Exact coordinates on the map above.` : 'Exact location and coordinates on the map above.' },
      { q: 'Can a foreigner buy a Bali villa?',
        a: 'Yes. The deal is closed via leasehold (long-term land lease) at a PPAT notary, or through a PT PMA company.' },
      { q: 'What is the leasehold term?',
        a: lease ? `Base term is ${lease} years. Check extension conditions with the developer.` : 'Check the leasehold term with the developer — typically 25–80 years with extension options.' },
      { q: 'What land comes with the villa?',
        a: land != null ? `${land} m² private plot with the villa.` : 'Plot size on request — shown in the card above when available.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` in ${district}` : ''} in Bali${price ? `. Price ${price}.` : '.'} Photos, layout, land, documents.`,
  },
  id: {
    home: 'Beranda', villasCrumb: 'Vila',
    sqm: 'm²', house: 'rumah', land: 'tanah', bali: 'Bali',
    completed: 'Selesai',
    factsHeading: 'Spesifikasi',
    aboutVillaHeading: 'Tentang vila', aboutLandHeading: 'Tanah',
    factBedrooms: 'Kamar tidur', factHouse: 'Luas rumah', factLand: 'Tanah', factCompletion: 'Serah terima',
    factPermits: 'Izin bangun', factLeasehold: 'Masa sewa', factDistrict: 'Wilayah',
    factAirport: 'Ke bandara', factStyle: 'Gaya', factPriceM2: 'Harga per m²',
    factType: 'Tipe', factTypeVilla: 'Vila', factTypeVillaComplex: 'Vila dalam kompleks',
    factOwnership: 'Hak', factOwnershipLease: 'Hak sewa tanah',
    factSeller: 'Dijual oleh', factSellerDev: 'Pengembang', factSellerResale: 'Jual kembali',
    factPricePerYear: 'Biaya per tahun',
    sidebarPriceNormal: 'Harga normal untuk area ini',
    sidebarSaveCompare: 'Simpan & bandingkan',
    readMore: 'Selengkapnya',
    factLeaseValue: (l: string) => `${l} tahun`,
    descHeading: 'Deskripsi',
    complexLabel: 'Kompleks hunian',
    completedShort: 'Selesai',
    completion: (y: string) => `Serah terima ${y}`,
    units: (n: number) => `${n} unit`,
    openComplex: 'Buka halaman kompleks',
    sellingSeparately: 'Dijual terpisah (bukan bagian dari kompleks)',
    developerLabel: 'Pengembang',
    openDeveloper: 'Selengkapnya tentang pengembang',
    devStatTotal: (n: number) => `${n} vila dibangun`,
    devStatReady: (n: number) => `${n} selesai`,
    devStatBuilding: (n: number) => `${n} sedang dibangun`,
    videosTitleComplex: (n: string) => `Video: ${n}`,
    videosTitleDev: (n: string) => `Video: ${n}`,
    videosTitleDefault: 'Video',
    otherVillas: (d: string) => `Vila lain di ${d}`,
    relatedHeading: 'Terkait',
    related: {
      allVillas: 'Semua vila dan rumah di Bali',
      apartments: 'Apartemen di Bali',
      complexes: 'Kompleks hunian',
      developers: 'Pengembang Bali',
      villasIn: (d: string) => `Vila di ${d}`,
    },
    faqHeading: 'Pertanyaan yang sering diajukan',
    faq: (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
      { q: `Berapa harga ${title}?`,
        a: price ? `Harga saat ini — ${price}. Harga terbaru selalu ditampilkan di kartu di atas.` : 'Harga berdasarkan permintaan. Hubungi kami untuk harga terkini.' },
      { q: `Di mana lokasi ${title}?`,
        a: district ? `Properti berada di ${district}, Bali. Koordinat pastinya ada di peta di atas.` : 'Lokasi dan koordinat pastinya ada di peta di atas.' },
      { q: 'Bisakah warga asing membeli vila di Bali?',
        a: 'Ya. Transaksi dilakukan melalui skema hak sewa (leasehold, sewa tanah jangka panjang) di notaris PPAT, atau melalui perusahaan PT PMA.' },
      { q: 'Berapa jangka waktu hak sewa?',
        a: lease ? `Jangka waktu dasar — ${lease} tahun. Tanyakan syarat perpanjangan kepada pengembang.` : 'Tanyakan jangka waktu hak sewa kepada pengembang — biasanya 25–80 tahun dengan opsi perpanjangan.' },
      { q: 'Berapa luas tanah yang menyertai vila?',
        a: land != null ? `${land} m² tanah pribadi bersama vila.` : 'Luas tanah berdasarkan permintaan — ditampilkan di kartu di atas bila tersedia.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` di ${district}` : ''} di Bali${price ? `. Harga ${price}.` : '.'} Foto, tata letak, tanah, dokumen.`,
  },
  fr: {
    home: 'Accueil', villasCrumb: 'Villas',
    sqm: 'm²', house: 'maison', land: 'terrain', bali: 'Bali',
    completed: 'Livré',
    factsHeading: 'Caractéristiques',
    aboutVillaHeading: 'La villa', aboutLandHeading: 'Terrain',
    factBedrooms: 'Chambres', factHouse: 'Surface maison', factLand: 'Terrain', factCompletion: 'Livraison',
    factPermits: 'Permis de construire', factLeasehold: 'Durée du bail', factDistrict: 'Quartier',
    factAirport: "Vers l'aéroport", factStyle: 'Style', factPriceM2: 'Prix au m²',
    factType: 'Type', factTypeVilla: 'Villa', factTypeVillaComplex: 'Villa en résidence',
    factOwnership: 'Droit', factOwnershipLease: 'Bail emphytéotique',
    factSeller: 'Vendu par', factSellerDev: 'Promoteur', factSellerResale: 'Revente',
    factPricePerYear: 'Coût annuel de détention',
    sidebarPriceNormal: 'Prix normal pour le quartier',
    sidebarSaveCompare: 'Sauvegarder et comparer',
    readMore: 'En savoir plus',
    factLeaseValue: (l: string) => `${l} ans`,
    descHeading: 'Description',
    complexLabel: 'Résidence',
    completedShort: 'Livré',
    completion: (y: string) => `Livraison ${y}`,
    units: (n: number) => `${n} unités`,
    openComplex: 'Ouvrir la page de la résidence',
    sellingSeparately: 'Vendu séparément (hors résidence)',
    developerLabel: 'Promoteur',
    openDeveloper: 'En savoir plus sur le promoteur',
    devStatTotal: (n: number) => `${n} villas construites`,
    devStatReady: (n: number) => `${n} livrées`,
    devStatBuilding: (n: number) => `${n} en construction`,
    videosTitleComplex: (n: string) => `Vidéos : ${n}`,
    videosTitleDev: (n: string) => `Vidéos : ${n}`,
    videosTitleDefault: 'Vidéos',
    otherVillas: (d: string) => `Autres villas à ${d}`,
    relatedHeading: 'Sur le même thème',
    related: {
      allVillas: 'Toutes les villas et maisons de Bali',
      apartments: 'Appartements à Bali',
      complexes: 'Résidences',
      developers: 'Promoteurs de Bali',
      villasIn: (d: string) => `Villas à ${d}`,
    },
    faqHeading: 'Questions fréquentes',
    faq: (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
      { q: `Combien coûte ${title} ?`,
        a: price ? `Le prix actuel est de ${price}. Le prix à jour est toujours affiché dans la fiche ci-dessus.` : 'Prix sur demande. Contactez-nous pour le prix actuel.' },
      { q: `Où se situe ${title} ?`,
        a: district ? `Le bien se trouve à ${district}, Bali. Les coordonnées exactes sont sur la carte ci-dessus.` : 'Emplacement et coordonnées exacts sur la carte ci-dessus.' },
      { q: 'Un étranger peut-il acheter une villa à Bali ?',
        a: 'Oui. La transaction se conclut via un bail longue durée (leasehold) chez un notaire PPAT, ou via une société PT PMA.' },
      { q: 'Quelle est la durée du bail ?',
        a: lease ? `La durée de base est de ${lease} ans. Vérifiez les conditions de renouvellement avec le promoteur.` : 'Vérifiez la durée du bail auprès du promoteur — généralement 25 à 80 ans avec options de renouvellement.' },
      { q: 'Quel terrain accompagne la villa ?',
        a: land != null ? `${land} m² de terrain privatif avec la villa.` : 'Superficie du terrain sur demande — indiquée dans la fiche ci-dessus lorsque disponible.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` à ${district}` : ''} à Bali${price ? `. Prix ${price}.` : '.'} Photos, plan, terrain, documents.`,
  },
  de: {
    home: 'Startseite', villasCrumb: 'Villen',
    sqm: 'm²', house: 'Haus', land: 'Grundstück', bali: 'Bali',
    completed: 'Fertiggestellt',
    factsHeading: 'Eckdaten',
    aboutVillaHeading: 'Über die Villa', aboutLandHeading: 'Grundstück',
    factBedrooms: 'Schlafzimmer', factHouse: 'Wohnfläche', factLand: 'Grundstück', factCompletion: 'Fertigstellung',
    factPermits: 'Baugenehmigung', factLeasehold: 'Pachtdauer', factDistrict: 'Gegend',
    factAirport: 'Zum Flughafen', factStyle: 'Stil', factPriceM2: 'Preis pro m²',
    factType: 'Typ', factTypeVilla: 'Villa', factTypeVillaComplex: 'Villa in Wohnanlage',
    factOwnership: 'Eigentumsrecht', factOwnershipLease: 'Leasehold',
    factSeller: 'Verkauf durch', factSellerDev: 'Bauträger', factSellerResale: 'Wiederverkauf',
    factPricePerYear: 'Jährliche Haltekosten',
    sidebarPriceNormal: 'Normaler Preis für die Gegend',
    sidebarSaveCompare: 'Speichern & vergleichen',
    readMore: 'Mehr anzeigen',
    factLeaseValue: (l: string) => `${l} Jahre`,
    descHeading: 'Beschreibung',
    complexLabel: 'Wohnanlage',
    completedShort: 'Fertig',
    completion: (y: string) => `Fertigstellung ${y}`,
    units: (n: number) => `${n} Einheiten`,
    openComplex: 'Zur Wohnanlage',
    sellingSeparately: 'Einzeln verkauft (nicht Teil einer Anlage)',
    developerLabel: 'Bauträger',
    openDeveloper: 'Mehr über den Bauträger',
    devStatTotal: (n: number) => `${n} Villen gebaut`,
    devStatReady: (n: number) => `${n} fertiggestellt`,
    devStatBuilding: (n: number) => `${n} im Bau`,
    videosTitleComplex: (n: string) => `Videos: ${n}`,
    videosTitleDev: (n: string) => `Videos: ${n}`,
    videosTitleDefault: 'Videos',
    otherVillas: (d: string) => `Weitere Villen in ${d}`,
    relatedHeading: 'Ähnliches',
    related: {
      allVillas: 'Alle Villen und Häuser auf Bali',
      apartments: 'Apartments auf Bali',
      complexes: 'Wohnanlagen',
      developers: 'Bali-Bauträger',
      villasIn: (d: string) => `Villen in ${d}`,
    },
    faqHeading: 'Häufig gestellte Fragen',
    faq: (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
      { q: `Wie viel kostet ${title}?`,
        a: price ? `Der aktuelle Preis beträgt ${price}. Der aktuelle Preis steht immer in der Karte oben.` : 'Preis auf Anfrage. Kontaktieren Sie uns für den aktuellen Preis.' },
      { q: `Wo befindet sich ${title}?`,
        a: district ? `Die Immobilie liegt in ${district}, Bali. Genaue Koordinaten auf der Karte oben.` : 'Genaue Lage und Koordinaten auf der Karte oben.' },
      { q: 'Kann ein Ausländer eine Villa auf Bali kaufen?',
        a: 'Ja. Der Kauf erfolgt per Leasehold (langfristige Grundstückspacht) bei einem PPAT-Notar oder über eine PT-PMA-Gesellschaft.' },
      { q: 'Wie lange läuft der Leasehold?',
        a: lease ? `Die Grundlaufzeit beträgt ${lease} Jahre. Verlängerungsbedingungen mit dem Bauträger klären.` : 'Die Leasehold-Laufzeit mit dem Bauträger klären — üblicherweise 25–80 Jahre mit Verlängerungsoptionen.' },
      { q: 'Welches Grundstück gehört zur Villa?',
        a: land != null ? `${land} m² eigenes Grundstück mit der Villa.` : 'Grundstücksgröße auf Anfrage — falls verfügbar in der Karte oben angegeben.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` in ${district}` : ''} auf Bali${price ? `. Preis ${price}.` : '.'} Fotos, Fläche, Grundstück, Dokumente.`,
  },
  zh: {
    home: '首页', villasCrumb: '别墅',
    sqm: 'm²', house: '房屋', land: '土地', bali: '巴厘岛',
    completed: '已交付',
    factsHeading: '核心信息',
    aboutVillaHeading: '别墅信息', aboutLandHeading: '土地',
    factBedrooms: '卧室', factHouse: '房屋面积', factLand: '土地', factCompletion: '交付',
    factPermits: '建筑许可', factLeasehold: '租赁期限', factDistrict: '区域',
    factAirport: '到机场', factStyle: '风格', factPriceM2: '每平米价格',
    factType: '类型', factTypeVilla: '别墅', factTypeVillaComplex: '小区别墅',
    factOwnership: '产权', factOwnershipLease: '土地租赁权',
    factSeller: '出售方', factSellerDev: '开发商', factSellerResale: '转售',
    factPricePerYear: '年持有成本',
    sidebarPriceNormal: '区域正常价格',
    sidebarSaveCompare: '保存并比较',
    readMore: '展开',
    factLeaseValue: (l: string) => `${l} 年`,
    descHeading: '描述',
    complexLabel: '住宅区',
    completedShort: '已交付',
    completion: (y: string) => `${y} 交付`,
    units: (n: number) => `${n} 套`,
    openComplex: '打开住宅区页面',
    sellingSeparately: '单独出售（不属于任何住宅区）',
    developerLabel: '开发商',
    openDeveloper: '了解更多开发商信息',
    devStatTotal: (n: number) => `已建${n}栋别墅`,
    devStatReady: (n: number) => `${n}栋已交付`,
    devStatBuilding: (n: number) => `${n}栋在建`,
    videosTitleComplex: (n: string) => `视频：${n}`,
    videosTitleDev: (n: string) => `视频：${n}`,
    videosTitleDefault: '视频',
    otherVillas: (d: string) => `${d} 的其他别墅`,
    relatedHeading: '相关',
    related: {
      allVillas: '巴厘岛所有别墅和房屋',
      apartments: '巴厘岛公寓',
      complexes: '住宅区',
      developers: '巴厘岛开发商',
      villasIn: (d: string) => `${d} 的别墅`,
    },
    faqHeading: '常见问题',
    faq: (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
      { q: `${title} 多少钱？`,
        a: price ? `当前售价为 ${price}。最新价格始终显示在上方卡片中。` : '价格面议。请联系我们获取最新价格。' },
      { q: `${title} 位于哪里？`,
        a: district ? `该房产位于巴厘岛 ${district}。确切坐标见上方地图。` : '确切位置和坐标见上方地图。' },
      { q: '外国人可以在巴厘岛购买别墅吗？',
        a: '可以。交易通过租赁产权（长期土地租赁）在 PPAT 公证人处办理，或通过 PT PMA 公司进行。' },
      { q: '租赁产权期限是多久？',
        a: lease ? `基础期限为 ${lease} 年。请向开发商咨询续期条件。` : '请向开发商咨询租赁产权期限——通常为 25–80 年，可续期。' },
      { q: '别墅附带多大土地？',
        a: land != null ? `${land} m² 私人地块，含别墅。` : '地块面积面议——如有会显示在上方卡片中。' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? `，位于 ${district}` : ''}，巴厘岛${price ? `。价格 ${price}。` : '。'} 照片、面积、土地、文件。`,
  },
  nl: {
    home: 'Home', villasCrumb: 'Villa\'s',
    sqm: 'm²', house: 'huis', land: 'grond', bali: 'Bali',
    completed: 'Opgeleverd',
    factsHeading: 'Kerngegevens',
    aboutVillaHeading: 'Over de villa', aboutLandHeading: 'Grond',
    factBedrooms: 'Slaapkamers', factHouse: 'Woonoppervlak', factLand: 'Grond', factCompletion: 'Oplevering',
    factPermits: 'Bouwvergunning', factLeasehold: 'Pachtduur', factDistrict: 'Wijk',
    factAirport: 'Naar vliegveld', factStyle: 'Stijl', factPriceM2: 'Prijs per m²',
    factType: 'Type', factTypeVilla: 'Villa', factTypeVillaComplex: 'Villa in complex',
    factOwnership: 'Eigendomsrecht', factOwnershipLease: 'Erfpacht',
    factSeller: 'Verkoper', factSellerDev: 'Ontwikkelaar', factSellerResale: 'Doorverkoop',
    factPricePerYear: 'Jaarlijkse kosten',
    sidebarPriceNormal: 'Normale prijs voor dit gebied',
    sidebarSaveCompare: 'Bewaren & vergelijken',
    readMore: 'Meer',
    factLeaseValue: (l: string) => `${l} jaar`,
    descHeading: 'Beschrijving',
    complexLabel: 'Wooncomplex',
    completedShort: 'Opgeleverd',
    completion: (y: string) => `Oplevering ${y}`,
    units: (n: number) => `${n} units`,
    openComplex: 'Open complexpagina',
    sellingSeparately: 'Apart verkocht (geen deel van een complex)',
    developerLabel: 'Ontwikkelaar',
    openDeveloper: 'Meer over de ontwikkelaar',
    devStatTotal: (n: number) => `${n} villa's gebouwd`,
    devStatReady: (n: number) => `${n} opgeleverd`,
    devStatBuilding: (n: number) => `${n} in aanbouw`,
    videosTitleComplex: (n: string) => `Video\'s: ${n}`,
    videosTitleDev: (n: string) => `Video\'s: ${n}`,
    videosTitleDefault: 'Video\'s',
    otherVillas: (d: string) => `Andere villa\'s in ${d}`,
    relatedHeading: 'Gerelateerd',
    related: {
      allVillas: 'Alle villa\'s en huizen op Bali',
      apartments: 'Appartementen op Bali',
      complexes: 'Wooncomplexen',
      developers: 'Bali-ontwikkelaars',
      villasIn: (d: string) => `Villa\'s in ${d}`,
    },
    faqHeading: 'Veelgestelde vragen',
    faq: (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
      { q: `Hoeveel kost ${title}?`,
        a: price ? `De huidige vraagprijs is ${price}. De actuele prijs staat altijd in de kaart hierboven.` : 'Prijs op aanvraag. Neem contact op voor de actuele prijs.' },
      { q: `Waar ligt ${title}?`,
        a: district ? `Het object ligt in ${district}, Bali. Exacte coördinaten op de kaart hierboven.` : 'Exacte locatie en coördinaten op de kaart hierboven.' },
      { q: 'Kan een buitenlander een villa op Bali kopen?',
        a: 'Ja. De transactie verloopt via leasehold (langdurige grondpacht) bij een PPAT-notaris, of via een PT PMA-vennootschap.' },
      { q: 'Wat is de leaseholdtermijn?',
        a: lease ? `De basistermijn is ${lease} jaar. Vraag de ontwikkelaar naar verlengingsvoorwaarden.` : 'Vraag de ontwikkelaar naar de leaseholdtermijn — meestal 25–80 jaar met verlengingsopties.' },
      { q: 'Welke grond hoort bij de villa?',
        a: land != null ? `${land} m² eigen kavel bij de villa.` : 'Kavelgrootte op aanvraag — indien beschikbaar getoond in de kaart hierboven.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` in ${district}` : ''} op Bali${price ? `. Prijs ${price}.` : '.'} Foto\'s, oppervlakte, grond, documenten.`,
  },
  ban: {
    home: 'Beranda', villasCrumb: 'Vila',
    sqm: 'm²', house: 'umah', land: 'tanah', bali: 'Bali',
    completed: 'Puput',
    factsHeading: 'Fakta utama',
    aboutVillaHeading: 'Indik vila', aboutLandHeading: 'Tanah',
    factBedrooms: 'Kamar pules', factHouse: 'Wiyasan umah', factLand: 'Tanah', factCompletion: 'Serah terima',
    factPermits: 'Ijin bangun', factLeasehold: 'Masa sewa', factDistrict: 'Wewidangan',
    factAirport: 'Ka bandara', factStyle: 'Gaya', factPriceM2: 'Aji per m²',
    factType: 'Tipe', factTypeVilla: 'Vila', factTypeVillaComplex: 'Vila ring kompleks',
    factOwnership: 'Hak', factOwnershipLease: 'Hak sewa tanah',
    factSeller: 'Kadol olih', factSellerDev: 'Pengembang', factSellerResale: 'Jual malih',
    factPricePerYear: 'Biaya per tahun',
    sidebarPriceNormal: 'Aji biasa ring daerah niki',
    sidebarSaveCompare: 'Simpen & bandingang',
    readMore: 'Selengkapnya',
    factLeaseValue: (l: string) => `${l} warsa`,
    descHeading: 'Deskripsi',
    complexLabel: 'Kompleks',
    completedShort: 'Puput',
    completion: (y: string) => `Serah terima ${y}`,
    units: (n: number) => `${n} unit`,
    openComplex: 'Buka halaman kompleks',
    sellingSeparately: 'Kaadol pasah (nenten bagian saking kompleks)',
    developerLabel: 'Pangwangun',
    openDeveloper: 'Langkungan indik pangwangun',
    devStatTotal: (n: number) => `${n} vila kabangun`,
    devStatReady: (n: number) => `${n} sampun puput`,
    devStatBuilding: (n: number) => `${n} kantun kabangun`,
    videosTitleComplex: (n: string) => `Video: ${n}`,
    videosTitleDev: (n: string) => `Video: ${n}`,
    videosTitleDefault: 'Video',
    otherVillas: (d: string) => `Vila lianan ring ${d}`,
    relatedHeading: 'Sane pateh',
    related: {
      allVillas: 'Sami vila lan umah ring Bali',
      apartments: 'Apartemen ring Bali',
      complexes: 'Kompleks',
      developers: 'Pangwangun Bali',
      villasIn: (d: string) => `Vila ring ${d}`,
    },
    faqHeading: 'Patakon sane sering katakenang',
    faq: (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
      { q: `Aji ${title} kuda?`,
        a: price ? `Aji sane mangkin — ${price}. Aji anyar setata kacingak ring kartu baduur.` : 'Aji manut permintaan. Ngiring hubungin tiang anggen aji sane anyar.' },
      { q: `Ring dija genah ${title}?`,
        a: district ? `Properti puniki magenah ring ${district}, Bali. Koordinat sane pasti wenten ring peta baduur.` : 'Genah lan koordinat sane pasti wenten ring peta baduur.' },
      { q: 'Punapi warga dura negara dados numbas vila ring Bali?',
        a: 'Inggih. Transaksi kalaksanayang antuk skema hak sewa (leasehold, sewa tanah jangka panjang) ring notaris PPAT, utawi antuk pausahaan PT PMA.' },
      { q: 'Kuda suwe jangka waktu hak sewa?',
        a: lease ? `Jangka waktu dasar — ${lease} warsa. Takenang syarat perpanjangan ring pangwangun.` : 'Takenang jangka waktu hak sewa ring pangwangun — biasane 25–80 warsa madue opsi perpanjangan.' },
      { q: 'Kuda luas tanah sane nyarengin vila?',
        a: land != null ? `${land} m² tanah pribadi sareng vila.` : 'Luas tanah manut permintaan — kacingak ring kartu baduur yening wenten.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` ring ${district}` : ''} ring Bali${price ? `. Aji ${price}.` : '.'} Foto, luas, tanah, dokumen.`,
  },
  pl: {
    home: 'Strona główna', villasCrumb: 'Wille',
    sqm: 'm²', house: 'dom', land: 'działka', bali: 'Bali',
    completed: 'Ukończony',
    factsHeading: 'Parametry',
    aboutVillaHeading: 'O willi', aboutLandHeading: 'Działka',
    factBedrooms: 'Sypialnie', factHouse: 'Powierzchnia domu', factLand: 'Działka', factCompletion: 'Oddanie',
    factPermits: 'Pozwolenie na budowę', factLeasehold: 'Okres dzierżawy', factDistrict: 'Dzielnica',
    factAirport: 'Do lotniska', factStyle: 'Styl', factPriceM2: 'Cena za m²',
    factType: 'Typ', factTypeVilla: 'Willa', factTypeVillaComplex: 'Willa w kompleksie',
    factOwnership: 'Prawo', factOwnershipLease: 'Dzierżawa gruntu',
    factSeller: 'Sprzedaje', factSellerDev: 'Deweloper', factSellerResale: 'Odsprzedaż',
    factPricePerYear: 'Roczny koszt posiadania',
    sidebarPriceNormal: 'Normalna cena w okolicy',
    sidebarSaveCompare: 'Zapisz i porównaj',
    readMore: 'Więcej',
    factLeaseValue: (l: string) => `${l} lat`,
    descHeading: 'Opis',
    complexLabel: 'Kompleks mieszkaniowy',
    completedShort: 'Ukończony',
    completion: (y: string) => `Oddanie ${y}`,
    units: (n: number) => `${n} lokali`,
    openComplex: 'Otwórz stronę kompleksu',
    sellingSeparately: 'Sprzedawana oddzielnie (poza kompleksem)',
    developerLabel: 'Deweloper',
    openDeveloper: 'Więcej o deweloperze',
    devStatTotal: (n: number) => `${n} willi wybudowanych`,
    devStatReady: (n: number) => `${n} oddanych`,
    devStatBuilding: (n: number) => `${n} w budowie`,
    videosTitleComplex: (n: string) => `Filmy: ${n}`,
    videosTitleDev: (n: string) => `Filmy: ${n}`,
    videosTitleDefault: 'Filmy',
    otherVillas: (d: string) => `Inne wille w ${d}`,
    relatedHeading: 'Powiązane',
    related: {
      allVillas: 'Wszystkie wille i domy na Bali',
      apartments: 'Apartamenty na Bali',
      complexes: 'Kompleksy mieszkaniowe',
      developers: 'Deweloperzy na Bali',
      villasIn: (d: string) => `Wille w ${d}`,
    },
    faqHeading: 'Najczęściej zadawane pytania',
    faq: (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
      { q: `Ile kosztuje ${title}?`,
        a: price ? `Aktualna cena ofertowa to ${price}. Bieżąca cena jest zawsze pokazana w karcie powyżej.` : 'Cena na zapytanie. Skontaktuj się z nami, aby poznać aktualną cenę.' },
      { q: `Gdzie znajduje się ${title}?`,
        a: district ? `Nieruchomość znajduje się w ${district}, Bali. Dokładne współrzędne na mapie powyżej.` : 'Dokładna lokalizacja i współrzędne na mapie powyżej.' },
      { q: 'Czy obcokrajowiec może kupić willę na Bali?',
        a: 'Tak. Transakcja odbywa się w ramach leasehold (długoterminowa dzierżawa gruntu) u notariusza PPAT lub poprzez spółkę PT PMA.' },
      { q: 'Jaki jest okres leasehold?',
        a: lease ? `Podstawowy okres to ${lease} lat. Sprawdź warunki przedłużenia u dewelopera.` : 'Sprawdź okres leasehold u dewelopera — zazwyczaj 25–80 lat z opcją przedłużenia.' },
      { q: 'Jaka działka należy do willi?',
        a: land != null ? `${land} m² prywatnej działki przy willi.` : 'Powierzchnia działki na zapytanie — pokazana w karcie powyżej, gdy jest dostępna.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` w ${district}` : ''} na Bali${price ? `. Cena ${price}.` : '.'} Zdjęcia, układ, działka, dokumenty.`,
  },
  uk: {
    home: 'Головна', villasCrumb: 'Вілли',
    sqm: 'м²', house: 'будинок', land: 'ділянка', bali: 'Балі',
    completed: 'Зданий',
    factsHeading: 'Характеристики',
    aboutVillaHeading: 'Про віллу', aboutLandHeading: 'Ділянка',
    factBedrooms: 'Спальні', factHouse: 'Площа будинку', factLand: 'Ділянка', factCompletion: 'Здача',
    factPermits: 'Дозвіл на будівництво', factLeasehold: 'Термін оренди', factDistrict: 'Район',
    factAirport: 'До аеропорту', factStyle: 'Стиль', factPriceM2: 'Ціна за м²',
    factType: 'Тип', factTypeVilla: 'Вілла', factTypeVillaComplex: 'Вілла в комплексі',
    factOwnership: 'Право', factOwnershipLease: 'Оренда землі (лізхолд)',
    factSeller: 'Продає', factSellerDev: 'Забудовник', factSellerResale: 'Перепродаж',
    factPricePerYear: 'Рік володіння обходиться',
    sidebarPriceNormal: 'Звичайна ціна для району',
    sidebarSaveCompare: 'Зберегти та порівняти',
    readMore: 'Докладніше',
    factLeaseValue: (l: string) => `${l} років`,
    descHeading: 'Опис',
    complexLabel: 'Житловий комплекс',
    completedShort: 'Зданий',
    completion: (y: string) => `Здача ${y}`,
    units: (n: number) => `${n} юнітів`,
    openComplex: 'Відкрити сторінку комплексу',
    sellingSeparately: 'Продається окремо (поза комплексом)',
    developerLabel: 'Забудовник',
    openDeveloper: 'Детальніше про забудовника',
    devStatTotal: (n: number) => `${n} вілл збудовано`,
    devStatReady: (n: number) => `${n} здано`,
    devStatBuilding: (n: number) => `${n} будується`,
    videosTitleComplex: (n: string) => `Відео: ${n}`,
    videosTitleDev: (n: string) => `Відео: ${n}`,
    videosTitleDefault: 'Відео',
    otherVillas: (d: string) => `Інші вілли в ${d}`,
    relatedHeading: 'Схоже',
    related: {
      allVillas: 'Усі вілли та будинки Балі',
      apartments: 'Апартаменти на Балі',
      complexes: 'Житлові комплекси',
      developers: 'Забудовники Балі',
      villasIn: (d: string) => `Вілли в ${d}`,
    },
    faqHeading: 'Часті запитання',
    faq: (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
      { q: `Скільки коштує ${title}?`,
        a: price ? `Поточна ціна пропозиції — ${price}. Актуальна ціна завжди показана в картці вище.` : `Ціна за запитом. Зв’яжіться з нами, щоб дізнатися актуальну ціну.` },
      { q: `Де розташований ${title}?`,
        a: district ? `Об’єкт розташований у ${district}, Балі. Точні координати на карті вище.` : 'Точне розташування та координати на карті вище.' },
      { q: 'Чи може іноземець купити віллу на Балі?',
        a: 'Так. Угода укладається за схемою leasehold (довгострокова оренда землі) у нотаріуса PPAT або через компанію PT PMA.' },
      { q: 'Який термін leasehold?',
        a: lease ? `Базовий термін — ${lease} років. Уточніть умови продовження у забудовника.` : 'Уточніть термін leasehold у забудовника — зазвичай 25–80 років з можливістю продовження.' },
      { q: 'Яка ділянка йде разом з віллою?',
        a: land != null ? `${land} м² приватної ділянки разом з віллою.` : 'Площа ділянки за запитом — показана в картці вище, якщо доступна.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` у ${district}` : ''} на Балі${price ? `. Ціна ${price}.` : '.'} Фото, планування, ділянка, документи.`,
  },
} as const

// Localized "in <district>" connective for the fallback meta title (used
// when the composed seoTitle exceeds ~70 chars). zh drops the preposition;
// RU keeps the leading-space "в" form so the RU title stays byte-identical.
const VILLA_META_IN_DISTRICT: Record<Lang, (d: string) => string> = {
  ru: d => ` в ${d}`, en: d => ` in ${d}`, id: d => ` di ${d}`,
  fr: d => ` à ${d}`, de: d => ` in ${d}`, zh: d => ` ${d}`,
  nl: d => ` in ${d}`, ban: d => ` ring ${d}`,
  pl: d => ` w ${d}`, uk: d => ` у ${d}`,
}

// Native-language fallback for the Product schema description (only reached
// when the row has no SEO Text at all). Replaces the old
// `lang === 'ru' ? RU : EN` ternary so /id, /fr, /de, /zh, /nl, /ban never
// leak English into structured data.
const VILLA_PRODUCT_DESC: Record<Lang, (bedrooms: number | null, district: string | null) => string> = {
  ru: (b, d) => `${b ? `${b}-комнатная ` : ''}вилла${d ? ` в ${d}` : ''} на Бали, Индонезия`,
  en: (b, d) => `${b ? `${b}-bedroom ` : ''}villa${d ? ` in ${d}` : ''}, Bali, Indonesia`,
  id: (b, d) => `Vila${b ? ` ${b} kamar tidur` : ''}${d ? ` di ${d}` : ''}, Bali, Indonesia`,
  fr: (b, d) => `Villa${b ? ` de ${b} chambres` : ''}${d ? ` à ${d}` : ''}, Bali, Indonésie`,
  de: (b, d) => `${b ? `${b}-Zimmer-` : ''}Villa${d ? ` in ${d}` : ''}, Bali, Indonesien`,
  zh: (b, d) => `${d ? `${d}` : ''}${b ? `${b}居室` : ''}别墅，印度尼西亚巴厘岛`,
  nl: (b, d) => `${b ? `${b}-slaapkamer ` : ''}villa${d ? ` in ${d}` : ''}, Bali, Indonesië`,
  ban: (b, d) => `Vila${b ? ` ${b} kamar pules` : ''}${d ? ` ring ${d}` : ''}, Bali, Indonesia`,
  pl: (b, d) => `Willa${b ? ` z ${b} sypialniami` : ''}${d ? ` w ${d}` : ''}, Bali, Indonezja`,
  uk: (b, d) => `Вілла${b ? ` з ${b} спальнями` : ''}${d ? ` у ${d}` : ''}, Балі, Індонезія`,
}

export const revalidate = 604800
export function generateStaticParams() { return [] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const COMPLEX_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

type Row = { airtable_id: string; data: Record<string, unknown> }

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
  if (Array.isArray(v) && v.length > 0) return numberOrNull(v[0])
  if (v && typeof v === 'object' && 'value' in v) return numberOrNull((v as { value: unknown }).value)
  return null
}
function parseGeo(v: unknown): number | null {
  return numberOrNull(v)
}
function fmtUsd(n: number | null, lang: Lang = 'ru'): string | null {
  if (n == null) return null
  // «869 800 $» reads right in Russian; English-style «$869,800» elsewhere.
  if (lang !== 'ru' && lang !== 'uk') return '$' + Math.round(n).toLocaleString('en-US')
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' $'
}

// Slug index loaded from Storage manifest (built by scripts/sync-detail-indexes.mjs).
// Avoids the 21MB raw_villas query that hits Postgres statement timeout.
type IndexEntry = { id: string; slug: string; district: string | null; aliases?: string[] }
const INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/feeds/_villas-index.json`
const INDEX_TTL_MS = 30 * 60 * 1000
let _lastGoodIndex: IndexEntry[] = []

// Wrapped in revisionedCache so an admin edit (which rewrites the index file)
// is picked up within seconds instead of waiting out the 30-min TTL.
const _loadVillaIndex = revisionedCache(['villas'], INDEX_TTL_MS, async (): Promise<IndexEntry[]> => {
  try {
    const r = await fetch(INDEX_URL, { next: { revalidate: 604800, tags: ['content:villas'] } })
    if (!r.ok) throw new Error(`villa index: ${r.status}`)
    const j = await r.json() as { items: IndexEntry[] }
    const items = j.items ?? []
    if (!items.length) throw new Error('villa index: empty')
    _lastGoodIndex = items
    return items
  } catch (e) {
    // Пустой список нельзя отдавать в кэш: после неудачной загрузки на холодном
    // старте все виллы полчаса открывались как 404. Бросаем — кэш не запишется,
    // следующий запрос попробует снова.
    if (_lastGoodIndex.length) return _lastGoodIndex
    throw e
  }
})

const _byIdCache = new Map<string, { ts: number; rev: number; row: Row | null }>()
const BY_ID_TTL_MS = 5 * 60 * 1000
async function _loadVillaById(id: string): Promise<Row | null> {
  const rev = await contentRev('villas')
  const cached = _byIdCache.get(id)
  if (cached && cached.rev === rev && Date.now() - cached.ts < BY_ID_TTL_MS) return cached.row
  const [{ data, error }, enCache] = await Promise.all([
    sb.from('raw_villas').select('airtable_id, data').eq('airtable_id', id).maybeSingle(),
    loadAllTranslations('villas'),
  ])
  // Сбой базы — не «виллы нет»: бросаем (5xx, ISR оставит прошлую версию),
  // иначе живая вилла отдавала 404 и это ещё и кэшировалось.
  if (error) throw new Error(`raw_villas ${id}: ${error.message}`)
  const raw = (data as Row | null) ?? null
  // Merge cached EN translations into the row's data so tField('SEO Text', 'en')
  // sees the translated value instead of the Airtable AI-error placeholder.
  // The detail page never hits loadAllVillas — its own _loadVillaById is the
  // only Supabase read path, so the merge has to happen here too.
  const row: Row | null = raw
    ? { ...raw, data: mergeAllTranslations(raw.data, raw.airtable_id, enCache) }
    : null
  _byIdCache.set(id, { ts: Date.now(), rev, row })
  return row
}

// revisionedCache: правка фото в админке бампает ревизию `villas`, иначе
// манифест жил в памяти инстанса до получаса и свежая вилла рисовалась
// с плейсхолдером вместо обложки.
const _loadManifestCached = revisionedCache(['villas'], 30 * 60 * 1000, async (): Promise<Record<string, string[]>> => {
  const r = await fetch(cdnManifestUrl(PHOTO_MANIFEST_URL, 600), { next: { revalidate: 604800, tags: ['content:villas'] } })
  if (!r.ok) throw new Error(`villa manifest: ${r.status}`)
  return (await r.json()) as Record<string, string[]>
})
// Бросаем внутри и ловим здесь: иначе сетевой сбой кэшировался бы пустым
// манифестом на весь TTL и страница на полчаса осталась бы без фото.
async function _loadManifest(): Promise<Record<string, string[]>> {
  try { return await _loadManifestCached() } catch { return {} }
}

async function resolveVilla(urlSlug: string): Promise<{ row: Row; canonicalSlug: string } | null> {
  // Индекс не загрузился (и прошлой копии нет) — это сбой, а не 404.
  const idx = await _loadVillaIndex().catch((e: unknown) => {
    console.error('[villa]', e instanceof Error ? e.message : e)
    throw e
  })
  let entry = idx.find(e => e.slug === urlSlug)
  if (!entry) {
    const normalised = normalizeSlug(urlSlug)
    entry = idx.find(e => e.slug === normalised) || idx.find(e => e.aliases?.includes(urlSlug))
  }
  if (!entry) return null
  const row = await _loadVillaById(entry.id)
  if (!row) return null
  return { row, canonicalSlug: entry.slug }
}

async function loadVillaBySlug(slug: string): Promise<Row | null> {
  const r = await resolveVilla(slug)
  return r?.row ?? null
}

// === Parent complex + developer lookups ===

type ComplexLite = {
  id: string
  slug: string
  name: string
  district: string | null
  types: string[]
  year: string | null
  units: number | null
  status: string | null
  coverUrl: string | null
}

// Defensive: throw on PG error or empty result so the cache slot
// never gets poisoned with [] for the next hour. Bumped key v2 to
// drop the existing slot at deploy.
// JSON-projection: вместо `data` целиком (~75кб/строка) тянем только
// нужные поля (~250б/строка → -99% egress). Поля с пробелами и
// кириллицей оборачиваем в "..." — PostgREST это понимает.
type ComplexSlimRow = {
  airtable_id: string
  slug: string | null
  cover_url: string | null
  name: string | null
  district_alt: string | null
  district: string | null
  types: unknown
  year: string | null
  year_trail: string | null
  units: number | null
  status: string | null
}
const _loadComplexesIndex = unstable_cache(
  async (): Promise<ComplexLite[]> => {
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
    `).limit(500)
    if (error) throw new Error(`raw_complexes: ${error.message}`)
    const rows = (data ?? []) as ComplexSlimRow[]
    if (rows.length === 0) throw new Error('raw_complexes returned 0 rows — refusing to cache empty')
    // raw_complexes.cover_url указывает на мёртвый путь complex-covers/* (404).
    // Берём первое фото из синк-манифеста complex-photos (как ComplexCard),
    // cover_url оставляем fallback'ом.
    let complexPhotos: Record<string, string[]> = {}
    try {
      const r = await fetch(cdnManifestUrl(COMPLEX_PHOTO_MANIFEST_URL, 600), { next: { revalidate: 604800, tags: ['content:complexes'] } })
      if (r.ok) complexPhotos = await r.json()
    } catch { /* fallback to cover_url below */ }
    const out: ComplexLite[] = []
    for (const c of rows) {
      if (!c.name || !c.slug) continue
      const types = Array.isArray(c.types) ? (c.types as unknown[]).map(x => String(x)) : []
      out.push({
        id: c.airtable_id,
        slug: c.slug,
        name: c.name,
        district: c.district ?? c.district_alt,
        types,
        year: c.year_trail ?? c.year,
        units: c.units,
        status: c.status,
        coverUrl: complexPhotos[c.airtable_id]?.[0] ?? c.cover_url,
      })
    }
    return out
  },
  ['villy-complex-index-v5'],
  { revalidate: 604800, tags: ['content:complexes'] },
)

function findParentComplex(villaTitle: string, complexes: ComplexLite[], complexName?: string | null): ComplexLite | null {
  // The «Комплекс 1» field is what the complex page lists its units by, so
  // trust it first — the title match below misses or mislinks units whose
  // title doesn't spell the complex name.
  const want = complexName?.trim().toLowerCase()
  if (want) {
    const exact = complexes.find(c => c.name.trim().toLowerCase() === want)
    if (exact) return exact
  }
  const lower = villaTitle.toLowerCase()
  let best: { c: ComplexLite; len: number } | null = null
  for (const c of complexes) {
    const n = c.name.toLowerCase()
    if (n.length < 4) continue
    if (lower.includes(n)) {
      if (!best || n.length > best.len) best = { c, len: n.length }
    }
  }
  return best?.c ?? null
}

type DeveloperLite = {
  slug: string
  name: string
  logoUrl: string | null
  highlights: string[]
}

type DeveloperSlimRow = {
  airtable_id: string
  logo_url: string | null
  published: boolean | null
  name: string | null
  slug: string | null
  reputation: string | null
  construction: string | null
}
const _loadDevelopersIndex = (lang: Lang) => unstable_cache(
  async (): Promise<DeveloperLite[]> => {
    const [{ data, error }, tr] = await Promise.all([
      sb.from('raw_developers').select(`
        airtable_id, logo_url,
        published:data->"Публикация",
        name:data->Developer,
        slug:data->"SEO:Slug",
        reputation:data->"Репутация и опыт",
        construction:data->"Строительство и недвижимость"
      `).limit(1000),
      loadTranslations('developers', lang),
    ])
    if (error) throw new Error(`raw_developers: ${error.message}`)
    const rows = (data ?? []) as DeveloperSlimRow[]
    if (rows.length === 0) throw new Error('raw_developers returned 0 rows — refusing to cache empty')
    const out: DeveloperLite[] = []
    for (const r of rows) {
      if (r.published !== true) continue
      if (!r.name || !r.slug) continue
      // For non-RU, prefer the translated reputation/construction text from
      // the developers translation cache; fall back to the RU source.
      const trf = tr[r.airtable_id] ?? {}
      const sourceText = (lang !== 'ru'
        ? (trf['Репутация и опыт'] ?? trf['Строительство и недвижимость'])
        : null) ?? r.reputation ?? r.construction ?? ''
      const rawHighlights = sourceText
        .split('\n')
        .map(l => l.replace(/^[\s•\-–—·]+/, '').trim())
        .filter(Boolean)
      // Drop AI meta-commentary junk before slicing so we keep up to 3 real
      // bullets (cleanDeveloperBullets also de-Cyrillics off RU).
      const highlights = cleanDeveloperBullets(rawHighlights, lang).slice(0, 3)
      out.push({ slug: r.slug, name: r.name, logoUrl: r.logo_url, highlights })
    }
    return out
  },
  ['villy-developers-index-v6', lang],
  { revalidate: 604800, tags: ['content:developers'] },
)()

function findDeveloperByName(targetName: string | null, list: DeveloperLite[]): DeveloperLite | null {
  if (!targetName) return null
  const t = targetName.toLowerCase().trim()
  // exact match first, then includes
  return list.find(d => d.name.toLowerCase() === t)
    ?? list.find(d => d.name.toLowerCase().includes(t) || t.includes(d.name.toLowerCase()))
    ?? null
}

// Виллы каталога для «Что продаётся рядом»: только чужие застройщики —
// владелец хочет видеть конкурентов (23.10.2026). Каталог уже в кэше страниц.
async function loadCatalogSales(exceptId: string, developer: string | null, lang: Lang): Promise<CatalogSale[]> {
  const { enriched, manifest } = await loadVillaCatalog().catch(() => ({ enriched: [], manifest: {} as Record<string, string[]> }))
  const dev = developer?.toLowerCase().trim() ?? null
  const out: CatalogSale[] = []
  for (const e of enriched) {
    if (e.id === exceptId || !e.slug || e.lat == null || e.lng == null || !e.priceUsd) continue
    if (dev && e.developerName?.toLowerCase().trim() === dev) continue
    const beds = e.bedrooms && /^\d+$/.test(e.bedrooms.trim()) ? Number(e.bedrooms.trim()) : null
    if (beds == null) continue
    const lease = firstString(e.data['Leasehold']) ?? firstString(e.data['Leashold'])
    out.push({
      lat: e.lat, lng: e.lng, bedrooms: beds, priceUsd: e.priceUsd,
      buildingM2: e.area, landM2: e.land,
      leaseYears: lease && /^\d+(\.\d+)?$/.test(lease.trim()) ? Number(lease.trim()) : null,
      url: switchLangPath(`/ru/villy/o/${e.slug}`, lang),
      photo: manifest[e.id]?.[0] ?? null,
      district: e.district,
      name: firstString(e.data['Комплекс 1']) ?? e.developerName,
    })
  }
  return out
}

async function loadOtherVillasInDistrict(district: string | null, exceptId: string, lang: Lang = 'ru') {
  if (!district) return []
  const [idx, manifest] = await Promise.all([_loadVillaIndex(), _loadManifest()])
  const candidates = idx.filter(e => e.id !== exceptId && e.district === district).slice(0, 4)
  const rows = await Promise.all(candidates.map(c => _loadVillaById(c.id)))
  const out: (VillaCardData & { id: string })[] = []
  for (const r of rows) {
    if (!r) continue
    const slug = firstString(r.data['SEO:Slug'])
    if (!slug) continue
    // tField returns EN if available (or RU fallback after the i18n.ts fix).
    // Without this the EN villa detail page was rendering Russian card
    // titles in the "Other villas in <district>" rail.
    const title = resolveListingTitle({
      kind: 'villa',
      candidates: [tField(r.data, 'SEO:Title', lang), tField(r.data, 'ИИ Имя', lang)],
      district: firstString(r.data['Location 2']) ?? firstString(r.data['Location']),
      area: numberOrNull(r.data['Площадь']),
      bedrooms: firstString(r.data['Комнаты']),
      lang,
    })
    out.push({
      id: r.airtable_id,
      slug,
      title,
      priceUsd: numberOrNull(r.data['price'] ?? r.data['Цена']),
      bedrooms: numberOrNull(r.data['Комнаты']),
      area: numberOrNull(r.data['Площадь']),
      land: numberOrNull(r.data['Земля']),
      district: firstString(r.data['Location 2']) ?? firstString(r.data['Location']),
      status: firstString(r.data['Статус']),
      photos: manifest[r.airtable_id] ?? [],
    })
  }
  return out
}

export async function generateVillaMetadata(slug: string, lang: Lang) {
  const v = await loadVillaBySlug(slug)
  if (!v) return { robots: { index: false } }
  const d = v.data
  const c = pickCopy(COPY, lang)
  // Сгенерированная копия (scripts/kb-text-regen.mjs) написана по-русски —
  // на остальных локалях остаётся прежний источник, иначе в мету уедет
  // кириллица.
  const gen = lang === 'ru' ? await loadListingCopy('villa', v.airtable_id) : null
  // Never let a formula-broken «Вилла  в  -  м²,  спальни» reach the <title>
  // tag or the OG card — resolveListingTitle skips those and composes from
  // the structured fields instead (lib/listing-title.ts).
  const title = resolveListingTitle({
    kind: 'villa',
    candidates: [gen?.title, tField(d, 'SEO:Title', lang), tField(d, 'ИИ Имя', lang)],
    district: firstString(d['Location 2']) ?? firstString(d['Location']),
    area: numberOrNull(d['Площадь']),
    bedrooms: firstString(d['Комнаты']),
    lang,
  })
  const seoTextRaw = tField(d, 'SEO Text', lang) ?? tField(d, 'Notes', lang)
  // A bad AI translation may have stored Russian into `SEO Text EN` (or the
  // suffix is missing and tField returns the raw RU). Never emit Cyrillic on a
  // non-RU page — transliterate to Latin as a last resort.
  const seoText = lang !== 'ru' && lang !== 'uk' && seoTextRaw && hasCyrillic(seoTextRaw) ? translitPreserveCase(seoTextRaw) : seoTextRaw
  const districtRaw = firstString(d['Location 2']) ?? firstString(d['Location'])
  // Display surface for RU uses the Cyrillic district form to match
  // the AI-generated H1 / SEO text. Raw Latin name is still used for
  // canonical-path matching and Schema.org address fields.
  const district = lang === 'ru' ? districtRu(districtRaw) : districtRaw
  const price = fmtUsd(numberOrNull(d['price'] ?? d['Цена']), lang)
  const description = gen?.meta
    ? metaSnippet(gen.meta)
    : seoText
      ? metaSnippet(seoText)
      : c.metaFallback(title, district, price)
  const bedrooms = numberOrNull(d['Комнаты'])
  const area = numberOrNull(d['Площадь'])
  // Compose the meta title from the AI title + a few facts. The AI
  // title often already mentions the district, bedrooms or area —
  // appending them blindly produces dupes like "… в Nyanyi · Nyanyi"
  // and pushes the string past Google's ~60-char cutoff. Drop any
  // part that already appears (case-insensitive) in the title.
  const titleLower = title.toLowerCase()
  const titleParts = [title]
  if (district && !titleLower.includes(district.toLowerCase())) titleParts.push(district)
  if (bedrooms != null && !titleLower.includes(`${bedrooms} br`) && !titleLower.includes(`${bedrooms} спальн`)) titleParts.push(`${bedrooms} BR`)
  if (area != null && !titleLower.includes(`${area} ${c.sqm}`) && !titleLower.includes(`${area}m²`)) titleParts.push(`${area} ${c.sqm}`)
  if (price && !titleLower.includes(price.toLowerCase())) titleParts.push(price)
  // Сгенерированный заголовок уже собран под SEO — с типом объекта, районом
  // и в пределах 60 символов. Дописывать к нему факты нельзя: район в данных
  // и в тексте пишется по-разному («Нянь» против «Ньяньи»), дедуп их не
  // сопоставляет и получается дубль с обрезкой.
  const seoTitle = gen?.title ? `${gen.title} | Balinsky` : `${titleParts.slice(0, 4).join(' · ')} | Balinsky`
  const ruPath = `/ru/villy/o/${slug}`
  const path = switchLangPath(ruPath, lang)
  const dashPrice = price ? ` — ${price}` : ''
  // Same dedup as titleParts above — the AI base title usually already
  // contains the district, so only append it when it's genuinely missing
  // (otherwise we get "… в Bukit … в Bukit"). Connective localized per lang
  // (VILLA_META_IN_DISTRICT) so /de, /zh, /nl, /ban never emit "in".
  const fallbackDistrict = !gen && district && !titleLower.includes(district.toLowerCase()) ? VILLA_META_IN_DISTRICT[lang](district) : ''
  // A handful of published rows carry no district, no area and no bedroom
  // count — nothing a search result could usefully say. They stay live (that
  // inventory call belongs to the editor, not to SEO) but drop out of the
  // index instead of sitting there as dead ends.
  const isDataless = !districtRaw
    && numberOrNull(d['Площадь']) == null
    && firstString(d['Комнаты']) == null

  return {
    title: seoTitle.length > 70 ? `${title}${fallbackDistrict}${dashPrice} | Balinsky` : seoTitle,
    description,
    ...(isDataless ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: path,
      languages: hreflangMap(ruPath),
    },
    openGraph: { title, description, type: 'website' as const, url: `${SITE_URL}${path}` },
  }
}

export async function VillaDetail({ slug, lang, pdf, analyticsOnly = false }: { slug: string; lang: Lang; pdf?: PdfRequest; analyticsOnly?: boolean }) {
  const c = pickCopy(COPY, lang)
  // Canonical-slug redirect: legacy GSC links carry dirty slugs
  // (cyrillic look-alikes, parens). resolveVilla finds either form
  // and tells us the canonical; we 301 if URL doesn't match.
  const resolved = await resolveVilla(slug)
  if (!resolved) notFound()
  if (resolved.canonicalSlug !== slug) {
    const path = switchLangPath(`/ru/villy/o/${resolved.canonicalSlug}`, lang)
    permanentRedirect(path)
  }
  const v = resolved.row
  // Реестр по каноническому slug: у большинства вилл модели нет и секция не рендерится.
  const plan3dUrl = getVilla3DPlanUrl(resolved.canonicalSlug)

  const d = v.data
  const manifest = await _loadManifest()

  const title = resolveListingTitle({
    kind: 'villa',
    candidates: [tField(d, 'ИИ Имя', lang), tField(d, 'SEO:Title', lang)],
    district: firstString(d['Location 2']) ?? firstString(d['Location']),
    area: numberOrNull(d['Площадь']),
    bedrooms: firstString(d['Комнаты']),
    lang,
  })
  // Фото-аудит применяется ДО нарезки: иначе выбранная обложка может
  // не попасть в первые 12 кадров. alt-подписи переставляются вместе
  // с фото — они позиционные.
  const visionRaw = await loadListingVision('villa', v.airtable_id)
  const curated = curatePhotos(manifest[v.airtable_id] ?? [], visionRaw)
  const photos = curated.photos.slice(0, 12)
  // Генплан комплекса с подсвеченной этой виллой — вкладка «Генплан» в
  // галерее (владелец 2026-11-10). Только если шахматка комплекса ведёт на
  // эту страницу.
  let masterplanCover: string | null = null
  // Медиа комплекса для ряда «фишек» под фото: 3D-тур, солнце и 3D-карта.
  const promoKit = await loadPromoKit(firstString(d['Комплекс']))
  const complexMedia = await loadComplexMedia(firstString(d['Комплекс']), firstString(d['Комплекс 1'])).catch(() => ({ id: null, slug: null, tourUrl: null, data: null }))
  const docsForTile = complexDocs(complexMedia.slug)
  // Рассрочка комплекса («Payment plan,%»): «30%+20%+20%+20%+10%» ->
  // «30 / 20 / 20 / 20 / 10%», хвост «/12» - число месяцев, «100%» - без рассрочки.
  const paymentPlanText = (() => {
    const raw = (firstString(complexMedia.data?.['Payment plan,%']) ?? '').replace(/\s+/g, ' ').trim()
    if (!raw || raw.includes('...')) return null
    const ru = lang === 'ru' || lang === 'uk'
    if (/^100\s*%?$/.test(raw)) return ru ? 'нет, 100% сразу' : 'no, 100% upfront'
    const m = raw.match(/^(.*?)\s*\/\s*(\d+)$/)
    const parts = (m ? m[1] : raw).split('+').map(x => x.replace(/[^\d.]/g, '')).filter(Boolean)
    if (parts.length < 2) return null
    return `${parts.join(' / ')}%${m ? (ru ? ` · на ${m[2]} мес.` : ` · over ${m[2]} mo.`) : ''}`
  })()
  // Зоны плана застройки вокруг (scripts/rdtr_zones.py): карточка в колонке
  // «Участок» и вкладка «Зоны» в окне медиаблока.
  const rdtrHit = await loadRdtr(v.airtable_id, complexMedia.slug)
  const rdtr: RdtrData | null = rdtrHit?.data ?? null
  const rdtrRows = rdtr ? zoneRows(rdtr, lang) : []
  const rdtrAround = (() => {
    const b = rdtrRows.find(r => r.group === 'build')
    const n = rdtrRows.find(r => r.group === 'nobuild')
    const parts = [b ? `${pctText(b.share)} ${b.label.toLowerCase()}` : null, n ? `${pctText(n.share)} ${n.label.toLowerCase()}` : null].filter(Boolean)
    return parts.length ? parts.join(', ') : null
  })()
  const sunPlan = complexMedia.slug ? getSitePlan(complexMedia.slug) : null
  // Юридическая проверка комплекса (документы застройщика) — тот же блок, что
  // на странице ЖК, и так же только в Pro (bx-auth-block).
  const cd = complexMedia.data ?? {}
  const villaLegal = complexMedia.id
    ? await loadComplexAudit(complexMedia.id, lang, firstString(cd[LEGAL_OK_FIELD]), null, firstString(cd[LEGAL_BALANCE_NOTES_FIELD])).catch(() => null)
    : null
  const villaLegalQuestions = parseAuditItems(firstString(cd[LEGAL_QUESTIONS_FIELD])).length
  const villaLegalBalance = parseBalance(firstString(cd[LEGAL_BALANCE_FIELD]))
  const sunSettings = sunPlan && complexMedia.slug ? await loadSunSettings(complexMedia.slug).catch(() => null) : null
  // Солнце и ветер, 3D-карта и документы — вкладки окна медиаблока, как фото
  // и планировки (решение владельца 2026-11-11).
  const buildViewerTabs = (wind: Wind | null): ViewerTab[] => {
    const tabs: ViewerTab[] = []
    const en = lang !== 'ru'
    if (sunPlan && sunSettings?.enabled) {
      tabs.push({
        key: 'sun',
        label: en ? 'Sun & wind' : 'Солнце и ветер',
        icon: <Sun size={18} aria-hidden />,
        cover: photos[2] ?? photos[0] ?? null,
        bleed: true,
        content: (
          <SunShadowBlock
            inline
            wind={wind}
            plan={sunPlan}
            latitude={sunSettings.latitude}
            longitude={sunSettings.longitude}
            placement={{
              rowAzimuth: sunSettings.rowAzimuth,
              modelScale: sunSettings.modelScale,
              offsetX: sunSettings.offsetX,
              offsetZ: sunSettings.offsetZ,
              basemapOffsetX: sunSettings.basemapOffsetX,
              basemapOffsetZ: sunSettings.basemapOffsetZ,
              basemapScale: sunSettings.basemapScale,
            }}
            heights={{ eaveHeight: sunSettings.eaveHeight, ridgeRise: sunSettings.ridgeRise, yardWall: sunSettings.yardWall }}
            title={sunPlan.title}
            en={en}
          />
        ),
      })
      if (sunPlan.google3d && process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
        tabs.push({
          key: 'map3d',
          label: en ? '3D map' : '3D-карта',
          icon: <Globe size={18} aria-hidden />,
          cover: sunPlan.basemap?.url ?? null,
          bleed: true,
          content: (
            <Google3DMapBlock
              inline
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}
              view={sunPlan.google3d}
              title={sunPlan.title}
              en={en}
            />
          ),
        })
      }
    }
    if (rdtr && rdtrHit) {
      tabs.push({
        key: 'zones',
        label: pickCopy({ ru: 'Зоны', en: 'Zoning', id: 'Zonasi', fr: 'Zonage', de: 'Zonen', zh: '规划分区', nl: 'Bestemming', ban: 'Zonasi', pl: 'Strefy', uk: 'Зони' }, lang),
        icon: <Layers size={18} aria-hidden />,
        hideTile: true,
        bleed: true,
        content: <ZoningMap slug={rdtrHit.key} plotOverride={rdtr.plot} lang={lang} ver={`${rdtr.fetchedAt ?? ''}-${rdtr.radius}`} />,
      })
    }
    if (docsForTile) {
      tabs.push({
        key: 'docs',
        label: pickCopy({ ru: 'Документы', en: 'Documents', id: 'Dokumen', fr: 'Documents', de: 'Dokumente', zh: '文件', nl: 'Documenten', ban: 'Dokumen', pl: 'Dokumenty', uk: 'Документи' }, lang),
        icon: <FileText size={18} aria-hidden />,
        cover: photos[3] ?? photos[0] ?? null,
        content: <ComplexDocsView docs={docsForTile} lang={lang} listingTitle={title} />,
        bleed: true,
      })
    }
    return tabs
  }
  const masterplanNode = await (async () => {
    const complexId = firstString(d['Комплекс'])
    if (!complexId) return null
    const layers = await listLayers(complexId).catch(() => [] as Awaited<ReturnType<typeof listLayers>>)
    if (!layers.length) return null
    const hotspots = await listHotspots(layers.map(l => l.id)).catch(() => [] as Awaited<ReturnType<typeof listHotspots>>)
    if (!hotspots.some(h => h.targetUnitSlug === slug)) return null
    const slugs = [...new Set(hotspots.map(h => h.targetUnitSlug).filter((x): x is string => !!x))]
    const idx = await _loadVillaIndex().catch(() => [] as IndexEntry[])
    const idBySlug = new Map(idx.filter(e => slugs.includes(e.slug)).map(e => [e.slug, e.id]))
    const { data: rows } = await sb.from('raw_villas').select('airtable_id, data').in('airtable_id', [...idBySlug.values()])
    const rowById = new Map((rows ?? []).map(r => [r.airtable_id as string, r.data as Record<string, unknown>]))
    const unitsBySlug: Record<string, { kind: 'villa'; slug: string; title: string; bedrooms: number | null; area: number | null; priceUsd: number | null; url: string; photoUrl: string | null }> = {}
    for (const [s2, id] of idBySlug) {
      const r = rowById.get(id)
      if (!r) continue
      const t = (lang === 'ru' ? firstString(r['SEO:Title']) : firstString(r['SEO:Title EN']) ?? firstString(r['SEO:Title'])) ?? s2
      unitsBySlug[s2] = {
        kind: 'villa', slug: s2, title: t.replace(/\s*\|\s*Balinsky\s*$/, ''),
        bedrooms: numberOrNull(r['Комнаты']), area: numberOrNull(r['Площадь']), priceUsd: numberOrNull(r['price'] ?? r['Цена']),
        url: switchLangPath(`/ru/villy/o/${s2}`, lang), photoUrl: manifest[id]?.[0] ?? null,
      }
    }
    const hl = hotspots.find(h => h.targetUnitSlug === slug)
    masterplanCover = layers.find(l => l.id === hl?.layerId)?.photoUrl ?? layers[0].photoUrl
    // Список вилл справа от шахматки: по хотспотам слоя с этой виллой.
    const rowLayer = hl?.layerId ?? layers[0].id
    const seen = new Set<string>()
    const listRows: MasterplanRow[] = hotspots
      .filter(h => h.layerId === rowLayer && h.label)
      .sort((a, b) => a.sortOrder - b.sortOrder || (a.label ?? '').localeCompare(b.label ?? '', undefined, { numeric: true }))
      .filter(h => { const k = h.label!; if (seen.has(k)) return false; seen.add(k); return true })
      .map(h => {
        const u = h.targetUnitSlug ? unitsBySlug[h.targetUnitSlug] : undefined
        const sub = u ? [u.area ? `${String(u.area).replace('.', lang === 'ru' ? ',' : '.')} ${lang === 'ru' ? 'м²' : 'm²'}` : null, u.bedrooms ? `${u.bedrooms} ${lang === 'ru' ? 'сп.' : 'bd'}` : null].filter(Boolean).join(' · ') : null
        return { label: h.label!, status: h.availability, sub: sub || null, priceUsd: u?.priceUsd ?? null, url: u?.url ?? null, current: h.targetUnitSlug === slug }
      })
    const planNode = (
      <ComplexVisualizationViewer
        layers={layers.map(l => ({ id: l.id, parentLayerId: l.parentLayerId, title: l.title, photoUrl: l.photoUrl }))}
        hotspots={hotspots}
        unitsBySlug={unitsBySlug}
        lang={lang}
        highlightSlug={slug}
        bare
      />
    )
    return listRows.length ? <MasterplanWithList plan={planNode} rows={listRows} lang={lang} /> : planNode
  })()
  const districtRaw = firstString(d['Location 2']) ?? firstString(d['Location'])
  // Show Cyrillic district on /ru, raw Latin on /en. Raw form is
  // kept around for the JSON-LD address + canonical-path matching.
  const district = lang === 'ru' ? districtRu(districtRaw) : districtRaw
  // District orientation card: only when the listing's district maps to a
  // real hub slug (DISTRICT_TO_SLUG) AND we have editorial copy for it.
  const districtSlug = districtRaw ? DISTRICT_TO_SLUG[districtRaw] ?? null : null
  const districtCopy = districtSlug ? getDistrictCopy(districtSlug, lang) : null
  const bedrooms = numberOrNull(d['Комнаты'])
  const area = numberOrNull(d['Площадь'])
  const land = numberOrNull(d['Земля'])
  const priceNum = numberOrNull(d['price'] ?? d['Цена'])
  const priceM2 = numberOrNull(d['Цена м²'])
  const priceUpdatedAt = firstString(d['Обновление цены']) ?? firstString(d['Последнее обновление']) ?? firstString(d['Обновлено'])
  const yearRaw = firstString(d['Year of completion'])
  // Источник пишет «4 кв. 2027» по-русски; для показа на других языках — «Q4 2027».
  const yearShown = yearRaw && lang !== 'ru' ? yearRaw.replace(/(\d)\s*кв\.?\s*/i, 'Q$1 ') : yearRaw
  const status = firstString(d['Статус'])
  const permit = firstString(d['Разрешение'])
  const lease = firstString(d['Leasehold']) ?? firstString(d['Leashold'])
  const lat = parseGeo(d['Geo'])
  const lng = parseGeo(d['Geo 2'])
  const seoTextRaw = tField(d, 'SEO Text', lang) ?? tField(d, 'Notes', lang)
  // De-Cyrillic guard: a bad `SEO Text EN` (or missing suffix) can leak Russian
  // into the on-page description / Product schema on a non-RU page.
  const seoText = lang !== 'ru' && lang !== 'uk' && seoTextRaw && hasCyrillic(seoTextRaw) ? translitPreserveCase(seoTextRaw) : seoTextRaw
  // Unique, AI-generated on-page write-up + FAQ (assistant_kb). Falls back to
  // the Airtable SEO Text / templated FAQ when not generated yet.
  const kb = await loadKbPageContent('villa', v.airtable_id, lang)
  // Non-RU: prefer the native-language SEO Text over the RU/EN-only KB body.
  // Per-photo vision alt text (image SEO/accessibility).
  const vision = curated.vision
  const photoAlts = photos.map((_, i) => altFor(vision, i, lang, title))
  const developerName = firstString(d['Developer1']) ?? firstString(d['Developer'])
  // Hidden developers must not appear anywhere (lib/hidden-developers.ts).
  if (isHiddenDeveloper(firstString(d['Developer1']), firstString(d['Developer']))) notFound()
  const devStats = await getDeveloperStats(developerName)
  // Resale / secondary listings carry a direct seller URL — bypass the
  // developer's manager for those.
  const dealTypeRaw = (firstString(d['Тип сделки']) ?? '').toLowerCase()
  const isResale = /перепрод|resale|вторич|secondary/.test(dealTypeRaw)
  const sellerUrl = isResale ? firstString(d['Контакт продавца']) : null

  const leaseYears = lease && /^\d+(\.\d+)?$/.test(lease.trim()) ? Number(lease.trim()) : null
  const [otherVillas, complexes, developers, stylesMap, scoresMap, activeReservation, landProfile, marketStats, nearby, geoFacts, demand, saleComps, verdictSnap, complexFacts, airbnbComps, landPrices, landmarks] = await Promise.all([
    loadOtherVillasInDistrict(district, v.airtable_id, lang),
    _loadComplexesIndex(),
    _loadDevelopersIndex(lang),
    loadVillaStyles(),
    loadAllVillaScores(),
    findActiveReservation('villa', v.airtable_id),
    loadVillaLandProfile(v.airtable_id),
    loadMarketStats('villa', v.airtable_id),
    loadNearbyPlaces(v.airtable_id).catch(() => null),
    loadGeoFacts('villa', v.airtable_id).catch(() => null),
    loadOneUnitDemand('villa', v.airtable_id, lang).catch(() => null),
    lat != null && lng != null
      ? loadCatalogSales(v.airtable_id, developerName, lang)
          .then(catalog => saleCompsNear({ lat, lng, bedrooms, areaM2: area, priceUsd: priceNum, leaseYears, catalog }))
          .catch(() => null)
      : null,
    loadVerdictSnapshot(v.airtable_id),
    loadComplexFacts(firstString(d['Комплекс'])).catch(() => null),
    loadAirbnbNearby(lat, lng, bedrooms),
    lat != null && lng != null ? landPricesNear(lat, lng).catch(() => null) : null,
    lat != null && lng != null ? loadLandmarks(lat, lng).catch(e => { console.error(e); return [] }) : [],
  ])
  // Разрешения самого проекта (KKKPR / PBG / KBLI) — второй уровень блока
  // зонирования. Переводы пока генерятся только для ЖК, поэтому на
  // неруских страницах юнит показывает русский исходник — как и юр-проверка
  // до прогона переводчика.
  const projectPermits = parseProjectPermits(d)
  const interiorStyle = stylesMap[v.airtable_id]?.style ?? null
  const villaScore = scoresMap.get(v.airtable_id) ?? null
  const bestCapRate = villaScore?.goodCapRate ?? null
  const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''

  const parentComplex = findParentComplex(title, complexes, firstString(d['Комплекс 1']))
  const developer = findDeveloperByName(developerName, developers)
  const managers = developer?.slug
    ? await loadManagersByDeveloperSlug(developer.slug)
    : await loadManagersByDeveloperName(developerName)

  // Videos: prefer videos for parent complex, else for developer.
  // Filter by site language so an EN visitor doesn't see RU-only
  // videos (and vice versa); un-tagged videos pass through.
  const allVideos = (await loadAllVideos().catch(() => []))
    .filter(v => videoMatchesLang(v, lang))
  const videos = (() => {
    if (parentComplex?.slug) {
      const byComplex = allVideos.filter(v => v.complexes.some(c => c.slug === parentComplex.slug)).slice(0, 6)
      if (byComplex.length > 0) return byComplex
    }
    if (developer?.slug) {
      return allVideos.filter(v => v.developers.some(d => d.slug === developer.slug)).slice(0, 6)
    }
    return []
  })()

  const facts: { Icon: typeof BedDouble; label: string; value: ReactNode }[] = [
    bedrooms != null && { Icon: BedDouble, label: c.factBedrooms, value: lang === 'ru' ? String(bedrooms) : `${bedrooms} BR` },
    area != null && { Icon: Square, label: c.factHouse, value: `${area} ${c.sqm}` },
    land != null && { Icon: Trees, label: c.factLand, value: `${land} ${c.sqm}` },
    yearRaw && { Icon: Calendar, label: c.factCompletion, value: status?.toLowerCase().includes('построен') ? c.completed : yearShown },
    permitLabel(permit, lang) && { Icon: FileCheck2, label: c.factPermits, value: permitLabel(permit, lang)! },
    lease && { Icon: Lock, label: c.factLeasehold, value: c.factLeaseValue(lease) },
    district && { Icon: MapPin, label: c.factDistrict, value: district },
    fmtAirportDistance(lat, lng, lang) && { Icon: Plane, label: c.factAirport, value: fmtAirportDistance(lat, lng, lang)! },
    interiorStyle && { Icon: Palette, label: c.factStyle, value: facetLabel('style', interiorStyle, lang) },
    // Price/m² lives in the PriceCtaCard right under the hero, no need
    // to duplicate it here.
  ].filter(Boolean) as { Icon: typeof BedDouble; label: string; value: ReactNode }[]

  const viewText = lang === 'ru' ? firstString(d['Вид']) : (firstString(d['Вид EN']) ?? null)
  type KV = { label: string; value: React.ReactNode }
  const villaFacts: KV[] = ([
    parentComplex ? { label: c.factType, value: c.factTypeVillaComplex } : { label: c.factType, value: c.factTypeVilla },
    area != null ? { label: c.factHouse, value: `${area} ${c.sqm}` } : null,
    bedrooms != null ? { label: c.factBedrooms, value: String(bedrooms) } : null,
    interiorStyle ? { label: c.factStyle, value: facetLabel('style', interiorStyle, lang) } : null,
    yearRaw ? { label: c.factCompletion, value: status?.toLowerCase().includes('построен') ? c.completed : yearShown } : null,
    permitLabel(permit, lang) ? { label: c.factPermits, value: permitLabel(permit, lang)! } : null,
    // Вид из окон — поле «Вид» (рус) / «Вид EN»; заполняется вручную по 3D-карте.
    viewText ? { label: pickCopy({ ru: 'Вид из окон', en: 'View', id: 'Pemandangan', fr: 'Vue', de: 'Aussicht', zh: '景观', nl: 'Uitzicht', ban: 'Pemandangan', pl: 'Widok', uk: 'Вид з вікон' }, lang), value: viewText } : null,
  ] as (KV | null)[]).filter(Boolean) as KV[]

  const landFacts: KV[] = ([
    lease ? { label: c.factOwnership, value: c.factOwnershipLease } : null,
    lease ? { label: c.factLeasehold, value: c.factLeaseValue(lease) } : null,
    land != null ? { label: c.factLand, value: `${land} ${c.sqm}` } : null,
    landPrices && land != null && land > 0 ? { label: pickCopy({ ru: 'Стоимость земли', en: 'Land value', id: 'Nilai tanah', fr: 'Valeur du terrain', de: 'Grundstückswert', zh: '土地价值', nl: 'Grondwaarde', ban: 'Aji tanah', pl: 'Wartość gruntu', uk: 'Вартість землі' }, lang), value: <>≈ <Money usd={Math.round(landPrices.medianPpm * land)} lang={lang} /></> } : null,
  ] as (KV | null)[]).filter(Boolean) as KV[]

  // kb.faq is EN-only (KB stores RU + EN). For non-RU pages prefer the native
  // localized c.faq(...) template so de/zh/nl/id/fr/ban don't render English.
  const faqItems = lang === 'ru'
    ? ((kb?.faq && kb.faq.length) ? kb.faq : c.faq(title, district, fmtUsd(priceNum, lang), lease, land))
    : c.faq(title, district, fmtUsd(priceNum, lang), lease, land)
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
    url: `${SITE_URL}${switchLangPath(`/ru/villy/o/${slug}`, lang)}`,
    category: 'Villa',
  }
  if (photos.length > 0) productJsonLd.image = photos.slice(0, 5)
  // Google's Product validator flags missing description; fall back to
  // a generated "<bedrooms>-BR villa in <district>, Bali" line so the
  // field is never empty.
  productJsonLd.description = seoText?.slice(0, 500)
    ?? pickCopy(VILLA_PRODUCT_DESC, lang)(bedrooms, district)
  // Бренд — застройщик, и только когда он известен. Подставлять «Balinsky»
  // нельзя: сайт информационный и объекты не продаёт. brand для сниппета
  // товара не обязателен (обязательны name + offers.price).
  if (developerName) productJsonLd.brand = { '@type': 'Brand', name: developerName }
  if (priceNum != null) {
    productJsonLd.offers = {
      '@type': 'Offer',
      price: Math.round(priceNum),
      priceCurrency: 'USD',
      url: `${SITE_URL}${switchLangPath(`/ru/villy/o/${slug}`, lang)}`,
      // Продавец — застройщик, если известен. Balinsky объекты не продаёт:
      // ни бренда, ни продавца «Balinsky», ни доставки с возвратом.
      ...(developerName ? { seller: { '@type': 'Organization', name: developerName } } : {}),
    }
  }

  const placeJsonLd: Record<string, unknown> | null =
    lat != null && lng != null
      ? {
          '@context': 'https://schema.org',
          '@type': 'SingleFamilyResidence',
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
          // lotSize isn't part of schema.org SingleFamilyResidence — the
          // Schema Validator flags it as unknown. Surface land area via
          // additionalProperty/PropertyValue, which is the canonical
          // open-ended extension point.
          ...(land != null
            ? {
                additionalProperty: [{
                  '@type': 'PropertyValue',
                  name: pickCopy({ ru: 'Площадь участка', en: 'Land area', id: 'Luas tanah', fr: 'Surface du terrain', de: 'Grundstücksfläche', zh: '土地面积', nl: 'Perceeloppervlak', ban: 'Luas tanah', pl: 'Powierzchnia działki', uk: 'Площа ділянки' }, lang),
                  value: land,
                  unitCode: 'MTK',
                }],
              }
            : {}),
          // No offers here — price lives on the separate Product node a
          // bit further down. Validator warns about Offer on
          // SingleFamilyResidence ("expected on Product / Service"), so
          // we don't duplicate it.
        }
      : null

  const home = switchLangPath('/ru', lang)
  const villasRoot = switchLangPath('/ru/villy', lang)
  const apartmentsRoot = switchLangPath('/ru/apartamenty', lang)
  const complexesRoot = switchLangPath('/ru/zhilye-kompleksy', lang)
  const developersRoot = switchLangPath('/ru/zastrojshhiki', lang)

  const landOk = !!landProfile && (landAllowsBuilding(landProfile, 'villa') || hasProjectPermits(projectPermits))
  const plotSite = geoFacts?.climate?.plot ?? null
  const marketOk = !!marketStats && (marketStats.villa_count > 0 || marketStats.apartment_count > 0)
  const hasPlace = !!(geoFacts || nearby || (districtCopy && districtSlug))
  const monthly = verdictSnap?.monthly ?? null
  const hasRent = marketOk || !!demand || !!monthly || !!saleComps
  const hasYield = lat != null && lng != null

  // «Стоит ли брать»: страница идёт по вопросам покупателя — безопасно →
  // удобно → спрос → деньги. Раздел «Цены рядом» ушёл в «деньги».
  const landYellow = /yellow|жёлт|желт/i.test(firstString(d['Land color']) ?? '')
  const rentalRestricted = !!verdictSnap?.flags.rentalRestricted || landYellow
  const yields = computeYieldFacts(verdictSnap)
  const airportS = geoFacts?.routes?.airport?.s
  const underConstruction = !!status && /строит|under construction|planned/i.test(status)
  // «Для жизни»: места вокруг, дорога в час пик и остаток срока аренды земли.
  const livingNoise = await loadLivingNoise('villa', v.airtable_id).catch(() => null)
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
    dev: devStats ? { name: developerName, total: devStats.total, ready: devStats.ready } : null,
    climate: geoFacts?.climate ?? null,
    airportMin: airportS ? Math.round(airportS / 60) : null,
    monthly,
    daily: marketOk ? { count: marketStats!.villa_count, adrUsd: marketStats!.villa_adr_usd, occupancyPct: verdictSnap?.marketOccupancy ? Math.round(verdictSnap.marketOccupancy.occupancy * 100) : marketStats!.villa_occupancy_pct } : null,
    yields,
    saleDiffPct: saleComps?.diffPct ?? null,
    hasPool: verdictSnap?.villa.hasPool ?? null,
    ownOccupancy: verdictSnap?.ownBooking?.occupancy ?? null,
  })
  const qh = questionHeaders(verdict, yields, monthly, saleComps?.diffPct ?? null, underConstruction, lang)

  // Печатная презентация для Pro (/ru/villy/o/<slug>/pdf): те же данные и блоки,
  // разложенные по листам A4 (components/pdf/PdfDocument.tsx).
  if (pdf) {
    const head = (h: typeof qh.safety) => ({ kicker: h.kicker, title: h.title, lead: h.lead })
    const nearPoints = Object.entries(nearby?.byCategory ?? {}).flatMap(([cat, list]) =>
      NEAR_COLORS[cat] ? list.filter(p => p.distanceKm <= 1.1).map(p => ({ lat: p.lat, lng: p.lng, color: NEAR_COLORS[cat], size: cat === 'restaurant' || cat === 'cafe' ? 4 : 6 })) : [])
    // Подборка агента для клиента (/p/…): клиент не должен узнать ни комплекс,
    // ни застройщика — заголовок собираем из района, площади и спален, описание
    // не берём, а имена, если всплывут в блоках, PdfShell вычищает из текста.
    const anon = pdf.anon === true
    const pdfTitle = anon ? anonListingTitle({ kind: 'villa', district: district ?? null, area: area ?? null, bedrooms: bedrooms != null ? String(bedrooms) : null, lang }) : title
    const secret = anon ? [firstString(d['Комплекс 1']), parentComplex?.name, developerName].filter((x): x is string => !!x && x.trim().length > 2) : []
    return (
      <PdfDocument lang={lang} title={pdfTitle} scrub={secret} back={pdf.back} district={district} photos={photos} priceUsd={priceNum} pricePerM2={priceM2}
        chips={[bedrooms != null ? `${c.factBedrooms}: ${bedrooms}` : '', area != null ? `${area} ${c.sqm}` : '', land != null ? `${land} ${c.sqm} ${c.factLand.toLowerCase()}` : '', lease ? c.factLeaseValue(lease) : ''].filter(Boolean)}
        facts={facts.filter(f => typeof f.value === 'string').map(f => ({ label: f.label, value: f.value as string }))}
        about={anon ? null : seoText} lat={lat} lng={lng} url={anon ? '' : `${SITE_URL}${switchLangPath(`/ru/villy/o/${slug}`, lang)}`}
        blocks={pdf.blocks} agent={pdf.agent} autoPrint={pdf.autoPrint} portrait={pdf.portrait} snap={verdictSnap} calcSettings={pdf.calc}
        heads={{ safety: head(qh.safety), comfort: head(qh.comfort), demand: head(qh.demand), money: head(qh.money) }}
        nearPoints={nearPoints}
        nearLegend={livingFacts ? <LivingList facts={livingFacts} lang={lang} hideBeach={beachIsNearest} map={null} /> : null}
        nodes={{
          verdict: <ListingVerdict verdict={verdict} yields={yields} monthly={monthly} saleDiff={saleComps?.diffPct ?? null}
            underConstruction={underConstruction} lang={lang} lat={lat} lng={lng}
            neighbourPhotos={(verdictSnap?.competitors ?? []).map(x => x.photo).filter((x): x is string => !!x)}
            dev={devStats ? { total: devStats.total, ready: devStats.ready } : null}
            anchors={{ safety: 'uchastok', comfort: 'mesto', demand: 'arenda', money: 'dokhodnost' }} />,
          safety: (
            <div className={`grid grid-cols-1 items-start gap-6 ${landOk ? 'lg:grid-cols-2' : ''}`}>
              <SafetyCards verdict={verdict} permit={permit} status={status} yearRaw={yearRaw} complex={complexFacts}
                leaseYears={leaseYears} landYellow={rentalRestricted}
                dev={devStats ? { name: anon ? null : developerName, total: devStats.total, ready: devStats.ready } : null} plot={plotSite}
                coast={geoFacts ? { coastM: geoFacts.climate?.coast_m ?? null, elevationM: geoFacts.climate?.sea?.elevation_m ?? geoFacts.elevation_m, marginM: geoFacts.climate?.sea?.margin_m ?? null } : null} lang={lang} />
              {landOk && <div className="flex flex-col gap-6"><LandProfileBlock data={landProfile!} permits={projectPermits} lang={lang} /><SafetyChecks verdict={verdict} lang={lang} /></div>}
            </div>
          ),
          living: (geoFacts || beach) ? (
            <div className="flex flex-col gap-4 [&>*]:mb-0">
              {geoFacts && <ComplexAccessBlock lang={lang} routes={geoFacts.routes} map={null} />}
              {beach && beachPick && <BeachBlock beach={beach} km={beachPick.km} google={beachPick.google} lang={lang} />}
            </div>
          ) : null,
          climate: geoFacts ? <ClimateBlock climate={geoFacts.climate} air={geoFacts.air} lang={lang} lat={lat} lng={lng} wide /> : null,
          daily: verdictSnap ? <DemandBandsPdf kind="daily" snap={verdictSnap} dailyComps={verdictSnap.competitors ?? []} airbnbComps={airbnbComps} lang={lang} /> : null,
          monthly: verdictSnap?.monthly ? <DemandBandsPdf kind="monthly" snap={verdictSnap} monthly={verdictSnap.monthly} perBand={2} lang={lang} /> : null,
          sale: saleComps ? <SaleCompsBlock data={saleComps} bedrooms={bedrooms} lang={lang} hideTitle /> : null,
          calc: hasYield ? <YieldScenariosTable data={yieldScenarios(verdictSnap, null)} verified={yields?.ownSource === 'actual'} lang={lang} /> : null,
        }} />
    )
  }

  const saleCompLow = saleComps?.q && saleComps.self && saleComps.self > 0 && priceNum
    ? Math.round(saleComps.q.p25 / saleComps.self * priceNum) : null
  const saleCompHigh = saleComps?.q && saleComps.self && saleComps.self > 0 && priceNum
    ? Math.round(saleComps.q.p75 / saleComps.self * priceNum) : null
  const isRu = lang === 'ru' || lang === 'uk'

  const compareData: CompareData | null = (() => {
    const saleSource = (url: string) => {
      try { const h = new URL(url).hostname.replace('www.', ''); return h.split('.')[0] } catch { return 'rumah123' }
    }
    const saleCItems: CompareSaleItem[] = (saleComps?.comps ?? []).map(sc => ({
      name: sc.name ?? sc.district, photo: sc.photo, bedrooms: sc.bedrooms,
      buildingM2: sc.buildingM2, landM2: sc.landM2, priceUsd: sc.priceUsd,
      leaseYears: sc.leaseYears, lat: sc.lat, lng: sc.lng, distanceKm: sc.distanceKm, url: sc.url,
      source: sc.catalog ? 'Balinsky' : saleSource(sc.url), catalog: sc.catalog,
    }))
    const dailyCItems: CompareDailyItem[] = [
      ...(verdictSnap?.competitors ?? []).slice(0, 8).map(comp => ({
        id: comp.id, name: comp.complex ?? comp.name, photo: comp.facts?.roomPhoto ?? comp.photo,
        priceUsd: comp.adr, bedrooms: comp.bedrooms, areaSqm: comp.facts?.roomArea ?? null,
        occupancy: comp.facts?.roomOcc ?? comp.facts?.occ ?? null,
        rating: comp.facts?.score ?? comp.rating ?? null, reviews: comp.facts?.reviewCount ?? comp.reviews ?? null,
        distanceKm: comp.distanceKm, url: comp.url, source: 'booking' as const, lat: comp.lat, lng: comp.lng,
      })),
      ...airbnbComps.slice(0, 4).map(comp => ({
        id: comp.id, name: comp.name, photo: comp.photo,
        priceUsd: comp.priceUsd, bedrooms: comp.bedrooms, areaSqm: null,
        occupancy: null, rating: comp.rating, reviews: comp.reviews,
        distanceKm: comp.distanceKm, url: comp.url, source: 'airbnb' as const,
        lat: 0, lng: 0,
      })),
    ].sort((a, b) => b.priceUsd - a.priceUsd).slice(0, 8)
    const monthlyCItems: CompareMonthlyItem[] = (monthly?.comps ?? []).map(mc => ({
      title: mc.title, photo: mc.photo, bedrooms: mc.bedrooms,
      rentMonthUsd: mc.rentMonthUsd, buildingM2: mc.buildingM2,
      district: mc.district, distanceKm: mc.distanceKm,
      url: mc.url, lat: mc.lat ?? null, lng: mc.lng ?? null,
    }))
    const total = saleCItems.length + dailyCItems.length + monthlyCItems.length
    if (total === 0) return null
    return {
      villa: {
        title, photo: photos[0] ?? null, bedrooms, areaSqm: area, landSqm: land,
        priceUsd: priceNum, leaseYears, district, lat, lng,
        hasPool: verdictSnap?.villa.hasPool ?? null,
      },
      sale: saleCItems,
      daily: dailyCItems,
      monthly: monthlyCItems,
      villaAdrUsd: verdictSnap?.scenarios?.median.adrAsking ?? null,
      villaOccupancy: verdictSnap?.marketOccupancy ? Math.round(verdictSnap.marketOccupancy.occupancy * 100) : null,
      villaMonthlyUsd: monthly?.p50 ?? null,
      searchRadiusKm: verdictSnap?.searchRadiusKm ?? saleComps?.radiusKm ?? 2,
    }
  })()

  // Главы страницы (макет «Структура страницы», вариант A, владелец 2026-11-11).
  const CH = pickCopy({
    ru: { obekt: ['Объект', 'Вилла и участок'], proverka: ['Проверка', 'Можно ли доверять', 'Документы, застройщик, участок и природные риски.'], dengi: ['Деньги', 'Цена и доход', 'Сравнение с соседями, а не обещания застройщика.'], mesto: ['Место', 'Что вокруг и какая погода'], zastroyshchik: ['Застройщик'], voprosy: ['Вопросы'] },
    en: { obekt: ['Property', 'Villa and land'], proverka: ['Checks', 'Can you trust it', 'Documents, developer, plot and natural risks.'], dengi: ['Money', 'Price and income', 'Compared with neighbours, not the developer’s promises.'], mesto: ['Location', 'Surroundings and weather'], zastroyshchik: ['Developer'], voprosy: ['FAQ'] },
  }, lang)
  const hasMoney = !!(saleComps && saleComps.diffPct != null && priceNum != null) || !!(!analyticsOnly && hasYield && verdictSnap && verdictSnap.villa.askingPrice != null)
  const hasMesto = !!(hasPlace && lat != null && lng != null) || !!(beach || geoFacts?.climate)
  const chapterNav = [
    (villaFacts.length > 0 || landFacts.length > 0 || !!rdtr) && { id: 'obekt', no: '01', label: CH.obekt[0] },
    hasMesto && { id: 'mesto', no: '02', label: CH.mesto[0] },
    { id: 'proverka', no: '03', label: CH.proverka[0] },
    hasMoney && { id: 'dengi', no: '04', label: CH.dengi[0] },
    (developer || developerName || parentComplex) && { id: 'zastroyshchik', no: '05', label: CH.zastroyshchik[0] },
    { id: 'voprosy', no: '06', label: CH.voprosy[0] },
  ].filter((x): x is { id: string; no: string; label: string } => !!x)

  const mestoChapter = hasMesto && (
        <VillaChapter id="mesto" no="02" plain={analyticsOnly} eyebrow={CH.mesto[0]} title={CH.mesto[1]} band>
        {hasPlace && lat != null && lng != null && (
          <LocationSection
            lat={lat}
            lng={lng}
            name={parentComplex?.name ?? title}
            livingFacts={livingFacts}
            nearby={nearby}
            landmarks={landmarks}
            routes={geoFacts?.routes ?? null}
            routeLines={geoFacts?.route_lines ?? null}
            beach={beach && beachPick ? { name: (lang === 'ru' ? beach.name_ru : beach.name_en) ?? beach.name_ru ?? '', rating: beachPick.google?.rating ?? null, reviews: beachPick.google?.reviews ?? null, km: beachPick.km } : null}
            lang={lang}
          />
        )}
        {(beach || geoFacts?.climate) && (
          <BeachWeatherDesign
            beach={beach && beachPick ? beach : null}
            beachKm={beachPick?.km ?? 0}
            beachPhoto={beach?.photos?.[0]?.src ?? null}
            climate={geoFacts?.climate ?? null}
            lang={lang}
          />
        )}
        </VillaChapter>
        )

  const analytics = (
    <>
        <ProPendingNote lang={lang} />

        <VillaChapter id="proverka" no="03" plain={analyticsOnly} eyebrow={CH.proverka[0]} title={CH.proverka[1]} lead={CH.proverka[2]}>
        <section id="uchastok" className="scroll-mt-24">
          <SafetyCards verdict={verdict} permit={permit} status={status} yearRaw={yearRaw} complex={complexFacts}
            leaseYears={leaseYears} landYellow={rentalRestricted}
            dev={devStats ? { name: developerName, total: devStats.total, ready: devStats.ready } : null} plot={plotSite}
            coast={geoFacts ? { coastM: geoFacts.climate?.coast_m ?? null, elevationM: geoFacts.climate?.sea?.elevation_m ?? geoFacts.elevation_m, marginM: geoFacts.climate?.sea?.margin_m ?? null } : null} lang={lang} />
        </section>

        {villaLegal && complexMedia.slug && (villaLegal.ok.length > 0 || villaLegalQuestions > 0) && (
          <div className="bx-auth-block">
            <LegalAudit
              lang={lang}
              slug={complexMedia.slug}
              okItems={villaLegal.ok}
              questionsCount={villaLegalQuestions}
              balanceBuyer={villaLegalBalance}
              balanceSummary={villaLegal.balance[0] ?? null}
              balanceNotesCount={villaLegal.balance.length}
              editable={false}
            />
          </div>
        )}

        </VillaChapter>

        {/* На странице ЖК «Цена и доход» не показываем (владелец 13.11.2026). */}
        {hasMoney && !analyticsOnly && (
        <VillaChapter id="dengi" no="04" eyebrow={CH.dengi[0]} title={CH.dengi[1]} lead={CH.dengi[2]} band>
        {saleComps && saleComps.diffPct != null && priceNum != null && (
          <VillaBlock><section className="flex flex-col gap-4 scroll-mt-24">
            <h2 className="text-[24px] font-semibold tracking-[-0.01em] m-0">
              {pickCopy({
                ru: Math.abs(saleComps.diffPct) < 15 ? 'Цена нормальная для района' : saleComps.diffPct < 0 ? 'Цена ниже рынка' : 'Цена выше рынка',
                en: Math.abs(saleComps.diffPct) < 15 ? 'Normal price for the area' : saleComps.diffPct < 0 ? 'Below market price' : 'Above market price',
                id: Math.abs(saleComps.diffPct) < 15 ? 'Harga normal untuk area ini' : saleComps.diffPct < 0 ? 'Di bawah harga pasar' : 'Di atas harga pasar',
                fr: Math.abs(saleComps.diffPct) < 15 ? 'Prix normal pour le quartier' : saleComps.diffPct < 0 ? 'En dessous du marché' : 'Au-dessus du marché',
                de: Math.abs(saleComps.diffPct) < 15 ? 'Normaler Preis für die Gegend' : saleComps.diffPct < 0 ? 'Unter Marktwert' : 'Über Marktwert',
                zh: Math.abs(saleComps.diffPct) < 15 ? '区域正常价格' : saleComps.diffPct < 0 ? '低于市场价' : '高于市场价',
                nl: Math.abs(saleComps.diffPct) < 15 ? 'Normale prijs voor dit gebied' : saleComps.diffPct < 0 ? 'Onder marktwaarde' : 'Boven marktwaarde',
                ban: Math.abs(saleComps.diffPct) < 15 ? 'Aji biasa ring daerah niki' : saleComps.diffPct < 0 ? 'Ring sor aji pasar' : 'Ring duur aji pasar',
                pl: Math.abs(saleComps.diffPct) < 15 ? 'Normalna cena w okolicy' : saleComps.diffPct < 0 ? 'Poniżej cen rynkowych' : 'Powyżej cen rynkowych',
                uk: Math.abs(saleComps.diffPct) < 15 ? 'Ціна звичайна для району' : saleComps.diffPct < 0 ? 'Ціна нижче ринку' : 'Ціна вище ринку',
              }, lang)}
            </h2>
            {saleCompLow != null && saleCompHigh != null && (
              <p className="text-[16px] leading-[1.55] m-0">
                {pickCopy({
                  ru: <>Такая вилла рядом обычно стоит <b>{fmtUsd(saleCompLow, lang)} – {fmtUsd(saleCompHigh, lang)}</b>. Эта - <b>{fmtUsd(priceNum, lang)}</b>.</>,
                  en: <>Similar villas nearby usually cost <b>{fmtUsd(saleCompLow, lang)} – {fmtUsd(saleCompHigh, lang)}</b>. This one is <b>{fmtUsd(priceNum, lang)}</b>.</>,
                  id: <>Villa serupa di sekitar biasanya <b>{fmtUsd(saleCompLow, lang)} – {fmtUsd(saleCompHigh, lang)}</b>. Ini <b>{fmtUsd(priceNum, lang)}</b>.</>,
                  fr: <>Les villas similaires coûtent <b>{fmtUsd(saleCompLow, lang)} – {fmtUsd(saleCompHigh, lang)}</b>. Celle-ci : <b>{fmtUsd(priceNum, lang)}</b>.</>,
                  de: <>Ähnliche Villen kosten <b>{fmtUsd(saleCompLow, lang)} – {fmtUsd(saleCompHigh, lang)}</b>. Diese: <b>{fmtUsd(priceNum, lang)}</b>.</>,
                  zh: <>附近类似别墅通常 <b>{fmtUsd(saleCompLow, lang)} – {fmtUsd(saleCompHigh, lang)}</b>。这套 <b>{fmtUsd(priceNum, lang)}</b>。</>,
                  nl: <>Vergelijkbare villa&apos;s kosten <b>{fmtUsd(saleCompLow, lang)} – {fmtUsd(saleCompHigh, lang)}</b>. Deze: <b>{fmtUsd(priceNum, lang)}</b>.</>,
                  ban: <>Villa mirip ring sekitar <b>{fmtUsd(saleCompLow, lang)} – {fmtUsd(saleCompHigh, lang)}</b>. Niki <b>{fmtUsd(priceNum, lang)}</b>.</>,
                  pl: <>Podobne wille kosztują <b>{fmtUsd(saleCompLow, lang)} – {fmtUsd(saleCompHigh, lang)}</b>. Ta: <b>{fmtUsd(priceNum, lang)}</b>.</>,
                  uk: <>Схожі вілли коштують <b>{fmtUsd(saleCompLow, lang)} – {fmtUsd(saleCompHigh, lang)}</b>. Ця - <b>{fmtUsd(priceNum, lang)}</b>.</>,
                }, lang)}
              </p>
            )}
            <div className="px-2 flex flex-col gap-2.5">
              <div className="relative h-[14px] rounded-[7px]" style={{ background: 'linear-gradient(90deg, #CFE8D9 0% 33.3%, #F6E2BF 33.3% 66.6%, #F4D3CE 66.6% 100%)' }} aria-hidden="true">
                <div className="absolute top-[-5px] w-6 h-6 rounded-full bg-[#D93025] border-[3px] border-white" style={{ left: `${Math.max(5, Math.min(95, 50 + saleComps.diffPct * 1.5))}%`, marginLeft: '-12px', boxShadow: '0 0 0 2px #D93025', boxSizing: 'border-box' }} />
              </div>
              {saleCompLow != null && saleCompHigh != null && (
                <div className="grid grid-cols-3 text-[14px]">
                  <span className="text-[#1B6E4A] font-semibold">{isRu ? 'Дешевле' : 'Cheaper'}<br /><span className="font-normal text-[#4C5751]">{isRu ? 'до' : 'up to'} {fmtUsd(saleCompLow, lang)}</span></span>
                  <span className="text-[#9A5A0B] font-semibold text-center">{isRu ? 'Обычная цена' : 'Typical'}<br /><span className="font-normal text-[#4C5751]">{fmtUsd(saleCompLow, lang)} – {fmtUsd(saleCompHigh, lang)}</span></span>
                  <span className="text-[#A8362B] font-semibold text-right">{isRu ? 'Дороже' : 'Pricier'}<br /><span className="font-normal text-[#4C5751]">{isRu ? 'от' : 'from'} {fmtUsd(saleCompHigh, lang)}</span></span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {saleComps.n > 0 && !compareData && (
                <a href="#arenda" className="text-[15px] text-[var(--color-primary)]">
                  {pickCopy({
                    ru: `С чем сравнивали: ${saleComps.n} ${pluralRu(saleComps.n, ['вилла', 'виллы', 'вилл'])} на продаже рядом`,
                    en: `Compared with ${saleComps.n} villa${saleComps.n > 1 ? 's' : ''} for sale nearby`,
                    id: `Dibandingkan dengan ${saleComps.n} villa dijual di sekitar`,
                    fr: `Comparé à ${saleComps.n} villa${saleComps.n > 1 ? 's' : ''} en vente`,
                    de: `Verglichen mit ${saleComps.n} Villa${saleComps.n > 1 ? 's' : ''} zum Verkauf`,
                    zh: `与附近${saleComps.n}套在售别墅比较`,
                    nl: `Vergeleken met ${saleComps.n} villa's te koop`,
                    ban: `Kabandingang sareng ${saleComps.n} villa`,
                    pl: `Porównanie z ${saleComps.n} willami na sprzedaż`,
                    uk: `Порівняння з ${saleComps.n} ${pluralRu(saleComps.n, ['віллою', 'віллами', 'віллами'])} на продажу`,
                  }, lang)}
                </a>
              )}
              {compareData && (
                <CompareButton data={compareData} lang={lang} initialTab="sale">
                  {compareData.sale.length > 0
                    ? pickCopy({ ru: `Соседи на продаже: ${compareData.sale.length} ${pluralRu(compareData.sale.length, ['вилла', 'виллы', 'вилл'])}`, en: `Neighbours for sale: ${compareData.sale.length}` }, lang)
                    : undefined}
                </CompareButton>
              )}
            </div>
          </section></VillaBlock>
        )}

        {!analyticsOnly && hasYield && verdictSnap && verdictSnap.villa.askingPrice != null && (
          <VillaBlock><section id="kalkulyator" className="scroll-mt-24">
            <IncomeCalculator
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
              compareData={compareData}
            />
          </section></VillaBlock>
        )}
        </VillaChapter>
        )}

        {analyticsOnly && mestoChapter}
    </>
  )
  if (analyticsOnly) return analytics

  const presentationPdf = (
  <VillaPresentationButton
    variant="outline"
    lang={lang}
    villaId={v.airtable_id}
    slug={slug}
    title={title}
    district={district}
    photos={photos}
    priceUsd={priceNum}
    pricePerM2={priceM2}
    bedrooms={bedrooms}
    area={area}
    land={land}
    yearLabel={yearRaw && status?.toLowerCase().includes('построен') ? c.completed : (yearShown ?? null)}
    lease={lease}
    permit={permit}
    lat={lat}
    lng={lng}
    seoText={seoText}
  />
  )
  const presentationBtn = priceNum != null ? (
    <span className="bx-pro-only">
    <AddToCollection kind="villa" slug={slug} lang={lang} snapshot={{
      title, photo: photos[0] ?? null, priceUsd: priceNum ?? null,
      district: district ?? null, bedrooms: bedrooms ?? null, area: area ?? null,
      leaseYears: lease ? Number(lease) || null : null, status: status ?? null,
      id: v.airtable_id, land: land ?? null, pricePerSqmUsd: priceM2 ?? null, permit: permitLabel(permit, lang) ?? null,
    }} />
    {presentationPdf}
    </span>
  ) : null

  return (
    <>
      <Header active="villy" />
      <PageViewTracker kind="villa" slug={slug} title={title} airtableId={v.airtable_id} lang={lang} />
      <PageEditButton kind="villa" id={v.airtable_id} lang={lang} />
      <PageContainer>
        <Breadcrumbs currentUrl={`${villasRoot}/o/${slug}`} items={[
          { label: c.home, href: home },
          { label: c.villasCrumb, href: villasRoot },
          // Regency level dropped: it has no page, so its crumb had no `item`
          // and GSC flagged the whole BreadcrumbList. Chain goes straight to
          // the district (which does have a page).
          ...(district ? [{ label: district, href: districtSlug ? `${villasRoot}/${districtSlug}` : undefined }] : []),
          { label: title },
        ]} />

        <section className="flex flex-col gap-3">
          <h1 className="text-[18px] sm:text-[24px] md:text-[36px] font-semibold tracking-[-0.02em] text-[var(--color-text)] leading-[1.15] [word-break:break-word] [overflow-wrap:anywhere]">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-[#36413B]">
            <span>{district ? `${district}, ${c.bali}` : c.bali}</span>
            <KeyFactsInline facts={livingFacts} beachKm={beachPick?.km ?? null} lang={lang} />
          </div>
          {yields?.ownSource === 'actual' && <a href="#dokhodnost" className="bx-auth-link inline-block"><VerifiedYieldBadge lang={lang} /></a>}
          {priceNum != null && (
            <div className="lg:hidden">
              <PriceCtaCard
                priceUsd={priceNum}
                pricePerSqmUsd={priceM2}
                updatedAt={priceUpdatedAt}
                managerId={managers[0]?.id ?? null}
                sellerUrl={sellerUrl}
                listingKind="villa"
                listingId={v.airtable_id}
                listingSlug={slug}
                listingTitle={title}
                reservedUntil={activeReservation?.expires_at ?? null}
                presentationButton={presentationBtn}
              />
            </div>
          )}
        </section>

        {/* ═══ Two-column layout: main content + sticky sidebar ═══ */}
        <div className="flex flex-wrap gap-12 items-start">
        {/* ── Main column ── */}
        <div className="min-w-0 flex flex-col gap-12" style={{ flex: '999 1 720px' }}>

        <VillaGallery
          photos={photos}
          alts={photoAlts}
          plans={curated.plans}
          plan3dUrl={plan3dUrl}
          videos={videos.map(vd => ({ url: vd.url, name: vd.name }))}
          title={title}
          lang={lang}
          masterplan={masterplanNode}
          masterplanCover={masterplanCover}
          tourUrl={complexMedia.tourUrl}
          promo={promoKit}
          viewerTabs={buildViewerTabs(geoFacts?.climate?.wind ?? null)}
          belowTiles={priceNum != null ? <span className="bx-pro-only block">{presentationPdf}</span> : null}
        />

        {seoText && (
          <section>
            <p className="text-[16px] leading-[1.65] text-[var(--color-text)] max-w-[68ch] m-0">{seoText.split('\n')[0]}</p>
            {seoText.includes('\n') && (
              <ExpandableText className="max-w-[68ch] mt-2" more={c.readMore} less={pickCopy({ ru: 'Свернуть', en: 'Show less', id: 'Tutup', fr: 'Réduire', de: 'Weniger', zh: '收起', nl: 'Minder', ban: 'Tutup', pl: 'Zwiń', uk: 'Згорнути' }, lang)}>
                <div className="prose-balinsky text-[16px] leading-[1.65] text-[var(--color-text)] whitespace-pre-line">
                  {seoText.split('\n').slice(1).join('\n')}
                </div>
              </ExpandableText>
            )}
          </section>
        )}

        {chapterNav.length > 1 && <VillaChapterNav items={chapterNav} />}

        {(villaFacts.length > 0 || landFacts.length > 0 || !!rdtr) && (
          <VillaChapter id="obekt" no="01" eyebrow={CH.obekt[0]} title={CH.obekt[1]}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {villaFacts.length > 0 && (
                <div>
                  <h3 className="text-[20px] font-semibold text-[var(--color-text)] mb-2 mt-0">{c.aboutVillaHeading}</h3>
                  {villaFacts.map(f => (
                    <div key={f.label} className="flex justify-between gap-3 py-3 border-b border-[#EEF2EF] text-[15px]">
                      <span className="shrink-0 text-[var(--color-text-muted)]">{f.label}</span>
                      <span className="text-right">{f.value}</span>
                    </div>
                  ))}
                  {parentComplex && (
                    <div className="flex justify-between gap-3 py-3 border-b border-[#EEF2EF] text-[15px]">
                      <span className="text-[var(--color-text-muted)]">{pickCopy({ ru: 'Часть комплекса', en: 'Part of complex', id: 'Bagian dari kompleks', fr: 'Fait partie du complexe', de: 'Teil der Anlage', zh: '所属项目', nl: 'Onderdeel van complex', ban: 'Bagian saking kompleks', pl: 'Część kompleksu', uk: 'Частина комплексу' }, lang)}</span>
                      <Link href={`${complexesRoot}/o/${parentComplex.slug}`} className="text-right font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-pressed)] hover:underline">
                        {parentComplex.name} →
                      </Link>
                    </div>
                  )}
                </div>
              )}
              {(landFacts.length > 0 || !!rdtr) && (
                <div>
                  <h3 className="text-[20px] font-semibold text-[var(--color-text)] mb-2 mt-0">{c.aboutLandHeading}</h3>
                  {landFacts.map(f => (
                    <div key={f.label} className="flex justify-between gap-3 py-3 border-b border-[#EEF2EF] text-[15px]">
                      <span className="shrink-0 text-[var(--color-text-muted)]">{f.label}</span>
                      <span className="text-right">{f.value}</span>
                    </div>
                  ))}
                  {rdtr && rdtrHit && (
                    <ZoningCard thumb={`${RDTR_BASE}/${rdtrHit.key}.jpg?ver=${rdtr.fetchedAt ?? ''}-${rdtr.radius}`} plot={plotLabel(rdtr, lang)} around={rdtrAround} lang={lang} />
                  )}
                </div>
              )}
            </div>
          </VillaChapter>
        )}

        {mestoChapter}

        {analytics}

        {(developer || developerName || parentComplex) && (
          <VillaChapter id="zastroyshchik" no="05" eyebrow={CH.zastroyshchik[0]}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {(developer || developerName) && (
              <div className="rounded-xl border border-[#E4E9E6] p-6 flex flex-col gap-4 h-full">
                <div className="text-[13px] text-[#4C5751]">{c.developerLabel}</div>
                <div className="flex justify-between items-center">
                  <span className="text-[24px] font-semibold tracking-[-0.01em] text-[var(--color-text)]">{developer?.name ?? developerName}</span>
                  {developer?.logoUrl ? (
                    <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center p-1">
                      <Image src={developer.logoUrl} alt={developer.name} width={40} height={40} className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="shrink-0 w-12 h-12 rounded-lg bg-[#2C3B2F] flex items-center justify-center text-[10px] font-semibold text-white tracking-wide">
                      {(developer?.name ?? developerName ?? '').slice(0, 6).toUpperCase()}
                    </div>
                  )}
                </div>
                {devStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[28px] font-semibold leading-[1.15]">{devStats.ready} {pickCopy({ ru: 'из', en: 'of', id: 'dari', fr: 'sur', de: 'von', zh: '/', nl: 'van', ban: 'saking', pl: 'z', uk: 'з' }, lang)} {devStats.total}</span>
                      <span className="text-[14px] text-[#4C5751]">{c.devStatReady(devStats.ready).replace(/^\d+\s*/, '')}</span>
                    </div>
                    {devStats.inProgress > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[28px] font-semibold leading-[1.15]">{devStats.inProgress}</span>
                        <span className="text-[14px] text-[#4C5751]">{c.devStatBuilding(devStats.inProgress).replace(/^\d+\s*/, '')}</span>
                      </div>
                    )}
                    {videos.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[28px] font-semibold leading-[1.15]">{videos.length} {pickCopy({ ru: 'видео', en: 'videos', id: 'video', fr: 'vidéos', de: 'Videos', zh: '视频', nl: 'video\'s', ban: 'vidéo', pl: 'wideo', uk: 'відео' }, lang)}</span>
                        <span className="text-[14px] text-[#4C5751]">{pickCopy({ ru: 'об объекте', en: 'about the property', id: 'tentang properti', fr: 'sur le bien', de: 'über das Objekt', zh: '关于此物业', nl: 'over het object', ban: 'indik properti', pl: 'o obiekcie', uk: 'про об\'єкт' }, lang)}</span>
                      </div>
                    )}
                  </div>
                )}
                {developer && (
                  <Link href={`${developersRoot}/${developer.slug}`} className="mt-auto text-[15px] text-[var(--color-primary-pressed)] hover:underline">
                    {c.openDeveloper}
                  </Link>
                )}
              </div>
              )}
              {parentComplex && (
                <Link href={`${complexesRoot}/o/${parentComplex.slug}`} className="group rounded-xl border border-[#E4E9E6] p-6 flex flex-col gap-4 h-full no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] focus-visible:border-[var(--color-primary)] transition-colors duration-[120ms]">
                  <div className="text-[13px] text-[#4C5751]">{pickCopy({ ru: 'Жилой комплекс', en: 'Residential complex', id: 'Kompleks hunian', fr: 'Résidence', de: 'Wohnanlage', zh: '住宅项目', nl: 'Wooncomplex', ban: 'Kompleks hunian', pl: 'Kompleks mieszkaniowy', uk: 'Житловий комплекс' }, lang)}</div>
                  {parentComplex.coverUrl && (
                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-[#EEF2EF]">
                      <Image src={parentComplex.coverUrl} alt={parentComplex.name} fill sizes="(min-width: 768px) 420px, 100vw" className="object-cover" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <span className="text-[24px] font-semibold tracking-[-0.01em]">{parentComplex.name}</span>
                    {(() => {
                      const bits = [
                        parentComplex.district,
                        parentComplex.units ? c.units(parentComplex.units) : null,
                      ].filter(Boolean)
                      return bits.length > 0 ? <span className="text-[14px] text-[#4C5751]">{bits.join(' · ')}</span> : null
                    })()}
                  </div>
                  <span className="mt-auto text-[15px] text-[var(--color-primary-pressed)] group-hover:underline">
                    {pickCopy({ ru: 'Открыть страницу комплекса →', en: 'Open complex page →', id: 'Buka halaman kompleks →', fr: 'Voir la résidence →', de: 'Zur Anlage →', zh: '查看项目页面 →', nl: 'Naar het complex →', ban: 'Buka halaman kompleks →', pl: 'Otwórz stronę kompleksu →', uk: 'Відкрити сторінку комплексу →' }, lang)}
                  </span>
                </Link>
              )}
            </div>
          </VillaChapter>
        )}

        {videos.length > 0 && (
          <VideoGrid jsonLdOnly videos={videos} title={parentComplex ? c.videosTitleComplex(parentComplex.name) : developer ? c.videosTitleDev(developer.name) : c.videosTitleDefault} />
        )}

        <VillaChapter id="voprosy" no="06" eyebrow={CH.voprosy[0]} title={c.faqHeading}>
          <div>
            {faqItems.map((it, i) => (
              <details key={i} className="group border-b border-[#E4E9E6]">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 py-4 text-[16px] text-[var(--color-text)]">
                  {it.q}
                  <span className="text-[#94A29A] text-[20px] leading-none shrink-0"><span className="group-open:hidden">+</span><span className="hidden group-open:inline">&minus;</span></span>
                </summary>
                <div className="pb-4 text-[15px] leading-[1.6] text-[#4C5751]">{it.a}</div>
              </details>
            ))}
          </div>
        </VillaChapter>


        </div>{/* ── /Main column ── */}

        {/* ── Sticky sidebar (desktop only) ── */}
        {priceNum != null && (
          <aside className="hidden lg:flex flex-col gap-4 sticky top-[88px]" style={{ flex: '1 1 340px' }}>
            <PriceCtaCard
              sidebar
              priceUsd={priceNum}
              pricePerSqmUsd={priceM2}
              updatedAt={priceUpdatedAt}
              managerId={managers[0]?.id ?? null}
              sellerUrl={sellerUrl}
              listingKind="villa"
              listingId={v.airtable_id}
              listingSlug={slug}
              listingTitle={title}
              reservedUntil={activeReservation?.expires_at ?? null}
              presentationButton={presentationBtn}
              dealRows={[
                ...(paymentPlanText ? [{ label: pickCopy({ ru: 'Рассрочка', en: 'Payment plan', id: 'Cicilan', fr: 'Échéancier', de: 'Ratenplan', zh: '分期付款', nl: 'Betaalplan', ban: 'Cicilan', pl: 'Raty', uk: 'Розстрочка' }, lang), valueText: paymentPlanText }] : []),
                ...(lease ? [{ label: pickCopy({ ru: 'Аренда земли', en: 'Land lease', id: 'Sewa tanah', fr: 'Bail foncier', de: 'Grundstückspacht', zh: '土地租赁', nl: 'Grondpacht', ban: 'Sewa tanah', pl: 'Dzierżawa gruntu', uk: 'Оренда землі' }, lang), valueText: c.factLeaseValue(lease) }] : []),
              ]}
              priceCompDiffPct={saleComps?.diffPct ?? null}
            />
            {managers.length > 0 && managers[0] && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                <div className="flex items-center gap-3">
                  {managers[0].photo ? (
                    <div className="shrink-0 w-[48px] h-[48px] rounded-full overflow-hidden bg-[var(--color-search-bg)] border border-[var(--color-border)] relative">
                      <Image src={managers[0].photo} alt={managers[0].name} fill sizes="48px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="shrink-0 w-[48px] h-[48px] rounded-full bg-[var(--color-search-bg)] border border-[var(--color-border)] flex items-center justify-center text-[18px] text-[var(--color-text-muted)]">
                      {managers[0].name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[var(--color-text)] truncate">
                      {managers[0].name}{developerName ? `, ${developerName}` : ''}
                    </div>
                    <div className="text-[13px] text-[var(--color-text-muted)]">
                      {managers[0].languages.length > 0
                        ? `Telegram, WhatsApp · ${managers[0].languages.join(', ')}`
                        : 'Telegram, WhatsApp'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
        </div>{/* ═══ /Two-column layout ═══ */}

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
