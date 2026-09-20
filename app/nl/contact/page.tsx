import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'
import { hreflangMap } from '@/lib/hreflang'

const UPDATED = '15 mei 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Contact | Balinsky',
  description: 'Hoe je Balinsky bereikt: Telegram-bot, Telegram-kanaal, e-mail, YouTube. Contactgegevens voor samenwerking met ontwikkelaars en agentschappen.',
  alternates: {
    canonical: '/nl/contact',
    languages: hreflangMap('/ru/kontakty'),
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="nl" title="Contact" updated={`Informatie actueel op: ${UPDATED}`} breadcrumbLabel="Contact">
      <p>
        Balinsky.info is een informatiecatalogus. De contactgegevens hieronder zijn voor vragen over de site zelf: de gegevens bij een advertentie, een fout die u opmerkte, het plaatsen van een project. Over een specifiek object schrijft u rechtstreeks de ontwikkelaar — zijn Telegram en WhatsApp staan op de objectpagina.
      </p>

      <h2>Vragen over de site en de gegevens</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram-bot</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Vragen over de catalogus en de gegevens bij een object. Gaat het om prijs, termijnen of een reservering, dan hoort die vraag bij de ontwikkelaar, niet bij ons.</div>
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
            <strong>Ontwikkelaars</strong> — voeg je project toe aan de catalogus, plaats betaalde advertenties of laat een videoreview maken:
            e-mail <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Samenwerking (ontwikkelaar)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Vastgoedagentschappen</strong> — publicatie van informatie over de projecten die u vertegenwoordigt, en advertenties op de site:
            e-mail <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Samenwerking (agentschap)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Beheerder van de site</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            <strong>Andrei Slesarau</strong>, eenmanszaak, Georgië.<br />
            Registratienummer 316362404, geregistreerd op 06.01.2022.<br />
            Adres: 19 Shartava St., Rustavi, Georgië.<br />
            <span className="text-[13px] text-[var(--color-text-muted)]">
              Alle advertentiecontracten en facturen worden door deze entiteit uitgegeven, naar Georgisch recht.
              De exploitant van de site verleent geen diensten op Indonesisch grondgebied.
            </span>
          </div>
        </li>
      </ul>

      <h2>Reactietijd</h2>
      <p>
        Vragen over de site beantwoorden we tijdens kantooruren (10:00–20:00 WITA, UTC+8), meestal binnen een dag.
        Hoe snel een ontwikkelaar reageert, ligt niet aan ons — het getal op een objectpagina staat er alleen ter oriëntatie.
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
