'use client'

// Collapsible "Земля и зонирование" block for villa / apartment /
// complex detail pages. Compact one-line summary up top + expandable
// full grid below. Data shape mirrors lib/land-profile.ts.

import { useState } from 'react'
import {
  Landmark, ChevronDown, ChevronUp, ExternalLink, CircleCheck, CircleX, CircleAlert,
  FileText, AlertTriangle, ShieldCheck, Hotel, Bed, Utensils, Home as HomeIcon,
  MapPin,
} from 'lucide-react'
import type { UseCaseStatus } from '@/lib/land-profile'
import { pickCopy, type Lang } from '@/lib/i18n'
import { translit, hasCyrillic } from '@/lib/translit'

type Tx = Partial<{
  kabupaten: string
  kecamatan: string
  desa: string
  zona_name: string
  subzona_name: string
  gsb_setback: string
  building_height: string
  regulation: string
}>

export type LandProfileProps = {
  lat: number
  lon: number
  kabupaten: string | null
  kecamatan: string | null
  desa: string | null
  zona_name: string | null
  zona_code: string | null
  subzona_name: string | null
  subzona_code: string | null
  kdb_percent: number | null
  klb_ratio: number | null
  kdh_percent: number | null
  ktb_percent: number | null
  gsb_setback: string | null
  building_height: string | null
  allowed_use_count: number | null
  regulation: string | null
  regulation_pdf: string | null
  str_likely_allowed: string | null
  document_perda_url: string | null
  document_body_url: string | null
  document_verification_url: string | null
  uses_hotel: UseCaseStatus
  uses_villa: UseCaseStatus
  uses_kos: UseCaseStatus
  uses_restaurant: UseCaseStatus
  religious_restrictions: string | null
  zone_homogeneity: 'uniform' | 'mixed' | null
  mixed_zones: string | null
  trust_score: number | null
  translations?: { ru?: Tx; en?: Tx } | null
}

const COPY = {
  ru: {
    title: 'Что можно делать с участком',
    summarySub: 'По официальной карте зон Индонезии RDTR',
    expand: 'Подробнее',
    collapse: 'Свернуть',
    str: 'Сдавать посуточно',
    useCases: 'Что можно построить и сдавать',
    hotel: 'Отель',
    villa: 'Вилла',
    kos: 'Гестхаус',
    restaurant: 'Ресторан',
    kabupaten: 'Регион (kabupaten)',
    kecamatan: 'Район (kecamatan)',
    desa: 'Деревня (desa)',
    zone: 'Категория зоны',
    subzone: 'Тип зоны',
    kdb: 'Макс. площадь застройки участка',
    kdbHint: 'KDB — какую долю участка можно занять зданием. Остальное — двор, сад, парковка.',
    klb: 'Макс. суммарная площадь зданий',
    klbHint: 'KLB (коэффициент использования) — во сколько раз общая площадь всех этажей может превышать площадь участка. 2× ≈ один этаж 100% или два этажа по 50%.',
    kdh: 'Минимум зелёной зоны',
    kdhHint: 'KDH — какая часть участка должна остаться без застройки и без покрытия (газон, посадки, проницаемая земля).',
    ktb: 'Подвал — макс. площадь',
    ktbHint: 'KTB — какую долю участка может занимать подвал. На Бали подвалы делают редко из-за грунтовых вод.',
    gsb: 'Отступы от дороги',
    gsbHint: 'GSB — минимальное расстояние от красной линии дороги до фасада. Часто зависит от ширины дороги.',
    height: 'Макс. высота зданий',
    uses: 'Сколько типов использования разрешено',
    regulation: 'Регламент (Perda)',
    pdfPerda: 'Карта зонирования (PP)',
    pdfBody: 'Текст постановления (BT)',
    pdfVerification: 'Сертификат верификации (CT)',
    documents: 'Официальные документы',
    homogeneityUniform: 'Зона однородная',
    homogeneityMixed: 'Стык зон',
    mixedZonesNote: (zones: string) => `Участок попадает на границу зон (${zones}) — стоит проверить вручную, какая зона применяется к конкретной точке.`,
    religiousTitle: '🛕 Балийское правило: храм рядом',
    religiousNote: 'По правилам Bhisama Kesucian Pura от деревенского храма должно быть не меньше 25 м для одноэтажного дома и 50 м для двух- и более этажных. Проверьте расстояние до ближайшего пура.',
    selfCheckTitle: 'Перепроверить на официальных картах',
    selfCheckHint: 'Каждая ссылка откроет точку этого ЖК на сторонней карте — для независимой проверки',
    gistaru: 'GISTARU (зонирование)',
    bhumi: 'BHUMI (кадастр)',
    simtaru: 'SIMTARU (Бали)',
    threeDatu: '3Datu (Бадунг)',
    trustScore: 'Достоверность данных',
    trustHint: '0–100. Учитывает: однородность зоны, наличие документов, отсутствие «сложных» статусов use-case-ов.',
    none: '—',
    strYes: 'легально',
    strNo: 'не легально',
    strMaybe: 'нужна проверка',
    statusAllowed: 'можно',
    statusLimited: 'с ограничениями',
    statusConditional: 'по согласованию',
    statusLimitedConditional: 'с ограничениями + согласованием',
    statusForbidden: 'нельзя',
    statusUnknown: 'нет данных',
  },
  en: {
    title: 'What you can do with this land',
    summarySub: 'From Indonesia\'s official zoning map (RDTR)',
    expand: 'Show details',
    collapse: 'Hide details',
    str: 'Short-term rental',
    useCases: 'What you can build and rent out',
    hotel: 'Hotel',
    villa: 'Villa',
    kos: 'Guesthouse',
    restaurant: 'Restaurant',
    kabupaten: 'Regency (kabupaten)',
    kecamatan: 'District (kecamatan)',
    desa: 'Village (desa)',
    zone: 'Zone category',
    subzone: 'Zone type',
    kdb: 'Max plot coverage',
    kdbHint: 'KDB — what fraction of the plot a building may cover. The remainder must stay as yard, garden, or parking.',
    klb: 'Max total floor area',
    klbHint: 'KLB (floor-area ratio) — how many times the total floor area across all stories may exceed the plot area. 2× ≈ one full-coverage story or two half-coverage stories.',
    kdh: 'Min green area',
    kdhHint: 'KDH — share of the plot that must remain unbuilt and unpaved (lawn, plants, permeable ground).',
    ktb: 'Basement footprint max',
    ktbHint: 'KTB — what fraction of the plot the basement may cover. Basements are rare in Bali due to groundwater.',
    gsb: 'Road setback',
    gsbHint: 'GSB — minimum distance from the road right-of-way to the building façade. Often depends on the road width.',
    height: 'Max building height',
    uses: 'Number of permitted use types',
    regulation: 'Regulation (Perda)',
    pdfPerda: 'Zoning map (PP)',
    pdfBody: 'Regulation text (BT)',
    pdfVerification: 'Verification certificate (CT)',
    documents: 'Official documents',
    homogeneityUniform: 'Uniform zone',
    homogeneityMixed: 'Zone boundary',
    mixedZonesNote: (zones: string) => `The plot sits on a boundary between zones (${zones}) — verify manually which zone applies to the exact point.`,
    religiousTitle: '🛕 Balinese rule: temple nearby',
    religiousNote: 'Bhisama Kesucian Pura requires at least 25 m from a village temple for single-story buildings and 50 m for two-or-more-story buildings. Check the distance to the nearest pura.',
    selfCheckTitle: 'Cross-check on official maps',
    selfCheckHint: 'Each link opens this complex\'s coordinates on an independent zoning / cadastral map',
    gistaru: 'GISTARU (zoning)',
    bhumi: 'BHUMI (cadastre)',
    simtaru: 'SIMTARU (Bali)',
    threeDatu: '3Datu (Badung)',
    trustScore: 'Data reliability',
    trustHint: '0–100. Aggregates zone uniformity, document availability, and absence of "complicated" use-case statuses.',
    none: '—',
    strYes: 'allowed',
    strNo: 'not allowed',
    strMaybe: 'verify before buying',
    statusAllowed: 'can',
    statusLimited: 'limited',
    statusConditional: 'with permits',
    statusLimitedConditional: 'limited + permits',
    statusForbidden: 'cannot',
    statusUnknown: 'no data',
  },
  id: {
    title: 'Apa yang bisa dilakukan dengan tanah ini',
    summarySub: 'Dari peta zonasi resmi Indonesia (RDTR)',
    expand: 'Lihat detail',
    collapse: 'Sembunyikan detail',
    str: 'Sewa jangka pendek',
    useCases: 'Yang bisa dibangun dan disewakan',
    hotel: 'Hotel',
    villa: 'Vila',
    kos: 'Rumah tamu',
    restaurant: 'Restoran',
    kabupaten: 'Kabupaten',
    kecamatan: 'Kecamatan',
    desa: 'Desa',
    zone: 'Kategori zona',
    subzone: 'Tipe zona',
    kdb: 'Maks. cakupan lahan',
    kdbHint: 'KDB — berapa bagian lahan yang boleh ditutup bangunan. Sisanya harus berupa halaman, taman, atau parkir.',
    klb: 'Maks. total luas lantai',
    klbHint: 'KLB (rasio luas lantai) — berapa kali total luas lantai seluruh tingkat boleh melebihi luas lahan. 2× ≈ satu tingkat penuh atau dua tingkat setengah cakupan.',
    kdh: 'Min. area hijau',
    kdhHint: 'KDH — bagian lahan yang harus tetap tanpa bangunan dan tanpa perkerasan (rumput, tanaman, tanah resapan).',
    ktb: 'Maks. luas basement',
    ktbHint: 'KTB — berapa bagian lahan yang boleh ditempati basement. Basement jarang di Bali karena air tanah.',
    gsb: 'Garis sempadan jalan',
    gsbHint: 'GSB — jarak minimum dari batas jalan ke fasad bangunan. Sering bergantung pada lebar jalan.',
    height: 'Maks. tinggi bangunan',
    uses: 'Jumlah jenis penggunaan yang diizinkan',
    regulation: 'Peraturan (Perda)',
    pdfPerda: 'Peta zonasi (PP)',
    pdfBody: 'Teks peraturan (BT)',
    pdfVerification: 'Sertifikat verifikasi (CT)',
    documents: 'Dokumen resmi',
    homogeneityUniform: 'Zona seragam',
    homogeneityMixed: 'Batas zona',
    mixedZonesNote: (zones: string) => `Lahan berada di perbatasan antar zona (${zones}) — periksa manual zona mana yang berlaku pada titik tepatnya.`,
    religiousTitle: '🛕 Aturan Bali: pura di dekatnya',
    religiousNote: 'Bhisama Kesucian Pura mensyaratkan minimal 25 m dari pura desa untuk bangunan satu lantai dan 50 m untuk bangunan dua lantai atau lebih. Periksa jarak ke pura terdekat.',
    selfCheckTitle: 'Periksa silang di peta resmi',
    selfCheckHint: 'Setiap tautan membuka koordinat kompleks ini di peta zonasi / kadaster independen',
    gistaru: 'GISTARU (zonasi)',
    bhumi: 'BHUMI (kadaster)',
    simtaru: 'SIMTARU (Bali)',
    threeDatu: '3Datu (Badung)',
    trustScore: 'Keandalan data',
    trustHint: '0–100. Menggabungkan keseragaman zona, ketersediaan dokumen, dan tidak adanya status penggunaan yang "rumit".',
    none: '—',
    strYes: 'diizinkan',
    strNo: 'tidak diizinkan',
    strMaybe: 'periksa sebelum membeli',
    statusAllowed: 'bisa',
    statusLimited: 'terbatas',
    statusConditional: 'dengan izin',
    statusLimitedConditional: 'terbatas + izin',
    statusForbidden: 'tidak bisa',
    statusUnknown: 'tidak ada data',
  },
  fr: {
    title: 'Ce que vous pouvez faire de ce terrain',
    summarySub: 'D\'après la carte de zonage officielle indonésienne (RDTR)',
    expand: 'Afficher les détails',
    collapse: 'Masquer les détails',
    str: 'Location courte durée',
    useCases: 'Ce que vous pouvez construire et louer',
    hotel: 'Hôtel',
    villa: 'Villa',
    kos: 'Maison d\'hôtes',
    restaurant: 'Restaurant',
    kabupaten: 'Régence (kabupaten)',
    kecamatan: 'District (kecamatan)',
    desa: 'Village (desa)',
    zone: 'Catégorie de zone',
    subzone: 'Type de zone',
    kdb: 'Emprise au sol max.',
    kdbHint: 'KDB — la fraction du terrain qu\'un bâtiment peut couvrir. Le reste doit rester en cour, jardin ou parking.',
    klb: 'Surface de plancher totale max.',
    klbHint: 'KLB (coefficient d\'occupation) — combien de fois la surface de plancher cumulée de tous les étages peut dépasser la surface du terrain. 2× ≈ un étage à pleine emprise ou deux étages à demi-emprise.',
    kdh: 'Espace vert min.',
    kdhHint: 'KDH — part du terrain qui doit rester non bâtie et non revêtue (pelouse, plantations, sol perméable).',
    ktb: 'Emprise max. du sous-sol',
    ktbHint: 'KTB — la fraction du terrain que le sous-sol peut occuper. Les sous-sols sont rares à Bali à cause de la nappe phréatique.',
    gsb: 'Retrait par rapport à la route',
    gsbHint: 'GSB — distance minimale entre l\'emprise de la route et la façade du bâtiment. Dépend souvent de la largeur de la route.',
    height: 'Hauteur max. du bâtiment',
    uses: 'Nombre de types d\'usage autorisés',
    regulation: 'Règlement (Perda)',
    pdfPerda: 'Carte de zonage (PP)',
    pdfBody: 'Texte du règlement (BT)',
    pdfVerification: 'Certificat de vérification (CT)',
    documents: 'Documents officiels',
    homogeneityUniform: 'Zone uniforme',
    homogeneityMixed: 'Limite de zones',
    mixedZonesNote: (zones: string) => `Le terrain se trouve à la limite entre des zones (${zones}) — vérifiez manuellement quelle zone s'applique au point exact.`,
    religiousTitle: '🛕 Règle balinaise : temple à proximité',
    religiousNote: 'La Bhisama Kesucian Pura impose au moins 25 m d\'un temple de village pour les bâtiments d\'un étage et 50 m pour ceux de deux étages ou plus. Vérifiez la distance au pura le plus proche.',
    selfCheckTitle: 'Recouper sur les cartes officielles',
    selfCheckHint: 'Chaque lien ouvre les coordonnées de cette résidence sur une carte de zonage / cadastrale indépendante',
    gistaru: 'GISTARU (zonage)',
    bhumi: 'BHUMI (cadastre)',
    simtaru: 'SIMTARU (Bali)',
    threeDatu: '3Datu (Badung)',
    trustScore: 'Fiabilité des données',
    trustHint: '0–100. Agrège l\'uniformité de la zone, la disponibilité des documents et l\'absence de statuts d\'usage « compliqués ».',
    none: '—',
    strYes: 'autorisé',
    strNo: 'non autorisé',
    strMaybe: 'à vérifier avant l\'achat',
    statusAllowed: 'possible',
    statusLimited: 'limité',
    statusConditional: 'avec permis',
    statusLimitedConditional: 'limité + permis',
    statusForbidden: 'impossible',
    statusUnknown: 'aucune donnée',
  },
} as const

// Widen the literal-string properties of COPY['ru'] so EN can also fit.
type CopyShape = { [K in keyof (typeof COPY)['ru']]: (typeof COPY)['ru'][K] extends (...args: infer A) => infer R ? (...args: A) => R : string }

function strBadge(raw: string | null): { tone: 'green' | 'red' | 'amber' | 'gray'; short: string; full: string } | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower.startsWith('likely yes') || lower.startsWith('yes')) {
    return { tone: 'green', short: '✓', full: raw }
  }
  if (lower.startsWith('no')) {
    return { tone: 'red', short: '✗', full: raw }
  }
  if (lower.startsWith('probably no')) {
    return { tone: 'amber', short: '?', full: raw }
  }
  return { tone: 'gray', short: '?', full: raw }
}

const USE_TONE: Record<NonNullable<UseCaseStatus>, 'green' | 'amber' | 'orange' | 'red' | 'gray'> = {
  allowed: 'green',
  limited: 'amber',
  conditional: 'orange',
  limited_conditional: 'red',
  forbidden: 'red',
  unknown: 'gray',
}

function caseChipMeta(c: CopyShape, status: UseCaseStatus): { tone: 'green' | 'amber' | 'orange' | 'red' | 'gray'; label: string } {
  if (!status) return { tone: 'gray', label: c.statusUnknown }
  const tone = USE_TONE[status]
  const label =
    status === 'allowed' ? c.statusAllowed :
    status === 'limited' ? c.statusLimited :
    status === 'conditional' ? c.statusConditional :
    status === 'limited_conditional' ? c.statusLimitedConditional :
    status === 'forbidden' ? c.statusForbidden :
    c.statusUnknown
  return { tone, label }
}

function toneClasses(tone: 'green' | 'amber' | 'orange' | 'red' | 'gray'): string {
  switch (tone) {
    case 'green':  return 'bg-[#DCFCE7] text-[#065F46]'
    case 'amber':  return 'bg-[#FEF3C7] text-[#92400E]'
    case 'orange': return 'bg-[#FFEDD5] text-[#9A3412]'
    case 'red':    return 'bg-[#FEE2E2] text-[#991B1B]'
    default:       return 'bg-[#F3F4F6] text-[#374151]'
  }
}

function UseCaseRow({ icon: Icon, label, status, c }: {
  icon: typeof Hotel
  label: string
  status: UseCaseStatus
  c: CopyShape
}) {
  if (!status) return null
  const chip = caseChipMeta(c, status)
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--color-search-bg)]">
      <span className="inline-flex items-center gap-1.5 text-[13px] text-[#111827]">
        <Icon size={14} className="text-[var(--color-text-muted)]" />
        {label}
      </span>
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${toneClasses(chip.tone)}`}>
        {chip.tone === 'green' && <CircleCheck size={11} />}
        {chip.tone === 'red'   && <CircleX size={11} />}
        {(chip.tone === 'amber' || chip.tone === 'orange') && <CircleAlert size={11} />}
        {chip.label}
      </span>
    </div>
  )
}


export function LandProfileBlock({ data, lang = 'ru' }: { data: LandProfileProps; lang?: Lang }) {
  const [open, setOpen] = useState(false)
  const c = pickCopy(COPY, lang)

  const tx = (lang === 'ru' ? data.translations?.ru : data.translations?.en) ?? {}
  // Fall back to the raw value; but on non-RU pages, transliterate any
  // untranslated Cyrillic term (kabupaten/zone names imported RU-only) so
  // an id/fr visitor sees Latin (e.g. "Бадунг" → "Badung").
  const t = (key: keyof Tx, raw: string | null): string | null => {
    const v = tx[key] ?? raw
    return lang !== 'ru' && v && hasCyrillic(v) ? translit(v) : v
  }

  // One-line summary: subzone code + (translated) subzone name + STR verdict + facts.
  const subZoneShort = [data.subzona_code, t('subzona_name', data.subzona_name)].filter(Boolean).join(' · ')
  const str = strBadge(data.str_likely_allowed)

  const kecShort = (() => {
    const raw = t('kecamatan', data.kecamatan)
    if (!raw) return null
    return raw.replace(/^(Kecamatan|Кечаматан)\s+/i, '')
  })()

  // Friendly summary chips — drop technical abbreviations from the
  // collapsed view; full Indonesian indicator names are still in the
  // expanded panel with explanatory tooltips.
  const buildHeightRaw = t('building_height', data.building_height)
  const buildHeight = buildHeightRaw && lang === 'ru'
    ? buildHeightRaw.replace(/\bm\b/g, 'м')
    : buildHeightRaw
  const facts = [
    kecShort,
    data.kdb_percent != null ? (lang === 'ru' ? `застройка до ${data.kdb_percent}%` : `up to ${data.kdb_percent}% built`) : null,
    buildHeight ? (lang === 'ru' ? `высота ${buildHeight}` : `height ${buildHeight}`) : null,
  ].filter(Boolean)

  // 3 documents, only those that exist.
  const docs: { label: string; url: string }[] = []
  if (data.document_perda_url) docs.push({ label: c.pdfPerda, url: data.document_perda_url })
  if (data.document_body_url) docs.push({ label: c.pdfBody, url: data.document_body_url })
  if (data.document_verification_url) docs.push({ label: c.pdfVerification, url: data.document_verification_url })
  // Fallback when only `regulation_pdf` is set (older rows).
  if (docs.length === 0 && data.regulation_pdf) {
    docs.push({ label: c.pdfPerda, url: data.regulation_pdf })
  }

  const hasUseCases = !!(data.uses_hotel || data.uses_villa || data.uses_kos || data.uses_restaurant)
  const mixed = data.zone_homogeneity === 'mixed'

  // Self-verification deep-links — open the public viewers at this lat/lon.
  // Formats verified by hitting each site directly. GISTARU and SIMTARU
  // accept lat/lon as query params; BHUMI deep-links land on the map
  // centred on the coordinate; 3Datu only shown for Badung objects.
  const dl = encodeURIComponent(String(data.lat))
  const dln = encodeURIComponent(String(data.lon))
  const links: { label: string; url: string }[] = [
    { label: c.gistaru,  url: `https://gistaru.atrbpn.go.id/rdtrinteraktif/?lat=${dl}&lng=${dln}&zoom=18` },
    { label: c.bhumi,    url: `https://bhumi.atrbpn.go.id/peta?lat=${dl}&lng=${dln}&zoom=18` },
    { label: c.simtaru,  url: `https://simtaru.baliprov.go.id/?lat=${dl}&lng=${dln}` },
  ]
  if (data.kabupaten && /badung/i.test(data.kabupaten)) {
    links.push({ label: c.threeDatu, url: `https://3datu.badungkab.go.id/?lat=${dl}&lng=${dln}` })
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-[var(--color-search-bg)] transition-colors"
        aria-expanded={open}
      >
        <Landmark size={18} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1 flex items-center gap-2">
            {c.title}
            {data.trust_score != null && (
              <span
                title={c.trustHint}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold normal-case tracking-normal ${
                  data.trust_score >= 70 ? 'bg-[#DCFCE7] text-[#065F46]' :
                  data.trust_score >= 50 ? 'bg-[#FEF3C7] text-[#92400E]' :
                                           'bg-[#FEE2E2] text-[#991B1B]'
                }`}
              >
                <ShieldCheck size={11} /> {c.trustScore} {data.trust_score}
              </span>
            )}
          </div>
          <div className="text-[15px] font-medium text-[#111827]">
            {subZoneShort || (data.zona_name ?? c.none)}
          </div>
          {(facts.length > 0 || str || mixed) && (
            <div className="text-[12.5px] text-[var(--color-text-muted)] mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
              {str && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${toneClasses(
                  str.tone === 'green' ? 'green' : str.tone === 'red' ? 'red' : str.tone === 'amber' ? 'amber' : 'gray'
                )}`}>
                  {str.tone === 'green' && <CircleCheck size={11} />}
                  {str.tone === 'red'   && <CircleX size={11} />}
                  {str.tone === 'amber' && <CircleAlert size={11} />}
                  {c.str}: {
                    str.tone === 'green' ? c.strYes :
                    str.tone === 'red'   ? c.strNo :
                    str.tone === 'amber' ? c.strNo :
                                           c.strMaybe
                  }
                </span>
              )}
              {mixed && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${toneClasses('amber')}`}>
                  <AlertTriangle size={11} /> {c.homogeneityMixed}
                </span>
              )}
              {facts.map(f => <span key={f}>{f}</span>)}
            </div>
          )}
        </div>
        <span className="text-[12px] text-[var(--color-primary)] font-medium inline-flex items-center gap-0.5 shrink-0 mt-1">
          {open ? c.collapse : c.expand}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {hasUseCases && (
        <div className="px-5 pb-4">
          <div className="text-[11.5px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">{c.useCases}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <UseCaseRow icon={Hotel} label={c.hotel} status={data.uses_hotel} c={c} />
            <UseCaseRow icon={HomeIcon} label={c.villa} status={data.uses_villa} c={c} />
            <UseCaseRow icon={Bed} label={c.kos} status={data.uses_kos} c={c} />
            <UseCaseRow icon={Utensils} label={c.restaurant} status={data.uses_restaurant} c={c} />
          </div>
        </div>
      )}

      {open && (
        <div className="border-t border-[var(--color-border)] px-5 py-4 text-[13.5px] space-y-5">
          {mixed && data.mixed_zones && (
            <div className="rounded-lg border border-[#F59E0B]/40 bg-[#FEF3C7] px-3 py-2 text-[12.5px] text-[#78350F]">
              <AlertTriangle size={14} className="inline -mt-0.5 mr-1" />
              {c.mixedZonesNote(data.mixed_zones)}
            </div>
          )}

          {data.religious_restrictions && (
            <div className="rounded-lg border border-[#D4A373]/40 bg-[#FFF7E6] px-3 py-2.5 text-[12.5px] text-[#78350F]">
              <div className="font-semibold mb-1">{c.religiousTitle}</div>
              <div>{c.religiousNote}</div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {(tx.kabupaten || data.kabupaten) && <Row label={c.kabupaten} value={t('kabupaten', data.kabupaten)!} />}
            {(tx.kecamatan || data.kecamatan) && <Row label={c.kecamatan} value={t('kecamatan', data.kecamatan)!} />}
            {(tx.desa || data.desa) && <Row label={c.desa} value={t('desa', data.desa)!} />}
            {(tx.zona_name || data.zona_name || data.zona_code) && (
              <Row label={c.zone} value={[t('zona_name', data.zona_name), data.zona_code ? `(${data.zona_code})` : null].filter(Boolean).join(' ')} />
            )}
            {(tx.subzona_name || data.subzona_name || data.subzona_code) && (
              <Row label={c.subzone} value={[t('subzona_name', data.subzona_name), data.subzona_code ? `(${data.subzona_code})` : null].filter(Boolean).join(' ')} />
            )}
            {data.kdb_percent != null && <Row label={c.kdb} value={`${data.kdb_percent}%`} hint={c.kdbHint} />}
            {data.klb_ratio != null && <Row label={c.klb} value={`${data.klb_ratio}×`} hint={c.klbHint} />}
            {data.kdh_percent != null && <Row label={c.kdh} value={`${data.kdh_percent}%`} hint={c.kdhHint} />}
            {data.ktb_percent != null && <Row label={c.ktb} value={`${data.ktb_percent}%`} hint={c.ktbHint} />}
            {(tx.building_height || data.building_height) && <Row label={c.height} value={buildHeight!} wide />}
            {(tx.gsb_setback || data.gsb_setback) && <Row label={c.gsb} value={t('gsb_setback', data.gsb_setback)!} wide hint={c.gsbHint} />}
            {data.allowed_use_count != null && <Row label={c.uses} value={String(data.allowed_use_count)} />}
            {(tx.regulation || data.regulation) && <Row label={c.regulation} value={t('regulation', data.regulation)!} wide />}
          </div>

          {docs.length > 0 && (
            <div>
              <div className="text-[11.5px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">{c.documents}</div>
              <div className="flex flex-wrap gap-2">
                {docs.map(d => (
                  <a
                    key={d.url}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-search-bg)] border border-[var(--color-border)] text-[12.5px] text-[#111827] hover:border-[var(--color-primary)] no-underline"
                  >
                    <FileText size={12} /> {d.label}
                    <ExternalLink size={11} className="opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11.5px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">{c.selfCheckTitle}</div>
            <div className="flex flex-wrap gap-2">
              {links.map(l => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-[12.5px] text-[#111827] hover:border-[var(--color-primary)] no-underline"
                >
                  <MapPin size={12} /> {l.label}
                  <ExternalLink size={11} className="opacity-50" />
                </a>
              ))}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)] mt-1.5">{c.selfCheckHint}</div>
          </div>

          <div className="text-[11.5px] text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">
            {c.summarySub}
          </div>
        </div>
      )}
    </section>
  )
}

function Row({ label, value, wide = false, hint }: { label: string; value: string; wide?: boolean; hint?: string }) {
  return (
    <div className={`flex flex-col gap-0.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-[11.5px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[13.5px] text-[#111827] leading-snug" title={hint}>{value}</span>
    </div>
  )
}
