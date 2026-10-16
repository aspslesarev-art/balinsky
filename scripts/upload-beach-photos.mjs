// Фото пляжей (Wikimedia Commons / Openverse, свободные лицензии) → Storage
// villa-photos/_beaches/ и поле photos в lib/beaches.json.
// Вход — папка с готовыми jpg (уже уменьшены до 1280 px) и photos.json:
// { "<индекс пляжа>": [{ file, kind: 'beach'|'promenade', author, license, page }] }.
//
//   node --env-file=.env.local scripts/upload-beach-photos.mjs <папка> <photos.json>
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const [dir, listFile] = process.argv.slice(2)
if (!dir || !listFile) { console.error('usage: upload-beach-photos.mjs <dir> <photos.json>'); process.exit(1) }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const CDN = 'https://images.balinsky.info/storage/v1/object/public/villa-photos/_beaches'
const list = JSON.parse(fs.readFileSync(listFile, 'utf8'))
const beaches = JSON.parse(fs.readFileSync('lib/beaches.json', 'utf8'))

for (const [k, photos] of Object.entries(list)) {
  const b = beaches[Number(k)]
  if (!b) throw new Error(`no beach #${k}`)
  const out = []
  for (const p of photos) {
    const body = fs.readFileSync(path.join(dir, p.file))
    const { error } = await sb.storage.from('villa-photos').upload(`_beaches/${p.file}`, body, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' })
    if (error) throw new Error(`${p.file}: ${error.message}`)
    out.push({ src: `${CDN}/${p.file}`, kind: p.kind, author: p.author ?? null, license: p.license ?? null, page: p.page })
  }
  // Сначала пляж, потом набережная.
  b.photos = [...out.filter(p => p.kind === 'beach'), ...out.filter(p => p.kind === 'promenade')]
  console.log(`#${k} ${b.name_en}: ${b.photos.length}`)
}
fs.writeFileSync('lib/beaches.json', JSON.stringify(beaches, null, 1) + '\n')
