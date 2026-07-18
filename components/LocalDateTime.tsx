'use client'

import { useEffect, useState } from 'react'
import { BALI_TZ, fmtBali, fmtLocal } from '@/lib/datetime'
import { pickCopy, type Lang } from '@/lib/i18n'

type Props = {
  iso: string
  withYear?: boolean
  withTime?: boolean
  className?: string
  prefix?: string
  suffix?: string
  lang?: Lang
}

// Renders the Bali-time string on the server (so the initial HTML always shows
// Bali time). After hydration, if the visitor is not in Bali, swaps to their
// local time. Original Bali string stays available as a tooltip.
export function LocalDateTime({ iso, withYear, withTime, className, prefix, suffix, lang = 'ru' }: Props) {
  const baliText = fmtBali(iso, { withYear, withTime, lang })
  const [text, setText] = useState(baliText)
  const [tooltip, setTooltip] = useState<string | undefined>(undefined)

  useEffect(() => {
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (userTz === BALI_TZ) return
      const localText = fmtLocal(iso, { withYear, withTime, lang })
      if (localText !== baliText) {
        setText(localText)
        setTooltip(`${pickCopy({ ru: 'Бали', en: 'Bali', id: 'Bali', fr: 'Bali', de: 'Bali', zh: '巴厘岛', nl: 'Bali', ban: 'Bali' }, lang)}: ${baliText}`)
      }
    } catch {
      // Intl may throw on very old browsers — keep Bali text in that case.
    }
  }, [iso, withYear, withTime, baliText, lang])

  return (
    <time dateTime={iso} title={tooltip} className={className} suppressHydrationWarning>
      {prefix}{text}{suffix}
    </time>
  )
}
