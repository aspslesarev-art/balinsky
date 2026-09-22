import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { autoLinkChatsByNick, listMergePairs, listPartners } from '@/lib/dev-crm/store'
import { DevelopersBoard } from './_client'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Застройщики · Balinsky Admin' }

export default async function DevelopersCrmPage() {
  if (!(await requireAdmin())) redirect('/admin')
  // Чаты, заведённые ботом уже после карточки, привязываем по нику до
  // чтения — иначе разговор, начатый час назад, выглядел бы потерянным.
  await autoLinkChatsByNick()
  // Список чатов бота здесь не нужен: его тянет сама карточка, когда
  // её открыли. На загрузке раздела это был лишний полный проход по
  // переписке — доска им не пользуется.
  const [partners, pairs] = await Promise.all([listPartners(), listMergePairs()])
  return (
    <AdminThemeShell
      title="Застройщики"
      description="Воронка по застройщикам · основатели и сотрудники · переписка и встречи из Telegram"
      fullWidth
    >
      <DevelopersBoard initialPartners={partners} initialPairs={pairs} />
    </AdminThemeShell>
  )
}
