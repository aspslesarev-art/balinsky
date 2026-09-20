import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'
import { hreflangMap } from '@/lib/hreflang'

const UPDATED = '15 maja 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Kontakt | Balinsky',
  description: 'Jak skontaktować się z Balinsky: bot Telegram, kanał Telegram, e-mail, YouTube. Kontakty partnerskie dla deweloperów i agencji.',
  alternates: {
    canonical: '/pl/kontakt',
    languages: hreflangMap('/ru/kontakty'),
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="pl" title="Kontakt" updated={`Informacje aktualne na dzień: ${UPDATED}`} breadcrumbLabel="Kontakt">
      <p>
        Balinsky.info to katalog informacyjny. Poniższe kontakty służą do pytań o sam serwis: o dane w ofercie, o zauważony błąd, o dodanie projektu. W sprawie konkretnej nieruchomości pisz bezpośrednio do dewelopera — jego Telegram i WhatsApp są przy ofercie.
      </p>

      <h2>Pytania o serwis i dane</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Bot Telegram</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Pytania o katalog i dane oferty. Jeśli pytanie dotyczy ceny, terminów albo rezerwacji, należy je zadać deweloperowi, a nie nam.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Mail size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>E-mail</strong> — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Do zapytań pisemnych z załącznikami lub wniosków dotyczących ochrony danych.</div>
          </div>
        </li>
      </ul>

      <h2>Aktualności rynkowe</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MessageCircle size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Kanał Telegram</strong> — <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Nowe oferty, promocje, przeglądy rynku Bali, studia przypadków inwestycyjnych.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Play size={20} className="text-[#FF0000] mt-0.5 shrink-0" fill="currentColor" />
          <div>
            <strong>YouTube</strong> — <a href="https://www.youtube.com/@balinsky_info" target="_blank" rel="noopener">@balinsky_info</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Spacery po nieruchomościach na miejscu, wywiady z deweloperami, analiza rynku.</div>
          </div>
        </li>
      </ul>

      <h2>Współpraca</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Deweloperzy</strong> — dodaj swój projekt do katalogu, uruchom płatne umieszczenie lub zamów recenzję wideo:
            e-mail <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Współpraca (deweloper)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Agencje nieruchomości</strong> — publikacja informacji o projektach, które reprezentujesz, i reklama w serwisie:
            e-mail <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Współpraca (agencja)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Operator serwisu</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            <strong>Andrei Slesarau</strong>, jednoosobowa działalność gospodarcza, Gruzja.<br />
            Numer rejestrowy 316362404, zarejestrowana 06.01.2022.<br />
            Adres: 19 Shartava St., Rustavi, Gruzja.<br />
            <span className="text-[13px] text-[var(--color-text-muted)]">
              Wszystkie umowy reklamowe i faktury wystawia ten podmiot, zgodnie z prawem gruzińskim.
              Operator serwisu nie świadczy usług na terytorium Indonezji.
            </span>
          </div>
        </li>
      </ul>

      <h2>Czas odpowiedzi</h2>
      <p>
        Na pytania o serwis odpowiadamy w godzinach pracy (10:00–20:00 WITA, UTC+8), zwykle w ciągu doby.
        To, jak szybko odpowie deweloper, nie zależy od nas — wartość przy ofercie ma charakter orientacyjny.
      </p>

      <h2>Powiązane dokumenty</h2>
      <ul>
        <li><Link href="/pl/prywatnosc">Polityka prywatności</Link></li>
        <li><Link href="/pl/regulamin">Regulamin</Link></li>
        <li><Link href="/pl/o-nas">O Balinsky</Link></li>
      </ul>
    </LegalLayout>
  )
}
