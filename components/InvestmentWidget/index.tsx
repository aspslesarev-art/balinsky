'use client'

import { useEffect, useMemo, useState } from 'react'
import { RentalComps } from './RentalComps'
import { usePathname } from 'next/navigation'
import {
  Info, ChevronDown, ChevronUp, TrendingUp,
} from 'lucide-react'
import { InvestmentMap } from './InvestmentMap'
import { fmtMoney, fmtPct, fmtYears, fmtDistance, pluralRu, pluralEn } from './utils'
import type { Snapshot } from './types'
import { useCurrency } from '../CurrencyContext'
import { computeEconomics, type Economics, type TaxStatus } from '@/lib/investment/economics'
import { CURRENCY_RATES } from '@/lib/currency'
import { pickCopy, type Lang, detectLang } from '@/lib/i18n'

// Сколько промежутков рисуем прямо в дорожке ползунка ADR.
const ADR_ZONES = 40

const COPY = {
  ru: {
    sectionH2: 'Инвестиционный потенциал',
    sectionSub: 'Оценка сценариев аренды по матчингу с Booking-конкурентами и анализу района',
    confHigh: 'высокая уверенность',
    confMedium: 'средняя уверенность',
    confLow: 'низкая уверенность',
    object: ['объект', 'объекта', 'объектов'] as [string, string, string],
    villa: ['вилла', 'виллы', 'вилл'] as [string, string, string],
    similarVilla: ['похожая вилла', 'похожие виллы', 'похожих вилл'] as [string, string, string],
    restaurant: ['ресторан', 'ресторана', 'ресторанов'] as [string, string, string],
    perNight: ' / ночь',
    perYear: '/год',
    perYearNoi: ' / год NOI',
    expandedZone: (raw: string, applied: string) =>
      `Расширенная выборка: в исходной зоне (${raw}) не нашлось матчей, перешли на ${applied}.`,
    threeNumbers: 'Что значат эти три цифры',
    threeNumbersBody: (count: number, similar: string, zoneLower: string) =>
      <>Считаем, сколько эта вилла может зарабатывать на посуточной аренде. За основу — {count > 0 ? <><span className="font-medium text-[var(--color-text)]">{count}</span> {similar}</> : 'похожие виллы'} в той же зоне ({zoneLower}; на карте сверху — синие точки внутри красного круга).</>,
    threeNumbersScenarios:
      <>
        {' '}<strong className="text-[#B91C1C]">Плохой</strong> — пессимистичный прогноз, вилла стоит полупустой.{' '}
        <strong className="text-[var(--color-primary-pressed)]">Нормальный</strong> — то, что бывает чаще всего.{' '}
        <strong className="text-[#15803D]">Хороший</strong> — потолок, если работать с управляющей компанией и держать высокий рейтинг.
        {' '}Под сценариями есть карточки тех самых конкурентов — можно открыть и сравнить площадь / рейтинг / цену с этой виллой.
      </>,
    scenarioBad: 'Плохой', scenarioMedian: 'Нормальный', scenarioGood: 'Хороший',
    resetTitle: 'Сбросить к данным по конкурентам', reset: 'сбросить',
    inputPrice: 'Цена', inputAdr: 'ADR', inputOccupancy: 'Загрузка', inputMgmt: 'Mgmt fee',
    calcTitle: 'Калькулятор доходности',
    calcSub: 'Подвигайте ползунки. ADR и загрузка по умолчанию — медиана по похожим объектам на Booking поблизости; цену можно менять ±25%.',
    payback: 'Окупаемость', capRate: 'Cap rate',
    howCalced: 'Как считалось',
    revenue: 'Выручка', platform: 'Площадка', mgmt: 'Управление', opex: 'Расходы', tax: 'Налог', noi: 'Чистыми',
    phr: 'Налог на проживание', ffe: 'Резерв на износ', preTax: 'Прибыль до налога',
    entryPrice: 'Цена входа', closing: 'оформление', furnishing: 'меблировка',
    adrRealization: 'реализация ставки', opexFloorNote: 'базовый минимум',
    taxStatusLabel: 'Налоговый статус', taxResident: 'Резидент', taxNonResident: 'Нерезидент',
    taxStatusHint: 'Резидент с индонезийским NPWP платит 10%, нерезидент — 20%.',
    irrLabel: 'Доходность за срок аренды',
    noCapitalReturn: 'За оставшийся срок лизхолда объект не возвращает вложенное',
    noCapitalReturnHint: 'Сумма всех арендных поступлений до конца права аренды меньше цены входа.',
    utilities: 'Электричество и вода',
    staff: 'Уборка и персонал',
    supplies: 'Расходники для гостей',
    poolGarden: 'Бассейн и сад',
    otherOpex: 'Интернет, газ, мелкий ремонт',
    pbb: 'Налог на землю и здание (PBB)',
    assumptions: 'Допущения расчёта',
    occupancyNote: 'Загрузка',
    occupancyHint: 'отраслевой ориентир по Бали 55–65% годовых',
    platformHint: 'рынок 15–17%',
    mgmtHint: 'рынок 13–20%',
    phrHint: 'платит гость, если ставка объявлена без налога',
    ffeHint: 'мебель и техника изнашиваются за 5–7 лет',
    pbbHint: '0,2% от кадастровой оценки',
    taxHintRes: 'резидент с NPWP',
    taxHintNonRes: 'нерезидент, PPh 26',
    opexTitle: 'Операционные расходы',
    densityCommon: 'подтверждено рынком',
    densityAbove: 'выше большинства соседей',
    densityRare: 'единичные случаи рядом',
    densityNearby: 'Рядом в этом коридоре',
    densityNone: 'рядом никто так не сдаёт',
    densityScale: 'Сколько соседей сдают по этой ставке',
    referencesTitle: 'Малая выборка — показываем референсы',
    referencesBody: (n: number, plural: string) =>
      `В радиусе 2км нашлось всего ${n} ${plural}, подходящих под характеристики виллы. Агрегаты не считаем — даём конкретные примеры.`,
    restrictedTitle: 'Жёлтая земля — посуточная аренда не разрешена',
    restrictedBody: 'Объект на жёлтой (жилой) земле. По индонезийскому зонированию посуточная/туристическая аренда здесь нелегальна, поэтому доходность от посуточной аренды для него не считаем. Земля подходит под собственное проживание или долгосрочную аренду.',
    sqm: 'м²',
    similarOnBooking: (n: number) => `Похожие объекты на Booking · ${n}`,
    collapse: 'Свернуть',
    showAll: (n: number) => `Показать все ${n}`,
    newDistrictH3: 'Новый район',
    newDistrictBody:
      'Район в фазе раннего развития: в радиусе 1км менее 30 листингов на Booking. По траектории сопоставимых рынков (Berawa 2018→2022, Canggu 2014→2018) ADR может вырасти на 30–80% за 4–5 лет. Это историческая аналогия, не прогноз.',
    newDistrictFootnote: (n: number, plural: string) =>
      `Локально в радиусе 1км: ${n} ${plural} в общей сложности`,
    nearbyTitle: 'Что вокруг виллы',
    catBeach: 'Пляжи', catBeachclub: 'Beach clubs', catRestaurant: 'Рестораны',
    catCafe: 'Кафе', catWellness: 'Йога и фитнес', catNightlife: 'Бары и клубы',
    catAttraction: 'Достопримечательности', catIntlSchool: 'Международные школы',
    catSchool: 'Школы', catPreschool: 'Сады и ясли', catSupermarket: 'Магазины',
    catPharmacy: 'Аптеки', catHospital: 'Клиники',
  },
  en: {
    sectionH2: 'Investment potential',
    sectionSub: 'Rental scenarios estimated by matching against Booking competitors and analysing the area',
    confHigh: 'high confidence',
    confMedium: 'medium confidence',
    confLow: 'low confidence',
    object: ['listing', 'listings'] as [string, string],
    villa: ['villa', 'villas'] as [string, string],
    similarVilla: ['similar villa', 'similar villas'] as [string, string],
    restaurant: ['restaurant', 'restaurants'] as [string, string],
    perNight: ' / night',
    perYear: '/yr',
    perYearNoi: ' / year NOI',
    expandedZone: (raw: string, applied: string) =>
      `Expanded sample: no matches in the original zone (${raw}), switched to ${applied}.`,
    threeNumbers: 'What these three numbers mean',
    threeNumbersBody: (count: number, similar: string, zoneLower: string) =>
      <>We estimate what this villa could earn from short-term rentals. The baseline comes from {count > 0 ? <><span className="font-medium text-[var(--color-text)]">{count}</span> {similar}</> : 'similar villas'} in the same zone ({zoneLower}; on the map above — blue dots inside the red circle).</>,
    threeNumbersScenarios:
      <>
        {' '}<strong className="text-[#B91C1C]">Bad</strong> — pessimistic case, villa sits half empty.{' '}
        <strong className="text-[var(--color-primary-pressed)]">Normal</strong> — what tends to happen most often.{' '}
        <strong className="text-[#15803D]">Good</strong> — upper bound, with a strong management company and a high rating.
        {' '}Below the scenarios are the actual competitor cards — open them to compare area / rating / price with this villa.
      </>,
    scenarioBad: 'Bad', scenarioMedian: 'Normal', scenarioGood: 'Good',
    resetTitle: 'Reset to competitor-based defaults', reset: 'reset',
    inputPrice: 'Price', inputAdr: 'ADR', inputOccupancy: 'Occupancy', inputMgmt: 'Mgmt fee',
    calcTitle: 'Yield calculator',
    calcSub: 'Drag the sliders. ADR and occupancy default to the median of similar nearby Booking listings; the price can be adjusted ±25%.',
    payback: 'Payback', capRate: 'Cap rate',
    howCalced: 'How it was calculated',
    revenue: 'Revenue', platform: 'Platform', mgmt: 'Management', opex: 'Operating costs', tax: 'Tax', noi: 'Net to owner',
    phr: 'Accommodation tax', ffe: 'Wear-and-tear reserve', preTax: 'Profit before tax',
    entryPrice: 'Total entry cost', closing: 'closing', furnishing: 'furnishing',
    adrRealization: 'rate realization', opexFloorNote: 'baseline minimum',
    taxStatusLabel: 'Tax status', taxResident: 'Resident', taxNonResident: 'Non-resident',
    taxStatusHint: 'A resident with an Indonesian NPWP pays 10%, a non-resident 20%.',
    irrLabel: 'Return over lease term',
    noCapitalReturn: 'Over the remaining lease the property does not return what you put in',
    noCapitalReturnHint: 'Total rental income until the lease expires is less than the entry cost.',
    utilities: 'Electricity and water',
    staff: 'Cleaning and staff',
    supplies: 'Guest supplies',
    poolGarden: 'Pool and garden',
    otherOpex: 'Internet, gas, small repairs',
    pbb: 'Land and building tax (PBB)',
    assumptions: 'Assumptions',
    occupancyNote: 'Occupancy',
    occupancyHint: 'industry benchmark for Bali is 55–65% a year',
    platformHint: 'market 15–17%',
    mgmtHint: 'market 13–20%',
    phrHint: 'paid by the guest when the rate excludes tax',
    ffeHint: 'furniture and appliances wear out in 5–7 years',
    pbbHint: '0.2% of the assessed value',
    taxHintRes: 'resident with NPWP',
    taxHintNonRes: 'non-resident, PPh 26',
    opexTitle: 'Operating costs',
    densityCommon: 'confirmed by the market',
    densityAbove: 'above most neighbours',
    densityRare: 'few comparable cases',
    densityNearby: 'Nearby in this range',
    densityNone: 'no neighbours charge this',
    densityScale: 'How many neighbours charge this rate',
    referencesTitle: 'Small sample — showing reference listings',
    referencesBody: (n: number, plural: string) =>
      `Only ${n} ${plural} matched the villa's profile within a 2 km radius. We're not aggregating — here are concrete examples instead.`,
    restrictedTitle: 'Residential land — daily rental not permitted',
    restrictedBody: "This property sits on yellow (residential) land. Under Indonesian zoning, short-term / tourist rental is not legal here, so we don't compute a daily-rental yield for it. The land suits personal use or long-term rental.",
    sqm: 'm²',
    similarOnBooking: (n: number) => `Similar listings on Booking · ${n}`,
    collapse: 'Collapse',
    showAll: (n: number) => `Show all ${n}`,
    newDistrictH3: 'Emerging district',
    newDistrictBody:
      'The district is in an early growth phase: fewer than 30 Booking listings within a 1 km radius. Following the trajectory of comparable markets (Berawa 2018→2022, Canggu 2014→2018) ADR can rise 30–80% over 4–5 years. This is a historical analogy, not a forecast.',
    newDistrictFootnote: (n: number, plural: string) =>
      `In total within a 1 km radius: ${n} ${plural}`,
    nearbyTitle: 'Around the villa',
    catBeach: 'Beaches', catBeachclub: 'Beach clubs', catRestaurant: 'Restaurants',
    catCafe: 'Cafés', catWellness: 'Yoga & fitness', catNightlife: 'Bars & clubs',
    catAttraction: 'Attractions', catIntlSchool: 'International schools',
    catSchool: 'Schools', catPreschool: 'Nurseries & preschools', catSupermarket: 'Supermarkets',
    catPharmacy: 'Pharmacies', catHospital: 'Clinics',
  },
  id: {
    sectionH2: 'Potensi investasi',
    sectionSub: 'Skenario sewa diperkirakan dengan mencocokkan pesaing Booking dan menganalisis kawasan',
    confHigh: 'keyakinan tinggi',
    confMedium: 'keyakinan sedang',
    confLow: 'keyakinan rendah',
    object: ['listing', 'listing'] as [string, string],
    villa: ['vila', 'vila'] as [string, string],
    similarVilla: ['vila serupa', 'vila serupa'] as [string, string],
    restaurant: ['restoran', 'restoran'] as [string, string],
    perNight: ' / malam',
    perYear: '/thn',
    perYearNoi: ' / tahun NOI',
    expandedZone: (raw: string, applied: string) =>
      `Sampel diperluas: tidak ada kecocokan di zona awal (${raw}), beralih ke ${applied}.`,
    threeNumbers: 'Arti ketiga angka ini',
    threeNumbersBody: (count: number, similar: string, zoneLower: string) =>
      <>Kami memperkirakan potensi pendapatan vila ini dari sewa jangka pendek. Dasarnya diambil dari {count > 0 ? <><span className="font-medium text-[var(--color-text)]">{count}</span> {similar}</> : 'vila serupa'} di zona yang sama ({zoneLower}; di peta atas — titik biru di dalam lingkaran merah).</>,
    threeNumbersScenarios:
      <>
        {' '}<strong className="text-[#B91C1C]">Buruk</strong> — skenario pesimis, vila setengah kosong.{' '}
        <strong className="text-[var(--color-primary-pressed)]">Normal</strong> — yang paling sering terjadi.{' '}
        <strong className="text-[#15803D]">Baik</strong> — batas atas, dengan perusahaan pengelola yang kuat dan rating tinggi.
        {' '}Di bawah skenario ada kartu pesaing sesungguhnya — buka untuk membandingkan luas / rating / harga dengan vila ini.
      </>,
    scenarioBad: 'Buruk', scenarioMedian: 'Normal', scenarioGood: 'Baik',
    resetTitle: 'Setel ulang ke nilai default berbasis pesaing', reset: 'setel ulang',
    inputPrice: 'Harga', inputAdr: 'ADR', inputOccupancy: 'Okupansi', inputMgmt: 'Biaya pengelolaan',
    calcTitle: 'Kalkulator imbal hasil',
    calcSub: 'Geser slider. ADR dan okupansi secara default memakai median listing Booking serupa di sekitar; harga bisa disesuaikan ±25%.',
    payback: 'Balik modal', capRate: 'Cap rate',
    howCalced: 'Cara perhitungannya',
    revenue: 'Pendapatan', platform: 'Platform', mgmt: 'Pengelolaan', opex: 'Biaya operasional', tax: 'Pajak', noi: 'Bersih untuk pemilik',
    phr: 'Pajak hotel (PHR)', ffe: 'Cadangan penyusutan', preTax: 'Laba sebelum pajak',
    entryPrice: 'Total biaya masuk', closing: 'balik nama', furnishing: 'perabotan',
    adrRealization: 'realisasi tarif', opexFloorNote: 'minimum dasar',
    taxStatusLabel: 'Status pajak', taxResident: 'Residen', taxNonResident: 'Non-residen',
    taxStatusHint: 'Residen dengan NPWP membayar 10%, non-residen 20%.',
    irrLabel: 'Imbal hasil selama masa sewa',
    noCapitalReturn: 'Sampai masa sewa berakhir, properti tidak mengembalikan modal',
    noCapitalReturnHint: 'Total pendapatan sewa hingga hak sewa berakhir lebih kecil dari biaya masuk.',
    utilities: 'Listrik dan air',
    staff: 'Kebersihan dan staf',
    supplies: 'Perlengkapan tamu',
    poolGarden: 'Kolam dan taman',
    otherOpex: 'Internet, gas, perbaikan kecil',
    pbb: 'Pajak bumi dan bangunan (PBB)',
    assumptions: 'Asumsi perhitungan',
    occupancyNote: 'Tingkat hunian',
    occupancyHint: 'acuan industri Bali 55–65% per tahun',
    platformHint: 'pasar 15–17%',
    mgmtHint: 'pasar 13–20%',
    phrHint: 'dibayar tamu bila tarif belum termasuk pajak',
    ffeHint: 'perabot dan peralatan aus dalam 5–7 tahun',
    pbbHint: '0,2% dari NJOP',
    taxHintRes: 'residen dengan NPWP',
    taxHintNonRes: 'non-residen, PPh 26',
    opexTitle: 'Biaya operasional',
    densityCommon: 'terkonfirmasi pasar',
    densityAbove: 'di atas kebanyakan tetangga',
    densityRare: 'kasus serupa sedikit',
    densityNearby: 'Di sekitar pada kisaran ini',
    densityNone: 'tidak ada tetangga pada tarif ini',
    densityScale: 'Berapa tetangga memasang tarif ini',
    referencesTitle: 'Sampel kecil — menampilkan listing referensi',
    referencesBody: (n: number, plural: string) =>
      `Hanya ${n} ${plural} yang cocok dengan profil vila dalam radius 2 km. Kami tidak mengagregasi — berikut contoh konkretnya.`,
    restrictedTitle: 'Tanah hunian — sewa harian tidak diizinkan',
    restrictedBody: 'Properti ini berada di tanah kuning (hunian). Menurut zonasi Indonesia, sewa jangka pendek / turis tidak legal di sini, jadi kami tidak menghitung imbal hasil sewa harian untuknya. Tanah ini cocok untuk hunian pribadi atau sewa jangka panjang.',
    sqm: 'm²',
    similarOnBooking: (n: number) => `Listing serupa di Booking · ${n}`,
    collapse: 'Tutup',
    showAll: (n: number) => `Tampilkan semua ${n}`,
    newDistrictH3: 'Kawasan berkembang',
    newDistrictBody:
      'Kawasan ini dalam fase pertumbuhan awal: kurang dari 30 listing Booking dalam radius 1 km. Mengikuti tren pasar sebanding (Berawa 2018→2022, Canggu 2014→2018), ADR bisa naik 30–80% dalam 4–5 tahun. Ini analogi historis, bukan prakiraan.',
    newDistrictFootnote: (n: number, plural: string) =>
      `Total dalam radius 1 km: ${n} ${plural}`,
    nearbyTitle: 'Di sekitar vila',
    catBeach: 'Pantai', catBeachclub: 'Beach club', catRestaurant: 'Restoran',
    catCafe: 'Kafe', catWellness: 'Yoga & kebugaran', catNightlife: 'Bar & klub',
    catAttraction: 'Atraksi', catIntlSchool: 'Sekolah internasional',
    catSchool: 'Sekolah', catPreschool: 'PAUD & TK', catSupermarket: 'Supermarket',
    catPharmacy: 'Apotek', catHospital: 'Klinik',
  },
  fr: {
    sectionH2: 'Potentiel d\'investissement',
    sectionSub: 'Scénarios locatifs estimés par comparaison avec les concurrents Booking et analyse du quartier',
    confHigh: 'confiance élevée',
    confMedium: 'confiance moyenne',
    confLow: 'confiance faible',
    object: ['annonce', 'annonces'] as [string, string],
    villa: ['villa', 'villas'] as [string, string],
    similarVilla: ['villa similaire', 'villas similaires'] as [string, string],
    restaurant: ['restaurant', 'restaurants'] as [string, string],
    perNight: ' / nuit',
    perYear: '/an',
    perYearNoi: ' / an NOI',
    expandedZone: (raw: string, applied: string) =>
      `Échantillon élargi : aucune correspondance dans la zone initiale (${raw}), passage à ${applied}.`,
    threeNumbers: 'Ce que signifient ces trois chiffres',
    threeNumbersBody: (count: number, similar: string, zoneLower: string) =>
      <>Nous estimons ce que cette villa pourrait rapporter en location courte durée. La base provient de {count > 0 ? <><span className="font-medium text-[var(--color-text)]">{count}</span> {similar}</> : 'villas similaires'} dans la même zone ({zoneLower} ; sur la carte ci-dessus — points bleus à l&apos;intérieur du cercle rouge).</>,
    threeNumbersScenarios:
      <>
        {' '}<strong className="text-[#B91C1C]">Mauvais</strong> — cas pessimiste, la villa reste à moitié vide.{' '}
        <strong className="text-[var(--color-primary-pressed)]">Normal</strong> — ce qui arrive le plus souvent.{' '}
        <strong className="text-[#15803D]">Bon</strong> — plafond, avec une bonne société de gestion et une note élevée.
        {' '}Sous les scénarios se trouvent les fiches des concurrents réels — ouvrez-les pour comparer surface / note / prix avec cette villa.
      </>,
    scenarioBad: 'Mauvais', scenarioMedian: 'Normal', scenarioGood: 'Bon',
    resetTitle: 'Réinitialiser aux valeurs par défaut basées sur les concurrents', reset: 'réinitialiser',
    inputPrice: 'Prix', inputAdr: 'ADR', inputOccupancy: 'Occupation', inputMgmt: 'Frais de gestion',
    calcTitle: 'Calculateur de rendement',
    calcSub: 'Déplacez les curseurs. L\'ADR et l\'occupation prennent par défaut la médiane des annonces Booking similaires à proximité ; le prix est ajustable de ±25 %.',
    payback: 'Amortissement', capRate: 'Cap rate',
    howCalced: 'Méthode de calcul',
    revenue: 'Revenus', platform: 'Plateforme', mgmt: 'Gestion', opex: 'Charges d\'exploitation', tax: 'Impôt', noi: 'Net propriétaire',
    phr: 'Taxe de séjour', ffe: 'Réserve d\'usure', preTax: 'Bénéfice avant impôt',
    entryPrice: 'Coût d\'entrée total', closing: 'frais de notaire', furnishing: 'ameublement',
    adrRealization: 'réalisation du tarif', opexFloorNote: 'minimum de base',
    taxStatusLabel: 'Statut fiscal', taxResident: 'Résident', taxNonResident: 'Non-résident',
    taxStatusHint: 'Un résident avec un NPWP indonésien paie 10%, un non-résident 20%.',
    irrLabel: 'Rendement sur la durée du bail',
    noCapitalReturn: 'Sur la durée restante du bail, le bien ne rembourse pas la mise',
    noCapitalReturnHint: 'Le total des loyers jusqu\'à l\'expiration du bail est inférieur au coût d\'entrée.',
    utilities: 'Électricité et eau',
    staff: 'Ménage et personnel',
    supplies: 'Fournitures pour les hôtes',
    poolGarden: 'Piscine et jardin',
    otherOpex: 'Internet, gaz, petites réparations',
    pbb: 'Taxe foncière (PBB)',
    assumptions: 'Hypothèses de calcul',
    occupancyNote: 'Taux d’occupation',
    occupancyHint: 'référence du marché balinais : 55–65% par an',
    platformHint: 'marché 15–17%',
    mgmtHint: 'marché 13–20%',
    phrHint: 'payée par le client si le tarif est hors taxe',
    ffeHint: 'mobilier et équipements s’usent en 5–7 ans',
    pbbHint: '0,2% de la valeur cadastrale',
    taxHintRes: 'résident avec NPWP',
    taxHintNonRes: 'non-résident, PPh 26',
    opexTitle: 'Charges d’exploitation',
    densityCommon: 'confirmé par le marché',
    densityAbove: 'au-dessus de la plupart des voisins',
    densityRare: 'cas comparables rares',
    densityNearby: 'À proximité dans cette fourchette',
    densityNone: 'aucun voisin à ce tarif',
    densityScale: 'Combien de voisins pratiquent ce tarif',
    referencesTitle: 'Échantillon réduit — annonces de référence affichées',
    referencesBody: (n: number, plural: string) =>
      `Seulement ${n} ${plural} correspondent au profil de la villa dans un rayon de 2 km. Nous n'agrégeons pas — voici plutôt des exemples concrets.`,
    restrictedTitle: 'Terrain résidentiel — location journalière non autorisée',
    restrictedBody: "Ce bien se situe sur un terrain jaune (résidentiel). Selon le zonage indonésien, la location courte durée / touristique n'y est pas légale, nous ne calculons donc pas de rendement locatif journalier. Le terrain convient à un usage personnel ou à la location longue durée.",
    sqm: 'm²',
    similarOnBooking: (n: number) => `Annonces similaires sur Booking · ${n}`,
    collapse: 'Réduire',
    showAll: (n: number) => `Afficher les ${n}`,
    newDistrictH3: 'Quartier émergent',
    newDistrictBody:
      "Le quartier est en phase de croissance précoce : moins de 30 annonces Booking dans un rayon de 1 km. En suivant la trajectoire de marchés comparables (Berawa 2018→2022, Canggu 2014→2018), l'ADR peut augmenter de 30–80 % en 4–5 ans. C'est une analogie historique, pas une prévision.",
    newDistrictFootnote: (n: number, plural: string) =>
      `Au total dans un rayon de 1 km : ${n} ${plural}`,
    nearbyTitle: 'Autour de la villa',
    catBeach: 'Plages', catBeachclub: 'Beach clubs', catRestaurant: 'Restaurants',
    catCafe: 'Cafés', catWellness: 'Yoga & fitness', catNightlife: 'Bars & clubs',
    catAttraction: 'Attractions', catIntlSchool: 'Écoles internationales',
    catSchool: 'Écoles', catPreschool: 'Crèches & maternelles', catSupermarket: 'Supermarchés',
    catPharmacy: 'Pharmacies', catHospital: 'Cliniques',
  },
  de: {
    sectionH2: 'Investitionspotenzial',
    sectionSub: 'Mietszenarien geschätzt durch Abgleich mit Booking-Wettbewerbern und Analyse der Region',
    confHigh: 'hohe Sicherheit',
    confMedium: 'mittlere Sicherheit',
    confLow: 'geringe Sicherheit',
    object: ['Angebot', 'Angebote'] as [string, string],
    villa: ['Villa', 'Villen'] as [string, string],
    similarVilla: ['ähnliche Villa', 'ähnliche Villen'] as [string, string],
    restaurant: ['Restaurant', 'Restaurants'] as [string, string],
    perNight: ' / Nacht',
    perYear: '/Jahr',
    perYearNoi: ' / Jahr NOI',
    expandedZone: (raw: string, applied: string) =>
      `Erweiterte Stichprobe: keine Treffer in der ursprünglichen Zone (${raw}), gewechselt zu ${applied}.`,
    threeNumbers: 'Was diese drei Zahlen bedeuten',
    threeNumbersBody: (count: number, similar: string, zoneLower: string) =>
      <>Wir schätzen, was diese Villa mit Kurzzeitvermietung verdienen könnte. Die Basis stammt aus {count > 0 ? <><span className="font-medium text-[var(--color-text)]">{count}</span> {similar}</> : 'ähnlichen Villen'} in derselben Zone ({zoneLower}; auf der Karte oben — blaue Punkte innerhalb des roten Kreises).</>,
    threeNumbersScenarios:
      <>
        {' '}<strong className="text-[#B91C1C]">Schlecht</strong> — pessimistischer Fall, die Villa steht halb leer.{' '}
        <strong className="text-[var(--color-primary-pressed)]">Normal</strong> — was am häufigsten vorkommt.{' '}
        <strong className="text-[#15803D]">Gut</strong> — Obergrenze, mit einer starken Hausverwaltung und hoher Bewertung.
        {' '}Unter den Szenarien stehen die tatsächlichen Wettbewerberkarten — öffnen Sie sie, um Fläche / Bewertung / Preis mit dieser Villa zu vergleichen.
      </>,
    scenarioBad: 'Schlecht', scenarioMedian: 'Normal', scenarioGood: 'Gut',
    resetTitle: 'Auf wettbewerbsbasierte Standardwerte zurücksetzen', reset: 'zurücksetzen',
    inputPrice: 'Preis', inputAdr: 'ADR', inputOccupancy: 'Auslastung', inputMgmt: 'Verwaltungsgebühr',
    calcTitle: 'Rendite-Rechner',
    calcSub: 'Bewegen Sie die Regler. ADR und Auslastung entsprechen standardmäßig dem Median ähnlicher Booking-Angebote in der Nähe; der Preis ist um ±25% anpassbar.',
    payback: 'Amortisation', capRate: 'Cap Rate',
    howCalced: 'Wie es berechnet wurde',
    revenue: 'Umsatz', platform: 'Plattform', mgmt: 'Verwaltung', opex: 'Betriebskosten', tax: 'Steuer', noi: 'Netto für Eigentümer',
    phr: 'Beherbergungssteuer', ffe: 'Abnutzungsrücklage', preTax: 'Gewinn vor Steuern',
    entryPrice: 'Gesamte Einstiegskosten', closing: 'Abwicklung', furnishing: 'Möblierung',
    adrRealization: 'Ratenrealisierung', opexFloorNote: 'Grundminimum',
    taxStatusLabel: 'Steuerstatus', taxResident: 'Ansässig', taxNonResident: 'Nicht ansässig',
    taxStatusHint: 'Ansässige mit indonesischer NPWP zahlen 10%, Nichtansässige 20%.',
    irrLabel: 'Rendite über die Pachtdauer',
    noCapitalReturn: 'Über die Restlaufzeit der Pacht kommt das eingesetzte Kapital nicht zurück',
    noCapitalReturnHint: 'Die gesamten Mieteinnahmen bis zum Pachtende liegen unter den Einstiegskosten.',
    utilities: 'Strom und Wasser',
    staff: 'Reinigung und Personal',
    supplies: 'Gästebedarf',
    poolGarden: 'Pool und Garten',
    otherOpex: 'Internet, Gas, kleine Reparaturen',
    pbb: 'Grundsteuer (PBB)',
    assumptions: 'Annahmen der Rechnung',
    occupancyNote: 'Auslastung',
    occupancyHint: 'Branchenwert für Bali: 55–65% pro Jahr',
    platformHint: 'Markt 15–17%',
    mgmtHint: 'Markt 13–20%',
    phrHint: 'zahlt der Gast, wenn die Rate ohne Steuer ausgewiesen ist',
    ffeHint: 'Möbel und Technik verschleißen in 5–7 Jahren',
    pbbHint: '0,2% des Katasterwerts',
    taxHintRes: 'ansässig mit NPWP',
    taxHintNonRes: 'nicht ansässig, PPh 26',
    opexTitle: 'Betriebskosten',
    densityCommon: 'vom Markt bestätigt',
    densityAbove: 'über den meisten Nachbarn',
    densityRare: 'kaum vergleichbare Fälle',
    densityNearby: 'In der Nähe in dieser Spanne',
    densityNone: 'kein Nachbar verlangt das',
    densityScale: 'Wie viele Nachbarn diesen Preis nehmen',
    referencesTitle: 'Kleine Stichprobe — Referenzangebote werden gezeigt',
    referencesBody: (n: number, plural: string) =>
      `Nur ${n} ${plural} entsprachen dem Profil der Villa im Umkreis von 2 km. Wir aggregieren nicht — hier stattdessen konkrete Beispiele.`,
    restrictedTitle: 'Wohnland — Tagesvermietung nicht erlaubt',
    restrictedBody: 'Dieses Objekt liegt auf gelbem (Wohn-)Land. Nach indonesischer Zonierung ist Kurzzeit-/Touristenvermietung hier nicht legal, daher berechnen wir keine Tagesvermietungsrendite dafür. Das Land eignet sich zur Eigennutzung oder Langzeitvermietung.',
    sqm: 'm²',
    similarOnBooking: (n: number) => `Ähnliche Angebote auf Booking · ${n}`,
    collapse: 'Einklappen',
    showAll: (n: number) => `Alle ${n} anzeigen`,
    newDistrictH3: 'Aufstrebende Region',
    newDistrictBody:
      'Die Region ist in einer frühen Wachstumsphase: weniger als 30 Booking-Angebote im Umkreis von 1 km. Nach der Entwicklung vergleichbarer Märkte (Berawa 2018→2022, Canggu 2014→2018) kann der ADR über 4–5 Jahre um 30–80% steigen. Dies ist eine historische Analogie, keine Prognose.',
    newDistrictFootnote: (n: number, plural: string) =>
      `Insgesamt im Umkreis von 1 km: ${n} ${plural}`,
    nearbyTitle: 'Rund um die Villa',
    catBeach: 'Strände', catBeachclub: 'Beach Clubs', catRestaurant: 'Restaurants',
    catCafe: 'Cafés', catWellness: 'Yoga & Fitness', catNightlife: 'Bars & Clubs',
    catAttraction: 'Sehenswürdigkeiten', catIntlSchool: 'Internationale Schulen',
    catSchool: 'Schulen', catPreschool: 'Kitas & Vorschulen', catSupermarket: 'Supermärkte',
    catPharmacy: 'Apotheken', catHospital: 'Kliniken',
  },
  zh: {
    sectionH2: '投资潜力',
    sectionSub: '通过与Booking竞品匹配并分析区域来估算租赁情景',
    confHigh: '高置信度',
    confMedium: '中等置信度',
    confLow: '低置信度',
    object: ['套房源', '套房源'] as [string, string],
    villa: ['别墅', '别墅'] as [string, string],
    similarVilla: ['类似别墅', '类似别墅'] as [string, string],
    restaurant: ['餐厅', '餐厅'] as [string, string],
    perNight: ' / 晚',
    perYear: '/年',
    perYearNoi: ' / 年 NOI',
    expandedZone: (raw: string, applied: string) =>
      `扩大样本：原始区域（${raw}）没有匹配，已切换到 ${applied}。`,
    threeNumbers: '这三个数字的含义',
    threeNumbersBody: (count: number, similar: string, zoneLower: string) =>
      <>我们估算这套别墅通过短租可能赚多少。基准来自同一区域内的 {count > 0 ? <><span className="font-medium text-[var(--color-text)]">{count}</span> {similar}</> : '类似别墅'}（{zoneLower}；上方地图中——红圈内的蓝点）。</>,
    threeNumbersScenarios:
      <>
        {' '}<strong className="text-[#B91C1C]">差</strong> — 悲观情形，别墅半空置。{' '}
        <strong className="text-[var(--color-primary-pressed)]">正常</strong> — 最常出现的情况。{' '}
        <strong className="text-[#15803D]">好</strong> — 上限，配备强物业管理公司并保持高评分。
        {' '}情景下方是实际竞品卡片——可打开对比面积/评分/价格与这套别墅。
      </>,
    scenarioBad: '差', scenarioMedian: '正常', scenarioGood: '好',
    resetTitle: '重置为基于竞品的默认值', reset: '重置',
    inputPrice: '价格', inputAdr: 'ADR', inputOccupancy: '入住率', inputMgmt: '管理费',
    calcTitle: '收益计算器',
    calcSub: '拖动滑块。ADR和入住率默认取附近类似Booking房源的中位数；价格可调整±25%。',
    payback: '回本周期', capRate: '资本化率',
    howCalced: '如何计算',
    revenue: '收入', platform: '平台', mgmt: '管理', opex: '运营支出', tax: '税费', noi: '业主净收入',
    phr: '住宿税', ffe: '折旧准备金', preTax: '税前利润',
    entryPrice: '总入手成本', closing: '过户', furnishing: '家具',
    adrRealization: '房价实现率', opexFloorNote: '基础最低值',
    taxStatusLabel: '税务身份', taxResident: '居民', taxNonResident: '非居民',
    taxStatusHint: '持印尼税号的居民缴纳10%，非居民缴纳20%。',
    irrLabel: '租期内回报率',
    noCapitalReturn: '在剩余租期内，该物业无法收回投入',
    noCapitalReturnHint: '到租约期满为止的租金总额低于入手成本。',
    utilities: '水电费',
    staff: '保洁与人员',
    supplies: '客用消耗品',
    poolGarden: '泳池与花园',
    otherOpex: '网络、燃气、小修',
    pbb: '土地与房产税（PBB）',
    assumptions: '计算假设',
    occupancyNote: '入住率',
    occupancyHint: '巴厘岛行业基准为每年55–65%',
    platformHint: '市场15–17%',
    mgmtHint: '市场13–20%',
    phrHint: '若标价不含税则由房客支付',
    ffeHint: '家具与电器5–7年折旧',
    pbbHint: '核定价值的0.2%',
    taxHintRes: '持NPWP的居民',
    taxHintNonRes: '非居民，PPh 26',
    opexTitle: '运营支出',
    densityCommon: '已被市场验证',
    densityAbove: '高于多数邻近房源',
    densityRare: '可比案例很少',
    densityNearby: '该价格区间的周边房源',
    densityNone: '周边无人以此价出租',
    densityScale: '多少邻近房源采用该价格',
    referencesTitle: '样本较小——展示参考房源',
    referencesBody: (n: number, plural: string) =>
      `在2公里半径内只有 ${n} ${plural} 符合别墅的特征。我们不做汇总——而是给出具体示例。`,
    restrictedTitle: '住宅用地——不允许日租',
    restrictedBody: '该房产位于黄色（住宅）用地。按印尼分区规定，此处短租/旅游出租不合法，因此我们不为其计算日租收益。该地块适合自住或长期出租。',
    sqm: 'm²',
    similarOnBooking: (n: number) => `Booking上的类似房源 · ${n}`,
    collapse: '收起',
    showAll: (n: number) => `显示全部 ${n}`,
    newDistrictH3: '新兴区域',
    newDistrictBody:
      '该区域处于早期成长阶段：1公里半径内Booking房源不足30处。参照可比市场的轨迹（Berawa 2018→2022，Canggu 2014→2018），ADR在4–5年内可能上涨30–80%。这是历史类比，并非预测。',
    newDistrictFootnote: (n: number, plural: string) =>
      `1公里半径内共计：${n} ${plural}`,
    nearbyTitle: '别墅周边',
    catBeach: '海滩', catBeachclub: '海滩俱乐部', catRestaurant: '餐厅',
    catCafe: '咖啡馆', catWellness: '瑜伽与健身', catNightlife: '酒吧与夜店',
    catAttraction: '景点', catIntlSchool: '国际学校',
    catSchool: '学校', catPreschool: '托儿所与幼儿园', catSupermarket: '超市',
    catPharmacy: '药店', catHospital: '诊所',
  },
  nl: {
    sectionH2: 'Investeringspotentieel',
    sectionSub: 'Huurscenario\'s geschat door vergelijking met Booking-concurrenten en analyse van de regio',
    confHigh: 'hoge zekerheid',
    confMedium: 'gemiddelde zekerheid',
    confLow: 'lage zekerheid',
    object: ['advertentie', 'advertenties'] as [string, string],
    villa: ['villa', "villa's"] as [string, string],
    similarVilla: ['vergelijkbare villa', "vergelijkbare villa's"] as [string, string],
    restaurant: ['restaurant', 'restaurants'] as [string, string],
    perNight: ' / nacht',
    perYear: '/jr',
    perYearNoi: ' / jaar NOI',
    expandedZone: (raw: string, applied: string) =>
      `Uitgebreide steekproef: geen matches in de oorspronkelijke zone (${raw}), overgeschakeld naar ${applied}.`,
    threeNumbers: 'Wat deze drie cijfers betekenen',
    threeNumbersBody: (count: number, similar: string, zoneLower: string) =>
      <>We schatten wat deze villa zou kunnen opbrengen met kortverhuur. De basis komt van {count > 0 ? <><span className="font-medium text-[var(--color-text)]">{count}</span> {similar}</> : "vergelijkbare villa's"} in dezelfde zone ({zoneLower}; op de kaart hierboven — blauwe stippen binnen de rode cirkel).</>,
    threeNumbersScenarios:
      <>
        {' '}<strong className="text-[#B91C1C]">Slecht</strong> — pessimistisch geval, de villa staat half leeg.{' '}
        <strong className="text-[var(--color-primary-pressed)]">Normaal</strong> — wat het vaakst voorkomt.{' '}
        <strong className="text-[#15803D]">Goed</strong> — bovengrens, met een sterke beheermaatschappij en een hoge beoordeling.
        {' '}Onder de scenario\'s staan de echte concurrentkaarten — open ze om oppervlakte / beoordeling / prijs met deze villa te vergelijken.
      </>,
    scenarioBad: 'Slecht', scenarioMedian: 'Normaal', scenarioGood: 'Goed',
    resetTitle: 'Terugzetten naar op concurrenten gebaseerde standaardwaarden', reset: 'reset',
    inputPrice: 'Prijs', inputAdr: 'ADR', inputOccupancy: 'Bezetting', inputMgmt: 'Beheerkosten',
    calcTitle: 'Rendementscalculator',
    calcSub: 'Sleep de schuifregelaars. ADR en bezetting nemen standaard de mediaan van vergelijkbare Booking-advertenties in de buurt; de prijs is met ±25% aanpasbaar.',
    payback: 'Terugverdientijd', capRate: 'Cap rate',
    howCalced: 'Hoe het is berekend',
    revenue: 'Omzet', platform: 'Platform', mgmt: 'Beheer', opex: 'Exploitatiekosten', tax: 'Belasting', noi: 'Netto voor eigenaar',
    phr: 'Verblijfsbelasting', ffe: 'Slijtagereserve', preTax: 'Winst voor belasting',
    entryPrice: 'Totale instapkosten', closing: 'overdracht', furnishing: 'inrichting',
    adrRealization: 'tariefrealisatie', opexFloorNote: 'basisminimum',
    taxStatusLabel: 'Fiscale status', taxResident: 'Ingezetene', taxNonResident: 'Niet-ingezetene',
    taxStatusHint: 'Een ingezetene met Indonesische NPWP betaalt 10%, een niet-ingezetene 20%.',
    irrLabel: 'Rendement over de pachttermijn',
    noCapitalReturn: 'Binnen de resterende pachttermijn verdient het object de inleg niet terug',
    noCapitalReturnHint: 'De totale huurinkomsten tot het einde van de pacht zijn lager dan de instapkosten.',
    utilities: 'Elektriciteit en water',
    staff: 'Schoonmaak en personeel',
    supplies: 'Gastbenodigdheden',
    poolGarden: 'Zwembad en tuin',
    otherOpex: 'Internet, gas, klein onderhoud',
    pbb: 'Grond- en gebouwbelasting (PBB)',
    assumptions: 'Aannames',
    occupancyNote: 'Bezetting',
    occupancyHint: 'branchemaatstaf voor Bali: 55–65% per jaar',
    platformHint: 'markt 15–17%',
    mgmtHint: 'markt 13–20%',
    phrHint: 'betaald door de gast als het tarief exclusief belasting is',
    ffeHint: 'meubels en apparatuur slijten in 5–7 jaar',
    pbbHint: '0,2% van de kadastrale waarde',
    taxHintRes: 'ingezetene met NPWP',
    taxHintNonRes: 'niet-ingezetene, PPh 26',
    opexTitle: 'Exploitatiekosten',
    densityCommon: 'door de markt bevestigd',
    densityAbove: 'boven de meeste buren',
    densityRare: 'weinig vergelijkbare gevallen',
    densityNearby: 'In de buurt in deze range',
    densityNone: 'geen buur vraagt dit',
    densityScale: 'Hoeveel buren vragen dit tarief',
    referencesTitle: 'Kleine steekproef — referentieadvertenties getoond',
    referencesBody: (n: number, plural: string) =>
      `Slechts ${n} ${plural} kwamen overeen met het profiel van de villa binnen een straal van 2 km. We aggregeren niet — hier in plaats daarvan concrete voorbeelden.`,
    restrictedTitle: 'Woongrond — dagverhuur niet toegestaan',
    restrictedBody: 'Dit object staat op gele (woon-)grond. Volgens de Indonesische bestemming is kortverhuur / toeristische verhuur hier niet legaal, dus berekenen we er geen dagverhuurrendement voor. De grond is geschikt voor eigen gebruik of langetermijnverhuur.',
    sqm: 'm²',
    similarOnBooking: (n: number) => `Vergelijkbare advertenties op Booking · ${n}`,
    collapse: 'Inklappen',
    showAll: (n: number) => `Toon alle ${n}`,
    newDistrictH3: 'Opkomende regio',
    newDistrictBody:
      'De regio zit in een vroege groeifase: minder dan 30 Booking-advertenties binnen een straal van 1 km. Volgens het traject van vergelijkbare markten (Berawa 2018→2022, Canggu 2014→2018) kan de ADR over 4–5 jaar met 30–80% stijgen. Dit is een historische analogie, geen voorspelling.',
    newDistrictFootnote: (n: number, plural: string) =>
      `In totaal binnen een straal van 1 km: ${n} ${plural}`,
    nearbyTitle: 'Rond de villa',
    catBeach: 'Stranden', catBeachclub: 'Beach clubs', catRestaurant: 'Restaurants',
    catCafe: 'Cafés', catWellness: 'Yoga & fitness', catNightlife: 'Bars & clubs',
    catAttraction: 'Attracties', catIntlSchool: 'Internationale scholen',
    catSchool: 'Scholen', catPreschool: 'Crèches & kleuterscholen', catSupermarket: 'Supermarkten',
    catPharmacy: 'Apotheken', catHospital: 'Klinieken',
  },
  ban: {
    sectionH2: 'Potensi investasi',
    sectionSub: 'Skenario sewa kaperkiraang antuk nyocokang saingan Booking lan nganalisa wewidangan',
    confHigh: 'keyakinan tegeh',
    confMedium: 'keyakinan tengah',
    confLow: 'keyakinan endep',
    object: ['listing', 'listing'] as [string, string],
    villa: ['vila', 'vila'] as [string, string],
    similarVilla: ['vila sane pateh', 'vila sane pateh'] as [string, string],
    restaurant: ['restoran', 'restoran'] as [string, string],
    perNight: ' / wengi',
    perYear: '/thn',
    perYearNoi: ' / warsa NOI',
    expandedZone: (raw: string, applied: string) =>
      `Sampel kaperluas: nenten wenten kecocokan ring zona kapertama (${raw}), magentos ka ${applied}.`,
    threeNumbers: 'Arti tetiga angka puniki',
    threeNumbersBody: (count: number, similar: string, zoneLower: string) =>
      <>Tiang ngaperkiraang potensi pikolih vila puniki saking sewa jangka cutet. Dasarne kaambil saking {count > 0 ? <><span className="font-medium text-[var(--color-text)]">{count}</span> {similar}</> : 'vila sane pateh'} ring zona sane pateh ({zoneLower}; ring peta baduur — titik pelung ring tengah bunderan barak).</>,
    threeNumbersScenarios:
      <>
        {' '}<strong className="text-[#B91C1C]">Kaon</strong> — skenario pesimis, vila setengah kosong.{' '}
        <strong className="text-[var(--color-primary-pressed)]">Normal</strong> — sane pinih sering mamargi.{' '}
        <strong className="text-[#15803D]">Becik</strong> — wates baduur, sareng perusahaan pangelola sane kuat lan rating tegeh.
        {' '}Ring sor skenario wenten kartu saingan sujati — ampakang anggen ngbandingang luas / rating / aji sareng vila puniki.
      </>,
    scenarioBad: 'Kaon', scenarioMedian: 'Normal', scenarioGood: 'Becik',
    resetTitle: 'Setel malih ka nilai default madasar saingan', reset: 'setel malih',
    inputPrice: 'Aji', inputAdr: 'ADR', inputOccupancy: 'Okupansi', inputMgmt: 'Prabéya pangelola',
    calcTitle: 'Kalkulator hasil',
    calcSub: 'Sred slider. ADR lan okupansi default nganggen median listing Booking pateh ring sisi; aji dados kasesuaiang ±25%.',
    payback: 'Balik modal', capRate: 'Cap rate',
    howCalced: 'Sapunapi itunganne',
    revenue: 'Pikolih', platform: 'Platform', mgmt: 'Pangelola', opex: 'Prabea operasional', tax: 'Pajak', noi: 'Bersih ring sang nuwenang',
    phr: 'Pajak hotel (PHR)', ffe: 'Cadangan panyusutan', preTax: 'Bati sadurung pajak',
    entryPrice: 'Total prabea ngranjing', closing: 'balik nama', furnishing: 'prabot',
    adrRealization: 'realisasi tarif', opexFloorNote: 'minimum dasar',
    taxStatusLabel: 'Status pajak', taxResident: 'Residen', taxNonResident: 'Non-residen',
    taxStatusHint: 'Residen sane madue NPWP naur 10%, non-residen 20%.',
    irrLabel: 'Asil salami masa sewa',
    noCapitalReturn: 'Kantos masa sewa puput, properti nenten mawali modal',
    noCapitalReturnHint: 'Total pikolih sewa kantos hak sewa puput kirang saking prabea ngranjing.',
    utilities: 'Listrik lan toya',
    staff: 'Kebersihan lan staf',
    supplies: 'Kaperluan tamiu',
    poolGarden: 'Kolam lan taman',
    otherOpex: 'Internet, gas, perbaikan alit',
    pbb: 'Pajak bumi lan wangunan (PBB)',
    assumptions: 'Asumsi pitungan',
    occupancyNote: 'Tingkat hunian',
    occupancyHint: 'acuan industri Bali 55–65% saben warsa',
    platformHint: 'pasar 15–17%',
    mgmtHint: 'pasar 13–20%',
    phrHint: 'kabayah tamiu yening tarif durung kalebet pajak',
    ffeHint: 'prabot lan piranti aus ring 5–7 warsa',
    pbbHint: '0,2% saking NJOP',
    taxHintRes: 'residen madue NPWP',
    taxHintNonRes: 'non-residen, PPh 26',
    opexTitle: 'Prabea operasional',
    densityCommon: 'kakonfirmasi pasar',
    densityAbove: 'langkung saking tetangga akehan',
    densityRare: 'conto sane pateh akidik',
    densityNearby: 'Ring sekitar kisaran puniki',
    densityNone: 'nenten wenten tetangga ring tarif puniki',
    densityScale: 'Akuda tetangga sane nganggen tarif puniki',
    referencesTitle: 'Sampel cenik — nyinahang listing referensi',
    referencesBody: (n: number, plural: string) =>
      `Wantah ${n} ${plural} sane cocok sareng profil vila ring radius 2 km. Tiang nenten ngagregasi — puniki conto konkret.`,
    restrictedTitle: 'Tanah hunian — sewa harian nenten kadadosang',
    restrictedBody: 'Properti puniki wenten ring tanah kuning (hunian). Manut zonasi Indonesia, sewa jangka cutet / turis nenten legal iriki, dados tiang nenten ngitung hasil sewa harian antuk ipun. Tanah puniki cocok anggen hunian pribadi utawi sewa jangka panjang.',
    sqm: 'm²',
    similarOnBooking: (n: number) => `Listing sane pateh ring Booking · ${n}`,
    collapse: 'Nutup',
    showAll: (n: number) => `Nyinahang sami ${n}`,
    newDistrictH3: 'Wewidangan sedeng nglimbak',
    newDistrictBody:
      'Wewidangan puniki ring fase tumbuh awal: kirang saking 30 listing Booking ring radius 1 km. Nuutin tren pasar sane pateh (Berawa 2018→2022, Canggu 2014→2018), ADR dados menek 30–80% ring 4–5 warsa. Puniki analogi historis, boya prakiraan.',
    newDistrictFootnote: (n: number, plural: string) =>
      `Total ring radius 1 km: ${n} ${plural}`,
    nearbyTitle: 'Ring kiwa tengen vila',
    catBeach: 'Pasih', catBeachclub: 'Beach club', catRestaurant: 'Restoran',
    catCafe: 'Kafe', catWellness: 'Yoga & kebugaran', catNightlife: 'Bar & klub',
    catAttraction: 'Objek wisata', catIntlSchool: 'Sekolah internasional',
    catSchool: 'Sekolah', catPreschool: 'PAUD & TK', catSupermarket: 'Supermarket',
    catPharmacy: 'Apotek', catHospital: 'Klinik',
  },
  pl: {
    sectionH2: 'Potencjał inwestycyjny',
    sectionSub: 'Scenariusze najmu oszacowane przez porównanie z konkurentami z Booking i analizę okolicy',
    confHigh: 'wysoka pewność',
    confMedium: 'średnia pewność',
    confLow: 'niska pewność',
    object: ['ogłoszenie', 'ogłoszenia'] as [string, string],
    villa: ['willa', 'wille'] as [string, string],
    similarVilla: ['podobna willa', 'podobne wille'] as [string, string],
    restaurant: ['restauracja', 'restauracje'] as [string, string],
    perNight: ' / noc',
    perYear: '/rok',
    perYearNoi: ' / rok NOI',
    expandedZone: (raw: string, applied: string) =>
      `Rozszerzona próba: brak dopasowań w pierwotnej strefie (${raw}), przełączono na ${applied}.`,
    threeNumbers: 'Co oznaczają te trzy liczby',
    threeNumbersBody: (count: number, similar: string, zoneLower: string) =>
      <>Szacujemy, ile ta willa mogłaby zarobić na najmie krótkoterminowym. Podstawą jest {count > 0 ? <><span className="font-medium text-[var(--color-text)]">{count}</span> {similar}</> : 'podobne wille'} w tej samej strefie ({zoneLower}; na mapie powyżej — niebieskie punkty wewnątrz czerwonego okręgu).</>,
    threeNumbersScenarios:
      <>
        {' '}<strong className="text-[#B91C1C]">Zły</strong> — scenariusz pesymistyczny, willa stoi w połowie pusta.{' '}
        <strong className="text-[var(--color-primary-pressed)]">Normalny</strong> — to, co zdarza się najczęściej.{' '}
        <strong className="text-[#15803D]">Dobry</strong> — górna granica, przy silnej firmie zarządzającej i wysokiej ocenie.
        {' '}Pod scenariuszami znajdują się karty rzeczywistych konkurentów — otwórz je, aby porównać powierzchnię / ocenę / cenę z tą willą.
      </>,
    scenarioBad: 'Zły', scenarioMedian: 'Normalny', scenarioGood: 'Dobry',
    resetTitle: 'Przywróć wartości domyślne oparte na konkurencji', reset: 'resetuj',
    inputPrice: 'Cena', inputAdr: 'ADR', inputOccupancy: 'Obłożenie', inputMgmt: 'Opłata za zarządzanie',
    calcTitle: 'Kalkulator rentowności',
    calcSub: 'Przesuń suwaki. ADR i obłożenie domyślnie przyjmują medianę podobnych pobliskich ogłoszeń Booking; cenę można zmieniać o ±25%.',
    payback: 'Zwrot', capRate: 'Cap rate',
    howCalced: 'Jak to obliczono',
    revenue: 'Przychód', platform: 'Platforma', mgmt: 'Zarządzanie', opex: 'Koszty operacyjne', tax: 'Podatek', noi: 'Netto dla właściciela',
    phr: 'Podatek od zakwaterowania', ffe: 'Rezerwa na zużycie', preTax: 'Zysk przed opodatkowaniem',
    entryPrice: 'Całkowity koszt wejścia', closing: 'formalności', furnishing: 'umeblowanie',
    adrRealization: 'realizacja stawki', opexFloorNote: 'minimum bazowe',
    taxStatusLabel: 'Status podatkowy', taxResident: 'Rezydent', taxNonResident: 'Nierezydent',
    taxStatusHint: 'Rezydent z indonezyjskim NPWP płaci 10%, nierezydent 20%.',
    irrLabel: 'Zwrot w okresie dzierżawy',
    noCapitalReturn: 'W pozostałym okresie dzierżawy obiekt nie zwraca włożonego kapitału',
    noCapitalReturnHint: 'Suma przychodów z najmu do końca dzierżawy jest niższa niż koszt wejścia.',
    utilities: 'Prąd i woda',
    staff: 'Sprzątanie i personel',
    supplies: 'Artykuły dla gości',
    poolGarden: 'Basen i ogród',
    otherOpex: 'Internet, gaz, drobne naprawy',
    pbb: 'Podatek od gruntu i budynku (PBB)',
    assumptions: 'Założenia obliczeń',
    occupancyNote: 'Obłożenie',
    occupancyHint: 'benchmark rynku Bali: 55–65% rocznie',
    platformHint: 'rynek 15–17%',
    mgmtHint: 'rynek 13–20%',
    phrHint: 'płaci gość, gdy stawka jest bez podatku',
    ffeHint: 'meble i sprzęt zużywają się w 5–7 lat',
    pbbHint: '0,2% wartości katastralnej',
    taxHintRes: 'rezydent z NPWP',
    taxHintNonRes: 'nierezydent, PPh 26',
    opexTitle: 'Koszty operacyjne',
    densityCommon: 'potwierdzone przez rynek',
    densityAbove: 'powyżej większości sąsiadów',
    densityRare: 'niewiele podobnych przypadków',
    densityNearby: 'W okolicy w tym przedziale',
    densityNone: 'nikt w okolicy tyle nie bierze',
    densityScale: 'Ilu sąsiadów ma taką stawkę',
    referencesTitle: 'Mała próba — pokazujemy ogłoszenia referencyjne',
    referencesBody: (n: number, plural: string) =>
      `Tylko ${n} ${plural} pasowało do profilu willi w promieniu 2 km. Nie agregujemy — zamiast tego oto konkretne przykłady.`,
    restrictedTitle: 'Grunt mieszkaniowy — najem dobowy niedozwolony',
    restrictedBody: 'Ta nieruchomość znajduje się na żółtym (mieszkaniowym) gruncie. Zgodnie z indonezyjskim zonowaniem najem krótkoterminowy / turystyczny jest tu nielegalny, więc nie obliczamy dla niej rentowności najmu dobowego. Grunt nadaje się do użytku własnego lub najmu długoterminowego.',
    sqm: 'm²',
    similarOnBooking: (n: number) => `Podobne ogłoszenia na Booking · ${n}`,
    collapse: 'Zwiń',
    showAll: (n: number) => `Pokaż wszystkie ${n}`,
    newDistrictH3: 'Rozwijająca się dzielnica',
    newDistrictBody:
      'Dzielnica jest we wczesnej fazie wzrostu: mniej niż 30 ogłoszeń Booking w promieniu 1 km. Idąc śladem porównywalnych rynków (Berawa 2018→2022, Canggu 2014→2018), ADR może wzrosnąć o 30–80% w ciągu 4–5 lat. To analogia historyczna, nie prognoza.',
    newDistrictFootnote: (n: number, plural: string) =>
      `Łącznie w promieniu 1 km: ${n} ${plural}`,
    nearbyTitle: 'Wokół willi',
    catBeach: 'Plaże', catBeachclub: 'Kluby plażowe', catRestaurant: 'Restauracje',
    catCafe: 'Kawiarnie', catWellness: 'Joga i fitness', catNightlife: 'Bary i kluby',
    catAttraction: 'Atrakcje', catIntlSchool: 'Szkoły międzynarodowe',
    catSchool: 'Szkoły', catPreschool: 'Żłobki i przedszkola', catSupermarket: 'Supermarkety',
    catPharmacy: 'Apteki', catHospital: 'Kliniki',
  },
  uk: {
    sectionH2: 'Інвестиційний потенціал',
    sectionSub: 'Сценарії оренди, оцінені шляхом зіставлення з конкурентами Booking та аналізу району',
    confHigh: 'висока впевненість',
    confMedium: 'середня впевненість',
    confLow: 'низька впевненість',
    object: ['оголошення', 'оголошень'] as [string, string],
    villa: ['вілла', 'вілли'] as [string, string],
    similarVilla: ['схожа вілла', 'схожі вілли'] as [string, string],
    restaurant: ['ресторан', 'ресторани'] as [string, string],
    perNight: ' / ніч',
    perYear: '/рік',
    perYearNoi: ' / рік NOI',
    expandedZone: (raw: string, applied: string) =>
      `Розширена вибірка: у вихідній зоні (${raw}) немає збігів, перейшли на ${applied}.`,
    threeNumbers: 'Що означають ці три цифри',
    threeNumbersBody: (count: number, similar: string, zoneLower: string) =>
      <>Ми оцінюємо, скільки ця вілла могла б заробляти на короткостроковій оренді. Основа — {count > 0 ? <><span className="font-medium text-[var(--color-text)]">{count}</span> {similar}</> : 'схожі вілли'} у тій самій зоні ({zoneLower}; на карті вгорі — сині точки всередині червоного кола).</>,
    threeNumbersScenarios:
      <>
        {' '}<strong className="text-[#B91C1C]">Поганий</strong> — песимістичний сценарій, вілла стоїть напівпорожня.{' '}
        <strong className="text-[var(--color-primary-pressed)]">Нормальний</strong> — те, що трапляється найчастіше.{' '}
        <strong className="text-[#15803D]">Добрий</strong> — верхня межа, із сильною керуючою компанією та високим рейтингом.
        {' '}Під сценаріями — картки реальних конкурентів, відкрийте їх, щоб порівняти площу / рейтинг / ціну з цією віллою.
      </>,
    scenarioBad: 'Поганий', scenarioMedian: 'Нормальний', scenarioGood: 'Добрий',
    resetTitle: 'Скинути до значень на основі конкурентів', reset: 'скинути',
    inputPrice: 'Ціна', inputAdr: 'ADR', inputOccupancy: 'Заповнюваність', inputMgmt: 'Плата за управління',
    calcTitle: 'Калькулятор дохідності',
    calcSub: 'Пересувайте повзунки. ADR і заповнюваність за замовчуванням беруть медіану схожих сусідніх оголошень Booking; ціну можна змінювати на ±25%.',
    payback: 'Окупність', capRate: 'Cap rate',
    howCalced: 'Як це розраховано',
    revenue: 'Дохід', platform: 'Платформа', mgmt: 'Управління', opex: 'Операційні витрати', tax: 'Податок', noi: 'Чистими власнику',
    phr: 'Податок на проживання', ffe: 'Резерв на знос', preTax: 'Прибуток до податку',
    entryPrice: 'Ціна входу', closing: 'оформлення', furnishing: 'умеблювання',
    adrRealization: 'реалізація ставки', opexFloorNote: 'базовий мінімум',
    taxStatusLabel: 'Податковий статус', taxResident: 'Резидент', taxNonResident: 'Нерезидент',
    taxStatusHint: 'Резидент з індонезійським NPWP сплачує 10%, нерезидент — 20%.',
    irrLabel: 'Дохідність за строк оренди',
    noCapitalReturn: 'За решту строку лізхолду обʼєкт не повертає вкладене',
    noCapitalReturnHint: 'Сума всіх орендних надходжень до кінця права оренди менша за ціну входу.',
    utilities: 'Електрика та вода',
    staff: 'Прибирання і персонал',
    supplies: 'Витратні матеріали для гостей',
    poolGarden: 'Басейн і сад',
    otherOpex: 'Інтернет, газ, дрібний ремонт',
    pbb: 'Податок на землю і будівлю (PBB)',
    assumptions: 'Припущення розрахунку',
    occupancyNote: 'Завантаження',
    occupancyHint: 'галузевий орієнтир Балі 55–65% на рік',
    platformHint: 'ринок 15–17%',
    mgmtHint: 'ринок 13–20%',
    phrHint: 'платить гість, якщо ставка без податку',
    ffeHint: 'меблі й техніка зношуються за 5–7 років',
    pbbHint: '0,2% від кадастрової оцінки',
    taxHintRes: 'резидент з NPWP',
    taxHintNonRes: 'нерезидент, PPh 26',
    opexTitle: 'Операційні витрати',
    densityCommon: 'підтверджено ринком',
    densityAbove: 'вище за більшість сусідів',
    densityRare: 'поодинокі випадки поруч',
    densityNearby: 'Поруч у цьому коридорі',
    densityNone: 'поруч ніхто так не здає',
    densityScale: 'Скільки сусідів здають за цією ставкою',
    referencesTitle: 'Мала вибірка — показуємо референсні оголошення',
    referencesBody: (n: number, plural: string) =>
      `Лише ${n} ${plural} відповідають профілю вілли в радіусі 2 км. Ми не агрегуємо — натомість ось конкретні приклади.`,
    restrictedTitle: 'Житлова земля — добова оренда не дозволена',
    restrictedBody: 'Ця нерухомість розташована на жовтій (житловій) землі. За індонезійським зонуванням короткострокова / туристична оренда тут нелегальна, тому ми не розраховуємо дохідність від добової оренди для неї. Земля підходить для власного проживання або довгострокової оренди.',
    sqm: 'm²',
    similarOnBooking: (n: number) => `Схожі оголошення на Booking · ${n}`,
    collapse: 'Згорнути',
    showAll: (n: number) => `Показати всі ${n}`,
    newDistrictH3: 'Район, що розвивається',
    newDistrictBody:
      'Район у ранній фазі зростання: менше 30 оголошень Booking у радіусі 1 км. За траєкторією співставних ринків (Berawa 2018→2022, Canggu 2014→2018) ADR може зрости на 30–80% за 4–5 років. Це історична аналогія, а не прогноз.',
    newDistrictFootnote: (n: number, plural: string) =>
      `Загалом у радіусі 1 км: ${n} ${plural}`,
    nearbyTitle: 'Навколо вілли',
    catBeach: 'Пляжі', catBeachclub: 'Пляжні клуби', catRestaurant: 'Ресторани',
    catCafe: 'Кафе', catWellness: 'Йога та фітнес', catNightlife: 'Бари та клуби',
    catAttraction: 'Визначні місця', catIntlSchool: 'Міжнародні школи',
    catSchool: 'Школи', catPreschool: 'Ясла та дитсадки', catSupermarket: 'Супермаркети',
    catPharmacy: 'Аптеки', catHospital: 'Клініки',
  },
} as const

function pluralize(lang: Lang, n: number, ruForms: [string, string, string], enForms: [string, string]): string {
  return lang === 'ru' ? pluralRu(n, ruForms) : pluralEn(n, enForms)
}

export function InvestmentWidget({
  villaId,
  apiKey,
  kind = 'villa',
  lang,
}: { villaId: string; apiKey: string; kind?: 'villa' | 'apartment'; lang?: Lang }) {
  // Allow explicit lang from server caller; default by URL.
  const pathname = usePathname() ?? ''
  const resolvedLang: Lang = lang ?? (detectLang(pathname))
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const apiBase = kind === 'apartment' ? '/api/apartament' : '/api/villa'
    fetch(`${apiBase}/${villaId}/investment-snapshot`)
      .then(async r => {
        if (!r.ok) throw new Error(`http_${r.status}`)
        return r.json() as Promise<Snapshot>
      })
      .then(s => { if (!cancelled) setSnap(s) })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [villaId, kind])

  if (loading) return <SectionShell lang={resolvedLang}><Skeleton /></SectionShell>
  if (error || !snap) return null

  return <InvestmentWidgetView snap={snap} apiKey={apiKey} lang={resolvedLang} />
}

function SectionShell({ children, lang }: { children: React.ReactNode; lang: Lang }) {
  const t = pickCopy(COPY, lang)
  // mt-12 gives the heading breathing room from the white ContactBlock /
  // ManagerCard cards that sit immediately above on every detail page —
  // without it, the h2 was visually touching the contact card's bottom
  // edge and looked unindented.
  return (
    <section className="mt-12 mb-10" data-investment-block data-llm-skip="">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2">
        {t.sectionH2}
      </h2>
      <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
        {t.sectionSub}
      </div>
      {children}
    </section>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-16 rounded-2xl bg-[var(--color-search-bg)] animate-pulse" />
      <div className="h-[480px] rounded-3xl bg-[var(--color-search-bg)] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => <div key={i} className="h-32 rounded-2xl bg-[var(--color-search-bg)] animate-pulse" />)}
      </div>
    </div>
  )
}

function InvestmentWidgetView({ snap, apiKey, lang }: { snap: Snapshot; apiKey: string; lang: Lang }) {
  const t = pickCopy(COPY, lang)
  const allPois = useMemo(() => {
    const out: { lat: number; lng: number; name: string | null; category: string }[] = []
    for (const [cat, list] of Object.entries(snap.nearbyByCategory)) {
      for (const p of list) out.push({ lat: p.lat, lng: p.lng, name: p.name, category: cat })
    }
    return out
  }, [snap])
  return (
    <>
      <SectionShell lang={lang}>
        {snap.flags.rentalRestricted ? (
          <Banner tone="warn" icon={<Info size={16} />}>
            <div>
              <div className="font-medium text-[#111827] mb-1">{t.restrictedTitle}</div>
              <div>{t.restrictedBody}</div>
            </div>
          </Banner>
        ) : snap.scenarios ? (
          <Calculator snap={snap} lang={lang} />
        ) : snap.references ? (
          <References snap={snap} lang={lang} />
        ) : null}

        <div className="mt-4">
          <InvestmentMap apiKey={apiKey} snap={snap} allPois={allPois} lang={lang} />
        </div>

        {snap.flags.expandedZone && (
          <Banner tone="info" icon={<Info size={16} />} className="mt-4">
            {t.expandedZone(snap.zone.raw, snap.zone.applied)}
          </Banner>
        )}

        {snap.flags.emergingMarket && !snap.flags.rentalRestricted && <EmergingBlock snap={snap} lang={lang} />}
      </SectionShell>
    </>
  )
}

function Banner({ tone, icon, children, className }: { tone: 'info' | 'danger' | 'warn'; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  const map = {
    info: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]',
    danger: 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]',
    warn: 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]',
  }
  return (
    <div className={`rounded-2xl border ${map[tone]} px-4 py-3 text-[13px] flex items-start gap-2 ${className ?? ''}`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function Calculator({ snap, lang }: { snap: Snapshot; lang: Lang }) {
  const t = pickCopy(COPY, lang)
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const fxRate = CURRENCY_RATES[currency]
  const sc = snap.scenarios!
  const basePrice = snap.villa.askingPrice

  // ADR slider band derived from the competitor percentiles (p25…p75),
  // widened so the user can explore a bit beyond the observed range.
  const adrLo = Math.max(1, Math.floor(sc.bad.adrAsking * 0.6))
  const adrHi = Math.max(adrLo + 1, Math.ceil(sc.good.adrAsking * 1.5))

  // Ставки соседей для зон в дорожке ползунка. Берём их у того же
  // источника, что и карточки «что рядом сдают» ниже: раньше шкала
  // считалась по своей выборке сопоставимых и писала «рядом никто так не
  // сдаёт» ровно тогда, когда под ней показывались два объекта.
  const [nearbyAdrs, setNearbyAdrs] = useState<number[]>([])
  const villaLat = snap.villa.lat
  const villaLng = snap.villa.lng
  useEffect(() => {
    if (villaLat == null || villaLng == null) return
    let cancelled = false
    // Радиус тот же, до которого карточки ниже готовы расширить поиск,
    // когда рядом пусто. Иначе выходит вранье: в Убуде зоны считались по
    // километру и были только слева, а карточки нашли соседей за $298–379
    // в двух километрах — ползунок стоял там, где «никого нет», и они всё
    // равно показывались.
    fetch(`/api/rental-density?lat=${villaLat}&lng=${villaLng}&radius=3000`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d?.ok) setNearbyAdrs(d.prices as number[]) })
      .catch(() => { /* без зон ползунок остаётся обычным */ })
    return () => { cancelled = true }
  }, [villaLat, villaLng])

  const [price, setPrice] = useState<number>(basePrice ?? 0)
  // Ползунок ходит по ставке из выдачи соседей; коэффициент реализации
  // применяется внутри расчёта, поэтому пользователь двигает ровно то число,
  // которое видит в карточках конкурентов ниже.
  const [adr, setAdr] = useState<number>(sc.median.adrAsking)
  const [occ, setOcc] = useState<number>(Math.round(snap.region.occupancyByScenario.median * 100))
  const [mgmt, setMgmt] = useState<number>(Math.round(snap.region.mgmtFeePct * 100))
  const [taxStatus, setTaxStatus] = useState<TaxStatus>('nonResident')
  const [open, setOpen] = useState(false)

  const e: Economics = useMemo(() => computeEconomics({
    adr,
    occupancy: occ / 100,
    adrRealization: snap.region.adrRealizationByScenario.median,
    phrOwnerShare: snap.region.phrOwnerShareByScenario.median,
    area: snap.villa.area,
    bedrooms: snap.villa.bedrooms,
    askingPrice: basePrice != null ? price : null,
    leaseholdYearsLeft: snap.villa.leaseholdYearsLeft,
    taxStatus,
    region: { ...snap.region, mgmtFeePct: mgmt / 100 },
  }), [adr, occ, mgmt, price, basePrice, taxStatus, snap])

  // Доля соседей в каждом промежутке дорожки: 0 — там пусто, 1 — самый
  // населённый промежуток.
  const adrZones = useMemo(() => {
    const bins = new Array<number>(ADR_ZONES).fill(0)
    const span = adrHi - adrLo
    if (span <= 0 || !nearbyAdrs.length) return []
    for (const a of nearbyAdrs) {
      if (a < adrLo || a > adrHi) continue
      bins[Math.min(ADR_ZONES - 1, Math.floor(((a - adrLo) / span) * ADR_ZONES))] += 1
    }
    const max = Math.max(...bins)
    return max > 0 ? bins.map(n => n / max) : []
  }, [nearbyAdrs, adrLo, adrHi])

  const priceLo = basePrice != null ? Math.round(basePrice * 0.75) : 0
  const priceHi = basePrice != null ? Math.round(basePrice * 1.25) : 0
  const opexUnit = lang === 'ru' ? '$/м²/мес' : '$/m²/mo'

  return (
    <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <div className="text-[16px] font-semibold text-[#111827]">{t.calcTitle}</div>
      <div className="text-[13px] text-[var(--color-text-muted)] mt-1 mb-5">{t.calcSub}</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        {basePrice != null && (
          <Slider label={t.inputPrice} value={price} min={priceLo} max={priceHi} step={500}
            onChange={setPrice} display={fmtUsd(Math.round(price * fxRate))} />
        )}
        <Slider label={t.inputAdr} value={adr} min={adrLo} max={adrHi} step={1}
          onChange={setAdr} display={fmtUsd(Math.round(adr * fxRate))}
          zones={adrZones} zonesLabel={t.densityScale} />
        <Slider label={t.inputOccupancy} value={occ} min={0} max={100} step={1}
          onChange={setOcc} display={`${occ}%`} />
        <Slider label={t.inputMgmt} value={mgmt} min={0} max={80} step={1}
          onChange={setMgmt} display={`${mgmt}%`} />
      </div>

      {snap.villa.lat != null && snap.villa.lng != null && (
        <RentalComps lat={snap.villa.lat} lng={snap.villa.lng} adr={adr} lang={lang} />
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[13px] text-[var(--color-text-muted)]">{t.taxStatusLabel}</span>
        <div className="inline-flex rounded-lg border border-[var(--color-border)] p-0.5">
          {(['nonResident', 'resident'] as const).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setTaxStatus(key)}
              aria-pressed={taxStatus === key}
              className={`px-3 py-1 text-[12px] rounded-md cursor-pointer transition-colors ${
                taxStatus === key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[#111827]'
              }`}
            >
              {key === 'resident' ? t.taxResident : t.taxNonResident}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-[var(--color-text-muted)]">{t.taxStatusHint}</span>
      </div>

      <div className="mt-5 pt-4 border-t border-[var(--color-border)] flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <div className="text-[30px] font-semibold text-[#111827] leading-none">
          {fmtUsd(e.noi)}<span className="text-[14px] font-normal text-[var(--color-text-muted)]">{t.perYearNoi}</span>
        </div>
        <div className="text-[13px] text-[var(--color-text-muted)]">{t.payback}: <span className="text-[#111827] font-medium">{fmtYears(e.payback, lang)}</span></div>
        <div className="text-[13px] text-[var(--color-text-muted)]">{t.capRate}: <span className="text-[#111827] font-medium">{fmtPct(e.capRate)}</span></div>
        {e.leaseholdIrr != null && (
          <div className="text-[13px] text-[var(--color-text-muted)]">{t.irrLabel}: <span className="text-[#111827] font-medium">{fmtPct(e.leaseholdIrr)}</span></div>
        )}
      </div>

      {e.capitalReturned === false && (
        <div className="mt-3 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3">
          <div className="text-[13px] font-medium text-[#991B1B]">
            {t.noCapitalReturn}
            {snap.villa.leaseholdYearsLeft != null ? ` — ${fmtYears(snap.villa.leaseholdYearsLeft, lang)}` : ''}
          </div>
          <div className="text-[12px] text-[#B91C1C] mt-0.5">{t.noCapitalReturnHint}</div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="mt-3 inline-flex items-center gap-1 text-[12px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] cursor-pointer"
      >
        {t.howCalced} {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <ul className="mt-2 text-[12px] text-[var(--color-text)] space-y-0.5 border-t border-[var(--color-border)] pt-2">
          <li>
            {t.revenue}: {fmtUsd(e.revenue)}
            <span className="text-[var(--color-text-muted)]"> · {fmtUsd(Math.round(e.adr * fxRate))} × 365 × {Math.round(e.occupancy * 100)}%</span>
          </li>
          <li className="text-[var(--color-text-muted)]">
            {t.adrRealization}: {Math.round(snap.region.adrRealizationByScenario.median * 100)}% · {fmtUsd(Math.round(e.adrAsking * fxRate))} → {fmtUsd(Math.round(e.adr * fxRate))}
          </li>
          <li>
            − {t.platform} ({Math.round(snap.region.platformFeePct * 100)}%): {fmtUsd(e.platformFee)}
            <span className="text-[var(--color-text-muted)]"> · {t.platformHint}</span>
          </li>
          <li>
            − {t.phr} ({Math.round(snap.region.phrRatePct * 100)}% × {Math.round(snap.region.phrOwnerShareByScenario.median * 100)}%): {fmtUsd(e.phrTax)}
            <span className="text-[var(--color-text-muted)]"> · {t.phrHint}</span>
          </li>
          <li>
            − {t.mgmt} ({mgmt}%): {fmtUsd(e.mgmtFee)}
            <span className="text-[var(--color-text-muted)]"> · {t.mgmtHint}</span>
          </li>
          <li>
            − {t.opex} ({e.opexAtFloor ? t.opexFloorNote : `${snap.region.opexPerSqmMonth} ${opexUnit}`}): {fmtUsd(e.opex)}
          </li>
          <li className="pl-4 text-[var(--color-text-muted)]">· {t.utilities}: {fmtUsd(Math.round(e.opexParts.utilities * fxRate))}</li>
          <li className="pl-4 text-[var(--color-text-muted)]">· {t.staff}: {fmtUsd(Math.round(e.opexParts.staff * fxRate))}</li>
          <li className="pl-4 text-[var(--color-text-muted)]">· {t.supplies}: {fmtUsd(Math.round(e.opexParts.supplies * fxRate))}</li>
          <li className="pl-4 text-[var(--color-text-muted)]">· {t.poolGarden}: {fmtUsd(Math.round(e.opexParts.poolGarden * fxRate))}</li>
          <li className="pl-4 text-[var(--color-text-muted)]">· {t.otherOpex}: {fmtUsd(Math.round(e.opexParts.other * fxRate))}</li>
          <li>
            − {t.ffe} ({Math.round(snap.region.ffeReservePct * 100)}%): {fmtUsd(e.ffeReserve)}
            <span className="text-[var(--color-text-muted)]"> · {t.ffeHint}</span>
          </li>
          {e.pbbTax > 0 && (
            <li>
              − {t.pbb}: {fmtUsd(Math.round(e.pbbTax * fxRate))}
              <span className="text-[var(--color-text-muted)]"> · {t.pbbHint}</span>
            </li>
          )}
          <li className="pt-1 border-t border-[var(--color-border)] mt-1">= {t.preTax}: {fmtUsd(e.preTaxProfit)}</li>
          <li>
            − {t.tax} ({Math.round((taxStatus === 'resident' ? snap.region.taxRateResident : snap.region.taxRateNonResident) * 100)}%): {fmtUsd(e.tax)}
            <span className="text-[var(--color-text-muted)]"> · {taxStatus === 'resident' ? t.taxHintRes : t.taxHintNonRes}</span>
          </li>
          <li className="pt-1 border-t border-[var(--color-border)] mt-1 font-medium">= {t.noi}: {fmtUsd(e.noi)}</li>
          {e.entryPrice != null && (
            <li className="pt-2 mt-1 border-t border-[var(--color-border)] text-[var(--color-text-muted)]">
              {t.entryPrice}: {fmtUsd(Math.round(e.entryPrice * fxRate))} · {fmtUsd(Math.round(price * fxRate))} + {t.closing} {fmtUsd(Math.round(e.closingCost * fxRate))}
              {e.furnishing > 0 ? ` + ${t.furnishing} ${fmtUsd(Math.round(e.furnishing * fxRate))}` : ''}
            </li>
          )}
          <li className="pt-2 mt-1 border-t border-[var(--color-border)] text-[var(--color-text-muted)]">
            {t.assumptions}: {t.occupancyNote} {Math.round(e.occupancy * 100)}% — {t.occupancyHint}
          </li>
        </ul>
      )}
    </div>
  )
}

// Плотность рынка под ползунком ADR: сколько соседей реально сдают по
// каждой ставке. Без неё ползунок двигается вслепую — видно число, но
// не видно, подтверждено ли оно рынком. Цвет — светофорные токены
// проекта: до медианы зелёный (так сдают многие), до p75 жёлтый,
// выше — красный (единичные случаи).

function Slider({
  label, value, min, max, step, onChange, display, zones, zonesLabel,
}: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string
  // Плотность соседей по ставке: доля от самого населённого промежутка,
  // 0 — рядом никто так не сдаёт. Рисуется прямо в дорожке, чтобы было
  // видно, куда тянуть ползунок, и не появлялось отдельного блока.
  zones?: number[]
  zonesLabel?: string
}) {
  const clamped = Math.min(max, Math.max(min, value))
  const filled = max > min ? ((clamped - min) / (max - min)) * 100 : 0

  // Дорожка своя у всех ползунков: родная у input range приходит с
  // собственной рамкой и тенью, а на полоске в шесть пикселей любая
  // окантовка выглядит грязью.
  return (
    <div>
      <SliderHead label={label} display={display} />
      <div className="relative h-4 flex items-center" role={zones?.length ? 'img' : undefined} aria-label={zones?.length ? zonesLabel : undefined}>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full overflow-hidden flex bg-[#F3F4F6]">
          {zones?.length
            ? zones.map((share, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{
                    background: share > 0 ? 'var(--color-progress-low)' : 'transparent',
                    opacity: share > 0 ? Math.max(0.45, Math.min(1, share)) : 1,
                  }}
                />
              ))
            : <div className="h-full bg-[var(--color-primary)]" style={{ width: `${filled}%` }} />}
        </div>
        <input
          type="range"
          min={min} max={max} step={step} value={clamped}
          onChange={ev => onChange(Number(ev.target.value))}
          className="range-bare relative w-full h-4 cursor-pointer"
        />
      </div>
    </div>
  )
}

function SliderHead({ label, display }: { label: string; display: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[13px] text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[15px] font-semibold text-[#111827] tabular-nums">{display}</span>
    </div>
  )
}


function References({ snap, lang }: { snap: Snapshot; lang: Lang }) {
  const t = pickCopy(COPY, lang)
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const plural = pluralize(lang, snap.matchSampleSize, COPY.ru.object, COPY.en.object)
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-5">
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide font-semibold text-[#111827] mb-2">
        <Info size={14} /> {t.referencesTitle}
      </div>
      <div className="text-[13px] text-[var(--color-text-muted)] mb-4">
        {t.referencesBody(snap.matchSampleSize, plural)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(snap.references ?? []).map(r => (
          <a key={r.id} href={r.url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="rounded-xl border border-[var(--color-border)] p-3 hover:border-[var(--color-primary)] no-underline text-[#111827]">
            <div className="text-[14px] font-semibold leading-snug line-clamp-2">{r.complex || r.name}</div>
            <div className="text-[12px] text-[var(--color-text-muted)] mt-1">
              {r.bedrooms ?? '?'} BR{r.area ? ` · ${r.area} ${t.sqm}` : ''} · {fmtDistance(r.distanceKm, lang)}
            </div>
            <div className="text-[15px] font-semibold text-[#1D4ED8] mt-2">{fmtUsd(r.adr)}<span className="text-[11px] text-[var(--color-text-muted)] font-normal">{t.perNight}</span></div>
          </a>
        ))}
      </div>
    </div>
  )
}


function EmergingBlock({ snap, lang }: { snap: Snapshot; lang: Lang }) {
  const t = pickCopy(COPY, lang)
  const plural = pluralize(lang, snap.totalCompetitorsInRadius, COPY.ru.object, COPY.en.object)
  return (
    <section className="mt-8 rounded-2xl border border-[var(--color-border)] bg-white p-5" data-llm-skip="">
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide font-semibold text-[#111827] mb-2">
        <TrendingUp size={14} className="text-[var(--color-primary)]" /> {t.newDistrictH3}
      </div>
      <div className="text-[14px] text-[var(--color-text)] leading-relaxed">
        {t.newDistrictBody}
      </div>
      <div className="text-[12px] text-[var(--color-text-muted)] mt-3">
        {t.newDistrictFootnote(snap.totalCompetitorsInRadius, plural)}
      </div>
    </section>
  )
}
