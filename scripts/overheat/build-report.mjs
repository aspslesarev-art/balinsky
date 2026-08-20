import fs from 'fs';
const D = JSON.parse(fs.readFileSync(process.env.HOME + '/balinsky/reports/overheat-report-data.json', 'utf8'));
const money = n => '$' + Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
const k = n => '$' + Math.round(n / 1000) + 'k';
const pct = n => (n == null ? '—' : n.toFixed(2).replace('.', ',') + '%');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const W = D.waterfall;
// Водопад: доли от валовой выручки
const gross = W.gross;
const steps = [
  { label: 'Канальная комиссия OTA', note: 'booking.com, Airbnb — 16%', v: gross * 0.16 },
  { label: 'Налог на проживание PHR', note: '10%, половина ложится на владельца', v: gross * 0.05 },
  { label: 'Управляющая компания', note: '17% от валовой выручки', v: gross * 0.17 },
  { label: 'Операционные расходы', note: `уборка, бассейн, сад, свет, вода — у ${W.floorShare}% вилл упирается в базовый минимум`, v: W.opex },
  { label: 'Резерв на износ', note: 'мебель, техника, текстиль — 4%', v: gross * 0.04 },
  { label: 'Подоходный налог PPh', note: '20% для нерезидента, с прибыли', v: W.preTax * 0.2 },
];
const maxBar = gross;

const waterfallRows = steps.map(s => `
      <div class="wf-row">
        <div class="wf-label"><span class="wf-name">${esc(s.label)}</span><span class="wf-note">${esc(s.note)}</span></div>
        <div class="wf-track"><div class="wf-bar wf-cost" style="width:${(s.v / maxBar * 100).toFixed(2)}%"></div></div>
        <div class="wf-val">−${money(s.v)}</div>
      </div>`).join('');

const zoneRows = D.zoneRows.map(z => `
        <tr>
          <th scope="row">${esc(z.zone)}</th>
          <td class="num">${z.n}</td>
          <td class="num">${k(z.price)}</td>
          <td class="num">$${z.perM2}</td>
          <td class="num">$${z.adr}</td>
          <td class="num">${pct(z.grossY)}</td>
          <td class="num strong">${pct(z.netY)}</td>
          <td class="num">${pct(z.netOpt)}</td>
          <td class="num">${z.grm}</td>
          <td class="num">${z.lease}</td>
          <td class="num ${z.noReturn >= 80 ? 'bad' : ''}">${z.noReturn}%</td>
        </tr>`).join('');

const bestRows = D.best.slice(0, 15).map(o => `
        <tr>
          <th scope="row">${esc((o.title || '').slice(0, 46))}</th>
          <td>${o.kind === 'villa' ? 'вилла' : 'апарт.'}</td>
          <td>${esc(o.zone || '—')}</td>
          <td class="num">${k(o.price)}</td>
          <td class="num">${o.beds ?? '—'}</td>
          <td class="num">$${o.adr}</td>
          <td class="num strong">${pct(o.net)}</td>
          <td class="num">${pct(o.netOpt)}</td>
          <td class="num">${o.lease ?? '—'}</td>
        </tr>`).join('');

const gapRows = D.gap.slice(0, 15).map(o => `
        <tr>
          <th scope="row">${esc((o.title || '').slice(0, 40))}</th>
          <td>${esc((o.dev || '—').slice(0, 22))}</td>
          <td>${esc(o.zone || '—')}</td>
          <td class="num">${k(o.price)}</td>
          <td class="num claim">${pct(o.declared)}</td>
          <td class="num fact">${pct(o.calc)}</td>
          <td class="num bad strong">×${o.gap.toFixed(0)}</td>
        </tr>`).join('');

const bucketRows = D.buckets.map(b => `
        <tr>
          <th scope="row">${esc(b.label)}</th>
          <td class="num">${b.n}</td>
          <td class="num strong">${pct(b.net)}</td>
          <td class="num">${b.grm}</td>
          <td class="num">$${b.perM2}</td>
        </tr>`).join('');

const sens = [
  ['Загрузка 70% вместо 60%', 2.46], ['Загрузка 80% вместо 60%', 2.86],
  ['Загрузка 90% — как в сыром источнике', 3.29], ['Ставка без дисконта реализации', 2.32],
  ['Ставка на 30% выше соседской', 2.79], ['Управляющая компания 10% вместо 17%', 2.39],
  ['Сдаёт сам, без управляющей компании', 2.86], ['Все брони напрямую, без площадок', 2.82],
  ['Расходы без базового минимума', 2.33], ['Налог на проживание целиком на госте', 2.29],
  ['Налог резидента 10% вместо 20%', 2.29], ['Мебель включена застройщиком', 2.08],
  ['Без резерва на износ', 2.24],
];
const BASE_SENS = 2.03;
const sensMax = 3.29;
const sensRows = sens.map(([l, v]) => `
      <div class="sens-row">
        <div class="sens-label">${esc(l)}</div>
        <div class="sens-track">
          <div class="sens-base" style="left:${(BASE_SENS / sensMax * 100).toFixed(1)}%"></div>
          <div class="sens-bar" style="width:${(v / sensMax * 100).toFixed(1)}%"></div>
        </div>
        <div class="sens-val">${pct(v)}</div>
      </div>`).join('');

const html = `<title>Перегрет ли рынок Бали</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
:root{
  --ground:#EEF0F2; --surface:#FFFFFF; --surface-2:#F6F7F9;
  --ink:#131A22; --ink-2:#33414F; --muted:#5C6A78; --hair:#D3D9DF; --hair-2:#E4E8EC;
  --claim:#8A6B00; --fact:#0A6BB0; --bad:#A62B24;
  --claim-soft:#8A6B0018; --fact-soft:#0A6BB014; --bad-soft:#A62B2412;
  --display:'Fraunces',Georgia,'Times New Roman',serif;
  --body:'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,monospace;
  --wide:1180px; --read:70ch;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --ground:#11161C; --surface:#181F27; --surface-2:#1E262F;
    --ink:#E6EBF0; --ink-2:#BCC7D2; --muted:#8E9BA9; --hair:#2C3742; --hair-2:#232C36;
    --claim:#B08C1E; --fact:#4A90D0; --bad:#D05A50;
    --claim-soft:#B08C1E22; --fact-soft:#4A90D01E; --bad-soft:#D05A5018;
  }
}
:root[data-theme="dark"]{
  --ground:#11161C; --surface:#181F27; --surface-2:#1E262F;
  --ink:#E6EBF0; --ink-2:#BCC7D2; --muted:#8E9BA9; --hair:#2C3742; --hair-2:#232C36;
  --claim:#B08C1E; --fact:#4A90D0; --bad:#D05A50;
  --claim-soft:#B08C1E22; --fact-soft:#4A90D01E; --bad-soft:#D05A5018;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--body);
  font-size:16.5px;line-height:1.65;-webkit-font-smoothing:antialiased}
.page{max-width:var(--wide);margin:0 auto;padding:0 24px 96px}
.read{max-width:var(--read)}
h1,h2,h3{font-family:var(--display);text-wrap:balance;margin:0}
p{margin:0 0 1.1em}
a{color:var(--fact)}
strong{font-weight:600}
.num{font-family:var(--mono);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.strong{font-weight:600}
.bad{color:var(--bad)}
.claim{color:var(--claim)}
.fact{color:var(--fact)}

/* ─ hero ─ */
.hero{padding:76px 0 44px;border-bottom:1px solid var(--hair)}
.eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--muted);margin:0 0 22px}
.hero h1{font-size:clamp(38px,6.4vw,68px);line-height:1.02;font-weight:600;letter-spacing:-.02em;
  max-width:16ch;margin-bottom:26px}
.verdict{font-size:clamp(18px,2.2vw,21px);line-height:1.55;color:var(--ink-2);max-width:62ch}
.verdict b{color:var(--ink);font-weight:600}
.hero-meta{display:flex;flex-wrap:wrap;gap:28px 44px;margin-top:38px;
  font-family:var(--mono);font-size:12.5px;color:var(--muted)}
.hero-meta div span{display:block;color:var(--ink);font-size:20px;font-weight:500;margin-bottom:3px}

/* ─ headline pair ─ */
.pair{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--hair);
  border:1px solid var(--hair);margin:0 0 8px}
.pair>div{background:var(--surface);padding:30px 28px}
.pair .k{font-family:var(--mono);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--muted);margin-bottom:14px}
.pair .v{font-family:var(--display);font-size:clamp(42px,7vw,66px);line-height:1;font-weight:600;letter-spacing:-.02em}
.pair .d{font-size:14.5px;color:var(--muted);margin-top:12px;line-height:1.5}
.pair .a .v{color:var(--claim)}
.pair .b .v{color:var(--fact)}

/* ─ sections ─ */
section{padding:64px 0 0}
.stamp{display:inline-flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;
  letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:16px}
.stamp b{display:inline-grid;place-items:center;width:22px;height:22px;border:1px solid var(--hair);
  color:var(--ink);font-weight:500;border-radius:2px}
h2{font-size:clamp(25px,3.4vw,34px);font-weight:600;letter-spacing:-.015em;line-height:1.2;
  margin-bottom:18px;max-width:22ch}
h3{font-size:19px;font-weight:600;margin:38px 0 12px}
.lede{font-size:18px;color:var(--ink-2);max-width:64ch;margin-bottom:28px}

/* ─ waterfall ─ */
.wf{background:var(--surface);border:1px solid var(--hair);padding:30px 28px;margin:26px 0}
.wf-head,.wf-foot{display:grid;grid-template-columns:minmax(200px,1.5fr) minmax(120px,3fr) 130px;
  gap:20px;align-items:baseline;padding:14px 0}
.wf-head{border-bottom:1px solid var(--hair)}
.wf-foot{border-top:2px solid var(--ink);margin-top:14px}
.wf-row{display:grid;grid-template-columns:minmax(200px,1.5fr) minmax(120px,3fr) 130px;
  gap:20px;align-items:center;padding:11px 0;border-bottom:1px solid var(--hair-2)}
.wf-label{display:flex;flex-direction:column;gap:2px;min-width:0}
.wf-name{font-size:15px}
.wf-note{font-size:12.5px;color:var(--muted);line-height:1.4}
.wf-track{height:14px;background:var(--surface-2);border-radius:2px;overflow:hidden}
.wf-bar{height:100%;border-radius:0 4px 4px 0}
.wf-cost{background:var(--bad);opacity:.72}
.wf-gross{background:var(--claim)}
.wf-net{background:var(--fact)}
.wf-val{font-family:var(--mono);font-variant-numeric:tabular-nums;text-align:right;font-size:14.5px}
.wf-big{font-family:var(--display);font-size:26px;font-weight:600;text-align:right;letter-spacing:-.01em}
.wf-title{font-size:15px;font-weight:600}
.wf-sub{font-size:12.5px;color:var(--muted)}

/* ─ tables ─ */
.scroll{overflow-x:auto;margin:26px 0;border:1px solid var(--hair);background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:14px;min-width:640px}
caption{text-align:left;padding:18px 20px 0;font-size:13px;color:var(--muted);caption-side:top}
th,td{padding:11px 14px;border-bottom:1px solid var(--hair-2);text-align:left;vertical-align:baseline}
thead th{font-family:var(--mono);font-size:11px;letter-spacing:.07em;text-transform:uppercase;
  color:var(--muted);font-weight:500;border-bottom:1px solid var(--hair);white-space:nowrap}
thead th.num{text-align:right}
tbody th{font-weight:500}
tbody tr:last-child th,tbody tr:last-child td{border-bottom:none}
tbody tr:hover{background:var(--surface-2)}

/* ─ scenarios ─ */
.scen{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--hair);
  border:1px solid var(--hair);margin:26px 0}
.scen>div{background:var(--surface);padding:24px 22px}
.scen .t{font-family:var(--mono);font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted);margin-bottom:8px}
.scen .n{font-family:var(--display);font-size:40px;font-weight:600;letter-spacing:-.02em;color:var(--fact);line-height:1.05}
.scen .u{font-size:13px;color:var(--muted);margin-top:8px;line-height:1.5}
.scen ul{margin:14px 0 0;padding-left:0;list-style:none;font-size:13px;color:var(--muted);line-height:1.75}
.scen li::before{content:'·';margin-right:8px;color:var(--hair)}

/* ─ sensitivity ─ */
.sens{background:var(--surface);border:1px solid var(--hair);padding:26px 28px;margin:26px 0}
.sens-row{display:grid;grid-template-columns:minmax(200px,1.4fr) minmax(120px,3fr) 78px;
  gap:18px;align-items:center;padding:8px 0}
.sens-label{font-size:14.5px}
.sens-track{position:relative;height:13px;background:var(--surface-2);border-radius:2px}
.sens-bar{height:100%;background:var(--fact);opacity:.55;border-radius:0 4px 4px 0}
.sens-base{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--ink);opacity:.5;z-index:2}
.sens-val{font-family:var(--mono);font-variant-numeric:tabular-nums;text-align:right;font-size:14px}
.sens-legend{display:flex;gap:22px;flex-wrap:wrap;font-size:12.5px;color:var(--muted);
  margin-top:18px;padding-top:16px;border-top:1px solid var(--hair-2)}
.sens-legend span{display:inline-flex;align-items:center;gap:8px}
.swatch{width:13px;height:13px;border-radius:2px;display:inline-block}

/* ─ callouts ─ */
.note{border-left:2px solid var(--fact);background:var(--fact-soft);padding:18px 22px;margin:26px 0;
  font-size:15px;line-height:1.6;max-width:72ch}
.note.warn{border-left-color:var(--bad);background:var(--bad-soft)}
.note.claimc{border-left-color:var(--claim);background:var(--claim-soft)}
.note p:last-child{margin-bottom:0}
.note b{font-weight:600}

ul.plain{padding-left:0;list-style:none;max-width:70ch}
ul.plain li{position:relative;padding-left:26px;margin-bottom:12px;line-height:1.6}
ul.plain li::before{content:'';position:absolute;left:5px;top:.72em;width:6px;height:6px;
  background:var(--hair);border-radius:50%}
ol.steps{padding-left:0;list-style:none;counter-reset:s;max-width:70ch}
ol.steps li{position:relative;padding-left:38px;margin-bottom:16px;counter-increment:s;line-height:1.6}
ol.steps li::before{content:counter(s);position:absolute;left:0;top:1px;width:24px;height:24px;
  display:grid;place-items:center;font-family:var(--mono);font-size:12px;color:var(--muted);
  border:1px solid var(--hair);border-radius:2px}

footer{margin-top:80px;padding-top:32px;border-top:1px solid var(--hair);
  font-size:13.5px;color:var(--muted);max-width:78ch}
footer h3{font-size:15px;margin:0 0 12px;color:var(--ink)}
footer p{margin-bottom:.9em}

@media (max-width:760px){
  body{font-size:16px}
  .pair{grid-template-columns:1fr}
  .scen{grid-template-columns:1fr}
  .wf-head,.wf-foot,.wf-row{grid-template-columns:1fr 90px;gap:10px}
  .wf-track{display:none}
  .sens-row{grid-template-columns:1fr 68px;gap:10px}
  .sens-track{display:none}
  .hero{padding:52px 0 34px}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>

<div class="page">

<header class="hero">
  <p class="eyebrow">Аудит доходности новостроя · Бали · август 2026</p>
  <h1>Перегрет ли рынок Бали</h1>
  <p class="verdict">Да — и не по цене квадратного метра, а по разрыву между ценой и денежным потоком.
  Медианный объект новостроя приносит владельцу <b>${pct(D.scen.realistic_nonresident.villaNet)} годовых</b> чистыми
  против <b>${pct(D.declaredMed)}</b>, которые заявляют застройщики. При медианном лизхолде в ${D.leaseMed} лет
  <b>у ${D.scen.realistic_nonresident.noReturn}% объектов вложенный капитал не возвращается вообще</b> — право
  аренды истекает раньше, чем объект себя окупает.</p>
  <div class="hero-meta">
    <div><span>${D.n}</span>объектов в продаже посчитано</div>
    <div><span>14 898</span>объектов аренды для сравнения</div>
    <div><span>1 485</span>объявлений помесячной аренды</div>
    <div><span>4 938</span>юнитов в трекере застройщиков</div>
  </div>
</header>

<section>
  <div class="stamp"><b>A</b> Тест денежного потока</div>
  <h2>Куда девается арендная выручка</h2>
  <p class="lede">Медианная вилла новостроя стоит ${money(W.price)} и сдаётся по ${money(W.adr)} за ночь.
  Вот что от этой выручки доходит до владельца.</p>

  <div class="wf">
    <div class="wf-head">
      <div><div class="wf-title">Валовая выручка за год</div>
        <div class="wf-sub">${money(W.adr)} за ночь × 365 × загрузка ${W.occ.toString().replace('.', ',')}%</div></div>
      <div class="wf-track"><div class="wf-bar wf-gross" style="width:100%"></div></div>
      <div class="wf-big claim">${money(gross)}</div>
    </div>
    ${waterfallRows}
    <div class="wf-foot">
      <div><div class="wf-title">Остаётся владельцу</div>
        <div class="wf-sub">${Math.round(W.noi / gross * 100)}% валовой выручки</div></div>
      <div class="wf-track"><div class="wf-bar wf-net" style="width:${(W.noi / gross * 100).toFixed(1)}%"></div></div>
      <div class="wf-big fact">${money(W.noi)}</div>
    </div>
  </div>

  <div class="pair">
    <div class="b"><div class="k">Чистая доходность</div><div class="v">${pct(W.net)}</div>
      <div class="d">от полной цены входа ${money(W.entry)} — это цена объекта плюс оформление и меблировка</div></div>
    <div class="b"><div class="k">Срок окупаемости</div><div class="v">${Math.round(W.payback)}<span style="font-size:.42em;font-weight:400"> лет</span></div>
      <div class="d">при медианном сроке лизхолда ${W.lease} лет — объект не успевает вернуть вложенное</div></div>
  </div>

  <div class="note">
    <p><b>Расходы — не выдумка, а рыночные условия.</b> Управляющие компании Бали берут 13–20% от валовой
    выручки, площадки бронирования — 15–17%, операционные расходы съедают 10–15%. Для трёхспальной виллы
    базовые расходы — уборка, бассейн, сад, электричество — идут от 6,3 млн рупий в месяц независимо от того,
    сколько объект заработал: у ${W.floorShare}% вилл в расчёте сработал именно этот минимум, а не процент от выручки.</p>
  </div>

  <h3>Три сценария</h3>
  <p class="read">Сценарии различаются годовой загрузкой, комиссией управляющей компании, тем, кто платит
  налог на проживание, и включена ли мебель в цену. Показаны медианы по виллам.</p>
  <div class="scen">
    <div><div class="t">Пессимистичный</div><div class="n">${pct(D.scen.pessimistic_nonresident.villaNet)}</div>
      <div class="u">нерезидент · капитал не возвращается у ${D.scen.pessimistic_nonresident.noReturn}% объектов</div>
      <ul><li>загрузка 50%</li><li>управляющая компания 20%</li><li>налог на проживание на владельце</li><li>меблировка за свой счёт</li></ul></div>
    <div><div class="t">Реалистичный</div><div class="n">${pct(D.scen.realistic_nonresident.villaNet)}</div>
      <div class="u">нерезидент · ${pct(D.scen.realistic_resident.villaNet)} у резидента с местным ИНН</div>
      <ul><li>загрузка 60%</li><li>управляющая компания 17%</li><li>налог пополам с гостем</li><li>меблировка частично</li></ul></div>
    <div><div class="t">Оптимистичный</div><div class="n">${pct(D.scen.optimistic_resident.villaNet)}</div>
      <div class="u">резидент · ${pct(D.scen.optimistic_nonresident.villaNet)} у нерезидента</div>
      <ul><li>загрузка 70%</li><li>управляющая компания 15%</li><li>налог платит гость</li><li>мебель от застройщика</li></ul></div>
  </div>
  <p class="read" style="font-size:14.5px;color:var(--muted)">Твоя исходная развилка «50 на 50, 40 на 60, 30 на 70»
  в этой модели соответствует доле владельца в валовой выручке — 33%, 41% и 47% до подоходного налога.
  Рынок так и работает, просто эта доля складывается не из одной комиссии, а из шести строк расходов.</p>
</section>

<section>
  <div class="stamp"><b>B</b> Тест нарратива</div>
  <h2>Заявлено против посчитанного</h2>
  <p class="lede">У ${D.declaredN} объектов в базе застройщик указал ожидаемую доходность. Вот медиана
  заявленного против медианы того, что даёт расчёт по фактическим ставкам соседей.</p>

  <div class="pair">
    <div class="a"><div class="k">Заявляет застройщик</div><div class="v">${pct(D.declaredMed)}</div>
      <div class="d">медиана по ${D.declaredN} объектам, где доходность указана явно</div></div>
    <div class="b"><div class="k">Даёт расчёт</div><div class="v">${pct(D.scen.realistic_nonresident.villaNet)}</div>
      <div class="d">реалистичный сценарий, после комиссий, расходов и налогов</div></div>
  </div>

  <div class="note claimc">
    <p><b>Разрыв в 7 раз по медиане</b> — и он есть у 97% объектов с заявленной доходностью.
    Даже в предельно оптимистичном сценарии разрыв остаётся четырёхкратным. Заявленные цифры,
    судя по их величине, посчитаны от валовой выручки при загрузке под 90% — то есть до всех
    расходов и по ставке пикового сезона.</p>
  </div>

  <div class="scroll">
    <table>
      <caption>Наибольшие расхождения. Расчёт — реалистичный сценарий, нерезидент</caption>
      <thead><tr><th>Объект</th><th>Застройщик</th><th>Зона</th><th class="num">Цена</th>
        <th class="num">Заявлено</th><th class="num">Расчёт</th><th class="num">Разрыв</th></tr></thead>
      <tbody>${gapRows}</tbody>
    </table>
  </div>
</section>

<section>
  <div class="stamp"><b>C</b> Тест лизхолда</div>
  <h2>Почему доходность здесь считают неправильно</h2>
  <p class="lede">Медианный срок права аренды в базе — ${D.leaseMed} лет. По истечении объект возвращается
  владельцу земли. Значит доходность нужно мерить не годовым процентом, а тем, вернулись ли деньги за срок лиза.</p>

  <ul class="plain">
    <li><b>Годовой процент врёт на лизхолде.</b> При 30-летнем праве около 3,3% в год съедает амортизация
    самого права: объект не актив, а убывающий поток с нулём в конце.</li>
    <li><b>В реалистичном сценарии у ${D.scen.realistic_nonresident.noReturn}% объектов внутренняя доходность
    не считается вовсе</b> — сумма всех платежей за весь срок лиза меньше вложенного. Это не низкая доходность,
    это отрицательная.</li>
    <li><b>Даже в оптимистичном сценарии</b> — загрузка 70%, налог резидента, мебель от застройщика — капитал
    не возвращается у ${D.scen.optimistic_resident.noReturn}% объектов, а медианная внутренняя доходность
    составляет ${pct(D.scen.optimistic_resident.irr)}.</li>
  </ul>

  <div class="note warn">
    <p><b>Порог, зафиксированный до расчёта:</b> гособлигации Индонезии дают около 6,5% годовых без
    операционных хлопот, без валютного риска на входе и без истекающего права. Ни один сценарий
    по медиане к этому порогу не приближается.</p>
  </div>
</section>

<section>
  <div class="stamp"><b>D</b> Тест предложения</div>
  <h2>Сколько стока висит непроданным</h2>
  <p class="lede">Трекер отслеживает прайсы 126 комплексов — 4 938 юнитов. На срезе 20 августа 2026 года
  доступны 2 127 из них, это 43% и 454 млн долларов непроданного предложения на витрине.</p>

  <div class="note">
    <p><b>Это наблюдение, а не вывод — и вот почему.</b> Трекер запущен 18 августа 2026 года, поэтому
    доля проданного накоплена за разный срок у разных комплексов: сравнивать по ней скорость продаж нельзя.
    Часть выставленного продают не застройщики, а инвесторы. И 126 комплексов — это не весь остров.
    Что этот срез действительно показывает: масштаб непроданного остатка и то, что предложение
    концентрируется в Нуса-Дуа, Пандаве и Бату-Болонге.</p>
  </div>

  <p class="read">Более осмысленный сигнал даёт другое сопоставление: сколько объектов сейчас продаётся
  относительно того, сколько уже работает в аренде в той же зоне. В Сесехе — Чемаги новое предложение
  равно 64% действующей базы аренды, в Переренане — 39%, в Унгасане — Меласти — 29%. В Убуде, Умаласе и
  Падонане, где база аренды крупная, прирост измеряется единицами процентов.</p>
</section>

<section>
  <div class="stamp"><b>?</b> Прямой ответ</div>
  <h2>Возможна ли доходность 10–15% годовых</h2>
  <p class="lede">Как класс объектов — нет. Как единичное исключение — да, и вот в каком именно виде.</p>

  <div class="scroll">
    <table>
      <caption>Распределение чистой доходности. Доля объектов выше порогов</caption>
      <thead><tr><th>Срез</th><th class="num">p10</th><th class="num">p25</th><th class="num">медиана</th>
        <th class="num">p75</th><th class="num">p90</th><th class="num">p95</th>
        <th class="num">выше 6,5%</th><th class="num">выше 10%</th></tr></thead>
      <tbody>
        <tr><th scope="row">Виллы, реалистичный</th><td class="num">${pct(D.dist.villa_real.p10)}</td><td class="num">${pct(D.dist.villa_real.p25)}</td><td class="num strong">${pct(D.dist.villa_real.med)}</td><td class="num">${pct(D.dist.villa_real.p75)}</td><td class="num">${pct(D.dist.villa_real.p90)}</td><td class="num">${pct(D.dist.villa_real.p95)}</td><td class="num">${D.dist.villa_real.over65}%</td><td class="num">${D.dist.villa_real.over10}%</td></tr>
        <tr><th scope="row">Виллы, оптимистичный</th><td class="num">${pct(D.dist.villa_opt.p10)}</td><td class="num">${pct(D.dist.villa_opt.p25)}</td><td class="num strong">${pct(D.dist.villa_opt.med)}</td><td class="num">${pct(D.dist.villa_opt.p75)}</td><td class="num">${pct(D.dist.villa_opt.p90)}</td><td class="num">${pct(D.dist.villa_opt.p95)}</td><td class="num">${D.dist.villa_opt.over65}%</td><td class="num">${D.dist.villa_opt.over10}%</td></tr>
        <tr><th scope="row">Апартаменты, реалистичный</th><td class="num">${pct(D.dist.apartment_real.p10)}</td><td class="num">${pct(D.dist.apartment_real.p25)}</td><td class="num strong">${pct(D.dist.apartment_real.med)}</td><td class="num">${pct(D.dist.apartment_real.p75)}</td><td class="num">${pct(D.dist.apartment_real.p90)}</td><td class="num">${pct(D.dist.apartment_real.p95)}</td><td class="num">${D.dist.apartment_real.over65}%</td><td class="num">${D.dist.apartment_real.over10}%</td></tr>
        <tr><th scope="row">Апартаменты, оптимистичный</th><td class="num">${pct(D.dist.apartment_opt.p10)}</td><td class="num">${pct(D.dist.apartment_opt.p25)}</td><td class="num strong">${pct(D.dist.apartment_opt.med)}</td><td class="num">${pct(D.dist.apartment_opt.p75)}</td><td class="num">${pct(D.dist.apartment_opt.p90)}</td><td class="num">${pct(D.dist.apartment_opt.p95)}</td><td class="num">${D.dist.apartment_opt.over65}%</td><td class="num">${D.dist.apartment_opt.over10}%</td></tr>
      </tbody>
    </table>
  </div>

  <p class="read">В реалистичном сценарии доходность выше 10% дают ${D.dist.villa_real.over10}% вилл и
  ни один апартамент. В оптимистичном — ${D.dist.villa_opt.over10}% вилл. Чтобы медианная вилла давала
  10% годовых, её цена входа должна быть на 81% ниже текущей: не ${money(W.entry)}, а около 73 тысяч долларов.</p>

  <div class="note claimc">
    <p><b>Где доходность всё-таки высокая — там один и тот же профиль:</b> маленькая односпальная вилла
    ценой 80–150 тысяч долларов в зоне с крепкой ставкой аренды. Дело не в том, что такие объекты
    как-то особенно хорошо сдаются, а в том, что базовые расходы на виллу почти не зависят от её размера,
    и при низкой цене входа тот же денежный поток даёт совсем другой процент.</p>
  </div>

  <div class="scroll">
    <table>
      <caption>Лучшие объекты по расчётной доходности. Реалистичный сценарий, нерезидент</caption>
      <thead><tr><th>Объект</th><th>Тип</th><th>Зона</th><th class="num">Цена</th><th class="num">Спален</th>
        <th class="num">Ставка</th><th class="num">Реалист.</th><th class="num">Оптимист.</th><th class="num">Лиз</th></tr></thead>
      <tbody>${bestRows}</tbody>
    </table>
  </div>

  <h3>Чем дороже объект, тем хуже экономика</h3>
  <div class="scroll">
    <table>
      <caption>Доходность по ценовым корзинам. GRM — во сколько раз цена входа превышает годовую валовую выручку</caption>
      <thead><tr><th>Цена</th><th class="num">Объектов</th><th class="num">Чистая доходность</th>
        <th class="num">GRM</th><th class="num">Цена за м²</th></tr></thead>
      <tbody>${bucketRows}</tbody>
    </table>
  </div>
  <p class="read">Это ключевая находка по сегментам: цена за метр растёт с бюджетом, а арендная выручка —
  нет. Премиальный сегмент перегрет сильнее массового, потому что ставка аренды за виллу
  за 700 тысяч не вдвое выше, чем за виллу за 350.</p>
</section>

<section>
  <div class="stamp"><b>№</b> По зонам</div>
  <h2>Где на острове экономика лучше</h2>
  <p class="lede">Вердикт «рынок перегрет» слишком груб: разброс между зонами почти трёхкратный.
  Показан реалистичный сценарий для нерезидента; зоны с числом объектов меньше восьми исключены.</p>
  <div class="scroll">
    <table>
      <thead><tr><th>Зона</th><th class="num">Объектов</th><th class="num">Медцена</th><th class="num">За м²</th>
        <th class="num">Ставка</th><th class="num">Валовая</th><th class="num">Чистая</th><th class="num">Оптимист.</th>
        <th class="num">GRM</th><th class="num">Лиз</th><th class="num">Без возврата</th></tr></thead>
      <tbody>${zoneRows}</tbody>
    </table>
  </div>
  <p class="read" style="font-size:14.5px;color:var(--muted)">«Без возврата» — доля объектов зоны, у которых
  сумма всех арендных поступлений за срок лизхолда меньше вложенного капитала. Зоны с малым числом
  наблюдений — Улувату — Пекату, Санур, Умалас — это наблюдение, а не тенденция.</p>
</section>

<section>
  <div class="stamp"><b>±</b> Проверка на прочность</div>
  <h2>Что должно быть верно, чтобы этот вывод оказался неверным</h2>
  <p class="lede">Каждая строка — базовый расчёт с одним изменённым допущением. Вертикальная черта —
  базовый сценарий ${pct(BASE_SENS)}. Ни одна поблажка по отдельности не меняет картину.</p>

  <div class="sens">
    ${sensRows}
    <div class="sens-legend">
      <span><i class="swatch" style="background:var(--fact);opacity:.55"></i>доходность при изменённом допущении</span>
      <span><i class="swatch" style="background:var(--ink);opacity:.5;width:2px;height:15px;border-radius:0"></i>базовый сценарий ${pct(BASE_SENS)}</span>
    </div>
  </div>

  <div class="note warn">
    <p><b>Всё лучшее одновременно даёт 5,83%.</b> Загрузка 80%, ставка без дисконта, управляющая
    компания за 10%, половина броней напрямую мимо площадок, налоговый статус резидента, мебель от
    застройщика — и медиана по виллам всё равно остаётся ниже доходности индонезийских гособлигаций.
    Вывод о перегреве не держится на моих допущениях: он держится на соотношении цены и арендной ставки.</p>
  </div>

  <p class="read">Самое показательное здесь — что доходность почти не реагирует на загрузку.
  Даже если подставить сырые 90% из источника — те самые, которые я забраковал как завышенные, —
  получается 3,29%. Проблема не в операционной эффективности. Проблема в том, что цена объекта
  в 15–20 раз превышает его годовую валовую выручку. Чтобы выйти на 6,5% при загрузке 60%,
  объект должен сдаваться в 2,8 раза дороже своих соседей.</p>
</section>

<section>
  <div class="stamp"><b>→</b> Что с этим делать</div>
  <h2>Выводы, которые из этого следуют</h2>
  <ol class="steps">
    <li><b>Заявленная доходность на рынке не имеет отношения к экономике объекта.</b> Медиана заявленного
    выше расчётной в 7 раз. Если застройщик обещает 12–15%, он обещает либо валовую выручку при пиковой
    загрузке, либо гарантированную выплату из своего бюджета — а это уже вопрос не доходности объекта,
    а платёжеспособности застройщика.</li>
    <li><b>Лизхолд — главный необсуждаемый риск.</b> Не цена за метр, не конкуренция, не загрузка.
    При 25–30 годах права и текущих ценах большинство объектов физически не успевает вернуть вложенное.
    Это первое, что стоит проверять по конкретному объекту.</li>
    <li><b>Массовый сегмент экономически здоровее премиального.</b> Доходность падает с 2,14% в корзине
    до 150 тысяч до 1,19% в корзине от 700 тысяч, а цена за метр за то же время растёт с 3 377 до 4 133
    долларов. Дорогие объекты покупают не ради денежного потока.</li>
    <li><b>Покупка ради аренды и покупка ради жизни — разные решения.</b> Всё посчитанное выше относится
    только к первой. Объект, купленный для себя, не обязан окупаться, и претензии к его доходности
    к нему просто неприменимы.</li>
  </ol>
</section>

<footer>
  <h3>Как это посчитано и где может быть неправо</h3>
  <p><b>Данные.</b> ${D.n} объектов в продаже с ценой и координатами, из них ${D.villas} вилл и ${D.apts} апартаментов.
  Сопоставимые объекты аренды — 14 898 записей с суточной ставкой и координатами. Контроль — 1 485 объявлений
  помесячной аренды. Сток застройщиков — 126 комплексов, 4 938 юнитов. Всё, кроме внешних ориентиров, — из
  собственной базы проекта.</p>
  <p><b>Главная поправка.</b> Наблюдаемая загрузка в источнике — медиана 87–96% по зонам — измеряет, что дату
  нельзя забронировать, а не что её продали, и снята в августе, на пике сезона. Отраслевой ориентир по Бали —
  55–65% годовых. Поэтому из данных берётся позиция объекта относительно соседей, а уровень загрузки
  привязывается к внешнему якорю. Без этой поправки все цифры доходности выросли бы примерно вдвое —
  и были бы неверны.</p>
  <p><b>Контроль, который сошёлся.</b> Посуточная модель проверена помесячной арендой на одинаковых
  парах район плюс число спален: медиана отношения — 1,0–1,1. Валовая доходность, посчитанная двумя
  независимыми способами, дала 6–8% в обоих случаях.</p>
  <p><b>Чего расчёт не делает.</b> Не прогнозирует рост цен. Не учитывает возможную перепродажу до конца
  лизхолда — терминальная стоимость принята нулевой, что занижает результат для тех, кто планирует выход
  раньше срока. Не различает объекты по качеству внутри одного ценового уровня. Не учитывает гарантированные
  выплаты от застройщика, где они есть по договору.</p>
  <p><b>Где расчёт может ошибаться в сторону пессимизма.</b> Ставка аренды берётся от соседей по району
  и числу спален с потолком в 2,2 медианы: по-настоящему выдающийся объект модель недооценит.
  Подоходный налог применён к прибыли, а не к валовой выручке — при удержании с валовой доходность была бы ниже.</p>
  <p style="margin-top:22px;color:var(--muted)">Методология зафиксирована до расчёта:
  <code style="font-family:var(--mono);font-size:12.5px">reports/OVERHEAT_METHODOLOGY.md</code>.
  Расчётное ядро: <code style="font-family:var(--mono);font-size:12.5px">scripts/overheat/</code>.
  Срез данных — 20 августа 2026 года.</p>
</footer>

</div>`;

fs.writeFileSync(process.env.HOME + '/balinsky/reports/overheat-report.html', html);
console.log('written', html.length, 'bytes');
