import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { VillaDetail } from '@/app/ru/villy/o/[slug]/_detail'
import { ApartmentDetail } from '@/app/ru/apartamenty/o/[slug]/_detail'
import { getByToken, listItems, publicAgent } from '@/lib/collections'
import { PDF_BLOCKS } from '@/lib/pdf-blocks'

// Объект из подборки для клиента — та же презентация, что PDF для Pro, но без
// названия комплекса, застройщика и описания (их клиенту знать не нужно). В
// адресе — номер в подборке, а не адрес объекта на сайте: по нему не найти
// комплекс. С телефона — вертикальные листы.

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Объект из подборки', robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ token: string; n: string }> }) {
  const { token, n } = await params
  const idx = /^\d{1,3}$/.test(n) ? Number(n) - 1 : -1
  const found = await getByToken(token)
  if (!found || !found.collection.active || idx < 0) notFound()
  const items = await listItems(found.collection.id)
  const it = items[idx]
  if (!it) notFound()
  const agent = await publicAgent(found.owner)
  const ua = (await headers()).get('user-agent') ?? ''
  const pdf = {
    blocks: PDF_BLOCKS.filter(b => b !== 'about'),
    agent: agent.username || agent.phone ? { name: agent.name, telegram: agent.username ? `@${agent.username}` : '', whatsapp: agent.phone ?? '' } : null,
    calc: null,
    autoPrint: false,
    portrait: /iPhone|iPod|Android.+Mobile/.test(ua),
    anon: true,
    back: `/p/${token}`,
  }
  return it.kind === 'villa'
    ? <VillaDetail slug={it.slug} lang="ru" pdf={pdf} />
    : <ApartmentDetail slug={it.slug} lang="ru" pdf={pdf} />
}
