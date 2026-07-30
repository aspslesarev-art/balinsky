'use client'

import { useState } from 'react'
import type { Gap, GapStatus } from '@/lib/preview/developer-template'

const LABEL: Record<GapStatus, string> = {
  ok: 'есть в базе',
  derived: 'выводится из других полей',
  partial: 'частично',
  missing: 'нет в базе',
}
const COLOR: Record<GapStatus, string> = {
  ok: '#2f7d4f',
  derived: '#3b6ea5',
  partial: '#b1741d',
  missing: '#a8331f',
}

/**
 * Floating checklist of what the template asks for vs what Supabase holds.
 * Preview-only affordance — the point of this page is to judge the data gap,
 * not just the layout.
 */
export function DataCoverageHud({ gaps }: { gaps: Gap[] }) {
  const [open, setOpen] = useState(false)
  const tally = (s: GapStatus) => gaps.filter(g => g.status === s).length
  const blocks = [...new Set(gaps.map(g => g.block))]

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 80, maxWidth: 'min(560px, 92vw)' }}>
      {open && (
        <div style={{
          maxHeight: '70vh', overflowY: 'auto', marginBottom: 12, padding: '20px 22px',
          background: '#fffdf8', border: '1px solid var(--color-divider)', borderRadius: 12,
          boxShadow: '0 18px 50px rgba(0,0,0,.22)', fontSize: 13, lineHeight: 1.45,
        }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Данные шаблона против Supabase</div>
          <div className="muted" style={{ marginBottom: 16 }}>
            {tally('ok')} есть · {tally('derived')} выводится · {tally('partial')} частично · {tally('missing')} нет
          </div>
          {blocks.map(b => (
            <div key={b} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 500, marginBottom: 6 }}>{b}</div>
              {gaps.filter(g => g.block === b).map((g, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderTop: '1px solid #eee' }}>
                  <span style={{
                    flex: 'none', width: 8, height: 8, borderRadius: '50%', marginTop: 5,
                    background: COLOR[g.status],
                  }} />
                  <span>
                    <code style={{ fontSize: 12 }}>{g.field}</code>
                    {' — '}
                    <span style={{ color: COLOR[g.status] }}>{LABEL[g.status]}</span>
                    <span className="muted">. {g.note}</span>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        padding: '12px 20px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 14,
        background: '#201f1d', color: '#f5f0e6', border: 0, boxShadow: '0 8px 24px rgba(0,0,0,.28)',
      }}>
        {open ? 'Скрыть' : `Чек-лист данных · ${tally('missing')} дыр`}
      </button>
    </div>
  )
}
