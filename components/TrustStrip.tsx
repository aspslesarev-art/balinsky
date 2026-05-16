// Thin trust strip pinned right under the sticky header. One row of
// E-E-A-T signals (catalog size, document QA, response-time SLA),
// localised by lang. Designed to render small (one 28-32 px row) and
// scroll away with the page — not stay sticky — so it adds no extra
// height to the in-flight viewport once the visitor starts reading.

import { FileCheck2, Building2, Clock, Send } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

const COPY: Record<Lang, { items: { Icon: typeof FileCheck2; text: string }[] }> = {
  ru: {
    items: [
      { Icon: Building2, text: '800+ объектов, 90+ застройщиков' },
      { Icon: FileCheck2, text: 'PBG и SLF проверены' },
      { Icon: Clock, text: 'Ответ в Telegram в течение часа' },
      { Icon: Send, text: '@BalinskyBot' },
    ],
  },
  en: {
    items: [
      { Icon: Building2, text: '800+ listings, 90+ developers' },
      { Icon: FileCheck2, text: 'PBG and SLF verified' },
      { Icon: Clock, text: 'Reply in Telegram within an hour' },
      { Icon: Send, text: '@BalinskyBot' },
    ],
  },
}

export function TrustStrip({ lang = 'ru' }: { lang?: Lang }) {
  const items = COPY[lang].items
  return (
    <div className="border-b border-[var(--color-border)] bg-white/60">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-1.5 overflow-x-auto md:overflow-visible">
        <ul className="flex items-center gap-x-5 gap-y-1 whitespace-nowrap text-[12px] text-[var(--color-text-muted)]">
          {items.map(({ Icon, text }) => (
            <li key={text} className="inline-flex items-center gap-1.5">
              <Icon size={13} className="text-[#1F8B5F] shrink-0" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
