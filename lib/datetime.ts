import type { Lang } from '@/lib/i18n'

export const BALI_TZ = 'Asia/Makassar' // UTC+8

// Bali has never observed DST, so a fixed offset is exact — no tz database
// lookup needed to convert to and from the wall clock an editor types in.
export const BALI_OFFSET = '+08:00'
const BALI_OFFSET_MS = 8 * 3600_000
const HAS_TIME = /\d{2}:\d{2}/
const IS_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Stored value → `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">`,
 * expressed as Bali wall-clock time (what the event's local start actually is).
 *
 * A bare `YYYY-MM-DD` — how every event was stored before times existed — is
 * already a Bali calendar date, so it must NOT be shifted: parsing it as UTC
 * midnight and adding 8h would silently turn "15 августа" into "15 августа,
 * 08:00" for every legacy record.
 */
export function toBaliInput(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  // Anything that isn't a recognisable date yields '' — an unparseable value
  // must leave the picker empty, not become "не датаT00:00".
  if (!HAS_TIME.test(raw)) return IS_DATE.test(raw.slice(0, 10)) ? `${raw.slice(0, 10)}T00:00` : ''
  const ms = Date.parse(raw)
  if (Number.isNaN(ms)) return ''
  return new Date(ms + BALI_OFFSET_MS).toISOString().slice(0, 16)
}

/** `<input type="datetime-local">` value (Bali wall-clock) → stored ISO carrying the Bali offset. */
export function fromBaliInput(local: string | null | undefined): string | null {
  const v = (local ?? '').trim()
  if (!v) return null
  const [date, time = '00:00'] = v.split('T')
  if (!date) return null
  return `${date}T${time.slice(0, 5)}:00${BALI_OFFSET}`
}

type FmtOpts = { withYear?: boolean; withTime?: boolean; lang?: Lang }

function buildOptions(opts: FmtOpts): Intl.DateTimeFormatOptions {
  return {
    day: 'numeric',
    month: 'long',
    ...(opts.withYear ? { year: 'numeric' } : {}),
    ...(opts.withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }
}

function locale(opts: FmtOpts): string {
  return ({ ru: 'ru-RU', en: 'en-GB', id: 'id-ID', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', nl: 'nl-NL', ban: 'id-ID', pl: 'pl-PL', uk: 'uk-UA' } as const)[opts.lang ?? 'ru']
}

export function fmtBali(iso: string, opts: FmtOpts = {}): string {
  return new Intl.DateTimeFormat(locale(opts), { ...buildOptions(opts), timeZone: BALI_TZ }).format(new Date(iso))
}

export function fmtLocal(iso: string, opts: FmtOpts = {}): string {
  return new Intl.DateTimeFormat(locale(opts), buildOptions(opts)).format(new Date(iso))
}
