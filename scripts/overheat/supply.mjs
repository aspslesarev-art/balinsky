import fs from 'fs';
fs.readFileSync(process.env.HOME+'/balinsky/.env.local','utf8').split('\n').forEach(l=>{const m=l.match(/^([A-Z_0-9]+)=(.*)$/);if(m)process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')});
const U=process.env.NEXT_PUBLIC_SUPABASE_URL,K=process.env.SUPABASE_SERVICE_KEY,H={apikey:K,Authorization:'Bearer '+K};
const R=JSON.parse(fs.readFileSync(process.env.HOME+'/balinsky/reports/overheat-raw.json','utf8'));
const med=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);const m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};

const cat=await (await fetch(`${U}/rest/v1/market_complex_catalog?select=*&limit=200`,{headers:H})).json();
console.log('=== ТЕСТ ПРЕДЛОЖЕНИЯ: сток застройщиков (трекер, срез 20.08.2026) ===');
const tot=cat.reduce((a,c)=>({u:a.u+(c.units||0),av:a.av+(c.available||0),so:a.so+(c.sold||0),re:a.re+(c.reserved||0),val:a.val+(c.available_value_usd||0)}),{u:0,av:0,so:0,re:0,val:0});
console.log(`комплексов ${cat.length} | юнитов ${tot.u} | доступно ${tot.av} (${Math.round(tot.av/tot.u*100)}%) | продано ${tot.so} (${Math.round(tot.so/tot.u*100)}%) | резерв ${tot.re}`);
console.log(`непроданный сток на витрине: $${(tot.val/1e6).toFixed(1)} млн`);

console.log('\nпо районам: район | комплексов | юнитов | доступно | продано % | непроданный сток $млн');
const byD={};
cat.forEach(c=>{const d=c.district||c.location||'—';(byD[d]??=[]).push(c)});
Object.entries(byD).sort((a,b)=>b[1].reduce((s,c)=>s+(c.units||0),0)-a[1].reduce((s,c)=>s+(c.units||0),0)).slice(0,15).forEach(([d,a])=>{
  const u=a.reduce((s,c)=>s+(c.units||0),0),av=a.reduce((s,c)=>s+(c.available||0),0),so=a.reduce((s,c)=>s+(c.sold||0),0),v=a.reduce((s,c)=>s+(c.available_value_usd||0),0);
  console.log(`${d} | ${a.length} | ${u} | ${av} | ${u?Math.round(so/u*100):0}% | ${(v/1e6).toFixed(1)}`);
});

// Насыщенность: новый сток против уже работающей базы аренды в зоне
console.log('\n=== НАСЫЩЕННОСТЬ: объекты в продаже против действующей базы аренды ===');
const comps=await (async()=>{let o=[],f=0;for(;;){const r=await fetch(`${U}/rest/v1/booking_market_relative?select=zone,unit_kind`,{headers:{...H,Range:`${f}-${f+999}`}});const j=await r.json();if(!Array.isArray(j)||!j.length)break;o=o.concat(j);if(j.length<1000)break;f+=1000}return o})();
const rentByZone={};comps.forEach(c=>{if(c.zone)rentByZone[c.zone]=(rentByZone[c.zone]||0)+1});
const saleByZone={};R.results.filter(o=>!o.isResale).forEach(o=>{if(o.zone)saleByZone[o.zone]=(saleByZone[o.zone]||0)+1});
console.log('зона | в продаже (наш каталог) | действующих объектов аренды | прирост к базе');
Object.entries(saleByZone).filter(([,n])=>n>=8).sort((a,b)=>b[1]-a[1]).forEach(([z,n])=>{
  const r=rentByZone[z]||0;
  console.log(`${z} | ${n} | ${r} | ${r?((n/r)*100).toFixed(1)+'%':'—'}`);
});

// Тепловая карта: сколько нового строится там, где загрузка уже слабая
console.log('\n=== ПАДЕНИЕ ДОХОДНОСТИ ПО ЦЕНОВЫМ КОРЗИНАМ (реалист/нерезидент) ===');
console.log('корзина цены | n | медиана net% | медиана GRM | медиана $/м²');
const buckets=[[0,150e3,'<$150k'],[150e3,250e3,'$150–250k'],[250e3,400e3,'$250–400k'],[400e3,700e3,'$400–700k'],[700e3,1e9,'>$700k']];
buckets.forEach(([lo,hi,lbl])=>{
  const a=R.results.filter(o=>!o.isResale&&o.price>=lo&&o.price<hi);
  if(!a.length)return;
  const S=a.map(o=>o.scen.realistic.nonresident);
  console.log(`${lbl} | ${a.length} | ${med(S.map(x=>x.netYield)).toFixed(2)} | ${med(S.map(x=>x.grm)).toFixed(1)} | ${Math.round(med(a.filter(o=>o.area).map(o=>o.price/o.area)))}`);
});
