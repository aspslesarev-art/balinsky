-- Линии маршрутов для карты «Как добраться» (владелец 23.10.2026):
-- {airport|canggu|ubud|uluwatu|sanur: [[lng, lat], ...]} по дорогам OSRM,
-- упрощённые. Заполняет scripts/route-lines.ts, бесплатно.
alter table public.listing_geo_facts add column if not exists route_lines jsonb;
