// Зоны «плохо / средне / хорошо» в «Будет ли спрос?» (владелец 23.10.2026):
// полупрозрачные фон и рамка — у плашки и у карточки соседа. Отдельно от
// компонентов, чтобы классы брали и серверные, и клиентские.
export type Band = 'bad' | 'mid' | 'good'

export const BAND_SURFACE: Record<Band, string> = {
  bad: 'border-[rgb(209_67_52/.35)] bg-[rgb(209_67_52/.08)]',
  mid: 'border-[rgb(232_160_40/.45)] bg-[rgb(232_160_40/.12)]',
  good: 'border-[rgb(31_139_95/.40)] bg-[rgb(31_139_95/.08)]',
}
export const BAND_TEXT: Record<Band, string> = {
  bad: 'text-[#8A1F14]',
  mid: 'text-[#7A4B0B]',
  good: 'text-[var(--color-primary-pressed)]',
}
