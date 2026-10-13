import 'server-only'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/admin-auth'
import { DEV_COOKIE, DEV_KEY_FIELD, parseDevToken } from './dev-session'
import { adminSb } from '@/lib/admin/sb'
import type { EditKind, EditorRole } from './schema'

// Кто правит страницу.
//
// staff — команда Balinsky (вход в админку). Правит всё.
// developer — застройщик: только свою страницу и объекты своих ЖК. Входит по
// личной ссылке (lib/page-edit/dev-session.ts), сессия — в куке.

export type Editor = { role: EditorRole; developerId?: string; developerName?: string }

const str = (v: unknown): string => {
  if (Array.isArray(v)) return str(v[0])
  return v == null ? '' : String(v).trim()
}

export async function currentEditor(): Promise<Editor | null> {
  if (await requireAdmin()) return { role: 'staff' }
  return developerEditor()
}

/** Сессия застройщика: подпись куки верна и ключ ещё не сменён. */
async function developerEditor(): Promise<Editor | null> {
  const parsed = parseDevToken((await cookies()).get(DEV_COOKIE)?.value)
  if (!parsed) return null
  const { data } = await adminSb().from('raw_developers').select('data').eq('airtable_id', parsed.devId).maybeSingle()
  const d = (data as { data?: Record<string, unknown> } | null)?.data
  if (!d || str(d[DEV_KEY_FIELD]) !== parsed.key) return null
  return { role: 'developer', developerId: parsed.devId, developerName: str(d['Developer']) }
}

const TABLE: Record<EditKind, string> = {
  developer: 'raw_developers',
  complex: 'raw_complexes',
  villa: 'raw_villas',
  apartment: 'raw_apartments',
}

/** Принадлежит ли запись застройщику. Сравниваем по id связи и по имени — в
 *  старых записях Airtable связь хранится то именем, то id. */
export async function ownsRecord(editor: Editor, kind: EditKind, id: string): Promise<boolean> {
  if (editor.role === 'staff') return true
  const devId = editor.developerId, devName = (editor.developerName ?? '').toLowerCase()
  if (!devId) return false
  if (kind === 'developer') return id === devId

  const { data } = await adminSb().from(TABLE[kind]).select('data').eq('airtable_id', id).maybeSingle()
  const d = ((data as { data?: Record<string, unknown> } | null)?.data) ?? null
  if (!d) return false
  const names = [d['Developer1'], d['Developer']].map(v => str(v).toLowerCase())
  const links = Array.isArray(d['Developer']) ? (d['Developer'] as unknown[]).map(str) : []
  if (links.includes(devId) || (devName && names.includes(devName))) return true
  if (kind === 'complex') return false
  // Юнит без своей связи с застройщиком — по его ЖК.
  const complexId = Array.isArray(d['Комплекс']) ? str(d['Комплекс']) : ''
  return complexId ? ownsRecord(editor, 'complex', complexId) : false
}

export async function editorFor(kind: EditKind, id: string): Promise<Editor | null> {
  const editor = await currentEditor()
  if (!editor) return null
  return (await ownsRecord(editor, kind, id)) ? editor : null
}
