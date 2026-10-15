-- «Что влияет на загрузку» для /admin/booking (15.10).
--
-- Единица наблюдения:
--   отели — тип номера; загрузка = занятые номера этого типа за все снимки с 14.10
--           (запас типа масштабирован к rooms_est, как в booking_occ_dashboard);
--   сдаются целиком — объект; загрузка = доля закрытых ночей на ближайшие 14 дней
--           (включая брони, сделанные до начала наблюдения; объекты, закрытые на все
--           60 дней, исключены — это снятые с продажи).
-- Сравнение: внутри страты «район × тип/спальни» загрузка с признаком минус без него,
-- среднее по стратам с весом n1·n0/n (как в тесте Кохрана–Мантеля–Хензеля), ошибка
-- из дисперсии страты. Так «бассейн» не подменяется «Чангу против Кинтамани».
-- Признаки: удобства Booking (fac:), разбор фото (ph:, сравнение только среди номеров
-- с разобранными фото), место и отзывы (pl:).

create table if not exists public.booking_occ_drivers (
  kind text not null,          -- hotel | villa
  source text not null,        -- fac | ph | pl
  feature text not null,
  n_with int, n_without int,   -- единиц в сравнимых стратах
  occ_with numeric, occ_without numeric,
  lift numeric, se numeric,    -- разница в п.п. и её ошибка
  strata int, coverage int,    -- страт в сравнении; всего единиц с признаком
  computed_at timestamptz not null default now(),
  primary key (kind, source, feature)
);
create table if not exists public.booking_occ_drivers_meta (
  id int primary key default 1 check (id = 1),
  computed_at timestamptz, hotel_units int, villa_units int, hotel_vision int, villa_vision int,
  days int, first_day date, last_day date
);
alter table public.booking_occ_drivers enable row level security;
alter table public.booking_occ_drivers_meta enable row level security;
grant select, insert, update, delete on public.booking_occ_drivers, public.booking_occ_drivers_meta to service_role;

create index if not exists booking_room_vision_property on public.booking_room_vision (property_id);

create or replace function public.booking_occ_vision_features(v jsonb)
returns setof text language sql immutable set search_path = public as $$
  select 'ph:' || k from unnest(array['bathtub','outdoor_shower','ac_visible','workspace_desk','photo_staged','photo_twilight','photo_drone','photo_people']) k
    where v ->> k = 'true'
  union all
  select 'ph:' || k || '=' || (v ->> k) from unnest(array['style_primary','condition','pool_type','space_feel']) k
    where coalesce(v ->> k, '') <> ''
  union all
  select 'ph:' || k || '=' || e from unnest(array['materials','architecture','views','guest_segment','red_flags','rooms_shown']) k,
    jsonb_array_elements_text(case when jsonb_typeof(v -> k) = 'array' then v -> k else '[]' end) e
  union all
  select 'ph:' || k || '>=4' from unnest(array['finish_tier','design_coherence','natural_light','outdoor_living_share','photo_professional',
    'instagrammability','pool_deck_tier','kitchen_tier','bathroom_tier']) k
    where v ->> k ~ '^[0-9]+$' and (v ->> k)::int >= 4
  union all
  select 'ph:' || k || '<=2' from unnest(array['finish_tier','design_coherence','natural_light','photo_professional','instagrammability']) k
    where v ->> k ~ '^[0-9]+$' and (v ->> k)::int between 1 and 2
$$;

create or replace function public.booking_occ_drivers_refresh()
returns void language plpgsql set search_path = public as $$
declare d_last date; d_first date; n_days int;
begin
  select max(run_date), min(run_date), count(distinct run_date) into d_last, d_first, n_days
  from booking_occ_rooms_tonight where run_date >= date '2026-10-14';
  if d_last is null then return; end if;

  create temp table _u on commit drop as
  with ht as (
    select h.run_date, h.property_id, f.room_id, coalesce(p.zone, 'Прочее') zone,
      booking_occ_segment(f.name, f.bedrooms) seg, h.rooms_est,
      coalesce((h.by_room ->> f.room_id::text)::int, 0) free_t,
      greatest(coalesce(r.mx, 0), coalesce((h.by_room ->> f.room_id::text)::int, 0), 1)::numeric inv_t
    from booking_occ_rooms_tonight h
    join booking_occ_properties p on p.id = h.property_id
    join booking_room_facts f on f.property_id = h.property_id
    left join lateral (select max(max_available) mx from booking_data_rooms r where r.property_id = h.property_id and r.room_id = f.room_id) r on true
    where h.run_date >= date '2026-10-14' and not h.blocked and coalesce(h.rooms_est, 0) > 0 and coalesce(r.mx, 0) < 10
  ), hs as (
    select *, inv_t * rooms_est / nullif(sum(inv_t) over (partition by run_date, property_id), 0) inv_s from ht where seg is not null
  )
  select 'hotel'::text kind, room_id u, max(property_id) property_id, max(zone) || ' · ' || max(seg) stratum,
    100 * (1 - sum(least(free_t, greatest(inv_s, free_t))) / nullif(sum(greatest(inv_s, free_t)), 0)) y
  from hs group by room_id
  union all
  select 'villa', p.id, p.id, coalesce(p.zone, 'Прочее') || ' · ' || s.seg,
    100.0 * count(*) filter (where not n.last_open) / count(*)
  from booking_occ_properties p
  join booking_occ_single_segment s on s.id = p.id
  join booking_occ_nights n on n.property_id = p.id and n.night between d_last and d_last + 13
  where p.mode = 'single' and p.active
    and exists (select 1 from booking_occ_nights m where m.property_id = p.id and m.night between d_last and d_last + 59 and m.last_open)
  group by p.id, p.zone, s.seg
  having count(*) >= 10;
  delete from _u where y is null;

  -- признаки (только «есть»): удобства и фото
  create temp table _f on commit drop as
  select distinct u.kind, u.u, 'fac'::text source, 'fac:' || x feature
  from _u u join booking_room_facts f on f.room_id = u.u cross join unnest(f.facilities) x
  where u.kind = 'hotel'
  union
  select u.kind, u.u, 'fac', 'fac:' || x
  from _u u join booking_room_facts f on f.property_id = u.u cross join unnest(f.facilities) x
  where u.kind = 'villa'
  union
  select u.kind, u.u, 'ph', ft
  from _u u join booking_room_vision v on v.room_id = u.u cross join booking_occ_vision_features(v.vision) ft
  where u.kind = 'hotel'
  union
  select u.kind, u.u, 'ph', ft
  from _u u
  join lateral (select v.vision from booking_room_vision v where v.property_id = u.u order by v.room_id limit 1) v on true
  cross join booking_occ_vision_features(v.vision) ft
  where u.kind = 'villa';

  -- кто вообще участвует в сравнении по каждому источнику
  create temp table _pop on commit drop as
  select distinct kind, u, source from _f;

  -- место и отзывы: явные «да/нет»
  create temp table _p on commit drop as
  select u.kind, u.u, x.feature, x.val
  from _u u join booking_occ_properties p on p.id = u.property_id
  cross join lateral (values
    ('pl:beach<=500', case when p.beach_m is not null then p.beach_m <= 500 end),
    ('pl:coast<=1000', case when p.coast_m is not null then p.coast_m <= 1000 end),
    ('pl:review>=9', case when p.review_score is not null then p.review_score >= 9 end),
    ('pl:review<8', case when p.review_score is not null then p.review_score < 8 end),
    ('pl:reviews>=100', case when p.review_count is not null then p.review_count >= 100 end)
  ) x(feature, val)
  where x.val is not null;

  delete from booking_occ_drivers where true;
  insert into booking_occ_drivers (kind, source, feature, n_with, n_without, occ_with, occ_without, lift, se, strata, coverage)
  with tot as (
    select pp.kind, pp.source, u.stratum, count(*) n, sum(u.y) s, sum(u.y * u.y) q
    from _pop pp join _u u using (kind, u) group by 1, 2, 3
  ), w1 as (
    select f.kind, f.source, f.feature, u.stratum, count(*) n1, sum(u.y) s1
    from _f f join _u u using (kind, u) group by 1, 2, 3, 4
  ), ptot as (
    select p.kind, p.feature, u.stratum, count(*) n, sum(u.y) s, sum(u.y * u.y) q,
      count(*) filter (where p.val) n1, sum(u.y) filter (where p.val) s1
    from _p p join _u u using (kind, u) group by 1, 2, 3
  ), cells as (
    select w1.kind, w1.source, w1.feature, w1.n1, w1.s1, t.n, t.s, t.q from w1 join tot t using (kind, source, stratum)
    union all
    select kind, 'pl', feature, n1, coalesce(s1, 0), n, s, q from ptot
  ), st as (
    select kind, source, feature, n1, n - n1 n0, s1, s - s1 s0,
      s1 / n1 - (s - s1) / (n - n1) d,
      greatest((q - s * s / n) / (n - 1), 0) v,
      n1 * (n - n1)::numeric / n w
    from cells where n1 > 0 and n - n1 > 0 and n >= 3
  )
  select kind, source, feature, sum(n1), sum(n0),
    round(sum(s1) / sum(n1), 1), round(sum(s0) / sum(n0), 1),
    round(sum(w * d) / sum(w), 2), round(sqrt(sum(w * v)) / sum(w), 2),
    count(*), null
  from st group by kind, source, feature;

  update booking_occ_drivers d set coverage = c.n
  from (select kind, feature, count(*) n from _f group by 1, 2
        union all select kind, feature, count(*) filter (where val) from _p group by 1, 2) c
  where c.kind = d.kind and c.feature = d.feature;

  insert into booking_occ_drivers_meta (id, computed_at, hotel_units, villa_units, hotel_vision, villa_vision, days, first_day, last_day)
  select 1, now(),
    (select count(*) from _u where kind = 'hotel'), (select count(*) from _u where kind = 'villa'),
    (select count(*) from _pop where kind = 'hotel' and source = 'ph'), (select count(*) from _pop where kind = 'villa' and source = 'ph'),
    n_days, d_first, d_last
  on conflict (id) do update set computed_at = excluded.computed_at, hotel_units = excluded.hotel_units, villa_units = excluded.villa_units,
    hotel_vision = excluded.hotel_vision, villa_vision = excluded.villa_vision, days = excluded.days,
    first_day = excluded.first_day, last_day = excluded.last_day;
end $$;

revoke all on function public.booking_occ_drivers_refresh() from public, anon, authenticated;
grant execute on function public.booking_occ_drivers_refresh() to service_role;

-- Каждый день в 15:00 WITA: сбор заканчивается к ~13:30 (запасной на Маке — к ~14:20).
select cron.schedule('booking-occ-drivers', '0 7 * * *', $$select public.booking_occ_drivers_refresh()$$);
