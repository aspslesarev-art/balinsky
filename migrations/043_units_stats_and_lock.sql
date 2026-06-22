-- 1) Запираем parser_units: 036 в прежней версии выдавала anon/authenticated
--    публичный select (using(true)) — это противоречит запертой RLS-модели
--    (038/039). Доступ только через service_role.
drop policy if exists parser_units_read on public.parser_units;
revoke select on public.parser_units from anon, authenticated;

-- 2) Дневной снапшот наличия юнитов — для статистики продаж: сколько
--    доступно/продано по каждому комплексу на каждую дату. Сравнивая дни,
--    видно, когда LB Group закрывал сделки (рост «продано» / падение
--    «доступно»). Заполняется кроном /api/cron/units-snapshot раз в день.
create table if not exists public.unit_availability_daily (
  snapshot_date date not null,
  complex_id    text not null,
  source        text not null default 'lb_group',
  complex_name  text,
  available     integer not null default 0,
  reserved      integer not null default 0,
  sold          integer not null default 0,
  blocked       integer not null default 0,
  resale        integer not null default 0,
  total         integer not null default 0,
  created_at    timestamptz not null default now(),
  primary key (snapshot_date, complex_id, source)
);

-- Только service_role (как parser_units) — читает админка/крон server-side.
grant all privileges on table public.unit_availability_daily to service_role;
alter table public.unit_availability_daily enable row level security;

create index if not exists unit_availability_daily_complex_idx
  on public.unit_availability_daily (complex_id, snapshot_date desc);
