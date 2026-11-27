import 'server-only'
import { cdnManifestUrl, cdnRewrite } from '@/lib/photo-cdn'
import { listComplexUnits, searchComplexes, complexNameById, type ComplexOption } from '@/lib/agent-listings/catalog'

// Камера по фото: снимающий выбирает ЖК с сайта, видит его фото и
// снимает видео, совмещая камеру с полупрозрачной картинкой.
// Фото ЖК + фото опубликованных вилл/апартаментов этого ЖК (интерьеры).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET = { complex: 'complex-photos', villa: 'villa-photos', apartment: 'apartment-photos' } as const
type Bucket = keyof typeof BUCKET

async function manifest(b: Bucket): Promise<Record<string, string[]>> {
  const url = cdnManifestUrl(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET[b]}/_manifest.json`)
  const r = await fetch(url, { next: { revalidate: 86400 } })
  if (!r.ok) throw new Error(`manifest ${b}: ${r.status}`)
  return (await r.json()) as Record<string, string[]>
}

export function findComplexes(q: string): Promise<ComplexOption[]> {
  return searchComplexes(q, q.trim().length >= 2 ? 40 : 300)
}

export type ObjPhoto = { url: string; group: string }
export type ObjPhotos = { id: string; name: string; photos: ObjPhoto[] }

export async function complexPhotos(id: string): Promise<ObjPhotos | null> {
  const name = await complexNameById(id)
  if (!name) return null
  const [cm, vm, am, villas, apts] = await Promise.all([
    manifest('complex'), manifest('villa'), manifest('apartment'),
    listComplexUnits('villa', name), listComplexUnits('apartment', name),
  ])
  const photos: ObjPhoto[] = []
  const seen = new Set<string>()
  const add = (urls: string[] | undefined, group: string, max: number) => {
    for (const u of (urls ?? []).slice(0, max)) {
      const url = cdnRewrite(u) ?? u
      if (seen.has(url)) continue
      seen.add(url)
      photos.push({ url, group })
    }
  }
  add(cm[id], 'Комплекс', 30)
  for (const v of villas.slice(0, 6)) add(vm[v.id], v.title || 'Вилла', 12)
  for (const a of apts.slice(0, 6)) add(am[a.id], a.title || 'Апартаменты', 12)
  return { id, name, photos: photos.slice(0, 80) }
}
