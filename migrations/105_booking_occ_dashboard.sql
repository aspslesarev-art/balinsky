-- Сводка для /admin/booking: загрузка Booking по районам и типам юнитов.
-- Всё считается здесь, страница только раскладывает jsonb.
--
-- Отели (многономерные): последний снимок booking_occ_rooms_tonight. Свободно по
-- типу номера знаем точно (by_room), а запас по типу — только примерно (база
-- estatemarket), поэтому запас типов масштабируем к rooms_est объекта: так сумма
-- по сегментам сходится с общей цифрой сборщика.
-- Район без зоны = «Прочее», поэтому zone is null в grouping sets = весь Бали.
-- Виллы (одиночные): ночь «сдана» = была свободна и закрылась (ever_open и не last_open).

create or replace function public.booking_occ_segment(p_name text, p_bedrooms int)
returns text language sql immutable set search_path = public as $$
  with b as (
    select
    coalesce(p_bedrooms,
      case when p_name ~* 'studio' then 0 end,
      (select case m[1] when 'one' then 1 when 'two' then 2 when 'three' then 3 when 'four' then 4
                        when 'five' then 5 when 'six' then 6 else m[1]::int end
       from regexp_match(lower(coalesce(p_name, '')), '\m(one|two|three|four|five|six|[1-9])[- ]?bed') m)) as beds
  )
  select case
    when p_name ~* 'dorm|bed in|capsule|\mpod\M' then null
    when p_name ~* 'villa|holiday home|house|chalet|cottage' then
      'Вилла ' || case when beds is null or beds = 0 then '(спальни не указаны)' when beds >= 4 then '4+ сп' else beds || ' сп' end
    when p_name ~* 'apartment|studio|flat|loft' then
      'Апартаменты ' || case when beds is null then '(спальни не указаны)' when beds = 0 then 'студия' when beds >= 3 then '3+ сп' else beds || ' сп' end
    when p_name ~* 'suite' then 'Сьют'
    when p_name ~* 'bungalow|tent|glamping|cabin|lumbung' then 'Бунгало / глэмпинг'
    when p_name ~* 'family|quadruple|triple' then 'Семейный номер'
    else 'Номер'
  end from b
$$;

create or replace function public.booking_occ_dashboard()
returns jsonb language sql stable set search_path = public as $$
  with
  last_run as (select max(run_date) d from public.booking_occ_rooms_tonight),
  prev_run as (select max(run_date) d from public.booking_occ_rooms_tonight where run_date < (select d from last_run)),
  hotel as (
    select t.*, coalesce(p.zone, 'Прочее') zone, p.unit_kind from public.booking_occ_rooms_tonight t
    join public.booking_occ_properties p on p.id = t.property_id
    where not t.blocked and coalesce(t.rooms_est, 0) > 0
  ),
  hotel_zone as (
    select zone,
      sum(rooms_est) filter (where run_date = (select d from last_run)) as rooms,
      sum(free_rooms) filter (where run_date = (select d from last_run)) as free,
      sum(rooms_est) filter (where run_date = (select d from prev_run)) as rooms_prev,
      sum(free_rooms) filter (where run_date = (select d from prev_run)) as free_prev,
      count(*) filter (where run_date = (select d from last_run)) as props
    from hotel where run_date in ((select d from last_run), (select d from prev_run))
    group by zone
  ),
  -- типы номеров отелей на последний снимок
  htype as (
    select h.property_id, h.zone, h.rooms_est, f.room_id,
      public.booking_occ_segment(f.name, f.bedrooms) as seg,
      coalesce((h.by_room ->> f.room_id::text)::int, 0) as free_t,
      greatest(coalesce(r.max_available, 0), coalesce((h.by_room ->> f.room_id::text)::int, 0), 1) as inv_t
    from hotel h
    join public.booking_room_facts f on f.property_id = h.property_id
    left join public.booking_data_rooms r on r.room_id = f.room_id
    where h.run_date = (select d from last_run) and coalesce(r.max_available, 0) < 10
  ),
  htype_scaled as (
    select zone, seg, free_t, inv_t * rooms_est::numeric / nullif(sum(inv_t) over (partition by property_id), 0) as inv_s, property_id
    from htype where seg is not null
  ),
  hotel_seg as (
    select zone, seg, count(distinct property_id) props, sum(greatest(inv_s, free_t)) inv, sum(least(free_t, greatest(inv_s, free_t))) free
    from htype_scaled group by grouping sets ((zone, seg), (seg))
  ),
  -- виллы: спальни из типа номера
  villa as (
    select p.id, coalesce(p.zone, 'Прочее') zone, p.unit_kind,
      case when p.unit_kind = 'apartment' then
        'Апартаменты ' || case when b.beds is null then '(спальни не указаны)' when b.beds = 0 then 'студия' when b.beds >= 3 then '3+ сп' else b.beds || ' сп' end
      else 'Вилла ' || case when b.beds is null or b.beds = 0 then '(спальни не указаны)' when b.beds >= 4 then '4+ сп' else b.beds || ' сп' end
      end as seg
    from public.booking_occ_properties p
    left join lateral (select max(bedrooms) beds from public.booking_room_facts f where f.property_id = p.id) b on true
    where p.mode = 'single' and p.active
  ),
  today as (select coalesce((select d from last_run), (now() at time zone 'Asia/Makassar')::date) d),
  vn as (
    select v.zone, v.seg, n.night, n.ever_open, n.last_open
    from public.booking_occ_nights n join villa v on v.id = n.property_id
    where n.night between (select d from today) and (select d from today) + 59
  ),
  villa_seg as (
    select zone, seg,
      count(*) filter (where night = (select d from today) and ever_open and not last_open) booked,
      count(*) filter (where night = (select d from today) and ever_open) open_ever,
      count(*) filter (where night < (select d from today) + 14 and ever_open and not last_open) c14,
      count(*) filter (where night < (select d from today) + 14 and ever_open) n14,
      count(*) filter (where night >= (select d from today) + 14 and ever_open and not last_open) cfar,
      count(*) filter (where night >= (select d from today) + 14 and ever_open) nfar
    from vn group by grouping sets ((zone, seg), (seg), (zone), ())
  ),
  villa_count as (
    select zone, seg, count(*) n from villa group by grouping sets ((zone, seg), (seg), (zone), ())
  )
  select jsonb_build_object(
    'run_date', (select d from last_run),
    'prev_date', (select d from prev_run),
    'runs', (select coalesce(jsonb_agg(jsonb_build_object('d', run_date, 'hotel_pct', hotel_occ_pct, 'singles', singles, 'multis', multis,
               'errors', errors, 'finished_at', finished_at, 'alerts', alerts) order by run_date), '[]') from public.booking_occ_runs where run_date >= current_date - 90),
    'villa_trend', (select coalesce(jsonb_agg(jsonb_build_object('d', night, 'booked', booked, 'open', open_ever) order by night), '[]') from (
        select n.night, count(*) filter (where n.ever_open and not n.last_open) booked, count(*) filter (where n.ever_open) open_ever
        from public.booking_occ_nights n join public.booking_occ_properties p on p.id = n.property_id and p.mode = 'single'
        where n.night between (select d from today) - 90 and (select d from today) group by n.night) x),
    'closed_by_day', (select coalesce(jsonb_agg(jsonb_build_object('d', closed_on, 'nights', c, 'villas', v) order by closed_on), '[]') from (
        select n.closed_on, count(*) c, count(distinct n.property_id) v
        from public.booking_occ_nights n join public.booking_occ_properties p on p.id = n.property_id and p.mode = 'single'
        where n.closed_on >= (select d from today) - 90 group by n.closed_on) x),
    'zones', (select coalesce(jsonb_agg(jsonb_build_object('zone', z.zone, 'hotel_rooms', h.rooms, 'hotel_free', h.free,
               'hotel_rooms_prev', h.rooms_prev, 'hotel_free_prev', h.free_prev, 'hotel_props', h.props,
               'villas', vc.n, 'villa_booked', vs.booked, 'villa_open', vs.open_ever,
               'c14', vs.c14, 'n14', vs.n14, 'cfar', vs.cfar, 'nfar', vs.nfar)), '[]')
        from (select zone from hotel_zone union select zone from villa_count where zone is not null) z
        left join hotel_zone h on h.zone is not distinct from z.zone
        left join villa_seg vs on vs.zone is not distinct from z.zone and vs.seg is null and z.zone is not null
        left join villa_count vc on vc.zone is not distinct from z.zone and vc.seg is null and z.zone is not null),
    'total', (select jsonb_build_object('hotel_rooms', sum(rooms), 'hotel_free', sum(free), 'hotel_rooms_prev', sum(rooms_prev),
               'hotel_free_prev', sum(free_prev), 'hotel_props', sum(props),
               'villas', (select n from villa_count where zone is null and seg is null),
               'villa_booked', (select booked from villa_seg where zone is null and seg is null),
               'villa_open', (select open_ever from villa_seg where zone is null and seg is null)) from hotel_zone),
    'hotel_segments', (select coalesce(jsonb_agg(jsonb_build_object('zone', zone, 'seg', seg, 'props', props,
               'inv', round(inv), 'free', round(free))), '[]') from hotel_seg),
    'villa_segments', (select coalesce(jsonb_agg(jsonb_build_object('zone', vs.zone, 'seg', vs.seg, 'units', vc.n,
               'booked', vs.booked, 'open', vs.open_ever, 'c14', vs.c14, 'n14', vs.n14, 'cfar', vs.cfar, 'nfar', vs.nfar)), '[]')
        from villa_seg vs join villa_count vc on vc.zone is not distinct from vs.zone and vc.seg is not distinct from vs.seg
        where vs.seg is not null)
  )
$$;

revoke all on function public.booking_occ_dashboard() from public, anon, authenticated;
grant execute on function public.booking_occ_dashboard() to service_role;
