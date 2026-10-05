import Image from 'next/image'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'

// Фото и видео статьи (новость / акция / мероприятие). Одна картинка — как
// раньше, обложкой 16:9. Несколько (альбом из чата застройщика, см.
// lib/dev-updates.ts) — галереей с просмотром на весь экран, той же, что у
// объектов. Видео — файлы из Storage, встроенным плеером после текста.

export function ArticleMedia({ photo, photos, alt }: { photo: string | null; photos?: string[]; alt: string }) {
  const all = photos?.length ? photos : photo ? [photo] : []
  if (all.length === 0) return null
  if (all.length === 1) {
    return (
      <div className="relative w-full mb-8 rounded-2xl overflow-hidden bg-[var(--color-search-bg)] aspect-[16/9]">
        <Image src={all[0]} alt={alt} fill sizes="(max-width: 768px) 100vw, 800px" priority className="object-cover" />
      </div>
    )
  }
  return (
    <div className="mb-8">
      <PhotoGalleryHero photos={all} alt={alt} />
    </div>
  )
}

export function ArticleVideos({ videos }: { videos?: string[] }) {
  if (!videos?.length) return null
  return (
    <div className="mt-8 grid gap-4">
      {videos.map(src => (
        <video
          key={src}
          src={src}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-[80vh] rounded-2xl bg-black"
        />
      ))}
    </div>
  )
}
