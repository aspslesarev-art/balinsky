-- Журнал обновлений трекера: чем закончился каждый тик и не выглядит ли
-- что-то в работе парсеров странно.

-- Источники, до которых тик не успел дойти, уже считаются в коде, но
-- нигде не сохранялись — а именно они объясняют, почему часть прайсов
-- в этот прогон осталась вчерашней.
alter table public.market_scan_runs
  add column if not exists sources_skipped int not null default 0;

-- Когда источник в последний раз разобрался без ошибки. Без этого по
-- сломавшемуся прайсу не видно, когда именно он сломался: last_scan_at
-- обновляется и на неудачных попытках.
alter table public.market_sources
  add column if not exists last_ok_at timestamptz;

update public.market_sources
   set last_ok_at = last_scan_at
 where last_ok_at is null and last_status = 'ok' and last_scan_at is not null;

-- События одного вида за день по комплексу. Одиночный переход — это
-- рынок, сотня разом — почти всегда сменившийся формат прайса, поэтому
-- считаем в базе: за день таких строк единицы, а самих событий бывают
-- тысячи, и в PostgREST они упираются в предел выдачи.
--
-- known_before отделяет первый обход прайса от подозрительного: в первый
-- раз «появились» разом все юниты комплекса, и это норма. Если же у
-- комплекса уже были юниты до этого дня, массовое «появление» означает,
-- что в прайсе сменились номера — старые пропали, новые завелись.
create or replace view public.market_event_daily
with (security_invoker = on) as
select
  e.d,
  e.kind,
  u.developer,
  u.complex,
  count(*)::int as n,
  count(*) filter (
    where e.old_price is not null and e.old_price > 0 and e.new_price is not null
      and abs(e.new_price - e.old_price) / e.old_price >= 0.25
  )::int as sharp_price,
  exists (
    select 1 from public.market_units u2
     where u2.developer = u.developer and u2.complex = u.complex and u2.first_seen < e.d
  ) as known_before
from public.market_unit_events e
join public.market_units u on u.id = e.unit_id
group by e.d, e.kind, u.developer, u.complex;

grant select on public.market_event_daily to service_role;
