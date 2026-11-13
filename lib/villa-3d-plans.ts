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
  'unit-nyanyi-71m2-1-bedroom': '/models/unit-nyanyi-71m2-1-bedroom-3d.html',
  'cassandra2-sanur-88m2-2-bedroom': '/models/cassandra2-sanur-88m2-2-bedroom-3d.html',
  'edem-ii-nusa-dua-33m2-1-bedroom': '/models/edem-ii-nusa-dua-33m2-1-bedroom-3d.html',
  'unit-black-sands-oasis-nyanyi-160m2-4-bedroom': '/models/black-sands-oasis-nyanyi-160m2-4-bedroom-3d.html',
  'black-sands-oasis-nyanyi-160m2-4-bedroom': '/models/black-sands-oasis-nyanyi-160m2-4-bedroom-3d.html',
  'black-sands-oasis-nyanyi-160m2-4-bedroom-2': '/models/black-sands-oasis-nyanyi-160m2-4-bedroom-3d.html',
  'unit-black-sands-oasis-nyanyi-128m2-3-bedroom': '/models/unit-black-sands-oasis-nyanyi-128m2-3-bedroom-3d.html',
  'aquamarine-i-batu-bolong-358m2-4-bedroom': '/models/aquamarine-i-batu-bolong-358m2-4-bedroom-3d.html',
  'origins-nyanyi-235m2-3-bedroom': '/models/origins-nyanyi-235m2-3-bedroom-3d.html',
  'origins-nyanyi-235m2-3-bedroom-2': '/models/origins-nyanyi-235m2-3-bedroom-3d.html',
  'base-uluwatu-uluwatu-40m2-1-bedroom': '/models/base-uluwatu-uluwatu-40m2-1-bedroom-3d.html',
}

/** Публичный URL 3D-планировки виллы либо null, если модели нет. */
export function getVilla3DPlanUrl(slug: string): string | null {
  return VILLA_3D_PLANS[slug] ?? null
}

/**
 * Апартаменты — свой реестр: slug апартаментов и вилл живут в разных
 * пространствах имён и могут совпасть.
 */
const APARTMENT_3D_PLANS: Readonly<Record<string, string>> = {
}

/** Публичный URL 3D-планировки апартаментов либо null, если модели нет. */
export function getApartment3DPlanUrl(slug: string): string | null {
  return APARTMENT_3D_PLANS[slug] ?? null
  'elysium-pererenan-29m2-1-bedroom-1': '/models/elysium-pererenan-29m2-1-bedroom-3d.html',
  'prima-residence-batu-bolong-93m2-2-bedroom-3': '/models/prima-residence-batu-bolong-93m2-2-bedroom-3d.html',
  'prima-residence-batu-bolong-93m2-2-bedroom-2': '/models/prima-residence-batu-bolong-93m2-2-bedroom-3d.html',
  'prima-residence-batu-bolong-93m2-2-bedroom-1': '/models/prima-residence-batu-bolong-93m2-2-bedroom-3d.html',
  'oceaniq-2-nusa-dua-59m2-1-bedroom-1': '/models/oceaniq-2-nusa-dua-59m2-1-bedroom-3d.html',
  'magnum-resort-sanur-sanur-101m2-1-bedroom-1': '/models/magnum-resort-sanur-sanur-101m2-1-bedroom-3d.html',
  'magnum-resort-sanur-sanur-101m2-1-bedroom-3': '/models/magnum-resort-sanur-sanur-101m2-1-bedroom-3d.html',
  'magnum-resort-sanur-sanur-101m2-1-bedroom-2': '/models/magnum-resort-sanur-sanur-101m2-1-bedroom-3d.html',
  'magnum-resort-sanur-sanur-101m2-1-bedroom-4': '/models/magnum-resort-sanur-sanur-101m2-1-bedroom-3d.html',
  'pandawa-residence-pandawa-40m2-1-bedroom-1': '/models/pandawa-residence-pandawa-40m2-1-bedroom-3d.html',
  'pandawa-residence-pandawa-40m2-1-bedroom-2': '/models/pandawa-residence-pandawa-40m2-1-bedroom-3d.html',
  'amani-melasti-melasti-45m2-1-bedroom-1': '/models/melasti-44m2-1-bedroom-3d.html',
  'melasti-44m2-1-bedroom-2': '/models/melasti-44m2-1-bedroom-3d.html',
  'baza-kedungu-kedungu-30m2-1-bedroom-1': '/models/baza-kedungu-kedungu-30m2-1-bedroom-3d.html',
  'baza-kedungu-kedungu-30m2-1-bedroom-2': '/models/baza-kedungu-kedungu-30m2-1-bedroom-3d.html',
  'baza-kedungu-kedungu-39m2-1-bedroom-1': '/models/baza-kedungu-kedungu-39m2-1-bedroom-3d.html',
  'edem-ii-nusa-dua-28m2-1-bedroom-1': '/models/edem-ii-nusa-dua-28m2-1-bedroom-3d.html',
  'amani-melasti-melasti-68m2-1-bedroom': '/models/amani-melasti-melasti-68m2-1-bedroom-3d.html',
}
