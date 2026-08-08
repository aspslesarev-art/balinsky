// Общий словарь признаков «продукта» для vision-разбора фотографий.
//
// Одна и та же шкала применяется к двум мирам:
//   • рынку краткосрочной аренды (booking_data_*) — там известны цена и загрузка;
//   • нашему каталогу продажи (виллы/апартаменты/ЖК застройщиков).
// Только поэтому их можно сравнивать: «рынок платит за X — застройщики строят Y».
//
// Значения enum'ов СТАБИЛЬНЫ. Добавлять новые можно, переименовывать старые —
// нет: на них считаются премии и сохранённые разборы.

export const VOCAB = {
  visual_kind: ['villa_private', 'villa_in_complex', 'apartment', 'hotel_room', 'guesthouse_room', 'hostel_dorm', 'house', 'unclear'],
  style: ['modern_tropical', 'balinese_traditional', 'minimalist', 'luxury_contemporary', 'boho_mediterranean', 'scandinavian', 'industrial_loft', 'colonial', 'rustic_wood', 'generic_budget', 'none'],
  condition: ['new', 'well_kept', 'aging', 'worn'],
  materials: ['thatch_alang', 'teak_wood', 'bamboo', 'rattan', 'exposed_concrete', 'microcement', 'terrazzo', 'natural_stone', 'marble', 'white_plaster', 'glass_walls', 'ceramic_tile', 'painted_drywall'],
  architecture: ['open_air_living', 'double_height_ceiling', 'floor_to_ceiling_glass', 'rooftop_terrace', 'balcony', 'private_garden', 'sala_gazebo', 'courtyard', 'multi_level'],
  pool: ['infinity', 'private_standard', 'plunge', 'lap', 'shared', 'none'],
  views: ['ocean_full', 'ocean_partial', 'rice_field', 'jungle', 'river_valley', 'mountain', 'garden', 'pool', 'urban', 'none'],
  rooms: ['bedroom', 'bathroom', 'kitchen', 'living', 'dining', 'workspace', 'pool_area', 'exterior', 'garden', 'lobby', 'restaurant', 'gym', 'spa', 'coworking', 'rooftop'],
  space: ['cramped', 'compact', 'comfortable', 'spacious', 'grand'],
  segment: ['couples', 'families', 'digital_nomads', 'surfers', 'groups', 'wellness', 'budget_backpackers', 'luxury_travellers'],
  flags: ['worn_furniture', 'stains_or_mold', 'cramped_rooms', 'clutter', 'poor_lighting', 'dated_bathroom', 'no_outdoor_space', 'construction_nearby', 'road_or_noise', 'low_quality_photos'],
}

const int = (min, max, d) => ({ type: 'integer', minimum: min, maximum: max, description: d })
const arr = (items, d) => ({ type: 'array', items: { type: 'string', enum: items }, description: d })

export const VISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    visual_kind: { type: 'string', enum: VOCAB.visual_kind, description: 'what the photos actually show' },
    style_primary: { type: 'string', enum: VOCAB.style },
    style_secondary: { type: 'string', enum: VOCAB.style },
    finish_tier: int(1, 5, '1 = cheap/worn finishes, 3 = decent mid-market, 5 = ultra-luxury'),
    design_coherence: int(1, 5, 'how deliberate and consistent the design is across rooms'),
    condition: { type: 'string', enum: VOCAB.condition },
    materials: arr(VOCAB.materials, 'materials clearly visible'),
    architecture: arr(VOCAB.architecture),
    pool_type: { type: 'string', enum: VOCAB.pool },
    pool_deck_tier: int(0, 5, '0 = no pool visible'),
    views: arr(VOCAB.views, 'views visible FROM the property'),
    outdoor_living_share: int(1, 5, 'how much of living space is outdoor/semi-outdoor'),
    rooms_shown: arr(VOCAB.rooms),
    kitchen_tier: int(0, 5, '0 = no kitchen shown'),
    bathroom_tier: int(0, 5, '0 = no bathroom shown'),
    bathtub: { type: 'boolean' },
    outdoor_shower: { type: 'boolean' },
    ac_visible: { type: 'boolean' },
    workspace_desk: { type: 'boolean' },
    natural_light: int(1, 5),
    space_feel: { type: 'string', enum: VOCAB.space },
    guest_segment: arr(VOCAB.segment, 'who this product is visibly built for'),
    photo_professional: int(1, 5, 'photography quality: 1 = phone snapshots, 5 = pro shoot'),
    photo_staged: { type: 'boolean' },
    photo_twilight: { type: 'boolean' },
    photo_drone: { type: 'boolean' },
    photo_people: { type: 'boolean' },
    instagrammability: int(1, 5, 'how likely a guest posts this place on social media'),
    wow_element: { type: 'string', description: 'single standout feature, max 8 words English, or "none"' },
    red_flags: arr(VOCAB.flags),
    confidence: int(1, 5, 'how confident you are overall given the photos'),
  },
  required: ['visual_kind', 'style_primary', 'style_secondary', 'finish_tier', 'design_coherence', 'condition', 'materials', 'architecture', 'pool_type', 'pool_deck_tier', 'views', 'outdoor_living_share', 'rooms_shown', 'kitchen_tier', 'bathroom_tier', 'bathtub', 'outdoor_shower', 'ac_visible', 'workspace_desk', 'natural_light', 'space_feel', 'guest_segment', 'photo_professional', 'photo_staged', 'photo_twilight', 'photo_drone', 'photo_people', 'instagrammability', 'wow_element', 'red_flags', 'confidence'],
}

// Подсказка модели одинаковая для обоих миров, кроме строки контекста:
// у аренды это снятые фото, у застройщика может быть рендер.
export const visionSystemPrompt = (context = 'a short-term rental listing in Bali') => `You are a hospitality real-estate product analyst. You get several photos of ONE ${context}.
Judge the PRODUCT, not the marketing: what is physically there, how well it is built and finished, and who would book or buy it.
Rules:
- Use ONLY what is visible. If something is not shown, use the "no ... shown" option (0 / "none" / empty array). Never infer from the vibe.
- Tiers are absolute Bali-market scales, not relative to this listing: finish_tier 1 = bare tile-and-drywall budget room, 3 = clean modern mid-market, 5 = designer villa with custom joinery and stone.
- style_secondary = "none" when a single style dominates.
- views = what you see FROM the property (from its terrace/pool/window), not the surroundings from a drone above the roof.
- red_flags only for things clearly visible in the photos.
- Renders and 3D visualisations count as the intended product: judge them as built, but never raise condition above "new".
Return JSON only.`

// Фото берём «веером» по всему массиву: первый кадр — обложка, остальные
// равномерно, чтобы попали спальня/ванная/кухня, а не шесть ракурсов фасада.
export function pickPhotos(images, max) {
  const list = (images ?? []).filter(u => typeof u === 'string' && u.startsWith('http'))
  if (list.length <= max) return list
  const out = [list[0]]
  const step = (list.length - 1) / (max - 1)
  for (let i = 1; i < max; i++) out.push(list[Math.round(i * step)])
  return [...new Set(out)]
}
