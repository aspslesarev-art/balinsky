-- Гости мероприятия (встреча агентов 2 октября и следующие).
-- ИИ читает переписку после приглашения и ставит статус: invited —
-- пригласили, ответа по сути нет; interested — интересно, но «приду» не
-- сказал; yes — подтвердил; no — не сможет. plus_ones — придёт не один.
-- manual — статус поставил владелец руками, ИИ его больше не трогает.
-- last_message_id — до какого сообщения чат уже разобран.

create table if not exists public.plan_event_guests (
  event_key        text not null,
  chat_id          bigint not null,
  contact          text,
  status           text not null check (status in ('invited', 'interested', 'yes', 'no')),
  plus_ones        int not null default 0,
  note             text,
  quote            text,
  manual           boolean not null default false,
  last_message_id  bigint,
  updated_at       timestamptz not null default now(),
  primary key (event_key, chat_id)
);

alter table public.plan_event_guests enable row level security;
grant select, insert, update, delete on public.plan_event_guests to service_role;
