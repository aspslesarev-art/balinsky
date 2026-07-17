import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = 'May 15, 2026'

export const metadata: Metadata = {
  title: 'Cookie Policy | Balinsky',
  description: 'Which cookies Balinsky.info uses: strictly necessary, analytics, marketing — and how to turn them off.',
  alternates: {
    canonical: '/de/cookie',
    languages: {
      ru: `${SITE_URL}/ru/cookie`,
      en: `${SITE_URL}/de/cookie`,
      'x-default': `${SITE_URL}/ru/cookie`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="de" title="Cookie Policy" updated={`Last updated: ${UPDATED}`} breadcrumbLabel="Cookie Policy">
      <p>
        Cookies are small text files the site stores in your browser. They keep your preferences sticky and help us understand
        how the catalogue is used.
      </p>

      <h2>1. Cookie categories we use</h2>
      <h3>Strictly necessary (site won&apos;t work without them)</h3>
      <ul>
        <li>Session support — remembers your chosen language (RU or EN).</li>
        <li>Form protection (CSRF tokens).</li>
        <li>Local storage of your favourites list — not a cookie in the strict sense, but technical.</li>
      </ul>
      <h3>Analytics (help us improve the site)</h3>
      <ul>
        <li><strong>Google Analytics 4</strong> via Google Tag Manager (container GTM-TM6D54Z3) — anonymised page-view and event statistics.</li>
        <li><strong>Yandex.Metrica</strong> (counter 104881153) — behavioural analytics, heatmaps, session replays.</li>
      </ul>
      <h3>Marketing</h3>
      <p>
        We currently do not set advertising cookies. If we run retargeting on Google or Yandex in the future, the relevant cookies will be added
        and this page will be updated.
      </p>

      <h2>2. How to disable cookies</h2>
      <p>
        Analytics and marketing cookies can be turned off in your browser settings. Strictly necessary cookies can&apos;t be disabled —
        the favourites list and language switcher need them.
      </p>
      <ul>
        <li>Chrome — <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Settings → Privacy and security → Cookies</a></li>
        <li>Safari — <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener">Preferences → Privacy</a></li>
        <li>Firefox — <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener">Options → Privacy &amp; Security</a></li>
      </ul>
      <p>You can also install uBlock Origin, Privacy Badger, or enable Do Not Track.</p>

      <h2>3. Related documents</h2>
      <ul>
        <li><a href="/de/datenschutz">Privacy Policy</a></li>
        <li><a href="/de/agb">Terms of Use</a></li>
      </ul>

      {/* TODO: when retargeting is enabled, add a Marketing section listing campaign IDs and cookie identifiers. */}
    </LegalLayout>
  )
}
