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
  'green-village-nusa-dua-100m2-2-bedroom': '/models/green-village-2br-3d.html',
  // Одна модель на оба варианта второго этажа (А / Б) — переключатель внутри.
  'citrine-ubud-109-4m2-2-bedroom': '/models/citrine-3d.html',
  'citrine-ubud-villa-1-109-4m2-2-bedroom': '/models/citrine-3d.html',
  'citrine-ubud-villa-3-109-4m2-2-bedroom': '/models/citrine-3d.html',
  'citrine-ubud-villa-4-109-4m2-2-bedroom': '/models/citrine-3d.html',
  'citrine-ubud-villa-5-109-4m2-2-bedroom': '/models/citrine-3d.html',
  // Мультяшные 3D-планировки на общем движке public/models/_toon-kit.js (13.11.2026).
  'ecowood-kutuh-70m2-1-bedroom': '/models/ecowood-1br-3d.html',
  'ecowood-kutuh-70m2-1-bedroom-2': '/models/ecowood-1br-3d.html',
  'ecowood-kutuh-70m2-1-bedroom-3': '/models/ecowood-1br-3d.html',
  'ecowood-kutuh-70m2-1-bedroom-4': '/models/ecowood-1br-3d.html',
  'ecowood-kutuh-90m2-2-bedroom': '/models/ecowood-2br-3d.html',
  'ecowood-kutuh-90m2-2-bedroom-2': '/models/ecowood-2br-3d.html',
  'ecowood-kutuh-90m2-2-bedroom-3': '/models/ecowood-2br-3d.html',
  'ecowood-kutuh-90m2-2-bedroom-4': '/models/ecowood-2br-3d.html',
  'ecowood-kutuh-90m2-2-bedroom-5': '/models/ecowood-2br-3d.html',
  'ecowood-kutuh-90m2-2-bedroom-6': '/models/ecowood-2br-3d.html',
  'seven-sky-bukit-octa-sun-residence-130m2-2-bedroom': '/models/seven-sky-villa-b-3d.html',
  'seven-sky-bukit-octa-sun-residence-120m2-2-bedroom': '/models/seven-sky-villa-b-3d.html',
  'seven-sky-bukit-octa-sun-residence-120m2-2-bedroom-2': '/models/seven-sky-villa-b-3d.html',
}

/** Публичный URL 3D-планировки виллы либо null, если модели нет. */
export function getVilla3DPlanUrl(slug: string): string | null {
  return VILLA_3D_PLANS[slug] ?? null
}
