import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'
import { hreflangMap } from '@/lib/hreflang'

const UPDATED = '15. Mai 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Kontakt | Balinsky',
  description: 'So erreichen Sie Balinsky: Telegram-Bot, Telegram-Kanal, E-Mail, YouTube. Partnerkontakte für Bauträger und Agenturen.',
  alternates: {
    canonical: '/de/kontakt',
    languages: hreflangMap('/ru/kontakty'),
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="de" title="Kontakt" updated={`Stand: ${UPDATED}`} breadcrumbLabel="Kontakt">
      <p>
        Balinsky.info ist ein Informationskatalog. Die Kontakte unten sind für Fragen zur Website selbst gedacht: zu den Daten eines Inserats, zu einem gefundenen Fehler, zur Veröffentlichung eines Projekts. Zu einem konkreten Objekt schreiben Sie direkt dem Bauträger — sein Telegram und WhatsApp stehen auf der Objektseite.
      </p>

      <h2>Fragen zur Website und zu den Daten</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram-Bot</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Fragen zum Katalog und zu den Daten eines Inserats. Geht es um Preis, Termine oder eine Reservierung, gehört die Frage zum Bauträger, nicht zu uns.</div>
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
            <strong>Bauträger</strong> — nehmen Sie Ihr Projekt in den Katalog auf, schalten Sie eine bezahlte Platzierung oder beauftragen Sie ein Videoporträt:
            E-Mail an <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partnerschaft (Bauträger)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Immobilienagenturen</strong> — Veröffentlichung von Informationen zu den von Ihnen vertretenen Projekten und Werbung auf der Website:
            E-Mail an <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partnerschaft (Agentur)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Betreiber der Website</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            <strong>Andrei Slesarau</strong>, Einzelunternehmer, Georgien.<br />
            Registrierungsnummer 316362404, eingetragen am 06.01.2022.<br />
            Anschrift: 19 Shartava St., Rustavi, Georgien.<br />
            <span className="text-[13px] text-[var(--color-text-muted)]">
              Sämtliche Werbeverträge und Rechnungen stellt dieses Unternehmen nach georgischem Recht aus.
              Der Betreiber der Website erbringt keine Leistungen auf indonesischem Staatsgebiet.
            </span>
          </div>
        </li>
      </ul>

      <h2>Reaktionszeit</h2>
      <p>
        Fragen zur Website beantworten wir während der Geschäftszeiten (10:00–20:00 WITA, UTC+8), meist innerhalb eines Tages.
        Wie schnell ein Bauträger antwortet, liegt nicht bei uns — die Angabe auf der Objektseite dient nur zur Orientierung.
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
