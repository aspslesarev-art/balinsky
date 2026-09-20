import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'
import { hreflangMap } from '@/lib/hreflang'

const UPDATED = '20 september 2026'

export const metadata: Metadata = {
  title: 'Gebruiksvoorwaarden | Balinsky',
  description: 'Gebruiksvoorwaarden voor de catalogus Balinsky.info: wat we wel en niet zijn, de grenzen van de content, verantwoordelijkheden van koper en aanbieder.',
  alternates: {
    canonical: '/nl/voorwaarden',
    languages: hreflangMap('/ru/usloviya'),
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="nl" title="Gebruiksvoorwaarden" updated={`Laatst bijgewerkt: ${UPDATED}`} breadcrumbLabel="Gebruiksvoorwaarden">
      <p>
        Door Balinsky.info te gebruiken ga je akkoord met de onderstaande voorwaarden. Als iets hier niet voor je werkt, gebruik de site dan niet.
      </p>

      <h2>1. Wat Balinsky.info is</h2>
      <p>
        Balinsky.info is een aggregatorcatalogus van vastgoedaanbiedingen op Bali (villa&apos;s, appartementen, wooncomplexen,
        langetermijnverhuur), informatie over ontwikkelaars, nieuws, aanbiedingen en educatief materiaal. De site is gemaakt voor buitenlandse kopers.
      </p>
      <p>
        We zijn geen partij bij enige koop-verkooptransactie. We tonen informatie over beschikbare objecten en brengen kopers in contact
        met de aanbieder van elk object (ontwikkelaar, agentschap of eigenaar). De deal wordt rechtstreeks tussen koper en aanbieder gesloten.
      </p>

      <h2>2. Wat Balinsky.info niet is</h2>
      <p>
        Wij zijn geen makelaar, geen tussenpersoon en geen bemiddelaar. Concreet: wij verkopen geen objecten en treden
        niet op als verkoper; wij vertegenwoordigen koper noch verkoper bij onderhandelingen; wij stellen geen
        contracten op, ondertekenen of certificeren ze niet; wij ontvangen of beheren geen waarborgsommen,
        aanbetalingen of andere betalingen; wij nemen geen commissie van kopers; wij organiseren geen bezichtigingen,
        reizen of inspecties; en wij verlenen geen juridische, notariële, fiscale of visumdiensten.
      </p>
      <p>
        Dat alles doen de partijen zelf en de gediplomeerde professionals die zij inschakelen — de ontwikkelaar of
        eigenaar, een PPAT-notaris, een jurist, een belastingadviseur. De contactgegevens van de exploitant van elk
        object staan op de pagina van dat object; correspondentie en onderhandeling lopen rechtstreeks met hem, buiten
        Balinsky om.
      </p>

      <h2>3. Juistheid</h2>
      <p>
        We doen ons best om de catalogus actueel te houden, maar prijzen, beschikbaarheid, vergunningen (PBG, SLF) en voorwaarden kunnen veranderen.
        Verifieer de gegevens vóór het sluiten van een deal rechtstreeks bij de aanbieder en via de officiële registers van Indonesië.
      </p>
      <p>
        Elke video en foto is op een specifieke datum gemaakt — we zijn niet verantwoordelijk voor wijzigingen na die opname.
      </p>

      <h2>4. Gebruikerscontent</h2>
      <p>
        Wanneer je via Telegram, onze bot, een formulier of e-mail contact met ons opneemt, verstrek je tekst en contactgegevens en bevestig je dat je het
        recht hebt om ze te delen. Hoe die gegevens worden gebruikt: zie ons <a href="/nl/privacy">Privacybeleid</a>.
      </p>
      <p>
        Het is verboden de site te gebruiken voor spam, geautomatiseerde scraping, pogingen om beveiligingen te omzeilen, load-aanvallen of reverse-engineering van interne API&apos;s.
      </p>

      <h2>5. Intellectueel eigendom</h2>
      <p>
        Teksten, schema&apos;s en redactioneel materiaal op de site (tenzij anders aangegeven) vallen onder de licentie
        Creative Commons Attribution 4.0 International — vermeld de auteur en link naar het origineel bij hergebruik.
      </p>
      <p>
        Foto&apos;s en video&apos;s van afzonderlijke objecten kunnen toebehoren aan ontwikkelaars of derden — vraag een aparte licentie aan voor commercieel hergebruik.
      </p>

      <h2>6. Andrei AI-assistent</h2>
      <p>
        Andrei is een experimentele AI-assistent op de site. De antwoorden zijn informatief en vervangen geen advies van een erkende agent,
        advocaat of notaris. Andrei kan fouten maken — bevestig alles wat een deal beïnvloedt bij de juiste specialist voordat je ernaar handelt.
      </p>

      <h2>7. Externe links</h2>
      <p>
        De site verwijst naar bronnen van derden (YouTube, Telegram, estatemarket.io, sites van ontwikkelaars). We hebben geen controle over hun content
        en zijn niet verantwoordelijk voor hun beschikbaarheid of beleid.
      </p>

      <h2>8. Aansprakelijkheid</h2>
      <p>
        De site wordt aangeboden &ldquo;as is&rdquo;. We garanderen geen ononderbroken beschikbaarheid, afwezigheid van technische problemen of dat de aanbiedingen
        bij jouw specifieke investeringsdoelen passen. Beslissingen zijn op eigen risico van de koper.
      </p>

      <h2>9. Wijzigingen</h2>
      <p>
        Deze voorwaarden kunnen veranderen. De actuele versie staat altijd op deze pagina. Belangrijke updates worden aangekondigd in het
        <a href="https://t.me/itrealtor" target="_blank" rel="noopener"> Telegram-kanaal @itrealtor</a>.
      </p>

      <h2>10. Toepasselijk recht en jurisdictie</h2>
      <p>
        Geschillen worden beheerst door het recht van Georgië, tenzij dwingende regels van je land van verblijf
        anders bepalen.
      </p>

      {/* TODO: confirm jurisdiction / arbitration wording with counsel. Default is Georgia. */}
    </LegalLayout>
  )
}
