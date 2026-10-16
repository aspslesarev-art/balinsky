-- Сырые объявления аренды с Facebook Marketplace (сбор из браузера, файл .jsonl).
-- Строка = объявление как пришло, целиком в data. Повторный сбор обновляет
-- data и last_seen, first_seen остаётся. В каталог /arenda попадают только
-- проверенные — через ~/tg-reader/fb_import.py в rental/_rental.json.
create table if not exists public.fb_marketplace_listings (
  id text primary key,
  url text not null,
  deal text,
  price_amount numeric,
  currency text,
  data jsonb not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.fb_marketplace_listings enable row level security;
grant all on public.fb_marketplace_listings to service_role;
