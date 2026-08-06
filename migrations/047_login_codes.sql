-- Вход по одноразовому 4-значному коду из Telegram.
--
-- Поток: посетитель жмёт «Войти» → сайт заводит здесь строку и кладёт
-- `challenge` в httpOnly-куку, а в deep-link боту передаёт его же
-- (`t.me/BalinskyBot?start=code_<challenge>`) → бот выдаёт код и вписывает
-- его в эту же строку → посетитель вводит код на сайте.
--
-- ПОЧЕМУ КОД ПРИВЯЗАН К БРАУЗЕРУ. Четыре цифры — это 10 000 комбинаций.
-- Если искать код глобально по значению, перебор попадал бы в чужой
-- аккаунт тем вероятнее, чем больше кодов активно одновременно. Проверка
-- идёт по паре challenge+code, поэтому подбирать приходится код к своей же
-- строке и ограниченное число раз.
-- По этой же причине глобальная уникальность кода не нужна: одинаковые
-- коды у разных людей друг другу не мешают.
--
-- Старый механизм одноразовых ссылок (`login_tokens`, миграция 046)
-- продолжает работать: бот всё ещё понимает `?start=login`.
create table if not exists public.login_codes (
  -- Секрет браузера: httpOnly-кука + payload deep-link'а.
  challenge   text        primary key,
  -- NULL, пока бот не выдал код: строку заводит сайт, код вписывает бот.
  code        text,
  telegram_id bigint      references public.site_users(telegram_id) on delete cascade,
  attempts    smallint    not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);

create index if not exists login_codes_expires_idx on public.login_codes (expires_at);

-- Как и соседние таблицы, доступна только через service key на сервере.
alter table public.login_codes enable row level security;

-- Без явного гранта service_role получает "permission denied" в рантайме.
grant select, insert, update, delete on public.login_codes to service_role;
