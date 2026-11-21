// Файлы 3D-планировок и генпланов в Storage (бакет site-assets) — без выкладки сайта.
//
//   node scripts/site-assets.mjs models <файл…>   → site-assets/models/<имя>, адрес на сайте /m3d/<имя>
//   node scripts/site-assets.mjs sun <файл…>      → site-assets/sun/<имя>, полный URL Storage
//   node scripts/site-assets.mjs mirror           → залить всё из public/models и public/sun
//
// После загрузки модели — строка в site_content (scripts/site-content.mjs set
// 3d-plans villa:<slug> файл.json с { "url": "/m3d/<имя>.html" }), и страница
// объекта обновится сама. Уже выложенную модель лучше не перезаписывать, а
// грузить под новым именем: /m3d кэшируется на неделю.
import fs from 'node:fs'
import path from 'node:path'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, '')
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_KEY
const BUCKET = 'site-assets'
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
}

async function ensureBucket() {
  const r = await fetch(`${URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  })
  if (!r.ok && r.status !== 409 && !/already exists/i.test(await r.text())) throw new Error(`bucket: ${r.status}`)
}

async function upload(dir, file) {
  const name = path.basename(file)
  const type = TYPES[path.extname(name).toLowerCase()]
  if (!type) { console.log(`пропуск ${name}: тип не поддерживается`); return }
  const r = await fetch(`${URL}/storage/v1/object/${BUCKET}/${dir}/${encodeURIComponent(name)}`, {
    method: 'POST',
    // Новые ключи Supabase не JWT — Storage нужны оба заголовка.
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': type, 'x-upsert': 'true', 'cache-control': 'max-age=3600' },
    body: fs.readFileSync(file),
  })
  if (!r.ok) throw new Error(`${dir}/${name}: ${r.status} ${await r.text()}`)
  const where = dir === 'models' ? `/m3d/${name}` : `${URL}/storage/v1/object/public/${BUCKET}/${dir}/${name}`
  console.log(`${dir}/${name} → ${where}`)
}

const [cmd, ...files] = process.argv.slice(2)
await ensureBucket()
if (cmd === 'mirror') {
  for (const dir of ['models', 'sun']) {
    for (const f of fs.readdirSync(`public/${dir}`)) await upload(dir, `public/${dir}/${f}`)
  }
} else if ((cmd === 'models' || cmd === 'sun') && files.length) {
  for (const f of files) await upload(cmd, f)
} else {
  console.log('node scripts/site-assets.mjs models|sun <файл…>  |  mirror')
  process.exit(1)
}
