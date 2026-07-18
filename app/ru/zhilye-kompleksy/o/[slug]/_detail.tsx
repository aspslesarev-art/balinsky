// Shared complex-detail renderer. Both /ru/zhilye-kompleksy/o/[slug] and
// /en/complexes/o/[slug] import ComplexDetail and pass their lang —
// layout, data fetching and section order live here only so RU & EN
// stay in lockstep automatically.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import {
  Building2, MapPin, Calendar, FileCheck2, Lock, Home, Plane,
  ChevronRight, ExternalLink, Box, Map as MapIcon, Film, FileText, BedDouble,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { ExpandableText } from '@/components/ExpandableText'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'
import { NeighborhoodHeatMap } from '@/components/NeighborhoodHeatMap'
import { ProgressBar } from '@/components/ProgressBar'
import { ApartmentCard, type ApartmentCardData } from '@/components/ApartmentCard'
import { ManagerCard } from '@/components/ManagerCard'
import { InlinePrice } from '@/components/InlinePrice'
import { loadManagersByDeveloperName } from '@/lib/managers'
import { getDeveloperStats } from '@/lib/developer-stats'
import { reliabilityScore } from '@/lib/developer-reliability'
import { StarRating } from '@/components/StarRating'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { distanceKm as haversineKm } from '@/lib/competitor-utils'
import { loadVideosByComplexSlug } from '@/lib/videos'
import { VideoGrid } from '@/components/VideoGrid'
import { loadNearbyPlaces } from '@/lib/nearby-places'
import { NearbyPlaces } from '@/components/NearbyPlaces'
import { listLayers, listHotspots } from '@/lib/complex-visualizations'
import dynamic from 'next/dynamic'
// Heavy client widgets — code-split off the initial JS bundle.
// ComplexVisualizationViewer = layers/hotspots, LandProfileBlock = charts.
// Both render below the fold on complex detail pages.
const ComplexVisualizationViewer = dynamic(
  () => import('@/components/ComplexVisualizationViewer').then(m => ({ default: m.ComplexVisualizationViewer })),
)
const LandProfileBlock = dynamic(
  () => import('@/components/LandProfileBlock').then(m => ({ default: m.LandProfileBlock })),
)
import { LazyMount } from '@/components/LazyMount'
import { loadLandProfile, landAllowsBuilding } from '@/lib/land-profile'
import { loadComplexMarketStats } from '@/lib/complex-market-stats'
import { MarketStatsBlock } from '@/components/MarketStatsBlock'
import { PageViewTracker } from '@/components/PageViewTracker'
import { tField, pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { facetLabel } from '@/lib/filter-i18n'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'
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
  if (lang !== 'ru') return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
  return km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(km < 10 ? 1 : 0)} км`
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
    keyFacts: 'Ключевые факты',
    factType: 'Тип юнитов',
    factCompletion: 'Срок сдачи',
    factCompletionDone: 'Сдан',
    factPermits: 'Разрешения',
    factLeasehold: 'Лизхолд',
    factLeaseValue: (l: string) => `${l} лет`,
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
        a: lease ? `Базовый срок лизхолда — ${lease} лет. Уточняйте у застройщика возможность продления.` : 'Срок лизхолда уточняйте у застройщика. Для большинства проектов на Бали — 25–80 лет с возможностью продления.' },
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
    keyFacts: 'Key facts',
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
    `).limit(200)
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
  ['complex-developers-index-v2'],
  { revalidate: 600 },
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
  const RU: Record<string, string> = { apartment: 'апартаменты', villa: 'виллы', townhouse: 'таунхаусы', penthouse: 'пентхаусы' }
  const EN: Record<string, string> = { apartment: 'Apartments', villa: 'Villas', townhouse: 'Townhouses', penthouse: 'Penthouses' }
  const ID: Record<string, string> = { apartment: 'apartemen', villa: 'vila', townhouse: 'rumah bandar', penthouse: 'penthouse' }
  const FR: Record<string, string> = { apartment: 'appartements', villa: 'villas', townhouse: 'maisons de ville', penthouse: 'penthouses' }
  const words = found.map(k => (lang === 'ru' ? RU : lang === 'id' ? ID : lang === 'fr' ? FR : EN)[k])
  if (words.length === 1) return words[0]
  const sep = lang === 'ru' ? ' и ' : lang === 'id' ? ' dan ' : lang === 'fr' ? ' et ' : ' & '
  return words.slice(0, -1).join(', ') + sep + words[words.length - 1]
}

function minMax(nums: number[]): [number, number] | null {
  const v = nums.filter(n => typeof n === 'number' && Number.isFinite(n) && n > 0)
  return v.length ? [Math.min(...v), Math.max(...v)] : null
}
// Competitor-style factual meta description: types + area/bedroom/price ranges
// from the actual units, like "…Apartments & Villas in Bukit, Bali. 45–210 m²,
// 1–3 bedrooms, from $180,000 to $650,000." Returns null when there's no price
// AND no area to state (then we fall back to editorial text).
function factsDescription(opts: {
  name: string; district: string | null; phrase: string | null; year: string | null
  prices: number[]; areas: number[]; beds: number[]
}, lang: Lang): string | null {
  const ar = minMax(opts.areas), pr = minMax(opts.prices), br = minMax(opts.beds)
  if (!ar && !pr) return null
  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
  const parts: string[] = []
  if (lang !== 'ru') {
    const head = `${opts.name} — ${opts.phrase ?? 'residential complex'}${opts.district ? ` in ${opts.district}` : ''}, Bali.`
    if (ar) parts.push(ar[0] === ar[1] ? `${ar[0]} m²` : `${ar[0]}–${ar[1]} m²`)
    if (br) parts.push(br[0] === br[1] ? `${br[0]}-bedroom` : `${br[0]}–${br[1]} bedrooms`)
    if (pr) parts.push(pr[0] === pr[1] ? usd(pr[0]) : `from ${usd(pr[0])} to ${usd(pr[1])}`)
    return `${head} ${parts.join(', ')}.${opts.year ? ` Completion ${opts.year}.` : ''}`.slice(0, 200)
  }
  const head = `${opts.name} — ${opts.phrase ?? 'жилой комплекс'}${opts.district ? ` в ${opts.district}` : ''}, Бали.`
  if (ar) parts.push(ar[0] === ar[1] ? `${ar[0]} м²` : `${ar[0]}–${ar[1]} м²`)
  if (br) parts.push(br[0] === br[1] ? `${br[0]} спальни` : `${br[0]}–${br[1]} спальни`)
  if (pr) parts.push(pr[0] === pr[1] ? usd(pr[0]) : `от ${usd(pr[0])} до ${usd(pr[1])}`)
  return `${head} ${parts.join(', ')}.${opts.year ? ` Сдача ${opts.year}.` : ''}`.slice(0, 200)
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
let _complexIndexCache: { ts: number; data: ComplexIndexEntry[] } | null = null
let _complexIndexInflight: Promise<ComplexIndexEntry[]> | null = null

async function _loadComplexIndex(): Promise<ComplexIndexEntry[]> {
  if (_complexIndexCache && Date.now() - _complexIndexCache.ts < COMPLEX_INDEX_TTL_MS) return _complexIndexCache.data
  if (_complexIndexInflight) return _complexIndexInflight
  _complexIndexInflight = (async () => {
    try {
      const r = await fetch(COMPLEX_INDEX_URL, { next: { revalidate: 10 } })
      if (!r.ok) return _complexIndexCache?.data ?? []
      const j = await r.json() as { items: ComplexIndexEntry[] }
      const items = j.items ?? []
      _complexIndexCache = { ts: Date.now(), data: items }
      return items
    } catch {
      return _complexIndexCache?.data ?? []
    }
  })().finally(() => { _complexIndexInflight = null })
  return _complexIndexInflight
}

const _complexByIdCache = new Map<string, { ts: number; row: ComplexRow | null }>()
async function _loadComplexById(id: string): Promise<ComplexRow | null> {
  const c = _complexByIdCache.get(id)
  if (c && Date.now() - c.ts < 5 * 60 * 1000) return c.row
  const [{ data }, enCache] = await Promise.all([
    sb.from('raw_complexes').select('airtable_id, data, slug, cover_url').eq('airtable_id', id).maybeSingle(),
    loadAllTranslations('complexes'),
  ])
  const raw = (data as ComplexRow | null) ?? null
  // Same hand-merge as villa/apartment detail loaders — detail page
  // queries raw_complexes directly and bypasses loadAllComplexes.
  const row: ComplexRow | null = raw
    ? { ...raw, data: mergeAllTranslations(raw.data, raw.airtable_id, enCache) }
    : null
  _complexByIdCache.set(id, { ts: Date.now(), row })
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
  ['complex-photo-manifest-detail'],
  { revalidate: 3600 },
)

// Slim-проекция + DB-фильтр по подстроке в SEO:Title.
// Раньше тянули всё (708 строк ~33МБ) и фильтровали в JS по includes()
// — это был один из главных каналов egress. Теперь только те юниты,
// чей SEO:Title содержит имя комплекса (1-30 строк, ~10-50КБ).
type AptRow = {
  airtable_id: string
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
const _aptManifestCache: { ts: number; manifest: Record<string, string[]> } = { ts: 0, manifest: {} }
async function _loadAptManifest(): Promise<Record<string, string[]>> {
  if (Date.now() - _aptManifestCache.ts < 30 * 60 * 1000) return _aptManifestCache.manifest
  const m = await fetch(cdnManifestUrl(APT_PHOTO_MANIFEST_URL, 600)).then(r => r.ok ? r.json() : {}).catch(() => ({})) as Record<string, string[]>
  _aptManifestCache.ts = Date.now()
  _aptManifestCache.manifest = m
  return m
}
async function _loadApartmentsForComplex(complexName: string): Promise<{ rows: AptRow[]; manifest: Record<string, string[]> }> {
  const manifest = await _loadAptManifest()
  const { data, error } = await sb.from('raw_apartments').select(`
    airtable_id,
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
  `).ilike(`data->>"SEO:Title"`, `%${complexName.replace(/[%_]/g, '\\$&')}%`).limit(200)
  if (error || !data) return { rows: [], manifest }
  return { rows: data as AptRow[], manifest }
}

async function loadComplexBySlug(slug: string): Promise<ComplexRow | null> {
  const idx = await _loadComplexIndex()
  const entry = idx.find(c => c.slug === slug)
  if (!entry) return null
  return _loadComplexById(entry.id)
}

async function loadOtherComplexesInDistrict(district: string | null, exceptId: string, lang: Lang = 'ru') {
  if (!district) return []
  const [idx, manifest] = await Promise.all([_loadComplexIndex(), _loadComplexPhotos()])
  const candidates = idx.filter(c => c.id !== exceptId && c.district === district).slice(0, 4)
  const rows = await Promise.all(candidates.map(c => _loadComplexById(c.id)))
  return rows
    .filter((c): c is ComplexRow => c != null)
    .map(c => {
      const photos = manifest[c.airtable_id] ?? []
      const typesRaw = strList(c.data['Типы юнитов'])
      // Localize unit-type labels via the central facetLabel map (all 8 langs
      // + translit fallback) so no Cyrillic type ever leaks on a non-RU page.
      const types = lang === 'ru' ? typesRaw : typesRaw.map(t => facetLabel('type', t, lang))
      return {
        slug: c.slug as string,
        name: firstString(c.data['Project']) as string,
        location: firstString(c.data['Location 2']) ?? firstString(c.data['Location']),
        types: types.join(', ') || null,
        // Prefer the synced complex-photos manifest; raw_complexes.cover_url
        // points at the dead complex-covers/* path (404), so it must be the
        // last-resort fallback, not the first choice.
        coverUrl: photos[0] ?? c.cover_url ?? null,
      }
    })
    .filter(c => c.slug && c.name)
}

// Villas — тот же подход, что и для apartments выше: DB-фильтр по
// SEO:Title + slim projection. Maison Boheme и подобные комплексы
// держат юниты в raw_villas — это нужно догрузить рядом.
type VillaRow = {
  airtable_id: string
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
const _villaManifestCache: { ts: number; manifest: Record<string, string[]> } = { ts: 0, manifest: {} }
async function _loadVillaManifest(): Promise<Record<string, string[]>> {
  if (Date.now() - _villaManifestCache.ts < 30 * 60 * 1000) return _villaManifestCache.manifest
  const m = await fetch(cdnManifestUrl(VILLA_PHOTO_MANIFEST_URL, 600)).then(r => r.ok ? r.json() : {}).catch(() => ({})) as Record<string, string[]>
  _villaManifestCache.ts = Date.now()
  _villaManifestCache.manifest = m
  return m
}
async function _loadVillasForComplex(complexName: string): Promise<{ rows: VillaRow[]; manifest: Record<string, string[]> }> {
  const manifest = await _loadVillaManifest()
  const { data, error } = await sb.from('raw_villas').select(`
    airtable_id,
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
  `).ilike(`data->>"SEO:Title"`, `%${complexName.replace(/[%_]/g, '\\$&')}%`).limit(200)
  if (error || !data) return { rows: [], manifest }
  return { rows: data as VillaRow[], manifest }
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
    const titleSource = lang !== 'ru' && titleRawSrc && hasCyrillic(titleRawSrc) ? translitPreserveCase(titleRawSrc) : titleRawSrc
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
    const titleSource = lang !== 'ru' && titleRawSrc && hasCyrillic(titleRawSrc) ? translitPreserveCase(titleRawSrc) : titleRawSrc
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

export async function generateComplexMetadata(slug: string, lang: Lang) {
  const c = await loadComplexBySlug(slug)
  if (!c) return { robots: { index: false } }
  const copy = pickCopy(COPY, lang)
  const name = firstString(c.data['Project']) ?? slug
  const districtRaw = firstString(c.data['Location 2']) ?? firstString(c.data['Location'])
  const district = lang === 'ru' ? districtRu(districtRaw) : districtRaw
  const types = strList(c.data['Типы юнитов']).join(', ')
  const yearRaw = firstString(c.data['Year of completion ']) ?? firstString(c.data['Year of completion'])
  const seoText = tField(c.data, 'SEO Text', lang)
    ?? tField(c.data, 'Описание', lang)
    ?? firstString(c.data['ИИ Описание 2'])
  // Facts-first snippet — types + area/bedroom/price ranges from the real
  // units (like competitors). Falls back to editorial text, then the generic
  // line, when the complex has no priced/measured units.
  const units = await loadUnitsInComplex(name, lang).catch(() => [] as Awaited<ReturnType<typeof loadUnitsInComplex>>)
  const facts = factsDescription({
    name, district, phrase: unitTypesPhrase(c.data['Типы юнитов'], lang), year: yearRaw,
    prices: units.map(u => Number(u.priceUsd)).filter(n => Number.isFinite(n)),
    areas: units.map(u => Number(u.area)).filter(n => Number.isFinite(n)),
    beds: units.map(u => Number(u.bedrooms)).filter(n => Number.isFinite(n)),
  }, lang)
  const description = facts
    ?? (seoText
      ? seoText.slice(0, 160).trim() + (seoText.length > 160 ? '…' : '')
      : copy.fallbackDesc(name, district, types, yearRaw))
  const ruPath = `/ru/zhilye-kompleksy/o/${slug}`
  const enPath = `/en/complexes/o/${slug}`
  const path = switchLangPath(ruPath, lang)
  return {
    title: copy.titlePart(name, district, unitTypesPhrase(c.data['Типы юнитов'], lang)),
    description,
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` , 'x-default': `${SITE_URL}${ruPath}`},
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

  const [photoManifest, units, landProfile, marketStats] = await Promise.all([
    _loadComplexPhotos(),
    loadUnitsInComplex(name, lang),
    loadLandProfile('complex', c.airtable_id),
    loadComplexMarketStats(c.airtable_id),
  ])

  const photos = (photoManifest[c.airtable_id] ?? []).slice(0, 12)
  const slidesPhotos = photos.length > 0 ? photos : c.cover_url ? [c.cover_url] : []
  const districtRaw = firstString(d['Location 2']) ?? firstString(d['Location'])
  const district = lang === 'ru' ? districtRu(districtRaw) : districtRaw
  // District orientation card: only when the district maps to a real hub
  // slug (DISTRICT_TO_SLUG) AND we have editorial copy for it.
  const districtSlug = districtRaw ? DISTRICT_TO_SLUG[districtRaw] ?? null : null
  const districtCopy = districtSlug ? getDistrictCopy(districtSlug, lang) : null
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
  const STATUS_MAP = lang === 'id' ? STATUS_ID : lang === 'fr' ? STATUS_FR : STATUS_EN
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
  const PERMIT_TOKENS: Record<'en' | 'id' | 'fr', Record<string, string>> = {
    en: { 'Заявка': 'Applied', 'заявка': 'applied', 'Подано': 'Submitted', 'подано': 'submitted', 'Получено': 'Obtained', 'получено': 'obtained', 'В процессе': 'In progress', 'в процессе': 'in progress', 'Оформляется': 'In progress', 'оформляется': 'in progress', 'Есть': 'Yes', 'есть': 'yes', 'нет': 'none' },
    id: { 'Заявка': 'Diajukan', 'заявка': 'diajukan', 'Подано': 'Diajukan', 'подано': 'diajukan', 'Получено': 'Diterima', 'получено': 'diterima', 'В процессе': 'Dalam proses', 'в процессе': 'dalam proses', 'Оформляется': 'Dalam proses', 'оформляется': 'dalam proses', 'Есть': 'Ada', 'есть': 'ada', 'нет': 'tidak ada' },
    fr: { 'Заявка': 'Demande déposée', 'заявка': 'demande déposée', 'Подано': 'Déposé', 'подано': 'déposé', 'Получено': 'Obtenu', 'получено': 'obtenu', 'В процессе': 'En cours', 'в процессе': 'en cours', 'Оформляется': 'En cours', 'оформляется': 'en cours', 'Есть': 'Oui', 'есть': 'oui', 'нет': 'aucun' },
  }
  const translatePermit = (v: string | null): string | null => {
    if (!v || lang === 'ru') return v
    let out = v
    const tokens = PERMIT_TOKENS[lang as 'en' | 'id' | 'fr'] ?? PERMIT_TOKENS.en
    for (const [ru, tr] of Object.entries(tokens)) out = out.split(ru).join(tr)
    return out
  }
  const permitRaw = firstString(d['Разрешительные документы'])
  const permit = translatePermit(permitRaw)
  const yearRaw = firstString(d['Year of completion ']) ?? firstString(d['Year of completion'])
  const totalUnits = numberOrNull(d['Total quantity of units'])
  const lease = firstString(d['Leasehold']) ?? firstString(d['Leashold'])
  const developerName = firstString(d['Developer1']) ?? firstString(d['Варианты поиска застройщика'])
  const managers = await loadManagersByDeveloperName(developerName)
  const devStats = await getDeveloperStats(developerName)
  // TASK-13b: developer reliability index shown on the complex (trust signal
  // for the buyer). Visible only — the rating markup lives on the developer
  // page, not duplicated across every complex.
  const devReliability = devStats && (devStats.ready > 0 || devStats.inProgress > 0)
    ? { score: reliabilityScore(devStats), completed: devStats.ready }
    : null
  // Resolve the developer by name → slug + logo so we can link to
  // /ru/zastrojshhiki/<slug> directly instead of just to the
  // developers index. Mirrors the lookup the villa detail page
  // uses; cached for an hour to avoid hammering raw_developers
  // on every complex render.
  const developerLink = await findDeveloperLink(developerName)
  const lat = parseGeo(d['Geo'])
  const lng = parseGeo(d['Geo 2'])
  const nativeBody = tField(d, 'SEO Text', lang)
    ?? tField(d, 'Описание', lang)
  const rawBody = firstString(d['ИИ Описание 2'])
    ?? firstString(d['ИИ Описание'])
  const seoText = nativeBody ?? rawBody
  const kb = await loadKbPageContent('complex', c.airtable_id, lang)
  // Non-RU: prefer the native-language field over the RU/EN-only KB body.
  const pageBody = lang === 'ru'
    ? (kb?.body ?? seoText)
    : (nativeBody ?? kb?.body ?? rawBody)
  const vision = await loadListingVision('complex', c.airtable_id)
  const photoAlts = slidesPhotos.map((_, i) => altFor(vision, i, lang, name))

  // External resources
  const resources: { label: string; url: string; Icon: typeof Box }[] = []
  const presentations = firstString(d['Презентации'])
  const renders = firstString(d['Renders'])
  const masterplan = firstString(d['Мастерплан'])
  const tour3d = firstString(d['3D tours'])
  const video = firstString(d['Video'])
  const booking = firstString(d['Booking'])
  const airbnb = firstString(d['AirBNB'])
  const gmap = firstString(d['Link from Google maps on location'] ?? d['Google maps'] ?? d['Google map'])
  if (presentations) resources.push({ label: copy.res.presentation, url: presentations, Icon: FileText })
  if (renders)       resources.push({ label: copy.res.renders,      url: renders,       Icon: Box })
  if (masterplan)    resources.push({ label: copy.res.masterplan,   url: masterplan,    Icon: MapIcon })
  if (tour3d)        resources.push({ label: copy.res.tour3d,       url: tour3d,        Icon: Box })
  if (video)         resources.push({ label: copy.res.video,        url: video,         Icon: Film })
  if (booking)       resources.push({ label: copy.res.booking,      url: booking,       Icon: ExternalLink })
  if (airbnb)        resources.push({ label: copy.res.airbnb,       url: airbnb,        Icon: ExternalLink })

  // Key facts
  const facts: { Icon: typeof Building2; label: string; value: string }[] = [
    types.length > 0 && { Icon: Home, label: copy.factType, value: types.join(', ') },
    yearRaw && { Icon: Calendar, label: copy.factCompletion, value: status?.toLowerCase().includes('построен') ? copy.factCompletionDone : yearRaw },
    permitRaw && permitRaw.toLowerCase() !== 'нет' && { Icon: FileCheck2, label: copy.factPermits, value: permit },
    lease && { Icon: Lock, label: copy.factLeasehold, value: copy.factLeaseValue(lease) },
    totalUnits != null && { Icon: BedDouble, label: copy.factUnits, value: String(totalUnits) },
    district && { Icon: MapPin, label: copy.factDistrict, value: district },
    fmtAirportDistance(lat, lng, lang) && { Icon: Plane, label: copy.factAirport, value: fmtAirportDistance(lat, lng, lang)! },
  ].filter(Boolean) as { Icon: typeof Building2; label: string; value: string }[]

  const ready = readiness(d)
  const otherComplexes = await loadOtherComplexesInDistrict(district, c.airtable_id, lang)
  const complexVideos = await loadVideosByComplexSlug(slug, 6, lang).catch(() => [])

  // Nearby places — keyed by villa airtable_id in the manifest. The
  // user pointed out that villas in a complex inherit the complex's
  // geo, so the first villa unit's nearby data is a faithful proxy
  // for "what's around this complex". Fall through silently when no
  // villa unit has nearby data populated yet.
  let nearby: Awaited<ReturnType<typeof loadNearbyPlaces>> = null
  for (const u of units) {
    if (u.kind !== 'villa') continue
    const data = await loadNearbyPlaces(u.id).catch(() => null)
    if (data) { nearby = data; break }
  }

  // Interactive visualisation — if the admin built one for this
  // complex, load its layer tree + hotspots and the unit info bag
  // hotspots can point at. unitInfoBySlug is built from the
  // already-loaded units array so the viewer can render rich popups
  // without an extra round-trip.
  // listLayers / listHotspots already swallow the migration-missing
  // case server-side (lib/complex-visualizations) — extra .catch
  // here as belt-and-suspenders so a transient PG error never takes
  // out the public detail page.
  const vizLayers = await listLayers(c.airtable_id).catch(() => [] as Awaited<ReturnType<typeof listLayers>>)
  const vizHotspots = vizLayers.length > 0
    ? await listHotspots(vizLayers.map(l => l.id)).catch(() => [] as Awaited<ReturnType<typeof listHotspots>>)
    : []
  // For the popup we prefer the optimised single-image attachment
  // (`Image Opt` in Airtable — a pre-compressed thumbnail) over the
  // full-quality first photo from the manifest. The interactive plan
  // shows at most one unit popup at a time, so this trims ~80% of the
  // bytes vs the raw photo and keeps tap-to-open snappy on mobile.
  function attachmentUrl(v: unknown): string | null {
    if (!Array.isArray(v) || v.length === 0) return null
    const first = v[0]
    if (first && typeof first === 'object' && 'url' in first && typeof (first as { url: unknown }).url === 'string') {
      return (first as { url: string }).url
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
    // Preference order for the popup hero: `Opt photos[0]` is the
    // truly compressed variant (~140 KB, 800 px wide). `Image Opt`
    // is misleadingly named — for many rows it holds the raw 4-7 MB
    // master, not a thumbnail. Manifest is the bucket-cached
    // fallback when neither attachment field is filled.
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
  const apartmentsRoot = switchLangPath('/ru/apartamenty', lang)
  const villasRoot = switchLangPath('/ru/villy', lang)
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

  const minPrice = units.length > 0 ? units.find(u => u.priceUsd != null)?.priceUsd ?? null : null

  return (
    <>
      <Header active="zhilye-kompleksy" />
      <PageViewTracker kind="complex" slug={slug} title={name} airtableId={c.airtable_id} lang={lang} />
      <PageContainer>
        <Breadcrumbs currentUrl={`${complexesRoot}/o/${slug}`} items={[
          { label: copy.home, href: home },
          { label: copy.crumbComplexes, href: complexesRoot },
          // Regency crumb dropped (no page → no `item` → GSC error).
          ...(district ? [{ label: district, href: `${complexesRoot}/${districtRaw!.toLowerCase().replace(/\s+/g, '-')}` }] : []),
          { label: name },
        ]} />

        {/* PHOTO GALLERY */}
        <section className="mb-6 mt-2">
          <PhotoGalleryHero
            photos={slidesPhotos}
            alt={name}
            alts={photoAlts}
            wishlistItem={{
              kind: 'complex', slug, title: name,
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
            }}
          />
        </section>

        {/* HERO */}
        <section className="mb-10">
          <div className="text-[13px] text-[var(--color-text-muted)] mb-2">
            <Link href={complexesRoot} className="hover:text-[var(--color-text)]">{copy.backToComplexes}</Link>
            {district && <> · <span>{district}</span></>}
          </div>
          <h1 className="text-[20px] sm:text-[28px] md:text-[44px] font-semibold tracking-tight text-[#111827] leading-[1.2] md:leading-[1.05] mb-2 sm:mb-3 [word-break:break-word] [overflow-wrap:anywhere]">
            {name}
          </h1>
          {isSold && (
            <div className="mb-3 sm:mb-4 inline-flex items-center px-3 py-1.5 rounded-full bg-[#DC2626] text-white text-[13px] sm:text-[14px] font-semibold tracking-wide shadow-sm">
              {copy.sold}
            </div>
          )}
          <div className="text-[13px] sm:text-[15px] md:text-[16px] text-[var(--color-text-muted)] leading-snug max-w-3xl mb-3 sm:mb-4">
            {types.length > 0 && <>{types.join(', ')}</>}
            {district && <> · {district}, {copy.bali}</>}
            {yearRaw && <> · {status?.toLowerCase().includes('построен') ? copy.completed : copy.completion(yearRaw)}</>}
            {totalUnits != null && <> · {copy.units(totalUnits)}</>}
          </div>
          <div className="max-w-3xl mb-3 sm:mb-4">
            <ProgressBar value={ready} />
            <div className="mt-1.5 text-[12px] sm:text-[13px] text-[var(--color-text-muted)]">
              {status ?? copy.statusUnknown} · {copy.estimate} ~{ready}%
            </div>
          </div>
          {minPrice != null && (
            <div className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold text-[#16A34A]">
              {copy.unitsFrom} <InlinePrice usd={minPrice} lang={lang} />
            </div>
          )}
        </section>

        {/* KEY FACTS */}
        {facts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {copy.keyFacts}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

        {/* LAND + MARKET — two-column due-diligence row. Renders both
            when available; collapses to one column when only one block
            has data. Sits high on the page so the zoning verdict +
            nearby occupancy are visible before the visitor scrolls past
            the photo galleries. */}
        {(
          landAllowsBuilding(landProfile, 'complex')
          || (marketStats && (marketStats.villa_count > 0 || marketStats.apartment_count > 0))
        ) && (
          <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {landAllowsBuilding(landProfile, 'complex') && (
              <LazyMount fallback={<div className="min-h-[480px] rounded-2xl bg-[var(--color-search-bg)]" />}>
                <LandProfileBlock data={landProfile!} lang={lang} />
              </LazyMount>
            )}
            {marketStats && (marketStats.villa_count > 0 || marketStats.apartment_count > 0) && (
              <MarketStatsBlock data={marketStats} lang={lang} />
            )}
          </section>
        )}

        {/* ABOUT (unique AI write-up, falls back to SEO Text) */}
        {pageBody && (
          <section className="mb-10">
            <h2 className="text-[19px] sm:text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              {copy.aboutPrefix} {name}
            </h2>
            <ExpandableText className="max-w-3xl" more={lang === 'ru' ? 'Подробнее' : 'Read more'} less={lang === 'ru' ? 'Свернуть' : 'Show less'}>
              <div className="prose-balinsky text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
                {pageBody}
              </div>
            </ExpandableText>
          </section>
        )}

        {/* Interactive plan — sits ABOVE the units list because the
            visitor drills from the panorama → highlighted hotspot →
            specific unit, so the natural reading flow is plan first,
            full unit grid second. Renders only when the admin has
            built at least one layer in /admin/visualizations/<id>. */}
        {vizLayers.length > 0 && (
          <ComplexVisualizationViewer
            layers={vizLayers.map(l => ({
              id: l.id, parentLayerId: l.parentLayerId,
              title: l.title, photoUrl: l.photoUrl,
            }))}
            hotspots={vizHotspots}
            unitsBySlug={unitInfoBySlug}
            lang={lang}
          />
        )}

        {/* UNITS in this complex */}
        {units.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[19px] sm:text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-2">
              {copy.availableUnits}
            </h2>
            <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
              {(() => {
                const hasA = units.some(u => u.kind === 'apartment')
                const hasV = units.some(u => u.kind === 'villa')
                const k = hasA && hasV ? 'mixed' : hasV ? 'villa' : 'apartment'
                return copy.publishedSuffix(units.length, k)
              })()} {name}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {units.slice(0, 12).map(u =>
                u.kind === 'villa'
                  ? <VillaCard key={u.id} a={u} lang={lang} />
                  : <ApartmentCard key={u.id} a={u} lang={lang} />,
              )}
            </div>
          </section>
        )}

        {/* DEVELOPER — links straight to /ru/zastrojshhiki/<slug>
            when we resolved one by name; falls back to the index
            otherwise. Logo + name is clickable, mirrors the villa
            detail page so visitors get the same affordance. */}
        {developerName && (
          <section className="mb-10">
            <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {copy.developer}
            </h2>
            {developerLink ? (
              <Link
                href={`${developersRoot}/${developerLink.slug}`}
                className="group flex items-center gap-4 bg-white rounded-2xl border border-[var(--color-border)] p-5 max-w-3xl hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="shrink-0 w-[72px] h-[72px] rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center p-2">
                  {developerLink.logoUrl ? (
                    <Image src={developerLink.logoUrl} alt={developerLink.name} width={56} height={56} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Building2 size={28} className="text-[var(--color-text-muted)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{copy.builtBy}</div>
                  <div className="text-[19px] font-semibold text-[#111827] truncate">{developerLink.name}</div>
                  {devReliability && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <StarRating value={devReliability.score} size={14} />
                      <span className="text-[13px] font-semibold text-[#111827]">{devReliability.score.toFixed(1)}</span>
                      <span className="text-[12px] text-[var(--color-text-muted)]">
                        {lang === 'ru' ? `надёжность Balinsky · ${devReliability.completed} сданных` : `Balinsky reliability · ${devReliability.completed} completed`}
                      </span>
                    </div>
                  )}
                  <div className="mt-1 text-[13px] text-[var(--color-primary-pressed)] font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    {copy.developer} <ChevronRight size={14} />
                  </div>
                </div>
              </Link>
            ) : (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 max-w-3xl">
                <div className="text-[13px] text-[var(--color-text-muted)] mb-1">{copy.builtBy}</div>
                <div className="text-[20px] font-semibold text-[#111827] mb-3">{developerName}</div>
                <Link
                  href={developersRoot}
                  className="inline-flex items-center gap-1 text-[14px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)]"
                >
                  {copy.allDevelopers} <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </section>
        )}

        {managers.length > 0 && <ManagerCard managers={managers} developerName={developerName} />}


        {/* Nearby places — beaches / cafes / nightlife / etc. The
            data is keyed by villa airtable_id; we surface it on
            the complex page using the first villa unit's nearby
            data because units in the same complex share geo. */}
        {nearby && (
          <NearbyPlaces categories={nearby.categories} byCategory={nearby.byCategory} lang={lang} />
        )}

        {districtCopy && districtSlug && (
          <DistrictAboutCard copy={districtCopy} lang={lang} kind="complex" hubHref={`${complexesRoot}/${districtSlug}`} />
        )}

        {/* RESOURCES */}
        {resources.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {copy.docsHeading}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
              {resources.map(r => (
                <a
                  key={r.label}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 bg-white rounded-xl border border-[var(--color-border)] px-5 py-4 hover:border-[var(--color-primary)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <r.Icon size={18} className="text-[var(--color-primary)]" />
                    <span className="text-[14px] font-medium text-[#111827]">{r.label}</span>
                  </div>
                  <ExternalLink size={14} className="text-[var(--color-text-muted)]" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* LOCATION */}
        {lat != null && lng != null && (
          <section className="mb-10">
            <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {copy.location}
            </h2>
            <div className="text-[14px] text-[var(--color-text)] mb-3">
              {/* TASK-13d: full geo chain (area → kecamatan → regency → island)
                  so "Badung Regency" is present on the page, fixing the
                  "Missing: badung regency" flag in our snippets. */}
              {districtRaw ? geoChainString(districtRaw) : copy.locationLine(district)}
            </div>
            {process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
              <div className="mb-4">
                <NeighborhoodHeatMap
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}
                  lat={lat}
                  lng={lng}
                  title={name}
                  lang={lang}
                />
              </div>
            )}
            <a
              href={gmap ?? `https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-[14px] font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
            >
              <MapIcon size={16} className="text-[var(--color-primary)]" />
              {copy.openInMaps}
            </a>
          </section>
        )}

        {/* VIDEOS */}
        {complexVideos.length > 0 && (
          <VideoGrid videos={complexVideos} title={copy.videosTitle(name)} />
        )}

        {/* OTHER COMPLEXES */}
        {otherComplexes.length > 0 && district && (
          <section className="mb-10">
            <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {copy.otherProjectsIn(district)}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {otherComplexes.map(o => (
                <Link
                  key={o.slug}
                  href={`${complexesRoot}/o/${o.slug}`}
                  className="group block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
                >
                  <div className="relative h-[160px] bg-[var(--color-search-bg)]">
                    {o.coverUrl ? (
                      <Image src={o.coverUrl} alt={o.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl text-[#B8C3BC]">🏝️</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-[14px] font-semibold text-[#111827] mb-1 truncate">{o.name}</div>
                    {o.types && (
                      <div className="text-[12px] text-[var(--color-text-muted)] truncate">{o.types}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* INTERNAL LINKS */}
        <section className="mb-10">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">
            {copy.relatedHeading}
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-3xl">
            {[
              { href: complexesRoot, label: copy.related.allComplexes },
              { href: apartmentsRoot, label: copy.related.apartments },
              { href: villasRoot, label: copy.related.villas },
              { href: developersRoot, label: copy.related.developers },
              ...(district ? [
                { href: `${complexesRoot}/${districtRaw!.toLowerCase().replace(/\s+/g, '-')}`, label: copy.related.complexesIn(district) },
                { href: `${apartmentsRoot}/${districtRaw!.toLowerCase().replace(/\s+/g, '-')}`, label: copy.related.apartmentsIn(district) },
              ] : []),
            ].map(l => (
              <li key={l.href + l.label}>
                <Link
                  href={l.href}
                  className="inline-flex items-center gap-1 text-[14px] text-[var(--color-text)] hover:text-[var(--color-primary-pressed)]"
                >
                  <ChevronRight size={14} className="text-[var(--color-primary)]" /> {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-[19px] sm:text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
            {copy.faqHeading}
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

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
