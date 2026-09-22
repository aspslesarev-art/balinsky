import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  autoLinkChatsByNick, createPartner, listMergePairs, listPartners,
} from '@/lib/dev-crm/store'
import { isProspect, isStatus } from '@/lib/dev-crm/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Доска и спорные пары одним запросом: оба списка нужны при каждом
// обновлении раздела, а данных здесь на две сотни строк. Чаты бота
// сюда НЕ кладём — их читает карточка, когда её открыли.
export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const archived = new URL(req.url).searchParams.get('archived') === '1'
  try {
    await autoLinkChatsByNick()
    const [partners, pairs] = await Promise.all([listPartners(archived), listMergePairs()])
    return NextResponse.json({ ok: true, partners, pairs })
  } catch (e) {
    console.error('[dev-crm] list', e)
    return NextResponse.json({ ok: false, error: 'load_failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  try {
    const body = await req.json() as {
      name?: string; status?: string; prospect?: string; in_work?: boolean
    }
    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 })
    const partner = await createPartner({
      name,
      status: isStatus(body.status) ? body.status : 'new',
      prospect: isProspect(body.prospect) ? body.prospect : null,
      in_work: body.in_work !== false,
      source: 'manual',
    })
    return NextResponse.json({ ok: true, partner })
  } catch (e) {
    console.error('[dev-crm] create', e)
    return NextResponse.json({ ok: false, error: 'create_failed' }, { status: 500 })
  }
}
