import { createClient } from '@supabase/supabase-js'

const BUCKET = 'developer-logos'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const { data: files, error } = await sb.storage.from(BUCKET).list('', { limit: 1000 })
if (error) throw error
console.log(`files in bucket: ${files.length}`)

let done = 0, failed = 0
for (const f of files) {
  const airtableId = f.name.replace(/\.[^.]+$/, '')
  const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(f.name)
  const { error: dbErr } = await sb
    .from('raw_developers')
    .update({ logo_url: publicUrl })
    .eq('airtable_id', airtableId)
  if (dbErr) {
    failed++
    console.error(`${airtableId}: ${dbErr.message}`)
  } else {
    done++
  }
  process.stdout.write(`\r${done + failed}/${files.length}  done=${done} fail=${failed}`)
}
console.log(`\nfinished: done=${done} failed=${failed}`)
