import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'
import { hreflangMap } from '@/lib/hreflang'

const UPDATED = '2026年5月15日'
const CONTACT_EMAIL = 'i@balinsky.info'

export const metadata: Metadata = {
  title: '联系方式 | Balinsky',
  description: '如何联系 Balinsky：Telegram 机器人、Telegram 频道、电子邮件、YouTube。面向开发商与中介机构的合作联系方式。',
  alternates: {
    canonical: '/zh/lianxi',
    languages: hreflangMap('/ru/kontakty'),
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="zh" title="联系方式" updated={`信息更新于：${UPDATED}`} breadcrumbLabel="联系方式">
      <p>
        Balinsky.info 是信息目录。以下联系方式用于与网站本身相关的问题：房源数据、发现的错误、项目刊登。关于具体房产，请直接联系开发商——其 Telegram 和 WhatsApp 就在该房源页面上。
      </p>

      <h2>关于网站与数据的问题</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram 机器人</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">关于目录和房源数据的问题。若问题涉及价格、工期或预订，请直接询问开发商，而非我们。</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Mail size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>电子邮件</strong> — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">用于带附件的书面咨询或数据保护请求。</div>
          </div>
        </li>
      </ul>

      <h2>市场动态</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MessageCircle size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram 频道</strong> — <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">新房源、优惠活动、巴厘岛市场分析、投资案例。</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Play size={20} className="text-[#FF0000] mt-0.5 shrink-0" fill="currentColor" />
          <div>
            <strong>YouTube</strong> — <a href="https://www.youtube.com/@balinsky_info" target="_blank" rel="noopener">@balinsky_info</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">实地房产看房、开发商访谈、市场分析。</div>
          </div>
        </li>
      </ul>

      <h2>合作</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>开发商</strong> — 将您的项目加入目录，提供文件、户型图或现场影像：
            请发送邮件至 <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partnership (developer)')}`}>{CONTACT_EMAIL}</a>。
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>房地产中介机构</strong> — 发布您所代理项目的信息：
            请发送邮件至 <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partnership (agency)')}`}>{CONTACT_EMAIL}</a>。
          </div>
        </li>
      </ul>

      <h2>本站的角色</h2>
      <p>
        Balinsky.info 发布房产信息，并非任何交易的当事方。我们不是房地产中介：不销售房产、不参与谈判、不收取佣金，也不接收款项。正式咨询请使用上方邮箱。
      </p>

      <h2>响应时间</h2>
      <p>
        关于网站的问题，我们在工作时间（10:00–20:00 WITA，UTC+8）内答复，通常一天之内。
        开发商回复的快慢不由我们决定——房源页面上的时间仅供参考。
      </p>

      <h2>相关文件</h2>
      <ul>
        <li><Link href="/zh/yinsi">隐私政策</Link></li>
        <li><Link href="/zh/tiaokuan">使用条款</Link></li>
        <li><Link href="/zh/guanyu">关于 Balinsky</Link></li>
      </ul>
    </LegalLayout>
  )
}
