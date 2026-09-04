-- Объекты, которые агенты добавляют сами через личный кабинет.
--
-- Почему отдельная таблица, а не строки в raw_villas / raw_apartments:
-- в raw_* лежит выверенный каталог, на который опираются трекер цен,
-- баллы востребованности, партнёрские фиды и аналитика. Пользовательские
-- предложения туда пускать нельзя — один и тот же юнит, добавленный тремя
-- агентами, трижды посчитается как разный объект рынка. Здесь они живут
-- рядом с каталогом и ссылаются на него, но не смешиваются с ним.
--
-- Модерация: объект сразу доступен по прямой ссылке (агенту есть что
-- послать клиенту), но до одобрения стоит noindex и не попадает ни в
-- каталог, ни в sitemap. Первое одобрение поднимает автору
-- listing_trusted — дальше он публикуется без ожидания.

create table if not exists public.agent_listings (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  author_id     bigint not null references public.site_users(telegram_id) on delete cascade,

  -- 'villa' | 'apartment' — определяет и набор полей, и вид карточки.
  kind          text not null check (kind in ('villa', 'apartment')),

  -- ЖК из каталога (raw_complexes.airtable_id). null — объект вне ЖК.
  complex_id    text,
  -- Юнит каталога, с которого списаны факты (raw_villas/raw_apartments.airtable_id).
  -- Заполнен → страница получает canonical на карточку каталога, чтобы
  -- предложение агента не конкурировало с оригиналом в выдаче.
  base_unit_id  text,

  title         text not null,
  price_usd     numeric not null check (price_usd > 0),
  comment       text,

  -- Факты юнита под теми же именами, что в raw_* («Комнаты», «Площадь», …),
  -- чтобы карточка и загрузчики читали их теми же хелперами.
  data          jsonb not null default '{}'::jsonb,
  photos        text[] not null default '{}',

  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected', 'archived')),
  reject_reason text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  approved_at   timestamptz
);

create index if not exists agent_listings_status_idx  on public.agent_listings (status);
create index if not exists agent_listings_author_idx  on public.agent_listings (author_id);
create index if not exists agent_listings_complex_idx on public.agent_listings (complex_id);
create index if not exists agent_listings_base_idx    on public.agent_listings (base_unit_id);

-- Контакты, которые показываются на карточке агента, и признак доверия.
-- Телефон/ник нужны только тем, кто публикует объекты, поэтому колонки
-- добавляются к существующим аккаунтам, а не в отдельную таблицу.
alter table public.site_users add column if not exists phone           text;
alter table public.site_users add column if not exists contact_note    text;
alter table public.site_users add column if not exists agency          text;
alter table public.site_users add column if not exists listing_trusted boolean not null default false;

-- Как и остальные таблицы проекта: доступ только через service key на
-- сервере. Без гранта рантайм молча получает permission denied.
alter table public.agent_listings enable row level security;
grant select, insert, update, delete on public.agent_listings to service_role;
