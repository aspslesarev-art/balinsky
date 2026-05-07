// Routes outbound Telegram contacts through the on-brand chat-bot so the
// company sees the lead in its own conversation history before the user is
// handed off to the actual manager / rental owner / event organiser.
//
// Bot handles these `start=` params (see lib/telegram-handlers.ts):
//   manager_<airtableRecordId>  → connect to a developer's manager
//   rental_<airtableRecordId>   → connect to a monthly-rental owner
//   event_<airtableRecordId>    → register for an event
//   review_<DeveloperName>      → leave a review
//   error_<DeveloperName>       → report a bug
//   seller_<airtableId>         → resale: get seller contact via the bot
//
// Each /start also tags the chat (event:<slug>, developer:<slug>, etc.) so
// /admin/broadcast can later message everyone who showed interest in a topic.
//
// Telegram caps the `start` parameter at 64 chars and only allows
// [A-Za-z0-9_-]. We always use Airtable record IDs ("rec…") for the
// event/manager/rental/seller lookup keys — they're 17 chars, well
// under the limit. Event slugs used to be passed here directly but
// they routinely run past 60 chars (region + project + date), so a
// silent truncation broke the bot lookup.

const BOT_USERNAME = 'BalinskyBot'

const MAX_START_LEN = 64

function sanitize(s: string, maxLen: number): string {
  return s.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, maxLen)
}

export function botLink(kind: 'manager' | 'rental' | 'event' | 'seller', id: string): string {
  // Account for prefix `<kind>_` so the final payload always fits.
  const budget = MAX_START_LEN - kind.length - 1
  return `https://t.me/${BOT_USERNAME}?start=${kind}_${sanitize(id, budget)}`
}
