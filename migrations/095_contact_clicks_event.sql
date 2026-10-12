-- Кнопки Telegram / WhatsApp у менеджеров застройщиков открывают форму
-- заявки (ContactLeadDialog). Считаем воронку в той же таблице:
-- 'click' — нажатие на кнопку, 'lead' — отправленная форма.
alter table public.contact_clicks
  add column if not exists event text not null default 'click'
  check (event in ('click', 'lead'));
