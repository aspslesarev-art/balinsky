-- Цель владельца по каждому собеседнику: «подписать фикс», «созвон»,
-- «привести клиента на Oceaniq». Секретарь строит черновики и план дня
-- под эту цель. Отдельная таблица, а не колонка в plan_chat_scan: цель
-- ставят и тем, чей чат ИИ ещё не читал.

create table if not exists public.plan_chat_goals (
  chat_id     bigint primary key,
  goal        text not null,
  updated_at  timestamptz not null default now()
);

alter table public.plan_chat_goals enable row level security;
grant select, insert, update, delete on public.plan_chat_goals to service_role;
