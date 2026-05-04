import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export type ReservationStatus =
  | 'pending'        // visitor submitted; waiting for operator to confirm in Telegram
  | 'confirmed'      // operator tapped ✅ — listing now shows "Reserved" banner
  | 'invoice_sent'   // operator emailed the invoice
  | 'paid'           // deposit received
  | 'cancelled'
  | 'expired'
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

// "Reserved" badge / detail-page banner only shows AFTER the operator has
// tapped ✅ in Telegram — pending reservations are invisible to the public
// so two visitors can keep submitting until one gets confirmed.
const ACTIVE_STATUSES: ReadonlySet<ReservationStatus> = new Set(['confirmed', 'invoice_sent', 'paid'])

export function isActive(r: Pick<Reservation, 'status' | 'expires_at'>): boolean {
  if (!ACTIVE_STATUSES.has(r.status)) return false
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
    .in('status', ['confirmed', 'invoice_sent', 'paid'])
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
    .in('status', ['confirmed', 'invoice_sent', 'paid'])
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
