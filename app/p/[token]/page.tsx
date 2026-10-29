import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getSessionTelegramId } from '@/lib/site-auth'
import { getByToken, listItems, publicAgent } from '@/lib/collections'
import { computeYieldFacts, loadVerdictSnapshot } from '@/lib/listing-verdict'
import { ClientCollection, type ClientItem } from '@/components/collections/ClientCollection'
import { anonListingTitle } from '@/lib/listing-title'
import { clientCopy, districtFor, resolveClientLang, statusFor } from '@/lib/collections-copy'
import { permitLabel } from '@/components/presentation-copy'

// Подборка агента для клиента по личной ссылке, без входа. Экраны 5–8 макета
// https://claude.ai/artifact/TEUDdpFWhCUY4aDcWN3N5K. Сверху агент и его
// контакты, ниже объекты с заметками и сравнение. Контактов застройщиков нет.
// Язык — по настройкам телефона клиента (или ?lang=), валюта — по стране.

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const found = await getByToken((await params).token).catch(() => null)
  const lang = resolveClientLang((await searchParams).lang, (await headers()).get('accept-language'))
  const c = clientCopy(lang)
  return {
    title: found?.collection.active ? `${found.collection.title} | ${c.collection} · Bali` : c.collection,
    robots: { index: false, follow: false },
  }
}

export default async function Page({ params, searchParams }: Params) {
  const { token } = await params
  const q = await searchParams
  const lang = resolveClientLang(q.lang, (await headers()).get('accept-language'))
  const c = clientCopy(lang)
  const found = await getByToken(token)
  if (!found) notFound()
  const agent = await publicAgent(found.owner)
  if (!found.collection.active) {
    return (
      <main lang={lang} className="mx-auto flex min-h-[70vh] w-full max-w-[560px] flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-[24px] font-semibold tracking-tight">{c.closedTitle}</h1>
        <p className="text-[15px] leading-relaxed text-[var(--color-text-muted)]">{c.closedSub(agent.name)}</p>
      </main>
    )
  }
  const items = await listItems(found.collection.id)
  // Агент смотрит свою подборку — в историю открытий это не пишем.
  const viewer = await getSessionTelegramId()
  const track = viewer !== found.owner && q.preview !== '1'
  // Доходность для сравнения — тот же расчёт, что на странице объекта (до налогов).
  const yields = await Promise.all(items.map(it => it.snapshot.id
    ? loadVerdictSnapshot(it.snapshot.id, it.kind).then(computeYieldFacts).then(y => y?.pct.beforeTax ?? null).catch(() => null)
    : Promise.resolve(null)))
  // Клиенту — ни названия комплекса, ни адреса объекта на сайте: заголовок из
  // района, площади и спален, ссылка — по номеру в подборке.
  const shown: ClientItem[] = items.map((it, i) => {
    const s = it.snapshot
    const district = districtFor(s.district, lang)
    return {
      n: i + 1,
      kind: it.kind,
      title: anonListingTitle({ kind: it.kind, district, area: s.area, bedrooms: s.bedrooms != null ? String(s.bedrooms) : null, lang }),
      photo: s.photo,
      priceUsd: s.priceUsd,
      leaseYears: s.leaseYears,
      status: statusFor(s.status, lang),
      note: it.note,
      district,
      bedrooms: s.bedrooms,
      area: s.area,
      land: s.land ?? null,
      permit: permitLabel(s.permit ?? null, lang),
      pricePerSqmUsd: s.pricePerSqmUsd ?? (s.priceUsd && s.area ? Math.round(s.priceUsd / s.area) : null),
      yieldPct: yields[i],
    }
  })
  return <ClientCollection token={token} lang={lang} title={found.collection.title} intro={found.collection.intro} items={shown} agent={agent} track={track} />
}
