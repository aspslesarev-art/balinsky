'use client'

import { useEffect, useRef, useState } from 'react'
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
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [isNear, setIsNear] = useState(false)

  /**
   * Нативный `loading="lazy"` здесь ничего не откладывает: секция стоит
   * высоко и попадает в первый экран, так что 134 КБ (Three.js + страница
   * модели) грузились у всех, включая тех, кто до 3D не доскроллил.
   * Поэтому `src` подставляем сами, когда секция подошла к экрану.
   *
   * Вторым сообщением гасим цикл рендера, когда модель ушла с экрана:
   * иначе WebGL с тенями продолжает рисовать 60 fps всё время, пока
   * открыта вкладка. Раз смонтированный фрейм не размонтируем — иначе
   * возврат к секции заново тянул бы Three.js.
   */
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsNear(true)
        frameRef.current?.contentWindow?.postMessage(
          { type: 'model:visible', visible: entry.isIntersecting },
          window.location.origin,
        )
      },
      // Запас намеренно небольшой: секция лежит примерно в 200 px под сгибом,
      // и щедрый rootMargin снова грузил бы модель тем, кто вообще не
      // прокрутил страницу. Дотянуться до секции — это ещё около 1000 px
      // прокрутки, так что старта по первому же движению хватает с запасом.
      { rootMargin: '150px' },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

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
    <section className="mb-10" ref={sectionRef}>
      <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
        {heading}
      </h2>
      {/* Фрейм во всю ширину окна, заголовок и ссылка остаются в колонке.
          Отрицательные поля calc(50vw - 50%) выносят блок за контейнер, не
          завися от его текущей ширины. max-w-none обязателен: базовый слой
          globals.css иначе зажимает любого потомка <main> шириной родителя. */}
      <iframe
        ref={frameRef}
        src={isNear ? src : undefined}
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
