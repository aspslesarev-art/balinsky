-- 051 — keep bali_places.bucket in sync automatically.
--
-- Migration 049 backfilled the column once, which meant every later sweep left
-- its new places with bucket = null — invisible to refresh_listing_surroundings()
-- (it filters `bucket <> 'other'`), so fresh venues would silently never show up
-- next to a listing. A trigger removes that footgun.

create or replace function public.bali_places_set_bucket()
returns trigger
language plpgsql as $fn$
begin
  new.bucket := public.place_bucket(new.types, new.name);
  return new;
end $fn$;

drop trigger if exists bali_places_bucket_trg on public.bali_places;
create trigger bali_places_bucket_trg
  before insert or update of types, name on public.bali_places
  for each row execute function public.bali_places_set_bucket();

-- Catch up whatever landed between 049 and this trigger.
update public.bali_places
   set bucket = public.place_bucket(types, name)
 where bucket is null
    or bucket is distinct from public.place_bucket(types, name);
