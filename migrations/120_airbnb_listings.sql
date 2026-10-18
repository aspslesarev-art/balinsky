-- Каталог Airbnb по Бали (~/apps/airbnb-occupancy на сервере, 18.10).
-- discover.mjs: поиск по карте плитками → строка с данными из выдачи (search_*).
-- details.mjs: страница объекта без отрисовки → спальни, удобства, фото, хозяин, рейтинги.
-- Календари (что свободно/занято) живут в SQLite на сервере, сюда — только итоги.

create table if not exists public.airbnb_listings (
  id bigint primary key,               -- id объявления (airbnb.com/rooms/<id>)
  title text,                          -- «Villa in Canggu»
  name text,                           -- название от хозяина
  lat double precision,                -- Airbnb размывает точку на ~100–500 м
  lng double precision,
  zone text,                           -- район рынка, ставится триггером
  room_type text,                      -- Entire home/apt | Private room | Hotel room | Shared room
  property_type text,                  -- Entire villa, Room in boutique hotel …
  bedrooms int,                        -- 0 = студия
  beds int,
  baths numeric,
  guests int,
  rating numeric,
  reviews int,
  subratings jsonb,                    -- accuracy/cleanliness/location/value…
  superhost boolean,
  host_id bigint,
  host_name text,
  host_years int,
  amenities text[],                    -- доступные удобства (названия Airbnb)
  amenity_groups jsonb,                -- [{group, items[]}] как на сайте
  photos jsonb,                        -- [{url, caption, room}] — room из «Фото-тура»
  n_photos int,
  description text,
  house_rules text[],
  search_price text,                   -- цена из выдачи, как показана («$475 for 5 nights»)
  first_seen date not null default (now() at time zone 'Asia/Makassar')::date,
  last_seen date not null default (now() at time zone 'Asia/Makassar')::date,
  details_at timestamptz,
  details_error text,
  updated_at timestamptz not null default now()
);
create index if not exists airbnb_listings_zone on public.airbnb_listings (zone);
create index if not exists airbnb_listings_details_todo on public.airbnb_listings (details_at nulls first);

create or replace function public.airbnb_set_zone() returns trigger language plpgsql as $$
begin
  if new.lat is not null and (tg_op = 'INSERT' or new.lat is distinct from old.lat or new.lng is distinct from old.lng) then
    new.zone := booking_zone(new.lat, new.lng);
  end if;
  return new;
end $$;
drop trigger if exists airbnb_set_zone on public.airbnb_listings;
create trigger airbnb_set_zone before insert or update of lat, lng on public.airbnb_listings
  for each row execute function public.airbnb_set_zone();

-- Плитки поиска: сколько объявлений Airbnb насчитал в квадрате и сколько мы забрали.
create table if not exists public.airbnb_tiles (
  run_date date not null,
  ne_lat double precision not null, ne_lng double precision not null,
  sw_lat double precision not null, sw_lng double precision not null,
  reported int,                        -- «N homes within map area»
  collected int,
  primary key (run_date, ne_lat, ne_lng, sw_lat, sw_lng)
);

alter table public.airbnb_listings enable row level security;
alter table public.airbnb_tiles enable row level security;
grant select, insert, update, delete on public.airbnb_listings, public.airbnb_tiles to service_role;
