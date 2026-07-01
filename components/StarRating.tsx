import { Star } from 'lucide-react'

// 5-star display with partial fill (TASK-13b). Visible on-page counterpart of
// the reviewRating JSON-LD — Google needs the rating visible or it treats the
// markup as spam.
export function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle" aria-label={`${value} из 5`}>
      {[1, 2, 3, 4, 5].map(i => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)))
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="text-[#E5E7EB]" fill="currentColor" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-[#F59E0B]" fill="currentColor" />
            </span>
          </span>
        )
      })}
    </span>
  )
}
