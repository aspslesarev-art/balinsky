import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '2026年5月15日'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: '联系方式 | Balinsky',
  description: '如何联系 Balinsky：Telegram 机器人、Telegram 频道、电子邮件、YouTube。面向开发商与中介机构的合作联系方式。',
  alternates: {
    canonical: '/zh/lianxi',
    languages: {
      ru: `${SITE_URL}/ru/kontakty`,
      en: `${SITE_URL}/en/contact`,
      zh: `${SITE_URL}/zh/lianxi`,
      'x-default': `${SITE_URL}/ru/kontakty`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="zh" title="联系方式" updated={`信息更新于：${UPDATED}`} breadcrumbLabel="联系方式">
      <p>
        最快的方式是使用 Telegram 机器人。它会将您的咨询转交给对应房源的负责经理，并在工作时间内一小时内回复。
      </p>

      <h2>面向购房者</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram 机器人</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">针对具体别墅、公寓和综合体的咨询。会转交给运营方的经理。</div>
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
            <strong>开发商</strong> — 将您的项目加入目录、投放付费展示，或开设联合获客渠道：
            请发送邮件至 <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partnership (developer)')}`}>{CONTACT_EMAIL}</a>。
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>房地产中介机构</strong> — 客源互换、推荐计划、白标目录：
            请发送邮件至 <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partnership (agency)')}`}>{CONTACT_EMAIL}</a>。
          </div>
        </li>
      </ul>

      <h2>网站运营方</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            Andrei Slesarev，个体经营者（格鲁吉亚）。
            {/* TODO: add registration number / legal address for formal requests. */}
          </div>
        </li>
      </ul>

      <h2>响应时间</h2>
      <p>
        服务标准 — 工作时间内一小时内回复（10:00–20:00 WITA，UTC+8）。
        夜间收到的咨询将于次日上午处理。
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
