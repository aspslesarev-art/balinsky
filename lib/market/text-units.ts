// Извлечение объектов недвижимости из свободного текста страницы.
//
// Часть источников — не таблицы: страница Notion, лендинг застройщика,
// карточка объекта. Колонок там нет, поэтому вместо конфига разбора
// текст читает модель. Вызывающий кеширует результат по хешу текста,
// чтобы не платить за неизменившуюся страницу каждую ночь.

import type { ExtractResult, ScrapedUnit, UnitStatus } from './types'
import { chatJson } from './llm'

const SYSTEM = `Ты читаешь страницу застройщика недвижимости на Бали и достаёшь из неё объекты, которые продаются.

Верни ТОЛЬКО JSON:
{
  "units": [
    {
      "unitKey": "<номер или название объекта, коротко и стабильно>",
      "unitType": "<вилла/апартамент/тип планировки или null>",
      "bedrooms": <число или null>,
      "areaM2": <площадь здания в м2, число или null>,
      "landM2": <площадь участка в м2, число или null>,
      "priceUsd": <цена в долларах США, число или null>,
      "status": "available" | "reserved" | "sold"
    }
  ],
  "unsupported": "<если на странице нет ни одного объекта с ценой — одна фраза почему, иначе null>"
}

Правила:
- Если страница описывает ОДИН объект (одна вилла, один дом) — верни ровно один элемент, unitKey = название объекта.
- Если перечислено несколько юнитов с номерами и ценами — верни каждый отдельно.
- Цену бери базовую в долларах. Если цена указана в рупиях (миллиарды IDR) — верни null, не пересчитывай.
- Если про объект прямо сказано, что он продан или забронирован — поставь соответствующий статус, иначе "available".
- Соточная площадь участка: 1 сотка = 100 м2.
- Цена бывает закодирована в имени файла: «280000-studioSerg.jpg» или «plan-390000.png» означают $280,000 и $390,000. Если других цен на странице нет, бери их оттуда, а unitKey собирай из типа планировки или порядкового номера.
- Диапазон цен («от $250,000 до $400,000») — это не объект: такой странице нужен unsupported, если отдельных объектов не перечислено.
- unsupported заполняй, когда страница — оглавление, контакты, описание района без цен, или список документов.
- Никакого текста вне JSON.`

export async function extractUnitsFromText(
  text: string,
  meta: { developer: string; complex: string },
): Promise<ExtractResult> {
  const user = [
    `Застройщик: ${meta.developer}`,
    `Комплекс по нашей картотеке: ${meta.complex}`,
    '',
    'Текст страницы:',
    text.slice(0, 12_000),
  ].join('\n')

  const parsed = await chatJson(SYSTEM, user, { feature: 'market-layout', meta })
  const data = parsed as { units?: unknown[]; unsupported?: unknown }

  if (typeof data.unsupported === 'string' && data.unsupported.trim()) {
    throw new Error(`страница не содержит объектов с ценой: ${data.unsupported.trim().slice(0, 160)}`)
  }

  const warnings: string[] = []
  const units: ScrapedUnit[] = []
  const seen = new Map<string, number>()

  for (const raw of data.units ?? []) {
    const u = raw as Record<string, unknown>
    const key = String(u.unitKey ?? '').trim()
    if (!key) { warnings.push('объект без названия пропущен'); continue }
    const n = (seen.get(key) ?? 0) + 1
    seen.set(key, n)

    const areaM2 = numOrNull(u.areaM2)
    const priceUsd = numOrNull(u.priceUsd)
    units.push({
      unitKey: n === 1 ? key : `${key}~${n}`,
      unitType: str(u.unitType),
      bedrooms: intOrNull(u.bedrooms),
      areaM2,
      landM2: numOrNull(u.landM2),
      floor: null,
      status: asStatus(u.status),
      priceUsd,
      pricePerM2: priceUsd && areaM2 ? Math.round(priceUsd / areaM2) : null,
      raw: { source: 'notion' },
    })
  }

  if (!units.length) throw new Error('на странице Notion не нашлось ни одного объекта')
  return { units, warnings }
}

function asStatus(v: unknown): UnitStatus {
  const s = String(v ?? '').toLowerCase()
  if (s === 'sold' || s === 'reserved' || s === 'available') return s
  return 'available'
}

function str(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s || null
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(/[^\d.]/g, '')) : v
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null
}

function intOrNull(v: unknown): number | null {
  const n = numOrNull(v)
  return n === null ? null : Math.round(n)
}

