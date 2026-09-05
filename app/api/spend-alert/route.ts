import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { sendAdminAlert } from '@/lib/admin-alert'

// Vercel Spend Management webhook -> Telegram.
//
// Wired into Team Settings -> Billing -> Spend Management -> Webhook, with
// `?key=${CRON_SECRET}` on the URL (that panel has no signing secret of its
// own, so the shared cron secret guards it). Vercel POSTs here when the
// on-demand budget threshold is reached; notifications also fire by email at
// 50/75/100% of the budget, so this is the "money is actually moving" alarm
// rather than the first hint.
//
// Deliberately never 500s on a bad payload: a webhook that errors gets retried
// and then dropped, and a dropped spend alarm is the failure we are avoiding.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function keyOk(req: Request): boolean {
  const expected = process.env.CRON_SECRET ?? ''
  const got = new URL(req.url).searchParams.get('key') ?? ''
  if (!expected || expected.length !== got.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got))
}

export async function POST(req: Request) {
  if (!keyOk(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const raw = await req.text().catch(() => '')
  let detail = raw.slice(0, 600)
  try {
    const parsed = JSON.parse(raw)
    detail = JSON.stringify(parsed, null, 2).slice(0, 600)
  } catch {
    // Keep the raw body: an unparseable payload still has to reach the phone.
  }

  await sendAdminAlert(
    '\u{1F6A8} VERCEL: достигнут потолок трат\n\n'
    + 'On-demand бюджет команды исчерпан. Продакшн-деплойменты ставятся на паузу '
    + '(Pause Projects включён), сайт станет недоступен, пока лимит не поднят.\n\n'
    + 'Биллинг: https://vercel.com/teams/aspslesarev-arts-projects/settings/billing\n'
    + 'Расход по проектам: https://vercel.com/aspslesarev-arts-projects/~/observability\n\n'
    + `Payload:\n${detail}`
  )

  return NextResponse.json({ ok: true })
}
