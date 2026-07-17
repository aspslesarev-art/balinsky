import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15. Mai 2026'

export const metadata: Metadata = {
  title: 'Nutzungsbedingungen | Balinsky',
  description: 'Nutzungsbedingungen für den Katalog Balinsky.info: was wir sind (und was nicht), inhaltliche Grenzen, Verantwortlichkeiten von Käufer und Anbieter.',
  alternates: {
    canonical: '/de/agb',
    languages: {
      ru: `${SITE_URL}/ru/usloviya`,
      en: `${SITE_URL}/en/terms`,
      de: `${SITE_URL}/de/agb`,
      'x-default': `${SITE_URL}/ru/usloviya`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="de" title="Nutzungsbedingungen" updated={`Zuletzt aktualisiert: ${UPDATED}`} breadcrumbLabel="Nutzungsbedingungen">
      <p>
        Mit der Nutzung von Balinsky.info stimmen Sie den nachstehenden Bedingungen zu. Wenn etwas davon für Sie nicht passt, nutzen Sie die Website bitte nicht.
      </p>

      <h2>1. Was Balinsky.info ist</h2>
      <p>
        Balinsky.info ist ein Aggregator-Katalog von Immobilienangeboten auf Bali (Villen, Apartments, Wohnkomplexe,
        Langzeitmieten), Informationen zu Bauträgern, Nachrichten, Aktionen und Bildungsmaterial. Die Website richtet sich an ausländische Käufer.
      </p>
      <p>
        Wir sind nicht Vertragspartei eines Kaufgeschäfts. Wir stellen Informationen über verfügbare Objekte bereit und verbinden Käufer
        mit dem Anbieter des jeweiligen Objekts (Bauträger, Agentur oder Eigentümer). Der Abschluss erfolgt direkt zwischen Käufer und Anbieter.
      </p>

      <h2>2. Richtigkeit</h2>
      <p>
        Wir bemühen uns, den Katalog aktuell zu halten, aber Preise, Verfügbarkeit, Genehmigungen (PBG, SLF) und Konditionen können sich ändern.
        Prüfen Sie die Daten vor Vertragsabschluss direkt beim Anbieter und über die offiziellen Register Indonesiens.
      </p>
      <p>
        Jedes Video und Foto wurde an einem bestimmten Datum aufgenommen — für Änderungen nach dieser Aufnahme übernehmen wir keine Verantwortung.
      </p>

      <h2>3. Nutzerinhalte</h2>
      <p>
        Wenn Sie uns über Telegram, unseren Bot, ein Formular oder per E-Mail kontaktieren, übermitteln Sie Text- und Kontaktdaten und bestätigen, dass Sie
        berechtigt sind, diese weiterzugeben. Wie diese Daten verwendet werden: siehe unsere <a href="/de/datenschutz">Datenschutzerklärung</a>.
      </p>
      <p>
        Es ist untersagt, die Website für Spam, automatisiertes Scraping, Versuche zur Umgehung von Schutzmaßnahmen, Lastangriffe oder Reverse Engineering interner APIs zu nutzen.
      </p>

      <h2>4. Geistiges Eigentum</h2>
      <p>
        Texte, Schemata und redaktionelle Materialien auf der Website (sofern nicht anders gekennzeichnet) stehen unter der Lizenz
        Creative Commons Attribution 4.0 International — nennen Sie bei einer Weiterverwendung den Autor und verlinken Sie auf das Original.
      </p>
      <p>
        Fotos und Videos einzelner Objekte können Bauträgern oder Dritten gehören — fordern Sie für eine kommerzielle Weiterverwendung eine gesonderte Lizenz an.
      </p>

      <h2>5. KI-Assistent Balina</h2>
      <p>
        Balina ist ein experimenteller KI-Assistent auf der Website. Ihre Antworten dienen der Information und ersetzen keine Beratung durch einen zugelassenen Makler,
        Anwalt oder Notar. Balina kann Fehler machen — lassen Sie alles, was einen Abschluss betrifft, vor dem Handeln durch den entsprechenden Fachmann bestätigen.
      </p>

      <h2>6. Externe Links</h2>
      <p>
        Die Website verlinkt auf Ressourcen Dritter (YouTube, Telegram, estatemarket.io, Websites von Bauträgern). Wir kontrollieren deren Inhalte nicht
        und sind nicht für deren Verfügbarkeit oder Richtlinien verantwortlich.
      </p>

      <h2>7. Haftung</h2>
      <p>
        Die Website wird &ldquo;wie besehen&rdquo; bereitgestellt. Wir garantieren keine ununterbrochene Verfügbarkeit, keine Freiheit von technischen Problemen und nicht, dass die Angebote
        Ihren konkreten Investitionszielen entsprechen. Entscheidungen erfolgen auf eigenes Risiko des Käufers.
      </p>

      <h2>8. Änderungen</h2>
      <p>
        Diese Bedingungen können sich ändern. Die aktuelle Fassung befindet sich stets auf dieser Seite. Wesentliche Aktualisierungen werden im
        <a href="https://t.me/itrealtor" target="_blank" rel="noopener"> Telegram-Kanal @itrealtor</a> angekündigt.
      </p>

      <h2>9. Anwendbares Recht und Gerichtsstand</h2>
      <p>
        Streitigkeiten unterliegen dem Recht Georgiens (dem Land der Registrierung des Betreibers), sofern nicht zwingende Vorschriften Ihres Wohnsitzlandes
        etwas anderes bestimmen.
      </p>

      {/* TODO: confirm jurisdiction / arbitration wording with counsel. Default is Georgia (sole-proprietor country). */}
    </LegalLayout>
  )
}
