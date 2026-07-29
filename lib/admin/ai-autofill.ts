import 'server-only'
import { hasAi } from '@/lib/admin/ai-fields'
import { generateField } from '@/lib/admin/ai-generate'
import type { CollectionConfig } from './adapters/types'

// Automatic AI fill on save.
//
// The panel's "✨ AI" button only ever fired per-field, per-click, so a record
// saved in a hurry shipped with an empty SEO description and the meta tag fell
// back to the first line of the body. This runs the same generators the button
// runs, without the click: on create and on update, every AI-capable field that
// is still empty is generated — but only once the record actually carries
// enough source material to ground the model.
//
// Rules that keep it cheap and safe:
//   • only fields the button would offer (same predicate) — no surprises;
//   • only fields that are EMPTY — an editor's own wording is never overwritten,
//     which also means the second save doesn't regenerate anything;
//   • only when the row has real source text, so a half-typed draft doesn't get
//     invented content;
//   • failures are swallowed per-field — AI being down must never block a save.

/** Minimum source characters before we trust the model to have something to work from. */
const MIN_CONTEXT_CHARS = 40

/** Bound on Azure calls per save, so one save can't fan out into a big bill. */
const MAX_FIELDS_PER_SAVE = 6

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Fields the ✨ button would offer — identical predicate, see _panel.tsx. */
function aiFields(cfg: CollectionConfig): string[] {
  return cfg.fields
    .filter(f => !f.readOnly && !f.hidden && (f.type === 'text' || f.type === 'longtext') && hasAi(f.key))
    .map(f => f.key)
}

/**
 * Source text the model can ground on, ignoring the field being generated.
 * Deliberately counts only human-authored strings — ids, slugs and URLs say
 * nothing about the subject.
 */
function contextSize(row: Record<string, unknown>, exclude: string): number {
  let n = 0
  for (const [key, value] of Object.entries(row)) {
    if (key === exclude || key === 'id' || key === 'slug') continue
    if (/url$/i.test(key) || /^https?:\/\//.test(str(value))) continue
    n += str(value).length
  }
  return n
}

/**
 * Values to fill in for `row`. Empty object when there is nothing to do, so the
 * caller can skip the extra write entirely.
 */
export async function aiAutofillPatch(
  cfg: CollectionConfig,
  row: Record<string, unknown>,
): Promise<Record<string, string>> {
  const targets = aiFields(cfg)
    .filter(key => !str(row[key]))
    .filter(key => contextSize(row, key) >= MIN_CONTEXT_CHARS)
    .slice(0, MAX_FIELDS_PER_SAVE)
  if (targets.length === 0) return {}

  const results = await Promise.allSettled(
    targets.map(async key => [key, await generateField(key, row)] as const),
  )

  const patch: Record<string, string> = {}
  for (const [i, res] of results.entries()) {
    if (res.status === 'rejected') {
      // 'no_prompt' just means this field has no generator — not worth noise.
      const msg = res.reason instanceof Error ? res.reason.message : String(res.reason)
      if (msg !== 'no_prompt') console.error(`[ai-autofill] ${cfg.key}.${targets[i]}:`, msg)
      continue
    }
    const [key, text] = res.value
    if (str(text)) patch[key] = str(text)
  }
  return patch
}
