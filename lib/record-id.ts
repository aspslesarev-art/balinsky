// Идентификаторы записей каталога. Старые пришли из Airtable (`rec…`), всё,
// что заведено в своей админке или импортом после ухода с Airtable, — `adm_…`.
// Проверка только на `rec…` молча отсекала новые объекты: у них не
// открывался калькулятор доходности, а новых застройщиков нельзя было
// выбрать в подписках агента.
export const RECORD_ID_RE = /^(rec[a-zA-Z0-9]{14,}|adm_[a-zA-Z0-9]{6,})$/

export function isRecordId(v: unknown): v is string {
  return typeof v === 'string' && RECORD_ID_RE.test(v)
}
