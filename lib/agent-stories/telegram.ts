// /start st_<v|a|c>_<airtable_id> — агент нажал «Сторис для агента» на
// карточке объекта. Рендерим 3 картинки и шлём одним альбомом файлами
// (как фото Telegram ужал бы 1080×1920 до 720×1280).

import { loadStoryData, type StoryKind } from './data'
import { renderStory, STORY_COUNT } from './render'
import { logMessage, addChatTags } from '@/lib/bot-storage'

const KIND_BY_CODE: Record<string, StoryKind> = { v: 'villa', a: 'apartment', c: 'complex' }

export function parseStoriesPayload(payload: string | null): { kind: StoryKind; id: string } | null {
  const m = payload?.match(/^st_([vac])_([A-Za-z0-9_]{5,40})$/)
  return m ? { kind: KIND_BY_CODE[m[1]], id: m[2] } : null
}

async function sendText(token: string, chatId: number, text: string): Promise<void> {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  })
  const j = await r.json().catch(() => null) as { ok?: boolean; result?: { message_id?: number } } | null
  if (!j?.ok) console.error('[stories] sendMessage failed:', r.status, j)
  await logMessage({ chat_id: chatId, direction: 'out', source: 'bot', text, tg_message_id: j?.result?.message_id ?? null })
}

export async function sendStoryPack(token: string, chatId: number, kind: StoryKind, id: string): Promise<void> {
  const data = await loadStoryData(kind, id)
  if (!data) {
    await sendText(token, chatId, 'Этот объект снят с публикации - сторис по нему нет. Откройте другой объект на balinsky.info.')
    return
  }

  const pngs = await Promise.all(
    Array.from({ length: STORY_COUNT }, (_, i) => renderStory(data, i + 1).then(r => r.arrayBuffer())),
  )

  const form = new FormData()
  form.append('chat_id', String(chatId))
  form.append('media', JSON.stringify(pngs.map((_, i) => ({ type: 'document', media: `attach://s${i + 1}` }))))
  pngs.forEach((buf, i) => form.append(`s${i + 1}`, new Blob([buf], { type: 'image/png' }), `story-${i + 1}.png`))

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, { method: 'POST', body: form })
  const j = await r.json().catch(() => null) as { ok?: boolean; description?: string } | null
  if (!j?.ok) {
    console.error('[stories] sendMediaGroup failed:', r.status, j?.description)
    await sendText(token, chatId, 'Не получилось собрать картинки. Попробуйте ещё раз через минуту.')
    return
  }
  await logMessage({ chat_id: chatId, direction: 'out', source: 'bot', text: `[сторис агента: ${kind} ${id}, ${STORY_COUNT} файла]` })
  await sendText(
    token, chatId,
    'Готово - 3 картинки для сторис, размер 1080×1920.\n\n' +
    'Названия комплекса и застройщика на них нет, можно ставить от себя.\n\n' +
    'Как сохранить: откройте файл → «Поделиться» → «Сохранить изображение».',
  )
  await addChatTags(chatId, ['stories', `stories:${kind}:${id}`]).catch(err => console.error('[stories] tags failed:', err))
}
