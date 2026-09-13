-- Запись на встречи (аналог Calendly) с привязкой к Google Календарю.
--
-- Особенность — живые встречи привязаны к району: в какой-то день
-- владелец в Убуде, в какой-то — в Чангу. День получает район либо
-- вручную в админке, либо первой живой записью на этот день. На дорогу
-- из дома до района уходит время, поэтому первая живая встреча дня
-- не может начаться раньше «начало рабочего дня + дорога».
--
-- Google Календарь — источник занятости (любые события владельца блокируют
-- слоты), а эти таблицы — источник записей, районов по дням и настроек.

-- Настройки: одна строка. Рабочие часы, длительности, буферы, районы
-- с временем в пути. Формат data — lib/meetings/types.ts (MeetingSettings).
create table if not exists public.meeting_settings (
  id          int primary key default 1 check (id = 1),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Район, в котором владелец будет в конкретный день (дата — по времени Бали).
-- source = 'manual' — задано в админке; 'booking' — закрепилось первой
-- живой записью и снимается, если все живые записи дня отменены.
create table if not exists public.meeting_days (
  day         date primary key,
  district    text not null,
  source      text not null default 'manual' check (source in ('manual', 'booking')),
  updated_at  timestamptz not null default now()
);

create table if not exists public.meeting_bookings (
  id               uuid primary key default gen_random_uuid(),
  start_at         timestamptz not null,
  end_at           timestamptz not null,
  format           text not null check (format in ('online', 'offline')),
  -- Ключ района из настроек (для offline), null для online.
  district         text,
  guest_name       text not null,
  guest_email      text not null,
  guest_contact    text,
  comment          text,
  lang             text not null default 'ru',
  status           text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  google_event_id  text,
  meet_url         text,
  created_at       timestamptz not null default now(),
  cancelled_at     timestamptz,
  check (end_at > start_at),
  check (format = 'online' or district is not null)
);

create index if not exists meeting_bookings_start_idx on public.meeting_bookings (start_at) where status = 'confirmed';

-- Две подтверждённые встречи не могут пересекаться по времени. Это страховка
-- от гонки двух одновременных записей на один слот: проверка свободности в
-- коде идёт до вставки, а констрейнт ловит то, что проскочило между ними.
alter table public.meeting_bookings drop constraint if exists meeting_bookings_no_overlap;
alter table public.meeting_bookings add constraint meeting_bookings_no_overlap
  exclude using gist (tstzrange(start_at, end_at) with &&) where (status = 'confirmed');

-- OAuth-токен Google: одна строка на провайдера. refresh_token — секрет,
-- таблица доступна только service_role.
create table if not exists public.google_oauth_tokens (
  provider       text primary key,
  account_email  text,
  refresh_token  text not null,
  access_token   text,
  expires_at     timestamptz,
  scope          text,
  updated_at     timestamptz not null default now()
);

alter table public.meeting_settings    enable row level security;
alter table public.meeting_days        enable row level security;
alter table public.meeting_bookings    enable row level security;
alter table public.google_oauth_tokens enable row level security;

grant select, insert, update, delete on public.meeting_settings    to service_role;
grant select, insert, update, delete on public.meeting_days        to service_role;
grant select, insert, update, delete on public.meeting_bookings    to service_role;
grant select, insert, update, delete on public.google_oauth_tokens to service_role;
