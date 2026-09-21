import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { LoginForm } from './_login'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Balinsky Admin' }

export default async function AdminRoot({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  // Пускаем только внутренние пути — чтобы форму входа нельзя было
  // превратить в редирект на чужой сайт.
  const back = next && /^\/(?!\/)/.test(next) ? next : null
  if (await requireAdmin()) redirect(back ?? '/admin/chats')
  return <LoginForm next={back} />
}
