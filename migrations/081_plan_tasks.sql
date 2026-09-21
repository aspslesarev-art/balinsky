-- Личный трекер квартального плана (/plan).
--
-- План — недели, дни, задачи, суммы — лежит константой в коде
-- (lib/plan/data.ts) и правится через код. В базе только одно:
-- какие задачи отмечены галочкой. Так состояние переживает
-- переустановку браузера и совпадает на телефоне и ноутбуке.
--
-- task_id — строковый id задачи из константы, не ссылка на БД:
-- если задачу из плана убрали, её строка просто перестаёт читаться.

create table if not exists public.plan_tasks (
  task_id     text primary key,
  done        boolean not null default false,
  updated_at  timestamptz not null default now()
);

alter table public.plan_tasks enable row level security;

grant select, insert, update, delete on public.plan_tasks to service_role;
