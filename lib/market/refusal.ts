// Память отказа: источник, в котором модель не нашла юнитов («это не
// прайс, а описание комплекса»), не должен отправляться к ней снова,
// пока сама страница не изменилась. Раньше такие ссылки ходили к модели
// каждый день и давали почти все расходы трекера на OpenAI.

import type { SourceLayout, TextCache } from './types'

export class KnownRefusalError extends Error {
  constructor(message: string, readonly layout: SourceLayout, readonly fingerprint: string) {
    super(message)
  }
}

const REFUSAL = /^(страница не содержит объектов|лист не разбирается)/

export function isRefusalMessage(message: string): boolean {
  return REFUSAL.test(message)
}

// Обёртка вокруг чтения текста моделью: тот же текст, что уже был
// отвергнут, — сразу та же ошибка; новый отказ — запоминается.
export async function withTextRefusal<T>(
  cache: Pick<TextCache, 'textHash' | 'refused'> | null,
  textHash: string,
  run: () => Promise<T>,
): Promise<T> {
  if (cache?.refused && cache.textHash === textHash) {
    throw new KnownRefusalError(cache.refused, { kind: 'text', textHash, units: [], refused: cache.refused }, textHash)
  }
  try {
    return await run()
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (!isRefusalMessage(message)) throw e
    throw new KnownRefusalError(message, { kind: 'text', textHash, units: [], refused: message }, textHash)
  }
}
