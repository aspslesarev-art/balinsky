// Разрешение открыть 3D-карту Google. Клиент зовёт его перед загрузкой
// карты: каждое открытие платное сверх бесплатного месячного объёма, и
// суточный лимит (lib/map3d-quota.ts) держит счёт на нуле. Ботов не считаем
// и не пускаем — им карта не нужна, а лимит они бы выбрали.

import { NextResponse } from 'next/server'
import { consumeMap3dOpen } from '@/lib/map3d-quota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse/i

export async function POST(req: Request) {
  if (BOT_UA.test(req.headers.get('user-agent') ?? '')) {
    return NextResponse.json({ allowed: false }, { status: 403 })
  }
  const { allowed } = await consumeMap3dOpen()
  return NextResponse.json({ allowed }, { headers: { 'Cache-Control': 'no-store' } })
}
