'use server'

// Pro-аналитика объектов отдаётся только с сервера и только тому, у кого
// владелец открыл Pro (владелец 24.11.2026). Раньше блоки лежали в общей
// ISR-копии страницы и прятались CSS-меткой data-pro — любой сборщик
// забирал их из кода страницы. Теперь в общей копии их нет, а браузер с
// Pro просит их отдельно (components/ProLazy.tsx), сервер проверяет сессию.
import type { ReactNode } from 'react'
import { isProSession } from '@/lib/site-auth'
import type { Lang } from '@/lib/i18n'
import { VillaDetail } from '@/app/ru/villy/o/[slug]/_detail'
import { ApartmentDetail } from '@/app/ru/apartamenty/o/[slug]/_detail'
import { ComplexDetail } from '@/app/ru/zhilye-kompleksy/o/[slug]/_detail'

export type ProKind = 'villa' | 'apartment' | 'complex'
export type ProPart = 'panel' | 'legal'

const LANGS = new Set<Lang>(['ru', 'en', 'id', 'fr', 'de', 'zh', 'nl', 'ban', 'pl', 'uk'])
const SLUG = /^[a-z0-9-]{1,200}$/

export async function loadProPart(kind: ProKind, slug: string, lang: Lang, part: ProPart): Promise<ReactNode> {
  if (!SLUG.test(slug) || !LANGS.has(lang)) return null
  if (part !== 'panel' && part !== 'legal') return null
  if (!(await isProSession())) return null
  if (kind === 'villa') return <VillaDetail slug={slug} lang={lang} proPart={part} />
  if (part !== 'panel') return null
  if (kind === 'apartment') return <ApartmentDetail slug={slug} lang={lang} proPart="panel" />
  if (kind === 'complex') return <ComplexDetail slug={slug} lang={lang} proPart="panel" />
  return null
}
