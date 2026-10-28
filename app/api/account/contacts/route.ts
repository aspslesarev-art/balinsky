import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionTelegramId } from '@/lib/site-auth'

// Контакты вошедшего — подставить на последний лист PDF-презентации
// (окно скачивания, components/VillaPresentation.tsx). Только свои.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function GET() {
  const id = await getSessionTelegramId()
  if (id == null) return NextResponse.json({ contacts: null })
  const { data, error } = await sb.from('site_users')
    .select('first_name, last_name, username, phone').eq('telegram_id', id).maybeSingle()
  if (error) {
    console.error('[account/contacts]', error.message)
    return NextResponse.json({ contacts: null }, { status: 500 })
  }
  const name = [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim()
  return NextResponse.json({
    contacts: data ? { name, telegram: data.username ? `@${data.username}` : '', whatsapp: data.phone ?? '' } : null,
  }, { headers: { 'cache-control': 'no-store' } })
}
