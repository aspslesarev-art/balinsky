-- Черновик сообщения к задаче секретаря: готовый текст, который владелец
-- может поправить и отправить прямо с дашборда /plan. goal — к чему ведёт
-- сообщение: call — созвон, meeting — встреча, reply — просто ответ.

alter table public.plan_ai_tasks add column if not exists draft text;
alter table public.plan_ai_tasks add column if not exists goal text check (goal in ('call', 'meeting', 'reply'));
