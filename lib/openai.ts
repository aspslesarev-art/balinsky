// Единая точка доступа к OpenAI.
//
// До 28.08.2026 весь ИИ проекта ходил в Azure OpenAI. Подписку закрыли, ключи
// отозвали — и всё, что на неё опиралось, начало падать с 401: Балина в
// Telegram, голосовой виджет, эмбеддинги семантического поиска, расшифровка
// голосовых, генерация текстов в админке. Фолбэка ни у кого не было, поэтому
// поломка проявлялась молча, каждым сервисом по отдельности.
//
// Здесь один клиент и одно место, где выбираются модели: следующая смена
// провайдера или модели — правка этого файла, а не десяти вызовов.

import OpenAI from 'openai'

/** Диалоги: Балина в Telegram и в голосовом виджете, генерация в админке. */
export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? 'gpt-5'

/**
 * Эмбеддинги. Модель та же, что крутилась на Azure, — иначе несовместимая
 * размерность обнулила бы уже посчитанные векторы в Supabase.
 */
export const EMBEDDINGS_MODEL = process.env.OPENAI_EMBEDDINGS_MODEL ?? 'text-embedding-3-large'

/** Расшифровка голосовых сообщений. */
export const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-transcribe'

/**
 * Клиент или `null`, если ключа нет.
 *
 * Возвращает null, а не бросает: вызывающие места — фоновые обработчики бота
 * и виджеты, которым лучше вежливо промолчать, чем уронить весь запрос.
 */
export function openaiClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}
