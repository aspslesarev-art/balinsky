-- Юнит в формате Booking (владелец 31.10.2026: «перевести каждый юнит к
-- формату Booking и Airbnb, заполнить что есть, сравнивать максимально
-- точно»). Те же поля, что у вариантов Booking в booking_room_facts: тип,
-- спальни, площадь, частный бассейн, вид на море, — плюс вид, стиль и
-- состояние из разбора наших фото (_vision.json, scripts/kb-vision.mjs).
-- Пишет scripts/build-listing-yields.ts раз в сутки; по нему подбираются
-- соседи для «шанса по соседям».
create table if not exists public.listing_profile (
  kind          text not null check (kind in ('villa', 'apartment')),
  airtable_id   text not null,
  unit_kind     text not null,           -- villa | apartment, как booking_data_cards.unit_kind
  bedrooms      smallint,
  area_m2       numeric,
  private_pool  boolean,                 -- null — не знаем
  pool_type     text,                    -- private | infinity | shared | none
  views         text[],                  -- из фото: ocean, jungle, rice_field, garden, pool, city…
  sea_view      boolean,
  style         text,
  condition     text,                    -- new | good | dated
  guests        smallint,                -- оценка, как max_persons у Booking: 2 на спальню
  coast_m       integer,
  updated_at    timestamptz not null default now(),
  primary key (kind, airtable_id)
);
alter table public.listing_profile enable row level security;
revoke all on public.listing_profile from anon, authenticated;
grant select, insert, update, delete on public.listing_profile to service_role;

-- Соседи с полями для сравнения «как у нас»: частный бассейн, площадь и вид
-- на море — у варианта с той же спальностью (нет такого — по всем вариантам).
drop function if exists public.booking_neighbour_perf(double precision, double precision, numeric, text, integer, date);
create or replace function public.booking_neighbour_perf(
  p_lat double precision, p_lng double precision, p_radius_m numeric,
  p_unit_kind text, p_bedrooms integer, p_since date
)
returns table(property_id bigint, distance_m numeric, price numeric, occupancy numeric,
              private_pool boolean, size_m2 numeric, sea_view boolean)
language sql stable set search_path = public as $$
  with comps as (
    select id, distance_m, price from public.booking_data_comps(p_lat, p_lng, p_radius_m, p_unit_kind, p_bedrooms, 5000)
    where coalesce(title, '') !~* '\m(kempinski|hilton|conrad|marriott|ritz[- ]carlton|st\.? ?regis|bulgari|bvlgari|four seasons|amandari|amankila|amanusa|mandapa|anantara|alila|hyatt|andaz|intercontinental|holiday inn|sheraton|westin|w bali|ayana|the mulia|six senses|banyan tree|capella ubud|raffles|fairmont|sofitel|pullman|novotel|swiss-?belhotel|radisson|wyndham|best western|le meridien|jumeirah|viceroy|samabe|apurva kempinski|karma kandara|club med|m[oö]venpick)\M'
  ), per as (
    select h.property_id,
      percentile_cont(0.5) within group (order by h.occupancy) occ_med,
      percentile_cont(0.5) within group (order by h.price) filter (where h.price between 10 and 3000) price_med,
      avg(h.occupancy) m, count(*) n, count(distinct round(h.occupancy)) dv
    from public.booking_data_history h join comps c on c.id = h.property_id
    where h.snapshot_date >= p_since and h.occupancy is not null
    group by 1
  ), rooms as (
    select f.property_id,
      bool_or('private_pool' = any(f.facilities)) filter (where p_bedrooms is null or f.bedrooms = p_bedrooms) pool_match,
      bool_or('private_pool' = any(f.facilities)) pool_any,
      max(f.size_m2) filter (where p_bedrooms is null or f.bedrooms = p_bedrooms) size_match,
      bool_or('sea_view' = any(f.facilities)) sea_any
    from public.booking_room_facts f join comps c on c.id = f.property_id
    group by 1
  )
  select p.property_id, c.distance_m,
    round(coalesce(p.price_med, case when c.price between 10 and 3000 then c.price end)::numeric, 0),
    round(p.occ_med::numeric, 1),
    coalesce(r.pool_match, r.pool_any), r.size_match, r.sea_any
  from per p join comps c on c.id = p.property_id
  left join rooms r on r.property_id = p.property_id
  where p.n >= 30 and not ((p.dv <= 2 and p.m >= 80) or (p.dv <= 3 and p.m >= 95))
    and p.occ_med >= 20 and coalesce(p.price_med, case when c.price between 10 and 3000 then c.price end) is not null
$$;
grant execute on function public.booking_neighbour_perf(double precision, double precision, numeric, text, integer, date) to service_role;

-- Каких соседей взяли (lib/investment/chance.ts pickSimilar): уровень
-- type → pool → pool_area и что сравнивали — тип, спальни, бассейн, площадь.
alter table public.listing_yields add column if not exists match jsonb;
