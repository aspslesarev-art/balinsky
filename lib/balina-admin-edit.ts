// Admin data-edit over Telegram.
//
// The owner unlocks "edit mode" with a secret code word, then describes a
// factual change on the site in plain language ("ЖК XOR Pandava получил
// PBG"). gpt-5.4 parses it into a structured change, we resolve the object
// in Supabase, show a confirmation with inline Да/Нет buttons, and only on
// confirm do we write to the raw_* table (via the same admin adapter the
// /admin/data panel uses) + revalidate the site + flag the semantic layer
// for re-embed + audit-log the edit.
//
// Safety model:
//   1. Owner-only (isOwnerChat) AND a code word — double gate.
//   2. Whitelisted fields only — the model can never write an arbitrary
//      JSONB key, so a hallucinated field can't corrupt a record.
//   3. Confirmation before every write.
//   4. Every applied change is logged to bot_edit_log.

import { AzureOpenAI } from 'openai'
import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import { adminSb } from '@/lib/admin/sb'
import { getCollection } from '@/lib/admin/collections'
import { adapterFor } from '@/lib/admin/adapters'
import { revalidateCollection } from '@/lib/admin/revalidate'
import { isOwnerChat } from '@/lib/balina-telegram'
import { logUsage } from '@/lib/usage-tracker'
import type { RecordRow } from '@/lib/admin/adapters/types'

// === config ==============================================================

const EDIT_TTL_MS = 30 * 60_000 // edit mode auto-locks after 30 min of unlock
const ADMIN_CODE = (process.env.BALINA_ADMIN_CODE ?? 'балиса правь').trim().toLowerCase()

// entity_type (what the model emits) → admin collection key + kb kind.
const ENTITY_MAP: Record<string, { collection: string; kbKind: string | null; label: string }> = {
  complex:   { collection: 'complexes',    kbKind: 'complex',   label: 'ЖК' },
  developer: { collection: 'developers',   kbKind: 'developer', label: 'застройщик' },
  villa:     { collection: 'villas',       kbKind: 'villa',     label: 'вилла' },
  apartment: { collection: 'apartments',   kbKind: 'apartment', label: 'апартамент' },
  unit:      { collection: 'parser_units', kbKind: null,        label: 'юнит' },
}

// === public entry: free-text turn from an owner ==========================
//
// Returns { handled:true } when this module consumed the message (unlock,
// edit, confirm, exit). Returns { handled:false } when the message is not
// an admin action — the caller then falls through to the normal consultant.

export async function tryHandleAdminEdit(
  { chatId, token, text }: { chatId: number; token: string; text: string },
): Promise<{ handled: boolean }> {
  if (!isOwnerChat(chatId)) return { handled: false }
  const t = text.trim()
  const tl = t.toLowerCase()

  // Code word toggles edit mode on.
  if (tl === ADMIN_CODE) {
    await setUnlocked(chatId, Date.now() + EDIT_TTL_MS)
    await sendText(token, chatId,
      '🔓 <b>Режим редактирования включён</b> (30 мин).\n\n' +
      'Пиши изменение простым текстом, например:\n' +
      '• «ЖК XOR Pandava получил PBG»\n' +
      '• «у Surfside статус — Сдан»\n' +
      '• «застройщик Loi Bondar, доходность 12%»\n\n' +
      'Я покажу, что понял, и спрошу подтверждение перед записью.\n' +
      '<i>Выйти — напиши «выход».</i>')
    return { handled: true }
  }

  const state = await getState(chatId)
  const unlocked = !!state?.unlocked_until && new Date(state.unlocked_until).getTime() > Date.now()
  if (!unlocked) return { handled: false } // not in edit mode → normal chat

  // Exit edit mode.
  if (/^(выход|стоп|отмена режим|exit|lock)$/i.test(tl)) {
    await setUnlocked(chatId, 0)
    await clearPending(chatId)
    await sendText(token, chatId, '🔒 Режим редактирования выключен.')
    return { handled: true }
  }

  // A pending change is awaiting confirmation — accept да/нет by text too
  // (buttons are the primary path, this is the fallback).
  if (state?.pending) {
    if (/^(да|yes|подтверж|ок|ok|applyapply|✅)/i.test(tl)) { await applyPending(chatId, token); return { handled: true } }
    if (/^(нет|no|отмена|cancel|❌)/i.test(tl))            { await clearPending(chatId); await sendText(token, chatId, 'Отменил. Пиши следующее изменение или «выход».'); return { handled: true } }
    // Any other text replaces the pending change with a new parse.
  }

  // Parse the free-text change and stage it for confirmation.
  await bumpUnlock(chatId) // sliding TTL while actively editing
  await stageChangeFromText(chatId, token, t)
  return { handled: true }
}

// === inline-button confirm/cancel (callback_query data 'admin:...') ======

export async function handleAdminCallback(
  token: string,
  cbq: { id: string; from?: { id?: number }; message?: { chat: { id: number } }; data?: string },
): Promise<void> {
  const chatId = cbq.message?.chat.id
  const data = cbq.data ?? ''
  if (!chatId || !isOwnerChat(chatId)) { await answerCallback(token, cbq.id); return }
  await answerCallback(token, cbq.id)
  if (data === 'admin:yes') await applyPending(chatId, token)
  else if (data === 'admin:no') { await clearPending(chatId); await sendText(token, chatId, 'Отменил. Пиши следующее изменение или «выход».') }
}

// === parse → resolve → stage =============================================

async function stageChangeFromText(chatId: number, token: string, text: string): Promise<void> {
  const parsed = await parseChange(text).catch(err => { console.error('[admin-edit] parse failed:', err); return null })
  if (!parsed) { await sendText(token, chatId, '🤔 Не понял, что именно поменять. Сформулируй: «<что за объект> — <какое поле> — <новое значение>».'); return }

  const entity = ENTITY_MAP[parsed.entity_type]
  if (!entity) { await sendText(token, chatId, `Не поддерживаю тип «${escapeHtml(parsed.entity_type)}». Умею: ЖК, застройщик, вилла, апартамент, юнит.`); return }
  const cfg = getCollection(entity.collection)
  if (!cfg) { await sendText(token, chatId, 'Внутренняя ошибка: коллекция не найдена.'); return }

  // Resolve the object by name.
  const match = await resolveEntity(entity.collection, parsed.name)
  if (match === 'ambiguous') { await sendText(token, chatId, `Нашёл несколько «${escapeHtml(parsed.name)}». Уточни точное название.`); return }
  if (!match) { await sendText(token, chatId, `Не нашёл ${entity.label} «${escapeHtml(parsed.name)}». Проверь название.`); return }

  // Build the whitelisted patch.
  const built = buildPatch(entity.collection, parsed.changes)
  if (built.writes.length === 0) {
    await sendText(token, chatId,
      `Не смог сопоставить ни одно поле для ${entity.label}.` +
      (built.errors.length ? `\n${built.errors.map(e => '• ' + escapeHtml(e)).join('\n')}` : ''))
    return
  }

  const patch: Record<string, unknown> = {}
  for (const w of built.writes) patch[w.key] = w.value

  const title = String(match.fields[cfg.titleField] ?? parsed.name)
  await setPending(chatId, {
    collection: entity.collection,
    entity_type: parsed.entity_type,
    kbKind: entity.kbKind,
    ref_id: match.id,
    entity_name: title,
    patch,
    human: built.human,
    raw_message: text,
  })

  const lines = [
    `Нашёл: <b>${escapeHtml(entity.label)} «${escapeHtml(title)}»</b>`,
    '',
    'Изменения:',
    ...built.human.map(h => `• ${escapeHtml(h)}`),
  ]
  if (built.errors.length) lines.push('', '<i>Пропущено (не понял):</i>', ...built.errors.map(e => `• ${escapeHtml(e)}`))
  lines.push('', 'Применить?')
  await sendConfirm(token, chatId, lines.join('\n'))
}

// === apply ===============================================================

async function applyPending(chatId: number, token: string): Promise<void> {
  const state = await getState(chatId)
  const p = state?.pending as PendingChange | null | undefined
  if (!p) { await sendText(token, chatId, 'Нечего применять — правка не найдена (возможно, истекла). Сформулируй заново.'); return }
  const cfg = getCollection(p.collection)
  if (!cfg) { await sendText(token, chatId, 'Внутренняя ошибка коллекции.'); return }

  try {
    await adapterFor(cfg).update(cfg, p.ref_id, p.patch)
    try { revalidateCollection(cfg) } catch (e) { console.error('[admin-edit] revalidate:', e) }
    await flagKbForReembed(p.kbKind, p.ref_id).catch(e => console.error('[admin-edit] kb flag:', e))
    await auditLog(chatId, p, true)
    await clearPending(chatId)
    await bumpUnlock(chatId)
    await sendText(token, chatId,
      `✅ Обновил <b>«${escapeHtml(p.entity_name)}»</b>:\n` +
      p.human.map(h => `• ${escapeHtml(h)}`).join('\n') +
      '\n\n<i>Данные уже на сайте. Балиса подхватит их в семантическом поиске после ближайшего kb-прогона.</i>')
  } catch (err) {
    console.error('[admin-edit] update failed:', err)
    await auditLog(chatId, p, false).catch(() => {})
    await sendText(token, chatId, '❌ Не смог записать. Ошибка сохранена в лог. Попробуй ещё раз.')
  }
}

// === LLM parse ===========================================================

type ParsedChange = { entity_type: string; name: string; changes: { field: string; value: string }[] }

const PARSE_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'apply_data_change',
    description: 'Extract the factual data update the admin described about a Bali real-estate object.',
    parameters: {
      type: 'object',
      properties: {
        entity_type: { type: 'string', enum: ['complex', 'developer', 'villa', 'apartment', 'unit'], description: 'What kind of object. ЖК/комплекс=complex, застройщик=developer.' },
        name: { type: 'string', description: 'The object or developer name exactly as the admin said it (proper name, Latin or Cyrillic).' },
        changes: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', enum: ['pbg', 'slf', 'status', 'sales_status', 'readiness', 'price_usd', 'completion_year', 'published', 'yield', 'reputation', 'ai_description', 'units_total', 'locked'], description: 'pbg/slf=permits; status=стадия готовности; sales_status=статус продаж; readiness=готовность %; price_usd=цена в USD; completion_year=год сдачи; published=опубликован; yield=доходность (developer); reputation=репутация (developer); ai_description=AI-описание (developer); units_total=всего юнитов (developer); locked=защита юнита.' },
              value: { type: 'string', description: 'New value in words. For pbg/slf use exactly one of: granted, applied, none. For published/locked use: yes or no. Otherwise the literal value (number for price/year/units, text for status).' },
            },
            required: ['field', 'value'],
          },
        },
      },
      required: ['entity_type', 'name', 'changes'],
    },
  },
}

async function parseChange(text: string): Promise<ParsedChange | null> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  if (!apiKey || !endpoint) return null
  const client = new AzureOpenAI({ apiKey, endpoint, apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview' })
  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'

  const completion = await client.chat.completions.create({
    model: deployment,
    temperature: 0,
    tool_choice: { type: 'function', function: { name: 'apply_data_change' } },
    tools: [PARSE_TOOL],
    messages: [
      { role: 'system', content: 'You convert an admin\'s plain-language note about a Bali real-estate site into a structured data update. Call apply_data_change. "получил/дали/выдали PBG" → field pbg value granted. "подали заявку на PBG" → pbg applied. SLF works the same. Numbers: extract just the number for price_usd/completion_year/units_total. Keep the object name verbatim.' },
      { role: 'user', content: text },
    ],
  })
  logUsage({ feature: 'admin-ai', deployment, promptTokens: completion.usage?.prompt_tokens ?? 0, completionTokens: completion.usage?.completion_tokens ?? 0 })

  const call = completion.choices[0]?.message?.tool_calls?.find(c => c.type === 'function')
  if (!call || call.type !== 'function') return null
  let args: unknown
  try { args = JSON.parse(call.function.arguments) } catch { return null }
  const a = args as Partial<ParsedChange>
  if (!a.entity_type || !a.name || !Array.isArray(a.changes) || a.changes.length === 0) return null
  return { entity_type: String(a.entity_type), name: String(a.name), changes: a.changes.map(c => ({ field: String(c.field), value: String(c.value) })) }
}

// === entity resolution ===================================================

async function resolveEntity(collectionKey: string, name: string): Promise<RecordRow | 'ambiguous' | null> {
  const cfg = getCollection(collectionKey)
  if (!cfg) return null
  const q = name.trim()
  if (!q) return null
  let rows: RecordRow[]
  try { rows = (await adapterFor(cfg).list(cfg, { q, page: 0, pageSize: 8 })).rows } catch (e) { console.error('[admin-edit] list:', e); return null }
  if (rows.length === 0) {
    // Retry on the most distinctive token (handles "XOR Pandava" vs a
    // stored "XOR Pandava by Loi Bondar" and vice-versa).
    const token = q.split(/\s+/).sort((a, b) => b.length - a.length)[0]
    if (token && token.length >= 4 && token.toLowerCase() !== q.toLowerCase()) {
      try { rows = (await adapterFor(cfg).list(cfg, { q: token, page: 0, pageSize: 8 })).rows } catch { rows = [] }
    }
  }
  if (rows.length === 0) return null
  const lc = q.toLowerCase()
  const exact = rows.find(r => String(r.fields[cfg.titleField] ?? '').trim().toLowerCase() === lc)
  if (exact) return exact
  if (rows.length === 1) return rows[0]
  // Prefer a title that contains the full query; if exactly one, take it.
  const contains = rows.filter(r => String(r.fields[cfg.titleField] ?? '').toLowerCase().includes(lc))
  if (contains.length === 1) return contains[0]
  return 'ambiguous'
}

// === field whitelist / patch builder =====================================

type Write = { key: string; value: unknown }
type BuiltPatch = { writes: Write[]; human: string[]; errors: string[] }

// Which canonical fields are valid per collection.
const FIELDS_BY_COLLECTION: Record<string, Set<string>> = {
  complexes:    new Set(['pbg', 'slf', 'status', 'sales_status', 'readiness', 'price_usd', 'completion_year', 'published']),
  developers:   new Set(['published', 'yield', 'reputation', 'ai_description', 'units_total']),
  villas:       new Set(['pbg', 'slf', 'status', 'price_usd', 'published']),
  apartments:   new Set(['pbg', 'slf', 'status', 'price_usd', 'published']),
  parser_units: new Set(['status', 'price_usd', 'locked']),
}

function buildPatch(collectionKey: string, changes: { field: string; value: string }[]): BuiltPatch {
  const allowed = FIELDS_BY_COLLECTION[collectionKey] ?? new Set<string>()
  const writes: Write[] = []
  const human: string[] = []
  const errors: string[] = []

  for (const ch of changes) {
    if (!allowed.has(ch.field)) { errors.push(`поле «${ch.field}» тут не поддерживается`); continue }
    const res = mapFieldWrite(collectionKey, ch.field, ch.value)
    if ('error' in res) { errors.push(res.error); continue }
    writes.push(...res.writes)
    human.push(res.human)
  }
  return { writes, human, errors }
}

function mapFieldWrite(collectionKey: string, field: string, rawValue: string):
  { writes: Write[]; human: string } | { error: string } {
  const v = rawValue.trim()
  switch (field) {
    case 'pbg':
    case 'slf': {
      const st = normPermitState(v)
      const permitStr = permitToRaw(field, st)
      const writes: Write[] = [{ key: 'Разрешение', value: permitStr }, { key: 'Разрешительные документы', value: permitStr }]
      // A PBG certificate number → also store it on complexes/villas.
      if (field === 'pbg' && st === 'granted' && /[0-9]/.test(v) && v.length >= 6) writes.push({ key: 'PBG', value: v })
      return { writes, human: `${field.toUpperCase()} → ${st === 'granted' ? 'получен' : st === 'applied' ? 'заявка подана' : 'нет'}` }
    }
    case 'status':        return { writes: [{ key: statusKey(collectionKey), value: v }], human: `Статус → ${v}` }
    case 'sales_status':  return { writes: [{ key: 'Статус продаж', value: v }], human: `Статус продаж → ${v}` }
    case 'readiness':     return { writes: [{ key: 'Готовность', value: v }], human: `Готовность → ${v}` }
    case 'completion_year': return { writes: [{ key: 'Year of completion', value: v }], human: `Год сдачи → ${v}` }
    case 'price_usd': {
      const n = parseNumber(v)
      if (n == null) return { error: `цена «${v}» — не число` }
      const key = collectionKey === 'parser_units' ? 'Цена' : 'price_usd'
      const writes: Write[] = [{ key, value: n }]
      if (collectionKey !== 'parser_units') writes.push({ key: 'price', value: n })
      return { writes, human: `Цена → $${n.toLocaleString('en-US')}` }
    }
    case 'published': {
      const b = normBool(v)
      if (b == null) return { error: `«${v}» — не да/нет` }
      const key = collectionKey === 'developers' ? 'Публикация' : 'Опубликовать'
      return { writes: [{ key, value: b }], human: `${key} → ${b ? 'да' : 'нет'}` }
    }
    case 'locked': {
      const b = normBool(v)
      if (b == null) return { error: `«${v}» — не да/нет` }
      return { writes: [{ key: 'Заблокировано', value: b }], human: `Защита юнита → ${b ? 'вкл' : 'выкл'}` }
    }
    case 'yield':          return { writes: [{ key: 'Доходность', value: v }], human: `Доходность → ${v}` }
    case 'reputation':     return { writes: [{ key: 'Репутация и опыт', value: v }], human: `Репутация → ${v}` }
    case 'ai_description':  return { writes: [{ key: 'AI Описание', value: v }], human: `AI-описание → ${v.slice(0, 60)}…` }
    case 'units_total': {
      const n = parseNumber(v)
      if (n == null) return { error: `«${v}» — не число` }
      return { writes: [{ key: 'Total quantity of units', value: n }], human: `Всего юнитов → ${n}` }
    }
    default: return { error: `неизвестное поле «${field}»` }
  }
}

// Complexes store readiness stage in `Статус`; parser_units use the same
// key name but a constrained enum — we don't validate the enum here, the
// admin's word wins (they know the pipeline).
function statusKey(_collectionKey: string): string { return 'Статус' }

function permitToRaw(field: 'pbg' | 'slf', state: 'granted' | 'applied' | 'none'): string {
  if (state === 'none') return 'нет'
  if (field === 'slf') return state === 'granted' ? 'SLF' : 'Заявка SLF'
  return state === 'granted' ? 'PBG' : 'Заявка PBG'
}

function normPermitState(v: string): 'granted' | 'applied' | 'none' {
  const s = v.toLowerCase()
  if (/(получ|дал|выдал|granted|есть|готов|approved|да\b|yes)/.test(s)) return 'granted'
  if (/(заявк|подал|applied|процесс|оформл|pending|в работе)/.test(s)) return 'applied'
  if (/(нет|no\b|none|отозв|отсутств)/.test(s)) return 'none'
  return 'granted' // "получил PBG" often collapses to just the field name
}

function normBool(v: string): boolean | null {
  const s = v.toLowerCase().trim()
  if (/^(да|yes|true|1|вкл|on|опубл|публик|показ)/.test(s)) return true
  if (/^(нет|no|false|0|выкл|off|сня|скрыт|не публик)/.test(s)) return false
  return null
}

function parseNumber(v: string): number | null {
  // "$400,000" / "400k" / "1.2m" / "400 000"
  const s = v.toLowerCase().replace(/[\s,$]/g, '')
  const km = s.match(/^([0-9.]+)(k|к|m|м)$/)
  if (km) { const base = parseFloat(km[1]); if (!isFinite(base)) return null; return Math.round(base * (/[mм]/.test(km[2]) ? 1_000_000 : 1_000)) }
  const n = parseFloat(s.replace(/[^0-9.]/g, ''))
  return isFinite(n) ? Math.round(n) : null
}

// === semantic layer flag =================================================
//
// Null out embedding + source_hash on the matching assistant_kb row so the
// next kb-summarize/kb-embed run rebuilds it. Best-effort — a missing row
// or missing table must never fail the edit.

async function flagKbForReembed(kbKind: string | null, refId: string): Promise<void> {
  if (!kbKind) return
  await adminSb().from('assistant_kb').update({ embedding: null, source_hash: null }).eq('kind', kbKind).eq('ref_id', refId)
}

// === state (bot_admin_state) =============================================

type PendingChange = {
  collection: string
  entity_type: string
  kbKind: string | null
  ref_id: string
  entity_name: string
  patch: Record<string, unknown>
  human: string[]
  raw_message: string
}
type AdminState = { chat_id: number; unlocked_until: string | null; pending: PendingChange | null }

async function getState(chatId: number): Promise<AdminState | null> {
  const { data, error } = await adminSb().from('bot_admin_state').select('chat_id, unlocked_until, pending').eq('chat_id', chatId).maybeSingle()
  if (error) { console.error('[admin-edit] getState:', error.message); return null }
  return (data as AdminState | null) ?? null
}

async function setUnlocked(chatId: number, untilMs: number): Promise<void> {
  const unlocked_until = untilMs > 0 ? new Date(untilMs).toISOString() : null
  await adminSb().from('bot_admin_state').upsert({ chat_id: chatId, unlocked_until, updated_at: new Date().toISOString() }, { onConflict: 'chat_id' })
}

async function bumpUnlock(chatId: number): Promise<void> { await setUnlocked(chatId, Date.now() + EDIT_TTL_MS) }

async function setPending(chatId: number, pending: PendingChange): Promise<void> {
  await adminSb().from('bot_admin_state').upsert({ chat_id: chatId, pending, updated_at: new Date().toISOString() }, { onConflict: 'chat_id' })
}

async function clearPending(chatId: number): Promise<void> {
  await adminSb().from('bot_admin_state').update({ pending: null, updated_at: new Date().toISOString() }).eq('chat_id', chatId)
}

async function auditLog(chatId: number, p: PendingChange, applied: boolean): Promise<void> {
  await adminSb().from('bot_edit_log').insert({
    chat_id: chatId, entity_type: p.entity_type, collection: p.collection,
    ref_id: p.ref_id, entity_name: p.entity_name, changes: p.human, applied, raw_message: p.raw_message,
  })
}

// === Telegram senders ====================================================

async function sendText(token: string, chatId: number, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    })
  } catch (err) { console.error('[admin-edit] sendText:', err) }
}

async function sendConfirm(token: string, chatId: number, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: '✅ Да, применить', callback_data: 'admin:yes' }, { text: '❌ Нет', callback_data: 'admin:no' }]] },
      }),
    })
  } catch (err) { console.error('[admin-edit] sendConfirm:', err) }
}

async function answerCallback(token: string, callbackQueryId: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
    })
  } catch { /* non-fatal */ }
}

function escapeHtml(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
