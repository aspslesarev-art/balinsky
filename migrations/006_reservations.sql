-- Reservation flow stage 1 — verbal hold.
--
-- Visitor submits name + email + phone on a villa or apartment detail
-- page. We snapshot the listing (title / price / kind / slug / id) so the
-- admin sees what was reserved even if the listing later changes or is
-- removed. Status walks pending → invoice_sent → paid, plus cancelled
-- / expired side branches. expires_at defaults to 14 days; admin can
-- bump it. internal_notes is operator-only freeform.

create table if not exists public.reservations (
  id                 uuid primary key default gen_random_uuid(),
  listing_kind       text not null check (listing_kind in ('villa','apartment')),
  listing_id         text not null,
  listing_slug       text not null,
  listing_title      text,
  listing_price_usd  numeric,
  contact_name       text not null,
  contact_email      text not null,
  contact_phone      text not null,
  status             text not null default 'pending'
                     check (status in ('pending','invoice_sent','paid','cancelled','expired')),
  expires_at         timestamptz not null default (now() + interval '14 days'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  internal_notes     text
);

-- Show the most recent reservation per listing fast (for the "Reserved"
-- badge on the catalog card and the detail page).
create index if not exists reservations_listing_idx
  on public.reservations(listing_kind, listing_id, status, expires_at desc);

create index if not exists reservations_status_idx
  on public.reservations(status, created_at desc);

grant all privileges on table public.reservations to service_role;
