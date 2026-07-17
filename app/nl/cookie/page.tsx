import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 mei 2026'

export const metadata: Metadata = {
  title: 'Cookiebeleid | Balinsky',
  description: 'Welke cookies Balinsky.info gebruikt: strikt noodzakelijk, analytics, marketing — en hoe je ze uitschakelt.',
  alternates: {
    canonical: '/nl/cookie',
    languages: {
      ru: `${SITE_URL}/ru/cookie`,
      en: `${SITE_URL}/en/cookie`,
      nl: `${SITE_URL}/nl/cookie`,
      'x-default': `${SITE_URL}/ru/cookie`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="nl" title="Cookiebeleid" updated={`Laatst bijgewerkt: ${UPDATED}`} breadcrumbLabel="Cookiebeleid">
      <p>
        Cookies zijn kleine tekstbestanden die de site in je browser opslaat. Ze zorgen dat je voorkeuren behouden blijven en helpen ons begrijpen
        hoe de catalogus wordt gebruikt.
      </p>

      <h2>1. Cookiecategorieën die we gebruiken</h2>
      <h3>Strikt noodzakelijk (de site werkt niet zonder deze)</h3>
      <ul>
        <li>Sessie-ondersteuning — onthoudt je gekozen taal (RU of EN).</li>
        <li>Formulierbeveiliging (CSRF-tokens).</li>
        <li>Lokale opslag van je favorietenlijst — geen cookie in strikte zin, maar technisch.</li>
      </ul>
      <h3>Analytics (helpen ons de site te verbeteren)</h3>
      <ul>
        <li><strong>Google Analytics 4</strong> via Google Tag Manager (container GTM-TM6D54Z3) — geanonimiseerde statistieken over paginaweergaven en events.</li>
        <li><strong>Yandex.Metrica</strong> (teller 104881153) — gedragsanalyse, heatmaps, sessieopnames.</li>
      </ul>
      <h3>Marketing</h3>
      <p>
        We plaatsen momenteel geen advertentiecookies. Als we in de toekomst retargeting op Google of Yandex inzetten, worden de betreffende cookies toegevoegd
        en wordt deze pagina bijgewerkt.
      </p>

      <h2>2. Hoe je cookies uitschakelt</h2>
      <p>
        Analytics- en marketingcookies kun je uitschakelen in je browserinstellingen. Strikt noodzakelijke cookies kunnen niet worden uitgeschakeld —
        de favorietenlijst en de taalwisselaar hebben ze nodig.
      </p>
      <ul>
        <li>Chrome — <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Instellingen → Privacy en beveiliging → Cookies</a></li>
        <li>Safari — <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener">Voorkeuren → Privacy</a></li>
        <li>Firefox — <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener">Opties → Privacy &amp; beveiliging</a></li>
      </ul>
      <p>Je kunt ook uBlock Origin of Privacy Badger installeren, of Do Not Track inschakelen.</p>

      <h2>3. Gerelateerde documenten</h2>
      <ul>
        <li><a href="/nl/privacy">Privacybeleid</a></li>
        <li><a href="/nl/voorwaarden">Gebruiksvoorwaarden</a></li>
      </ul>

      {/* TODO: when retargeting is enabled, add a Marketing section listing campaign IDs and cookie identifiers. */}
    </LegalLayout>
  )
}
