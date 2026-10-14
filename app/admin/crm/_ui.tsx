'use client'

// Мелкие общие кусочки списка и карточки: дата «3 дн. назад», оценка
// отношений полоской, строка долга.

import type { CrmContact } from '@/lib/tg-crm/types'

export function relDay(iso: string | null): string | null {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000)
  if (days <= 0) return 'сегодня'
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} дн. назад`
  if (days < 31) return `${Math.floor(days / 7)} нед. назад`
  if (days < 365) return `${Math.floor(days / 30)} мес. назад`
  return `${Math.floor(days / 365)} г. назад`
}

// Цвет оценки отношений: тёплые — зелёные, средние — янтарные, слабые
// остаются приглушёнными. Красного нет: слабая связь — не ошибка.
export function relTint(v: number | null): string {
  if (v == null) return 'var(--ax-fg-faint)'
  if (v >= 7) return 'var(--ax-prospect-yes-fg)'
  if (v >= 4) return 'var(--ax-prospect-maybe-fg)'
  return 'var(--ax-fg-faint)'
}

export function MoneyLine({ m }: { m: CrmContact['money'][number] }) {
  const iOwe = m.who_owes === 'я'
  const amount = m.amount != null && m.amount !== '' ? ` · ${m.amount}` : ''
  return (
    <div className="text-[12.5px] leading-snug break-words">
      <span className="font-medium" style={{ color: iOwe ? 'var(--ax-prospect-maybe-fg)' : 'var(--ax-prospect-yes-fg)' }}>
        {iOwe ? 'Я должен' : 'Мне должны'}{amount}
      </span>
      {m.what && <span className="text-[var(--ax-fg-muted)]"> — {m.what}</span>}
    </div>
  )
}

// Оценка отношений: число и короткая полоска на десять делений.
export function RelScore({ v }: { v: number | null }) {
  if (v == null) return <span className="text-[11.5px] text-[var(--ax-fg-faint)]">—</span>
  return (
    <span className="inline-flex items-center gap-1.5" title={`Отношения: ${v} из 10`}>
      <span className="w-10 h-1 rounded-full bg-[var(--ax-hover)] overflow-hidden">
        <span className="block h-full rounded-full" style={{ width: `${v * 10}%`, background: relTint(v) }} />
      </span>
      <span className="text-[12px] font-medium tabular-nums w-[2ch] text-right" style={{ color: relTint(v) }}>{v}</span>
    </span>
  )
}
