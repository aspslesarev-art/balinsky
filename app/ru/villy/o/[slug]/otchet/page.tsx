import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { VillaDetail } from '../_detail'
import type { Lang } from '@/lib/i18n'
import { isProSession } from '@/lib/site-auth'

// Печатный отчёт ИИ-аналитика (Pro): проверки, которые человек добавил в
// отчёт в окне аналитики (?a=daily,booking,…). Файл собирает app/api/pdf.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

const LANGS = new Set(['ru', 'en', 'id', 'fr', 'de', 'zh', 'nl', 'ban', 'pl', 'uk'])

type Params = Promise<{ slug: string }>
type Search = Promise<Record<string, string | string[] | undefined>>

export default async function Page({ params, searchParams }: { params: Params; searchParams: Search }) {
  if (!(await isProSession())) notFound()
  const { slug } = await params
  const q = await searchParams
  const one = (k: string) => { const v = q[k]; return Array.isArray(v) ? v[0] : v }
  const l = one('lang')
  const lang = (l && LANGS.has(l) ? l : 'ru') as Lang
  const ids = (one('a') ?? '').split(',').map(s => s.trim()).filter(s => /^[a-z0-9_-]{1,40}$/.test(s)).slice(0, 30)
  return <VillaDetail slug={slug} lang={lang} report={{ ids, autoPrint: one('print') === '1' }} />
}
