// Renders raw Airtable news body (one plain-text cell, newline-separated)
// as a readable article: paragraphs, bullet/numbered lists, headings,
// and inline auto-links. Keeps the formatting predictable so editors
// can keep pasting plain text without HTML.

import React, { type ReactNode } from 'react'

type Block =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'p'; text: string }
  | { kind: 'quote'; text: string }

// Recognise bullet-style prefixes at the start of a line. Strips them
// before pushing the text into the list item.
const BULLET_RE = /^\s*[-•*–—]\s+(.*)$/
const NUMBERED_RE = /^\s*\d+[.)]\s+(.*)$/
const QUOTE_RE = /^\s*>\s+(.*)$/
const H2_RE = /^\s*##\s+(.*)$/
const H3_RE = /^\s*###\s+(.*)$/

function parse(body: string): Block[] {
  const lines = body.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let listBuf: string[] = []
  let listKind: 'ul' | 'ol' | null = null

  function flushList() {
    if (!listKind || listBuf.length === 0) return
    blocks.push({ kind: listKind, items: [...listBuf] })
    listBuf = []
    listKind = null
  }

  for (const raw of lines) {
    const line = raw.trim()
    // Treat a blank line as a soft separator. We don't accumulate
    // multiple paragraph-lines into one block, so the only thing a
    // blank line does is close any open list block.
    if (!line) {
      flushList()
      continue
    }
    const h2 = H2_RE.exec(line)
    if (h2) { flushList(); blocks.push({ kind: 'h2', text: h2[1].trim() }); continue }
    const h3 = H3_RE.exec(line)
    if (h3) { flushList(); blocks.push({ kind: 'h3', text: h3[1].trim() }); continue }
    const q = QUOTE_RE.exec(line)
    if (q)  { flushList(); blocks.push({ kind: 'quote', text: q[1].trim() }); continue }
    const ul = BULLET_RE.exec(line)
    if (ul) {
      if (listKind === 'ol') flushList()
      listKind = 'ul'
      listBuf.push(ul[1].trim())
      continue
    }
    const ol = NUMBERED_RE.exec(line)
    if (ol) {
      if (listKind === 'ul') flushList()
      listKind = 'ol'
      listBuf.push(ol[1].trim())
      continue
    }
    // Plain text line — its own paragraph. Each Enter in the Airtable
    // cell becomes a paragraph break with visible spacing, which is
    // what editors expect from a text-area input.
    flushList()
    blocks.push({ kind: 'p', text: line })
  }
  flushList()
  return blocks
}

// Auto-link bare URLs and turn **bold** / __bold__ into <strong>.
function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const tokenRe = /(\*\*[^*\n]+\*\*|__[^_\n]+__|https?:\/\/[^\s)<>"']+)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = tokenRe.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**') || tok.startsWith('__')) {
      out.push(<strong key={`s${key++}`}>{tok.slice(2, -2)}</strong>)
    } else {
      // Strip trailing punctuation that's almost certainly not part of the URL.
      const trimmed = tok.replace(/[.,;:!?)]+$/, '')
      const tail = tok.slice(trimmed.length)
      out.push(
        <a
          key={`a${key++}`}
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] underline underline-offset-2"
        >
          {trimmed}
        </a>,
      )
      if (tail) out.push(tail)
    }
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function NewsBody({ body }: { body: string }) {
  const blocks = parse(body)
  if (blocks.length === 0) return null
  return (
    <div className="news-body text-[16px] md:text-[17px] leading-[1.75] text-[var(--color-text)] max-w-[68ch]">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'h2':
            return (
              <h2 key={i} className="mt-10 mb-3 text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] first:mt-0">
                {renderInline(b.text)}
              </h2>
            )
          case 'h3':
            return (
              <h3 key={i} className="mt-8 mb-2 text-[18px] md:text-[20px] font-semibold tracking-tight text-[#111827]">
                {renderInline(b.text)}
              </h3>
            )
          case 'ul':
            return (
              <ul key={i} className="my-4 list-disc pl-6 space-y-2">
                {b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="my-4 list-decimal pl-6 space-y-2">
                {b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
              </ol>
            )
          case 'quote':
            return (
              <blockquote key={i} className="my-5 pl-4 border-l-4 border-[var(--color-primary)] text-[var(--color-text-muted)] italic">
                {renderInline(b.text)}
              </blockquote>
            )
          case 'p':
            return (
              <p key={i} className="my-4 first:mt-0 last:mb-0">
                {renderInline(b.text)}
              </p>
            )
        }
      })}
    </div>
  )
}
