import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15. Mai 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Kontakt | Balinsky',
  description: 'So erreichen Sie Balinsky: Telegram-Bot, Telegram-Kanal, E-Mail, YouTube. Partnerkontakte für Bauträger und Agenturen.',
  alternates: {
    canonical: '/de/kontakt',
    languages: {
      ru: `${SITE_URL}/ru/kontakty`,
      en: `${SITE_URL}/en/contact`,
      de: `${SITE_URL}/de/kontakt`,
      'x-default': `${SITE_URL}/ru/kontakty`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="de" title="Kontakt" updated={`Stand: ${UPDATED}`} breadcrumbLabel="Kontakt">
      <p>
        Der schnellste Weg ist der Telegram-Bot. Er leitet Ihre Anfrage an den zuständigen Manager des jeweiligen Objekts weiter und antwortet während der Geschäftszeiten innerhalb einer Stunde.
      </p>

      <h2>Für Immobilienkäufer</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram-Bot</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Anfragen zu bestimmten Villen, Apartments und Komplexen. Werden an den Manager des Anbieters weitergeleitet.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Mail size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>E-Mail</strong> — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Für schriftliche Anfragen mit Anhängen oder Anträge zum Datenschutz.</div>
          </div>
        </li>
      </ul>

      <h2>Markt-Updates</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MessageCircle size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram-Kanal</strong> — <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Neue Angebote, Aktionen, Marktübersichten zu Bali, Investment-Cases.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Play size={20} className="text-[#FF0000] mt-0.5 shrink-0" fill="currentColor" />
          <div>
            <strong>YouTube</strong> — <a href="https://www.youtube.com/@balinsky_info" target="_blank" rel="noopener">@balinsky_info</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Objektbegehungen vor Ort, Interviews mit Bauträgern, Marktanalysen.</div>
          </div>
        </li>
      </ul>

      <h2>Partnerschaften</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Bauträger</strong> — nehmen Sie Ihr Projekt in den Katalog auf, schalten Sie eine bezahlte Platzierung oder starten Sie einen gemeinsamen Lead-Kanal:
            E-Mail an <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partnerschaft (Bauträger)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Immobilienagenturen</strong> — Lead-Austausch, Empfehlungsprogramm, White-Label-Katalog:
            E-Mail an <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partnerschaft (Agentur)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Betreiber der Website</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            Andrei Slesarev, Einzelunternehmer (Georgien).
            {/* TODO: add registration number / legal address for formal requests. */}
          </div>
        </li>
      </ul>

      <h2>Reaktionszeit</h2>
      <p>
        Service-Standard — Antwort innerhalb einer Stunde während der Geschäftszeiten (10:00–20:00 WITA, UTC+8).
        Nachts eingehende Anfragen werden am nächsten Morgen bearbeitet.
      </p>

      <h2>Verwandte Dokumente</h2>
      <ul>
        <li><Link href="/de/datenschutz">Datenschutzerklärung</Link></li>
        <li><Link href="/de/agb">Nutzungsbedingungen</Link></li>
        <li><Link href="/de/ueber-uns">Über Balinsky</Link></li>
      </ul>
    </LegalLayout>
  )
}
