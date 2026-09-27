'use client'

import { usePathname } from 'next/navigation'
import { encodeSourceMark } from '@/lib/source-mark'

/** Невидимая метка «текст с этой страницы balinsky.info» — ставится в конец
 *  абзаца. Подробности в lib/source-mark.ts. */
export function SourceMark() {
  const pathname = usePathname()
  return <>{encodeSourceMark(pathname ?? '/')}</>
}
