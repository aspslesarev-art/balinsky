import fs from 'fs';
fs.readFileSync(process.env.HOME+'/balinsky/.env.local','utf8').split('\n').forEach(l=>{const m=l.match(/^([A-Z_0-9]+)=(.*)$/); if(m) process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const U=process.env.NEXT_PUBLIC_SUPABASE_URL,K=process.env.SUPABASE_SERVICE_KEY;
const med=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);const m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const R=JSON.parse(fs.readFileSync(process.env.HOME+'/balinsky/reports/overheat-raw.json','utf8'));

// 1. Диагностика: сколько comps и на каком радиусе, отдельно вилла/апарт
console.log('=== ДИАГНОСТИКА ПОДБОРА COMPS ===');
for(const kind of ['villa','apartment']){
  const a=R.results.filter(o=>o.kind===kind);
  const S=a.map(o=>o.scen.realistic.nonresident);
  const byR={}; S.forEach(x=>byR[x.radius]=(byR[x.radius]||0)+1);
  console.log(`${kind}: n=${a.length} | медиана comps=${med(S.map(x=>x.comps))} | радиусы=${JSON.stringify(byR)} | медиана ADR_comps=${med(S.map(x=>x.adrMed))} | медиана gross=$${Math.round(med(S.map(x=>x.gross)))} | медиана цены=$${Math.round(med(a.map(o=>o.price)))} | gross yield=${(med(S.map(x=>x.grossYield))).toFixed(2)}%`);
}

// 2. Контроль долгосрочной арендой
const man=await (await fetch(U+'/storage/v1/object/public/rental/_rental.json',{headers:{apikey:K,Authorization:'Bearer '+K}})).json();
const rent=(man.items||[]).filter(x=>x.priceMonthUsd>0);
console.log('\n=== ПОМЕСЯЧНАЯ АРЕНДА: медиана $/мес по (район × спальни) ===');
const key=x=>`${x.location}|${x.bedrooms}`;
const g={}; rent.forEach(x=>{ (g[key(x)] ??= []).push(x.priceMonthUsd) });
const tops=Object.entries(g).filter(([,v])=>v.length>=6).sort((a,b)=>b[1].length-a[1].length).slice(0,22);
tops.forEach(([k,v])=>console.log(`${k} | n=${v.length} | $${med(v)}/мес | $${med(v)*12}/год`));

// 3. Сопоставление: для тех же районов — что даёт модель посуточки
console.log('\n=== КОНТРОЛЬ: посуточная модель vs долгосрочная аренда (одинаковые район+спальни) ===');
console.log('район | спален | n_прод | медцена $ | долгосрок $/год | посуточ gross $/год | отношение');
const objs=R.results.filter(o=>o.location&&o.beds!=null);
const og={}; objs.forEach(o=>{ (og[`${o.location}|${o.beds}`] ??= []).push(o) });
Object.entries(og).forEach(([k,arr])=>{
  const lt=g[k]; if(!lt||lt.length<6||arr.length<4) return;
  const ltY=med(lt)*12;
  const stY=med(arr.map(o=>o.scen.realistic.nonresident.gross));
  console.log(`${k} | ${arr.length} | ${Math.round(med(arr.map(o=>o.price))/1000)}k | ${Math.round(ltY)} | ${Math.round(stY)} | x${(stY/ltY).toFixed(2)}`);
});

// 4. Валовая арендная доходность по долгосрочной аренде (простейший тест перегрева)
console.log('\n=== GROSS YIELD ПО ДОЛГОСРОЧНОЙ АРЕНДЕ (аренда/цена, без расходов) ===');
Object.entries(og).forEach(([k,arr])=>{
  const lt=g[k]; if(!lt||lt.length<6||arr.length<4) return;
  const p=med(arr.map(o=>o.price));
  console.log(`${k} | продажа $${Math.round(p/1000)}k | аренда $${med(lt)}/мес | gross yield ${((med(lt)*12/p)*100).toFixed(2)}%`);
});
