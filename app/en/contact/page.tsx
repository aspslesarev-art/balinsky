import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'
import { hreflangMap } from '@/lib/hreflang'

const UPDATED = 'May 15, 2026'
const CONTACT_EMAIL = 'i@balinsky.info'

export const metadata: Metadata = {
  title: 'Contact | Balinsky',
  description: 'How to reach Balinsky: Telegram bot, Telegram channel, email, YouTube. Partnership contacts for developers and agencies.',
  alternates: {
    canonical: '/en/contact',
    languages: hreflangMap('/ru/kontakty'),
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="en" title="Contact" updated={`Information current as of: ${UPDATED}`} breadcrumbLabel="Contact">
      <p>
        Balinsky.info is an information catalogue. The contacts below are for questions about the site itself: the data on a listing, an error you spotted, publishing a project. About a specific property, write to the developer directly — their Telegram and WhatsApp are on that property&apos;s page.
      </p>

      <h2>Questions about the site and its data</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram bot</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Questions about the catalogue and the data on a listing. If the question is about price, timing or a hold, it belongs with the developer, not with us.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Mail size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Email</strong> — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">For written enquiries with attachments or data-protection requests.</div>
          </div>
        </li>
      </ul>

      <h2>Market updates</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MessageCircle size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram channel</strong> — <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">New listings, promotions, Bali market reviews, investment cases.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Play size={20} className="text-[#FF0000] mt-0.5 shrink-0" fill="currentColor" />
          <div>
            <strong>YouTube</strong> — <a href="https://www.youtube.com/@balinsky_info" target="_blank" rel="noopener">@balinsky_info</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">On-the-ground property walkthroughs, developer interviews, market analysis.</div>
          </div>
        </li>
      </ul>

      <h2>Partnerships</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Developers</strong> — add your project to the catalogue, send documents, floor plans or site footage:
            email <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partnership (developer)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Real-estate agencies</strong> — publish information about the projects you represent:
            email <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partnership (agency)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>The role of the site</h2>
      <p>
        Balinsky.info publishes information about properties and is not a party to any transaction. We are not a real-estate agency: we do not sell properties, do not negotiate, take no commission and accept no payments. For formal enquiries, use the email above.
      </p>

      <h2>Response time</h2>
      <p>
        We answer questions about the site during business hours (10:00–20:00 WITA, UTC+8), usually within a day.
        How fast a developer replies is not up to us — the figure on a listing page is there for reference only.
      </p>

      <h2>Related documents</h2>
      <ul>
        <li><Link href="/en/privacy">Privacy Policy</Link></li>
        <li><Link href="/en/terms">Terms of Use</Link></li>
        <li><Link href="/en/about">About Balinsky</Link></li>
      </ul>
    </LegalLayout>
  )
}
