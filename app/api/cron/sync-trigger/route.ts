import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Backup trigger for the GitHub Actions sync pipeline. GH's cron is
// best-effort under load and can silently skip slots; this endpoint
// is called by a Vercel cron and dispatches the workflow via the
// GitHub REST API. Idempotent — both schedules just enqueue runs and
// the workflow's `concurrency: { cancel-in-progress: false }` prevents
// pile-ups.
//
// Auth: Vercel cron sets `Authorization: Bearer <CRON_SECRET>` on the
// request. We compare against the env to keep this private.
//
// Required env (Vercel project):
//   CRON_SECRET            — random string, also set in Vercel cron config
//   GITHUB_TOKEN_DISPATCH  — fine-grained PAT with Actions:write on
//                            this single repo
//   GITHUB_REPO            — "owner/repo" (e.g. "aspslesarev-art/balinsky")
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) return NextResponse.json({ ok: false, error: 'no_secret' }, { status: 500 })
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // Kill-switch: once the admin "Базы" panel is the source of truth, set
  // SYNC_DISABLED=1 to stop dispatching the Airtable→Supabase sync workflows.
  // Reversible — unset the env to resume.
  if (process.env.SYNC_DISABLED === '1') {
    return NextResponse.json({ ok: true, skipped: 'sync_disabled' })
  }

  const url = new URL(req.url)
  const which = url.searchParams.get('which') ?? 'fast'
  const workflow =
    which === 'heavy' ? 'sync-heavy.yml' :
    which === 'fast'  ? 'sync-fast.yml'  : null
  if (!workflow) {
    return NextResponse.json({ ok: false, error: 'bad_which' }, { status: 400 })
  }

  const ghToken = process.env.GITHUB_TOKEN_DISPATCH
  const ghRepo  = process.env.GITHUB_REPO
  if (!ghToken || !ghRepo) {
    return NextResponse.json({ ok: false, error: 'gh_env_missing' }, { status: 500 })
  }

  const r = await fetch(
    `https://api.github.com/repos/${ghRepo}/actions/workflows/${workflow}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main' }),
    },
  )
  if (!r.ok) {
    const detail = await r.text().catch(() => '')
    return NextResponse.json({ ok: false, error: 'dispatch_failed', status: r.status, detail: detail.slice(0, 400) }, { status: 502 })
  }
  return NextResponse.json({ ok: true, workflow })
}
