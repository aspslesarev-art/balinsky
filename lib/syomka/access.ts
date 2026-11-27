import { createHmac, timingSafeEqual } from 'node:crypto'

// Закрытая страница съёмки открывается только по ссылке /syomka/<ключ>.
// Ключ не лежит в репозитории (он публичный): выводится из серверного секрета
// REVALIDATE_TOKEN, который уже есть и локально, и на Vercel.
// Узнать ссылку: npx tsx scripts/syomka-link.ts

export function syomkaKey(): string | null {
  const base = process.env.SYOMKA_KEY?.trim() || process.env.REVALIDATE_TOKEN?.trim()
  if (!base) return null
  if (process.env.SYOMKA_KEY?.trim()) return base
  return createHmac('sha256', base).update('balinsky-syomka-v1').digest('hex').slice(0, 20)
}

export function isSyomkaKey(given: string): boolean {
  const key = syomkaKey()
  if (!key) return false
  const a = Buffer.from(given)
  const b = Buffer.from(key)
  return a.length === b.length && timingSafeEqual(a, b)
}
