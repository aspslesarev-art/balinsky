// Knowledge-article body.
//
// Bodies are plain text (whitespace-pre-wrap). The long buyer guides add a
// minimal markup on top: a line starting with «## » is a section heading, and
// «[text](/path)» is an internal link. Articles without either render exactly
// as before — one pre-wrapped block — so nothing changes for the old ones.

import Link from 'next/link'
import { Fragment } from 'react'

const HEADING = /^## (.+)$/
const LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g

export function hasArticleMarkup(body: string): boolean {
  return /^## /m.test(body) || /\]\(\//.test(body)
}

/** Body without markup — for the meta description and previews. */
export function plainArticleText(body: string): string {
  return body
    .replace(/^## /gm, '')
    .replace(LINK, '$1')
    .replace(/\s+/g, ' ')
}

function withLinks(text: string) {
  const out: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    const i = m.index ?? 0
    if (i > last) out.push(text.slice(last, i))
    out.push(
      <Link key={i} href={m[2]} className="text-[var(--color-primary-pressed)] underline underline-offset-2 hover:no-underline">
        {m[1]}
      </Link>,
    )
    last = i + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function ArticleBody({ body }: { body: string }) {
  // ~70 characters per line: the article column used to span the full
  // container, 180+ characters on desktop.
  const base = 'max-w-[70ch] text-[16px] leading-[1.7] text-[var(--color-text)]'
  if (!hasArticleMarkup(body)) {
    return <div className={`${base} whitespace-pre-wrap`}>{body}</div>
  }
  // Split into sections at headings; everything between two headings stays a
  // pre-wrapped block, so «— » bullet lines and blank-line spacing keep working.
  const blocks: { heading: string | null; text: string }[] = []
  let current: { heading: string | null; lines: string[] } = { heading: null, lines: [] }
  for (const line of body.split('\n')) {
    const h = line.match(HEADING)
    if (h) {
      blocks.push({ heading: current.heading, text: current.lines.join('\n').trim() })
      current = { heading: h[1].trim(), lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  blocks.push({ heading: current.heading, text: current.lines.join('\n').trim() })

  return (
    <div className={base}>
      {blocks.map((b, i) => (
        <Fragment key={i}>
          {b.heading && (
            <h2 className="text-[22px] md:text-[26px] font-semibold leading-[1.25] tracking-tight text-[#111827] mt-10 mb-3">
              {b.heading}
            </h2>
          )}
          {b.text && <div className="whitespace-pre-wrap">{withLinks(b.text)}</div>}
        </Fragment>
      ))}
    </div>
  )
}
