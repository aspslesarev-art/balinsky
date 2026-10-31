-- Соседи для «шанса по соседям» на Pro-карточке (владелец 31.10.2026): те же
-- тип и спальность на Booking в заданном радиусе — рядом (2 км, мало — 3 км)
-- и по округе (10 км). По каждому — медиана цены ночи и загрузки за всё
-- собранное время, а не сегодняшний снимок: цена в августе и октябре
-- отличается вдвое. История цены есть у четверти объявлений (31.10.2026:
-- 7 869 из 30 502), загрузки — почти у всех; нет истории цены — текущая.
-- Фильтры загрузки — как в booking_market_occupancy и
-- booking_occ_median (137); цена вне $10–3000 — рупии или мусор.
-- Сетевые отели не сравниваем (владелец 31.10.2026: у Кемпински цену и
-- загрузку делает бренд, а не номер): виллы и апартаменты под брендом сети
-- отсекаются по названию. Отели и курорты на Booking — отдельные unit_kind,
-- их и так нет в выборке. Список проверен на названиях 31.10.2026: общие
-- слова (karma, mulia, courtyard, capella, aman) ловили независимые виллы —
-- у таких брендов в списке полное имя (karma kandara, the mulia).
create or replace function public.booking_neighbour_perf(
  p_lat double precision, p_lng double precision, p_radius_m numeric,
  p_unit_kind text, p_bedrooms integer, p_since date
)
returns table(property_id bigint, distance_m numeric, price numeric, occupancy numeric)
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
  )
  select p.property_id, c.distance_m,
    round(coalesce(p.price_med, case when c.price between 10 and 3000 then c.price end)::numeric, 0),
    round(p.occ_med::numeric, 1)
  from per p join comps c on c.id = p.property_id
  where p.n >= 30 and not ((p.dv <= 2 and p.m >= 80) or (p.dv <= 3 and p.m >= 95))
    and p.occ_med >= 20 and coalesce(p.price_med, case when c.price between 10 and 3000 then c.price end) is not null
$$;
grant execute on function public.booking_neighbour_perf(double precision, double precision, numeric, text, integer, date) to service_role;

-- Шанс по округе 10 км и радиус, в котором набрались соседи «рядом».
alter table public.listing_yields
  add column if not exists chance_radius_m int,
  add column if not exists area_k smallint,
  add column if not exists area_n smallint;
