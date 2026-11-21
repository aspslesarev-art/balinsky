// 3D-планировки из Storage (site-assets/models/) под адресом сайта: /m3d/<файл>.
//
// Зачем прокси: Supabase отдаёт HTML из бакетов как text/plain с CSP sandbox,
// так что модель нельзя открыть в iframe напрямую. Здесь тот же файл уходит
// как text/html, а относительные _toon-kit.js / _model-i18n.js рядом с ним
// подтягиваются этим же маршрутом.
//
// Новая модель = файл в Storage (scripts/site-assets.mjs) + строка в
// site_content '3d-plans' с url '/m3d/<файл>.html'. Выкладка не нужна.
// Кэш CDN Vercel — неделя: правка уже выложенной модели — новое имя файла
// или ?v=2 в url строки.

import { cdnManifestUrl } from '@/lib/photo-cdn'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  glb: 'model/gltf-binary',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const SAFE = /^[a-z0-9][a-z0-9._-]*$/i

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const ext = (path[path.length - 1] ?? '').split('.').pop()?.toLowerCase() ?? ''
  if (!path.length || path.length > 3 || !path.every(p => SAFE.test(p)) || !TYPES[ext]) {
    return new Response('not found', { status: 404 })
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const src = `${base}/storage/v1/object/public/site-assets/models/${path.join('/')}`
  // Час на бакет CDN: обновлённый файл в Storage доходит сюда не позже чем
  // через час (плюс кэш Vercel ниже).
  const res = await fetch(cdnManifestUrl(src, 3600), { cache: 'no-store' })
  if (!res.ok) return new Response('not found', { status: 404 })
  return new Response(res.body, {
    headers: {
      'content-type': TYPES[ext],
      'cache-control': 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400',
      'x-robots-tag': 'noindex',
    },
  })
}
