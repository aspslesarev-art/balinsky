import { Send, MessageCircle, Star, Languages } from 'lucide-react'
import type { ManagerItem } from '@/lib/managers'
import { botLink } from '@/lib/bot-link'

export function ManagerCard({ manager, developerName }: { manager: ManagerItem; developerName?: string | null }) {
  // TG goes through @BalinskyBot so the lead lands in the brand chat first;
  // the bot then forwards the user to the actual manager handle.
  const tg = manager.telegram ? botLink('manager', manager.id) : null
  const wa = manager.whatsapp
  if (!tg && !wa) return null

  return (
    <section className="mb-10">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
        Связаться с менеджером
      </h2>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6">
        <div className="flex items-center gap-4 sm:flex-1 min-w-0">
          <div className="shrink-0 w-[64px] h-[64px] md:w-[80px] md:h-[80px] rounded-full overflow-hidden bg-[var(--color-search-bg)] border border-[var(--color-border)]">
            {manager.photo ? (
              <img src={manager.photo} alt={manager.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[24px] text-[var(--color-text-muted)]">
                {manager.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[16px] md:text-[18px] font-semibold text-[#111827] truncate">{manager.name}</div>
            <div className="text-[12px] md:text-[13px] text-[var(--color-text-muted)] truncate">
              Менеджер {developerName ? developerName : 'застройщика'}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {manager.rating != null && (
                <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
                  <Star size={12} className="text-[#F59E0B] fill-[#F59E0B]" />
                  <span className="font-medium text-[#111827]">{manager.rating.toFixed(1)}</span>
                </span>
              )}
              {manager.languages.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
                  <Languages size={12} />
                  <span className="truncate">{manager.languages.join(', ')}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:shrink-0">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#25D366] hover:bg-[#1EBE5B] text-white text-[14px] font-medium no-underline transition-colors"
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
          )}
          {tg && (
            <a
              href={tg}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#229ED9] hover:bg-[#1A8CC2] text-white text-[14px] font-medium no-underline transition-colors"
            >
              <Send size={16} /> Telegram
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
