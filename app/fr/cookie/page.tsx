import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 mai 2026'

export const metadata: Metadata = {
  title: 'Politique en matière de cookies | Balinsky',
  description: 'Quels cookies Balinsky.info utilise : strictement nécessaires, analytiques, marketing — et comment les désactiver.',
  alternates: {
    canonical: '/fr/cookie',
    languages: {
      ru: `${SITE_URL}/ru/cookie`,
      en: `${SITE_URL}/en/cookie`,
      fr: `${SITE_URL}/fr/cookie`,
      'x-default': `${SITE_URL}/ru/cookie`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="fr" title="Politique en matière de cookies" updated={`Dernière mise à jour : ${UPDATED}`} breadcrumbLabel="Politique en matière de cookies">
      <p>
        Les cookies sont de petits fichiers texte que le site enregistre dans votre navigateur. Ils conservent vos préférences et nous aident à comprendre
        comment le catalogue est utilisé.
      </p>

      <h2>1. Catégories de cookies que nous utilisons</h2>
      <h3>Strictement nécessaires (le site ne fonctionne pas sans eux)</h3>
      <ul>
        <li>Gestion de session — mémorise la langue choisie (RU ou EN).</li>
        <li>Protection des formulaires (jetons CSRF).</li>
        <li>Stockage local de votre liste de favoris — pas un cookie au sens strict, mais technique.</li>
      </ul>
      <h3>Analytiques (nous aident à améliorer le site)</h3>
      <ul>
        <li><strong>Google Analytics 4</strong> via Google Tag Manager (conteneur GTM-TM6D54Z3) — statistiques anonymisées de pages vues et d&apos;événements.</li>
        <li><strong>Yandex.Metrica</strong> (compteur 104881153) — analyse comportementale, cartes de chaleur, rejeu de sessions.</li>
      </ul>
      <h3>Marketing</h3>
      <p>
        Nous ne déposons pas de cookies publicitaires pour l&apos;instant. Si nous lançons du reciblage sur Google ou Yandex à l&apos;avenir, les cookies correspondants seront ajoutés
        et cette page sera mise à jour.
      </p>

      <h2>2. Comment désactiver les cookies</h2>
      <p>
        Les cookies analytiques et marketing peuvent être désactivés dans les paramètres de votre navigateur. Les cookies strictement nécessaires ne peuvent pas l&apos;être —
        la liste de favoris et le sélecteur de langue en ont besoin.
      </p>
      <ul>
        <li>Chrome — <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Paramètres → Confidentialité et sécurité → Cookies</a></li>
        <li>Safari — <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener">Préférences → Confidentialité</a></li>
        <li>Firefox — <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener">Options → Vie privée et sécurité</a></li>
      </ul>
      <p>Vous pouvez aussi installer uBlock Origin, Privacy Badger, ou activer Do Not Track.</p>

      <h2>3. Documents associés</h2>
      <ul>
        <li><a href="/fr/confidentialite">Politique de confidentialité</a></li>
        <li><a href="/fr/conditions">Conditions d&apos;utilisation</a></li>
      </ul>

      {/* TODO: when retargeting is enabled, add a Marketing section listing campaign IDs and cookie identifiers. */}
    </LegalLayout>
  )
}
