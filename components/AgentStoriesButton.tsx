// «Сторис для агента»: ссылка в бота, который пришлёт 3 картинки 1080×1920
// по этому объекту без названия ЖК и застройщика (lib/agent-stories).
// Пока только на RU — картинки рисуются по-русски.

import { Send, Smartphone } from 'lucide-react'
import { storiesBotLink } from '@/lib/bot-link'

export function AgentStoriesCard({ kind, id }: { kind: 'villa' | 'apartment' | 'complex'; id: string }) {
  return (
    <section className="mb-10">
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6">
        <div className="flex items-start gap-4 sm:flex-1 min-w-0">
          <div className="shrink-0 w-12 h-12 rounded-full bg-[var(--color-search-bg)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary-pressed)]">
            <Smartphone size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-[16px] md:text-[18px] font-semibold text-[var(--color-text)]">Сторис для агента</div>
            <p className="mt-1 max-w-[60ch] text-[13px] leading-[1.6] text-[var(--color-text-muted)]">
              3 готовые картинки для Instagram и Telegram: фото, цена, площадь, лизхолд. Без названия комплекса и застройщика - можно ставить от себя.
            </p>
          </div>
        </div>
        <a
          href={storiesBotLink(kind, id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] text-white text-[14px] font-medium no-underline transition-colors sm:shrink-0"
        >
          <Send size={16} /> Получить в Telegram
        </a>
      </div>
    </section>
  )
}
