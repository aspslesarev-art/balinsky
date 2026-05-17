export const BALI_TZ = 'Asia/Makassar' // UTC+8

type FmtOpts = { withYear?: boolean; withTime?: boolean; lang?: 'ru' | 'en' }

function buildOptions(opts: FmtOpts): Intl.DateTimeFormatOptions {
  return {
    day: 'numeric',
    month: 'long',
    ...(opts.withYear ? { year: 'numeric' } : {}),
    ...(opts.withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }
}

function locale(opts: FmtOpts): string {
  return opts.lang === 'en' ? 'en-GB' : 'ru-RU'
}

export function fmtBali(iso: string, opts: FmtOpts = {}): string {
  return new Intl.DateTimeFormat(locale(opts), { ...buildOptions(opts), timeZone: BALI_TZ }).format(new Date(iso))
}

export function fmtLocal(iso: string, opts: FmtOpts = {}): string {
  return new Intl.DateTimeFormat(locale(opts), buildOptions(opts)).format(new Date(iso))
}
