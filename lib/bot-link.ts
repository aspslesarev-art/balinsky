// Routes outbound Telegram contacts through the on-brand chat-bot so the
// company sees the lead in its own conversation history before the user is
// handed off to the actual manager / rental owner / event organiser.
//
// Bot handles these `start=` params (see lib/telegram-handlers.ts):
//   manager_<airtableRecordId>  → connect to a developer's manager
//   rental_<airtableRecordId>   → connect to a monthly-rental owner
//   event_<eventSlug>           → register for an event (slug, not recId)
//   review_<DeveloperName>      → leave a review
//   error_<DeveloperName>       → report a bug
//
// Each /start also tags the chat (event:<slug>, developer:<slug>, etc.) so
// /admin/broadcast can later message everyone who showed interest in a topic.

const BOT_USERNAME = 'BalinskyBot'

// Telegram allows [a-zA-Z0-9_-] in the start parameter, max 64 chars.
function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60)
}

export function botLink(kind: 'manager' | 'rental' | 'event', id: string): string {
  return `https://t.me/${BOT_USERNAME}?start=${kind}_${sanitize(id)}`
}
