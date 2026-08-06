import { getHubLongCopy } from '@/lib/hub-seo'
import { getRelatedReading } from '@/lib/hub-seo/related-reading'
import { HubLongForm } from '@/components/HubLongForm'
import { pickCopy, type Lang } from '@/lib/i18n'

// SEO block for the rental hub — the sales hubs got this in the villa/apartment
// SeoContent components; rental had nothing at all.
//
// GSC puts this cluster one page away from real traffic: «аренда жилья на
// бали» 16.0, «бали аренда жилья» 14.0, «снять жилье на бали» 13.1 — and the
// modifier is price, exactly like the sales queries.

const FAQ_HEADING = {
  ru: 'Частые вопросы об аренде на Бали',
  en: 'Bali rental FAQ',
  id: 'Pertanyaan umum tentang sewa di Bali',
  fr: 'Questions fréquentes sur la location à Bali',
  de: 'Häufige Fragen zur Miete auf Bali',
  zh: '巴厘岛租房常见问题',
  nl: 'Veelgestelde vragen over huren op Bali',
  ban: 'Patakon sane sering katakenang indik sewa ring Bali',
  pl: 'Częste pytania o wynajem na Bali',
  uk: 'Часті запитання про оренду на Балі',
} as const

export function RentalSeoContent({ lang = 'ru' }: { lang?: Lang }) {
  const copy = getHubLongCopy('rental', lang)
  const faqHeading = pickCopy(FAQ_HEADING, lang)

  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: copy.faqExtra.map(item => ({
      '@type': 'Question', name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <section className="mt-12 pt-10 border-t border-[var(--color-border)]">
      <HubLongForm copy={copy} reading={getRelatedReading('rental', lang)} />

      <div className="mt-12">
        <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-4">{faqHeading}</h3>
        <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
          {copy.faqExtra.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-medium text-[var(--color-text)]">
                {item.q}
                <span className="text-[var(--color-text-muted)] text-[20px] leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  )
}
