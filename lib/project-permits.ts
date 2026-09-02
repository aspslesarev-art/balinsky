// Разрешения конкретного проекта — второй, авторский слой поверх правил зоны.
//
// Зона (public.*_land_profile) — машинный слой: его наполняет
// scripts/sync_land_profile.py по точке lat/lon из RDTR/GISTARU, и следующий
// прогон синка перезапишет всё, что там поправили руками. Поэтому разрешения
// самого проекта (KKKPR, PBG, KBLI в NIB) живут отдельно — в JSONB
// raw_<kind>.data, рядом с «Юр-проверкой», и авторятся в /admin/data.
//
// Формат «основания» тот же, что у юр-проверки: ОДИН ПУНКТ НА СТРОКУ, лид
// строки становится заголовком, остаток раскрывается. Так редактор вставляет
// то, что уже написал, без разметки.
//
// Модуль импортится и на сервере, и в клиентском LandProfileBlock — держим его
// свободным от server-only зависимостей.

import { parseAuditItems, firstAuditString, type AuditItem } from '@/lib/legal-audit'

/** Виды использования — зеркалят uses_* + str в *_land_profile. */
export type PermitUse = 'hotel' | 'villa' | 'kos' | 'restaurant' | 'str'

export const PERMIT_USES: readonly PermitUse[] = ['hotel', 'villa', 'kos', 'restaurant', 'str']

/** Ключи в JSONB. Двоеточия в ключах допустимы (ср. «SEO:Title»). */
export const PERMIT_FIELDS: Record<PermitUse, { status: string; basis: string }> = {
  hotel: { status: 'Разрешения: отель', basis: 'Разрешения: отель — основание' },
  villa: { status: 'Разрешения: вилла', basis: 'Разрешения: вилла — основание' },
  kos: { status: 'Разрешения: гестхаус', basis: 'Разрешения: гестхаус — основание' },
  restaurant: { status: 'Разрешения: ресторан', basis: 'Разрешения: ресторан — основание' },
  str: { status: 'Разрешения: посуточная сдача', basis: 'Разрешения: посуточная сдача — основание' },
}

// Синк зоны берёт ОДНУ точку lat/lon, поэтому участок на стыке зон приходит как
// однородный. Это поле — авторское перекрытие: перечисление зон участка по
// документам (например «P-3, R-3»). Заполнено — заголовок уровня «по зоне»
// показывает их все.
export const PERMIT_ZONES_FIELD = 'Разрешения: зоны участка'

export type PermitStatus = 'approved' | 'limited' | 'not_covered' | 'forbidden'

// Статусы авторятся по-русски (RU — источник истины, остальные языки
// производные). Синонимы — потому что для сдачи естественно «подтверждена», а
// для отеля «согласован»; и то и другое означает «есть в документах».
const STATUS_ALIASES: Record<string, PermitStatus> = {
  'согласован': 'approved',
  'согласована': 'approved',
  'согласовано': 'approved',
  'подтвержден': 'approved',
  'подтверждена': 'approved',
  'подтверждено': 'approved',
  'получено': 'approved',
  'есть': 'approved',
  'да': 'approved',
  'с ограничениями': 'limited',
  'ограниченно': 'limited',
  'не покрыт': 'not_covered',
  'не покрыта': 'not_covered',
  'не покрыто': 'not_covered',
  'не подтверждена': 'not_covered',
  'нет в документах': 'not_covered',
  'нельзя': 'forbidden',
  'запрещено': 'forbidden',
  'отказ': 'forbidden',
}

/** «Согласован.» / «  С Ограничениями » → канонический статус. */
export function parsePermitStatus(raw: string | null | undefined): PermitStatus | null {
  if (!raw) return null
  const s = raw
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,;!]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return STATUS_ALIASES[s] ?? null
}

export type ProjectPermitEntry = { status: PermitStatus; notes: AuditItem[] }

export type ProjectPermits = {
  uses: Partial<Record<PermitUse, ProjectPermitEntry>>
  /** Зоны участка по документам, если авторски перекрыты. */
  zones: string | null
}

/**
 * Собрать разрешения проекта из JSONB строки объекта. `translatedBasis` —
 * готовые переводы строк основания (по одной строке на пункт); когда их нет,
 * берём русский исходник. Вид без статуса не попадает в результат: пустое поле
 * = «мы про это ничего не утверждаем», и на странице такой строки не будет.
 */
export function parseProjectPermits(
  d: Record<string, unknown>,
  translatedBasis?: Partial<Record<PermitUse, string[]>>,
): ProjectPermits | null {
  const uses: Partial<Record<PermitUse, ProjectPermitEntry>> = {}
  for (const use of PERMIT_USES) {
    const status = parsePermitStatus(firstAuditString(d[PERMIT_FIELDS[use].status]))
    if (!status) continue
    const translated = translatedBasis?.[use]
    const notes = translated && translated.length > 0
      ? parseAuditItems(translated.join('\n'))
      : parseAuditItems(firstAuditString(d[PERMIT_FIELDS[use].basis]))
    uses[use] = { status, notes }
  }
  const zones = firstAuditString(d[PERMIT_ZONES_FIELD])
  if (Object.keys(uses).length === 0 && !zones) return null
  return { uses, zones }
}

/** Есть ли хоть одно разрешение проекта — гейт для рендера блока. */
export function hasProjectPermits(p: ProjectPermits | null | undefined): boolean {
  return !!p && Object.keys(p.uses).length > 0
}

/** Русские исходники строк основания — вход для переводчика. */
export function projectPermitBasisSource(d: Record<string, unknown>): Partial<Record<PermitUse, string>> {
  const out: Partial<Record<PermitUse, string>> = {}
  for (const use of PERMIT_USES) {
    const raw = firstAuditString(d[PERMIT_FIELDS[use].basis])
    if (raw) out[use] = raw
  }
  return out
}
