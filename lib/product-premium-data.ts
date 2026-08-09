// Серверная половина отчёта /insights/product-premium.
//
// Живёт отдельно от lib/product-premium.ts намеренно: тот модуль импортирует
// клиентская таблица районов, а здесь создаётся Supabase-клиент со служебным
// ключом — в браузерный бандл ему попадать нельзя.

import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import type { PremiumReport } from './product-premium'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
)

// Отчёт — десяток тяжёлых сканов по 14k строк, и под нагрузкой на базу он
// упирается в statement timeout. Раньше это валило ВЕСЬ деплой: страница
// пререндерится на сборке, исключение при пререндере обрывает экспорт, и сайт
// не выкатывался целиком из-за одной аналитической страницы.
const RETRIES = 3
const RETRY_DELAY_MS = [0, 3000, 8000]

async function fetchReport(): Promise<PremiumReport | null> {
  let lastError = ''
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    if (RETRY_DELAY_MS[attempt]) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS[attempt]))
    }
    const { data, error } = await sb.rpc('product_premium_report')
    if (error) { lastError = error.message; continue }
    const report = data as PremiumReport | null
    if (!report?.zones?.length) { lastError = 'пустой отчёт'; continue }
    return report
  }
  // Возвращаем null, а не бросаем: страница покажет заглушку и пересоберётся
  // сама по ISR, а деплой останется зелёным.
  console.error(`product_premium_report недоступен после ${RETRIES} попыток: ${lastError}`)
  return null
}

// Сутки — данные меняются прогоном vision, а не по запросу пользователя.
export const loadPremiumReport = unstable_cache(fetchReport, ['product-premium-v1'], {
  revalidate: 86_400,
  tags: ['content:product-premium'],
})
