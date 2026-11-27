// Печатает секретную ссылку на страницу съёмки. Нужен .env.local.
import { syomkaKey } from '../lib/syomka/access'

process.loadEnvFile('.env.local')
const key = syomkaKey()
if (!key) { console.error('Нет REVALIDATE_TOKEN в .env.local'); process.exit(1) }
console.log(`https://balinsky.info/syomka/${key}`)
