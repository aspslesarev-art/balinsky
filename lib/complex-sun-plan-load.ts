// Генпланы «Солнце и тень» — серверное чтение из базы.
//
// Отдельным файлом, потому что lib/complex-sun-plan.ts тянут клиентские
// компоненты (plotCenter, frontBoundaryZ), а здесь — серверный клиент Supabase.
//
// Рабочие данные: site_content, раздел 'sun-plans', элемент = slug ЖК, данные =
// SitePlan целиком (миграция 147, заливка — scripts/site-content.mjs seed).
// Подложки и glb можно класть в Storage site-assets/sun/ и ссылаться на них
// полным URL — выкладка сайта для нового генплана не нужна. Пусто в базе или
// сбой — планы из кода (SITE_PLANS_FALLBACK).

import { loadSiteSection } from './site-content'
import { SITE_PLANS_FALLBACK, type SitePlan } from './complex-sun-plan'

export async function loadSitePlan(slug: string | null | undefined): Promise<SitePlan | null> {
  if (!slug) return null
  const all = await loadSiteSection<SitePlan>('sun-plans', SITE_PLANS_FALLBACK)
  const plan = all[slug]
  return plan && Array.isArray(plan.plot) && Array.isArray(plan.units) ? plan : null
}
