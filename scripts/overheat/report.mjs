import fs from 'fs';
const R = JSON.parse(fs.readFileSync(process.env.HOME + '/balinsky/reports/overheat-raw.json', 'utf8'));
const rs = R.results;
const med = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r2 = v => v == null ? null : Math.round(v * 100) / 100;

const offplan = rs.filter(o => !o.isResale);
console.log('objects total', rs.length, '| off-plan', offplan.length, '| resale', rs.length - offplan.length);
console.log('villas', rs.filter(o=>o.kind==='villa').length, 'apts', rs.filter(o=>o.kind==='apartment').length);

// ── Общая картина доходности
console.log('\n=== ЧИСТАЯ ДОХОДНОСТЬ (net yield, % годовых от полной цены входа) ===');
console.log('сценарий | налог | вилл медиана | апарт медиана | всё медиана');
for (const s of ['pessimistic','realistic','optimistic']) for (const t of ['nonresident','resident']) {
  const v = offplan.filter(o=>o.kind==='villa').map(o=>o.scen[s][t].netYield);
  const a = offplan.filter(o=>o.kind==='apartment').map(o=>o.scen[s][t].netYield);
  const all = offplan.map(o=>o.scen[s][t].netYield);
  console.log(`${s} | ${t} | ${r2(med(v))} | ${r2(med(a))} | ${r2(med(all))}`);
}

// ── IRR с учётом лизхолда
console.log('\n=== IRR ЗА СРОК LEASEHOLD (%, терминальная стоимость 0) ===');
const withLease = offplan.filter(o=>o.lease>0);
console.log('объектов с указанным лизом:', withLease.length, '| медиана срока:', med(withLease.map(o=>o.lease)));
console.log('сценарий | налог | медиана IRR | доля IRR<6.5% | доля без возврата капитала');
for (const s of ['pessimistic','realistic','optimistic']) for (const t of ['nonresident','resident']) {
  const arr = withLease.map(o=>o.scen[s][t].leaseIrr);
  const ok = arr.filter(x=>x!=null);
  const below = ok.filter(x=>x<R.params.IDN_BOND).length;
  const nullShare = arr.filter(x=>x==null).length;
  console.log(`${s} | ${t} | ${r2(med(ok))} | ${Math.round((below+nullShare)/arr.length*100)}% | ${Math.round(nullShare/arr.length*100)}%`);
}

// ── Заявленная vs расчётная
console.log('\n=== ЗАЯВЛЕННАЯ ДОХОДНОСТЬ vs РАСЧЁТНАЯ ===');
const dec = offplan.filter(o=>o.declared>0);
console.log('объектов с заявленной доходностью:', dec.length, '| медиана заявленной:', r2(med(dec.map(o=>o.declared))), '%');
for (const s of ['realistic','optimistic']) {
  const ratios = dec.map(o=>o.declared / o.scen[s].nonresident.netYield).filter(x=>Number.isFinite(x)&&x>0);
  const ratiosRes = dec.map(o=>o.declared / o.scen[s].resident.netYield).filter(x=>Number.isFinite(x)&&x>0);
  console.log(`${s}: медиана разрыва x${r2(med(ratios))} (нерезидент) / x${r2(med(ratiosRes))} (резидент); доля с разрывом >1.5x: ${Math.round(ratios.filter(x=>x>1.5).length/ratios.length*100)}%`);
}

// ── По зонам
console.log('\n=== ПО ЗОНАМ (реалистичный сценарий, нерезидент 20% PPh) ===');
const byZone = {};
offplan.forEach(o => { if (o.zone) (byZone[o.zone] ??= []).push(o); });
const rows = Object.entries(byZone).filter(([,a])=>a.length>=8).map(([z,a]) => {
  const S = a.map(o=>o.scen.realistic.nonresident);
  const lease = a.filter(o=>o.lease>0);
  return {
    zone: z, n: a.length,
    price: med(a.map(o=>o.price)),
    perM2: med(a.filter(o=>o.area).map(o=>o.price/o.area)),
    adr: med(S.map(x=>x.adr)), occ: med(S.map(x=>x.occ)),
    grossY: med(S.map(x=>x.grossYield)), netY: med(S.map(x=>x.netYield)),
    grm: med(S.map(x=>x.grm)),
    payback: med(S.map(x=>x.payback).filter(Boolean)),
    leaseMed: med(lease.map(o=>o.lease)),
    irr: med(lease.map(o=>o.scen.realistic.nonresident.leaseIrr).filter(x=>x!=null)),
    irrNullShare: lease.length ? Math.round(lease.filter(o=>o.scen.realistic.nonresident.leaseIrr==null).length/lease.length*100) : null,
  };
}).sort((a,b)=>b.netY-a.netY);
console.log('зона | n | медцена $ | $/м² | ADR | occ% | gross% | net% | GRM | окуп.лет | лиз лет | IRR% | без возврата');
rows.forEach(r=>console.log(`${r.zone} | ${r.n} | ${Math.round(r.price/1000)}k | ${Math.round(r.perM2)} | ${Math.round(r.adr)} | ${r2(r.occ)} | ${r2(r.grossY)} | ${r2(r.netY)} | ${r2(r.grm)} | ${r2(r.payback)} | ${r.leaseMed} | ${r2(r.irr)} | ${r.irrNullShare}%`));

fs.writeFileSync(process.env.HOME+'/balinsky/reports/overheat-zones.json', JSON.stringify(rows,null,1));
