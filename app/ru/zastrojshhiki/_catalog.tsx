// Shared developer-catalog renderer used by both /ru/zastrojshhiki and
// /en/developers. Pass `lang` so layout / sort / data loading stay in
// one place; only the visible labels and metadata vary by locale.

import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { DevelopersList } from '@/components/DevelopersList'
import { DevelopersSeoContent } from '@/components/DevelopersSeoContent'
import { DevelopersSortToggle, type DevelopersSortKey } from '@/components/DevelopersSortToggle'
import type { DeveloperRowData } from '@/components/DeveloperRow'
import type { ComplexStats } from '@/lib/developer-score'
import { isHiddenDeveloper } from '@/lib/hidden-developers'
import { pickCopy, type Lang } from '@/lib/i18n'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

type Row = { data: Record<string, unknown>; logo_url: string | null }

const COPY = {
  ru: {
    h1: 'Застройщики на Бали',
    count: (n: number) => `${n} компаний в каталоге`,
    intro: 'На странице собраны застройщики и девелоперы Бали с действующими проектами — виллами, апартаментами и жилыми комплексами. По каждой компании — справочная информация по четырём направлениям: строительство и недвижимость, опыт, техника и производство, управляющая компания после ввода.',
    sortHint: 'По умолчанию список отсортирован по числу сданных жилых комплексов. Balinsky не присваивает застройщикам рейтингов и оценок надёжности — здесь только факты: сданные и строящиеся проекты, количество юнитов, проекты за пределами Бали. Документы по конкретному объекту проверяйте самостоятельно, с юристом.',
  },
  en: {
    h1: 'Developers in Bali',
    count: (n: number) => `${n} companies in the catalogue`,
    intro: 'A directory of Bali developers with active projects — villas, apartments and residential complexes. For each company we collect reference information in four areas: construction and real estate, track record, equipment and production, and post-handover management.',
    sortHint: 'By default the list is sorted by the number of completed projects. Balinsky does not rate developers or score their reliability — only facts are shown here: completed and ongoing projects, unit counts, projects outside Bali. Check the documents for a specific property yourself, with a lawyer.',
  },
  id: {
    h1: 'Pengembang di Bali',
    count: (n: number) => `${n} perusahaan dalam katalog`,
    intro: 'Direktori pengembang Bali dengan proyek aktif — vila, apartemen, dan kompleks hunian. Untuk setiap perusahaan kami menghimpun informasi referensi dalam empat bidang: konstruksi dan properti, rekam jejak, peralatan dan produksi, serta pengelolaan pasca-serah terima.',
    sortHint: 'Secara bawaan daftar diurutkan menurut jumlah proyek yang telah selesai. Balinsky tidak memberi peringkat atau skor keandalan kepada pengembang — di sini hanya fakta: proyek selesai dan berjalan, jumlah unit, proyek di luar Bali. Periksa dokumen properti tertentu sendiri, bersama pengacara.',
  },
  fr: {
    h1: 'Promoteurs à Bali',
    count: (n: number) => `${n} sociétés dans le catalogue`,
    intro: 'Un annuaire des promoteurs de Bali avec des projets actifs — villas, appartements et résidences. Pour chaque société, nous rassemblons des informations de référence dans quatre domaines : construction et immobilier, historique, équipement et production, et gestion après livraison.',
    sortHint: 'Par défaut, la liste est triée par nombre de projets livrés. Balinsky n’attribue ni note ni indice de fiabilité aux promoteurs — seuls des faits figurent ici : projets livrés et en cours, nombre d’unités, projets hors de Bali. Vérifiez vous-même les documents d’un bien précis, avec un avocat.',
  },
  de: {
    h1: 'Bauträger auf Bali',
    count: (n: number) => `${n} Unternehmen im Katalog`,
    intro: 'Ein Verzeichnis der Bali-Bauträger mit aktiven Projekten — Villen, Apartments und Wohnanlagen. Zu jedem Unternehmen sammeln wir Referenzinformationen in vier Bereichen: Bau und Immobilien, bisherige Projekte, Technik und Produktion sowie Verwaltung nach der Fertigstellung.',
    sortHint: 'Standardmäßig ist die Liste nach der Zahl fertiggestellter Projekte sortiert. Balinsky vergibt keine Bewertungen oder Zuverlässigkeitsnoten an Bauträger — hier stehen nur Fakten: fertige und laufende Projekte, Anzahl der Einheiten, Projekte außerhalb Balis. Prüfen Sie die Unterlagen zu einem konkreten Objekt selbst, mit einem Anwalt.',
  },
  zh: {
    h1: '巴厘岛开发商',
    count: (n: number) => `目录中有 ${n} 家公司`,
    intro: '巴厘岛在建项目开发商名录——别墅、公寓和住宅区。我们为每家公司整理四个方面的参考信息：建筑与房产、过往业绩、设备与生产，以及交付后的管理公司。',
    sortHint: '列表默认按已完成项目数量排序。Balinsky 不对开发商评级或评估可靠性——这里只展示事实：已完成和在建项目、单元数量、巴厘岛以外的项目。具体房产的文件请您与律师一起自行核查。',
  },
  nl: {
    h1: 'Ontwikkelaars op Bali',
    count: (n: number) => `${n} bedrijven in de catalogus`,
    intro: 'Een directory van Bali-ontwikkelaars met actieve projecten — villa\'s, appartementen en wooncomplexen. Per bedrijf verzamelen we referentie-informatie op vier gebieden: bouw en vastgoed, trackrecord, techniek en productie, en beheer na oplevering.',
    sortHint: 'Standaard is de lijst gesorteerd op het aantal opgeleverde projecten. Balinsky geeft ontwikkelaars geen beoordeling of betrouwbaarheidsscore — hier staan alleen feiten: opgeleverde en lopende projecten, aantal units, projecten buiten Bali. Controleer de documenten van een specifiek object zelf, met een advocaat.',
  },
  ban: {
    h1: 'Pangwangun ring Bali',
    count: (n: number) => `${n} pausahaan ring katalog`,
    intro: 'Direktori pangwangun Bali sane madue proyek aktif — vila, apartemen, miwah kompleks. Ring suang-suang pausahaan kapupulang informasi referensi ring petang bidang: konstruksi lan properti, pengalaman, peralatan lan produksi, miwah pangelola sasampun serah terima.',
    sortHint: 'Sacara bawaan daftar kaurut manut akeh proyek sane sampun puput. Balinsky nenten ngicen peringkat utawi skor kaandelan ring pangwangun — driki wantah fakta: proyek puput lan sane kantun kakaryanin, akeh unit, proyek ring jaba Bali. Priksa dokumen properti sane kapilih ragane, sareng pengacara.',
  },
  pl: {
    h1: 'Deweloperzy na Bali',
    count: (n: number) => `${n} firm w katalogu`,
    intro: 'Katalog deweloperów na Bali z aktywnymi projektami — wille, apartamenty i kompleksy mieszkaniowe. Dla każdej firmy zbieramy informacje referencyjne w czterech obszarach: budowa i nieruchomości, dotychczasowe realizacje, sprzęt i produkcja oraz zarządzanie po przekazaniu.',
    sortHint: 'Domyślnie lista jest posortowana według liczby ukończonych projektów. Balinsky nie wystawia deweloperom ocen ani wskaźników wiarygodności — są tu tylko fakty: ukończone i trwające projekty, liczba lokali, projekty poza Bali. Dokumenty konkretnej nieruchomości sprawdzaj samodzielnie, z prawnikiem.',
  },
  uk: {
    h1: 'Забудовники на Балі',
    count: (n: number) => `${n} компаній у каталозі`,
    intro: 'Каталог забудовників Балі з активними проєктами — вілли, апартаменти та житлові комплекси. По кожній компанії зібрано довідкову інформацію за чотирма напрямами: будівництво та нерухомість, досвід, техніка та виробництво, а також управління після здачі.',
    sortHint: 'За замовчуванням список відсортовано за кількістю зданих проєктів. Balinsky не присвоює забудовникам рейтингів та оцінок надійності — тут лише факти: здані й активні проєкти, кількість юнітів, проєкти за межами Балі. Документи конкретного об’єкта перевіряйте самостійно, з юристом.',
  },
} as const

function logoFromJson(data: Record<string, unknown>): string | null {
  const arr = data['Logo']
  if (Array.isArray(arr) && arr[0] && typeof arr[0] === 'object' && 'url' in arr[0]) {
    const url = (arr[0] as { url: unknown }).url
    return typeof url === 'string' ? url : null
  }
  return null
}

function asText(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return asText(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return asText((v as Record<string, unknown>).value)
  return null
}

function richnessLen(v: unknown): number {
  if (!v) return 0
  if (typeof v === 'string') return v.trim().length
  if (typeof v === 'number') return String(v).length
  if (Array.isArray(v) && v.length) return richnessLen(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return richnessLen((v as Record<string, unknown>).value)
  return 0
}

// Pull the EN translation if filled; otherwise return the literal
// "<key> EN" placeholder so editors immediately see which Airtable
// columns to create. Matches tField() from lib/i18n.ts but kept local
// because the catalogue uses raw `asText` for unwrapping below.
function txt(data: Record<string, unknown>, key: string, lang: Lang): string | null {
  if (lang === 'ru') return asText(data[key])
  const en = asText(data[`${key} EN`])
  if (en) return en
  // Last resort: the raw RU value (de-Cyrillicized downstream by
  // cleanDeveloperBullets). Previously returned the field-name string
  // (`${key} EN`), which leaked untranslated Cyrillic onto non-RU pages.
  return asText(data[key])
}

export async function DevelopersCatalog({
  sort,
  lang = 'ru',
}: {
  sort: DevelopersSortKey
  lang?: Lang
}) {
  const copy = pickCopy(COPY, lang)
  // Slim JSONB projection. raw_complexes full data = ~7 MB; we only read
  // Developer1, Статус, Готовность, Total quantity of units here. raw_developers
  // similarly touches ~11 fields out of dozens.
  const DEV_FIELDS = [
    ['Developer', 'dev'],
    ['Developer1', 'dev1'],
    ['Logo', 'logo'],
    ['SEO:Slug', 'seo_slug'],
    ['Total quantity of units', 'units'],
    ['Бизнес и сервисы', 'biz'],
    ['Бизнес и сервисы EN', 'biz_en'],
    ['Готовность', 'ready'],
    ['Доходность', 'yield'],
    ['Доходность EN', 'yield_en'],
    ['Команда', 'team'],
    ['Команда EN', 'team_en'],
    ['Опыт вне бали №', 'outside'],
    ['Публикация', 'pub'],
    ['Репутация и опыт', 'reputation'],
    ['Репутация и опыт EN', 'reputation_en'],
    ['Статус', 'status'],
    ['Строительство и недвижимость', 'construction'],
    ['Строительство и недвижимость EN', 'construction_en'],
    ['Техника и производство', 'tech'],
    ['Техника и производство EN', 'tech_en'],
    ['Управляющая компания', 'mgmt'],
    ['Управляющая компания EN', 'mgmt_en'],
  ] as const
  const CPX_FIELDS = [
    ['Developer1', 'dev1'],
    ['Статус', 'status'],
    ['Готовность', 'ready'],
    ['Total quantity of units', 'units'],
  ] as const
  const devSelect = ['logo_url', ...DEV_FIELDS.map(([k, a]) => `${a}:data->"${k}"`)].join(',')
  const cpxSelect = CPX_FIELDS.map(([k, a]) => `${a}:data->"${k}"`).join(',')
  const reassemble = (raw: Record<string, unknown>, fields: ReadonlyArray<readonly [string, string]>) => {
    const data: Record<string, unknown> = {}
    for (const [k, a] of fields) data[k] = raw[a]
    return data
  }

  const [{ data: devData }, { data: complexData }] = await Promise.all([
    sb.from('raw_developers').select(devSelect).limit(500),
    sb.from('raw_complexes').select(cpxSelect).limit(2000),
  ])

  const rows = ((devData ?? []) as unknown as Record<string, unknown>[])
    .map(r => ({ data: reassemble(r, DEV_FIELDS), logo_url: r.logo_url as string | null })) as Row[]
  const canonicalize = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()
  // Aggregate complex *and* unit counts per developer. Units come
  // from the complex's "Total quantity of units" field — same lookup
  // the public detail page uses. Empty/non-numeric values count as 0
  // so editors with sparse data don't deflate the totals weirdly.
  const readNumUnits = (v: unknown): number => {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.floor(v)
    if (typeof v === 'string') {
      const n = parseInt(v.replace(/[^\d]/g, ''), 10)
      return Number.isFinite(n) && n > 0 ? n : 0
    }
    if (Array.isArray(v) && v.length) return readNumUnits(v[0])
    return 0
  }
  const statsByDev = new Map<string, ComplexStats>()
  const complexRows = ((complexData ?? []) as unknown as Record<string, unknown>[])
    .map(r => ({ data: reassemble(r, CPX_FIELDS) }))
  for (const cr of complexRows) {
    const dev = (cr.data['Developer1'] ?? '').toString().trim()
    if (!dev) continue
    const status = (cr.data['Статус'] ?? cr.data['Готовность'] ?? '').toString()
    const units = readNumUnits(cr.data['Total quantity of units'])
    const key = canonicalize(dev)
    const cur = statsByDev.get(key) ?? { total: 0, ready: 0, unitsTotal: 0, unitsReady: 0 }
    cur.total += 1
    cur.unitsTotal += units
    if (/(построен|сдан|готов|complet)/i.test(status)) {
      cur.ready += 1
      cur.unitsReady += units
    }
    statsByDev.set(key, cur)
  }

  const enriched = rows
    .filter(r => r.data['Публикация'] === true && r.data['SEO:Slug'] && r.data['Developer'])
    .filter(r => !isHiddenDeveloper(String(r.data['Developer'] ?? '')))
    .map(r => {
      const name = String(r.data['Developer'])
      const stats = statsByDev.get(canonicalize(name)) ?? { total: 0, ready: 0, unitsTotal: 0, unitsReady: 0 }
      const construction = txt(r.data, 'Строительство и недвижимость', lang)
      const reputation = txt(r.data, 'Репутация и опыт', lang)
      const equipment = txt(r.data, 'Техника и производство', lang)
      const management = txt(r.data, 'Управляющая компания', lang)
      // Tiebreak only, never shown: how much reference text the card carries,
      // so empty cards don't sort above filled ones with the same numbers.
      const richness =
        richnessLen(r.data['Репутация и опыт']) +
        richnessLen(r.data['Строительство и недвижимость']) +
        richnessLen(r.data['Техника и производство']) +
        richnessLen(r.data['Команда'])
      const intlRankRaw = Number(r.data['Опыт вне бали №'] ?? 0)
      const intlRank = Number.isFinite(intlRankRaw) && intlRankRaw > 0 ? intlRankRaw : null
      return { r, name, stats, richness, intlRank, construction, reputation, equipment, management }
    })

  // Facts only (no ratings, no reliability scores): every sort is a count
  // taken straight from the catalogue.
  enriched.sort((a, b) => {
    if (sort === 'inprogress') {
      const aIp = a.stats.total - a.stats.ready
      const bIp = b.stats.total - b.stats.ready
      return bIp - aIp || b.richness - a.richness
    }
    if (sort === 'units-ready') {
      return b.stats.unitsReady - a.stats.unitsReady
        || b.stats.ready - a.stats.ready
        || b.richness - a.richness
    }
    if (sort === 'units-inprogress') {
      const aUip = a.stats.unitsTotal - a.stats.unitsReady
      const bUip = b.stats.unitsTotal - b.stats.unitsReady
      return bUip - aUip
        || (b.stats.total - b.stats.ready) - (a.stats.total - a.stats.ready)
        || b.richness - a.richness
    }
    if (sort === 'international') {
      if (a.intlRank == null && b.intlRank == null) return b.stats.ready - a.stats.ready || b.richness - a.richness
      if (a.intlRank == null) return 1
      if (b.intlRank == null) return -1
      return a.intlRank - b.intlRank
    }
    // `ready` (default): completed complexes, then delivered units.
    return b.stats.ready - a.stats.ready
      || b.stats.unitsReady - a.stats.unitsReady
      || b.stats.total - a.stats.total
      || b.richness - a.richness
  })

  const items: DeveloperRowData[] = enriched.map(({ r, name, stats, construction, reputation, equipment, management }) => ({
    slug: String(r.data['SEO:Slug'] ?? '') || null,
    name,
    logoUrl: r.logo_url ?? logoFromJson(r.data),
    construction,
    reputation,
    equipment,
    management,
    complexesReady: stats.ready,
    complexesTotal: stats.total,
    unitsReady: stats.unitsReady,
    unitsTotal: stats.unitsTotal,
  }))

  return (
    <>
      <Header active="zastrojshhiki" />
      <PageContainer>
        <h1 className="pt-12 text-[26px] md:text-[36px] font-semibold tracking-tight text-[var(--color-text)] mb-3">
          {copy.h1}
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
          {copy.count(items.length)}
        </div>

        <p className="max-w-3xl text-[15px] leading-relaxed text-[var(--color-text)] mb-3">
          {copy.intro}
        </p>
        <p className="max-w-3xl text-[15px] leading-relaxed text-[var(--color-text-muted)] mb-6">
          {copy.sortHint}
        </p>

        <Suspense fallback={null}>
          <DevelopersSortToggle current={sort} lang={lang} />
        </Suspense>

        <DevelopersList items={items} lang={lang} />

        <DevelopersSeoContent lang={lang} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}

// Old `safety` / `balanced` / `experience` links (ratings removed) fall back
// to the default.
export function parseSort(v: string | string[] | undefined): DevelopersSortKey {
  const s = Array.isArray(v) ? v[0] : v
  if (
    s === 'inprogress' ||
    s === 'units-ready' ||
    s === 'units-inprogress' ||
    s === 'international'
  ) return s
  return 'ready'
}
