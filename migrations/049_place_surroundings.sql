-- 049 — "What's around this listing", computed from public.bali_places.
--
-- Until now the only "Что рядом" data came from scripts/sync-nearby-places.mjs:
-- a paid Google Places call per listing, so coverage was partial (villas only)
-- and refreshing it cost money. The tourism sweep already sits in the database,
-- so the same picture — how many good hotels / restaurants / bars / spas are
-- within 1, 3 and 5 km — can be derived locally for every listing, for free.
--
-- Three pieces:
--   1. place_bucket()      — Google's 260 raw types folded into a dozen buckets.
--   2. listing_geo         — villa/apartment/complex coordinates, parsed out of
--                            the Airtable-era JSONB (villas keep them as JSON
--                            arrays of strings: ["-8.641934"]).
--   3. listing_surroundings + refresh_listing_surroundings() — the materialised
--                            answer, keyed by (kind, airtable_id).

-- ---------------------------------------------------------------- distance --
-- Plain haversine: PostGIS is not installed and 13.6k points do not need it.
create or replace function public.geo_dist_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable parallel safe as $$
  select 6371000 * acos(least(1, greatest(-1,
    sin(radians(lat1)) * sin(radians(lat2)) +
    cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2 - lng1))
  )))
$$;

-- ------------------------------------------------------------------ bucket --
-- Order matters. A beach club is a restaurant + bar + sometimes a hotel in
-- Google's types, and a resort carries `restaurant` too — so the more specific
-- reading wins: name-matched beach clubs first, then lodging, then venues.
create or replace function public.place_bucket(p_types text[], p_name text)
returns text
language sql immutable parallel safe as $$
  select case
    when coalesce(p_name, '') ~* '(beach club|day club|beachclub)' then 'beach_club'
    when p_types && array['hotel','resort_hotel','lodging','guest_house','bed_and_breakfast','hostel','motel','inn','extended_stay_hotel','cottage'] then 'hotel'
    when p_types && array['night_club','bar','wine_bar','pub','bar_and_grill','karaoke'] then 'bar'
    when p_types && array['cafe','coffee_shop','bakery','dessert_shop','ice_cream_shop','tea_house','juice_shop','breakfast_restaurant','brunch_restaurant'] then 'cafe'
    when p_types && array['steak_house','food_court','fine_dining_restaurant']
      or exists (select 1 from unnest(p_types) t where t like '%restaurant%') then 'restaurant'
    when p_types && array['spa','wellness_center','yoga_studio','massage','sauna','beauty_salon','hair_salon','nail_salon','barber_shop'] then 'spa'
    when p_types && array['gym','fitness_center','sports_complex','sports_club','sports_activity_location','swimming_pool','athletic_field'] then 'fitness'
    when p_types && array['beach'] then 'beach'
    when p_types && array['amusement_park','water_park','zoo','aquarium','playground','amusement_center','bowling_alley','movie_theater','childrens_camp'] then 'kids_fun'
    when p_types && array['coworking_space'] then 'coworking'
    when p_types && array['hindu_temple','place_of_worship','church','mosque'] then 'temple'
    when p_types && array['tourist_attraction','historical_landmark','national_park','park','museum','art_gallery','monument','observation_deck','hiking_area','botanical_garden','cultural_landmark','wildlife_park'] then 'attraction'
    when p_types && array['supermarket','convenience_store','grocery_store'] then 'grocery'
    when p_types && array['shopping_mall','department_store','clothing_store','jewelry_store','market','gift_shop','book_store','store'] then 'shopping'
    when p_types && array['hospital','clinic','doctor','dental_clinic','pharmacy','drugstore','medical_lab','physiotherapist','skin_care_clinic'] then 'health'
    when p_types && array['school','preschool','primary_school','secondary_school','university'] then 'school'
    else 'other'
  end
$$;

alter table public.bali_places add column if not exists bucket text;
update public.bali_places
   set bucket = public.place_bucket(types, name)
 where bucket is distinct from public.place_bucket(types, name);

create index if not exists bali_places_bucket_idx  on public.bali_places (bucket);
create index if not exists bali_places_lat_lng_idx on public.bali_places (lat, lng);

-- --------------------------------------------------------------- listings ---
-- Coordinates live in the Airtable-era JSONB under 'Geo' / 'Geo 2'. Villas and
-- apartments store them as JSON arrays of strings, complexes as plain strings,
-- and some carry a stray trailing space — so pull the first decimal out of the
-- text either way, then sanity-clamp to Bali's bounding box.
create or replace view public.listing_geo as
select kind, airtable_id, lat, lng from (
  select 'villa'::text as kind, airtable_id,
         substring(data->>'Geo'   from '-?[0-9]+\.[0-9]+')::double precision as lat,
         substring(data->>'Geo 2' from '-?[0-9]+\.[0-9]+')::double precision as lng
    from public.raw_villas
  union all
  select 'apartment', airtable_id,
         substring(data->>'Geo'   from '-?[0-9]+\.[0-9]+')::double precision,
         substring(data->>'Geo 2' from '-?[0-9]+\.[0-9]+')::double precision
    from public.raw_apartments
  union all
  select 'complex', airtable_id,
         substring(data->>'Geo'   from '-?[0-9]+\.[0-9]+')::double precision,
         substring(data->>'Geo 2' from '-?[0-9]+\.[0-9]+')::double precision
    from public.raw_complexes
) g
where lat between -8.95 and -8.02
  and lng between 114.40 and 115.80;

-- ----------------------------------------------------------- surroundings ---
create table if not exists public.listing_surroundings (
  kind        text not null,
  airtable_id text not null,
  lat         double precision not null,
  lng         double precision not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (kind, airtable_id)
);

comment on table public.listing_surroundings is
  'Per-listing summary of nearby tourist venues from bali_places: counts by bucket within 1/3/5 km, premium counts within 3 km, and the nearest premium places. Rebuilt by refresh_listing_surroundings().';

alter table public.listing_surroundings enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'listing_surroundings' and policyname = 'listing_surroundings_read'
  ) then
    create policy listing_surroundings_read on public.listing_surroundings for select using (true);
  end if;
end $$;

grant select on public.listing_surroundings to anon, authenticated;
grant all    on public.listing_surroundings to service_role;
grant select on public.listing_geo          to anon, authenticated, service_role;

-- Two quality bars, both deliberately conservative: "good" is what a foreign
-- tourist would actually walk into, "premium" is what a place gets recommended
-- for. Cheap warungs with a handful of ratings fall out on the review count.
create or replace function public.refresh_listing_surroundings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.listing_surroundings (kind, airtable_id, lat, lng, data, updated_at)
  select g.kind, g.airtable_id, g.lat, g.lng,
         jsonb_build_object(
           'r1',       s.r1,
           'r3',       s.r3,
           'r5',       s.r5,
           'premium3', s.p3,
           'top',      coalesce(t.top, '[]'::jsonb)
         ),
         now()
    from public.listing_geo g
    cross join lateral (
      with near as (
        select b.bucket,
               public.geo_dist_m(g.lat, g.lng, b.lat, b.lng) as d,
               (b.rating >= 4.5 and b.user_rating_count >= 300) as premium
          from public.bali_places b
         where b.lat between g.lat - 0.05 and g.lat + 0.05
           and b.lng between g.lng - 0.05 and g.lng + 0.05
           and b.rating >= 4.2
           and b.user_rating_count >= 50
           and b.bucket <> 'other'
      )
      select
        (select coalesce(jsonb_object_agg(bucket, c), '{}'::jsonb)
           from (select bucket, count(*) c from near where d <= 1000 group by 1) x) as r1,
        (select coalesce(jsonb_object_agg(bucket, c), '{}'::jsonb)
           from (select bucket, count(*) c from near where d <= 3000 group by 1) x) as r3,
        (select coalesce(jsonb_object_agg(bucket, c), '{}'::jsonb)
           from (select bucket, count(*) c from near where d <= 5000 group by 1) x) as r5,
        (select coalesce(jsonb_object_agg(bucket, c), '{}'::jsonb)
           from (select bucket, count(*) c from near where d <= 3000 and premium group by 1) x) as p3
    ) s
    left join lateral (
      select jsonb_agg(jsonb_build_object(
               'id',      b.id,
               'name',    b.name,
               'bucket',  b.bucket,
               'type',    b.primary_type,
               'rating',  b.rating,
               'reviews', b.user_rating_count,
               'price',   b.price_level,
               'lat',     b.lat,
               'lng',     b.lng,
               'dist_m',  round(public.geo_dist_m(g.lat, g.lng, b.lat, b.lng))::int,
               'photo',   b.data->'photos'->0->>'name'
             ) order by public.geo_dist_m(g.lat, g.lng, b.lat, b.lng)) as top
        from (
          select b2.*
            from public.bali_places b2
           where b2.lat between g.lat - 0.05 and g.lat + 0.05
             and b2.lng between g.lng - 0.05 and g.lng + 0.05
             and b2.rating >= 4.5
             and b2.user_rating_count >= 300
             and b2.bucket not in ('other', 'temple')
             and public.geo_dist_m(g.lat, g.lng, b2.lat, b2.lng) <= 5000
           order by public.geo_dist_m(g.lat, g.lng, b2.lat, b2.lng)
           limit 20
        ) b
    ) t on true
      on conflict (kind, airtable_id) do update
         set lat = excluded.lat, lng = excluded.lng,
             data = excluded.data, updated_at = excluded.updated_at;

  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.refresh_listing_surroundings() to service_role;
