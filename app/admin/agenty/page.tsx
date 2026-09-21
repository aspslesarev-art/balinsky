import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { listAgents, listUnlinkedChats } from '@/lib/agents/store'
import { AgentsBoard } from './_client'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Агенты · Balinsky Admin' }

export default async function AgentsAdminPage() {
  if (!(await requireAdmin())) redirect('/admin')
  // Доска приезжает уже отрисованной: 190 карточек — это один запрос,
  // и ждать спиннер на каждом открытии раздела незачем.
  const [agents, chats] = await Promise.all([listAgents(), listUnlinkedChats()])
  return (
    <AdminThemeShell title="Агенты" description="Воронка по агентам · анкета · переписка и встречи из Telegram" fullWidth>
      <AgentsBoard initialAgents={agents} initialChats={chats} />
    </AdminThemeShell>
  )
}
