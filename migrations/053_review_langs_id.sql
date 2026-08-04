-- 053 — the two-sided test for "is this place visited by foreigners".
--
-- Places has no neutral review sample: it returns the five reviews most
-- relevant to the language you ask for, and omitting languageCode just defaults
-- to English. So a single sweep can only ever say "English reviews exist here".
--
-- Asking twice settles it:
--   rev_langs     — sweep with English preference  (migration 052)
--   rev_langs_id  — sweep with Indonesian preference
--
-- If a place still answers in English when we ASK for Indonesian, it has no
-- meaningful local review base — a genuine tourist spot. If it answers with a
-- full five Indonesian reviews, locals are its audience, however many English
-- reviews it also has.

alter table public.bali_places add column if not exists rev_langs_id   jsonb;
alter table public.bali_places add column if not exists rev_sampled_id integer;

comment on column public.bali_places.rev_langs_id is
  'Review-language histogram from the Indonesian-preference sweep. Compare with rev_langs (English preference): a low local share HERE is the strong tourist signal.';

-- Column set changes, so CREATE OR REPLACE would fail ("cannot change name of
-- view column") — drop first.
drop view if exists public.place_tourist_profile;

create view public.place_tourist_profile as
with lang as (
  select b.id, b.name, b.bucket, b.lat, b.lng, b.rating, b.user_rating_count,
         b.rev_sampled, b.rev_sampled_id,
         coalesce((select sum(v::int) from jsonb_each_text(b.rev_langs) as e(k, v)
                    where k not in ('id','jv','su','ms','ban')), 0) as foreign_en_pref,
         coalesce((select sum(v::int) from jsonb_each_text(b.rev_langs_id) as e(k, v)
                    where k in ('id','jv','su','ms','ban')), 0)     as local_id_pref
    from public.bali_places b
)
select id, name, bucket, lat, lng, rating, user_rating_count,
       rev_sampled, rev_sampled_id,
       foreign_en_pref, local_id_pref,
       -- Share of the Indonesian-preference sample that actually came back
       -- local. Low = tourists own the place, high = locals do.
       case when coalesce(rev_sampled_id, 0) = 0 then null
            else round(100.0 * local_id_pref / rev_sampled_id) end as local_share,
       case when coalesce(rev_sampled_id, 0) = 0 then null
            else round(100.0 * (rev_sampled_id - local_id_pref) / rev_sampled_id) end as foreign_share,
       case
         when coalesce(rev_sampled_id, 0) = 0 then null
         when local_id_pref = 0                     then 'tourist_only'
         when local_id_pref <= rev_sampled_id * 0.4 then 'tourist_mostly'
         when local_id_pref >= rev_sampled_id * 0.8 then 'local'
         else 'mixed'
       end as tourist_grade
  from lang;

grant select on public.place_tourist_profile to anon, authenticated, service_role;
