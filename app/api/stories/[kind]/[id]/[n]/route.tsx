// Картинка сторис агента: /api/stories/<villa|apartment|complex>/<airtable_id>/<1..3>.png
// Её же бот собирает в альбом (lib/agent-stories/telegram.ts). Кэш — на CDN
// сутки: цена меняется редко, а рендер стоит секунды.

import { loadStoryData, type StoryKind } from '@/lib/agent-stories/data'
import { renderStory, STORY_COUNT } from '@/lib/agent-stories/render'

export const runtime = 'nodejs'

const KINDS: StoryKind[] = ['villa', 'apartment', 'complex']

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; id: string; n: string }> }) {
  const { kind, id, n: nRaw } = await params
  const n = Number(nRaw.replace(/\.png$/, ''))
  if (!KINDS.includes(kind as StoryKind) || !/^[A-Za-z0-9_]{5,40}$/.test(id) || !Number.isInteger(n) || n < 1 || n > STORY_COUNT) {
    return new Response('Not found', { status: 404 })
  }
  try {
    const data = await loadStoryData(kind as StoryKind, id)
    if (!data) return new Response('Not found', { status: 404 })
    const img = await renderStory(data, n)
    const headers = new Headers(img.headers)
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400')
    return new Response(img.body, { status: 200, headers })
  } catch (err) {
    console.error('[stories] render failed:', kind, id, n, err)
    return new Response('Render failed', { status: 500 })
  }
}
