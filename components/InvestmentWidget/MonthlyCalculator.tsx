'use client'

import { InfoTip } from '../InfoTip'
import { pluralRu } from '@/lib/plural-ru'
import { districtRu } from '@/lib/district-ru'
import { useEffect, useMemo, useState } from 'react'
import { saveCalc } from '@/lib/calc-settings'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Slider, ResetButton } from './Slider'
import { fmtMoney, fmtPct, fmtYears } from './utils'
import type { Snapshot } from './types'
import { useCurrency } from '../CurrencyContext'
import { AGENT_FEE_PCT, MONTHS_RENTED, computeMonthlyEconomics } from '@/lib/investment/monthly'
import type { TaxStatus } from '@/lib/investment/economics'
import { pickCopy, type Lang } from '@/lib/i18n'

// Помесячная аренда для объектов на жилой (жёлтой) земле, где посуточно
// сдавать нельзя. Расчёт — lib/investment/monthly.ts.

type Copy = {
  title: string
  sub: string
  subCompare: string
  sample: (n: number, km: number, relaxed: boolean) => string
  price: string; rent: string; months: string; agent: string
  monthsUnit: string
  perYearNoi: string; payback: string; capRate: string; irr: string
  taxLabel: string; taxBefore: string; resident: string; nonResident: string
  howCalced: string
  revenue: string; agentFee: string; upkeep: string; upkeepHint: string; ffe: string; pbb: string; landRent: string
  tax: string; taxHintRes: string; taxHintNonRes: string; noi: string
  entry: string; closing: string; furnishing: string
  noCapital: string
  nearby: string; perMonth: string; bedrooms: string
  source: (asOf: string) => string
  /** Общая база Facebook + Telegram + rumah123 (только ru/en, остальные — en). */
  sampleMixed?: (n: number, own: number, district: string, km: number) => string
  sourceMixed?: (rumah: boolean) => string
}

const COPY: Record<Lang, Copy> = {
  ru: {
    title: 'Калькулятор помесячной аренды',
    sub: 'Посуточно здесь сдавать нельзя, но можно на месяцы и годы. Ставка по умолчанию — медиана объявлений долгосрочной аренды вилл с тем же числом спален рядом. Ползунки можно двигать.',
    subCompare: 'Если сдавать не посуточно, а на месяцы и годы: меньше хлопот и ровный доход, но обычно меньше денег. Ставка по умолчанию — медиана объявлений долгосрочной аренды вилл с тем же числом спален рядом.',
    sample: (n, km, relaxed) => `${n} ${pluralRu(n, ['объявление', 'объявления', 'объявлений'])} в радиусе ${km} км${relaxed ? ', включая виллы на спальню больше или меньше' : ''}`,
    price: 'Цена', rent: 'Аренда в месяц', months: 'Сдана в году', agent: 'Агент',
    monthsUnit: 'мес',
    perYearNoi: ' / год чистыми', payback: 'Окупаемость', capRate: 'Доходность в год', irr: 'Доходность за срок аренды',
    taxLabel: 'Налоговый статус', taxBefore: 'До налогов', resident: 'Резидент', nonResident: 'Нерезидент',
    howCalced: 'Как считалось',
    revenue: 'Аренда за год', agentFee: 'Комиссия агента', upkeep: 'Бассейн, сад, мелкий ремонт',
    upkeepHint: 'коммунальные, уборку и расходники платит жилец', ffe: 'Износ мебели', pbb: 'Налог на землю и здание (PBB)', landRent: 'Аренда земли за год',
    tax: 'Налог с аренды', taxHintRes: 'финальный, с валовой суммы', taxHintNonRes: 'для нерезидента, с валовой суммы', noi: 'Чистыми',
    entry: 'Вход', closing: 'нотариус', furnishing: 'мебель',
    noCapital: 'За срок лизхолда вложения не возвращаются',
    nearby: 'Что сдают рядом помесячно', perMonth: '/ мес', bedrooms: 'сп.',
    source: d => `Объявления rumah123.com, выгрузка от ${d}.`,
    sampleMixed: (n, own, district, km) => `${n} ${pluralRu(n, ['объявление', 'объявления', 'объявлений'])}: ${own} из Facebook и Telegram в районе ${district}${n > own ? `, ${n - own} с rumah123 в радиусе ${km} км` : ''}`,
    sourceMixed: rumah => `Объявления из Facebook и Telegram (каталог аренды Balinsky)${rumah ? ' и rumah123.com' : ''}.`,
  },
  en: {
    title: 'Monthly rental calculator',
    sub: 'Daily rental is not allowed here, but monthly and yearly leases are. The default rent is the median of long-term villa listings nearby with the same number of bedrooms. Move the sliders to test your own case.',
    subCompare: 'If you let it on monthly or yearly leases instead of nightly: less hassle and steadier income, but usually less money. The default rent is the median of long-term villa listings nearby with the same number of bedrooms.',
    sample: (n, km, relaxed) => `${n} listings within ${km} km${relaxed ? ', including villas with one bedroom more or less' : ''}`,
    price: 'Price', rent: 'Rent per month', months: 'Let per year', agent: 'Agent',
    monthsUnit: 'mo',
    perYearNoi: ' / year net', payback: 'Payback', capRate: 'Yield', irr: 'Yield over the leasehold',
    taxLabel: 'Tax status', taxBefore: 'Before tax', resident: 'Resident', nonResident: 'Non-resident',
    howCalced: 'How it is calculated',
    revenue: 'Rent per year', agentFee: 'Agent commission', upkeep: 'Pool, garden, small repairs',
    upkeepHint: 'the tenant pays utilities, cleaning and supplies', ffe: 'Furniture wear', pbb: 'Land and building tax (PBB)', landRent: 'Annual land lease',
    tax: 'Rental tax', taxHintRes: 'final, on gross rent', taxHintNonRes: 'non-resident rate, on gross rent', noi: 'Net',
    entry: 'Entry cost', closing: 'notary', furnishing: 'furniture',
    noCapital: 'The investment is not recovered within the leasehold',
    nearby: 'Monthly rentals nearby', perMonth: '/ mo', bedrooms: 'BR',
    source: d => `Listings from rumah123.com, snapshot of ${d}.`,
    sampleMixed: (n, own, district, km) => `${n} listings: ${own} from Facebook and Telegram in ${district}${n > own ? `, ${n - own} from rumah123 within ${km} km` : ''}`,
    sourceMixed: rumah => `Listings from Facebook and Telegram (Balinsky rental catalogue)${rumah ? ' and rumah123.com' : ''}.`,
  },
  id: {
    title: 'Kalkulator sewa bulanan',
    sub: 'Sewa harian tidak diizinkan di sini, tetapi sewa bulanan dan tahunan boleh. Sewa bawaan adalah median iklan sewa jangka panjang vila terdekat dengan jumlah kamar yang sama. Geser slider untuk menguji skenario Anda.',
    subCompare: 'Jika disewakan bulanan atau tahunan, bukan harian: lebih sedikit repot dan pendapatan stabil, tetapi biasanya lebih kecil. Sewa bawaan adalah median iklan sewa jangka panjang vila terdekat dengan jumlah kamar yang sama.',
    sample: (n, km, relaxed) => `${n} iklan dalam radius ${km} km${relaxed ? ', termasuk vila dengan satu kamar lebih atau kurang' : ''}`,
    price: 'Harga', rent: 'Sewa per bulan', months: 'Tersewa per tahun', agent: 'Agen',
    monthsUnit: 'bln',
    perYearNoi: ' / tahun bersih', payback: 'Balik modal', capRate: 'Imbal hasil', irr: 'Imbal hasil selama leasehold',
    taxLabel: 'Status pajak', taxBefore: 'Sebelum pajak', resident: 'Residen', nonResident: 'Non-residen',
    howCalced: 'Cara perhitungan',
    revenue: 'Sewa per tahun', agentFee: 'Komisi agen', upkeep: 'Kolam, taman, perbaikan kecil',
    upkeepHint: 'penyewa membayar listrik, air, kebersihan', ffe: 'Penyusutan perabot', pbb: 'Pajak bumi dan bangunan (PBB)', landRent: 'Sewa tanah per tahun',
    tax: 'Pajak sewa', taxHintRes: 'final, dari sewa bruto', taxHintNonRes: 'tarif non-residen, dari sewa bruto', noi: 'Bersih',
    entry: 'Biaya masuk', closing: 'notaris', furnishing: 'perabot',
    noCapital: 'Modal tidak kembali selama masa leasehold',
    nearby: 'Sewa bulanan di sekitar', perMonth: '/ bln', bedrooms: 'KT',
    source: d => `Iklan dari rumah123.com, data per ${d}.`,
  },
  fr: {
    title: 'Calculateur de location mensuelle',
    sub: 'La location à la nuitée est interdite ici, mais les baux au mois et à l’année sont permis. Le loyer par défaut est la médiane des annonces de location longue durée de villas voisines avec le même nombre de chambres. Déplacez les curseurs pour tester votre cas.',
    subCompare: 'En location au mois ou à l’année plutôt qu’à la nuitée : moins de gestion et un revenu régulier, mais en général moins élevé. Le loyer par défaut est la médiane des annonces longue durée de villas voisines avec le même nombre de chambres.',
    sample: (n, km, relaxed) => `${n} annonces dans un rayon de ${km} km${relaxed ? ', y compris des villas avec une chambre de plus ou de moins' : ''}`,
    price: 'Prix', rent: 'Loyer mensuel', months: 'Loué par an', agent: 'Agent',
    monthsUnit: 'mois',
    perYearNoi: ' / an net', payback: 'Retour sur investissement', capRate: 'Rendement', irr: 'Rendement sur la durée du bail',
    taxLabel: 'Statut fiscal', taxBefore: 'Avant impôt', resident: 'Résident', nonResident: 'Non-résident',
    howCalced: 'Méthode de calcul',
    revenue: 'Loyer annuel', agentFee: 'Commission d’agent', upkeep: 'Piscine, jardin, petites réparations',
    upkeepHint: 'le locataire paie les charges, le ménage et les fournitures', ffe: 'Usure du mobilier', pbb: 'Taxe foncière (PBB)', landRent: 'Loyer annuel du terrain',
    tax: 'Impôt sur les loyers', taxHintRes: 'libératoire, sur le loyer brut', taxHintNonRes: 'taux non-résident, sur le loyer brut', noi: 'Net',
    entry: 'Coût d’entrée', closing: 'frais de notaire', furnishing: 'mobilier',
    noCapital: 'L’investissement n’est pas récupéré pendant la durée du bail',
    nearby: 'Locations mensuelles à proximité', perMonth: '/ mois', bedrooms: 'ch.',
    source: d => `Annonces rumah123.com, données du ${d}.`,
  },
  de: {
    title: 'Rechner für Monatsmiete',
    sub: 'Tagesvermietung ist hier nicht erlaubt, Monats- und Jahresmiete schon. Standardmiete ist der Median der Langzeit-Mietangebote für Villen in der Nähe mit gleicher Schlafzimmerzahl. Mit den Reglern können Sie eigene Annahmen testen.',
    subCompare: 'Bei Monats- oder Jahresmiete statt Tagesvermietung: weniger Aufwand und gleichmäßiges Einkommen, meist aber weniger Geld. Standardmiete ist der Median der Langzeitangebote für Villen in der Nähe mit gleicher Schlafzimmerzahl.',
    sample: (n, km, relaxed) => `${n} Angebote im Umkreis von ${km} km${relaxed ? ', inkl. Villen mit einem Schlafzimmer mehr oder weniger' : ''}`,
    price: 'Preis', rent: 'Miete pro Monat', months: 'Vermietet pro Jahr', agent: 'Makler',
    monthsUnit: 'Mon.',
    perYearNoi: ' / Jahr netto', payback: 'Amortisation', capRate: 'Rendite', irr: 'Rendite über die Pachtdauer',
    taxLabel: 'Steuerstatus', taxBefore: 'Vor Steuern', resident: 'Resident', nonResident: 'Nicht-Resident',
    howCalced: 'Berechnung',
    revenue: 'Jahresmiete', agentFee: 'Maklerprovision', upkeep: 'Pool, Garten, kleine Reparaturen',
    upkeepHint: 'Nebenkosten, Reinigung und Verbrauchsmaterial zahlt der Mieter', ffe: 'Möbelverschleiß', pbb: 'Grund- und Gebäudesteuer (PBB)', landRent: 'Jährliche Grundstückspacht',
    tax: 'Mietsteuer', taxHintRes: 'Abgeltungssteuer auf die Bruttomiete', taxHintNonRes: 'Satz für Nicht-Residenten, auf die Bruttomiete', noi: 'Netto',
    entry: 'Einstiegskosten', closing: 'Notar', furnishing: 'Möbel',
    noCapital: 'Die Investition wird innerhalb der Pachtdauer nicht zurückverdient',
    nearby: 'Monatsmieten in der Nähe', perMonth: '/ Mon.', bedrooms: 'SZ',
    source: d => `Angebote von rumah123.com, Stand ${d}.`,
  },
  zh: {
    title: '月租收益计算器',
    sub: '这里不允许按天出租，但可以按月或按年出租。默认租金为附近相同卧室数别墅长租房源的中位数。可拖动滑块测试您的情况。',
    subCompare: '如果按月或按年出租而不是按天：省心、收入稳定，但通常收入更少。默认租金为附近相同卧室数别墅长租房源的中位数。',
    sample: (n, km, relaxed) => `${km} 公里内 ${n} 条房源${relaxed ? '，含卧室多一间或少一间的别墅' : ''}`,
    price: '价格', rent: '月租金', months: '每年出租', agent: '中介',
    monthsUnit: '个月',
    perYearNoi: ' / 年净收入', payback: '回本期', capRate: '收益率', irr: '租赁期内收益率',
    taxLabel: '税务身份', taxBefore: '税前', resident: '居民', nonResident: '非居民',
    howCalced: '计算方式',
    revenue: '年租金', agentFee: '中介佣金', upkeep: '泳池、花园、小修',
    upkeepHint: '水电、清洁和日用品由租客承担', ffe: '家具折旧', pbb: '土地和建筑税 (PBB)', landRent: '年度土地租金',
    tax: '租金税', taxHintRes: '按租金总额最终征收', taxHintNonRes: '非居民税率，按租金总额', noi: '净收入',
    entry: '入手成本', closing: '公证费', furnishing: '家具',
    noCapital: '在租赁期内无法收回投资',
    nearby: '附近月租房源', perMonth: '/ 月', bedrooms: '室',
    source: d => `房源来自 rumah123.com，数据日期 ${d}。`,
  },
  nl: {
    title: 'Calculator maandhuur',
    sub: 'Verhuur per nacht is hier niet toegestaan, verhuur per maand of jaar wel. De standaardhuur is de mediaan van langetermijnaanbod van villa’s in de buurt met hetzelfde aantal slaapkamers. Verschuif de schuifjes om uw eigen situatie te testen.',
    subCompare: 'Bij verhuur per maand of jaar in plaats van per nacht: minder gedoe en een stabiel inkomen, maar meestal minder geld. De standaardhuur is de mediaan van langetermijnaanbod van villa’s in de buurt met hetzelfde aantal slaapkamers.',
    sample: (n, km, relaxed) => `${n} advertenties binnen ${km} km${relaxed ? ', inclusief villa’s met één slaapkamer meer of minder' : ''}`,
    price: 'Prijs', rent: 'Huur per maand', months: 'Verhuurd per jaar', agent: 'Makelaar',
    monthsUnit: 'mnd',
    perYearNoi: ' / jaar netto', payback: 'Terugverdientijd', capRate: 'Rendement', irr: 'Rendement over de leasetermijn',
    taxLabel: 'Fiscale status', taxBefore: 'Vóór belasting', resident: 'Ingezetene', nonResident: 'Niet-ingezetene',
    howCalced: 'Zo is het berekend',
    revenue: 'Huur per jaar', agentFee: 'Makelaarscommissie', upkeep: 'Zwembad, tuin, kleine reparaties',
    upkeepHint: 'de huurder betaalt nutsvoorzieningen, schoonmaak en benodigdheden', ffe: 'Slijtage meubels', pbb: 'Grond- en gebouwbelasting (PBB)', landRent: 'Jaarlijkse grondhuur',
    tax: 'Huurbelasting', taxHintRes: 'eindheffing over de bruto huur', taxHintNonRes: 'tarief niet-ingezetene, over de bruto huur', noi: 'Netto',
    entry: 'Instapkosten', closing: 'notaris', furnishing: 'meubels',
    noCapital: 'De investering wordt binnen de leasetermijn niet terugverdiend',
    nearby: 'Maandhuur in de buurt', perMonth: '/ mnd', bedrooms: 'slk.',
    source: d => `Advertenties van rumah123.com, stand ${d}.`,
  },
  ban: {
    title: 'Kalkulator sewa bulanan',
    sub: 'Sewa harian nenten kadadosang iriki, nanging sewa bulanan miwah tahunan dados. Sewa bawaan inggih punika median iklan sewa jangka panjang vila ring sampingne sane kamarnyane pateh. Geser slider anggen nguji skenario ragane.',
    subCompare: 'Yening kasewayang bulanan wiadin tahunan, boya harian: nenten ribet lan pikolih ajeg, nanging biasane akidik. Sewa bawaan inggih punika median iklan sewa jangka panjang vila ring sampingne sane kamarnyane pateh.',
    sample: (n, km, relaxed) => `${n} iklan ring radius ${km} km${relaxed ? ', taler vila sane kamarnyane lebih wiadin kirang asiki' : ''}`,
    price: 'Aji', rent: 'Sewa sabulan', months: 'Kasewayang setaun', agent: 'Agen',
    monthsUnit: 'bln',
    perYearNoi: ' / taun bersih', payback: 'Mulih modal', capRate: 'Imbal hasil', irr: 'Imbal hasil selami leasehold',
    taxLabel: 'Status pajak', taxBefore: 'Sebelum pajak', resident: 'Residen', nonResident: 'Non-residen',
    howCalced: 'Sapunapi ngitung',
    revenue: 'Sewa setaun', agentFee: 'Komisi agen', upkeep: 'Kolam, taman, perbaikan alit',
    upkeepHint: 'penyewa sane mayah listrik, toya, kebersihan', ffe: 'Penyusutan perabot', pbb: 'Pajak bumi miwah wangunan (PBB)', landRent: 'Sewa tanah per tiban',
    tax: 'Pajak sewa', taxHintRes: 'final, saking sewa bruto', taxHintNonRes: 'tarif non-residen, saking sewa bruto', noi: 'Bersih',
    entry: 'Biaya ngranjing', closing: 'notaris', furnishing: 'perabot',
    noCapital: 'Modal nenten mawali selami leasehold',
    nearby: 'Sewa bulanan ring sampingne', perMonth: '/ bln', bedrooms: 'KT',
    source: d => `Iklan saking rumah123.com, data ${d}.`,
  },
  pl: {
    title: 'Kalkulator najmu miesięcznego',
    sub: 'Najem na doby jest tu zabroniony, ale najem miesięczny i roczny jest dozwolony. Domyślny czynsz to mediana ogłoszeń najmu długoterminowego willi w pobliżu z tą samą liczbą sypialni. Przesuwaj suwaki, aby sprawdzić swój wariant.',
    subCompare: 'Przy najmie miesięcznym lub rocznym zamiast na doby: mniej pracy i stały dochód, ale zwykle mniej pieniędzy. Domyślny czynsz to mediana ogłoszeń najmu długoterminowego willi w pobliżu z tą samą liczbą sypialni.',
    sample: (n, km, relaxed) => `${n} ogłoszeń w promieniu ${km} km${relaxed ? ', w tym wille z jedną sypialnią więcej lub mniej' : ''}`,
    price: 'Cena', rent: 'Czynsz miesięczny', months: 'Wynajęta w roku', agent: 'Agent',
    monthsUnit: 'mies.',
    perYearNoi: ' / rok netto', payback: 'Zwrot', capRate: 'Rentowność', irr: 'Rentowność w okresie leasehold',
    taxLabel: 'Status podatkowy', taxBefore: 'Przed podatkiem', resident: 'Rezydent', nonResident: 'Nierezydent',
    howCalced: 'Jak liczymy',
    revenue: 'Czynsz roczny', agentFee: 'Prowizja agenta', upkeep: 'Basen, ogród, drobne naprawy',
    upkeepHint: 'media, sprzątanie i materiały opłaca najemca', ffe: 'Zużycie mebli', pbb: 'Podatek od gruntu i budynku (PBB)', landRent: 'Roczna dzierżawa gruntu',
    tax: 'Podatek od najmu', taxHintRes: 'zryczałtowany, od czynszu brutto', taxHintNonRes: 'stawka dla nierezydenta, od czynszu brutto', noi: 'Netto',
    entry: 'Koszt wejścia', closing: 'notariusz', furnishing: 'meble',
    noCapital: 'Inwestycja nie zwraca się w okresie leasehold',
    nearby: 'Najem miesięczny w pobliżu', perMonth: '/ mies.', bedrooms: 'syp.',
    source: d => `Ogłoszenia z rumah123.com, stan na ${d}.`,
  },
  uk: {
    title: 'Калькулятор помісячної оренди',
    sub: 'Подобово тут здавати не можна, але можна на місяці й роки. Ставка за замовчуванням — медіана оголошень довгострокової оренди вілл із тією ж кількістю спалень поруч. Повзунки можна рухати.',
    subCompare: 'Якщо здавати не подобово, а на місяці й роки: менше клопоту й рівний дохід, але зазвичай менше грошей. Ставка за замовчуванням — медіана оголошень довгострокової оренди вілл із тією ж кількістю спалень поруч.',
    sample: (n, km, relaxed) => `${n} оголошень у радіусі ${km} км${relaxed ? ', включно з віллами на спальню більше чи менше' : ''}`,
    price: 'Ціна', rent: 'Оренда на місяць', months: 'Здана на рік', agent: 'Агент',
    monthsUnit: 'міс',
    perYearNoi: ' / рік чистими', payback: 'Окупність', capRate: 'Дохідність', irr: 'Дохідність за строк лізхолду',
    taxLabel: 'Податковий статус', taxBefore: 'До податків', resident: 'Резидент', nonResident: 'Нерезидент',
    howCalced: 'Як пораховано',
    revenue: 'Оренда за рік', agentFee: 'Комісія агента', upkeep: 'Басейн, сад, дрібний ремонт',
    upkeepHint: 'комунальні, прибирання й витратні матеріали сплачує орендар', ffe: 'Знос меблів', pbb: 'Податок на землю та будівлю (PBB)', landRent: 'Оренда землі за рік',
    tax: 'Податок з оренди', taxHintRes: 'фінальний, з валової суми', taxHintNonRes: 'для нерезидента, з валової суми', noi: 'Чистими',
    entry: 'Вхід', closing: 'нотаріус', furnishing: 'меблі',
    noCapital: 'За строк лізхолду вкладення не повертаються',
    nearby: 'Що здають поруч помісячно', perMonth: '/ міс', bedrooms: 'сп.',
    source: d => `Оголошення rumah123.com, вивантаження від ${d}.`,
  },
}

export function MonthlyCalculator({ snap, lang, price, setPrice }: { snap: Snapshot; lang: Lang; price: number; setPrice: (n: number) => void }) {
  const restricted = snap.flags.rentalRestricted
  const t = pickCopy(COPY, lang)
  const { currency } = useCurrency()
  const fmt = (n: number | null | undefined) => fmtMoney(n, currency)
  const m = snap.monthly!
  const basePrice = snap.villa.askingPrice

  // Цена и аренда — от десятой части до двойной: можно проверить любой свой сценарий.
  const rentLo = Math.max(10, Math.floor(m.p50 / 10 / 10) * 10)
  const rentHi = Math.max(rentLo + 50, Math.ceil(m.p50 * 2 / 50) * 50, Math.ceil(m.p75 * 1.5 / 50) * 50)
  const def = { price: basePrice ?? 0, rent: m.p50, months: MONTHS_RENTED.median, agent: Math.round(AGENT_FEE_PCT * 100) }
  const [rent, setRent] = useState<number>(def.rent)
  const [months, setMonths] = useState<number>(def.months)
  const [agent, setAgent] = useState<number>(def.agent)
  const changed = price !== def.price || rent !== def.rent || months !== def.months || agent !== def.agent
  const reset = () => { setPrice(def.price); setRent(def.rent); setMonths(def.months); setAgent(def.agent) }
  const [taxStatus, setTaxStatus] = useState<TaxStatus>('beforeTax')
  const [open, setOpen] = useState(false)
  useEffect(() => {
    saveCalc(snap.villaId, { mode: 'monthly', price, rent, months, agent, tax: taxStatus })
  }, [snap.villaId, price, rent, months, agent, taxStatus])

  const e = useMemo(() => computeMonthlyEconomics({
    rentMonth: rent, monthsRented: months, agentFeePct: agent / 100,
    area: snap.villa.area, bedrooms: snap.villa.bedrooms,
    askingPrice: basePrice != null ? price : null,
    leaseholdYearsLeft: snap.villa.leaseholdYearsLeft, taxStatus, furnished: snap.villa.furnished, landRentYear: snap.villa.landRentYear, region: snap.region,
  }), [rent, months, agent, price, basePrice, taxStatus, snap])

  return (
    <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        {/* Пояснение и откуда ставки — под значком i, как у посуточного (владелец 23.10.2026). */}
        <div className="flex items-center gap-1">
          <div className="text-[18px] font-semibold text-[var(--color-text)]">{t.title}</div>
          <InfoTip label={lang === 'ru' ? 'Как считаем' : 'How we calculate'} align="start">
            {restricted ? t.sub : t.subCompare}{' '}
            {m.ownN && m.ownDistrict && t.sampleMixed ? t.sampleMixed(m.n, m.ownN, lang === 'ru' ? (districtRu(m.ownDistrict) ?? m.ownDistrict) : m.ownDistrict, m.radiusKm) : t.sample(m.n, m.radiusKm, m.bedroomsRelaxed)}.
          </InfoTip>
        </div>
        <ResetButton onClick={reset} lang={lang} show={changed} />
      </div>

      {/* Слева ползунки в одну колонку, справа итог — как у посуточной. */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col gap-8">
        {basePrice != null && (
          <Slider label={t.price} value={price} min={Math.round(basePrice / 10 / 500) * 500} max={Math.round(basePrice * 2 / 500) * 500} step={500}
            onChange={setPrice} display={fmt(Math.round(price))} />
        )}
        <Slider label={t.rent} value={rent} min={rentLo} max={rentHi} step={10}
          onChange={setRent} display={fmt(Math.round(rent))} />
        <Slider label={t.months} value={months} min={6} max={12} step={1}
          onChange={setMonths} display={`${months} ${t.monthsUnit}`} />
        <Slider label={t.agent} value={agent} min={0} max={25} step={1}
          onChange={setAgent} display={`${agent}%`} />
      </div>

      <div className="flex flex-col gap-6 self-start rounded-xl bg-[var(--color-search-bg)] p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[13px] text-[var(--color-text-muted)]">{t.taxLabel}</span>
        <div className="flex w-full gap-1 rounded-lg border border-[var(--color-border)] bg-white p-1 sm:inline-flex sm:w-auto">
          {(['beforeTax', 'resident', 'nonResident'] as const).map(key => (
            <button key={key} type="button" onClick={() => setTaxStatus(key)} aria-pressed={taxStatus === key}
              className={`flex-auto cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12px] transition-colors sm:px-4 ${taxStatus === key ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
              {key === 'beforeTax' ? t.taxBefore : key === 'resident' ? t.resident : t.nonResident}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[32px] font-semibold leading-none text-[var(--color-text)]">
        {fmt(e.noi)}<span className="text-[14px] font-normal text-[var(--color-text-muted)]">{t.perYearNoi}</span>
      </div>
      <dl className="flex flex-col gap-3 text-[14px]">
        <div className="flex justify-between gap-4"><dt className="text-[var(--color-text-muted)]">{t.payback}</dt><dd className="font-semibold text-[var(--color-text)]">{fmtYears(e.payback, lang)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[var(--color-text-muted)]">{t.capRate}</dt><dd className="font-semibold text-[var(--color-text)]">{fmtPct(e.capRate, 1, lang)}</dd></div>
        {e.leaseholdIrr != null && (
          <div className="flex justify-between gap-4"><dt className="text-[var(--color-text-muted)]">{t.irr}</dt><dd className="font-semibold text-[var(--color-text)]">{fmtPct(e.leaseholdIrr, 1, lang)}</dd></div>
        )}
      </dl>

      {e.capitalReturned === false && (
        <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#991B1B]">
          {t.noCapital}{snap.villa.leaseholdYearsLeft != null ? ` — ${fmtYears(snap.villa.leaseholdYearsLeft, lang)}` : ''}
        </div>
      )}

      <button type="button" onClick={() => setOpen(o => !o)}
        className="inline-flex cursor-pointer items-center gap-1 self-start text-[13px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)]">
        {t.howCalced} {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      </div>
      </div>
      {open && (
        <ul className="mt-6 space-y-0.5 border-t border-[var(--color-border)] pt-2 text-[12px] text-[var(--color-text)]">
          <li>{t.revenue}: {fmt(e.revenue)}<span className="text-[var(--color-text-muted)]"> · {fmt(Math.round(e.rentMonth))} × {e.monthsRented}</span></li>
          <li>− {t.agentFee} ({agent}%): {fmt(e.agentFee)}</li>
          <li>− {t.upkeep}: {fmt(e.upkeep)}<span className="text-[var(--color-text-muted)]"> · {t.upkeepHint}</span></li>
          <li>− {t.ffe} ({Math.round(snap.region.ffeReservePct * 100)}%): {fmt(e.ffeReserve)}</li>
          {e.pbbTax > 0 && <li>− {t.pbb}: {fmt(e.pbbTax)}</li>}
          {e.landRent > 0 && <li>− {t.landRent}: {fmt(e.landRent)}</li>}
          {taxStatus !== 'beforeTax' && <li>− {t.tax} ({Math.round(e.taxRate * 100)}%): {fmt(e.tax)}<span className="text-[var(--color-text-muted)]"> · {taxStatus === 'resident' ? t.taxHintRes : t.taxHintNonRes}</span></li>}
          <li className="mt-1 border-t border-[var(--color-border)] pt-1 font-medium">= {t.noi}: {fmt(e.noi)}</li>
          {e.entryPrice != null && (
            <li className="mt-1 border-t border-[var(--color-border)] pt-2 text-[var(--color-text-muted)]">
              {t.entry}: {fmt(e.entryPrice)}{e.closingCost > 0 ? ` · ${fmt(Math.round(price))} + ${t.closing} ${fmt(e.closingCost)}` : ''}{e.furnishing > 0 ? ` + ${t.furnishing} ${fmt(e.furnishing)}` : ''}
            </li>
          )}
        </ul>
      )}

      {/* Лента «Что сдают рядом помесячно» убрана 23.10.2026: те же соседи — во вкладке
          «Будет ли спрос → Помесячно». */}
    </div>
  )
}
