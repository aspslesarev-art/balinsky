export type RegionDefaults = {
  region: string
  currency: 'USD' | 'IDR' | 'RUB'
  occupancyByScenario: { bad: number; median: number; good: number }
  // Ставка с площадки — это цена запроса, а не полученная. Скидки за длинное
  // проживание, ранние брони и промо съедают часть, поэтому в выручку идёт
  // ставка с коэффициентом реализации.
  adrRealizationByScenario: { bad: number; median: number; good: number }
  platformFeePct: number
  mgmtFeePct: number
  // PHR (Pajak Hotel dan Restoran) — 10% с оборота размещения. Формально его
  // платит гость сверху, но если ставка объявлена «всё включено», он ложится
  // на владельца. Реальность посередине, поэтому доля владельца — по сценарию.
  phrRatePct: number
  phrOwnerShareByScenario: { bad: number; median: number; good: number }
  opexPerSqmMonth: number
  // Из чего складываются операционные расходы. Доли применяются к
  // итоговой сумме расходов, чтобы разбивка в виджете сходилась с
  // общей строкой. Пропорции — по замеру Bukit Vista для виллы в
  // Улувату: уборка и персонал, расходники гостям, электричество и
  // вода примерно равны по весу, бассейн с садом и связь — остаток.
  opexBreakdown: {
    utilities: number
    staff: number
    supplies: number
    poolGarden: number
    other: number
  }
  // Базовые расходы виллы почти не зависят от её размера: охрана, садовник,
  // бассейн, интернет, минимальный штат. По замеру Bukit Vista для
  // трёхспальной виллы core-расходы — IDR 6,3–9,5 млн/мес (~$390–590).
  // Формула по площади занижает их для компактных объектов, поэтому
  // расходы берутся как максимум из двух оценок.
  opexFloorBase: number
  opexFloorPerBedroom: number
  // Мебель, техника и текстиль в аренде изнашиваются за 5–7 лет. Без резерва
  // доходность считается за счёт будущего ремонта.
  ffeReservePct: number
  // Вход стоит дороже прайса: BPHTB, нотариус, оформление.
  closingCostPct: number
  // Меблировка под аренду: $15–25k на двухспальную виллу ≈ $80–165/м².
  // Берём нижнюю границу — часть застройщиков отдаёт объект с мебелью.
  furnishingPerSqm: number
  taxRateResident: number
  taxRateNonResident: number
  // PBB — ежегодный налог на землю и здание: 0,1–0,5% от кадастровой
  // оценки NJOP, которая обычно заметно ниже рыночной цены. Здесь
  // задан сразу как доля от цены объекта: 0,2% от NJOP при NJOP около
  // половины рынка.
  pbbAnnualPctOfPrice: number
  capRateThresholdWeak: number
}

export const BALI_DEFAULTS: RegionDefaults = {
  region: 'Bali',
  currency: 'USD',
  // Загрузка привязана к отраслевому ориентиру по Бали (55–65% годовых,
  // 70–80% у лучших объектов «золотого треугольника»), а НЕ к наблюдаемой
  // в выдаче booking. Там медиана 87–96%, но эта метрика считает «дату
  // нельзя забронировать», а не «дату продали», и снимается в пик сезона.
  occupancyByScenario: { bad: 0.50, median: 0.60, good: 0.70 },
  adrRealizationByScenario: { bad: 0.85, median: 0.90, good: 0.95 },
  platformFeePct: 0.16,
  mgmtFeePct: 0.17,
  phrRatePct: 0.10,
  phrOwnerShareByScenario: { bad: 1.0, median: 0.5, good: 0.0 },
  opexPerSqmMonth: 4,
  opexBreakdown: { utilities: 0.30, staff: 0.30, supplies: 0.25, poolGarden: 0.08, other: 0.07 },
  opexFloorBase: 1500,
  opexFloorPerBedroom: 1400,
  ffeReservePct: 0.04,
  closingCostPct: 0.05,
  furnishingPerSqm: 80,
  taxRateResident: 0.10,
  taxRateNonResident: 0.20,
  pbbAnnualPctOfPrice: 0.001,
  // Порог «слабо» — относительный, а не абсолютный: медианная чистая
  // доходность новостроя Бали при этих допущениях около 2%, поэтому
  // прежние 6% помечали бы весь рынок без разбора.
  capRateThresholdWeak: 0.015,
}

export function regionFor(_lat: number, _lng: number): RegionDefaults {
  // Single-region MVP — всегда Бали
  return BALI_DEFAULTS
}
