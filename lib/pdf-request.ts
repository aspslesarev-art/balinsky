// Что попросили в печатной презентации: адрес /…/pdf?b=…&n=…&t=…&w=…&print=1
// (окно скачивания в components/VillaPresentation.tsx).

import { PDF_BLOCKS, type PdfBlock } from '@/lib/pdf-blocks'
import { calcFromQuery, type CalcSettings } from '@/lib/calc-settings'

export type PdfRequest = {
  blocks: PdfBlock[]
  agent: { name: string; telegram: string; whatsapp: string } | null
  calc: CalcSettings | null
  autoPrint: boolean
  portrait: boolean
}

export function parsePdfRequest(q: Record<string, string | string[] | undefined>): PdfRequest {
  const one = (k: string) => { const v = q[k]; return (Array.isArray(v) ? v[0] : v)?.slice(0, 80) }
  const b = one('b')
  const blocks = b ? b.split(',').filter((x): x is PdfBlock => (PDF_BLOCKS as string[]).includes(x)) : PDF_BLOCKS
  const name = one('n')?.trim() ?? ''
  const telegram = one('t')?.trim() ?? ''
  const whatsapp = one('w')?.trim() ?? ''
  const flat: Record<string, string | undefined> = {}
  for (const k of ['cm', 'cp', 'ca', 'co', 'cg', 'ct', 'cr', 'cn']) flat[k] = one(k)
  return {
    blocks,
    agent: name && (telegram || whatsapp) ? { name, telegram, whatsapp } : null,
    calc: calcFromQuery(flat),
    autoPrint: one('print') === '1',
    portrait: one('o') === 'p',
  }
}
