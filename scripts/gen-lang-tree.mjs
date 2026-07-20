// Generate a per-language route tree by mirroring app/en, renaming the
// localized URL segments and swapping the lang code / hardcoded /en/ paths.
// English bespoke copy carries over as a shell until translated (Phase 2).
// Usage: node scripts/gen-lang-tree.mjs pl   (or uk)
import fs from 'node:fs'
import path from 'node:path'

const TARGET = process.argv[2]
if (!['pl', 'uk'].includes(TARGET)) { console.error('usage: gen-lang-tree.mjs pl|uk'); process.exit(1) }

// en segment -> target segment (mirror of SEGMENT_TABLE en/target columns).
const SEG = {
  pl: { villas: 'wille', apartments: 'apartamenty', complexes: 'kompleksy', developers: 'deweloperzy', rental: 'wynajem', events: 'wydarzenia', news: 'aktualnosci', knowledge: 'poradnik', promo: 'promocje', favourites: 'ulubione', 'how-to-buy': 'jak-kupic', reservation: 'rezerwacja', about: 'o-nas', map: 'mapa', search: 'szukaj', contact: 'kontakt', 'completed-in': 'oddane-w', 'living-in-bali': 'zycie-na-bali', 'bali-property-investment': 'inwestycje-nieruchomosci-bali', 'invest-tour': 'invest-tour', cookie: 'cookie', privacy: 'prywatnosc', terms: 'regulamin' },
  uk: { villas: 'vily', apartments: 'apartamenty', complexes: 'kompleksy', developers: 'zabudovnyky', rental: 'orenda', events: 'podiyi', news: 'novyny', knowledge: 'poradnyk', promo: 'aktsiyi', favourites: 'obrane', 'how-to-buy': 'yak-kupyty', reservation: 'rezervuvannia', about: 'pro-nas', map: 'karta', search: 'poshuk', contact: 'kontakty', 'completed-in': 'zdano-v', 'living-in-bali': 'zhyttia-na-bali', 'bali-property-investment': 'investytsiyi-nerukhomist-bali', 'invest-tour': 'invest-tour', cookie: 'cookie', privacy: 'konfidentsiynist', terms: 'umovy' },
}[TARGET]

const SRC = 'app/en'
const DST = `app/${TARGET}`

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p)
  }
  return out
}

// Map a path RELATIVE to app/en, renaming each localized segment.
function mapRelPath(rel) {
  return rel.split('/').map(part => SEG[part] ?? part).join('/')
}

// Rewrite file content: /en/<seg> paths, lang="en", metadata 'en' args.
function transform(src) {
  let s = src
  // 1. /en/<enseg> -> /<t>/<tseg>. Longest segments first so multi-word
  //    ones (bali-property-investment) match before any prefix collision.
  for (const en of Object.keys(SEG).sort((a, b) => b.length - a.length)) {
    s = s.replaceAll(`/en/${en}`, `/${TARGET}/${SEG[en]}`)
  }
  // 2. bare /en/ prefix (homepage-relative links, canonical roots).
  s = s.replaceAll('/en/', `/${TARGET}/`).replaceAll("'/en'", `'/${TARGET}'`).replaceAll('"/en"', `"/${TARGET}"`)
  // 3. lang code in JSX + metadata calls.
  s = s.replaceAll('lang="en"', `lang="${TARGET}"`).replaceAll("lang='en'", `lang='${TARGET}'`)
  s = s.replaceAll(", 'en')", `, '${TARGET}')`).replaceAll("('en'", `('${TARGET}'`).replaceAll("lang: 'en'", `lang: '${TARGET}'`)
  return s
}

let n = 0
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file)
  const dst = path.join(DST, mapRelPath(rel))
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.writeFileSync(dst, transform(fs.readFileSync(file, 'utf8')))
  n++
}
console.log(`${TARGET}: generated ${n} files under ${DST}`)
