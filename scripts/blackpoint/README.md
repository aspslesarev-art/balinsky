# Сбор каталога Blackpoint

Обновление готовых объектов и переуступок с blackpoint.group/ru/marketplace (17.11.2026: 221 объект, коммерция не берётся).

1. Список страниц: `sitemap_ru-RU.xml` → `marketplace/*` → `ru.txt` (по строке на slug).
2. `python3 download.py` — скачивает страницы в `bpp/` (запускать из рабочей папки с `ru.txt`).
3. Разбор категорий в `bp_all.json` (slug, tag, price) — см. историю сессии 17.11; затем
   `python3 build.py <папка со скриптами> bpp bp_all.json data/imports/blackpoint.json out.json`.
4. Скопировать `out.json` в `data/imports/blackpoint.json` и запустить
   `node --env-file=.env.local scripts/import-blackpoint.mjs`.

Цена берётся из данных страницы (в HTML видна только заглушка «Rp 15.000.000»).
