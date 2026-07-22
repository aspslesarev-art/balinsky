import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15. Mai 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung | Balinsky',
  description: 'Wie Balinsky personenbezogene Daten verarbeitet: was wir erheben, warum, wie lange wir sie speichern, wer die Dritten sind und wie Sie eine Löschung beantragen.',
  alternates: {
    canonical: '/de/datenschutz',
    languages: {
      ru: `${SITE_URL}/ru/politika-konfidencialnosti`,
      en: `${SITE_URL}/en/privacy`,
      de: `${SITE_URL}/de/datenschutz`,
      'x-default': `${SITE_URL}/ru/politika-konfidencialnosti`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="de" title="Datenschutzerklärung" updated={`Zuletzt aktualisiert: ${UPDATED}`} breadcrumbLabel="Datenschutzerklärung">
      <p>
        Diese Erklärung beschreibt, welche personenbezogenen Daten die Website <a href="/de">Balinsky.info</a> erhebt, warum,
        wie sie gespeichert werden, an wen sie weitergegeben werden und welche Rechte Sie als Nutzer haben.
      </p>

      <h2>1. Betreiber der Website</h2>
      <p>
        Balinsky.info wird von Andrei Slesarev betrieben (Einzelunternehmer, Georgien). Für Anfragen zum Datenschutz:
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>,
        Telegram <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>.
      </p>

      <h2>2. Was wir erheben</h2>
      <h3>2.1. Von Ihnen bereitgestellte Daten</h3>
      <ul>
        <li>Name, Telefonnummer und E-Mail, wenn Sie eine Reservierungsanfrage stellen oder einen Rückruf anfordern.</li>
        <li>Nachrichten an den Telegram-Bot @BalinskyBot und an unsere Makler in Direktchats.</li>
        <li>Ihre Favoritenliste, die nur lokal in Ihrem Browser gespeichert wird — niemals auf unsere Server hochgeladen.</li>
      </ul>
      <h3>2.2. Automatisch erhobene Daten</h3>
      <ul>
        <li>IP-Adresse, Browser- und Gerätetyp, Betriebssystem, Bildschirmauflösung.</li>
        <li>Besuchte URLs, Referrer, Sitzungsdauer, Interaktionen auf der Seite (Google Analytics 4, Yandex.Metrica).</li>
        <li>Cookies — Einzelheiten finden Sie in der <a href="/de/cookie">Cookie-Richtlinie</a>.</li>
      </ul>

      <h2>3. Warum wir sie verarbeiten</h2>
      <ul>
        <li>Um Sie zu konkreten Immobilienanfragen zu kontaktieren.</li>
        <li>Um zu verstehen, welche Teile der Website funktionieren, und den Katalog zu verbessern.</li>
        <li>Um Ihnen informative Nachrichten über den Telegram-Bot zu senden, sofern Sie zugestimmt haben.</li>
        <li>Sicherheit — Erkennung von Bots, Spam und Eindringversuchen.</li>
      </ul>

      <h2>4. Dritte</h2>
      <p>Die Website nutzt die folgenden Anbieter:</p>
      <ul>
        <li><strong>Vercel</strong> — Hosting und CDN (USA / EU).</li>
        <li><strong>Supabase</strong> — Datenbank und Medienspeicher (EU).</li>
        <li><strong>Google Analytics 4</strong> und <strong>Google Tag Manager</strong> — Analyse.</li>
        <li><strong>Yandex.Metrica</strong> — Analyse und Verhaltenssignale für die Yandex-Suche.</li>
        <li><strong>Telegram</strong> — Nachrichtenweiterleitung über @BalinskyBot.</li>
        <li><strong>OpenAI / Azure OpenAI</strong> — betreiben den KI-Assistenten Andrei. Wenn Sie dem Assistenten schreiben, werden Ihre Nachricht und der umgebende Kontext an die API des Anbieters gesendet.</li>
      </ul>

      <h2>5. Speicherdauer</h2>
      <p>
        Anfragen und Konversationen werden nur so lange aufbewahrt, wie es zur Bearbeitung Ihres Anliegens und zur weiteren Betreuung erforderlich ist.
        Technische Protokolle und Analysedaten — bis zu 14 Monate. Auf Anfrage löschen wir personenbezogene Daten früher.
      </p>

      <h2>6. Ihre Rechte</h2>
      <ul>
        <li>Eine Kopie der über Sie gespeicherten personenbezogenen Daten erhalten.</li>
        <li>Die Berichtigung unrichtiger Daten verlangen.</li>
        <li>Die Löschung Ihrer Daten verlangen (sofern keine gesetzliche Aufbewahrungspflicht entgegensteht).</li>
        <li>Die Einwilligung in Marketingkommunikation widerrufen.</li>
        <li>Bei der Datenschutzbehörde Ihres Wohnsitzlandes Beschwerde einlegen.</li>
      </ul>
      <p>E-Mail an <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Wir antworten innerhalb von 30 Tagen.</p>

      <h2>7. Sicherheit</h2>
      <p>
        Der Zugang zum Back-Office ist beschränkt. Die Verbindung ist per HTTPS verschlüsselt. Wir akzeptieren oder speichern keine Zahlungsdaten —
        alle Zahlungen gehen direkt auf das Bankkonto des Immobilienanbieters.
      </p>

      <h2>8. Änderungen</h2>
      <p>
        Wir aktualisieren diese Erklärung, wenn sich unsere Datenverarbeitungspraktiken ändern. Die aktuelle Fassung ist stets auf dieser Seite sichtbar;
        das Datum oben gibt die letzte Änderung wieder.
      </p>

      {/* TODO: legal review once the entity status is final. Sole-proprietor Georgia is the current footer block. */}
    </LegalLayout>
  )
}
