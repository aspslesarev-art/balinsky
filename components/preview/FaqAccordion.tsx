'use client'

import { useState } from 'react'

/** Accordion with a single open item, per the handoff ("+" / "−"). */
export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0)
  return (
    <div style={{ marginTop: 32, borderTop: '1px solid var(--color-divider)', maxWidth: 860 }}>
      {items.map((f, i) => (
        <div key={f.q} style={{ borderBottom: '1px solid var(--color-divider)' }}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? -1 : i)}
            style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24,
              width: '100%', padding: '22px 0', background: 'none', border: 0, cursor: 'pointer',
              font: 'inherit', fontSize: 19, textAlign: 'left', color: 'var(--color-text)',
            }}
          >
            <span>{f.q}</span>
            <span style={{ color: 'var(--color-accent)', fontSize: 24, lineHeight: 1, flex: 'none' }}>
              {open === i ? '−' : '+'}
            </span>
          </button>
          {open === i && (
            <p className="muted" style={{ margin: 0, padding: '0 48px 24px 0', fontSize: 17, lineHeight: 1.6 }}>{f.a}</p>
          )}
        </div>
      ))}
    </div>
  )
}
