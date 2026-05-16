import type { ReactNode } from 'react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import type { Lang } from '@/lib/i18n'

// Shared shell for the legal / contact pages so the four documents
// (privacy, terms, cookie, contact) keep the same typography rhythm
// without each one duplicating the page chrome.
export function LegalLayout({
  lang,
  title,
  updated,
  breadcrumbLabel,
  children,
}: {
  lang: Lang
  title: string
  updated: string
  breadcrumbLabel: string
  children: ReactNode
}) {
  const home = lang === 'en' ? '/en' : '/ru'
  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: lang === 'en' ? 'Home' : 'Главная', href: home },
          { label: breadcrumbLabel },
        ]} />
        <article className="mt-6 mb-16 max-w-3xl">
          <header className="mb-10">
            <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827] mb-3 leading-tight">
              {title}
            </h1>
            <p className="text-[14px] text-[var(--color-text-muted)]">{updated}</p>
          </header>
          <div className="prose prose-neutral max-w-none text-[15px] leading-[1.7] text-[#1f2937]
            [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:text-[#111827] [&_h2]:mt-10 [&_h2]:mb-3
            [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:text-[#111827] [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:my-3
            [&_ul]:my-3 [&_ul]:pl-5 [&_ul>li]:list-disc [&_ul>li]:my-1
            [&_a]:text-[var(--color-primary)] [&_a]:no-underline hover:[&_a]:underline">
            {children}
          </div>
        </article>
      </PageContainer>
    </>
  )
}
