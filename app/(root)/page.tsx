// Root entry point: pick a locale and forward.
//
// Behaviour: if the visitor's Accept-Language header lists Russian
// (`ru`, `ru-RU`, `ru-BY`, …) before any other language, we send
// them to /ru. Everyone else — Polish, Indonesian, English-only,
// pure ASCII bots — lands on /en. This matches the brief:
// "если не русский, во всех остальных случаях — английский".
//
// We only inspect the FIRST language the browser advertises. The
// Accept-Language header is sorted by user preference, so checking
// the top entry mirrors what the visitor actually wants without
// getting tangled in q-value parsing edge cases.

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default async function RootPage() {
  const h = await headers()
  const accept = h.get('accept-language') ?? ''
  const top = accept.split(',')[0]?.trim().toLowerCase() ?? ''
  // `ru` matches "ru", "ru-RU", "ru-BY", "ru-UA". Anything else is EN.
  const isRussian = top.startsWith('ru')
  redirect(isRussian ? '/ru' : '/en')
}
