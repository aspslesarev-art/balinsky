// Единая точка сбора: источник → список юнитов.
// Решает, чем разбирать (нативный адаптер или конфиг от модели) и когда
// пересобирать конфиг.

import { fetchGrid, toGrid, transposeGrid, type Grid } from './grid'
import { fetchXlsxFromGoogleSheet } from './xlsx'
import { layoutFingerprint } from './fingerprint'
import { buildLayout, type BuildLayoutResult } from './layout-llm'
import { extractUnits } from './extract'
import { isLbGroupSource, scrapeLbGroupCells } from './adapters/lb-group'
import { isUnitboxSource, scrapeUnitbox } from './adapters/unitbox'
import { isNotionSource, scrapeNotion } from './adapters/notion'
import { isVibeSource, scrapeVibe } from './adapters/vibe'
import { fetchHtml, scrapeWebpage } from './adapters/webpage'
import { scrapeSplan, splanConfig } from './adapters/splan'
import { mapsvgTables, scrapeMapsvg, usesMapsvg } from './adapters/mapsvg'
import { isDriveSource, scrapeDrivePdf } from './adapters/drive-pdf'
import { pinnedFor, runPinned } from './pinned'
import { KnownRefusalError, isRefusalMessage } from './refusal'
import { isTextCache, type MarketSource, type ScrapedUnit, type SourceLayout } from './types'

export type ScrapeResult = {
  units: ScrapedUnit[]
  warnings: string[]
  // Заполнены, только если конфиг перестраивался — вызывающий их сохранит.
  layout?: SourceLayout
  fingerprint?: string
}

export type ScrapeOptions = {
  // Вызывается сразу, как только лист Google скачан, — до разбора. Так
  // копия листа сохраняется и в день, когда разбор упал.
  onGrid?: (grid: Grid) => void
}

export async function scrapeSource(source: MarketSource, opts: ScrapeOptions = {}): Promise<ScrapeResult> {
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

  if (source.source_kind === 'site') {
    const html = await fetchHtml(source.source_url)

    // Генплан на движке splan.ru: в HTML пусто, юниты лежат за его API.
    // Ответ оттуда уже структурный, поэтому ни модель, ни кеш не нужны.
    const splan = splanConfig(html)
    if (splan) return scrapeSplan(splan)

    // Генплан на плагине MapSVG: юниты отдаёт REST плагина.
    const origin = new URL(source.source_url).origin
    if (await usesMapsvg(origin)) {
      const tables = await mapsvgTables(html, origin)
      if (tables.length) return scrapeMapsvg(origin, tables)
    }

    // Обычный сайт: ни таблицы, ни API — снимаем текст и читаем моделью.
    const cache = isTextCache(source.layout) ? source.layout : null
    const meta = { developer: source.developer, complex: source.complex }
    const { units, warnings, textHash } = await scrapeWebpage(html, meta, cache)
    return { units, warnings, layout: { kind: 'text', textHash, units }, fingerprint: textHash }
  }

  if (source.source_kind !== 'google') {
    throw new Error(`источник вида «${source.source_kind}» пока не поддерживается`)
  }

  if (isLbGroupSource(source.spreadsheet_id)) {
    const cells = await fetchXlsxFromGoogleSheet(source.source_url)
    opts.onGrid?.(toGrid(cells))
    return scrapeLbGroupCells(cells)
  }

  const grid = await fetchGrid(source.source_url)
  opts.onGrid?.(grid)

  // Проверенный вручную прайс: разбор без модели, даже если лист изменился.
  const pinned = pinnedFor(source.source_key)
  if (pinned) {
    const result = runPinned(grid, pinned)
    return { units: result.units, warnings: result.warnings }
  }

  const fingerprint = layoutFingerprint(grid)
  const meta = { developer: source.developer, complex: source.complex, unitTypes: source.unit_types }

  // Лист уже признан «не шахматкой» и с тех пор не менялся — модель не зовём.
  if (source.layout && !isTextCache(source.layout) && source.layout.unsupported && source.layout_fingerprint === fingerprint) {
    throw new KnownRefusalError(`лист не разбирается по юнитам: ${source.layout.unsupported}`, source.layout, fingerprint)
  }

  // Структура листа не менялась — идём по сохранённому конфигу, без модели.
  if (source.layout && !isTextCache(source.layout) && source.layout_fingerprint === fingerprint) {
    const saved = source.layout
    const result = extractUnits(orient(grid, saved.transposed), saved)
    if (result.units.length) return { units: result.units, warnings: result.warnings }
    // Отпечаток совпал, а юнитов нет: либо прайс опустел, либо изменение
    // не поймалось отпечатком. Дешевле пересобрать конфиг, чем молча
    // записать в историю «продано всё».
    const rebuilt = await buildAnyOrientation(grid, meta)
    const retry = extractUnits(orient(grid, rebuilt.layout.transposed), rebuilt.layout)
    return {
      units: retry.units,
      warnings: [...result.warnings, ...rebuilt.warnings, ...retry.warnings, 'конфиг пересобран: по прежнему юнитов не нашлось'],
      layout: rebuilt.layout,
      fingerprint,
    }
  }

  const built = await buildAnyOrientation(grid, meta).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : String(e)
    if (!isRefusalMessage(message)) throw e
    const reason = message.replace(/^лист не разбирается по юнитам:\s*/, '')
    throw new KnownRefusalError(message, { headerRow: 0, firstDataRow: 1, cols: { unitKey: 1 }, unsupported: reason }, fingerprint)
  })
  const result = extractUnits(orient(grid, built.layout.transposed), built.layout)
  return {
    units: result.units,
    warnings: [...built.warnings, ...result.warnings],
    layout: built.layout,
    fingerprint,
  }
}

type LayoutMeta = { developer: string; complex: string; unitTypes: string | null }

function orient(grid: Grid, transposed: boolean | undefined): Grid {
  return transposed ? transposeGrid(grid) : grid
}

// Часть прайсов нарисована боком: юниты идут по колонкам, а номер,
// площадь и цена — по строкам. Для модели это выглядит как «не шахматка»,
// хотя данные в листе есть. Поэтому на такой отказ пробуем разобрать лист
// ещё раз, повернув его, и метим конфиг: дальше поворот применяется сам,
// без повторного обращения к модели.
async function buildAnyOrientation(grid: Grid, meta: LayoutMeta): Promise<BuildLayoutResult> {
  const straight = await attemptLayout(grid, meta)
  if ('layout' in straight) return straight

  const turned = transposeGrid(grid)
  const rotated = await attemptLayout(turned, meta)
  // Поворот засчитываем, только если из него реально вынулись юниты:
  // иначе это тот же отказ, просто сформулированный по-другому.
  if ('layout' in rotated && extractUnits(turned, rotated.layout).units.length) {
    return {
      layout: { ...rotated.layout, transposed: true },
      warnings: [...rotated.warnings, 'лист разобран в повороте: юниты идут по колонкам'],
    }
  }
  throw straight.error
}

// Отдельная попытка разбора: отказ модели («это не шахматка») возвращаем
// как значение, а сбой провайдера пробрасываем — второй заход на
// повёрнутом листе его не вылечит, только потратит вызов.
async function attemptLayout(grid: Grid, meta: LayoutMeta): Promise<BuildLayoutResult | { error: Error }> {
  try {
    const built = await buildLayout(grid, meta)
    if (built.layout.unsupported) {
      return { error: new Error(`лист не разбирается по юнитам: ${built.layout.unsupported}`) }
    }
    return built
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.startsWith('лист не разбирается') || message === 'layout_no_unit_key') {
      return { error: e instanceof Error ? e : new Error(message) }
    }
    throw e
  }
}
