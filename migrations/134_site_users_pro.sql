-- Доступ Pro по решению владельца (админка /admin/pro, кнопки в боте) — 23.10.2026.
-- pending — вошёл, ждёт решения; granted — видит аналитику; denied — нет.
-- email — адрес для входа по почте/Google (раньше не хранился), для поиска в админке.
alter table public.site_users
  add column if not exists pro text not null default 'pending' check (pro in ('pending', 'granted', 'denied')),
  add column if not exists pro_changed_at timestamptz,
  add column if not exists pro_notified_at timestamptz,
  add column if not exists email text;
-- Все, кто уже зарегистрирован, сохраняют доступ.
update public.site_users set pro = 'granted', pro_changed_at = now(), pro_notified_at = now();
