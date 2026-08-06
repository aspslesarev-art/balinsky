#!/usr/bin/env node
// One-off: renders a massing preview for ONE complex — extruded blocks with a
// real sun position for its coordinates, so the light and shadows can be judged
// before any of this goes near the site.
//
// Usage: node scripts/_tmp-massing-preview.mjs "LUMA RESORT" out.html

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './_kb-build.mjs'

loadEnv()
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const WANT = (process.argv[2] ?? 'LUMA RESORT').toLowerCase()
const OUT = process.argv[3] ?? 'massing.html'

const { data: massing } = await sb.storage.from('complex-photos').download('_massing.json')
const M = JSON.parse(await massing.text())
const { data: rows } = await sb.from('raw_complexes').select('airtable_id, data')

const row = rows.find(r => String(r.data?.['Project'] ?? '').toLowerCase().includes(WANT))
if (!row) { console.error(`не нашёл ЖК по «${WANT}»`); process.exit(1) }
const m = M[row.airtable_id]
if (!m) { console.error('для этого ЖК нет массинга'); process.exit(1) }

const d = row.data
const lat = parseFloat(String(d['Geo'] ?? '').trim())
const lng = parseFloat(String(d['Geo 2'] ?? '').trim())
const units = Number(d['Total quantity of units']) || m.buildings.length * 4
const project = d['Project'] ?? row.airtable_id

// Site size is a rough guess from the unit count — there are no plot dimensions
// in the data, so the footprint is illustrative, not surveyed.
const site = Math.max(45, Math.min(160, Math.round(Math.sqrt(units * 180))))

const payload = { project, lat, lng, units, site, ...m }
console.log(`${project} — ${m.buildings.length} строений, уверенность ${m.confidence}, участок ~${site}×${site} м`)

fs.writeFileSync(OUT, `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${project} — схема застройки</title>
<style>
:root{color-scheme:light dark;--bg:#f6f7f9;--fg:#111;--mut:#666;--line:#dcdfe4}
@media(prefers-color-scheme:dark){:root{--bg:#15171a;--fg:#eee;--mut:#9aa0a6;--line:#2c3034}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,system-ui,sans-serif}
.wrap{max-width:980px;margin:0 auto;padding:20px}
h1{font-size:22px;margin:0 0 2px}
.sub{color:var(--mut);font-size:13px;margin:0 0 14px}
canvas{width:100%;height:auto;background:linear-gradient(#cfe3f7,#eaf1f8);border-radius:14px;display:block;border:1px solid var(--line)}
@media(prefers-color-scheme:dark){canvas{background:linear-gradient(#1d2530,#252c33)}}
.ctl{display:grid;grid-template-columns:120px 1fr 70px;gap:10px;align-items:center;margin:12px 0}
input[type=range]{width:100%}
.val{font-variant-numeric:tabular-nums;color:var(--mut);font-size:13px}
.facts{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.facts span{border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:13px}
.warn{border-left:3px solid #c93;padding:8px 12px;color:var(--mut);font-size:13px;margin-top:16px;background:rgba(200,150,50,.07)}
</style>
<div class="wrap">
<h1 id="ttl"></h1>
<p class="sub" id="sub"></p>
<canvas id="c" width="1840" height="1100"></canvas>
<div class="ctl"><label for="t">Время суток</label><input id="t" type="range" min="5.5" max="18.5" step="0.25" value="9"><span class="val" id="tv"></span></div>
<div class="ctl"><label for="mo">Месяц</label><input id="mo" type="range" min="1" max="12" step="1" value="8"><span class="val" id="mov"></span></div>
<div class="ctl"><label for="rot">Поворот вида</label><input id="rot" type="range" min="0" max="360" step="1" value="35"><span class="val" id="rotv"></span></div>
<div class="facts" id="facts"></div>
<p class="warn">Это схема застройки, а не модель здания. Обмеров, планов и контура участка в данных нет: этажность и состав строений распознаны по фотографиям, размер участка прикинут по числу юнитов. Солнце и тени рассчитаны честно — по реальным координатам объекта и выбранной дате.</p>
</div>
<script>
const D = ${JSON.stringify(payload)};

// --- положение солнца (упрощённые формулы NOAA), время Бали = UTC+8 ---
function sunPos(lat, lng, month, hour) {
  const doy = Math.round((month - 0.5) * 30.44);
  const g = 2 * Math.PI / 365 * (doy - 1 + (hour - 12) / 24);
  const eqtime = 229.18 * (0.000075 + 0.001868*Math.cos(g) - 0.032077*Math.sin(g) - 0.014615*Math.cos(2*g) - 0.040849*Math.sin(2*g));
  const decl = 0.006918 - 0.399912*Math.cos(g) + 0.070257*Math.sin(g) - 0.006758*Math.cos(2*g) + 0.000907*Math.sin(2*g) - 0.002697*Math.cos(3*g) + 0.00148*Math.sin(3*g);
  const tst = hour * 60 + eqtime + 4 * lng - 60 * 8;
  const ha = (tst / 4 - 180) * Math.PI / 180;
  const la = lat * Math.PI / 180;
  const cosZ = Math.sin(la)*Math.sin(decl) + Math.cos(la)*Math.cos(decl)*Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, cosZ)));
  const az = Math.atan2(-Math.sin(ha), Math.tan(decl)*Math.cos(la) - Math.sin(la)*Math.cos(ha));
  return { alt, az };
}

// --- раскладка строений по участку ---
function layout(D) {
  const n = D.buildings.length, S = D.site, out = [];
  const total = D.buildings.reduce((a,b)=>a+b.footprint_share,0) || 1;
  const built = S * S * (D.density === 'high' ? 0.45 : D.density === 'medium' ? 0.32 : 0.22);
  D.buildings.forEach((b, i) => {
    const area = built * (b.footprint_share / total);
    const ratio = b.form === 'bar' ? 3.2 : (b.form === 'L' || b.form === 'U') ? 1.8 : 1.25;
    const w = Math.sqrt(area * ratio), dp = area / w;
    let x = 0, y = 0;
    if (D.site_layout === 'row') { x = (i - (n-1)/2) * (S / Math.max(n,1)); y = 0; }
    else if (D.site_layout === 'courtyard') { const a = (i / n) * Math.PI * 2; x = Math.cos(a) * S * 0.26; y = Math.sin(a) * S * 0.26; }
    else if (D.site_layout === 'single' || D.site_layout === 'tower') { x = 0; y = 0; }
    else { const cols = Math.ceil(Math.sqrt(n)); x = ((i % cols) - (cols-1)/2) * (S/cols*1.15); y = (Math.floor(i/cols) - (Math.ceil(n/cols)-1)/2) * (S/cols*1.15); }
    out.push({ x, y, w, d: dp, h: b.storeys * 3.2, roof: b.roof, storeys: b.storeys });
  });
  return out;
}

function convex(pts) {
  const p = pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[],up=[];
  for (const q of p){ while(lo.length>=2&&cross(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop(); lo.push(q); }
  for (let i=p.length-1;i>=0;i--){ const q=p[i]; while(up.length>=2&&cross(up[up.length-2],up[up.length-1],q)<=0)up.pop(); up.push(q); }
  lo.pop(); up.pop(); return lo.concat(up);
}

const c = document.getElementById('c'), g = c.getContext('2d');
const B = layout(D);

function draw() {
  const hour = +document.getElementById('t').value;
  const month = +document.getElementById('mo').value;
  const rot = +document.getElementById('rot').value * Math.PI / 180;
  const { alt, az } = sunPos(D.lat, D.lng, month, hour);
  const day = alt > 0.02;

  const scale = Math.min(c.width / (D.site * 2.1), c.height / (D.site * 1.5));
  const cx = c.width / 2, cy = c.height * 0.62, tilt = 0.62;
  const P = (x, y, z) => {
    const e = x * Math.cos(rot) - y * Math.sin(rot);
    const n = x * Math.sin(rot) + y * Math.cos(rot);
    return [cx + e * scale, cy + n * scale * Math.cos(tilt) - z * scale * Math.sin(tilt)];
  };

  g.clearRect(0,0,c.width,c.height);
  const S = D.site / 2;
  g.beginPath();
  [[-S,-S],[S,-S],[S,S],[-S,S]].forEach(([x,y],i)=>{const p=P(x,y,0); i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);});
  g.closePath();
  g.fillStyle = day ? '#cdd7c4' : '#5c6360'; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.stroke();

  if (D.pool && D.pool.present) {
    const pos = D.pool.position, py = pos==='front'? S*0.55 : pos==='rear'? -S*0.55 : 0;
    const pw = D.site*0.16, pd = D.site*0.07;
    g.beginPath();
    [[-pw,py-pd],[pw,py-pd],[pw,py+pd],[-pw,py+pd]].forEach(([x,y],i)=>{const p=P(x,y,0.05); i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);});
    g.closePath(); g.fillStyle = day ? '#4aa6c8' : '#2b5c70'; g.fill();
  }

  const sunH = [Math.sin(az), Math.cos(az)];
  const sorted = B.map((b,i)=>({b,i})).sort((A,Z)=>{
    const na = A.b.x*Math.sin(rot)+A.b.y*Math.cos(rot), nz = Z.b.x*Math.sin(rot)+Z.b.y*Math.cos(rot);
    return na - nz;
  });

  if (day) {
    const k = 1 / Math.tan(Math.max(alt, 0.08));
    g.fillStyle = 'rgba(20,25,35,' + (0.10 + 0.28 * Math.max(0, Math.cos(alt))) + ')';
    for (const { b } of sorted) {
      const off = [-sunH[0]*b.h*k, -sunH[1]*b.h*k];
      const base = [[-b.w/2,-b.d/2],[b.w/2,-b.d/2],[b.w/2,b.d/2],[-b.w/2,b.d/2]];
      const pts = base.map(([x,y])=>[b.x+x, b.y+y]).concat(base.map(([x,y])=>[b.x+x+off[0], b.y+y+off[1]]));
      const hull = convex(pts);
      g.beginPath();
      hull.forEach(([x,y],i)=>{const p=P(x,y,0.02); i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);});
      g.closePath(); g.fill();
    }
  }

  for (const { b } of sorted) {
    const x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.d/2, y1=b.y+b.d/2, h=b.h;
    const faces = [
      { n:[0,-1,0], q:[[x0,y0,0],[x1,y0,0],[x1,y0,h],[x0,y0,h]] },
      { n:[0,1,0],  q:[[x0,y1,0],[x1,y1,0],[x1,y1,h],[x0,y1,h]] },
      { n:[-1,0,0], q:[[x0,y0,0],[x0,y1,0],[x0,y1,h],[x0,y0,h]] },
      { n:[1,0,0],  q:[[x1,y0,0],[x1,y1,0],[x1,y1,h],[x1,y0,h]] },
      { n:[0,0,1],  q:[[x0,y0,h],[x1,y0,h],[x1,y1,h],[x0,y1,h]] },
    ];
    const sv = [Math.cos(alt)*Math.sin(az), Math.cos(alt)*Math.cos(az), Math.sin(alt)];
    const drawn = faces.map(f=>{
      const depth = f.q.reduce((a,p)=>a + (p[0]*Math.sin(rot)+p[1]*Math.cos(rot)), 0) / 4;
      return { n:f.n, q:f.q, depth };
    }).sort((A,Z)=>A.depth-Z.depth);
    for (const f of drawn) {
      const dot = day ? Math.max(0, f.n[0]*sv[0] + f.n[1]*sv[1] + f.n[2]*sv[2]) : 0;
      const lum = day ? 0.42 + 0.58*dot : 0.30;
      const base = f.n[2] === 1 ? (b.roof === 'thatch' ? [140,96,60] : b.roof === 'pitched' ? [156,116,92] : [196,198,200]) : [232,228,220];
      const col = base.map(v=>Math.round(v*lum));
      g.beginPath();
      f.q.forEach((p,i)=>{const s=P(p[0],p[1],p[2]); i?g.lineTo(s[0],s[1]):g.moveTo(s[0],s[1]);});
      g.closePath();
      g.fillStyle = 'rgb('+col.join(',')+')'; g.fill();
      g.strokeStyle='rgba(0,0,0,.22)'; g.lineWidth=1; g.stroke();
    }
  }

  const hh = Math.floor(hour), mm = Math.round((hour-hh)*60);
  document.getElementById('tv').textContent = String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
  document.getElementById('mov').textContent = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][month-1];
  document.getElementById('rotv').textContent = Math.round(rot*180/Math.PI)+'°';
  document.getElementById('sub').textContent =
    D.lat.toFixed(5)+', '+D.lng.toFixed(5)+' · участок ~'+D.site+'×'+D.site+' м · солнце '+(day? (alt*180/Math.PI).toFixed(0)+'° над горизонтом' : 'за горизонтом');
}

document.getElementById('ttl').textContent = D.project + ' — схема застройки';
document.getElementById('facts').innerHTML = [
  D.buildings.length + ' строений',
  'этажность ' + D.buildings.map(b=>b.storeys).join('/'),
  'планировка: ' + D.site_layout,
  'плотность: ' + D.density,
  D.pool.present ? 'бассейн: ' + (D.pool.position ?? 'есть') : 'без бассейна',
  'парковка: ' + D.parking,
  D.units + ' юнитов',
  'уверенность ' + D.confidence,
].map(s=>'<span>'+s+'</span>').join('');
['t','mo','rot'].forEach(id=>document.getElementById(id).addEventListener('input', draw));
draw();
</script>
`)
console.log(`записано ${OUT}`)
