import { Maximize2 } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

type Props = {
  /** Путь к самодостаточной HTML-странице модели в `public/models/`. */
  src: string
  lang: Lang
}

/**
 * Секция «3D-планировка» на странице виллы: модель во фрейме плюс ссылка
 * открыть её отдельной вкладкой.
 *
 * Страница модели самодостаточна (свой Three.js), поэтому она грузится
 * фреймом, а не монтируется в приложение: так её вес не попадает в бандл
 * страницы, а `loading="lazy"` откладывает загрузку до подхода к секции.
 */
export function Villa3DPlan({ src, lang }: Props) {
  const heading = pickCopy(
    {
      ru: '3D-планировка', en: '3D floor plan', id: 'Denah 3D', fr: 'Plan 3D',
      de: '3D-Grundriss', zh: '3D 户型图', nl: 'Plattegrond in 3D',
      ban: 'Denah 3D', pl: 'Rzut 3D', uk: '3D-планування',
    },
    lang,
  )
  const frameTitle = pickCopy(
    {
      ru: '3D-планировка виллы', en: '3D floor plan of the villa',
      id: 'Denah 3D vila', fr: 'Plan 3D de la villa', de: '3D-Grundriss der Villa',
      zh: '别墅 3D 户型图', nl: '3D-plattegrond van de villa', ban: 'Denah 3D vila',
      pl: 'Rzut 3D willi', uk: '3D-планування вілли',
    },
    lang,
  )
  const fullscreen = pickCopy(
    {
      ru: 'Открыть на весь экран', en: 'Open fullscreen', id: 'Buka layar penuh',
      fr: 'Ouvrir en plein écran', de: 'Im Vollbild öffnen', zh: '全屏打开',
      nl: 'Volledig scherm openen', ban: 'Buka layar penuh',
      pl: 'Otwórz na pełnym ekranie', uk: 'Відкрити на весь екран',
    },
    lang,
  )

  return (
    <section className="mb-10">
      <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
        {heading}
      </h2>
      {/* Фрейм во всю ширину окна, заголовок и ссылка остаются в колонке.
          Отрицательные поля calc(50vw - 50%) выносят блок за контейнер, не
          завися от его текущей ширины. max-w-none обязателен: базовый слой
          globals.css иначе зажимает любого потомка <main> шириной родителя. */}
      <iframe
        src={src}
        title={frameTitle}
        loading="lazy"
        className="block w-screen max-w-none ml-[calc(50%-50vw)] h-[450px] md:h-[600px] border-0"
      />
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-primary-pressed)] hover:gap-3 transition-all"
      >
        <Maximize2 size={15} /> {fullscreen}
      </a>
    </section>
  )
}
