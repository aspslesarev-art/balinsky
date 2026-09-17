// Эксплорер «Отделка и спрос на Бали»: 15 тыс. объектов посуточной аренды
// с уровнем отделки по фото, ставкой, загрузкой и индексами к соседям.
// Сама страница — самостоятельный HTML (свои стили и фильтры), поэтому
// показывается во весь экран через iframe, а не внутри AdminChrome.

import { requireAdmin } from '@/lib/admin-auth'
import { LoginForm } from '../_login'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Отделка и спрос на Бали', robots: { index: false, follow: false } }

export default async function OtdelkaPage() {
  if (!(await requireAdmin())) return <LoginForm />
  return (
    <iframe
      src="/api/admin/otdelka"
      title="Отделка и спрос на Бали"
      className="fixed inset-0 z-50 h-dvh w-screen border-0 bg-[#F1F3F0]"
    />
  )
}
