-- Обновления из чатов застройщиков → готовая статья на сайт.
-- Сервер (smarthouse, dev-updates/worker.mjs) склеивает пачку сообщений
-- одного чата (текст + альбом фото) в одну запись, Claude пишет черновик,
-- владелец получает его в @BalinskyBot с кнопками. Нажатие кнопки
-- (app/api/telegram → lib/dev-updates.ts) ставит status = approved и kind,
-- сервер переводит и публикует.
--
-- status: noise — не новость (болтовня, вопросы), владельцу не показывали;
-- pending — ждёт решения; approved — выбрано, ждёт публикации;
-- published — на сайте; skipped — владелец отказался; error — сбой.
-- last_msg_id — до какого bot_messages.id чат разобран (курсор сервера).

create table if not exists public.dev_updates (
  id              bigserial primary key,
  chat_id         bigint not null,
  developer_slug  text,
  developer_name  text,
  msg_ids         bigint[] not null,
  last_msg_id     bigint not null,
  status          text not null default 'pending'
                  check (status in ('noise', 'pending', 'approved', 'published', 'skipped', 'error')),
  suggested_kind  text check (suggested_kind in ('news', 'promo', 'event', 'construction')),
  kind            text check (kind in ('news', 'promo', 'event', 'construction')),
  draft           jsonb not null default '{}'::jsonb,
  media           jsonb not null default '[]'::jsonb,
  tg_message_id   bigint,
  published_url   text,
  error           text,
  created_at      timestamptz not null default now(),
  decided_at      timestamptz,
  published_at    timestamptz
);

create index if not exists dev_updates_status_idx on public.dev_updates (status);
create index if not exists dev_updates_chat_idx on public.dev_updates (chat_id, last_msg_id desc);

alter table public.dev_updates enable row level security;
grant select, insert, update, delete on public.dev_updates to service_role;
grant usage, select on sequence public.dev_updates_id_seq to service_role;
