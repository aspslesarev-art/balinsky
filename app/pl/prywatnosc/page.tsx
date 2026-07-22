import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 maja 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Polityka prywatności | Balinsky',
  description: 'Jak Balinsky przetwarza dane osobowe: co zbieramy, w jakim celu, jak długo przechowujemy, kim są podmioty trzecie i jak zażądać usunięcia danych.',
  alternates: {
    canonical: '/pl/prywatnosc',
    languages: {
      ru: `${SITE_URL}/ru/politika-konfidencialnosti`,
      pl: `${SITE_URL}/pl/prywatnosc`,
      'x-default': `${SITE_URL}/ru/politika-konfidencialnosti`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="pl" title="Polityka prywatności" updated={`Ostatnia aktualizacja: ${UPDATED}`} breadcrumbLabel="Polityka prywatności">
      <p>
        Niniejsza polityka wyjaśnia, jakie dane osobowe zbiera serwis <a href="/pl">Balinsky.info</a>, w jakim celu,
        w jaki sposób są przechowywane, komu są udostępniane oraz jakie prawa przysługują Ci jako użytkownikowi.
      </p>

      <h2>1. Operator serwisu</h2>
      <p>
        Serwis Balinsky.info prowadzi Andrei Slesarev (jednoosobowa działalność gospodarcza, Gruzja). W sprawach dotyczących
        ochrony danych: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>,
        Telegram <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>.
      </p>

      <h2>2. Co zbieramy</h2>
      <h3>2.1. Dane podawane przez Ciebie</h3>
      <ul>
        <li>Imię, telefon i e-mail, gdy składasz zapytanie o rezerwację lub prosisz o oddzwonienie.</li>
        <li>Wiadomości wysyłane do bota Telegram @BalinskyBot oraz do naszych agentów w czatach bezpośrednich.</li>
        <li>Twoja lista ulubionych, przechowywana wyłącznie lokalnie w Twojej przeglądarce — nigdy nie jest przesyłana na nasze serwery.</li>
      </ul>
      <h3>2.2. Dane zbierane automatycznie</h3>
      <ul>
        <li>Adres IP, typ przeglądarki i urządzenia, system operacyjny, rozdzielczość ekranu.</li>
        <li>Odwiedzane adresy URL, źródło wejścia, czas trwania sesji, interakcje na stronie (Google Analytics 4, Yandex.Metrica).</li>
        <li>Pliki cookie — szczegóły znajdziesz w <a href="/pl/cookie">Polityce plików cookie</a>.</li>
      </ul>

      <h2>3. W jakim celu przetwarzamy dane</h2>
      <ul>
        <li>Aby skontaktować się z Tobą w sprawie konkretnych zapytań dotyczących nieruchomości.</li>
        <li>Aby zrozumieć, które części serwisu działają, i ulepszać katalog.</li>
        <li>Aby wysyłać wiadomości informacyjne przez bota Telegram, jeśli wyraziłeś na to zgodę.</li>
        <li>Bezpieczeństwo — wykrywanie botów, spamu oraz prób włamań.</li>
      </ul>

      <h2>4. Podmioty trzecie</h2>
      <p>Serwis korzysta z następujących dostawców:</p>
      <ul>
        <li><strong>Vercel</strong> — hosting i CDN (USA / UE).</li>
        <li><strong>Supabase</strong> — baza danych i przechowywanie multimediów (UE).</li>
        <li><strong>Google Analytics 4</strong> oraz <strong>Google Tag Manager</strong> — analityka.</li>
        <li><strong>Yandex.Metrica</strong> — analityka i sygnały behawioralne dla wyszukiwarki Yandex.</li>
        <li><strong>Telegram</strong> — kierowanie wiadomości przez @BalinskyBot.</li>
        <li><strong>OpenAI / Azure OpenAI</strong> — obsługa asystenta AI Andrei. Jeśli napiszesz do asystenta, Twoja wiadomość wraz z otaczającym kontekstem jest przesyłana do API dostawcy.</li>
      </ul>

      <h2>5. Okres przechowywania</h2>
      <p>
        Zapytania i rozmowy przechowujemy tylko tak długo, jak jest to potrzebne do obsługi Twojego zgłoszenia i dalszej obsługi po jego realizacji.
        Techniczne logi i dane analityczne — do 14 miesięcy. Na żądanie usuniemy dane osobowe wcześniej.
      </p>

      <h2>6. Twoje prawa</h2>
      <ul>
        <li>Otrzymanie kopii danych osobowych, które przechowujemy na Twój temat.</li>
        <li>Żądanie sprostowania nieprawidłowych danych.</li>
        <li>Żądanie usunięcia Twoich danych (chyba że mamy nadrzędny obowiązek prawny ich zachowania).</li>
        <li>Wycofanie zgody na komunikację marketingową.</li>
        <li>Złożenie skargi do organu ochrony danych w kraju Twojego zamieszkania.</li>
      </ul>
      <p>E-mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Odpowiadamy w ciągu 30 dni.</p>

      <h2>7. Bezpieczeństwo</h2>
      <p>
        Dostęp do zaplecza jest ograniczony. Połączenie jest szyfrowane protokołem HTTPS. Nie przyjmujemy ani nie przechowujemy danych płatniczych —
        wszystkie płatności trafiają bezpośrednio na rachunek bankowy operatora nieruchomości.
      </p>

      <h2>8. Zmiany</h2>
      <p>
        Aktualizujemy niniejszą politykę wraz ze zmianami naszych praktyk przetwarzania danych. Aktualna wersja jest zawsze widoczna na tej stronie;
        data u góry odzwierciedla najnowszą zmianę.
      </p>

      {/* TODO: legal review once the entity status is final. Sole-proprietor Georgia is the current footer block. */}
    </LegalLayout>
  )
}
