-- 052 — who actually reviews this place: locals or foreign tourists.
--
-- Every review Google returns carries `originalText.languageCode`, which is a
-- good proxy for who left it. The catch: Places serves the five reviews most
-- relevant to the language you ASK FOR, so the pass 1-3 sample (languageCode:
-- 'ru') shows ~100% foreign reviews even on a local warung — useless for this.
-- A separate language-neutral sweep (`collect-bali-tourism.mjs --lang=none`)
-- gives an unbiased sample, and scripts/load-review-langs.mjs lands it here.
--
-- Stored as a histogram rather than a single score so the reading can change
-- later without re-buying the data (e.g. "European only" vs "any foreigner").

alter table public.bali_places add column if not exists rev_langs      jsonb;
alter table public.bali_places add column if not exists rev_sampled    integer;
alter table public.bali_places add column if not exists rev_neutral_at timestamptz;

comment on column public.bali_places.rev_langs is
  'Histogram of review original languages from the language-neutral sweep, e.g. {"en":3,"id":1,"ru":1}. NOT comparable with the biased pass 1-3 reviews in data->reviews.';

create index if not exists bali_places_rev_sampled_idx on public.bali_places (rev_sampled);

-- Indonesian and its regional languages mean the reviewer is local; anything
-- else means a visitor. Bahasa Bali ('ban') counts as local too.
create or replace view public.place_tourist_profile as
select b.id, b.name, b.bucket, b.lat, b.lng, b.rating, b.user_rating_count,
       b.rev_sampled,
       coalesce((select sum(v::int) from jsonb_each_text(b.rev_langs) as e(k, v)
                  where k in ('id','jv','su','ms','ban')), 0) as local_reviews,
       coalesce((select sum(v::int) from jsonb_each_text(b.rev_langs) as e(k, v)
                  where k not in ('id','jv','su','ms','ban')), 0) as foreign_reviews,
       case when coalesce(b.rev_sampled, 0) = 0 then null
            else round(100.0 * coalesce((select sum(v::int) from jsonb_each_text(b.rev_langs) as e(k, v)
                                          where k not in ('id','jv','su','ms','ban')), 0) / b.rev_sampled)
       end as foreign_share
  from public.bali_places b;

grant select on public.place_tourist_profile to anon, authenticated, service_role;
