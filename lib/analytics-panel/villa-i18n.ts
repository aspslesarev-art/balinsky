// Переводы коротких подписей блока «ИИ-аналитик» (lib/analytics-panel/villa.ts)
// на языки сайта кроме ru/en — те лежат в самом villa.ts.
import type { Lang } from '@/lib/i18n'

export type XL = Partial<Record<Lang, string>>

// Признаки с фото (ключи как FL в villa.ts).
export const FLX: Record<string, XL> = {
  pool_infinity: { id: 'Kolam infinity', fr: 'Piscine à débordement', de: 'Infinity-Pool', zh: '无边泳池', nl: 'Infinity-zwembad', ban: 'Kolam renang tanpa wates', pl: 'Basen bez krawędzi', uk: 'Інфініті-басейн' },
  pool_private: { id: 'Kolam renang pribadi', fr: 'Piscine privée', de: 'Eigener Pool', zh: '私人泳池', nl: 'Eigen zwembad', ban: 'Kolam renang pribadi', pl: 'Własny basen', uk: 'Свій басейн' },
  pool_shared: { id: 'Kolam renang bersama', fr: 'Piscine commune', de: 'Gemeinschaftspool', zh: '共享泳池', nl: 'Gedeeld zwembad', ban: 'Kolam renang sareng-sareng', pl: 'Wspólny basen', uk: 'Спільний басейн' },
  pool_none: { id: 'Tanpa kolam renang', fr: 'Sans piscine', de: 'Kein Pool', zh: '无泳池', nl: 'Geen zwembad', ban: 'Tanpa kolam renang', pl: 'Bez basenu', uk: 'Без басейну' },
  view_ocean_full: { id: 'Pemandangan laut', fr: 'Vue sur l’océan', de: 'Meerblick', zh: '海景', nl: 'Uitzicht op de oceaan', ban: 'Pemandangan segara', pl: 'Widok na ocean', uk: 'Вид на океан' },
  view_ocean_partial: { id: 'Laut terlihat sebagian', fr: 'Vue partielle sur l’océan', de: 'Teilweiser Meerblick', zh: '部分海景', nl: 'Oceaan deels zichtbaar', ban: 'Segara katon akidik', pl: 'Częściowy widok na ocean', uk: 'Океан видно частково' },
  view_nature: { id: 'Pemandangan sawah, hutan, atau gunung', fr: 'Vue sur rizières, jungle ou montagnes', de: 'Blick auf Reisfelder, Dschungel oder Berge', zh: '稻田、丛林或山景', nl: 'Uitzicht op rijstvelden, jungle of bergen', ban: 'Pemandangan carik, alas utawi gunung', pl: 'Widok na pola ryżowe, dżunglę lub góry', uk: 'Вид на рисові поля, джунглі або гори' },
  open_air_living: { id: 'Ruang tamu terbuka', fr: 'Salon ouvert sur l’extérieur', de: 'Offenes Wohnzimmer', zh: '开放式客厅', nl: 'Open woonkamer', ban: 'Ruang linggih terbuka', pl: 'Otwarty salon', uk: 'Відкрита вітальня' },
  double_height: { id: 'Langit-langit tinggi dua lantai', fr: 'Plafond double hauteur', de: 'Doppelte Deckenhöhe', zh: '双层挑高天花板', nl: 'Plafond over twee verdiepingen', ban: 'Plafon tegeh kalih lantai', pl: 'Sufit na wysokość dwóch kondygnacji', uk: 'Висока стеля на два поверхи' },
  glass_wall: { id: 'Jendela kaca dari lantai ke langit-langit', fr: 'Baies vitrées du sol au plafond', de: 'Bodentiefe Fenster', zh: '落地窗', nl: 'Ramen van vloer tot plafond', ban: 'Jendela kaca saking lantai kantos plafon', pl: 'Panoramiczne okna do podłogi', uk: 'Панорамні вікна в підлогу' },
  rooftop_terrace: { id: 'Teras di atap', fr: 'Toit-terrasse', de: 'Dachterrasse', zh: '屋顶露台', nl: 'Dakterras', ban: 'Teras ring duur raab', pl: 'Taras na dachu', uk: 'Тераса на даху' },
  private_garden: { id: 'Taman pribadi', fr: 'Jardin privé', de: 'Eigener Garten', zh: '私家花园', nl: 'Eigen tuin', ban: 'Taman pribadi', pl: 'Własny ogród', uk: 'Свій сад' },
  sala_gazebo: { id: 'Gazebo bale', fr: 'Gazebo sala', de: 'Sala-Pavillon', zh: '萨拉凉亭', nl: 'Sala-paviljoen', ban: 'Bale bengong', pl: 'Altana sala', uk: 'Альтанка-сала' },
  thatch_alang: { id: 'Atap alang-alang', fr: 'Toit de chaume alang-alang', de: 'Alang-Alang-Strohdach', zh: '阿朗草屋顶', nl: 'Dak van alang-alanggras', ban: 'Raab alang-alang', pl: 'Dach z trawy alang-alang', uk: 'Дах із трави аланг-аланг' },
  bathtub: { id: 'Bak mandi', fr: 'Baignoire', de: 'Badewanne', zh: '浴缸', nl: 'Ligbad', ban: 'Bak rendam', pl: 'Wanna', uk: 'Ванна' },
  outdoor_shower: { id: 'Pancuran terbuka', fr: 'Douche extérieure', de: 'Außendusche', zh: '户外淋浴', nl: 'Buitendouche', ban: 'Pancuran ring jaba', pl: 'Prysznic pod gołym niebem', uk: 'Душ просто неба' },
  spacious: { id: 'Kamar luas', fr: 'Pièces spacieuses', de: 'Geräumige Zimmer', zh: '房间宽敞', nl: 'Ruime kamers', ban: 'Kamar linggah', pl: 'Przestronne pokoje', uk: 'Просторі кімнати' },
  cramped: { id: 'Kamar agak sempit', fr: 'Pièces un peu étroites', de: 'Eher enge Zimmer', zh: '房间偏小', nl: 'Krappe kamers', ban: 'Kamar ciut', pl: 'Ciasnawe pokoje', uk: 'Тіснуваті кімнати' },
  outdoor_living_hi: { id: 'Banyak ruang hidup di luar', fr: 'Beaucoup de vie en extérieur', de: 'Viel Leben im Freien', zh: '户外生活空间多', nl: 'Veel buitenleven', ban: 'Akeh genah ring jaba', pl: 'Dużo życia na świeżym powietrzu', uk: 'Багато життя надворі' },
  multi_level: { id: 'Beberapa tingkat', fr: 'Plusieurs niveaux', de: 'Mehrere Ebenen', zh: '多层结构', nl: 'Meerdere niveaus', ban: 'Makudang-kudang tingkat', pl: 'Kilka poziomów', uk: 'Кілька рівнів' },
  balcony: { id: 'Balkon', fr: 'Balcon', de: 'Balkon', zh: '阳台', nl: 'Balkon', ban: 'Balkon', pl: 'Balkon', uk: 'Балкон' },
}

// Типы мест в 1 км (ключи как BUCKET).
export const BUCKETX: Record<string, XL> = {
  restaurant: { id: 'Restoran', fr: 'Restaurants', de: 'Restaurants', zh: '餐厅', nl: 'Restaurants', ban: 'Restoran', pl: 'Restauracje', uk: 'Ресторани' },
  cafe: { id: 'Kafe', fr: 'Cafés', de: 'Cafés', zh: '咖啡馆', nl: 'Cafés', ban: 'Kafe', pl: 'Kawiarnie', uk: 'Кафе' },
  bar: { id: 'Bar', fr: 'Bars', de: 'Bars', zh: '酒吧', nl: 'Bars', ban: 'Bar', pl: 'Bary', uk: 'Бари' },
  hotel: { id: 'Hotel', fr: 'Hôtels', de: 'Hotels', zh: '酒店', nl: 'Hotels', ban: 'Hotel', pl: 'Hotele', uk: 'Готелі' },
  shopping: { id: 'Toko', fr: 'Commerces', de: 'Geschäfte', zh: '商店', nl: 'Winkels', ban: 'Toko', pl: 'Sklepy', uk: 'Магазини' },
  spa: { id: 'Spa', fr: 'Spas', de: 'Spas', zh: '水疗', nl: 'Spa\'s', ban: 'Spa', pl: 'Spa', uk: 'Спа' },
  fitness: { id: 'Kebugaran', fr: 'Fitness', de: 'Fitness', zh: '健身', nl: 'Fitness', ban: 'Fitnes', pl: 'Siłownie', uk: 'Фітнес' },
  beach: { id: 'Pantai', fr: 'Plages', de: 'Strände', zh: '海滩', nl: 'Stranden', ban: 'Pasih', pl: 'Plaże', uk: 'Пляжі' },
  beach_club: { id: 'Klub pantai', fr: 'Clubs de plage', de: 'Strandclubs', zh: '海滩俱乐部', nl: 'Strandclubs', ban: 'Klub pasih', pl: 'Kluby plażowe', uk: 'Пляжні клуби' },
  attraction: { id: 'Objek wisata', fr: 'Sites à visiter', de: 'Sehenswürdigkeiten', zh: '景点', nl: 'Bezienswaardigheden', ban: 'Genah wisata', pl: 'Atrakcje', uk: 'Пам’ятки' },
  kids_fun: { id: 'Untuk anak', fr: 'Enfants', de: 'Für Kinder', zh: '亲子', nl: 'Voor kinderen', ban: 'Anggen alit-alit', pl: 'Dla dzieci', uk: 'Для дітей' },
  health: { id: 'Klinik', fr: 'Cliniques', de: 'Kliniken', zh: '诊所', nl: 'Klinieken', ban: 'Klinik', pl: 'Przychodnie', uk: 'Клініки' },
  school: { id: 'Sekolah', fr: 'Écoles', de: 'Schulen', zh: '学校', nl: 'Scholen', ban: 'Sekolah', pl: 'Szkoły', uk: 'Школи' },
  temple: { id: 'Pura', fr: 'Temples', de: 'Tempel', zh: '寺庙', nl: 'Tempels', ban: 'Pura', pl: 'Świątynie', uk: 'Храми' },
  coworking: { id: 'Ruang kerja bersama', fr: 'Espaces de coworking', de: 'Coworking-Spaces', zh: '联合办公', nl: 'Flexwerkplekken', ban: 'Genah makarya sareng', pl: 'Coworkingi', uk: 'Коворкінги' },
}

// Природные риски InaRISK.
export const HZX: Record<string, XL> = {
  flood: { id: 'banjir', fr: 'inondation', de: 'Hochwasser', zh: '洪水', nl: 'overstroming', ban: 'blabar', pl: 'powódź', uk: 'повінь' },
  tsunami: { id: 'tsunami', fr: 'tsunami', de: 'Tsunami', zh: '海啸', nl: 'tsunami', ban: 'tsunami', pl: 'tsunami', uk: 'цунамі' },
  landslide: { id: 'tanah longsor', fr: 'glissement de terrain', de: 'Erdrutsch', zh: '滑坡', nl: 'aardverschuiving', ban: 'longsor', pl: 'osuwisko', uk: 'зсув' },
  volcano: { id: 'gunung berapi', fr: 'volcan', de: 'Vulkan', zh: '火山', nl: 'vulkaan', ban: 'gunung api', pl: 'wulkan', uk: 'вулкан' },
  flash_flood: { id: 'banjir bandang', fr: 'crue soudaine', de: 'Sturzflut', zh: '山洪', nl: 'modderstroom', ban: 'blabar bandang', pl: 'lawina błotna', uk: 'сель' },
  earthquake: { id: 'gempa bumi', fr: 'séisme', de: 'Erdbeben', zh: '地震', nl: 'aardbeving', ban: 'linuh', pl: 'trzęsienie ziemi', uk: 'землетрус' },
}

// Удобства «ещё есть для гостей» (lib/booking-amenities BOOKING_EXTRA).
export const EXTRAX: Record<string, XL> = {
  coffee_machine: { id: 'Mesin kopi', fr: 'Machine à café', de: 'Kaffeemaschine', zh: '咖啡机', nl: 'Koffiemachine', ban: 'Mesin kopi', pl: 'Ekspres do kawy', uk: 'Кавомашина' },
  wifi: { id: 'Wi-Fi', fr: 'Wi-Fi', de: 'WLAN', zh: 'Wi-Fi', nl: 'Wi-Fi', ban: 'Wi-Fi', pl: 'Wi-Fi', uk: 'Wi-Fi' },
  workspace: { id: 'Meja kerja', fr: 'Espace de travail', de: 'Arbeitsplatz', zh: '办公区', nl: 'Werkplek', ban: 'Genah makarya', pl: 'Miejsce do pracy', uk: 'Робоче місце' },
  kitchen: { id: 'Dapur sendiri', fr: 'Cuisine privée', de: 'Eigene Küche', zh: '独立厨房', nl: 'Eigen keuken', ban: 'Paon pribadi', pl: 'Własna kuchnia', uk: 'Своя кухня' },
  washing_machine: { id: 'Mesin cuci', fr: 'Lave-linge', de: 'Waschmaschine', zh: '洗衣机', nl: 'Wasmachine', ban: 'Mesin cuci', pl: 'Pralka', uk: 'Пральна машина' },
  parking: { id: 'Parkir', fr: 'Parking', de: 'Parkplatz', zh: '停车位', nl: 'Parkeerplaats', ban: 'Parkir', pl: 'Parking', uk: 'Паркування' },
}

// Категории мест Google Maps (NearbyCategory.key).
export const CATX: Record<string, XL> = {
  beach: { id: 'Pantai', fr: 'Plages', de: 'Strände', zh: '海滩', nl: 'Stranden', ban: 'Pasih', pl: 'Plaże', uk: 'Пляжі' },
  restaurant: { id: 'Restoran', fr: 'Restaurants', de: 'Restaurants', zh: '餐厅', nl: 'Restaurants', ban: 'Restoran', pl: 'Restauracje', uk: 'Ресторани' },
  cafe: { id: 'Kafe', fr: 'Cafés', de: 'Cafés', zh: '咖啡馆', nl: 'Cafés', ban: 'Kafe', pl: 'Kawiarnie', uk: 'Кафе' },
  nightlife: { id: 'Bar & klub', fr: 'Bars et clubs', de: 'Bars & Clubs', zh: '酒吧与夜店', nl: 'Bars en clubs', ban: 'Bar lan klub', pl: 'Bary i kluby', uk: 'Бари й клуби' },
  attraction: { id: 'Objek wisata', fr: 'Sites à visiter', de: 'Sehenswürdigkeiten', zh: '景点', nl: 'Bezienswaardigheden', ban: 'Genah wisata', pl: 'Atrakcje', uk: 'Пам’ятки' },
  school: { id: 'Sekolah', fr: 'Écoles', de: 'Schulen', zh: '学校', nl: 'Scholen', ban: 'Sekolah', pl: 'Szkoły', uk: 'Школи' },
  preschool: { id: 'Taman kanak-kanak', fr: 'Maternelles', de: 'Kindergärten', zh: '幼儿园', nl: 'Kleuterscholen', ban: 'Taman kanak-kanak', pl: 'Przedszkola', uk: 'Дитсадки' },
  supermarket: { id: 'Toko', fr: 'Commerces', de: 'Geschäfte', zh: '商店', nl: 'Winkels', ban: 'Toko', pl: 'Sklepy', uk: 'Магазини' },
  pharmacy: { id: 'Apotek', fr: 'Pharmacies', de: 'Apotheken', zh: '药店', nl: 'Apotheken', ban: 'Apotek', pl: 'Apteki', uk: 'Аптеки' },
  hospital: { id: 'Klinik', fr: 'Cliniques', de: 'Kliniken', zh: '诊所', nl: 'Klinieken', ban: 'Klinik', pl: 'Przychodnie', uk: 'Клініки' },
  shopping_mall: { id: 'Mal', fr: 'Centres commerciaux', de: 'Einkaufszentren', zh: '购物中心', nl: 'Winkelcentra', ban: 'Mal', pl: 'Centra handlowe', uk: 'ТЦ' },
  ferry_terminal: { id: 'Pelabuhan', fr: 'Ports', de: 'Häfen', zh: '港口', nl: 'Havens', ban: 'Pelabuhan', pl: 'Porty', uk: 'Порти' },
  wellness: { id: 'Yoga & kebugaran', fr: 'Yoga et fitness', de: 'Yoga & Fitness', zh: '瑜伽与健身', nl: 'Yoga en fitness', ban: 'Yoga lan fitnes', pl: 'Joga i siłownie', uk: 'Йога й фітнес' },
  beachclub: { id: 'Klub pantai', fr: 'Clubs de plage', de: 'Strandclubs', zh: '海滩俱乐部', nl: 'Strandclubs', ban: 'Klub pasih', pl: 'Kluby plażowe', uk: 'Пляжні клуби' },
  international_school: { id: 'Sekolah internasional', fr: 'Écoles internationales', de: 'Internationale Schulen', zh: '国际学校', nl: 'Int. scholen', ban: 'Sekolah internasional', pl: 'Szkoły międzynarodowe', uk: 'Міжнар. школи' },
  coworking: { id: 'Ruang kerja bersama', fr: 'Espaces de coworking', de: 'Coworking-Spaces', zh: '联合办公', nl: 'Flexwerkplekken', ban: 'Genah makarya sareng', pl: 'Coworkingi', uk: 'Коворкінги' },
}

// Группы зон госплана: ключ — английская подпись из lib/rdtr-zones.
export const ZONEX: Record<string, XL> = {
  Housing: { id: 'Perumahan', fr: 'Logement', de: 'Wohnen', zh: '住宅', nl: 'Wonen', ban: 'Perumahan', pl: 'Mieszkalnictwo', uk: 'Житло' },
  'Shops & services': { id: 'Perdagangan dan jasa', fr: 'Commerces et services', de: 'Handel & Dienstleistungen', zh: '商业与服务', nl: 'Winkels en diensten', ban: 'Dagang lan jasa', pl: 'Handel i usługi', uk: 'Торгівля й послуги' },
  Tourism: { id: 'Pariwisata', fr: 'Tourisme', de: 'Tourismus', zh: '旅游', nl: 'Toerisme', ban: 'Pariwisata', pl: 'Turystyka', uk: 'Туризм' },
  Offices: { id: 'Perkantoran', fr: 'Bureaux', de: 'Büros', zh: '办公', nl: 'Kantoren', ban: 'Kantor', pl: 'Biura', uk: 'Офіси' },
  'Rice fields': { id: 'Sawah', fr: 'Rizières', de: 'Reisfelder', zh: '稻田', nl: 'Rijstvelden', ban: 'Carik', pl: 'Pola ryżowe', uk: 'Рисові поля' },
  Plantations: { id: 'Perkebunan', fr: 'Plantations', de: 'Plantagen', zh: '种植园', nl: 'Plantages', ban: 'Perkebunan', pl: 'Plantacje', uk: 'Плантації' },
  'Rivers & buffer zones': { id: 'Sungai dan sempadan', fr: 'Rivières et zones tampons', de: 'Flüsse & Schutzstreifen', zh: '河流与保护带', nl: 'Rivieren en bufferzones', ban: 'Tukad lan zona penyangga', pl: 'Rzeki i pasy ochronne', uk: 'Річки й охоронні смуги' },
  'Parks & cemeteries': { id: 'Taman dan pemakaman', fr: 'Parcs et cimetières', de: 'Parks & Friedhöfe', zh: '公园与墓地', nl: 'Parken en begraafplaatsen', ban: 'Taman lan setra', pl: 'Parki i cmentarze', uk: 'Парки й кладовища' },
  Forest: { id: 'Hutan', fr: 'Forêt', de: 'Wald', zh: '森林', nl: 'Bos', ban: 'Alas', pl: 'Las', uk: 'Ліс' },
  Roads: { id: 'Jalan', fr: 'Routes', de: 'Straßen', zh: '道路', nl: 'Wegen', ban: 'Jalan', pl: 'Drogi', uk: 'Дороги' },
  'Schools, temples, clinics': { id: 'Sekolah, pura, klinik', fr: 'Écoles, temples, cliniques', de: 'Schulen, Tempel, Kliniken', zh: '学校、寺庙、医院', nl: 'Scholen, tempels, klinieken', ban: 'Sekolah, pura, rumah sakit', pl: 'Szkoły, świątynie, przychodnie', uk: 'Школи, храми, лікарні' },
}

// Районы и аэропорт для маршрутов (BALI_HUBS.key).
export const HUBX: Record<string, XL> = {
  airport: { id: 'Bandara', fr: 'Aéroport', de: 'Flughafen', zh: '机场', nl: 'Luchthaven', ban: 'Bandara', pl: 'Lotnisko', uk: 'Аеропорт' },
  canggu: { id: 'Canggu', fr: 'Canggu', de: 'Canggu', zh: '长谷', nl: 'Canggu', ban: 'Canggu', pl: 'Canggu', uk: 'Чангу' },
  seminyak: { id: 'Seminyak', fr: 'Seminyak', de: 'Seminyak', zh: '水明漾', nl: 'Seminyak', ban: 'Seminyak', pl: 'Seminyak', uk: 'Семіньяк' },
  kuta: { id: 'Kuta', fr: 'Kuta', de: 'Kuta', zh: '库塔', nl: 'Kuta', ban: 'Kuta', pl: 'Kuta', uk: 'Кута' },
  ubud: { id: 'Ubud', fr: 'Ubud', de: 'Ubud', zh: '乌布', nl: 'Ubud', ban: 'Ubud', pl: 'Ubud', uk: 'Убуд' },
  ubud_south: { id: 'Ubud Selatan', fr: 'Ubud Sud', de: 'Süd-Ubud', zh: '南乌布', nl: 'Zuid-Ubud', ban: 'Ubud Kelod', pl: 'Południowy Ubud', uk: 'Південний Убуд' },
  sanur: { id: 'Sanur', fr: 'Sanur', de: 'Sanur', zh: '萨努尔', nl: 'Sanur', ban: 'Sanur', pl: 'Sanur', uk: 'Санур' },
  jimbaran: { id: 'Jimbaran', fr: 'Jimbaran', de: 'Jimbaran', zh: '金巴兰', nl: 'Jimbaran', ban: 'Jimbaran', pl: 'Jimbaran', uk: 'Джимбаран' },
  nusa_dua: { id: 'Nusa Dua', fr: 'Nusa Dua', de: 'Nusa Dua', zh: '努沙杜瓦', nl: 'Nusa Dua', ban: 'Nusa Dua', pl: 'Nusa Dua', uk: 'Нуса-Дуа' },
  uluwatu: { id: 'Uluwatu', fr: 'Uluwatu', de: 'Uluwatu', zh: '乌鲁瓦图', nl: 'Uluwatu', ban: 'Uluwatu', pl: 'Uluwatu', uk: 'Улувату' },
}

type Arr = { mon: string[]; mfull: string[]; mshort: string[]; dirs: string[] }
// Месяцы (буква, в строке списка, коротко) и 8 направлений ветра.
export const ARRX: Record<string, Arr> = {
  ru: { mon: ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д'], mfull: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'], mshort: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'], dirs: ['север', 'северо-восток', 'восток', 'юго-восток', 'юг', 'юго-запад', 'запад', 'северо-запад'] },
  en: { mon: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], mfull: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], mshort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], dirs: ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'] },
  id: { mon: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], mfull: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'], mshort: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], dirs: ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'] },
  fr: { mon: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], mfull: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'], mshort: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'], dirs: ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest'] },
  de: { mon: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], mfull: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'], mshort: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'], dirs: ['Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest', 'West', 'Nordwest'] },
  zh: { mon: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], mfull: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], mshort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], dirs: ['北', '东北', '东', '东南', '南', '西南', '西', '西北'] },
  nl: { mon: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], mfull: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'], mshort: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'], dirs: ['noorden', 'noordoosten', 'oosten', 'zuidoosten', 'zuiden', 'zuidwesten', 'westen', 'noordwesten'] },
  ban: { mon: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], mfull: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'], mshort: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], dirs: ['kaler', 'kaler-kangin', 'kangin', 'kelod-kangin', 'kelod', 'kelod-kauh', 'kauh', 'kaler-kauh'] },
  pl: { mon: ['S', 'L', 'M', 'K', 'M', 'C', 'L', 'S', 'W', 'P', 'L', 'G'], mfull: ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'], mshort: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'], dirs: ['północ', 'północny wschód', 'wschód', 'południowy wschód', 'południe', 'południowy zachód', 'zachód', 'północny zachód'] },
  uk: { mon: ['С', 'Л', 'Б', 'К', 'Т', 'Ч', 'Л', 'С', 'В', 'Ж', 'Л', 'Г'], mfull: ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'], mshort: ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'], dirs: ['північ', 'північний схід', 'схід', 'південний схід', 'південь', 'південний захід', 'захід', 'північний захід'] },
}
