import { NextResponse } from 'next/server'
import { getSiteUser } from '@/lib/site-auth'
import { parseDraft } from '@/lib/agent-listings/validate'
import { unitFacts } from '@/lib/agent-listings/catalog'
import {
  createListing, listByAuthor, isTrustedAuthor, getAgentContact,
} from '@/lib/agent-listings/store'
import { notifyNewListing } from '@/lib/agent-listings/notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSiteUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({ listings: await listByAuthor(user.telegramId) })
}

export async function POST(req: Request) {
  const user = await getSiteUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 }) }

  const parsed = parseDraft(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const draft = parsed.draft

  // Юнит выбран из каталога — факты и фото берём оттуда, а не с формы:
  // агент управляет только ценой и комментарием, остальное должно совпадать
  // с карточкой каталога, иначе на сайте появятся два разных описания
  // одного и того же юнита.
  if (draft.baseUnitId) {
    const facts = await unitFacts(draft.kind, draft.baseUnitId)
    if (!facts) return NextResponse.json({ error: 'Юнит не найден в каталоге' }, { status: 400 })
    draft.data = { ...facts.data, ...draft.data }
    if (draft.photos.length === 0) draft.photos = facts.photos
    if (!draft.title || draft.title.length < 4) draft.title = facts.title
  }

  const autoApprove = await isTrustedAuthor(user.telegramId)
  const listing = await createListing(user.telegramId, draft, { autoApprove })
  if (!listing) return NextResponse.json({ error: 'Не удалось сохранить объект' }, { status: 500 })

  // Уведомление админу — с кнопками, пока объект ждёт проверки.
  if (!autoApprove) {
    await notifyNewListing(listing, await getAgentContact(user.telegramId))
  }

  return NextResponse.json({ slug: listing.slug, status: listing.status })
}
