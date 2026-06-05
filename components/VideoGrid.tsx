import Image from 'next/image'
import { Play } from 'lucide-react'
import type { VideoItem } from '@/lib/videos'

function ytId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{6,})/)
  return m ? m[1] : null
}
function ytThumb(url: string): string | null {
  const id = ytId(url)
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
}

export function VideoGrid({ videos, title = 'Видео' }: { videos: VideoItem[]; title?: string }) {
  if (videos.length === 0) return null
  // VideoObject JSON-LD per embedded YouTube clip. Google uses the
  // thumbnail and title for video-carousel rich results, and the
  // contentUrl makes the video itself crawlable as a resource.
  // uploadDate falls back to today's date when Airtable hasn't tagged
  // the row — required field, can't be missing for a valid record.
  const today = new Date().toISOString().slice(0, 10)
  const videosJsonLd = {
    '@context': 'https://schema.org',
    '@graph': videos
      .map(v => ({ v, id: ytId(v.url), thumb: ytThumb(v.url) }))
      .filter(x => x.id && x.thumb)
      .map(({ v, thumb }) => ({
        '@type': 'VideoObject',
        name: v.name ?? title,
        description: v.name ?? title,
        thumbnailUrl: thumb!,
        uploadDate: v.addedAt ? v.addedAt.slice(0, 10) : today,
        contentUrl: v.url,
        embedUrl: v.embedUrl ?? v.url,
      })),
  }
  return (
    <section className="mb-10">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
        {title}
      </h2>
      {/* Mobile: horizontal swipe with the next card peeking; desktop: grid. */}
      <ul className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {videos.map(v => {
          const thumb = ytThumb(v.url)
          return (
            <li key={v.id} className="snap-start shrink-0 w-[80%] sm:w-[46%] md:w-auto">
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors group"
              >
                <div className="relative w-full aspect-video bg-[var(--color-search-bg)]">
                  {thumb ? (
                    <Image src={thumb} alt={v.name ?? 'Видео'} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                    <div className="w-14 h-14 rounded-full bg-[#FF0000] text-white inline-flex items-center justify-center shadow-lg">
                      <Play size={22} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                </div>
                {v.name && (
                  <div className="p-3 text-[14px] font-medium leading-snug line-clamp-3">{v.name}</div>
                )}
              </a>
            </li>
          )
        })}
      </ul>
      {videosJsonLd['@graph'].length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videosJsonLd) }} />
      )}
    </section>
  )
}
