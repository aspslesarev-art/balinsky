import { Document, Page, Text, View, Image, Link, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import type { WishlistItem } from '@/lib/wishlist'
import type { Lang } from '@/lib/i18n'
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
  // Comparison table
  cmpTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: COLORS.text },
  cmpSubtitle: { fontSize: 10, color: COLORS.muted, marginBottom: 14 },
  cmpHead: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8, marginBottom: 6 },
  cmpHeadLabel: { fontSize: 9, color: COLORS.muted, textTransform: 'uppercase' },
  cmpHeadCol: { flex: 1, paddingHorizontal: 4 },
  cmpHeadPhoto: { width: '100%', height: 70, borderRadius: 6, backgroundColor: COLORS.bgSoft, marginBottom: 4, overflow: 'hidden' },
  cmpHeadPhotoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cmpHeadTitle: { fontSize: 9, fontWeight: 'bold', color: COLORS.text, lineHeight: 1.2 },
  cmpRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft, paddingVertical: 5, alignItems: 'flex-start' },
  cmpRowLabel: { fontSize: 8, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  cmpRowVal: { fontSize: 9.5, color: COLORS.text },
  cmpRowValBest: { fontSize: 9.5, color: COLORS.bestText, fontWeight: 'bold' },
  cmpRowDash: { fontSize: 9.5, color: COLORS.muted },
  // Agent page
  agentWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  agentInner: { width: '70%', maxWidth: 480, alignItems: 'center' },
  agentEyebrow: { fontSize: 10, color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontWeight: 'bold' },
  agentName: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 18, textAlign: 'center' },
  agentSubtitle: { fontSize: 11, color: COLORS.muted, marginBottom: 24, textAlign: 'center' },
  contactRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, border: `1 solid ${COLORS.border}`, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 10, width: '100%', justifyContent: 'space-between' },
  contactLabel: { fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  contactValue: { fontSize: 13, fontWeight: 'bold', color: COLORS.text },
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
  },
} as const

type Copy = typeof COPY[Lang]

function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return '$' + Math.round(n).toLocaleString('en-US')
}

function fmtDate(lang: Lang): string {
  const d = new Date()
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function detailUrl(it: WishlistItem, lang: Lang): string {
  switch (it.kind) {
    case 'villa':     return `${SITE_URL}${lang === 'en' ? `/en/villas/o/${it.slug}` : `/ru/villy/o/${it.slug}`}`
    case 'apartment': return `${SITE_URL}${lang === 'en' ? `/en/apartments/o/${it.slug}` : `/ru/apartamenty/o/${it.slug}`}`
    case 'complex':   return `${SITE_URL}${lang === 'en' ? `/en/complexes/o/${it.slug}` : `/ru/zhilye-kompleksy/o/${it.slug}`}`
    case 'rental':    return `${SITE_URL}${lang === 'en' ? `/en/rental/o/${it.slug}` : `/ru/arenda/o/${it.slug}`}`
  }
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
  it, idx, total, c, lang, isPortrait,
}: {
  it: WishlistItem; idx: number; total: number; c: Copy; lang: Lang; isPortrait: boolean
}) {
  const dealLabel = it.dealType === 'resale' ? c.dealResale
    : it.dealType === 'secondary' ? c.dealSecondary
    : it.dealType === 'primary' ? c.dealPrimary
    : null
  const kindLabel = it.kind === 'apartment' ? c.apartment
    : it.kind === 'complex' ? c.complex
    : it.kind === 'rental'  ? c.rental
    : c.villa

  // Developer cell: name + "✓ N · ▲ M" tail when we have counts.
  const ready = it.developerCompletedCount ?? null
  const inProg = it.developerInProgressCount ?? null
  const devTail = [
    ready  != null && ready  > 0 ? c.devReady(ready)     : null,
    inProg != null && inProg > 0 ? c.devInProgress(inProg) : null,
  ].filter(Boolean).join(' · ')
  const devValue = it.developerName
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
      <Text style={styles.itemTitle}>{it.title}</Text>
      {it.district && <Text style={styles.itemDistrict}>{it.district}</Text>}
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
      <Link src={url} style={{ fontSize: 9, color: COLORS.primary, marginTop: 12, textDecoration: 'none' }}>{url}</Link>
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
}

function buildCmpRows(c: Copy): CmpRow[] {
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
    { key: 'landUse',     label: c.rowLandUse,     cell: it => it.landUse ?? null },
    { key: 'style',       label: c.rowStyle,       cell: it => it.interiorStyle ?? null },
    { key: 'developer',   label: c.rowDeveloper,
      cell: (it, cc) => {
        if (!it.developerName) return null
        const r  = it.developerCompletedCount  ?? null
        const ip = it.developerInProgressCount ?? null
        const tail = [
          r  != null && r  > 0 ? cc.devReady(r)     : null,
          ip != null && ip > 0 ? cc.devInProgress(ip) : null,
        ].filter(Boolean).join(' · ')
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
  chunk, allItems, rows, c, isPortrait, chunkIdx, totalChunks,
}: {
  chunk: WishlistItem[]
  allItems: WishlistItem[]
  rows: CmpRow[]
  c: Copy
  isPortrait: boolean
  chunkIdx: number
  totalChunks: number
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

  return (
    <>
      <Text style={styles.cmpTitle}>{c.comparisonTitle}{totalChunks > 1 ? ` (${chunkIdx + 1}/${totalChunks})` : ''}</Text>
      <Text style={styles.cmpSubtitle}>{c.comparisonSubtitle}</Text>
      <View style={styles.cmpHead}>
        <View style={{ width: labelColWidth }}><Text style={styles.cmpHeadLabel}> </Text></View>
        {chunk.map(it => (
          <View key={`h-${it.kind}:${it.slug}`} style={styles.cmpHeadCol}>
            <View style={styles.cmpHeadPhoto}>
              {it.photo ? <Image src={it.photo} style={styles.cmpHeadPhotoImg} /> : null}
            </View>
            <Text style={styles.cmpHeadTitle}>{it.title}</Text>
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
            const num = r.num ? r.num(it) : null
            const best = bestByRow.get(r.key)
            const isBest = num != null && best != null && num === best
            return (
              <View key={`${r.key}-${it.kind}:${it.slug}`} style={styles.cmpHeadCol}>
                <Text style={isBest ? styles.cmpRowValBest : styles.cmpRowVal}>{val}</Text>
              </View>
            )
          })}
        </View>
      ))}
    </>
  )
}

export function ShortlistPdfDocument({ items, agent, orientation = 'landscape', lang }: {
  items: WishlistItem[]
  agent: AgentContact | null
  orientation?: PdfOrientation
  lang: Lang
}) {
  const isPortrait = orientation === 'portrait'
  const pageProps = { size: 'A4' as const, orientation }
  const c = COPY[lang]

  // Per-item pages: villas + apartments + complexes + rentals all get
  // one. Complexes / rentals look thinner because we save fewer fields,
  // but the page still works as a reference.
  const itemPages = items
  // Comparison only makes sense for villa+apartment with their shared
  // numeric fields. Drop complexes and rentals — they have different
  // price units (per month) and column sets.
  const cmpItems = items.filter(i => i.kind === 'villa' || i.kind === 'apartment')

  const cmpRows = buildCmpRows(c)
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
        <PageFooter name={c.footerName} />
      </Page>

      {/* Per-item pages */}
      {itemPages.map((it, idx) => (
        <Page key={`item-${it.kind}:${it.slug}`} {...pageProps} style={[styles.page, styles.pagePadded]}>
          <ItemPage it={it} idx={idx} total={itemPages.length} c={c} lang={lang} isPortrait={isPortrait} />
          <PageFooter name={c.footerName} />
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
          />
          <PageFooter name={c.footerName} />
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
                {agent.telegram && (
                  <View style={styles.contactRow}>
                    <Text style={styles.contactLabel}>Telegram</Text>
                    <Text style={styles.contactValue}>{agent.telegram}</Text>
                  </View>
                )}
                {agent.whatsapp && (
                  <View style={styles.contactRow}>
                    <Text style={styles.contactLabel}>WhatsApp</Text>
                    <Text style={styles.contactValue}>{agent.whatsapp}</Text>
                  </View>
                )}
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
): Promise<void> {
  const blob = await pdf(
    <ShortlistPdfDocument items={items} agent={agent} orientation={orientation} lang={lang} />
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
}
