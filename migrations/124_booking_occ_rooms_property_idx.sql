-- Загрузка соседа в «Что рядом сдают» (migrations/123) читает снимки
-- многономерного объекта по property_id; первичный ключ начинается с
-- run_date, поэтому без этого индекса каждый объект ленты = полный скан
-- (лента в Чангу — 5 с вместо 0,3 с).
create index if not exists booking_occ_rooms_tonight_property
  on public.booking_occ_rooms_tonight (property_id, run_date);
