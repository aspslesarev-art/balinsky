// Разбор прайса, который пришёл файлом-картинкой.
//
// Часть застройщиков выкладывает шахматку сканом, скриншотом или PDF,
// собранным из картинок. Текстового слоя там либо нет вовсе, либо шрифт
// идёт без таблицы соответствия символов — и вместо цифр из файла
// достаётся мусор («7$43011» вместо «$143,000»). Такой файл отдаём
// модели целиком: она видит страницу так же, как человек.
//
// Провайдер тут только OpenAI, в отличие от остального трекера: наш
// ресурс Azure не отдаёт Responses API с файловым входом, а рендерить
// PDF в картинки в serverless нечем.

import { UNITS_SYSTEM, unitsFromPayload } from './text-units'
import { logUsage } from '@/lib/usage-tracker'
import type { ExtractResult } from './types'

const API_URL = 'https://api.openai.com/v1/responses'

// Файл едет в запросе как base64, а это +33% к размеру. Прайс столько не
// весит; всё, что толще, — презентация, и читать её незачем.
const MAX_BYTES = 12 * 1024 * 1024

// Шахматка на полторы сотни юнитов читается моделью около полутора
// минут — это долго, но такой источник иначе не собрать вовсе. Предел
// подобран так, чтобы тик обхода (бюджет 150 с при лимите функции 300 с)
// успел закрыться, даже если один файл упёрся в потолок.
const TIMEOUT_MS = 120_000

// Как файл поедет в запрос: PDF модель разбирает постранично, картинку
// смотрит как изображение.
export type FileKind = { kind: 'file' | 'image'; mime: string }

export async function extractUnitsFromFile(
  bytes: Uint8Array,
  file: FileKind,
  meta: { developer: string; complex: string },
): Promise<ExtractResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('прайс без текстового слоя, а ключ OPENAI_API_KEY для чтения файла не задан')
  }
  if (bytes.length > MAX_BYTES) {
    throw new Error(`файл слишком большой для чтения моделью (${Math.round(bytes.length / 1e6)} МБ)`)
  }

  const model = process.env.MARKET_VISION_MODEL || 'gpt-5'
  const dataUrl = `data:${file.mime};base64,${Buffer.from(bytes).toString('base64')}`
  const prompt = [
    `Застройщик: ${meta.developer}`,
    `Комплекс по нашей картотеке: ${meta.complex}`,
    '',
    'В файле — прайс или шахматка юнитов. Прочти его и верни JSON по правилам выше.',
    'Перечисли ВСЕ юниты до единого, со всех страниц и всех корпусов: пропущенная строка — это потерянный объект, а длинный ответ ничему не мешает.',
    'unitKey пиши РОВНО так, как номер напечатан в файле, без своих префиксов, переводов и переименований: по этому номеру юнит сверяется с прошлым разбором, и выдуманный номер выглядит как исчезнувший объект.',
  ].join('\n')

  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model,
      instructions: UNITS_SYSTEM,
      // Задача разметочная — переписать в JSON то, что нарисовано на
      // странице. Долгое рассуждение её не улучшает, а тик обхода
      // затягивает так, что до остальных источников очередь не доходит.
      reasoning: { effort: 'low' },
      input: [{
        role: 'user',
        content: [
          file.kind === 'file'
            ? { type: 'input_file', filename: 'price.pdf', file_data: dataUrl }
            : { type: 'input_image', image_url: dataUrl },
          { type: 'input_text', text: prompt },
        ],
      }],
    }),
  })

  if (!r.ok) {
    throw new Error(`чтение файла моделью не удалось: ${r.status} ${(await r.text()).slice(0, 200)}`)
  }

  const payload = await r.json() as {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
    usage?: { input_tokens?: number; output_tokens?: number }
  }

  logUsage({
    feature: 'market-layout',
    deployment: model,
    promptTokens: payload.usage?.input_tokens ?? 0,
    completionTokens: payload.usage?.output_tokens ?? 0,
    meta: { ...meta, provider: 'openai', mode: 'vision' },
  })

  const text = (payload.output ?? [])
    .flatMap(o => o.content ?? [])
    .filter(c => c.type === 'output_text')
    .map(c => c.text ?? '')
    .join('')
    .trim()
  if (!text) throw new Error('модель не вернула ответ по файлу')

  return unitsFromPayload(parseJson(text), 'vision')
}

function parseJson(text: string): unknown {
  const cleaned = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```\s*$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('модель вернула не JSON при чтении файла')
  }
}
