// Проверка чужого текста на невидимую метку balinsky.info (lib/source-mark.ts):
// вставляешь скопированный с другого сайта текст — видно, с какой нашей
// страницы он взят.

import { requireAdmin } from '@/lib/admin-auth'
import { LoginForm } from '../_login'
import { AdminChrome } from '@/components/admin/AdminChrome'
import { MarkChecker } from './_checker'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Проверка метки' }

export default async function MetkaPage() {
  if (!(await requireAdmin())) return <LoginForm />
  return (
    <AdminChrome width="max-w-[800px]">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">Проверка метки</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--ax-fg-muted)]">
          В статьях, новостях, текстах разделов, юрпроверке и таблицах цен стоит невидимая метка с адресом страницы.
          Скопируйте текст с чужого сайта и вставьте сюда — проверка покажет, откуда он взят.
        </p>
      </header>
      <MarkChecker />
    </AdminChrome>
  )
}
