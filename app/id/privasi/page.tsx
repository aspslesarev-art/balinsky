import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = 'May 15, 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Privacy Policy | Balinsky',
  description: 'How Balinsky processes personal data: what we collect, why, how long we keep it, who the third parties are, and how to request deletion.',
  alternates: {
    canonical: '/id/privasi',
    languages: {
      ru: `${SITE_URL}/ru/politika-konfidencialnosti`,
      en: `${SITE_URL}/id/privasi`,
      'x-default': `${SITE_URL}/ru/politika-konfidencialnosti`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="id" title="Privacy Policy" updated={`Last updated: ${UPDATED}`} breadcrumbLabel="Privacy Policy">
      <p>
        This policy explains what personal data the site <a href="/id">Balinsky.info</a> collects, why,
        how it is stored, who it is shared with, and what rights you have as a user.
      </p>

      <h2>1. Site operator</h2>
      <p>
        Balinsky.info is operated by Andrei Slesarev (sole proprietor, Georgia). For data-protection
        enquiries: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>,
        Telegram <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>.
      </p>

      <h2>2. What we collect</h2>
      <h3>2.1. Data you provide</h3>
      <ul>
        <li>Name, phone and email when you submit a reservation enquiry or request a callback.</li>
        <li>Messages sent to the @BalinskyBot Telegram bot and to our agents in direct chats.</li>
        <li>Your favourites list, stored locally in your browser only — never uploaded to our servers.</li>
      </ul>
      <h3>2.2. Data collected automatically</h3>
      <ul>
        <li>IP address, browser and device type, operating system, screen resolution.</li>
        <li>URLs visited, referrer, session duration, on-page interactions (Google Analytics 4, Yandex.Metrica).</li>
        <li>Cookies — see the <a href="/id/cookie">Cookie Policy</a> for details.</li>
      </ul>

      <h2>3. Why we process it</h2>
      <ul>
        <li>To contact you about specific property enquiries.</li>
        <li>To understand which parts of the site work and to improve the catalogue.</li>
        <li>To send informational messages through the Telegram bot if you opted in.</li>
        <li>Security — detecting bots, spam, and intrusion attempts.</li>
      </ul>

      <h2>4. Third parties</h2>
      <p>The site relies on the following providers:</p>
      <ul>
        <li><strong>Vercel</strong> — hosting and CDN (US / EU).</li>
        <li><strong>Supabase</strong> — database and media storage (EU).</li>
        <li><strong>Google Analytics 4</strong> and <strong>Google Tag Manager</strong> — analytics.</li>
        <li><strong>Yandex.Metrica</strong> — analytics and behavioural signals for Yandex Search.</li>
        <li><strong>Telegram</strong> — message routing through @BalinskyBot.</li>
        <li><strong>OpenAI / Azure OpenAI</strong> — powering the Balina AI assistant. If you message the assistant, your message and surrounding context are sent to the provider&apos;s API.</li>
      </ul>

      <h2>5. Retention</h2>
      <p>
        Enquiries and conversations are kept only as long as needed to handle your request and continue serving you afterwards.
        Technical logs and analytics — up to 14 months. We will delete personal data sooner on request.
      </p>

      <h2>6. Your rights</h2>
      <ul>
        <li>Receive a copy of the personal data we hold about you.</li>
        <li>Request a correction of inaccurate data.</li>
        <li>Request deletion of your data (unless we have a competing legal obligation to retain it).</li>
        <li>Withdraw consent for marketing communications.</li>
        <li>File a complaint with the data-protection authority in your country of residence.</li>
      </ul>
      <p>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We respond within 30 days.</p>

      <h2>7. Security</h2>
      <p>
        Access to the back office is restricted. The connection is HTTPS-encrypted. We do not accept or store payment data —
        all payments go directly to the property operator&apos;s bank account.
      </p>

      <h2>8. Changes</h2>
      <p>
        We update this policy as our data-handling practices change. The current version is always visible on this page;
        the date at the top reflects the most recent change.
      </p>

      {/* TODO: legal review once the entity status is final. Sole-proprietor Georgia is the current footer block. */}
    </LegalLayout>
  )
}
