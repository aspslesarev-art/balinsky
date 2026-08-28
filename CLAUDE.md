# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

balinsky.info — a bilingual (RU primary / EN mirror) Bali real-estate site: villas, apartments, residential complexes, developers, plus an AI consultant and a Telegram bot. Next.js 16 App Router + React 19 + Tailwind v4, data in Supabase (Postgres + Storage), sourced from Airtable, deployed on Vercel.

## Commands

- `npm run dev` — dev server with hot reload at http://localhost:3000. Prints a `Network:` URL for testing on a phone over Wi-Fi (most layout work here is mobile-first).
- `npm run build && npm run start` — production build, 1:1 with what Vercel ships. Use this to catch build/type errors and real caching/perf before pushing.
- `npm run lint` — ESLint. There is **no unit-test framework** (no jest/vitest); the only tests are ad-hoc node scripts, e.g. `node scripts/test-investment.mjs`.
- Deploy is automatic: push to `main` → Vercel production. Push any other branch → Vercel preview URL (use this to preview before prod without touching `main`).

## Working rules (definition of done)

1. **Typecheck + lint before calling a task done.** Run `npx tsc --noEmit` (there is no `typecheck` script) and `npm run lint`, and fix any errors you introduced yourself — don't hand back a task with a red typecheck/lint.
2. **Verify layout changes with Playwright.** For any UI/markup change, open the affected page and take screenshots at **both mobile (~412px) and desktop (~1280px)** viewports, and actually look at them. Playwright is not yet a dependency — install on first use (`npm i -D @playwright/test && npx playwright install chromium`).
3. **Change only what was asked.** No drive-by refactors, renames, reformatting, or "while I'm here" cleanups in files you're touching for another reason. If you spot something worth fixing, mention it instead of doing it unprompted.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Data flow (the core mental model)

**Supabase is the source of truth. Airtable was retired on 2026-07-22** — its
workflows, webhook and cron are deleted and its scripts sit disabled in
`scripts/legacy-airtable/`. Editing happens in the admin CRUD at `/admin/data`.
Content still reaches the site two ways, and **which one matters when you change a loader**:

1. **SQL-backed** (villas, apartments, complexes, rentals, developers): rows live in Supabase `raw_<table>` with a JSONB `data` column holding *all* fields (no allowlist) under their original Airtable-era names. Pages read these via `lib/*` loaders. Field access is `data['Field Name']` through helpers like `tField`/`firstString`/`numberOrNull` — fields are loosely typed.
2. **Manifest-backed** (events, news, promo, knowledge, managers, videos, and **all photos**): data is a JSON manifest in Supabase Storage, written by the admin adapters.

**An edit has to invalidate three layers** (`lib/admin/revalidate.ts` does all three; skipping one is why edits used to look like no-ops):
- `content_version` (`lib/content-version.ts`) — the ONLY way to flush the module-level caches in `app/ru/*/_lib.ts` and the detail-page by-id caches. `revalidateTag` cannot reach process memory. Wrap such caches in `lib/revisioned-cache.ts`.
- cache tags + ISR paths from `lib/content-revalidate-map.ts`, fanned out over all ten locales.
- the slug index the detail pages resolve through (`lib/admin/detail-index.ts`).

When you add an `unstable_cache` loader for editable content, give it a `content:*` tag — an untagged one goes stale for its full TTL and no invalidation can touch it.

**Detail pages resolve by slug, load by id.** Admin mutations patch the slug→id index inline; `scripts/sync-detail-indexes.mjs` rebuilds it nightly as a safety net; `_detail.tsx` files use it (`resolveVilla` etc.) then `_loadXById(airtable_id)`. The villa/apt/complex `_detail.tsx` files are large async Server Components that fan out data with one `Promise.all` and render the whole page.

## Caching & egress (this codebase is egress-sensitive — don't regress it)

- **`lib/safe-cached-table.ts`** wraps `unstable_cache` for "load whole table" loaders. It throws (instead of caching) on PostgREST errors or unexpectedly-empty results so a transient flake can't poison the cache with zeros for the full TTL. Use it for full-table reads; do **not** use it for read-by-id (where null is legitimate). Bump its `cacheKey` on deploy to clear a poisoned slot.
- Pages use `revalidateTag` with content tags (e.g. `content:complexes`, `content:developers`) — the webhook and syncs invalidate these.
- **Photos/manifests go through a CDN, not Supabase directly**, to cut egress. `lib/photo-cdn.ts`: `cdnRewrite` (Bunny path-strip), `cdnBucketBase`, and `cdnManifestUrl` (Cloudflare host-swap + coarse time-bucket cache-bust → edge HITs, ~one origin fetch per TTL bucket). No-op when `NEXT_PUBLIC_PHOTO_CDN_BASE` is unset (local dev). When building Storage URLs in app code, route them through these helpers. Full-data JSONB scans are an egress trap — prefer JSON projection + `unstable_cache`.

## i18n

`lib/i18n.ts` (`t`, `tField`, `Lang`). RU is primary, EN mirrors it. **EN URL segments are localized** (`/en/villas`, `/en/apartments`, …) but the listing **slug is identical** across languages — only the path segment differs. Russian/Latin districts are normalized via `lib/district-ru.ts` / `lib/translit.ts`.

## AI / bot

**Azure OpenAI выведен из проекта 28.08.2026** — подписку закрыли, ключи отозвали. Всё, что на неё опиралось, отвечало 401 и молча ломалось по отдельности: Балина в Telegram, голосовой виджет, эмбеддинги, расшифровка голосовых, генерация в админке. Фолбэков не было ни у одного из них.

- **Единая точка доступа — `lib/openai.ts`**: клиент и выбор моделей (`CHAT_MODEL`, `EMBEDDINGS_MODEL`, `TRANSCRIBE_MODEL`). Новый вызов модели идёт через него, а не через собственный `new OpenAI(...)`.
- `EMBEDDINGS_MODEL` — `text-embedding-3-large`, усечённая до 1536 измерений. **Менять её нельзя**, не пересчитав весь индекс: векторы из другой модели лежат в другом пространстве, и поиск начнёт молча возвращать мусор.
- Работает от `OPENAI_API_KEY` (есть в Vercel Production).
- **Стоимость каждого вызова логируется** в Supabase `balina_usage` через `lib/usage-tracker.ts` (fire-and-forget); `/admin/usage` агрегирует. Эта таблица — крючок для лимита расходов.
- **Долг:** ~26 скриптов в `scripts/` всё ещё читают `AZURE_OPENAI_*` и работать не будут. Переводить по мере надобности — на `OPENAI_API_KEY` и модели из `lib/openai.ts`. Уже переведён `scripts/translate-missing.mjs`.

## Maps

Google Maps is loaded **client-side** per route via `lib/google-maps-loader.ts` (dynamic maps on `/karta` pages, detail pages, and `InvestmentWidget`) — billed per map load, so traffic spikes cost money. Server-side Places/Geocoding runs only in sync scripts (`scripts/sync-nearby-places.mjs`, `geocode-competitors.mjs`).

## Mobile layout gotcha (read before touching widths)

`app/globals.css` has a defensive `@layer base { main * { max-width: 100% } ... { min-width: 0 } }` net: **every element under `<main>` is capped at its parent's width**. This silently clamps `w-full`/`w-screen`/`calc()`/inline widths. The sanctioned escape hatch (utilities beat base layer) is an explicit Tailwind `max-w-*` utility — use `max-w-none` to make an element full-bleed (e.g. edge-to-edge carousels/galleries use `-mx-6 w-screen max-w-none`). `<main>` itself is not covered by `main *`, so it needs its own `min-w-0` to avoid being blown wide by a carousel's min-content. See `components/PageContainer.tsx`. Inline `<style jsx>` is broken by Turbopack — put keyframes in `globals.css`.

## Reviews heatmap (Google POIs)

A "Тепловая карта Google-мест" toggle shows where it's lively for tourists —
density of well-reviewed restaurants/bars/attractions/wellness/beach clubs
(cheap warungs filtered out), **not** rental density.
- Data: `competitors/_heat_pois.json` — tourist POIs aggregated to a ~0.5 km grid
  (cells + p92 `max`). Built by `scripts/build-heat-pois.mjs` from the
  per-listing `_nearby_places` files **plus** `scripts/collect-anchor-pois.mjs`
  (a one-off Google Places sweep, `competitors/_heat_anchors.json`, for districts
  with no listings — Lovina/Amed/Ubud-gaps etc.). Re-run `node
  scripts/build-heat-pois.mjs` after a nearby sync to refresh.
- **Server-side Places calls use `GOOGLE_PLACES_KEY`** (dedicated key, no
  referrer restriction). The public `NEXT_PUBLIC_GOOGLE_MAPS_KEY` 403s on
  server-side Places (it's referrer-locked to balinsky.info) — so localhost
  also can't render the maps at all.
- Render: `lib/heat-overlay.ts` is a framework-agnostic canvas `OverlayView`
  (Google removed `visualization.HeatmapLayer` in Maps JS v3.65) — accumulate
  density in screen space then colourise blue→red; pinned to the map container
  in container-pixels so it can't drift. Used by `ReviewsHeatLayer` (@vis.gl
  catalog maps), `InvestmentMap` and `NeighborhoodHeatMap` (raw google.maps
  detail maps). `lib/reviews-heat.ts` is the server loader (fallback: competitor
  manifest). Heat cells fetched lazily client-side (`fetchHeatCells`).

## Catalog smart sort & homepage collections

- `lib/catalog-rank.ts`: `loadViewCounts(kind)` (page_views aggregate per
  listing, cached) + `smartSort` — the default catalog order. Ranks by villa
  investment score + views + freshness, then a **3h-bucketed jitter** so the
  list rotates through the day without breaking pagination/caching. TOP pins
  (Airtable `ТОП`) still float to the top. Wired into all three `_lib.ts`
  build functions; `views` rides along on the enriched rows.
- `lib/home-collections.ts` + `components/HomeCollections.tsx`: the homepage
  "Подборки" — budget-tier chips (villas ≤$200/300/500k, apts ≤$100/200k) →
  district chips → top-10 per district. Catalog rows store the **raw Latin**
  district name (`Location 2`), so match against both languages' display names.

## Rental market comps (booking data)

Supabase holds the full Bali short-term-rental market scraped from
estatemarket.io — **21 001 geocoded listings** in `booking_data_locations` /
`booking_data_cards` / `booking_data_rooms`, with daily snapshots in
`booking_data_history` (auto-refreshed by pg_cron + the `booking-data-sync`
Edge Function). Cards are classified into `unit_kind` (villa / hotel /
apartment / …) and `bedrooms`.

**When you analyse a villa or apartment, never judge it in a vacuum — compare it
to its neighbours** via the two ready-made SQL functions:
`booking_data_area_stats(lat, lng, radius_m)` for the district picture, and
`booking_data_comps(lat, lng, radius_m, unit_kind, bedrooms, limit)` for direct
competitors. Radii: 1000–1500 m in dense areas (Canggu, Seminyak, Ubud centre),
3000–5000 m in sparse ones. `area_sqm` is <1% filled — don't compare on it.

Full spec, column list, segment counts and the scoring algorithm:
**`docs/booking-data.md`**. Existing consumers: `components/MarketStatsBlock.tsx`,
`scripts/estatemarket_occupancy.py`, migrations `030`/`032`.

## Аналитика рынка (трекер): правила, нарушение которых уже давало ложные выводы

Данные трекера (`market_core`, `market_rental_yield`) легко превращаются в
уверенно звучащую чушь. Ниже — проверки, каждая из которых написана после
реальной ошибки. Прогонять их ДО того, как вывод произнесён.

1. **Сколько наблюдений за выводом?** Меньше 30 — это наблюдение, а не вывод,
   и подавать его как тенденцию нельзя. Однажды из одной-единственной
   зафиксированной скидки был сделан вывод «на рынке пошли скидки».
2. **Моя выборка — это весь рынок?** Трекер видит 104 прайса, а не Бали целиком.
   Прежде чем сказать «в районе N мало предложения», проверить плотность по
   внешнему источнику (`booking_data_locations` — 27 тыс. объектов аренды).
   Иначе дыра в выборке выдаётся за дефицит: так «в Batu Bolong свободно 29
   юнитов» превратилось в совет строить там, где на деле 2 574 объекта.
3. **У сравниваемых групп одинаковый срок наблюдения?** «Достроенные продаются
   лучше строящихся» — артефакт: достроенный продавался годами, строящийся
   пару месяцев. Сравнивать доли можно только внутри однородных по времени
   групп либо через события за фиксированный период.
4. **Остаток — это точно остаток застройщика?** Часть выставленного продают
   инвесторы (`is_resale`). Green Village выглядел застойным с 41%
   распроданности, хотя у застройщика там не осталось ничего.
5. **Прайс вообще показывает проданное?** Источники, где нет ни одного `sold`,
   отфильтрованы во вьюхе `market_core`; вне её «0% продано» означает лишь то,
   что застройщик стирает ушедшее.
6. **Чем этот вывод можно опровергнуть?** Если ответа нет — это не вывод, а
   впечатление. Проверять значимость (`~/.venvs/analytics/bin/python
   scripts/market-model.py`) прежде, чем называть разницу закономерностью.

Формулировать выводы как «X, потому что Y, и это видно на N объектах» —
без числа наблюдений вывод не выпускать.

## Migrations

SQL migrations live in `migrations/` (numbered, e.g. `033_complex_parsers.sql`), applied against Supabase. RLS is enabled on public tables. A separate `presentation` schema is used for the presentation.estate features (kept out of `public.raw_*`).
