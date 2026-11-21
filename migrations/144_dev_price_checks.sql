-- Сверка цен с застройщиками в их Telegram-чатах (владелец 21.11.2026).
-- Бот на сервере (server/dev-updates/price_checks.py) раз в неделю
-- присылает в чат, что сейчас на сайте, разбирает ответ, переспрашивает
-- «правильно понял?» и после «да» застройщика вносит изменения.
create table if not exists dev_price_chats (
  chat_id bigint primary key,
  developer_name text not null,
  enabled boolean not null default false,
  lang text not null default 'ru',
  every_days int not null default 7,
  last_asked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists dev_price_checks (
  id bigserial primary key,
  chat_id bigint not null,
  developer_name text,
  state text not null default 'asked'
    check (state in ('asked', 'clarifying', 'confirming', 'applied', 'no_change', 'expired', 'error')),
  snapshot jsonb not null,             -- группы объявлений, показанные застройщику
  proposal jsonb,                      -- разобранные изменения, ждут «да»
  msg_ids bigint[] not null default '{}', -- сообщения чата, съеденные сверкой (бот новостей их пропускает)
  last_msg_id bigint not null default 0,
  asked_tg_id bigint,
  rounds int not null default 0,
  result jsonb,
  error text,
  asked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dev_price_checks_open on dev_price_checks (chat_id) where state in ('asked', 'clarifying', 'confirming');

alter table dev_price_chats enable row level security;
alter table dev_price_checks enable row level security;
grant all on dev_price_chats, dev_price_checks to service_role;
grant usage, select on sequence dev_price_checks_id_seq to service_role;
