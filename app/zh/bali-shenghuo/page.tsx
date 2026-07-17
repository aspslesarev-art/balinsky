// EN mirror of /ru/zhizn-na-bali. Relocation hub for foreigners
// considering Bali — visas, taxes, schools, healthcare, monthly budget.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Plane, GraduationCap, Stethoscope, Wallet, Wifi, ChevronRight, FileCheck2 } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '2026年5月15日'

export const metadata: Metadata = {
  title: '在巴厘岛生活 — 2026年签证、税费、学校、医疗 | Balinsky',
  description: '巴厘岛移居指南：KITAS、Second Home Visa、Golden Visa、外国居民税费、国际学校、BIMC和Siloam医院、真实的家庭预算。',
  alternates: {
    canonical: '/zh/bali-shenghuo',
    languages: {
      ru: `${SITE_URL}/ru/zhizn-na-bali`,
      en: `${SITE_URL}/en/living-in-bali`,
      zh: `${SITE_URL}/zh/bali-shenghuo`,
      'x-default': `${SITE_URL}/ru/zhizn-na-bali`,
    },
  },
  openGraph: {
    title: '在巴厘岛生活 — 2026年移居指南',
    description: 'KITAS、Second Home Visa、Golden Visa、居民税费、学校、医疗、家庭预算 — 来自在此生活5年以上的运营者。',
    type: 'article',
    url: '/zh/bali-shenghuo',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '在巴厘岛生活 — 2026年移居指南',
    description: '签证、税费、学校、医疗、预算。',
    images: ['/balina.jpg'],
  },
}

const FAQ = [
  { q: '哪种签证适合长期移居巴厘岛？',
    a: '基础方案：B211A（旅游签，可续期至6个月）用于试住期。KITAS投资签证（1-2年，在PT PMA中投资4万美元起）适合企业家和投资者。KITAS工作签证 — 通过印尼雇主办理。Second Home Visa（5-10年，在本地银行存入13万美元）适合经济独立的申请人。Golden Visa（5-10年，投资35万美元以上）— 面向高净值人士的顶级方案。' },
  { q: '巴厘岛的外国居民需要缴纳哪些税？',
    a: '在一个日历年内于印尼停留183天后，你即成为税务居民。累进个人所得税：不超过6000万印尼盾（约4千美元）为5%，不超过2.5亿为15%，不超过5亿为25%，不超过50亿为30%，超过部分为35%。按全球收入征税，但可通过避免双重征税协定抵扣（印尼与70多个国家签有DTA，包括美国、英国、新加坡、澳大利亚和欧盟成员国）。' },
  { q: '国际学校的费用是多少？',
    a: '标准档：Sunrise School、Australian Independent School、Cita Hati — 每名小学生每年7000-15000美元。高端档：Green School Bali — 20000-28000美元，Australian International School — 18000-25000美元。学前班（3-5岁）— 每年5000-10000美元。两个中学阶段孩子的预算：每年20000-35000美元。' },
  { q: '当地有哪些医疗资源？',
    a: '国际标准：BIMC Kuta（Cleveland Clinic关联机构）、BIMC Nusa Dua、Siloam Hospital Denpasar、Kasih Ibu。专科门诊40-80美元，CT/MRI 200-400美元，急诊手术5000-15000美元。国际保险为必备（Allianz、Cigna、Bupa）— 每名成人每年1500-3500美元。重大手术和肿瘤治疗通常转往新加坡或马来西亚。' },
  { q: '四口之家每月预算是多少？',
    a: '舒适型（两个孩子上国际学校、Umalas带花园和泳池的三卧住宅、每周4天帮佣、一辆车）：每月5500-7500美元 = 每年66000-90000美元。高端型（Green School、Berawa的别墅、全职司机和帮佣、两辆车）：每月9000-13000美元 = 每年108000-156000美元。最低型（不上学、Sanur一套普通两卧别墅）：每月2200-3000美元。' },
  { q: '我能在巴厘岛远程办公吗 — 网络和基础设施如何？',
    a: '可以。商务基础设施完善：Canggu、Berawa、Umalas、Sanur以及Bukit大多数项目都有200-1000 Mbps光纤。24小时联合办公空间（Outpost、Tropical Nomad、Dojo、Soul & Surf）。电力稳定，停电罕见。KITAS投资签证或B211A（配合2025年10月起推出的E33G数字游民签证）可合法覆盖远程办公。' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: `${SITE_URL}/zh` },
      { '@type': 'ListItem', position: 2, name: '在巴厘岛生活', item: `${SITE_URL}/zh/bali-shenghuo` },
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

  const SECTIONS = [
    { Icon: Plane, title: '签证与居留', body: 'KITAS投资签证4万美元起，Second Home Visa存款13万美元起，Golden Visa投资35万美元起。旅游签B211A适合6个月试住期。' },
    { Icon: FileCheck2, title: '居民税费', body: '一年内停留183天后成为税务居民。5-35%累进税率。可与70多个国家进行DTA抵扣 — 覆盖大多数西方和独联体市场。' },
    { Icon: GraduationCap, title: '学校', body: 'Sunrise / AIS / Cita Hati：每年7000-15000美元。高端 — Green School（20000-28000美元）和AIS Premium。国际社群氛围浓厚。' },
    { Icon: Stethoscope, title: '医疗', body: 'BIMC、Siloam、Kasih Ibu — 国际水准的诊所。保险为必备（每年1500-3500美元）。重大手术转往新加坡。' },
    { Icon: Wallet, title: '家庭预算', body: '四口之家：舒适型每年66000-90000美元，高端型每年108000-156000美元。不含学费的基础最低标准 — 每月2200美元起。' },
    { Icon: Wifi, title: '远程办公', body: '所有投资区域均有200-1000 Mbps光纤。Outpost / Tropical Nomad / Dojo联合办公空间。KITAS投资签证或新的E33G数字游民签证可合法覆盖远程办公。' },
  ]

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: '首页', href: '/zh' },
          { label: '在巴厘岛生活' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              在巴厘岛生活 — 移居指南
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              通过KITAS、Second Home和Golden Visa获得居留许可、外国居民税费、真实的家庭预算、
              国际学校、医疗和远程办公基础设施 — 均汇集自在此岛生活5年以上的运营者。
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">更新于：{UPDATED}</p>
          </header>

          <section className="mb-12 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {SECTIONS.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Icon size={22} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[15px] font-semibold text-[#111827] mb-1">{title}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">{body}</p>
              </div>
            ))}
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">签证 — 哪种适合哪种情况</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>B211A — 旅游签证。</strong>60天，可续期至6个月。适合决定移居前的试住期。费用50-100美元 + 代办费50-150美元。</p>
              <p><strong>E33G — 数字游民签证（2025年10月起）。</strong>最长1年，要求有来自印尼境外、经核实的年收入6万美元以上。不允许为本地公司工作，但可将远程办公合法化。非常适合自由职业者和远程办公者。</p>
              <p><strong>KITAS投资签证。</strong>1-2年，可续期，与一家至少投资4万美元的PT PMA挂钩。允许居留、开立本地银行账户、购车、办理居民医疗保险。企业家最青睐的形式。</p>
              <p><strong>Second Home Visa。</strong>5-10年，要求在印尼银行存入13万美元（可逐步取出）。面向经济独立的申请人、退休人士和富裕家庭。</p>
              <p><strong>Golden Visa。</strong>5-10年，投资35万美元（个人）或2500万美元（公司）。顶级形式 — 权利最大，续签审查最少。</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">外国人的居民税费</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>在12个月内于印尼停留183天后，你即成为税务居民。自2025年起，印尼实行全球征税：个人所得税按全部全球收入缴纳，而非仅限本地收入。</p>
              <p>累进税率：不超过6000万印尼盾（约4千美元）为5%，不超过2.5亿（约1.6万美元）为15%，不超过5亿（约3.2万美元）为25%，不超过50亿（约32万美元）为30%，超过部分为35%。纳税年度＝日历年，报税截止日为3月31日。</p>
              <p>避免双重征税协定可减轻负担。印尼与美国、英国、新加坡、澳大利亚、所有欧盟成员国、俄罗斯、哈萨克斯坦、白俄罗斯、乌克兰等约70个国家签有DTA。在境外已缴纳的税款可抵扣印尼应纳税额。</p>
              <p>若通过PT PMA进行收入架构安排：22%企业税 + 向非居民支付时10%股息预提税（按DTA调整）。对于高收入而言，实际税率往往低于个人所得税。</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">国际学校</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>学前班（3-5岁）：</strong>Sunrise Preschool、Sanggar Anak Tangguh、Australian Independent（幼儿部）— 每年5000-10000美元。蒙特梭利、瑞吉欧、华德福项目实力雄厚。</p>
              <p><strong>小学和中学（标准档）：</strong>Sunrise School（Bumin Sanur）、Australian Independent School（Sanur）、Cita Hati（Denpasar）、Bali Island School（Sanur）— 每年7000-15000美元。剑桥和国际文凭课程，英语外加西班牙语/中文/印尼语。</p>
              <p><strong>高端档：</strong>Green School Bali（每年20000-28000美元）— 国际知名的环保竹制学校。Australian International School（Sanur，高端档18000-25000美元）— 剑桥IGCSE / A-level。</p>
              <p>庞大的国际社群（5000多个外籍家庭）— 活跃的家长网络、周末俱乐部、语言交流。可覆盖1至12年级全学段。</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">医疗</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>国际水准的诊所：</strong>BIMC Kuta（Cleveland Clinic关联机构）、BIMC Nusa Dua、Siloam Hospital Denpasar、Kasih Ibu Hospital。大多数医生会讲英语，部分持有国际认证（US Board、AHPRA、GMC）。</p>
              <p><strong>自费价格：</strong>专科门诊40-80美元，全套血液检查25-40美元，CT/MRI 200-400美元，中等急诊手术5000-15000美元，顺产2000-4000美元，剖腹产4000-7000美元。</p>
              <p><strong>保险为必备：</strong>Allianz Worldwide Care、Cigna Global、Bupa Global、Aetna International。30-40岁成人的基础计划 — 每年1500-2500美元，含新加坡住院的高端计划 — 每年3500-6000美元。</p>
              <p>重症肿瘤、心脏手术、神经外科 — 通常转运至新加坡（Mount Elizabeth、Gleneagles）或马来西亚（Sunway Medical）。大多数保险计划涵盖转运。</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">真实生活成本</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">类别</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">最低</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">舒适</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">高端</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:py-2 [&_td]:px-3 [&_td]:border-b [&_td]:border-[var(--color-border)]">
                  <tr><td className="font-semibold">房租（三卧）</td><td>$1000-1500</td><td>$2500-3500</td><td>$5000-9000</td></tr>
                  <tr><td className="font-semibold">交通</td><td>$150（摩托车）</td><td>$500（汽车+摩托车）</td><td>$1500（司机）</td></tr>
                  <tr><td className="font-semibold">餐饮</td><td>$400</td><td>$1200</td><td>$2500</td></tr>
                  <tr><td className="font-semibold">帮佣</td><td>—</td><td>$200（每周3天）</td><td>$600（全职）</td></tr>
                  <tr><td className="font-semibold">学费（2个孩子）</td><td>—</td><td>$1500</td><td>$3500</td></tr>
                  <tr><td className="font-semibold">家庭保险</td><td>$300</td><td>$600</td><td>$1200</td></tr>
                  <tr><td className="font-semibold">其他</td><td>$200</td><td>$700</td><td>$1500</td></tr>
                  <tr className="font-semibold"><td>每月合计</td><td>$2050-2550</td><td>$7200-8200</td><td>$15800-19800</td></tr>
                </tbody>
              </table>
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

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">下一步</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/zh/bali-fangchan-touzi" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">巴厘岛房产投资</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">收益、leasehold、税费、投资回报 — 完整的投资者指南。</p>
              </Link>
              <Link href="/zh/bieshu/umalas" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Umalas的别墅 — 住宅区</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">适合有孩子家庭的安静区域，学校和基础设施近在咫尺。</p>
              </Link>
              <Link href="/zh/bieshu/sanur" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Sanur的别墅 — 宁静海岸</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">家庭客群、海滨步道、低风险。</p>
              </Link>
              <Link href="/zh/lianxi" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">联系我们</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Telegram、邮箱、合作伙伴联系方式。</p>
              </Link>
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
