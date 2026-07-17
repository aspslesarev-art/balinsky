// HTML → clean text model for the LLM text layer.
//
// We fetch the page's own server-rendered HTML and reduce it to a small,
// stable document model (headings / paragraphs / lists / tables) so an AI
// crawler gets exactly the visible copy — no markup, scripts, nav chrome or
// proprietary analytics. Analytics widgets opt out with `data-llm-skip`.
import { parse, type HTMLElement, type Node } from 'node-html-parser'

export type LlmBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; rows: string[][] }

export type LlmDoc = {
  url: string
  lang: string
  title: string
  description: string
  blocks: LlmBlock[]
}

const DROP_TAGS = new Set([
  'script', 'style', 'noscript', 'svg', 'template', 'form', 'button',
  'input', 'select', 'textarea', 'nav', 'header', 'footer', 'iframe',
  'canvas', 'video', 'audio', 'picture', 'source', 'aside',
])

const BLOCK_HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

function tag(node: HTMLElement): string {
  return (node.rawTagName || '').toLowerCase()
}

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…',
  copy: '©', reg: '®', trade: '™', deg: '°', times: '×', middot: '·',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', euro: '€',
}

function decodeEntities(s: string): string {
  if (!s.includes('&')) return s
  return s.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi, (m, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    }
    const named = NAMED[body.toLowerCase()]
    return named ?? m
  })
}

function collapse(s: string): string {
  return decodeEntities(s).replace(/\s+/g, ' ').trim()
}

// Depth-first text of an element with inline markup flattened.
function inlineText(node: Node): string {
  // Text node
  // nodeType 3 = text, 1 = element
  const anyNode = node as unknown as { nodeType: number; rawText?: string }
  if (anyNode.nodeType === 3) return (anyNode.rawText ?? '')
  const el = node as HTMLElement
  if (anyNode.nodeType !== 1) return ''
  const t = tag(el)
  if (DROP_TAGS.has(t)) return ''
  if (el.getAttribute && el.getAttribute('data-llm-skip') != null) return ''
  if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return ''
  let out = ''
  for (const child of el.childNodes) out += inlineText(child)
  return out
}

function shouldSkip(el: HTMLElement): boolean {
  const t = tag(el)
  if (DROP_TAGS.has(t)) return true
  if (!el.getAttribute) return false
  if (el.getAttribute('data-llm-skip') != null) return true
  if (el.getAttribute('aria-hidden') === 'true') return true
  const role = el.getAttribute('role')
  if (role === 'navigation' || role === 'banner' || role === 'contentinfo') return true
  return false
}

function walk(el: HTMLElement, out: LlmBlock[], seen: Set<string>): void {
  for (const child of el.childNodes) {
    const anyChild = child as unknown as { nodeType: number }
    if (anyChild.nodeType !== 1) continue
    const c = child as HTMLElement
    if (shouldSkip(c)) continue
    const t = tag(c)

    if (BLOCK_HEADINGS.has(t)) {
      const text = collapse(inlineText(c))
      if (text) out.push({ type: 'heading', level: Number(t[1]), text })
      continue
    }
    if (t === 'p') {
      const text = collapse(inlineText(c))
      if (text && !seen.has('p:' + text)) { seen.add('p:' + text); out.push({ type: 'paragraph', text }) }
      continue
    }
    if (t === 'ul' || t === 'ol') {
      const items: string[] = []
      for (const li of c.childNodes) {
        const anyLi = li as unknown as { nodeType: number }
        if (anyLi.nodeType !== 1) continue
        const liEl = li as HTMLElement
        if (tag(liEl) !== 'li' || shouldSkip(liEl)) continue
        const txt = collapse(inlineText(liEl))
        if (txt) items.push(txt)
      }
      if (items.length) out.push({ type: 'list', ordered: t === 'ol', items })
      continue
    }
    if (t === 'table') {
      const rows: string[][] = []
      for (const tr of c.querySelectorAll('tr')) {
        const cells: string[] = []
        for (const cell of tr.childNodes) {
          const anyCell = cell as unknown as { nodeType: number }
          if (anyCell.nodeType !== 1) continue
          const cellEl = cell as HTMLElement
          const ct = tag(cellEl)
          if (ct !== 'td' && ct !== 'th') continue
          cells.push(collapse(inlineText(cellEl)))
        }
        if (cells.some(Boolean)) rows.push(cells)
      }
      if (rows.length) out.push({ type: 'table', rows })
      continue
    }
    // Container element — recurse.
    walk(c, out, seen)
  }
}

export function htmlToDoc(html: string, url: string, langOverride?: string): LlmDoc {
  const root = parse(html)
  const htmlEl = root.querySelector('html')
  // Prefer an explicit lang (derived from the URL) — the SSR `<html lang>` is
  // set client-side, so the raw HTML always carries the default 'ru'.
  const lang = langOverride || (htmlEl?.getAttribute('lang') || 'ru').slice(0, 2)

  const titleRaw = collapse(root.querySelector('title')?.text || '')
  const descEl = root.querySelector('meta[name="description"]')
  const description = collapse(descEl?.getAttribute('content') || '')

  const main = root.querySelector('main') || root.querySelector('body') || root
  const blocks: LlmBlock[] = []
  walk(main, blocks, new Set<string>())

  // Prefer the first h1 as the human title; fall back to <title>.
  const firstH1 = blocks.find(b => b.type === 'heading' && b.level === 1) as
    | { type: 'heading'; level: number; text: string }
    | undefined
  const title = firstH1?.text || titleRaw.replace(/\s*\|\s*Balinsky\s*$/, '')

  return { url, lang, title, description, blocks }
}

export function docToMarkdown(doc: LlmDoc): string {
  const lines: string[] = []
  lines.push(`# ${doc.title}`)
  if (doc.description) lines.push('', `> ${doc.description}`)
  lines.push('', `*URL: ${doc.url} · lang: ${doc.lang}*`)
  let firstH1Skipped = false
  for (const b of doc.blocks) {
    if (b.type === 'heading') {
      if (b.level === 1 && !firstH1Skipped && b.text === doc.title) { firstH1Skipped = true; continue }
      lines.push('', `${'#'.repeat(Math.min(b.level, 6))} ${b.text}`)
    } else if (b.type === 'paragraph') {
      lines.push('', b.text)
    } else if (b.type === 'list') {
      lines.push('')
      b.items.forEach((it, i) => lines.push(`${b.ordered ? `${i + 1}.` : '-'} ${it}`))
    } else if (b.type === 'table') {
      lines.push('')
      b.rows.forEach((r, i) => {
        lines.push('| ' + r.join(' | ') + ' |')
        if (i === 0) lines.push('| ' + r.map(() => '---').join(' | ') + ' |')
      })
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

const NUM_RE = /-?\d[\d\s.,]*\d|\d/g

export function docToJson(doc: LlmDoc): Record<string, unknown> {
  const headings = doc.blocks
    .filter((b): b is Extract<LlmBlock, { type: 'heading' }> => b.type === 'heading')
    .map(b => b.text)
  const text = doc.blocks
    .filter((b): b is Extract<LlmBlock, { type: 'paragraph' }> => b.type === 'paragraph')
    .map(b => b.text)
  const numbers = new Set<number>()
  const scan = (s: string) => {
    const m = s.match(NUM_RE)
    if (!m) return
    for (const raw of m) {
      const n = Number(raw.replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))
      if (Number.isFinite(n)) numbers.add(n)
    }
  }
  for (const b of doc.blocks) {
    if (b.type === 'paragraph' || b.type === 'heading') scan((b as { text: string }).text)
    else if (b.type === 'list') b.items.forEach(scan)
    else if (b.type === 'table') b.rows.forEach(r => r.forEach(scan))
  }
  return {
    url: doc.url,
    lang: doc.lang,
    title: doc.title,
    description: doc.description,
    headings,
    blocks: doc.blocks,
    text,
    numbers: [...numbers],
  }
}
