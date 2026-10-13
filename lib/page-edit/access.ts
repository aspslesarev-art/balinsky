import 'server-only'
import { requireAdmin } from '@/lib/admin-auth'
import { adminSb } from '@/lib/admin/sb'
import type { EditKind, EditorRole } from './schema'

// Кто правит страницу.
//
// staff — команда Balinsky (вход в админку). Правит всё.
// developer — застройщик: только свою страницу и объекты своих ЖК
// (developerEditor, подключается вторым этапом).

export type Editor = { role: EditorRole; developerId?: string; developerName?: string }

const str = (v: unknown): string => {
  if (Array.isArray(v)) return str(v[0])
  return v == null ? '' : String(v).trim()
}

export async function currentEditor(): Promise<Editor | null> {
  if (await requireAdmin()) return { role: 'staff' }
  return developerEditor()
}

/** Сессия застройщика. Второй этап — пока никого. */
async function developerEditor(): Promise<Editor | null> {
  return null
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
