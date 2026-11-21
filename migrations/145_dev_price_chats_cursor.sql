-- Где бот остановился читать чат (обращения «бот, …» вне сверки). Владелец 21.11.2026.
alter table dev_price_chats add column if not exists last_seen_msg_id bigint;
