import { HtmlLangSetter } from '@/components/HtmlLangSetter'

// Every page under /zh sets <html lang="zh"> on the client right after
// hydration. Root layout emits lang="ru" statically (so ISR pages stay
// prerenderable without forcing dynamic headers()), and this layout
// corrects the attribute on ZH routes.
export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HtmlLangSetter lang="zh" />
      {children}
    </>
  )
}
