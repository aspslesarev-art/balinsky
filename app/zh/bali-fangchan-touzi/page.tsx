// EN mirror of /ru/investicii-v-nedvizhimost-bali. Same pillar, same
// schema markup, English tone calibrated for foreign investors searching
// «bali property investment», «bali real estate ROI», «bali leasehold».

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp, Building2, FileCheck2, Calculator, ShieldCheck, BarChart3, ChevronRight, AlertTriangle, MapPin } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '2026年5月15日'

export const metadata: Metadata = {
  title: '2026年巴厘岛房产投资 — 真实收益、租赁产权、税费 | Balinsky',
  description: '面向外国人的完整巴厘岛房产投资指南：真实的8-15%净收益、leasehold与PT PMA架构对比、税费、投资回报测算，以及Canggu、Bukit、Ubud的案例分析。',
  alternates: {
    canonical: '/zh/bali-fangchan-touzi',
    languages: {
      ru: `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
      en: `${SITE_URL}/en/bali-property-investment`,
      zh: `${SITE_URL}/zh/bali-fangchan-touzi`,
      'x-default': `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
    },
  },
  openGraph: {
    title: '2026年巴厘岛房产投资 — 面向外国人的完整指南',
    description: '8-15%净收益、leasehold与PT PMA对比、税费、按区域划分的投资回报。数据源自Booking级分析与买家真实案例。',
    type: 'article',
    url: '/zh/bali-fangchan-touzi',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '2026年巴厘岛房产投资',
    description: '真实收益、租赁产权、税费、按区域划分的投资回报。经核实的数据。',
    images: ['/andrei.jpg'],
  },
}

const FAQ = [
  { q: '2026年巴厘岛别墅的实际租金收益是多少？',
    a: '根据estatemarket.io提供的Booking级实时数据：在专业管理、70-80%入住率的情况下，Canggu和Bukit的年净收益为8-12%。高端别墅（带海景的新建项目、4间以上卧室）可达15%。由于平均每日房价（ADR）较低，Ubud和Sanur的收益为6-9%。以上均为净收益，已扣除管理费（占收入的15-20%）、水电、折旧、税费和空置损失。' },
  { q: 'Leasehold还是PT PMA — 外国投资者该选哪种架构？',
    a: 'Leasehold（长期土地租赁，25-80年）适合个人购买1-2套房产。更便宜、更快（1-2个月），无需公司架构。PT PMA（由外国股东持有的印尼公司）适合3套以上房产的投资组合或商业地产。它可实现freehold产权，但需要2.5万美元实缴资本、年度申报和企业税。' },
  { q: '外国人在巴厘岛购买和持有房产需要缴纳哪些税？',
    a: '购买时：5%的取得税（BPHTB）+ 1-2%公证费 + 若涉及则有3-5%中介佣金。持有时：PBB（房产税）每年为地籍价值的0.1-0.3%。租金收入：外国人缴纳20%个人所得税（可通过PT PMA降低）。出售时：按售价缴纳2.5%所得税。' },
  { q: '巴厘岛别墅多少年能回本？',
    a: '年收益10%时 — 10年。12%时 — 8.3年。实际情况：在积极管理下，Canggu/Bukit为7-10年；较安静的区域为12-15年。要警惕购买时剩余年限不足30年的leasehold — 它们往往无法完成一个完整的回本周期外加有利可图的转售。' },
  { q: 'PBG和SLF是什么，为什么至关重要？',
    a: 'PBG（Persetujuan Bangunan Gedung）是建筑许可证，在施工前签发。SLF（Sertifikat Laik Fungsi）是使用适宜性证书，在竣工时签发。没有SLF，该房产无法合法出租 — 你的投资模型在官方层面无法成立。Balinsky目录中的每处房产在发布前都会对这些证件进行质检 — 正因如此，我们是经过编辑精选的名单，而非聚合平台。' },
  { q: '我能通过房产投资获得印尼居留许可吗？',
    a: '并不存在直接的「以房换居留」方案。有KITAS投资签证（在PT PMA中投资4万美元起）、Second Home Visa（在印尼银行存入13万美元起）、Golden Visa（个人投资35万美元起，公司为2500万美元）。仅购买一套别墅并不能获得居留权 — 你需要公司架构或存款架构之一。' },
]

const REGIONS = [
  { name: 'Canggu', slug: 'canggu', yieldRange: '10-13%', priceFrom: '$180K', niche: '潮流街区、活动、社交、短租' },
  { name: 'Bukit (Uluwatu/Pandawa/Ungasan)', slug: 'uluwatu', yieldRange: '10-15%', priceFrom: '$130K', niche: '高端海景、冲浪社群、高ADR' },
  { name: 'Ubud', slug: 'ubud', yieldRange: '6-9%', priceFrom: '$120K', niche: '康养、瑜伽旅游、长住' },
  { name: 'Sanur', slug: 'sanur', yieldRange: '5-8%', priceFrom: '$150K', niche: '家庭客群、低风险、需求稳定' },
  { name: 'Nusa Dua', slug: 'nusa-dua', yieldRange: '7-10%', priceFrom: '$200K', niche: '临近高端酒店、商务出行' },
  { name: 'Pererenan', slug: 'pererenan', yieldRange: '9-12%', priceFrom: '$160K', niche: '毗邻Canggu而更安静、新兴潮流区' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: `${SITE_URL}/zh` },
      { '@type': 'ListItem', position: 2, name: '巴厘岛房产投资', item: `${SITE_URL}/zh/bali-fangchan-touzi` },
    ],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: '首页', href: '/zh' },
          { label: '巴厘岛房产投资' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              巴厘岛房产投资 — 2026年指南
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              真实的8-15%年净收益、6个区域的投资回报拆解、法律架构（leasehold与PT PMA）、
              外国业主的税费，以及一份经编辑精选、证件齐全的房产名单。
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">更新于：{UPDATED}</p>
          </header>

          <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { Icon: TrendingUp, n: '8–15%', label: '年净收益' },
              { Icon: Building2, n: '828+', label: '目录内房源' },
              { Icon: ShieldCheck, n: '100%', label: 'PBG + SLF 已核实' },
              { Icon: BarChart3, n: '6', label: '投资区域' },
            ].map(({ Icon, n, label }) => (
              <div key={label} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Icon size={20} className="text-[var(--color-primary)] mb-2" />
                <div className="text-[24px] font-semibold text-[#111827]">{n}</div>
                <div className="text-[13px] text-[var(--color-text-muted)]">{label}</div>
              </div>
            ))}
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              为什么巴厘岛是2026年外国投资者的头号市场
            </h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>
                巴厘岛是东南亚唯一一个即便在印尼禁止外国人持有freehold的情况下，外国人仍可合法持有房产的旅游市场。
                通过leasehold和PT PMA架构，交易能快速、干净地完成，而税率也是本地区最低之一。
              </p>
              <p>
                与此同时，该岛稳居本地区旅游业龙头地位：每年600-700万国际游客，Canggu和Bukit酒店及租赁的入住率为70-85%，
                平均每日房价（ADR）自2023年以来每年增长8-12%。据 <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a> —
                即我们在每张房产卡片中呈现的公开Booking分析 — 真实的邻里级收益数据可精确到1公里半径内的逐条街道。
              </p>
              <p>
                这正是难得的组合：<strong>高旅游需求 + 合法且对外国人友好的架构 + 低进入门槛</strong>
                （入门房源12-20万美元）。东南亚没有其他市场能同时兼具这三点 — Phuket和Ho Chi Minh价格更高、交易更繁琐，
                Samui和Langkawi的需求则更弱。
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              按区域划分的收益 — 2026年真实数据
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-6">
              这些区间取自过去12个月内可比的Booking邻里房源的平均值，已扣除管理费、折旧和税费。
              区间以第5和第95百分位数表示。
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">区域</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">收益</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">起价</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)] hidden md:table-cell">特点</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {REGIONS.map(r => (
                    <tr key={r.slug} className="border-b border-[var(--color-border)]">
                      <td className="py-3 px-3 font-semibold text-[#111827]">{r.name}</td>
                      <td className="py-3 px-3 text-[var(--color-primary)] font-semibold">{r.yieldRange}</td>
                      <td className="py-3 px-3">{r.priceFrom}</td>
                      <td className="py-3 px-3 hidden md:table-cell text-[var(--color-text-muted)]">{r.niche}</td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/zh/bieshu`} className="text-[var(--color-primary)] text-[13px] inline-flex items-center gap-1 no-underline hover:underline">
                          浏览 <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              法律架构 — Leasehold与PT PMA对比
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">Leasehold</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">向本地业主长期租赁土地 — 25-80年，通常可续期。</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>手续和文件最少</li>
                  <li>在PPAT公证人处1-2个月内完成</li>
                  <li>适合个人购买1-2套</li>
                  <li>每笔交易比PT PMA便宜5000-15000美元</li>
                  <li className="text-[var(--color-text-muted)]">你并不拥有土地 — 只拥有使用权</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">PT PMA</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">由外国股东持有的印尼公司 — 可持有freehold土地。</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Freehold产权</li>
                  <li>适合3套以上房产的投资组合</li>
                  <li>可开展合法的租赁经营</li>
                  <li>2.5万美元实缴资本 + 年度申报</li>
                  <li className="text-[var(--color-text-muted)]">22%企业所得税</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
              完整的交易指南见 <Link href="/zh/ruhe-goumai" className="text-[var(--color-primary)] no-underline hover:underline">「如何在巴厘岛购买房产」</Link> 页面。
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              投资回报测算 — 典型案例
            </h2>
            <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={20} className="text-[var(--color-primary)]" />
                <strong>Canggu的两卧别墅，25万美元，30年leasehold</strong>
              </div>
              <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                <li>购买价格：250,000美元</li>
                <li>交易费用（公证、BPHTB税、尽职调查）：约15,000美元</li>
                <li>平均房价：200美元/晚 × 75%入住率 × 365天 = 54,750美元/年</li>
                <li>支出（管理费18%、水电、家具折旧、20%税）：约23,500美元/年</li>
                <li>净现金流：约31,250美元/年 → 25万美元投入的年收益为12.5%</li>
                <li>回本：约8年实现盈亏平衡，租约上还剩22个可出租的有效年份</li>
              </ul>
              <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
                我们目录中的每个别墅页面都会自动运行类似的计算器，其中填充了来自
                <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a> 的真实邻里数据。
              </p>
            </div>
          </section>

          <section className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">卖家不会告诉你的风险</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li><strong>剩余年限不足30年的leasehold。</strong>你无法收回投资并且仍能有利可图地转售。购买时坚持要求剩余35年以上。</li>
                  <li><strong>没有SLF的房产。</strong>无法合法出租 — 你的收益模型在纸面上根本不存在。</li>
                  <li><strong>没有PBG的开发商。</strong>施工可能被当局叫停，而你的定金不会退还。</li>
                  <li><strong>农业区土地。</strong>Canggu/Pererenan的一些地块正在被重新划分 — 请查阅RDTR规划。</li>
                  <li><strong>真实入住率低于承诺。</strong>开发商担保的收益通常虚高30-50%。请与Booking邻里数据交叉核对。</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              我们如何核实目录中的房产
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-4">
              Balinsky中的每处房产在发布前都会经过编辑质检。这不是一个来者不拒的聚合平台 —
              只有那些证件（PBG、SLF）、土地架构（分区、RDTR）和开发商（PT注册）都经过人工核实的项目才会入选。
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <FileCheck2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">证件</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">PBG、SLF、IMB、AJB / 公证契约 — 对照ATR/BPN部委登记册进行核查。</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Building2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">开发商</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">PT注册、已完工项目组合、在本地中介圈中的口碑。</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <MapPin size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">位置</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">实地考察、来自现场的照片和视频、500米范围内的基础设施核查。</p>
              </div>
            </div>
            <div className="mt-6 text-[14px]">
              更多内容见 <Link href="/zh/guanyu" className="text-[var(--color-primary)] no-underline hover:underline">「关于Balinsky」</Link>。
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              下一步
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/zh/bieshu" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">别墅目录</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">每套别墅均附照片、价格、证件和投资回报测算。</p>
              </Link>
              <Link href="/zh/gongyu" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">公寓目录</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">受管理项目中的房源 — 进入门槛最低。</p>
              </Link>
              <Link href="/zh/zhuzhaiqu" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">住宅项目</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">期房和现房项目，附管理、效果图和交付日期。</p>
              </Link>
              <Link href="/zh/ruhe-goumai" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">如何购买 — 分步指南</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">交易的七个步骤、产权架构、真实成本与陷阱。</p>
              </Link>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              常见问题
            </h2>
            <div className="space-y-3">
              {FAQ.map((it, i) => (
                <details key={i} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-semibold text-[#111827]">
                    <span>{it.q}</span>
                    <ChevronRight size={18} className="shrink-0 transition-transform [details[open]_&]:rotate-90" />
                  </summary>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)]">{it.a}</p>
                </details>
              ))}
            </div>
          </section>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </PageContainer>
      <Footer lang="zh" />
    </>
  )
}
