// GET /api/reports/<kind>/<slug>
// Generates the AI investment-report PDF and returns it inline so the
// browser's native PDF viewer opens it. Forces a download instead by
// adding ?download=1 to the URL.
//
// Anyone can hit this — it's effectively a deeper version of the
// public detail page. Cost-control: each call burns one OpenAI
// generation (~$0.01) so a future improvement is to cache the
// generated PDF per (kind, slug) for 24h in Supabase Storage.

import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { buildReport, type ReportKind } from '@/lib/listing-report'
import { ListingReportPDF } from '@/components/ListingReportPDF'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 120 s safety: first-time uncached reports do listing fetch +
// district median + nearby places + OpenAI verdict + PDF render.
// Subsequent calls hit the verdict cache and finish in ~2-3 s.
export const maxDuration = 120

export async function GET(req: Request, { params }: { params: Promise<{ kind: string; slug: string }> }) {
  const { kind, slug } = await params
  if (kind !== 'villa' && kind !== 'apartment' && kind !== 'complex') {
    return NextResponse.json({ error: 'bad_kind' }, { status: 400 })
  }
  if (!slug) return NextResponse.json({ error: 'missing_slug' }, { status: 400 })

  try {
    const data = await buildReport(kind as ReportKind, slug)
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const buf = await renderToBuffer(<ListingReportPDF data={data} />)
    const url = new URL(req.url)
    const download = url.searchParams.get('download') === '1'
    const filename = `balinsky-report-${slug}.pdf`
    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
        // Block CDN caching — the AI verdict is per-render and we
        // want fresh listing data each time. Future improvement:
        // cache the PDF in Storage and short-circuit here.
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    console.error('[reports] generate failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'generate_failed' }, { status: 500 })
  }
}
