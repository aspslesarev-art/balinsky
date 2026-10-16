-- «Для жизни»: насколько удобно жить в объекте — школа, пляж, врачи, магазин,
-- тишина (lib/living.ts). Страница объекта считает это сама; каталог берёт
-- отсюда, чтобы сортировать фильтр «Для жизни» и писать на карточке
-- «школа 1,2 км · пляж 0,8 км». Пишет scripts/build-listing-living.ts.
create table if not exists public.listing_living (
  kind         text not null check (kind in ('villa', 'apartment')),
  airtable_id  text not null,
  tone         text not null check (tone in ('plus', 'warn', 'minus')),
  score        int  not null,
  school_km    numeric,
  beach_km     numeric,
  health_km    numeric,
  shop_km      numeric,
  loud_500m    int,
  computed_at  timestamptz not null default now(),
  primary key (kind, airtable_id)
);
alter table public.listing_living enable row level security;
revoke all on public.listing_living from anon, authenticated;
grant select, insert, update, delete on public.listing_living to service_role;
