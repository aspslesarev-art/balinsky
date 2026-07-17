import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '2026年5月15日'

export const metadata: Metadata = {
  title: 'Cookie 政策 | Balinsky',
  description: 'Balinsky.info 使用哪些 Cookie：严格必要类、分析类、营销类 — 以及如何将其关闭。',
  alternates: {
    canonical: '/zh/cookie',
    languages: {
      ru: `${SITE_URL}/ru/cookie`,
      en: `${SITE_URL}/en/cookie`,
      zh: `${SITE_URL}/zh/cookie`,
      'x-default': `${SITE_URL}/ru/cookie`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="zh" title="Cookie 政策" updated={`最后更新：${UPDATED}`} breadcrumbLabel="Cookie 政策">
      <p>
        Cookie 是网站存储在您浏览器中的小型文本文件。它们保持您的偏好设置，并帮助我们了解
        目录的使用情况。
      </p>

      <h2>1. 我们使用的 Cookie 类别</h2>
      <h3>严格必要类（没有它们网站将无法运行）</h3>
      <ul>
        <li>会话支持 — 记住您选择的语言（俄语或英语）。</li>
        <li>表单防护（CSRF 令牌）。</li>
        <li>您收藏列表的本地存储 — 严格来说并非 Cookie，但属于技术性存储。</li>
      </ul>
      <h3>分析类（帮助我们改进网站）</h3>
      <ul>
        <li><strong>Google Analytics 4</strong> 通过 Google Tag Manager（容器 GTM-TM6D54Z3）— 匿名化的页面浏览与事件统计。</li>
        <li><strong>Yandex.Metrica</strong>（计数器 104881153）— 行为分析、热力图、会话回放。</li>
      </ul>
      <h3>营销类</h3>
      <p>
        我们目前不设置广告 Cookie。若将来我们在 Google 或 Yandex 上开展再营销，相关 Cookie 将会添加，
        本页面也会更新。
      </p>

      <h2>2. 如何禁用 Cookie</h2>
      <p>
        分析类和营销类 Cookie 可在您的浏览器设置中关闭。严格必要类 Cookie 无法禁用 —
        收藏列表和语言切换器需要它们。
      </p>
      <ul>
        <li>Chrome — <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">设置 → 隐私和安全 → Cookie</a></li>
        <li>Safari — <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener">偏好设置 → 隐私</a></li>
        <li>Firefox — <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener">选项 → 隐私与安全</a></li>
      </ul>
      <p>您也可以安装 uBlock Origin、Privacy Badger，或启用 Do Not Track。</p>

      <h2>3. 相关文件</h2>
      <ul>
        <li><a href="/zh/yinsi">隐私政策</a></li>
        <li><a href="/zh/tiaokuan">使用条款</a></li>
      </ul>

      {/* TODO: when retargeting is enabled, add a Marketing section listing campaign IDs and cookie identifiers. */}
    </LegalLayout>
  )
}
