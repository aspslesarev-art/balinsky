import Link from 'next/link'
import { List, Map as MapIcon } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: { list: 'Каталог', map: 'Карта' },
  en: { list: 'Catalog', map: 'Map' },
  id: { list: 'Katalog', map: 'Peta' },
  fr: { list: 'Catalogue', map: 'Carte' },
  de: { list: 'Katalog', map: 'Karte' },
  zh: { list: '目录', map: '地图' },
  nl: { list: 'Catalogus', map: 'Kaart' },
  ban: { list: 'Katalog', map: 'Peta' },
  pl: { list: 'Katalog', map: 'Mapa' },
  uk: { list: 'Каталог', map: 'Карта' },
}

export function CatalogTabs({
  active = 'list',
  listHref = '/ru/apartamenty',
  mapHref = '/ru/apartamenty/karta',
  lang = 'ru',
}: {
  active?: 'list' | 'map'
  listHref?: string
  mapHref?: string
  lang?: Lang
}) {
  const c = pickCopy(COPY, lang)
  return (
    <div className="mt-6 border-b border-[var(--color-border)]">
      <div className="flex items-center gap-8">
        <Link
          href={listHref}
          className={`relative flex items-center gap-2 px-1 py-3 text-[15px] ${
            active === 'list'
              ? 'font-semibold text-[var(--color-primary)]'
              : 'font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <List size={18} strokeWidth={2} />
          {c.list}
          {active === 'list' && (
            <span className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-[var(--color-primary)]" />
          )}
        </Link>
        <Link
          href={mapHref}
          className={`relative flex items-center gap-2 px-1 py-3 text-[15px] ${
            active === 'map'
              ? 'font-semibold text-[var(--color-primary)]'
              : 'font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <MapIcon size={18} strokeWidth={2} />
          {c.map}
          {active === 'map' && (
            <span className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-[var(--color-primary)]" />
          )}
        </Link>
      </div>
    </div>
  )
}
