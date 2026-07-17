import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15. Mai 2026'

export const metadata: Metadata = {
  title: 'Cookie-Richtlinie | Balinsky',
  description: 'Welche Cookies Balinsky.info verwendet: unbedingt erforderliche, Analyse-, Marketing-Cookies — und wie Sie sie deaktivieren.',
  alternates: {
    canonical: '/de/cookie',
    languages: {
      ru: `${SITE_URL}/ru/cookie`,
      en: `${SITE_URL}/en/cookie`,
      de: `${SITE_URL}/de/cookie`,
      'x-default': `${SITE_URL}/ru/cookie`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="de" title="Cookie-Richtlinie" updated={`Zuletzt aktualisiert: ${UPDATED}`} breadcrumbLabel="Cookie-Richtlinie">
      <p>
        Cookies sind kleine Textdateien, die die Website in Ihrem Browser speichert. Sie merken sich Ihre Einstellungen und helfen uns zu verstehen,
        wie der Katalog genutzt wird.
      </p>

      <h2>1. Von uns verwendete Cookie-Kategorien</h2>
      <h3>Unbedingt erforderlich (ohne sie funktioniert die Website nicht)</h3>
      <ul>
        <li>Sitzungsunterstützung — merkt sich Ihre gewählte Sprache (RU oder EN).</li>
        <li>Formularschutz (CSRF-Tokens).</li>
        <li>Lokale Speicherung Ihrer Favoritenliste — im engeren Sinne kein Cookie, aber technisch bedingt.</li>
      </ul>
      <h3>Analyse (hilft uns, die Website zu verbessern)</h3>
      <ul>
        <li><strong>Google Analytics 4</strong> über Google Tag Manager (Container GTM-TM6D54Z3) — anonymisierte Seitenaufruf- und Ereignisstatistiken.</li>
        <li><strong>Yandex.Metrica</strong> (Zähler 104881153) — Verhaltensanalyse, Heatmaps, Sitzungsaufzeichnungen.</li>
      </ul>
      <h3>Marketing</h3>
      <p>
        Derzeit setzen wir keine Werbe-Cookies. Sollten wir künftig Retargeting bei Google oder Yandex einsetzen, werden die entsprechenden Cookies hinzugefügt
        und diese Seite aktualisiert.
      </p>

      <h2>2. So deaktivieren Sie Cookies</h2>
      <p>
        Analyse- und Marketing-Cookies können Sie in Ihren Browsereinstellungen deaktivieren. Unbedingt erforderliche Cookies können nicht deaktiviert werden —
        die Favoritenliste und der Sprachumschalter benötigen sie.
      </p>
      <ul>
        <li>Chrome — <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Einstellungen → Datenschutz und Sicherheit → Cookies</a></li>
        <li>Safari — <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener">Einstellungen → Datenschutz</a></li>
        <li>Firefox — <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener">Einstellungen → Datenschutz &amp; Sicherheit</a></li>
      </ul>
      <p>Sie können außerdem uBlock Origin oder Privacy Badger installieren oder Do Not Track aktivieren.</p>

      <h2>3. Verwandte Dokumente</h2>
      <ul>
        <li><a href="/de/datenschutz">Datenschutzerklärung</a></li>
        <li><a href="/de/agb">Nutzungsbedingungen</a></li>
      </ul>

      {/* TODO: when retargeting is enabled, add a Marketing section listing campaign IDs and cookie identifiers. */}
    </LegalLayout>
  )
}
