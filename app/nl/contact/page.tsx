import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 mei 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Contact | Balinsky',
  description: 'Hoe je Balinsky bereikt: Telegram-bot, Telegram-kanaal, e-mail, YouTube. Contactgegevens voor samenwerking met ontwikkelaars en agentschappen.',
  alternates: {
    canonical: '/nl/contact',
    languages: {
      ru: `${SITE_URL}/ru/kontakty`,
      en: `${SITE_URL}/en/contact`,
      nl: `${SITE_URL}/nl/contact`,
      'x-default': `${SITE_URL}/ru/kontakty`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="nl" title="Contact" updated={`Informatie actueel op: ${UPDATED}`} breadcrumbLabel="Contact">
      <p>
        De snelste weg is de Telegram-bot. Deze stuurt je aanvraag door naar de manager van het specifieke object en reageert binnen een uur tijdens kantooruren.
      </p>

      <h2>Voor kopers van vastgoed</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram-bot</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Aanvragen over specifieke villa&apos;s, appartementen en complexen. Doorgestuurd naar de manager van de aanbieder.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Mail size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>E-mail</strong> — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Voor schriftelijke aanvragen met bijlagen of verzoeken over gegevensbescherming.</div>
          </div>
        </li>
      </ul>

      <h2>Marktupdates</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MessageCircle size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram-kanaal</strong> — <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Nieuwe listings, aanbiedingen, marktoverzichten van Bali, investeringscases.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Play size={20} className="text-[#FF0000] mt-0.5 shrink-0" fill="currentColor" />
          <div>
            <strong>YouTube</strong> — <a href="https://www.youtube.com/@balinsky_info" target="_blank" rel="noopener">@balinsky_info</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Vastgoedrondleidingen ter plaatse, interviews met ontwikkelaars, marktanalyses.</div>
          </div>
        </li>
      </ul>

      <h2>Samenwerkingen</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Ontwikkelaars</strong> — voeg je project toe aan de catalogus, plaats betaalde advertenties of start een gezamenlijk leadkanaal:
            e-mail <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Samenwerking (ontwikkelaar)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Vastgoedagentschappen</strong> — leaduitwisseling, verwijzingsprogramma, white-label catalogus:
            e-mail <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Samenwerking (agentschap)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Beheerder van de site</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            Andrei Slesarev, eenmanszaak (Georgië).
            {/* TODO: add registration number / legal address for formal requests. */}
          </div>
        </li>
      </ul>

      <h2>Reactietijd</h2>
      <p>
        Servicestandaard — antwoord binnen een uur tijdens kantooruren (10:00–20:00 WITA, UTC+8).
        Aanvragen die &apos;s nachts binnenkomen, worden de volgende ochtend verwerkt.
      </p>

      <h2>Gerelateerde documenten</h2>
      <ul>
        <li><Link href="/nl/privacy">Privacybeleid</Link></li>
        <li><Link href="/nl/voorwaarden">Gebruiksvoorwaarden</Link></li>
        <li><Link href="/nl/over-ons">Over Balinsky</Link></li>
      </ul>
    </LegalLayout>
  )
}
