-- ИИ-секретарь трекера плана (/plan).
--
-- plan_ai_tasks — задачи, которые секретарь ставит на день по переписке
-- и плану: «ответить Ольге про рассрочку», «отправить договор Oceaniq».
-- auto_close — задача вида «написать человеку»: закрывается сама, когда
-- в этом чате появляется наше сообщение после её постановки.
-- status: open — висит; done — сделано (done_by: owner — руками, chat —
-- по переписке); dropped — секретарь снял её при пересборке дня.
--
-- plan_days — утренний план словами и вечерний итог с оценкой дня.

create table if not exists public.plan_ai_tasks (
  id          bigserial primary key,
  day         date not null,
  title       text not null,
  detail      text,
  chat_id     bigint,
  contact     text,
  priority    int not null default 2 check (priority between 1 and 3),
  auto_close  boolean not null default false,
  status      text not null default 'open' check (status in ('open', 'done', 'dropped')),
  done_by     text check (done_by in ('owner', 'chat')),
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists plan_ai_tasks_day_idx on public.plan_ai_tasks (day);

create table if not exists public.plan_days (
  day         date primary key,
  brief       text,
  brief_at    timestamptz,
  review      text,
  score       int,
  review_at   timestamptz,
  updated_at  timestamptz not null default now()
);

alter table public.plan_ai_tasks enable row level security;
alter table public.plan_days enable row level security;

grant select, insert, update, delete on public.plan_ai_tasks to service_role;
grant select, insert, update, delete on public.plan_days to service_role;
grant usage, select on sequence public.plan_ai_tasks_id_seq to service_role;
