// Shared knowledge-list shell for /ru/znaniya and /en/knowledge.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadAllKnowledge, filterByAudience, type KnowledgeAudience } from '@/lib/knowledge'
import { enKnowledgeSlug } from '@/lib/knowledge-en-slugs'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { ArticleCover } from '@/components/ArticleCover'

const COPY = {
  ru: {
    titleInvestor: 'База знаний для инвестора — недвижимость на Бали | Balinsky',
    titleAgent: 'База знаний для агента — работа с недвижимостью Бали | Balinsky',
    titleLife: 'Жизнь на Бали — гид для переезжающих и местных | Balinsky',
    descInvestor: 'Полезные статьи об инвестициях в недвижимость Бали: налоги, leasehold, доходность, проверка застройщика.',
    descAgent: 'Гайды для зарубежных агентов и брокеров, которые продают недвижимость Бали: комиссии, юр-схема, привлечение клиентов.',
    descLife: 'Жизнь на Бали: культура, медицина, безопасность, страховки, приложения и лайфхаки для жителей и тех, кто переезжает.',
    h1Investor: 'Знания для инвестора',
    h1Agent: 'Знания для агента',
    h1Life: 'Жизнь на Бали',
    subInvestor: 'Налоги, право, доходность, риски — что нужно знать перед покупкой',
    subAgent: 'Как зарубежному агенту работать с Бали: комиссии, схемы, инструменты, продажи',
    subLife: 'Культура, медицина, безопасность, лайфхаки — для тех, кто живёт или переезжает',
    tabInvestor: 'Для инвестора',
    tabAgent: 'Для агента',
    tabLife: 'Жизнь на Бали',
    empty: 'Пока нет статей в этом разделе.',
  },
  en: {
    titleInvestor: 'Knowledge base for investors — Bali real estate | Balinsky',
    titleAgent: 'Knowledge base for agents — working with Bali real estate | Balinsky',
    titleLife: 'Life in Bali — guide for movers and residents | Balinsky',
    descInvestor: 'Useful guides for investing in Bali real estate: taxes, leasehold, yields, developer due diligence.',
    descAgent: 'Guides for foreign agents and brokers selling Bali property: commissions, legal setup, lead generation.',
    descLife: 'Living in Bali: culture, healthcare, safety, insurance, apps and life hacks for residents and movers.',
    h1Investor: 'For investors',
    h1Agent: 'For agents',
    h1Life: 'Life in Bali',
    subInvestor: 'Taxes, law, yields, risks — what to know before you buy',
    subAgent: 'How a foreign agent can work the Bali market: commissions, schemes, tools, sales',
    subLife: 'Culture, healthcare, safety, hacks — for residents and those relocating',
    tabInvestor: 'For investors',
    tabAgent: 'For agents',
    tabLife: 'Life in Bali',
    empty: 'No articles in this section yet.',
  },
  id: {
    titleInvestor: 'Basis pengetahuan untuk investor — properti Bali | Balinsky',
    titleAgent: 'Basis pengetahuan untuk agen — bekerja dengan properti Bali | Balinsky',
    titleLife: 'Kehidupan di Bali — panduan untuk pendatang dan penduduk | Balinsky',
    descInvestor: 'Panduan bermanfaat untuk berinvestasi di properti Bali: pajak, hak sewa, imbal hasil, uji tuntas pengembang.',
    descAgent: 'Panduan untuk agen dan broker asing yang menjual properti Bali: komisi, penyiapan hukum, pencarian klien.',
    descLife: 'Tinggal di Bali: budaya, kesehatan, keamanan, asuransi, aplikasi, dan tips hidup untuk penduduk dan pendatang.',
    h1Investor: 'Untuk investor',
    h1Agent: 'Untuk agen',
    h1Life: 'Kehidupan di Bali',
    subInvestor: 'Pajak, hukum, imbal hasil, risiko — yang perlu diketahui sebelum membeli',
    subAgent: 'Bagaimana agen asing dapat menggarap pasar Bali: komisi, skema, alat, penjualan',
    subLife: 'Budaya, kesehatan, keamanan, tips — untuk penduduk dan yang sedang pindah',
    tabInvestor: 'Untuk investor',
    tabAgent: 'Untuk agen',
    tabLife: 'Kehidupan di Bali',
    empty: 'Belum ada artikel di bagian ini.',
  },
  fr: {
    titleInvestor: 'Base de connaissances pour investisseurs — immobilier à Bali | Balinsky',
    titleAgent: 'Base de connaissances pour agents — travailler avec l\'immobilier de Bali | Balinsky',
    titleLife: 'Vivre à Bali — guide pour les nouveaux arrivants et les résidents | Balinsky',
    descInvestor: 'Guides utiles pour investir dans l\'immobilier à Bali : fiscalité, leasehold, rendements, audit du promoteur.',
    descAgent: 'Guides pour les agents et courtiers étrangers qui vendent de l\'immobilier à Bali : commissions, montage juridique, génération de prospects.',
    descLife: 'Vivre à Bali : culture, santé, sécurité, assurances, applications et astuces pour les résidents et les nouveaux arrivants.',
    h1Investor: 'Pour les investisseurs',
    h1Agent: 'Pour les agents',
    h1Life: 'Vivre à Bali',
    subInvestor: 'Fiscalité, droit, rendements, risques — ce qu\'il faut savoir avant d\'acheter',
    subAgent: 'Comment un agent étranger peut travailler le marché de Bali : commissions, schémas, outils, ventes',
    subLife: 'Culture, santé, sécurité, astuces — pour les résidents et ceux qui déménagent',
    tabInvestor: 'Pour les investisseurs',
    tabAgent: 'Pour les agents',
    tabLife: 'Vivre à Bali',
    empty: 'Aucun article dans cette section pour le moment.',
  },
  de: {
    titleInvestor: 'Wissensdatenbank für Investoren — Immobilien auf Bali | Balinsky',
    titleAgent: 'Wissensdatenbank für Makler — Arbeit mit Bali-Immobilien | Balinsky',
    titleLife: 'Leben auf Bali — Leitfaden für Zuzügler und Bewohner | Balinsky',
    descInvestor: 'Hilfreiche Ratgeber für Investitionen in Bali-Immobilien: Steuern, Leasehold, Renditen, Bauträger-Prüfung.',
    descAgent: 'Leitfäden für ausländische Makler, die Bali-Immobilien verkaufen: Provisionen, rechtliche Struktur, Kundengewinnung.',
    descLife: 'Leben auf Bali: Kultur, Gesundheitsversorgung, Sicherheit, Versicherungen, Apps und Life-Hacks für Bewohner und Zuzügler.',
    h1Investor: 'Für Investoren',
    h1Agent: 'Für Makler',
    h1Life: 'Leben auf Bali',
    subInvestor: 'Steuern, Recht, Renditen, Risiken — was Sie vor dem Kauf wissen sollten',
    subAgent: 'Wie ein ausländischer Makler den Bali-Markt bearbeitet: Provisionen, Modelle, Tools, Verkauf',
    subLife: 'Kultur, Gesundheit, Sicherheit, Life-Hacks — für Bewohner und alle, die umziehen',
    tabInvestor: 'Für Investoren',
    tabAgent: 'Für Makler',
    tabLife: 'Leben auf Bali',
    empty: 'In diesem Bereich gibt es noch keine Artikel.',
  },
  zh: {
    titleInvestor: '投资者知识库——巴厘岛房地产 | Balinsky',
    titleAgent: '代理人知识库——从事巴厘岛房地产 | Balinsky',
    titleLife: '巴厘岛生活——迁居者与居民指南 | Balinsky',
    descInvestor: '投资巴厘岛房地产的实用指南：税务、租赁产权、收益、开发商尽职调查。',
    descAgent: '面向销售巴厘岛房产的外国代理人和经纪人的指南：佣金、法律架构、客户开发。',
    descLife: '在巴厘岛生活：文化、医疗、安全、保险、应用和生活窍门，适合居民与迁居者。',
    h1Investor: '面向投资者',
    h1Agent: '面向代理人',
    h1Life: '巴厘岛生活',
    subInvestor: '税务、法律、收益、风险——购买前需要了解的内容',
    subAgent: '外国代理人如何开拓巴厘岛市场：佣金、模式、工具、销售',
    subLife: '文化、医疗、安全、窍门——适合居民和迁居者',
    tabInvestor: '面向投资者',
    tabAgent: '面向代理人',
    tabLife: '巴厘岛生活',
    empty: '本栏目暂无文章。',
  },
  nl: {
    titleInvestor: 'Kennisbank voor investeerders — vastgoed op Bali | Balinsky',
    titleAgent: 'Kennisbank voor makelaars — werken met Bali-vastgoed | Balinsky',
    titleLife: 'Wonen op Bali — gids voor nieuwkomers en bewoners | Balinsky',
    descInvestor: 'Nuttige gidsen voor investeren in Bali-vastgoed: belastingen, leasehold, rendementen, due diligence van ontwikkelaars.',
    descAgent: 'Gidsen voor buitenlandse makelaars die Bali-vastgoed verkopen: commissies, juridische structuur, leadgeneratie.',
    descLife: 'Wonen op Bali: cultuur, zorg, veiligheid, verzekeringen, apps en lifehacks voor bewoners en nieuwkomers.',
    h1Investor: 'Voor investeerders',
    h1Agent: 'Voor makelaars',
    h1Life: 'Wonen op Bali',
    subInvestor: 'Belastingen, recht, rendementen, risico\'s — wat u moet weten voordat u koopt',
    subAgent: 'Hoe een buitenlandse makelaar de Bali-markt kan bewerken: commissies, modellen, tools, verkoop',
    subLife: 'Cultuur, zorg, veiligheid, hacks — voor bewoners en wie verhuist',
    tabInvestor: 'Voor investeerders',
    tabAgent: 'Voor makelaars',
    tabLife: 'Wonen op Bali',
    empty: 'Nog geen artikelen in deze sectie.',
  },
  ban: {
    titleInvestor: 'Basis pangweruh anggen investor — properti ring Bali | Balinsky',
    titleAgent: 'Basis pangweruh anggen agen — makarya sareng properti Bali | Balinsky',
    titleLife: 'Urip ring Bali — panuntun anggen sane pindah lan penduduk | Balinsky',
    descInvestor: 'Panuntun mawiguna anggen ngainvestasi ring properti Bali: pajeg, leasehold, imbal hasil, uji tuntas pangwangun.',
    descAgent: 'Panuntun anggen agen lan broker dura negara sane ngadol properti Bali: komisi, struktur hukum, ngrereh klien.',
    descLife: 'Urip ring Bali: budaya, kesehatan, kaamanan, asuransi, aplikasi, miwah tips urip anggen penduduk lan sane pindah.',
    h1Investor: 'Anggen investor',
    h1Agent: 'Anggen agen',
    h1Life: 'Urip ring Bali',
    subInvestor: 'Pajeg, hukum, imbal hasil, risiko — sane patut kauningin sadurung numbas',
    subAgent: 'Sapunapi agen dura negara nyidayang makarya ring pasar Bali: komisi, skema, piranti, penjualan',
    subLife: 'Budaya, kesehatan, kaamanan, tips — anggen penduduk lan sane pacang pindah',
    tabInvestor: 'Anggen investor',
    tabAgent: 'Anggen agen',
    tabLife: 'Urip ring Bali',
    empty: 'Durung wenten artikel ring bagian puniki.',
  },
  pl: {
    titleInvestor: 'Baza wiedzy dla inwestorów — nieruchomości na Bali | Balinsky',
    titleAgent: 'Baza wiedzy dla agentów — praca z nieruchomościami na Bali | Balinsky',
    titleLife: 'Życie na Bali — przewodnik dla przeprowadzających się i mieszkańców | Balinsky',
    descInvestor: 'Przydatne poradniki o inwestowaniu w nieruchomości na Bali: podatki, leasehold, rentowność, weryfikacja dewelopera.',
    descAgent: 'Poradniki dla zagranicznych agentów i brokerów sprzedających nieruchomości na Bali: prowizje, struktura prawna, pozyskiwanie klientów.',
    descLife: 'Życie na Bali: kultura, opieka zdrowotna, bezpieczeństwo, ubezpieczenia, aplikacje i porady dla mieszkańców i przeprowadzających się.',
    h1Investor: 'Dla inwestorów',
    h1Agent: 'Dla agentów',
    h1Life: 'Życie na Bali',
    subInvestor: 'Podatki, prawo, rentowność, ryzyko — co warto wiedzieć przed zakupem',
    subAgent: 'Jak zagraniczny agent może działać na rynku Bali: prowizje, schematy, narzędzia, sprzedaż',
    subLife: 'Kultura, zdrowie, bezpieczeństwo, porady — dla mieszkańców i przeprowadzających się',
    tabInvestor: 'Dla inwestorów',
    tabAgent: 'Dla agentów',
    tabLife: 'Życie na Bali',
    empty: 'Brak artykułów w tej sekcji.',
  },
  uk: {
    titleInvestor: 'База знань для інвесторів — нерухомість на Балі | Balinsky',
    titleAgent: 'База знань для агентів — робота з нерухомістю Балі | Balinsky',
    titleLife: 'Життя на Балі — гід для тих, хто переїжджає, і мешканців | Balinsky',
    descInvestor: 'Корисні статті про інвестиції в нерухомість Балі: податки, leasehold, дохідність, перевірка забудовника.',
    descAgent: 'Гайди для іноземних агентів і брокерів, які продають нерухомість Балі: комісії, юридична схема, залучення клієнтів.',
    descLife: 'Життя на Балі: культура, медицина, безпека, страхування, застосунки та лайфхаки для мешканців і тих, хто переїжджає.',
    h1Investor: 'Для інвесторів',
    h1Agent: 'Для агентів',
    h1Life: 'Життя на Балі',
    subInvestor: 'Податки, право, дохідність, ризики — що потрібно знати перед покупкою',
    subAgent: 'Як іноземному агенту працювати на ринку Балі: комісії, схеми, інструменти, продажі',
    subLife: 'Культура, медицина, безпека, лайфхаки — для мешканців і тих, хто переїжджає',
    tabInvestor: 'Для інвесторів',
    tabAgent: 'Для агентів',
    tabLife: 'Життя на Балі',
    empty: 'Поки немає статей у цьому розділі.',
  },
} as const

function pickAudience(raw: string | string[] | undefined): KnowledgeAudience {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (v === 'agent') return 'agent'
  if (v === 'life') return 'life'
  return 'investor'
}

function audienceMetaPath(audience: KnowledgeAudience, base: string): string {
  return audience === 'investor' ? base : `${base}?for=${audience}`
}

export function generateKnowledgeListMetadata(lang: Lang, audience: KnowledgeAudience = 'investor'): Metadata {
  const c = pickCopy(COPY, lang)
  const ruPath = audienceMetaPath(audience, '/ru/znaniya')
  const enPath = audienceMetaPath(audience, '/en/knowledge')
  const path = audienceMetaPath(audience, switchLangPath('/ru/znaniya', lang))
  const title = audience === 'agent' ? c.titleAgent : audience === 'life' ? c.titleLife : c.titleInvestor
  const description = audience === 'agent' ? c.descAgent : audience === 'life' ? c.descLife : c.descInvestor
  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: { ru: `https://balinsky.info${ruPath}`, en: `https://balinsky.info${enPath}`, 'x-default': `https://balinsky.info${ruPath}` },
    },
  }
}

export async function KnowledgeList({ lang, audience }: { lang: Lang; audience: KnowledgeAudience }) {
  const c = pickCopy(COPY, lang)
  const all = await loadAllKnowledge(lang)
  const items = filterByAudience(all, audience)
  const detailRoot = switchLangPath('/ru/znaniya', lang)
  const listRoot = detailRoot
  const h1 = audience === 'agent' ? c.h1Agent : audience === 'life' ? c.h1Life : c.h1Investor
  const sub = audience === 'agent' ? c.subAgent : audience === 'life' ? c.subLife : c.subInvestor

  const pillBase = 'inline-flex items-center px-5 py-2 rounded-full text-[14px] font-medium no-underline transition-colors border'
  const pillActive = 'bg-[#111827] text-white border-[#111827]'
  const pillIdle = 'bg-white text-[#111827] border-[var(--color-border)] hover:border-[var(--color-primary)]'

  return (
    <>
      <Header />
      <PageContainer>
        <h1 className="pt-8 mb-4 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">{h1}</h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">{sub}</div>
        <div className="flex flex-wrap gap-2 mb-8">
          <Link href={listRoot} className={`${pillBase} ${audience === 'investor' ? pillActive : pillIdle}`}>
            {c.tabInvestor}
          </Link>
          <Link href={`${listRoot}?for=agent`} className={`${pillBase} ${audience === 'agent' ? pillActive : pillIdle}`}>
            {c.tabAgent}
          </Link>
          <Link href={`${listRoot}?for=life`} className={`${pillBase} ${audience === 'life' ? pillActive : pillIdle}`}>
            {c.tabLife}
          </Link>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(k => (
            <li key={k.id}>
              <Link href={`${detailRoot}/${lang === 'ru' ? k.slug : enKnowledgeSlug(k.slug)}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                  {k.photo ? (
                    <Image src={k.photo} alt={k.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                  ) : (
                    <ArticleCover title={k.title} slug={k.slug} />
                  )}
                </div>
                <div className="p-4">
                  <div className="text-[16px] font-semibold leading-snug line-clamp-3">{k.title}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-[var(--color-text-muted)]">
            {c.empty}
          </div>
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}

export { pickAudience }
