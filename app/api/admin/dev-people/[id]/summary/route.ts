import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { AiCapReached, AiDisabled, summarizePersonChat } from '@/lib/dev-crm/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Запрос к модели на длинном диалоге не укладывается в дефолтные 10 с.
export const maxDuration = 60

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })
  try {
    const { data: person, error } = await sb
      .from('dev_people')
      .select('id,name,partner_id,tg_chat_id,ai_last_message_id')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!person) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    if (person.tg_chat_id == null) return NextResponse.json({ ok: false, error: 'no_chat' }, { status: 400 })

    const { data: partner } = await sb.from('dev_partners').select('name').eq('id', person.partner_id).maybeSingle()

    // force: кнопку жмут руками, значит разбор нужен даже если новых
    // сообщений нет — иначе нажатие выглядит как «ничего не произошло».
    const summary = await summarizePersonChat(
      { ...person, company: partner?.name ?? '—' },
      { force: true },
    )
    return NextResponse.json({ ok: true, summary })
  } catch (e) {
    if (e instanceof AiDisabled) return NextResponse.json({ ok: false, error: 'ai_disabled' }, { status: 503 })
    if (e instanceof AiCapReached) {
      return NextResponse.json({ ok: false, error: 'cap_reached', message: e.message }, { status: 429 })
    }
    console.error('[dev-crm] summary', e)
    return NextResponse.json({ ok: false, error: 'ai_failed' }, { status: 502 })
  }
}
