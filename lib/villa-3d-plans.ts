/**
 * Виллы, для которых в `public/models/` лежит самодостаточная HTML-страница с
 * 3D-планировкой.
 *
 * `VillaDetail` — один шаблон на ~2700 объявлений и десять локалей, поэтому
 * секцию нельзя включать безусловно: реестр ограничивает её теми объявлениями,
 * у которых модель действительно есть. Ключ — slug объявления, он одинаков во
 * всех языках (различается только сегмент URL), так что одна запись покрывает
 * все локали.
 *
 * Парный по смыслу модуль для ЖК — `lib/complex-sun-plan.ts` (генплан и тени).
 */
const VILLA_3D_PLANS: Readonly<Record<string, string>> = {
  'ubud-dream-103m2-2-bedroom': '/models/ubud-dreams-3d.html',
  'ubud-dream-91m2-1-bedroom': '/models/ubud-dreams-1br-3d.html',
}

/** Публичный URL 3D-планировки виллы либо null, если модели нет. */
export function getVilla3DPlanUrl(slug: string): string | null {
  return VILLA_3D_PLANS[slug] ?? null
}
