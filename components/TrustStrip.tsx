import { FileCheck2, Lock, Calendar, Send } from 'lucide-react'

// Compact "expertise teaser" strip rendered just above the primary CTA on
// detail pages. Each badge surfaces a fact the page actually verifies
// (permit on file, leasehold term, completion year, available manager) so
// the search engine reads concrete proof instead of a generic CTA — and
// the user understands what's behind the Telegram button before clicking.
export function TrustStrip({
  permit,
  lease,
  yearLabel,
  hasManager,
  className = '',
}: {
  permit: string | null
  lease: string | null
  yearLabel: string | null
  hasManager: boolean
  className?: string
}) {
  const items: { Icon: typeof FileCheck2; text: string }[] = []
  if (permit && permit.toLowerCase() !== 'нет') {
    items.push({ Icon: FileCheck2, text: `Документы: ${permit}` })
  }
  if (lease) {
    items.push({ Icon: Lock, text: `Лизхолд ${lease} лет` })
  }
  if (yearLabel) {
    items.push({ Icon: Calendar, text: yearLabel })
  }
  if (hasManager) {
    items.push({ Icon: Send, text: 'Менеджер проекта на связи' })
  }
  if (items.length === 0) return null

  return (
    <div className={className}>
      <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-[13px] text-[var(--color-text)]">
        {items.map(({ Icon, text }) => (
          <span key={text} className="inline-flex items-center gap-1.5">
            <Icon size={14} className="text-[#16A34A]" aria-hidden />
            <span>{text}</span>
          </span>
        ))}
      </div>
      <div className="text-[12px] text-[var(--color-text-muted)] mt-1.5">
        Полный пакет документов и прямой контакт менеджера — в Telegram-боте.
      </div>
    </div>
  )
}
