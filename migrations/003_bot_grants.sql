-- Tables created via the Supabase SQL editor don't auto-grant access to the
-- service_role used by the webhook + admin routes. Without this the webhook
-- silently fails to log inbound messages and /admin/chats returns nothing.

grant all privileges on table public.bot_chats    to service_role;
grant all privileges on table public.bot_messages to service_role;
grant usage, select on sequence public.bot_messages_id_seq to service_role;
