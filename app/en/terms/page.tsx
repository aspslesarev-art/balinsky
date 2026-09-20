import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'
import { hreflangMap } from '@/lib/hreflang'

const UPDATED = 'September 20, 2026'

export const metadata: Metadata = {
  title: 'Terms of Use | Balinsky',
  description: 'Terms of use for the Balinsky.info catalogue: what we are (and what we are not), content boundaries, responsibilities of buyer and operator.',
  alternates: {
    canonical: '/en/terms',
    languages: hreflangMap('/ru/usloviya'),
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="en" title="Terms of Use" updated={`Last updated: ${UPDATED}`} breadcrumbLabel="Terms of Use">
      <p>
        By using Balinsky.info you agree to the terms below. If something here does not work for you, please do not use the site.
      </p>

      <h2>1. What Balinsky.info is</h2>
      <p>
        Balinsky.info is an aggregator catalogue of Bali real-estate listings (villas, apartments, residential complexes,
        long-term rentals), developer information, news, promotions and educational material. The site is built for foreign buyers.
      </p>
      <p>
        We are not a party to any sale-and-purchase transaction. We surface information about available units and connect buyers
        with the operator of each unit (developer, agency or owner). The deal is closed directly between buyer and operator.
      </p>

      <h2>2. What Balinsky.info is not</h2>
      <p>
        We are not a real-estate agency, a broker or a realtor. Specifically, we do not sell properties and do not act
        as seller; we do not represent either buyer or seller in negotiations; we do not draft, sign or certify
        contracts; we do not receive or hold earnest money, deposits or any payments related to a transaction; we take
        no commission from buyers; we do not arrange viewings, trips or site visits; and we provide no legal, notarial,
        tax or visa services.
      </p>
      <p>
        All of the above is done by the parties themselves and the licensed professionals they engage — the developer
        or owner, a PPAT notary, a lawyer, a tax adviser. The contacts of each property’s operator are shown on that
        property’s page; correspondence and negotiation run straight to them, bypassing Balinsky.
      </p>

      <h2>3. Accuracy</h2>
      <p>
        We work to keep the catalogue current, but prices, availability, permits (PBG, SLF) and terms can change.
        Before closing a deal, verify the data with the operator directly and through Indonesia&apos;s official registers.
      </p>
      <p>
        Each video and photo was captured on a specific date — we are not responsible for changes after that capture.
      </p>

      <h2>4. User content</h2>
      <p>
        When you contact us through Telegram, our bot, a form, or email, you submit text and contact data and confirm you have the
        right to share them. How that data is used: see our <a href="/en/privacy">Privacy Policy</a>.
      </p>
      <p>
        It is forbidden to use the site for spam, automated scraping, attempts to bypass protections, load attacks, or reverse-engineering of internal APIs.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        Texts, schemes and editorial materials on the site (unless otherwise marked) are licensed under
        Creative Commons Attribution 4.0 International — credit the author and link to the original when reusing them.
      </p>
      <p>
        Photos and videos of individual properties may belong to developers or third parties — request a separate licence for commercial reuse.
      </p>

      <h2>6. Andrei AI assistant</h2>
      <p>
        Andrei is an experimental AI assistant on the site. Its answers are informational and do not replace consultation with a licensed agent,
        lawyer or notary. Andrei can make mistakes — confirm anything that affects a deal with the appropriate specialist before acting on it.
      </p>

      <h2>7. External links</h2>
      <p>
        The site links to third-party resources (YouTube, Telegram, estatemarket.io, developer sites). We do not control their content
        and are not responsible for their availability or policies.
      </p>

      <h2>8. Liability</h2>
      <p>
        The site is provided &ldquo;as is&rdquo;. We do not guarantee uninterrupted availability, absence of technical issues, or that the listings
        fit your specific investment goals. Decisions are at the buyer&apos;s risk.
      </p>

      <h2>9. Changes</h2>
      <p>
        These terms can change. The current version always lives on this page. Significant updates are announced in the
        <a href="https://t.me/itrealtor" target="_blank" rel="noopener"> @itrealtor Telegram channel</a>.
      </p>

      <h2>10. Governing law and jurisdiction</h2>
      <p>
        Disputes are governed by the laws of Georgia, unless mandatory rules of your country of residence
        provide otherwise.
      </p>

      {/* TODO: confirm jurisdiction / arbitration wording with counsel. Default is Georgia. */}
    </LegalLayout>
  )
}
