// Admin dashboard: who is signed in, and what each of them looks at.
//
// /admin/views answers "what is getting attention" across all traffic. This
// one answers "who", which is the question that starts a conversation: an
// agent who came back to the same villa three times is worth a message in the
// Telegram chat we already share with them.
//
// Only signed-in visitors appear here — guest views stay anonymous in
// page_views with a null telegram_id, exactly as before the accounts existed.

import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { LoginForm } from '../_login'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Люди · Balinsky Admin' }

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

/** Views pulled for the timeline. Generous, but bounded. */
const VIEW_LIMIT = 20000
/** Rows in one person's expanded history. */
const HISTORY_LIMIT = 40

type UserRow = {
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  is_agent: boolean
  created_at: string
  last_login_at: string | null
}

type ViewRow = {
  created_at: string
  kind: string
  slug: string
  title: string | null
  telegram_id: number | null
}

/** One listing with the signed-in people who opened it. */
type ListingViewers = {
  kind: string
  slug: string
  title: string | null
  total: number
  lastAt: string
  viewers: Map<number, { count: number; lastAt: string }>
}

const KIND_LABEL: Record<string, string> = {
  villa: 'Вилла', apartment: 'Апартаменты', complex: 'ЖК', developer: 'Застройщик',
  event: 'Событие', promo: 'Акция', news: 'Новость', knowledge: 'Статья', rental: 'Аренда',
}

/** Detail-page path per kind, so a row in the timeline is clickable. */
const KIND_PATH: Record<string, string> = {
  villa: '/ru/villy/o', apartment: '/ru/apartamenty/o', complex: '/ru/zhilye-kompleksy/o',
  developer: '/ru/zastrojshhiki', event: '/ru/sobytiya', promo: '/ru/akcii',
  news: '/ru/novosti', knowledge: '/ru/znaniya', rental: '/ru/arenda/o',
}

function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function displayName(u: UserRow): string {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
  if (name) return name
  if (u.username) return `@${u.username}`
  return `id ${u.telegram_id}`
}

export default async function AdminUsersPage() {
  // Show the form in place rather than bouncing — /admin/login does not
  // exist, and a redirect there 404s (as this page did until now).
  if (!(await requireAdmin())) return <LoginForm />

  const [{ data: users }, { data: views }] = await Promise.all([
    sb.from('site_users')
      .select('telegram_id, username, first_name, last_name, is_agent, created_at, last_login_at')
      .order('last_login_at', { ascending: false, nullsFirst: false })
      .limit(500),
    sb.from('page_views')
      .select('created_at, kind, slug, title, telegram_id')
      .not('telegram_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(VIEW_LIMIT),
  ])

  const userList = (users ?? []) as UserRow[]
  const viewList = (views ?? []) as ViewRow[]

  const byUser = new Map<number, ViewRow[]>()
  for (const v of viewList) {
    if (v.telegram_id == null) continue
    const list = byUser.get(v.telegram_id)
    if (list) list.push(v)
    else byUser.set(v.telegram_id, [v])
  }

  // The same rows read the other way round: per listing, who looked at it.
  // Built from the already-loaded views — no second query.
  const userById = new Map(userList.map(u => [u.telegram_id, u]))
  const byListing = new Map<string, ListingViewers>()
  for (const v of viewList) {
    if (v.telegram_id == null) continue
    const key = `${v.kind}:${v.slug}`
    const entry = byListing.get(key) ?? {
      kind: v.kind, slug: v.slug, title: v.title, total: 0, lastAt: v.created_at, viewers: new Map(),
    }
    entry.total++
    if (v.created_at > entry.lastAt) entry.lastAt = v.created_at
    if (v.title && !entry.title) entry.title = v.title
    const seen = entry.viewers.get(v.telegram_id)
    if (seen) {
      seen.count++
      // Don't lean on the query's ordering to decide which visit is latest.
      if (v.created_at > seen.lastAt) seen.lastAt = v.created_at
    } else {
      entry.viewers.set(v.telegram_id, { count: 1, lastAt: v.created_at })
    }
    byListing.set(key, entry)
  }
  const listings = [...byListing.values()].sort(
    (a, b) => b.viewers.size - a.viewers.size || b.total - a.total,
  )

  return (
    <AdminThemeShell
      title="Люди"
      description={`${userList.length} зарегистрировано · ${viewList.length} просмотров с привязкой к аккаунту`}
      back={{ href: '/admin/views', label: '← Просмотры' }}
    >
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-[14px] opacity-70">
          Просмотры гостей остаются обезличенными и сюда не попадают.
        </p>

        {userList.length === 0 && (
          <p className="mt-10 text-[15px] opacity-70">
            Пока никто не заходил. Первый вход появится здесь сразу после того, как кто-то
            авторизуется через бота.
          </p>
        )}

        <div className="mt-8 space-y-4">
          {userList.map(u => {
            const history = byUser.get(u.telegram_id) ?? []
            return (
              <details key={u.telegram_id} className="rounded-2xl border border-black/10 bg-white/60 p-5">
                <summary className="cursor-pointer list-none">
                  <span className="text-[16px] font-semibold">{displayName(u)}</span>
                  {u.is_agent && (
                    <span className="ml-2 rounded-full bg-[#229ED9]/10 px-2 py-0.5 text-[12px] text-[#1b8ec2]">агент</span>
                  )}
                  <span className="ml-3 text-[13px] opacity-60">
                    {history.length} просмотров · последний вход {fmt(u.last_login_at)}
                  </span>
                  {u.username && (
                    <a
                      href={`https://t.me/${u.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 text-[13px] underline opacity-70"
                    >
                      написать
                    </a>
                  )}
                </summary>

                {history.length === 0 ? (
                  <p className="mt-4 text-[14px] opacity-60">Ещё ничего не смотрел после входа.</p>
                ) : (
                  <table className="mt-4 w-full text-[13px]">
                    <tbody>
                      {history.slice(0, HISTORY_LIMIT).map((v, i) => (
                        <tr key={i} className="border-t border-black/5">
                          <td className="w-36 py-1.5 opacity-60">{fmt(v.created_at)}</td>
                          <td className="w-28 py-1.5 opacity-60">{KIND_LABEL[v.kind] ?? v.kind}</td>
                          <td className="py-1.5">
                            <a
                              href={`${KIND_PATH[v.kind] ?? ''}/${v.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {v.title ?? v.slug}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {history.length > HISTORY_LIMIT && (
                  <p className="mt-2 text-[12px] opacity-50">
                    Показаны последние {HISTORY_LIMIT} из {history.length}.
                  </p>
                )}
              </details>
            )
          })}
        </div>

        {listings.length > 0 && (
          <>
            <h2 className="mt-12 text-[20px] font-semibold tracking-tight">По объектам</h2>
            <p className="mt-1 text-[14px] opacity-70">
              Кто из зарегистрированных открывал конкретный объект. Сверху — то, что смотрело
              больше разных людей.
            </p>

            <div className="mt-5 space-y-3">
              {listings.map(l => (
                <details key={`${l.kind}:${l.slug}`} className="rounded-2xl border border-black/10 bg-white/60 p-5">
                  <summary className="cursor-pointer list-none">
                    <span className="text-[13px] opacity-60">{KIND_LABEL[l.kind] ?? l.kind}</span>
                    <span className="ml-2 text-[15px] font-semibold">{l.title ?? l.slug}</span>
                    <span className="ml-3 text-[13px] opacity-60">
                      {l.viewers.size} чел. · {l.total} просмотров · последний {fmt(l.lastAt)}
                    </span>
                  </summary>

                  <table className="mt-4 w-full text-[13px]">
                    <tbody>
                      {[...l.viewers.entries()]
                        .sort((a, b) => b[1].count - a[1].count)
                        .map(([id, stat]) => {
                          const u = userById.get(id)
                          return (
                            <tr key={id} className="border-t border-black/5">
                              <td className="py-1.5">
                                {u ? displayName(u) : `id ${id}`}
                                {u?.is_agent && <span className="ml-2 text-[12px] opacity-60">агент</span>}
                              </td>
                              <td className="w-32 py-1.5 opacity-60">{stat.count} раз</td>
                              <td className="w-36 py-1.5 opacity-60">{fmt(stat.lastAt)}</td>
                              <td className="w-24 py-1.5">
                                {u?.username && (
                                  <a
                                    href={`https://t.me/${u.username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline opacity-70"
                                  >
                                    написать
                                  </a>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </details>
              ))}
            </div>
          </>
        )}
      </main>
    </AdminThemeShell>
  )
}
