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
import { scoreDeveloper, type ComplexStats } from '@/lib/developer-score'
import { scoreDeveloperSafety, compareBySafety, type ComplexSafetyInput } from '@/lib/developer-safety'
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
    intro: 'На странице собраны застройщики и девелоперы Бали с действующими проектами — виллами, апартаментами и жилыми комплексами. По каждой компании показан рейтинг по четырём направлениям: качество строительства и недвижимости, репутация и опыт, техника и производство, управляющая компания после ввода.',
    sortHint: 'По умолчанию список отсортирован по индексу безопасности: разрешительные документы (PBG/SLF), зона земли, сданные объекты и соблюдение заявленных сроков; компании, по которым данных нет, — в конце списка. Переключайте сортировку под свой критерий: сбалансированный рейтинг учитывает всё разом, «Сданные ЖК» показывают тех, кто реально достроил, «Активные стройки» — кто сейчас работает, «Опыт и репутация» — насыщенность данных о компании.',
  },
  en: {
    h1: 'Developers in Bali',
    count: (n: number) => `${n} companies in the catalogue`,
    intro: 'A directory of Bali developers with active projects — villas, apartments and residential complexes. Each company is rated across four dimensions: construction and real-estate quality, reputation and experience, equipment and production, and post-handover management.',
    sortHint: 'By default the list is ordered by our safety index: building permits (PBG/SLF), land zoning, delivered projects and whether announced deadlines were met; companies we have no data on sit at the bottom. Pick the sort that matches your priority: the balanced score blends everything, “Completed projects” shows who has actually delivered, “Active projects” reveals who’s building right now, and “Experience” reflects how much editorial data we have on the company.',
  },
  id: {
    h1: 'Pengembang di Bali',
    count: (n: number) => `${n} perusahaan dalam katalog`,
    intro: 'Direktori pengembang Bali dengan proyek aktif — vila, apartemen, dan kompleks hunian. Setiap perusahaan dinilai pada empat dimensi: kualitas konstruksi dan properti, reputasi dan pengalaman, peralatan dan produksi, serta pengelolaan pasca-serah terima.',
    sortHint: 'Secara bawaan daftar diurutkan menurut indeks keamanan kami: izin bangunan (PBG/SLF), zonasi lahan, proyek yang telah diserahkan, dan ketepatan tenggat yang dijanjikan; perusahaan tanpa data berada di bagian bawah. Pilih pengurutan sesuai prioritas Anda: skor seimbang menggabungkan semuanya, «Proyek selesai» menunjukkan siapa yang benar-benar menyerahkan, «Proyek aktif» mengungkap siapa yang sedang membangun sekarang, dan «Pengalaman» mencerminkan seberapa banyak data editorial yang kami miliki tentang perusahaan tersebut.',
  },
  fr: {
    h1: 'Promoteurs à Bali',
    count: (n: number) => `${n} sociétés dans le catalogue`,
    intro: 'Un annuaire des promoteurs de Bali avec des projets actifs — villas, appartements et résidences. Chaque société est évaluée selon quatre dimensions : qualité de construction et immobilière, réputation et expérience, équipement et production, et gestion après livraison.',
    sortHint: 'Par défaut, la liste est triée selon notre indice de sécurité : permis de construire (PBG/SLF), zonage du terrain, projets livrés et respect des délais annoncés ; les sociétés sans données figurent en fin de liste. Choisissez le tri qui correspond à votre priorité : le score équilibré combine tout, « Projets livrés » montre qui a réellement livré, « Projets actifs » révèle qui construit en ce moment, et « Expérience » reflète la quantité de données éditoriales dont nous disposons sur la société.',
  },
  de: {
    h1: 'Bauträger auf Bali',
    count: (n: number) => `${n} Unternehmen im Katalog`,
    intro: 'Ein Verzeichnis der Bali-Bauträger mit aktiven Projekten — Villen, Apartments und Wohnanlagen. Jedes Unternehmen wird in vier Dimensionen bewertet: Bau- und Immobilienqualität, Reputation und Erfahrung, Technik und Produktion sowie Verwaltung nach der Fertigstellung.',
    sortHint: 'Standardmäßig ist die Liste nach unserem Sicherheitsindex sortiert: Baugenehmigungen (PBG/SLF), Flächenwidmung, übergebene Projekte und Einhaltung der angekündigten Termine; Unternehmen ohne Daten stehen am Ende. Wählen Sie die Sortierung, die zu Ihrer Priorität passt: die ausgewogene Bewertung berücksichtigt alles zugleich, „Fertiggestellte Projekte“ zeigt, wer tatsächlich geliefert hat, „Aktive Projekte“ zeigt, wer gerade baut, und „Erfahrung“ spiegelt wider, wie viele redaktionelle Daten wir über das Unternehmen haben.',
  },
  zh: {
    h1: '巴厘岛开发商',
    count: (n: number) => `目录中有 ${n} 家公司`,
    intro: '巴厘岛在建项目开发商名录——别墅、公寓和住宅区。每家公司按四个维度评分：建筑与房产质量、声誉与经验、设备与生产，以及交付后的管理公司。',
    sortHint: '列表默认按我们的安全指数排序：建筑许可（PBG/SLF）、土地分区、已交付项目以及是否按承诺工期交付；没有数据的公司排在最后。选择符合您优先事项的排序：综合评分兼顾一切，“已完成项目”显示谁真正交付了，“在建项目”揭示谁正在施工，“经验”反映我们对该公司掌握的编辑数据量。',
  },
  nl: {
    h1: 'Ontwikkelaars op Bali',
    count: (n: number) => `${n} bedrijven in de catalogus`,
    intro: 'Een directory van Bali-ontwikkelaars met actieve projecten — villa\'s, appartementen en wooncomplexen. Elk bedrijf wordt beoordeeld op vier dimensies: bouw- en vastgoedkwaliteit, reputatie en ervaring, techniek en productie, en beheer na oplevering.',
    sortHint: 'Standaard is de lijst gesorteerd op onze veiligheidsindex: bouwvergunningen (PBG/SLF), bestemmingsplan, opgeleverde projecten en het nakomen van aangekondigde deadlines; bedrijven zonder gegevens staan onderaan. Kies de sortering die past bij uw prioriteit: de gebalanceerde score combineert alles, „Opgeleverde projecten” toont wie daadwerkelijk heeft opgeleverd, „Actieve projecten” laat zien wie er nu bouwt, en „Ervaring” weerspiegelt hoeveel redactionele gegevens we over het bedrijf hebben.',
  },
  ban: {
    h1: 'Pangwangun ring Bali',
    count: (n: number) => `${n} pausahaan ring katalog`,
    intro: 'Direktori pangwangun Bali sane madue proyek aktif — vila, apartemen, miwah kompleks. Suang-suang pausahaan kanilai ring petang dimensi: kualitas konstruksi lan properti, reputasi lan pengalaman, peralatan lan produksi, miwah pangelola sasampun serah terima.',
    sortHint: 'Sacara bawaan daftar kaurut manut indeks kaamanan: izin wewangunan (PBG/SLF), zonasi tanah, proyek sane sampun kaserahang, miwah katepatan tenggat sane kajanjiang; pausahaan sane nenten madue data wenten ring sor. Pilih pengurutan sane cocok ring prioritas Ragane: skor seimbang nggabungang makasami, «Proyek puput» nyinahang sira sane sampun nyerahang, «Proyek aktif» nyinahang sira sane sedeng ngwangun, miwah «Pengalaman» nyinahang akeh data editorial sane iraga madue indik pausahaan punika.',
  },
  pl: {
    h1: 'Deweloperzy na Bali',
    count: (n: number) => `${n} firm w katalogu`,
    intro: 'Katalog deweloperów na Bali z aktywnymi projektami — wille, apartamenty i kompleksy mieszkaniowe. Każda firma jest oceniana w czterech wymiarach: jakość budowy i nieruchomości, reputacja i doświadczenie, sprzęt i produkcja oraz zarządzanie po przekazaniu.',
    sortHint: 'Domyślnie lista jest posortowana według naszego indeksu bezpieczeństwa: pozwolenia na budowę (PBG/SLF), przeznaczenie gruntu, oddane inwestycje i dotrzymanie zapowiedzianych terminów; firmy bez danych są na końcu. Wybierz sortowanie odpowiadające Twojemu priorytetowi: zrównoważona ocena łączy wszystko, „Ukończone projekty” pokazują, kto rzeczywiście oddał inwestycje, „Aktywne budowy” ujawniają, kto buduje teraz, a „Doświadczenie” odzwierciedla, ile danych redakcyjnych mamy o firmie.',
  },
  uk: {
    h1: 'Забудовники на Балі',
    count: (n: number) => `${n} компаній у каталозі`,
    intro: 'Каталог забудовників Балі з активними проєктами — вілли, апартаменти та житлові комплекси. Кожну компанію оцінено за чотирма напрямами: якість будівництва та нерухомості, репутація та досвід, техніка та виробництво, а також управління після здачі.',
    sortHint: 'За замовчуванням список відсортовано за індексом безпеки: дозвільні документи (PBG/SLF), зона землі, зданi об’єкти та дотримання заявлених термінів; компанії без даних — у кінці списку. Оберіть сортування під свій пріоритет: збалансований рейтинг враховує все одразу, «Завершені проєкти» показують, хто справді здав об’єкти, «Активні будови» — хто будує зараз, а «Досвід» відображає, скільки редакційних даних ми маємо про компанію.',
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
    ['Рейтинг Митюхина', 'mityukhin'],
    ['Понизить', 'demoted'],
  ] as const
  // The last four feed the safety index (lib/developer-safety.ts): building
  // permits, land zoning and the announced handover quarter are what makes a
  // developer verifiable rather than merely well-presented.
  const CPX_FIELDS = [
    ['Developer1', 'dev1'],
    ['Статус', 'status'],
    ['Готовность', 'ready'],
    ['Total quantity of units', 'units'],
    ['Разрешительные документы', 'permits'],
    ['Land color', 'land'],
    ['Year of completion ', 'year'],
    ['Q', 'quarter'],
  ] as const
  const devSelect = ['logo_url', ...DEV_FIELDS.map(([k, a]) => `${a}:data->"${k}"`)].join(',')
  const cpxSelect = CPX_FIELDS.map(([k, a]) => `${a}:data->"${k}"`).join(',')
  const reassemble = (raw: Record<string, unknown>, fields: ReadonlyArray<readonly [string, string]>) => {
    const data: Record<string, unknown> = {}
    for (const [k, a] of fields) data[k] = raw[a]
    return data
  }

  const [{ data: devData }, { data: complexData }] = await Promise.all([
    sb.from('raw_developers').select(devSelect).limit(200),
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
  // Same rows, kept per developer in raw form — the safety index needs each
  // complex individually (permits/zoning/deadline), not the aggregate.
  const safetyByDev = new Map<string, ComplexSafetyInput[]>()
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
    safetyByDev.set(key, [...(safetyByDev.get(key) ?? []), {
      status,
      permits: asText(cr.data['Разрешительные документы']),
      landColor: asText(cr.data['Land color']),
      completionYear: readNumUnits(cr.data['Year of completion ']) || null,
      completionQuarter: readNumUnits(cr.data['Q']) || null,
      units,
    }])
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
      const team = asText(r.data['Команда'])
      const business = asText(r.data['Бизнес и сервисы'])
      const yieldText = asText(r.data['Доходность'])
      // Rating order follows «Рейтинг Митюхина» (0–100) from Airtable; fall
      // back to the computed editorial score only when it's not filled in.
      const mityukhin = Number(r.data['Рейтинг Митюхина'])
      const score = Number.isFinite(mityukhin) && mityukhin > 0
        ? mityukhin
        : scoreDeveloper(stats, { construction, reputation, equipment, management, team, business, yieldText })
      const expScore =
        richnessLen(r.data['Репутация и опыт']) +
        richnessLen(r.data['Строительство и недвижимость']) +
        richnessLen(r.data['Техника и производство']) +
        richnessLen(r.data['Команда'])
      const intlRankRaw = Number(r.data['Опыт вне бали №'] ?? 0)
      const intlRank = Number.isFinite(intlRankRaw) && intlRankRaw > 0 ? intlRankRaw : null
      const safety = scoreDeveloperSafety({
        name,
        complexes: safetyByDev.get(canonicalize(name)) ?? [],
        demoted: r.data['Понизить'] === true,
      })
      return { r, name, stats, score, expScore, intlRank, safety, construction, reputation, equipment, management }
    })

  enriched.sort((a, b) => {
    if (sort === 'safety')     return compareBySafety(a, b)
    if (sort === 'ready')      return b.stats.ready - a.stats.ready || b.score - a.score
    if (sort === 'inprogress') {
      const aIp = a.stats.total - a.stats.ready
      const bIp = b.stats.total - b.stats.ready
      return bIp - aIp || b.score - a.score
    }
    if (sort === 'units-ready') {
      // Tiebreak by complex count (more delivered ≠ less risk),
      // then editorial score so empty cards don't sort above
      // editorialised ones with the same unit number.
      return b.stats.unitsReady - a.stats.unitsReady
        || b.stats.ready - a.stats.ready
        || b.score - a.score
    }
    if (sort === 'units-inprogress') {
      const aUip = a.stats.unitsTotal - a.stats.unitsReady
      const bUip = b.stats.unitsTotal - b.stats.unitsReady
      return bUip - aUip
        || (b.stats.total - b.stats.ready) - (a.stats.total - a.stats.ready)
        || b.score - a.score
    }
    if (sort === 'experience') return b.expScore - a.expScore || b.score - a.score
    if (sort === 'international') {
      if (a.intlRank == null && b.intlRank == null) return b.score - a.score
      if (a.intlRank == null) return 1
      if (b.intlRank == null) return -1
      return a.intlRank - b.intlRank
    }
    // Balanced (default) = «Рейтинг Митюхина». Many builders share 100, so
    // break ties by what's actually proven — delivered units, then delivered
    // complexes — instead of arbitrary DB order.
    return b.score - a.score
      || b.stats.unitsReady - a.stats.unitsReady
      || b.stats.ready - a.stats.ready
  })

  const items: DeveloperRowData[] = enriched.map(({ r, name, stats, safety, construction, reputation, equipment, management }) => ({
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
    safetyTier: safety.tier,
    safetyScore: safety.score,
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

// Default is `safety`, not `balanced`: «Сбалансированный» ranks by the legacy
// «Рейтинг Митюхина» column, which is a manual rank position (1 = best) whose
// unranked filler value is 100 — sorted descending it puts the companies we
// know nothing about on top. Kept as an explicit choice, not as the default.
export function parseSort(v: string | string[] | undefined): DevelopersSortKey {
  const s = Array.isArray(v) ? v[0] : v
  if (
    s === 'balanced' ||
    s === 'ready' ||
    s === 'inprogress' ||
    s === 'units-ready' ||
    s === 'units-inprogress' ||
    s === 'experience' ||
    s === 'international'
  ) return s
  return 'safety'
}
