'use client'

import { useEffect } from 'react'

// Typographic "glue" for line breaks, applied to all visible page text.
// CSS (globals.css) balances headings and avoids orphans where it can; this
// handles what CSS can't, by swapping ordinary spaces for non-breaking ones:
//   • a short preposition / conjunction stays with the next word
//     («виллы с 2 спальнями», «z czasem», «a month»);
//   • a number stays with the word after it («2 спальнями», «25 years»);
//   • a dash never starts a line;
//   • the last word of a paragraph, list item or heading keeps the previous
//     word company instead of sitting alone on the last line.
// Runs after hydration (no hydration mismatch) and again on DOM changes,
// e.g. when the catalogue loads more cards. Idempotent: text that already has
// the glue is left as is.

const NBSP = ' '

// Short words that must not end a line, per language. Latin-script lists are
// lower-case; matching is case-insensitive.
const SHORT: Record<string, string[]> = {
  ru: ['в', 'во', 'и', 'к', 'ко', 'с', 'со', 'у', 'о', 'об', 'а', 'я', 'на', 'по', 'за', 'из', 'до', 'от', 'не', 'ни', 'но', 'же', 'ли', 'бы', 'для', 'без', 'под', 'над', 'при', 'про', 'или', 'что', 'как', 'это', 'его', 'её', 'их'],
  uk: ['в', 'у', 'і', 'й', 'та', 'з', 'із', 'зі', 'к', 'о', 'а', 'на', 'по', 'за', 'до', 'від', 'не', 'ні', 'що', 'як', 'для', 'без', 'під', 'над', 'при', 'про', 'чи', 'це', 'його', 'їх'],
  pl: ['w', 'we', 'z', 'ze', 'i', 'a', 'o', 'u', 'na', 'do', 'od', 'po', 'za', 'ze', 'bez', 'dla', 'nie', 'oraz', 'lub', 'czy', 'to', 'że'],
  en: ['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'by', 'or', 'and', 'for', 'is', 'per'],
  de: ['in', 'im', 'am', 'an', 'zu', 'zum', 'zur', 'um', 'ab', 'bei', 'von', 'vom', 'mit', 'und', 'oder', 'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'pro'],
  fr: ['à', 'a', 'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'en', 'et', 'ou', 'au', 'aux', 'par', 'sur', 'pour', 'sans'],
  nl: ['u', 'je', 'we', 'de', 'het', 'een', 'in', 'op', 'te', 'en', 'of', 'van', 'met', 'per', 'bij', 'om', 'tot', 'aan'],
  id: ['di', 'ke', 'dan', 'atau', 'per', 'dari', 'yang', 'untuk', 'di', 'pada'],
}
SHORT.ban = SHORT.id

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'SVG', 'NOSCRIPT'])
const BLOCKS = 'p, li, dd, h1, h2, h3, h4, blockquote, figcaption'

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function makeGlue(lang: string) {
  const words = SHORT[lang] ?? []
  const shortRe = words.length
    ? new RegExp(`(^|[\\s(«„“"—–])(${words.map(escapeRe).join('|')}) (?=\\S)`, 'giu')
    : null
  return (text: string) => {
    let t = text
    // Dash never starts a line: «X — Y» keeps the dash on the first line.
    t = t.replace(/ ([—–])(?=\s)/g, `${NBSP}$1`)
    // A number stays with what follows it: «2 спальни», «25 years», «$2,150 a».
    t = t.replace(/(\d[\d.,%]*) (?=[^\s\d—–])/gu, `$1${NBSP}`)
    if (shortRe) {
      // Twice, so chains like «и в Убуде» glue fully.
      t = t.replace(shortRe, `$1$2${NBSP}`).replace(shortRe, `$1$2${NBSP}`)
    }
    return t
  }
}

function processNode(node: Text, glue: (s: string) => string) {
  const v = node.nodeValue
  if (!v || v.trim().length < 2) return
  const next = glue(v)
  if (next !== v) node.nodeValue = next
}

// Last word of a block keeps the previous word company.
function glueLastWord(block: Element) {
  if (block.closest('[data-no-typo]')) return
  const text = block.textContent ?? ''
  if (text.trim().length < 25) return
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let last: Text | null = null
  let n: Node | null
  while ((n = walker.nextNode())) if ((n as Text).nodeValue?.trim()) last = n as Text
  if (!last) return
  const v = last.nodeValue!
  const m = v.match(/^([\s\S]*\S) (\S{1,12}\s*)$/u)
  if (m) last.nodeValue = `${m[1]}${NBSP}${m[2]}`
}

function run(root: Element, glue: (s: string) => string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement
      if (!p || SKIP.has(p.tagName) || p.isContentEditable || p.closest('[data-no-typo]')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const nodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) nodes.push(n as Text)
  nodes.forEach(t => processNode(t, glue))
  root.querySelectorAll(BLOCKS).forEach(glueLastWord)
  // Plain text boxes (captions, card labels) that aren't p/li/h*.
  root.querySelectorAll('div, span, a').forEach(el => {
    if (el.childElementCount === 0 && !el.matches(BLOCKS)) glueLastWord(el)
  })
}

export function Typographer() {
  useEffect(() => {
    const lang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase()
    const key = lang === 'ba' ? 'ban' : lang
    const glue = makeGlue(key)
    const main = document.body
    run(main, glue)
    let scheduled = false
    const obs = new MutationObserver(muts => {
      // Our own edits only touch nodeValue (characterData) — ignore them.
      if (!muts.some(m => m.type === 'childList' && m.addedNodes.length)) return
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        obs.disconnect()
        run(main, glue)
        obs.observe(main, { childList: true, subtree: true })
      })
    })
    obs.observe(main, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [])
  return null
}
