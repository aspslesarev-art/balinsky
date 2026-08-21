// Рубильник онлайн-консультанта (Балина).
//
// false — чат выключен по всему сайту: плавающий виджет не монтируется,
// кнопки «спросить Балину» не рендерятся, а платные эндпоинты (/api/chat,
// /api/tts, /api/transcribe, /api/convai/*) сразу отдают 410 и не ходят
// в Azure OpenAI / ElevenLabs, то есть не тратят деньги.
//
// Код виджета, промпты и админка (/admin/balina, /admin/chats) остаются
// на месте — вернуть консультанта = поставить здесь true.
export const CONSULTANT_ENABLED: boolean = false

/** Единый ответ выключенных эндпоинтов консультанта. */
export function consultantDisabledResponse(): Response {
  return new Response(JSON.stringify({ error: 'consultant_disabled' }), {
    status: 410,
    headers: { 'content-type': 'application/json' },
  })
}
