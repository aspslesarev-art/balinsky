// Общий доступ к модели для трекера: провайдер и разбор JSON-ответа.
//
// Провайдеров было два — Azure основным и OpenAI запасным. Подписку Azure
// закрыли 28.08.2026, ключи отозваны, поэтому первый провайдер в списке
// гарантированно отвечал 401 и каждый вызов тратил лишний круг ретраев.
// Остался один; цикл ниже сохранён — вернуть второго провайдера сюда дёшево.

import OpenAI from 'openai'
import { logUsage, type Feature } from '@/lib/usage-tracker'

type Provider = { client: OpenAI; deployment: string; name: 'azure' | 'openai' }

function providers(): Provider[] {
  const out: Provider[] = []
  if (process.env.OPENAI_API_KEY) {
    out.push({
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      deployment: process.env.MARKET_LAYOUT_MODEL || 'gpt-5',
      name: 'openai',
    })
  }
  if (!out.length) throw new Error('llm_not_configured')
  return out
}

// Ошибки, которые бессмысленно повторять на другом провайдере: они про
// содержимое запроса, а не про доступность.
export type FatalCheck = (message: string) => boolean

export async function chatJson(
  system: string,
  user: string,
  opts: { feature: Feature; meta?: Record<string, unknown>; isFatal?: FatalCheck },
): Promise<unknown> {
  const errors: string[] = []

  for (const p of providers()) {
    try {
      const completion = await p.client.chat.completions.create({
        model: p.deployment,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        // Задачи разметочные: найти в дампе нужное. Долгое рассуждение их
        // не улучшает, а обход десятков источников затягивает в разы.
        reasoning_effort: 'low',
      })

      logUsage({
        feature: opts.feature,
        deployment: p.deployment,
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        meta: { ...(opts.meta ?? {}), provider: p.name },
      })

      return JSON.parse(stripFences(completion.choices[0]?.message?.content ?? ''))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (opts.isFatal?.(msg)) throw e
      errors.push(`${p.name}: ${msg.slice(0, 120)}`)
    }
  }

  throw new Error(`llm_failed — ${errors.join('; ')}`)
}

function stripFences(s: string): string {
  return s.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```\s*$/, '').trim()
}
