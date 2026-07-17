import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 mai 2026'

export const metadata: Metadata = {
  title: 'Conditions d’utilisation | Balinsky',
  description: 'Conditions d’utilisation du catalogue Balinsky.info : ce que nous sommes (et ne sommes pas), limites du contenu, responsabilités de l’acheteur et de l’exploitant.',
  alternates: {
    canonical: '/fr/conditions',
    languages: {
      ru: `${SITE_URL}/ru/usloviya`,
      en: `${SITE_URL}/en/terms`,
      fr: `${SITE_URL}/fr/conditions`,
      'x-default': `${SITE_URL}/ru/usloviya`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="fr" title="Conditions d&apos;utilisation" updated={`Dernière mise à jour : ${UPDATED}`} breadcrumbLabel="Conditions d&apos;utilisation">
      <p>
        En utilisant Balinsky.info, vous acceptez les conditions ci-dessous. Si quelque chose ne vous convient pas, veuillez ne pas utiliser le site.
      </p>

      <h2>1. Ce qu&apos;est Balinsky.info</h2>
      <p>
        Balinsky.info est un catalogue agrégateur d&apos;annonces immobilières à Bali (villas, appartements, complexes résidentiels,
        locations longue durée), avec des informations sur les promoteurs, des actualités, des promotions et du contenu pédagogique. Le site est conçu pour les acheteurs étrangers.
      </p>
      <p>
        Nous ne sommes partie à aucune transaction d&apos;achat-vente. Nous mettons en avant des informations sur les biens disponibles et mettons les acheteurs
        en relation avec l&apos;exploitant de chaque bien (promoteur, agence ou propriétaire). La transaction se conclut directement entre l&apos;acheteur et l&apos;exploitant.
      </p>

      <h2>2. Exactitude</h2>
      <p>
        Nous nous efforçons de tenir le catalogue à jour, mais les prix, la disponibilité, les permis (PBG, SLF) et les conditions peuvent changer.
        Avant de conclure une transaction, vérifiez les informations directement auprès de l&apos;exploitant et via les registres officiels d&apos;Indonésie.
      </p>
      <p>
        Chaque vidéo et photo a été prise à une date précise — nous ne sommes pas responsables des changements survenus après cette prise de vue.
      </p>

      <h2>3. Contenu des utilisateurs</h2>
      <p>
        Lorsque vous nous contactez via Telegram, notre bot, un formulaire ou par e-mail, vous transmettez du texte et des coordonnées et confirmez que vous avez le
        droit de les partager. Utilisation de ces données : voir notre <a href="/fr/confidentialite">politique de confidentialité</a>.
      </p>
      <p>
        Il est interdit d&apos;utiliser le site pour du spam, de l&apos;extraction automatisée de données, des tentatives de contournement des protections, des attaques par surcharge ou de la rétro-ingénierie des API internes.
      </p>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        Les textes, schémas et contenus éditoriaux du site (sauf mention contraire) sont publiés sous licence
        Creative Commons Attribution 4.0 International — créditez l&apos;auteur et renvoyez vers l&apos;original lors de leur réutilisation.
      </p>
      <p>
        Les photos et vidéos de biens individuels peuvent appartenir à des promoteurs ou à des tiers — demandez une licence distincte pour toute réutilisation commerciale.
      </p>

      <h2>5. Assistant IA Balina</h2>
      <p>
        Balina est un assistant IA expérimental présent sur le site. Ses réponses sont informatives et ne remplacent pas la consultation d&apos;un agent, avocat ou notaire agréé.
        Balina peut se tromper — confirmez auprès du spécialiste compétent tout élément qui touche à une transaction avant d&apos;agir.
      </p>

      <h2>6. Liens externes</h2>
      <p>
        Le site renvoie vers des ressources tierces (YouTube, Telegram, estatemarket.io, sites de promoteurs). Nous ne contrôlons pas leur contenu
        et ne sommes pas responsables de leur disponibilité ni de leurs politiques.
      </p>

      <h2>7. Responsabilité</h2>
      <p>
        Le site est fourni &ldquo;en l&apos;état&rdquo;. Nous ne garantissons ni une disponibilité ininterrompue, ni l&apos;absence de problèmes techniques, ni que les annonces
        correspondent à vos objectifs d&apos;investissement particuliers. Les décisions relèvent du risque de l&apos;acheteur.
      </p>

      <h2>8. Modifications</h2>
      <p>
        Ces conditions peuvent changer. La version en vigueur figure toujours sur cette page. Les mises à jour importantes sont annoncées sur le
        <a href="https://t.me/itrealtor" target="_blank" rel="noopener"> canal Telegram @itrealtor</a>.
      </p>

      <h2>9. Droit applicable et juridiction</h2>
      <p>
        Les litiges sont régis par le droit de la Géorgie (pays d&apos;immatriculation de l&apos;exploitant), sauf disposition impérative contraire du droit de votre pays de résidence.
      </p>

      {/* TODO: confirm jurisdiction / arbitration wording with counsel. Default is Georgia (sole-proprietor country). */}
    </LegalLayout>
  )
}
