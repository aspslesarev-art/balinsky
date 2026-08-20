import fs from 'fs';
const R=JSON.parse(fs.readFileSync(process.env.HOME+'/balinsky/reports/overheat-raw.json','utf8'));
const rs=R.results.filter(o=>!o.isResale);
const med=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);const m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(s.length*p))]};
const r2=v=>v==null?null:Math.round(v*100)/100;

console.log('=== РАСПРЕДЕЛЕНИЕ ЧИСТОЙ ДОХОДНОСТИ (децили, %) ===');
console.log('срез | p10 | p25 | медиана | p75 | p90 | p95 | max | доля >6.5% | доля >10%');
for(const [lbl,f] of [['виллы',o=>o.kind==='villa'],['апартаменты',o=>o.kind==='apartment']])
 for(const [sl,s,t] of [['реалист/нерез','realistic','nonresident'],['оптимист/резид','optimistic','resident']]){
  const a=rs.filter(f).map(o=>o.scen[s][t].netYield);
  console.log(`${lbl} ${sl} | ${r2(q(a,.1))} | ${r2(q(a,.25))} | ${r2(med(a))} | ${r2(q(a,.75))} | ${r2(q(a,.9))} | ${r2(q(a,.95))} | ${r2(Math.max(...a))} | ${Math.round(a.filter(x=>x>6.5).length/a.length*100)}% | ${Math.round(a.filter(x=>x>10).length/a.length*100)}%`);
 }

console.log('\n=== ЛУЧШИЕ 15 ОБЪЕКТОВ (оптимистичный сценарий, резидент 10% PPh) ===');
console.log('объект | тип | зона | цена $ | спален | м² | ADR | net% | лиз | IRR%');
[...rs].sort((a,b)=>b.scen.optimistic.resident.netYield-a.scen.optimistic.resident.netYield).slice(0,15).forEach(o=>{
  const S=o.scen.optimistic.resident;
  console.log(`${(o.title||'').slice(0,40)} | ${o.kind} | ${o.zone} | ${Math.round(o.price/1000)}k | ${o.beds} | ${o.area} | ${S.adr} | ${S.netYield} | ${o.lease??'—'} | ${S.leaseIrr??'нет возврата'}`);
});

console.log('\n=== ЛУЧШИЕ 15 (реалистичный сценарий, нерезидент) ===');
console.log('объект | тип | зона | цена $ | спален | ADR | net% | IRR%');
[...rs].sort((a,b)=>b.scen.realistic.nonresident.netYield-a.scen.realistic.nonresident.netYield).slice(0,15).forEach(o=>{
  const S=o.scen.realistic.nonresident;
  console.log(`${(o.title||'').slice(0,40)} | ${o.kind} | ${o.zone} | ${Math.round(o.price/1000)}k | ${o.beds} | ${S.adr} | ${S.netYield} | ${S.leaseIrr??'нет возврата'}`);
});

console.log('\n=== ХУДШИЙ РАЗРЫВ «ЗАЯВЛЕНО vs РАСЧЁТ» (топ-15, реалист/нерезидент) ===');
console.log('объект | застройщик | зона | цена $ | заявлено % | расчёт % | разрыв');
rs.filter(o=>o.declared>0).map(o=>({o,g:o.declared/o.scen.realistic.nonresident.netYield}))
 .filter(x=>Number.isFinite(x.g)).sort((a,b)=>b.g-a.g).slice(0,15).forEach(({o,g})=>{
  console.log(`${(o.title||'').slice(0,34)} | ${(o.developer||'—').slice(0,22)} | ${o.zone} | ${Math.round(o.price/1000)}k | ${r2(o.declared)} | ${o.scen.realistic.nonresident.netYield} | x${r2(g)}`);
});

console.log('\n=== ОБРАТНАЯ ЗАДАЧА: какая цена нужна для целевой доходности ===');
console.log('(медианная вилла и медианный апартамент, реалистичный сценарий, нерезидент)');
for(const kind of ['villa','apartment']){
  const a=rs.filter(o=>o.kind===kind);
  const noi=med(a.map(o=>o.scen.realistic.nonresident.noi));
  const price=med(a.map(o=>o.price));
  const entry=med(a.map(o=>o.scen.realistic.nonresident.entry));
  console.log(`\n${kind}: медиана цены $${Math.round(price/1000)}k, вход $${Math.round(entry/1000)}k, чистый поток $${Math.round(noi)}/год`);
  [6.5,8,10,15].forEach(target=>{
    const needEntry=noi/(target/100);
    console.log(`  для ${target}% годовых цена входа должна быть $${Math.round(needEntry/1000)}k — это ${Math.round((1-needEntry/entry)*100)}% ниже текущей`);
  });
}

console.log('\n=== ВОДОПАД для медианной виллы (реалист/нерезидент) ===');
const v=rs.filter(o=>o.kind==='villa');
const pick=v.map(o=>o.scen.realistic.nonresident);
const g=med(pick.map(x=>x.gross));
console.log(`Валовая выручка (ADR $${med(pick.map(x=>x.adr))} × 365 × ${med(pick.map(x=>x.occ))}%) = $${Math.round(g)}`);
console.log(`− канальная комиссия OTA 16%   = −$${Math.round(g*0.16)}`);
console.log(`− PHR 10%, половина на владельце = −$${Math.round(g*0.05)}`);
console.log(`− управляющая компания 17%     = −$${Math.round(g*0.17)}`);
console.log(`− операционные расходы         = −$${Math.round(med(pick.map(x=>x.opexAbs)))}  (пол расходов сработал у ${Math.round(pick.filter(x=>x.opexIsFloor).length/pick.length*100)}% вилл)`);
console.log(`− резерв на износ FF&E 4%      = −$${Math.round(g*0.04)}`);
console.log(`= прибыль до налога            = $${Math.round(med(pick.map(x=>x.preTax)))}`);
console.log(`− PPh 20%                      = −$${Math.round(med(pick.map(x=>x.preTax))*0.2)}`);
console.log(`= чистыми владельцу            = $${Math.round(med(pick.map(x=>x.noi)))}`);
console.log(`Цена входа (цена + 5% оформления + меблировка) = $${Math.round(med(pick.map(x=>x.entry)))}`);
console.log(`Чистая доходность = ${r2(med(pick.map(x=>x.netYield)))}% | Окупаемость ${r2(med(pick.map(x=>x.payback)))} лет | Медиана лиза ${med(v.filter(o=>o.lease).map(o=>o.lease))} лет`);
