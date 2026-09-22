import { NextResponse } from 'next/server'
import { currentAdminUsername, requireAdmin } from '@/lib/admin-auth'
import {
  chatMeetings, chatTail, deletePartner, getPartner, listAllChats, listNotes,
  listPartnerNames, mergePartners, siteFacts, updatePartner,
} from '@/lib/dev-crm/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Карточка целиком: компания, её люди, лента, хвосты переписок по
// каждому привязанному человеку, встречи и список чатов для привязки.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })
  try {
    const partner = await getPartner(id)
    if (!partner) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })

    const linked = partner.people.filter(p => p.tg_chat_id != null)
    const [notes, chats, names, facts, tails] = await Promise.all([
      listNotes(id),
      listAllChats(),
      listPartnerNames(),
      partner.site_developer_key ? siteFacts([partner.site_developer_key]) : Promise.resolve(new Map()),
      Promise.all(linked.map(async p => ({
        person_id: p.id,
        messages: await chatTail(p.tg_chat_id!),
        meetings: await chatMeetings(p.tg_chat_id!),
      }))),
    ])

    return NextResponse.json({
      ok: true,
      partner,
      notes,
      chats,
      // Для ручной склейки из карточки: имена без людей и переписок.
      partners: names.filter(n => n.id !== id),
      site: partner.site_developer_key ? (facts.get(partner.site_developer_key) ?? null) : null,
      tails,
    })
  } catch (e) {
    console.error('[dev-crm] get', e)
    return NextResponse.json({ ok: false, error: 'load_failed' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })
  const author = await currentAdminUsername()
  try {
    const body = await req.json() as Record<string, unknown>

    // Ручная склейка идёт своим путём: она переносит людей и заметки и
    // удаляет вторую карточку, а не правит поле.
    if (typeof body.merge_with === 'string') {
      if (!UUID.test(body.merge_with)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })
      await mergePartners(id, body.merge_with, author)
      const partner = await getPartner(id)
      return NextResponse.json({ ok: true, partner })
    }

    const partner = await updatePartner(id, body, author)
    return NextResponse.json({ ok: true, partner })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'nothing_to_update') return NextResponse.json({ ok: false, error: msg }, { status: 400 })
    if (msg === 'same_partner' || msg === 'partner_not_found') {
      return NextResponse.json({ ok: false, error: msg }, { status: 400 })
    }
    console.error('[dev-crm] patch', e)
    return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })
  try {
    await deletePartner(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[dev-crm] delete', e)
    return NextResponse.json({ ok: false, error: 'delete_failed' }, { status: 500 })
  }
}
