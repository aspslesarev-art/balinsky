-- Трекер плана (/plan) следит за перепиской сам.
--
-- plan_steps — шаги, найденные в Telegram-переписке: ИИ прочёл сообщение
-- («отправил договор», «бронь внесена»), бот-наблюдатель нашёл прошедшую
-- встречу, или правило увидело касание после паузы. Задачи плана
-- закрываются подсчётом этих шагов (lib/plan/data.ts, поле a).
--
-- key — естественный ключ шага (ai:<чат>:<день>:<вид>, mt:<чат>:<время>,
-- ping:<msg>): повторный прогон ничего не дублирует, а один вид шага с
-- одним человеком засчитывается не чаще раза в сутки.
-- rejected — владелец сказал «не засчитывать»: шаг остаётся для истории,
-- но в счёт не идёт и заново не появится.

create table if not exists public.plan_steps (
  id          bigserial primary key,
  key         text not null unique,
  kind        text not null,
  ts          timestamptz not null,
  source      text not null check (source in ('ai', 'meeting', 'rule')),
  chat_id     bigint,
  message_id  bigint,
  meeting_id  bigint,
  role        text,
  contact     text,
  note        text,
  rejected    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists plan_steps_ts_idx on public.plan_steps (ts);

-- До какого сообщения каждый чат уже прочитан ИИ, и с кем этот чат.
create table if not exists public.plan_chat_scan (
  chat_id          bigint primary key,
  last_message_id  bigint not null,
  role             text,
  updated_at       timestamptz not null default now()
);

-- Снятая руками галочка с задачи, которую закрыла переписка: без этого
-- флага подсчёт тут же поставил бы её обратно.
alter table public.plan_tasks add column if not exists auto_off boolean not null default false;

alter table public.plan_steps enable row level security;
alter table public.plan_chat_scan enable row level security;

grant select, insert, update, delete on public.plan_steps to service_role;
grant select, insert, update, delete on public.plan_chat_scan to service_role;
grant usage, select on sequence public.plan_steps_id_seq to service_role;
