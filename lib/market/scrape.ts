// Единая точка сбора: источник → список юнитов.
// Решает, чем разбирать (нативный адаптер или конфиг от модели) и когда
// пересобирать конфиг.

import { fetchGrid } from './grid'
import { layoutFingerprint } from './fingerprint'
import { buildLayout } from './layout-llm'
import { extractUnits } from './extract'
import { isLbGroupSource, scrapeLbGroup } from './adapters/lb-group'
import { isUnitboxSource, scrapeUnitbox } from './adapters/unitbox'
import { isNotionSource, scrapeNotion } from './adapters/notion'
import { isVibeSource, scrapeVibe } from './adapters/vibe'
import { scrapeWebpage } from './adapters/webpage'
import { isDriveSource, scrapeDrivePdf } from './adapters/drive-pdf'
import { isTextCache, type MarketSource, type ScrapedUnit, type SourceLayout } from './types'

export type ScrapeResult = {
  units: ScrapedUnit[]
  warnings: string[]
  // Заполнены, только если конфиг перестраивался — вызывающий их сохранит.
  layout?: SourceLayout
  fingerprint?: string
}

export async function scrapeSource(source: MarketSource): Promise<ScrapeResult> {
  if (isUnitboxSource(source.source_url)) {
    return scrapeUnitbox(source.source_url)
  }

  if (isVibeSource(source.source_url)) {
    return scrapeVibe(source.source_url)
  }

  if (isNotionSource(source.source_url)) {
    const cache = isTextCache(source.layout) ? source.layout : null
    const meta = { developer: source.developer, complex: source.complex }
    const { units, warnings, textHash } = await scrapeNotion(source.source_url, meta, cache)
    return {
      units,
      warnings,
      layout: { kind: 'text', textHash, units },
      fingerprint: textHash,
    }
  }

  // Прайс, выложенный файлом на Диск.
  if (isDriveSource(source.source_url)) {
    const cache = isTextCache(source.layout) ? source.layout : null
    const meta = { developer: source.developer, complex: source.complex }
    const { units, warnings, textHash } = await scrapeDrivePdf(source.source_url, meta, cache)
    return { units, warnings, layout: { kind: 'text', textHash, units }, fingerprint: textHash }
  }

  // Обычный сайт: ни таблицы, ни API — снимаем текст и читаем моделью.
  if (source.source_kind === 'site') {
    const cache = isTextCache(source.layout) ? source.layout : null
    const meta = { developer: source.developer, complex: source.complex }
    const { units, warnings, textHash } = await scrapeWebpage(source.source_url, meta, cache)
    return { units, warnings, layout: { kind: 'text', textHash, units }, fingerprint: textHash }
  }

  if (source.source_kind !== 'google') {
    throw new Error(`источник вида «${source.source_kind}» пока не поддерживается`)
  }

  if (isLbGroupSource(source.spreadsheet_id)) {
    return scrapeLbGroup(source.source_url)
  }

  const grid = await fetchGrid(source.source_url)
  const fingerprint = layoutFingerprint(grid)
  const meta = { developer: source.developer, complex: source.complex, unitTypes: source.unit_types }

  // Структура листа не менялась — идём по сохранённому конфигу, без модели.
  if (source.layout && !isTextCache(source.layout) && source.layout_fingerprint === fingerprint) {
    const result = extractUnits(grid, source.layout)
    if (result.units.length) return { units: result.units, warnings: result.warnings }
    // Отпечаток совпал, а юнитов нет: либо прайс опустел, либо изменение
    // не поймалось отпечатком. Дешевле пересобрать конфиг, чем молча
    // записать в историю «продано всё».
    const rebuilt = await buildLayout(grid, meta)
    const retry = extractUnits(grid, rebuilt.layout)
    return {
      units: retry.units,
      warnings: [...result.warnings, ...rebuilt.warnings, ...retry.warnings, 'конфиг пересобран: по прежнему юнитов не нашлось'],
      layout: rebuilt.layout,
      fingerprint,
    }
  }

  const built = await buildLayout(grid, meta)
  if (built.layout.unsupported) {
    throw new Error(`лист не разбирается по юнитам: ${built.layout.unsupported}`)
  }
  const result = extractUnits(grid, built.layout)
  return {
    units: result.units,
    warnings: [...built.warnings, ...result.warnings],
    layout: built.layout,
    fingerprint,
  }
}
