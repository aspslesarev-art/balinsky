import fs from 'fs';
const R=JSON.parse(fs.readFileSync(process.env.HOME+'/balinsky/reports/overheat-raw.json','utf8'));
const rs=R.results.filter(o=>!o.isResale);
const med=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);const m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(s.length*p))]};
const r2=v=>v==null?null:Math.round(v*100)/100;

const zones={};
rs.forEach(o=>{if(o.zone)(zones[o.zone]??=[]).push(o)});
const zoneRows=Object.entries(zones).filter(([,a])=>a.length>=8).map(([z,a])=>{
  const S=a.map(o=>o.scen.realistic.nonresident);
  const L=a.filter(o=>o.lease>0);
  const irrs=L.map(o=>o.scen.realistic.nonresident.leaseIrr).filter(x=>x!=null);
  return {zone:z,n:a.length,villas:a.filter(o=>o.kind==='villa').length,
    price:med(a.map(o=>o.price)),perM2:Math.round(med(a.filter(o=>o.area).map(o=>o.price/o.area))),
    adr:Math.round(med(S.map(x=>x.adr))),occ:r2(med(S.map(x=>x.occ))),
    grossY:r2(med(S.map(x=>x.grossYield))),netY:r2(med(S.map(x=>x.netYield))),
    netOpt:r2(med(a.map(o=>o.scen.optimistic.resident.netYield))),
    grm:r2(med(S.map(x=>x.grm))),payback:r2(med(S.map(x=>x.payback).filter(Boolean))),
    lease:med(L.map(o=>o.lease)),irr:r2(med(irrs)),
    noReturn:L.length?Math.round(L.filter(o=>o.scen.realistic.nonresident.leaseIrr==null).length/L.length*100):null};
}).sort((a,b)=>b.netY-a.netY);

const best=[...rs].sort((a,b)=>b.scen.realistic.nonresident.netYield-a.scen.realistic.nonresident.netYield).slice(0,20)
  .map(o=>({title:o.title,kind:o.kind,zone:o.zone,price:o.price,beds:o.beds,area:o.area,lease:o.lease,
    adr:o.scen.realistic.nonresident.adr,net:o.scen.realistic.nonresident.netYield,
    netOpt:o.scen.optimistic.resident.netYield,irr:o.scen.realistic.nonresident.leaseIrr,dev:o.developer,complex:o.complex}));

const gap=rs.filter(o=>o.declared>0).map(o=>({o,g:o.declared/o.scen.realistic.nonresident.netYield}))
  .filter(x=>Number.isFinite(x.g)&&x.g>0).sort((a,b)=>b.g-a.g).slice(0,20)
  .map(({o,g})=>({title:o.title,dev:o.developer,zone:o.zone,price:o.price,declared:r2(o.declared),
    calc:o.scen.realistic.nonresident.netYield,calcOpt:o.scen.optimistic.resident.netYield,gap:r2(g)}));

const dist={};
for(const kind of ['villa','apartment']) for(const [k,s,t] of [['real','realistic','nonresident'],['opt','optimistic','resident']]){
  const a=rs.filter(o=>o.kind===kind).map(o=>o.scen[s][t].netYield);
  dist[`${kind}_${k}`]={p10:r2(q(a,.1)),p25:r2(q(a,.25)),med:r2(med(a)),p75:r2(q(a,.75)),p90:r2(q(a,.9)),p95:r2(q(a,.95)),
    over65:Math.round(a.filter(x=>x>6.5).length/a.length*100),over10:Math.round(a.filter(x=>x>10).length/a.length*100)};
}
const scen={};
for(const s of ['pessimistic','realistic','optimistic']) for(const t of ['nonresident','resident']){
  const v=rs.filter(o=>o.kind==='villa').map(o=>o.scen[s][t]);
  const ap=rs.filter(o=>o.kind==='apartment').map(o=>o.scen[s][t]);
  const L=rs.filter(o=>o.lease>0);
  const irrs=L.map(o=>o.scen[s][t].leaseIrr).filter(x=>x!=null);
  scen[`${s}_${t}`]={villaNet:r2(med(v.map(x=>x.netYield))),aptNet:r2(med(ap.map(x=>x.netYield))),
    irr:r2(med(irrs)),noReturn:Math.round(L.filter(o=>o.scen[s][t].leaseIrr==null).length/L.length*100)};
}
const vm=rs.filter(o=>o.kind==='villa').map(o=>o.scen.realistic.nonresident);
const waterfall={gross:Math.round(med(vm.map(x=>x.gross))),adr:r2(med(vm.map(x=>x.adr))),occ:r2(med(vm.map(x=>x.occ))),
  opex:Math.round(med(vm.map(x=>x.opexAbs))),floorShare:Math.round(vm.filter(x=>x.opexIsFloor).length/vm.length*100),
  preTax:Math.round(med(vm.map(x=>x.preTax))),noi:Math.round(med(vm.map(x=>x.noi))),
  entry:Math.round(med(vm.map(x=>x.entry))),price:Math.round(med(rs.filter(o=>o.kind==='villa').map(o=>o.price))),
  net:r2(med(vm.map(x=>x.netYield))),payback:r2(med(vm.map(x=>x.payback))),lease:med(rs.filter(o=>o.kind==='villa'&&o.lease).map(o=>o.lease))};

const buckets=[[0,150e3,'до $150k'],[150e3,250e3,'$150–250k'],[250e3,400e3,'$250–400k'],[400e3,700e3,'$400–700k'],[700e3,1e9,'от $700k']]
 .map(([lo,hi,lbl])=>{const a=rs.filter(o=>o.price>=lo&&o.price<hi);const S=a.map(o=>o.scen.realistic.nonresident);
   return{label:lbl,n:a.length,net:r2(med(S.map(x=>x.netYield))),grm:r2(med(S.map(x=>x.grm))),perM2:Math.round(med(a.filter(o=>o.area).map(o=>o.price/o.area)))}});

fs.writeFileSync(process.env.HOME+'/balinsky/reports/overheat-report-data.json',JSON.stringify({
  generatedAt:R.generatedAt,n:rs.length,villas:rs.filter(o=>o.kind==='villa').length,apts:rs.filter(o=>o.kind==='apartment').length,
  declaredMed:r2(med(rs.filter(o=>o.declared>0).map(o=>o.declared))),declaredN:rs.filter(o=>o.declared>0).length,
  leaseMed:med(rs.filter(o=>o.lease>0).map(o=>o.lease)),
  zoneRows,best,gap,dist,scen,waterfall,buckets},null,1));
console.log('ok', zoneRows.length,'зон,',best.length,'лучших,',gap.length,'разрывов');
console.log(JSON.stringify(waterfall));
console.log(JSON.stringify(scen.realistic_nonresident),JSON.stringify(scen.optimistic_resident));
