import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 mai 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Politique de confidentialité | Balinsky',
  description: 'Comment Balinsky traite les données personnelles : ce que nous collectons, pourquoi, combien de temps nous les conservons, qui sont les tiers et comment demander leur suppression.',
  alternates: {
    canonical: '/fr/confidentialite',
    languages: {
      ru: `${SITE_URL}/ru/politika-konfidencialnosti`,
      en: `${SITE_URL}/en/privacy`,
      fr: `${SITE_URL}/fr/confidentialite`,
      'x-default': `${SITE_URL}/ru/politika-konfidencialnosti`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="fr" title="Politique de confidentialité" updated={`Dernière mise à jour : ${UPDATED}`} breadcrumbLabel="Politique de confidentialité">
      <p>
        Cette politique explique quelles données personnelles le site <a href="/fr">Balinsky.info</a> collecte, pourquoi,
        comment elles sont conservées, avec qui elles sont partagées et quels sont vos droits en tant qu&apos;utilisateur.
      </p>

      <h2>1. Exploitant du site</h2>
      <p>
        Balinsky.info est exploité par Andrei Slesarev (entrepreneur individuel, Géorgie). Pour toute demande
        relative à la protection des données : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>,
        Telegram <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>.
      </p>

      <h2>2. Ce que nous collectons</h2>
      <h3>2.1. Données que vous fournissez</h3>
      <ul>
        <li>Nom, téléphone et e-mail lorsque vous envoyez une demande de réservation ou sollicitez un rappel.</li>
        <li>Messages envoyés au bot Telegram @BalinskyBot et à nos agents dans les conversations directes.</li>
        <li>Votre liste de favoris, stockée uniquement en local dans votre navigateur — jamais transférée sur nos serveurs.</li>
      </ul>
      <h3>2.2. Données collectées automatiquement</h3>
      <ul>
        <li>Adresse IP, type de navigateur et d&apos;appareil, système d&apos;exploitation, résolution d&apos;écran.</li>
        <li>URL visitées, page référente, durée de session, interactions sur les pages (Google Analytics 4, Yandex.Metrica).</li>
        <li>Cookies — voir la <a href="/fr/cookie">politique en matière de cookies</a> pour plus de détails.</li>
      </ul>

      <h2>3. Pourquoi nous les traitons</h2>
      <ul>
        <li>Pour vous contacter au sujet de demandes portant sur des biens précis.</li>
        <li>Pour comprendre quelles parties du site fonctionnent et améliorer le catalogue.</li>
        <li>Pour envoyer des messages informatifs via le bot Telegram si vous y avez consenti.</li>
        <li>Sécurité — détection des bots, du spam et des tentatives d&apos;intrusion.</li>
      </ul>

      <h2>4. Tiers</h2>
      <p>Le site s&apos;appuie sur les prestataires suivants :</p>
      <ul>
        <li><strong>Vercel</strong> — hébergement et CDN (États-Unis / UE).</li>
        <li><strong>Supabase</strong> — base de données et stockage des médias (UE).</li>
        <li><strong>Google Analytics 4</strong> et <strong>Google Tag Manager</strong> — analyse d&apos;audience.</li>
        <li><strong>Yandex.Metrica</strong> — analyse d&apos;audience et signaux comportementaux pour Yandex Search.</li>
        <li><strong>Telegram</strong> — acheminement des messages via @BalinskyBot.</li>
        <li><strong>OpenAI / Azure OpenAI</strong> — moteur de l&apos;assistant IA Balina. Si vous écrivez à l&apos;assistant, votre message et son contexte immédiat sont transmis à l&apos;API du prestataire.</li>
      </ul>

      <h2>5. Conservation</h2>
      <p>
        Les demandes et conversations ne sont conservées que le temps nécessaire au traitement de votre demande et à la poursuite de nos échanges avec vous.
        Journaux techniques et données d&apos;analyse — jusqu&apos;à 14 mois. Nous supprimons les données personnelles plus tôt sur demande.
      </p>

      <h2>6. Vos droits</h2>
      <ul>
        <li>Recevoir une copie des données personnelles que nous détenons à votre sujet.</li>
        <li>Demander la rectification de données inexactes.</li>
        <li>Demander la suppression de vos données (sauf obligation légale contraire de les conserver).</li>
        <li>Retirer votre consentement aux communications marketing.</li>
        <li>Déposer une plainte auprès de l&apos;autorité de protection des données de votre pays de résidence.</li>
      </ul>
      <p>Écrivez à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Nous répondons sous 30 jours.</p>

      <h2>7. Sécurité</h2>
      <p>
        L&apos;accès à l&apos;interface d&apos;administration est restreint. La connexion est chiffrée en HTTPS. Nous n&apos;acceptons ni ne conservons de données de paiement —
        tous les paiements sont effectués directement sur le compte bancaire de l&apos;exploitant du bien.
      </p>

      <h2>8. Modifications</h2>
      <p>
        Nous mettons cette politique à jour à mesure que nos pratiques de traitement des données évoluent. La version en vigueur est toujours visible sur cette page ;
        la date en haut reflète la dernière modification.
      </p>

      {/* TODO: legal review once the entity status is final. Sole-proprietor Georgia is the current footer block. */}
    </LegalLayout>
  )
}
