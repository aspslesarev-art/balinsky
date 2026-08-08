-- Vision-разбор НАШЕГО каталога (виллы/апартаменты/ЖК) тем же словарём, что и
-- рынок аренды в 061. Живёт в БД, а не только в Storage-манифесте, ровно для
-- одного: чтобы джойниться с listing_geo и booking_market_relative и отвечать
-- на вопрос «что строят застройщики против того, за что рынок платит».

create table if not exists public.catalog_product_vision (
  kind         text not null check (kind in ('villa', 'apartment', 'complex')),
  airtable_id  text not null,
  vision       jsonb not null,
  model        text not null,
  photos_used  int not null default 0,
  analyzed_at  timestamptz not null default now(),
  primary key (kind, airtable_id)
);

create index if not exists catalog_product_vision_gin
  on public.catalog_product_vision using gin (vision jsonb_path_ops);

alter table public.catalog_product_vision enable row level security;

do $$ begin
  create policy catalog_product_vision_read on public.catalog_product_vision
    for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;

grant select on public.catalog_product_vision to anon, authenticated;
grant all    on public.catalog_product_vision to service_role;

-- Объект каталога + его зона: вторая половина сравнения с рынком аренды.
create or replace view public.catalog_product_zone as
select v.kind,
       v.airtable_id,
       g.lat,
       g.lng,
       public.booking_zone(g.lat, g.lng) as zone,
       v.vision
from public.catalog_product_vision v
join public.listing_geo g
  on g.kind = v.kind and g.airtable_id = v.airtable_id;

grant select on public.catalog_product_zone to service_role;
