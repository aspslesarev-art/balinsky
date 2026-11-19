// Левая колонка окна медиаблока на компьютере (владелец 2026-11-19): у всех
// вкладок меню, список, легенда и кнопки стоят слева одной ширины, картинка,
// план, карта или документ - справа. «Чтобы формат всегда был одинаковый».

/** Колонка там, где она рисуется только на компьютере (по useWide). */
export const VIEWER_ASIDE = 'w-[320px] shrink-0 p-6 border-r border-white/[0.08] flex flex-col gap-4 overflow-y-auto [&>*]:shrink-0'
/** То же для разметки, общей с телефоном: действует с lg. */
export const VIEWER_ASIDE_LG = 'lg:w-[320px] lg:shrink-0 lg:p-6 lg:border-r lg:border-white/[0.08] lg:flex lg:flex-col lg:gap-4 lg:overflow-y-auto lg:[&>*]:shrink-0'
/** Подпись раздела в колонке: «ПЛАНИРОВКИ», «5 ВИДЕО». */
export const VIEWER_LABEL = 'text-[13px] font-semibold uppercase tracking-wide text-white/60'
