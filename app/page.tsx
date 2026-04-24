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
