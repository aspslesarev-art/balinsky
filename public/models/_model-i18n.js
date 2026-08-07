/**
 * Общий словарь для самодостаточных 3D-планировок в `public/models/`.
 *
 * Страницы моделей живут во фрейме вне бандла Next (см. `components/Villa3DPlan.tsx`),
 * поэтому `lib/i18n.ts` им недоступен — язык приходит query-параметром `?lang=`,
 * который проставляет тот же компонент. Словарь один на все модели: набор
 * комнат и органов управления у них почти совпадает, а дублировать десять
 * локалей в каждом HTML — верный способ развести их со временем.
 *
 * Порядок отката повторяет сайт: lang → en → ru; `ban` — оболочечная локаль,
 * её тянем на `id`, как это уже сделано в `Villa3DPlan.tsx`.
 */
;(function () {
  'use strict'

  var FALLBACK_BAN = 'id'
  var DEFAULT_LANG = 'ru'
  var LANGS = ['ru', 'en', 'id', 'fr', 'de', 'zh', 'nl', 'ban', 'pl', 'uk']

  // Языки, в которых нарицательные существительные пишутся с прописной и
  // потому не могут быть переведены в нижний регистр внутри строки состава.
  var KEEPS_NOUN_CASE = ['de']

  var DICT = {
    // ——— органы управления ———
    floor1: {
      ru: '1 этаж', en: 'Floor 1', id: 'Lantai 1', fr: 'Étage 1', de: 'Etage 1',
      zh: '1 层', nl: 'Verdieping 1', pl: 'Piętro 1', uk: '1 поверх',
    },
    floor2: {
      ru: '2 этаж', en: 'Floor 2', id: 'Lantai 2', fr: 'Étage 2', de: 'Etage 2',
      zh: '2 层', nl: 'Verdieping 2', pl: 'Piętro 2', uk: '2 поверх',
    },
    wholeHouse: {
      ru: 'Весь дом', en: 'Whole house', id: 'Seluruh rumah', fr: 'Toute la maison',
      de: 'Ganzes Haus', zh: '整栋', nl: 'Hele huis', pl: 'Cały dom', uk: 'Весь дім',
    },
    viewIso: {
      ru: 'обзор', en: 'overview', id: 'tinjauan', fr: 'vue générale', de: 'Übersicht',
      zh: '全景', nl: 'overzicht', pl: 'przegląd', uk: 'огляд',
    },
    viewTop: {
      ru: 'сверху', en: 'top', id: 'atas', fr: 'dessus', de: 'oben',
      zh: '俯视', nl: 'boven', pl: 'z góry', uk: 'зверху',
    },
    viewFront: {
      ru: 'фасад', en: 'front', id: 'depan', fr: 'façade', de: 'Vorderseite',
      zh: '正面', nl: 'voorkant', pl: 'front', uk: 'фасад',
    },
    wallsCut: {
      ru: 'срез стен', en: 'wall cutaway', id: 'potong dinding', fr: 'murs coupés',
      de: 'Wände geschnitten', zh: '剖切墙体', nl: 'muren doorsnede',
      pl: 'przekrój ścian', uk: 'зріз стін',
    },
    wallsUp: {
      ru: 'стены вверх', en: 'walls up', id: 'dinding naik', fr: 'murs hauts',
      de: 'Wände hoch', zh: '墙体升起', nl: 'muren omhoog', pl: 'ściany w górę',
      uk: 'стіни вгору',
    },
    wallsDown: {
      ru: 'стены вниз', en: 'walls down', id: 'dinding turun', fr: 'murs bas',
      de: 'Wände runter', zh: '墙体降下', nl: 'muren omlaag', pl: 'ściany w dół',
      uk: 'стіни вниз',
    },
    roomLabels: {
      ru: 'подписи комнат', en: 'room labels', id: 'label ruangan',
      fr: 'noms des pièces', de: 'Raumnamen', zh: '房间标签', nl: 'kamerlabels',
      pl: 'podpisy pomieszczeń', uk: 'підписи кімнат',
    },
    roof: {
      ru: 'крыша', en: 'roof', id: 'atap', fr: 'toit', de: 'Dach',
      zh: '屋顶', nl: 'dak', pl: 'dach', uk: 'дах',
    },
    autoRotate: {
      ru: 'автоповорот', en: 'auto-rotate', id: 'putar otomatis', fr: 'rotation auto',
      de: 'Auto-Drehung', zh: '自动旋转', nl: 'auto-draaien', pl: 'auto-obrót',
      uk: 'автоповорот',
    },
    hint: {
      ru: 'крутить — мышью · зум — колесо · панорама — правая кнопка',
      en: 'drag to rotate · scroll to zoom · right-click to pan',
      id: 'seret untuk memutar · gulir untuk zoom · klik kanan untuk menggeser',
      fr: 'glisser pour tourner · molette pour zoomer · clic droit pour déplacer',
      de: 'ziehen zum Drehen · scrollen zum Zoomen · Rechtsklick zum Verschieben',
      zh: '拖动旋转 · 滚轮缩放 · 右键平移',
      nl: 'slepen om te draaien · scrollen om te zoomen · rechtsklik om te pannen',
      pl: 'przeciągnij, aby obrócić · kółko, aby przybliżyć · prawy przycisk, aby przesunąć',
      uk: 'тягніть, щоб обертати · колесо — масштаб · права кнопка — панорама',
    },
    tapToControl: {
      ru: 'Нажмите, чтобы управлять моделью', en: 'Tap to control the model',
      id: 'Ketuk untuk mengontrol model', fr: 'Touchez pour contrôler le modèle',
      de: 'Tippen, um das Modell zu steuern', zh: '点按以操作模型',
      nl: 'Tik om het model te bedienen', pl: 'Dotknij, aby sterować modelem',
      uk: 'Торкніться, щоб керувати моделлю',
    },
    floorPlan3d: {
      ru: '3D-планировка', en: '3D floor plan', id: 'Denah 3D', fr: 'Plan 3D',
      de: '3D-Grundriss', zh: '3D 户型图', nl: 'Plattegrond in 3D',
      pl: 'Rzut 3D', uk: '3D-планування',
    },

    // ——— комнаты ———
    kitchen: {
      ru: 'Кухня', en: 'Kitchen', id: 'Dapur', fr: 'Cuisine', de: 'Küche',
      zh: '厨房', nl: 'Keuken', pl: 'Kuchnia', uk: 'Кухня',
    },
    living: {
      ru: 'Зал', en: 'Living room', id: 'Ruang tamu', fr: 'Salon', de: 'Wohnzimmer',
      zh: '客厅', nl: 'Woonkamer', pl: 'Salon', uk: 'Зал',
    },
    livingKitchen: {
      ru: 'Гостиная-кухня', en: 'Living–kitchen', id: 'Ruang tamu–dapur',
      fr: 'Séjour-cuisine', de: 'Wohnküche', zh: '客厅厨房', nl: 'Woonkeuken',
      pl: 'Salon z kuchnią', uk: 'Вітальня-кухня',
    },
    bath: {
      ru: 'С/у', en: 'Bath', id: 'K. mandi', fr: 'SDB', de: 'Bad',
      zh: '卫生间', nl: 'Badkamer', pl: 'Łazienka', uk: 'С/в',
    },
    bathroom: {
      ru: 'Ванная', en: 'Bathroom', id: 'Kamar mandi', fr: 'Salle de bains',
      de: 'Badezimmer', zh: '浴室', nl: 'Badkamer', pl: 'Łazienka', uk: 'Ванна',
    },
    stairs: {
      ru: 'Лестница', en: 'Stairs', id: 'Tangga', fr: 'Escalier', de: 'Treppe',
      zh: '楼梯', nl: 'Trap', pl: 'Schody', uk: 'Сходи',
    },
    pool: {
      ru: 'Бассейн', en: 'Pool', id: 'Kolam renang', fr: 'Piscine', de: 'Pool',
      zh: '泳池', nl: 'Zwembad', pl: 'Basen', uk: 'Басейн',
    },
    poolPatio: {
      ru: 'Бассейн и патио', en: 'Pool & patio', id: 'Kolam & patio',
      fr: 'Piscine et patio', de: 'Pool und Patio', zh: '泳池与庭院',
      nl: 'Zwembad en patio', pl: 'Basen i patio', uk: 'Басейн і патіо',
    },
    porch: {
      ru: 'Крыльцо', en: 'Porch', id: 'Teras depan', fr: 'Porche', de: 'Veranda',
      zh: '门廊', nl: 'Veranda', pl: 'Ganek', uk: 'Ґанок',
    },
    bedroom: {
      ru: 'Спальня', en: 'Bedroom', id: 'Kamar tidur', fr: 'Chambre',
      de: 'Schlafzimmer', zh: '卧室', nl: 'Slaapkamer', pl: 'Sypialnia',
      uk: 'Спальня',
    },
    balcony: {
      ru: 'Балкон', en: 'Balcony', id: 'Balkon', fr: 'Balcon', de: 'Balkon',
      zh: '阳台', nl: 'Balkon', pl: 'Balkon', uk: 'Балкон',
    },
    hall: {
      ru: 'Холл', en: 'Hall', id: 'Lorong', fr: 'Hall', de: 'Flur',
      zh: '过厅', nl: 'Hal', pl: 'Hol', uk: 'Хол',
    },
    parking: {
      ru: 'Паркинг', en: 'Parking', id: 'Parkir', fr: 'Parking', de: 'Stellplatz',
      zh: '车位', nl: 'Parkeren', pl: 'Parking', uk: 'Паркінг',
    },

    // ——— группы в строке состава и прочие слова ———
    livingBlock: {
      ru: 'Жилой блок', en: 'Living block', id: 'Blok hunian', fr: 'Bloc de vie',
      de: 'Wohnblock', zh: '起居区', nl: 'Woonblok', pl: 'Blok dzienny',
      uk: 'Житловий блок',
    },
    bedroomBlock: {
      ru: 'Спальный блок', en: 'Bedroom block', id: 'Blok kamar tidur',
      fr: 'Bloc nuit', de: 'Schlafblock', zh: '卧室区', nl: 'Slaapblok',
      pl: 'Blok nocny', uk: 'Спальний блок',
    },
    between: {
      ru: 'Между ними', en: 'Between them', id: 'Di antaranya', fr: 'Entre les deux',
      de: 'Dazwischen', zh: '两者之间', nl: 'Ertussen', pl: 'Pomiędzy',
      uk: 'Між ними',
    },
    plot: {
      ru: 'Участок', en: 'Plot', id: 'Kavling', fr: 'Terrain', de: 'Grundstück',
      zh: '地块', nl: 'Kavel', pl: 'Działka', uk: 'Ділянка',
    },
    villa: {
      ru: 'Вилла', en: 'Villa', id: 'Vila', fr: 'Villa', de: 'Villa',
      zh: '别墅', nl: 'Villa', pl: 'Willa', uk: 'Вілла',
    },
    bedroomsPlural: {
      ru: 'спальни', en: 'bedrooms', id: 'kamar tidur', fr: 'chambres',
      de: 'Schlafzimmer', zh: '卧室', nl: 'slaapkamers', pl: 'sypialnie',
      uk: 'спальні',
    },
  }

  function resolveLang() {
    var raw = null
    try {
      raw = new URLSearchParams(window.location.search).get('lang')
    } catch (_e) {
      raw = null
    }
    return LANGS.indexOf(raw) !== -1 ? raw : DEFAULT_LANG
  }

  var lang = resolveLang()
  // Кириллица берёт «м²», латиница и иероглифика — «m²».
  var unit = lang === 'ru' || lang === 'uk' ? 'м²' : 'm²'
  var keepsNounCase = KEEPS_NOUN_CASE.indexOf(lang) !== -1

  /** Перевод по ключу с откатом lang → (ban→id) → en → ru. */
  function t(key) {
    var entry = DICT[key]
    if (!entry) return key
    if (entry[lang]) return entry[lang]
    if (lang === 'ban' && entry[FALLBACK_BAN]) return entry[FALLBACK_BAN]
    return entry.en || entry.ru || key
  }

  /**
   * Название комнаты внутри предложения (строка состава, подзаголовок).
   * В немецком существительные остаются с прописной, в остальных языках
   * опускаем регистр, чтобы строка читалась как перечисление.
   */
  function roomWord(key) {
    var word = t(key)
    return keepsNounCase ? word : word.charAt(0).toLowerCase() + word.slice(1)
  }

  /** Подпись для спрайта в сцене: «Кухня · 15.9 м²». */
  function room(key, area) {
    return area == null ? t(key) : t(key) + ' · ' + area + ' ' + unit
  }

  /** Проставляет переводы во всё, что помечено `data-i18n="<ключ>"`. */
  function applyStatic(root) {
    var scope = root || document
    var nodes = scope.querySelectorAll('[data-i18n]')
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'))
    }
  }

  /**
   * Строка состава: `[{ group: 'floor1', rooms: [['kitchen', 15.9], ...] }]`.
   * Третий элемент пары — количество: `['bedroom', 10.7, 2]` даёт «2 × спальня 10.7».
   * Площади без единицы — как в исходной вёрстке.
   */
  function renderFacts(el, groups) {
    if (!el) return
    el.textContent = ''
    groups.forEach(function (group, index) {
      if (index > 0) el.appendChild(document.createElement('br'))
      var strong = document.createElement('b')
      strong.textContent = t(group.group)
      el.appendChild(strong)
      var parts = group.rooms.map(function (entry) {
        var name = roomWord(entry[0])
        var area = entry[1]
        var count = entry[2]
        var head = count > 1 ? count + ' × ' + name : name
        return area == null ? head : head + ' ' + area
      })
      el.appendChild(document.createTextNode(' — ' + parts.join(' · ')))
    })
  }

  /** `<title>` вкладки и `lang` документа — их видит и пользователь, и краулер. */
  function setDocumentMeta(name) {
    document.documentElement.lang = lang === 'ban' ? FALLBACK_BAN : lang
    document.title = name + ' — ' + t('floorPlan3d')
  }

  window.Model3D = {
    lang: lang,
    unit: unit,
    t: t,
    room: room,
    roomWord: roomWord,
    applyStatic: applyStatic,
    renderFacts: renderFacts,
    setDocumentMeta: setDocumentMeta,
  }
})()
