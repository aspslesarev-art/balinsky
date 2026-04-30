import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g,'') }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const BUCKET = 'feeds'
const KEY = 'villas-aggregator.xml'
const FILE = 'scripts/out/villas-aggregator.xml'

const buckets = await sb.storage.listBuckets()
if (!buckets.data?.some(b => b.name === BUCKET)) {
  const { error } = await sb.storage.createBucket(BUCKET, { public: true })
  if (error) throw error
  console.log('created bucket', BUCKET)
}

const body = fs.readFileSync(FILE)
const { error } = await sb.storage.from(BUCKET).upload(KEY, body, {
  contentType: 'application/xml; charset=utf-8',
  upsert: true,
})
if (error) throw error

const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${KEY}`
console.log('uploaded:', url, '(', body.length, 'bytes )')
