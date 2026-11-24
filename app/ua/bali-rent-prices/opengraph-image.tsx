// Картинка превью раздела (общая) — см. lib/og-default.tsx
import { ogSize, ogContentType } from '@/lib/og-image'
import { renderDefaultOg, defaultOgAlt } from '@/lib/og-default'

export const size = ogSize
export const contentType = ogContentType
export const alt = defaultOgAlt

export default function Image() {
  return renderDefaultOg()
}
