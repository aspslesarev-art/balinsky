import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { VillaDetail } from '../_detail'
import { parsePdfRequest } from '@/lib/pdf-request'
import type { Lang } from '@/lib/i18n'
import { isProSession } from '@/lib/site-auth'

// Печатная презентация виллы (Pro). Не для поиска: каждый раз собирается
// заново по выбранным блокам и настройкам калькулятора из адреса.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

const LANGS = new Set(['ru', 'en', 'id', 'fr', 'de', 'zh', 'nl', 'ban', 'pl', 'uk'])

type Params = Promise<{ slug: string }>
type Search = Promise<Record<string, string | string[] | undefined>>

export default async function Page({ params, searchParams }: { params: Params; searchParams: Search }) {
  // Аналитика объекта в презентации — только для Pro.
  if (!(await isProSession())) notFound()
  const { slug } = await params
  const q = await searchParams
  const l = Array.isArray(q.lang) ? q.lang[0] : q.lang
  const lang = (l && LANGS.has(l) ? l : 'ru') as Lang
  return <VillaDetail slug={slug} lang={lang} pdf={parsePdfRequest(q)} />
}
