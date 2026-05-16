# balinsky.info — обзорный отчёт по сайту

Состояние на 2026-05-14. Источники: Supabase (схема + counts), git (последние коммиты), сам код, sitemap.xml на проде.

---

## 1. Что это за сайт

**balinsky.info** — двуязычный (RU + EN) каталог недвижимости на Бали: виллы, апартаменты, жилые комплексы, дома, помесячная аренда + лента контента (новости, события застройщиков, акции, база знаний).

Бизнес-модель сейчас — реклама застройщикам в Telegram и видеосъёмка объектов; сайт работает как лид-генератор + витрина + AI-консультант. Платных подписок и комиссий на сделке пока нет.

Стек: **Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Supabase (Postgres + Storage) + Tailwind 4**. Хостится на Vercel. Airtable — CMS источник правды по контенту, Supabase — кэш + аналитика + поисковые индексы.

---

## 2. Объём контента

| Раздел | Кол-во опубликованных объектов | Источник |
|---|---|---|
| Виллы и дома | **557** | raw_villas |
| Апартаменты | **715** | raw_apartments |
| Жилые комплексы | **188** | raw_complexes |
| Застройщики | **114** | raw_developers |
| Помесячная аренда | **1 158** | storage:/rental/_rental.json |
| Новости застройщиков | **130** | storage:/news/_news.json |
| Мероприятия | **129** | storage:/events/_events.json |
| Акции / спец. предложения | **48** | storage:/promo/_promo.json |
| База знаний (статьи) | **49** | storage:/knowledge/_knowledge.json |
| Менеджеры (контакты застройщиков) | **50** | storage:/managers/_managers.json |
| **Итого живых страниц в sitemap.xml** | **1 971** | прод |

Картинки оптимизированы через next/image (AVIF / WebP, Vercel Edge cache, год TTL). Источники картинок: Supabase Storage (наш буцкет), Airtable Attachments, YouTube thumbnails, Booking CDN (для блока «соседи»).

---

## 3. Структура страниц (72 page.tsx)

### Публичные разделы

**Российская версия** (`/ru/...`):
- `/ru` — главная (Балина hero + витрина)
- `/ru/villy` + `/ru/villy/[...slug]` (фильтры) + `/ru/villy/karta` (карта) + `/ru/villy/o/[slug]` (детальная)
- `/ru/villy/page/[n]` — пагинация для SEO
- `/ru/apartamenty` + детальные / карта / пагинация — те же шаблоны
- `/ru/zhilye-kompleksy` (ЖК) — список + детальная + карта + пагинация
- `/ru/zastrojshhiki` (застройщики) — список + детальная
- `/ru/arenda` (помесячная аренда) — список + детальная
- `/ru/novosti`, `/ru/meropriyatiya`, `/ru/akcii`, `/ru/znaniya` — лента контента + детальные
- `/ru/poisk` — семантический поиск по каталогу (Azure embeddings)
- `/ru/izbrannoe` — личный вишлист посетителя
- `/ru/rezervirovanie` — verbal reservation flow с подтверждением в Telegram
- `/ru/invest-tour`, `/ru/kak-kupit`, `/ru/o-balinsky` — контентные посадочные

**Английская версия** (`/en/...`) — зеркальная, slug-сегменты переведены (villas / apartments / complexes / developers / rental / news / events / promo / knowledge), slug объекта общий.

### Админ-панель (`/admin/...`, под HTTP-Basic + Telegram-OTP)

- `/admin/views` — Yandex Metrika встроена + наши page_views
- `/admin/chats` — inbox чатов Balina + handover на менеджера
- `/admin/balina` — редактор системного промпта Балины (секции в Supabase)
- `/admin/visualizations` + `/admin/visualizations/[complexId]` — редактор интерактивных шахматок ЖК (полигоны на фото + numbered markers, режим bird-eye, drill-down между слоями)
- `/admin/reservations` — verbal reservations со статусами pending → confirmed
- `/admin/ads` — баннеры (1 пока активен)
- `/admin/presentations` — генерация PDF-презентаций виллы
- `/admin/wishlist` — что добавляют в избранное (топ объектов)
- `/admin/broadcast` — рассылка по Telegram chat-listу
- `/admin/usage` — расходы Azure OpenAI (Балина + транскрипция + переводы)

### API (~40 endpoint'ов)

Ключевые: `/api/chat` (Балина веб-чат), `/api/telegram` (Балина бот webhook), `/api/transcribe` (voice → text Azure), `/api/search/semantic` (pgvector), `/api/reservation`, `/api/track/view`, `/api/track/wishlist`, `/api/track/presentation`, `/api/revalidate-content` (бамп Vercel cache из cron), `/api/cron/assistant-alerts`, `/api/webhook/airtable`.

---

## 4. AI-консультант «Балина»

Женский персонаж AI-брокера. Работает В ОДНОМ ЯДРЕ для веба и Telegram:
- `lib/consultant.ts` — общие TOOLS и executor (search_listings, semantic_search, get_listing_full, save_search, reserve, ...)
- `lib/assistant-knowledge.ts` — system-prompt из ~17 редактируемых секций (хранятся в Supabase, обновляются через `/admin/balina`)
- `lib/balina-telegram.ts` — Telegram-обвязка (voice → Azure Whisper, отправка фото-карточек, handover)

**Каналы:**
1. **Веб-виджет** — кнопка с её аватаром снизу-справа на каждой странице. Поддерживает текст, голос (MediaRecorder → /api/transcribe), показ карточек объектов inline. На мобиле — на полный экран, пинн к visualViewport чтобы клавиатура не ломала вёрстку.
2. **Telegram-бот** `@BalinskyBot` — тот же стек, плюс ловит callback_query от reservations, фиксирует все сообщения в Supabase (table chats + messages), может молчать когда менеджер сам отвечает в чате.

**Что Балина видит** на каждый объект (через tool result):
- Заголовок, район, BR, площадь, цена, цена/м²
- `land_zone` (туристическая/коммерческая/жёлтая/зелёная) + raw `Назначение земли`
- **PBG / SLF статусы раздельно** (есть/заявка/нет + номер сертификата + готовая summary-фраза) — последний апдейт сегодня
- Lease years, год сдачи, статус строительства
- `cap_rate_median` / `cap_rate_good` (расчёт по Booking-аналитике), `monthly_rent_comp_usd` — медиана помесячной аренды по району
- Бенчмарк по району $/м² + кол-во объектов в выборке
- Геокоординаты, дистанция до ближайшего пляжа
- Description preview (220 chars из SEO Text)

**Модели:**
- Чат: Azure OpenAI `gpt-5.4` (свой Azure-инстанс, $1000 кредитов от Microsoft for Startups)
- Embeddings: `text-embedding-3-large` (1536-dim, Matryoshka truncation для HNSW)
- Voice → Text: `gpt-4o-transcribe`
- Расходы трекинг: `balina_usage` таблица + `/admin/usage` дашборд

---

## 5. «Тяжёлые» фичи каталога (последние 2 недели)

### Земля и зонирование (RDTR)
По каждой вилле / апартаменту / ЖК подтянут официальный статус земли из GISTARU RDTR (Rencana Detail Tata Ruang) — государственный реестр зонирования Индонезии. Хранится в **villa_land_profile (368) / apartment_land_profile (442) / complex_land_profile (188)**.

На детальной странице слева — блок **«Что можно делать с участком»** (свёрнутый по умолчанию):
- Зона, подзона, район (Кута Селатан / Убуд / etc.)
- Чипы «Что можно построить и сдавать»: Отель / Вилла / Гестхаус / Ресторан с цветным статусом (можно / с ограничениями / нельзя)
- KDB / KLB / KDH / KTB / GSB / макс. высота с переводом на русский и тултипами-объяснениями
- Trust score 0–100
- Bhisama Khayangan Pura warning (балийские религиозные ограничения)
- Mixed-zone warning (если 5-точечный сэмплинг показал стык зон)
- Кнопки «Перепроверить»: GISTARU, BHUMI, SIMTARU, 3Datu Badung
- 3 PDF: Карта зонирования (PP), Текст постановления (BT), Сертификат верификации (CT)

### Доходность от соседей (estatemarket.io)
По каждой вилле / апартаменту / ЖК — агрегаты по реальным Booking-листингам в радиусе 1 км. Хранится в **villa_market_stats (368) / apartment_market_stats (442) / complex_market_stats (188)**.

На детальной странице справа — блок **«Сколько зарабатывают соседи»**:
- Виллы / Апартаменты — два сегмента
- Заполняемость % + «≈ N ночей забронировано в год»
- Средняя цена за ночь (ADR)
- Доход с номера за ночь (RevPAR) — формула в тултипе
- Прогноз дохода в год (RevPAR × 365)
- Кликабельная ссылка на источник

### Интерактивные шахматки (visualizations)
Редактор в `/admin/visualizations/[complexId]`. Multi-layer drill-down: bird-eye → секция → блок → конкретный юнит. Hotspots двух типов:
- **Polygon** — раскрашенный многоугольник (по статусу продажи: green/yellow/red)
- **Marker** — маленький numbered кружок (новинка от сегодня)

Сейчас 11 ЖК с виз-данными, 13 слоёв, 45 хотспотов суммарно. Клик → попап с информацией о юните + кнопка «Открыть».

### Семантический поиск
`/ru/poisk` — посетитель пишет «вилла в Чангу с инфинити-бассейном до 600k», запрос embeddiт через Azure, ищет ближайшие по cosine в `catalog_embeddings` (pgvector HNSW). Возвращает топ N объектов смешанного типа (villa + apartment + complex).

### Презентации
PDF-генератор виллы через `@react-pdf/renderer` — собирается с фото, ценой, KPI, аналитикой. Используется агентами для отправки клиенту. Сейчас 0 публикаций, но движок готов.

### Verbal reservation flow
Клиент жмёт «забронировать» в чате → Балина создаёт `pending` запись → отправляет в Telegram админу с кнопками ✅/❌ → админ подтверждает → status `confirmed` → на сайте у виллы появляется бейдж «забронирована». Сейчас 6 reservations в БД (все cancelled — это тестовые).

### Wishlist + tracking
Сессии хранятся в `localStorage`. `/api/track/view` пишет в `page_views` (610 рядов с начала запуска), `/api/track/wishlist` — в `wishlist_events` (36 рядов).

---

## 6. SEO

### Технические сигналы
- ✅ Sitemap.xml: **1 971 URL** (`/sitemap.xml` отдается с cache-control: 1 час)
- ✅ Robots.txt: `Disallow: /api/`, `Disallow: /ru/*/karta`, `Disallow: /*?` (исключение query-string URL для предотвращения дубликатов)
- ✅ Полноценный structured data на каждой детальной странице:
  - `Product` + `Offer` (MerchantReturnPolicy, ShippingDeliveryTime — соответствие требованиям Google для richresults)
  - `SingleFamilyResidence` (или соответствующий тип) — для виллы
  - `BreadcrumbList`
  - `FAQPage` с реальными вопросами/ответами на каждом объекте
  - `Brand` (застройщик)
  - `GeoCoordinates` + `PostalAddress`
  - `DefinedRegion` для целевой геолокации
- ✅ Каноникал + hreflang (alternates) — двуязычная связка `ru` ↔ `en`
- ✅ OpenGraph + Twitter cards с фото
- ✅ Long browser cache на static assets (`max-age=31536000, immutable`)
- ✅ 301-редиректы со старого Wix-сайта (villas, apartments, projects, news, events, promotion, bonus и т.д.)
- ✅ Wix legacy `/<section>/<slug>/r/<id>` middleware-резолвер на канониккальный URL Next.js
- ✅ Транслитерация Cyrillic в slug + alias-резолв (так что `/ru/apartamenty/o/allex-villas-(-комплекс-5)-...` 301'ится на чистый `allex-villas-komplekc-5-...`)
- ✅ Двухкратный sync slug-индексов: cron каждые ~15 мин

### Контентные сигналы
- ✅ Хедер H1 + структура H2/H3 на каждой странице
- ✅ Уникальный SEO:Title + SEO:Description от Airtable AI (или Azure-fallback при исчерпании квоты)
- ✅ Уникальное SEO Text 400–700 chars на каждый объект
- ✅ FAQ-блок с минимум 5 Q&A
- ✅ Внутренняя перелинковка: листинги ↔ комплекс ↔ застройщик ↔ район ↔ карта
- ✅ Long-tail URL'ы: `/ru/villy/<район>/<BR>-bedroom/...` (вложенный фильтр-кейс)

---

## 7. Аналитика

- **Yandex Metrika** id `104881153` — основной счётчик, доступен через `/admin/views`. Включены ssr, clickmap, trackLinks, ecommerce dataLayer.
- **GTM** id `GTM-TM6D54Z3` — обвязка для будущих интеграций.
- **Собственные события** в `page_views`: 610 событий с лета. Срез по kind (последние 610 показов):
  - застройщик (developer): 176
  - ЖК (complex): 163
  - вилла: 145
  - апартамент: 56
  - аренда (rental): 36
  - событие (event): 16
  - новость: 13
  - знания / промо: ~5
- **Wishlist events**: 36 (добавление в избранное).
- **Reservations**: 6 (все тестовые).

> Точные показатели уникальных посетителей/сессий — в Yandex Metrika (наш ID + login). Внутренний page_views не пишет session_id.

---

## 8. Инфраструктура / автоматизация

### GitHub Actions cron
- **sync-fast.yml** (каждые ~15 минут: `7,22,37,52 * * * *`)
  - Pulls villas / apartments / complexes / managers / news / events / promo / knowledge из Airtable → Supabase + Storage manifests
  - Перестраивает slug-индексы (`feeds/_villas-index.json`, `_apartments-index.json`, `_complexes-index.json`)
  - Bumps Vercel cache через `/api/revalidate-content?kinds=...`
  - AI-fallback на Azure GPT когда Airtable AI вернул `monthlyConsumptionLimited` (свежий — сегодня)
  - Slug-fallback (тоже сегодня) — деривируется из SEO:Title если Airtable AI отвалился
- **sync-heavy.yml** (`:15 каждый час`): фото villa/apartment/complex/rental в Storage, _competitors.json (Booking), _nearby_places.json

### Внешние интеграции
- **Airtable webhook** — `/api/webhook/airtable` для срочных пушей (без allowlist полей, льёт всё в `data` jsonb)
- **Telegram Bot API** — webhook на `/api/telegram` с secret_token; бот `@BalinskyBot`
- **Azure OpenAI** — `gpt-5.4` (chat) + `text-embedding-3-large` + `gpt-4o-transcribe`. Бюджет: $1000 Microsoft for Startups до 2027
- **estatemarket.io** API — парсится cron'ом (radius 1 км)
- **GISTARU RDTR** API — парсится cron'ом для каждой новой координаты
- **Google Maps** — карты `/ru/villy/karta`, `/ru/apartamenty/karta`, `/ru/zhilye-kompleksy/karta`
- **Yandex Metrika + GTM** — счётчики

---

## 9. Что НЕ сделано (открытые направления для монетизации)

1. **Платная подписка на премиум-функции** для агентов (фильтры + презентации + лиды) — UI и платёжный flow не вкручены
2. **Комиссия за лида застройщику** — reservation flow есть, но передача лида + биллинг не выстроены
3. **Сравнение объектов** (Compare) — частично сделан компонент (`ShortlistView`), но не на главной user-flow
4. **PDF-презентации с водяным знаком агента** — генератор есть, кастомизация под агента — нет
5. **Карты со слоями цен/доходности/трендов** — пока обычные Google Maps маркеры
6. **Лайв-чат менеджер-клиент** в Telegram через `/admin/chats` сделан, но без CRM-интеграции (Bitrix/HubSpot)
7. **NJOP-online** (государственная оценочная стоимость) — out of scope
8. **3Datu Badung cross-check** — отложен, нужен дискавери API

---

## 10. Последние 10 коммитов (что менялось в последнюю неделю)

```
5286bb9 Балина: split single `permit` field into structured PBG / SLF signals
75d814e photo gallery lightbox: surface the close + nav buttons above image wrapper
439e10d Balina chat: stop iOS auto-zoom and pin panel width to visualViewport
ffd5d7a next.config: whitelist Booking CDN (cf.bstatic.com) for next/image
0ff1123 villa + apt detail: show land + market blocks side-by-side, same as complex page
6ff7905 viz markers: render as absolute HTML overlay so circles stay round
d0feead viz: marker-shape hotspots — numbered circle pins as an alternative
f65252c land profile: strip Indonesian Bhisama clause from building height
d2640ea land + market: plain Russian copy for non-expert investors
2b094a3 sync: Azure GPT fallback for Airtable AI-quota errors
```

---

## 11. Ключевые цифры одной строкой

- 72 страницы кода, 71 React-компонент, 40+ API endpoint'ов, 1 971 URL в sitemap
- 557 + 715 + 188 + 1 158 = **2 618 листингов** + 130 + 129 + 48 + 49 = **356 контентных страниц** + 114 застройщиков + 50 менеджеров
- 998 объектов с земельным профилем (368v + 442a + 188c)
- 998 объектов с booking-аналитикой (368v + 442a + 188c)
- 1 AI-консультант, общая логика на сайте + в Telegram-боте
- 32 миграции БД, 24 sync-скрипта, 2 крона GitHub Actions
- Двуязычный (RU + EN), пишется в production с автодеплоем Vercel при каждом push
