import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isProSession, SESSION_COOKIE_NAME } from '@/lib/site-auth'

// PDF-презентация файлом (Pro): открываем печатную страницу объекта в
// Chromium без экрана и отдаём готовый PDF — без окна печати, одинаково в
// Safari, Chrome и на телефоне. Печатная страница — /ru/<раздел>/o/<slug>/pdf.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PATH_RE = /^\/ru\/(villy|apartamenty)\/o\/([a-z0-9-]{1,160})\/pdf$/
const CURRENCIES = new Set(['USD', 'EUR', 'RUB', 'UAH', 'IDR'])
// Лист телефона — 9:16 (108 × 192 мм), компьютера — A4 альбомом.
const VIEWPORT = { landscape: { width: 1123, height: 794 }, portrait: { width: 408, height: 726 } }
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 BalinskyPdf'

async function launch() {
  const puppeteer = (await import('puppeteer-core')).default
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default
    return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true })
  }
  return puppeteer.launch({
    executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  })
}

// Телефон: Chrome печатает не уже 800 px, поэтому мобильную раскладку
// снимаем картинкой — лист за листом по разрезам, которые посчитал PdfShell.
async function portraitPdf(page: import('puppeteer-core').Page): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib')
  await page.addStyleTag({ content: '.pdf-bar { display: none !important; }' })
  const cuts = (await page.evaluate(() => (window as unknown as { __pdfCuts?: () => { y: number; h: number }[] }).__pdfCuts?.())) ?? []
  const doc = await PDFDocument.create()
  // 108 × 192 мм; 408 css-пикселей ширины = 306 pt.
  const W = 306, H = 544.25, k = W / VIEWPORT.portrait.width
  for (const c of cuts) {
    const shot = await page.screenshot({ type: 'jpeg', quality: 82, clip: { x: 0, y: c.y, width: VIEWPORT.portrait.width, height: c.h }, captureBeyondViewport: true })
    const img = await doc.embedJpg(shot)
    const p = doc.addPage([W, H])
    const h = Math.min(H, c.h * k)
    p.drawImage(img, { x: 0, y: H - h, width: W, height: h })
  }
  return doc.save()
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  // Сборка стоит серверного времени — только для вошедших с Pro
  // (на локальной копии без входа, чтобы проверять).
  if (!(await isProSession())) return NextResponse.json({ error: 'pro_required' }, { status: 403 })
  const target = new URL(url.searchParams.get('u') ?? '', url.origin)
  const m = target.origin === url.origin ? target.pathname.match(PATH_RE) : null
  if (!m) return NextResponse.json({ error: 'bad_target' }, { status: 400 })
  const portrait = target.searchParams.get('o') === 'p'
  target.searchParams.delete('print')
  const currency = url.searchParams.get('cur')

  let browser: Awaited<ReturnType<typeof launch>> | null = null
  try {
    browser = await launch()
    const page = await browser.newPage()
    await page.setUserAgent(UA)
    // Печатная страница тоже только для Pro — открываем её с входом того, кто скачивает.
    const session = (await cookies()).get(SESSION_COOKIE_NAME)?.value
    if (session) await browser.setCookie({ name: SESSION_COOKIE_NAME, value: session, domain: target.hostname, path: '/', httpOnly: true, secure: target.protocol === 'https:' })
    await page.setViewport({ ...VIEWPORT[portrait ? 'portrait' : 'landscape'], deviceScaleFactor: 1 })
    if (currency && CURRENCIES.has(currency)) {
      await page.evaluateOnNewDocument((c: string) => { try { localStorage.setItem('balinsky.currency', c) } catch {} }, currency)
    }
    if (portrait) await page.setViewport({ ...VIEWPORT.portrait, deviceScaleFactor: 2.5 })
    await page.goto(target.toString(), { waitUntil: 'networkidle2', timeout: 45_000 })
    // PdfShell ставит метку, когда догрузились фото, карты и листы подогнаны.
    await page.waitForSelector('html[data-pdf-ready="1"]', { timeout: 40_000 })
    const pdf = portrait ? await portraitPdf(page) : await page.pdf({ printBackground: true, preferCSSPageSize: true })
    const name = `${m[1] === 'villy' ? 'villa' : 'apartament'}-${m[2]}${portrait ? '-phone' : ''}.pdf`
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${name}"`,
        'cache-control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[pdf]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'render_failed' }, { status: 500 })
  } finally {
    await browser?.close().catch(() => {})
  }
}
