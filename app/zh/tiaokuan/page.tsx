import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '2026年5月15日'

export const metadata: Metadata = {
  title: '使用条款 | Balinsky',
  description: 'Balinsky.info 目录使用条款：我们是什么（以及不是什么）、内容边界、买方与运营方的责任。',
  alternates: {
    canonical: '/zh/tiaokuan',
    languages: {
      ru: `${SITE_URL}/ru/usloviya`,
      en: `${SITE_URL}/en/terms`,
      zh: `${SITE_URL}/zh/tiaokuan`,
      'x-default': `${SITE_URL}/ru/usloviya`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="zh" title="使用条款" updated={`最后更新：${UPDATED}`} breadcrumbLabel="使用条款">
      <p>
        使用 Balinsky.info 即表示您同意以下条款。如果其中某些内容不适合您，请勿使用本网站。
      </p>

      <h2>1. Balinsky.info 是什么</h2>
      <p>
        Balinsky.info 是一个巴厘岛房产房源的聚合目录（别墅、公寓、住宅综合体、
        长租），以及开发商信息、新闻、优惠和知识资料。本网站专为境外买家打造。
      </p>
      <p>
        我们不是任何买卖交易的当事方。我们展示可售房源的信息，并将买家与各房源的运营方
        （开发商、中介或业主）建立联系。交易直接在买家与运营方之间达成。
      </p>

      <h2>2. 准确性</h2>
      <p>
        我们努力保持目录的时效性，但价格、可售情况、许可证（PBG、SLF）和条款可能会发生变化。
        在成交前，请直接向运营方并通过印度尼西亚官方登记机构核实相关数据。
      </p>
      <p>
        每段视频和照片均在特定日期拍摄 — 我们不对拍摄后发生的变化负责。
      </p>

      <h2>3. 用户内容</h2>
      <p>
        当您通过 Telegram、我们的机器人、表单或电子邮件与我们联系时，您提交文字和联系信息，并确认您有权
        分享这些内容。这些数据的使用方式：请参阅我们的 <a href="/zh/yinsi">隐私政策</a>。
      </p>
      <p>
        禁止将本网站用于垃圾信息、自动抓取、试图绕过防护、负载攻击，或对内部 API 进行逆向工程。
      </p>

      <h2>4. 知识产权</h2>
      <p>
        网站上的文字、图示和编辑资料（除非另有标注）依据
        知识共享署名 4.0 国际许可协议（Creative Commons Attribution 4.0 International）授权 — 重新使用时请注明作者并链接至原文。
      </p>
      <p>
        个别房产的照片和视频可能归开发商或第三方所有 — 用于商业再利用请单独申请许可。
      </p>

      <h2>5. Balisa AI 助手</h2>
      <p>
        Balisa 是本网站上的一款实验性 AI 助手。其回答仅供参考，不能替代与持牌经纪人、
        律师或公证人的咨询。Balisa 可能会出错 — 任何影响交易的内容，在采取行动前请向相应的专业人士确认。
      </p>

      <h2>6. 外部链接</h2>
      <p>
        本网站链接至第三方资源（YouTube、Telegram、estatemarket.io、开发商网站）。我们不控制其内容，
        也不对其可用性或政策负责。
      </p>

      <h2>7. 责任</h2>
      <p>
        本网站按&ldquo;现状&rdquo;提供。我们不保证不间断的可用性、不存在技术问题，也不保证房源
        符合您特定的投资目标。决策由买家自行承担风险。
      </p>

      <h2>8. 变更</h2>
      <p>
        本条款可能会变更。当前版本始终发布在本页面。重大更新会在
        <a href="https://t.me/itrealtor" target="_blank" rel="noopener"> @itrealtor Telegram 频道</a>中公布。
      </p>

      <h2>9. 适用法律与管辖</h2>
      <p>
        争议受格鲁吉亚（运营方注册国）法律管辖，除非您居住国的强制性规定另有规定。
      </p>

      {/* TODO: confirm jurisdiction / arbitration wording with counsel. Default is Georgia (sole-proprietor country). */}
    </LegalLayout>
  )
}
