import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '2026年5月15日'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: '隐私政策 | Balinsky',
  description: 'Balinsky 如何处理个人数据：我们收集什么、为何收集、保存多久、第三方是谁，以及如何申请删除。',
  alternates: {
    canonical: '/zh/yinsi',
    languages: {
      ru: `${SITE_URL}/ru/politika-konfidencialnosti`,
      en: `${SITE_URL}/en/privacy`,
      zh: `${SITE_URL}/zh/yinsi`,
      'x-default': `${SITE_URL}/ru/politika-konfidencialnosti`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="zh" title="隐私政策" updated={`最后更新：${UPDATED}`} breadcrumbLabel="隐私政策">
      <p>
        本政策说明 <a href="/zh">Balinsky.info</a> 网站收集哪些个人数据、为何收集、
        如何存储、与谁共享，以及您作为用户享有哪些权利。
      </p>

      <h2>1. 网站运营方</h2>
      <p>
        Balinsky.info 由 Andrei Slesarev（个体经营者，格鲁吉亚）运营。数据保护相关
        咨询请联系：<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>，
        Telegram <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>。
      </p>

      <h2>2. 我们收集哪些数据</h2>
      <h3>2.1. 您主动提供的数据</h3>
      <ul>
        <li>当您提交预订咨询或申请回电时提供的姓名、电话和电子邮箱。</li>
        <li>发送给 @BalinskyBot Telegram 机器人以及在私聊中发送给我们经纪人的消息。</li>
        <li>您的收藏列表，仅存储在您的浏览器本地 — 绝不会上传至我们的服务器。</li>
      </ul>
      <h3>2.2. 自动收集的数据</h3>
      <ul>
        <li>IP 地址、浏览器和设备类型、操作系统、屏幕分辨率。</li>
        <li>访问的网址、来源页、会话时长、页面内交互（Google Analytics 4、Yandex.Metrica）。</li>
        <li>Cookie — 详情请见 <a href="/zh/cookie">Cookie 政策</a>。</li>
      </ul>

      <h2>3. 我们为何处理这些数据</h2>
      <ul>
        <li>就具体房产咨询与您取得联系。</li>
        <li>了解网站哪些部分运行正常，并改进目录。</li>
        <li>在您选择接收的情况下，通过 Telegram 机器人发送信息类消息。</li>
        <li>安全 — 检测机器人、垃圾信息和入侵尝试。</li>
      </ul>

      <h2>4. 第三方</h2>
      <p>本网站依赖以下服务提供商：</p>
      <ul>
        <li><strong>Vercel</strong> — 托管与 CDN（美国 / 欧盟）。</li>
        <li><strong>Supabase</strong> — 数据库与媒体存储（欧盟）。</li>
        <li><strong>Google Analytics 4</strong> 和 <strong>Google Tag Manager</strong> — 分析统计。</li>
        <li><strong>Yandex.Metrica</strong> — 面向 Yandex 搜索的分析与行为信号。</li>
        <li><strong>Telegram</strong> — 通过 @BalinskyBot 转发消息。</li>
        <li><strong>OpenAI / Azure OpenAI</strong> — 为 Balisa AI 助手提供支持。若您向助手发送消息，您的消息及相关上下文会被发送至该服务商的 API。</li>
      </ul>

      <h2>5. 保存期限</h2>
      <p>
        咨询和对话仅保存到处理您的请求以及后续继续为您服务所需的时长为止。
        技术日志和分析数据 — 最长 14 个月。应您的请求，我们会更早删除个人数据。
      </p>

      <h2>6. 您的权利</h2>
      <ul>
        <li>获取我们所持有的您的个人数据副本。</li>
        <li>要求更正不准确的数据。</li>
        <li>要求删除您的数据（除非我们有相冲突的法律义务须予保留）。</li>
        <li>撤回对营销通讯的同意。</li>
        <li>向您居住国的数据保护主管机构投诉。</li>
      </ul>
      <p>请发送邮件至 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>。我们会在 30 天内回复。</p>

      <h2>7. 安全</h2>
      <p>
        后台访问受到限制。连接采用 HTTPS 加密。我们不接受也不存储任何支付数据 —
        所有付款均直接汇入房产运营方的银行账户。
      </p>

      <h2>8. 变更</h2>
      <p>
        随着我们数据处理方式的变化，我们会更新本政策。当前版本始终显示在本页面；
        页首日期反映最近一次变更的时间。
      </p>

      {/* TODO: legal review once the entity status is final. Sole-proprietor Georgia is the current footer block. */}
    </LegalLayout>
  )
}
