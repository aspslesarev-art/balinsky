import { Document, Page, Text, View, Image, Link, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import type { Snapshot } from '@/components/InvestmentWidget/types'
import type { VillaPresentationData } from '@/components/VillaPresentation'

Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.otf', fontWeight: 'normal' },
    { src: '/fonts/Inter-Bold.otf', fontWeight: 'bold' },
  ],
})

export type AgentContact = {
  name: string
  telegram: string
  whatsapp: string
}

const COLORS = {
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  primary: '#33A474',
  primaryDark: '#257754',
  primarySoft: '#E5F2EC',
  bgSoft: '#F9FAFB',
  white: '#FFFFFF',
  scenarioBadBg: '#FEF2F2',
  scenarioBadBorder: '#FECACA',
  scenarioBadText: '#B91C1C',
  scenarioGoodBg: '#F0FDF4',
  scenarioGoodBorder: '#BBF7D0',
  scenarioGoodText: '#15803D',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  pagePadded: {
    padding: '32 36',
  },
  // Cover
  coverRoot: { flexDirection: 'row', height: '100%', gap: 24, alignItems: 'center' },
  coverTextCol: { width: '38%', flexDirection: 'column' },
  coverPhotoCol: { flex: 1, height: '100%', borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.bgSoft },
  coverPhotoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  coverDistrict: { fontSize: 10, color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 'bold' },
  coverTitle: { fontSize: 30, fontWeight: 'bold', lineHeight: 1.1, color: COLORS.text, marginBottom: 14 },
  coverChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 16 },
  coverChip: { fontSize: 11, color: COLORS.muted },
  coverPrice: { fontSize: 26, fontWeight: 'bold', color: COLORS.text },
  coverPriceM2: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  // Photoset page (mosaic 1+4 or 2x2 grid)
  photosetRoot: { flexDirection: 'row', height: '100%', gap: 8 },
  photosetTile: { borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.bgSoft },
  photosetTileImg: { width: '100%', height: '100%', objectFit: 'cover' },
  photosetCol: { flex: 1, flexDirection: 'column', gap: 8, height: '100%' },
  photosetRow: { flex: 1, flexDirection: 'row', gap: 8, width: '100%' },
  // Generic
  h2: { fontSize: 24, fontWeight: 'bold', marginBottom: 6, color: COLORS.text },
  subtitle: { fontSize: 11, color: COLORS.muted, marginBottom: 18 },
  // Facts
  factsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  factCard: {
    width: '31%',
    minHeight: 70,
    border: `1 solid ${COLORS.border}`,
    borderRadius: 10,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  factLabel: { fontSize: 8, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  factValue: { fontSize: 13, fontWeight: 'bold', color: COLORS.text },
  // Description
  descBody: { fontSize: 12, lineHeight: 1.6, color: COLORS.text },
  // Location
  locText: { fontSize: 13, color: COLORS.text, marginBottom: 6 },
  locMuted: { fontSize: 10, color: COLORS.muted },
  // Nearby
  nearbyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  nearbyCard: {
    width: '23.5%',
    border: `1 solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 8,
    backgroundColor: COLORS.white,
    marginBottom: 6,
  },
  nearbyTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  nearbyTitle: { fontSize: 11, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  nearbyCount: { fontSize: 9, color: COLORS.muted },
  nearbyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
  nearbyName: { fontSize: 9, color: COLORS.text, flex: 1, marginRight: 6 },
  nearbyMeta: { fontSize: 8, color: COLORS.muted },
  // Scenarios
  scenariosRow: { flexDirection: 'row', gap: 10 },
  scenarioCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  scenarioCardBad: { borderColor: COLORS.scenarioBadBorder, backgroundColor: COLORS.scenarioBadBg },
  scenarioCardMedian: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  scenarioCardGood: { borderColor: COLORS.scenarioGoodBorder, backgroundColor: COLORS.scenarioGoodBg },
  scenarioLabel: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  scenarioMeta: { fontSize: 8, color: COLORS.muted, marginBottom: 8 },
  scenarioNoi: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  scenarioNoiSuffix: { fontSize: 9, color: COLORS.muted, marginBottom: 8 },
  scenarioRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  scenarioRowKey: { fontSize: 9, color: COLORS.muted },
  scenarioRowVal: { fontSize: 9, fontWeight: 'bold', color: COLORS.text },
  // Agent
  agentWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  agentInner: { width: '70%', maxWidth: 480, alignItems: 'center' },
  agentEyebrow: { fontSize: 10, color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontWeight: 'bold' },
  agentName: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 18, textAlign: 'center' },
  agentSubtitle: { fontSize: 11, color: COLORS.muted, marginBottom: 24, textAlign: 'center' },
  contactRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, border: `1 solid ${COLORS.border}`, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 10, width: '100%', justifyContent: 'space-between' },
  linkBox: { fontSize: 13, color: COLORS.primary, borderRadius: 10, border: `1 solid ${COLORS.border}`, paddingVertical: 12, paddingHorizontal: 16, textDecoration: 'none', textAlign: 'center', width: '100%' },
  contactLabel: { fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  contactValue: { fontSize: 13, fontWeight: 'bold', color: COLORS.text },
  // Footer (page numbers)
  footer: { position: 'absolute', bottom: 16, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: COLORS.muted },
})

function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return '$' + Math.round(n).toLocaleString('en-US')
}
function fmtUsdShort(n: number): string {
  if (n >= 1000) return '$' + (Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'k'
  return '$' + Math.round(n).toLocaleString('en-US')
}
function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return (n * 100).toFixed(digits) + '%'
}
function fmtYears(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(n < 10 ? 1 : 0) + ' лет'
}
function fmtDistance(km: number): string {
  if (km < 1) return Math.round(km * 1000) + ' м'
  return km.toFixed(km < 10 ? 1 : 0) + ' км'
}

const NEARBY_META: Record<string, string> = {
  beach: 'Пляжи',
  beachclub: 'Beach clubs',
  international_school: 'Международные школы',
  school: 'Школы',
  preschool: 'Сады и ясли',
  wellness: 'Йога и фитнес',
  restaurant: 'Рестораны',
  cafe: 'Кафе',
  supermarket: 'Магазины',
  pharmacy: 'Аптеки',
  hospital: 'Клиники',
  nightlife: 'Бары и клубы',
  attraction: 'Достопримечательности',
}
const NEARBY_ORDER = [
  'beach', 'beachclub', 'wellness',
  'restaurant', 'cafe', 'nightlife',
  'international_school', 'school', 'preschool',
  'supermarket', 'pharmacy', 'hospital', 'attraction',
]

function PageFooter({ title }: { title: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{title}</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function PhotoSetPdf({ photos, layout }: { photos: string[]; layout: 'mosaic5' | 'grid4' | 'small' }) {
  if (layout === 'mosaic5') {
    return (
      <View style={styles.photosetRoot}>
        {photos[0] && (
          <View style={[styles.photosetTile, { flex: 1.4 }]}>
            <Image src={photos[0]} style={styles.photosetTileImg} />
          </View>
        )}
        <View style={styles.photosetCol}>
          <View style={styles.photosetRow}>
            {photos[1] && (
              <View style={[styles.photosetTile, { flex: 1 }]}>
                <Image src={photos[1]} style={styles.photosetTileImg} />
              </View>
            )}
            {photos[2] && (
              <View style={[styles.photosetTile, { flex: 1 }]}>
                <Image src={photos[2]} style={styles.photosetTileImg} />
              </View>
            )}
          </View>
          <View style={styles.photosetRow}>
            {photos[3] && (
              <View style={[styles.photosetTile, { flex: 1 }]}>
                <Image src={photos[3]} style={styles.photosetTileImg} />
              </View>
            )}
            {photos[4] && (
              <View style={[styles.photosetTile, { flex: 1 }]}>
                <Image src={photos[4]} style={styles.photosetTileImg} />
              </View>
            )}
          </View>
        </View>
      </View>
    )
  }
  if (layout === 'grid4') {
    return (
      <View style={[styles.photosetRoot, { flexDirection: 'column' }]}>
        <View style={styles.photosetRow}>
          {photos[0] && (
            <View style={[styles.photosetTile, { flex: 1 }]}>
              <Image src={photos[0]} style={styles.photosetTileImg} />
            </View>
          )}
          {photos[1] && (
            <View style={[styles.photosetTile, { flex: 1 }]}>
              <Image src={photos[1]} style={styles.photosetTileImg} />
            </View>
          )}
        </View>
        <View style={styles.photosetRow}>
          {photos[2] && (
            <View style={[styles.photosetTile, { flex: 1 }]}>
              <Image src={photos[2]} style={styles.photosetTileImg} />
            </View>
          )}
          {photos[3] && (
            <View style={[styles.photosetTile, { flex: 1 }]}>
              <Image src={photos[3]} style={styles.photosetTileImg} />
            </View>
          )}
        </View>
      </View>
    )
  }
  // 'small' — 1-4 photos, simple row/grid
  if (photos.length === 1) {
    return (
      <View style={[styles.photosetTile, { flex: 1 }]}>
        <Image src={photos[0]} style={styles.photosetTileImg} />
      </View>
    )
  }
  if (photos.length === 2) {
    return (
      <View style={styles.photosetRow}>
        {photos.map((src, idx) => (
          <View key={idx} style={[styles.photosetTile, { flex: 1 }]}>
            <Image src={src} style={styles.photosetTileImg} />
          </View>
        ))}
      </View>
    )
  }
  return (
    <View style={[styles.photosetRoot, { flexDirection: 'column' }]}>
      <View style={styles.photosetRow}>
        {photos.slice(0, 2).map((src, idx) => (
          <View key={idx} style={[styles.photosetTile, { flex: 1 }]}>
            <Image src={src} style={styles.photosetTileImg} />
          </View>
        ))}
      </View>
      {photos.length > 2 && (
        <View style={styles.photosetRow}>
          {photos.slice(2, 4).map((src, idx) => (
            <View key={idx} style={[styles.photosetTile, { flex: 1 }]}>
              <Image src={src} style={styles.photosetTileImg} />
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const SITE_URL = 'https://balinsky.info'

export function VillaPdfDocument({ data, snap, agent }: { data: VillaPresentationData; snap: Snapshot | null; agent: AgentContact | null }) {
  const sectionPath = data.kind === 'apartment' ? '/ru/apartamenty/o/' : '/ru/villy/o/'
  const villaUrl = `${SITE_URL}${sectionPath}${data.slug}`
  const allPhotos = data.photos.slice(0, 12)
  const photosetPool = allPhotos.slice(1)
  const photosetGroups: { layout: 'mosaic5' | 'grid4' | 'small'; photos: string[] }[] = []
  if (photosetPool.length >= 5) {
    photosetGroups.push({ layout: 'mosaic5', photos: photosetPool.slice(0, 5) })
    if (photosetPool.length >= 6) {
      photosetGroups.push({ layout: 'grid4', photos: photosetPool.slice(5, 9) })
    }
  } else if (photosetPool.length > 0) {
    photosetGroups.push({ layout: 'small', photos: photosetPool })
  }
  const hasMap = data.lat != null && data.lng != null
  const hasNearby = !!snap && Object.values(snap.nearbyByCategory ?? {}).some(arr => arr.length > 0)
  const hasScenarios = !!snap?.scenarios

  const factsItems = [
    data.bedrooms != null && { label: 'Спальни', value: `${data.bedrooms} BR` },
    data.area != null && { label: 'Дом', value: `${data.area} м²` },
    data.land != null && { label: 'Земля', value: `${data.land} м²` },
    data.yearLabel && { label: 'Сдача', value: data.yearLabel },
    data.permit && data.permit.toLowerCase() !== 'нет' && { label: 'Разрешения', value: data.permit },
    data.lease && { label: 'Лизхолд', value: `${data.lease} лет` },
    data.district && { label: 'Район', value: data.district },
    data.pricePerM2 != null && { label: 'Цена за м²', value: fmtUsd(data.pricePerM2) },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <Document title={data.title} author={agent?.name ?? 'balinsky.info'} producer="balinsky.info">
      {/* Cover — white bg, split layout */}
      <Page size="A4" orientation="landscape" style={[styles.page, styles.pagePadded]}>
        <View style={styles.coverRoot}>
          <View style={styles.coverTextCol}>
            {data.district && <Text style={styles.coverDistrict}>{data.district}, Бали</Text>}
            <Text style={styles.coverTitle}>{data.title}</Text>
            <View style={styles.coverChips}>
              {data.bedrooms != null && <Text style={styles.coverChip}>{data.bedrooms} BR</Text>}
              {data.area != null && <Text style={styles.coverChip}>{data.area} м² дом</Text>}
              {data.land != null && <Text style={styles.coverChip}>{data.land} м² земля</Text>}
              {data.lease && <Text style={styles.coverChip}>Лизхолд {data.lease} лет</Text>}
            </View>
            {data.priceUsd != null && (
              <View>
                <Text style={styles.coverPrice}>{fmtUsd(data.priceUsd)}</Text>
                {data.pricePerM2 != null && <Text style={styles.coverPriceM2}>{fmtUsd(data.pricePerM2)} / м²</Text>}
              </View>
            )}
          </View>
          <View style={styles.coverPhotoCol}>
            {allPhotos[0] && <Image src={allPhotos[0]} style={styles.coverPhotoImg} />}
          </View>
        </View>
      </Page>

      {/* Photo compositions */}
      {photosetGroups.map((group, gIdx) => (
        <Page key={`photoset-${gIdx}`} size="A4" orientation="landscape" style={[styles.page, styles.pagePadded]}>
          <PhotoSetPdf photos={group.photos} layout={group.layout} />
        </Page>
      ))}

      {/* Facts */}
      <Page size="A4" orientation="landscape" style={[styles.page, styles.pagePadded]}>
        <Text style={styles.h2}>Характеристики</Text>
        <Text style={styles.subtitle}>Ключевые параметры объекта</Text>
        <View style={styles.factsGrid}>
          {factsItems.map(it => (
            <View key={it.label} style={styles.factCard}>
              <Text style={styles.factLabel}>{it.label}</Text>
              <Text style={styles.factValue}>{it.value}</Text>
            </View>
          ))}
        </View>
        <PageFooter title={data.title} />
      </Page>

      {/* Description */}
      {data.seoText && (
        <Page size="A4" orientation="landscape" style={[styles.page, styles.pagePadded]}>
          <Text style={styles.h2}>О вилле</Text>
          <Text style={styles.descBody}>{data.seoText}</Text>
          <PageFooter title={data.title} />
        </Page>
      )}

      {/* Location */}
      {hasMap && (
        <Page size="A4" orientation="landscape" style={[styles.page, styles.pagePadded]}>
          <Text style={styles.h2}>Расположение</Text>
          <Text style={styles.subtitle}>Координаты и район</Text>
          {data.district && <Text style={styles.locText}>Район: {data.district}, Бали</Text>}
          <Text style={styles.locText}>Координаты: {data.lat!.toFixed(5)}, {data.lng!.toFixed(5)}</Text>
          <Text style={styles.locMuted}>https://www.google.com/maps/search/?api=1&query={data.lat},{data.lng}</Text>
          <PageFooter title={data.title} />
        </Page>
      )}

      {/* Nearby — limited to 8 categories × 3 items so it fits on one A4 landscape page */}
      {hasNearby && snap && (
        <Page size="A4" orientation="landscape" style={[styles.page, styles.pagePadded]}>
          <Text style={styles.h2}>Что вокруг виллы</Text>
          <Text style={styles.subtitle}>Топ-места поблизости по рейтингу и расстоянию</Text>
          <View style={styles.nearbyGrid}>
            {NEARBY_ORDER.filter(c => (snap.nearbyByCategory[c] ?? []).length > 0).slice(0, 8).map(cat => {
              const items = [...(snap.nearbyByCategory[cat] ?? [])].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3)
              const totalCount = (snap.nearbyByCategory[cat] ?? []).length
              return (
                <View key={cat} style={styles.nearbyCard} wrap={false}>
                  <View style={styles.nearbyTitleRow}>
                    <Text style={styles.nearbyTitle}>{NEARBY_META[cat] ?? cat}</Text>
                    <Text style={styles.nearbyCount}>{totalCount}</Text>
                  </View>
                  {items.map(p => (
                    <View key={p.id} style={styles.nearbyItem}>
                      <Text style={styles.nearbyName}>{p.name}</Text>
                      <Text style={styles.nearbyMeta}>
                        {p.rating != null ? `★${p.rating.toFixed(1)} · ` : ''}{fmtDistance(p.distanceKm)}
                      </Text>
                    </View>
                  ))}
                </View>
              )
            })}
          </View>
        </Page>
      )}

      {/* Investment scenarios */}
      {hasScenarios && snap?.scenarios && (
        <Page size="A4" orientation="landscape" style={[styles.page, styles.pagePadded]}>
          <Text style={styles.h2}>Инвестиционный потенциал</Text>
          <Text style={styles.subtitle}>
            Три сценария аренды на основе матчинга с конкурентами на Booking ({snap.competitors.length} объектов)
          </Text>
          <View style={styles.scenariosRow}>
            {(['bad', 'median', 'good'] as const).map(key => {
              const e = snap.scenarios![key]
              const cardStyle = key === 'bad' ? styles.scenarioCardBad : key === 'good' ? styles.scenarioCardGood : styles.scenarioCardMedian
              const titleColor = key === 'bad' ? COLORS.scenarioBadText : key === 'good' ? COLORS.scenarioGoodText : COLORS.primaryDark
              const title = key === 'bad' ? 'Плохой' : key === 'good' ? 'Хороший' : 'Нормальный'
              return (
                <View key={key} style={[styles.scenarioCard, cardStyle]}>
                  <Text style={[styles.scenarioLabel, { color: titleColor }]}>{title}</Text>
                  <Text style={styles.scenarioMeta}>ADR {fmtUsd(e.adr)} · {Math.round(e.occupancy * 100)}%</Text>
                  <Text style={styles.scenarioNoi}>{fmtUsdShort(e.noi)}</Text>
                  <Text style={styles.scenarioNoiSuffix}>/ год NOI</Text>
                  <View style={styles.scenarioRow}><Text style={styles.scenarioRowKey}>Окупаемость</Text><Text style={styles.scenarioRowVal}>{fmtYears(e.payback)}</Text></View>
                  <View style={styles.scenarioRow}><Text style={styles.scenarioRowKey}>Cap rate</Text><Text style={styles.scenarioRowVal}>{fmtPct(e.capRate)}</Text></View>
                </View>
              )
            })}
          </View>
          {data.priceUsd != null && (
            <Text style={[styles.subtitle, { marginTop: 16 }]}>
              Расчёт от цены {fmtUsd(data.priceUsd)} с учётом комиссий, OPEX и налога 10%.
            </Text>
          )}
        </Page>
      )}

      {/* Last page — either agent contact or villa link */}
      <Page size="A4" orientation="landscape" style={[styles.page, styles.pagePadded]}>
        <View style={styles.agentWrap}>
          <View style={styles.agentInner}>
            {agent ? (
              <>
                <Text style={styles.agentEyebrow}>Ваш агент</Text>
                <Text style={styles.agentName}>{agent.name}</Text>
                <Text style={styles.agentSubtitle}>Свяжитесь напрямую — быстро отвечу и помогу с просмотром</Text>
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
                <Text style={styles.agentEyebrow}>Подробнее на сайте</Text>
                <Text style={styles.agentName}>{data.title}</Text>
                <Text style={styles.agentSubtitle}>Полная карточка, актуальная цена и форма связи — на странице виллы</Text>
                <Link src={villaUrl} style={styles.linkBox}>{villaUrl}</Link>
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadVillaPdf(data: VillaPresentationData, snap: Snapshot | null, agent: AgentContact | null): Promise<void> {
  const blob = await pdf(<VillaPdfDocument data={data} snap={snap} agent={agent} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.kind === 'apartment' ? 'apartament' : 'villa'}-${slugify(data.title)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9а-я]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'villa'
}
