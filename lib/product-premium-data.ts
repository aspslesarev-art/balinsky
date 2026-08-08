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

async function fetchReport(): Promise<PremiumReport> {
  const { data, error } = await sb.rpc('product_premium_report')
  if (error) throw new Error(`product_premium_report: ${error.message}`)
  const report = data as PremiumReport | null
  if (!report?.zones?.length) throw new Error('product_premium_report: пустой отчёт')
  return report
}

// Сутки — данные меняются прогоном vision, а не по запросу пользователя.
export const loadPremiumReport = unstable_cache(fetchReport, ['product-premium-v1'], {
  revalidate: 86_400,
  tags: ['content:product-premium'],
})
