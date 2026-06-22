// Заводит строки complex_parsers для всех комплексов LB Group с
// interval_minutes=60 → cron /api/cron/run-parsers гоняет их раз в час.
//   npx tsx scripts/lb-group-seed-parsers.ts
import { readFileSync } from 'fs'
function loadEnv(){for(const f of ['.env.local','.env']){try{for(const l of readFileSync(f,'utf8').split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const i=t.indexOf('=');if(i<0)continue;const k=t.slice(0,i).trim();const v=t.slice(i+1).trim().replace(/^["']|["']$/g,'');if(!(k in process.env))process.env[k]=v}}catch{}}}
import { createClient } from '@supabase/supabase-js'
import { LB_SPREADSHEET_ID, LB_COMPLEXES } from '../lib/parsers/lb-group'
async function main(){
 loadEnv()
 const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
 const url=`https://docs.google.com/spreadsheets/d/${LB_SPREADSHEET_ID}/edit`
 const rows=Object.entries(LB_COMPLEXES).map(([cid,info])=>({
   complex_id: cid, source_url: url, parser_type: 'lb_group', interval_minutes: 60,
   notes: `LB Group — ${info.name} (вкладки: ${info.gids.join(', ')}); пишет в parser_units`,
 }))
 const { error } = await sb.from('complex_parsers').upsert(rows, { onConflict: 'complex_id' })
 if(error){ console.error('ERR', error.message); process.exit(1) }
 console.log(`seeded ${rows.length} complex_parsers (interval 60m): ${rows.map(r=>r.complex_id).join(', ')}`)
}
main().catch(e=>{console.error(e);process.exit(1)})
