// Knowledge-article body.
//
// Bodies are plain text (whitespace-pre-wrap). The long buyer guides add a
// minimal markup on top: «## » starts a section heading, «[text](/path)» is an
// internal link, «**text**» is bold, lines starting «- » / «1. » are lists, and
// bare https:// URLs (the sources lists) are clickable. Articles without
// headings or internal links render exactly as before — one pre-wrapped block.

import Link from 'next/link'
import { Fragment } from 'react'

const HEADING = /^## (.+)$/
const LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g
// Internal link, bold, or a bare external URL — one pass so they can't overlap.
const INLINE = /\[([^\]]+)\]\((\/[^)\s]*)\)|\*\*([^*\n]+)\*\*|(https?:\/\/[^\s)<>"']+)/g
const BULLET = /^- (.+)$/
const NUMBERED = /^\d+\. (.+)$/

export function hasArticleMarkup(body: string): boolean {
  return /^## /m.test(body) || /\]\(\//.test(body)
}

/** Body without markup — for the meta description and previews. */
export function plainArticleText(body: string): string {
  return body
    .replace(/^## /gm, '')
    .replace(/^- /gm, '')
    .replace(LINK, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
}

function withLinks(text: string) {
  const out: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    const i = m.index ?? 0
    if (i > last) out.push(text.slice(last, i))
    if (m[1]) {
      out.push(
        <Link key={i} href={m[2]} className="text-[var(--color-primary-pressed)] underline underline-offset-2 hover:no-underline">
          {m[1]}
        </Link>,
      )
    } else if (m[3]) {
      out.push(<strong key={i} className="font-semibold text-[#111827]">{m[3]}</strong>)
    } else {
      // Trailing punctuation belongs to the sentence, not the URL.
      const url = m[4].replace(/[.,;:!?]+$/, '')
      out.push(
        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary-pressed)] underline underline-offset-2 hover:no-underline [overflow-wrap:anywhere]">
          {url}
        </a>,
      )
      if (url.length < m[4].length) out.push(m[4].slice(url.length))
    }
    last = i + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** A section's text as paragraphs and lists; other lines keep pre-wrap. */
function SectionText({ text }: { text: string }) {
  const groups: { kind: 'ul' | 'ol' | 'p'; lines: string[] }[] = []
  for (const line of text.split('\n')) {
    const kind = BULLET.test(line) ? 'ul' : NUMBERED.test(line) ? 'ol' : 'p'
    const prev = groups[groups.length - 1]
    if (prev && prev.kind === kind && !(kind === 'p' && line.trim() === '' && prev.lines.at(-1)?.trim() === '')) prev.lines.push(line)
    else groups.push({ kind, lines: [line] })
  }
  return (
    <>
      {groups.map((g, i) => {
        if (g.kind === 'ul') {
          return (
            <ul key={i} className="my-3 list-disc pl-6 space-y-1.5">
              {g.lines.map((l, j) => <li key={j}>{withLinks(l.replace(BULLET, '$1'))}</li>)}
            </ul>
          )
        }
        if (g.kind === 'ol') {
          return (
            <ol key={i} className="my-3 list-decimal pl-6 space-y-1.5">
              {g.lines.map((l, j) => <li key={j}>{withLinks(l.replace(NUMBERED, '$1'))}</li>)}
            </ol>
          )
        }
        const t = g.lines.join('\n').trim()
        return t ? <div key={i} className="whitespace-pre-wrap my-3">{withLinks(t)}</div> : null
      })}
    </>
  )
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
          {b.text && <SectionText text={b.text} />}
        </Fragment>
      ))}
    </div>
  )
}
