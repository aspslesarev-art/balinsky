import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 mei 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Privacybeleid | Balinsky',
  description: 'Hoe Balinsky persoonsgegevens verwerkt: wat we verzamelen, waarom, hoe lang we het bewaren, wie de derde partijen zijn en hoe je verwijdering aanvraagt.',
  alternates: {
    canonical: '/nl/privacy',
    languages: {
      ru: `${SITE_URL}/ru/politika-konfidencialnosti`,
      en: `${SITE_URL}/en/privacy`,
      nl: `${SITE_URL}/nl/privacy`,
      'x-default': `${SITE_URL}/ru/politika-konfidencialnosti`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="nl" title="Privacybeleid" updated={`Laatst bijgewerkt: ${UPDATED}`} breadcrumbLabel="Privacybeleid">
      <p>
        Dit beleid legt uit welke persoonsgegevens de site <a href="/nl">Balinsky.info</a> verzamelt, waarom,
        hoe ze worden opgeslagen, met wie ze worden gedeeld en welke rechten je als gebruiker hebt.
      </p>

      <h2>1. Beheerder van de site</h2>
      <p>
        Balinsky.info wordt beheerd door Andrei Slesarev (eenmanszaak, Georgië). Voor vragen over
        gegevensbescherming: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>,
        Telegram <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>.
      </p>

      <h2>2. Wat we verzamelen</h2>
      <h3>2.1. Gegevens die je verstrekt</h3>
      <ul>
        <li>Naam, telefoonnummer en e-mail wanneer je een reserveringsaanvraag indient of om een terugbelverzoek vraagt.</li>
        <li>Berichten die je naar de @BalinskyBot Telegram-bot en naar onze agenten in directe chats stuurt.</li>
        <li>Je favorietenlijst, die alleen lokaal in je browser wordt bewaard — nooit geüpload naar onze servers.</li>
      </ul>
      <h3>2.2. Automatisch verzamelde gegevens</h3>
      <ul>
        <li>IP-adres, browser- en apparaattype, besturingssysteem, schermresolutie.</li>
        <li>Bezochte URL&apos;s, verwijzende pagina, sessieduur, interacties op de pagina (Google Analytics 4, Yandex.Metrica).</li>
        <li>Cookies — zie het <a href="/nl/cookie">Cookiebeleid</a> voor details.</li>
      </ul>

      <h2>3. Waarom we het verwerken</h2>
      <ul>
        <li>Om contact met je op te nemen over specifieke vastgoedaanvragen.</li>
        <li>Om te begrijpen welke delen van de site werken en om de catalogus te verbeteren.</li>
        <li>Om informatieve berichten via de Telegram-bot te sturen als je je hebt aangemeld.</li>
        <li>Beveiliging — het detecteren van bots, spam en inbraakpogingen.</li>
      </ul>

      <h2>4. Derde partijen</h2>
      <p>De site maakt gebruik van de volgende aanbieders:</p>
      <ul>
        <li><strong>Vercel</strong> — hosting en CDN (VS / EU).</li>
        <li><strong>Supabase</strong> — database en media-opslag (EU).</li>
        <li><strong>Google Analytics 4</strong> en <strong>Google Tag Manager</strong> — analytics.</li>
        <li><strong>Yandex.Metrica</strong> — analytics en gedragssignalen voor Yandex Search.</li>
        <li><strong>Telegram</strong> — het routeren van berichten via @BalinskyBot.</li>
        <li><strong>OpenAI / Azure OpenAI</strong> — voor de Andrei AI-assistent. Als je de assistent een bericht stuurt, worden je bericht en de bijbehorende context naar de API van de aanbieder gestuurd.</li>
      </ul>

      <h2>5. Bewaartermijn</h2>
      <p>
        Aanvragen en gesprekken worden alleen bewaard zolang dat nodig is om je verzoek af te handelen en je daarna van dienst te blijven.
        Technische logs en analytics — tot 14 maanden. Op verzoek verwijderen we persoonsgegevens eerder.
      </p>

      <h2>6. Je rechten</h2>
      <ul>
        <li>Een kopie ontvangen van de persoonsgegevens die we over je bewaren.</li>
        <li>Een correctie aanvragen van onjuiste gegevens.</li>
        <li>Verwijdering van je gegevens aanvragen (tenzij we een tegenstrijdige wettelijke verplichting hebben om ze te bewaren).</li>
        <li>Toestemming voor marketingcommunicatie intrekken.</li>
        <li>Een klacht indienen bij de gegevensbeschermingsautoriteit in je land van verblijf.</li>
      </ul>
      <p>E-mail <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We reageren binnen 30 dagen.</p>

      <h2>7. Beveiliging</h2>
      <p>
        De toegang tot de backoffice is beperkt. De verbinding is versleuteld met HTTPS. We accepteren of bewaren geen betaalgegevens —
        alle betalingen gaan rechtstreeks naar de bankrekening van de vastgoedaanbieder.
      </p>

      <h2>8. Wijzigingen</h2>
      <p>
        We werken dit beleid bij naarmate onze omgang met gegevens verandert. De actuele versie is altijd op deze pagina te zien;
        de datum bovenaan geeft de meest recente wijziging weer.
      </p>

      {/* TODO: legal review once the entity status is final. Sole-proprietor Georgia is the current footer block. */}
    </LegalLayout>
  )
}
