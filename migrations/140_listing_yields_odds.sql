-- Самая вероятная доходность на Pro-карточке (владелец 31.10.2026: «вероятность
-- непонятна — хочу видеть самую вероятную доходность и шанс для нижней и
-- верхней цифры»). odds — по соседям рядом (2–3 км, мало — 10 км): likely
-- (медиана того, что дали бы объекту соседи), q25/q75, kLow/kHigh из n,
-- radiusM; area_odds — то же по округе 10 км. Доли — в процентах.
-- Пишет scripts/build-listing-yields.ts; прежние chance/chance_k/chance_n/
-- area_k/area_n больше не заполняются.
alter table public.listing_yields
  add column if not exists odds      jsonb,
  add column if not exists area_odds jsonb;
