import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Home as HomeIcon, Building, Building2, HardHat } from 'lucide-react'
import { t, switchLangPath, type Lang } from '@/lib/i18n'

export const notFoundMetadata = {
  title: 'Page not found | Balinsky',
  robots: { index: false, follow: false },
}

// 404 copy per language; Balinese reads the Indonesian.
const COPY: Record<Exclude<Lang, 'ban'>, { h1: string; p: string; home: string }> = {
  ru: { h1: 'Страница не найдена', p: 'Возможно, объект снят с публикации или ссылка устарела. Попробуйте найти нужное в одном из разделов.', home: 'На главную' },
  en: { h1: 'Page not found', p: 'The listing may have been unpublished, or the link is out of date. Try one of the sections below.', home: 'Home' },
  id: { h1: 'Halaman tidak ditemukan', p: 'Listing mungkin sudah tidak ditayangkan, atau tautannya sudah usang. Coba salah satu bagian di bawah.', home: 'Beranda' },
  fr: { h1: 'Page introuvable', p: 'L’annonce a peut-être été retirée, ou le lien n’est plus à jour. Essayez l’une des rubriques ci-dessous.', home: 'Accueil' },
  de: { h1: 'Seite nicht gefunden', p: 'Das Angebot wurde vielleicht entfernt, oder der Link ist veraltet. Versuchen Sie einen der Bereiche unten.', home: 'Startseite' },
  zh: { h1: '页面未找到', p: '房源可能已下架，或链接已过期。请试试下面的栏目。', home: '首页' },
  nl: { h1: 'Pagina niet gevonden', p: 'De advertentie is misschien offline gehaald, of de link is verouderd. Probeer een van de rubrieken hieronder.', home: 'Home' },
  pl: { h1: 'Nie znaleziono strony', p: 'Oferta mogła zostać wycofana albo link jest nieaktualny. Spróbuj jednej z sekcji poniżej.', home: 'Strona główna' },
  uk: { h1: 'Сторінку не знайдено', p: 'Можливо, об’єкт знято з публікації або посилання застаріло. Спробуйте один із розділів нижче.', home: 'На головну' },
}

const QUICK_LINKS = [
  { href: '/ru/villy', key: 'nav.villas', Icon: HomeIcon },
  { href: '/ru/apartamenty', key: 'nav.apartments', Icon: Building },
  { href: '/ru/zhilye-kompleksy', key: 'nav.complexes', Icon: Building2 },
  { href: '/ru/zastrojshhiki', key: 'nav.developers', Icon: HardHat },
] as const

export function NotFoundView({ lang }: { lang: Lang }) {
  const c = COPY[lang === 'ban' ? 'id' : lang]

  return (
    <>
      <Header />
      <PageContainer>
        <section className="pt-16 md:pt-24 pb-12 max-w-2xl">
          <div className="text-[80px] md:text-[120px] font-semibold leading-none text-[var(--color-primary)] mb-4">404</div>
          <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827] mb-4">
            {c.h1}
          </h1>
          <p className="text-[16px] text-[var(--color-text-muted)] leading-relaxed mb-8">
            {c.p}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUICK_LINKS.map(({ href, key, Icon }) => (
              <li key={href}>
                <Link
                  href={switchLangPath(href, lang)}
                  className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-[var(--color-border)] bg-white text-[#111827] no-underline hover:border-[var(--color-primary)] transition-colors"
                >
                  <Icon size={22} className="text-[var(--color-primary)]" />
                  <span className="text-[15px] font-medium">{t(key, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link
              href={switchLangPath('/ru', lang)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[14px] font-medium no-underline hover:bg-[var(--color-primary-hover)]"
            >
              {c.home}
            </Link>
          </div>
        </section>
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
