import Link from 'next/link'
import { ProgressBar } from './ProgressBar'
import { PhotoSlider } from './PhotoSlider'

export type ComplexCardData = {
  slug: string
  name: string
  location: string | null
  types: string | null
  permit: string | null
  readiness: number
  coverUrl: string | null
  photos: string[]
  photoCount: number
}

export function ComplexCard({ c }: { c: ComplexCardData }) {
  // Prefer the synced storage photos (multi-image slider). Fallback to the
  // single cover image if the manifest doesn't have entries yet.
  const slides = c.photos.length > 0 ? c.photos : c.coverUrl ? [c.coverUrl] : []

  return (
    <Link
      href={`/ru/zhilye-kompleksy/o/${c.slug}`}
      className="group block bg-[var(--color-card-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden hover:shadow-sm transition-shadow"
    >
      <PhotoSlider photos={slides} alt={c.name} heightClass="h-[240px] md:h-[360px]" />

      <div className="p-6">
        <h3 className="text-[24px] font-semibold text-[var(--color-text)] mb-3 truncate">{c.name}</h3>
        {c.location && (
          <div className="text-[15px] text-[var(--color-text)] mb-3">{c.location}</div>
        )}
        {c.types && (
          <div className="text-[15px] text-[var(--color-text-muted)] mb-3">{c.types}</div>
        )}
        <div className="text-[15px] text-[var(--color-text-muted)] mb-6">
          Разрешение на строительство: {c.permit ?? 'нет'}
        </div>
        <div className="text-[15px] font-medium text-[var(--color-text)] mb-3">
          Готовность строительства
        </div>
        <ProgressBar value={c.readiness} />
      </div>
    </Link>
  )
}
