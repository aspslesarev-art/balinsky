#!/usr/bin/env node
// Не даёт вернуть короткий ISR TTL на страницы с большим числом путей.
//
// 22.09.2026 прод встал по лимиту трат Vercel: `revalidate = 3600` на ~97
// динамических шаблонах × 10 локалей дал 2.22M ISR Writes против 1.28M Reads
// за цикл — $11.54, крупнейшая статья счёта, плюс хвост в Fast Origin
// Transfer и Fluid Active CPU. Свежесть при этом обеспечивал не TTL, а
// точечная инвалидация (lib/admin/revalidate.ts), так что короткий TTL был
// чистым убытком. Подробности — в памяти, reference-balinsky-vercel-cost-guard.
//
// Живёт в tools/, а не в scripts/: .vercelignore исключает scripts/ из
// деплоя, и prebuild на Vercel падал с 'Cannot find module'.
//
// Правило: у маршрута с динамическим сегментом TTL не меньше MIN_TTL.
// Осознанное исключение помечается в файле комментарием
// `// isr-ttl-ok: <причина>` на строке над `export const revalidate`.

import fs from 'node:fs'
import path from 'node:path'

const MIN_TTL = 86400
const ROOT = 'app'

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(p)
  }
  return out
}

const RE = /export const revalidate\s*=\s*([0-9_]+)/

const bad = []
for (const file of walk(ROOT)) {
  // Динамический сегмент — то, что порождает тысячи путей: [slug], [...slug].
  if (!file.includes('[')) continue
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    const m = line.match(RE)
    if (!m) return
    // Метка-исключение — в комментарии прямо над объявлением; блок может быть
    // многострочным, поэтому поднимаемся вверх, пока идут строки комментария.
    let waived = false
    for (let j = i - 1; j >= 0 && lines[j].trim().startsWith('//'); j--) {
      if (lines[j].includes('isr-ttl-ok:')) { waived = true; break }
    }
    if (waived) return
    const ttl = Number(m[1].replace(/_/g, ''))
    if (ttl < MIN_TTL) bad.push({ file, ttl, line: i + 1 })
  })
}

if (bad.length) {
  console.error(`\n✖ ISR TTL ниже ${MIN_TTL} с на динамических маршрутах:\n`)
  for (const b of bad) console.error(`   ${b.file}:${b.line} — revalidate = ${b.ttl}`)
  console.error(
    '\nЭто прямой путь к перерасходу на Vercel (ISR Writes). Правки контента\n' +
    'публикуются точечно через lib/admin/revalidate.ts, TTL тут только страховка.\n' +
    'Если короткий TTL действительно нужен — строкой выше поставь\n' +
    '`// isr-ttl-ok: <причина>`.\n',
  )
  process.exit(1)
}

console.log(`✓ ISR TTL: ${MIN_TTL}+ на всех динамических маршрутах`)
