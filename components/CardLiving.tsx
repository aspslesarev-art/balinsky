import { Home } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

// «школа 1,8 км · пляж 750 м» на карточке каталога в режиме «Для жизни» —
// вместо доходности. Расстояния те же, что в блоке «Удобно ли тут жить»
// на странице объекта (lib/living.ts → listing_living).
export type CardLivingData = { school_km: number | null; beach_km: number | null }

const WORDS: Record<Lang, { school: string; beach: string; m: string; km: string }> = {
  ru: { school: 'школа', beach: 'пляж', m: 'м', km: 'км' },
  en: { school: 'school', beach: 'beach', m: 'm', km: 'km' },
  id: { school: 'sekolah', beach: 'pantai', m: 'm', km: 'km' },
  fr: { school: 'école', beach: 'plage', m: 'm', km: 'km' },
  de: { school: 'Schule', beach: 'Strand', m: 'm', km: 'km' },
  zh: { school: '学校', beach: '海滩', m: '米', km: '公里' },
  nl: { school: 'school', beach: 'strand', m: 'm', km: 'km' },
  ban: { school: 'sekolah', beach: 'pasih', m: 'm', km: 'km' },
  pl: { school: 'szkoła', beach: 'plaża', m: 'm', km: 'km' },
  uk: { school: 'школа', beach: 'пляж', m: 'м', km: 'км' },
}
const DOT_DECIMAL = new Set<Lang>(['en', 'zh'])

export function CardLiving({ data, lang = 'ru', className = '' }: { data: CardLivingData | null | undefined; lang?: Lang; className?: string }) {
  if (!data) return null
  const w = WORDS[lang] ?? WORDS.en
  const fmt = (km: number) => km < 1
    ? `${Math.round(km * 1000 / 50) * 50} ${w.m}`
    : `${DOT_DECIMAL.has(lang) ? km.toFixed(1) : km.toFixed(1).replace('.', ',')} ${w.km}`
  const parts = [
    data.school_km != null ? `${w.school} ${fmt(data.school_km)}` : null,
    data.beach_km != null ? `${w.beach} ${fmt(data.beach_km)}` : null,
  ].filter(Boolean)
  if (!parts.length) return null
  return (
    <div className={`flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-primary)] ${className}`}>
      <Home size={14} strokeWidth={2} aria-hidden className="shrink-0" />
      <span>{parts.join(' · ')}</span>
    </div>
  )
}
