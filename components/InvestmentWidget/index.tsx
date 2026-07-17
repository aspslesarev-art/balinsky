'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Info, ChevronDown, ChevronUp, TrendingUp,
} from 'lucide-react'
import { InvestmentMap } from './InvestmentMap'
import { fmtMoney, fmtPct, fmtYears, fmtDistance, pluralRu, pluralEn } from './utils'
import type { Snapshot } from './types'
import { useCurrency } from '../CurrencyContext'
import { computeEconomics, type Economics } from '@/lib/investment/economics'
import { CURRENCY_RATES } from '@/lib/currency'
import { pickCopy, type Lang, detectLang } from '@/lib/i18n'

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
    revenue: 'Revenue', platform: 'Platform', mgmt: 'Mgmt', opex: 'OPEX', tax: 'Tax', noi: 'NOI',
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
    revenue: 'Revenue', platform: 'Platform', mgmt: 'Mgmt', opex: 'OPEX', tax: 'Tax', noi: 'NOI',
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
    revenue: 'Pendapatan', platform: 'Platform', mgmt: 'Pengelolaan', opex: 'OPEX', tax: 'Pajak', noi: 'NOI',
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
    revenue: 'Revenus', platform: 'Plateforme', mgmt: 'Gestion', opex: 'OPEX', tax: 'Taxe', noi: 'NOI',
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
    revenue: 'Umsatz', platform: 'Plattform', mgmt: 'Verwaltung', opex: 'OPEX', tax: 'Steuer', noi: 'NOI',
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
    revenue: '收入', platform: '平台', mgmt: '管理', opex: 'OPEX', tax: '税费', noi: 'NOI',
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
    revenue: 'Omzet', platform: 'Platform', mgmt: 'Beheer', opex: 'OPEX', tax: 'Belasting', noi: 'NOI',
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
    revenue: 'Pikolih', platform: 'Platform', mgmt: 'Pangelola', opex: 'OPEX', tax: 'Pajak', noi: 'NOI',
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
  const adrLo = Math.max(1, Math.floor(sc.bad.adr * 0.6))
  const adrHi = Math.max(adrLo + 1, Math.ceil(sc.good.adr * 1.5))

  const [price, setPrice] = useState<number>(basePrice ?? 0)
  const [adr, setAdr] = useState<number>(sc.median.adr)
  const [occ, setOcc] = useState<number>(Math.round(snap.region.occupancyByScenario.median * 100))
  const [mgmt, setMgmt] = useState<number>(Math.round(snap.region.mgmtFeePct * 100))
  const [open, setOpen] = useState(false)

  const e: Economics = useMemo(() => computeEconomics({
    adr,
    occupancy: occ / 100,
    area: snap.villa.area,
    askingPrice: basePrice != null ? price : null,
    leaseholdYearsLeft: snap.villa.leaseholdYearsLeft,
    region: { ...snap.region, mgmtFeePct: mgmt / 100 },
  }), [adr, occ, mgmt, price, basePrice, snap])

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
          onChange={setAdr} display={fmtUsd(Math.round(adr * fxRate))} />
        <Slider label={t.inputOccupancy} value={occ} min={0} max={100} step={1}
          onChange={setOcc} display={`${occ}%`} />
        <Slider label={t.inputMgmt} value={mgmt} min={0} max={80} step={1}
          onChange={setMgmt} display={`${mgmt}%`} />
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <div className="text-[30px] font-semibold text-[#111827] leading-none">
          {fmtUsd(e.noi)}<span className="text-[14px] font-normal text-[var(--color-text-muted)]">{t.perYearNoi}</span>
        </div>
        <div className="text-[13px] text-[var(--color-text-muted)]">{t.payback}: <span className="text-[#111827] font-medium">{fmtYears(e.payback, lang)}</span></div>
        <div className="text-[13px] text-[var(--color-text-muted)]">{t.capRate}: <span className="text-[#111827] font-medium">{fmtPct(e.capRate)}</span></div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="mt-3 inline-flex items-center gap-1 text-[12px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] cursor-pointer"
      >
        {t.howCalced} {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <ul className="mt-2 text-[12px] text-[var(--color-text)] space-y-0.5 border-t border-[var(--color-border)] pt-2">
          <li>{t.revenue}: {fmtUsd(e.revenue)}</li>
          <li>− {t.platform} ({Math.round(snap.region.platformFeePct * 100)}%): {fmtUsd(e.platformFee)}</li>
          <li>− {t.mgmt} ({mgmt}%): {fmtUsd(e.mgmtFee)}</li>
          <li>− {t.opex} ({snap.region.opexPerSqmMonth} {opexUnit}): {fmtUsd(e.opex)}</li>
          <li>− {t.tax} ({Math.round(snap.region.taxRate * 100)}%): {fmtUsd(e.tax)}</li>
          <li className="pt-1 border-t border-[var(--color-border)] mt-1 font-medium">= {t.noi}: {fmtUsd(e.noi)}</li>
        </ul>
      )}
    </div>
  )
}

function Slider({
  label, value, min, max, step, onChange, display,
}: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string
}) {
  const clamped = Math.min(max, Math.max(min, value))
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-[var(--color-text-muted)]">{label}</span>
        <span className="text-[15px] font-semibold text-[#111827] tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        onChange={ev => onChange(Number(ev.target.value))}
        className="w-full h-1.5 cursor-pointer accent-[var(--color-primary)]"
      />
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
