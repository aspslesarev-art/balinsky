// Подписи страниц вилл и апартаментов на всех десяти языках (раньше часть
// была только ru/en, и de/fr/zh/... видели английский). Берутся через pickCopy.
import type { Lang } from './i18n'
import { plural, YEARS } from './l10n-plural'

export const PAY_UPFRONT = { ru: 'нет, 100% сразу', en: 'no, 100% upfront', id: 'tidak, 100% di muka', fr: 'non, 100 % à la signature', de: 'nein, 100 % sofort', zh: '无，一次性付清', nl: 'nee, 100% vooraf', ban: 'nenten, 100% langsung', pl: 'nie, 100% z góry', uk: 'ні, 100% одразу' }
export const PAY_MONTHS: Record<Lang, (m: string) => string> = {
  ru: m => `на ${m} мес.`, en: m => `over ${m} mo.`, id: m => `selama ${m} bln`, fr: m => `sur ${m} mois`, de: m => `über ${m} Mon.`,
  zh: m => `分${m}个月`, nl: m => `over ${m} mnd.`, ban: m => `selami ${m} sasih`, pl: m => `na ${m} mies.`, uk: m => `на ${m} міс.`,
}
export const NEAR = {
  beach: { ru: 'Пляж', en: 'Beach', id: 'Pantai', fr: 'Plage', de: 'Strand', zh: '海滩', nl: 'Strand', ban: 'Pasih', pl: 'Plaża', uk: 'Пляж' },
  shop: { ru: 'Магазин', en: 'Shop', id: 'Toko', fr: 'Magasin', de: 'Geschäft', zh: '商店', nl: 'Winkel', ban: 'Toko', pl: 'Sklep', uk: 'Магазин' },
  school: { ru: 'Школа', en: 'School', id: 'Sekolah', fr: 'École', de: 'Schule', zh: '学校', nl: 'School', ban: 'Sekolah', pl: 'Szkoła', uk: 'Школа' },
  airport: { ru: 'Аэропорт', en: 'Airport', id: 'Bandara', fr: 'Aéroport', de: 'Flughafen', zh: '机场', nl: 'Luchthaven', ban: 'Bandara', pl: 'Lotnisko', uk: 'Аеропорт' },
  bali: { ru: 'Бали', en: 'Bali', id: 'Bali', fr: 'Bali', de: 'Bali', zh: '巴厘岛', nl: 'Bali', ban: 'Bali', pl: 'Bali', uk: 'Балі' },
}
export const BD_SHORT = { ru: 'сп.', en: 'bd', id: 'KT', fr: 'ch.', de: 'SZ', zh: '室', nl: 'slpk.', ban: 'KT', pl: 'syp.', uk: 'сп.' }
export const COMFORT = {
  pool: { ru: 'бассейн', en: 'pool', id: 'kolam renang', fr: 'piscine', de: 'Pool', zh: '泳池', nl: 'zwembad', ban: 'kolam renang', pl: 'basen', uk: 'басейн' },
}
export const COMFORT_OUT: Record<string, Record<Lang, string>> = {
  terrace: { ru: 'терраса', en: 'terrace', id: 'teras', fr: 'terrasse', de: 'Terrasse', zh: '露台', nl: 'terras', ban: 'teras', pl: 'taras', uk: 'тераса' },
  garden: { ru: 'сад', en: 'garden', id: 'taman', fr: 'jardin', de: 'Garten', zh: '花园', nl: 'tuin', ban: 'taman', pl: 'ogród', uk: 'сад' },
  rooftop_terrace: { ru: 'руфтоп', en: 'rooftop', id: 'rooftop', fr: 'toit-terrasse', de: 'Dachterrasse', zh: '屋顶露台', nl: 'dakterras', ban: 'rooftop', pl: 'taras na dachu', uk: 'руфтоп' },
  parking: { ru: 'парковка', en: 'parking', id: 'parkir', fr: 'parking', de: 'Parkplatz', zh: '停车位', nl: 'parkeerplaats', ban: 'parkir', pl: 'parking', uk: 'паркінг' },
  bbq: { ru: 'BBQ-зона', en: 'BBQ area', id: 'area BBQ', fr: 'coin barbecue', de: 'Grillplatz', zh: '烧烤区', nl: 'barbecueplek', ban: 'genah BBQ', pl: 'strefa grillowa', uk: 'BBQ-зона' },
}
export const COMFORT_AMEN: Record<string, Record<Lang, string>> = {
  jacuzzi: { ru: 'джакузи', en: 'jacuzzi', id: 'jacuzzi', fr: 'jacuzzi', de: 'Whirlpool', zh: '按摩浴缸', nl: 'jacuzzi', ban: 'jacuzzi', pl: 'jacuzzi', uk: 'джакузі' },
  gym: { ru: 'спортзал', en: 'gym', id: 'gym', fr: 'salle de sport', de: 'Fitnessraum', zh: '健身房', nl: 'fitnessruimte', ban: 'gym', pl: 'siłownia', uk: 'спортзал' },
  coworking: { ru: 'коворкинг', en: 'coworking', id: 'coworking', fr: 'espace de coworking', de: 'Coworking', zh: '联合办公区', nl: 'coworkingruimte', ban: 'coworking', pl: 'coworking', uk: 'коворкінг' },
}
export const TILE = {
  villaArea: { ru: 'площадь виллы', en: 'villa area', id: 'luas vila', fr: 'surface de la villa', de: 'Villenfläche', zh: '别墅面积', nl: 'villaoppervlak', ban: 'luas vila', pl: 'powierzchnia willi', uk: 'площа вілли' },
  plot: { ru: 'участок', en: 'plot', id: 'tanah', fr: 'terrain', de: 'Grundstück', zh: '土地', nl: 'perceel', ban: 'tanah', pl: 'działka', uk: 'ділянка' },
  completed: { ru: 'готовый объект', en: 'completed', id: 'siap huni', fr: 'achevé', de: 'fertiggestellt', zh: '已竣工', nl: 'opgeleverd', ban: 'sampun puput', pl: 'oddany', uk: 'готовий об’єкт' },
  completion: { ru: 'год сдачи', en: 'completion', id: 'tahun selesai', fr: 'année de livraison', de: 'Fertigstellung', zh: '交付年份', nl: 'oplevering', ban: 'warsa puput', pl: 'rok oddania', uk: 'рік здачі' },
  lease: {
    ru: (until: string | null, ext: boolean) => `аренда земли${until ? `, до ${until}` : ''}${ext ? ' + продление' : ''}`,
    en: (until: string | null, ext: boolean) => `land lease${until ? `, until ${until}` : ''}${ext ? ' + extension' : ''}`,
    id: (until: string | null, ext: boolean) => `sewa tanah${until ? `, hingga ${until}` : ''}${ext ? ' + perpanjangan' : ''}`,
    fr: (until: string | null, ext: boolean) => `bail foncier${until ? `, jusqu’en ${until}` : ''}${ext ? ' + prolongation' : ''}`,
    de: (until: string | null, ext: boolean) => `Landpacht${until ? `, bis ${until}` : ''}${ext ? ' + Verlängerung' : ''}`,
    zh: (until: string | null, ext: boolean) => `土地租期${until ? `，至${until}年` : ''}${ext ? '，可续期' : ''}`,
    nl: (until: string | null, ext: boolean) => `grondpacht${until ? `, tot ${until}` : ''}${ext ? ' + verlenging' : ''}`,
    ban: (until: string | null, ext: boolean) => `sewa tanah${until ? `, kantos ${until}` : ''}${ext ? ' + perpanjangan' : ''}`,
    pl: (until: string | null, ext: boolean) => `dzierżawa gruntu${until ? `, do ${until}` : ''}${ext ? ' + przedłużenie' : ''}`,
    uk: (until: string | null, ext: boolean) => `оренда землі${until ? `, до ${until}` : ''}${ext ? ' + продовження' : ''}`,
  },
}
export const PLACE = {
  walk: {
    ru: (b: string, m: number) => `до пляжа ${b} — пешком ${m} мин`, en: (b: string, m: number) => `${m} min walk to ${b}`,
    id: (b: string, m: number) => `${m} menit jalan kaki ke ${b}`, fr: (b: string, m: number) => `à ${m} min à pied de ${b}`,
    de: (b: string, m: number) => `${m} Min. zu Fuß bis ${b}`, zh: (b: string, m: number) => `步行${m}分钟到${b}`,
    nl: (b: string, m: number) => `${m} min lopen naar ${b}`, ban: (b: string, m: number) => `${m} menit mamargi ka ${b}`,
    pl: (b: string, m: number) => `${m} min pieszo do ${b}`, uk: (b: string, m: number) => `до пляжу ${b} — пішки ${m} хв`,
  },
  drive: {
    ru: (b: string, m: number) => `до пляжа ${b} — ${m} мин на машине`, en: (b: string, m: number) => `${m} min drive to ${b}`,
    id: (b: string, m: number) => `${m} menit berkendara ke ${b}`, fr: (b: string, m: number) => `à ${m} min en voiture de ${b}`,
    de: (b: string, m: number) => `${m} Min. mit dem Auto bis ${b}`, zh: (b: string, m: number) => `驾车${m}分钟到${b}`,
    nl: (b: string, m: number) => `${m} min rijden naar ${b}`, ban: (b: string, m: number) => `${m} menit nganggen mobil ka ${b}`,
    pl: (b: string, m: number) => `${m} min samochodem do ${b}`, uk: (b: string, m: number) => `до пляжу ${b} — ${m} хв автомобілем`,
  },
  lively: { ru: 'оживлённый туристический район', en: 'a lively tourist area', id: 'kawasan wisata yang ramai', fr: 'un quartier touristique animé', de: 'belebte Touristengegend', zh: '热闹的旅游区', nl: 'een levendige toeristische buurt', ban: 'wewidangan wisata sane ramé', pl: 'tętniąca życiem okolica turystyczna', uk: 'жвавий туристичний район' },
  moderate: { ru: 'туристов в меру, спокойно', en: 'moderately touristy, calm', id: 'turis secukupnya, tenang', fr: 'touristes en nombre modéré, calme', de: 'mäßig touristisch, ruhig', zh: '游客适中，安静', nl: 'matig toeristisch, rustig', ban: 'turis nenten akeh, tenang', pl: 'umiarkowanie turystycznie, spokojnie', uk: 'туристів помірно, спокійно' },
  quiet: { ru: 'тихий район, туристов мало', en: 'a quiet area with few tourists', id: 'kawasan tenang, sedikit turis', fr: 'un quartier calme, peu de touristes', de: 'ruhige Gegend, wenige Touristen', zh: '安静的区域，游客少', nl: 'een rustige buurt met weinig toeristen', ban: 'wewidangan sepi, turis akidik', pl: 'spokojna okolica, mało turystów', uk: 'тихий район, туристів мало' },
}
export const RANGE = {
  ru: { cheaper: 'Дешевле', upTo: 'до', typical: 'Обычная цена', pricier: 'Дороже', from: 'от' },
  en: { cheaper: 'Cheaper', upTo: 'up to', typical: 'Typical', pricier: 'Pricier', from: 'from' },
  id: { cheaper: 'Lebih murah', upTo: 'hingga', typical: 'Harga wajar', pricier: 'Lebih mahal', from: 'mulai' },
  fr: { cheaper: 'Moins cher', upTo: 'jusqu’à', typical: 'Prix habituel', pricier: 'Plus cher', from: 'dès' },
  de: { cheaper: 'Günstiger', upTo: 'bis', typical: 'Üblicher Preis', pricier: 'Teurer', from: 'ab' },
  zh: { cheaper: '更便宜', upTo: '低于', typical: '常见价格', pricier: '更贵', from: '高于' },
  nl: { cheaper: 'Goedkoper', upTo: 'tot', typical: 'Gangbare prijs', pricier: 'Duurder', from: 'vanaf' },
  ban: { cheaper: 'Langkung murah', upTo: 'kantos', typical: 'Aji biasa', pricier: 'Langkung mahal', from: 'saking' },
  pl: { cheaper: 'Taniej', upTo: 'do', typical: 'Typowa cena', pricier: 'Drożej', from: 'od' },
  uk: { cheaper: 'Дешевше', upTo: 'до', typical: 'Звичайна ціна', pricier: 'Дорожче', from: 'від' },
}
export const NEIGHBOURS_SALE = { ru: 'Соседи на продаже', en: 'Neighbours for sale', id: 'Properti sekitar yang dijual', fr: 'Voisins en vente', de: 'Nachbarn im Verkauf', zh: '附近在售', nl: 'Buren te koop', ban: 'Tetangga sane kaadol', pl: 'Sąsiedzi na sprzedaż', uk: 'Сусіди на продажу' }
export const KEYLINE = {
  plot: {
    ru: (n: number) => `участок ${n} м²`, en: (n: number) => `plot ${n} m²`, id: (n: number) => `tanah ${n} m²`, fr: (n: number) => `terrain ${n} m²`,
    de: (n: number) => `Grundstück ${n} m²`, zh: (n: number) => `土地${n} m²`, nl: (n: number) => `perceel ${n} m²`, ban: (n: number) => `tanah ${n} m²`,
    pl: (n: number) => `działka ${n} m²`, uk: (n: number) => `ділянка ${n} м²`,
  },
  lease: {
    ru: (n: number) => `аренда земли ${n} ${plural('ru', n, YEARS)}`, en: (n: number) => `${n}-year land lease`,
    id: (n: number) => `sewa tanah ${n} tahun`, fr: (n: number) => `bail foncier de ${n} ${plural('fr', n, YEARS)}`,
    de: (n: number) => `${n} ${plural('de', n, YEARS)} Landpacht`, zh: (n: number) => `土地租期${n}年`,
    nl: (n: number) => `${n} jaar grondpacht`, ban: (n: number) => `sewa tanah ${n} warsa`,
    pl: (n: number) => `dzierżawa gruntu na ${n} ${plural('pl', n, YEARS)}`, uk: (n: number) => `оренда землі ${n} ${plural('uk', n, YEARS)}`,
  },
}
export const PROJECTS_GEN = { ru: 'проектов', en: 'projects', id: 'proyek', fr: 'projets', de: 'Projekten', zh: '个项目', nl: 'projecten', ban: 'proyek', pl: 'projektów', uk: 'проєктів' }
export const UNITS_IN = { ru: 'в', en: 'in', id: 'di', fr: 'dans', de: 'in', zh: '位于', nl: 'in', ban: 'ring', pl: 'w', uk: 'у' }
export const DETAIL_LINES = {
  location: { ru: 'Локация:', en: 'Location:', id: 'Lokasi:', fr: 'Emplacement :', de: 'Lage:', zh: '位置：', nl: 'Locatie:', ban: 'Genah:', pl: 'Lokalizacja:', uk: 'Локація:' },
  amenities: { ru: 'Удобства:', en: 'Amenities:', id: 'Fasilitas:', fr: 'Équipements :', de: 'Ausstattung:', zh: '设施：', nl: 'Voorzieningen:', ban: 'Fasilitas:', pl: 'Udogodnienia:', uk: 'Зручності:' },
  fromPhotos: { ru: '(по фото)', en: '(from photos)', id: '(dari foto)', fr: '(d’après les photos)', de: '(laut Fotos)', zh: '（根据照片）', nl: '(volgens foto’s)', ban: '(saking foto)', pl: '(wg zdjęć)', uk: '(за фото)' },
  setting: { ru: 'Расположение:', en: 'Setting:', id: 'Suasana:', fr: 'Cadre :', de: 'Umgebung:', zh: '环境：', nl: 'Omgeving:', ban: 'Suasana:', pl: 'Otoczenie:', uk: 'Розташування:' },
}
export const APT = {
  area: { ru: 'площадь апартаментов', en: 'apartment area', id: 'luas apartemen', fr: 'surface de l’appartement', de: 'Wohnfläche', zh: '公寓面积', nl: 'oppervlakte appartement', ban: 'luas apartemen', pl: 'powierzchnia apartamentu', uk: 'площа апартаментів' },
  floor: { ru: 'этаж', en: 'floor', id: 'lantai', fr: 'étage', de: 'Etage', zh: '楼层', nl: 'verdieping', ban: 'lantai', pl: 'piętro', uk: 'поверх' },
  groundFloor: { ru: 'цокольный этаж', en: 'ground floor', id: 'lantai dasar', fr: 'rez-de-chaussée', de: 'Erdgeschoss', zh: '底层', nl: 'begane grond', ban: 'lantai dasar', pl: 'parter', uk: 'цокольний поверх' },
  floorN: {
    ru: (f: string) => `этаж ${f}`, en: (f: string) => `floor ${f}`, id: (f: string) => `lantai ${f}`, fr: (f: string) => `étage ${f}`, de: (f: string) => `Etage ${f}`,
    zh: (f: string) => `${f}层`, nl: (f: string) => `verdieping ${f}`, ban: (f: string) => `lantai ${f}`, pl: (f: string) => `piętro ${f}`, uk: (f: string) => `поверх ${f}`,
  },
  aiHeading: { ru: 'Проверьте апартаменты с ИИ', en: 'Check the apartment with AI', id: 'Periksa apartemen dengan AI', fr: 'Vérifiez l’appartement avec l’IA', de: 'Apartment mit KI prüfen', zh: '用AI核查这套公寓', nl: 'Controleer het appartement met AI', ban: 'Pariksa apartemen nganggen AI', pl: 'Sprawdź apartament z AI', uk: 'Перевірте апартаменти з ШІ' },
}
export const MONTHS_SHORT = { ru: 'мес.', en: 'mo.', id: 'bln', fr: 'mois', de: 'Mon.', zh: '个月', nl: 'mnd.', ban: 'sasih', pl: 'mies.', uk: 'міс.' }
export const CX_AI_HEADING = { ru: 'Проверьте комплекс с ИИ', en: 'Check the complex with AI', id: 'Periksa kompleks dengan AI', fr: 'Vérifiez la résidence avec l’IA', de: 'Wohnanlage mit KI prüfen', zh: '用AI核查这个项目', nl: 'Controleer het complex met AI', ban: 'Pariksa kompleks nganggen AI', pl: 'Sprawdź kompleks z AI', uk: 'Перевірте комплекс з ШІ' }
