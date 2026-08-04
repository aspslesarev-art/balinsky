// Comprehensive, cost-bounded Google Places (New) sweep of Bali's best
// touristic places. Unlike collect-anchor-pois.mjs (lean id/location/rating
// mask for the heatmap), this pulls the FULL atmosphere field mask — one
// search request returns up to 20 fully-detailed places (rating, review count,
// review texts, opening hours, contacts, editorial summary, photo REFERENCES).
// No Place Details calls and no photo-byte downloads: photos are stored as
// Google photo resource names / attribution only.
//
// Endpoints:
//   searchText   — supports pagination (nextPageToken); up to MAX_PAGES × 20.
//   searchNearby — NO pagination; run twice (POPULARITY + DISTANCE) and merge.
//   NB: putting `nextPageToken` in a searchNearby field mask is a 400.
//
// Output: scripts/_bali-tourism.json      (id -> rich place record + provenance)
// Checkpoint: scripts/_bali-tourism-checkpoint.json  (resumable; roots done, cost)
//
// Usage:
//   node scripts/collect-bali-tourism.mjs --dry            # 2 zones, measure cost
//   node scripts/collect-bali-tourism.mjs --cap=200        # full sweep, hard stop $200
//   node scripts/collect-bali-tourism.mjs --max-pages=3    # text pagination depth (default 3)
//   node scripts/collect-bali-tourism.mjs --reset          # wipe output+checkpoint
//
// Cost model: every search request with atmosphere fields bills at the
// "Enterprise + Atmosphere" SKU. We assume a conservative $0.040/request.
import fs from 'node:fs'
import path from 'node:path'

// ---- env ----
const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
const GMAPS_KEY = process.env.GOOGLE_PLACES_KEY // dedicated server key, no referrer restriction
if (!GMAPS_KEY) { console.error('Missing GOOGLE_PLACES_KEY in .env.local'); process.exit(1) }

// ---- args ----
const ARGS = process.argv.slice(2)
const DRY = ARGS.includes('--dry')
const RESET = ARGS.includes('--reset')
const CAP = Number((ARGS.find(a => a.startsWith('--cap=')) || '--cap=200').split('=')[1])
const MAX_PAGES = Number((ARGS.find(a => a.startsWith('--max-pages=')) || '--max-pages=3').split('=')[1])
const COST_PER_REQ = 0.040 // USD, Enterprise+Atmosphere search, conservative
// Pass 1-2 (July 2026) swept the island broadly. Pass 3 goes after what a
// foreign tourist actually spends money on — beach clubs, fine dining, spas,
// gyms, kids' entertainment, marinas — plus the zones pass 1-2 never anchored.
const PASS = Number((ARGS.find(a => a.startsWith('--pass=')) || '--pass=3').split('=')[1])
// Google returns the 5 reviews most relevant to the REQUESTED language, so a
// sweep run with languageCode:'ru' makes even a local warung look like it is
// reviewed by foreigners. `--lang=none` omits the field entirely, which gives
// an unbiased sample — that's how we tell tourist spots from local ones.
const LANG = (ARGS.find(a => a.startsWith('--lang=')) || '--lang=ru').split('=')[1]
const LANG_FIELD = LANG === 'none' ? {} : { languageCode: LANG }

const SUFFIX = PASS > 2 ? `-p${PASS}` : ''
const OUT_PATH = path.resolve(`scripts/_bali-tourism${SUFFIX}.json`)
const CK_PATH = path.resolve(`scripts/_bali-tourism${SUFFIX}-checkpoint.json`)
const PREV_CK_PATH = path.resolve('scripts/_bali-tourism-checkpoint.json')

// ---- touristic zones across Bali (name, lat, lng, radius m) ----
const ZONES = [
  ['Canggu', -8.647, 115.140, 4000], ['Berawa-Pererenan', -8.660, 115.128, 3000],
  ['Seminyak', -8.690, 115.168, 2500], ['Kuta-Legian', -8.717, 115.170, 3000],
  ['Jimbaran', -8.790, 115.160, 3500], ['Uluwatu-Pecatu', -8.815, 115.088, 5000],
  ['Ungasan-Melasti', -8.830, 115.160, 4000], ['Bingin-Padang', -8.808, 115.120, 3000],
  ['Nusa Dua', -8.800, 115.232, 4000], ['Sanur', -8.688, 115.262, 3500],
  ['Denpasar', -8.670, 115.212, 4000], ['Sukawati-Gianyar', -8.590, 115.285, 5000],
  ['Keramas', -8.600, 115.352, 4000],
  ['Ubud', -8.507, 115.263, 5000], ['Tegallalang', -8.435, 115.278, 4000],
  ['Payangan', -8.430, 115.240, 4000],
  ['Kintamani-Batur', -8.245, 115.375, 8000], ['Bedugul', -8.275, 115.166, 6000],
  ['Munduk', -8.265, 115.070, 6000], ['Lovina', -8.158, 115.025, 6000],
  ['Jatiluwih', -8.371, 115.130, 6000],
  ['Sidemen', -8.435, 115.445, 6000], ['Candidasa', -8.510, 115.567, 6000],
  ['Amed', -8.339, 115.687, 7000], ['Tulamben', -8.275, 115.592, 5000],
  ['Tirta Gangga', -8.412, 115.587, 4000], ['Besakih', -8.374, 115.451, 5000],
  ['Tanah Lot', -8.621, 115.088, 5000], ['Tabanan', -8.545, 115.125, 6000],
  ['Medewi', -8.420, 114.800, 6000], ['Pemuteran-Menjangan', -8.140, 114.660, 8000],
  ['Nusa Penida', -8.727, 115.545, 9000], ['Nusa Lembongan', -8.680, 115.450, 5000],
  // --- pass 2: tighter sub-zone anchors to surface the long tail ---
  ['Pererenan', -8.635, 115.113, 2500], ['Umalas-Kerobokan', -8.673, 115.160, 2500],
  ['Sanggingan-Penestanan', -8.500, 115.252, 2500], ['Sayan-Kedewatan', -8.505, 115.244, 2500],
  ['Benoa-Tanjung', -8.755, 115.215, 3000], ['Sanur North', -8.665, 115.256, 2500],
  ['Sekumpul', -8.170, 115.180, 4000], ['Banjar-Sambangan', -8.180, 115.075, 4000],
  ['Lempuyang-Bunutan', -8.390, 115.630, 4000], ['Padangbai', -8.530, 115.510, 3000],
  ['Nungnung', -8.320, 115.168, 4000], ['Sukawati-Batubulan', -8.610, 115.270, 3500],
  ['Uluwatu-Padang', -8.810, 115.103, 2500], ['Seseh-Cemagi', -8.628, 115.103, 3000],
]

// ---- categories ----
const NEARBY_ROOTS = [
  { cat: 'restaurant', types: ['restaurant', 'fine_dining_restaurant', 'seafood_restaurant', 'italian_restaurant', 'japanese_restaurant', 'sushi_restaurant', 'steak_house', 'vegan_restaurant', 'vegetarian_restaurant', 'thai_restaurant', 'indian_restaurant', 'mexican_restaurant', 'mediterranean_restaurant'] },
  { cat: 'cafe', types: ['cafe', 'coffee_shop', 'bakery', 'breakfast_restaurant', 'brunch_restaurant'] },
  { cat: 'beach', types: ['beach'] },
  { cat: 'attraction', types: ['tourist_attraction', 'park', 'hindu_temple', 'historical_landmark', 'national_park'] },
  { cat: 'nightlife', types: ['bar', 'night_club', 'wine_bar', 'pub'] },
]
const TEXT_ROOTS = [
  { cat: 'beachclub', query: 'beach club' },
  { cat: 'waterfall', query: 'waterfall' },
  { cat: 'rice_terrace', query: 'rice terrace' },
  { cat: 'viewpoint', query: 'sunset viewpoint' },
  { cat: 'temple', query: 'temple pura' },
  { cat: 'wellness', query: 'yoga studio spa wellness retreat' },
  { cat: 'coworking', query: 'coworking space' },
  { cat: 'watersport', query: 'snorkeling diving spot' },
  { cat: 'market', query: 'traditional art market' },
  { cat: 'museum', query: 'museum art gallery' },
  { cat: 'nightclub', query: 'night club live music bar' },
  // --- pass 2: niche long-tail queries (run for every zone) ---
  { cat: 'vegan', query: 'vegan healthy restaurant' },
  { cat: 'finedining', query: 'fine dining restaurant' },
  { cat: 'divespot', query: 'dive site scuba diving' },
  { cat: 'surfspot', query: 'surf spot surfing beach' },
  { cat: 'hiddenwaterfall', query: 'hidden waterfall' },
  { cat: 'nature', query: 'national park nature reserve jungle' },
  { cat: 'landmark', query: 'famous landmark monument' },
  { cat: 'luxuryhotel', query: 'luxury resort hotel' },
]

// ---- pass 3: zones pass 1-2 never anchored ----
const PASS3_ZONES = [
  ['Nuanu-Tumbak Bayuh', -8.615, 115.116, 2500], ['Munggu-Kedungu', -8.598, 115.100, 3500],
  ['Tanah Lot-Beraban', -8.635, 115.095, 2500], ['Yeh Gangga', -8.585, 115.085, 3000],
  ['Balian-Soka', -8.470, 114.965, 6000], ['Negara-Jembrana', -8.360, 114.620, 8000],
  ['Singaraja', -8.112, 115.088, 6000], ['Air Sanih-Tejakula', -8.100, 115.250, 8000],
  ['Penglipuran-Bangli', -8.425, 115.355, 5000], ['Klungkung-Semarapura', -8.535, 115.402, 4000],
  ['Nusa Ceningan', -8.688, 115.462, 2500], ['Serangan-Suwung', -8.720, 115.235, 3500],
  ['Amlapura-Ujung', -8.475, 115.618, 4000], ['Seraya', -8.425, 115.700, 5000],
  ['Kutuh-Pandawa', -8.845, 115.185, 3000], ['Karang Boma-Suluban', -8.825, 115.085, 2500],
  ['Tanjung Benoa', -8.762, 115.220, 2500], ['Batubulan-Celuk', -8.605, 115.253, 2500],
]

// Nearby roots for the money categories: places whose Google TYPE is reliable.
const PASS3_NEARBY_ROOTS = [
  { cat: 'spa_wellness', types: ['spa', 'wellness_center', 'yoga_studio', 'massage', 'sauna'] },
  { cat: 'fitness', types: ['gym', 'fitness_center', 'sports_complex', 'sports_activity_location', 'swimming_pool'] },
  { cat: 'family', types: ['amusement_park', 'water_park', 'zoo', 'aquarium', 'playground', 'amusement_center', 'bowling_alley', 'movie_theater'] },
  { cat: 'retail', types: ['shopping_mall', 'department_store', 'clothing_store', 'jewelry_store', 'gift_shop', 'book_store'] },
  { cat: 'lodging_top', types: ['resort_hotel', 'hotel', 'bed_and_breakfast'] },
]

// Text roots for what Google has no type for — the phrasing a tourist would use.
const PASS3_TEXT_ROOTS = [
  { cat: 'beachclub_day', query: 'beach club day club pool party' },
  { cat: 'rooftop', query: 'rooftop bar sunset cocktails' },
  { cat: 'finedining2', query: 'fine dining tasting menu chef restaurant' },
  { cat: 'cocktail', query: 'cocktail bar speakeasy mixology' },
  { cat: 'winebar', query: 'wine bar wine list' },
  { cat: 'omakase', query: 'sushi omakase japanese fine dining' },
  { cat: 'grill', query: 'steak house grill western restaurant' },
  { cat: 'dayspa', query: 'luxury day spa massage treatment' },
  { cat: 'retreat', query: 'wellness retreat detox healing center' },
  { cat: 'gymbox', query: 'crossfit muay thai boxing gym' },
  { cat: 'racket', query: 'padel tennis club golf course' },
  { cat: 'surfschool', query: 'surf school surf camp lessons' },
  { cat: 'divecenter', query: 'dive center scuba courses' },
  { cat: 'familyfun', query: 'water park kids club family entertainment center' },
  { cat: 'mall', query: 'shopping mall boutique concept store' },
  { cat: 'gallery2', query: 'art gallery exhibition studio' },
  { cat: 'cookingclass', query: 'cooking class culinary experience' },
  { cat: 'charter', query: 'yacht charter sunset cruise boat trip' },
  { cat: 'adventure', query: 'atv rafting zipline adventure park' },
  { cat: 'expatservices', query: 'international school clinic dentist expat' },
]

const ALL_ZONES = PASS > 2 ? [...ZONES, ...PASS3_ZONES] : ZONES
const ALL_NEARBY_ROOTS = PASS > 2 ? [...NEARBY_ROOTS, ...PASS3_NEARBY_ROOTS] : NEARBY_ROOTS
const ALL_TEXT_ROOTS = PASS >= 4 ? [] : PASS > 2 ? [...TEXT_ROOTS, ...PASS3_TEXT_ROOTS] : TEXT_ROOTS

// ---- field mask: full atmosphere detail, no photo bytes ----
const FIELDS = ['id', 'displayName', 'formattedAddress', 'shortFormattedAddress', 'location', 'types', 'primaryType', 'primaryTypeDisplayName', 'rating', 'userRatingCount', 'priceLevel', 'businessStatus', 'googleMapsUri', 'websiteUri', 'internationalPhoneNumber', 'nationalPhoneNumber', 'regularOpeningHours', 'currentOpeningHours', 'editorialSummary', 'reviews', 'photos', 'plusCode', 'utcOffsetMinutes', 'goodForChildren', 'goodForGroups', 'liveMusic', 'outdoorSeating', 'reservable', 'servesBreakfast', 'servesBrunch', 'servesLunch', 'servesDinner', 'servesVegetarianFood', 'servesCocktails', 'servesCoffee', 'servesDessert', 'delivery', 'dineIn', 'takeout', 'allowsDogs', 'parkingOptions', 'paymentOptions', 'accessibilityOptions']
const PLACE_MASK = FIELDS.map(f => `places.${f}`).join(',')
const TEXT_MASK = PLACE_MASK + ',nextPageToken'   // searchText paginates
const NEARBY_MASK = PLACE_MASK                     // searchNearby must NOT include nextPageToken

// ---- state ----
const places = loadJSON(OUT_PATH, {}) // id -> record
let ck = loadJSON(CK_PATH, null)
// A later pass starts from the earlier pass's ledger of finished (zone, root)
// pairs — otherwise it would re-buy every combination pass 1-2 already covered
// and only the new zones/categories would be new money well spent.
if (!ck) {
  const seed = PASS === 3 ? loadJSON(PREV_CK_PATH, { done: [] }).done ?? [] : []
  ck = { done: seed, requests: 0, spent: 0 }
  if (seed.length) console.log(`seeded ${seed.length} finished roots from pass 1-2 — those won't be charged again`)
}
if (RESET) { for (const k of Object.keys(places)) delete places[k]; ck = { done: [], requests: 0, spent: 0 } }
const doneSet = new Set(ck.done)

function loadJSON(p, dflt) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return dflt } }
function save() { fs.writeFileSync(OUT_PATH, JSON.stringify(places, null, 1)); ck.done = [...doneSet]; fs.writeFileSync(CK_PATH, JSON.stringify(ck, null, 1)) }
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const chargeable = () => (CAP - ck.spent) >= COST_PER_REQ

async function doSearch(endpoint, body, fieldMask) {
  ck.requests++; ck.spent = +(ck.requests * COST_PER_REQ).toFixed(3)
  const r = await fetch(`https://places.googleapis.com/v1/places:${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GMAPS_KEY, 'X-Goog-FieldMask': fieldMask },
    body: JSON.stringify(body),
  })
  if (!r.ok) { console.warn(`  ${endpoint} ${r.status}: ${(await r.text()).replace(/\s+/g, ' ').slice(0, 140)}`); return { places: [] } }
  return r.json()
}

function ingest(list, zone, cat) {
  let added = 0, withReview = 0
  for (const p of list || []) {
    if (!p.id) continue
    if (Array.isArray(p.reviews) && p.reviews.length) withReview++
    if (places[p.id]) {
      const rec = places[p.id]
      if (!rec._zones.includes(zone)) rec._zones.push(zone)
      if (!rec._cats.includes(cat)) rec._cats.push(cat)
      if ((p.reviews?.length || 0) > (rec.reviews?.length || 0)) { const z = rec._zones, c = rec._cats; Object.assign(rec, p); rec._zones = z; rec._cats = c }
    } else {
      places[p.id] = { ...p, _zones: [zone], _cats: [cat] }
      added++
    }
  }
  return { added, withReview }
}

async function nearbyRoot(types, lat, lng, radius, zone, cat) {
  let added = 0, seen = 0, rev = 0
  for (const rank of ['POPULARITY', 'DISTANCE']) {
    if (!chargeable()) return { added, seen, rev, capped: true }
    const body = { includedTypes: types, maxResultCount: 20, ...LANG_FIELD, rankPreference: rank, locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } } }
    const res = await doSearch('searchNearby', body, NEARBY_MASK)
    const list = res.places || []
    seen += list.length
    const ing = ingest(list, zone, cat); added += ing.added; rev += ing.withReview
    await sleep(120)
  }
  return { added, seen, rev, capped: false }
}

async function textRoot(query, lat, lng, radius, zone, cat) {
  let token = null, pages = 0, added = 0, seen = 0, rev = 0
  do {
    if (!chargeable()) return { added, seen, rev, capped: true }
    const body = { textQuery: `${query} ${zone} Bali`, pageSize: 20, ...LANG_FIELD, locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius } } }
    if (token) body.pageToken = token
    const res = await doSearch('searchText', body, TEXT_MASK)
    const list = res.places || []
    seen += list.length
    const ing = ingest(list, zone, cat); added += ing.added; rev += ing.withReview
    token = res.nextPageToken || null
    pages++
    await sleep(token ? 1600 : 120)
  } while (token && pages < MAX_PAGES)
  return { added, seen, rev, capped: false }
}

// ---- main ----
const zones = DRY ? ALL_ZONES.slice(0, 2) : ALL_ZONES
console.log(`Bali tourism sweep${DRY ? ' [DRY]' : ''}  zones=${zones.length}  maxPages=${MAX_PAGES}  cap=$${CAP}  already≈$${ck.spent}`)
let capped = false

outer:
for (const [zName, lat, lng, radius] of zones) {
  for (const root of ALL_NEARBY_ROOTS) {
    const key = `${zName}|nearby|${root.cat}`
    if (doneSet.has(key)) continue
    if (!chargeable()) { capped = true; break outer }
    const { added, seen, rev, capped: c } = await nearbyRoot(root.types, lat, lng, radius, zName, root.cat)
    console.log(`  ${zName} / ${root.cat}: +${added} (${seen} seen, ${rev} rev)  [reqs=${ck.requests} $${ck.spent}]`)
    if (c) { capped = true; break outer }
    doneSet.add(key); save()
  }
  for (const root of ALL_TEXT_ROOTS) {
    const key = `${zName}|text|${root.cat}`
    if (doneSet.has(key)) continue
    if (!chargeable()) { capped = true; break outer }
    const { added, seen, rev, capped: c } = await textRoot(root.query, lat, lng, radius, zName, root.cat)
    console.log(`  ${zName} / ${root.cat}: +${added} (${seen} seen, ${rev} rev)  [reqs=${ck.requests} $${ck.spent}]`)
    if (c) { capped = true; break outer }
    doneSet.add(key); save()
  }
}

save()
const vals = Object.values(places)
console.log('\n==== SUMMARY ====')
console.log(`unique places: ${vals.length}`)
console.log(`  with review texts: ${vals.filter(p => p.reviews?.length).length}`)
console.log(`  with photo refs:   ${vals.filter(p => p.photos?.length).length}`)
console.log(`  with editorial:    ${vals.filter(p => p.editorialSummary).length}`)
console.log(`requests: ${ck.requests}   est. spend: $${ck.spent}  (cap $${CAP})`)
if (capped) console.log('!! STOPPED at budget cap — re-run to continue (checkpoint resumes)')
if (DRY) {
  const projReq = Math.round((ck.requests / zones.length) * ALL_ZONES.length)
  console.log('\n---- DRY EXTRAPOLATION ----')
  console.log(`avg requests/zone: ${(ck.requests / zones.length).toFixed(1)}  →  full ${ALL_ZONES.length} zones ≈ ${projReq} reqs ≈ $${(projReq * COST_PER_REQ).toFixed(2)}`)
}
