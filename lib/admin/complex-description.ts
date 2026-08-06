import 'server-only'
import { adminSb } from './sb'
import { COMPLEX_DESCRIPTION_FIELD } from '../complex-description'
import type { CollectionConfig, RecordRow } from './adapters/types'

// «Описание комплекса» в панели должно открываться с тем текстом, который
// сейчас стоит на сайте, — иначе редактировать нечего: поле пустое, а на
// странице виден сгенерированный текст из assistant_kb.
//
// Подставляем его только в ответ GET'а. PATCH шлёт лишь изменённые поля
// (см. _panel.tsx), поэтому подстановка сама по себе ничего не записывает:
// пока редактор не тронул текст, приоритет остаётся у сгенерированного.

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Тот же порядок источников, что и на странице ЖК, без ручного поля. */
async function currentSiteText(fields: Record<string, unknown>, id: string): Promise<string> {
  const { data } = await adminSb()
    .from('assistant_kb')
    .select('page_body')
    .eq('kind', 'complex')
    .eq('ref_id', id)
    .maybeSingle()
  const kbBody = str((data as { page_body?: unknown } | null)?.page_body)
  return kbBody
    || str(fields['SEO Text'])
    || str(fields['Описание'])
    || str(fields['ИИ Описание 2'])
    || str(fields['ИИ Описание'])
}

/**
 * Копия записи с заполненным «Описание комплекса». Возвращает исходную
 * запись, если это не ЖК, поле уже заполнено или показывать нечего.
 */
export async function withComplexDescription(cfg: CollectionConfig, row: RecordRow): Promise<RecordRow> {
  if (cfg.key !== 'complexes') return row
  if (str(row.fields[COMPLEX_DESCRIPTION_FIELD])) return row
  try {
    const text = await currentSiteText(row.fields, row.id)
    if (!text) return row
    return { ...row, fields: { ...row.fields, [COMPLEX_DESCRIPTION_FIELD]: text } }
  } catch (e) {
    // Подстановка — удобство, а не условие работы панели.
    console.error('[complex-description] seed failed:', e instanceof Error ? e.message : e)
    return row
  }
}
