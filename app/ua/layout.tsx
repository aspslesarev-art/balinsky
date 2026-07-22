import { HtmlLangSetter } from '@/components/HtmlLangSetter'

// Every page under /en sets <html lang="uk"> on the client right after
// hydration. Root layout emits lang="ru" statically (so ISR pages stay
// prerenderable without forcing dynamic headers()), and this layout
// corrects the attribute on EN routes.
export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HtmlLangSetter lang="uk" />
      {children}
    </>
  )
}
