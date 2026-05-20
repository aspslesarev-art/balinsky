// Shared SEO:Slug fallback for the three sync scripts (villas /
// apartments / complexes). Airtable's AI fields occasionally return
// `{state: 'error', errorType: 'monthlyConsumptionLimited', value: null}`
// when the workspace exhausts its monthly AI quota; rows with that
// shape have no usable slug, get filtered out of the slug index, and
// silently disappear from the site.
//
// To keep the site functional while waiting for the quota to reset,
// we derive a deterministic slug from SEO:Title (which is usually
// also AI-generated, but the title field is far less likely to be in
// an error state at the same time as the slug — Airtable seems to
// regenerate them on different cadences). If SEO:Title is also bad,
// we fall back to `Name`. If that's also missing, the record stays
// slug-less and is skipped as before.
//
// Plain Russian transliteration. We deliberately *don't* run the
// Cyrillic-Latin look-alike fold from `lib/slug-normalize.ts` here:
// that map is meant for slugs already mostly Latin with a few mistyped
// Cyrillic letters (`сanggu` → `canggu`). When fed a fully Russian
// title ("Вилла Happiness Village Ubud в Ubud — 1000 м², 11 спальни"),
// the look-alike fold yields nonsense like `billa-…-cpalhi` because it
// treats every Cyrillic letter as a Latin look-alike. Pure
// transliteration gives the readable `villa-…-spalni`.
const TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'shh',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}

export function normalizeSlug(raw) {
  if (!raw) return ''
  const lower = raw.toLowerCase()
  let t = ''
  for (const ch of lower) t += TRANSLIT[ch] ?? ch
  return t.replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

// `{state: 'error', errorType, value: null}` is the Airtable AI-failed
// shape. Treat anything where `value` is missing or null and `state`
// is `error` as unusable.
function isAirtableAiError(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
    && v.state === 'error'
    && (v.value === null || v.value === undefined || v.value === '')
}

// Slugs the Airtable formula produced with one of its inputs missing —
// e.g. resale rows that link to "Комплекс вторичка" but the formula
// pulls from "Комплекс", giving "-38m2-1-bedroom". The detail-index
// builder rejects anything starting with "-" (line 72 of
// sync-detail-indexes.mjs), so these rows 404. Treat them as unusable
// and regenerate.
function looksMalformed(s) {
  if (typeof s !== 'string') return false
  const t = s.trim()
  if (!t) return false
  if (t.startsWith('-') || t.endsWith('-')) return true
  if (/--+/.test(t)) return true
  if (t.length < 4) return true
  return false
}

// Mutates `record.fields` in-place: replaces SEO:Slug with a derived
// fallback when Airtable returned an AI error or a malformed slug.
// Returns true when a substitution actually happened (for logging).
export function backfillSlug(fields) {
  if (!fields) return false
  const slugRaw = fields['SEO:Slug']
  // Already a usable string — nothing to do.
  if (typeof slugRaw === 'string' && slugRaw.trim() && !looksMalformed(slugRaw)) return false
  // {state: generated, value: 'real-slug'} — happens on apartments where
  // SEO:Slug is the wrapped variant. Unwrap and keep as-is.
  if (slugRaw && typeof slugRaw === 'object' && typeof slugRaw.value === 'string' && slugRaw.value.trim() && !looksMalformed(slugRaw.value)) {
    fields['SEO:Slug'] = slugRaw.value.trim()
    return true
  }
  // Pick the most-trusted source we have for the fallback title.
  let titleSource = null
  for (const k of ['SEO:Title', 'ИИ Имя', 'Name']) {
    const v = fields[k]
    if (typeof v === 'string' && v.trim()) { titleSource = v; break }
    if (v && typeof v === 'object' && typeof v.value === 'string' && v.value.trim()) {
      titleSource = v.value; break
    }
  }
  if (!titleSource) {
    // Last resort: keep the row reachable via its stable Name (e.g. A763)
    // — always unique within the table. Prefixed so the URL hints at
    // "no nice slug yet" without colliding with editor-set slugs.
    const name = fields['Name']
    if (typeof name === 'string' && name.trim()) {
      fields['SEO:Slug'] = `obyekt-${normalizeSlug(name)}`
      fields['_slug_fallback_at'] = new Date().toISOString()
      return true
    }
    return false
  }
  // Strip the "| Balinsky" suffix the Airtable titles carry by convention.
  const clean = titleSource.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
  let derived = normalizeSlug(clean)
  // The title itself may also be missing the complex name, leaving
  // collapsed dashes after normalisation. Append the unique Name to
  // disambiguate and avoid colliding with another half-broken row.
  if (derived) {
    const name = fields['Name']
    if (typeof name === 'string' && name.trim() && !derived.includes(normalizeSlug(name))) {
      derived = `${derived}-${normalizeSlug(name)}`.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
    }
  }
  if (!derived) return false
  fields['SEO:Slug'] = derived
  // Drop a marker so the dataset can tell substituted rows apart later.
  // Useful when comparing prod (AI-clean) vs the fallback period.
  if (isAirtableAiError(slugRaw) || looksMalformed(typeof slugRaw === 'string' ? slugRaw : slugRaw?.value)) {
    fields['_slug_fallback_at'] = new Date().toISOString()
  }
  return true
}
