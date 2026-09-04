-- Каталог гостевого портала по ТЗ (раздел 14): вместо плоского меню услуг —
-- четыре раздела в порядке маржи, внутри категории, внутри позиции с ценой.
--
-- Раздел («At the hotel» / «Popular in Bali» / «To your room» / «Everyday») —
-- не поле категории ради красоты, а порядок показа: сверху то, на чём отель
-- и оператор зарабатывают, а не то, что чаще спрашивают.

-- Языки портала: на старте en/ru/zh, остальные включаются по отелю.
alter table public.hotel_properties
  add column if not exists langs text[] not null default array['en','ru','zh'],
  -- Куда падают заявки и сообщения гостя. Пусто — только панель стойки.
  add column if not exists telegram_chat_id text,
  -- Кнопки «продолжить в мессенджере» под лентой чата.
  add column if not exists whatsapp text,
  add column if not exists telegram_username text,
  -- У отеля без ресторана раздел «В отеле» скрыт, доставка еды поднимается выше.
  add column if not exists has_restaurant boolean not null default true;

-- lang остаётся языком по умолчанию, но теперь допускает все языки портала.
alter table public.hotel_properties drop constraint if exists hotel_properties_lang_check;

create table if not exists public.hotel_categories (
  id          bigint generated always as identity primary key,
  hotel_id    bigint not null references public.hotel_properties(id) on delete cascade,
  code        text not null,
  section     text not null check (section in ('hotel', 'bali', 'room', 'every')),
  -- Переводы лежат в JSONB под кодами языков: {"en": "...", "ru": "..."}.
  -- Нет перевода — показываем английский, а не пустоту (ТЗ 4.2).
  title       jsonb not null,
  caption     jsonb,
  -- Иконка — запасной вариант, пока нет фото: вёрстка не должна прыгать.
  icon        text,
  photo_url   text,
  sort        int not null default 100,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (hotel_id, code)
);

create table if not exists public.hotel_items (
  id           bigint generated always as identity primary key,
  hotel_id     bigint not null references public.hotel_properties(id) on delete cascade,
  category_id  bigint not null references public.hotel_categories(id) on delete cascade,
  code         text not null,
  title        jsonb not null,
  descr        jsonb,
  price_usd    numeric(10,2),
  -- Как читать цену: разово, за день, за час, за килограмм.
  unit         text check (unit in ('once', 'day', 'hour', 'kg')),
  photo_url    text,
  sort         int not null default 100,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (category_id, code)
);

create index if not exists hotel_categories_hotel on public.hotel_categories (hotel_id, sort);
create index if not exists hotel_items_category on public.hotel_items (category_id, sort);

-- Заявка из каталога: та самая форма «что нужно / когда / WhatsApp».
alter table public.hotel_requests
  add column if not exists item_id bigint references public.hotel_items(id) on delete set null,
  add column if not exists contact_whatsapp text,
  add column if not exists preferred_time text,
  add column if not exists price_usd numeric(10,2),
  add column if not exists lang text;

alter table public.hotel_messages
  add column if not exists lang text;

-- Каждое действие гостя (ТЗ 4.10). Без этой таблицы главную метрику пилота —
-- долю заездов с заказом — посчитать нечем.
create table if not exists public.hotel_events (
  id          bigint generated always as identity primary key,
  hotel_id    bigint not null references public.hotel_properties(id) on delete cascade,
  room_id     bigint references public.hotel_rooms(id) on delete set null,
  stay_id     bigint references public.hotel_stays(id) on delete set null,
  lang        text,
  type        text not null,
  ctx         jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists hotel_events_hotel_time
  on public.hotel_events (hotel_id, created_at desc);

-- Плоское меню услуг заменено каталогом; таблица не использовалась в проде.
drop table if exists public.hotel_services;

alter table public.hotel_categories enable row level security;
alter table public.hotel_items      enable row level security;
alter table public.hotel_events     enable row level security;

grant select, insert, update, delete on public.hotel_categories to service_role;
grant select, insert, update, delete on public.hotel_items      to service_role;
grant select, insert, update, delete on public.hotel_events     to service_role;
