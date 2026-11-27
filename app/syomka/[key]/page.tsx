import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isSyomkaKey } from '@/lib/syomka/access'
import { isStage, isType } from '@/lib/syomka/scenario'
import { SyomkaClient } from './_client'

// Пошаговая съёмка видеообзора: выбрал тип и этап — получил 15 кадров
// с рисунками и галочками. Открывается только по секретной ссылке
// (lib/syomka/access.ts), чужим — обычная 404.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Съёмка объекта',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
}

export default async function SyomkaPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>
  searchParams: Promise<{ t?: string; s?: string; cam?: string }>
}) {
  const { key } = await params
  if (!isSyomkaKey(key)) notFound()
  const sp = await searchParams
  const t = sp.t && isType(sp.t) ? sp.t : null
  const s = sp.s && isStage(sp.s) ? sp.s : null
  return <SyomkaClient apiKey={key} initialCam={sp.cam === '1'} initialType={t} initialStage={t ? s : null} />
}
