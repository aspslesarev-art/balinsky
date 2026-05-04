import Link from 'next/link'
import { Send, FileText, MapPinned, MessageSquare } from 'lucide-react'
import { botLink } from '@/lib/bot-link'

// Primary CTA on villa / apartment detail pages. Routes through the
// on-brand Telegram bot, which looks up the developer's manager and
// sends the visitor that manager's Telegram + WhatsApp contact in
// chat. Same pipeline as the manager-card "Написать" button so leads
// land in our admin inbox first.
//
// The 3-bullet teaser above the button tells the visitor exactly what
// they get when they tap through — closes the gap between "сайт →
// Telegram бот" so people don't bounce thinking the site itself is
// hiding contact info.
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
    <div className={`flex flex-col gap-2 ${className}`}>
      <Link
        href={href}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] font-semibold px-6 py-3 transition-colors no-underline"
      >
        <Send size={16} /> {label}
      </Link>
      <ul className="text-[12px] text-[var(--color-text-muted)] leading-snug space-y-1">
        <li className="inline-flex items-center gap-1.5"><FileText size={12} className="shrink-0" /> Документы и условия лизхолда</li>
        <li className="inline-flex items-center gap-1.5"><MapPinned size={12} className="shrink-0" /> Мастер-план и планировки</li>
        <li className="inline-flex items-center gap-1.5"><MessageSquare size={12} className="shrink-0" /> Прямой контакт менеджера застройщика</li>
      </ul>
    </div>
  )
}
