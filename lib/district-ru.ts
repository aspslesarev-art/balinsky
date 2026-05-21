// Latin → Cyrillic district names for the RU site. Source of truth
// for Cyrillic forms is lib/districts.ts (the pillar / programmatic
// landing pages already use these), this map just gives us a constant-
// time lookup keyed by what raw_villas / raw_apartments / raw_complexes
// store in their Airtable «Location 2» / «Location filter» column.
//
// Falls back to the original Latin name when an entry isn't on the
// list, so unknown districts stay readable instead of disappearing.

const MAP: Record<string, string> = {
  'Canggu':     'Чангу',
  'Uluwatu':    'Улувату',
  'Ubud':       'Убуд',
  'Sanur':      'Санур',
  'Pererenan':  'Переренан',
  'Nusa Dua':   'Нуса Дуа',
  'Nyanyi':     'Нянь',
  'Melasti':    'Меласти',
  'Kerobokan':  'Керобокан',
  'Cemagi':     'Чемаги',
  'Umalas':     'Умалас',
  'Berawa':     'Берава',
  'Batu Bolong':'Бату-Болонг',
  'Pandawa':    'Пандава',
  'Seseh':      'Сесех',
  'GWK':        'GWK',
  'Nusa Penida':'Нуса Пенида',
  'Kedungu':    'Кедунгу',
  'Ungasan':    'Унгасан',
  'Karanggasem':'Карангасем',
  'Batu Belig': 'Бату-Белиг',
  'Bingin':     'Бингин',
  'Padang Padang': 'Паданг-Паданг',
  'Echo Beach': 'Эхо-Бич',
  'Pecatu':     'Пецату',
  'Tibubeneng': 'Тибубененг',
  'Tabanan':    'Табанан',
  'Tegallalang':'Тегаллаланг',
}

export function districtRu(latin: string | null | undefined): string | null {
  if (!latin) return null
  return MAP[latin] ?? latin
}
