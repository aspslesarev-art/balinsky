import { createClient } from '@supabase/supabase-js'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { DevelopersList } from '@/components/DevelopersList'
import { DevelopersSeoContent } from '@/components/DevelopersSeoContent'
import type { DeveloperRowData } from '@/components/DeveloperRow'

export const revalidate = 3600

export const metadata = {
  title: 'Застройщики на Бали — каталог девелоперов недвижимости 2026 | Balinsky',
  description:
    'Каталог застройщиков Бали с действующими проектами: виллы, апартаменты, жилые комплексы. Сравнение по рейтингу, надёжности, управляющей компании. 80+ компаний.',
  alternates: { canonical: '/ru/zastrojshhiki' },
  openGraph: {
    title: 'Застройщики на Бали — каталог девелоперов 2026 | Balinsky',
    description:
      'Каталог застройщиков Бали: рейтинги, репутация, проекты, управляющие компании.',
    type: 'website',
    url: '/ru/zastrojshhiki',
  },
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

type Row = { data: Record<string, unknown>; logo_url: string | null }

function logoFromJson(data: Record<string, unknown>): string | null {
  const arr = data['Logo']
  if (Array.isArray(arr) && arr[0] && typeof arr[0] === 'object' && 'url' in arr[0]) {
    const url = (arr[0] as { url: unknown }).url
    return typeof url === 'string' ? url : null
  }
  return null
}

export default async function Page() {
  const { data } = await sb
    .from('raw_developers')
    .select('data, logo_url')
    .limit(200)

  const rows = (data ?? []) as Row[]

  const items: DeveloperRowData[] = rows
    .filter(r => r.data['Публикация'] === true && r.data['SEO:Slug'] && r.data['Developer'])
    .sort(
      (a, b) =>
        Number(b.data['Общий рейтинг'] ?? 0) - Number(a.data['Общий рейтинг'] ?? 0)
    )
    .map(r => ({
      slug: String(r.data['SEO:Slug'] ?? '') || null,
      name: String(r.data['Developer']),
      logoUrl: r.logo_url ?? logoFromJson(r.data),
      construction: (r.data['Строительство и недвижимость'] as string | null) ?? null,
      reputation: (r.data['Репутация и опыт'] as string | null) ?? null,
      equipment: (r.data['Техника и производство'] as string | null) ?? null,
      management: (r.data['Управляющая компания'] as string | null) ?? null,
    }))

  return (
    <>
      <Header active="zastrojshhiki" />
      <PageContainer>
        <h1 className="pt-12 text-[26px] md:text-[36px] font-semibold tracking-tight text-[var(--color-text)] mb-3">
          Застройщики на Бали
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
          {items.length} компаний в каталоге
        </div>

        <p className="max-w-3xl text-[15px] leading-relaxed text-[var(--color-text)] mb-3">
          На странице собраны застройщики и девелоперы Бали с действующими проектами — виллами,
          апартаментами и жилыми комплексами. По каждой компании показан рейтинг по четырём
          направлениям: качество строительства и недвижимости, репутация и опыт, техника и
          производство, управляющая компания после ввода.
        </p>
        <p className="max-w-3xl text-[15px] leading-relaxed text-[var(--color-text-muted)] mb-8">
          Сортировка по общему рейтингу — наверху самые сильные. Это помогает быстро отсеять
          случайных игроков и сфокусироваться на тех, у кого есть сданные проекты, прозрачная
          юридическая схема и работающая управляющая компания.
        </p>

        <DevelopersList items={items} />

        <DevelopersSeoContent />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
