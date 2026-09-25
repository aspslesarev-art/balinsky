-- Уведомление о заходе на лендинг теперь одно сообщение, которое бот
-- дописывает по ходу чтения (время, прокрутка, блоки). Для правки ему
-- нужен номер своего сообщения в Telegram.
alter table public.landing_visits add column if not exists tg_message_id bigint;
