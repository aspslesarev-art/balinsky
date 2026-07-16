import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = 'May 15, 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Contact | Balinsky',
  description: 'How to reach Balinsky: Telegram bot, Telegram channel, email, YouTube. Partnership contacts for developers and agencies.',
  alternates: {
    canonical: '/fr/contact',
    languages: {
      ru: `${SITE_URL}/ru/kontakty`,
      en: `${SITE_URL}/fr/contact`,
      'x-default': `${SITE_URL}/ru/kontakty`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="fr" title="Contact" updated={`Information current as of: ${UPDATED}`} breadcrumbLabel="Contact">
      <p>
        Fastest path is the Telegram bot. It routes your enquiry to the manager of the specific unit and responds within an hour during business hours.
      </p>

      <h2>For property buyers</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram bot</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Enquiries about specific villas, apartments and complexes. Routed to the operator&apos;s manager.</div>
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
            <strong>Developers</strong> — add your project to the catalogue, run paid placement, or launch a joint lead channel:
            email <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partnership (developer)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Real-estate agencies</strong> — lead exchange, referral programme, white-label catalogue:
            email <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partnership (agency)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Site operator</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            Andrei Slesarev, sole proprietor (Georgia).
            {/* TODO: add registration number / legal address for formal requests. */}
          </div>
        </li>
      </ul>

      <h2>Response time</h2>
      <p>
        Service standard — reply within one hour during business hours (10:00–20:00 WITA, UTC+8).
        Enquiries received at night are processed the next morning.
      </p>

      <h2>Related documents</h2>
      <ul>
        <li><Link href="/fr/confidentialite">Privacy Policy</Link></li>
        <li><Link href="/fr/conditions">Terms of Use</Link></li>
        <li><Link href="/fr/a-propos">About Balinsky</Link></li>
      </ul>
    </LegalLayout>
  )
}
