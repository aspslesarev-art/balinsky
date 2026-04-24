import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const sb = createClient(
  'https://ifdgiwxothmcalibmydv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGdpd3hvdGhtY2FsaWJteWR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAwMzIxNCwiZXhwIjoyMDkyNTc5MjE0fQ.mM2hzZ3dxeYW_Re0zc1_dOuMg1liXnzDgBgpizqSJZY'
)

export default async function ListingPage({ params }: { params: { slug: string } }) {
  const { data } = await sb
    .from('listings_view')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!data) notFound()

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <a href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-6 block">← Назад</a>

      {data.main_image_url && (
        <img src={data.main_image_url} alt={data.name_ru} className="w-full h-96 object-cover rounded-2xl mb-6" />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <p className="text-sm text-gray-400 uppercase mb-2">{data.property_type === 'villa' ? 'Вилла' : 'Апартаменты'} · {data.location}</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{data.name_ru}</h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {data.price_usd && <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-400">Цена</div><div className="font-bold">${data.price_usd?.toLocaleString('ru-RU')}</div></div>}
            {data.area_sqm && <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-400">Площадь</div><div className="font-bold">{data.area_sqm} м²</div></div>}
            {data.bedrooms && <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-400">Спальни</div><div className="font-bold">{data.bedrooms}</div></div>}
            {data.leasehold_years && <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-400">Leasehold</div><div className="font-bold">{data.leasehold_years} лет</div></div>}
          </div>

          {data.seo_text_ru && (
            <div className="prose max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
              {data.seo_text_ru}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="border rounded-2xl p-6 sticky top-4">
            <div className="text-3xl font-bold mb-1">${data.price_usd?.toLocaleString('ru-RU')}</div>
            {data.declared_yield && (
              <div className="text-sm text-green-600 mb-4">Доходность: {data.declared_yield}</div>
            )}
            <a href={`https://t.me/BalinskyBot`} target="_blank"
              className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3 font-medium mb-2">
              Задать вопрос
            </a>
            <a href={`https://t.me/BalinskyBot`} target="_blank"
              className="block w-full text-center border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-3 font-medium">
              Забронировать
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
ENDOFFILEcat > ~/balinsky/app/page.tsx << 'ENDOFFILE'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://ifdgiwxothmcalibmydv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGdpd3hvdGhtY2FsaWJteWR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAwMzIxNCwiZXhwIjoyMDkyNTc5MjE0fQ.mM2hzZ3dxeYW_Re0zc1_dOuMg1liXnzDgBgpizqSJZY'
)

function cleanLocation(loc: string | null): string {
  if (!loc) return ''
  if (loc.startsWith('[')) {
    try { return JSON.parse(loc)[0] } catch { return loc }
  }
  return loc
}

export default async function Home() {
  const { data: listings } = await sb
    .from('listings_view')
    .select('airtable_id, slug, name_ru, price_usd, area_sqm, bedrooms, location, main_image_url, property_type, declared_yield')
    .not('name_ru', 'is', null)
    .order('price_usd', { ascending: false })
    .limit(24)

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Balinsky</h1>
      <p className="text-gray-500 mb-8">Недвижимость на Бали — {listings?.length ?? 0} объектов</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {listings?.map((l) => (
          <a key={l.airtable_id} href={`/ru/nedvizhimost/${l.slug}`}
            className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white block">
            <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
              {l.main_image_url
                ? <img src={l.main_image_url} alt={l.name_ru} className="w-full h-full object-cover" />
                : <span className="text-gray-300 text-4xl">🏠</span>
              }
            </div>
            <div className="p-4">
              <div className="text-xs text-gray-400 uppercase mb-1">
                {l.property_type === 'villa' ? 'Вилла' : 'Апартаменты'} · {cleanLocation(l.location)}
              </div>
              <div className="font-medium text-sm line-clamp-2 mb-2">{l.name_ru}</div>
              <div className="flex items-center justify-between">
                <div className="font-bold text-lg">${l.price_usd?.toLocaleString('ru-RU')}</div>
                {l.declared_yield && (
                  <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">{l.declared_yield}</div>
                )}
              </div>
              {(l.area_sqm || l.bedrooms) && (
                <div className="text-xs text-gray-400 mt-1">
                  {l.bedrooms && `${l.bedrooms} спал.`}{l.area_sqm && ` · ${l.area_sqm} м²`}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </main>
  )
}
ENDOFFIL
cd ~/balinsky && kill -9 50195 && npm run dev
