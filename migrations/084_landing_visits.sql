-- Визиты на закрытые лендинги (сейчас один — /agentskaya-set, предложение
-- застройщикам). Владелец рассылает ссылку конкретным застройщикам и хочет
-- видеть: кто открыл, когда, сколько читал и какие блоки смотрел.
--
-- Одна строка = одна сессия (открыл вкладку → закрыл). Страница шлёт
-- накопленные итоги раз в 15 секунд и при уходе, API делает upsert по id —
-- поэтому строка всегда содержит последние итоги, а не журнал событий.
--
-- «Кто» — это метка из ссылки (?from=vertikal), которую владелец ставит
-- каждому застройщику свою. Без метки человек анонимен, но повторные
-- заходы склеиваются по visitor_id (живёт в localStorage браузера).

create table if not exists public.landing_visits (
  id            uuid primary key,
  page          text not null,
  who           text,
  visitor_id    text,

  started_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),

  -- Секунды, пока вкладка была на экране. Фоновая вкладка не считается.
  active_sec    integer not null default 0,
  -- Как глубоко долистал, 0–100.
  max_scroll    integer not null default 0,
  -- Секунды по разделам: {"s0": 12, "s1": 40, ...}. s0 — первый экран.
  sections      jsonb not null default '{}'::jsonb,
  -- Сколько раз нажал «Написать в Telegram».
  cta_clicks    integer not null default 0,

  city          text,
  country       text,
  device        text,
  referrer      text,
  user_agent    text
);

create index if not exists landing_visits_page_started_idx on public.landing_visits (page, started_at desc);
create index if not exists landing_visits_visitor_idx on public.landing_visits (visitor_id);

alter table public.landing_visits enable row level security;
grant select, insert, update, delete on public.landing_visits to service_role;
