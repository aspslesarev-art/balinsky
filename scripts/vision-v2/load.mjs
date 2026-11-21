// Заливка v2-разбора. ЖК → catalog_product_vision (kind=complex, весь разбор заново).
// Рынок → v2-поля дописываются в vision у airbnb_vision / booking_data_vision.
// node scripts/vision-v2/load.mjs complex <workdir> | market <workdir>   [--dry]
import fs from 'node:fs'
import { loadEnv } from '../_kb-build.mjs'
loadEnv()
const [mode, WORK] = process.argv.slice(2), DRY = process.argv.includes('--dry')
const U = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1', K = process.env.SUPABASE_SERVICE_KEY
const H = { apikey: K, Authorization: 'Bearer ' + K, 'content-type': 'application/json' }
const rows = new Map()
for (const f of fs.readdirSync(WORK + '/out').filter(f => f.endsWith('.jsonl'))) for (const l of fs.readFileSync(`${WORK}/out/${f}`, 'utf8').split('\n')) {
  if (!l.trim()) continue
  try { const o = JSON.parse(l); if (o.id && o.image_kind) rows.set(String(o.id), o) } catch { console.error('битая строка', f, l.slice(0, 80)) }
}
console.log('разборов', rows.size)
const post = async (path, body, prefer = 'resolution=merge-duplicates,return=minimal') => { const r = await fetch(`${U}/${path}`, { method: 'POST', headers: { ...H, Prefer: prefer }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(path + ' ' + r.status + ' ' + (await r.text()).slice(0, 300)) }
if (['complex', 'villa', 'apartment'].includes(mode)) {
  const old = await (await fetch(`${U}/catalog_product_vision?kind=eq.${mode}&select=*`, { headers: H })).json()
  const bf = WORK + '/backup_catalog_product_vision_' + mode + '.json'; if (!fs.existsSync(bf)) fs.writeFileSync(bf, JSON.stringify(old))
  const batch = []
  const nFiles = new Map(); for (const f of fs.readdirSync(WORK).filter(f => /^batch_\d+\.json$/.test(f))) for (const x of JSON.parse(fs.readFileSync(WORK + '/' + f, 'utf8'))) nFiles.set(x.id, x.files.length)
  for (const [id, { id: _, ...v }] of rows) {
    const files = { length: nFiles.get(id) ?? 0 }
    if (!nFiles.has(id)) console.error('нет в пачках:', id)
    batch.push({ kind: mode, airtable_id: id, vision: { ...v, vocab: 'v2' }, model: 'claude-opus-5-5', photos_used: files.length, analyzed_at: new Date().toISOString() })
  }
  if (!DRY) for (let i = 0; i < batch.length; i += 200) await post('catalog_product_vision?on_conflict=kind,airtable_id', batch.slice(i, i + 200))
  console.log(DRY ? 'dry' : 'залито', batch.length, '(бэкап старых:', old.length, ')')
} else {
  for (const [src, table, idsel] of [['airbnb', 'airbnb_vision', 'id::text'], ['booking', 'booking_data_vision', 'id']]) {
    const mine = [...rows].filter(([k]) => k.startsWith(src + ':')).map(([k, v]) => [k.slice(src.length + 1), v])
    let n = 0
    for (let i = 0; i < mine.length; i += 100) {
      const part = mine.slice(i, i + 100)
      const cur = await (await fetch(`${U}/${table}?select=id:${idsel},vision&id=in.(${part.map(p => p[0]).join(',')})`, { headers: H })).json()
      const byId = new Map(cur.map(r => [String(r.id), r.vision]))
      for (const [id, { id: _, ...v2 }] of part) {
        if (!byId.has(id)) continue
        if (!DRY) { const r = await fetch(`${U}/${table}?id=eq.${id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ vision: { ...byId.get(id), ...v2, vocab: 'v2' } }) }); if (!r.ok) throw new Error(table + ' ' + r.status + ' ' + (await r.text()).slice(0, 200)) }
        n++
      }
    }
    console.log(src, DRY ? 'dry' : 'дописано', n, 'из', mine.length)
  }
}
