'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { getCollection } from '@/lib/admin/collections'
import { useIsAdmin } from '@/lib/use-is-admin'

// RecordPanel pulls the whole admin editor (photo manager, AI, link pickers).
// Load it only when an admin actually opens the panel, so a normal visitor's
// detail-page bundle stays tiny — the island itself is just a button + one
// /api/admin/whoami check.
const RecordPanel = dynamic(
  () => import('@/app/admin/data/[collection]/_panel').then(m => ({ default: m.RecordPanel })),
  { ssr: false, loading: () => null },
)

// On-page "edit EVERY field of this record" for a logged-in admin. The inline
// overlay (components/InlineEditor) makes a handful of hand-tagged fields
// click-to-edit; this opens the SAME slide-over the /admin/data grid uses, so
// an admin can edit the full record (all ~140 keys, by type) without leaving
// the public page. Reuses RecordPanel wholesale — it loads the record from the
// admin API, renders one editor per field, and PATCHes back through the admin
// data API (requireAdmin + Supabase write + full cache invalidation).
//
// Renders nothing for normal visitors (one tiny /api/admin/whoami check, shared
// with InlineEditor). Editing is RU-only: RU is the source of truth, other
// languages are derived translations, so writing there would touch the wrong
// layer.

type Props = {
  /** Admin collection key, e.g. 'complexes' | 'villas' | 'apartments' | 'developers'. */
  collection: string
  /** Record id (airtable_id / primary key). */
  recordId: string
  /** Human title shown in the panel header. */
  title?: string
  /** Current page language — the button only appears on 'ru'. */
  lang?: string
}

export function FullRecordEditor({ collection, recordId, title, lang }: Props) {
  const admin = useIsAdmin()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const cfg = getCollection(collection)
  if (!admin || !cfg || !recordId) return null
  if (lang && lang !== 'ru') return null

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[9998] inline-flex items-center gap-1.5 rounded-full bg-[#111827] px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-lg hover:bg-black cursor-pointer"
        >
          <SlidersHorizontal size={14} /> Все поля
        </button>
      )}

      {open && (
        // .theme-admin (+ .theme-light) provides the --ax-* CSS variables the
        // admin panel is styled with; the public site doesn't define them.
        // The stacking context (isolate + high z) lifts the whole slide-over
        // above the fixed editing badges/buttons pinned at z-[9998].
        <div className="theme-admin theme-light" style={{ position: 'relative', zIndex: 10000, isolation: 'isolate' }}>
          <RecordPanel
            cfg={cfg}
            id={recordId}
            title={title ?? cfg.label}
            onClose={() => setOpen(false)}
            onSaved={() => { setOpen(false); router.refresh() }}
            onDeleted={() => { setOpen(false); router.push('/') }}
          />
        </div>
      )}
    </>
  )
}
