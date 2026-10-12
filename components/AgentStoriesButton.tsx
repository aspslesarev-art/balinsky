// «Сторис для агента»: ссылка в бота, который пришлёт 3 картинки 1080×1920
// по этому объекту без названия ЖК и застройщика (lib/agent-stories).
// Стоит рядом с «Презентация PDF» и повторяет её вид. Пока только RU —
// картинки рисуются по-русски.

import { Smartphone } from 'lucide-react'
import { storiesBotLink } from '@/lib/bot-link'

export function AgentStoriesButton({ kind, id, className = '' }: { kind: 'villa' | 'apartment' | 'complex'; id: string; className?: string }) {
  return (
    <a
      href={storiesBotLink(kind, id)}
      target="_blank"
      rel="noopener noreferrer"
      title="Бот в Telegram пришлёт 3 картинки для сторис - без названия комплекса и застройщика"
      className={`inline-flex items-center justify-center gap-2 w-full md:w-auto min-h-[54px] py-2 px-6 rounded-[10px] bg-white border border-[var(--color-border)] hover:border-[var(--color-text-muted)] text-[#1A1F1C] text-[15px] md:text-[16px] font-semibold text-center leading-tight no-underline transition-colors ${className}`}
    >
      <Smartphone size={18} strokeWidth={1.6} />
      Сторис для агента
    </a>
  )
}
