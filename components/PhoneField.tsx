'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'
import { countryByTimezone, resolveCountry } from '@/lib/geo'

// Номер телефона с кодом страны, как в Telegram (владелец 20.11.2026): слева
// флаг и код, справа номер. Код обязателен — по нему видно, откуда человек.
// Начал номер с «+» — страна определяется сама.

const flag = (cc: string) => cc.replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)))
const LANG_COUNTRY: Record<string, CountryCode> = { ru: 'RU', uk: 'UA', id: 'ID', ban: 'ID', fr: 'FR', de: 'DE', zh: 'CN', nl: 'NL', pl: 'PL', en: 'GB' }
const PINNED: CountryCode[] = ['RU', 'ID', 'UA', 'KZ', 'BY', 'US', 'GB', 'AU', 'DE']

/** Номер в виде +79001234567, если он настоящий; иначе null. */
export function phoneE164(country: CountryCode, national: string): string | null {
  const raw = national.trim()
  const p = parsePhoneNumberFromString(raw, raw.startsWith('+') ? undefined : country)
  return p && p.isValid() ? p.number : null
}

export function PhoneField({ id, lang, value, onChange, invalid, placeholder, variant = 'line', search = 'Search' }: {
  id: string
  lang: string
  /** Номер без кода, как ввёл человек. */
  value: { country: CountryCode; national: string }
  onChange: (v: { country: CountryCode; national: string }) => void
  invalid?: boolean
  placeholder?: string
  /** line — подчёркнутое поле («Журнал»), box — поле в рамке (окно заявки). */
  variant?: 'line' | 'box'
  search?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const wrap = useRef<HTMLDivElement>(null)
  const names = useMemo(() => {
    try { return new Intl.DisplayNames([lang === 'ban' ? 'id' : lang], { type: 'region' }) } catch { return null }
  }, [lang])
  const all = useMemo(() => {
    const list = getCountries().map(cc => ({ cc, name: names?.of(cc) ?? cc, code: getCountryCallingCode(cc) }))
    list.sort((a, b) => a.name.localeCompare(b.name, lang))
    return [...PINNED.map(cc => list.find(x => x.cc === cc)!).filter(Boolean), ...list.filter(x => !PINNED.includes(x.cc))]
  }, [names, lang])
  const shown = q.trim() ? all.filter(x => x.name.toLowerCase().includes(q.trim().toLowerCase()) || x.code.startsWith(q.replace(/\D/g, '') || '§')) : all

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  function type(text: string) {
    // «+7 900…» или вставка с кодом — страну берём из номера.
    if (text.trim().startsWith('+')) {
      const t = new AsYouType()
      t.input(text)
      const cc = t.getCountry()
      const nat = t.getNumber()?.nationalNumber
      if (cc && nat) { onChange({ country: cc, national: new AsYouType(cc).input(String(nat)) }); return }
      onChange({ country: value.country, national: text })
      return
    }
    onChange({ country: value.country, national: new AsYouType(value.country).input(text) })
  }

  const box = variant === 'box'
  return (
    <div ref={wrap} className={`relative flex items-stretch ${box ? `h-12 rounded-md border ${invalid ? 'border-[#B42318]' : 'border-[#D9DFDC] focus-within:border-[var(--color-primary)]'}` : `h-12 border-b-[1.5px] ${invalid ? 'border-[#B42318]' : 'border-[#0F1A15] focus-within:border-[var(--color-primary)]'}`}`}>
      <button type="button" onClick={() => { setOpen(o => !o); setQ('') }} aria-haspopup="listbox" aria-expanded={open}
        className={`flex shrink-0 cursor-pointer items-center gap-1.5 border-0 bg-transparent text-[17px] text-[#0F1A15] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${box ? 'pl-3 pr-2' : 'pr-3'}`}>
        <span aria-hidden className="text-[20px] leading-none">{flag(value.country)}</span>
        <span className="tabular-nums">+{getCountryCallingCode(value.country)}</span>
        <ChevronDown size={16} className="text-[#6B7570]" aria-hidden />
      </button>
      <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" value={value.national} onChange={e => type(e.target.value)}
        placeholder={placeholder} aria-invalid={invalid}
        className={`min-w-0 flex-1 border-0 bg-transparent text-[17px] text-[#0F1A15] outline-none placeholder:text-[#9AA39E] tabular-nums ${box ? 'pr-3' : ''}`} />
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 flex max-h-[320px] w-[300px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-md border border-[#ECEFED] bg-white shadow-[0_1px_2px_rgb(0_0_0/.05),0_12px_32px_rgb(0_0_0/.14)]">
          <label className="flex items-center gap-2 border-b border-[#ECEFED] px-3">
            <Search size={16} className="text-[#6B7570]" aria-hidden />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={search} aria-label={search}
              className="h-11 min-w-0 flex-1 border-0 bg-transparent text-[16px] outline-none placeholder:text-[#9AA39E]" />
          </label>
          <ul role="listbox" className="m-0 list-none overflow-y-auto p-0 py-1">
            {shown.map((x, i) => (
              <li key={x.cc} role="option" aria-selected={x.cc === value.country}>
                <button type="button" onClick={() => { onChange({ country: x.cc, national: value.national.replace(/^\+\S*\s?/, '') }); setOpen(false); document.getElementById(id)?.focus() }}
                  className={`flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-2 text-left text-[15px] text-[#0F1A15] hover:bg-[#F6F8F7] ${x.cc === value.country ? 'font-semibold' : ''} ${!q && i === PINNED.length - 1 ? 'border-b border-[#ECEFED]' : ''}`}>
                  <span aria-hidden className="text-[18px] leading-none">{flag(x.cc)}</span>
                  <span className="min-w-0 flex-1 truncate">{x.name}</span>
                  <span className="text-[#6B7570] tabular-nums">+{x.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Страна по умолчанию: по часовому поясу или языку сразу, потом уточняем по IP (как валюта). */
export function defaultCountry(lang: string): CountryCode {
  const tz = countryByTimezone()
  return tz && (getCountries() as string[]).includes(tz) ? (tz as CountryCode) : (LANG_COUNTRY[lang] ?? 'ID')
}
export async function ipCountry(): Promise<CountryCode | null> {
  const cc = await resolveCountry()
  return cc && (getCountries() as string[]).includes(cc) ? (cc as CountryCode) : null
}
