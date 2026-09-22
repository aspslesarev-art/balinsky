-- CRM по застройщикам (раздел /admin/zastroyshchiki).
--
-- Устроена как CRM по агентам (082_agents.sql), но с одним принципиальным
-- отличием: агент — это человек, а застройщик — компания, внутри которой
-- несколько людей. Основатель, второй основатель, отдел продаж, иногда
-- посредник («связь через Ирину»). У каждого свой Telegram и своя
-- переписка у бота-наблюдателя. Поэтому воронка висит на компании, а
-- чаты и ИИ-разбор — на людях: dev_partners + dev_people.
--
-- Почему не переиспользовали agents: там tg_chat_id unique на карточке,
-- то есть один чат на карточку. У застройщика чатов столько, сколько
-- людей, и «последний контакт с компанией» — максимум по её людям.
--
-- Источник истины по самой компании (проекты, рейтинги, комиссия) —
-- raw_developers, который синхронизируется из Airtable. Сюда это НЕ
-- копируется: карточка хранит только ключ связи (site_developer_key) и
-- подтягивает остальное на лету, как карточка агента подтягивает чат.

create table if not exists public.dev_partners (
  id                  uuid primary key default gen_random_uuid(),

  name                text not null,

  -- Связка со страницей застройщика на сайте. developer_key —
  -- «Developer_key» из Airtable, он же используется в каталоге; slug
  -- держим рядом, чтобы карточка давала прямую ссылку на страницу без
  -- лишнего запроса. Может быть пусто: в отобранном списке есть
  -- компании, которых на сайте нет.
  site_developer_key  text,
  site_slug           text,

  -- Воронка. Один в один с агентами: переучиваться владельцу незачем,
  -- а шаги те же — написать, назначить встречу, встретиться, работать.
  status              text not null default 'new'
                      check (status in ('new', 'contact', 'to_schedule', 'scheduled', 'met', 'working', 'lost')),

  -- «Отклик» из отборной таблицы владельца: насколько вообще есть смысл
  -- заходить. Это НЕ этап воронки (можно быть «возможно» и уже на
  -- встрече), поэтому отдельным полем, а не статусом.
  prospect            text check (prospect in ('yes', 'maybe', 'unknown', 'no')),

  -- Взят в работу. Вся база (220+ компаний) лежит здесь же, но на доске
  -- воронки показываем только то, с чем реально работаем, — иначе доска
  -- превращается в каталог. Остальные видны во вкладке «Отбор».
  in_work             boolean not null default false,

  manager             text,
  location            text,

  -- Контакты самой компании (отдел продаж, сайт). Личные контакты людей
  -- живут в dev_people.
  website             text,
  email               text,
  phone               text,
  whatsapp            text,
  telegram            text,
  instagram           text,

  -- Проекты компании строкой, как они перечислены в общей базе. Это
  -- справка «кто это вообще», а не источник истины: истина — в
  -- raw_complexes, но там связка по-другому и не у всех застройщиков.
  projects            text,
  commission          text,

  last_contact        date,
  next_contact        date,
  next_step           text,
  notes               text,

  -- Всё остальное из выгрузок под оригинальными названиями: сырая
  -- строка контактов, страна/язык, пометки вида «ПУСТАЯ КАРТОЧКА» и
  -- откуда сведение. Новое поле не требует миграции.
  data                jsonb not null default '{}'::jsonb,

  sort                double precision not null default 0,
  archived            boolean not null default false,

  -- 'import' — из выгрузок, 'site' — только с сайта, 'manual' — руками.
  source              text not null default 'manual',

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists dev_partners_status_idx   on public.dev_partners (status) where not archived;
create index if not exists dev_partners_inwork_idx   on public.dev_partners (in_work) where not archived;
create index if not exists dev_partners_prospect_idx on public.dev_partners (prospect);
create index if not exists dev_partners_sitekey_idx  on public.dev_partners (site_developer_key);

-- Люди застройщика: основатели, отдел продаж, посредники.
--
-- Переписка здесь ровно та же механика, что у агента: tg_chat_id +
-- unique, сообщения читаются из tg_messages на лету. Unique — потому
-- что один и тот же диалог не может принадлежать двум людям, иначе
-- «последний контакт» по компании считался бы дважды.
create table if not exists public.dev_people (
  id                  uuid primary key default gen_random_uuid(),
  partner_id          uuid not null references public.dev_partners(id) on delete cascade,

  name                text not null,

  -- 'founder' — основатель или владелец, 'staff' — сотрудник (продажи,
  -- ассистент), 'via' — не работает в компании, но выход только через
  -- него («Басель Хуари связь через Ирину»). Последнее — реальный
  -- случай из отборной таблицы, и его нельзя записать в основатели.
  role                text not null default 'staff'
                      check (role in ('founder', 'staff', 'via')),
  position            text,

  telegram            text,
  tg_channel          text,
  instagram           text,
  whatsapp            text,
  phone               text,
  email               text,

  -- Как до него добраться, если напрямую нельзя: «приглашение через
  -- @npkotovich», «англоговорящий, живёт в Малайзии».
  access_note         text,

  tg_chat_id          bigint unique,

  ai_summary          text,
  ai_next_step        text,
  ai_updated_at       timestamptz,
  ai_last_message_id  bigint,

  notes               text,
  sort                double precision not null default 0,
  archived            boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists dev_people_partner_idx  on public.dev_people (partner_id, sort);
create index if not exists dev_people_telegram_idx on public.dev_people (telegram);

-- Лента карточки компании: заметки руками и системные отметки (сменили
-- статус, привязали чат, склеили дубль).
create table if not exists public.dev_partner_notes (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.dev_partners(id) on delete cascade,
  body        text not null,
  kind        text not null default 'note' check (kind in ('note', 'system')),
  author      text,
  created_at  timestamptz not null default now()
);

create index if not exists dev_partner_notes_partner_idx on public.dev_partner_notes (partner_id, created_at desc);

-- Пары «возможно одна и та же компания».
--
-- Зачем таблица, а не разовая сверка в скрипте: названия в трёх
-- источниках написаны по-разному («Oceaniq» / «OceaniQ Villas»,
-- «LB Group» / «LB Group (LOYO&BONDAR)»), и автоматическое сведение по
-- части названия даёт неверные склейки — «Taryan group» уезжает в
-- «Arya Properties». Точные совпадения импорт сводит сам, спорные
-- складывает сюда, а решение принимает владелец во вкладке «Похожие».
-- Решение запоминаем: 'distinct' — больше не спрашивать.
create table if not exists public.dev_merge_pairs (
  id          uuid primary key default gen_random_uuid(),
  left_id     uuid not null references public.dev_partners(id) on delete cascade,
  right_id    uuid not null references public.dev_partners(id) on delete cascade,
  -- Почему заподозрили: «по части названия», «похоже» — это же видит владелец.
  reason      text not null,
  state       text not null default 'pending' check (state in ('pending', 'merged', 'distinct')),
  decided_at  timestamptz,
  decided_by  text,
  created_at  timestamptz not null default now(),
  -- Пара симметрична; порядок в импорте фиксирован (старшая карточка слева),
  -- поэтому хватает уникальности по паре как она записана.
  unique (left_id, right_id)
);

create index if not exists dev_merge_pairs_state_idx on public.dev_merge_pairs (state);

alter table public.dev_partners      enable row level security;
alter table public.dev_people        enable row level security;
alter table public.dev_partner_notes enable row level security;
alter table public.dev_merge_pairs   enable row level security;

-- В проекте отозваны дефолтные гранты service_role — без этого новые
-- таблицы не видны даже сервисному ключу.
grant select, insert, update, delete on public.dev_partners      to service_role;
grant select, insert, update, delete on public.dev_people        to service_role;
grant select, insert, update, delete on public.dev_partner_notes to service_role;
grant select, insert, update, delete on public.dev_merge_pairs   to service_role;
