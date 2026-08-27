import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { listMarketAccess } from '@/lib/market/access'
import { LoginForm } from '../../_login'
import { MarketShell } from '../_shell'
import { AccessList } from './_access-list'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Кому открыт закрытый отчёт /rynok. Ник можно вписать заранее — человек
// войдёт через бота, и доступ подхватится на первом же входе.

export default async function MarketAccessPage() {
  if (!(await requireAdmin())) return <LoginForm />

  const rows = await listMarketAccess()

  return (
    <MarketShell>
      <header>
        <Link href="/admin/market" className="text-[12px] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]">
          ← Рынок
        </Link>
        <div className="mt-2 mb-1 text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)]">
          Закрытый отчёт
        </div>
        <h1 className="text-[24px] font-semibold tracking-tight">Доступ к движению рынка</h1>
        <div className="mt-1 text-[12px] text-[var(--ax-fg-muted)]">
          Страница{' '}
          <Link href="/rynok" className="underline" target="_blank">
            balinsky.info/rynok
          </Link>{' '}
          — вход через Telegram-бота, видят только аккаунты из этого списка.
        </div>
      </header>

      <section className="rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-5">
        <AccessList rows={rows} />
      </section>
    </MarketShell>
  )
}
