// Routes outbound Telegram contacts through the on-brand chat-bot so the
// company sees the lead in its own conversation history before the user is
// handed off to the actual manager / rental owner.
//
// Bot side (separate project) must handle these `start=` params:
//   manager_<airtableRecordId>
//      → look up manager in managers/_managers.json by id
//      → reply with greeting + manager's Telegram handle and WhatsApp
//   rental_<airtableRecordId>
//      → look up rental in rental/_rental.json by id
//      → reply with the listing title + the «Контакт Телеграм» URL stored on it
// Reviews + bug reports already use this contract:
//   review_<DeveloperName>
//   error_<DeveloperName>

const BOT_USERNAME = 'BalinskyBot'

// Telegram allows [a-zA-Z0-9_-] in the start parameter, max 64 chars.
// Airtable record IDs ("rec…") fit comfortably; sanitise anything else.
function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60)
}

export function botLink(kind: 'manager' | 'rental', id: string): string {
  return `https://t.me/${BOT_USERNAME}?start=${kind}_${sanitize(id)}`
}
