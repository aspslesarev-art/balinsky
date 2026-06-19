#!/usr/bin/env node
// Smoke-test kb_search quality across kinds with realistic investor queries.
import { createClient } from '@supabase/supabase-js'
import { AzureOpenAI } from 'openai'
import { loadEnv } from './_kb-build.mjs'
loadEnv()
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ai = new AzureOpenAI({ apiKey: process.env.AZURE_OPENAI_API_KEY, endpoint: process.env.AZURE_OPENAI_ENDPOINT, apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview' })
const EMBED = process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT ?? 'text-embedding-3-large'

async function search(q, kinds, n = 5) {
  const r = await ai.embeddings.create({ model: EMBED, input: [q], dimensions: 1536 })
  const lit = '[' + r.data[0].embedding.join(',') + ']'
  const { data, error } = await sb.rpc('kb_search', { query_embedding: lit, match_count: n, kinds: kinds ?? null })
  if (error) { console.log('  ERR', error.message); return }
  console.log(`\n### "${q}"  ${kinds ? '['+kinds.join(',')+']' : ''}`)
  for (const h of data) console.log(`  [${h.kind}] ${h.title}  (d=${h.distance.toFixed(3)})  ${h.meta?.district ?? ''} ${h.meta?.price_usd ? '$'+h.meta.price_usd : ''}`)
}

await search('вилла под посуточную аренду в Чангу до 400 тысяч с бассейном')
await search('тихий район для семьи с детьми, недалеко от океана')
await search('самый надёжный застройщик с хорошей репутацией', ['developer'])
await search('снять виллу на месяц в Убуде с кабинетом для удалёнки', ['rental'])
await search('где дешевле всего войти в рынок Бали, медианные цены по районам', ['district', 'market'])
await search('апартаменты-студия для инвестиций под сдачу, бюджетно', ['apartment'])
console.log('\ndone')
