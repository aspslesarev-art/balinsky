import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { getSitePlan, type SunSettingsInput } from '@/lib/complex-sun-plan'
import { loadSunSettings, saveSunSettings } from '@/lib/complex-sun'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/admin/sun/:slug — план застройки + текущие настройки для редактора.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { slug } = await params

  const plan = getSitePlan(slug)
  if (!plan) return NextResponse.json({ error: 'no_plan' }, { status: 404 })

  return NextResponse.json({ plan, settings: await loadSunSettings(slug) })
}

const LIMITS = {
  rowAzimuth: [0, 360],
  latitude: [-90, 90],
  longitude: [-180, 180],
  eaveHeight: [2, 40],
  ridgeRise: [0, 15],
  yardWall: [0, 6],
} as const

/** Никаким входным числам с клиента не доверяем: диапазоны заданы физикой сцены. */
function parseInput(body: unknown): SunSettingsInput | string {
  if (!body || typeof body !== 'object') return 'body must be an object'
  const raw = body as Record<string, unknown>

  const values: Record<string, number> = {}
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    const value = Number(raw[key])
    if (!Number.isFinite(value)) return `${key} must be a number`
    if (value < min || value > max) return `${key} must be within ${min}..${max}`
    values[key] = value
  }

  return {
    rowAzimuth: values.rowAzimuth % 360,
    latitude: values.latitude,
    longitude: values.longitude,
    eaveHeight: values.eaveHeight,
    ridgeRise: values.ridgeRise,
    yardWall: values.yardWall,
    enabled: Boolean(raw.enabled),
  }
}

// PUT /api/admin/sun/:slug — сохранить ориентацию и высоты.
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { slug } = await params

  if (!getSitePlan(slug)) return NextResponse.json({ error: 'no_plan' }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const input = parseInput(body)
  if (typeof input === 'string') return NextResponse.json({ error: input }, { status: 400 })

  const saved = await saveSunSettings(slug, input)
  if (!saved) return NextResponse.json({ error: 'save_failed' }, { status: 500 })

  // Страница ЖК кэшируется на 60 с — сбрасываем, чтобы правка была видна сразу.
  for (const path of [`/ru/zhilye-kompleksy/o/${slug}`, `/en/complexes/o/${slug}`]) {
    revalidatePath(path)
  }

  return NextResponse.json({ settings: saved })
}
