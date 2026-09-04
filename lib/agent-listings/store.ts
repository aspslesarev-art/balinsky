import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { AgentContact, AgentListing, ListingDraft, ListingStatus } from './types'
import { listingSlug } from './slug'

// Чтение и запись объектов агентов. Всё через service key на сервере —
// таблица под RLS без политик, как login_tokens и market_access.

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const TABLE = 'agent_listings'

// Новой таблице Supabase не выдаёт права service_role автоматически, а
// PostgREST отвечает на это обычной ошибкой в теле ответа — без лога такой
// отказ выглядит как «объектов просто нет». Поэтому каждая ошибка чтения
// проговаривается вслух.
function logError(where: string, error: { message: string } | null): void {
  if (error) console.error(`[agent-listings] ${where}: ${error.message}`)
}

type Row = {
  id: string
  slug: string
  author_id: number | string
  kind: string
  complex_id: string | null
  base_unit_id: string | null
  title: string
  price_usd: number | string
  comment: string | null
  data: Record<string, unknown> | null
  photos: string[] | null
  status: string
  reject_reason: string | null
  created_at: string
  updated_at: string
  approved_at: string | null
}

function toListing(r: Row): AgentListing {
  return {
    id: r.id,
    slug: r.slug,
    authorId: Number(r.author_id),
    kind: r.kind === 'apartment' ? 'apartment' : 'villa',
    complexId: r.complex_id,
    baseUnitId: r.base_unit_id,
    title: r.title,
    priceUsd: Number(r.price_usd),
    comment: r.comment,
    data: r.data ?? {},
    photos: r.photos ?? [],
    status: (r.status as ListingStatus) ?? 'pending',
    rejectReason: r.reject_reason,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    approvedAt: r.approved_at,
  }
}

export async function getListingBySlug(slug: string): Promise<AgentListing | null> {
  const { data, error } = await sb.from(TABLE).select('*').eq('slug', slug).maybeSingle()
  logError('getListingBySlug', error)
  if (error || !data) return null
  return toListing(data as Row)
}

export async function listByAuthor(authorId: number): Promise<AgentListing[]> {
  const { data, error } = await sb.from(TABLE).select('*')
    .eq('author_id', authorId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
  logError('listByAuthor', error)
  return ((data ?? []) as Row[]).map(toListing)
}

export async function listByStatus(status: ListingStatus, limit = 200): Promise<AgentListing[]> {
  const { data, error } = await sb.from(TABLE).select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)
  logError('listByStatus', error)
  return ((data ?? []) as Row[]).map(toListing)
}

/** Одобренные предложения по конкретному юниту каталога — для блока на его карточке. */
export async function listApprovedForUnit(baseUnitId: string): Promise<AgentListing[]> {
  const { data } = await sb.from(TABLE).select('*')
    .eq('base_unit_id', baseUnitId)
    .eq('status', 'approved')
    .order('price_usd', { ascending: true })
  return ((data ?? []) as Row[]).map(toListing)
}

export async function countByAuthor(authorId: number): Promise<number> {
  const { count } = await sb.from(TABLE).select('id', { count: 'exact', head: true })
    .eq('author_id', authorId)
  return count ?? 0
}

/**
 * Создаёт объект. Доверенный автор публикуется сразу, новичок уходит в
 * очередь проверки — но и его страница уже доступна по прямой ссылке,
 * просто под noindex и вне каталога.
 */
export async function createListing(
  authorId: number,
  draft: ListingDraft,
  opts: { autoApprove: boolean },
): Promise<AgentListing | null> {
  const id = crypto.randomUUID()
  const status: ListingStatus = opts.autoApprove ? 'approved' : 'pending'
  const { data, error } = await sb.from(TABLE).insert({
    id,
    slug: listingSlug(draft.title, id),
    author_id: authorId,
    kind: draft.kind,
    complex_id: draft.complexId,
    base_unit_id: draft.baseUnitId,
    title: draft.title,
    price_usd: draft.priceUsd,
    comment: draft.comment,
    data: draft.data,
    photos: draft.photos,
    status,
    approved_at: opts.autoApprove ? new Date().toISOString() : null,
  }).select('*').maybeSingle()
  logError('createListing', error)
  if (error || !data) return null
  return toListing(data as Row)
}

/** Правка автором. Одобренный объект после правки цены/текста остаётся одобренным —
 *  переспрашивать модерацию на смену цены значит сделать инструмент бесполезным. */
export async function updateListing(
  id: string,
  authorId: number,
  patch: { priceUsd?: number; comment?: string | null; photos?: string[]; data?: Record<string, unknown> },
): Promise<boolean> {
  const { error } = await sb.from(TABLE).update({
    ...(patch.priceUsd !== undefined ? { price_usd: patch.priceUsd } : {}),
    ...(patch.comment !== undefined ? { comment: patch.comment } : {}),
    ...(patch.photos !== undefined ? { photos: patch.photos } : {}),
    ...(patch.data !== undefined ? { data: patch.data } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('author_id', authorId)
  return !error
}

export async function archiveListing(id: string, authorId: number): Promise<boolean> {
  const { error } = await sb.from(TABLE)
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id).eq('author_id', authorId)
  return !error
}

export async function moderateListing(
  id: string,
  decision: 'approved' | 'rejected',
  reason?: string | null,
): Promise<AgentListing | null> {
  const { data, error } = await sb.from(TABLE).update({
    status: decision,
    reject_reason: decision === 'rejected' ? (reason ?? null) : null,
    approved_at: decision === 'approved' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select('*').maybeSingle()
  if (error || !data) return null
  return toListing(data as Row)
}

// ------------------------------------------------------------- контакты

export async function getAgentContact(telegramId: number): Promise<AgentContact | null> {
  const { data } = await sb.from('site_users')
    .select('telegram_id, username, first_name, last_name, phone, agency, contact_note')
    .eq('telegram_id', telegramId)
    .maybeSingle()
  if (!data) return null
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ').trim()
  return {
    telegramId: Number(data.telegram_id),
    name: name || (data.username ? `@${data.username}` : 'Агент Balinsky'),
    username: data.username ?? null,
    phone: data.phone ?? null,
    agency: data.agency ?? null,
    note: data.contact_note ?? null,
  }
}

/** Доверенный автор публикуется без ожидания. Флаг ставится первым одобрением. */
export async function isTrustedAuthor(telegramId: number): Promise<boolean> {
  const { data } = await sb.from('site_users')
    .select('listing_trusted').eq('telegram_id', telegramId).maybeSingle()
  return data?.listing_trusted === true
}

export async function markAuthorTrusted(telegramId: number): Promise<void> {
  await sb.from('site_users').update({ listing_trusted: true }).eq('telegram_id', telegramId)
}
