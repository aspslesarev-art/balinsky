import type { ReactNode } from 'react'
import type { Lang } from '@/lib/i18n'

// Аналитические блоки (доходность, что рядом, рынок аренды, карта туристов)
// раньше были размыты до входа. С 2026-09-27 всё открыто без регистрации:
// цель сайта — чтобы человек быстро получил ответ и связался с застройщиком.
// Обёртка оставлена, чтобы страницы объектов не менять; kind/lang больше
// ничего не решают.

export type GateKind = 'investment' | 'nearby' | 'market' | 'heatmap'

/** Deep link that makes the bot mint a one-time login link (кабинет агента). */
export const LOGIN_URL = 'https://t.me/BalinskyBot?start=login'

export function GatedBlock({
  children,
}: {
  children: ReactNode
  lang?: Lang
  kind?: GateKind
}) {
  return <>{children}</>
}
