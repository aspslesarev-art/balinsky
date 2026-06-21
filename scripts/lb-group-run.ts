// Прогон парсера LB Group → пишет юниты в Supabase parser_units.
//   npx tsx scripts/lb-group-run.ts          # все комплексы
//   npx tsx scripts/lb-group-run.ts <cid>    # один комплекс
import { readFileSync } from 'fs'
function loadEnv(){for(const f of ['.env.local','.env']){try{for(const l of readFileSync(f,'utf8').split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const i=t.indexOf('=');if(i<0)continue;const k=t.slice(0,i).trim();const v=t.slice(i+1).trim().replace(/^["']|["']$/g,'');if(!(k in process.env))process.env[k]=v}}catch{}}}
import { LB_COMPLEXES, runLbComplex } from '../lib/parsers/lb-group'
async function main(){
 loadEnv()
 const only=process.argv[2]
 const ids=only?[only]:Object.keys(LB_COMPLEXES)
 let grand=0, failed=0
 for(const cid of ids){
  const name=LB_COMPLEXES[cid]?.name??cid
  try{
   const r=await runLbComplex({complexId:cid})
   console.log(`✓ ${name.padEnd(22)} ${String(r.unitsCount).padStart(3)} юн${r.warnings.length?'  ⚠ '+r.warnings.join('; '):''}`)
   grand+=r.unitsCount
  }catch(e){ failed++; console.log(`✗ ${name.padEnd(22)} ERR ${(e as Error).message}`) }
 }
 console.log(`\n=== Записано ${grand} юнитов в parser_units (${ids.length-failed}/${ids.length} комплексов) ===`)
}
main().catch(e=>{console.error(e);process.exit(1)})
