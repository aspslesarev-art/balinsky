-- Отдельная Supabase-таблица для юнитов, которые тянет парсер цен/наличия
-- (lib/parsers/*). Заменяет запись в Airtable «Юниты Виллы» — источник
-- истины теперь здесь, управление через админку /admin/data (коллекция
-- «Юниты»). Форма {PK, data jsonb} совместима с sql_jsonb-адаптером админки.
--
-- unit_key = `<complex_id>#<gid>#<номер>` — стабилен между прогонами и
-- уникален между вкладками/комплексами, поэтому повторный прогон апдейтит
-- запись, а не плодит дубль.
create table if not exists public.parser_units (
  unit_key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- service_role пишет (парсер + админка server-side), anon/authenticated
-- читают JSONB на сервере (как raw_villas).
-- Доступ только через service_role (админка/парсер server-side). RLS
-- включён без anon-политик — anon/authenticated читать НЕ могут (как и
-- остальные таблицы после 038/039). См. также 043 (он добивает политику,
-- если эта миграция уже была применена в её прежней версии).
grant all privileges on table public.parser_units to service_role;
alter table public.parser_units enable row level security;

-- Фильтры в админке/каталоге по статусу/комплексу идут по JSONB.
create index if not exists parser_units_data_gin on public.parser_units using gin (data);
