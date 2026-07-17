import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 mai 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Contact | Balinsky',
  description: 'Comment joindre Balinsky : bot Telegram, canal Telegram, e-mail, YouTube. Contacts de partenariat pour promoteurs et agences.',
  alternates: {
    canonical: '/fr/contact',
    languages: {
      ru: `${SITE_URL}/ru/kontakty`,
      en: `${SITE_URL}/en/contact`,
      fr: `${SITE_URL}/fr/contact`,
      'x-default': `${SITE_URL}/ru/kontakty`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="fr" title="Contact" updated={`Informations à jour au : ${UPDATED}`} breadcrumbLabel="Contact">
      <p>
        Le moyen le plus rapide est le bot Telegram. Il transmet votre demande au responsable du bien concerné et répond en moins d&apos;une heure pendant les heures ouvrées.
      </p>

      <h2>Pour les acquéreurs</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Bot Telegram</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Demandes concernant des villas, appartements et complexes précis. Transmises au responsable de l&apos;exploitant.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Mail size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>E-mail</strong> — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Pour les demandes écrites avec pièces jointes ou les demandes relatives à la protection des données.</div>
          </div>
        </li>
      </ul>

      <h2>Actualités du marché</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MessageCircle size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Canal Telegram</strong> — <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Nouvelles annonces, promotions, analyses du marché de Bali, cas d&apos;investissement.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Play size={20} className="text-[#FF0000] mt-0.5 shrink-0" fill="currentColor" />
          <div>
            <strong>YouTube</strong> — <a href="https://www.youtube.com/@balinsky_info" target="_blank" rel="noopener">@balinsky_info</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Visites de biens sur le terrain, entretiens avec les promoteurs, analyses de marché.</div>
          </div>
        </li>
      </ul>

      <h2>Partenariats</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Promoteurs</strong> — ajoutez votre projet au catalogue, lancez un placement payant ou ouvrez un canal de leads commun :
            écrivez à <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partenariat (promoteur)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Agences immobilières</strong> — échange de leads, programme de parrainage, catalogue en marque blanche :
            écrivez à <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partenariat (agence)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Exploitant du site</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            Andrei Slesarev, entrepreneur individuel (Géorgie).
            {/* TODO: add registration number / legal address for formal requests. */}
          </div>
        </li>
      </ul>

      <h2>Délai de réponse</h2>
      <p>
        Notre standard de service : réponse en moins d&apos;une heure pendant les heures ouvrées (10h00–20h00 WITA, UTC+8).
        Les demandes reçues la nuit sont traitées le lendemain matin.
      </p>

      <h2>Documents associés</h2>
      <ul>
        <li><Link href="/fr/confidentialite">Politique de confidentialité</Link></li>
        <li><Link href="/fr/conditions">Conditions d&apos;utilisation</Link></li>
        <li><Link href="/fr/a-propos">À propos de Balinsky</Link></li>
      </ul>
    </LegalLayout>
  )
}
