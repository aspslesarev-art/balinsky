// Общий доступ к модели для трекера: провайдеры и разбор JSON-ответа.
//
// Провайдеров два — Azure как основной и OpenAI как запасной. Layout
// строится редко, но если провайдер недоступен, встаёт весь обход,
// поэтому переключаемся на лету.

import OpenAI, { AzureOpenAI } from 'openai'
import { logUsage, type Feature } from '@/lib/usage-tracker'

type Provider = { client: OpenAI; deployment: string; name: 'azure' | 'openai' }

function providers(): Provider[] {
  const out: Provider[] = []
  const { AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION } = process.env
  if (AZURE_OPENAI_API_KEY && AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_VERSION) {
    out.push({
      client: new AzureOpenAI({
        apiKey: AZURE_OPENAI_API_KEY,
        endpoint: AZURE_OPENAI_ENDPOINT,
        apiVersion: AZURE_OPENAI_API_VERSION,
      }),
      deployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-5.4',
      name: 'azure',
    })
  }
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
