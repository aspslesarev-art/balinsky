import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Home as HomeIcon, Building, Building2, HardHat } from 'lucide-react'

export const metadata = {
  title: 'Страница не найдена | Balinsky',
  robots: { index: false, follow: false },
}

const QUICK_LINKS = [
  { href: '/ru/villy', label: 'Виллы и дома', Icon: HomeIcon },
  { href: '/ru/apartamenty', label: 'Апартаменты', Icon: Building },
  { href: '/ru/zhilye-kompleksy', label: 'Жилые комплексы', Icon: Building2 },
  { href: '/ru/zastrojshhiki', label: 'Застройщики', Icon: HardHat },
]

export default function NotFound() {
  return (
    <>
      <Header />
      <PageContainer>
        <section className="pt-16 md:pt-24 pb-12 max-w-2xl">
          <div className="text-[80px] md:text-[120px] font-semibold leading-none text-[var(--color-primary)] mb-4">404</div>
          <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827] mb-4">
            Страница не найдена
          </h1>
          <p className="text-[16px] text-[var(--color-text-muted)] leading-relaxed mb-8">
            Возможно, объект снят с публикации или ссылка устарела. Попробуй найти то что искал в одном из разделов.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUICK_LINKS.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-[var(--color-border)] bg-white text-[#111827] no-underline hover:border-[var(--color-primary)] transition-colors"
                >
                  <Icon size={22} className="text-[var(--color-primary)]" />
                  <span className="text-[15px] font-medium">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link
              href="/ru"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[14px] font-medium no-underline hover:bg-[var(--color-primary-hover)]"
            >
              На главную
            </Link>
          </div>
        </section>
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
