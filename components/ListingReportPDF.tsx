// PDF layout for the AI investment report. Pure render layer —
// data shaping is in lib/listing-report.ts.
//
// Layout: A4 portrait, 4 sections on page 1 (cover, key facts,
// economics, verdict), and a second page with risks + per-goal
// recommendations + footer disclaimer. Single photo embed in the
// cover; real report PDFs benefit from being short, not glossy.

import { Document, Page, Text, View, Image, Link, StyleSheet, Font } from '@react-pdf/renderer'
import type { ReportData } from '@/lib/listing-report'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://balinsky.info/fonts/Inter-Regular.otf', fontWeight: 'normal' },
    { src: 'https://balinsky.info/fonts/Inter-Bold.otf', fontWeight: 'bold' },
  ],
})

const COLORS = {
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  bgSoft: '#F9FAFB',
  primary: '#1F8B5F',
  primaryDark: '#197551',
  primarySoft: '#E2F0E8',
  proBg: '#F0FDF4',
  proText: '#15803D',
  riskBg: '#FEF2F2',
  riskText: '#B91C1C',
  ratingStrong: '#16A34A',
  ratingConsider: '#F59E0B',
  ratingCaution: '#EA580C',
  ratingSkip: '#DC2626',
}

const styles = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 10.5, color: COLORS.text, padding: '32 36', lineHeight: 1.45 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  brand: { fontSize: 14, fontWeight: 'bold', color: COLORS.primaryDark },
  brandTagline: { fontSize: 9, color: COLORS.muted },
  ratingPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontSize: 9, color: '#fff', fontWeight: 'bold', textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: COLORS.muted, marginBottom: 14 },
  cover: { width: '100%', height: 220, objectFit: 'cover', borderRadius: 8, marginBottom: 18 },
  // No italic variant of Inter is bundled, so we use medium-weight
  // body text instead of fontStyle:'italic' which would fail at
  // render time. The green pill carries enough visual emphasis on
  // its own.
  oneLiner: { fontSize: 12, color: COLORS.text, padding: '12 14', backgroundColor: COLORS.primarySoft, borderRadius: 8, marginBottom: 18 },

  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, color: COLORS.text, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 4 },

  factsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, marginHorizontal: -4 },
  factCard: { width: '50%', padding: 4 },
  factCardInner: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 8 },
  factLabel: { fontSize: 8, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 2 },
  factValue: { fontSize: 11, fontWeight: 'bold' },

  econRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  econLabel: { color: COLORS.muted, flex: 1 },
  econValue: { fontWeight: 'bold' },

  bulletList: { marginBottom: 12 },
  bulletRow: { flexDirection: 'row', marginBottom: 6 },
  bulletDot: { width: 14, color: COLORS.primary, fontWeight: 'bold' },
  bulletText: { flex: 1, fontSize: 10.5 },

  proBlock: { backgroundColor: COLORS.proBg, padding: 10, borderRadius: 6, marginBottom: 10 },
  proHeader: { fontSize: 11, fontWeight: 'bold', color: COLORS.proText, marginBottom: 6 },
  riskBlock: { backgroundColor: COLORS.riskBg, padding: 10, borderRadius: 6, marginBottom: 10 },
  riskHeader: { fontSize: 11, fontWeight: 'bold', color: COLORS.riskText, marginBottom: 6 },

  goalCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 10, marginBottom: 8 },
  goalLabel: { fontSize: 9, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 4 },
  goalText: { fontSize: 10.5 },

  footer: { position: 'absolute', left: 36, right: 36, bottom: 24, fontSize: 8, color: COLORS.muted, textAlign: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
})

const RATING_STYLE: Record<ReportData['verdict']['finalRating'], { label: string; bg: string }> = {
  'strong-buy': { label: 'Сильный кандидат', bg: COLORS.ratingStrong },
  'consider':   { label: 'Можно рассмотреть', bg: COLORS.ratingConsider },
  'caution':    { label: 'С оговорками',     bg: COLORS.ratingCaution },
  'skip':       { label: 'Не рекомендую',     bg: COLORS.ratingSkip },
}

function fmtMoney(usd: number | null | undefined): string {
  if (usd == null) return '—'
  return '$' + usd.toLocaleString('en-US')
}
function fmtPct(frac: number | null | undefined): string {
  if (frac == null) return '—'
  return (frac * 100).toFixed(1) + '%'
}

export function ListingReportPDF({ data }: { data: ReportData }) {
  const r = RATING_STYLE[data.verdict.finalRating] ?? RATING_STYLE.consider
  const cover = data.photoUrls[0]
  const url = `https://balinsky.info/ru/${data.kind === 'villa' ? 'villy' : data.kind === 'apartment' ? 'apartamenty' : 'zhilye-kompleksy'}/o/${data.slug}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brand}>Balinsky · AI-оценка</Text>
            <Text style={styles.brandTagline}>Сгенерировано Балиной — AI-брокером по недвижимости на Бали</Text>
          </View>
          <Text style={[styles.ratingPill, { backgroundColor: r.bg }]}>{r.label}</Text>
        </View>

        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>
          {[
            data.district,
            data.bedrooms != null ? `${data.bedrooms} спален` : null,
            data.area != null ? `${data.area} м²` : null,
            data.priceUsd != null ? fmtMoney(data.priceUsd) : null,
          ].filter(Boolean).join(' · ')}
        </Text>

        {cover && <Image src={cover} style={styles.cover} />}

        <Text style={styles.oneLiner}>{data.verdict.oneLineSummary}</Text>

        <Text style={styles.sectionTitle}>Ключевые факты</Text>
        <View style={styles.factsGrid}>
          <Fact label="Цена" value={fmtMoney(data.priceUsd)} />
          <Fact label="Цена за м²" value={data.pricePerSqmUsd != null ? fmtMoney(data.pricePerSqmUsd) + '/м²' : '—'} />
          <Fact label="Лизхолд" value={data.leaseYears != null ? data.leaseYears + ' лет' : 'не указан'} />
          <Fact label="Земля" value={landZoneLabel(data.landZone)} />
          <Fact label="Готовность" value={data.status ?? data.completionYear ?? '—'} />
          <Fact label="Разрешение" value={data.permit ?? '—'} />
        </View>

        <Text style={styles.sectionTitle}>Экономика</Text>
        <Econ label="Cap rate (хороший сценарий)"
          value={data.capRateGood != null ? fmtPct(data.capRateGood) + '/год' : 'данных по комперам нет'} />
        <Econ label="Cap rate (медианный)"
          value={data.capRateMedian != null ? fmtPct(data.capRateMedian) + '/год' : '—'} />
        <Econ label="Помесячная аренда (соседи)"
          value={data.monthlyRentCompUsd != null
            ? `~${fmtMoney(data.monthlyRentCompUsd)}/мес${data.monthlyRentCompCount ? ` (${data.monthlyRentCompCount} объектов)` : ''}`
            : '—'} />
        <Econ label="Медиана $/м² по району"
          value={data.districtMedianPricePerSqmUsd != null
            ? `${fmtMoney(data.districtMedianPricePerSqmUsd)}/м²${data.districtListingsCount ? ` (по ${data.districtListingsCount} объектам)` : ''}`
            : '—'} />
        {data.nearestBeach && (
          <Econ label="Ближайший пляж" value={`${data.nearestBeach.name} · ${data.nearestBeach.km} км`} />
        )}

        <Text style={styles.footer}>
          Balinsky · {url} · Отчёт сгенерирован {new Date(data.generatedAt).toLocaleString('ru-RU')} · AI-оценка не заменяет юридическую проверку
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.proBlock}>
          <Text style={styles.proHeader}>Что хорошо</Text>
          {data.verdict.pros.length > 0 ? data.verdict.pros.map((p, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{p}</Text>
            </View>
          )) : <Text style={styles.bulletText}>—</Text>}
        </View>

        <View style={styles.riskBlock}>
          <Text style={styles.riskHeader}>На что обратить внимание</Text>
          {data.verdict.risks.length > 0 ? data.verdict.risks.map((p, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: COLORS.riskText }]}>•</Text>
              <Text style={styles.bulletText}>{p}</Text>
            </View>
          )) : <Text style={styles.bulletText}>Особых красных флагов не нашлось.</Text>}
        </View>

        <Text style={styles.sectionTitle}>Кому подходит</Text>
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>Для жизни самому</Text>
          <Text style={styles.goalText}>{data.verdict.recommendationByGoal.forLiving}</Text>
        </View>
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>Для посуточной аренды (Booking / Airbnb)</Text>
          <Text style={styles.goalText}>{data.verdict.recommendationByGoal.forSTR}</Text>
        </View>
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>Для помесячной аренды</Text>
          <Text style={styles.goalText}>{data.verdict.recommendationByGoal.forLongTermRental}</Text>
        </View>

        {data.nearby.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Что рядом</Text>
            {data.nearby.slice(0, 4).map((cat, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: COLORS.text, marginBottom: 3 }}>{cat.category}</Text>
                {cat.places.slice(0, 3).map((p, j) => (
                  <Text key={j} style={{ fontSize: 9.5, color: COLORS.muted }}>
                    {p.name} · {p.km < 1 ? Math.round(p.km * 1000) + ' м' : p.km.toFixed(1) + ' км'}
                  </Text>
                ))}
              </View>
            ))}
          </>
        )}

        <Text style={styles.footer}>
          <Link src={url} style={{ color: COLORS.primaryDark }}>Открыть страницу объекта на balinsky.info</Link>
          {' · '}AI-оценка носит информационный характер и не заменяет PPAT-нотариуса и юриста
        </Text>
      </Page>
    </Document>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factCard}>
      <View style={styles.factCardInner}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue}>{value}</Text>
      </View>
    </View>
  )
}
function Econ({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.econRow}>
      <Text style={styles.econLabel}>{label}</Text>
      <Text style={styles.econValue}>{value}</Text>
    </View>
  )
}

function landZoneLabel(z: string | null): string {
  if (!z) return 'не указано'
  switch (z) {
    case 'tourism':    return 'tourism (посуточно ОК)'
    case 'pink':       return 'pink (посуточно ОК)'
    case 'commercial': return 'commercial (посуточно ОК)'
    case 'yellow':     return 'yellow (только жильё)'
    case 'green':      return 'green (для иностранца — нет)'
    default:           return z
  }
}
