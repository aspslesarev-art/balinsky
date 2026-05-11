'use client'

// "Скачать AI-оценку" — opens /api/reports/<kind>/<slug>?download=1
// in a new tab. Generation takes 5–10 s (one OpenAI hop + PDF
// rendering), so we show a transient loading state on click.

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export function DownloadReportButton({
  kind, slug, lang = 'ru',
}: {
  kind: 'villa' | 'apartment' | 'complex'
  slug: string
  lang?: 'ru' | 'en'
}) {
  const [loading, setLoading] = useState(false)
  const url = `/api/reports/${kind}/${encodeURIComponent(slug)}?download=1`

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    setLoading(true)
    // Fire the request in a hidden iframe-like nav; browser handles
    // the download. Reset state after a small delay since we can't
    // know exactly when the buffer reaches the client.
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => setLoading(false), 8000)
  }

  return (
    <a
      href={url}
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--color-border)] bg-white text-[14px] font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] no-underline"
      title={lang === 'en' ? 'Generate AI investment report (PDF)' : 'Сгенерировать AI-отчёт по объекту (PDF)'}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      {lang === 'en' ? 'AI report (PDF)' : 'AI-оценка (PDF)'}
    </a>
  )
}
