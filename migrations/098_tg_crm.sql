-- Личная CRM Андрея по всем Telegram-чатам (снимок из ~/tg-crm: история через Telethon,
-- разбор - Claude в сессии, без платных API). Видит только владелец: страница /admin/crm.
-- Переписка целиком лежит в приватном бакете tg-crm (<chat_id>.json.gz), в таблице только выжимка.
create table if not exists public.tg_crm_contacts (
  chat_id bigint primary key,
  name text not null,
  username text,
  kind text not null check (kind in ('user', 'group')),
  members int,
  msg_count int not null default 0,
  my_msg_count int not null default 0,
  first_at timestamptz,
  last_at timestamptz,
  last_from_me boolean,
  analyzed boolean not null default false,  -- false: короткий/односторонний чат, карточка по правилам
  who text,                     -- кто это, одной строкой
  category text,                -- клиент, застройщик, агент, партнёр, сервис, команда, друг, семья, знакомый, холодный, другое
  relationship smallint check (relationship between 1 and 10),
  relationship_why text,
  summary text,
  status text,                  -- ждёт моего ответа / жду ответа / закрыто / тишина
  awaiting_reply boolean not null default false,
  awaiting_what text,
  my_promises jsonb not null default '[]',    -- [{text, date, done}]
  their_promises jsonb not null default '[]',
  money jsonb not null default '[]',          -- [{who_owes: 'я'|'мне', what, amount, date, settled}]
  next_action text,
  updated_at timestamptz not null default now()
);
create index if not exists tg_crm_contacts_last on public.tg_crm_contacts (last_at desc);
alter table public.tg_crm_contacts enable row level security;
revoke all on public.tg_crm_contacts from anon, authenticated;
grant select, insert, update, delete on public.tg_crm_contacts to service_role;

insert into storage.buckets (id, name, public) values ('tg-crm', 'tg-crm', false)
on conflict (id) do nothing;
