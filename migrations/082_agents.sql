-- CRM по агентам (раздел /admin/agenty).
--
-- Раньше агенты жили в Notion: доска по статусам + карточка с анкетой
-- (как общаться, что продаёт, хобби, подарки). База переезжает сюда
-- целиком — Notion остаётся архивом, источник истины теперь Supabase.
--
-- Почему не коллекция в /admin/data: тому движку нужен плоский грид, а
-- здесь смысл именно в воронке (доска по статусам) и в связке карточки с
-- живой перепиской бота-наблюдателя (tg_messages / tg_meetings).
--
-- Структурными колонками стали только те поля, по которым реально
-- фильтруют, сортируют и считают воронку. Вся остальная анкета лежит в
-- jsonb `data` под теми же именами, что были в Notion, — так ничего из
-- 43 полей выгрузки не теряется, а добавить новый вопрос можно без
-- миграции (тот же приём, что в raw_* каталога).

create table if not exists public.agents (
  id                uuid primary key default gen_random_uuid(),

  name              text not null,
  agency            text,

  -- Воронка. Пять статусов повторяют доску в Notion, ещё два закрывают
  -- её с конца: до этого «проведена встреча» была тупиком и по карточке
  -- нельзя было понять, работаем мы с агентом или он отвалился.
  status            text not null default 'new'
                    check (status in ('new', 'contact', 'to_schedule', 'scheduled', 'met', 'working', 'lost')),

  manager           text,
  position          text,
  location          text,

  -- Контакты. telegram хранится БЕЗ «@» и в нижнем регистре: по нему
  -- карточка сама находит свой чат у бота (tg_messages.contact содержит
  -- ник в виде «Имя (@nick)»).
  telegram          text,
  whatsapp          text,
  phone             text,
  email             text,

  -- Факты сделок из Notion; заполнены примерно у половины базы.
  deals_count       int,
  deals_volume_usd  numeric,

  last_contact      date,
  next_contact      date,
  next_step         text,

  -- Свободная заметка в карточке (одно поле, история — в agent_notes).
  notes             text,

  -- Вся остальная анкета под оригинальными названиями Notion.
  data              jsonb not null default '{}'::jsonb,

  -- Привязка к личной переписке владельца. Чат у агента максимум один,
  -- поэтому unique: иначе один и тот же диалог попал бы в две карточки и
  -- «последний контакт» считался бы дважды.
  tg_chat_id        bigint unique,

  -- ИИ-выжимка переписки. ai_last_message_id — до какого сообщения уже
  -- разобрано, чтобы ночной прогон не платил заново за неизменившийся чат.
  ai_summary        text,
  ai_next_step      text,
  ai_updated_at     timestamptz,
  ai_last_message_id bigint,

  -- Порядок карточки внутри колонки доски (drag & drop).
  sort              double precision not null default 0,
  archived          boolean not null default false,

  -- Откуда карточка: 'notion' — импорт выгрузки, 'chat' — заведена из
  -- переписки бота, 'manual' — руками в админке.
  source            text not null default 'manual',

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists agents_status_idx   on public.agents (status) where not archived;
create index if not exists agents_agency_idx   on public.agents (agency);
create index if not exists agents_telegram_idx on public.agents (telegram);
create index if not exists agents_manager_idx  on public.agents (manager);

-- Лента карточки: заметки руками и автоматические отметки (привязали чат,
-- сменили статус). Переписка и встречи сюда НЕ копируются — они читаются
-- из tg_messages/tg_meetings по tg_chat_id, чтобы не держать две копии.
create table if not exists public.agent_notes (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.agents(id) on delete cascade,
  body        text not null,
  -- 'note' — написал человек, 'system' — записала админка сама.
  kind        text not null default 'note' check (kind in ('note', 'system')),
  author      text,
  created_at  timestamptz not null default now()
);

create index if not exists agent_notes_agent_idx on public.agent_notes (agent_id, created_at desc);

alter table public.agents      enable row level security;
alter table public.agent_notes enable row level security;

-- В проекте отозваны дефолтные гранты service_role — без этого новая
-- таблица не видна даже сервисному ключу.
grant select, insert, update, delete on public.agents      to service_role;
grant select, insert, update, delete on public.agent_notes to service_role;
