import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const { data } = await sb.from('raw_apartments').select('data').limit(200)
const pub = data.filter(r => r.data?.['Опубликовать'] === true)
console.log('Published rows fetched:', pub.length)

const sample = pub.find(r => Array.isArray(r.data['Фотографии']) && r.data['Фотографии'].length > 0)
if (!sample) {
  console.log('No published row with Фотографии')
} else {
  console.log('\nSample Фотографии[0]:')
  console.log(JSON.stringify(sample.data['Фотографии'][0], null, 2).slice(0, 2000))
  console.log('\nSample Opt photos[0]:')
  console.log(JSON.stringify(sample.data['Opt photos']?.[0], null, 2).slice(0, 2000))
  console.log('\nSample Opt images[0]:')
  console.log(JSON.stringify(sample.data['Opt images']?.[0], null, 2).slice(0, 2000))
}

// try fetching one URL
const photo = sample?.data?.['Фотографии']?.[0]
const url = photo?.thumbnails?.large?.url ?? photo?.url
if (url) {
  console.log('\nTesting URL:', url.slice(0, 100), '...')
  const res = await fetch(url, { method: 'HEAD' })
  console.log('HEAD status:', res.status, res.statusText)
  console.log('content-type:', res.headers.get('content-type'))
}
