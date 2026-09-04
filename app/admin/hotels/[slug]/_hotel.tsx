'use client'

import { useState } from 'react'
import Link from 'next/link'
import { QrCode, RefreshCw } from 'lucide-react'
import type { HotelService, Room } from '@/lib/hotel/db'

// Всё, что делается с отелем после создания: номера (а с ними QR),
// меню услуг и код входа для стойки.
export function HotelEditor({
  hotelId, slug, rooms, services, staffCode,
}: { hotelId: number; slug: string; rooms: Room[]; services: HotelService[]; staffCode: string }) {
  const [labels, setLabels] = useState('')
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState(staffCode)
  const [service, setService] = useState({ code: '', title: '', title_en: '', note: '', price: '' })

  const reload = () => window.location.reload()

  const addRooms = async () => {
    const list = labels.split('\n').map(l => l.trim()).filter(Boolean)
    if (list.length === 0 || busy) return
    setBusy(true)
    try {
      await fetch(`/api/admin/hotels/${hotelId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: list }),
      })
      reload()
    } finally { setBusy(false) }
  }

  const patchRoom = async (roomId: number, patch: { active?: boolean; rotate?: boolean }) => {
    if (patch.rotate && !confirm('Перевыпустить код номера? Старая наклейка перестанет работать.')) return
    await fetch(`/api/admin/hotels/${hotelId}/rooms`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, ...patch }),
    })
    reload()
  }

  const addService = async () => {
    if (!service.code.trim() || !service.title.trim() || busy) return
    setBusy(true)
    try {
      await fetch(`/api/admin/hotels/${hotelId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: service.code, title: service.title, title_en: service.title_en, note: service.note,
          price_usd: service.price ? Number(service.price) : undefined,
        }),
      })
      reload()
    } finally { setBusy(false) }
  }

  const toggleService = async (serviceId: number, active: boolean) => {
    await fetch(`/api/admin/hotels/${hotelId}/services`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId, active }),
    })
    reload()
  }

  const rotateStaffCode = async () => {
    if (!confirm('Выдать новый код смены? Все, кто сейчас в панели, разлогинятся.')) return
    const r = await fetch('/api/admin/hotels', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: hotelId, newStaffCode: true }),
    })
    const { staffCode: next } = await r.json().catch(() => ({ staffCode: null }))
    if (next) setCode(next)
  }

  const card = 'rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-5'
  const input = 'rounded-xl border border-[var(--ax-input-border)] bg-[var(--ax-input-bg)] px-3.5 py-2.5 text-[15px] text-[var(--ax-fg)] outline-none focus:border-[var(--color-primary)]'
  const btn = 'rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-50'

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-medium">Доступ стойки</div>
            <div className="text-[13px] text-[var(--ax-fg-muted)]">
              Вход на <Link href="/hotel-desk" className="underline">/hotel-desk</Link>: код отеля <b>{slug}</b> и код смены.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="rounded-lg bg-[var(--ax-hover)] px-3 py-1.5 text-[15px] tracking-widest">{code}</code>
            <button onClick={rotateStaffCode} className="rounded-xl border border-[var(--ax-border)] px-3 py-2 text-[13px]">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[15px] font-medium">Номера</div>
          {rooms.length > 0 && (
            <a href={`/admin/hotels/${slug}/qr`} className="flex items-center gap-1.5 text-[13px] text-[var(--ax-fg-muted)] no-underline hover:text-[var(--ax-fg)]">
              <QrCode className="h-4 w-4" /> Лист QR-кодов на печать
            </a>
          )}
        </div>

        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start">
          <textarea
            value={labels}
            onChange={e => setLabels(e.target.value)}
            rows={3}
            placeholder={'Номера пачкой, по одному на строку:\n101\n102\nVilla Frangipani'}
            className={`${input} min-h-[92px] flex-1 resize-y`}
          />
          <button onClick={addRooms} disabled={busy || !labels.trim()} className={btn}>Добавить</button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-[13px] text-[var(--ax-fg-muted)]">Номеров пока нет.</p>
        ) : (
          <ul className="divide-y divide-[var(--ax-border)]">
            {rooms.map(r => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className={`text-[15px] ${r.active ? '' : 'text-[var(--ax-fg-faint)] line-through'}`}>{r.label}</span>
                <code className="text-[12px] text-[var(--ax-fg-muted)]">/stay/{r.token}</code>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => patchRoom(r.id, { rotate: true })}
                    className="rounded-lg border border-[var(--ax-border)] px-2.5 py-1 text-[12px]"
                  >
                    Новый код
                  </button>
                  <button
                    onClick={() => patchRoom(r.id, { active: !r.active })}
                    className="rounded-lg border border-[var(--ax-border)] px-2.5 py-1 text-[12px]"
                  >
                    {r.active ? 'Выключить' : 'Включить'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <div className="mb-1 text-[15px] font-medium">Меню услуг</div>
        <p className="mb-3 text-[13px] text-[var(--ax-fg-muted)]">
          Кнопки, которые гость видит на странице номера. Без них остаётся просто чат.
        </p>

        <div className="mb-4 grid gap-2 md:grid-cols-5">
          <input value={service.code} onChange={e => setService({ ...service, code: e.target.value })} placeholder="код (breakfast)" className={input} />
          <input value={service.title} onChange={e => setService({ ...service, title: e.target.value })} placeholder="Название (RU)" className={input} />
          <input value={service.title_en} onChange={e => setService({ ...service, title_en: e.target.value })} placeholder="Название (EN)" className={input} />
          <input value={service.price} onChange={e => setService({ ...service, price: e.target.value })} inputMode="decimal" placeholder="цена $" className={input} />
          <button onClick={addService} disabled={busy || !service.code.trim() || !service.title.trim()} className={btn}>
            Добавить
          </button>
        </div>

        {services.length === 0 ? (
          <p className="text-[13px] text-[var(--ax-fg-muted)]">Услуг пока нет.</p>
        ) : (
          <ul className="divide-y divide-[var(--ax-border)]">
            {services.map(s => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className={`text-[15px] ${s.active ? '' : 'text-[var(--ax-fg-faint)] line-through'}`}>{s.title}</span>
                {s.title_en && <span className="text-[13px] text-[var(--ax-fg-muted)]">{s.title_en}</span>}
                {s.price_usd != null && <span className="text-[13px] text-[var(--ax-fg-muted)]">${s.price_usd}</span>}
                <button
                  onClick={() => toggleService(s.id, !s.active)}
                  className="ml-auto rounded-lg border border-[var(--ax-border)] px-2.5 py-1 text-[12px]"
                >
                  {s.active ? 'Скрыть' : 'Показать'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
