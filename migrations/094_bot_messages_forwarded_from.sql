-- Пересланные владельцем в @BalinskyBot посты застройщиков: откуда переслано
-- (название чата/канала или имя автора). Сервер dev-updates берёт такие
-- сообщения из чата владельца и делает из них карточку статьи — это путь для
-- чатов, где бот не видит сообщений (добавлен до отключения privacy mode,
-- а сделать его админом может только застройщик).
alter table public.bot_messages add column if not exists forwarded_from text;
-- Когда пост был опубликован в исходном чате (forward_origin.date) — дата для статьи.
alter table public.bot_messages add column if not exists forwarded_at timestamptz;
