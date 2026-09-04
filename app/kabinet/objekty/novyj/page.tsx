import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteUser } from '@/lib/site-auth'
import { LOGIN_URL } from '@/components/GatedBlock'
import NewListingForm from './_form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Добавить объект | Balinsky',
  robots: { index: false, follow: false },
}

export default async function NewListingPage() {
  const user = await getSiteUser()

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-16">
        <h1 className="text-[26px] font-semibold tracking-tight text-[#111827]">Вход</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
          Чтобы добавить объект, войдите через Telegram — бот пришлёт одноразовую ссылку.
        </p>
        <a
          href={LOGIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#229ED9] px-6 py-3 text-[15px] font-semibold text-white"
        >
          Войти через Telegram
        </a>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <Link href="/kabinet/objekty" className="text-[14px] text-[var(--color-text-muted)] underline">
        ← Мои объекты
      </Link>
      <h1 className="mt-4 text-[26px] font-semibold tracking-tight text-[#111827] sm:text-[32px]">
        Добавить объект
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
        Выберите комплекс и юнит — характеристики подтянутся из каталога, вам останется указать цену.
        Ссылка на объект заработает сразу; в каталог он попадёт после проверки.
      </p>
      <div className="mt-8">
        <NewListingForm />
      </div>
    </main>
  )
}
