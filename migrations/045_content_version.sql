-- Per-kind content revision counter.
--
-- The catalog loaders keep large derived datasets in MODULE-LEVEL caches
-- (app/ru/*/_lib.ts) because unstable_cache can't hold them — villa rows blow
-- past the 2 MB per-item limit. Module memory is unreachable from
-- revalidateTag/revalidatePath, so an admin edit stayed invisible until the
-- 10-minute TTL lapsed on every warm Vercel instance.
--
-- This table is the shared flush signal: an admin mutation bumps `rev`, and
-- the loaders drop their in-process cache as soon as they see a new number.
-- One tiny row per kind; loaders read the whole table (11 rows) at most twice
-- a minute per instance, so the egress cost is negligible.

create table if not exists public.content_version (
  kind       text primary key,
  rev        bigint      not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.content_version enable row level security;

-- Server-side only: the site reads it with the service key, browsers never do.
revoke all on public.content_version from anon, authenticated;
grant select, insert, update on public.content_version to service_role;

-- Atomic bump — avoids a read-modify-write race when two edits land together.
create or replace function public.bump_content_version(p_kind text)
returns bigint
language sql
security definer
set search_path = public
as $$
  insert into public.content_version (kind, rev, updated_at)
       values (p_kind, 1, now())
  on conflict (kind) do update
          set rev = public.content_version.rev + 1,
              updated_at = now()
    returning rev;
$$;

grant execute on function public.bump_content_version(text) to service_role;

insert into public.content_version (kind)
     values ('villas'), ('apartments'), ('complexes'), ('developers'),
            ('news'), ('events'), ('promo'), ('knowledge'), ('rental'),
            ('managers'), ('videos')
on conflict (kind) do nothing;
