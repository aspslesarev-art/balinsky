import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { listPreviewDevelopers } from '@/lib/preview/developer-template'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Прототип: шаблон застройщика' }

export default async function PreviewIndex() {
  if (!(await requireAdmin())) redirect('/admin')
  const devs = await listPreviewDevelopers()
  const withComplexes = devs.filter(d => d.complexes > 0)

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Прототип нового шаблона страницы застройщика</h1>
      <p style={{ color: '#666', lineHeight: 1.6 }}>
        Вёрстка из хендоффа «Urban Escape» на живых данных Supabase. Страницы не индексируются
        и не связаны с публичным сайтом. У каждой внизу справа — чек-лист «каких данных не хватает».
      </p>
      <p style={{ color: '#666' }}>
        {withComplexes.length} застройщиков с комплексами · {devs.length - withComplexes.length} без комплексов
        (шаблон на них покажет пустые блоки — это тоже полезно проверить).
      </p>
      <ol style={{ lineHeight: 2, paddingLeft: 20 }}>
        {devs.map(d => (
          <li key={d.slug}>
            <Link href={`/admin/preview/zastrojshhik/${d.slug}`}>{d.name}</Link>
            <span style={{ color: '#999' }}> — {d.complexes} комплексов</span>
          </li>
        ))}
      </ol>
    </main>
  )
}
