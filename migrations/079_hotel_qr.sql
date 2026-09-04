-- Сервис для отелей: гость сканирует QR в номере и попадает на страницу
-- своего номера, где может написать персоналу и заказать услугу.
--
-- Три сущности, из которых всё собирается:
--   hotel_properties — отель (у каждого свой код входа в панель стойки),
--   hotel_rooms      — номер; его `token` и зашит в QR-код,
--   hotel_stays      — заезд конкретного гостя в номер.
--
-- Смена гостя (stay) — не формальность, а разделитель приватности: переписка
-- и заказы висят на заезде, а не на номере, поэтому после выезда следующий
-- гость открывает ту же ссылку и видит чистый лист, а не чужие сообщения.

create table if not exists public.hotel_properties (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  address     text,
  -- Язык, на котором гостю открывается страница до того, как он сам
  -- переключил: 'en' для курортного отеля, 'ru' — где гости русские.
  lang        text not null default 'en' check (lang in ('en', 'ru')),
  -- Код входа в панель стойки. Раздаётся администрации отеля, меняется
  -- сменой строки — все сессии панели при этом слетают (см. lib/hotel/auth.ts).
  staff_code  text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.hotel_rooms (
  id          bigint generated always as identity primary key,
  hotel_id    bigint not null references public.hotel_properties(id) on delete cascade,
  -- То, что написано на двери: «204», «Villa Frangipani».
  label       text not null,
  -- Содержимое QR-кода: /stay/<token>. Короткий и без похожих символов,
  -- чтобы его можно было продиктовать голосом, если наклейка стёрлась.
  token       text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (hotel_id, label)
);

-- Меню услуг отеля: то, что гость видит кнопками («завтрак в номер»,
-- «уборка», «трансфер»). Пустое меню — не поломка: чат работает и без него.
create table if not exists public.hotel_services (
  id          bigint generated always as identity primary key,
  hotel_id    bigint not null references public.hotel_properties(id) on delete cascade,
  code        text not null,
  title       text not null,          -- как называется по-русски
  title_en    text,                   -- ...и по-английски; null → показываем title
  note        text,
  price_usd   numeric(10,2),
  sort        int not null default 100,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (hotel_id, code)
);

create table if not exists public.hotel_stays (
  id          bigint generated always as identity primary key,
  hotel_id    bigint not null references public.hotel_properties(id) on delete cascade,
  room_id     bigint not null references public.hotel_rooms(id) on delete cascade,
  guest_name  text,
  opened_at   timestamptz not null default now(),
  closed_at   timestamptz
);

-- В номере живёт один гость за раз: открытая смена может быть только одна.
-- На этом же индексе держится «выселить» в панели — закрыли смену, и
-- следующее сообщение из номера заводит новую.
create unique index if not exists hotel_stays_open_room
  on public.hotel_stays (room_id) where closed_at is null;

create index if not exists hotel_stays_hotel_open
  on public.hotel_stays (hotel_id, opened_at desc);

-- Заказ: либо кнопка из меню услуг (service_code), либо просьба словами.
create table if not exists public.hotel_requests (
  id            bigint generated always as identity primary key,
  hotel_id      bigint not null references public.hotel_properties(id) on delete cascade,
  room_id       bigint not null references public.hotel_rooms(id) on delete cascade,
  stay_id       bigint not null references public.hotel_stays(id) on delete cascade,
  service_code  text,
  title         text not null,
  note          text,
  status        text not null default 'new'
                check (status in ('new', 'in_progress', 'done', 'declined')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  closed_at     timestamptz
);

-- Главный экран стойки — «что сейчас висит по отелю», отсюда и порядок полей.
create index if not exists hotel_requests_hotel_status
  on public.hotel_requests (hotel_id, status, created_at desc);

create table if not exists public.hotel_messages (
  id                bigint generated always as identity primary key,
  hotel_id          bigint not null references public.hotel_properties(id) on delete cascade,
  room_id           bigint not null references public.hotel_rooms(id) on delete cascade,
  stay_id           bigint not null references public.hotel_stays(id) on delete cascade,
  author            text not null check (author in ('guest', 'staff')),
  staff_name        text,
  body              text not null,
  created_at        timestamptz not null default now(),
  -- Непрочитанное считаем с двух сторон: гостю — бейдж на странице номера,
  -- стойке — счётчик в списке номеров.
  read_by_staff_at  timestamptz,
  read_by_guest_at  timestamptz
);

create index if not exists hotel_messages_stay
  on public.hotel_messages (stay_id, created_at);

create index if not exists hotel_messages_hotel_unread
  on public.hotel_messages (hotel_id, created_at desc)
  where author = 'guest' and read_by_staff_at is null;

-- Читает и пишет только сервер (service_role): гость ходит через /api/stay,
-- стойка — через /api/hotel-desk. Анонимному ключу тут делать нечего,
-- RLS без политик закрывает таблицы для всех остальных.
alter table public.hotel_properties enable row level security;
alter table public.hotel_rooms      enable row level security;
alter table public.hotel_services   enable row level security;
alter table public.hotel_stays      enable row level security;
alter table public.hotel_requests   enable row level security;
alter table public.hotel_messages   enable row level security;

grant select, insert, update, delete on public.hotel_properties to service_role;
grant select, insert, update, delete on public.hotel_rooms      to service_role;
grant select, insert, update, delete on public.hotel_services   to service_role;
grant select, insert, update, delete on public.hotel_stays      to service_role;
grant select, insert, update, delete on public.hotel_requests   to service_role;
grant select, insert, update, delete on public.hotel_messages   to service_role;
