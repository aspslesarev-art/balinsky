import type { HubLongCopy, HubSection } from '@/lib/hub-seo'

// Long-form hub copy: the ~900 words that only the unfiltered catalog hub
// carries (see lib/hub-seo/types.ts for why it is gated).
//
// Layout note: the price table is wider than a phone, so it lives in its own
// horizontal scroller. `max-w-none` is the sanctioned escape hatch from the
// `main * { max-width: 100% }` guard in app/globals.css — without it the table
// gets squeezed instead of scrolling.

function Section({ section }: { section: HubSection }) {
  return (
    <section>
      <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{section.heading}</h3>
      <div className="space-y-3">
        {section.paragraphs.map((p, i) => (
          <p key={i} className="text-[var(--color-text-muted)]">{p}</p>
        ))}
      </div>
      {section.bullets && (
        <ul className="mt-3 space-y-2">
          {section.bullets.map((b, i) => (
            <li key={i} className="relative pl-5 text-[var(--color-text-muted)]">
              <span className="absolute left-0 top-[9px] h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              {b}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PriceTable({ table }: { table: HubLongCopy['priceTable'] }) {
  return (
    <section>
      <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{table.caption}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] max-w-none border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {table.columns.map((c, i) => (
                <th
                  key={i}
                  scope="col"
                  className="py-2 pr-4 text-left font-medium text-[var(--color-text-muted)] whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`py-2.5 pr-4 whitespace-nowrap ${
                      j === 0 ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">{table.note}</p>
    </section>
  )
}

export function HubLongForm({ copy }: { copy: HubLongCopy }) {
  const [lead, ...rest] = copy.sections
  return (
    <div className="mt-10 max-w-3xl space-y-9 text-[15px] leading-relaxed">
      {lead && <Section section={lead} />}
      <PriceTable table={copy.priceTable} />
      {rest.map((section, i) => (
        <Section key={i} section={section} />
      ))}
    </div>
  )
}
