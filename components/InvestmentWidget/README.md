# Investment Widget

Виджет «Инвестиционный потенциал виллы». Считает три сценария
доходности (плохой / нормальный / хороший) на основе матчинга
с конкурентами Booking и анализа района.

## Интеграция

```tsx
import { InvestmentWidget } from '@/components/InvestmentWidget'

// На странице виллы:
<InvestmentWidget villaId={airtableId} apiKey={GOOGLE_MAPS_KEY} />
```

Виджет сам подгружает `/api/villa/[id]/investment-snapshot` и
рендерит весь блок.

## Архитектура

```
GET /api/villa/[id]/investment-snapshot       (cache 24h)
  → lib/investment/snapshot.ts: buildSnapshot(id)
      → lib/competitors.ts: loadNearby(lat, lng, 2km)
      → lib/nearby-places.ts: loadNearbyPlaces(id)
      → lib/investment/zones.ts: classifyZone(beaches)
      → lib/investment/matching.ts: matchCompetitors(...)
      → lib/investment/economics.ts: buildScenarios(...)
      → lib/investment/infra-score.ts: scoreInfra(...)
      → возвращает InvestmentSnapshot
```

## Режимы виджета

| N матчей | Режим | Что показывает |
|---|---|---|
| ≥ 12 | `standard` | Три сценария по квартилям ADR + полная статистика. Уверенность 🟢 |
| 5–11 | `reduced` | Те же три сценария, помечены 🟡 «средняя уверенность» |
| < 5 | `references` | Не агрегируем — даём 3-5 конкретных примеров с Booking |

Если в исходной зоне до пляжа 0 матчей — расширяем зону на одну
ступень (beachfront → walking → scooter → inland). Помечаем
флагом `expandedZone` и показываем баннер.

Для вилл с 5+ спален — luxury-режим: матчинг без зонального
ограничения (премиум-гость выбирает по объекту, не по геолокации).

## Флаги

- `emergingMarket` — если в радиусе 1км менее 30 листингов на
  Booking. Триггерит блок «Новый район».
- `weakPerformance` — если cap rate в плохом сценарии ниже
  порога региона (Bali: 6%). Триггерит блок «Что улучшит показатели».
- `leaseholdRisk` — если payback > leasehold_years_left. Красный
  баннер.
- `isLuxury` — 5+ спален. Влияет на матчинг.
- `expandedZone` — пришлось выйти за исходную пляжную зону.

## Юнит-экономика

```
revenue       = ADR × 365 × occupancy
platform_fee  = revenue × 15%   (Booking/Airbnb fee)
mgmt_fee      = revenue × 22%   (управляющая компания)
opex          = $4/м²/мес × area × 12
taxable_base  = max(0, revenue − fees − opex)
tax           = taxable_base × 10%   (PB1 на rental в Индонезии)
NOI           = revenue − platform_fee − mgmt_fee − opex − tax
payback       = asking_price / NOI
cap_rate      = NOI / asking_price
```

Дефолты в `lib/investment/regions.ts:BALI_DEFAULTS`. Пока
поддерживается только Бали.

## Дефолтные occupancy для Бали

Booking не отдаёт occupancy конкурентов. Используем фиксированные
proxy-значения для трёх сценариев:

Бэнды по редакционному ТЗ:
- low <55% → bad = 50%
- medium 55–70% → median = 65%
- high 70–85% → good = 85%

Это не значения конкретных конкурентов, а консервативные оценки
для рынка Bali. Указано в блоке «Методология».

## Зоны до пляжа

Walking-distance считается как `Haversine × 1.3` (без OSRM):

- `beachfront` — 0–100 м
- `walking` — 100–500 м
- `scooter` — 500–1500 м
- `inland` — >1500 м

## Скоринг инфраструктуры

В радиусе 800 м от виллы считаем:

- Premium-рестораны (priceLevel ≥ EXPENSIVE и rating ≥ 4.3) → вес 25
- Beach clubs → вес 20
- Топ-кофейни (rating ≥ 4.5) → вес 15
- Fitness/yoga/wellness → вес 10
- Ночные клубы → вес 10
- Средний рейтинг POI (нормализован 3.8→4.8) → вес 10
- Плотность отзывов → вес 10

Композитный балл 0–100.

## Кэширование

- API endpoint: `Cache-Control: s-maxage=86400, stale-while-revalidate=604800`
  (24 часа полная свежесть, 7 дней stale-while-revalidate).
- На сервере есть module-level кэш для манифестов конкурентов и
  POI (TTL 10–30 мин).

## Тесты

Базовые юнит-тесты на чистые функции (zones, economics):

```bash
node --test scripts/test-investment.mjs
```

Покрытие:
- `classifyZone` (beachfront/walking/inland)
- standard / reduced / references mode по размеру выборки
- emerging market по плотности листингов
- leasehold warning
- weak cap rate
- расчёт NOI = revenue − fees − opex − tax
- null-кейс без asking price

## Что не реализовано (по сравнению со спеком)

- **Сценарий «без обновления через 5 лет»** — нет года ремонта в Airtable.
- **Калькулятор (блок 7)** — слайдеры пересчёта параметров.
- **Forward booking 90d / asking ADR новых ЖК** — нет источника данных.
- **EN-локаль** — пока только RU.
- **OSRM walking distance** — используется Haversine × 1.3.
- **Per-competitor occupancy** — Booking не отдаёт; используются
  фиксированные дефолты по сценариям.

## Что поправить, если расширять

- Добавить поле `Год ремонта` в Airtable → включить сценарий деградации.
- Подключить Inside Airbnb / AirDNA → реальная occupancy.
- Развернуть OSRM в Docker → точная walking distance.
- Добавить регионы помимо Бали — расширить `lib/investment/regions.ts`.
