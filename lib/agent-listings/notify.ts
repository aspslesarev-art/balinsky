import 'server-only'
import type { AgentContact, AgentListing } from './types'

// Уведомления по объектам агентов. Модерация живёт в Telegram теми же
// кнопками, что и подтверждение брони (lib/telegram-reservation.ts): админу
// приходит карточка с ✅/❌, отдельную панель открывать не нужно.

const TOKEN = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim()
const ADMIN_CHAT = (process.env.ADMIN_TELEGRAM_CHAT_ID ?? '').trim()
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

async function send(chatId: string | number, text: string, keyboard?: unknown): Promise<void> {
  if (!TOKEN || !chatId) return
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
      }),
    })
  } catch (e) {
    // Уведомление не должно ронять публикацию объекта.
    console.error('[agent-listings] telegram send failed:', (e as Error).message)
  }
}

export function listingUrl(slug: string): string {
  return `${SITE_URL}/ru/predlozheniya/o/${slug}`
}

export async function notifyNewListing(listing: AgentListing, contact: AgentContact | null): Promise<void> {
  if (!ADMIN_CHAT) return
  const who = contact
    ? `${contact.name}${contact.username ? ` (@${contact.username})` : ''}${contact.agency ? `, ${contact.agency}` : ''}`
    : `telegram id ${listing.authorId}`
  const lines = [
    '🏠 <b>Новый объект от агента</b>',
    '',
    `<b>${listing.title}</b>`,
    `$${listing.priceUsd.toLocaleString('en-US')}`,
    listing.baseUnitId ? '↳ юнит уже есть в каталоге (страница получит canonical на него)' : '↳ юнита в каталоге нет — новая карточка',
    '',
    `Агент: ${who}`,
    listing.comment ? `\nКомментарий: ${listing.comment.slice(0, 400)}` : '',
    '',
    listingUrl(listing.slug),
  ].filter(Boolean)
  await send(ADMIN_CHAT, lines.join('\n'), [[
    { text: '✅ Одобрить', callback_data: `agl:ok:${listing.id}` },
    { text: '❌ Отклонить', callback_data: `agl:no:${listing.id}` },
  ]])
}

export async function notifyAuthorDecision(listing: AgentListing, approved: boolean): Promise<void> {
  const text = approved
    ? `✅ Ваш объект «${listing.title}» одобрен и попал в каталог.\n\n${listingUrl(listing.slug)}`
    : `❌ Объект «${listing.title}» отклонён.${listing.rejectReason ? `\n\nПричина: ${listing.rejectReason}` : ''}\n\nМожно поправить и отправить снова.`
  await send(listing.authorId, text)
}
