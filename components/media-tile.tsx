// Плитка «фишки» под главным фото (планировки, генплан, видео, солнце,
// 3D-карта): картинка, затемнение, иконка и подпись — один вид для всех
// (макет «Медиаблок виллы», вариант A, владелец 2026-11-10).
import type { ReactNode } from 'react'

export const MEDIA_TILE = 'relative h-[84px] sm:h-[96px] w-full rounded-lg overflow-hidden cursor-pointer bg-[#2A3530] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-wait'

/** Затемнение с иконкой и подписью поверх картинки плитки. */
export function MediaTileLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-1 bg-[rgb(16_24_20/0.62)] text-white text-[12px] sm:text-[14px] leading-tight text-center font-semibold">
      {icon}
      {children}
    </span>
  )
}
