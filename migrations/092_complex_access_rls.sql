-- complex_access был создан без RLS: анонимный ключ мог не только читать,
-- но и менять/удалять строки (Supabase Security Advisor: rls_disabled_in_public).
-- Сайт только читает таблицу, пишут скрипты под service_role (он RLS обходит).

grant select, insert, update, delete on public.complex_access to service_role;
grant select on public.complex_access to anon, authenticated;
revoke insert, update, delete, truncate on public.complex_access from anon, authenticated;

alter table public.complex_access enable row level security;

drop policy if exists complex_access_public_read on public.complex_access;
create policy complex_access_public_read
  on public.complex_access for select
  to anon, authenticated
  using (true);
