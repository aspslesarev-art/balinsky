-- Своя ежедневная загрузка Booking по Бали (сборщик ~/booking-occupancy, сервер smarthouse, 12:00 WITA).
-- Календарь Booking не отличает бронь от блока хозяина, поэтому бронью считаем только ночь,
-- которую хоть раз видели свободной, а потом она закрылась (ever_open and not last_open).

-- Объекты, которые можно отслеживать (≤40 номеров, принимают бронирования).
create table if not exists public.booking_occ_properties (
  id bigint primary key,               -- id estatemarket (= booking_data_cards.id)
  hotel_id bigint,                     -- id объекта на Booking
  slug text not null,
  unit_kind text,
  mode text not null check (mode in ('single', 'multi')), -- single: 1 юнит, календарь; multi: номера со страницы
  rooms_est int,                       -- оценка числа номеров (растёт по мере наблюдений)
  lat double precision,
  lng double precision,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Одиночные юниты: состояние каждой ночи (60 дней вперёд, обновляется ежедневно).
create table if not exists public.booking_occ_nights (
  property_id bigint not null references public.booking_occ_properties(id) on delete cascade,
  night date not null,
  first_seen date not null,
  ever_open boolean not null,          -- хоть раз была свободна
  last_open boolean not null,          -- свободна по последнему снимку
  price_usd int,                       -- последняя цена, когда ночь была свободна
  closed_on date,                      -- когда закрылась (дата брони)
  primary key (property_id, night)
);
create index if not exists booking_occ_nights_night on public.booking_occ_nights (night);

-- Многономерные: свободные номера на сегодняшнюю ночь по каждому типу.
create table if not exists public.booking_occ_rooms_tonight (
  run_date date not null,
  property_id bigint not null references public.booking_occ_properties(id) on delete cascade,
  free_rooms int not null,
  by_room jsonb not null default '{}',  -- {room_id: свободно}
  rooms_est int,
  primary key (run_date, property_id)
);

-- Журнал прогонов.
create table if not exists public.booking_occ_runs (
  run_date date primary key,
  started_at timestamptz,
  finished_at timestamptz,
  singles int, multis int, errors int,
  note text
);

alter table public.booking_occ_properties enable row level security;
alter table public.booking_occ_nights enable row level security;
alter table public.booking_occ_rooms_tonight enable row level security;
alter table public.booking_occ_runs enable row level security;
grant select, insert, update, delete on public.booking_occ_properties, public.booking_occ_nights,
  public.booking_occ_rooms_tonight, public.booking_occ_runs to service_role;

-- Загрузка по ночам: одиночные юниты. booked = была свободна и закрылась; blocked = ни разу не видели свободной.
create or replace view public.booking_occ_single_daily as
select n.night, booking_zone(p.lat, p.lng) as zone, p.unit_kind,
  count(*) filter (where not n.last_open and n.ever_open) as booked,
  count(*) filter (where n.last_open) as free,
  count(*) filter (where not n.last_open and not n.ever_open) as blocked,
  round(100.0 * count(*) filter (where not n.last_open and n.ever_open)
    / nullif(count(*) filter (where n.ever_open), 0), 1) as occupancy_pct,
  percentile_cont(0.5) within group (order by n.price_usd) as median_price_usd
from public.booking_occ_nights n
join public.booking_occ_properties p on p.id = n.property_id
group by 1, 2, 3;

-- Загрузка по ночам: многономерные объекты (1 - свободно / всего номеров).
create or replace view public.booking_occ_multi_daily as
select t.run_date as night, booking_zone(p.lat, p.lng) as zone, p.unit_kind,
  count(*) as properties,
  sum(t.rooms_est) as rooms,
  sum(t.free_rooms) as free_rooms,
  round(100.0 * (1 - sum(t.free_rooms)::numeric / nullif(sum(t.rooms_est), 0)), 1) as occupancy_pct
from public.booking_occ_rooms_tonight t
join public.booking_occ_properties p on p.id = t.property_id
group by 1, 2, 3;
grant select on public.booking_occ_single_daily, public.booking_occ_multi_daily to service_role;
