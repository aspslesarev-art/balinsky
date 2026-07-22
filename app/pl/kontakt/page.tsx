import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 maja 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Kontakt | Balinsky',
  description: 'Jak skontaktować się z Balinsky: bot Telegram, kanał Telegram, e-mail, YouTube. Kontakty partnerskie dla deweloperów i agencji.',
  alternates: {
    canonical: '/pl/kontakt',
    languages: {
      ru: `${SITE_URL}/ru/kontakty`,
      pl: `${SITE_URL}/pl/kontakt`,
      'x-default': `${SITE_URL}/ru/kontakty`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="pl" title="Kontakt" updated={`Informacje aktualne na dzień: ${UPDATED}`} breadcrumbLabel="Kontakt">
      <p>
        Najszybsza droga to bot Telegram. Kieruje Twoje zapytanie do menedżera konkretnej nieruchomości i odpowiada w ciągu godziny w godzinach pracy.
      </p>

      <h2>Dla kupujących nieruchomości</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Bot Telegram</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Zapytania o konkretne wille, apartamenty i kompleksy. Kierowane do menedżera operatora.</div>
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
            <strong>Deweloperzy</strong> — dodaj swój projekt do katalogu, uruchom płatne umieszczenie lub wystartuj wspólny kanał pozyskiwania klientów:
            e-mail <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Współpraca (deweloper)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Agencje nieruchomości</strong> — wymiana kontaktów, program poleceń, katalog white-label:
            e-mail <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Współpraca (agencja)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Operator serwisu</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            Andrei Slesarev, jednoosobowa działalność gospodarcza (Gruzja).
            {/* TODO: add registration number / legal address for formal requests. */}
          </div>
        </li>
      </ul>

      <h2>Czas odpowiedzi</h2>
      <p>
        Standard obsługi — odpowiedź w ciągu godziny w godzinach pracy (10:00–20:00 WITA, UTC+8).
        Zapytania otrzymane w nocy są obsługiwane następnego ranka.
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
