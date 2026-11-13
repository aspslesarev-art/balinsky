// Cyrillic → Latin transliteration. Handles common Russian-keyboard
// renderings of Bali property names ("убуд" → "ubud", "магнум" → "magnum").
// Lossy/practical (not GOST-strict): enough for fuzzy search to bridge.

const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e',
  ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function translit(s: string): string {
  if (!s) return ''
  let out = ''
  for (const ch of s.toLowerCase()) {
    out += MAP[ch] ?? ch
  }
  return out
}

export function hasCyrillic(s: string): boolean {
  return /[а-яёА-ЯЁ]/.test(s)
}

// Case- and Latin-preserving transliteration: only Cyrillic characters are
// mapped, everything else (Latin, digits, punctuation, case) is kept as-is.
// "LAGUNA (Комплекс 7)" → "LAGUNA (Kompleks 7)". Used as a last-resort
// de-Cyrillic fallback for non-RU pages when no translation exists.
export function translitPreserveCase(s: string): string {
  if (!s) return ''
  let out = ''
  for (const ch of s) {
    const lower = ch.toLowerCase()
    const mapped = MAP[lower]
    if (mapped === undefined) { out += ch; continue }
    out += ch === lower || !mapped ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1)
  }
  return out
}

// Слова Google-названий по-русски → как их пишут латиницей на Бали.
// Остальное транслитерируется.
const PLACE_WORDS: Record<string, string> = {
  'пляж': 'Beach', 'бич': 'Beach', 'бичфронт': 'Beachfront', 'клаб': 'Club', 'клуб': 'Club', 'кафе': 'Cafe',
  'ресторан': 'Restaurant', 'колледж': 'College', 'школа': 'School', 'ленд': 'Land', 'терапи': 'Therapy',
  'пантай': 'Pantai', 'храм': 'Temple', 'пура': 'Pura', 'парк': 'Park', 'рынок': 'Market', 'супермаркет': 'Supermarket',
  'аптека': 'Pharmacy', 'больница': 'Hospital', 'клиника': 'Clinic', 'водопад': 'Waterfall', 'отель': 'Hotel',
  'чангу': 'Canggu', 'семиняк': 'Seminyak', 'убуд': 'Ubud', 'убад': 'Ubud', 'меласти': 'Melasti', 'мунгг': 'Munggu',
  'мунггу': 'Munggu', 'переренан': 'Pererenan', 'нуса': 'Nusa', 'дуа': 'Dua', 'улувату': 'Uluwatu', 'санур': 'Sanur',
  'бату': 'Batu', 'болонг': 'Bolong', 'белиг': 'Belig', 'бераван': 'Berawa', 'берава': 'Berawa', 'кута': 'Kuta',
  'джимбаран': 'Jimbaran', 'бингин': 'Bingin', 'паданг': 'Padang', 'баланган': 'Balangan', 'пандава': 'Pandawa',
  'тегаллаланг': 'Tegallalang', 'тегалаланг': 'Tegallalang', 'брава': 'Brava', 'хидден': 'Hidden', 'блу': 'Blue',
  'пойнт': 'Point', 'сонер': 'Sanur', 'гадон': 'Gading', 'тимбис': 'Timbis', 'саванган': 'Sawangan', 'озон': 'Ozone',
  'рустерфиш': 'Roosterfish', 'крэйт': 'Crate', 'тойя': 'Toya', 'пейк': 'Pakeh', 'гегер': 'Geger',
  'итальянский': 'Italian', 'японский': 'Japanese', 'мексиканский': 'Mexican', 'пиццерия': 'Pizzeria', 'пекарня': 'Bakery',
  'бали': 'Bali', 'кедунгу': 'Kedungu', 'нянь': 'Nyanyi', 'ньяньи': 'Nyanyi', 'сесех': 'Seseh', 'умалас': 'Umalas',
}

/** A place name for display: Google Places names are stored in Russian, so
 *  every locale except RU/UK gets Latin: known words are translated, the rest
 *  transliterated. */
export function placeName(name: string | null | undefined, lang: string): string | null {
  if (!name) return null
  if (lang === 'ru' || lang === 'uk' || !hasCyrillic(name)) return name
  // «Пляж Бату болонг» / «Тимбис Бич» → «Batu Bolong Beach» / «Timbis Beach».
  const beach = /^пляж\s+/i.test(name) || /\s+бич$/i.test(name)
  const core = name.replace(/^пляж\s+/i, '').replace(/\s+бич$/i, '').replace(/^колледж\s+(.+)$/i, '$1 колледж')
  const latin = core.replace(/[\p{L}]+/gu, (w: string) => {
    const known = PLACE_WORDS[w.toLowerCase()]
    if (known) return known
    if (!hasCyrillic(w)) return w
    const t = translitPreserveCase(w.toLowerCase())
    return t.charAt(0).toUpperCase() + t.slice(1)
  })
  return beach ? `${latin} Beach` : latin
}

/** Срок сдачи в базе пишут по-русски («4 кв. 2027»); вне RU/UK — «Q4 2027». */
export function completionLabel(raw: string | null | undefined, lang: string): string | null {
  if (!raw) return raw ?? null
  if (lang === 'ru' || lang === 'uk') return raw
  return raw.replace(/(\d)\s*кв\.?\s*/i, 'Q$1 ').replace(/\s*г(од)?\.?$/i, '')
}
