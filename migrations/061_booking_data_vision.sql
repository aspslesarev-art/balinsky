-- Vision-разбор фотографий листингов краткосрочной аренды (booking_data_*).
-- Назначение: получить из фото объективные признаки дизайна/отделки/вида,
-- чтобы считать «за что рынок платит» и сравнивать проекты застройщиков
-- с реальными арендными конкурентами не только по цене, но и по продукту.

create table if not exists public.booking_data_vision (
  id            bigint primary key,
  vision        jsonb  not null,
  model         text   not null,
  photos_used   int    not null default 0,
  analyzed_at   timestamptz not null default now()
);

create index if not exists booking_data_vision_gin
  on public.booking_data_vision using gin (vision jsonb_path_ops);

alter table public.booking_data_vision enable row level security;

do $$ begin
  create policy booking_data_vision_read on public.booking_data_vision
    for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;

grant select on public.booking_data_vision to anon, authenticated;
grant all    on public.booking_data_vision to service_role;

-- Очередь на анализ: только Бали, только карточки с ≥3 фото, ещё не разобранные.
-- modelable = есть загрузка И цена, т.е. строку можно использовать в модели «фичи → деньги».
create or replace view public.booking_data_vision_todo as
select c.id,
       x.images,
       c.unit_kind,
       c.bedrooms,
       (l.occupancy is not null and (l.price is not null or c.min_price is not null)) as modelable
from public.booking_data_cards c
join public.booking_data_locations l on l.id = c.id
left join public.booking_data_vision v on v.id = c.id
cross join lateral (
  select case when left(c.raw->>'images', 1) = '[' then (c.raw->>'images')::jsonb end as images
) x
where v.id is null
  and x.images is not null
  and jsonb_array_length(x.images) >= 3
  and l.lat between -9.3 and -8.0
  and l.lng between 114.3 and 115.8;

revoke all on public.booking_data_vision_todo from anon, authenticated;
grant select on public.booking_data_vision_todo to service_role;
