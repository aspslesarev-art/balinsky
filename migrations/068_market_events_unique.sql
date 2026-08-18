-- Одно событие одного вида на юнит в день. Делает повторный прогон
-- источника за те же сутки безопасным: ручной перезапуск или второй тик
-- крона не размножат «продан» и «цена упала».
create unique index if not exists market_unit_events_unique
  on public.market_unit_events (unit_id, d, kind);
