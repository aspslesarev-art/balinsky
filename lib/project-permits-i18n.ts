// Переводы строк «основания» для разрешений проекта. RU — источник
// (raw_complexes.data), переводы лежат в том же кэше, что и юр-проверка:
// feeds/_complex-legal-<lang>.json → { [complexId]: { …, permits: { hotel: [...] } } },
// одна строка на авторский пункт. Пишет scripts/translate-complex-legal.mjs.
// Пока перевода нет — отдаём русский исходник, блок всё равно рендерится.
import { loadComplexLegalCache } from '@/lib/complex-legal-i18n'
import { parseProjectPermits, PERMIT_USES, type PermitUse, type ProjectPermits } from '@/lib/project-permits'

export async function loadProjectPermits(
  complexId: string,
  lang: string,
  d: Record<string, unknown>,
): Promise<ProjectPermits | null> {
  if (lang === 'ru') return parseProjectPermits(d)
  const cache = await loadComplexLegalCache(lang)
  const raw = cache[complexId]?.permits
  if (!raw) return parseProjectPermits(d)
  const translated: Partial<Record<PermitUse, string[]>> = {}
  for (const use of PERMIT_USES) {
    const lines = raw[use]
    if (Array.isArray(lines) && lines.length > 0) translated[use] = lines.map(String)
  }
  return parseProjectPermits(d, translated)
}
