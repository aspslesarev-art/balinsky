import fs from 'fs';
const R=JSON.parse(fs.readFileSync(process.env.HOME+'/balinsky/reports/overheat-raw.json','utf8'));
const P=R.params, rs=R.results.filter(o=>!o.isResale&&o.kind==='villa');
const med=a=>{const s=[...a].sort((x,y)=>x-y);const m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};

// Пересчёт медианной виллы при произвольных допущениях
function run({occ,adrMult,mgmt,opexPct,opexFloorBase,opexFloorBed,ffe,phrOwner,pph,furnishM2,closing,ota}){
  const ys=rs.map(o=>{
    const S=o.scen.realistic.nonresident;
    const adr=S.adrPos*adrMult;
    const gross=adr*365*(occ/100);
    const opex=Math.max(gross*opexPct, opexFloorBase+opexFloorBed*(o.beds??2));
    const pre=gross-gross*ota-gross*P.PHR*phrOwner-gross*mgmt-opex-gross*ffe;
    const noi=pre>0?pre*(1-pph):pre;
    const entry=o.price*(1+closing)+(o.area?o.area*furnishM2:0);
    return noi/entry*100;
  });
  return med(ys);
}
const BASE={occ:60,adrMult:0.90,mgmt:0.17,opexPct:0.12,opexFloorBase:1500,opexFloorBed:1400,ffe:0.04,phrOwner:0.5,pph:0.20,furnishM2:80,closing:0.05,ota:0.16};
console.log('Базовый (реалистичный) сценарий, медианная вилла: %s%%\n', run(BASE).toFixed(2));

console.log('=== ЧУВСТВИТЕЛЬНОСТЬ: меняем ОДНО допущение ===');
const tests=[
  ['загрузка 70% вместо 60%',{occ:70}],
  ['загрузка 80% вместо 60%',{occ:80}],
  ['загрузка 90% (как в сыром источнике)',{occ:90}],
  ['ADR без дисконта реализации (×1.0)',{adrMult:1.0}],
  ['ADR +30% (объект сильнее соседей)',{adrMult:1.17}],
  ['УК 10% вместо 17%',{mgmt:0.10}],
  ['без управляющей компании (сам сдаёт)',{mgmt:0}],
  ['прямые продажи, без OTA',{ota:0}],
  ['opex без пола, только 12% от выручки',{opexFloorBase:0,opexFloorBed:0}],
  ['PHR полностью на госте',{phrOwner:0}],
  ['налог резидента 10%',{pph:0.10}],
  ['мебель включена застройщиком',{furnishM2:0}],
  ['без резерва на износ',{ffe:0}],
];
tests.forEach(([lbl,ov])=>{
  const v=run({...BASE,...ov});
  console.log(`${lbl.padEnd(42)} → ${v.toFixed(2)}%  (${v>BASE_V()?'+':''}${(v-BASE_V()).toFixed(2)} п.п.)`);
});
function BASE_V(){return run(BASE)}

console.log('\n=== ВСЁ ЛУЧШЕЕ ОДНОВРЕМЕННО (предельно оптимистично) ===');
const best={occ:80,adrMult:1.0,mgmt:0.10,opexPct:0.10,opexFloorBase:1200,opexFloorBed:1100,ffe:0.03,phrOwner:0,pph:0.10,furnishM2:0,closing:0.05,ota:0.08};
console.log(`загрузка 80%, ADR без дисконта, УК 10%, половина броней напрямую,\nналог резидента, мебель включена → ${run(best).toFixed(2)}% медиана по виллам`);

console.log('\n=== ЧТО НУЖНО ДЛЯ 6.5% (уровень гособлигаций Индонезии) ===');
for(let occ=60;occ<=100;occ+=10){
  let lo=0.5,hi=5;
  for(let i=0;i<60;i++){const m=(lo+hi)/2; if(run({...BASE,occ,adrMult:m})<6.5) lo=m; else hi=m;}
  console.log(`при загрузке ${occ}% ставка должна быть в ${((lo+hi)/2/0.9).toFixed(2)}× выше рыночной ставки соседей`);
}
