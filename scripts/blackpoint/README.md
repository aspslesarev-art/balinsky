# Сбор каталога Blackpoint

Обновление готовых объектов и переуступок с blackpoint.group/ru/marketplace (17.11.2026: 221 объект, коммерция не берётся).

1. Список страниц: `sitemap_ru-RU.xml` → `marketplace/*` → `ru.txt` (по строке на slug).
2. `python3 download.py` — скачивает страницы в `bpp/` (запускать из рабочей папки с `ru.txt`).
3. Разбор категорий в `bp_all.json` (slug, tag, price) — см. историю сессии 17.11; затем
   `python3 build.py <папка со скриптами> bpp bp_all.json data/imports/blackpoint.json out.json`.
4. Скопировать `out.json` в `data/imports/blackpoint.json` и запустить
   `node --env-file=.env.local scripts/import-blackpoint.mjs`.

Цена берётся из данных страницы (в HTML видна только заглушка «Rp 15.000.000»).

## Строящиеся комплексы (17.11.2026)

`import_bp_cx.py` — заливка ЖК из разбора (рядом должны лежать offplan_full.json, group*_result.json,
raw_complexes.json, raw_developers.json, raw_*_slugs.json — см. сессию 17.11). Итог и источники:
`data/imports/blackpoint-complexes-2026-11-17.json`. После заливки: `node scripts/sync-detail-indexes.mjs`,
затем revalidate. Новые страницы не открывать до revalidate — 404 закэшируется на неделю (лечится повторным revalidate).
