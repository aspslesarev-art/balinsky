// Единая точка доступа к OpenAI для скриптов в scripts/.
//
// До 28.08.2026 скрипты ходили в Azure OpenAI (AZURE_OPENAI_*). Подписку
// закрыли, ключи отозвали — все такие скрипты падали с 401. Здесь та же
// схема, что в lib/openai.ts коммита e7bc1028: один клиент от OPENAI_API_KEY
// и одно место, где выбираются модели. Скрипты — .mjs и не могут импортировать
// .ts, поэтому схема скопирована, а не переиспользована.
//
// Env читается лениво (в момент вызова): большинство скриптов грузят
// .env.local уже ПОСЛЕ импортов, и константы на уровне модуля видели бы
// пустое окружение.
//
// Платные прогоны: владелец запрещает их без явного «ДА». Каждый скрипт,
// который ходит в платный API, зовёт requirePaid() ДО первого запроса — она
// печатает, сколько позиций уйдёт в работу, и без флага --yes-paid
// останавливает скрипт.

import OpenAI from 'openai'

/** Диалоги и разбор текста/фото. Переопределяется OPENAI_CHAT_MODEL. */
export function chatModel() {
  return process.env.OPENAI_CHAT_MODEL || 'gpt-5'
}

/**
 * Эмбеддинги. Ровно та же модель и размерность, что крутились на Azure и
 * лежат в Supabase. Намеренно НЕ берётся из env: другая модель или размерность
 * дала бы векторы из другого пространства, и семантический поиск молча
 * вернул бы мусор до полного пересчёта индекса.
 */
export const EMBEDDINGS_MODEL = 'text-embedding-3-large'
export const EMBEDDING_DIMS = 1536

/** Клиент OpenAI. Бросает, если ключа нет: скрипту лучше упасть громко. */
let _client = null
export function openaiClient() {
  if (_client) return _client
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY не задан (.env.local)')
  _client = new OpenAI({ apiKey })
  return _client
}

const isReasoningModel = (m) => /^(gpt-5|o\d)/.test(String(m || ''))

/**
 * Приводит параметры, писавшиеся под Azure gpt-5.4, к OpenAI:
 * - max_tokens → max_completion_tokens;
 * - у reasoning-моделей (gpt-5*, o*) убираются temperature/top_p — они их не
 *   принимают (400), ставится reasoning_effort 'low' (как в lib/market/llm.ts),
 *   а к лимиту ответа добавляется запас на рассуждение: иначе тесный лимит
 *   съедается мыслями и ответ приходит пустым. Платится только реально
 *   потраченное, так что запас сам по себе не дорожает.
 */
export function chatParams(params) {
  const p = { ...params }
  if (p.max_tokens != null && p.max_completion_tokens == null) p.max_completion_tokens = p.max_tokens
  delete p.max_tokens
  if (isReasoningModel(p.model)) {
    delete p.temperature
    delete p.top_p
    if (p.reasoning_effort == null) p.reasoning_effort = 'low'
    if (p.max_completion_tokens != null) p.max_completion_tokens += 2048
  }
  return p
}

/** chat.completions.create с chatParams(); model по умолчанию — chatModel(). */
export function chat(params) {
  return openaiClient().chat.completions.create(chatParams({ model: chatModel(), ...params }))
}

/**
 * Эмбеддинги пачкой: text-embedding-3-large @1536. Проверяет размерность
 * ответа — несовпадение значит, что что-то пошло не так, и писать такие
 * векторы в индекс нельзя.
 */
export async function embed(texts) {
  const r = await openaiClient().embeddings.create({
    model: EMBEDDINGS_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMS,
  })
  for (const d of r.data) {
    if (d.embedding.length !== EMBEDDING_DIMS) {
      throw new Error(`embedding dims ${d.embedding.length} != ${EMBEDDING_DIMS}`)
    }
  }
  return r
}

export const YES_PAID_FLAG = '--yes-paid'
export const hasYesPaid = () => process.argv.includes(YES_PAID_FLAG)

/**
 * Гард платного прогона. Печатает оценку объёма и без --yes-paid
 * останавливает процесс (код 2) — до единого запроса в платный API.
 *
 * @param {object} o
 * @param {string} o.what   что именно будет сделано («тексты почему для юнитов»)
 * @param {number|string} o.items  сколько позиций уйдёт в платный API
 * @param {string} [o.api]  куда пойдут запросы (по умолчанию OpenAI)
 */
export function requirePaid({ what, items, api = 'OpenAI' }) {
  console.log(`\n[ПЛАТНО] ${what}: позиций к отправке в ${api} — ${items}`)
  if (items === 0) {
    console.log('[ПЛАТНО] отправлять нечего — запросов не будет\n')
    return
  }
  if (hasYesPaid()) {
    console.log(`[ПЛАТНО] флаг ${YES_PAID_FLAG} есть — запускаю\n`)
    return
  }
  console.log(`[ПЛАТНО] остановлено до запросов. Платный прогон — только после «ДА» владельца, флагом ${YES_PAID_FLAG}\n`)
  process.exit(2)
}
