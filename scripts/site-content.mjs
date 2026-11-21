// Контент сайта в базе (site_content, миграция 147) — чтение и правка без выкладки.
//
//   node scripts/site-content.mjs seed [раздел…]      залить значения из кода (только недостающие строки)
//   node scripts/site-content.mjs list <раздел>        элементы раздела
//   node scripts/site-content.mjs get <раздел> <элемент>  JSON элемента в stdout
//   node scripts/site-content.mjs set <раздел> <элемент> <файл.json>  записать элемент
//   node scripts/site-content.mjs del <раздел> <элемент>  удалить элемент
//
// Разделы: complex-docs (элемент = slug ЖК), 3d-plans (villa:<slug> /
// apartment:<slug>), sun-plans (slug ЖК), verified-yield (<kind>:<id>),
// knowledge-noindex (ru-слаг статьи), unit-grid (airtable_id ЖК — шахматка
// поверх генплана, lib/unit-grid.ts), market-index (элемент current — пишет
// scripts/build-market-index.mjs; seed для него не нужен).
//
// Любая запись сама ставит затронутые страницы в очередь перестройки
// (миграция 146) — через 2–15 минут они обновятся на сайте. Отдельно звать
// revalidate не нужно.
import fs from 'node:fs'
import path from 'node:path'
import { createJiti } from 'jiti'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, '')
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const jiti = createJiti(import.meta.url, { alias: { '@': path.resolve('.') } })

async function fallbackRows(section) {
  switch (section) {
    case 'complex-docs': {
      const m = await jiti.import('../lib/complex-docs.ts')
      return Object.fromEntries(Object.entries(m.COMPLEX_DOCS_FALLBACK))
    }
    case '3d-plans': {
      const m = await jiti.import('../lib/villa-3d-plans.ts')
      return m.plan3dFallbackRows()
    }
    case 'sun-plans': {
      const m = await jiti.import('../lib/complex-sun-plan.ts')
      return JSON.parse(JSON.stringify(m.SITE_PLANS_FALLBACK))
    }
    case 'verified-yield': {
      const d = JSON.parse(fs.readFileSync('lib/verified-yield.json', 'utf8'))
      return Object.fromEntries([
        ...d.complexes.map(id => [`complexes:${id}`, {}]),
        ...d.villas.map(id => [`villas:${id}`, {}]),
        ...d.apartments.map(id => [`apartments:${id}`, {}]),
      ])
    }
    case 'knowledge-noindex': {
      const m = await jiti.import('../lib/knowledge-noindex.ts')
      return Object.fromEntries(m.noindexKnowledgeFallback().map(s => [s, {}]))
    }
    case 'unit-grid': {
      const m = await jiti.import('../lib/unit-grid.ts')
      return JSON.parse(JSON.stringify(m.UNIT_GRID_FALLBACK))
    }
    default:
      throw new Error(`неизвестный раздел: ${section}`)
  }
}
const SECTIONS = ['complex-docs', '3d-plans', 'sun-plans', 'verified-yield', 'knowledge-noindex', 'unit-grid']

async function rest(method, query, body) {
  const r = await fetch(`${URL}/rest/v1/site_content${query}`, {
    method,
    headers: { ...H, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(`${method} site_content${query}: ${r.status} ${await r.text()}`)
  return method === 'GET' ? r.json() : null
}

const q = encodeURIComponent
const [cmd, a, b, c] = process.argv.slice(2)

if (cmd === 'seed') {
  for (const section of a ? process.argv.slice(3) : SECTIONS) {
    const rows = await fallbackRows(section)
    const have = new Set((await rest('GET', `?select=item&section=eq.${q(section)}`)).map(r => r.item))
    const add = Object.entries(rows).filter(([item]) => !have.has(item))
    for (let i = 0; i < add.length; i += 200) {
      await rest('POST', '', add.slice(i, i + 200).map(([item, data]) => ({ section, item, data, note: 'seed из кода' })))
    }
    console.log(`${section}: в коде ${Object.keys(rows).length}, было в базе ${have.size}, добавлено ${add.length}`)
  }
} else if (cmd === 'list' && a) {
  for (const r of await rest('GET', `?select=item,updated_at&section=eq.${q(a)}&order=item`)) console.log(r.item, r.updated_at)
} else if (cmd === 'get' && a && b) {
  const [r] = await rest('GET', `?select=data&section=eq.${q(a)}&item=eq.${q(b)}`)
  console.log(JSON.stringify(r?.data ?? null, null, 2))
} else if (cmd === 'set' && a && b && c) {
  const data = JSON.parse(fs.readFileSync(c, 'utf8'))
  await rest('POST', '', [{ section: a, item: b, data }])
  console.log(`записано: ${a} / ${b}`)
} else if (cmd === 'del' && a && b) {
  await rest('DELETE', `?section=eq.${q(a)}&item=eq.${q(b)}`)
  console.log(`удалено: ${a} / ${b}`)
} else {
  console.log(fs.readFileSync(new globalThis.URL(import.meta.url), 'utf8').split('\n').slice(0, 16).join('\n'))
  process.exit(1)
}
