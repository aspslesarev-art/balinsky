'use client'

// «Написать» — первое сообщение застройщику в один клик: текст уходит в
// буфер, чат открывается в новой вкладке, в карточке остаётся отметка.
//
// Текст хранится в data['Первое сообщение'] — отдельной колонки под него
// нет: он нужен один раз, а миграция ради одного поля дороже, чем ключ в
// уже существующем JSON.
//
// Telegram не умеет подставлять текст в личный чат по ссылке, поэтому
// буфер нужен всегда; WhatsApp умеет — туда текст уходит и ссылкой.

import { useState } from 'react'
import { Send, Check } from 'lucide-react'
import type { DevPartnerCard } from '@/lib/dev-crm/types'

export const FIRST_MESSAGE_KEY = 'Первое сообщение'

// Telegram банит за холодные сообщения пачкой — держим планку в день.
export const DAILY_LIMIT = 25

export function todayBali(): string {
  return new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10)
}

export type Channel = { key: string; label: string; href: string; via: string }

const ROLE_ORDER = { founder: 0, staff: 1, via: 2 } as const

// Куда можно написать: сначала люди (основатель первым), потом общие
// контакты компании. Один и тот же ник дважды не показываем.
export function channels(p: DevPartnerCard, text: string): Channel[] {
  const out: Channel[] = []
  const seen = new Set<string>()
  const push = (c: Channel) => { if (!seen.has(c.key)) { seen.add(c.key); out.push(c) } }
  const wa = (raw: string) => raw.replace(/\D/g, '')

  const people = [...p.people].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
  for (const x of people) {
    const who = x.name || 'контакт'
    if (x.telegram) push({ key: `tg:${x.telegram}`, label: `Telegram @${x.telegram}`, href: `https://t.me/${x.telegram}`, via: `Telegram @${x.telegram} (${who})` })
    if (x.whatsapp && wa(x.whatsapp).length >= 8) {
      const n = wa(x.whatsapp)
      push({ key: `wa:${n}`, label: `WhatsApp ${who}`, href: `https://wa.me/${n}?text=${encodeURIComponent(text)}`, via: `WhatsApp +${n} (${who})` })
    }
    if (x.instagram) {
      const ig = x.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '')
      if (ig) push({ key: `ig:${ig}`, label: `Instagram @${ig}`, href: `https://ig.me/m/${ig}`, via: `Instagram @${ig} (${who})` })
    }
  }
  if (p.telegram) push({ key: `tg:${p.telegram}`, label: `Telegram @${p.telegram}`, href: `https://t.me/${p.telegram}`, via: `Telegram компании @${p.telegram}` })
  if (p.whatsapp && wa(p.whatsapp).length >= 8) {
    const n = wa(p.whatsapp)
    push({ key: `wa:${n}`, label: 'WhatsApp компании', href: `https://wa.me/${n}?text=${encodeURIComponent(text)}`, via: `WhatsApp компании +${n}` })
  }
  return out
}

// Отметка «написали»: заметка в истории + последний контакт сегодня.
// Карточка из «Отбора» заодно встаёт на доску в «Связаться» — раз
// написали, значит, в работе.
export async function markWritten(p: DevPartnerCard, via: string): Promise<boolean> {
  const note = await fetch(`/api/admin/dev-partners/${p.id}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: `Написал первое сообщение: ${via}` }),
  })
  const patch: Record<string, unknown> = { last_contact: todayBali() }
  if (!p.in_work) Object.assign(patch, { in_work: true, status: 'contact', sort: -Date.now() })
  const r = await fetch(`/api/admin/dev-partners/${p.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return note.ok && r.ok
}

export function WriteButtons({
  partner, compact, onDone, onError,
}: {
  partner: DevPartnerCard
  compact?: boolean
  onDone: () => void | Promise<void>
  onError: (msg: string) => void
}) {
  const text = partner.data?.[FIRST_MESSAGE_KEY] ?? ''
  const list = channels(partner, text)
  const [sent, setSent] = useState<string | null>(null)

  if (!list.length) {
    return <span className="text-[12px] text-[var(--ax-fg-faint)]">некуда писать</span>
  }

  const go = async (c: Channel) => {
    // Буфер и вкладка — синхронно внутри клика, иначе браузер посчитает
    // открытие окна всплывашкой и заблокирует его.
    if (text) navigator.clipboard?.writeText(text).catch(() => onError('Не удалось скопировать текст — скопируйте его из карточки'))
    window.open(c.href, '_blank', 'noopener')
    setSent(c.key)
    const ok = await markWritten(partner, c.via)
    if (!ok) onError('Чат открыт, но отметка «написал» не сохранилась')
    await onDone()
  }

  const shown = compact ? list.slice(0, 1) : list
  return (
    <div className="flex flex-wrap items-center gap-2">
      {shown.map((c, i) => (
        <button
          key={c.key}
          type="button"
          onClick={() => go(c)}
          title={text ? 'Текст скопируется в буфер — вставьте его в чате' : 'Текста нет — откроется только чат'}
          // Главный адресат один — первый (основатель, если он известен);
          // остальные каналы — запасные и выглядят тише.
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D] whitespace-nowrap ${
            i === 0
              ? 'bg-[#1F8B5F] hover:bg-[#197551] active:bg-[#16684A] text-white'
              : 'border border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)]'
          }`}
        >
          {sent === c.key ? <Check size={14} /> : <Send size={14} />}
          {compact ? 'Написать' : c.label}
        </button>
      ))}
    </div>
  )
}
