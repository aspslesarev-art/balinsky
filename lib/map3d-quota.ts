import 'server-only'

// Суточный лимит открытий 3D-карты Google (Photorealistic 3D Maps).
//
// Каждое открытие — платная «загрузка карты» по SKU Immersive Maps: первые
// 5000 в месяц бесплатны, дальше $7 за тысячу. 160 открытий в сутки × 31 день
// = 4960, то есть лимит держит счёт внутри бесплатного объёма.
//
// Счётчик — JSON-файл в приватном бакете Storage, а не таблица: так фича не
// ждёт ручной миграции. Чтение-запись не атомарны, и при одновременных
// открытиях счётчик может недосчитать пару штук — для потолка с запасом в
// 40 открытий на месяц это несущественно.

import { createClient } from '@supabase/supabase-js'
import { sendAdminAlert } from './admin-alert'

export const MAP3D_DAILY_LIMIT = 160

const BUCKET = 'usage-counters'
const BALI_UTC_OFFSET_HOURS = 8

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

/** Сутки считаем по времени Бали, чтобы лимит обнулялся в местную полночь. */
function baliDay(now = new Date()): string {
  return new Date(now.valueOf() + BALI_UTC_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10)
}

async function readCount(key: string): Promise<number> {
  const { data, error } = await sb.storage.from(BUCKET).download(key)
  // Файла ещё нет — сегодня открытий не было.
  if (error || !data) return 0
  try {
    const parsed = JSON.parse(await data.text()) as { count?: unknown }
    return typeof parsed.count === 'number' ? parsed.count : 0
  } catch {
    return 0
  }
}

/**
 * Засчитывает одно открытие, если лимит на сегодня не выбран.
 * При сбое хранилища отказывает: лишняя загрузка стоит денег, а посетитель
 * в этом случае просто видит сообщение вместо карты.
 */
export async function consumeMap3dOpen(): Promise<{ allowed: boolean; used: number }> {
  const day = baliDay()
  const key = `map3d/${day}.json`
  const used = await readCount(key)
  if (used >= MAP3D_DAILY_LIMIT) return { allowed: false, used }

  const next = used + 1
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(key, JSON.stringify({ count: next, updatedAt: new Date().toISOString() }), {
      contentType: 'application/json',
      upsert: true,
    })
  if (error) {
    console.error('[map3d-quota] counter write failed', error.message)
    return { allowed: false, used }
  }

  if (next === MAP3D_DAILY_LIMIT) {
    await sendAdminAlert(
      `3D-карта Google: выбран суточный лимит ${MAP3D_DAILY_LIMIT} открытий (${day}). ` +
        'До полуночи по Бали посетители видят сообщение вместо карты — деньги не списываются.',
    )
  }
  return { allowed: true, used: next }
}
