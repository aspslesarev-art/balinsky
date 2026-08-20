// Перегрет ли рынок новостроя Бали — расчётное ядро.
// Методология: reports/OVERHEAT_METHODOLOGY.md
// Принцип: из наших данных берём ПОЗИЦИОНИРОВАНИЕ объекта, а уровень
// загрузки привязываем к внешнему якорю — наблюдаемая occupancy снята
// в августе (пик) и меряет «дату нельзя забронировать», а не продажи.
import fs from 'fs';

const ENV_PATH = process.env.HOME + '/balinsky/.env.local';
fs.readFileSync(ENV_PATH, 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_KEY;
const H = { apikey: K, Authorization: 'Bearer ' + K };

// ─── Параметры сценариев ────────────────────────────────────────────────
// Якорь годовой загрузки: индустриальный коридор Бали 55–65%, топ ЗТ 70–80%.
// Реализация ADR: rack rate с booking выше фактически полученной ставки
// (скидки за длинное проживание, промо, ранние брони).
// opexFloor: базовые расходы виллы не зависят от выручки. По замеру
// Bukit Vista для 3-спальной виллы в Улувату core-расходы (уборка,
// бассейн/сад, расходники, свет/вода, газ) = IDR 6,3–9,5 млн/мес,
// т.е. ~$390–590/мес. Формула base + perBed × спальни калибрована на
// этот коридор. Для апартаментов ниже: нет своего бассейна и сада,
// часть расходов сидит в service charge комплекса.
// phrOnOwner: 10% PHR платит гость сверху, если ставка объявлена без
// налога, и владелец, если налог зашит в цену. Реальность посередине.
const SCENARIOS = {
  pessimistic: { occAnchor: 50, adrRealization: 0.85, mgmt: 0.20, opex: 0.15, ffe: 0.05, furnishPerM2: 130, phrOnOwner: 1.0,  opexFloor: { villa: [1800, 1700], apartment: [1100, 1000] } },
  realistic:   { occAnchor: 60, adrRealization: 0.90, mgmt: 0.17, opex: 0.12, ffe: 0.04, furnishPerM2: 80,  phrOnOwner: 0.5,  opexFloor: { villa: [1500, 1400], apartment: [900, 850] } },
  optimistic:  { occAnchor: 70, adrRealization: 0.95, mgmt: 0.15, opex: 0.10, ffe: 0.03, furnishPerM2: 0,   phrOnOwner: 0.0,  opexFloor: { villa: [1200, 1100], apartment: [700, 650] } },
};
const OTA = 0.16;          // канальная комиссия booking/airbnb 15–17%
const PHR = 0.10;          // местный налог на проживание с gross
const CLOSING = 0.05;      // BPHTB + нотариус + оформление
const PPH = { nonresident: 0.20, resident: 0.10 };
const OCC_CLIP = [35, 85]; // за пределами коридора зональная поправка не осмысленна
const MIN_COMPS = 8;
const RADII = [1000, 2000, 3000];
const IDN_BOND = 6.5;      // доходность гособлигаций Индонезии — порог ценового перегрева

// ─── Утилиты ────────────────────────────────────────────────────────────
const med = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const clip = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));
const num = v => { const n = Number(Array.isArray(v) ? v[0] : v); return Number.isFinite(n) ? n : null; };

async function fetchAll(table, select) {
  let out = [], from = 0;
  for (;;) {
    const r = await fetch(`${U}/rest/v1/${table}?select=${select}`, { headers: { ...H, Range: `${from}-${from + 999}` } });
    const j = await r.json();
    if (!Array.isArray(j) || !j.length) break;
    out = out.concat(j);
    if (j.length < 1000) break;
    from += 1000;
  }
  return out;
}

const EARTH_R = 6371000;
function distM(la1, lo1, la2, lo2) {
  const dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(a));
}

// IRR методом бисекции по потоку [-C0, NOI, NOI, ...] длиной N лет.
// Терминальная стоимость leasehold на конец срока = 0: право истекает.
function irr(c0, noi, years) {
  if (noi <= 0) return null;
  if (noi * years <= c0) return null; // капитал не возвращается вообще
  const npv = r => { let v = -c0; for (let t = 1; t <= years; t++) v += noi / (1 + r) ** t; return v; };
  let lo = -0.99, hi = 1.0;
  if (npv(hi) > 0) return hi * 100;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (npv(mid) > 0) lo = mid; else hi = mid; }
  return ((lo + hi) / 2) * 100;
}

// ─── Загрузка ───────────────────────────────────────────────────────────
console.error('loading…');
const [villas, apts, compsRaw] = await Promise.all([
  fetchAll('raw_villas', 'airtable_id,data'),
  fetchAll('raw_apartments', 'airtable_id,data'),
  fetchAll('booking_market_relative', 'id,title,unit_kind,bedrooms,lat,lng,zone,adr,occupancy'),
]);
const comps = compsRaw.filter(c => c.lat && c.lng && c.adr > 0 && c.occupancy != null);
console.error(`villas=${villas.length} apts=${apts.length} comps=${comps.length}`);

// Зональные медианы наблюдаемой загрузки — используются ТОЛЬКО как
// относительный вес зоны, не как абсолютная величина.
const zoneOcc = {};
comps.forEach(c => { if (c.zone) (zoneOcc[c.zone] ??= []).push(c.occupancy); });
const zoneOccMed = Object.fromEntries(Object.entries(zoneOcc).map(([z, a]) => [z, med(a)]));
const baliOccMed = med(comps.map(c => c.occupancy));
console.error('bali observed occ median =', baliOccMed);

// ─── Нормализация объектов продажи ──────────────────────────────────────
function normalize(row, kind) {
  const d = row.data || {};
  const price = num(d['Цена']) ?? num(d.price_usd) ?? num(d.price);
  const lat = num(d['Geo']), lng = num(d['Geo 2']);
  if (!price || !lat || !lng) return null;
  let declared = num(d['Заявленная доходность']);
  if (declared != null) declared = declared <= 1 ? declared * 100 : declared; // база смешанная: 0.119 и 12
  const status = Array.isArray(d['Статус']) ? d['Статус'][0] : d['Статус'];
  const deal = d['Тип сделки'] || null;
  return {
    id: row.airtable_id, kind,
    title: d['title'] || d['Name'] || row.airtable_id,
    price, lat, lng,
    area: num(d['Площадь']),
    beds: num(d['Комнаты']),
    lease: num(d['Leasehold']) ?? num(d['Leashold']),
    status: status ?? null,
    isResale: deal === 'Вторичка',
    declared,
    location: (Array.isArray(d['Location 2']) ? d['Location 2'][0] : d['Location 2']) || (Array.isArray(d['Location']) ? d['Location'][0] : d['Location']) || null,
    developer: d['Developer1'] || null,
    complex: d['Комплекс 1'] || null,
  };
}
const objects = [...villas.map(r => normalize(r, 'villa')), ...apts.map(r => normalize(r, 'apartment'))].filter(Boolean);
console.error('objects with price+geo:', objects.length);

// ─── Подбор сопоставимых ────────────────────────────────────────────────
const COMP_KINDS = { villa: new Set(['villa', 'house']), apartment: new Set(['apartment', 'aparthotel']) };
function findComps(o) {
  const allowed = COMP_KINDS[o.kind];
  for (const R of RADII) {
    const near = comps.filter(c => {
      if (!allowed.has(c.unit_kind)) return false;
      if (o.beds != null && c.bedrooms != null && Math.abs(c.bedrooms - o.beds) > 1) return false;
      return distM(o.lat, o.lng, c.lat, c.lng) <= R;
    });
    if (near.length >= MIN_COMPS) return { near, radius: R };
  }
  return null;
}

// ─── Расчёт одного объекта в одном сценарии ─────────────────────────────
function evaluate(o, cmp, scenName, taxKey) {
  const S = SCENARIOS[scenName];
  const adrs = cmp.near.map(c => c.adr).sort((a, b) => a - b);
  const adrMed = med(adrs);
  // Хвост распределения ADR — это luxury-резорты, куда новострой-вилла
  // не попадает даже в верхнем ценовом дециле. Держим ставку в коридоре
  // вокруг медианы района, иначе один Bulgari тянет всю зону наверх.
  const adrPosRaw = adrs[Math.min(adrs.length - 1, Math.floor(adrs.length * (o.pricePct ?? 0.5)))];
  const adrPos = clip(adrPosRaw, [adrMed * 0.65, adrMed * 2.2]);
  const adr = adrPos * S.adrRealization;

  // Загрузка: якорь сценария, взвешенный относительной силой зоны.
  const zone = mode(cmp.near.map(c => c.zone).filter(Boolean));
  const zFactor = zone && zoneOccMed[zone] ? zoneOccMed[zone] / baliOccMed : 1;
  const occ = clip(clip(S.occAnchor * zFactor, [S.occAnchor - 15, S.occAnchor + 15]), OCC_CLIP);

  const gross = adr * 365 * (occ / 100);
  const [floorBase, floorPerBed] = S.opexFloor[o.kind];
  const opexAbs = Math.max(gross * S.opex, floorBase + floorPerBed * (o.beds ?? 2));
  const costOta  = gross * OTA;
  const costPhr  = gross * PHR * S.phrOnOwner;
  const costMgmt = gross * S.mgmt;
  const costFfe  = gross * S.ffe;
  const preTax   = gross - costOta - costPhr - costMgmt - opexAbs - costFfe;
  const noi      = preTax > 0 ? preTax * (1 - PPH[taxKey]) : preTax;

  const furnish = o.area ? o.area * S.furnishPerM2 : 0;
  const entry = o.price * (1 + CLOSING) + furnish;

  const netYield = noi / entry * 100;
  const grossYield = gross / entry * 100;
  const lease = o.lease && o.lease > 0 ? o.lease : null;
  const leaseIrr = lease ? irr(entry, noi, lease) : null;
  const payback = noi > 0 ? entry / noi : null;

  return {
    scenario: scenName, tax: taxKey, zone, comps: cmp.near.length, radius: cmp.radius,
    adrMed: Math.round(adrMed), adrPos: Math.round(adrPos), pricePct: +(o.pricePct ?? 0.5).toFixed(2),
    adr: Math.round(adr), occ: +occ.toFixed(1),
    gross: Math.round(gross), opexAbs: Math.round(opexAbs), opexIsFloor: opexAbs > gross * S.opex,
    preTax: Math.round(preTax), noi: Math.round(noi), entry: Math.round(entry), furnish: Math.round(furnish),
    grossYield: +grossYield.toFixed(2), netYield: +netYield.toFixed(2),
    grm: +(entry / gross).toFixed(1),
    payback: payback ? +payback.toFixed(1) : null,
    leaseYears: lease, leaseIrr: leaseIrr != null ? +leaseIrr.toFixed(2) : null,
  };
}
function mode(arr) { const c = {}; let best = null, n = 0; arr.forEach(v => { c[v] = (c[v] || 0) + 1; if (c[v] > n) { n = c[v]; best = v; } }); return best; }

const skipped = [];
// ─── Первый проход: определяем зону и позицию объекта по цене ───────────
// Рынок аренды и рынок продажи ранжируют объекты примерно одинаково:
// вилла из верхнего дециля по цене за м² сдаётся не по медианной ставке
// района, а по верхней. Без этой поправки модель системно занижает
// выручку премиального сегмента и завышает — бюджетного.
const prepared = [];
for (const o of objects) {
  const cmp = findComps(o);
  if (!cmp) { skipped.push({ id: o.id, kind: o.kind, reason: 'no_comps' }); continue; }
  const zone = mode(cmp.near.map(c => c.zone).filter(Boolean));
  prepared.push({ o, cmp, zone, perM2: o.area ? o.price / o.area : null });
}
const zonePerM2 = {};
prepared.forEach(p => { if (p.perM2 && p.zone) (zonePerM2[`${p.zone}|${p.o.kind}`] ??= []).push(p.perM2); });
Object.values(zonePerM2).forEach(a => a.sort((x, y) => x - y));
function pricePercentile(p) {
  const arr = zonePerM2[`${p.zone}|${p.o.kind}`];
  if (!p.perM2 || !arr || arr.length < 8) return 0.5;
  const below = arr.filter(v => v < p.perM2).length;
  return clip(below / arr.length, [0.25, 0.90]); // хвосты обрезаем: там шум
}

// ─── Прогон ─────────────────────────────────────────────────────────────
const results = [];
for (const p of prepared) {
  const o = p.o, cmp = p.cmp;
  o.pricePct = pricePercentile(p);
  const row = { ...o, scen: {} };
  for (const s of Object.keys(SCENARIOS)) {
    row.scen[s] = { nonresident: evaluate(o, cmp, s, 'nonresident'), resident: evaluate(o, cmp, s, 'resident') };
  }
  row.zone = row.scen.realistic.nonresident.zone;
  results.push(row);
}
console.error(`evaluated=${results.length} skipped=${skipped.length}`);

fs.writeFileSync(process.env.HOME + '/balinsky/reports/overheat-raw.json', JSON.stringify({
  generatedAt: new Date().toISOString(),
  params: { SCENARIOS, OTA, PHR, CLOSING, PPH, MIN_COMPS, RADII, IDN_BOND, baliOccMed, zoneOccMed },
  evaluated: results.length, skipped: skipped.length,
  results,
}, null, 1));
console.error('written reports/overheat-raw.json');
