// Контент, который раньше жил в коде, — теперь в таблице public.site_content
// (миграция 147): раздел → элемент → JSON.
//
// Правило чтения: если в разделе есть хоть одна строка, раздел целиком берётся
// из базы; если строк нет или база недоступна — из старых значений в коде
// (их передаёт вызывающий как `fallback`). Так сайт работает и до наполнения
// таблицы, и при сбое базы.
//
// Кэш — unstable_cache на сутки (страховка), а свежесть держит точечная
// перестройка: правка строки → триггер → /api/revalidate-rows → revalidatePath
// только затронутых страниц. Перестраиваемая страница видит свежие данные,
// потому что revalidatePath помечает устаревшими и данные, прочитанные при её
// рендере (неявные теги пути). Тег раздела `site-content:<section>` на всякий
// случай есть, но дёргать его не нужно: он сбросит все страницы, что читают
// раздел, а это тысячи путей.

import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export type SiteSection = Record<string, unknown>

/** Прямое чтение без кэша. null = в разделе нет строк. Бросает при сбое. */
export async function fetchSiteSection(section: string): Promise<SiteSection | null> {
  const { data, error } = await sb
    .from('site_content')
    .select('item, data')
    .eq('section', section)
    .limit(10000)
  if (error) throw new Error(`site_content(${section}): ${error.message}`)
  const rows = (data ?? []) as { item: string; data: unknown }[]
  if (!rows.length) return null
  const out: SiteSection = {}
  for (const r of rows) out[r.item] = r.data
  return out
}

const cachedSection = (section: string) => unstable_cache(
  () => fetchSiteSection(section),
  ['site-content-v1', section],
  { revalidate: 86400, tags: ['site-content', `site-content:${section}`] },
)()

/**
 * Раздел из базы, а если там пусто или база недоступна — `fallback` из кода.
 * Сбой не кэшируется (unstable_cache не запоминает брошенную ошибку).
 */
export async function loadSiteSection<T>(
  section: string,
  fallback: Readonly<Record<string, T>>,
  opts: { fresh?: boolean } = {},
): Promise<Readonly<Record<string, T>>> {
  try {
    const rows = opts.fresh ? await fetchSiteSection(section) : await cachedSection(section)
    return rows ? (rows as Record<string, T>) : fallback
  } catch (e) {
    console.error('[site-content]', section, e instanceof Error ? e.message : e)
    return fallback
  }
}
