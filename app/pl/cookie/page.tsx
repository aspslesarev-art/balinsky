import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 maja 2026'

export const metadata: Metadata = {
  title: 'Polityka plików cookie | Balinsky',
  description: 'Jakie pliki cookie wykorzystuje Balinsky.info: ściśle niezbędne, analityczne, marketingowe — oraz jak je wyłączyć.',
  alternates: {
    canonical: '/pl/cookie',
    languages: {
      ru: `${SITE_URL}/ru/cookie`,
      pl: `${SITE_URL}/pl/cookie`,
      'x-default': `${SITE_URL}/ru/cookie`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="pl" title="Polityka plików cookie" updated={`Ostatnia aktualizacja: ${UPDATED}`} breadcrumbLabel="Polityka plików cookie">
      <p>
        Pliki cookie to niewielkie pliki tekstowe, które witryna zapisuje w Twojej przeglądarce. Utrwalają one Twoje preferencje i pomagają nam
        zrozumieć, w jaki sposób korzystasz z katalogu.
      </p>

      <h2>1. Kategorie plików cookie, których używamy</h2>
      <h3>Ściśle niezbędne (bez nich witryna nie działa)</h3>
      <ul>
        <li>Obsługa sesji — zapamiętuje wybrany przez Ciebie język (RU lub EN).</li>
        <li>Ochrona formularzy (tokeny CSRF).</li>
        <li>Lokalne przechowywanie listy ulubionych — w ścisłym sensie nie jest to plik cookie, lecz element techniczny.</li>
      </ul>
      <h3>Analityczne (pomagają nam ulepszać witrynę)</h3>
      <ul>
        <li><strong>Google Analytics 4</strong> za pośrednictwem Google Tag Manager (kontener GTM-TM6D54Z3) — zanonimizowane statystyki odsłon i zdarzeń.</li>
        <li><strong>Yandex.Metrica</strong> (licznik 104881153) — analityka behawioralna, mapy ciepła, nagrania sesji.</li>
      </ul>
      <h3>Marketingowe</h3>
      <p>
        Obecnie nie stosujemy reklamowych plików cookie. Jeśli w przyszłości uruchomimy retargeting w Google lub Yandex, odpowiednie pliki cookie zostaną dodane,
        a ta strona zaktualizowana.
      </p>

      <h2>2. Jak wyłączyć pliki cookie</h2>
      <p>
        Analityczne i marketingowe pliki cookie można wyłączyć w ustawieniach przeglądarki. Ściśle niezbędnych plików cookie nie da się wyłączyć —
        są potrzebne liście ulubionych i przełącznikowi języka.
      </p>
      <ul>
        <li>Chrome — <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Ustawienia → Prywatność i bezpieczeństwo → Pliki cookie</a></li>
        <li>Safari — <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener">Preferencje → Prywatność</a></li>
        <li>Firefox — <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener">Opcje → Prywatność i bezpieczeństwo</a></li>
      </ul>
      <p>Możesz też zainstalować uBlock Origin, Privacy Badger lub włączyć Do Not Track.</p>

      <h2>3. Powiązane dokumenty</h2>
      <ul>
        <li><a href="/pl/prywatnosc">Polityka prywatności</a></li>
        <li><a href="/pl/regulamin">Regulamin</a></li>
      </ul>

      {/* TODO: when retargeting is enabled, add a Marketing section listing campaign IDs and cookie identifiers. */}
    </LegalLayout>
  )
}
