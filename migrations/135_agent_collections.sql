-- Подборки агента для клиента (владелец 29.10.2026, макет
-- https://claude.ai/artifact/TEUDdpFWhCUY4aDcWN3N5K). Pro-агент собирает
-- объекты, клиент открывает /p/<token> без входа, агент видит историю
-- открытий: когда, с какого устройства, откуда (страна и город по IP из
-- заголовков Vercel).

create table if not exists public.agent_collections (
  id uuid primary key default gen_random_uuid(),
  owner_telegram_id bigint not null references public.site_users(telegram_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  intro text check (char_length(intro) <= 1000),
  token text not null unique check (token ~ '^[a-z0-9-]{6,80}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_collections_owner_idx on public.agent_collections (owner_telegram_id, updated_at desc);

create table if not exists public.agent_collection_items (
  collection_id uuid not null references public.agent_collections(id) on delete cascade,
  kind text not null check (kind in ('villa', 'apartment')),
  slug text not null check (char_length(slug) between 1 and 160),
  position int not null default 0,
  note text check (char_length(note) <= 500),
  -- Карточка на момент добавления: название, фото, цена, район и т.п.
  snapshot jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default now(),
  primary key (collection_id, kind, slug)
);

create table if not exists public.agent_collection_visits (
  id bigint generated always as identity primary key,
  collection_id uuid not null references public.agent_collections(id) on delete cascade,
  -- Случайная метка браузера клиента (кука), чтобы считать устройства.
  visitor text not null check (char_length(visitor) <= 64),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  device text,
  browser text,
  country text,
  city text,
  -- Предпросмотр ссылки мессенджером (Telegram, WhatsApp) — не клиент.
  preview boolean not null default false,
  viewed text[] not null default '{}'
);
create index if not exists agent_collection_visits_idx on public.agent_collection_visits (collection_id, started_at desc);

alter table public.agent_collections enable row level security;
alter table public.agent_collection_items enable row level security;
alter table public.agent_collection_visits enable row level security;
grant select, insert, update, delete on public.agent_collections, public.agent_collection_items, public.agent_collection_visits to service_role;
grant usage, select on all sequences in schema public to service_role;
