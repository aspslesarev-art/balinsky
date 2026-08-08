-- Аналитический слой над vision-разбором рынка аренды (см. 061).
--
-- Задача: связать признаки продукта (стиль, отделка, бассейн, вид) с деньгами
-- — ADR, загрузкой и RevPAR — так, чтобы премия за признак не оказалась
-- премией за район. Поэтому всё считается ОТНОСИТЕЛЬНО своей страты
-- «зона × тип × спальни», а не по рынку целиком.

-- Зона = ближайший из именованных центров рынка в пределах 8 км.
-- Это грубее полигонов, но честнее: центры взяты по фактическим скоплениям
-- объектов, а 8 км отсекает одиночек в глубине острова в «Прочее».
create or replace function public.booking_zone(p_lat double precision, p_lng double precision)
returns text
language sql
immutable
as $$
  select coalesce((
    select z.name
    from (values
      ('Чангу — Бату-Болонг',      -8.6553, 115.1300),
      ('Берава',                    -8.6650, 115.1420),
      ('Переренан',                 -8.6440, 115.1210),
      ('Сесех — Чемаги',            -8.6420, 115.1050),
      ('Падонан — Тумбак-Баю',      -8.6330, 115.1450),
      ('Умалас',                    -8.6650, 115.1580),
      ('Керобокан',                 -8.6740, 115.1690),
      ('Семиньяк',                  -8.6900, 115.1620),
      ('Легиан — Кута',             -8.7150, 115.1720),
      ('Тубан — аэропорт',          -8.7450, 115.1700),
      ('Джимбаран',                 -8.7900, 115.1650),
      ('Баланган',                  -8.7930, 115.1250),
      ('Улувату — Пекату',          -8.8250, 115.0900),
      ('Бингин — Паданг-Паданг',    -8.8100, 115.1150),
      ('Унгасан — Меласти',         -8.8420, 115.1520),
      ('Нуса-Дуа',                  -8.8000, 115.2280),
      ('Сануp',                     -8.6900, 115.2620),
      ('Денпасар',                  -8.6700, 115.2150),
      ('Кедунгу — Табанан',         -8.6100, 115.0800),
      ('Убуд',                      -8.5070, 115.2620),
      ('Тегаллаланг — Паянган',     -8.4300, 115.2800),
      ('Сидемен',                   -8.4700, 115.4300),
      ('Чандидаса — Карангасем',    -8.5100, 115.5700),
      ('Амед',                      -8.3350, 115.6600),
      ('Ловина — север',            -8.1600, 115.0250),
      ('Мундук — Бедугул',          -8.2700, 115.1000),
      ('Нуса-Пенида — Лембонган',   -8.7200, 115.4500),
      ('Гианьяр — Керамас',         -8.5900, 115.3300),
      ('Кинтамани — Батур',         -8.2600, 115.3700),
      ('Джембрана — запад',         -8.3600, 114.6300)
    ) as z(name, lat, lng)
    where 6371000 * acos(least(1.0,
            cos(radians(p_lat)) * cos(radians(z.lat)) * cos(radians(z.lng) - radians(p_lng))
            + sin(radians(p_lat)) * sin(radians(z.lat)))) <= 8000
    order by (p_lat - z.lat) * (p_lat - z.lat)
           + (p_lng - z.lng) * (p_lng - z.lng) * 0.98
    limit 1
  ), 'Прочее')
$$;

grant execute on function public.booking_zone(double precision, double precision) to anon, authenticated, service_role;

-- Разобранный объект + его деньги + зона.
-- adr: наблюдённая цена показа, иначе нижняя граница из карточки.
create or replace view public.booking_market_product as
select v.id,
       c.title,
       c.slug,
       c.unit_kind,
       c.bedrooms,
       c.star,
       l.lat,
       l.lng,
       public.booking_zone(l.lat, l.lng)               as zone,
       coalesce(l.price, c.min_price)                  as adr,
       l.occupancy,
       coalesce(l.price, c.min_price) * l.occupancy / 100.0 as revpar,
       v.vision,
       v.photos_used
from public.booking_data_vision v
join public.booking_data_cards c     on c.id = v.id
join public.booking_data_locations l on l.id = v.id;

-- Та же строка, но цена/загрузка выражены в долях от медианы СВОЕЙ страты.
-- adr_ratio = 1.0 значит «ровно как соседи того же типа и размера».
create or replace view public.booking_market_relative as
with base as (
  select *,
         case when bedrooms is null then 'n/a'
              when bedrooms <= 1 then '0-1'
              when bedrooms = 2 then '2'
              when bedrooms = 3 then '3'
              else '4+' end as beds_bucket
  from public.booking_market_product
  where adr is not null and adr > 0 and occupancy is not null
),
strata as (
  select zone, unit_kind, beds_bucket,
         count(*) as stratum_n,
         percentile_cont(0.5) within group (order by adr)       as med_adr,
         percentile_cont(0.5) within group (order by occupancy) as med_occ,
         percentile_cont(0.5) within group (order by revpar)    as med_revpar
  from base
  group by 1, 2, 3
)
select b.*,
       s.stratum_n,
       s.med_adr,
       s.med_occ,
       s.med_revpar,
       b.adr / nullif(s.med_adr, 0)       as adr_ratio,
       b.occupancy / nullif(s.med_occ, 0) as occ_ratio,
       b.revpar / nullif(s.med_revpar, 0) as revpar_ratio
from base b
join strata s
  on s.zone = b.zone
 and s.unit_kind is not distinct from b.unit_kind
 and s.beds_bucket = b.beds_bucket;

grant select on public.booking_market_product, public.booking_market_relative to service_role;
