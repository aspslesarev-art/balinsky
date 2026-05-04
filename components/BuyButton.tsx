import Link from 'next/link'
import { Send } from 'lucide-react'
import { botLink } from '@/lib/bot-link'

// Primary CTA on villa / apartment detail pages. Routes through the
// on-brand Telegram bot, which looks up the developer's manager and
// sends the visitor that manager's Telegram + WhatsApp contact in
// chat. Same pipeline as the manager-card "Написать" button so leads
// land in our admin inbox first.
export function BuyButton({
  managerId,
  className = '',
  label = 'Купить',
}: {
  managerId: string | null
  className?: string
  label?: string
}) {
  // No manager attached? Bot still fires its default greeting and we
  // get the lead — better than hiding the CTA.
  const href = botLink('manager', managerId ?? '')
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] font-semibold px-6 py-3 transition-colors no-underline ${className}`}
    >
      <Send size={16} /> {label}
    </Link>
  )
}
