import 'server-only'
import type OpenAI from 'openai'
import { openaiClient, CHAT_MODEL } from '@/lib/openai'
import { logUsage } from '@/lib/usage-tracker'
import { resolvePrompt } from '@/lib/admin/ai-prompts'

// Azure-backed generator for admin cell content. Mirrors the Balina chat
// client setup; every call is metered via logUsage (feature: admin-ai) so its
// spend shows up in /admin/usage.

function client(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('openai_not_configured')
  return openaiClient()!
}

// Trim wrapping quotes / markdown fences the model occasionally adds despite
// the "return only the value" instruction.
function clean(text: string): string {
  return text
    .replace(/^```[a-zA-Z]*\n?/, '')
    .replace(/\n?```$/, '')
    .replace(/^\s*["'«»]+/, '')
    .replace(/["'«»]+\s*$/, '')
    .trim()
}

/** Generate content for a field. Throws 'no_prompt' if the field has no task. */
export async function generateField(field: string, row: Record<string, unknown>): Promise<string> {
  const prompt = resolvePrompt(field, row)
  if (!prompt) throw new Error('no_prompt')

  const deployment = CHAT_MODEL
  const completion = await client().chat.completions.create({
    model: deployment,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0.6,
  })

  logUsage({
    feature: 'admin-ai',
    deployment,
    promptTokens: completion.usage?.prompt_tokens ?? 0,
    completionTokens: completion.usage?.completion_tokens ?? 0,
    meta: { field },
  })

  return clean(completion.choices[0]?.message?.content ?? '')
}
