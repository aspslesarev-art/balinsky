import type { Metadata } from 'next'
import { getSiteUser, safeNextPath } from '@/lib/site-auth'
import { ProSignIn } from '@/components/pro/ProSignIn'

// Вход в Balinsky Pro: окно поверх размытой аналитики виллы, как у AirDNA
// (владелец 21.10.2026). Pro = любой вошедший: аналитика на страницах вилл
// и апартаментов открывается по куке bx_auth (.bx-auth-block в globals.css).

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Balinsky Pro — sign in',
  robots: { index: false, follow: false },
}

export default async function ProPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams
  const user = await getSiteUser()
  return (
    <ProSignIn
      next={safeNextPath(next) ?? null}
      error={error === 'google' ? 'google' : null}
      user={user ? { name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null } : null}
    />
  )
}
