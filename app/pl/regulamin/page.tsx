import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 maja 2026'

export const metadata: Metadata = {
  title: 'Regulamin | Balinsky',
  description: 'Regulamin korzystania z katalogu Balinsky.info: czym jesteśmy (a czym nie), granice treści, obowiązki kupującego i operatora.',
  alternates: {
    canonical: '/pl/regulamin',
    languages: {
      ru: `${SITE_URL}/ru/usloviya`,
      pl: `${SITE_URL}/pl/regulamin`,
      'x-default': `${SITE_URL}/ru/usloviya`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="pl" title="Regulamin" updated={`Ostatnia aktualizacja: ${UPDATED}`} breadcrumbLabel="Regulamin">
      <p>
        Korzystając z Balinsky.info, akceptujesz poniższe warunki. Jeśli coś tutaj Ci nie odpowiada, prosimy nie korzystać z witryny.
      </p>

      <h2>1. Czym jest Balinsky.info</h2>
      <p>
        Balinsky.info to katalog-agregator ofert nieruchomości na Bali (wille, apartamenty, kompleksy mieszkaniowe,
        wynajem długoterminowy), informacji o deweloperach, wiadomości, promocji oraz materiałów edukacyjnych. Witryna jest przeznaczona dla zagranicznych kupujących.
      </p>
      <p>
        Nie jesteśmy stroną żadnej transakcji kupna-sprzedaży. Prezentujemy informacje o dostępnych obiektach i łączymy kupujących
        z operatorem każdego obiektu (deweloperem, agencją lub właścicielem). Transakcję zawiera się bezpośrednio między kupującym a operatorem.
      </p>

      <h2>2. Dokładność</h2>
      <p>
        Staramy się utrzymywać katalog aktualnym, jednak ceny, dostępność, pozwolenia (PBG, SLF) i warunki mogą się zmieniać.
        Przed zawarciem transakcji zweryfikuj dane bezpośrednio u operatora oraz w oficjalnych rejestrach Indonezji.
      </p>
      <p>
        Każde wideo i zdjęcie zostało wykonane w określonym dniu — nie odpowiadamy za zmiany po tym momencie.
      </p>

      <h2>3. Treści użytkownika</h2>
      <p>
        Kontaktując się z nami przez Telegram, naszego bota, formularz lub e-mail, przekazujesz tekst i dane kontaktowe oraz potwierdzasz, że masz
        prawo je udostępnić. Jak wykorzystujemy te dane: zobacz naszą <a href="/pl/prywatnosc">Politykę prywatności</a>.
      </p>
      <p>
        Zabrania się wykorzystywania witryny do spamu, automatycznego pobierania danych, prób obejścia zabezpieczeń, ataków obciążeniowych oraz inżynierii wstecznej wewnętrznych API.
      </p>

      <h2>4. Własność intelektualna</h2>
      <p>
        Teksty, schematy i materiały redakcyjne w witrynie (o ile nie zaznaczono inaczej) są licencjonowane na warunkach
        Creative Commons Attribution 4.0 International — przy ponownym wykorzystaniu podaj autora i link do oryginału.
      </p>
      <p>
        Zdjęcia i filmy poszczególnych nieruchomości mogą należeć do deweloperów lub osób trzecich — do komercyjnego wykorzystania poproś o osobną licencję.
      </p>

      <h2>5. Asystent AI Balisa</h2>
      <p>
        Balisa to eksperymentalny asystent AI w witrynie. Jej odpowiedzi mają charakter informacyjny i nie zastępują konsultacji z licencjonowanym agentem,
        prawnikiem lub notariuszem. Balisa może popełniać błędy — wszystko, co wpływa na transakcję, potwierdź u odpowiedniego specjalisty, zanim podejmiesz działanie.
      </p>

      <h2>6. Linki zewnętrzne</h2>
      <p>
        Witryna zawiera odnośniki do zasobów osób trzecich (YouTube, Telegram, estatemarket.io, strony deweloperów). Nie kontrolujemy ich treści
        i nie odpowiadamy za ich dostępność ani polityki.
      </p>

      <h2>7. Odpowiedzialność</h2>
      <p>
        Witryna jest udostępniana &ldquo;w stanie takim, w jakim jest&rdquo;. Nie gwarantujemy nieprzerwanej dostępności, braku problemów technicznych ani tego, że oferty
        odpowiadają Twoim konkretnym celom inwestycyjnym. Decyzje podejmowane są na ryzyko kupującego.
      </p>

      <h2>8. Zmiany</h2>
      <p>
        Niniejszy regulamin może ulec zmianie. Aktualna wersja zawsze znajduje się na tej stronie. O istotnych aktualizacjach informujemy na
        <a href="https://t.me/itrealtor" target="_blank" rel="noopener"> kanale Telegram @itrealtor</a>.
      </p>

      <h2>9. Prawo właściwe i jurysdykcja</h2>
      <p>
        Spory podlegają prawu Gruzji (kraju rejestracji operatora), chyba że bezwzględnie obowiązujące przepisy Twojego kraju zamieszkania
        stanowią inaczej.
      </p>

      {/* TODO: confirm jurisdiction / arbitration wording with counsel. Default is Georgia (sole-proprietor country). */}
    </LegalLayout>
  )
}
