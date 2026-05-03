import Link from 'next/link'
import { Play, ChevronRight } from 'lucide-react'
import type { YouTubeVideo } from '@/lib/youtube'

const CHANNEL_URL = 'https://www.youtube.com/@balinsky_info'

export function YouTubeBlock({ videos }: { videos: YouTubeVideo[] }) {
  if (videos.length === 0) return null
  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-5">
        <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827]">
          Видео с канала Balinsky
        </h2>
        <Link
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener"
          className="text-[13px] text-[var(--color-primary)] hover:text-[var(--color-primary-pressed)] inline-flex items-center gap-1 no-underline"
        >
          Все видео на YouTube <ChevronRight size={14} />
        </Link>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        {videos.map(v => (
          <li key={v.id}>
            <Link
              href={v.url}
              target="_blank"
              rel="noopener"
              className="group block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors"
            >
              <div className="relative aspect-video bg-[var(--color-search-bg)]">
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/15 transition-colors">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.18)] text-[#111827]">
                    <Play size={20} fill="currentColor" />
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div
                  className="text-[14px] font-semibold leading-snug overflow-hidden"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                >
                  {v.title}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
