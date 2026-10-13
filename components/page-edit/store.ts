// Состояние редактора, переживающее переход между страницами.
//
// Редактор живёт на странице объекта, а при переходе «ЖК → вилла» справа
// открывается страница виллы — и прежний экземпляр редактора размонтируется
// вместе со старой страницей. Модульная переменная живёт, пока не перезагрузили
// вкладку: новая страница по ней сразу открывает редактор на том же месте.

import type { EditKind, EditorRole } from '@/lib/page-edit/schema'

export type View =
  | { kind: EditKind; id: string }
  /** Новая запись внутри родителя: юнит в ЖК или ЖК у застройщика. role — кто создаёт. */
  | { kind: 'villa' | 'apartment' | 'complex'; newIn: { id: string; name: string; role: EditorRole } }

export const editorStore: { open: boolean; stack: View[] } = { open: false, stack: [] }
