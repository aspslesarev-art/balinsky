// «Продаются в этом районе»: похожие виллы на продаже по соседству (rumah123.com).
// Данные — lib/sale-comps.ts.
//
// Для лизхолда сравниваем цену за м² на год владения: вилла на 25 лет и
// вилла на 50 при одной цене за м² — разные покупки.

import Image from 'next/image'
import { PriceScale } from './PriceScale'
import { pickCopy, type Lang } from '@/lib/i18n'
import { type SaleCompsBundle, type SaleComp, CATALOG_FAR_KM } from '@/lib/sale-comps'
import { InlinePrice } from './InlinePrice'
import { CardRail } from './CardRail'
import { BandedRail } from './BandedRail'
import { pluralPl } from '@/lib/l10n-plural'
import { BAND_SURFACE, BAND_TEXT, type Band } from '@/lib/band-colors'

const COPY = {
  ru: {
    title: 'Продаются в этом районе',
    line: (beds: string, r: number) => `${beds[0].toUpperCase() + beds.slice(1)} в радиусе ${String(r).replace('.', ',')} км`,
    avg: 'в среднем', range: 'обычно от', to: 'до',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${n} ${plural(n, ['похожая вилла', 'похожие виллы', 'похожих вилл'])}${lease ? ' на лизхолде' : ''} в радиусе ${r} км, ${beds}. Цены из объявлений rumah123.com.`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1} ${plural(b + 1, ['спальня', 'спальни', 'спален'])}` : `${b} ${plural(b, ['спальня', 'спальни', 'спален'])}`,
    self: 'Эта вилла',
    market: 'Середина рынка рядом',
    diff: 'Разница',
    perYear: 'за м² в год',
    perM2: 'за м²',
    pricier: (p: number) => `дороже на ${p}%`,
    cheaper: (p: number) => `дешевле на ${p}%`,
    same: 'на уровне рынка',
    howYear: 'Цена за м² в год = цена ÷ площадь ÷ срок лизхолда. Так честно сравниваются виллы на 25 и на 30 лет.',
    howM2: 'Цена за м² = цена ÷ площадь дома.',
    caveat: 'В объявлениях запрашиваемые цены, и там есть как новые, так и пожившие виллы.',
    few: 'Объявлений меньше 30 — это ориентир, а не рыночная цифра.',
    noVerdict: 'Похожих объявлений с площадью и сроком мало, поэтому цену не сравниваем.',
    bedShort: 'сп.', studio: 'студия',
    m2: 'м²',
    lease: (y: number) => `лизхолд ${y} ${plural(y, ['год', 'года', 'лет'])}`,
    freehold: 'фрихолд',
    km: 'км',
    open: 'Объявление',
    prev: 'Назад', next: 'Дальше',
    asOf: (d: string) => `Данные на ${d}`,
    verdict: (diff: number, year: boolean) => `${Math.abs(diff) <= 5 ? 'Эта вилла на уровне рынка' : `Эта вилла ${diff > 0 ? 'дороже' : 'дешевле'} рынка на ${Math.abs(diff)}%`} - если сравнивать цену ${year ? 'за м² на год владения' : 'за м²'}`,
    midMark: 'середина рынка',
    selfMark: 'эта вилла',
    note: (n: number, r: number, year: boolean, cat: number) => `${year ? 'За м² в год = цена ÷ площадь дома ÷ срок лизхолда. Так честно сравниваются виллы с разным сроком. ' : 'За м² = цена ÷ площадь дома. '}${n} ${plural(n, ['похожая вилла', 'похожие виллы', 'похожих вилл'])} в ${String(r).replace('.', ',')} км: ${cat ? `${cat} из каталога Balinsky, остальные - ` : ''}объявления rumah123.com.`,
    catalog: 'В каталоге Balinsky',
    far: (n: number, km: number) => `Ещё ${n} ${plural(n, ['вилла', 'виллы', 'вилл'])} из каталога Balinsky - чуть дальше, до ${km} км, в среднюю цену не ${n === 1 ? 'входит' : 'входят'}.`,
    heading: 'Что продаётся рядом',
    zone: { good: 'Дешевле рынка', mid: 'Середина рынка', bad: 'Дороже рынка' } as Record<Band, string>,
    tag: { good: 'Дешевле', mid: 'Середина', bad: 'Дороже' } as Record<Band, string>,
    upTo: 'до', from: 'от',
    count: (n: number, here: boolean) => `${n} ${plural(n, ['вилла', 'виллы', 'вилл'])}${here ? ' · здесь эта вилла' : ''}`,
  },
  en: {
    title: 'For sale in this area',
    line: (beds: string, r: number) => `${beds[0].toUpperCase() + beds.slice(1)} within ${r} km`,
    avg: 'typically', range: 'usually from', to: 'to',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${n} similar ${n === 1 ? 'villa' : 'villas'}${lease ? ' on leasehold' : ''} within ${r} km, ${beds}. Prices from rumah123.com listings.`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1} bedrooms` : `${b} ${b === 1 ? 'bedroom' : 'bedrooms'}`,
    self: 'This villa',
    market: 'Market midpoint nearby',
    diff: 'Difference',
    perYear: 'per m² per year',
    perM2: 'per m²',
    pricier: (p: number) => `${p}% higher`,
    cheaper: (p: number) => `${p}% lower`,
    same: 'in line with the market',
    howYear: 'Price per m² per year = price ÷ floor area ÷ lease term. This makes 25- and 30-year leases comparable.',
    howM2: 'Price per m² = price ÷ floor area.',
    caveat: 'Listings show asking prices and include both new and lived-in villas.',
    few: 'Fewer than 30 listings — treat this as a guide, not a market figure.',
    noVerdict: 'Too few similar listings with area and lease term to compare the price.',
    bedShort: 'bd', studio: 'studio',
    m2: 'm²',
    lease: (y: number) => `leasehold ${y} yrs`,
    freehold: 'freehold',
    km: 'km',
    open: 'Listing',
    prev: 'Previous', next: 'Next',
    asOf: (d: string) => `Data as of ${d}`,
    verdict: (diff: number, year: boolean) => `${Math.abs(diff) <= 5 ? 'This villa is in line with the market' : `This villa is ${Math.abs(diff)}% ${diff > 0 ? 'above' : 'below'} the market`} - comparing price per m² ${year ? 'per year of ownership' : ''}`.trim(),
    midMark: 'market midpoint',
    selfMark: 'this villa',
    note: (n: number, r: number, year: boolean, cat: number) => `${year ? 'Per m² per year = price ÷ floor area ÷ lease term, so different lease terms compare fairly. ' : 'Per m² = price ÷ floor area. '}${n} similar ${n === 1 ? 'villa' : 'villas'} within ${r} km: ${cat ? `${cat} from the Balinsky catalog, the rest ` : ''}rumah123.com listings.`,
    catalog: 'In the Balinsky catalog',
    far: (n: number, km: number) => `${n} more from the Balinsky catalog, a bit further out (up to ${km} km), not included in the average.`,
    heading: 'For sale nearby',
    zone: { good: 'Below market', mid: 'Market midpoint', bad: 'Above market' } as Record<Band, string>,
    tag: { good: 'Cheaper', mid: 'Midpoint', bad: 'Pricier' } as Record<Band, string>,
    upTo: 'up to', from: 'from',
    count: (n: number, here: boolean) => `${n} ${n === 1 ? 'villa' : 'villas'}${here ? ' · this villa is here' : ''}`,
  },  id: {
    title: 'Dijual di area ini',
    line: (beds: string, r: number) => `${beds[0].toUpperCase() + beds.slice(1)} dalam radius ${String(r).replace('.', ',')} km`,
    avg: 'rata-rata', range: 'biasanya dari', to: 'hingga',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${n} vila serupa${lease ? ' leasehold' : ''} dalam radius ${r} km, ${beds}. Harga dari iklan rumah123.com.`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1} kamar tidur` : `${b} kamar tidur`,
    self: 'Vila ini',
    market: 'Harga tengah pasar sekitar',
    diff: 'Selisih',
    perYear: 'per m² per tahun',
    perM2: 'per m²',
    pricier: (p: number) => `${p}% lebih mahal`,
    cheaper: (p: number) => `${p}% lebih murah`,
    same: 'setara pasar',
    howYear: 'Harga per m² per tahun = harga ÷ luas ÷ masa leasehold. Dengan begitu vila 25 dan 30 tahun bisa dibandingkan secara adil.',
    howM2: 'Harga per m² = harga ÷ luas bangunan.',
    caveat: 'Iklan menampilkan harga yang diminta, termasuk vila baru maupun yang sudah dihuni.',
    few: 'Iklan kurang dari 30 — ini acuan, bukan angka pasar.',
    noVerdict: 'Iklan serupa dengan luas dan masa sewa terlalu sedikit, jadi harga tidak dibandingkan.',
    bedShort: 'KT', studio: 'studio',
    m2: 'm²',
    lease: (y: number) => `leasehold ${y} tahun`,
    freehold: 'freehold',
    km: 'km',
    open: 'Iklan',
    prev: 'Sebelumnya', next: 'Berikutnya',
    asOf: (d: string) => `Data per ${d}`,
    verdict: (diff: number, year: boolean) => `${Math.abs(diff) <= 5 ? 'Vila ini setara harga pasar' : `Vila ini ${Math.abs(diff)}% ${diff > 0 ? 'lebih mahal' : 'lebih murah'} dari pasar`} - membandingkan harga ${year ? 'per m² per tahun kepemilikan' : 'per m²'}`,
    midMark: 'tengah pasar',
    selfMark: 'vila ini',
    note: (n: number, r: number, year: boolean, cat: number) => `${year ? 'Per m² per tahun = harga ÷ luas bangunan ÷ masa leasehold, sehingga masa sewa berbeda bisa dibandingkan. ' : 'Per m² = harga ÷ luas bangunan. '}${n} vila serupa dalam ${String(r).replace('.', ',')} km: ${cat ? `${cat} dari katalog Balinsky, sisanya ` : ''}iklan rumah123.com.`,
    catalog: 'Di katalog Balinsky',
    far: (n: number, km: number) => `${n} vila lagi dari katalog Balinsky sedikit lebih jauh (hingga ${km} km), tidak masuk rata-rata.`,
    heading: 'Yang dijual di sekitar',
    zone: { good: 'Di bawah pasar', mid: 'Tengah pasar', bad: 'Di atas pasar' } as Record<Band, string>,
    tag: { good: 'Lebih murah', mid: 'Tengah', bad: 'Lebih mahal' } as Record<Band, string>,
    upTo: 'hingga', from: 'mulai',
    count: (n: number, here: boolean) => `${n} vila${here ? ' · vila ini di sini' : ''}`,
  },
  fr: {
    title: 'En vente dans ce quartier',
    line: (beds: string, r: number) => `${beds[0].toUpperCase() + beds.slice(1)} dans un rayon de ${String(r).replace('.', ',')} km`,
    avg: 'en moyenne', range: 'généralement de', to: 'à',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${n} ${n < 2 ? 'villa similaire' : 'villas similaires'}${lease ? ' en leasehold' : ''} dans un rayon de ${r} km, ${beds}. Prix des annonces rumah123.com.`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1} chambres` : `${b} ${b < 2 ? 'chambre' : 'chambres'}`,
    self: 'Cette villa',
    market: 'Milieu du marché alentour',
    diff: 'Écart',
    perYear: 'par m² et par an',
    perM2: 'par m²',
    pricier: (p: number) => `${p} % plus cher`,
    cheaper: (p: number) => `${p} % moins cher`,
    same: 'au niveau du marché',
    howYear: 'Prix par m² et par an = prix ÷ surface ÷ durée du leasehold. On compare ainsi équitablement des baux de 25 et 30 ans.',
    howM2: 'Prix par m² = prix ÷ surface habitable.',
    caveat: 'Les annonces affichent des prix demandés et incluent des villas neuves comme déjà habitées.',
    few: 'Moins de 30 annonces — c’est un repère, pas un chiffre de marché.',
    noVerdict: 'Trop peu d’annonces similaires avec surface et durée du bail : le prix n’est pas comparé.',
    bedShort: 'ch.', studio: 'studio',
    m2: 'm²',
    lease: (y: number) => `leasehold ${y} ${y < 2 ? 'an' : 'ans'}`,
    freehold: 'pleine propriété',
    km: 'km',
    open: 'Annonce',
    prev: 'Précédent', next: 'Suivant',
    asOf: (d: string) => `Données au ${d}`,
    verdict: (diff: number, year: boolean) => `${Math.abs(diff) <= 5 ? 'Cette villa est au niveau du marché' : `Cette villa est ${Math.abs(diff)} % ${diff > 0 ? 'au-dessus' : 'en dessous'} du marché`} - en comparant le prix ${year ? 'par m² et par année de détention' : 'par m²'}`,
    midMark: 'milieu du marché',
    selfMark: 'cette villa',
    note: (n: number, r: number, year: boolean, cat: number) => `${year ? 'Par m² et par an = prix ÷ surface ÷ durée du leasehold : des baux différents se comparent équitablement. ' : 'Par m² = prix ÷ surface habitable. '}${n} ${n < 2 ? 'villa similaire' : 'villas similaires'} dans un rayon de ${String(r).replace('.', ',')} km : ${cat ? `${cat} du catalogue Balinsky, les autres ` : ''}annonces rumah123.com.`,
    catalog: 'Dans le catalogue Balinsky',
    far: (n: number, km: number) => `${n} autre${n > 1 ? 's' : ''} du catalogue Balinsky, un peu plus loin (jusqu’à ${km} km), non ${n > 1 ? 'incluses' : 'incluse'} dans la moyenne.`,
    heading: 'En vente à proximité',
    zone: { good: 'Sous le marché', mid: 'Milieu du marché', bad: 'Au-dessus du marché' } as Record<Band, string>,
    tag: { good: 'Moins cher', mid: 'Milieu', bad: 'Plus cher' } as Record<Band, string>,
    upTo: 'jusqu’à', from: 'dès',
    count: (n: number, here: boolean) => `${n} ${n < 2 ? 'villa' : 'villas'}${here ? ' · cette villa est ici' : ''}`,
  },
  de: {
    title: 'Zum Verkauf in dieser Gegend',
    line: (beds: string, r: number) => `${beds[0].toUpperCase() + beds.slice(1)} im Umkreis von ${String(r).replace('.', ',')} km`,
    avg: 'im Schnitt', range: 'meist von', to: 'bis',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${n} ${n === 1 ? 'ähnliche Villa' : 'ähnliche Villen'}${lease ? ' auf Leasehold' : ''} im Umkreis von ${r} km, ${beds}. Preise aus Anzeigen auf rumah123.com.`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1} Schlafzimmer` : `${b} Schlafzimmer`,
    self: 'Diese Villa',
    market: 'Marktmitte in der Nähe',
    diff: 'Differenz',
    perYear: 'pro m² und Jahr',
    perM2: 'pro m²',
    pricier: (p: number) => `${p} % teurer`,
    cheaper: (p: number) => `${p} % günstiger`,
    same: 'auf Marktniveau',
    howYear: 'Preis pro m² und Jahr = Preis ÷ Fläche ÷ Leasehold-Laufzeit. So lassen sich Pachten über 25 und 30 Jahre fair vergleichen.',
    howM2: 'Preis pro m² = Preis ÷ Wohnfläche.',
    caveat: 'Anzeigen nennen Angebotspreise und umfassen neue wie bewohnte Villen.',
    few: 'Weniger als 30 Anzeigen — ein Richtwert, keine Marktzahl.',
    noVerdict: 'Zu wenige ähnliche Anzeigen mit Fläche und Laufzeit, daher kein Preisvergleich.',
    bedShort: 'SZ', studio: 'Studio',
    m2: 'm²',
    lease: (y: number) => `Leasehold ${y} ${y === 1 ? 'Jahr' : 'Jahre'}`,
    freehold: 'Eigentum',
    km: 'km',
    open: 'Anzeige',
    prev: 'Zurück', next: 'Weiter',
    asOf: (d: string) => `Stand: ${d}`,
    verdict: (diff: number, year: boolean) => `${Math.abs(diff) <= 5 ? 'Diese Villa liegt auf Marktniveau' : `Diese Villa liegt ${Math.abs(diff)} % ${diff > 0 ? 'über' : 'unter'} dem Markt`} - beim Preis ${year ? 'pro m² und Besitzjahr' : 'pro m²'}`,
    midMark: 'Marktmitte',
    selfMark: 'diese Villa',
    note: (n: number, r: number, year: boolean, cat: number) => `${year ? 'Pro m² und Jahr = Preis ÷ Wohnfläche ÷ Leasehold-Laufzeit, so sind unterschiedliche Laufzeiten fair vergleichbar. ' : 'Pro m² = Preis ÷ Wohnfläche. '}${n} ${n === 1 ? 'ähnliche Villa' : 'ähnliche Villen'} im Umkreis von ${String(r).replace('.', ',')} km: ${cat ? `${cat} aus dem Balinsky-Katalog, der Rest ` : ''}Anzeigen auf rumah123.com.`,
    catalog: 'Im Balinsky-Katalog',
    far: (n: number, km: number) => `${n} weitere aus dem Balinsky-Katalog liegen etwas weiter entfernt (bis ${km} km) und zählen nicht zum Durchschnitt.`,
    heading: 'Was in der Nähe verkauft wird',
    zone: { good: 'Unter Marktniveau', mid: 'Marktmitte', bad: 'Über Marktniveau' } as Record<Band, string>,
    tag: { good: 'Günstiger', mid: 'Mitte', bad: 'Teurer' } as Record<Band, string>,
    upTo: 'bis', from: 'ab',
    count: (n: number, here: boolean) => `${n} ${n === 1 ? 'Villa' : 'Villen'}${here ? ' · hier liegt diese Villa' : ''}`,
  },
  zh: {
    title: '本区域在售',
    line: (beds: string, r: number) => `${r}公里范围内的${beds}`,
    avg: '平均', range: '通常为', to: '至',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${r}公里范围内有${n}套类似${lease ? '租赁产权' : ''}别墅，${beds}。价格来自 rumah123.com 的房源。`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1}卧室` : `${b}卧室`,
    self: '本别墅',
    market: '周边市场中位',
    diff: '差额',
    perYear: '每平方米每年',
    perM2: '每平方米',
    pricier: (p: number) => `贵${p}%`,
    cheaper: (p: number) => `便宜${p}%`,
    same: '与市场持平',
    howYear: '每平方米每年价格 = 价格 ÷ 面积 ÷ 租期。这样25年和30年租期的别墅才能公平比较。',
    howM2: '每平方米价格 = 价格 ÷ 建筑面积。',
    caveat: '房源显示的是挂牌价，其中既有新别墅，也有住过的别墅。',
    few: '房源少于30套——仅供参考，不代表市场数据。',
    noVerdict: '带面积和租期的类似房源太少，因此不比较价格。',
    bedShort: '室', studio: '开间',
    m2: 'm²',
    lease: (y: number) => `租期${y}年`,
    freehold: '永久产权',
    km: '公里',
    open: '房源',
    prev: '上一页', next: '下一页',
    asOf: (d: string) => `数据截至${d}`,
    verdict: (diff: number, year: boolean) => `${Math.abs(diff) <= 5 ? '本别墅与市场持平' : `本别墅比市场${diff > 0 ? '贵' : '便宜'}${Math.abs(diff)}%`}（按${year ? '每平方米每持有年' : '每平方米'}价格比较）`,
    midMark: '市场中位',
    selfMark: '本别墅',
    note: (n: number, r: number, year: boolean, cat: number) => `${year ? '每平方米每年 = 价格 ÷ 建筑面积 ÷ 租期，不同租期可公平比较。' : '每平方米 = 价格 ÷ 建筑面积。'}${r}公里内${n}套类似别墅：${cat ? `${cat}套来自 Balinsky 目录，其余为` : ''} rumah123.com 房源。`,
    catalog: 'Balinsky 目录中',
    far: (n: number, km: number) => `另有${n}套 Balinsky 目录中的别墅稍远（${km}公里内），未计入平均值。`,
    heading: '附近在售',
    zone: { good: '低于市场', mid: '市场中位', bad: '高于市场' } as Record<Band, string>,
    tag: { good: '更便宜', mid: '中位', bad: '更贵' } as Record<Band, string>,
    upTo: '低于', from: '高于',
    count: (n: number, here: boolean) => `${n}套别墅${here ? ' · 本别墅在此' : ''}`,
  },
  nl: {
    title: 'Te koop in deze buurt',
    line: (beds: string, r: number) => `${beds[0].toUpperCase() + beds.slice(1)} binnen ${String(r).replace('.', ',')} km`,
    avg: 'gemiddeld', range: 'meestal van', to: 'tot',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${n} ${n === 1 ? 'vergelijkbare villa' : 'vergelijkbare villa’s'}${lease ? ' op leasehold' : ''} binnen ${r} km, ${beds}. Prijzen uit advertenties op rumah123.com.`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1} slaapkamers` : `${b} ${b === 1 ? 'slaapkamer' : 'slaapkamers'}`,
    self: 'Deze villa',
    market: 'Marktmidden in de buurt',
    diff: 'Verschil',
    perYear: 'per m² per jaar',
    perM2: 'per m²',
    pricier: (p: number) => `${p}% duurder`,
    cheaper: (p: number) => `${p}% goedkoper`,
    same: 'op marktniveau',
    howYear: 'Prijs per m² per jaar = prijs ÷ oppervlakte ÷ looptijd van de leasehold. Zo zijn huurtermijnen van 25 en 30 jaar eerlijk te vergelijken.',
    howM2: 'Prijs per m² = prijs ÷ woonoppervlakte.',
    caveat: 'Advertenties tonen vraagprijzen en bevatten zowel nieuwe als bewoonde villa’s.',
    few: 'Minder dan 30 advertenties — een richtlijn, geen marktcijfer.',
    noVerdict: 'Te weinig vergelijkbare advertenties met oppervlakte en looptijd, dus geen prijsvergelijking.',
    bedShort: 'slpk.', studio: 'studio',
    m2: 'm²',
    lease: (y: number) => `leasehold ${y} jaar`,
    freehold: 'eigendom',
    km: 'km',
    open: 'Advertentie',
    prev: 'Vorige', next: 'Volgende',
    asOf: (d: string) => `Gegevens per ${d}`,
    verdict: (diff: number, year: boolean) => `${Math.abs(diff) <= 5 ? 'Deze villa zit op marktniveau' : `Deze villa is ${Math.abs(diff)}% ${diff > 0 ? 'duurder' : 'goedkoper'} dan de markt`} - bij de prijs ${year ? 'per m² per jaar bezit' : 'per m²'}`,
    midMark: 'marktmidden',
    selfMark: 'deze villa',
    note: (n: number, r: number, year: boolean, cat: number) => `${year ? 'Per m² per jaar = prijs ÷ woonoppervlakte ÷ looptijd, zodat verschillende looptijden eerlijk vergelijkbaar zijn. ' : 'Per m² = prijs ÷ woonoppervlakte. '}${n} ${n === 1 ? 'vergelijkbare villa' : 'vergelijkbare villa’s'} binnen ${String(r).replace('.', ',')} km: ${cat ? `${cat} uit de Balinsky-catalogus, de rest ` : ''}advertenties op rumah123.com.`,
    catalog: 'In de Balinsky-catalogus',
    far: (n: number, km: number) => `Nog ${n} uit de Balinsky-catalogus, iets verder weg (tot ${km} km), niet meegeteld in het gemiddelde.`,
    heading: 'Te koop in de buurt',
    zone: { good: 'Onder de markt', mid: 'Marktmidden', bad: 'Boven de markt' } as Record<Band, string>,
    tag: { good: 'Goedkoper', mid: 'Midden', bad: 'Duurder' } as Record<Band, string>,
    upTo: 'tot', from: 'vanaf',
    count: (n: number, here: boolean) => `${n} ${n === 1 ? 'villa' : 'villa’s'}${here ? ' · deze villa staat hier' : ''}`,
  },
  ban: {
    title: 'Kaadol ring wewidangan puniki',
    line: (beds: string, r: number) => `${beds[0].toUpperCase() + beds.slice(1)} ring radius ${String(r).replace('.', ',')} km`,
    avg: 'rata-rata', range: 'biasane saking', to: 'kantos',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${n} vila mirip${lease ? ' leasehold' : ''} ring radius ${r} km, ${beds}. Aji saking iklan rumah123.com.`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1} kamar pules` : `${b} kamar pules`,
    self: 'Vila puniki',
    market: 'Tengah pasar ring sekitar',
    diff: 'Selisih',
    perYear: 'sabilang m² sabilang warsa',
    perM2: 'sabilang m²',
    pricier: (p: number) => `${p}% langkung mahal`,
    cheaper: (p: number) => `${p}% langkung murah`,
    same: 'pateh sareng pasar',
    howYear: 'Aji sabilang m² sabilang warsa = aji ÷ luas ÷ suen leasehold. Sapunika vila 25 lan 30 warsa prasida kabandingang adil.',
    howM2: 'Aji sabilang m² = aji ÷ luas wangunan.',
    caveat: 'Iklan ngicenin aji sane kaaptiang, wenten vila anyar miwah sane sampun kanggen.',
    few: 'Iklan kirang saking 30 — puniki pituduh, nenten angka pasar.',
    noVerdict: 'Iklan mirip sane madaging luas lan suen sewa akidik pisan, punika aji nenten kabandingang.',
    bedShort: 'KT', studio: 'studio',
    m2: 'm²',
    lease: (y: number) => `leasehold ${y} warsa`,
    freehold: 'freehold',
    km: 'km',
    open: 'Iklan',
    prev: 'Sadurungnyane', next: 'Salanturnyane',
    asOf: (d: string) => `Data ring ${d}`,
    verdict: (diff: number, year: boolean) => `${Math.abs(diff) <= 5 ? 'Vila puniki pateh sareng aji pasar' : `Vila puniki ${Math.abs(diff)}% ${diff > 0 ? 'langkung mahal' : 'langkung murah'} saking pasar`} - yening kabandingang aji ${year ? 'sabilang m² sabilang warsa' : 'sabilang m²'}`,
    midMark: 'tengah pasar',
    selfMark: 'vila puniki',
    note: (n: number, r: number, year: boolean, cat: number) => `${year ? 'Sabilang m² sabilang warsa = aji ÷ luas wangunan ÷ suen leasehold. ' : 'Sabilang m² = aji ÷ luas wangunan. '}${n} vila mirip ring ${String(r).replace('.', ',')} km: ${cat ? `${cat} saking katalog Balinsky, sane lianan ` : ''}iklan rumah123.com.`,
    catalog: 'Ring katalog Balinsky',
    far: (n: number, km: number) => `${n} vila malih saking katalog Balinsky rada joh (kantos ${km} km), nenten kaitung ring rata-rata.`,
    heading: 'Sane kaadol ring sekitar',
    zone: { good: 'Ring sor pasar', mid: 'Tengah pasar', bad: 'Ring duur pasar' } as Record<Band, string>,
    tag: { good: 'Langkung murah', mid: 'Tengah', bad: 'Langkung mahal' } as Record<Band, string>,
    upTo: 'kantos', from: 'saking',
    count: (n: number, here: boolean) => `${n} vila${here ? ' · vila puniki iriki' : ''}`,
  },
  pl: {
    title: 'Na sprzedaż w tej okolicy',
    line: (beds: string, r: number) => `${beds[0].toUpperCase() + beds.slice(1)} w promieniu ${String(r).replace('.', ',')} km`,
    avg: 'średnio', range: 'zwykle od', to: 'do',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${n} ${pluralPl(n, ['podobna willa', 'podobne wille', 'podobnych willi'])}${lease ? ' w leasehold' : ''} w promieniu ${r} km, ${beds}. Ceny z ogłoszeń rumah123.com.`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1} ${pluralPl(b + 1, ['sypialnia', 'sypialnie', 'sypialni'])}` : `${b} ${pluralPl(b, ['sypialnia', 'sypialnie', 'sypialni'])}`,
    self: 'Ta willa',
    market: 'Środek rynku w okolicy',
    diff: 'Różnica',
    perYear: 'za m² na rok',
    perM2: 'za m²',
    pricier: (p: number) => `drożej o ${p}%`,
    cheaper: (p: number) => `taniej o ${p}%`,
    same: 'na poziomie rynku',
    howYear: 'Cena za m² na rok = cena ÷ powierzchnia ÷ okres leasehold. Dzięki temu uczciwie porównuje się wille na 25 i 30 lat.',
    howM2: 'Cena za m² = cena ÷ powierzchnia domu.',
    caveat: 'Ogłoszenia podają ceny ofertowe i obejmują zarówno nowe, jak i używane wille.',
    few: 'Mniej niż 30 ogłoszeń — to orientacja, a nie wskaźnik rynkowy.',
    noVerdict: 'Za mało podobnych ogłoszeń z powierzchnią i okresem dzierżawy, więc ceny nie porównujemy.',
    bedShort: 'syp.', studio: 'kawalerka',
    m2: 'm²',
    lease: (y: number) => `leasehold ${y} ${pluralPl(y, ['rok', 'lata', 'lat'])}`,
    freehold: 'pełna własność',
    km: 'km',
    open: 'Ogłoszenie',
    prev: 'Wstecz', next: 'Dalej',
    asOf: (d: string) => `Dane na ${d}`,
    verdict: (diff: number, year: boolean) => `${Math.abs(diff) <= 5 ? 'Ta willa jest na poziomie rynku' : `Ta willa jest ${diff > 0 ? 'droższa' : 'tańsza'} od rynku o ${Math.abs(diff)}%`} - porównując cenę ${year ? 'za m² na rok posiadania' : 'za m²'}`,
    midMark: 'środek rynku',
    selfMark: 'ta willa',
    note: (n: number, r: number, year: boolean, cat: number) => `${year ? 'Za m² na rok = cena ÷ powierzchnia domu ÷ okres leasehold, więc różne okresy porównuje się uczciwie. ' : 'Za m² = cena ÷ powierzchnia domu. '}${n} ${pluralPl(n, ['podobna willa', 'podobne wille', 'podobnych willi'])} w promieniu ${String(r).replace('.', ',')} km: ${cat ? `${cat} z katalogu Balinsky, reszta to ` : ''}ogłoszenia rumah123.com.`,
    catalog: 'W katalogu Balinsky',
    far: (n: number, km: number) => `Jeszcze ${n} ${pluralPl(n, ['willa', 'wille', 'willi'])} z katalogu Balinsky - nieco dalej, do ${km} km, nie wlicza się do średniej.`,
    heading: 'Co jest na sprzedaż w pobliżu',
    zone: { good: 'Taniej niż rynek', mid: 'Środek rynku', bad: 'Drożej niż rynek' } as Record<Band, string>,
    tag: { good: 'Taniej', mid: 'Środek', bad: 'Drożej' } as Record<Band, string>,
    upTo: 'do', from: 'od',
    count: (n: number, here: boolean) => `${n} ${pluralPl(n, ['willa', 'wille', 'willi'])}${here ? ' · tu jest ta willa' : ''}`,
  },
  uk: {
    title: 'Продаються в цьому районі',
    line: (beds: string, r: number) => `${beds[0].toUpperCase() + beds.slice(1)} у радіусі ${String(r).replace('.', ',')} км`,
    avg: 'у середньому', range: 'зазвичай від', to: 'до',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${n} ${plural(n, ['схожа вілла', 'схожі вілли', 'схожих вілл'])}${lease ? ' на лізхолді' : ''} у радіусі ${r} км, ${beds}. Ціни з оголошень rumah123.com.`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1} ${plural(b + 1, ['спальня', 'спальні', 'спалень'])}` : `${b} ${plural(b, ['спальня', 'спальні', 'спалень'])}`,
    self: 'Ця вілла',
    market: 'Середина ринку поруч',
    diff: 'Різниця',
    perYear: 'за м² на рік',
    perM2: 'за м²',
    pricier: (p: number) => `дорожче на ${p}%`,
    cheaper: (p: number) => `дешевше на ${p}%`,
    same: 'на рівні ринку',
    howYear: 'Ціна за м² на рік = ціна ÷ площа ÷ строк лізхолду. Так чесно порівнюються вілли на 25 і на 30 років.',
    howM2: 'Ціна за м² = ціна ÷ площа будинку.',
    caveat: 'В оголошеннях запитувані ціни, і там є як нові, так і вже обжиті вілли.',
    few: 'Оголошень менше 30 — це орієнтир, а не ринкова цифра.',
    noVerdict: 'Схожих оголошень із площею і строком мало, тому ціну не порівнюємо.',
    bedShort: 'сп.', studio: 'студія',
    m2: 'м²',
    lease: (y: number) => `лізхолд ${y} ${plural(y, ['рік', 'роки', 'років'])}`,
    freehold: 'фріхолд',
    km: 'км',
    open: 'Оголошення',
    prev: 'Назад', next: 'Далі',
    asOf: (d: string) => `Дані на ${d}`,
    verdict: (diff: number, year: boolean) => `${Math.abs(diff) <= 5 ? 'Ця вілла на рівні ринку' : `Ця вілла ${diff > 0 ? 'дорожча' : 'дешевша'} за ринок на ${Math.abs(diff)}%`} - якщо порівнювати ціну ${year ? 'за м² на рік володіння' : 'за м²'}`,
    midMark: 'середина ринку',
    selfMark: 'ця вілла',
    note: (n: number, r: number, year: boolean, cat: number) => `${year ? 'За м² на рік = ціна ÷ площа будинку ÷ строк лізхолду. Так чесно порівнюються вілли з різним строком. ' : 'За м² = ціна ÷ площа будинку. '}${n} ${plural(n, ['схожа вілла', 'схожі вілли', 'схожих вілл'])} у ${String(r).replace('.', ',')} км: ${cat ? `${cat} з каталогу Balinsky, решта - ` : ''}оголошення rumah123.com.`,
    catalog: 'У каталозі Balinsky',
    far: (n: number, km: number) => `Ще ${n} ${plural(n, ['вілла', 'вілли', 'вілл'])} з каталогу Balinsky - трохи далі, до ${km} км, до середньої ціни не ${n === 1 ? 'входить' : 'входять'}.`,
    heading: 'Що продається поруч',
    zone: { good: 'Дешевше за ринок', mid: 'Середина ринку', bad: 'Дорожче за ринок' } as Record<Band, string>,
    tag: { good: 'Дешевше', mid: 'Середина', bad: 'Дорожче' } as Record<Band, string>,
    upTo: 'до', from: 'від',
    count: (n: number, here: boolean) => `${n} ${plural(n, ['вілла', 'вілли', 'вілл'])}${here ? ' · тут ця вілла' : ''}`,
  },
}

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}


// Вкладка «Продажа рядом» (макет «Продажа рядом: вариант 1», владелец 23.10.2026):
// вывод «дороже/дешевле рынка на X% за м² в год», шкала с этой виллой и
// серединой рынка, три зоны «дешевле / середина / дороже» с подсветкой карточек.
export function SaleCompsBlock({ data, lang, hideTitle }: { data: SaleCompsBundle; bedrooms: number | null; lang: Lang; hideTitle?: boolean }) {
  const c = pickCopy(COPY, lang)
  const isYear = data.metric === 'year'
  const q = data.q
  const metric = (x: SaleComp) => isYear ? x.ppmYear : x.ppm
  // Для покупателя дешевле — хорошо: зелёный, дороже — красный (владелец 23.10.2026).
  const band = (v: number): Band => !q ? 'mid' : v < q.p25 ? 'good' : v > q.p75 ? 'bad' : 'mid'
  const sorted = [...data.comps].sort((x, y) => (metric(x) ?? 0) - (metric(y) ?? 0))
  const P = (usd: number) => <span className="whitespace-nowrap"><InlinePrice usd={Math.round(usd)} lang={lang} approx={false} /></span>
  const selfBand = data.self != null ? band(data.self) : null
  const unit = <span className="whitespace-nowrap text-[14px] font-medium text-[var(--color-text-muted)]">{isYear ? c.perYear : c.perM2}</span>

  return (
    <div className="flex flex-col gap-8">
      {!hideTitle && <h3 className="text-[18px] md:text-[20px] font-semibold text-[var(--color-text)]">{c.title}</h3>}
      {data.diffPct != null && data.self != null && data.median != null && q && (
        <section className="flex flex-col gap-5 rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-6">
          <p className="text-[18px] font-semibold leading-snug tracking-tight md:text-[20px]">{c.verdict(data.diffPct, isYear)}</p>
          <PriceScale self={data.self} median={data.median} q={q} lowGood redDot
            selfLabel={<>{c.selfMark}<br />{P(data.self)} <span className="font-normal text-[var(--color-text-muted)]">{isYear ? c.perYear : c.perM2}</span></>}
            midLabel={<>{P(data.median)} {isYear ? c.perYear : c.perM2}<br />{c.midMark}</>} />
          <p className="max-w-[68ch] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            {c.note(data.n, data.radiusKm, isYear, data.catalogN ?? 0)}{data.n < 30 ? ` ${c.few}` : ''}{data.catalogFar ? ` ${c.far(data.catalogFar, Math.max(data.radiusKm, CATALOG_FAR_KM))}` : ''}
          </p>
        </section>
      )}
      {q && data.counts ? (
        <BandedRail heading={c.heading} prevLabel={c.prev} nextLabel={c.next}
          chips={[
            // Без единицы «$40» читалось как цена виллы (владелец 23.10.2026).
            { band: 'good', title: c.zone.good, range: <>{c.upTo} {P(q.p25)} {unit}</>, money: c.count(data.counts.cheap, selfBand === 'good') },
            { band: 'mid', title: c.zone.mid, range: <>{P(q.p25)} – {P(q.p75)} {unit}</>, money: c.count(data.counts.mid, selfBand === 'mid') },
            { band: 'bad', title: c.zone.bad, range: <>{c.from} {P(q.p75)} {unit}</>, money: c.count(data.counts.pricey, selfBand === 'bad') },
          ]}
          items={sorted.map(comp => {
            const t = band(metric(comp) ?? q.p50)
            return { band: t, node: <CompCard key={comp.url} comp={comp} isYear={isYear} lang={lang} tone={t} tag={c.tag[t]} /> }
          })} />
      ) : (
        <CardRail prevLabel={c.prev} nextLabel={c.next}>
          {sorted.map(comp => <CompCard key={comp.url} comp={comp} isYear={isYear} lang={lang} />)}
        </CardRail>
      )}
    </div>
  )
}

function CompCard({ comp, isYear, lang, tone, tag }: { comp: SaleComp; isYear: boolean; lang: Lang; tone?: Band; tag?: string }) {
  const c = pickCopy(COPY, lang)
  // rumah123 отдаёт картинку в нужном размере сам — большую не тянем.
  const photo = comp.catalog ? comp.photo : comp.photo?.replace('/1080x720-fit/', '/720x480-fit/') ?? null
  const right = comp.leasehold === true && comp.leaseYears ? c.lease(comp.leaseYears) : comp.leasehold === false ? c.freehold : null
  const metric = isYear ? comp.ppmYear : comp.ppm
  const facts = [comp.bedrooms === 0 ? c.studio : `${comp.bedrooms} ${c.bedShort}`, comp.buildingM2 && `${comp.buildingM2} ${c.m2}`, right].filter(Boolean).join(' · ')
  return (
      <a
        href={comp.url}
        target="_blank"
        rel={comp.catalog ? 'noopener' : 'nofollow noopener noreferrer'}
        className={`group flex h-full flex-col overflow-hidden rounded-2xl border ${tone ? BAND_SURFACE[tone] : 'border-[var(--color-border)] bg-white'} transition-colors duration-[120ms] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]`}
      >
        <div className="relative aspect-[3/2] bg-[var(--color-search-bg)]">
          {photo && (
            <Image src={photo} alt={`${facts}, ${comp.district ?? 'Bali'}`} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" referrerPolicy="no-referrer" loading="lazy" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-5">
          {((tone && tag) || comp.catalog) && (
            <div className="mb-1 flex flex-wrap gap-1.5">
              {tone && tag && <span className={`rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold ${BAND_TEXT[tone]}`}>{tag}</span>}
              {comp.catalog && <span className="rounded-full bg-[var(--color-primary)] px-2.5 py-0.5 text-[12px] font-semibold text-white">{c.catalog}</span>}
            </div>
          )}
          <div className="text-[20px] font-semibold text-[var(--color-text)] leading-tight">
            <InlinePrice usd={comp.priceUsd} lang={lang} />
          </div>
          {comp.name && <div className="line-clamp-1 text-[15px] font-semibold text-[var(--color-text)]">{comp.name}</div>}
          <div className="text-[15px] font-medium text-[var(--color-text)]">{facts}</div>
          {metric != null && (
            <div className="text-[13px] text-[var(--color-text-muted)]">
              <InlinePrice usd={Math.round(metric)} lang={lang} /> {isYear ? c.perYear : c.perM2}
            </div>
          )}
          <div className="text-[14px] text-[var(--color-text-muted)]">
            {[comp.district, `${lang === 'en' || lang === 'zh' ? comp.distanceKm.toFixed(1) : comp.distanceKm.toFixed(1).replace('.', ',')} ${c.km}`].filter(Boolean).join(' · ')}
          </div>
        </div>
      </a>
  )
}
