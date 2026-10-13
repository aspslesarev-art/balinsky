'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Pencil } from 'lucide-react'
import type { EditKind } from '@/lib/page-edit/schema'

// Кнопка «Редактировать» на странице застройщика, ЖК, виллы, апартаментов.
// Посетителю — ничего: один лёгкий запрос «могу ли я править эту запись?».
// Сама форма грузится, только когда её открыли.
const PageEditSheet = dynamic(() => import('./PageEditSheet').then(m => ({ default: m.PageEditSheet })), {
  ssr: false,
  loading: () => null,
})

type Props = { kind: EditKind; id: string; lang?: string }

export function PageEditButton({ kind, id, lang }: Props) {
  const [canEdit, setCanEdit] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Правим русскую версию — остальные языки переводятся из неё.
    if (lang && lang !== 'ru') return
    let alive = true
    fetch(`/api/page-edit/access?kind=${kind}&id=${encodeURIComponent(id)}`, { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : { canEdit: false }))
      .then((j: { canEdit?: boolean }) => { if (alive) setCanEdit(!!j.canEdit) })
      .catch(() => {})
    return () => { alive = false }
  }, [kind, id, lang])

  if (!canEdit) return null
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[9998] inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-3 text-[15px] font-semibold text-white shadow-[var(--shadow-lift)] transition-transform duration-[120ms] hover:bg-[var(--color-primary-hover)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] cursor-pointer"
        >
          <Pencil size={16} aria-hidden /> Редактировать
        </button>
      )}
      {open && <PageEditSheet kind={kind} id={id} onClose={() => setOpen(false)} />}
    </>
  )
}
