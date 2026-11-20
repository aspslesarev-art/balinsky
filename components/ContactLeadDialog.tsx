'use client'

// Форма заявки по кнопкам Telegram / WhatsApp у менеджера застройщика.
// В мессенджер кнопки не ведут: имя и контакт уходят через /api/contact
// только в админ-чат бота (page = 'manager-card'), дальше владелец сам.
//
// Имя и контакт запоминаются в браузере: второй раз поля уже заполнены.
//
// channel = 'other' — «Другой мессенджер»: человек выбирает свой (WeChat
// для Китая, LINE, Viber…) и пишет ID или номер как есть.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, MessageCircle, MessagesSquare } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { reportLeadFormEvent } from '@/lib/contact-click'
import { PhoneField, phoneE164, defaultCountry, ipCountry } from '@/components/PhoneField'
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'

export type LeadChannel = 'telegram' | 'whatsapp' | 'other'

// Мессенджеры для кнопки «Другой». Сервер принимает только эти названия
// (app/api/contact/route.ts).
export const OTHER_MESSENGERS = ['WeChat', 'LINE', 'Viber', 'KakaoTalk', 'Zalo', 'Signal'] as const
export type OtherMessenger = typeof OTHER_MESSENGERS[number]

// Тексты на всех десяти языках.
const COPY = {
  ru: {
    title: (dev: string | null) => dev ? `Связаться с ${dev}` : 'Связаться с застройщиком',
    lead: (ch: LeadChannel, m: string) => `Оставьте имя и ${ch === 'telegram' ? 'контакт в Telegram' : ch === 'whatsapp' ? 'номер WhatsApp' : `контакт в ${m}`} - менеджер напишет вам сам.`,
    name: 'Имя',
    namePh: 'Как к вам обращаться',
    phone: 'Номер WhatsApp',
    search: 'Поиск страны',
    tg: 'Номер или ник в Telegram',
    tgPh: '+62 812 3456 7890 или @username',
    messenger: 'Мессенджер',
    other: (m: string) => `Ваш ID или номер в ${m}`,
    otherPh: 'ID, ник или номер с кодом страны',
    submit: 'Отправить',
    note: 'Передадим ваш контакт менеджеру застройщика. Balinsky в переговорах и сделке не участвует.',
    close: 'Закрыть',
    doneTitle: 'Готово',
    done: (m: string) => `Менеджер напишет вам в ${m} в рабочее время Бали (UTC+8).`,
    errName: 'Напишите имя',
    errPhone: 'Нужен номер с кодом страны, например +62…',
    errTg: 'Нужен номер с кодом страны или ник вида @username',
    errOther: 'Напишите ваш ID или номер',
  },
  en: {
    title: (dev: string | null) => dev ? `Contact ${dev}` : 'Contact the developer',
    lead: (ch: LeadChannel, m: string) => `Leave your name and ${ch === 'telegram' ? 'Telegram contact' : ch === 'whatsapp' ? 'WhatsApp number' : `${m} contact`} - the manager will message you.`,
    name: 'Name',
    namePh: 'Your name',
    phone: 'WhatsApp number',
    search: 'Search country',
    tg: 'Telegram number or username',
    tgPh: '+62 812 3456 7890 or @username',
    messenger: 'Messenger',
    other: (m: string) => `Your ${m} ID or number`,
    otherPh: 'ID, username or number with country code',
    submit: 'Send',
    note: 'We pass your contact to the developer’s manager. Balinsky takes no part in the talks or the transaction.',
    close: 'Close',
    doneTitle: 'Done',
    done: (m: string) => `The manager will message you on ${m} during Bali working hours (UTC+8).`,
    errName: 'Please enter your name',
    errPhone: 'Enter a number with country code, e.g. +62…',
    errTg: 'Enter a number with country code or a @username',
    errOther: 'Please enter your ID or number',
  },
  id: {
    title: (dev: string | null) => dev ? `Hubungi ${dev}` : 'Hubungi pengembang',
    lead: (ch: LeadChannel, m: string) => `Tinggalkan nama dan ${ch === 'telegram' ? 'kontak Telegram' : ch === 'whatsapp' ? 'nomor WhatsApp' : `kontak ${m}`} - manajer akan menghubungi Anda.`,
    name: 'Nama',
    namePh: 'Nama Anda',
    phone: 'Nomor WhatsApp',
    search: 'Cari negara',
    tg: 'Nomor atau username Telegram',
    tgPh: '+62 812 3456 7890 atau @username',
    messenger: 'Messenger',
    other: (m: string) => `ID atau nomor ${m} Anda`,
    otherPh: 'ID, username, atau nomor dengan kode negara',
    submit: 'Kirim',
    note: 'Kami meneruskan kontak Anda ke manajer pengembang. Balinsky tidak terlibat dalam negosiasi maupun transaksi.',
    close: 'Tutup',
    doneTitle: 'Selesai',
    done: (m: string) => `Manajer akan menghubungi Anda lewat ${m} pada jam kerja Bali (UTC+8).`,
    errName: 'Tuliskan nama Anda',
    errPhone: 'Masukkan nomor dengan kode negara, mis. +62…',
    errTg: 'Masukkan nomor dengan kode negara atau @username',
    errOther: 'Tuliskan ID atau nomor Anda',
  },
  fr: {
    title: (dev: string | null) => dev ? `Contacter ${dev}` : 'Contacter le promoteur',
    lead: (ch: LeadChannel, m: string) => `Laissez votre nom et ${ch === 'telegram' ? 'votre contact Telegram' : ch === 'whatsapp' ? 'votre numéro WhatsApp' : `votre contact ${m}`} - le responsable vous écrira.`,
    name: 'Nom',
    namePh: 'Votre nom',
    phone: 'Numéro WhatsApp',
    search: 'Rechercher un pays',
    tg: 'Numéro ou pseudo Telegram',
    tgPh: '+62 812 3456 7890 ou @username',
    messenger: 'Messagerie',
    other: (m: string) => `Votre identifiant ou numéro ${m}`,
    otherPh: 'Identifiant, pseudo ou numéro avec indicatif',
    submit: 'Envoyer',
    note: 'Nous transmettons votre contact au responsable du promoteur. Balinsky ne participe ni aux négociations ni à la transaction.',
    close: 'Fermer',
    doneTitle: 'C’est fait',
    done: (m: string) => `Le responsable vous écrira sur ${m} aux heures de bureau de Bali (UTC+8).`,
    errName: 'Indiquez votre nom',
    errPhone: 'Indiquez un numéro avec indicatif, p. ex. +62…',
    errTg: 'Indiquez un numéro avec indicatif ou un @username',
    errOther: 'Indiquez votre identifiant ou numéro',
  },
  de: {
    title: (dev: string | null) => dev ? `${dev} kontaktieren` : 'Bauträger kontaktieren',
    lead: (ch: LeadChannel, m: string) => `Hinterlassen Sie Ihren Namen und ${ch === 'telegram' ? 'Ihren Telegram-Kontakt' : ch === 'whatsapp' ? 'Ihre WhatsApp-Nummer' : `Ihren ${m}-Kontakt`} - der Ansprechpartner meldet sich bei Ihnen.`,
    name: 'Name',
    namePh: 'Ihr Name',
    phone: 'WhatsApp-Nummer',
    search: 'Land suchen',
    tg: 'Telegram-Nummer oder Benutzername',
    tgPh: '+62 812 3456 7890 oder @username',
    messenger: 'Messenger',
    other: (m: string) => `Ihre ${m}-ID oder Nummer`,
    otherPh: 'ID, Benutzername oder Nummer mit Ländervorwahl',
    submit: 'Senden',
    note: 'Wir geben Ihren Kontakt an den Ansprechpartner des Bauträgers weiter. Balinsky ist an Verhandlungen und am Kauf nicht beteiligt.',
    close: 'Schließen',
    doneTitle: 'Fertig',
    done: (m: string) => `Der Ansprechpartner schreibt Ihnen über ${m} während der Geschäftszeiten auf Bali (UTC+8).`,
    errName: 'Bitte geben Sie Ihren Namen ein',
    errPhone: 'Nummer mit Ländervorwahl eingeben, z. B. +62…',
    errTg: 'Nummer mit Ländervorwahl oder @username eingeben',
    errOther: 'Bitte geben Sie Ihre ID oder Nummer ein',
  },
  zh: {
    title: (dev: string | null) => dev ? `联系${dev}` : '联系开发商',
    lead: (ch: LeadChannel, m: string) => `留下您的姓名和${ch === 'telegram' ? 'Telegram 联系方式' : ch === 'whatsapp' ? 'WhatsApp 号码' : `${m} 联系方式`}，经理会主动联系您。`,
    name: '姓名',
    namePh: '怎么称呼您',
    phone: 'WhatsApp 号码',
    search: '搜索国家/地区',
    tg: 'Telegram 号码或用户名',
    tgPh: '+62 812 3456 7890 或 @username',
    messenger: '通讯软件',
    other: (m: string) => `您的 ${m} ID 或号码`,
    otherPh: 'ID、用户名或带国家区号的号码',
    submit: '发送',
    note: '我们会把您的联系方式转交给开发商经理。Balinsky 不参与洽谈和交易。',
    close: '关闭',
    doneTitle: '已提交',
    done: (m: string) => `经理会在巴厘岛工作时间（UTC+8）通过 ${m} 联系您。`,
    errName: '请填写姓名',
    errPhone: '请输入带国家区号的号码，例如 +62…',
    errTg: '请输入带国家区号的号码或 @username',
    errOther: '请填写您的 ID 或号码',
  },
  nl: {
    title: (dev: string | null) => dev ? `Contact met ${dev}` : 'Contact met de ontwikkelaar',
    lead: (ch: LeadChannel, m: string) => `Laat je naam en ${ch === 'telegram' ? 'Telegram-contact' : ch === 'whatsapp' ? 'WhatsApp-nummer' : `${m}-contact`} achter - de manager neemt contact met je op.`,
    name: 'Naam',
    namePh: 'Je naam',
    phone: 'WhatsApp-nummer',
    search: 'Land zoeken',
    tg: 'Telegram-nummer of gebruikersnaam',
    tgPh: '+62 812 3456 7890 of @username',
    messenger: 'Messenger',
    other: (m: string) => `Je ${m}-ID of nummer`,
    otherPh: 'ID, gebruikersnaam of nummer met landcode',
    submit: 'Versturen',
    note: 'We geven je contact door aan de manager van de ontwikkelaar. Balinsky neemt geen deel aan de onderhandelingen of de transactie.',
    close: 'Sluiten',
    doneTitle: 'Klaar',
    done: (m: string) => `De manager stuurt je een bericht via ${m} tijdens de werkuren op Bali (UTC+8).`,
    errName: 'Vul je naam in',
    errPhone: 'Vul een nummer met landcode in, bijv. +62…',
    errTg: 'Vul een nummer met landcode of een @username in',
    errOther: 'Vul je ID of nummer in',
  },
  ban: {
    title: (dev: string | null) => dev ? `Ngubungin ${dev}` : 'Ngubungin pangwangun',
    lead: (ch: LeadChannel, m: string) => `Tinggalang wasta lan ${ch === 'telegram' ? 'kontak Telegram' : ch === 'whatsapp' ? 'nomor WhatsApp' : `kontak ${m}`} - manajer jagi ngubungin ragane.`,
    name: 'Wasta',
    namePh: 'Wasta ragane',
    phone: 'Nomor WhatsApp',
    search: 'Rereh negara',
    tg: 'Nomor utawi username Telegram',
    tgPh: '+62 812 3456 7890 utawi @username',
    messenger: 'Messenger',
    other: (m: string) => `ID utawi nomor ${m} ragane`,
    otherPh: 'ID, username utawi nomor sareng kode negara',
    submit: 'Kirim',
    note: 'Kontak ragane kateruskan ka manajer pangwangun. Balinsky nenten nyarengin ring negosiasi miwah transaksi.',
    close: 'Tutup',
    doneTitle: 'Sampun',
    done: (m: string) => `Manajer jagi ngubungin ragane ring ${m} ring galah makarya Bali (UTC+8).`,
    errName: 'Tulis wasta ragane',
    errPhone: 'Tulis nomor sareng kode negara, conto +62…',
    errTg: 'Tulis nomor sareng kode negara utawi @username',
    errOther: 'Tulis ID utawi nomor ragane',
  },
  pl: {
    title: (dev: string | null) => dev ? `Kontakt z ${dev}` : 'Kontakt z deweloperem',
    lead: (ch: LeadChannel, m: string) => `Zostaw imię i ${ch === 'telegram' ? 'kontakt w Telegramie' : ch === 'whatsapp' ? 'numer WhatsApp' : `kontakt w ${m}`} - menedżer sam do Ciebie napisze.`,
    name: 'Imię',
    namePh: 'Jak się do Ciebie zwracać',
    phone: 'Numer WhatsApp',
    search: 'Szukaj kraju',
    tg: 'Numer lub nazwa użytkownika w Telegramie',
    tgPh: '+62 812 3456 7890 lub @username',
    messenger: 'Komunikator',
    other: (m: string) => `Twój identyfikator lub numer w ${m}`,
    otherPh: 'ID, nazwa użytkownika lub numer z kierunkowym',
    submit: 'Wyślij',
    note: 'Przekażemy Twój kontakt menedżerowi dewelopera. Balinsky nie uczestniczy w negocjacjach ani w transakcji.',
    close: 'Zamknij',
    doneTitle: 'Gotowe',
    done: (m: string) => `Menedżer napisze do Ciebie w ${m} w godzinach pracy na Bali (UTC+8).`,
    errName: 'Wpisz imię',
    errPhone: 'Podaj numer z kierunkowym, np. +62…',
    errTg: 'Podaj numer z kierunkowym lub @username',
    errOther: 'Wpisz swój identyfikator lub numer',
  },
  uk: {
    title: (dev: string | null) => dev ? `Зв’язатися з ${dev}` : 'Зв’язатися із забудовником',
    lead: (ch: LeadChannel, m: string) => `Залиште ім’я та ${ch === 'telegram' ? 'контакт у Telegram' : ch === 'whatsapp' ? 'номер WhatsApp' : `контакт у ${m}`} - менеджер напише вам сам.`,
    name: 'Ім’я',
    namePh: 'Як до вас звертатися',
    phone: 'Номер WhatsApp',
    search: 'Пошук країни',
    tg: 'Номер або нік у Telegram',
    tgPh: '+62 812 3456 7890 або @username',
    messenger: 'Месенджер',
    other: (m: string) => `Ваш ID або номер у ${m}`,
    otherPh: 'ID, нік або номер з кодом країни',
    submit: 'Надіслати',
    note: 'Передамо ваш контакт менеджеру забудовника. Balinsky не бере участі в переговорах і угоді.',
    close: 'Закрити',
    doneTitle: 'Готово',
    done: (m: string) => `Менеджер напише вам у ${m} у робочий час Балі (UTC+8).`,
    errName: 'Напишіть ім’я',
    errPhone: 'Потрібен номер з кодом країни, наприклад +62…',
    errTg: 'Потрібен номер з кодом країни або нік на кшталт @username',
    errOther: 'Напишіть ваш ID або номер',
  },
} as const

const STORE_KEY = 'bx_lead_contact'

// Телефон: 8–15 цифр (E.164), допускаем пробелы, скобки, дефисы, ведущий +.
function isPhone(s: string): boolean {
  if (!/^\+?[\d\s()\-.]+$/.test(s)) return false
  const digits = s.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}

// Ник Telegram: 5–32 символа, буквы/цифры/подчёркивание, начинается с буквы.
// Принимаем и ссылку t.me/username.
function tgHandle(s: string): string | null {
  const m = s.trim().match(/^(?:@|(?:https?:\/\/)?t\.me\/)?([a-zA-Z][a-zA-Z0-9_]{4,31})$/)
  return m ? `@${m[1]}` : null
}

export function ContactLeadDialog({
  open,
  onClose,
  channel,
  messenger: initialMessenger = 'WeChat',
  lang,
  developerName,
  managerName,
  managerId,
  listingTitle,
}: {
  open: boolean
  onClose: () => void
  channel: LeadChannel
  // Для channel = 'other' — какой мессенджер выбран сразу.
  messenger?: OtherMessenger
  lang: Lang
  developerName: string | null
  managerName: string
  managerId: string
  listingTitle?: string | null
}) {
  const c = pickCopy(COPY, lang)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  // WhatsApp — номер с кодом страны, как в Telegram (владелец 20.11.2026).
  const [wa, setWa] = useState<{ country: CountryCode; national: string }>({ country: 'ID', national: '' })
  const [messenger, setMessenger] = useState<OtherMessenger>(initialMessenger)
  const [website, setWebsite] = useState('') // honeypot
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setDone(false)
    setMessenger(initialMessenger)
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as
        { name?: string; phone?: string; telegram?: string; other?: string } | null
      const p = saved?.phone ? parsePhoneNumberFromString(saved.phone) : undefined
      if (p?.country) setWa({ country: p.country, national: p.formatNational() })
      else {
        setWa({ country: defaultCountry(lang), national: '' })
        void ipCountry().then(cc => { if (cc) setWa(v => (v.national ? v : { ...v, country: cc })) })
      }
      if (saved) {
        setName(saved.name ?? '')
        setContact((channel === 'telegram' ? saved.telegram || saved.phone
          : channel === 'other' ? saved.other : saved.phone) ?? '')
      }
    } catch { /* приватный режим — просто пустые поля */ }
    const t = setTimeout(() => nameRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, channel, initialMessenger, onClose, lang])

  if (!open || typeof document === 'undefined') return null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const raw = contact.trim()
    if (!n) { setError(c.errName); return }
    let phone = ''
    let telegram = ''
    let other = ''
    if (channel === 'other') {
      if (raw.length < 3) { setError(c.errOther); return }
      other = raw
    } else if (channel === 'whatsapp') {
      const e164 = phoneE164(wa.country, wa.national)
      if (!e164) { setError(c.errPhone); return }
      phone = e164
    } else if (isPhone(raw)) {
      phone = raw
    } else {
      const h = tgHandle(raw)
      if (!h) { setError(c.errTg); return }
      telegram = h
    }

    try {
      const prev = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Record<string, string>
      localStorage.setItem(STORE_KEY, JSON.stringify({
        ...prev,
        name: n,
        ...(phone ? { phone } : {}),
        ...(telegram ? { telegram } : {}),
        ...(other ? { other } : {}),
      }))
    } catch { /* не критично */ }

    void fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        name: n,
        phone: phone || undefined,
        telegram: telegram || undefined,
        channel,
        messenger: other ? messenger : undefined,
        messengerId: other || undefined,
        managerName,
        developerName: developerName ?? undefined,
        listingTitle: listingTitle ?? undefined,
        website,
        page: 'manager-card',
        pagePath: window.location.pathname,
      }),
    }).catch(err => console.error('[lead] send failed', err))

    reportLeadFormEvent('lead', channel, { managerId, managerName, developerName })
    setDone(true)
  }

  const Icon = channel === 'telegram' ? Send : channel === 'whatsapp' ? MessageCircle : MessagesSquare
  const label = channel === 'telegram' ? 'Telegram' : channel === 'whatsapp' ? 'WhatsApp' : messenger
  const inputCls = 'w-full h-12 px-4 rounded-xl border border-[var(--color-border)] bg-white text-[16px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 transition-[border-color,box-shadow] duration-[120ms]'

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 sm:p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-dialog-title"
        className="relative w-full sm:max-w-[440px] rounded-t-2xl sm:rounded-2xl bg-white p-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-[0_1px_2px_rgb(0_0_0/.04),0_12px_32px_rgb(0_0_0/.12)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={c.close}
          className="absolute right-3 top-3 cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-search-bg)] hover:text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] transition-colors"
        >
          <X size={18} />
        </button>
        <h2 id="lead-dialog-title" className="pr-10 text-[20px] font-semibold tracking-tight leading-[1.2] text-[var(--color-text)]">
          {done ? c.doneTitle : c.title(developerName)}
        </h2>
        {done ? (
          <>
            <p className="mt-2 text-[16px] leading-[1.55] text-[var(--color-text)]">{c.done(label)}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 cursor-pointer inline-flex w-full items-center justify-center h-12 px-5 rounded-full border border-[var(--color-border)] bg-white hover:bg-[var(--color-search-bg)] text-[var(--color-text)] text-[16px] font-medium transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              {c.close}
            </button>
          </>
        ) : (<>
        <p className="mt-2 text-[14px] leading-[1.55] text-[var(--color-text-muted)]">{c.lead(channel, label)}</p>

        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-[14px] font-medium text-[var(--color-text)]">{c.name}</span>
            <input
              ref={nameRef}
              className={inputCls}
              value={name}
              onChange={e => { setName(e.target.value); setError(null) }}
              placeholder={c.namePh}
              autoComplete="name"
              maxLength={100}
            />
          </label>
          {channel === 'other' && (
            <fieldset>
              <legend className="mb-2 block text-[14px] font-medium text-[var(--color-text)]">{c.messenger}</legend>
              <div className="flex flex-wrap gap-2">
                {OTHER_MESSENGERS.map(m => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={messenger === m}
                    onClick={() => { setMessenger(m); setError(null) }}
                    className={`cursor-pointer h-10 px-4 rounded-full border text-[14px] font-medium transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${messenger === m
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]'
                      : 'border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-search-bg)]'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <label className="block">
            <span className="mb-2 block text-[14px] font-medium text-[var(--color-text)]">
              {channel === 'telegram' ? c.tg : channel === 'other' ? c.other(messenger) : c.phone}
            </span>
            {channel === 'whatsapp' ? (
              <PhoneField id="lead-dialog-wa" lang={lang} variant="box" value={wa} onChange={v => { setWa(v); setError(null) }} invalid={!!error} placeholder={c.phone} search={c.search} />
            ) : <input
              className={inputCls}
              value={contact}
              onChange={e => { setContact(e.target.value); setError(null) }}
              placeholder={channel === 'telegram' ? c.tgPh : channel === 'other' ? c.otherPh : '+62 812 3456 7890'}
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={60}
            />}
          </label>
          {/* honeypot */}
          <input
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
            name="website"
          />
          {error && <p role="alert" className="text-[14px] text-[#B42318]">{error}</p>}
          <button
            type="submit"
            className="cursor-pointer inline-flex w-full items-center justify-center gap-2 h-12 px-5 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] active:scale-[.98] text-white text-[16px] font-medium transition-[background-color,transform] duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <Icon size={18} strokeWidth={1.6} /> {c.submit}
          </button>
          <p className="text-[13px] leading-[1.55] text-[var(--color-text-muted)]">{c.note}</p>
        </form>
        </>)}
      </div>
    </div>,
    document.body,
  )
}
