'use client'

import { useEffect, useMemo, useState } from 'react'
import { RentalComps } from './RentalComps'
import { Slider, ResetButton } from './Slider'
import { MonthlyCalculator } from './MonthlyCalculator'
import { NightCost } from './NightCost'
import { usePathname } from 'next/navigation'
import {
  Info, ChevronDown, ChevronUp, TrendingUp,
} from 'lucide-react'
import { InvestmentMap } from './InvestmentMap'
import { fmtMoney, fmtPct, fmtYears, fmtDistance, pluralRu, pluralEn } from './utils'
import type { Snapshot } from './types'
import { useCurrency } from '../CurrencyContext'
import { computeEconomics, type Economics, type TaxStatus } from '@/lib/investment/economics'
import { pickCopy, type Lang, detectLang } from '@/lib/i18n'

// Сколько промежутков рисуем прямо в дорожке ползунка ADR.
const ADR_ZONES = 40

const COPY = {
  ru: {
    sectionH2: 'Инвестиционный потенциал',
    tabDaily: 'Посуточно',
    tabMonthly: 'Помесячно',
    sectionSubMonthly: 'Сколько объект может приносить при помесячной аренде. Все цифры — оценка по реальным ставкам соседей, а не обещание застройщика.',
    sectionSub: 'Сколько объект может приносить, если сдавать его посуточно. Все цифры — оценка по реальным ставкам соседей, а не обещание застройщика.',
    confHigh: 'высокая уверенность',
    confMedium: 'средняя уверенность',
    confLow: 'низкая уверенность',
    object: ['объект', 'объекта', 'объектов'] as [string, string, string],
    villa: ['вилла', 'виллы', 'вилл'] as [string, string, string],
    similarVilla: ['похожая вилла', 'похожие виллы', 'похожих вилл'] as [string, string, string],
    restaurant: ['ресторан', 'ресторана', 'ресторанов'] as [string, string, string],
    perNight: ' / ночь',
    perYear: '/год',
    perYearNoi: ' / год чистыми',
    // Коды зон (scooter, inland) внутренние — читателю их не показываем.
    expandedZone: (_raw: string, _applied: string) =>
      'Рядом с объектом похожих вилл мало, поэтому сравниваем с более широкой округой.',
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
    inputPrice: 'Цена', inputAdr: 'Цена за ночь', inputOccupancy: 'Загрузка', inputMgmt: 'Управляющая компания',
    calcTitle: 'Калькулятор посуточной аренды',
    calcSub: 'Цена за ночь по умолчанию - среднее между ставкой похожих объектов рядом (их карточки ниже) и обычной ставкой для объекта такой цены. Загрузка - как у похожих объявлений вокруг на Booking с августа 2026 года, чуть ниже середины: новые объекты сдаются хуже раскрученных. Если рядом данных нет совсем - 60%. Двигайте под свой прогноз. Внизу - сколько останется владельцу после комиссий, управляющей, расходов и налога.',
    payback: 'Окупаемость', capRate: 'Доходность в год',
    howCalced: 'Как считалось',
    revenue: 'Выручка', platform: 'Площадка', mgmt: 'Управление', opex: 'Расходы', tax: 'Налог', noi: 'Чистыми',
    phr: 'Налог на проживание', ffe: 'Резерв на износ', preTax: 'Прибыль до налога',
    entryPrice: 'Цена входа', closing: 'оформление', furnishing: 'меблировка',
    adrRealization: 'реализация ставки', opexFloorNote: 'базовый минимум',
    taxStatusLabel: 'Налоговый статус', taxBefore: 'До налогов', taxResident: 'Резидент', taxNonResident: 'Нерезидент',
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
    widerRadius: (km: number) => `Похожих объектов рядом мало, поэтому расчёт по объектам в радиусе ${km} км.`,
    adrFew: (n: number) => `Похожих объектов рядом мало (${n}), поэтому ставка примерная. Подвигайте ползунки под свой вариант.`,
    adrArea: 'Похожих объектов рядом нет, поэтому ставка взята по объявлениям с близким числом спален в радиусе 8 км и очень примерная. Подвигайте ползунки под свой вариант.',
    referencesBody: (n: number, plural: string, km: number) =>
      `В радиусе ${km} км нашлось всего ${n} ${plural}, подходящих под характеристики виллы. Агрегаты не считаем — даём конкретные примеры.`,
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
    tabDaily: 'Nightly',
    tabMonthly: 'Monthly',
    sectionSubMonthly: 'What the property could earn on monthly leases. Every number is an estimate built on real neighbour rents, not a developer promise.',
    sectionSub: 'What the property could earn as a short-term rental. Every number is an estimate built on real neighbour rates, not a developer promise.',
    confHigh: 'high confidence',
    confMedium: 'medium confidence',
    confLow: 'low confidence',
    object: ['listing', 'listings'] as [string, string],
    villa: ['villa', 'villas'] as [string, string],
    similarVilla: ['similar villa', 'similar villas'] as [string, string],
    restaurant: ['restaurant', 'restaurants'] as [string, string],
    perNight: ' / night',
    perYear: '/yr',
    perYearNoi: ' / year net',
    expandedZone: (_raw: string, _applied: string) =>
      'Few similar villas right next to the property, so we compare with a wider area.',
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
    inputPrice: 'Price', inputAdr: 'Nightly rate', inputOccupancy: 'Occupancy', inputMgmt: 'Management fee',
    calcTitle: 'Daily rental calculator',
    calcSub: 'The nightly rate defaults to a blend of similar places nearby (their cards are below) and the usual rate for a property at this price. Occupancy follows similar Booking listings around since August 2026, set slightly below the middle: new places rent worse than established ones. With no data nearby at all - 60%. Move both to your own forecast. At the bottom - what the owner keeps after platform fees, management, costs and tax.',
    payback: 'Payback', capRate: 'Yield per year',
    howCalced: 'How it was calculated',
    revenue: 'Revenue', platform: 'Platform', mgmt: 'Management', opex: 'Operating costs', tax: 'Tax', noi: 'Net to owner',
    phr: 'Accommodation tax', ffe: 'Wear-and-tear reserve', preTax: 'Profit before tax',
    entryPrice: 'Total entry cost', closing: 'closing', furnishing: 'furnishing',
    adrRealization: 'rate realization', opexFloorNote: 'baseline minimum',
    taxStatusLabel: 'Tax status', taxBefore: 'Before tax', taxResident: 'Resident', taxNonResident: 'Non-resident',
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
    widerRadius: (km: number) => `Few similar listings nearby, so the estimate uses listings within ${km} km.`,
    adrFew: (n: number) => `Few similar listings nearby (${n}), so the rate is a rough guide. Move the sliders to match your case.`,
    adrArea: 'No similar listings nearby, so the rate comes from listings with a similar number of bedrooms within 8 km and is very rough. Move the sliders to match your case.',
    referencesBody: (n: number, plural: string, km: number) =>
      `Only ${n} ${plural} matched the villa's profile within a ${km} km radius. We're not aggregating — here are concrete examples instead.`,
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
    tabDaily: 'Harian',
    tabMonthly: 'Bulanan',
    sectionSubMonthly: 'Perkiraan pendapatan dari sewa bulanan berdasarkan sewa nyata di sekitar, bukan janji pengembang.',
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
    perYearNoi: ' / tahun bersih',
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
    inputPrice: 'Harga', inputAdr: 'Tarif per malam', inputOccupancy: 'Okupansi', inputMgmt: 'Biaya pengelolaan',
    calcTitle: 'Kalkulator imbal hasil',
    calcSub: 'Harga per malam secara default adalah rata-rata antara tarif properti serupa di sekitar (kartunya di bawah) dan tarif biasa untuk properti dengan harga seperti ini. Okupansi mengikuti listing Booking serupa di sekitar sejak Agustus 2026, sedikit di bawah nilai tengah: properti baru lebih sulit disewakan daripada yang sudah dikenal. Jika sama sekali tidak ada data di sekitar - 60%. Geser sesuai perkiraan Anda. Di bawah - berapa yang tersisa untuk pemilik setelah komisi, pengelola, biaya, dan pajak.',
    payback: 'Balik modal', capRate: 'Imbal hasil per tahun',
    howCalced: 'Cara perhitungannya',
    revenue: 'Pendapatan', platform: 'Platform', mgmt: 'Pengelolaan', opex: 'Biaya operasional', tax: 'Pajak', noi: 'Bersih untuk pemilik',
    phr: 'Pajak hotel (PHR)', ffe: 'Cadangan penyusutan', preTax: 'Laba sebelum pajak',
    entryPrice: 'Total biaya masuk', closing: 'balik nama', furnishing: 'perabotan',
    adrRealization: 'realisasi tarif', opexFloorNote: 'minimum dasar',
    taxStatusLabel: 'Status pajak', taxBefore: 'Sebelum pajak', taxResident: 'Residen', taxNonResident: 'Non-residen',
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
    widerRadius: (km: number) => `Listing serupa di dekatnya sedikit, jadi perhitungan memakai listing dalam radius ${km} km.`,
    adrFew: (n: number) => `Listing serupa di dekatnya sedikit (${n}), jadi tarifnya perkiraan kasar. Geser slider sesuai kasus Anda.`,
    adrArea: 'Tidak ada listing serupa di dekatnya, jadi tarif diambil dari listing dengan jumlah kamar mirip dalam radius 8 km dan sangat kasar. Geser slider sesuai kasus Anda.',
    referencesBody: (n: number, plural: string, km: number) =>
      `Hanya ${n} ${plural} yang cocok dengan profil vila dalam radius ${km} km. Kami tidak mengagregasi — berikut contoh konkretnya.`,
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
    tabDaily: 'À la nuitée',
    tabMonthly: 'Au mois',
    sectionSubMonthly: 'Revenus estimés en location mensuelle, d’après les loyers réels du voisinage, et non une promesse du promoteur.',
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
    perYearNoi: ' / an net',
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
    inputPrice: 'Prix', inputAdr: 'Prix par nuit', inputOccupancy: 'Occupation', inputMgmt: 'Frais de gestion',
    calcTitle: 'Calculateur de rendement',
    calcSub: 'Le prix par nuit est par défaut la moyenne entre le tarif de biens similaires à proximité (leurs fiches sont ci-dessous) et le tarif habituel d’un bien de ce prix. L’occupation suit les annonces Booking similaires alentour depuis août 2026, un peu sous la médiane : un bien neuf se loue moins bien qu’un bien établi. Sans aucune donnée à proximité - 60 %. Ajustez selon votre prévision. En bas - ce qui reste au propriétaire après commissions, gestion, charges et impôts.',
    payback: 'Amortissement', capRate: 'Rendement annuel',
    howCalced: 'Méthode de calcul',
    revenue: 'Revenus', platform: 'Plateforme', mgmt: 'Gestion', opex: 'Charges d\'exploitation', tax: 'Impôt', noi: 'Net propriétaire',
    phr: 'Taxe de séjour', ffe: 'Réserve d\'usure', preTax: 'Bénéfice avant impôt',
    entryPrice: 'Coût d\'entrée total', closing: 'frais de notaire', furnishing: 'ameublement',
    adrRealization: 'réalisation du tarif', opexFloorNote: 'minimum de base',
    taxStatusLabel: 'Statut fiscal', taxBefore: 'Avant impôt', taxResident: 'Résident', taxNonResident: 'Non-résident',
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
    widerRadius: (km: number) => `Peu d'annonces similaires à proximité : le calcul porte sur un rayon de ${km} km.`,
    adrFew: (n: number) => `Peu de biens similaires à proximité (${n}) : le tarif est indicatif. Ajustez les curseurs à votre cas.`,
    adrArea: 'Aucun bien similaire à proximité : le tarif vient d’annonces avec un nombre de chambres proche dans un rayon de 8 km et reste très indicatif. Ajustez les curseurs à votre cas.',
    referencesBody: (n: number, plural: string, km: number) =>
      `Seulement ${n} ${plural} correspondent au profil de la villa dans un rayon de ${km} km. Nous n'agrégeons pas — voici plutôt des exemples concrets.`,
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
    tabDaily: 'Tageweise',
    tabMonthly: 'Monatlich',
    sectionSubMonthly: 'Geschätzte Erträge aus Monatsmiete, basierend auf realen Mieten in der Umgebung, kein Versprechen des Bauträgers.',
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
    perYearNoi: ' / Jahr netto',
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
    inputPrice: 'Preis', inputAdr: 'Preis pro Nacht', inputOccupancy: 'Auslastung', inputMgmt: 'Verwaltungsgebühr',
    calcTitle: 'Rendite-Rechner',
    calcSub: 'Der Preis pro Nacht ist standardmäßig der Mittelwert aus dem Satz ähnlicher Objekte in der Nähe (ihre Karten unten) und dem üblichen Satz für ein Objekt dieses Preises. Die Auslastung folgt ähnlichen Booking-Angeboten in der Umgebung seit August 2026, etwas unter der Mitte: neue Objekte vermieten sich schlechter als etablierte. Ganz ohne Daten in der Nähe - 60 %. Passen Sie beides an Ihre Prognose an. Unten - was dem Eigentümer nach Provisionen, Verwaltung, Kosten und Steuern bleibt.',
    payback: 'Amortisation', capRate: 'Rendite pro Jahr',
    howCalced: 'Wie es berechnet wurde',
    revenue: 'Umsatz', platform: 'Plattform', mgmt: 'Verwaltung', opex: 'Betriebskosten', tax: 'Steuer', noi: 'Netto für Eigentümer',
    phr: 'Beherbergungssteuer', ffe: 'Abnutzungsrücklage', preTax: 'Gewinn vor Steuern',
    entryPrice: 'Gesamte Einstiegskosten', closing: 'Abwicklung', furnishing: 'Möblierung',
    adrRealization: 'Ratenrealisierung', opexFloorNote: 'Grundminimum',
    taxStatusLabel: 'Steuerstatus', taxBefore: 'Vor Steuern', taxResident: 'Ansässig', taxNonResident: 'Nicht ansässig',
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
    widerRadius: (km: number) => `In der Nähe gibt es wenige ähnliche Angebote, daher rechnen wir mit einem Umkreis von ${km} km.`,
    adrFew: (n: number) => `Wenige ähnliche Objekte in der Nähe (${n}), der Preis ist daher grob. Passen Sie die Regler an Ihren Fall an.`,
    adrArea: 'Keine ähnlichen Objekte in der Nähe, daher stammt der Preis aus Angeboten mit ähnlicher Schlafzimmerzahl im Umkreis von 8 km und ist sehr grob. Passen Sie die Regler an Ihren Fall an.',
    referencesBody: (n: number, plural: string, km: number) =>
      `Nur ${n} ${plural} entsprachen dem Profil der Villa im Umkreis von ${km} km. Wir aggregieren nicht — hier stattdessen konkrete Beispiele.`,
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
    tabDaily: '按天',
    tabMonthly: '按月',
    sectionSubMonthly: '按月出租的预估收益，基于周边真实租金，而非开发商承诺。',
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
    perYearNoi: ' / 年 净收入',
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
    inputPrice: '价格', inputAdr: '每晚房价', inputOccupancy: '入住率', inputMgmt: '管理费',
    calcTitle: '收益计算器',
    calcSub: '每晚价格默认取附近类似房源的房价（卡片见下方）与同价位房产常见房价的平均值。入住率取2026年8月以来周边类似Booking房源的水平，略低于中位数：新房源比成熟房源更难出租。附近完全没有数据时取60%。可按您的预测调整。下方显示扣除佣金、管理费、开支和税费后业主实际所得。',
    payback: '回本周期', capRate: '年收益率',
    howCalced: '如何计算',
    revenue: '收入', platform: '平台', mgmt: '管理', opex: '运营支出', tax: '税费', noi: '业主净收入',
    phr: '住宿税', ffe: '折旧准备金', preTax: '税前利润',
    entryPrice: '总入手成本', closing: '过户', furnishing: '家具',
    adrRealization: '房价实现率', opexFloorNote: '基础最低值',
    taxStatusLabel: '税务身份', taxBefore: '税前', taxResident: '居民', taxNonResident: '非居民',
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
    widerRadius: (km: number) => `附近类似房源较少，因此按 ${km} 公里半径内的房源计算。`,
    adrFew: (n: number) => `附近相似房源较少（${n}），房价仅供粗略参考。请拖动滑块调整为您的情况。`,
    adrArea: '附近没有相似房源，房价取自8公里内卧室数相近的房源，仅供非常粗略的参考。请拖动滑块调整为您的情况。',
    referencesBody: (n: number, plural: string, km: number) =>
      `在${km}公里半径内只有 ${n} ${plural} 符合别墅的特征。我们不做汇总——而是给出具体示例。`,
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
    tabDaily: 'Per nacht',
    tabMonthly: 'Per maand',
    sectionSubMonthly: 'Geschatte opbrengst bij maandverhuur, op basis van echte huren in de buurt, geen belofte van de ontwikkelaar.',
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
    perYearNoi: ' / jaar netto',
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
    inputPrice: 'Prijs', inputAdr: 'Prijs per nacht', inputOccupancy: 'Bezetting', inputMgmt: 'Beheerkosten',
    calcTitle: 'Rendementscalculator',
    calcSub: 'De prijs per nacht is standaard het gemiddelde van het tarief van vergelijkbare objecten in de buurt (hun kaarten staan hieronder) en het gebruikelijke tarief voor een object van deze prijs. De bezetting volgt vergelijkbare Booking-advertenties in de omgeving sinds augustus 2026, iets onder het midden: nieuwe objecten verhuren slechter dan gevestigde. Zonder enige data in de buurt - 60%. Pas aan naar uw eigen verwachting. Onderaan - wat de eigenaar overhoudt na commissies, beheer, kosten en belasting.',
    payback: 'Terugverdientijd', capRate: 'Rendement per jaar',
    howCalced: 'Hoe het is berekend',
    revenue: 'Omzet', platform: 'Platform', mgmt: 'Beheer', opex: 'Exploitatiekosten', tax: 'Belasting', noi: 'Netto voor eigenaar',
    phr: 'Verblijfsbelasting', ffe: 'Slijtagereserve', preTax: 'Winst voor belasting',
    entryPrice: 'Totale instapkosten', closing: 'overdracht', furnishing: 'inrichting',
    adrRealization: 'tariefrealisatie', opexFloorNote: 'basisminimum',
    taxStatusLabel: 'Fiscale status', taxBefore: 'Vóór belasting', taxResident: 'Ingezetene', taxNonResident: 'Niet-ingezetene',
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
    widerRadius: (km: number) => `Weinig vergelijkbare aanbiedingen in de buurt, daarom rekenen we met een straal van ${km} km.`,
    adrFew: (n: number) => `Weinig vergelijkbare objecten in de buurt (${n}), dus het tarief is een ruwe schatting. Schuif de sliders naar uw situatie.`,
    adrArea: 'Geen vergelijkbare objecten in de buurt, dus het tarief komt van aanbiedingen met een vergelijkbaar aantal slaapkamers binnen 8 km en is heel ruw. Schuif de sliders naar uw situatie.',
    referencesBody: (n: number, plural: string, km: number) =>
      `Slechts ${n} ${plural} kwamen overeen met het profiel van de villa binnen een straal van ${km} km. We aggregeren niet — hier in plaats daarvan concrete voorbeelden.`,
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
    tabDaily: 'Harian',
    tabMonthly: 'Bulanan',
    sectionSubMonthly: 'Perkiraan pikolih saking sewa bulanan manut sewa sujati ring sampingne, boya janji pengembang.',
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
    perYearNoi: ' / warsa bersih',
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
    inputPrice: 'Aji', inputAdr: 'Aji awengi', inputOccupancy: 'Okupansi', inputMgmt: 'Prabéya pangelola',
    calcTitle: 'Kalkulator hasil',
    calcSub: 'Aji awengi default inggih punika rata-rata saking tarif properti pateh ring sisi (kartunipun ring sor) miwah tarif biasa majeng properti sane maaji asapuniki. Okupansi manut listing Booking pateh ring sisi saking Agustus 2026, akidik ring sor tengah: properti anyar kirang laris katimbang sane sampun kaloktah. Yening nenten wenten data pisan ring sisi - 60%. Geser manut perkiraan ragane. Ring sor - akuda sane kantun majeng sang maduwe sasampun komisi, pangelola, biaya, miwah pajak.',
    payback: 'Balik modal', capRate: 'Imbal hasil per tahun',
    howCalced: 'Sapunapi itunganne',
    revenue: 'Pikolih', platform: 'Platform', mgmt: 'Pangelola', opex: 'Prabea operasional', tax: 'Pajak', noi: 'Bersih ring sang nuwenang',
    phr: 'Pajak hotel (PHR)', ffe: 'Cadangan panyusutan', preTax: 'Bati sadurung pajak',
    entryPrice: 'Total prabea ngranjing', closing: 'balik nama', furnishing: 'prabot',
    adrRealization: 'realisasi tarif', opexFloorNote: 'minimum dasar',
    taxStatusLabel: 'Status pajak', taxBefore: 'Sebelum pajak', taxResident: 'Residen', taxNonResident: 'Non-residen',
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
    widerRadius: (km: number) => `Listing sane pateh ring sampingne akidik, mawinan itungan nganggen listing ring radius ${km} km.`,
    adrFew: (n: number) => `Properti sane mirip ring sekitar akidik (${n}), tarifnyane perkiraan kasar. Geser slider manut kasus ida dane.`,
    adrArea: 'Nenten wenten properti sane mirip ring sekitar, tarif kaambil saking iklan sane akeh kamarnyane mirip ring radius 8 km tur kasar pisan. Geser slider manut kasus ida dane.',
    referencesBody: (n: number, plural: string, km: number) =>
      `Wantah ${n} ${plural} sane cocok sareng profil vila ring radius ${km} km. Tiang nenten ngagregasi — puniki conto konkret.`,
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
    tabDaily: 'Na doby',
    tabMonthly: 'Miesięcznie',
    sectionSubMonthly: 'Szacowany dochód z najmu miesięcznego na podstawie realnych czynszów w okolicy, a nie obietnica dewelopera.',
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
    perYearNoi: ' / rok netto',
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
    inputPrice: 'Cena', inputAdr: 'Cena za noc', inputOccupancy: 'Obłożenie', inputMgmt: 'Opłata za zarządzanie',
    calcTitle: 'Kalkulator rentowności',
    calcSub: 'Cena za noc domyślnie to średnia ze stawki podobnych obiektów w pobliżu (ich karty poniżej) i zwykłej stawki dla obiektu w tej cenie. Obłożenie odpowiada podobnym ogłoszeniom Booking w okolicy od sierpnia 2026, nieco poniżej środka: nowe obiekty wynajmują się gorzej niż znane. Gdy w pobliżu nie ma żadnych danych - 60%. Dostosuj do własnej prognozy. Na dole - ile zostaje właścicielowi po prowizjach, zarządzaniu, kosztach i podatku.',
    payback: 'Zwrot', capRate: 'Rentowność roczna',
    howCalced: 'Jak to obliczono',
    revenue: 'Przychód', platform: 'Platforma', mgmt: 'Zarządzanie', opex: 'Koszty operacyjne', tax: 'Podatek', noi: 'Netto dla właściciela',
    phr: 'Podatek od zakwaterowania', ffe: 'Rezerwa na zużycie', preTax: 'Zysk przed opodatkowaniem',
    entryPrice: 'Całkowity koszt wejścia', closing: 'formalności', furnishing: 'umeblowanie',
    adrRealization: 'realizacja stawki', opexFloorNote: 'minimum bazowe',
    taxStatusLabel: 'Status podatkowy', taxBefore: 'Przed podatkiem', taxResident: 'Rezydent', taxNonResident: 'Nierezydent',
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
    widerRadius: (km: number) => `W pobliżu jest mało podobnych ofert, więc liczymy w promieniu ${km} km.`,
    adrFew: (n: number) => `Mało podobnych obiektów w pobliżu (${n}), więc stawka jest orientacyjna. Przesuń suwaki pod swój przypadek.`,
    adrArea: 'Brak podobnych obiektów w pobliżu, więc stawka pochodzi z ofert z podobną liczbą sypialni w promieniu 8 km i jest bardzo orientacyjna. Przesuń suwaki pod swój przypadek.',
    referencesBody: (n: number, plural: string, km: number) =>
      `Tylko ${n} ${plural} pasowało do profilu willi w promieniu ${km} km. Nie agregujemy — zamiast tego oto konkretne przykłady.`,
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
    tabDaily: 'Подобово',
    tabMonthly: 'Помісячно',
    sectionSubMonthly: "Скільки об'єкт може приносити при помісячній оренді. Усі цифри — оцінка за реальними ставками сусідів, а не обіцянка забудовника.",
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
    perYearNoi: ' / рік чистими',
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
    inputPrice: 'Ціна', inputAdr: 'Ціна за ніч', inputOccupancy: 'Заповнюваність', inputMgmt: 'Плата за управління',
    calcTitle: 'Калькулятор дохідності',
    calcSub: 'Ціна за ніч за замовчуванням - середнє між ставкою схожих об’єктів поруч (їхні картки нижче) і звичайною ставкою для об’єкта такої ціни. Завантаження - як у схожих оголошень довкола на Booking із серпня 2026 року, трохи нижче середини: нові об’єкти здаються гірше за розкручені. Якщо поруч даних немає зовсім - 60%. Пересувайте під свій прогноз. Унизу - скільки залишиться власникові після комісій, керуючої, витрат і податку.',
    payback: 'Окупність', capRate: 'Дохідність на рік',
    howCalced: 'Як це розраховано',
    revenue: 'Дохід', platform: 'Платформа', mgmt: 'Управління', opex: 'Операційні витрати', tax: 'Податок', noi: 'Чистими власнику',
    phr: 'Податок на проживання', ffe: 'Резерв на знос', preTax: 'Прибуток до податку',
    entryPrice: 'Ціна входу', closing: 'оформлення', furnishing: 'умеблювання',
    adrRealization: 'реалізація ставки', opexFloorNote: 'базовий мінімум',
    taxStatusLabel: 'Податковий статус', taxBefore: 'До податків', taxResident: 'Резидент', taxNonResident: 'Нерезидент',
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
    widerRadius: (km: number) => `Схожих об'єктів поруч мало, тому розрахунок за об'єктами в радіусі ${km} км.`,
    adrFew: (n: number) => `Схожих об'єктів поруч мало (${n}), тому ставка орієнтовна. Посуньте повзунки під свій варіант.`,
    adrArea: 'Схожих об\'єктів поруч немає, тому ставку взято за оголошеннями з близькою кількістю спалень у радіусі 8 км, вона дуже орієнтовна. Посуньте повзунки під свій варіант.',
    referencesBody: (n: number, plural: string, km: number) =>
      `Лише ${n} ${plural} відповідають профілю вілли в радіусі ${km} км. Ми не агрегуємо — натомість ось конкретні приклади.`,
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

const MONTHS_GEN_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const fmtDayRu = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS_GEN_RU[m - 1]} ${y}` }

export function InvestmentWidget({
  villaId,
  apiKey,
  kind = 'villa',
  lang,
  showMap = true,
}: { villaId: string; apiKey: string; kind?: 'villa' | 'apartment'; lang?: Lang; showMap?: boolean }) {
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

  return <InvestmentWidgetView snap={snap} apiKey={apiKey} lang={resolvedLang} showMap={showMap} />
}

function SectionShell({ children, lang, monthly }: { children: React.ReactNode; lang: Lang; monthly?: boolean }) {
  const t = pickCopy(COPY, lang)
  // mt-12 gives the heading breathing room from the white ContactBlock /
  // ManagerCard cards that sit immediately above on every detail page —
  // without it, the h2 was visually touching the contact card's bottom
  // edge and looked unindented.
  return (
    <section className="mt-12 mb-10" data-investment-block data-llm-skip="">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[var(--color-text)] mb-2">
        {t.sectionH2}
      </h2>
      <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
        {monthly ? t.sectionSubMonthly : t.sectionSub}
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

// showMap=false — страница сама показывает карту туристов в разделе «Место» (вилла, 15.10.2026).
function InvestmentWidgetView({ snap, apiKey, lang, showMap = true }: { snap: Snapshot; apiKey: string; lang: Lang; showMap?: boolean }) {
  const t = pickCopy(COPY, lang)
  const [rentMode, setRentMode] = useState<'daily' | 'monthly'>('daily')
  const allPois = useMemo(() => {
    const out: { lat: number; lng: number; name: string | null; category: string }[] = []
    for (const [cat, list] of Object.entries(snap.nearbyByCategory)) {
      for (const p of list) out.push({ lat: p.lat, lng: p.lng, name: p.name, category: cat })
    }
    return out
  }, [snap])
  return (
    <>
      <SectionShell lang={lang} monthly={snap.flags.rentalRestricted && !!snap.monthly}>
        {snap.flags.rentalRestricted ? (
          <>
            <Banner tone="warn" icon={<Info size={16} />}>
              <div>
                <div className="font-medium text-[var(--color-text)] mb-1">{t.restrictedTitle}</div>
                <div>{t.restrictedBody}</div>
              </div>
            </Banner>
            {snap.monthly && <MonthlyCalculator snap={snap} lang={lang} />}
          </>
        ) : (
          <>
            {snap.monthly && (
              <div role="tablist" aria-label={t.calcTitle} className="mb-1 inline-flex rounded-xl border border-[var(--color-border)] bg-white p-1">
                {(['daily', 'monthly'] as const).map(m => (
                  <button key={m} type="button" role="tab" aria-selected={rentMode === m} onClick={() => setRentMode(m)}
                    className={`min-h-[40px] cursor-pointer rounded-lg px-4 text-[14px] font-semibold transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${rentMode === m ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                    {m === 'daily' ? t.tabDaily : t.tabMonthly}
                  </button>
                ))}
              </div>
            )}
            {rentMode === 'monthly' && snap.monthly ? (
              <MonthlyCalculator snap={snap} lang={lang} />
            ) : snap.scenarios ? (
              <>
                <NightCost snap={snap} lang={lang} />
                <Calculator snap={snap} lang={lang} />
              </>
            ) : snap.references ? (
              <References snap={snap} lang={lang} />
            ) : null}
          </>
        )}

        {showMap && (
          <div className="mt-4">
            <InvestmentMap apiKey={apiKey} snap={snap} allPois={allPois} lang={lang} />
          </div>
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
  // fmtMoney сам переводит доллары в валюту посетителя — курс сюда не
  // умножать: раньше перевод шёл дважды, и в рупиях цена раздувалась в 16 000 раз.
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const sc = snap.scenarios!
  const basePrice = snap.villa.askingPrice

  // ADR slider band derived from the competitor percentiles (p25…p75),
  // widened so the user can explore a bit beyond the observed range.
  // Цена за ночь — вниз в десять раз и вверх вдвое от обычного коридора соседей.
  const adrLo = Math.max(1, Math.floor(sc.bad.adrAsking * 0.6 / 10))
  const adrHi = Math.max(adrLo + 1, Math.ceil(sc.good.adrAsking * 1.5 * 2), Math.ceil((snap.ownBooking?.adr ?? 0) * 1.2 * 2))

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
  // Комплекс сам сдаётся на Booking — стартуем с его цены и загрузки
  // (решение владельца 15.10.2026), иначе со ставки соседей и загрузки района.
  const own = snap.ownBooking
  const def = {
    price: basePrice ?? 0,
    adr: own?.adr ?? sc.median.adrAsking,
    occ: Math.round((own?.occupancy ?? snap.region.occupancyByScenario.median) * 100),
    mgmt: Math.round(snap.region.mgmtFeePct * 100),
  }
  const [adr, setAdr] = useState<number>(def.adr)
  const [occ, setOcc] = useState<number>(def.occ)
  const [mgmt, setMgmt] = useState<number>(def.mgmt)
  // Кнопка «Сбросить» появляется, как только что-то сдвинули.
  const changed = price !== def.price || adr !== def.adr || occ !== def.occ || mgmt !== def.mgmt
  const reset = () => { setPrice(def.price); setAdr(def.adr); setOcc(def.occ); setMgmt(def.mgmt) }
  const [taxStatus, setTaxStatus] = useState<TaxStatus>('beforeTax')
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

  // Цена — от десятой части до двойной: можно проверить любой свой сценарий.
  const priceLo = basePrice != null ? Math.round(basePrice / 10 / 500) * 500 : 0
  const priceHi = basePrice != null ? Math.round(basePrice * 2 / 500) * 500 : 0
  const opexUnit = lang === 'ru' ? '$/м²/мес' : '$/m²/mo'

  return (
    <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="text-[18px] font-semibold text-[var(--color-text)]">{t.calcTitle}</div>
        <ResetButton onClick={reset} lang={lang} show={changed} />
      </div>
      <div className="mt-2 mb-8 max-w-[68ch] text-[14px] leading-relaxed text-[var(--color-text-muted)]">{t.calcSub}</div>

      {/* Слева ползунки в одну колонку, справа итог. */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col gap-8">
        {basePrice != null && (
          <Slider label={t.inputPrice} value={price} min={priceLo} max={priceHi} step={500}
            onChange={setPrice} display={fmtUsd(Math.round(price))} />
        )}
        <Slider label={t.inputAdr} value={adr} min={adrLo} max={adrHi} step={1}
          onChange={setAdr} display={fmtUsd(Math.round(adr))}
          zones={adrZones} zonesLabel={t.densityScale} />
        <Slider label={t.inputOccupancy} value={occ} min={0} max={100} step={1}
          onChange={setOcc} display={`${occ}%`} />
        <Slider label={t.inputMgmt} value={mgmt} min={0} max={80} step={1}
          onChange={setMgmt} display={`${mgmt}%`} />
      </div>

      <div className="flex flex-col gap-6 rounded-xl bg-[var(--color-search-bg)] p-4 md:p-6 self-start">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[13px] text-[var(--color-text-muted)]">{t.taxStatusLabel}</span>
        <div className="flex w-full gap-1 rounded-lg border border-[var(--color-border)] bg-white p-1 sm:inline-flex sm:w-auto">
          {(['beforeTax', 'resident', 'nonResident'] as const).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setTaxStatus(key)}
              aria-pressed={taxStatus === key}
              className={`flex-auto whitespace-nowrap px-2.5 sm:px-4 py-1.5 text-[12px] rounded-md cursor-pointer transition-colors ${
                taxStatus === key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {key === 'beforeTax' ? t.taxBefore : key === 'resident' ? t.taxResident : t.taxNonResident}
            </button>
          ))}
        </div>
        <span className="w-full text-[12px] text-[var(--color-text-muted)]">{t.taxStatusHint}</span>
      </div>

      <div className="text-[32px] font-semibold text-[var(--color-text)] leading-none">
        {fmtUsd(e.noi)}<span className="text-[14px] font-normal text-[var(--color-text-muted)]">{t.perYearNoi}</span>
      </div>
      <dl className="flex flex-col gap-3 text-[14px]">
        <div className="flex justify-between gap-4"><dt className="text-[var(--color-text-muted)]">{t.payback}</dt><dd className="font-semibold text-[var(--color-text)]">{fmtYears(e.payback, lang)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[var(--color-text-muted)]">{t.capRate}</dt><dd className="font-semibold text-[var(--color-text)]">{fmtPct(e.capRate, 1, lang)}</dd></div>
        {e.leaseholdIrr != null && (
          <div className="flex justify-between gap-4"><dt className="text-[var(--color-text-muted)]">{t.irrLabel}</dt><dd className="font-semibold text-[var(--color-text)]">{fmtPct(e.leaseholdIrr, 1, lang)}</dd></div>
        )}
      </dl>

      {e.capitalReturned === false && (
        <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3">
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
        className="inline-flex items-center gap-1 self-start text-[13px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] cursor-pointer"
      >
        {t.howCalced} {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      </div>
      </div>
      {open && (
        <ul className="mt-6 text-[12px] text-[var(--color-text)] space-y-0.5 border-t border-[var(--color-border)] pt-2">
          <li>
            {t.revenue}: {fmtUsd(e.revenue)}
            <span className="text-[var(--color-text-muted)]"> · {fmtUsd(Math.round(e.adr))} × 365 × {Math.round(e.occupancy * 100)}%</span>
          </li>
          <li className="text-[var(--color-text-muted)]">
            {t.adrRealization}: {Math.round(snap.region.adrRealizationByScenario.median * 100)}% · {fmtUsd(Math.round(e.adrAsking))} → {fmtUsd(Math.round(e.adr))}
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
            − {t.opex} ({e.opexAtFloor ? t.opexFloorNote : `${lang === 'ru' ? String(snap.region.opexPerSqmMonth).replace('.', ',') : snap.region.opexPerSqmMonth} ${opexUnit}`}): {fmtUsd(e.opex)}
          </li>
          <li className="pl-4 text-[var(--color-text-muted)]">· {t.utilities}: {fmtUsd(Math.round(e.opexParts.utilities))}</li>
          <li className="pl-4 text-[var(--color-text-muted)]">· {t.staff}: {fmtUsd(Math.round(e.opexParts.staff))}</li>
          <li className="pl-4 text-[var(--color-text-muted)]">· {t.supplies}: {fmtUsd(Math.round(e.opexParts.supplies))}</li>
          <li className="pl-4 text-[var(--color-text-muted)]">· {t.poolGarden}: {fmtUsd(Math.round(e.opexParts.poolGarden))}</li>
          <li className="pl-4 text-[var(--color-text-muted)]">· {t.otherOpex}: {fmtUsd(Math.round(e.opexParts.other))}</li>
          <li>
            − {t.ffe} ({Math.round(snap.region.ffeReservePct * 100)}%): {fmtUsd(e.ffeReserve)}
            <span className="text-[var(--color-text-muted)]"> · {t.ffeHint}</span>
          </li>
          {e.pbbTax > 0 && (
            <li>
              − {t.pbb}: {fmtUsd(Math.round(e.pbbTax))}
              <span className="text-[var(--color-text-muted)]"> · {t.pbbHint}</span>
            </li>
          )}
          <li className="pt-1 border-t border-[var(--color-border)] mt-1">= {t.preTax}: {fmtUsd(e.preTaxProfit)}</li>
          {taxStatus !== 'beforeTax' && <li>
            − {t.tax} ({Math.round((taxStatus === 'resident' ? snap.region.taxRateResident : snap.region.taxRateNonResident) * 100)}%): {fmtUsd(e.tax)}
            <span className="text-[var(--color-text-muted)]"> · {taxStatus === 'resident' ? t.taxHintRes : t.taxHintNonRes}</span>
          </li>}
          <li className="pt-1 border-t border-[var(--color-border)] mt-1 font-medium">= {t.noi}: {fmtUsd(e.noi)}</li>
          {e.entryPrice != null && (
            <li className="pt-2 mt-1 border-t border-[var(--color-border)] text-[var(--color-text-muted)]">
              {t.entryPrice}: {fmtUsd(Math.round(e.entryPrice))} · {fmtUsd(Math.round(price))} + {t.closing} {fmtUsd(Math.round(e.closingCost))}
              {e.furnishing > 0 ? ` + ${t.furnishing} ${fmtUsd(Math.round(e.furnishing))}` : ''}
            </li>
          )}
          <li className="pt-2 mt-1 border-t border-[var(--color-border)] text-[var(--color-text-muted)]">
            {t.assumptions}: {t.occupancyNote} {Math.round(e.occupancy * 100)}% — {t.occupancyHint}
          </li>
        </ul>
      )}

      {/* Соседи — ниже расчёта, как у помесячной аренды. */}
      {snap.villa.lat != null && snap.villa.lng != null && (
        <RentalComps lat={snap.villa.lat} lng={snap.villa.lng} adr={adr} lang={lang} />
      )}
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
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide font-semibold text-[var(--color-text)] mb-2">
        <Info size={14} /> {t.referencesTitle}
      </div>
      <div className="text-[13px] text-[var(--color-text-muted)] mb-4">
        {t.referencesBody(snap.matchSampleSize, plural, snap.searchRadiusKm ?? 2)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(snap.references ?? []).map(r => (
          <a key={r.id} href={r.url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="rounded-xl border border-[var(--color-border)] p-3 hover:border-[var(--color-primary)] no-underline text-[var(--color-text)]">
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
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide font-semibold text-[var(--color-text)] mb-2">
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
