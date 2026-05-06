// Normalise free-form agent contact strings into chat-deeplink URLs.
// The agent typed their handle into the download form however they
// felt — "@username", "username", "+62 812 ...", "62812..." — and we
// want the PDF link to land on a real Telegram or WhatsApp chat
// regardless. Returns null when the input has no usable content so
// callers can fall back to plain text.

export function telegramUrl(handle: string | null | undefined): string | null {
  if (!handle) return null
  // Strip an optional leading @ plus surrounding whitespace; the rest
  // is the username Telegram expects in the deep link.
  const cleaned = handle.trim().replace(/^@+/, '').trim()
  if (!cleaned) return null
  // If they pasted a t.me URL, just use it.
  if (/^https?:\/\//i.test(cleaned)) return cleaned
  return `https://t.me/${cleaned}`
}

export function whatsappUrl(phone: string | null | undefined): string | null {
  if (!phone) return null
  // wa.me wants pure digits (no +, no spaces, no parentheses, no
  // dashes). Anything else and the link silently breaks.
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}`
}
