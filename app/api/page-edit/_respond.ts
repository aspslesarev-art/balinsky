import { NextResponse } from 'next/server'
import { EditError } from '@/lib/page-edit/server'

// Общий ответ на ошибку для /api/page-edit: известные коды — как есть,
// остальное — без подробностей наружу, с записью в лог.
export function editErrorResponse(e: unknown, where: string) {
  if (e instanceof EditError) return NextResponse.json({ error: e.code }, { status: e.status })
  console.error(`[page-edit] ${where}:`, e instanceof Error ? e.message : e)
  return NextResponse.json({ error: 'server_error' }, { status: 500 })
}
