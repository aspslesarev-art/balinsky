// Shared complex-detail renderer. Both /ru/zhilye-kompleksy/o/[slug] and
// /en/complexes/o/[slug] import ComplexDetail and pass their lang —
// layout, data fetching and section order live here only so RU & EN
// stay in lockstep automatically.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { revisionedCache } from '@/lib/revisioned-cache'
import { contentRev } from '@/lib/content-version'
import { MapPin, Sun, Globe, Layers, FileText } from 'lucide-react'
import { loadComplexDocs } from '@/lib/complex-docs'
import { ComplexDocsView } from '@/components/ComplexDocsView'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { ExpandableText } from '@/components/ExpandableText'
import { COMPLEX_DESCRIPTION_FIELD } from '@/lib/complex-description'
import { VillaGallery, type ViewerTab } from '@/components/VillaGallery'
import { curatePhotos } from '@/lib/listing-photos'
import { ApartmentCard, type ApartmentCardData } from '@/components/ApartmentCard'
import { loadManagersByDeveloperName } from '@/lib/managers'
import { getDeveloperStats } from '@/lib/developer-stats'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import { EcoWoodChessBoard, type VillaUnit as ChessBoardVilla } from '@/components/EcoWoodChessBoard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { distanceKm as haversineKm } from '@/lib/competitor-utils'
import { loadVideosByComplexSlug } from '@/lib/videos'
import { VideoGrid } from '@/components/VideoGrid'
import { loadNearbyPlaces } from '@/lib/nearby-places'
import { listLayers, listHotspots } from '@/lib/complex-visualizations'
import { loadSitePlan } from '@/lib/complex-sun-plan-load'
import { embeddableTourUrl } from '@/lib/tour3d'
import { loadPromoKit } from '@/lib/promo-kits'
import { loadSunSettings } from '@/lib/complex-sun'
import dynamic from 'next/dynamic'
// Heavy client widgets — code-split off the initial JS bundle.
const ComplexVisualizationViewer = dynamic(
  () => import('@/components/ComplexVisualizationViewer').then(m => ({ default: m.ComplexVisualizationViewer })),
)
// SunShadowBlock / Google3DMapBlock — вкладки окна медиа; three.js и SDK карты
// грузятся отдельным чанком только при открытии вкладки.
const SunShadowBlock = dynamic(
  () => import('@/components/sun/SunShadowBlock').then(m => ({ default: m.SunShadowBlock })),
)
const Google3DMapBlock = dynamic(
  () => import('@/components/sun/Google3DMapBlock').then(m => ({ default: m.Google3DMapBlock })),
)
import { isHiddenDeveloper } from '@/lib/hidden-developers'
import { loadUnitDemand, type UnitDemand } from '@/lib/unit-demand'
import { loadGeoFacts } from '@/lib/complex-access'
import { PageViewTracker } from '@/components/PageViewTracker'
import { PageEditButton } from '@/components/page-edit/PageEditButton'
import { tField, pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { facetLabel } from '@/lib/filter-i18n'
import { hasCyrillic, translitPreserveCase, completionLabel } from '@/lib/translit'
import { loadAllTranslations, mergeAllTranslations } from '@/lib/en-translations'
import { pluralRu } from '@/lib/plural-ru'
import { KM, METERS, MIN, decSep } from '@/lib/l10n-plural'
import { CX_AI_HEADING, MONTHS_SHORT, NEAR } from '@/lib/listing-l10n'
import { districtRu, districtLatin } from '@/lib/district-ru'
import { loadKbPageContent } from '@/lib/kb-page-content'
import { loadListingVision, loadVisionManifest, altFor } from '@/lib/listing-features'
import { loadListingCopy } from '@/lib/listing-copy'
import { curateManifest } from '@/lib/listing-photos'
import { commercialComplexTitle } from '@/lib/listing-meta'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { cdnManifestUrl } from '@/lib/photo-cdn'
import { PriceCtaCard } from '@/components/PriceCtaCard'
import { isAirtableAttachment } from '@/lib/admin/fields'
import { hreflangMap } from '@/lib/hreflang'
import { metaSnippet } from '@/lib/seo'
import { VillaChapter, ProNo } from '@/components/VillaChapter'
import { VillaActions } from '@/components/VillaActions'
import { LeadHeroCard, LeadStickyBar } from '@/components/LeadHeroCard'
import { ManagerContactButtons } from '@/components/ManagerContactButtons'
import { LocationView } from '@/components/LocationView'
import { ZoningMap } from '@/components/ZoningMap'
import { RDTR_BASE, loadRdtr } from '@/lib/rdtr-zones'
import { AnalyticsPanel } from '@/components/analytics-panel/AnalyticsPanel'
import { buildVillaAnalyses } from '@/lib/analytics-panel/villa'
import { loadSurroundings } from '@/lib/surroundings'
import { loadTourism } from '@/lib/analytics-panel/tourism'
import { BALI_HUBS, loadExtraRoutes, loadTravelTimes, type ExtraDest } from '@/lib/analytics-panel/extra-routes'
import { loadLandmarks } from '@/lib/landmarks'
import { computeLivingFacts } from '@/lib/living'
import { nearestBeachProfile, nearestBeachProfileByPoint } from '@/lib/beaches'

const AIRPORT_LAT = -8.7467
const AIRPORT_LNG = 115.1667
function fmtAirportDistance(lat: number | null, lng: number | null, lang: Lang): string | null {
  if (lat == null || lng == null) return null
  const km = haversineKm(lat, lng, AIRPORT_LAT, AIRPORT_LNG)
  if (lang === 'en') return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
  return km < 1 ? `${Math.round(km * 1000)} ${METERS[lang]}` : `${km.toFixed(km < 10 ? 1 : 0).replace('.', decSep(lang))} ${KM[lang]}`
}

const COPY = {
  ru: {
    home: 'Главная',
    crumbComplexes: 'Жилые комплексы',
    backToComplexes: 'Жилые комплексы',
    bali: 'Бали',
    completed: 'сдан',
    completion: (y: string) => `сдача ${y}`,
    units: (n: number) => `${n} ${pluralRu(n, ['юнит', 'юнита', 'юнитов'])}`,
    unitsFrom: 'Юниты от',
    keyFacts: 'Характеристики',
    factType: 'Тип юнитов',
    factCompletion: 'Срок сдачи',
    factCompletionDone: 'Сдан',
    factPermits: 'Разрешения',
    factLeasehold: 'Лизхолд',
    factLeaseValue: (l: string) => `${l} ${Number.isFinite(Number(l)) ? pluralRu(Number(l), ['год', 'года', 'лет']) : 'лет'}`,
    factUnits: 'Юнитов',
    factDistrict: 'Район',
    factAirport: 'До аэропорта',
    progress: 'Готовность строительства',
    statusUnknown: 'статус неизвестен',
    estimate: 'оценка',
    aboutPrefix: 'О комплексе',
    availableUnits: 'Доступные юниты',
    publishedSuffix: (n: number, kind: 'mixed' | 'villa' | 'apartment') => {
      const nouns: [string, string, string] = kind === 'mixed'
        ? ['юнит', 'юнита', 'юнитов']
        : kind === 'villa'
          ? ['вилла', 'виллы', 'вилл']
          : ['апартамент', 'апартамента', 'апартаментов']
      // «1 опубликованный юнит / 2 опубликованных юнита / 5 опубликованных юнитов»
      // — both adjective and noun decline by the same number-form rule.
      const adjMaleSingular = kind === 'villa' ? 'опубликованная' : 'опубликованный'
      const m10 = n % 10, m100 = n % 100
      const isOne = m10 === 1 && m100 !== 11
      const adj = isOne ? adjMaleSingular : 'опубликованных'
      return `${n} ${adj} ${pluralRu(n, nouns)} в`
    },
    developer: 'Застройщик',
    builtBy: 'Проект реализует',
    allDevelopers: 'Все застройщики Бали',
    docsHeading: 'Документы и материалы',
    location: 'Расположение',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Бали, Индонезия`,
    openInMaps: 'Открыть на Google Maps',
    videosTitle: (n: string) => `Видео о ${n}`,
    otherProjectsIn: (d: string) => `Другие проекты в районе ${d}`,
    relatedHeading: 'По теме',
    related: {
      allComplexes: 'Все жилые комплексы Бали',
      apartments: 'Апартаменты на Бали',
      villas: 'Виллы и дома',
      developers: 'Застройщики Бали',
      complexesIn: (d: string) => `Жилые комплексы в ${d}`,
      apartmentsIn: (d: string) => `Апартаменты в ${d}`,
    },
    faqHeading: 'Часто задаваемые вопросы',
    res: { presentation: 'Презентация проекта', renders: 'Рендеры', masterplan: 'Мастер-план', tour3d: '3D-тур', video: 'Видео обзор', booking: 'Booking.com', airbnb: 'AirBnB' },
    faq: (name: string, district: string | null, lease: string | null) => [
      { q: `Где находится ${name}?`,
        a: district ? `Жилой комплекс ${name} расположен в районе ${district} на Бали, Индонезия.` : `Жилой комплекс ${name} находится на Бали, Индонезия. Точные координаты — на карте выше.` },
      { q: `Какой срок лизхолда у ${name}?`,
        a: lease ? `Базовый срок лизхолда — ${lease} ${Number.isFinite(Number(lease)) ? pluralRu(Number(lease), ['год', 'года', 'лет']) : 'лет'}. Уточняйте у застройщика возможность продления.` : 'Срок лизхолда уточняйте у застройщика. Для большинства проектов на Бали — 25–80 лет с возможностью продления.' },
      { q: `Можно ли купить юнит в ${name} иностранцу?`,
        a: 'Да. Сделка оформляется по схеме лизхолда (долгосрочной аренды земли) у нотариуса PPAT. Иностранцы покупают так же, как и местные.' },
      { q: 'Какие документы должны быть у комплекса?',
        a: 'Главные — PBG (разрешение на строительство) и SLF (сертификат пригодности). Без SLF юнит нельзя легально сдавать в аренду. Документы видны выше в блоке «Ключевые факты».' },
    ],
    titlePart: (name: string, district: string | null, objects: string | null) => {
      const where = district ? `в ${district}, Бали` : 'Бали'
      return objects ? `ЖК ${name} — ${objects} ${where} | Balinsky` : `ЖК ${name} ${where} | Balinsky`
    },
    ogTitle: (name: string) => `${name} на Бали`,
    fallbackDesc: (name: string, district: string | null, types: string, yearRaw: string | null) =>
      `Жилой комплекс ${name}${district ? ` в районе ${district}` : ''} на Бали. ${types ? `Форматы: ${types.toLowerCase()}.` : ''}${yearRaw ? ` Сдача: ${yearRaw}.` : ''} Фото, цены, разрешения.`,
    sold: 'Продано',
  },
  en: {
    home: 'Home',
    crumbComplexes: 'Residential complexes',
    backToComplexes: 'Residential complexes',
    bali: 'Bali',
    completed: 'completed',
    completion: (y: string) => `completion ${y}`,
    units: (n: number) => `${n} units`,
    unitsFrom: 'Units from',
    keyFacts: 'Specifications',
    factType: 'Unit type',
    factCompletion: 'Completion',
    factCompletionDone: 'Completed',
    factPermits: 'Permits',
    factLeasehold: 'Leasehold',
    factLeaseValue: (l: string) => `${l} years`,
    factUnits: 'Units',
    factDistrict: 'District',
    factAirport: 'To airport',
    progress: 'Construction progress',
    statusUnknown: 'status unknown',
    estimate: 'estimated',
    aboutPrefix: 'About',
    availableUnits: 'Available units',
    publishedSuffix: (n: number, kind: 'mixed' | 'villa' | 'apartment') => {
      const word = kind === 'mixed' ? 'units' : kind === 'villa' ? 'villas' : 'apartments'
      return `${n} published ${word} in`
    },
    developer: 'Developer',
    builtBy: 'Built by',
    allDevelopers: 'All Bali developers',
    docsHeading: 'Documents and materials',
    location: 'Location',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonesia`,
    openInMaps: 'Open in Google Maps',
    videosTitle: (n: string) => `Videos about ${n}`,
    otherProjectsIn: (d: string) => `Other projects in ${d}`,
    relatedHeading: 'Related',
    related: {
      allComplexes: 'All Bali residential complexes',
      apartments: 'Apartments in Bali',
      villas: 'Villas and houses',
      developers: 'Bali developers',
      complexesIn: (d: string) => `Residential complexes in ${d}`,
      apartmentsIn: (d: string) => `Apartments in ${d}`,
    },
    faqHeading: 'Frequently asked questions',
    res: { presentation: 'Project presentation', renders: 'Renders', masterplan: 'Master plan', tour3d: '3D tour', video: 'Video tour', booking: 'Booking.com', airbnb: 'AirBnB' },
    faq: (name: string, district: string | null, lease: string | null) => [
      { q: `Where is ${name} located?`,
        a: district ? `${name} residential complex is in ${district}, Bali, Indonesia.` : `${name} is in Bali, Indonesia. The exact coordinates are on the map above.` },
      { q: `What is the leasehold term at ${name}?`,
        a: lease ? `The base leasehold is ${lease} years. Check with the developer about extension terms.` : 'Check the leasehold term with the developer. Typical Bali projects run 25–80 years with extension options.' },
      { q: `Can a foreigner buy a unit at ${name}?`,
        a: 'Yes. The deal is closed via the leasehold scheme (long-term land lease) at a PPAT notary. Foreigners buy on the same terms as locals.' },
      { q: 'What documents should the complex have?',
        a: 'The main ones are PBG (construction permit) and SLF (suitability certificate). Without SLF a unit cannot be legally rented out. Permits are listed above in the "Key facts" block.' },
    ],
    titlePart: (name: string, district: string | null, objects: string | null) => {
      const where = district ? `in ${district}, Bali` : 'in Bali'
      return objects ? `${name} — ${objects} ${where} | Balinsky` : `${name} — Residential Complex ${where} | Balinsky`
    },
    ogTitle: (name: string) => `${name} in Bali`,
    fallbackDesc: (name: string, district: string | null, types: string, yearRaw: string | null) =>
      `${name} residential complex${district ? ` in ${district}` : ''} in Bali.${types ? ` Unit types: ${types.toLowerCase()}.` : ''}${yearRaw ? ` Completion: ${yearRaw}.` : ''} Photos, prices, permits.`,
    sold: 'Sold',
  },
  id: {
    home: 'Beranda',
    crumbComplexes: 'Kompleks hunian',
    backToComplexes: 'Kompleks hunian',
    bali: 'Bali',
    completed: 'selesai',
    completion: (y: string) => `serah terima ${y}`,
    units: (n: number) => `${n} unit`,
    unitsFrom: 'Unit mulai dari',
    keyFacts: 'Fakta utama',
    factType: 'Tipe unit',
    factCompletion: 'Serah terima',
    factCompletionDone: 'Selesai',
    factPermits: 'Izin',
    factLeasehold: 'Hak sewa',
    factLeaseValue: (l: string) => `${l} tahun`,
    factUnits: 'Unit',
    factDistrict: 'Wilayah',
    factAirport: 'Ke bandara',
    progress: 'Progres konstruksi',
    statusUnknown: 'status tidak diketahui',
    estimate: 'perkiraan',
    aboutPrefix: 'Tentang',
    availableUnits: 'Unit tersedia',
    publishedSuffix: (n: number, kind: 'mixed' | 'villa' | 'apartment') => {
      const word = kind === 'mixed' ? 'unit' : kind === 'villa' ? 'vila' : 'apartemen'
      return `${n} ${word} dipublikasikan di`
    },
    developer: 'Pengembang',
    builtBy: 'Dibangun oleh',
    allDevelopers: 'Semua pengembang Bali',
    docsHeading: 'Dokumen dan materi',
    location: 'Lokasi',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonesia`,
    openInMaps: 'Buka di Google Maps',
    videosTitle: (n: string) => `Video tentang ${n}`,
    otherProjectsIn: (d: string) => `Proyek lain di ${d}`,
    relatedHeading: 'Terkait',
    related: {
      allComplexes: 'Semua kompleks hunian Bali',
      apartments: 'Apartemen di Bali',
      villas: 'Vila dan rumah',
      developers: 'Pengembang Bali',
      complexesIn: (d: string) => `Kompleks hunian di ${d}`,
      apartmentsIn: (d: string) => `Apartemen di ${d}`,
    },
    faqHeading: 'Pertanyaan yang sering diajukan',
    res: { presentation: 'Presentasi proyek', renders: 'Render', masterplan: 'Master plan', tour3d: 'Tur 3D', video: 'Video ulasan', booking: 'Booking.com', airbnb: 'AirBnB' },
    faq: (name: string, district: string | null, lease: string | null) => [
      { q: `Di mana lokasi ${name}?`,
        a: district ? `Kompleks hunian ${name} berada di ${district}, Bali, Indonesia.` : `Kompleks hunian ${name} berada di Bali, Indonesia. Koordinat pastinya ada di peta di atas.` },
      { q: `Berapa jangka waktu hak sewa di ${name}?`,
        a: lease ? `Jangka waktu dasar hak sewa — ${lease} tahun. Tanyakan kemungkinan perpanjangan kepada pengembang.` : 'Tanyakan jangka waktu hak sewa kepada pengembang. Untuk sebagian besar proyek di Bali — 25–80 tahun dengan opsi perpanjangan.' },
      { q: `Bisakah warga asing membeli unit di ${name}?`,
        a: 'Ya. Transaksi dilakukan melalui skema hak sewa (leasehold, sewa tanah jangka panjang) di notaris PPAT. Warga asing membeli dengan cara yang sama seperti penduduk lokal.' },
      { q: 'Dokumen apa yang harus dimiliki kompleks?',
        a: 'Yang utama adalah PBG (izin mendirikan bangunan) dan SLF (sertifikat laik fungsi). Tanpa SLF, unit tidak dapat disewakan secara legal. Dokumen terlihat di atas pada blok «Fakta utama».' },
    ],
    titlePart: (name: string, district: string | null, objects: string | null) => {
      const where = district ? `di ${district}, Bali` : 'Bali'
      return objects ? `${name} — ${objects} ${where} | Balinsky` : `${name} — Kompleks Hunian ${where} | Balinsky`
    },
    ogTitle: (name: string) => `${name} di Bali`,
    fallbackDesc: (name: string, district: string | null, types: string, yearRaw: string | null) =>
      `Kompleks hunian ${name}${district ? ` di ${district}` : ''} di Bali.${types ? ` Tipe unit: ${types.toLowerCase()}.` : ''}${yearRaw ? ` Serah terima: ${yearRaw}.` : ''} Foto, harga, izin.`,
    sold: 'Terjual',
  },
  fr: {
    home: 'Accueil',
    crumbComplexes: 'Résidences',
    backToComplexes: 'Résidences',
    bali: 'Bali',
    completed: 'livré',
    completion: (y: string) => `livraison ${y}`,
    units: (n: number) => `${n} unités`,
    unitsFrom: 'Unités à partir de',
    keyFacts: 'Chiffres clés',
    factType: 'Type d\'unité',
    factCompletion: 'Livraison',
    factCompletionDone: 'Livré',
    factPermits: 'Permis',
    factLeasehold: 'Bail emphytéotique',
    factLeaseValue: (l: string) => `${l} ans`,
    factUnits: 'Unités',
    factDistrict: 'Quartier',
    factAirport: "Vers l'aéroport",
    progress: 'Avancement des travaux',
    statusUnknown: 'statut inconnu',
    estimate: 'estimation',
    aboutPrefix: 'À propos de',
    availableUnits: 'Unités disponibles',
    publishedSuffix: (n: number, kind: 'mixed' | 'villa' | 'apartment') => {
      const word = kind === 'mixed' ? 'unités' : kind === 'villa' ? 'villas' : 'appartements'
      return `${n} ${word} disponibles à`
    },
    developer: 'Promoteur',
    builtBy: 'Réalisé par',
    allDevelopers: 'Tous les promoteurs de Bali',
    docsHeading: 'Documents et supports',
    location: 'Emplacement',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonésie`,
    openInMaps: 'Ouvrir dans Google Maps',
    videosTitle: (n: string) => `Vidéos sur ${n}`,
    otherProjectsIn: (d: string) => `Autres projets à ${d}`,
    relatedHeading: 'Sur le même thème',
    related: {
      allComplexes: 'Toutes les résidences de Bali',
      apartments: 'Appartements à Bali',
      villas: 'Villas et maisons',
      developers: 'Promoteurs de Bali',
      complexesIn: (d: string) => `Résidences à ${d}`,
      apartmentsIn: (d: string) => `Appartements à ${d}`,
    },
    faqHeading: 'Questions fréquentes',
    res: { presentation: 'Présentation du projet', renders: 'Rendus', masterplan: 'Plan masse', tour3d: 'Visite 3D', video: 'Vidéo de présentation', booking: 'Booking.com', airbnb: 'AirBnB' },
    faq: (name: string, district: string | null, lease: string | null) => [
      { q: `Où se situe ${name} ?`,
        a: district ? `La résidence ${name} se trouve à ${district}, Bali, Indonésie.` : `La résidence ${name} se trouve à Bali, Indonésie. Les coordonnées exactes sont sur la carte ci-dessus.` },
      { q: `Quelle est la durée du bail à ${name} ?`,
        a: lease ? `La durée de base du bail est de ${lease} ans. Renseignez-vous auprès du promoteur sur les possibilités de renouvellement.` : 'Vérifiez la durée du bail auprès du promoteur. Pour la plupart des projets à Bali — 25 à 80 ans avec options de renouvellement.' },
      { q: `Un étranger peut-il acheter une unité à ${name} ?`,
        a: 'Oui. La transaction se conclut via un bail longue durée (leasehold, location du terrain à long terme) chez un notaire PPAT. Les étrangers achètent aux mêmes conditions que les locaux.' },
      { q: 'Quels documents la résidence doit-elle avoir ?',
        a: 'Les principaux sont le PBG (permis de construire) et le SLF (certificat de conformité). Sans SLF, une unité ne peut pas être louée légalement. Les permis figurent ci-dessus dans le bloc « Chiffres clés ».' },
    ],
    titlePart: (name: string, district: string | null, objects: string | null) => {
      const where = district ? `à ${district}, Bali` : 'à Bali'
      return objects ? `${name} — ${objects} ${where} | Balinsky` : `${name} — Résidence ${where} | Balinsky`
    },
    ogTitle: (name: string) => `${name} à Bali`,
    fallbackDesc: (name: string, district: string | null, types: string, yearRaw: string | null) =>
      `Résidence ${name}${district ? ` à ${district}` : ''} à Bali.${types ? ` Types d'unités : ${types.toLowerCase()}.` : ''}${yearRaw ? ` Livraison : ${yearRaw}.` : ''} Photos, prix, permis.`,
    sold: 'Vendu',
  },
  de: {
    home: 'Startseite',
    crumbComplexes: 'Wohnanlagen',
    backToComplexes: 'Wohnanlagen',
    bali: 'Bali',
    completed: 'fertiggestellt',
    completion: (y: string) => `Fertigstellung ${y}`,
    units: (n: number) => `${n} Einheiten`,
    unitsFrom: 'Einheiten ab',
    keyFacts: 'Eckdaten',
    factType: 'Einheitentyp',
    factCompletion: 'Fertigstellung',
    factCompletionDone: 'Fertiggestellt',
    factPermits: 'Genehmigungen',
    factLeasehold: 'Leasehold',
    factLeaseValue: (l: string) => `${l} Jahre`,
    factUnits: 'Einheiten',
    factDistrict: 'Gegend',
    factAirport: 'Zum Flughafen',
    progress: 'Baufortschritt',
    statusUnknown: 'Status unbekannt',
    estimate: 'geschätzt',
    aboutPrefix: 'Über',
    availableUnits: 'Verfügbare Einheiten',
    publishedSuffix: (n: number, kind: 'mixed' | 'villa' | 'apartment') => {
      const word = kind === 'mixed' ? 'Einheiten' : kind === 'villa' ? 'Villen' : 'Apartments'
      return `${n} veröffentlichte ${word} in`
    },
    developer: 'Bauträger',
    builtBy: 'Realisiert von',
    allDevelopers: 'Alle Bali-Bauträger',
    docsHeading: 'Dokumente und Materialien',
    location: 'Lage',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonesien`,
    openInMaps: 'In Google Maps öffnen',
    videosTitle: (n: string) => `Videos über ${n}`,
    otherProjectsIn: (d: string) => `Weitere Projekte in ${d}`,
    relatedHeading: 'Ähnliches',
    related: {
      allComplexes: 'Alle Bali-Wohnanlagen',
      apartments: 'Apartments auf Bali',
      villas: 'Villen und Häuser',
      developers: 'Bali-Bauträger',
      complexesIn: (d: string) => `Wohnanlagen in ${d}`,
      apartmentsIn: (d: string) => `Apartments in ${d}`,
    },
    faqHeading: 'Häufig gestellte Fragen',
    res: { presentation: 'Projektpräsentation', renders: 'Renderings', masterplan: 'Masterplan', tour3d: '3D-Tour', video: 'Videorundgang', booking: 'Booking.com', airbnb: 'AirBnB' },
    faq: (name: string, district: string | null, lease: string | null) => [
      { q: `Wo befindet sich ${name}?`,
        a: district ? `Die Wohnanlage ${name} liegt in ${district}, Bali, Indonesien.` : `${name} liegt auf Bali, Indonesien. Genaue Koordinaten auf der Karte oben.` },
      { q: `Wie lange läuft der Leasehold bei ${name}?`,
        a: lease ? `Die Grund-Leasehold-Laufzeit beträgt ${lease} Jahre. Fragen Sie den Bauträger nach Verlängerungsmöglichkeiten.` : 'Die Leasehold-Laufzeit mit dem Bauträger klären. Die meisten Bali-Projekte laufen 25–80 Jahre mit Verlängerungsoptionen.' },
      { q: `Kann ein Ausländer eine Einheit bei ${name} kaufen?`,
        a: 'Ja. Der Kauf erfolgt per Leasehold-Schema (langfristige Grundstückspacht) bei einem PPAT-Notar. Ausländer kaufen zu denselben Bedingungen wie Einheimische.' },
      { q: 'Welche Dokumente sollte die Anlage haben?',
        a: 'Die wichtigsten sind PBG (Baugenehmigung) und SLF (Eignungszertifikat). Ohne SLF darf eine Einheit nicht legal vermietet werden. Die Genehmigungen stehen oben im Block „Eckdaten“.' },
    ],
    titlePart: (name: string, district: string | null, objects: string | null) => {
      const where = district ? `in ${district}, Bali` : 'auf Bali'
      return objects ? `${name} — ${objects} ${where} | Balinsky` : `${name} — Wohnanlage ${where} | Balinsky`
    },
    ogTitle: (name: string) => `${name} auf Bali`,
    fallbackDesc: (name: string, district: string | null, types: string, yearRaw: string | null) =>
      `Wohnanlage ${name}${district ? ` in ${district}` : ''} auf Bali.${types ? ` Einheitentypen: ${types.toLowerCase()}.` : ''}${yearRaw ? ` Fertigstellung: ${yearRaw}.` : ''} Fotos, Preise, Genehmigungen.`,
    sold: 'Verkauft',
  },
  zh: {
    home: '首页',
    crumbComplexes: '住宅区',
    backToComplexes: '住宅区',
    bali: '巴厘岛',
    completed: '已交付',
    completion: (y: string) => `${y} 交付`,
    units: (n: number) => `${n} 套`,
    unitsFrom: '起售单元',
    keyFacts: '核心信息',
    factType: '单元类型',
    factCompletion: '交付',
    factCompletionDone: '已交付',
    factPermits: '许可证',
    factLeasehold: '租赁产权',
    factLeaseValue: (l: string) => `${l} 年`,
    factUnits: '单元数',
    factDistrict: '地区',
    factAirport: '到机场',
    progress: '施工进度',
    statusUnknown: '状态未知',
    estimate: '估计',
    aboutPrefix: '关于',
    availableUnits: '可售单元',
    publishedSuffix: (n: number, kind: 'mixed' | 'villa' | 'apartment') => {
      const word = kind === 'mixed' ? '套单元' : kind === 'villa' ? '套别墅' : '套公寓'
      return `已发布 ${n} ${word}，位于`
    },
    developer: '开发商',
    builtBy: '开发方',
    allDevelopers: '巴厘岛所有开发商',
    docsHeading: '文件和资料',
    location: '位置',
    locationLine: (d: string | null) => `${d ? `${d}，` : ''}印度尼西亚巴厘岛`,
    openInMaps: '在 Google 地图中打开',
    videosTitle: (n: string) => `关于 ${n} 的视频`,
    otherProjectsIn: (d: string) => `${d} 的其他项目`,
    relatedHeading: '相关',
    related: {
      allComplexes: '巴厘岛所有住宅区',
      apartments: '巴厘岛公寓',
      villas: '别墅和房屋',
      developers: '巴厘岛开发商',
      complexesIn: (d: string) => `${d} 的住宅区`,
      apartmentsIn: (d: string) => `${d} 的公寓`,
    },
    faqHeading: '常见问题',
    res: { presentation: '项目介绍', renders: '效果图', masterplan: '总体规划', tour3d: '3D 导览', video: '视频介绍', booking: 'Booking.com', airbnb: 'AirBnB' },
    faq: (name: string, district: string | null, lease: string | null) => [
      { q: `${name} 位于哪里？`,
        a: district ? `${name} 住宅区位于印度尼西亚巴厘岛 ${district}。` : `${name} 位于印度尼西亚巴厘岛。确切坐标见上方地图。` },
      { q: `${name} 的租赁产权期限是多久？`,
        a: lease ? `基础租赁产权期限为 ${lease} 年。请向开发商咨询续期事宜。` : '请向开发商咨询租赁产权期限。巴厘岛大多数项目为 25–80 年，可续期。' },
      { q: `外国人可以在 ${name} 购买单元吗？`,
        a: '可以。交易通过租赁产权方案（长期土地租赁）在 PPAT 公证人处办理。外国人的购买条件与本地人相同。' },
      { q: '住宅区应具备哪些文件？',
        a: '主要是 PBG（建筑许可）和 SLF（适用证书）。没有 SLF，单元不能合法出租。许可证列于上方“核心信息”一栏。' },
    ],
    titlePart: (name: string, district: string | null, objects: string | null) => {
      const where = district ? `巴厘岛 ${district}` : '巴厘岛'
      return objects ? `${name} — ${objects}，${where} | Balinsky` : `${name} — 住宅区，${where} | Balinsky`
    },
    ogTitle: (name: string) => `${name}，巴厘岛`,
    fallbackDesc: (name: string, district: string | null, types: string, yearRaw: string | null) =>
      `${name} 住宅区${district ? `，位于 ${district}` : ''}，巴厘岛。${types ? ` 单元类型：${types.toLowerCase()}。` : ''}${yearRaw ? ` 交付：${yearRaw}。` : ''} 照片、价格、许可证。`,
    sold: '已售',
  },
  nl: {
    home: 'Home',
    crumbComplexes: 'Wooncomplexen',
    backToComplexes: 'Wooncomplexen',
    bali: 'Bali',
    completed: 'opgeleverd',
    completion: (y: string) => `oplevering ${y}`,
    units: (n: number) => `${n} units`,
    unitsFrom: 'Units vanaf',
    keyFacts: 'Kerngegevens',
    factType: 'Type unit',
    factCompletion: 'Oplevering',
    factCompletionDone: 'Opgeleverd',
    factPermits: 'Vergunningen',
    factLeasehold: 'Leasehold',
    factLeaseValue: (l: string) => `${l} jaar`,
    factUnits: 'Units',
    factDistrict: 'Gebied',
    factAirport: 'Naar luchthaven',
    progress: 'Bouwvoortgang',
    statusUnknown: 'status onbekend',
    estimate: 'schatting',
    aboutPrefix: 'Over',
    availableUnits: 'Beschikbare units',
    publishedSuffix: (n: number, kind: 'mixed' | 'villa' | 'apartment') => {
      const word = kind === 'mixed' ? 'units' : kind === 'villa' ? 'villa\'s' : 'appartementen'
      return `${n} gepubliceerde ${word} in`
    },
    developer: 'Ontwikkelaar',
    builtBy: 'Gerealiseerd door',
    allDevelopers: 'Alle Bali-ontwikkelaars',
    docsHeading: 'Documenten en materialen',
    location: 'Locatie',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonesië`,
    openInMaps: 'Openen in Google Maps',
    videosTitle: (n: string) => `Video\'s over ${n}`,
    otherProjectsIn: (d: string) => `Andere projecten in ${d}`,
    relatedHeading: 'Gerelateerd',
    related: {
      allComplexes: 'Alle Bali-wooncomplexen',
      apartments: 'Appartementen op Bali',
      villas: 'Villa\'s en huizen',
      developers: 'Bali-ontwikkelaars',
      complexesIn: (d: string) => `Wooncomplexen in ${d}`,
      apartmentsIn: (d: string) => `Appartementen in ${d}`,
    },
    faqHeading: 'Veelgestelde vragen',
    res: { presentation: 'Projectpresentatie', renders: 'Renders', masterplan: 'Masterplan', tour3d: '3D-tour', video: 'Videotour', booking: 'Booking.com', airbnb: 'AirBnB' },
    faq: (name: string, district: string | null, lease: string | null) => [
      { q: `Waar ligt ${name}?`,
        a: district ? `Wooncomplex ${name} ligt in ${district}, Bali, Indonesië.` : `${name} ligt op Bali, Indonesië. De exacte coördinaten staan op de kaart hierboven.` },
      { q: `Wat is de leaseholdtermijn bij ${name}?`,
        a: lease ? `De basisleasehold is ${lease} jaar. Vraag de ontwikkelaar naar verlengingsvoorwaarden.` : 'Vraag de ontwikkelaar naar de leaseholdtermijn. De meeste Bali-projecten lopen 25–80 jaar met verlengingsopties.' },
      { q: `Kan een buitenlander een unit kopen bij ${name}?`,
        a: 'Ja. De transactie verloopt via het leaseholdschema (langdurige grondpacht) bij een PPAT-notaris. Buitenlanders kopen op dezelfde voorwaarden als locals.' },
      { q: 'Welke documenten moet het complex hebben?',
        a: 'De belangrijkste zijn PBG (bouwvergunning) en SLF (geschiktheidscertificaat). Zonder SLF kan een unit niet legaal worden verhuurd. De vergunningen staan hierboven in het blok „Kerngegevens”.' },
    ],
    titlePart: (name: string, district: string | null, objects: string | null) => {
      const where = district ? `in ${district}, Bali` : 'op Bali'
      return objects ? `${name} — ${objects} ${where} | Balinsky` : `${name} — Wooncomplex ${where} | Balinsky`
    },
    ogTitle: (name: string) => `${name} op Bali`,
    fallbackDesc: (name: string, district: string | null, types: string, yearRaw: string | null) =>
      `Wooncomplex ${name}${district ? ` in ${district}` : ''} op Bali.${types ? ` Typen units: ${types.toLowerCase()}.` : ''}${yearRaw ? ` Oplevering: ${yearRaw}.` : ''} Foto\'s, prijzen, vergunningen.`,
    sold: 'Verkocht',
  },
  ban: {
    home: 'Beranda',
    crumbComplexes: 'Kompleks',
    backToComplexes: 'Kompleks',
    bali: 'Bali',
    completed: 'puput',
    completion: (y: string) => `serah terima ${y}`,
    units: (n: number) => `${n} unit`,
    unitsFrom: 'Unit ngawit saking',
    keyFacts: 'Fakta utama',
    factType: 'Tipe unit',
    factCompletion: 'Serah terima',
    factCompletionDone: 'Puput',
    factPermits: 'Izin',
    factLeasehold: 'Hak sewa',
    factLeaseValue: (l: string) => `${l} warsa`,
    factUnits: 'Unit',
    factDistrict: 'Wewidangan',
    factAirport: 'Ka bandara',
    progress: 'Kemajuan konstruksi',
    statusUnknown: 'status nenten kauningin',
    estimate: 'perkiraan',
    aboutPrefix: 'Indik',
    availableUnits: 'Unit sane wenten',
    publishedSuffix: (n: number, kind: 'mixed' | 'villa' | 'apartment') => {
      const word = kind === 'mixed' ? 'unit' : kind === 'villa' ? 'vila' : 'apartemen'
      return `${n} ${word} kawedar ring`
    },
    developer: 'Pangwangun',
    builtBy: 'Kawangun olih',
    allDevelopers: 'Sami pangwangun Bali',
    docsHeading: 'Dokumen lan materi',
    location: 'Genah',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonesia`,
    openInMaps: 'Buka ring Google Maps',
    videosTitle: (n: string) => `Video indik ${n}`,
    otherProjectsIn: (d: string) => `Proyek lianan ring ${d}`,
    relatedHeading: 'Sane pateh',
    related: {
      allComplexes: 'Sami kompleks ring Bali',
      apartments: 'Apartemen ring Bali',
      villas: 'Vila lan umah',
      developers: 'Pangwangun Bali',
      complexesIn: (d: string) => `Kompleks ring ${d}`,
      apartmentsIn: (d: string) => `Apartemen ring ${d}`,
    },
    faqHeading: 'Patakon sane sering katakenang',
    res: { presentation: 'Presentasi proyek', renders: 'Render', masterplan: 'Master plan', tour3d: 'Tur 3D', video: 'Video ulasan', booking: 'Booking.com', airbnb: 'AirBnB' },
    faq: (name: string, district: string | null, lease: string | null) => [
      { q: `Ring dija genah ${name}?`,
        a: district ? `Kompleks ${name} magenah ring ${district}, Bali, Indonesia.` : `${name} magenah ring Bali, Indonesia. Koordinat sane pasti wenten ring peta baduur.` },
      { q: `Kuda suwe jangka waktu hak sewa ring ${name}?`,
        a: lease ? `Jangka waktu dasar hak sewa — ${lease} warsa. Takenang kemungkinan perpanjangan ring pangwangun.` : 'Takenang jangka waktu hak sewa ring pangwangun. Anggen akehan proyek ring Bali — 25–80 warsa madue opsi perpanjangan.' },
      { q: `Punapi warga dura negara dados numbas unit ring ${name}?`,
        a: 'Inggih. Transaksi kalaksanayang antuk skema hak sewa (leasehold, sewa tanah jangka panjang) ring notaris PPAT. Warga dura negara numbas pateh sakadi penduduk lokal.' },
      { q: 'Napi dokumen sane patut kadruenang kompleks?',
        a: 'Sane utama inggih punika PBG (izin ngwangun) lan SLF (sertifikat laik fungsi). Tanpa SLF, unit nenten dados kasewayang sacara legal. Dokumen kacingak baduur ring blok «Fakta utama».' },
    ],
    titlePart: (name: string, district: string | null, objects: string | null) => {
      const where = district ? `ring ${district}, Bali` : 'Bali'
      return objects ? `${name} — ${objects} ${where} | Balinsky` : `${name} — Kompleks ${where} | Balinsky`
    },
    ogTitle: (name: string) => `${name} ring Bali`,
    fallbackDesc: (name: string, district: string | null, types: string, yearRaw: string | null) =>
      `Kompleks ${name}${district ? ` ring ${district}` : ''} ring Bali.${types ? ` Tipe unit: ${types.toLowerCase()}.` : ''}${yearRaw ? ` Serah terima: ${yearRaw}.` : ''} Foto, aji, izin.`,
    sold: 'Kaadol',
  },
  pl: {
    home: 'Strona główna',
    crumbComplexes: 'Kompleksy mieszkaniowe',
    backToComplexes: 'Kompleksy mieszkaniowe',
    bali: 'Bali',
    completed: 'ukończony',
    completion: (y: string) => `oddanie ${y}`,
    units: (n: number) => `${n} lokali`,
    unitsFrom: 'Lokale od',
    keyFacts: 'Najważniejsze informacje',
    factType: 'Typ lokalu',
    factCompletion: 'Oddanie',
    factCompletionDone: 'Ukończony',
    factPermits: 'Pozwolenia',
    factLeasehold: 'Leasehold',
    factLeaseValue: (l: string) => `${l} lat`,
    factUnits: 'Lokale',
    factDistrict: 'Rejon',
    factAirport: 'Na lotnisko',
    progress: 'Postęp budowy',
    statusUnknown: 'status nieznany',
    estimate: 'szacunkowo',
    aboutPrefix: 'O',
    availableUnits: 'Dostępne lokale',
    publishedSuffix: (n: number, kind: 'mixed' | 'villa' | 'apartment') => {
      const word = kind === 'mixed' ? 'lokali' : kind === 'villa' ? 'willi' : 'apartamentów'
      return `${n} opublikowanych ${word} w`
    },
    developer: 'Deweloper',
    builtBy: 'Zrealizowany przez',
    allDevelopers: 'Wszyscy deweloperzy na Bali',
    docsHeading: 'Dokumenty i materiały',
    location: 'Lokalizacja',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonezja`,
    openInMaps: 'Otwórz w Mapach Google',
    videosTitle: (n: string) => `Filmy o ${n}`,
    otherProjectsIn: (d: string) => `Inne projekty w ${d}`,
    relatedHeading: 'Powiązane',
    related: {
      allComplexes: 'Wszystkie kompleksy mieszkaniowe na Bali',
      apartments: 'Apartamenty na Bali',
      villas: 'Wille i domy',
      developers: 'Deweloperzy na Bali',
      complexesIn: (d: string) => `Kompleksy mieszkaniowe w ${d}`,
      apartmentsIn: (d: string) => `Apartamenty w ${d}`,
    },
    faqHeading: 'Najczęściej zadawane pytania',
    res: { presentation: 'Prezentacja projektu', renders: 'Rendery', masterplan: 'Plan zagospodarowania', tour3d: 'Wycieczka 3D', video: 'Wideoprezentacja', booking: 'Booking.com', airbnb: 'AirBnB' },
    faq: (name: string, district: string | null, lease: string | null) => [
      { q: `Gdzie znajduje się ${name}?`,
        a: district ? `Kompleks mieszkaniowy ${name} znajduje się w ${district}, Bali, Indonezja.` : `${name} znajduje się na Bali, Indonezja. Dokładne współrzędne są na mapie powyżej.` },
      { q: `Jaki jest okres leasehold w ${name}?`,
        a: lease ? `Podstawowy leasehold to ${lease} lat. Zapytaj dewelopera o warunki przedłużenia.` : 'Zapytaj dewelopera o okres leasehold. Typowe projekty na Bali trwają 25–80 lat z opcją przedłużenia.' },
      { q: `Czy obcokrajowiec może kupić lokal w ${name}?`,
        a: 'Tak. Transakcja odbywa się w ramach leasehold (długoterminowa dzierżawa gruntu) u notariusza PPAT. Obcokrajowcy kupują na takich samych warunkach jak miejscowi.' },
      { q: 'Jakie dokumenty powinien mieć kompleks?',
        a: 'Najważniejsze to PBG (pozwolenie na budowę) i SLF (certyfikat przydatności). Bez SLF lokalu nie można legalnie wynajmować. Pozwolenia są wymienione powyżej w bloku „Najważniejsze informacje”.' },
    ],
    titlePart: (name: string, district: string | null, objects: string | null) => {
      const where = district ? `w ${district}, Bali` : 'na Bali'
      return objects ? `${name} — ${objects} ${where} | Balinsky` : `${name} — Kompleks mieszkaniowy ${where} | Balinsky`
    },
    ogTitle: (name: string) => `${name} na Bali`,
    fallbackDesc: (name: string, district: string | null, types: string, yearRaw: string | null) =>
      `Kompleks mieszkaniowy ${name}${district ? ` w ${district}` : ''} na Bali.${types ? ` Typy lokali: ${types.toLowerCase()}.` : ''}${yearRaw ? ` Oddanie: ${yearRaw}.` : ''} Zdjęcia, ceny, pozwolenia.`,
    sold: 'Sprzedane',
  },
  uk: {
    home: 'Головна',
    crumbComplexes: 'Житлові комплекси',
    backToComplexes: 'Житлові комплекси',
    bali: 'Балі',
    completed: 'зданий',
    completion: (y: string) => `здача ${y}`,
    units: (n: number) => `${n} юнітів`,
    unitsFrom: 'Юніти від',
    keyFacts: 'Ключові факти',
    factType: 'Тип юніта',
    factCompletion: 'Здача',
    factCompletionDone: 'Зданий',
    factPermits: 'Дозволи',
    factLeasehold: 'Leasehold',
    factLeaseValue: (l: string) => `${l} років`,
    factUnits: 'Юніти',
    factDistrict: 'Район',
    factAirport: 'До аеропорту',
    progress: 'Хід будівництва',
    statusUnknown: 'статус невідомий',
    estimate: 'орієнтовно',
    aboutPrefix: 'Про',
    availableUnits: 'Доступні юніти',
    publishedSuffix: (n: number, kind: 'mixed' | 'villa' | 'apartment') => {
      const word = kind === 'mixed' ? 'юнітів' : kind === 'villa' ? 'вілл' : 'апартаментів'
      return `${n} опублікованих ${word} у`
    },
    developer: 'Забудовник',
    builtBy: 'Збудовано',
    allDevelopers: 'Усі забудовники Балі',
    docsHeading: 'Документи та матеріали',
    location: 'Розташування',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Балі, Індонезія`,
    openInMaps: 'Відкрити в Google Maps',
    videosTitle: (n: string) => `Відео про ${n}`,
    otherProjectsIn: (d: string) => `Інші проєкти в ${d}`,
    relatedHeading: 'Схоже',
    related: {
      allComplexes: 'Усі житлові комплекси Балі',
      apartments: 'Апартаменти на Балі',
      villas: 'Вілли та будинки',
      developers: 'Забудовники Балі',
      complexesIn: (d: string) => `Житлові комплекси в ${d}`,
      apartmentsIn: (d: string) => `Апартаменти в ${d}`,
    },
    faqHeading: 'Часті запитання',
    res: { presentation: 'Презентація проєкту', renders: 'Рендери', masterplan: 'Генплан', tour3d: '3D-тур', video: 'Відеотур', booking: 'Booking.com', airbnb: 'AirBnB' },
    faq: (name: string, district: string | null, lease: string | null) => [
      { q: `Де розташований ${name}?`,
        a: district ? `Житловий комплекс ${name} розташований у ${district}, Балі, Індонезія.` : `${name} розташований на Балі, Індонезія. Точні координати — на карті вище.` },
      { q: `Який термін leasehold у ${name}?`,
        a: lease ? `Базовий leasehold — ${lease} років. Уточніть у забудовника умови продовження.` : 'Уточніть термін leasehold у забудовника. Типові проєкти на Балі — 25–80 років з можливістю продовження.' },
      { q: `Чи може іноземець купити юніт у ${name}?`,
        a: 'Так. Угода укладається за схемою leasehold (довгострокова оренда землі) у нотаріуса PPAT. Іноземці купують на тих самих умовах, що й місцеві.' },
      { q: 'Які документи має мати комплекс?',
        a: 'Основні — це PBG (дозвіл на будівництво) та SLF (сертифікат придатності). Без SLF юніт не можна легально здавати в оренду. Дозволи наведені вище в блоці «Ключові факти».' },
    ],
    titlePart: (name: string, district: string | null, objects: string | null) => {
      const where = district ? `у ${district}, Балі` : 'на Балі'
      return objects ? `${name} — ${objects} ${where} | Balinsky` : `${name} — Житловий комплекс ${where} | Balinsky`
    },
    ogTitle: (name: string) => `${name} на Балі`,
    fallbackDesc: (name: string, district: string | null, types: string, yearRaw: string | null) =>
      `Житловий комплекс ${name}${district ? ` у ${district}` : ''} на Балі.${types ? ` Типи юнітів: ${types.toLowerCase()}.` : ''}${yearRaw ? ` Здача: ${yearRaw}.` : ''} Фото, ціни, дозволи.`,
    sold: 'Продано',
  },
} as const

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const COMPLEX_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`
const APT_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_manifest.json`
const VILLA_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const CURRENT_YEAR = 2026

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

type ComplexRow = {
  airtable_id: string
  data: Record<string, unknown>
  slug: string | null
  cover_url: string | null
}

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) {
    return firstString((v as { value: unknown }).value)
  }
  return null
}
// Build a lookup of developers (name → {slug, logo}) so we can
// link a complex's developer directly to /ru/zastrojshhiki/<slug>.
// Mirrors the villa detail page; cached for an hour because the
// developer list churns slowly.
type DeveloperLink = { name: string; slug: string; logoUrl: string | null }

type DeveloperSlimRow = {
  airtable_id: string
  logo_url: string | null
  published: boolean | null
  name: string | null
  slug: string | null
}
const _loadDevelopersIndex = unstable_cache(
  async (): Promise<DeveloperLink[]> => {
    // JSON-projection вместо `data` целиком: -98% egress на этом индексе.
    const { data, error } = await sb.from('raw_developers').select(`
      airtable_id, logo_url,
      published:data->"Публикация",
      name:data->Developer,
      slug:data->"SEO:Slug"
    `).limit(1000)
    if (error) throw new Error(`raw_developers: ${error.message}`)
    const rows = (data ?? []) as DeveloperSlimRow[]
    if (rows.length === 0) throw new Error('raw_developers returned 0 rows — refusing to cache empty')
    const out: DeveloperLink[] = []
    for (const r of rows) {
      if (r.published !== true) continue
      if (!r.name || !r.slug) continue
      out.push({ name: r.name, slug: r.slug, logoUrl: r.logo_url })
    }
    return out
  },
  ['complex-developers-index-v3'],
  { revalidate: 604800, tags: ['content:developers'] },
)

async function findDeveloperLink(name: string | null): Promise<DeveloperLink | null> {
  if (!name) return null
  const list = await _loadDevelopersIndex()
  const t = name.toLowerCase().trim()
  return list.find(d => d.name.toLowerCase() === t)
    ?? list.find(d => d.name.toLowerCase().includes(t) || t.includes(d.name.toLowerCase()))
    ?? null
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/\s/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}
function strList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
  return []
}
// Turn the raw "Типы юнитов" values into a short, buyer-facing phrase for the
// SEO title — like the competitor's "Apartments, Villas". Detects by substring
// so it survives commas/pipes/array shapes and RU or EN source spellings.
// Hotel/Commercial are dropped (not what a complex buyer searches for).
function unitTypesPhrase(rawTypes: unknown, lang: Lang): string | null {
  const src = strList(rawTypes).join('|').toLowerCase()
  const found: string[] = []
  if (/апартамент|apartment/.test(src)) found.push('apartment')
  if (/вилл|villa/.test(src)) found.push('villa')          // Виллы + Смарт виллы
  if (/таунхаус|townhouse/.test(src)) found.push('townhouse')
  if (/пентхаус|penthouse/.test(src)) found.push('penthouse')
  if (found.length === 0) return null
  // Native unit-type words for every one of the 8 site languages — never fall
  // back to English for de/zh/nl/ban.
  const TYPE_WORDS: Record<Lang, Record<string, string>> = {
    ru: { apartment: 'апартаменты', villa: 'виллы', townhouse: 'таунхаусы', penthouse: 'пентхаусы' },
    en: { apartment: 'Apartments', villa: 'Villas', townhouse: 'Townhouses', penthouse: 'Penthouses' },
    id: { apartment: 'apartemen', villa: 'vila', townhouse: 'rumah bandar', penthouse: 'penthouse' },
    fr: { apartment: 'appartements', villa: 'villas', townhouse: 'maisons de ville', penthouse: 'penthouses' },
    de: { apartment: 'Apartments', villa: 'Villen', townhouse: 'Reihenhäuser', penthouse: 'Penthouses' },
    zh: { apartment: '公寓', villa: '别墅', townhouse: '联排别墅', penthouse: '顶层公寓' },
    nl: { apartment: 'appartementen', villa: "villa's", townhouse: 'herenhuizen', penthouse: 'penthouses' },
    ban: { apartment: 'apartemen', villa: 'vila', townhouse: 'rumah bandar', penthouse: 'penthouse' },
    pl: { apartment: 'apartamenty', villa: 'wille', townhouse: 'domy szeregowe', penthouse: "penthouse'y" },
    uk: { apartment: 'апартаменти', villa: 'вілли', townhouse: 'таунхауси', penthouse: 'пентхауси' },
  }
  // Final connective ("and") per language. Chinese enumerates with '、'.
  const SEP: Record<Lang, string> = {
    ru: ' и ', en: ' & ', id: ' dan ', fr: ' et ', de: ' & ', zh: '、', nl: ' & ', ban: ' dan ',
    pl: ' i ', uk: ' та ',
  }
  const words = found.map(k => (TYPE_WORDS[lang] ?? TYPE_WORDS.en)[k])
  if (words.length === 1) return words[0]
  if (lang === 'zh') return words.join('、')
  return words.slice(0, -1).join(', ') + (SEP[lang] ?? ' & ') + words[words.length - 1]
}

function minMax(nums: number[]): [number, number] | null {
  const v = nums.filter(n => typeof n === 'number' && Number.isFinite(n) && n > 0)
  return v.length ? [Math.min(...v), Math.max(...v)] : null
}
// What the description adds ON TOP of the title, per language. Since the CTR
// sprint the title already carries name, district, bedrooms, price and
// handover year, so a description repeating all of it spent its ~155 visible
// characters saying nothing new — «Surfside Bali — Apartments, Villas &
// Penthouses in Uluwatu, Bali. 50–240 m², 1–4 bedrooms, from $205,000 to
// $799,000. Completion 2026.» against a title that already said Uluwatu,
// 1–4 BR, from $205,000, ready 2026. The space now goes to the two things a
// developer's own site never carries: who built it, and how it compares with rentals nearby.
const CHECK_TAIL: Record<Lang, string> = {
  ru: 'Статус PBG/SLF, планировки, видео с площадки и сравнение с арендой рядом.',
  en: 'PBG/SLF permit status, floor plans, on-site video and nearby rental comparison.',
  id: 'Status izin PBG/SLF, denah, video dari lokasi, dan perbandingan sewa sekitar.',
  fr: 'Statut des permis PBG/SLF, plans, vidéo sur place et comparaison avec les locations voisines.',
  de: 'PBG/SLF-Genehmigungsstatus, Grundrisse, Video vor Ort, Vergleich mit Mieten in der Nähe.',
  zh: 'PBG/SLF 许可状态、户型图、现场视频及周边租金对比。',
  nl: 'Status PBG/SLF-vergunningen, plattegronden, video ter plaatse en vergelijking met huur in de buurt.',
  ban: 'Status izin PBG/SLF, denah, video saking genah, miwah perbandingan sewa ring sekitar.',
  pl: 'Status pozwoleń PBG/SLF, rzuty, wideo z miejsca i porównanie z najmem w okolicy.',
  uk: 'Статус PBG/SLF, планування, відео з майданчика та порівняння з орендою поруч.',
}

/** «от VIBE Development» — застройщик, которого в заголовке нет. */
const BY_DEVELOPER: Record<Lang, (d: string) => string> = {
  ru: d => ` от ${d}`,
  en: d => ` by ${d}`,
  id: d => ` oleh ${d}`,
  fr: d => ` par ${d}`,
  de: d => ` von ${d}`,
  zh: d => `（${d} 开发）`,
  nl: d => ` van ${d}`,
  ban: d => ` saking ${d}`,
  pl: d => ` od ${d}`,
  uk: d => ` від ${d}`,
}

// Competitor-style factual meta description: types + area/bedroom/price ranges
// from the actual units, like "…Apartments & Villas in Bukit, Bali. 45–210 m²,
// 1–3 bedrooms, from $180,000 to $650,000." Returns null when there's no price
// AND no area to state (then we fall back to editorial text).
//
// `priceInTitle` says the commercial title already leads with the price, so the
// range drops out of the description and the freed characters go to CHECK_TAIL.
// When it doesn't (no priced units → fallback title), the price stays here.
function factsDescription(opts: {
  name: string; district: string | null; phrase: string | null; year: string | null
  developer: string | null; priceInTitle: boolean
  prices: number[]; areas: number[]; beds: number[]
}, lang: Lang): string | null {
  const ar = minMax(opts.areas), pr = minMax(opts.prices), br = minMax(opts.beds)
  if (!ar && !pr) return null
  const by = opts.developer ? (BY_DEVELOPER[lang] ?? BY_DEVELOPER.en)(opts.developer) : ''
  const tail = ' ' + (CHECK_TAIL[lang] ?? CHECK_TAIL.en)
  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
  const parts: string[] = []
  if (lang !== 'ru') {
    // Native connective words for each non-RU language — no English leaks for
    // de/zh/nl/ban (or id/fr). Numbers, m², $ prices and place names verbatim.
    // Chinese has no plural forms.
    const FACTS: Record<Exclude<Lang, 'ru'>, {
      complex: string; in: string; bali: string
      bed: (a: number, b: number) => string
      price: (lo: string, hi: string) => string
      completion: (y: string) => string
    }> = {
      en: { complex: 'residential complex', in: 'in', bali: 'Bali',
        bed: (a, b) => a === b ? `${a}-bedroom` : `${a}–${b} bedrooms`,
        price: (lo, hi) => `from ${lo} to ${hi}`, completion: y => ` Completion ${y}.` },
      id: { complex: 'kompleks hunian', in: 'di', bali: 'Bali',
        bed: (a, b) => a === b ? `${a} kamar tidur` : `${a}–${b} kamar tidur`,
        price: (lo, hi) => `dari ${lo} hingga ${hi}`, completion: y => ` Serah terima ${y}.` },
      fr: { complex: 'résidence', in: 'à', bali: 'Bali',
        bed: (a, b) => a === b ? `${a} chambre` : `${a}–${b} chambres`,
        price: (lo, hi) => `de ${lo} à ${hi}`, completion: y => ` Livraison ${y}.` },
      de: { complex: 'Wohnanlage', in: 'in', bali: 'Bali',
        bed: (a, b) => a === b ? `${a} Schlafzimmer` : `${a}–${b} Schlafzimmer`,
        price: (lo, hi) => `von ${lo} bis ${hi}`, completion: y => ` Fertigstellung ${y}.` },
      zh: { complex: '住宅区', in: '位于', bali: '巴厘岛',
        bed: (a, b) => a === b ? `${a} 间卧室` : `${a}–${b} 间卧室`,
        price: (lo, hi) => `${lo} 至 ${hi}`, completion: y => ` 交付 ${y}。` },
      nl: { complex: 'wooncomplex', in: 'in', bali: 'Bali',
        bed: (a, b) => a === b ? `${a} slaapkamer` : `${a}–${b} slaapkamers`,
        price: (lo, hi) => `van ${lo} tot ${hi}`, completion: y => ` Oplevering ${y}.` },
      ban: { complex: 'kompleks', in: 'ring', bali: 'Bali',
        bed: (a, b) => a === b ? `${a} kamar tidur` : `${a}–${b} kamar tidur`,
        price: (lo, hi) => `dari ${lo} hingga ${hi}`, completion: y => ` Serah terima ${y}.` },
      pl: { complex: 'kompleks mieszkaniowy', in: 'w', bali: 'Bali',
        bed: (a, b) => a === b ? `${a} sypialnia` : `${a}–${b} sypialni`,
        price: (lo, hi) => `od ${lo} do ${hi}`, completion: y => ` Oddanie ${y}.` },
      uk: { complex: 'житловий комплекс', in: 'в', bali: 'Балі',
        bed: (a, b) => a === b ? `${a} спальня` : `${a}–${b} спальні`,
        price: (lo, hi) => `від ${lo} до ${hi}`, completion: y => ` Здача ${y}.` },
    }
    const L = FACTS[lang] ?? FACTS.en
    // When the title already carries the unit mix («1–4 BR from $205,000»),
    // repeating «Apartments, Villas & Penthouses» costs ~33 of the ~155
    // visible characters and pushes the check line out of the snippet.
    const head = opts.priceInTitle
      ? `${opts.name}${by}${opts.district ? ` — ${opts.district}` : ''}, ${L.bali}.`
      : `${opts.name}${by} — ${opts.phrase ?? L.complex}${opts.district ? ` ${L.in} ${opts.district}` : ''}, ${L.bali}.`
    if (ar) parts.push(ar[0] === ar[1] ? `${ar[0]} m²` : `${ar[0]}–${ar[1]} m²`)
    if (br && !opts.priceInTitle) parts.push(L.bed(br[0], br[1]))
    if (pr && !opts.priceInTitle) parts.push(pr[0] === pr[1] ? usd(pr[0]) : L.price(usd(pr[0]), usd(pr[1])))
    const facts = parts.length ? ` ${parts.join(', ')}.` : ''
    const year = opts.priceInTitle ? '' : (opts.year ? L.completion(opts.year) : '')
    return `${head}${facts}${year}${tail}`.slice(0, 220)
  }
  const head = opts.priceInTitle
    ? `${opts.name}${by}${opts.district ? ` — ${opts.district}` : ''}, Бали.`
    : `${opts.name}${by} — ${opts.phrase ?? 'жилой комплекс'}${opts.district ? ` в ${opts.district}` : ''}, Бали.`
  if (ar) parts.push(ar[0] === ar[1] ? `${ar[0]} м²` : `${ar[0]}–${ar[1]} м²`)
  if (br && !opts.priceInTitle) parts.push(br[0] === br[1] ? `${br[0]} ${pluralRu(br[0], ['спальня', 'спальни', 'спален'])}` : `${br[0]}–${br[1]} ${pluralRu(br[1], ['спальня', 'спальни', 'спален'])}`)
  if (pr && !opts.priceInTitle) parts.push(pr[0] === pr[1] ? usd(pr[0]) : `от ${usd(pr[0])} до ${usd(pr[1])}`)
  const facts = parts.length ? ` ${parts.join(', ')}.` : ''
  const year = opts.priceInTitle ? '' : (opts.year ? ` Сдача ${opts.year}.` : '')
  return `${head}${facts}${year}${tail}`.slice(0, 220)
}
function parseGeo(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.trim())
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(v) && v.length > 0) return parseGeo(v[0])
  return null
}
function readiness(d: Record<string, unknown>): number {
  // Editorial source-of-truth: «Готовность» в Airtable, число 0..1.
  const raw = d['Готовность']
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const pct = raw <= 1 ? raw * 100 : raw
    return Math.max(0, Math.min(100, Math.round(pct)))
  }
  // Fallback when the editor hasn't filled the field yet.
  const status = (firstString(d['Статус']) ?? '').toLowerCase()
  if (status.includes('построен')) return 100
  if (status.includes('заказ')) return 10
  const yr = Number(firstString(d['Year of completion ']) ?? firstString(d['Year of completion']))
  if (Number.isFinite(yr)) {
    const delta = yr - CURRENT_YEAR
    if (delta <= 0) return 95
    if (delta === 1) return 70
    if (delta === 2) return 45
    if (delta === 3) return 30
    return 20
  }
  return 50
}

// Lightweight index from Storage manifest (avoids 9MB+ raw_complexes full-data query)
type ComplexIndexEntry = { id: string; slug: string; district: string | null }
const COMPLEX_INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/feeds/_complexes-index.json`
const COMPLEX_INDEX_TTL_MS = 30 * 60 * 1000
let _lastGoodComplexIndex: ComplexIndexEntry[] = []

// revisionedCache: an admin edit rewrites _complexes-index.json and bumps the
// `complexes` revision, so a renamed slug or a new complex resolves right
// away instead of 404'ing until the 30-min TTL lapses.
const _loadComplexIndex = revisionedCache(['complexes'], COMPLEX_INDEX_TTL_MS, async (): Promise<ComplexIndexEntry[]> => {
  try {
    const r = await fetch(COMPLEX_INDEX_URL, { next: { revalidate: 604800, tags: ['content:complexes'] } })
    if (!r.ok) throw new Error(`complex index: ${r.status}`)
    const j = await r.json() as { items: ComplexIndexEntry[] }
    const items = j.items ?? []
    if (!items.length) throw new Error('complex index: empty')
    _lastGoodComplexIndex = items
    return items
  } catch (e) {
    // Пустой список не кэшируем — иначе после сбоя на холодном старте все
    // страницы полчаса отдают 404 (см. villy/o/[slug]/_detail.tsx).
    if (_lastGoodComplexIndex.length) return _lastGoodComplexIndex
    throw e
  }
})

const _complexByIdCache = new Map<string, { ts: number; rev: number; row: ComplexRow | null }>()
async function _loadComplexById(id: string): Promise<ComplexRow | null> {
  const rev = await contentRev('complexes')
  const c = _complexByIdCache.get(id)
  if (c && c.rev === rev && Date.now() - c.ts < 5 * 60 * 1000) return c.row
  const [{ data, error }, enCache] = await Promise.all([
    sb.from('raw_complexes').select('airtable_id, data, slug, cover_url').eq('airtable_id', id).maybeSingle(),
    loadAllTranslations('complexes'),
  ])
  // Сбой базы — не «ЖК нет»: бросаем, а не кэшируем null.
  if (error) throw new Error(`raw_complexes ${id}: ${error.message}`)
  const raw = (data as ComplexRow | null) ?? null
  // Same hand-merge as villa/apartment detail loaders — detail page
  // queries raw_complexes directly and bypasses loadAllComplexes.
  const row: ComplexRow | null = raw
    ? { ...raw, data: mergeAllTranslations(raw.data, raw.airtable_id, enCache) }
    : null
  _complexByIdCache.set(id, { ts: Date.now(), rev, row })
  return row
}

const _loadComplexPhotos = unstable_cache(
  async (): Promise<Record<string, string[]>> => {
    try {
      const r = await fetch(cdnManifestUrl(COMPLEX_PHOTO_MANIFEST_URL, 600))
      if (!r.ok) return {}
      return (await r.json()) as Record<string, string[]>
    } catch { return {} }
  },
  ['complex-photo-manifest-detail-v2'],
  { revalidate: 604800, tags: ['content:complexes'] },
)

// Slim-проекция + DB-фильтр по подстроке в SEO:Title.
// Раньше тянули всё (708 строк ~33МБ) и фильтровали в JS по includes()
// — это был один из главных каналов egress. Теперь только те юниты,
// чей SEO:Title содержит имя комплекса (1-30 строк, ~10-50КБ).
type AptRow = {
  airtable_id: string
  complex_name?: string | null
  title: string | null
  title_en: string | null
  slug: string | null
  published: boolean | null
  price_usd: number | null
  price_rub: number | null
  bedrooms: number | null
  area: number | null
  floor: string | null
  opt_photos: unknown
  image_opt: unknown
}
// revisionedCache, а не голый модульный кэш: строки юнитов читаются из БД
// напрямую (_loadApartmentsForComplex), а фото — отсюда. Без ревизии новый
// юнит появлялся на странице ЖК сразу, но с плейсхолдером вместо обложки:
// манифест на тёплом инстансе оставался доревизионным ещё до получаса.
const _loadAptManifest = revisionedCache(['apartments'], 30 * 60 * 1000, async (): Promise<Record<string, string[]>> => {
  const [raw, vision] = await Promise.all([
    fetch(cdnManifestUrl(APT_PHOTO_MANIFEST_URL, 600)).then(r => r.ok ? r.json() : {}).catch(() => ({})) as Promise<Record<string, string[]>>,
    loadVisionManifest('apartment').catch(() => ({})),
  ])
  // Тот же фото-аудит, что в каталоге: выбранная обложка встаёт первой,
  // брак выкидывается. Без него карточки юнитов и попап плана показывали
  // просто первый кадр манифеста — нередко ванную.
  return curateManifest(raw, vision)
})
const APT_UNIT_SELECT = `
    airtable_id,
    complex_name:data->"Комплекс 1",
    title:data->"SEO:Title",
    title_en:data->"SEO:Title EN",
    slug:data->"SEO:Slug",
    published:data->"Опубликовать",
    price_usd:data->price_usd,
    price_rub:data->"Цена",
    bedrooms:data->"Комнаты",
    area:data->"Площадь",
    floor:data->"Этаж",
    opt_photos:data->"Opt photos",
    image_opt:data->"Image Opt"
  `

// Two DB-side ilike passes, merged by id. The title match is what has always
// worked for the Airtable-era rows; the «Комплекс 1» match is what makes a
// unit created in the admin — where the complex is picked from a list rather
// than spelled out in the headline — actually appear on its complex's page.
// PostgREST can't OR two quoted JSONB paths in one request, so this is two
// slim queries instead of one; both sit behind the page's cache.
function mergeUnitRows<T extends { airtable_id: string }>(...batches: (T[] | null)[]): T[] {
  const byId = new Map<string, T>()
  for (const batch of batches) for (const row of batch ?? []) byId.set(row.airtable_id, row)
  return [...byId.values()]
}

// ilike ищет кусок названия, и в «Oasis II» попадали юниты «Oasis III».
// Оставляем только тех, у кого комплекс указан ровно этот, а если поле
// пустое — у кого название комплекса стоит в заголовке целым словом.
function belongsToComplex(row: { complex_name?: string | null; title: string | null }, complexName: string): boolean {
  const name = complexName.trim().toLowerCase()
  const linked = (row.complex_name ?? '').trim().toLowerCase()
  if (linked) return linked === name
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}($|[^\\p{L}\\p{N}])`, 'u').test((row.title ?? '').toLowerCase())
}

async function _loadApartmentsForComplex(complexName: string): Promise<{ rows: AptRow[]; manifest: Record<string, string[]> }> {
  const manifest = await _loadAptManifest()
  const needle = `%${complexName.replace(/[%_]/g, '\\$&')}%`
  const [byTitle, byLink] = await Promise.all([
    sb.from('raw_apartments').select(APT_UNIT_SELECT).ilike(`data->>"SEO:Title"`, needle).limit(200),
    sb.from('raw_apartments').select(APT_UNIT_SELECT).ilike(`data->>"Комплекс 1"`, needle).limit(200),
  ])
  const rows = mergeUnitRows(byTitle.data as AptRow[] | null, byLink.data as AptRow[] | null)
    .filter(r => belongsToComplex(r, complexName))
  return { rows, manifest }
}

async function loadComplexBySlug(slug: string): Promise<ComplexRow | null> {
  // Индекс не загрузился (и прошлой копии нет) — это сбой, а не 404.
  const idx = await _loadComplexIndex().catch((e: unknown) => {
    console.error('[complex]', e instanceof Error ? e.message : e)
    throw e
  })
  const entry = idx.find(c => c.slug === slug)
  if (!entry) return null
  return _loadComplexById(entry.id)
}

// Villas — тот же подход, что и для apartments выше: DB-фильтр по
// SEO:Title + slim projection. Maison Boheme и подобные комплексы
// держат юниты в raw_villas — это нужно догрузить рядом.
type VillaRow = {
  airtable_id: string
  complex_name?: string | null
  title: string | null
  title_en: string | null
  slug: string | null
  published: boolean | null
  price_usd: number | null
  price_rub: number | null
  bedrooms: string | null
  area: number | null
  land: number | null
  district: string | null
  district_alt: string | null
  status: string | null
  opt_photos: unknown
  image_opt: unknown
}
// Тот же ревизионный кэш, что и для апартаментов: правка виллы должна сразу
// доезжать до обложек юнитов на странице ЖК.
const _loadVillaManifest = revisionedCache(['villas'], 30 * 60 * 1000, async (): Promise<Record<string, string[]>> => {
  const [raw, vision] = await Promise.all([
    fetch(cdnManifestUrl(VILLA_PHOTO_MANIFEST_URL, 600)).then(r => r.ok ? r.json() : {}).catch(() => ({})) as Promise<Record<string, string[]>>,
    loadVisionManifest('villa').catch(() => ({})),
  ])
  return curateManifest(raw, vision)
})
const VILLA_UNIT_SELECT = `
    airtable_id,
    complex_name:data->"Комплекс 1",
    title:data->"SEO:Title",
    title_en:data->"SEO:Title EN",
    slug:data->"SEO:Slug",
    published:data->"Опубликовать",
    price_usd:data->price,
    price_rub:data->"Цена",
    bedrooms:data->"Комнаты",
    area:data->"Площадь",
    land:data->"Земля",
    district:data->"Location 2",
    district_alt:data->Location,
    status:data->"Статус",
    opt_photos:data->"Opt photos",
    image_opt:data->"Image Opt"
  `

async function _loadVillasForComplex(complexName: string): Promise<{ rows: VillaRow[]; manifest: Record<string, string[]> }> {
  const manifest = await _loadVillaManifest()
  const needle = `%${complexName.replace(/[%_]/g, '\\$&')}%`
  const [byTitle, byLink] = await Promise.all([
    sb.from('raw_villas').select(VILLA_UNIT_SELECT).ilike(`data->>"SEO:Title"`, needle).limit(200),
    sb.from('raw_villas').select(VILLA_UNIT_SELECT).ilike(`data->>"Комплекс 1"`, needle).limit(200),
  ])
  const rows = mergeUnitRows(byTitle.data as VillaRow[] | null, byLink.data as VillaRow[] | null)
    .filter(r => belongsToComplex(r, complexName))
  return { rows, manifest }
}

type ApartmentUnit = ApartmentCardData & { id: string; kind: 'apartment' }
type VillaUnit = VillaCardData & { id: string; kind: 'villa' }
type Unit = ApartmentUnit | VillaUnit

async function loadUnitsInComplex(complexName: string, lang: Lang = 'ru'): Promise<Unit[]> {
  if (complexName.length < 3) return []
  const [apt, vil] = await Promise.all([
    _loadApartmentsForComplex(complexName),
    _loadVillasForComplex(complexName),
  ])

  const units: Unit[] = []
  const seenSlug = new Set<string>()

  for (const r of apt.rows) {
    if (r.published !== true) continue
    if (!r.title || !r.slug || r.slug.startsWith('-')) continue
    if (seenSlug.has('a:' + r.slug)) continue
    seenSlug.add('a:' + r.slug)
    // SEO:Title EN comes back as { state, value } wrapper for some rows,
    // so unwrap through firstString before .replace — otherwise we'd
    // hit "replace is not a function" on the EN tree.
    const titleRawSrc = (lang !== 'ru' ? firstString(r.title_en) : null) ?? r.title
    const titleSource = lang !== 'ru' && lang !== 'uk' && titleRawSrc && hasCyrillic(titleRawSrc) ? translitPreserveCase(titleRawSrc) : titleRawSrc
    const title = titleSource.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
    units.push({
      kind: 'apartment',
      id: r.airtable_id,
      slug: r.slug,
      title,
      priceUsd: r.price_usd ?? r.price_rub,
      bedrooms: r.bedrooms,
      area: r.area,
      floor: r.floor,
      photos: apt.manifest[r.airtable_id] ?? [],
    })
  }

  // Villas: dedupe by airtable_id (slug clashes between physical units in
  // the same project are meaningful — show each unit).
  const seenVillaId = new Set<string>()
  for (const r of vil.rows) {
    if (r.published !== true) continue
    if (!r.title || !r.slug || r.slug.startsWith('-')) continue
    if (seenVillaId.has(r.airtable_id)) continue
    seenVillaId.add(r.airtable_id)
    const titleRawSrc = (lang !== 'ru' ? firstString(r.title_en) : null) ?? r.title
    const titleSource = lang !== 'ru' && lang !== 'uk' && titleRawSrc && hasCyrillic(titleRawSrc) ? translitPreserveCase(titleRawSrc) : titleRawSrc
    const title = titleSource.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
    units.push({
      kind: 'villa',
      id: r.airtable_id,
      slug: r.slug,
      title,
      priceUsd: r.price_usd ?? r.price_rub,
      bedrooms: numberOrNull(r.bedrooms),
      area: r.area,
      land: r.land,
      district: r.district ?? r.district_alt,
      status: r.status,
      photos: vil.manifest[r.airtable_id] ?? [],
    })
  }

  units.sort((a, b) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity))
  return units
}

async function loadChessBoardVillas(complexId: string): Promise<ChessBoardVilla[]> {
  if (complexId !== 'adm_ecowood_001') return []
  const { data } = await sb.from('raw_villas')
    .select('airtable_id, data')
    .like('airtable_id', 'adm_ecowood_%')
  if (!data) return []
  return data
    .map(r => {
      const d = r.data as Record<string, unknown>
      const unit = parseInt(String(r.airtable_id).replace('adm_ecowood_v', ''), 10)
      return {
        unit,
        bedrooms: Number(d['Спальни']) || 1,
        area: Number(d['Площадь']) || 70,
        price: Number(d['Цена']) || 159000,
        sold: d['Продано'] === true || d['Продано'] === 'true',
        slug: String(d['SEO:Slug'] ?? ''),
      }
    })
    .filter(v => v.slug && v.unit >= 1 && v.unit <= 10)
    .sort((a, b) => a.unit - b.unit)
}

export async function generateComplexMetadata(slug: string, lang: Lang) {
  const c = await loadComplexBySlug(slug)
  if (!c) return { robots: { index: false } }
  const copy = pickCopy(COPY, lang)
  // Сгенерированная копия — русская; остальные локали идут прежним путём.
  const gen = lang === 'ru' ? await loadListingCopy('complex', c.airtable_id) : null
  const name = firstString(c.data['Project']) ?? slug
  const districtRaw = firstString(c.data['Location 2']) ?? firstString(c.data['Location'])
  const district = lang === 'ru' ? districtRu(districtRaw) : districtLatin(districtRaw)
  // Localize unit-type labels for the fallback description too — raw Airtable
  // values are Russian, so non-RU langs would otherwise show Cyrillic types.
  const typesArr = strList(c.data['Типы юнитов'])
  const types = (lang === 'ru' ? typesArr : typesArr.map(t => facetLabel('type', t, lang))).join(', ')
  const yearRaw = completionLabel(firstString(c.data['Year of completion ']) ?? firstString(c.data['Year of completion']), lang)
  const seoText = tField(c.data, 'SEO Text', lang)
    ?? tField(c.data, 'Описание', lang)
    ?? firstString(c.data['ИИ Описание 2'])
  // Facts-first snippet — types + area/bedroom/price ranges from the real
  // units (like competitors). Falls back to editorial text, then the generic
  // line, when the complex has no priced/measured units.
  const units = await loadUnitsInComplex(name, lang).catch(() => [] as Awaited<ReturnType<typeof loadUnitsInComplex>>)
  // CTR sprint: the old title spent its visible ~60 characters on unit types
  // and never showed a price, so brand queries («surfside bali», 822
  // impressions at position 7.9) converted at under 2%. Lead with price and
  // readiness — the units are already loaded above, so this costs nothing.
  // Falls back when the complex has no priced units.
  const unitPrices = units.map(u => Number(u.priceUsd)).filter(n => Number.isFinite(n) && n > 0)
  const unitBeds = units.map(u => Number(u.bedrooms)).filter(n => Number.isFinite(n) && n > 0)
  const commercialTitle = commercialComplexTitle({
    name,
    district,
    priceFromUsd: unitPrices.length ? Math.min(...unitPrices) : null,
    bedsMin: unitBeds.length ? Math.min(...unitBeds) : null,
    bedsMax: unitBeds.length ? Math.max(...unitBeds) : null,
    year: yearRaw,
    lang,
  })
  // Built AFTER the title so the description knows what the title already
  // said and can spend its characters on something else.
  const facts = factsDescription({
    name, district, phrase: unitTypesPhrase(c.data['Типы юнитов'], lang), year: yearRaw,
    developer: firstString(c.data['Developer1']) ?? firstString(c.data['Developer']),
    priceInTitle: commercialTitle !== null,
    prices: units.map(u => Number(u.priceUsd)).filter(n => Number.isFinite(n)),
    areas: units.map(u => Number(u.area)).filter(n => Number.isFinite(n)),
    beds: units.map(u => Number(u.bedrooms)).filter(n => Number.isFinite(n)),
  }, lang)
  const description = (gen?.meta ? metaSnippet(gen.meta) : undefined)
    ?? facts
    ?? (seoText
      ? metaSnippet(seoText)
      : copy.fallbackDesc(name, district, types, yearRaw))
  const ruPath = `/ru/zhilye-kompleksy/o/${slug}`
  const path = switchLangPath(ruPath, lang)
  return {
    title: commercialTitle ?? gen?.title ?? copy.titlePart(name, district, unitTypesPhrase(c.data['Типы юнитов'], lang)),
    description,
    alternates: {
      canonical: path,
      languages: hreflangMap(ruPath),
    },
    openGraph: {
      title: copy.ogTitle(name),
      description,
      type: 'website' as const,
      url: `${SITE_URL}${path}`,
      images: c.cover_url ? [{ url: c.cover_url }] : [],
    },
  }
}

export async function ComplexDetail({ slug, lang }: { slug: string; lang: Lang }) {
  const copy = pickCopy(COPY, lang)
  const c = await loadComplexBySlug(slug)
  if (!c) notFound()

  const d = c.data
  const name = firstString(d['Project'])
  if (!name) notFound()
  // Hidden developers must not appear anywhere (lib/hidden-developers.ts).
  if (isHiddenDeveloper(firstString(d['Developer1']), firstString(d['Варианты поиска застройщика']))) notFound()
  const [photoManifest, units, geoFacts, chessBoardVillas, rdtrHit] = await Promise.all([
    _loadComplexPhotos(),
    loadUnitsInComplex(name, lang),
    loadGeoFacts('complex', c.airtable_id).catch(() => null),
    loadChessBoardVillas(c.airtable_id),
    // Зоны плана застройки вокруг — вкладка «Зоны» и проверка участка, как у вилл.
    loadRdtr(c.airtable_id, slug).catch(() => null),
  ])

  // Балл востребованности грузится после units, а не в общем Promise.all:
  // ключом служат их airtable_id, которые до загрузки юнитов неизвестны.
  const demandByUnit = await loadUnitDemand(
    units.map(u => ({ kind: u.kind, airtableId: u.id })),
    lang,
  ).catch(() => ({}) as Record<string, UnitDemand>)

  const photos = (photoManifest[c.airtable_id] ?? []).slice(0, 12)
  const slidesPhotos = photos.length > 0 ? photos : c.cover_url ? [c.cover_url] : []
  const districtRaw = firstString(d['Location 2']) ?? firstString(d['Location'])
  const district = lang === 'ru' ? districtRu(districtRaw) : districtLatin(districtRaw)
  const districtSlug = districtRaw ? DISTRICT_TO_SLUG[districtRaw] ?? null : null
  // Status / permits are stored as RU labels in Airtable — translate them to
  // localized labels for the non-RU tree so we don't print «Строится» on /en/.
  // Unit types go through the central facetLabel map (see below).
  const STATUS_EN: Record<string, string> = {
    'Строится': 'Under construction',
    'Построен': 'Completed',
    'Сдан': 'Completed',
    'Под заказ': 'On request',
    'Готов': 'Ready',
  }
  const STATUS_ID: Record<string, string> = {
    'Строится': 'Dalam pembangunan',
    'Построен': 'Selesai',
    'Сдан': 'Selesai',
    'Под заказ': 'Sesuai permintaan',
    'Готов': 'Siap',
  }
  const STATUS_FR: Record<string, string> = {
    'Строится': 'En construction',
    'Построен': 'Livré',
    'Сдан': 'Livré',
    'Под заказ': 'Sur demande',
    'Готов': 'Prêt',
  }
  const STATUS_MORE: Partial<Record<Lang, Record<string, string>>> = {
    de: { 'Строится': 'Im Bau', 'Построен': 'Fertiggestellt', 'Сдан': 'Fertiggestellt', 'Под заказ': 'Auf Anfrage', 'Готов': 'Bezugsfertig' },
    zh: { 'Строится': '在建', 'Построен': '已竣工', 'Сдан': '已竣工', 'Под заказ': '按需定制', 'Готов': '现房' },
    nl: { 'Строится': 'In aanbouw', 'Построен': 'Opgeleverd', 'Сдан': 'Opgeleverd', 'Под заказ': 'Op aanvraag', 'Готов': 'Gereed' },
    ban: { 'Строится': 'Kantun kabangun', 'Построен': 'Sampun puput', 'Сдан': 'Sampun puput', 'Под заказ': 'Manut pangidih', 'Готов': 'Sampun sayaga' },
    pl: { 'Строится': 'W budowie', 'Построен': 'Oddany', 'Сдан': 'Oddany', 'Под заказ': 'Na zamówienie', 'Готов': 'Gotowy' },
    uk: { 'Строится': 'Будується', 'Построен': 'Збудовано', 'Сдан': 'Здано', 'Под заказ': 'Під замовлення', 'Готов': 'Готовий' },
  }
  const STATUS_MAP = lang === 'id' ? STATUS_ID : lang === 'fr' ? STATUS_FR : STATUS_MORE[lang] ?? STATUS_EN
  const enLabelFor = (map: Record<string, string>, v: string | null): string | null => v ? (lang === 'ru' ? v : (map[v] ?? v)) : null
  const typesRaw = strList(d['Типы юнитов'])
  // Central facetLabel covers all 8 langs + translit fallback → never Cyrillic on non-RU.
  const types = lang === 'ru' ? typesRaw : typesRaw.map(t => facetLabel('type', t, lang))
  const statusRaw = firstString(d['Статус'])
  const status = enLabelFor(STATUS_MAP, statusRaw)
  const salesStatus = firstString(d['Статус продаж'])
  const isSold = salesStatus === 'Продано'
  // Permit is a free-text combo of Russian status words + acronyms (PBG/SLF/
  // RDTR). Translate the Russian tokens for non-RU; acronyms pass through.
  const PERMIT_TOKENS: Partial<Record<Lang, Record<string, string>>> & { en: Record<string, string> } = {
    en: { 'Заявка': 'Applied', 'заявка': 'applied', 'Подано': 'Submitted', 'подано': 'submitted', 'Получено': 'Obtained', 'получено': 'obtained', 'В процессе': 'In progress', 'в процессе': 'in progress', 'Оформляется': 'In progress', 'оформляется': 'in progress', 'Есть': 'Yes', 'есть': 'yes', 'нет': 'none' },
    id: { 'Заявка': 'Diajukan', 'заявка': 'diajukan', 'Подано': 'Diajukan', 'подано': 'diajukan', 'Получено': 'Diterima', 'получено': 'diterima', 'В процессе': 'Dalam proses', 'в процессе': 'dalam proses', 'Оформляется': 'Dalam proses', 'оформляется': 'dalam proses', 'Есть': 'Ada', 'есть': 'ada', 'нет': 'tidak ada' },
    fr: { 'Заявка': 'Demande déposée', 'заявка': 'demande déposée', 'Подано': 'Déposé', 'подано': 'déposé', 'Получено': 'Obtenu', 'получено': 'obtenu', 'В процессе': 'En cours', 'в процессе': 'en cours', 'Оформляется': 'En cours', 'оформляется': 'en cours', 'Есть': 'Oui', 'есть': 'oui', 'нет': 'aucun' },
    de: { 'Заявка': 'Beantragt', 'заявка': 'beantragt', 'Подано': 'Eingereicht', 'подано': 'eingereicht', 'Получено': 'Erteilt', 'получено': 'erteilt', 'В процессе': 'In Bearbeitung', 'в процессе': 'in Bearbeitung', 'Оформляется': 'In Bearbeitung', 'оформляется': 'in Bearbeitung', 'Есть': 'Vorhanden', 'есть': 'vorhanden', 'нет': 'keine' },
    zh: { 'Заявка': '已申请', 'заявка': '已申请', 'Подано': '已提交', 'подано': '已提交', 'Получено': '已取得', 'получено': '已取得', 'В процессе': '办理中', 'в процессе': '办理中', 'Оформляется': '办理中', 'оформляется': '办理中', 'Есть': '有', 'есть': '有', 'нет': '无' },
    nl: { 'Заявка': 'Aangevraagd', 'заявка': 'aangevraagd', 'Подано': 'Ingediend', 'подано': 'ingediend', 'Получено': 'Verkregen', 'получено': 'verkregen', 'В процессе': 'In behandeling', 'в процессе': 'in behandeling', 'Оформляется': 'In behandeling', 'оформляется': 'in behandeling', 'Есть': 'Aanwezig', 'есть': 'aanwezig', 'нет': 'geen' },
    ban: { 'Заявка': 'Sampun kaajuang', 'заявка': 'sampun kaajuang', 'Подано': 'Sampun kaaturang', 'подано': 'sampun kaaturang', 'Получено': 'Sampun kapolihang', 'получено': 'sampun kapolihang', 'В процессе': 'Kantun kaproses', 'в процессе': 'kantun kaproses', 'Оформляется': 'Kantun kaproses', 'оформляется': 'kantun kaproses', 'Есть': 'Wenten', 'есть': 'wenten', 'нет': 'nenten wenten' },
    pl: { 'Заявка': 'Złożony wniosek', 'заявка': 'złożony wniosek', 'Подано': 'Złożono', 'подано': 'złożono', 'Получено': 'Uzyskano', 'получено': 'uzyskano', 'В процессе': 'W trakcie', 'в процессе': 'w trakcie', 'Оформляется': 'W trakcie', 'оформляется': 'w trakcie', 'Есть': 'Jest', 'есть': 'jest', 'нет': 'brak' },
    uk: { 'Заявка': 'Заявка', 'заявка': 'заявка', 'Подано': 'Подано', 'подано': 'подано', 'Получено': 'Отримано', 'получено': 'отримано', 'В процессе': 'У процесі', 'в процессе': 'у процесі', 'Оформляется': 'Оформлюється', 'оформляется': 'оформлюється', 'Есть': 'Є', 'есть': 'є', 'нет': 'немає' },
  }
  const translatePermit = (v: string | null): string | null => {
    if (!v || lang === 'ru') return v
    let out = v
    const tokens = PERMIT_TOKENS[lang] ?? PERMIT_TOKENS.en
    for (const [ru, tr] of Object.entries(tokens)) out = out.split(ru).join(tr)
    return out
  }
  const permitRaw = firstString(d['Разрешительные документы'])
  const permit = translatePermit(permitRaw)
  const hasPermit = !!permitRaw && permitRaw.toLowerCase() !== 'нет'
  const yearRaw = firstString(d['Year of completion ']) ?? firstString(d['Year of completion'])
  const totalUnits = numberOrNull(d['Total quantity of units'])
  const lease = firstString(d['Leasehold']) ?? firstString(d['Leashold'])
  const leaseYears = lease != null && Number.isFinite(Number(lease)) && Number(lease) > 0 ? Number(lease) : null
  const developerName = firstString(d['Developer1']) ?? firstString(d['Варианты поиска застройщика'])
  const managers = await loadManagersByDeveloperName(developerName)
  const devStats = await getDeveloperStats(developerName)
  // Resolve the developer by name → slug + logo so we can link to
  // /ru/zastrojshhiki/<slug> directly instead of just to the
  // developers index.
  const developerLink = await findDeveloperLink(developerName)

  // On-page admin editing: tag a field so components/InlineEditor turns it into
  // a click-to-edit target for a logged-in admin. Only on RU — RU is the source
  // of truth; other languages are derived translations, so editing there would
  // write the wrong layer. Harmless no-op attrs for everyone else.
  const edit = (field: string, kind: 'text' | 'longtext', label: string): Record<string, string> =>
    lang === 'ru'
      ? { 'data-edit-collection': 'complexes', 'data-edit-id': c.airtable_id, 'data-edit-field': field, 'data-edit-kind': kind, 'data-edit-label': label }
      : {}
  const lat = parseGeo(d['Geo'])
  const lng = parseGeo(d['Geo 2'])
  const nativeBody = tField(d, 'SEO Text', lang)
    ?? tField(d, 'Описание', lang)
  const rawBody = firstString(d['ИИ Описание 2'])
    ?? firstString(d['ИИ Описание'])
  const seoText = nativeBody ?? rawBody
  const kb = await loadKbPageContent('complex', c.airtable_id, lang)
  // Правка редактора бьёт любой сгенерированный текст — иначе блок «О
  // комплексе» нечем отредактировать (см. lib/complex-description.ts).
  // Только RU: это язык-источник, у остальных свой перевод в KB, а
  // транслитерация русского на них выглядела бы мусором.
  const manualBody = lang === 'ru' ? firstString(d[COMPLEX_DESCRIPTION_FIELD]) : null
  // Non-RU: prefer the native-language field over the RU/EN-only KB body.
  const pageBody = manualBody ?? (lang === 'ru'
    ? (kb?.body ?? seoText)
    : (nativeBody ?? kb?.body ?? rawBody))
  const vision = await loadListingVision('complex', c.airtable_id)
  const photoAlts = slidesPhotos.map((_, i) => altFor(vision, i, lang, name))
  // На странице комплекса — генплан, без планировок отдельных вилл и квартир
  // (они на страницах юнитов; владелец 2026-11-10).
  const complexPlans = curatePhotos(photoManifest[c.airtable_id] ?? [], vision).masterplans

  const ready = readiness(d)
  const complexVideos = await loadVideosByComplexSlug(slug, 6, lang).catch(() => [])

  // Nearby places — по id комплекса, иначе по первому юниту с данными: юниты
  // комплекса стоят на его же участке, их окружение — окружение комплекса.
  let nearby: Awaited<ReturnType<typeof loadNearbyPlaces>> = await loadNearbyPlaces(c.airtable_id).catch(() => null)
  for (const u of nearby ? [] : units) {
    const data = await loadNearbyPlaces(u.id).catch(() => null)
    if (data) { nearby = data; break }
  }

  // Interactive visualisation — if the admin built one for this
  // complex, load its layer tree + hotspots and the unit info bag
  // hotspots can point at. listLayers / listHotspots already swallow the
  // migration-missing case server-side — extra .catch as belt-and-suspenders.
  const vizLayers = await listLayers(c.airtable_id).catch(() => [] as Awaited<ReturnType<typeof listLayers>>)
  const vizHotspots = vizLayers.length > 0
    ? await listHotspots(vizLayers.map(l => l.id)).catch(() => [] as Awaited<ReturnType<typeof listHotspots>>)
    : []

  // Солнечно-теневая модель. Обмер генплана лежит в коде, ориентация и
  // высоты — в БД, их выставляет админ в /admin/sun/<slug>. Пока он не
  // включил `enabled`, вкладки нет вовсе.
  const sunPlan = await loadSitePlan(slug)
  // Документы ЖК — из базы (site_content), запасные значения в коде.
  const complexDocsData = await loadComplexDocs(slug)
  const sunSettings = sunPlan
    ? await loadSunSettings(slug).catch(() => null)
    : null
  // For the popup we prefer the optimised single-image attachment
  // (`Opt photos` / `Image Opt`) over the full-quality first photo.
  function attachmentUrl(v: unknown): string | null {
    if (!Array.isArray(v) || v.length === 0) return null
    const first = v[0]
    if (first && typeof first === 'object' && 'url' in first && typeof (first as { url: unknown }).url === 'string') {
      const url = (first as { url: string }).url
      // Ссылки на вложения Airtable подписаны и протухают, а сам Airtable
      // отключён 22.07.2026 — такие URL отдают битую картинку. Считаем их
      // отсутствующими, чтобы попап взял фото из манифеста в Storage.
      return isAirtableAttachment(url) ? null : url
    }
    return null
  }
  // Per-complex slim fetch (same DB-filter + projection как
  // loadUnitsInComplex). Нужно для попап-фото на карте: Opt photos /
  // Image Opt не пробрасываются через units[].
  const [aptForOpt, vilForOpt] = await Promise.all([
    _loadApartmentsForComplex(name),
    _loadVillasForComplex(name),
  ])
  const aptRowsById = new Map(aptForOpt.rows.map(r => [r.airtable_id, r]))
  const vilRowsById = new Map(vilForOpt.rows.map(r => [r.airtable_id, r]))

  const unitInfoBySlug: Record<string, {
    kind: 'villa' | 'apartment'; slug: string; title: string;
    bedrooms: number | null; area: number | null; priceUsd: number | null;
    url: string; photoUrl: string | null;
  }> = {}
  for (const u of units) {
    const path = u.kind === 'villa'
      ? switchLangPath(`/ru/villy/o/${u.slug}`, lang)
      : switchLangPath(`/ru/apartamenty/o/${u.slug}`, lang)
    const row = (u.kind === 'villa' ? vilRowsById : aptRowsById).get(u.id)
    const optUrl = row
      ? (attachmentUrl(row.opt_photos) ?? attachmentUrl(row.image_opt))
      : null
    unitInfoBySlug[u.slug] = {
      kind: u.kind,
      slug: u.slug,
      title: u.title,
      bedrooms: u.bedrooms,
      area: u.area,
      priceUsd: u.priceUsd,
      url: path,
      photoUrl: optUrl ?? u.photos?.[0] ?? null,
    }
  }

  // kb.faq is EN-only (KB stores RU + EN). For non-RU pages prefer the native
  // localized copy.faq(...) template so de/zh/nl/id/fr/ban don't render English.
  const faqItems = lang === 'ru'
    ? ((kb?.faq && kb.faq.length) ? kb.faq : copy.faq(name, district, lease))
    : copy.faq(name, district, lease)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  }

  // Locale-aware path roots used in breadcrumbs / internal links.
  const home = switchLangPath('/ru', lang)
  const complexesRoot = switchLangPath('/ru/zhilye-kompleksy', lang)
  const developersRoot = switchLangPath('/ru/zastrojshhiki', lang)
  const detailUrl = `${SITE_URL}${switchLangPath(`/ru/zhilye-kompleksy/o/${slug}`, lang)}`

  // ApartmentComplex schema (Google understands it)
  const placeJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ApartmentComplex',
    name,
    url: detailUrl,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'ID',
      addressRegion: 'Bali',
      addressLocality: districtRaw ?? 'Bali',
    },
  }
  if (slidesPhotos.length > 0) placeJsonLd.image = slidesPhotos.slice(0, 5)
  if (seoText) placeJsonLd.description = seoText.slice(0, 500)
  if (lat != null && lng != null) {
    placeJsonLd.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng }
  }
  if (totalUnits != null) placeJsonLd.numberOfAccommodationUnits = totalUnits

  // Price markup for the complex: AggregateOffer over the priced units
  // (one complex, many priced units, a low/high band rather than one price).
  const complexPrices = units
    .map(u => Number(u.priceUsd))
    .filter(n => Number.isFinite(n) && n > 0)
  const productJsonLd: Record<string, unknown> | null = complexPrices.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        url: detailUrl,
        category: 'Residential complex',
        // Бренд и продавец — застройщик, если известен; не «Balinsky».
        ...(developerName ? { brand: { '@type': 'Brand', name: developerName } } : {}),
        description: (seoText ?? name).slice(0, 500),
        ...(slidesPhotos.length > 0 ? { image: slidesPhotos.slice(0, 5) } : {}),
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          lowPrice: Math.round(Math.min(...complexPrices)),
          highPrice: Math.round(Math.max(...complexPrices)),
          offerCount: complexPrices.length,
          url: detailUrl,
          ...(developerName ? { seller: { '@type': 'Organization', name: developerName } } : {}),
        },
      }
    : null

  // ── Макет CxA (владелец 20.11.2026): страница ЖК в стиле «Журнал», как вилла ──
  const lower = (s: string) => (lang === 'de' ? s : s.toLowerCase())
  const minOf = (kind: 'villa' | 'apartment') => {
    const xs = units.filter(u => u.kind === kind).map(u => Number(u.priceUsd)).filter(n => Number.isFinite(n) && n > 0)
    return xs.length ? Math.min(...xs) : null
  }
  const aptFrom = minOf('apartment')
  const villaFrom = minOf('villa')
  const minPrice = complexPrices.length ? Math.min(...complexPrices) : null
  const FROM = pickCopy({ ru: 'от', en: 'from', id: 'mulai', fr: 'dès', de: 'ab', zh: '起', nl: 'vanaf', ban: 'ngawit', pl: 'od', uk: 'від' }, lang)
  const PRICE_ROWS = pickCopy({
    ru: { apt: 'Апартаменты', villa: 'Виллы', label: 'Цены' },
    en: { apt: 'Apartments', villa: 'Villas', label: 'Prices' },
    id: { apt: 'Apartemen', villa: 'Vila', label: 'Harga' },
    fr: { apt: 'Appartements', villa: 'Villas', label: 'Prix' },
    de: { apt: 'Apartments', villa: 'Villen', label: 'Preise' },
    zh: { apt: '公寓', villa: '别墅', label: '价格' },
    nl: { apt: 'Appartementen', villa: "Villa's", label: 'Prijzen' },
    ban: { apt: 'Apartemen', villa: 'Vila', label: 'Aji' },
    pl: { apt: 'Apartamenty', villa: 'Wille', label: 'Ceny' },
    uk: { apt: 'Апартаменти', villa: 'Вілли', label: 'Ціни' },
  }, lang)
  const priceRowsData = [
    aptFrom != null && { key: 'apt', label: PRICE_ROWS.apt, usd: aptFrom },
    villaFrom != null && { key: 'villa', label: PRICE_ROWS.villa, usd: villaFrom },
  ].filter(Boolean) as { key: string; label: string; usd: number }[]
  // Строки «Апартаменты — от X» / «Виллы — от Y»: цена в валюте посетителя (клиент).
  const priceRows = () => priceRowsData.length > 0 && (
    <span key="rows" className="flex flex-col">
      {priceRowsData.map(r => (
        <span key={r.key} className="flex items-baseline justify-between gap-4 border-b border-[#ECEFED] py-2 last:border-b-0">
          <span className="text-[15px] text-[#4A5550]">{r.label}</span>
          <PriceCtaCard compact="sm" priceUsd={r.usd} pricePrefix={FROM} presentationButton={null} />
        </span>
      ))}
    </span>
  )
  const m0 = managers[0]
  // Языки менеджера не показываем (владелец убрал).
  const leadManager = m0 ? {
    photo: m0.photo ?? null,
    name: lang === 'ru' ? m0.name : (m0.nameEn || (hasCyrillic(m0.name) ? translitPreserveCase(m0.name) : m0.name)),
    langs: [] as string[],
  } : null
  const leadOn = !isSold && (priceRowsData.length > 0 || !!m0)
  const leadCard = (id: string, framed: boolean) => (
    <LeadHeroCard key={id} id={id} framed={framed} lang={lang} price={priceRows()} priceLabel={PRICE_ROWS.label}
      manager={leadManager} developerName={developerName ?? null} managerName={m0?.name ?? null} managerId={m0?.id ?? null} listingTitle={name} />
  )
  const stickyPrice = () => minPrice != null && (
    <PriceCtaCard key="p-sm" compact="sm" priceUsd={minPrice} pricePrefix={FROM} presentationButton={null} />
  )

  // Сохранить (ЖК в избранном), поделиться, сообщить об ошибке — значками на фото.
  const complexWishlist = {
    kind: 'complex' as const, slug, title: name,
    photo: slidesPhotos[0] ?? null,
    priceUsd: null,
    district: district ?? null,
    bedrooms: null,
    completionYear: yearRaw ?? null,
    status: status ?? null,
    readinessPct: ready,
    developerName: developerName ?? null,
    developerCompletedCount: devStats?.ready ?? null,
    developerInProgressCount: devStats?.inProgress ?? null,
  }
  const complexActions = () => (
    <VillaActions key="ca" icons lang={lang} title={name} item={complexWishlist} />
  )

  // Строка под названием: типы · юниты · сдача · аренда земли.
  const built = !!statusRaw && /построен|сдан|готов/i.test(statusRaw)
  const yearLabel = yearRaw ? completionLabel(yearRaw, lang) : null
  const BUILT_IN = pickCopy({
    ru: (y: string) => `сдан в ${y}`, en: (y: string) => `completed ${y}`, id: (y: string) => `selesai ${y}`,
    fr: (y: string) => `livré en ${y}`, de: (y: string) => `fertiggestellt ${y}`, zh: (y: string) => `${y} 已交付`,
    nl: (y: string) => `opgeleverd ${y}`, ban: (y: string) => `puput ${y}`, pl: (y: string) => `ukończony ${y}`, uk: (y: string) => `зданий у ${y}`,
  }, lang)
  const LEASE_LINE = pickCopy({
    ru: (n: number) => `аренда земли ${n} ${pluralRu(n, ['год', 'года', 'лет'])}`, en: (n: number) => `${n}-year land lease`,
    id: (n: number) => `sewa tanah ${n} tahun`, fr: (n: number) => `bail de ${n} ans`, de: (n: number) => `${n} Jahre Landpacht`,
    zh: (n: number) => `土地租期 ${n} 年`, nl: (n: number) => `grondpacht ${n} jaar`, ban: (n: number) => `sewa tanah ${n} warsa`,
    pl: (n: number) => `dzierżawa gruntu ${n} lat`, uk: (n: number) => `оренда землі ${n} років`,
  }, lang)
  // Подпись плитки — «аренда земли», как у виллы, а не «лизхолд».
  const LEASE_LBL = { ru: 'аренда земли', en: 'land lease', id: 'sewa tanah', fr: 'bail du terrain', de: 'Landpacht', zh: '土地租期', nl: 'grondpacht', ban: 'sewa tanah', pl: 'dzierżawa gruntu', uk: 'оренда землі' }
  const typesPhrase = unitTypesPhrase(d['Типы юнитов'], lang)
  const keyLine = [
    typesPhrase ? typesPhrase.charAt(0).toUpperCase() + typesPhrase.slice(1) : null,
    totalUnits != null ? copy.units(totalUnits) : null,
    built ? (yearLabel ? BUILT_IN(yearLabel) : copy.completed) : yearLabel ? copy.completion(yearLabel) : null,
    leaseYears != null ? LEASE_LINE(Math.round(leaseYears)) : null,
    isSold ? lower(copy.sold) : null,
  ].filter(Boolean).join(' · ')

  // Рассрочка («Payment plan,%») — как у виллы: «30 / 20 / 50%», срок отдельно.
  const PLAN_LABEL = { ru: 'Рассрочка', en: 'Payment plan', id: 'Cicilan', fr: 'Échéancier', de: 'Ratenplan', zh: '分期付款', nl: 'Betaalplan', ban: 'Cicilan', pl: 'Raty', uk: 'Розстрочка' }
  const plan = (() => {
    const raw = (firstString(d['Payment plan,%']) ?? '').replace(/\s+/g, ' ').trim()
    if (!raw || raw.includes('...') || /^100\s*%?$/.test(raw)) return null
    const m = raw.match(/^(.*?)\s*\/\s*(\d+)$/)
    // Доли в процентах; бронь суммой («1500$ + 35% + 65%») в строку не берём.
    const parts = (m ? m[1] : raw).split('+').map(x => x.replace(/[^\d.]/g, '')).filter(x => x && Number(x) <= 100)
    if (parts.length < 2) return null
    return { v: `${parts.join(' / ')}%`, months: m ? Number(m[2]) : null }
  })()
  const airportMin = geoFacts?.routes?.airport?.s ? Math.round(geoFacts.routes.airport.s / 60) : null
  const airportText = airportMin != null ? null : fmtAirportDistance(lat, lng, lang)
  const permitShort = hasPermit && permit && permit.length <= 14
  // «01 Комплекс» — крупные цифры с подписью, как «Объект» у виллы.
  const objTiles = [
    totalUnits != null && { v: String(totalUnits), l: lower(copy.factUnits) },
    (built || yearLabel) && { v: yearLabel ?? '✓', l: lower(built ? copy.factCompletionDone : copy.factCompletion) },
    leaseYears != null && { v: copy.factLeaseValue(String(Math.round(leaseYears))), l: pickCopy(LEASE_LBL, lang) },
    permitShort && { v: permit!, l: lower(copy.factPermits) },
    plan && { v: plan.v, l: `${lower(pickCopy(PLAN_LABEL, lang))}${plan.months ? ` · ${plan.months} ${pickCopy(MONTHS_SHORT, lang)}` : ''}` },
    airportMin != null && { v: `${airportMin} ${MIN[lang]}`, l: lower(copy.factAirport) },
  ].filter(Boolean) as { v: string; l: string }[]
  const shortRows = [
    types.length > 0 && { k: copy.factType, v: types.join(', ') },
    district && { k: copy.factDistrict, v: district },
    hasPermit && !permitShort && permit && { k: copy.factPermits, v: permit },
    airportText && { k: copy.factAirport, v: airportText },
  ].filter(Boolean) as { k: string; v: string }[]

  const CH = pickCopy({
    ru: { kompleks: 'Комплекс', yunity: 'Юниты в продаже', shakhmatka: 'Шахматка', analitika: 'Аналитика', zastroyshchik: 'Застройщик', voprosy: 'Вопросы', planHint: 'Нажмите на подсвеченную зону — откроется юнит или следующий план.' },
    en: { kompleks: 'Complex', yunity: 'Units for sale', shakhmatka: 'Availability plan', analitika: 'Analytics', zastroyshchik: 'Developer', voprosy: 'FAQ', planHint: 'Tap a highlighted area to open the unit or the next plan.' },
    id: { kompleks: 'Kompleks', yunity: 'Unit dijual', shakhmatka: 'Denah ketersediaan', analitika: 'Analitik', zastroyshchik: 'Pengembang', voprosy: 'Pertanyaan', planHint: 'Ketuk area yang disorot untuk membuka unit atau denah berikutnya.' },
    fr: { kompleks: 'Résidence', yunity: 'Unités en vente', shakhmatka: 'Plan des disponibilités', analitika: 'Analyse', zastroyshchik: 'Promoteur', voprosy: 'Questions', planHint: 'Touchez une zone en surbrillance pour ouvrir l’unité ou le plan suivant.' },
    de: { kompleks: 'Anlage', yunity: 'Einheiten im Verkauf', shakhmatka: 'Verfügbarkeitsplan', analitika: 'Analyse', zastroyshchik: 'Bauträger', voprosy: 'Fragen', planHint: 'Tippen Sie auf eine markierte Fläche, um die Einheit oder den nächsten Plan zu öffnen.' },
    zh: { kompleks: '项目', yunity: '在售单元', shakhmatka: '房源平面图', analitika: '分析', zastroyshchik: '开发商', voprosy: '常见问题', planHint: '点击高亮区域可打开单元或下一张平面图。' },
    nl: { kompleks: 'Complex', yunity: 'Units te koop', shakhmatka: 'Beschikbaarheidsplan', analitika: 'Analyse', zastroyshchik: 'Ontwikkelaar', voprosy: 'Vragen', planHint: 'Tik op een gemarkeerd vlak om de unit of het volgende plan te openen.' },
    ban: { kompleks: 'Kompleks', yunity: 'Unit kaadol', shakhmatka: 'Denah unit', analitika: 'Analitik', zastroyshchik: 'Pangwangun', voprosy: 'Pitaken', planHint: 'Tekan wewidangan sane kasorot anggen ngungkab unit utawi denah salanturnyane.' },
    pl: { kompleks: 'Kompleks', yunity: 'Lokale na sprzedaż', shakhmatka: 'Plan dostępności', analitika: 'Analityka', zastroyshchik: 'Deweloper', voprosy: 'Pytania', planHint: 'Dotknij podświetlonego obszaru, aby otworzyć lokal lub kolejny plan.' },
    uk: { kompleks: 'Комплекс', yunity: 'Юніти в продажу', shakhmatka: 'Шахматка', analitika: 'Аналітика', zastroyshchik: 'Забудовник', voprosy: 'Запитання', planHint: 'Натисніть на підсвічену зону — відкриється юніт або наступний план.' },
  }, lang)
  const MGR_ROLE = { ru: 'Менеджер застройщика', en: 'Developer’s manager', id: 'Manajer pengembang', fr: 'Responsable du promoteur', de: 'Ansprechpartner des Bauträgers', zh: '开发商经理', nl: 'Manager van de ontwikkelaar', ban: 'Manajer pengembang', pl: 'Menedżer dewelopera', uk: 'Менеджер забудовника' }
  const OPEN_DEV = { ru: 'Открыть страницу застройщика', en: 'Open developer page', id: 'Buka halaman pengembang', fr: 'Ouvrir la page du promoteur', de: 'Zur Seite des Bauträgers', zh: '打开开发商页面', nl: 'Open pagina ontwikkelaar', ban: 'Bukak kaca pangwangun', pl: 'Otwórz stronę dewelopera', uk: 'Відкрити сторінку забудовника' }
  const MORE = pickCopy({ ru: 'Подробнее', en: 'Read more', id: 'Selengkapnya', fr: 'En savoir plus', de: 'Mehr anzeigen', zh: '展开', nl: 'Meer', ban: 'Selengkapnya', pl: 'Więcej', uk: 'Докладніше' }, lang)
  const LESS = pickCopy({ ru: 'Свернуть', en: 'Show less', id: 'Tutup', fr: 'Réduire', de: 'Weniger', zh: '收起', nl: 'Minder', ban: 'Tutup', pl: 'Zwiń', uk: 'Згорнути' }, lang)

  // «Проверьте комплекс с ИИ» — тот же набор анализов, что у виллы
  // (lib/analytics-panel/villa.ts, kind 'complex'). Денег (цены соседей, доход)
  // у комплекса нет — они на страницах юнитов; остаются документы, место, жизнь.
  const [around, tourism, landmarks] = await Promise.all([
    loadSurroundings('complex', c.airtable_id).catch(() => null),
    lat != null && lng != null ? loadTourism(lat, lng).catch(e => { console.error(e); return null }) : null,
    lat != null && lng != null ? loadLandmarks(lat, lng).catch(e => { console.error(e); return [] }) : [],
  ])
  const nearestBeach = nearby?.byCategory?.beach?.filter(p => (p.primaryType === 'beach' || p.types?.includes('beach')) && !/warung|уорунг|варунг|caf[eé]|кафе|bar\b|бар\b|restaurant|ресторан|club|клуб/i.test(p.name ?? '')).sort((x, y) => x.distanceKm - y.distanceKm)[0] ?? null
  const extraDests: ExtraDest[] = [
    ...(nearestBeach?.name ? [{ key: `b:${nearestBeach.id}`, name: nearestBeach.name, lat: nearestBeach.lat, lng: nearestBeach.lng, kind: 'beach' as const }] : []),
    ...(tourism?.ta ?? []).filter(p => p.km <= 15).slice(0, 3).map(p => ({ key: `ta:${p.rank}`, name: `#${p.rank} ${p.name}`, lat: p.lat, lng: p.lng, kind: 'ta' as const })),
  ]
  const hubDests = lat != null && lng != null ? BALI_HUBS.filter(h => Math.hypot((h.lat - lat) * 111, (h.lng - lng) * 110) > (h.rKm ?? 0) + 0.3) : []
  const [extraRoutes, hubRoutes] = lat != null && lng != null ? await Promise.all([
    extraDests.length ? loadExtraRoutes(lat, lng, extraDests).catch(() => []) : [],
    hubDests.length ? loadExtraRoutes(lat, lng, hubDests).catch(e => { console.error(e); return [] }) : [],
  ]) : [[], []]
  const travelPts = [
    ...(tourism?.ta ?? []).filter(p => p.km <= 10).map(p => ({ key: `ta:${p.rank}`, lat: p.lat, lng: p.lng })),
    ...landmarks.filter(l => l.lat != null && l.lng != null).map(l => ({ key: `lm:${l.id}`, lat: l.lat!, lng: l.lng! })),
  ]
  const travel = lat != null && lng != null && travelPts.length ? await loadTravelTimes(lat, lng, travelPts).catch(e => { console.error(e); return {} }) : {}
  const rdtr = rdtrHit?.data ?? null
  const analyses = buildVillaAnalyses({
    kind: 'complex',
    lang, lat, lng, bedrooms: null, priceUsd: minPrice,
    status: lang === 'ru' ? statusRaw : status, permit: hasPermit ? permit : null, yearRaw, leaseYears,
    snap: null, airbnb: [], sale: null, geo: geoFacts, nearby,
    around1km: around?.r1 ?? null,
    landPrices: null, landM2: null, tourism, landmarks, touristShare: around?.touristShare ?? null, aroundTop: around?.top ?? [], extraRoutes, hubRoutes, travel, demand: null, bookingFit: null,
    rdtr: rdtrHit && rdtr ? { data: rdtr, image: `${RDTR_BASE}/${rdtrHit.key}.jpg?ver=${rdtr.fetchedAt ?? ''}-${rdtr.radius}` } : null,
  })

  // Вкладки окна медиа — как у виллы: локация, солнце и ветер, 3D-карта, зоны.
  const livingFacts = computeLivingFacts({
    byCategory: nearby?.byCategory ?? null,
    routes: geoFacts?.routes ?? null,
    leaseYears,
    bedrooms: null,
    climate: geoFacts?.climate ?? null,
    point: { lat, lng },
  })
  const beachPick = nearestBeachProfile(nearby?.byCategory?.beach) ?? nearestBeachProfileByPoint(lat, lng)
  const buildViewerTabs = (): ViewerTab[] => {
    const tabs: ViewerTab[] = []
    const en = lang !== 'ru'
    if (lat != null && lng != null) {
      const z = 16, n2 = 2 ** z
      const tx = Math.floor(((lng + 180) / 360) * n2)
      const ty = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n2)
      const dist = (km: number) => km < 1 ? `${Math.round(km * 1000)} ${METERS[lang]}` : `${km.toFixed(1).replace('.', decSep(lang))} ${KM[lang]}`
      const row = (k: string) => livingFacts?.rows.find(r => r.key === k)?.km ?? null
      const beach = beachPick?.beach ?? null
      const near: { label: string; value: string }[] = []
      if (beachPick?.km != null) near.push({ label: [pickCopy(NEAR.beach, lang), (en ? (beach?.name_en ?? beach?.name_ru) : (beach?.name_ru ?? beach?.name_en))?.replace(/^(Пляж|Beach|Pantai)\s+/i, '')].filter(Boolean).join(' '), value: dist(beachPick.km) })
      if (row('shop') != null) near.push({ label: pickCopy(NEAR.shop, lang), value: dist(row('shop')!) })
      if (row('school') != null) near.push({ label: pickCopy(NEAR.school, lang), value: dist(row('school')!) })
      if (livingFacts?.airportMin != null) near.push({ label: pickCopy(NEAR.airport, lang), value: `${livingFacts.airportMin} ${MIN[lang]}` })
      tabs.push({
        key: 'location',
        label: pickCopy({ ru: 'Локация', en: 'Location', id: 'Lokasi', fr: 'Emplacement', de: 'Lage', zh: '位置', nl: 'Locatie', ban: 'Genah', pl: 'Lokalizacja', uk: 'Локація' }, lang),
        icon: <MapPin size={18} aria-hidden />,
        cover: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`,
        bleed: true,
        content: <LocationView key="loc" lat={lat} lng={lng} place={district ? `${district}, ${pickCopy(NEAR.bali, lang)}` : null} near={near} lang={lang} />,
      })
    }
    if (sunPlan && sunSettings?.enabled) {
      tabs.push({
        key: 'sun',
        label: en ? 'Sun & wind' : 'Солнце и ветер',
        icon: <Sun size={18} aria-hidden />,
        cover: slidesPhotos[1] ?? slidesPhotos[0] ?? null,
        bleed: true,
        content: (
          <SunShadowBlock
            key="sun"
            inline
            wind={geoFacts?.climate?.wind ?? null}
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
              key="map3d"
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
        content: <ZoningMap key="zones" slug={rdtrHit.key} plotOverride={rdtr.plot} lang={lang} ver={`${rdtr.fetchedAt ?? ''}-${rdtr.radius}`} />,
      })
    }
    // Документы комплекса — та же плитка, что на странице виллы (файлы только Pro).
    const docs = complexDocsData
    if (docs) {
      tabs.push({
        key: 'docs',
        label: pickCopy({ ru: 'Документы', en: 'Documents', id: 'Dokumen', fr: 'Documents', de: 'Dokumente', zh: '文件', nl: 'Documenten', ban: 'Dokumen', pl: 'Dokumenty', uk: 'Документи' }, lang),
        icon: <FileText size={18} aria-hidden />,
        cover: slidesPhotos[3] ?? slidesPhotos[0] ?? null,
        bleed: true,
        count: docs.docs.length,
        content: <ComplexDocsView key="docs" docs={docs} lang={lang} listingTitle={name} />,
      })
    }
    return tabs
  }

  // Номера глав — по порядку тех, что есть на странице.
  const hasKompleks = objTiles.length > 0 || !!pageBody || shortRows.length > 0
  const hasUnits = units.length > 0
  const hasPlan = vizLayers.length > 0 || chessBoardVillas.length > 0
  const hasDev = !!(developerName || m0)
  const order = [
    hasKompleks && 'kompleks', hasUnits && 'yunity', hasPlan && 'shakhmatka',
    analyses.length > 0 && 'analitika', hasDev && 'zastroyshchik', 'voprosy',
  ].filter(Boolean) as string[]
  const no = (id: string) => String(order.indexOf(id) + 1).padStart(2, '0')
  // Без Pro глава «Проверьте с ИИ» скрыта — у глав после неё номер на один меньше.
  const guestOrder = order.filter(id => id !== 'analitika')
  const chNo = (id: string) => <ProNo pro={no(id)} guest={String(guestOrder.indexOf(id) + 1).padStart(2, '0')} />

  const unitCard = (u: Unit) => {
    const demand = demandByUnit[`${u.kind}|${u.id}`]
    return u.kind === 'villa'
      ? <VillaCard key={u.id} a={{ ...u, demand }} lang={lang} />
      : <ApartmentCard key={u.id} a={{ ...u, demand }} lang={lang} />
  }
  const kompleksChapter = () => hasKompleks && (
    <VillaChapter key="kompleks" id="kompleks" no={no('kompleks')} eyebrow={CH.kompleks} journal>
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
      {pageBody && (
        <section {...edit(COMPLEX_DESCRIPTION_FIELD, 'longtext', 'Описание ЖК')}>
          <p className="m-0 max-w-[68ch] text-[16px] leading-[1.65] text-[#26302B] md:text-[18px] md:leading-[1.7]">{pageBody.split('\n')[0]}</p>
          {pageBody.trim().includes('\n') && (
            <ExpandableText className="max-w-[68ch] mt-2" more={MORE} less={LESS}>
              <div className="prose-balinsky whitespace-pre-line text-[16px] leading-[1.65] text-[#26302B] md:text-[18px] md:leading-[1.7]">
                {pageBody.split('\n').slice(1).join('\n')}
              </div>
            </ExpandableText>
          )}
        </section>
      )}
      {shortRows.length > 0 && (
        <div className="flex max-w-[68ch] flex-col gap-1.5 text-[15px] leading-[1.6] text-[#0F1A15]">
          {shortRows.map(r => <div key={r.k}><span className="text-[#6B7570]">{r.k}:</span> {r.v}</div>)}
        </div>
      )}
    </VillaChapter>
  )
  const unitsChapter = () => hasUnits && (
    <VillaChapter key="yunity" id="yunity" no={no('yunity')} eyebrow={CH.yunity} title={`${CH.yunity} · ${units.length}`} journal>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {units.slice(0, 12).map(unitCard)}
      </div>
      {/* Остальные юниты — под раскрытием, без клиентского кода (у Elysium 29). */}
      {units.length > 12 && (
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center py-1 text-[15px] text-[#0F1A15] underline underline-offset-4 transition-colors duration-[120ms] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] group-open:hidden [&::-webkit-details-marker]:hidden">
            {pickCopy({ ru: `Показать ещё ${units.length - 12}`, en: `Show ${units.length - 12} more`, id: `Tampilkan ${units.length - 12} lagi`, fr: `Afficher ${units.length - 12} de plus`, de: `${units.length - 12} weitere anzeigen`, zh: `再显示 ${units.length - 12} 个`, nl: `Toon ${units.length - 12} meer`, ban: `Tampilang ${units.length - 12} malih`, pl: `Pokaż jeszcze ${units.length - 12}`, uk: `Показати ще ${units.length - 12}` }, lang)}
          </summary>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {units.slice(12).map(unitCard)}
          </div>
        </details>
      )}
    </VillaChapter>
  )
  const planChapter = () => hasPlan && (
    <VillaChapter key="shakhmatka" id="shakhmatka" no={no('shakhmatka')} eyebrow={CH.shakhmatka} lead={vizLayers.length > 0 ? CH.planHint : undefined} journal>
      {vizLayers.length > 0 && (
        // Журнал: тонкая рамка и малый радиус, без «плашки» (как фото в главах).
        <div className="[&>section>div.rounded-2xl]:rounded-md [&>section>div.rounded-2xl]:border-[#ECEFED]">
        <ComplexVisualizationViewer
          layers={vizLayers.map(l => ({
            id: l.id, parentLayerId: l.parentLayerId,
            title: l.title, photoUrl: l.photoUrl,
          }))}
          hotspots={vizHotspots}
          unitsBySlug={unitInfoBySlug}
          lang={lang}
          bare
        />
        </div>
      )}
      {chessBoardVillas.length > 0 && (
        <EcoWoodChessBoard
          villas={chessBoardVillas}
          masterplanUrl="https://images.balinsky.info/storage/v1/object/public/complex-photos/adm_ecowood_001/render.jpg"
          lang={lang}
        />
      )}
    </VillaChapter>
  )
  const leftChapters = () => [kompleksChapter(), unitsChapter(), planChapter()]

  return (
    <>
      <Header active="zhilye-kompleksy" />
      <PageViewTracker kind="complex" slug={slug} title={name} airtableId={c.airtable_id} lang={lang} />
      <PageEditButton kind="complex" id={c.airtable_id} lang={lang} />
      <PageContainer>
        <Breadcrumbs hideLast currentUrl={`${complexesRoot}/o/${slug}`} items={[
          { label: copy.home, href: home },
          { label: copy.crumbComplexes, href: complexesRoot },
          // Regency crumb dropped (no page → no `item` → GSC error).
          ...(district ? [{ label: district, href: districtSlug ? `${complexesRoot}/${districtSlug}` : undefined }] : []),
          { label: name },
        ]} />

        {/* Верх — как у виллы (макет «Журнал»): название и строка фактов. */}
        <section className="pb-5 md:pb-6">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 {...edit('Project', 'text', 'Название ЖК')} className="m-0 font-display text-[28px] font-bold leading-[1.12] tracking-[-0.03em] text-[#0F1A15] [overflow-wrap:anywhere] md:text-[40px] lg:text-[44px] lg:leading-[1.1]">
              {name}
            </h1>
            {keyLine && <p className="m-0 text-[15px] leading-[1.5] text-[#4A5550] md:text-[18px]">{keyLine}</p>}
          </div>
        </section>

        <VillaGallery
          photos={slidesPhotos}
          alts={photoAlts}
          plans={complexPlans}
          plan3dUrl={null}
          videos={complexVideos.map(vd => ({ url: vd.url, name: vd.name }))}
          title={name}
          lang={lang}
          plansAreMasterplan
          promo={await loadPromoKit(c.airtable_id)}
          tourUrl={embeddableTourUrl(c.data['3D tours'])}
          viewerTabs={buildViewerTabs()}
          bleed
          tilesAs="text"
          aside={leadOn ? leadCard('zapis', true) : null}
          topRight={complexActions()}
          afterTiles={leadOn ? <div key="obj" className="mt-16 flex flex-col gap-16 lg:mt-20 lg:gap-24">{leftChapters()}</div> : null}
          ambient={(() => {
            // Звук под слайд-шоу — как у вилл: у моря волны, в глубине острова джунгли, иначе сад.
            if ((beachPick?.km ?? 99) <= 1) return '/ambient/ocean.mp3'
            const where = `${firstString(d['Location']) ?? ''} ${districtRaw ?? ''}`
            if (/ubud|tabanan|mengwi|payangan|gianyar|tegal|sidemen|munduk|bedugul|убуд|табанан|менгви/i.test(where)) return '/ambient/jungle.mp3'
            return '/ambient/garden.mp3'
          })()}
        />

        {leadOn && <LeadStickyBar lang={lang} targetId="zapis" price={stickyPrice()} />}

        {/* Разделы; между ними 64 / 96 px. */}
        <div className="mt-16 flex flex-col gap-16 lg:mt-24 lg:gap-24">
        {!leadOn && leftChapters()}

        {/* Аналитика — одна глава «Проверьте комплекс с ИИ», как у виллы. */}
        {analyses.length > 0 && (
          // Только Pro (владелец 21.11.2026): аналитика ещё не готова для всех.
          <div className="bx-pro-only">
          <VillaChapter id="analitika" no={no('analitika')} plain eyebrow={CH.analitika}>
            <AnalyticsPanel analyses={analyses} lang={lang} signInHref={`/pro?next=${encodeURIComponent(`${complexesRoot}/o/${slug}`)}`} no={no('analitika')}
              heading={pickCopy(CX_AI_HEADING, lang)} />
          </VillaChapter>
          </div>
        )}

        {/* Застройщик и вопросы — рядом на компьютере, как у виллы. */}
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2">
        {hasDev && (
          <VillaChapter id="zastroyshchik" no={chNo('zastroyshchik')} eyebrow={CH.zastroyshchik} journal>
            <div className="flex flex-col gap-5 md:gap-6">
              {(developerLink || developerName) && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[20px] font-semibold tracking-[-0.01em] text-[#0F1A15] md:text-[24px]">{developerLink?.name ?? developerName}</span>
                  {developerLink?.logoUrl && (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ECEFED] bg-white p-1">
                      <Image src={developerLink.logoUrl} alt={developerLink.name} width={40} height={40} className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                </div>
              )}
              {devStats && devStats.total > 0 && (
                <div className="flex flex-wrap gap-x-8 gap-y-4 md:gap-x-12">
                  <span className="flex flex-col gap-0.5 md:gap-1">
                    <span className="text-[24px] font-semibold leading-[1.15] tabular-nums md:text-[28px]">{devStats.ready} {pickCopy({ ru: 'из', en: 'of', id: 'dari', fr: 'sur', de: 'von', zh: '/', nl: 'van', ban: 'saking', pl: 'z', uk: 'з' }, lang)} {devStats.total}</span>
                    <span className="text-[13px] text-[#6B7570] md:text-[14px]">{pickCopy({ ru: 'проектов сдано', en: 'projects completed', id: 'proyek selesai', fr: 'projets livrés', de: 'Projekte fertiggestellt', zh: '个项目已交付', nl: 'projecten opgeleverd', ban: 'proyek sampun puput', pl: 'projektów ukończonych', uk: 'проєктів здано' }, lang)}</span>
                  </span>
                  {devStats.inProgress > 0 && (
                    <span className="flex flex-col gap-0.5 md:gap-1">
                      <span className="text-[24px] font-semibold leading-[1.15] tabular-nums md:text-[28px]">{devStats.inProgress}</span>
                      <span className="text-[13px] text-[#6B7570] md:text-[14px]">{pickCopy({ ru: 'строится', en: 'under construction', id: 'sedang dibangun', fr: 'en construction', de: 'im Bau', zh: '在建', nl: 'in aanbouw', ban: 'kantun kabangun', pl: 'w budowie', uk: 'будується' }, lang)}</span>
                    </span>
                  )}
                </div>
              )}
              <Link href={developerLink ? `${developersRoot}/${developerLink.slug}` : developersRoot} className="self-start py-1 text-[15px] text-[#0F1A15] underline underline-offset-4 transition-colors duration-[120ms] hover:text-[var(--color-primary)]">
                {developerLink ? pickCopy(OPEN_DEV, lang) : copy.allDevelopers}
              </Link>
              {/* Менеджер застройщика — сюда ведут кнопки связи. */}
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
                        {leadManager.name}{developerName ? `, ${developerLink?.name ?? developerName}` : ''}
                      </div>
                      <div className="text-[13px] text-[#6B7570]">{pickCopy(MGR_ROLE, lang)}</div>
                    </div>
                  </div>
                  <ManagerContactButtons lang={lang} managerId={m0.id} managerName={m0.name} developerName={developerName ?? null} listingTitle={name} />
                </div>
              )}
            </div>
          </VillaChapter>
        )}

        <VillaChapter id="voprosy" no={chNo('voprosy')} eyebrow={CH.voprosy} journal>
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

        {/* VIDEOS — только разметка VideoObject; сами видео во вкладке галереи. */}
        {complexVideos.length > 0 && (
          <VideoGrid jsonLdOnly videos={complexVideos} title={copy.videosTitle(name)} />
        )}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }} />
        {productJsonLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
