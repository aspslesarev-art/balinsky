'use client'

import { AdminChrome } from '@/components/admin/AdminChrome'

// Обёртка страниц трекера в тему админки.
//
// Переменные --ax-* объявлены в globals.css только внутри .theme-admin,
// поэтому без этой обёртки все панели и выпадающие списки остаются без
// фона и границ — на прозрачном фоне не видно, что вообще выбрано.

export function MarketShell({ children }: { children: React.ReactNode }) {
  return <AdminChrome>{children}</AdminChrome>
}
