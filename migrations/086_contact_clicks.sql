-- Клики по кнопкам Telegram и WhatsApp по всему сайту.
--
-- Владелец хочет видеть, сколько людей пишут застройщикам: какой менеджер,
-- с какой страницы, в какой мессенджер. Одна строка = один клик. Пишет
-- /api/track/contact (глобальный перехватчик ContactClickTracker ловит
-- любую ссылку t.me/… и wa.me/…), читает /admin/kontakty.

create table if not exists public.contact_clicks (
  id              bigserial primary key,
  created_at      timestamptz not null default now(),

  channel         text not null check (channel in ('telegram', 'whatsapp')),
  -- Куда вела ссылка, без текста сообщения: t.me/<handle> или wa.me/<цифры>.
  target          text not null,
  -- Где стояла кнопка: manager-card, footer, … (data-contact-placement или
  -- id ближайшей секции).
  placement       text,

  page_path       text,
  page_kind       text,
  page_slug       text,
  page_title      text,

  -- Для кнопок менеджеров — кто на том конце.
  manager_id      text,
  manager_name    text,
  developer_name  text,

  lang            text,
  -- Случайный id из localStorage браузера: считать уникальных людей.
  visitor_id      text,
  -- Вошедший на сайт пользователь, если есть.
  telegram_id     bigint,
  country         text,
  device          text
);

create index if not exists contact_clicks_created_idx on public.contact_clicks (created_at desc);
create index if not exists contact_clicks_target_idx on public.contact_clicks (target);
create index if not exists contact_clicks_page_idx on public.contact_clicks (page_kind, page_slug);

alter table public.contact_clicks enable row level security;
grant select, insert, update, delete on public.contact_clicks to service_role;
grant usage, select on sequence public.contact_clicks_id_seq to service_role;
