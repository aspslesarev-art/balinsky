import { Document, Page, Text, View, Image, Link, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import type { WishlistItem } from '@/lib/wishlist'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { classifyLandUse } from '@/lib/land-use'
import { telegramUrl, whatsappUrl } from '@/lib/agent-links'
import { formatPriceExact, type Currency } from '@/lib/currency'
import type { AgentContact, PdfOrientation } from './VillaPresentationPdf'

Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.otf', fontWeight: 'normal' },
    { src: '/fonts/Inter-Bold.otf', fontWeight: 'bold' },
  ],
})

const COLORS = {
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  borderSoft: '#F3F4F6',
  primary: '#33A474',
  primaryDark: '#257754',
  primarySoft: '#E5F2EC',
  bgSoft: '#F9FAFB',
  white: '#FFFFFF',
  bestText: '#15803D',
  bestBg: '#F0FDF4',
  warnText: '#B91C1C',
  warnTextSoft: '#7F1D1D',
  warnBg: '#FEF2F2',
  warnBorder: '#FECACA',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  pagePadded: { padding: '32 36' },
  // Cover
  coverWrap: { flex: 1, justifyContent: 'center' },
  coverEyebrow: { fontSize: 10, color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12, fontWeight: 'bold' },
  coverTitle: { fontSize: 36, fontWeight: 'bold', lineHeight: 1.05, color: COLORS.text, marginBottom: 16 },
  coverMeta: { fontSize: 12, color: COLORS.muted },
  // Per-item
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  itemNumber: { fontSize: 9, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  itemKindBadge: { fontSize: 9, color: COLORS.primaryDark, textTransform: 'uppercase', letterSpacing: 0.6 },
  itemTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4, lineHeight: 1.15 },
  itemDistrict: { fontSize: 11, color: COLORS.muted, marginBottom: 14 },
  itemPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 14 },
  itemPrice: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  itemPriceM2: { fontSize: 11, color: COLORS.muted },
  itemPhoto: { width: '100%', height: '100%', objectFit: 'cover' },
  itemPhotoBox: { borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.bgSoft },
  itemFactsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemFactCard: {
    width: '48.5%',
    border: `1 solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 8,
    backgroundColor: COLORS.white,
    minHeight: 44,
  },
  itemFactLabel: { fontSize: 8, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  itemFactValue: { fontSize: 11, fontWeight: 'bold', color: COLORS.text },
  // Comparison table — densely packed so the full row set + 5 columns
  // fits on a single landscape A4 even with the land-use warning
  // panel above. Don't loosen these without re-counting rows.
  cmpTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 2, color: COLORS.text },
  cmpSubtitle: { fontSize: 9, color: COLORS.muted, marginBottom: 8 },
  cmpHead: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 4, marginBottom: 2 },
  cmpHeadLabel: { fontSize: 8, color: COLORS.muted, textTransform: 'uppercase' },
  cmpHeadCol: { flex: 1, paddingHorizontal: 3 },
  cmpHeadPhoto: { width: '100%', height: 46, borderRadius: 4, backgroundColor: COLORS.bgSoft, marginBottom: 3, overflow: 'hidden' },
  cmpHeadPhotoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cmpHeadTitle: { fontSize: 8, fontWeight: 'bold', color: COLORS.text, lineHeight: 1.15 },
  cmpRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft, paddingVertical: 3, alignItems: 'flex-start' },
  cmpRowLabel: { fontSize: 7.5, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  cmpRowVal: { fontSize: 8.5, color: COLORS.text },
  cmpRowValBest: { fontSize: 8.5, color: COLORS.bestText, fontWeight: 'bold' },
  cmpRowValWorst: { fontSize: 8.5, color: COLORS.warnText, fontWeight: 'bold' },
  cmpRowDash: { fontSize: 8.5, color: COLORS.muted },
  // Land-use warning panel — same pattern (red border + soft red bg)
  // we use on the on-screen shortlist so the document feels familiar.
  warnPanel: {
    borderWidth: 1,
    borderColor: COLORS.warnBorder,
    backgroundColor: COLORS.warnBg,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  warnTitle: { fontSize: 10, fontWeight: 'bold', color: COLORS.warnText, marginBottom: 2 },
  warnBody: { fontSize: 9, color: COLORS.warnTextSoft, lineHeight: 1.35 },
  // Agent page
  agentWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  agentInner: { width: '70%', maxWidth: 480, alignItems: 'center' },
  agentEyebrow: { fontSize: 10, color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontWeight: 'bold' },
  agentName: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 18, textAlign: 'center' },
  agentSubtitle: { fontSize: 11, color: COLORS.muted, marginBottom: 24, textAlign: 'center' },
  contactRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, border: `1 solid ${COLORS.border}`, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 10, width: '100%', justifyContent: 'space-between' },
  contactLabel: { fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  contactValue: { fontSize: 13, fontWeight: 'bold', color: COLORS.text },
  // Same look as contactValue but used inside <Link>: primary colour
  // hints "this is clickable" and we strip the default underline so
  // the value reads as the agent typed it.
  contactValueLink: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary, textDecoration: 'none' },
  linkBox: { fontSize: 13, color: COLORS.primary, borderRadius: 10, border: `1 solid ${COLORS.border}`, paddingVertical: 12, paddingHorizontal: 16, textDecoration: 'none', textAlign: 'center', width: '100%' },
  // Footer (page numbers)
  footer: { position: 'absolute', bottom: 16, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: COLORS.muted },
})

const SITE_URL = 'https://balinsky.info'

const COPY = {
  ru: {
    coverEyebrow: 'Подборка для сравнения',
    coverTitle: 'Подборка объектов',
    coverCount: (n: number) => `${n} ${pluralRu(n, ['объект', 'объекта', 'объектов'])}`,
    selectedAt: 'Сформировано',
    objectN: (i: number, total: number) => `Объект ${i} / ${total}`,
    villa: 'Вилла', apartment: 'Апартаменты', complex: 'Комплекс', rental: 'Аренда',
    comparisonTitle: 'Сравнение',
    comparisonSubtitle: 'Боковое сравнение объектов из подборки. Лучшее значение в строке выделено зелёным.',
    rowPrice: 'Цена',
    rowPriceM2: 'Цена за м²',
    rowPriceM2Year: 'Цена м² / год',
    rowYield: 'Заявленная доходность',
    rowBestRoi: 'ROI (наш расчёт)',
    rowLease: 'Лизхолд',
    rowPermit: 'Разрешение',
    rowDealType: 'Тип сделки',
    rowStatus: 'Статус стройки',
    rowCompletion: 'Сдача',
    rowBedrooms: 'Спальни',
    rowArea: 'Площадь',
    rowLand: 'Земля',
    rowFloor: 'Этаж',
    rowDistrict: 'Район',
    rowLandUse: 'Назначение земли',
    rowStyle: 'Стиль интерьера',
    rowDeveloper: 'Застройщик',
    factPrice: 'Цена',
    factPriceM2: 'Цена за м²',
    factBedrooms: 'Спальни',
    factArea: 'Дом',
    factLand: 'Земля',
    factDistrict: 'Район',
    factLease: 'Лизхолд',
    factPermit: 'Разрешение',
    factStatus: 'Статус',
    factCompletion: 'Сдача',
    factDealType: 'Тип сделки',
    factYield: 'Доходность',
    factDeveloper: 'Застройщик',
    sqm: 'м²',
    years: 'лет',
    dealResale: 'Перепродажа', dealSecondary: 'Вторичка', dealPrimary: 'От застройщика',
    devReady: (n: number) => `${n} ${pluralRu(n, ['сдан', 'сдано', 'сдано'])}`,
    devInProgress: (n: number) => `${n} ${pluralRu(n, ['строится', 'строятся', 'строятся'])}`,
    agentEyebrow: 'Ваш агент',
    agentSubtitle: 'Свяжитесь напрямую — быстро отвечу и помогу с просмотром',
    siteEyebrow: 'Подробнее на сайте',
    siteTitle: 'Полная подборка',
    siteSubtitle: 'Каждая карточка ведёт на страницу объекта с актуальной ценой и формой связи',
    footerName: 'balinsky.info — подборка',
    footerNameAgent: 'Подборка',
    factListingId: 'ID для поиска',
    rowListingId: 'ID',
    landWarnTitle: 'Земля не для посуточной аренды',
    landWarnBody: (titles: string) => `В подборке есть объект на земле, официально не предназначенной для посуточной аренды: ${titles}. Уточните легальный статус сдачи у застройщика — это влияет на доходность от Booking/Airbnb.`,
  },
  en: {
    coverEyebrow: 'Comparison shortlist',
    coverTitle: 'Selected listings',
    coverCount: (n: number) => `${n} ${n === 1 ? 'listing' : 'listings'}`,
    selectedAt: 'Generated',
    objectN: (i: number, total: number) => `Listing ${i} / ${total}`,
    villa: 'Villa', apartment: 'Apartment', complex: 'Complex', rental: 'Rental',
    comparisonTitle: 'Comparison',
    comparisonSubtitle: 'Side-by-side comparison of saved listings. Best value in each row is highlighted green.',
    rowPrice: 'Price',
    rowPriceM2: 'Price / m²',
    rowPriceM2Year: 'Price m² / year',
    rowYield: 'Claimed yield',
    rowBestRoi: 'ROI (our estimate)',
    rowLease: 'Leasehold',
    rowPermit: 'Permit',
    rowDealType: 'Deal',
    rowStatus: 'Build status',
    rowCompletion: 'Completion',
    rowBedrooms: 'Bedrooms',
    rowArea: 'Area',
    rowLand: 'Land',
    rowFloor: 'Floor',
    rowDistrict: 'District',
    rowLandUse: 'Land use',
    rowStyle: 'Interior style',
    rowDeveloper: 'Developer',
    factPrice: 'Price',
    factPriceM2: 'Price / m²',
    factBedrooms: 'Bedrooms',
    factArea: 'House',
    factLand: 'Land',
    factDistrict: 'District',
    factLease: 'Leasehold',
    factPermit: 'Permit',
    factStatus: 'Status',
    factCompletion: 'Completion',
    factDealType: 'Deal',
    factYield: 'Yield',
    factDeveloper: 'Developer',
    sqm: 'm²',
    years: 'yrs',
    dealResale: 'Resale', dealSecondary: 'Secondary', dealPrimary: 'Developer',
    devReady: (n: number) => `${n} delivered`,
    devInProgress: (n: number) => `${n} in progress`,
    agentEyebrow: 'Your agent',
    agentSubtitle: 'Reach out directly — quick replies, help with viewings',
    siteEyebrow: 'Browse on site',
    siteTitle: 'Full shortlist',
    siteSubtitle: 'Each card links to the listing page with up-to-date price and a contact form',
    footerName: 'balinsky.info — shortlist',
    footerNameAgent: 'Shortlist',
    factListingId: 'Lookup ID',
    rowListingId: 'ID',
    landWarnTitle: 'Land not zoned for daily rental',
    landWarnBody: (titles: string) => `Your shortlist contains a listing on land not officially zoned for daily rental: ${titles}. Verify the legal rental status with the developer — it affects revenue from Booking/Airbnb.`,
  },
  id: {
    coverEyebrow: 'Daftar perbandingan',
    coverTitle: 'Objek pilihan',
    coverCount: (n: number) => `${n} objek`,
    selectedAt: 'Dibuat',
    objectN: (i: number, total: number) => `Objek ${i} / ${total}`,
    villa: 'Vila', apartment: 'Apartemen', complex: 'Kompleks', rental: 'Sewa',
    comparisonTitle: 'Perbandingan',
    comparisonSubtitle: 'Perbandingan berdampingan objek tersimpan. Nilai terbaik di setiap baris ditandai hijau.',
    rowPrice: 'Harga',
    rowPriceM2: 'Harga / m²',
    rowPriceM2Year: 'Harga m² / tahun',
    rowYield: 'Imbal hasil klaim',
    rowBestRoi: 'ROI (perkiraan kami)',
    rowLease: 'Leasehold',
    rowPermit: 'Izin',
    rowDealType: 'Jenis transaksi',
    rowStatus: 'Status pembangunan',
    rowCompletion: 'Serah terima',
    rowBedrooms: 'Kamar tidur',
    rowArea: 'Luas',
    rowLand: 'Luas tanah',
    rowFloor: 'Lantai',
    rowDistrict: 'Area',
    rowLandUse: 'Peruntukan lahan',
    rowStyle: 'Gaya interior',
    rowDeveloper: 'Pengembang',
    factPrice: 'Harga',
    factPriceM2: 'Harga / m²',
    factBedrooms: 'Kamar tidur',
    factArea: 'Rumah',
    factLand: 'Luas tanah',
    factDistrict: 'Area',
    factLease: 'Leasehold',
    factPermit: 'Izin',
    factStatus: 'Status',
    factCompletion: 'Serah terima',
    factDealType: 'Jenis transaksi',
    factYield: 'Imbal hasil',
    factDeveloper: 'Pengembang',
    sqm: 'm²',
    years: 'thn',
    dealResale: 'Jual kembali', dealSecondary: 'Sekunder', dealPrimary: 'Dari pengembang',
    devReady: (n: number) => `${n} selesai`,
    devInProgress: (n: number) => `${n} dalam proses`,
    agentEyebrow: 'Agen Anda',
    agentSubtitle: 'Hubungi langsung — balasan cepat, bantuan untuk kunjungan',
    siteEyebrow: 'Jelajahi di situs',
    siteTitle: 'Daftar lengkap',
    siteSubtitle: 'Setiap kartu tertaut ke halaman objek dengan harga terkini dan formulir kontak',
    footerName: 'balinsky.info — daftar pilihan',
    footerNameAgent: 'Daftar pilihan',
    factListingId: 'ID pencarian',
    rowListingId: 'ID',
    landWarnTitle: 'Lahan tidak diperuntukkan untuk sewa harian',
    landWarnBody: (titles: string) => `Daftar Anda memuat objek di lahan yang secara resmi tidak diperuntukkan bagi sewa harian: ${titles}. Pastikan status sewa yang legal dengan pengembang — hal ini memengaruhi pendapatan dari Booking/Airbnb.`,
  },
  fr: {
    coverEyebrow: 'Liste de comparaison',
    coverTitle: 'Biens sélectionnés',
    coverCount: (n: number) => `${n} bien${n === 1 ? '' : 's'}`,
    selectedAt: 'Généré',
    objectN: (i: number, total: number) => `Bien ${i} / ${total}`,
    villa: 'Villa', apartment: 'Appartement', complex: 'Résidence', rental: 'Location',
    comparisonTitle: 'Comparaison',
    comparisonSubtitle: 'Comparaison côte à côte des biens enregistrés. La meilleure valeur de chaque ligne est surlignée en vert.',
    rowPrice: 'Prix',
    rowPriceM2: 'Prix / m²',
    rowPriceM2Year: 'Prix m² / an',
    rowYield: 'Rendement annoncé',
    rowBestRoi: 'ROI (notre estimation)',
    rowLease: 'Leasehold',
    rowPermit: 'Permis',
    rowDealType: 'Transaction',
    rowStatus: 'État du chantier',
    rowCompletion: 'Livraison',
    rowBedrooms: 'Chambres',
    rowArea: 'Surface',
    rowLand: 'Terrain',
    rowFloor: 'Étage',
    rowDistrict: 'Quartier',
    rowLandUse: 'Usage du terrain',
    rowStyle: 'Style intérieur',
    rowDeveloper: 'Promoteur',
    factPrice: 'Prix',
    factPriceM2: 'Prix / m²',
    factBedrooms: 'Chambres',
    factArea: 'Maison',
    factLand: 'Terrain',
    factDistrict: 'Quartier',
    factLease: 'Leasehold',
    factPermit: 'Permis',
    factStatus: 'Statut',
    factCompletion: 'Livraison',
    factDealType: 'Transaction',
    factYield: 'Rendement',
    factDeveloper: 'Promoteur',
    sqm: 'm²',
    years: 'ans',
    dealResale: 'Revente', dealSecondary: 'Secondaire', dealPrimary: 'Promoteur',
    devReady: (n: number) => `${n} livrés`,
    devInProgress: (n: number) => `${n} en cours`,
    agentEyebrow: 'Votre agent',
    agentSubtitle: 'Contactez directement — réponses rapides, aide aux visites',
    siteEyebrow: 'Parcourir sur le site',
    siteTitle: 'Liste complète',
    siteSubtitle: 'Chaque carte renvoie à la page du bien avec le prix à jour et un formulaire de contact',
    footerName: 'balinsky.info — sélection',
    footerNameAgent: 'Sélection',
    factListingId: 'ID de recherche',
    rowListingId: 'ID',
    landWarnTitle: 'Terrain non zoné pour la location journalière',
    landWarnBody: (titles: string) => `Votre sélection contient un bien sur un terrain non officiellement zoné pour la location journalière : ${titles}. Vérifiez le statut locatif légal auprès du promoteur — cela affecte les revenus de Booking/Airbnb.`,
  },
} as const

type Copy = typeof COPY[Lang]

function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

// Money formatter — converts the saved USD value into whichever
// currency the visitor had picked on the site at download time.
// Function name kept as fmtUsd for minimal diff at the call sites.
function fmtMoney(n: number | null | undefined, currency: Currency): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return formatPriceExact(n, currency)
}

function fmtDate(lang: Lang): string {
  const d = new Date()
  return d.toLocaleDateString(({ ru: 'ru-RU', en: 'en-GB', id: 'id-ID', fr: 'fr-FR' } as const)[lang], { day: 'numeric', month: 'long', year: 'numeric' })
}

function detailUrl(it: WishlistItem, lang: Lang): string {
  switch (it.kind) {
    case 'villa':     return `${SITE_URL}${switchLangPath(`/ru/villy/o/${it.slug}`, lang)}`
    case 'apartment': return `${SITE_URL}${switchLangPath(`/ru/apartamenty/o/${it.slug}`, lang)}`
    case 'complex':   return `${SITE_URL}${switchLangPath(`/ru/zhilye-kompleksy/o/${it.slug}`, lang)}`
    case 'rental':    return `${SITE_URL}${switchLangPath(`/ru/arenda/o/${it.slug}`, lang)}`
  }
}

// Agent variant strips brand/complex names ("Vilas Komville",
// "MasonBagam") so the client sticks with the agent instead of
// looking up the project independently. We synthesize a generic
// description from structured fields (kind + bedrooms + area +
// district). Saved title is used as-is when not in agent mode.
function displayTitle(it: WishlistItem, c: Copy, agentMode: boolean): string {
  if (!agentMode) return it.title
  const kindWord = it.kind === 'apartment' ? c.apartment
    : it.kind === 'complex' ? c.complex
    : it.kind === 'rental'  ? c.rental
    : c.villa
  const parts: string[] = [kindWord]
  if (it.bedrooms != null) parts.push(`${it.bedrooms} BR`)
  if (it.area != null)     parts.push(`${it.area} ${c.sqm}`)
  if (it.district)         parts.push(it.district)
  return parts.join(', ')
}

function PageFooter({ name }: { name: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{name}</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

// Per-item "card" — one page in landscape (50/50 split) or portrait
// (photo on top, facts below). All values come from the saved
// WishlistItem, so it's just a snapshot of what the visitor saw when
// they hearted the listing.
function ItemPage({
  it, idx, total, c, lang, isPortrait, agentMode, currency,
}: {
  it: WishlistItem; idx: number; total: number; c: Copy; lang: Lang; isPortrait: boolean
  // Agent-variant PDFs strip the developer's company name so the
  // recipient comes back to the agent rather than searching the
  // builder. The track-record counts ("3 сдано · 2 строится") stay —
  // they're the buyer-relevant signal anyway.
  agentMode: boolean
  currency: Currency
}) {
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const dealLabel = it.dealType === 'resale' ? c.dealResale
    : it.dealType === 'secondary' ? c.dealSecondary
    : it.dealType === 'primary' ? c.dealPrimary
    : null
  const kindLabel = it.kind === 'apartment' ? c.apartment
    : it.kind === 'complex' ? c.complex
    : it.kind === 'rental'  ? c.rental
    : c.villa

  // Developer cell: name + "N сдано · M строится" tail. Agent variant
  // hides the name but keeps the counts.
  const ready = it.developerCompletedCount ?? null
  const inProg = it.developerInProgressCount ?? null
  const devTail = [
    ready  != null && ready  > 0 ? c.devReady(ready)     : null,
    inProg != null && inProg > 0 ? c.devInProgress(inProg) : null,
  ].filter(Boolean).join(' · ')
  const devValue = agentMode
    ? (devTail || null)
    : it.developerName
      ? (devTail ? `${it.developerName} (${devTail})` : it.developerName)
      : null

  const facts: { label: string; value: string }[] = [
    it.priceUsd != null && { label: c.factPrice,    value: fmtUsd(it.priceUsd) },
    it.pricePerSqmUsd != null && { label: c.factPriceM2, value: fmtUsd(it.pricePerSqmUsd) },
    it.bedrooms != null && { label: c.factBedrooms, value: `${it.bedrooms}` },
    it.area != null && { label: c.factArea, value: `${it.area} ${c.sqm}` },
    it.land != null && { label: c.factLand, value: `${it.land} ${c.sqm}` },
    it.district && { label: c.factDistrict, value: it.district },
    it.leaseYears != null && { label: c.factLease,  value: `${it.leaseYears} ${c.years}` },
    it.permit && { label: c.factPermit, value: it.permit },
    it.status && { label: c.factStatus, value: it.status },
    it.completionYear && { label: c.factCompletion, value: it.completionYear },
    dealLabel && { label: c.factDealType, value: dealLabel },
    it.claimedYieldPct != null && { label: c.factYield, value: `${it.claimedYieldPct}%` },
    devValue && { label: c.factDeveloper, value: devValue },
  ].filter(Boolean) as { label: string; value: string }[]

  const url = detailUrl(it, lang)
  const title = displayTitle(it, c, agentMode)

  const PhotoBlock = (
    <View style={[styles.itemPhotoBox, isPortrait ? { width: '100%', height: 280 } : { flex: 1, height: '100%' }]}>
      {it.photo ? <Image src={it.photo} style={styles.itemPhoto} /> : null}
    </View>
  )

  const TextBlock = (
    <View style={isPortrait ? { width: '100%' } : { width: '50%', paddingLeft: 24 }}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemNumber}>{c.objectN(idx + 1, total)}</Text>
        <Text style={styles.itemKindBadge}>{kindLabel}</Text>
      </View>
      <Text style={styles.itemTitle}>{title}</Text>
      {!agentMode && it.district && <Text style={styles.itemDistrict}>{it.district}</Text>}
      {it.priceUsd != null && (
        <View style={styles.itemPriceRow}>
          <Text style={styles.itemPrice}>{fmtUsd(it.priceUsd)}</Text>
          {it.pricePerSqmUsd != null && <Text style={styles.itemPriceM2}>{fmtUsd(it.pricePerSqmUsd)} / {c.sqm}</Text>}
        </View>
      )}
      <View style={styles.itemFactsGrid}>
        {facts.map(f => (
          <View key={f.label} style={styles.itemFactCard}>
            <Text style={styles.itemFactLabel}>{f.label}</Text>
            <Text style={styles.itemFactValue}>{f.value}</Text>
          </View>
        ))}
      </View>
      {!agentMode && (
        <Link src={url} style={{ fontSize: 9, color: COLORS.primary, marginTop: 12, textDecoration: 'none' }}>{url}</Link>
      )}
      {agentMode && it.airtableId && (
        // Lookup code — paste into the catalog search box on the
        // site to land on this listing. Older saves predate this
        // field, in which case nothing prints.
        <Text style={{ fontSize: 9, color: COLORS.muted, marginTop: 12 }}>
          {c.factListingId}: <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{it.airtableId}</Text>
        </Text>
      )}
    </View>
  )

  return isPortrait ? (
    <View style={{ flexDirection: 'column', height: '100%', gap: 18 }}>
      {PhotoBlock}
      {TextBlock}
    </View>
  ) : (
    <View style={{ flexDirection: 'row', height: '100%' }}>
      <View style={{ width: '50%', height: '100%' }}>{PhotoBlock}</View>
      {TextBlock}
    </View>
  )
}

// Comparison table rows. Each row knows how to render one cell from a
// WishlistItem and (optionally) which direction is "best" so we can
// highlight the winning cell in green. Ties (equal values across all
// items) skip the highlight.
type CmpRow = {
  key: string
  label: string
  cell: (it: WishlistItem, c: Copy) => string | null
  best?: 'min' | 'max'
  num?: (it: WishlistItem) => number | null
  // Categorical override for rows where good vs. bad is a label match
  // rather than a numeric ranking (land-use zoning is the canonical
  // case). Returning null leaves the cell at neutral colouring.
  verdict?: (it: WishlistItem) => 'best' | 'worst' | null
}

function buildCmpRows(c: Copy, agentMode: boolean, currency: Currency): CmpRow[] {
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const dealLabel = (t: WishlistItem['dealType']): string | null => {
    if (!t) return null
    if (t === 'resale')    return c.dealResale
    if (t === 'secondary') return c.dealSecondary
    return c.dealPrimary
  }
  return [
    { key: 'price',       label: c.rowPrice,       cell: it => it.priceUsd != null ? fmtUsd(it.priceUsd) : null },
    { key: 'priceM2',     label: c.rowPriceM2,     cell: it => it.pricePerSqmUsd != null ? fmtUsd(it.pricePerSqmUsd) : null,
      best: 'min', num: it => it.pricePerSqmUsd ?? null },
    { key: 'priceM2Year', label: c.rowPriceM2Year, cell: it => it.pricePerSqmYearUsd != null ? fmtUsd(it.pricePerSqmYearUsd) : null,
      best: 'min', num: it => it.pricePerSqmYearUsd ?? null },
    { key: 'yield',       label: c.rowYield,       cell: it => it.claimedYieldPct != null ? `${it.claimedYieldPct}%` : null,
      best: 'max', num: it => it.claimedYieldPct ?? null },
    { key: 'bestRoi',     label: c.rowBestRoi,
      cell: it => it.bestCapRate != null ? `${(it.bestCapRate * 100).toFixed(1)}%` : null,
      best: 'max', num: it => it.bestCapRate ?? null },
    { key: 'lease',       label: c.rowLease,
      cell: it => it.leaseYears != null ? `${it.leaseYears} ${c.years}` : null,
      best: 'max', num: it => it.leaseYears ?? null },
    { key: 'permit',      label: c.rowPermit,      cell: it => it.permit ?? null },
    { key: 'dealType',    label: c.rowDealType,    cell: it => dealLabel(it.dealType) },
    { key: 'status',      label: c.rowStatus,      cell: it => it.status ?? null },
    { key: 'completion',  label: c.rowCompletion,  cell: it => it.completionYear ?? null },
    { key: 'bedrooms',    label: c.rowBedrooms,    cell: it => it.bedrooms != null ? `${it.bedrooms}` : null,
      best: 'max', num: it => it.bedrooms ?? null },
    { key: 'area',        label: c.rowArea,        cell: it => it.area != null ? `${it.area} ${c.sqm}` : null,
      best: 'max', num: it => it.area ?? null },
    { key: 'land',        label: c.rowLand,        cell: it => it.land != null ? `${it.land} ${c.sqm}` : null,
      best: 'max', num: it => it.land ?? null },
    { key: 'floor',       label: c.rowFloor,       cell: it => it.floor ?? null },
    { key: 'district',    label: c.rowDistrict,    cell: it => it.district ?? null },
    { key: 'landUse',     label: c.rowLandUse,     cell: it => it.landUse ?? null,
      verdict: it => {
        const status = classifyLandUse(it.landUse)
        if (status === 'allowed')    return 'best'
        if (status === 'restricted') return 'worst'
        return null
      } },
    { key: 'style',       label: c.rowStyle,       cell: it => it.interiorStyle ?? null },
    { key: 'developer',   label: c.rowDeveloper,
      cell: (it, cc) => {
        const r  = it.developerCompletedCount  ?? null
        const ip = it.developerInProgressCount ?? null
        const tail = [
          r  != null && r  > 0 ? cc.devReady(r)     : null,
          ip != null && ip > 0 ? cc.devInProgress(ip) : null,
        ].filter(Boolean).join(' · ')
        if (agentMode) return tail || null
        if (!it.developerName) return null
        return tail ? `${it.developerName} (${tail})` : it.developerName
      },
      best: 'max',
      num: it => {
        const r  = it.developerCompletedCount  ?? null
        const ip = it.developerInProgressCount ?? null
        if (r == null && ip == null) return null
        return (r ?? 0) - (ip ?? 0)
      },
    },
  ]
}

// One comparison-table page for a chunk of items. We chunk so the
// columns don't get squashed when the shortlist is long. Each page
// repeats the row labels so it's readable on its own.
function ComparisonPage({
  chunk, allItems, rows, c, isPortrait, chunkIdx, totalChunks, agentMode,
}: {
  chunk: WishlistItem[]
  allItems: WishlistItem[]
  rows: CmpRow[]
  c: Copy
  isPortrait: boolean
  chunkIdx: number
  totalChunks: number
  agentMode: boolean
}) {
  const labelColWidth = isPortrait ? '24%' : '18%'
  // Hide rows where every item in *this* chunk is empty, so a chunk
  // that's all apartments doesn't get a half-page of "Land · — · —".
  const visibleRows = rows.filter(r => chunk.some(it => r.cell(it, c) != null))

  // Per-row best-value lookup across the *full* shortlist so the
  // highlight stays consistent across pages — the cheapest villa is
  // still cheapest even if it lands on page 2.
  const bestByRow = new Map<string, number>()
  for (const r of rows) {
    if (!r.best || !r.num) continue
    const nums = allItems.map(r.num).filter((v): v is number => v != null && Number.isFinite(v))
    if (nums.length < 2) continue
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    if (min === max) continue
    bestByRow.set(r.key, r.best === 'min' ? min : max)
  }

  // Land-zoning warning, repeated on every comparison-page chunk so
  // it travels with the table even if the table paginates.
  const restricted = allItems.filter(it => classifyLandUse(it.landUse) === 'restricted')
  const restrictedNames = restricted.map(it => displayTitle(it, c, agentMode)).join(', ')

  return (
    <>
      <Text style={styles.cmpTitle}>{c.comparisonTitle}{totalChunks > 1 ? ` (${chunkIdx + 1}/${totalChunks})` : ''}</Text>
      <Text style={styles.cmpSubtitle}>{c.comparisonSubtitle}</Text>
      {restricted.length > 0 && (
        <View style={styles.warnPanel} wrap={false}>
          <Text style={styles.warnTitle}>{c.landWarnTitle}</Text>
          <Text style={styles.warnBody}>{c.landWarnBody(restrictedNames)}</Text>
        </View>
      )}
      <View style={styles.cmpHead}>
        <View style={{ width: labelColWidth }}><Text style={styles.cmpHeadLabel}> </Text></View>
        {chunk.map(it => (
          <View key={`h-${it.kind}:${it.slug}`} style={styles.cmpHeadCol}>
            <View style={styles.cmpHeadPhoto}>
              {it.photo ? <Image src={it.photo} style={styles.cmpHeadPhotoImg} /> : null}
            </View>
            <Text style={styles.cmpHeadTitle}>{displayTitle(it, c, agentMode)}</Text>
          </View>
        ))}
      </View>
      {visibleRows.map(r => (
        <View key={r.key} style={styles.cmpRow} wrap={false}>
          <View style={{ width: labelColWidth }}>
            <Text style={styles.cmpRowLabel}>{r.label}</Text>
          </View>
          {chunk.map(it => {
            const val = r.cell(it, c)
            if (val == null) {
              return (
                <View key={`${r.key}-${it.kind}:${it.slug}`} style={styles.cmpHeadCol}>
                  <Text style={styles.cmpRowDash}>—</Text>
                </View>
              )
            }
            const override = r.verdict ? r.verdict(it) : null
            let cellStyle = styles.cmpRowVal
            if (override === 'best') cellStyle = styles.cmpRowValBest
            else if (override === 'worst') cellStyle = styles.cmpRowValWorst
            else {
              const num = r.num ? r.num(it) : null
              const best = bestByRow.get(r.key)
              if (num != null && best != null && num === best) cellStyle = styles.cmpRowValBest
            }
            return (
              <View key={`${r.key}-${it.kind}:${it.slug}`} style={styles.cmpHeadCol}>
                <Text style={cellStyle}>{val}</Text>
              </View>
            )
          })}
        </View>
      ))}
    </>
  )
}

export function ShortlistPdfDocument({ items, agent, orientation = 'landscape', lang, currency = 'USD' }: {
  items: WishlistItem[]
  agent: AgentContact | null
  orientation?: PdfOrientation
  lang: Lang
  // Currency picked on the site at download time; threaded through
  // to every price-bearing renderer so the document matches what
  // the visitor was reading.
  currency?: Currency
}) {
  const isPortrait = orientation === 'portrait'
  const pageProps = { size: 'A4' as const, orientation }
  const c = pickCopy(COPY, lang)
  const agentMode = !!agent

  // Per-item pages: villas + apartments + complexes + rentals all get
  // one. Complexes / rentals look thinner because we save fewer fields,
  // but the page still works as a reference.
  const itemPages = items
  // Comparison only makes sense for villa+apartment with their shared
  // numeric fields. Drop complexes and rentals — they have different
  // price units (per month) and column sets.
  const cmpItems = items.filter(i => i.kind === 'villa' || i.kind === 'apartment')

  const cmpRows = buildCmpRows(c, agentMode, currency)
  const chunkSize = isPortrait ? 3 : 5
  const cmpChunks: WishlistItem[][] = []
  for (let i = 0; i < cmpItems.length; i += chunkSize) {
    cmpChunks.push(cmpItems.slice(i, i + chunkSize))
  }

  return (
    <Document title={c.coverTitle} author={agent?.name ?? 'balinsky.info'} producer="balinsky.info">
      {/* Cover */}
      <Page {...pageProps} style={[styles.page, styles.pagePadded]}>
        <View style={styles.coverWrap}>
          <Text style={styles.coverEyebrow}>{c.coverEyebrow}</Text>
          <Text style={styles.coverTitle}>{c.coverTitle}</Text>
          <Text style={styles.coverMeta}>{c.coverCount(items.length)}</Text>
          <Text style={styles.coverMeta}>{c.selectedAt}: {fmtDate(lang)}</Text>
        </View>
        <PageFooter name={agentMode ? c.footerNameAgent : c.footerName} />
      </Page>

      {/* Per-item pages */}
      {itemPages.map((it, idx) => (
        <Page key={`item-${it.kind}:${it.slug}`} {...pageProps} style={[styles.page, styles.pagePadded]}>
          <ItemPage it={it} idx={idx} total={itemPages.length} c={c} lang={lang} isPortrait={isPortrait} agentMode={agentMode} currency={currency} />
          <PageFooter name={agentMode ? c.footerNameAgent : c.footerName} />
        </Page>
      ))}

      {/* Comparison */}
      {cmpChunks.length > 0 && cmpChunks.map((chunk, ci) => (
        <Page key={`cmp-${ci}`} {...pageProps} style={[styles.page, styles.pagePadded]}>
          <ComparisonPage
            chunk={chunk}
            allItems={cmpItems}
            rows={cmpRows}
            c={c}
            isPortrait={isPortrait}
            chunkIdx={ci}
            totalChunks={cmpChunks.length}
            agentMode={agentMode}
          />
          <PageFooter name={agentMode ? c.footerNameAgent : c.footerName} />
        </Page>
      ))}

      {/* Last page — agent contact OR generic site link */}
      <Page {...pageProps} style={[styles.page, styles.pagePadded]}>
        <View style={styles.agentWrap}>
          <View style={styles.agentInner}>
            {agent ? (
              <>
                <Text style={styles.agentEyebrow}>{c.agentEyebrow}</Text>
                <Text style={styles.agentName}>{agent.name}</Text>
                <Text style={styles.agentSubtitle}>{c.agentSubtitle}</Text>
                {agent.telegram && (() => {
                  const tgHref = telegramUrl(agent.telegram)
                  return (
                    <View style={styles.contactRow}>
                      <Text style={styles.contactLabel}>Telegram</Text>
                      {tgHref
                        ? <Link src={tgHref} style={styles.contactValueLink}>{agent.telegram}</Link>
                        : <Text style={styles.contactValue}>{agent.telegram}</Text>}
                    </View>
                  )
                })()}
                {agent.whatsapp && (() => {
                  const waHref = whatsappUrl(agent.whatsapp)
                  return (
                    <View style={styles.contactRow}>
                      <Text style={styles.contactLabel}>WhatsApp</Text>
                      {waHref
                        ? <Link src={waHref} style={styles.contactValueLink}>{agent.whatsapp}</Link>
                        : <Text style={styles.contactValue}>{agent.whatsapp}</Text>}
                    </View>
                  )
                })()}
              </>
            ) : (
              <>
                <Text style={styles.agentEyebrow}>{c.siteEyebrow}</Text>
                <Text style={styles.agentName}>{c.siteTitle}</Text>
                <Text style={styles.agentSubtitle}>{c.siteSubtitle}</Text>
                <Link src={SITE_URL} style={styles.linkBox}>{SITE_URL}</Link>
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadShortlistPdf(
  items: WishlistItem[],
  agent: AgentContact | null,
  orientation: PdfOrientation = 'landscape',
  lang: Lang = 'ru',
  currency: Currency = 'USD',
): Promise<void> {
  const blob = await pdf(
    <ShortlistPdfDocument items={items} agent={agent} orientation={orientation} lang={lang} currency={currency} />
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const orientSuffix = orientation === 'portrait' ? '-mobile' : ''
  a.download = `balinsky-shortlist${orientSuffix}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  // Fire-and-forget analytics. Item ids capped server-side at 30
  // to keep rows compact; full count goes in itemCount regardless.
  // Per-item details (title, district, price) so the admin sees
  // the actual content of each shortlist, not just record IDs.
  // Agent contact is sent verbatim only when the user explicitly
  // generated the "for-agent" PDF.
  fetch('/api/track/presentation', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      kind: 'shortlist',
      itemCount: items.length,
      items: items.map(it => it.airtableId).filter((x): x is string => !!x).slice(0, 30),
      itemsDetail: items.slice(0, 30).map(it => ({
        id: it.airtableId ?? null,
        kind: it.kind,
        slug: it.slug,
        title: it.title,
        district: it.district,
        bedrooms: it.bedrooms,
        area: it.area ?? null,
        priceUsd: it.priceUsd,
      })),
      agent: agent ? { name: agent.name, telegram: agent.telegram, whatsapp: agent.whatsapp } : null,
      orientation,
      hasAgent: !!agent,
      lang,
    }),
    keepalive: true,
  }).catch(() => {})
}
