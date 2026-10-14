import { notFound, redirect } from 'next/navigation'
import { isOwnerAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { crmEnabled, listCrmContacts } from '@/lib/tg-crm/store'
import { CrmBoard } from './_client'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Мои контакты · Balinsky Admin' }

export default async function CrmPage() {
  // Данные только на Маке владельца (TG_CRM_DIR); на проде раздела нет.
  if (!crmEnabled()) notFound()
  // Личная переписка — только владельцу. Другие админы и не вошедшие
  // уходят на /admin (там форма входа или их обычный раздел).
  if (!(await isOwnerAdmin())) redirect('/admin')
  // Весь список одним запросом: фильтры и вкладки считаются в браузере,
  // переключать их без ожидания важнее, чем лишний мегабайт на входе.
  const contacts = await listCrmContacts()
  return (
    <AdminThemeShell title="Мои контакты" description="Кому ответить, что обещал, кто кому должен — по всем чатам Telegram" fullWidth>
      <CrmBoard contacts={contacts} />
    </AdminThemeShell>
  )
}
