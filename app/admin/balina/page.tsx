// Editable knowledge base for the Балина AI assistant.
//
// Each row in `assistant_knowledge` is one named section of the
// system prompt. The page renders a textarea per section and lets
// the admin edit / save / reset each one independently. The chat
// route reads the result via getSystemPrompt() (cached 30s in-process,
// invalidated on save).
//
// Source of truth for "what sections exist" is DEFAULT_SECTIONS in
// lib/assistant-knowledge.ts (code). Source of truth for "what's in
// each body" is this DB table (admin-editable). On first page-load
// the loader seeds any missing keys so the UI just works.

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { loadKnowledgeSections, isKnowledgeTableMissing } from '@/lib/assistant-knowledge'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { BalinaEditor } from './_editor'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Балина · Balinsky Admin' }

export default async function BalinaAdmin() {
  if (!(await requireAdmin())) redirect('/admin')

  const sections = await loadKnowledgeSections()
  const tableMissing = isKnowledgeTableMissing()
  const totalChars = sections.reduce((s, x) => s + x.body.length, 0)

  return (
    <AdminThemeShell
      title="База знаний Балины"
      description={`Системный промпт AI-консультанта по секциям. Каждое сохранение мгновенно подхватывается чатом. Всего ${sections.length} секций, ${totalChars.toLocaleString('ru-RU')} символов.`}
    >
      {tableMissing && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-[13px] text-[var(--ax-fg)]">
          <div className="font-semibold mb-1">Миграция не применена — режим «только чтение»</div>
          <div className="text-[var(--ax-fg-soft)]">
            Покажу дефолтные секции из кода, но сохранение / сброс не работают, пока в Supabase нет таблицы <code className="font-mono">assistant_knowledge</code>.
            Применить — открой <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noopener noreferrer" className="underline text-[#1F8B5F]">Supabase SQL Editor</a> и вставь содержимое <code className="font-mono">migrations/017_assistant_knowledge.sql</code>. После этого обнови страницу.
          </div>
        </div>
      )}
      <BalinaEditor initialSections={sections} readOnly={tableMissing} />
    </AdminThemeShell>
  )
}
