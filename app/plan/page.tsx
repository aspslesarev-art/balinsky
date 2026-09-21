import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Bricolage_Grotesque, Inter } from 'next/font/google'
import { planAccess } from '@/lib/plan/access'
import { PLAN_DEADLINE } from '@/lib/plan/data'
import { PlanClient } from './_client'
import { LogoutButton } from './_logout'
import styles from './plan.module.css'

// Личный трекер квартального плана. Виден только владельцу (lib/plan/access.ts),
// сам план лежит константой в lib/plan/data.ts, галочки — в Supabase.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Квест: Гоа',
  robots: { index: false, follow: false, nocache: true },
}

// Кириллицы у Bricolage Grotesque нет — русские заголовки падают на Georgia,
// ровно как в исходной вёрстке.
const fontHead = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'], variable: '--plan-font-h' })
const fontBody = Inter({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600'], variable: '--plan-font-b' })

/** Дней до вылета, как в исходнике: округление вверх, не меньше нуля. */
function daysUntil(deadline: string): number {
  const left = Math.ceil((Date.parse(`${deadline}T00:00:00Z`) - Date.now()) / 86_400_000)
  return left > 0 ? left : 0
}

export default async function PlanPage() {
  const access = await planAccess()
  // Не вошёл — на форму входа, но с возвратом сюда: иначе после логина
  // человек оказывается в чатах админки и думает, что план не работает.
  if (access.kind === 'anon') redirect('/admin?next=/plan')

  return (
    <main className={`${styles.page} ${fontHead.variable} ${fontBody.variable}`}>
      {access.kind === 'owner'
        ? <PlanClient daysLeft={daysUntil(PLAN_DEADLINE)} />
        : <NotOwner username={access.username} owner={access.owner} />}
    </main>
  )
}

/** Вошёл, но не тот: молчаливый редирект здесь читался бы как поломка. */
function NotOwner({ username, owner }: { username: string; owner: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.denied}>
        <h1>План закрыт</h1>
        <p>
          Вы вошли как <b>{username}</b>, а страница открыта для <b>{owner}</b>.
          Выйдите и войдите своим логином — или поменяйте настройку PLAN_OWNER.
        </p>
        <LogoutButton />
      </div>
    </div>
  )
}
