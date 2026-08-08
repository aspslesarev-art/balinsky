// Сборка ролика партнёрской программы из сцены scene.html.
//
// Состояние сцены — чистая функция времени (window.__seek), поэтому кадры
// снимаются по виртуальным часам с точным шагом, а не записью экрана:
// запись роняет кадры и уплывает от озвучки, здесь рассинхрон невозможен.
//
//   node scripts/pitch-video/render.mjs           → pitch.mp4  1920×1080, тёмный
//   node scripts/pitch-video/render.mjs --reel    → reel.mp4   1080×1920, светлый
//
// Первый лежит в public/phuket-partners/ и играет в герое лендинга,
// второй — вертикальный кадр под Instagram Reels.
//
// Нужен ffmpeg в PATH и установленный chromium для Playwright
// (npx playwright install chromium).

import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const REEL = process.argv.includes('--reel')

// Две озвучки — два сценария. v1: 60.26 с, «+0,5%». v2: 68.04 с, другая
// модель («мы не агентство, а отдел у застройщиков») и «+$1000 за сделку».
// У каждой своя раскадровка: тайминги сняты по границам фраз своей записи.
const V2 = process.argv.includes('--v2')

const here = (name) => fileURLToPath(new URL(`./${name}`, import.meta.url))
const tag = `${V2 ? 'v2' : 'v1'}-${REEL ? 'reel' : 'web'}`

const PAGE_URL =
  new URL(V2 ? './scene-v2.html' : './scene.html', import.meta.url).href +
  (REEL ? '?mode=reel' : '')
const FRAMES = here(`.frames-${tag}/`)
const AUDIO = here(V2 ? 'voice-v2.mp3' : 'voice.mp3')
const OUTPUT = here(`${REEL ? 'reel' : 'pitch'}${V2 ? '-v2' : ''}.mp4`)

const FPS = 30
// Длительность озвучки + пауза, чтобы додержать финальный кадр.
const DURATION = V2 ? 70.0 : 62.0
const WIDTH = REEL ? 1080 : 1920
const HEIGHT = REEL ? 1920 : 1080

// Сцена работает и как самостоятельная веб-страница: в ролике её
// собственный транспорт и текстовая версия не нужны, как и кнопка —
// кликать в видео нечего.
const RENDER_CSS = `
  .bottom, .read, .cover { display: none !important; }
  .cta, .cta-note { display: none !important; }
  .clock { visibility: hidden !important; }
  .stage { min-height: 100vh !important; }
  html, body { background: ${REEL ? '#FBFDFB' : '#071A22'} !important; }
`

await rm(FRAMES, { recursive: true, force: true })
await mkdir(FRAMES, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
})

await page.goto(PAGE_URL, { waitUntil: 'load' })
await page.addStyleTag({ content: RENDER_CSS })
await page.waitForFunction(() => typeof window.__seek === 'function')
await page.waitForTimeout(400)   // дать шрифтам и раскладке устояться

const total = Math.round(DURATION * FPS)
const started = Date.now()

for (let i = 0; i < total; i++) {
  await page.evaluate((time) => window.__seek(time), i / FPS)
  await page.screenshot({
    path: `${FRAMES}${String(i).padStart(5, '0')}.jpg`,
    type: 'jpeg',
    quality: 92,
  })

  if (i % 150 === 0 || i === total - 1) {
    const pct = (((i + 1) / total) * 100).toFixed(0)
    console.log(`кадры ${pct}%  (${i + 1}/${total}, ${((Date.now() - started) / 1000).toFixed(0)} с)`)
  }
}

await browser.close()

console.log('сведение с озвучкой…')
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', String(FPS), '-i', `${FRAMES}%05d.jpg`,
  '-i', AUDIO,
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-crf', REEL ? '20' : '21', '-preset', 'slow', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', REEL ? '160k' : '128k',
  OUTPUT,
], { stdio: 'inherit' })

await rm(FRAMES, { recursive: true, force: true })
console.log(`готово: ${OUTPUT}`)
