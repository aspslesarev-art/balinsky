import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export type ReservationStatus = 'pending' | 'invoice_sent' | 'paid' | 'cancelled' | 'expired'
export type ListingKind = 'villa' | 'apartment'

export type Reservation = {
  id: string
  listing_kind: ListingKind
  listing_id: string
  listing_slug: string
  listing_title: string | null
  listing_price_usd: number | null
  contact_name: string
  contact_email: string
  contact_phone: string
  status: ReservationStatus
  expires_at: string
  created_at: string
  updated_at: string
  internal_notes: string | null
}

// "Reserved" badge / detail-page banner shows when there's any non-final
// reservation that hasn't expired. Cancelled / expired don't count.
export function isActive(r: Pick<Reservation, 'status' | 'expires_at'>): boolean {
  if (r.status === 'cancelled' || r.status === 'expired') return false
  return new Date(r.expires_at).getTime() > Date.now()
}

// Returns the most-recent active reservation for one listing, or null.
// Used by detail pages — `await` once per page render.
export async function findActiveReservation(
  kind: ListingKind, listingId: string,
): Promise<Reservation | null> {
  const { data } = await sb
    .from('reservations')
    .select('*')
    .eq('listing_kind', kind)
    .eq('listing_id', listingId)
    .in('status', ['pending', 'invoice_sent', 'paid'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data ?? null) as Reservation | null
}

// Bulk variant for catalog cards — one query covers a whole page of
// listings. Returns a Map<listing_id, Reservation> for the active ones.
export async function findActiveReservationsByIds(
  kind: ListingKind, ids: string[],
): Promise<Map<string, Reservation>> {
  const out = new Map<string, Reservation>()
  if (ids.length === 0) return out
  const { data } = await sb
    .from('reservations')
    .select('*')
    .eq('listing_kind', kind)
    .in('listing_id', ids)
    .in('status', ['pending', 'invoice_sent', 'paid'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  for (const r of (data ?? []) as Reservation[]) {
    if (!out.has(r.listing_id)) out.set(r.listing_id, r)
  }
  return out
}

// Admin list — newest first regardless of status. Filters live in the
// admin UI, not here.
export async function listAllReservations(): Promise<Reservation[]> {
  const { data } = await sb
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  return (data ?? []) as Reservation[]
}
