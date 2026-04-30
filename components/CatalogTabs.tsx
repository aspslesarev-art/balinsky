import Link from 'next/link'
import { List, Map as MapIcon } from 'lucide-react'

export function CatalogTabs({
  active = 'list',
  listHref = '/ru/apartamenty',
  mapHref = '/ru/apartamenty/karta',
}: {
  active?: 'list' | 'map'
  listHref?: string
  mapHref?: string
}) {
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
          Каталог
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
          Карта
          {active === 'map' && (
            <span className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-[var(--color-primary)]" />
          )}
        </Link>
      </div>
    </div>
  )
}
