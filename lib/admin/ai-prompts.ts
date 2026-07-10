import 'server-only'
import { aiTaskFor, type AiTask } from '@/lib/admin/ai-fields'

// Prompt library for admin AI generation. One tuned prompt per field-task.
// Everything is RU-first, transactional-intent, fact-grounded (never invent),
// and returns ONLY the raw field value (no quotes / markdown / preamble).

type Prompt = { system: string; user: string }

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}

// Human-readable context block from whatever the row happens to carry. Keys
// mirror the Airtable field names loaders read; missing ones are skipped.
const CTX: Array<[string, string]> = [
  ['SEO:Title', 'Текущий заголовок'],
  ['title', 'Заголовок'],
  ['Developer1', 'Застройщик'],
  ['Developer', 'Застройщик'],
  ['Комплекс 1', 'Комплекс'],
  ['Комплекс', 'Комплекс'],
  ['Location 2', 'Район'],
  ['Location', 'Район'],
  ['Типы юнитов', 'Типы юнитов'],
  ['Комнаты', 'Спальни'],
  ['Площадь', 'Площадь, м²'],
  ['Земля', 'Земля, м²'],
  ['price', 'Цена, $'],
  ['Цена', 'Цена'],
  ['Заявленная доходность', 'Заявленная доходность, %'],
  ['Статус', 'Статус'],
  ['Year of completion ', 'Год сдачи'],
  ['Year of completion', 'Год сдачи'],
  ['Сданные проекты', 'Сданные проекты'],
  ['Активные проекты', 'Активные проекты'],
  ['Total quantity of units', 'Всего юнитов'],
  ['seoDescription', 'Текущее описание'],
  ['body', 'Текст'],
  ['Описание', 'Описание'],
]

function buildContext(row: Record<string, unknown>): string {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const [key, label] of CTX) {
    if (seen.has(label)) continue
    const val = firstString(row[key])
    if (!val) continue
    seen.add(label)
    lines.push(`- ${label}: ${val.slice(0, 400)}`)
  }
  return lines.length ? lines.join('\n') : '(данных в записи мало — опирайся только на то, что есть)'
}

const SYSTEM =
  'Ты — старший SEO-копирайтер и контент-редактор маркетплейса недвижимости Бали balinsky.info. ' +
  'Пишешь по-русски: живо, конкретно, без воды и штампов, под транзакционный интент (человек выбирает и покупает виллу или апартаменты на Бали). ' +
  'Строго не выдумывай факты, цифры и характеристики, которых нет во входных данных. ' +
  'Верни ТОЛЬКО итоговое значение поля — без кавычек, без markdown, без заголовков и без пояснений.'

const TASKS: Record<AiTask, (ctx: string) => string> = {
  seo_title: ctx =>
    `Сгенерируй идеальный SEO-заголовок (meta title) страницы.\n` +
    `Требования: русский; до 60 символов; включи тип объекта и район, а при наличии — сильное преимущество или цену; ` +
    `естественно и кликабельно; без «| Balinsky» в конце (он добавляется автоматически).\n\nДанные:\n${ctx}`,
  seo_desc: ctx =>
    `Сгенерируй meta description страницы.\n` +
    `Требования: русский; 140–155 символов; конкретика (район, тип, цена/выгода) + мягкий призыв к действию; ` +
    `отражает намерение «купить/выбрать»; без кавычек.\n\nДанные:\n${ctx}`,
  description: ctx =>
    `Напиши продающее и информативное описание объекта.\n` +
    `Требования: русский; 600–900 знаков; 2–3 коротких абзаца; опирайся на факты из данных (район, тип, площадь, спальни, цена, статус, застройщик); ` +
    `подчеркни выгоды для покупателя и инвестора; без выдуманных фактов и рекламных штампов.\n\nДанные:\n${ctx}`,
  headline: ctx =>
    `Придумай сильный и точный заголовок для этого материала (новость / акция / мероприятие).\n` +
    `Требования: русский; до 70 символов; цепляет, но не кликбейт; отражает суть.\n\nДанные:\n${ctx}`,
  yield: ctx =>
    `Сформулируй короткий честный блок про доходность/окупаемость строго по имеющимся числам (аренда, ROI, срок).\n` +
    `Требования: русский; 1–2 предложения или 1–3 пункта; без обещаний и гарантий; если чисел нет — верни пустую строку.\n\nДанные:\n${ctx}`,
  team: ctx =>
    `Сформулируй краткий блок «Команда» застройщика по данным: опыт, экспертиза, масштаб.\n` +
    `Требования: русский; 2–4 маркированных пункта (каждый с новой строки, начинается с «• »); только факты из данных.\n\nДанные:\n${ctx}`,
  reputation: ctx =>
    `Сформулируй блок «Репутация и опыт» застройщика: сданные/активные проекты, надёжность, годы на рынке — по данным.\n` +
    `Требования: русский; 2–4 маркированных пункта (каждый с новой строки, начинается с «• »); факты, без воды.\n\nДанные:\n${ctx}`,
}

/** Build the system+user prompt for a field, or null if it has no generator. */
export function resolvePrompt(field: string, row: Record<string, unknown>): Prompt | null {
  const task = aiTaskFor(field)
  if (!task) return null
  return { system: SYSTEM, user: TASKS[task](buildContext(row)) }
}
