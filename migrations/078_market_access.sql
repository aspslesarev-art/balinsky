-- Кто, кроме админа, видит закрытый отчёт о движении рынка (/rynok).
--
-- Список ведётся по Telegram: строка либо на конкретный telegram_id, либо
-- на @username. Второе нужно, чтобы выдать доступ человеку, который на
-- сайте ещё ни разу не входил и id которого мы пока не знаем — он войдёт
-- через бота, и доступ подхватится по нику.
--
-- Отзыв — не delete, а revoked_at: кому и когда открывали, видно всегда.

create table if not exists public.market_access (
  id           bigint generated always as identity primary key,
  telegram_id  bigint,
  username     text,
  note         text,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz,
  constraint market_access_who check (telegram_id is not null or username is not null)
);

-- username хранится в нижнем регистре и без «@» — сравнение идёт по нему.
-- Уникальность только среди живых строк: отозванный доступ можно выдать
-- заново, а история при этом остаётся.
create unique index if not exists market_access_username_live
  on public.market_access (username)
  where revoked_at is null and username is not null;

create unique index if not exists market_access_telegram_live
  on public.market_access (telegram_id)
  where revoked_at is null and telegram_id is not null;

-- Читает и пишет только сервер (service_role); анонимному ключу тут делать
-- нечего — RLS без политик закрывает таблицу для всех остальных.
alter table public.market_access enable row level security;

grant select, insert, update, delete on public.market_access to service_role;
