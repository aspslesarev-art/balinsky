// Airtable-data internationalization.
//
// Convention: every translatable Airtable column has a sibling whose
// name is the original key plus " EN" — so "Описание ИИ" → "Описание ИИ EN".
// On English pages we look up the EN sibling first; if it's empty we
// **render the literal column name** ("Описание ИИ EN") so it's
// immediately visible to the editor which Airtable column they need to
// create or fill in. No styling, no badge — just the raw key, exactly
// like the user requested.
//
// Russian pages bypass this helper entirely.

export type Lang = 'ru' | 'en'

// Some Airtable string fields wrap their value in a generated/staged
// object: { state: 'generated', value: 'Vila Anya', isStale: false }.
// Unwrap to the actual string.
function unwrap(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) {
    for (const x of v) {
      const u = unwrap(x)
      if (u) return u
    }
    return null
  }
  if (typeof v === 'object' && v !== null && 'value' in v) {
    return unwrap((v as { value: unknown }).value)
  }
  return null
}

/**
 * Look up `field` from a raw_villas/raw_apartments/etc data blob,
 * applying the English-fallback convention.
 *
 * - lang='ru' → return data[field], unwrapped to a string
 * - lang='en' → return data[`${field} EN`] if present and non-empty;
 *   otherwise return the literal placeholder `${field} EN` so the
 *   editor can spot the missing translation.
 */
export function tField(
  data: Record<string, unknown> | null | undefined,
  field: string,
  lang: Lang,
): string | null {
  const d = data ?? {}
  if (lang === 'ru') return unwrap(d[field])
  const en = unwrap(d[`${field} EN`])
  if (en) return en
  // Placeholder form: literal column name. Use only when there's a
  // Russian value to translate — if the RU side is also empty, return
  // null so callers can hide the field entirely.
  const ru = unwrap(d[field])
  return ru ? `${field} EN` : null
}

// Sometimes a page wants the actual EN value when present, otherwise
// the RU value (graceful fallback for rendering, not for editor TODOs).
export function tFieldOrRu(
  data: Record<string, unknown> | null | undefined,
  field: string,
  lang: Lang,
): string | null {
  const d = data ?? {}
  if (lang === 'ru') return unwrap(d[field])
  const en = unwrap(d[`${field} EN`])
  if (en) return en
  return unwrap(d[field])
}

// Pure UI strings live in this small dictionary. Keep flat so you can
// see at a glance which keys exist; nesting tends to drift.
export const UI = {
  ru: {
    siteName: 'Balinsky',
    nav: {
      villy: 'Виллы и дома',
      apartamenty: 'Апартаменты',
      zhilye: 'Жилые комплексы',
      zastrojshhiki: 'Застройщики',
      arenda: 'Аренда',
    },
  },
  en: {
    siteName: 'Balinsky',
    nav: {
      villy: 'Villas',
      apartamenty: 'Apartments',
      zhilye: 'Residential complexes',
      zastrojshhiki: 'Developers',
      arenda: 'Long-term rental',
    },
  },
} as const

// Toggle the locale segment in a path: /ru/villy/o/x ↔ /en/villy/o/x.
// Used by the Header switcher.
export function switchLangPath(pathname: string, target: Lang): string {
  if (pathname.startsWith(`/${target}/`) || pathname === `/${target}`) return pathname
  if (pathname.startsWith('/ru')) return target === 'ru' ? pathname : '/en' + pathname.slice(3)
  if (pathname.startsWith('/en')) return target === 'en' ? pathname : '/ru' + pathname.slice(3)
  // Outside known locale roots — point to the catalog as a sensible fallback.
  return `/${target}`
}
