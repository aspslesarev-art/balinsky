#!/usr/bin/env node
// One-off: renders a human-review page for the credit-burn batch jobs.
// Reads the Storage manifests and writes a single self-contained HTML file.
// Usage: node scripts/_tmp-review-page.mjs <out.html>

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './_kb-build.mjs'

loadEnv()
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const OUT = process.argv[2] ?? 'review.html'
const KINDS = [
  { kind: 'вилла', bucket: 'villa-photos' },
  { kind: 'апартаменты', bucket: 'apartment-photos' },
  { kind: 'ЖК', bucket: 'complex-photos' },
]
const SAMPLES_PER_KIND = 6

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

async function grab(bucket, key) {
  const { data, error } = await sb.storage.from(bucket).download(key)
  if (error) return {}
  try { return JSON.parse(await data.text()) } catch { return {} }
}

const stats = { total: 0, coverMoved: 0, rejPhotos: 0, mismatch: 0, texts: 0, reasons: {} }
const sections = []

for (const { kind, bucket } of KINDS) {
  const [vision, texts, textsPro, photos] = await Promise.all([
    grab(bucket, '_vision.json'), grab(bucket, '_texts.json'), grab(bucket, '_texts-pro.json'), grab(bucket, '_manifest.json'),
  ])
  const ids = Object.keys(vision).filter(id => vision[id]?.audit)
  for (const id of ids) {
    const a = vision[id].audit
    stats.total++
    if (a.cover !== 0) stats.coverMoved++
    if (a.mismatch?.flag) stats.mismatch++
    for (const r of a.reject ?? []) { stats.rejPhotos++; stats.reasons[r.reason] = (stats.reasons[r.reason] ?? 0) + 1 }
  }
  stats.texts += Object.keys(texts).length

  // Show the most interesting cases first: mismatches, then heavy rejects.
  const score = id => (vision[id].audit.mismatch?.flag ? 100 : 0) + (vision[id].audit.reject?.length ?? 0)
  // Listings that have a pro text come first — they are the ones worth comparing.
  const rank = id => (textsPro[id] ? 1000 : 0) + score(id)
  const picked = ids.filter(id => (photos[id]?.length ?? 0) > 1).sort((x, y) => rank(y) - rank(x)).slice(0, SAMPLES_PER_KIND)

  const cards = picked.map(id => {
    const a = vision[id].audit
    const urls = photos[id] ?? []
    const rejMap = new Map((a.reject ?? []).map(r => [r.i, r.reason]))
    const thumbs = urls.slice(0, 12).map((u, i) => {
      const isCover = i === a.cover
      const rej = rejMap.get(i)
      const tag = isCover ? '<b class="cv">обложка</b>' : rej ? `<b class="rj">${esc(rej)}</b>` : ''
      return `<figure class="${isCover ? 'cover' : rej ? 'rej' : ''}"><img loading="lazy" src="${esc(u)}" alt=""><figcaption>${i}${tag ? ' ' + tag : ''}</figcaption></figure>`
    }).join('')
    const render = (t, label) => {
      const v = t?.variants?.[t.best]
      if (!v) return ''
      return `<div class="txt"><p class="tag">${esc(label)}</p><h4>${esc(v.title)}</h4><p class="meta">${esc(v.meta)}</p><p class="lead">${esc(v.lead)}</p>${(v.body ?? []).map(p => `<p>${esc(p)}</p>`).join('')}<details><summary>FAQ (${(v.faq ?? []).length})</summary>${(v.faq ?? []).map(f => `<p><b>${esc(f.q)}</b><br>${esc(f.a)}</p>`).join('')}</details><p class="src">${esc(t.model)}, выбран вариант ${t.best} из ${t.variants.length} — ${esc(t.judge_reason)}</p></div>`
    }
    const std = render(texts[id], 'обычная модель · ~$0.05')
    const pro = render(textsPro[id], 'pro · ~$2.80')
    const textBlock = std || pro
      ? `<div class="cmp">${std}${pro}</div>`
      : '<div class="txt none">текст ещё не сгенерирован</div>'
    const warn = a.mismatch?.flag ? `<p class="warn">⚠ фото не бьётся с описанием: ${esc(a.mismatch.note)}</p>` : ''
    return `<article><h3>${esc(kind)} · ${esc(id)}</h3>${warn}<p class="why">обложка №${a.cover} — ${esc(a.cover_reason)}</p><div class="ph">${thumbs}</div>${textBlock}</article>`
  }).join('')

  sections.push(`<section><h2>${esc(kind)}</h2>${cards}</section>`)
}

const reasonRows = Object.entries(stats.reasons).sort((a, b) => b[1] - a[1])
  .map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join('')

// Without an explicit charset the local static server sends no encoding hint
// and the browser falls back to latin-1, turning every Cyrillic word to mojibake.
fs.writeFileSync(OUT, `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Balinsky — ночной прогон на Azure-кредитах</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#111;--mut:#666;--line:#e5e5e5;--acc:#0a7;--bad:#c33}
@media(prefers-color-scheme:dark){:root{--bg:#111;--fg:#eee;--mut:#999;--line:#333}}
:root[data-theme=dark]{--bg:#111;--fg:#eee;--mut:#999;--line:#333}
:root[data-theme=light]{--bg:#fff;--fg:#111;--mut:#666;--line:#e5e5e5}
body{background:var(--bg);color:var(--fg);font:16px/1.6 -apple-system,system-ui,sans-serif;margin:0 auto;padding:24px;max-width:1000px}
h1{font-size:28px;margin:0 0 4px}h2{margin:40px 0 12px;border-bottom:2px solid var(--line);padding-bottom:6px}
article{border:1px solid var(--line);border-radius:12px;padding:16px;margin:16px 0}
h3{margin:0 0 8px;font-size:15px;color:var(--mut);font-weight:600}
.ph{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px}
figure{margin:0;flex:0 0 130px}figure img{width:130px;height:90px;object-fit:cover;border-radius:8px;display:block;border:3px solid transparent}
figure.cover img{border-color:var(--acc)}figure.rej img{border-color:var(--bad);opacity:.45}
figcaption{font-size:11px;color:var(--mut)}.cv{color:var(--acc)}.rj{color:var(--bad)}
.why{font-size:13px;color:var(--mut);margin:0 0 10px}.warn{color:var(--bad);font-size:14px;margin:0 0 8px}
.txt{border-top:1px solid var(--line);margin-top:12px;padding-top:12px}.txt h4{margin:0 0 4px;font-size:18px}
.meta{color:var(--mut);font-size:13px;margin:0 0 10px}.lead{font-weight:600}
.src{font-size:12px;color:var(--mut)}.none{color:var(--mut);font-style:italic}
.cmp{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:820px){.cmp:has(.txt+.txt){grid-template-columns:1fr 1fr}}
.tag{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--acc);margin:0 0 6px;font-weight:700}
table{border-collapse:collapse;margin:8px 0;display:block;overflow-x:auto}td{border:1px solid var(--line);padding:4px 10px}
.kpi{display:flex;gap:20px;flex-wrap:wrap;margin:16px 0}.kpi div{border:1px solid var(--line);border-radius:10px;padding:10px 16px}
.kpi b{display:block;font-size:24px}
</style>
<h1>Ночной прогон на сгорающих Azure-кредитах</h1>
<p style="color:var(--mut)">Ничего из этого ещё не опубликовано на сайте — всё лежит в манифестах Storage и ждёт решения.</p>
<div class="kpi">
<div><b>${stats.total}</b>листингов с аудитом фото</div>
<div><b>${stats.coverMoved}</b>сменили бы обложку</div>
<div><b>${stats.rejPhotos}</b>фото под отбраковку</div>
<div><b>${stats.mismatch}</b>расхождений с описанием</div>
<div><b>${stats.texts}</b>переписанных текстов</div>
</div>
<table><tr><td><b>причина отбраковки</b></td><td><b>фото</b></td></tr>${reasonRows}</table>
${sections.join('')}
`)
console.log(`written ${OUT} — ${stats.total} audited, ${stats.texts} texts`)
