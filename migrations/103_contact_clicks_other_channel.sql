-- Кнопка «Другой мессенджер» у менеджера (WeChat, LINE, Viber…) пишет
-- клики и заявки с channel = 'other'. Какой именно мессенджер — в заявке
-- в боте, здесь только канал.
alter table public.contact_clicks drop constraint if exists contact_clicks_channel_check;
alter table public.contact_clicks
  add constraint contact_clicks_channel_check check (channel in ('telegram', 'whatsapp', 'other'));
