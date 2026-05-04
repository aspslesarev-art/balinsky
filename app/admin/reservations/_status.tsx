'use client'

import { useState } from 'react'
import type { ReservationStatus } from '@/lib/reservations'

// Status walk for one reservation. POSTs to /api/admin/reservation/status,
// then refreshes the page so the row re-renders with the new state.
export function ReservationStatusButtons({
  id, current,
}: { id: string; current: ReservationStatus }) {
  const [busy, setBusy] = useState(false)

  const set = async (next: ReservationStatus) => {
    if (busy || next === current) return
    setBusy(true)
    try {
      await fetch('/api/admin/reservation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      })
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  // Hide buttons that don't apply to the current state to keep the UI honest.
  const next: { v: ReservationStatus; label: string; tone: string }[] = []
  if (current === 'pending') {
    next.push({ v: 'invoice_sent', label: 'Счёт отправлен', tone: 'bg-[#1E40AF] text-white hover:bg-[#1B388F]' })
    next.push({ v: 'cancelled',    label: 'Отменить',       tone: 'bg-white text-[#991B1B] border border-[#FEE2E2] hover:border-[#B91C1C]' })
  } else if (current === 'invoice_sent') {
    next.push({ v: 'paid',         label: 'Оплачено',       tone: 'bg-[#065F46] text-white hover:bg-[#054C3A]' })
    next.push({ v: 'cancelled',    label: 'Отменить',       tone: 'bg-white text-[#991B1B] border border-[#FEE2E2] hover:border-[#B91C1C]' })
  } else if (current === 'paid') {
    next.push({ v: 'cancelled',    label: 'Возврат / отмена', tone: 'bg-white text-[#991B1B] border border-[#FEE2E2] hover:border-[#B91C1C]' })
  } else if (current === 'expired' || current === 'cancelled') {
    next.push({ v: 'pending',      label: 'Восстановить',    tone: 'bg-white text-[#374151] border border-[#E5E7EB] hover:border-[#9CA3AF]' })
  }

  return (
    <div className="flex flex-col gap-1.5 shrink-0">
      {next.map(b => (
        <button
          key={b.v}
          type="button"
          disabled={busy}
          onClick={() => set(b.v)}
          className={`text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${b.tone}`}
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}
