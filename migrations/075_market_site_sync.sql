-- Обновление цен на сайте из прайсов застройщиков.
--
-- Трекер знает цену каждого юнита, но объявление на сайте — это не юнит:
-- у него внутренний код (V00638), а не номер из шахматки, и в одном
-- комплексе бывает десяток одинаковых по площади юнитов. Угадывать пару
-- каждую ночь заново нельзя: ошибка означает неверную цену на публичной
-- странице. Поэтому пара фиксируется один раз и хранится здесь.
--
-- Автоматически заводятся только однозначные пары (в комплексе ровно один
-- юнит подходящей площади), остальные проставляются руками в админке.

create table if not exists public.market_listing_links (
  listing_kind text   not null check (listing_kind in ('villa', 'apartment')),
  -- raw_villas.airtable_id / raw_apartments.airtable_id
  listing_id   text   not null,
  unit_id      bigint not null references public.market_units (id) on delete cascade,
  confidence   text   not null check (confidence in ('area', 'manual')),
  -- Выключатель на случай, когда объявление живёт своей жизнью: скидка
  -- агентства, спецпредложение, цена по договорённости.
  auto_sync    boolean not null default true,
  linked_at    timestamptz not null default now(),
  primary key (listing_kind, listing_id)
);

create index if not exists market_listing_links_unit on public.market_listing_links (unit_id);

-- Что сайт поменял сам. Без этого журнала автообновление — чёрный ящик:
-- по нему видно, откуда взялась цена и когда она приехала.
create table if not exists public.market_listing_sync_log (
  id           bigserial primary key,
  listing_kind text not null,
  listing_id   text not null,
  unit_id      bigint,
  old_price    numeric,
  new_price    numeric,
  -- 'applied' — цена записана; 'skipped_big_change' — расхождение слишком
  -- велико для автомата и ждёт человека; 'unit_sold' — юнит ушёл из продажи.
  outcome      text not null,
  note         text,
  applied_at   timestamptz not null default now()
);

create index if not exists market_listing_sync_log_date on public.market_listing_sync_log (applied_at desc);

alter table public.market_listing_links    enable row level security;
alter table public.market_listing_sync_log enable row level security;

grant all on public.market_listing_links    to service_role;
grant all on public.market_listing_sync_log to service_role;
grant usage, select on sequence public.market_listing_sync_log_id_seq to service_role;
