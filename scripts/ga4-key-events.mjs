// Помечает события сайта ключевыми в GA4 (Admin API).
//
// Зачем скрипт, а не пара кликов: в интерфейсе GA4 звёздочку «ключевое
// событие» можно поставить только тому событию, которое уже попало в список
// «Недавние события» — а список обновляется раз в сутки. Наши пять событий
// (см. lib/analytics.ts) деплоились 25.08.2026 и в момент разбора ещё не
// показывались, поэтому пометить их в UI было нечем. Admin API принимает
// произвольное имя и создаёт ключевое событие заранее — дальше GA4 считает
// конверсии с первого же срабатывания.
//
// Разовая авторизация (тем же аккаунтом, что владеет ресурсом GA4):
//   gcloud auth application-default login \
//     --scopes=https://www.googleapis.com/auth/analytics.edit,https://www.googleapis.com/auth/cloud-platform
//
// Запуск:
//   node scripts/ga4-key-events.mjs            # создать недостающие
//   node scripts/ga4-key-events.mjs --list     # только показать текущие

import fs from 'node:fs'

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '542127523'

// Ровно те события, что шлёт lib/analytics.ts. Держать списки синхронными:
// событие, не помеченное ключевым, не попадает в «Ключевые события» и в
// отчёты по конверсиям — именно из-за этого 1 434 сеанса дали 5 конверсий,
// причём все пять пришли от автособытий GA4, а не от действий на сайте.
const KEY_EVENTS = [
  'generate_lead',
  'lead_form_open',
  'telegram_contact',
  'wishlist_add',
  'presentation_open',
]

const ADC_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || `${process.env.HOME}/.config/gcloud/application_default_credentials.json`

const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }

async function getAccessToken() {
  const adc = readJson(ADC_FILE)
  if (adc?.type !== 'authorized_user') {
    console.error('\n✗ Нет пользовательских учётных данных. Выполните один раз:')
    console.error('    gcloud auth application-default login \\')
    console.error('      --scopes=https://www.googleapis.com/auth/analytics.edit,https://www.googleapis.com/auth/cloud-platform\n')
    process.exit(1)
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: adc.client_id,
      client_secret: adc.client_secret,
      refresh_token: adc.refresh_token,
    }),
  })
  const j = await res.json()
  if (!res.ok || !j.access_token) {
    console.error('\n✗ Не удалось получить токен:', JSON.stringify(j))
    console.error('  Скорее всего нужен повторный вход — команда в шапке файла.\n')
    process.exit(1)
  }
  return j.access_token
}

const BASE = `https://analyticsadmin.googleapis.com/v1beta/properties/${PROPERTY_ID}/keyEvents`

async function listKeyEvents(token) {
  const r = await fetch(`${BASE}?pageSize=200`, { headers: { Authorization: `Bearer ${token}` } })
  const j = await r.json()
  if (!r.ok) throw new Error(`list ${r.status}: ${JSON.stringify(j).slice(0, 300)}`)
  return j.keyEvents ?? []
}

async function createKeyEvent(token, eventName) {
  const r = await fetch(BASE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    // ONCE_PER_EVENT: заявка, отправленная дважды за сеанс, — это две заявки.
    body: JSON.stringify({ eventName, countingMethod: 'ONCE_PER_EVENT' }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`create ${eventName} → ${r.status}: ${JSON.stringify(j).slice(0, 300)}`)
  return j
}

const token = await getAccessToken()
const existing = await listKeyEvents(token)
const names = new Set(existing.map(e => e.eventName))

console.log(`Ресурс GA4: ${PROPERTY_ID}`)
console.log(`Сейчас ключевых событий: ${existing.length}`)
for (const e of existing) console.log(`  • ${e.eventName}${e.custom ? '' : ' (создано GA4)'}`)

if (process.argv.includes('--list')) process.exit(0)

const missing = KEY_EVENTS.filter(n => !names.has(n))
if (missing.length === 0) {
  console.log('\nВсе события сайта уже помечены ключевыми — делать нечего.')
  process.exit(0)
}

console.log(`\nСоздаю недостающие (${missing.length}):`)
for (const name of missing) {
  try {
    await createKeyEvent(token, name)
    console.log(`  ✓ ${name}`)
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`)
  }
}
console.log('\nГотово.')
