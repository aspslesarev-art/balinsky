import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local','utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g,'') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const { data } = await sb.from('raw_villas').select('airtable_id, data').limit(1000)
function asNum(v){ if(v==null)return null; if(Array.isArray(v))return asNum(v[0]); if(v&&typeof v==='object'&&'value' in v)return asNum(v.value); const n=Number(v); return Number.isFinite(n)?n:null }
function fs1(v){ if(typeof v==='string')return v; if(Array.isArray(v)&&v.length)return fs1(v[0]); if(v&&typeof v==='object'&&'value' in v)return fs1(v.value); return null }

let countByDistrict = {}
for (const r of data) {
  if (r.data?.['Опубликовать'] !== true) continue
  const district = fs1(r.data['Location 2']) || fs1(r.data['Location']) || '?'
  countByDistrict[district] = (countByDistrict[district] || 0) + 1
}
console.log('Districts:', Object.entries(countByDistrict).sort((a,b)=>b[1]-a[1]).slice(0,12))

// Pick top published villas in popular areas with various sizes
const targets = []
for (const r of data) {
  if (r.data?.['Опубликовать'] !== true) continue
  const district = fs1(r.data['Location 2']) || fs1(r.data['Location'])
  if (!['Canggu', 'Berawa', 'Seminyak', 'Pererenan', 'Umalas'].includes(district)) continue
  const slug = fs1(r.data['SEO:Slug']); const beds = asNum(r.data['Комнаты']); const area = asNum(r.data['Площадь'])
  if (!slug || beds == null || area == null) continue
  targets.push({ id: r.airtable_id, slug, beds, area, district })
  if (targets.length >= 15) break
}
console.log('\nTest villas:')
for (const t of targets) console.log(t)
