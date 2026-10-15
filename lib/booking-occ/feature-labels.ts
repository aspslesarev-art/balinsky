// Русские названия признаков для «Что влияет на загрузку» (/admin/booking).
// fac: — удобства Booking (слаги из booking_room_facts.facilities),
// ph:  — разбор фото (vision_rubric.md на сервере), pl: — место и отзывы.

const FAC: Record<string, string> = {
  private_bathroom: 'Своя ванная', airconditioning: 'Кондиционер', toilet_paper: 'Туалетная бумага', towels: 'Полотенца',
  toilet: 'Туалет', linen: 'Постельное бельё', wardrobecloset: 'Шкаф', free_toiletries: 'Бесплатная косметика',
  seating_area: 'Зона отдыха', shower: 'Душ', terrace: 'Терраса', desk: 'Рабочий стол', clothes_rack: 'Вешалка',
  hair_dryer: 'Фен', flatscreen_tv: 'Плоский телевизор', electric_kettle: 'Чайник', garden_view: 'Вид на сад',
  refrigerator: 'Холодильник', socket_near_the_bed: 'Розетка у кровати', safe_deposit_box: 'Сейф', tv: 'Телевизор',
  balcony: 'Балкон', private_entrance: 'Отдельный вход', coffeetea_maker: 'Чай/кофе в номере', dining_table: 'Обеденный стол',
  pool_view: 'Вид на бассейн', tiled__marble_floor: 'Плитка / мрамор на полу', dining_area: 'Обеденная зона', sofa: 'Диван',
  clothes_drying_rack: 'Сушилка для белья', outdoor_furniture: 'Уличная мебель', kitchen: 'Кухня', private_pool: 'Свой бассейн',
  kitchenware: 'Посуда', bath: 'Ванна', stove: 'Плита', fan: 'Вентилятор', bidet: 'Биде',
  individual_air_conditioning: 'Свой кондиционер в номере', patio: 'Патио', minibar: 'Мини-бар',
  entire_property_on_ground_floor: 'Всё на первом этаже', wake_up_service: 'Услуга «разбудить»',
  outdoor_dining_area: 'Обеденная зона на улице', clothing_iron: 'Утюг', kitchenette: 'Мини-кухня', microwave: 'Микроволновка',
  slippers: 'Тапочки', cleaning_products: 'Средства для уборки', bath_or_shower: 'Ванна или душ',
  hand_sanitizer_in_room: 'Антисептик в номере', ironing_facilities: 'Гладильная доска', bathrobe: 'Халат',
  upper_floor_reachable_by_stairs_only: 'Верхний этаж только по лестнице', toaster: 'Тостер', additional_toilet: 'Второй туалет',
  mosquito_net: 'Москитная сетка', cable_channels: 'Кабельное ТВ', satellite_channels: 'Спутниковое ТВ', telephone: 'Телефон',
  streaming_service_such_as_netflix: 'Netflix и др.', dressing_room: 'Гардеробная', towelslinens_at_surcharge: 'Бельё за доплату',
  inner_courtyard_view: 'Вид во двор', detached: 'Отдельно стоящий дом', soundproofing: 'Шумоизоляция', sofa_bed: 'Диван-кровать',
  wooden__parquet_floor: 'Деревянный пол', coffee_machine: 'Кофемашина', oven: 'Духовка',
  wake_up_servicealarmclock: 'Будильник / «разбудить»', extra_long_beds__2_meter: 'Длинные кровати (2 м+)',
  mountain_view: 'Вид на горы', children_highchair: 'Детский стульчик', tumble_dryer_machine: 'Сушильная машина',
  sea_view: 'Вид на море', landmark_view: 'Вид на достопримечательность', hot_tub: 'Джакузи', allergyfree: 'Гипоаллергенный',
  entire_unit_wheelchair_accessible: 'Доступно для коляски', view: 'Вид из окна', barbecue: 'Барбекю', carpeted_floor: 'Ковролин',
  interconnecting_rooms_available: 'Смежные номера', carbon_monoxide_detector: 'Датчик угарного газа',
  washing_machine: 'Стиральная машина', dvdplayer: 'DVD', alarm_clock: 'Будильник', private_flat_in_block_of_flats: 'Квартира в доме',
  heating: 'Отопление', laptop_safe_box: 'Сейф для ноутбука', city_view: 'Вид на город', dishwasher: 'Посудомойка',
  semidetached: 'Дом на две семьи', board_gamespuzzles: 'Настольные игры', bookdvdmusic_library_for_children: 'Детские книги и игры',
  river_view: 'Вид на реку', shared_toilet: 'Общий туалет', upper_floor_reachable_by_lift: 'Лифт', air_purifier: 'Очиститель воздуха',
  additional_bathroom: 'Вторая ванная', rollaway_bed: 'Раскладушка', child_safety_socket_covers: 'Заглушки на розетки',
  spa_bath: 'Спа-ванна', internet_facilities: 'Интернет', fireplace: 'Камин', cdplayer: 'CD', baby_safety_gates: 'Детские ворота',
  radio: 'Радио', shared_bathroom: 'Общая ванная', video: 'Видео', ipod_docking_station: 'Док для iPod', trouser_press: 'Пресс для брюк',
  executive_lounge_access: 'Доступ в лаунж', payperview_channels: 'Платные каналы', lake_view: 'Вид на озеро',
  wireless_internet: 'Wi-Fi', sauna: 'Сауна', bluray_player: 'Blu-ray', hearing_accessible: 'Для слабослышащих',
  game_console: 'Игровая приставка', video_games: 'Видеоигры', electric_blankets: 'Электроодеяло', ipad: 'iPad', fax: 'Факс',
  computer: 'Компьютер', laptop: 'Ноутбук', tatami: 'Татами', private_openair_bath: 'Купель под открытым небом',
}

const PH_BOOL: Record<string, string> = {
  bathtub: 'Ванна на фото', outdoor_shower: 'Уличный душ', ac_visible: 'Кондиционер виден на фото', workspace_desk: 'Рабочее место',
  photo_staged: 'Фото с сервировкой (staging)', photo_twilight: 'Вечерние фото', photo_drone: 'Фото с дрона', photo_people: 'Люди на фото',
}
const PH_SCALE: Record<string, string> = {
  finish_tier: 'Уровень отделки', design_coherence: 'Цельный дизайн', natural_light: 'Много света',
  outdoor_living_share: 'Жизнь на улице', photo_professional: 'Профессиональные фото', instagrammability: 'Инстаграмность',
  pool_deck_tier: 'Зона у бассейна', kitchen_tier: 'Кухня', bathroom_tier: 'Ванная',
}
const PH_FIELD: Record<string, string> = {
  style_primary: 'Стиль', condition: 'Состояние', pool_type: 'Бассейн', space_feel: 'Пространство', materials: 'Материал',
  architecture: 'Архитектура', views: 'Вид', guest_segment: 'Для кого', red_flags: 'Минус на фото', rooms_shown: 'На фото',
}
const PH_VALUE: Record<string, string> = {
  modern_tropical: 'современный тропический', balinese_traditional: 'балийский традиционный', minimalist: 'минимализм',
  luxury_contemporary: 'современная роскошь', boho_mediterranean: 'бохо / средиземноморский', scandinavian: 'скандинавский',
  industrial_loft: 'лофт', colonial: 'колониальный', rustic_wood: 'деревенский, дерево', generic_budget: 'безликий бюджетный', none: 'нет',
  new: 'новое', well_kept: 'ухоженное', aging: 'стареет', worn: 'изношено',
  infinity: 'инфинити', private_standard: 'свой обычный', plunge: 'маленький (plunge)', lap: 'длинный (lap)', shared: 'общий',
  cramped: 'тесно', compact: 'компактно', comfortable: 'комфортно', spacious: 'просторно', grand: 'очень просторно',
  thatch_alang: 'соломенная крыша', teak_wood: 'тик', bamboo: 'бамбук', rattan: 'ротанг', exposed_concrete: 'бетон',
  microcement: 'микроцемент', terrazzo: 'терраццо', natural_stone: 'натуральный камень', marble: 'мрамор', white_plaster: 'белая штукатурка',
  glass_walls: 'стеклянные стены', ceramic_tile: 'плитка', painted_drywall: 'крашеный гипсокартон',
  open_air_living: 'гостиная под открытым небом', double_height_ceiling: 'двойная высота', floor_to_ceiling_glass: 'окна в пол',
  rooftop_terrace: 'терраса на крыше', balcony: 'балкон', private_garden: 'свой сад', sala_gazebo: 'беседка (бале)',
  courtyard: 'внутренний двор', multi_level: 'несколько уровней',
  ocean_full: 'океан (полный)', ocean_partial: 'океан (частично)', rice_field: 'рисовые поля', jungle: 'джунгли',
  river_valley: 'долина реки', mountain: 'горы', garden: 'сад', pool: 'бассейн', urban: 'город',
  couples: 'пары', families: 'семьи', digital_nomads: 'удалёнщики', surfers: 'серферы', groups: 'компании', wellness: 'wellness',
  budget_backpackers: 'бюджетные путешественники', luxury_travellers: 'люкс',
  worn_furniture: 'изношенная мебель', stains_or_mold: 'пятна или плесень', cramped_rooms: 'тесные комнаты', clutter: 'беспорядок',
  poor_lighting: 'плохой свет', dated_bathroom: 'старая ванная', no_outdoor_space: 'нет улицы', construction_nearby: 'стройка рядом',
  road_or_noise: 'дорога / шум', low_quality_photos: 'плохие фото',
  bedroom: 'спальня', bathroom: 'ванная', kitchen: 'кухня', living: 'гостиная', dining: 'столовая', workspace: 'рабочее место',
  pool_area: 'бассейн', exterior: 'фасад', lobby: 'лобби', restaurant: 'ресторан', gym: 'спортзал', spa: 'спа',
  coworking: 'коворкинг', rooftop: 'крыша',
}
const PL: Record<string, string> = {
  'pl:beach<=500': 'Пляж до 500 м', 'pl:coast<=1000': 'Океан до 1 км', 'pl:review>=9': 'Оценка гостей 9+',
  'pl:review<8': 'Оценка гостей ниже 8', 'pl:reviews>=100': '100+ отзывов',
}

export function featureLabel(f: string): string {
  if (f.startsWith('pl:')) return PL[f] ?? f
  if (f.startsWith('fac:')) return FAC[f.slice(4)] ?? f.slice(4).replace(/_+/g, ' ')
  const k = f.slice(3)
  let m = k.match(/^(\w+)(>=4|<=2)$/)
  if (m) return `${PH_SCALE[m[1]] ?? m[1]}: ${m[2] === '>=4' ? 'высоко (4–5)' : 'низко (1–2)'}`
  m = k.match(/^(\w+)=(\w+)$/)
  if (m) return `${PH_FIELD[m[1]] ?? m[1]}: ${PH_VALUE[m[2]] ?? m[2].replace(/_/g, ' ')}`
  return PH_BOOL[k] ?? k
}
