// Реестр: complex_id → парсер. complex_id — это airtable_id из
// raw_complexes (тот же что в Supabase, в адресной строке Airtable).
//
// Добавление нового ЖК: создать lib/parsers/<slug>.ts, экспортнуть
// runXxx(), импортнуть сюда, добавить строчку в PARSERS. Админка сразу
// увидит — в редакторе появится «Парсер: <label>» вместо «не написан».

import type { ParserResult } from './_shared'
import { runOriginsParser } from './origins'
import { runSunsetVillageParser } from './sunset-village'

export type ParserRunner = (opts: {
  complexId: string
  sourceUrl: string
  airtableToken: string
}) => Promise<ParserResult>

export type ParserModule = {
  // Стабильный ключ. Кладётся в complex_parsers.parser_type для аудита.
  key: string
  // Что показываем в админке.
  label: string
  run: ParserRunner
}

export const PARSERS: Record<string, ParserModule> = {
  recHuHZIAmVcIln0L: {
    key: 'origins',
    label: 'BALI BAZA Origins',
    run: runOriginsParser,
  },
  recdJ2e2LeZxUbL06: {
    key: 'sunset_village',
    label: 'BALI BAZA Sunset Village (resale)',
    run: runSunsetVillageParser,
  },
}

export function getParserModule(complexId: string): ParserModule | null {
  return PARSERS[complexId] ?? null
}
