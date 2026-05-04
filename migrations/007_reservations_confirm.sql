-- Add 'confirmed' status between 'pending' (visitor just submitted) and
-- 'invoice_sent' (operator emailed the invoice). Until the operator
-- taps "Подтвердить" in the Telegram bot, the listing on the site is
-- NOT marked as held — that prevents the "I reserved it but the
-- operator never had it" race.
--
-- Status walk now:
--   pending → awaiting operator confirmation in Telegram
--     ✅ confirmed → active hold, listing shows "Reserved" banner
--        ↳ invoice_sent → счёт отправлен оператором
--          ↳ paid
--     ❌ cancelled / expired

alter table public.reservations
  drop constraint if exists reservations_status_check;

alter table public.reservations
  add constraint reservations_status_check
  check (status in ('pending','confirmed','invoice_sent','paid','cancelled','expired'));
