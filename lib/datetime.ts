import type { Lang } from '@/lib/i18n'

export const BALI_TZ = 'Asia/Makassar' // UTC+8

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
  return ({ ru: 'ru-RU', en: 'en-GB', id: 'id-ID', fr: 'fr-FR' } as const)[opts.lang ?? 'ru']
}

export function fmtBali(iso: string, opts: FmtOpts = {}): string {
  return new Intl.DateTimeFormat(locale(opts), { ...buildOptions(opts), timeZone: BALI_TZ }).format(new Date(iso))
}

export function fmtLocal(iso: string, opts: FmtOpts = {}): string {
  return new Intl.DateTimeFormat(locale(opts), buildOptions(opts)).format(new Date(iso))
}
