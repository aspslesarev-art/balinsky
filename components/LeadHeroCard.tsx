'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { Send, MessageCircle, Check } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { ContactLeadDialog, type LeadChannel } from '@/components/ContactLeadDialog'
import { reportLeadFormEvent } from '@/lib/contact-click'
import { PhoneField, phoneE164, defaultCountry, ipCountry } from '@/components/PhoneField'
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'

// Запись на созвон с менеджером застройщика — вверху страницы объекта
// (владелец 20.11.2026, макет HeroA «Журнал»). Заявка уходит владельцу в бота
// (/api/contact, page 'call-request'), застройщику он передаёт сам: сайт
// остаётся информационным и сделок не ведёт.

const COPY = {
  ru: { price: 'Цена', cap: 'Созвон с застройщиком · бесплатно', tabs: ['Созвон', 'Перезвоните мне', 'Написать'], today: 'сегодня', bali: 'время Бали', yours: (t: string) => `у вас ${t}`, ph: 'Номер телефона', book: 'Записаться на созвон', callback: 'Жду звонка', callbackLead: 'Оставьте номер — менеджер застройщика позвонит или напишет.', writeLead: 'Напишите менеджеру застройщика сами — откроется короткая форма.', note: 'Менеджер застройщика подтвердит время. Balinsky в сделке не участвует.', doneT: 'Заявка отправлена', done: (s: string | null) => s ? `Менеджер застройщика напишет вам, чтобы подтвердить созвон: ${s}.` : 'Менеджер застройщика свяжется с вами в рабочее время Бали.', again: 'Изменить', err: 'Проверьте номер — для этой страны он неполный или неверный', search: 'Поиск страны', fail: 'Не отправилось. Попробуйте ещё раз или напишите в Telegram.', sending: 'Отправляем…', jump: 'Записаться на созвон', free: 'созвон бесплатно' },
  en: { price: 'Price', cap: 'Call with the developer · free', tabs: ['Call', 'Call me back', 'Message'], today: 'today', bali: 'Bali time', yours: (t: string) => `${t} your time`, ph: 'Phone number', book: 'Book a call', callback: 'Call me back', callbackLead: 'Leave your number — the developer’s manager will call or message you.', writeLead: 'Message the developer’s manager yourself — a short form opens.', note: 'The developer’s manager confirms the time. Balinsky takes no part in the deal.', doneT: 'Request sent', done: (s: string | null) => s ? `The developer’s manager will message you to confirm the call: ${s}.` : 'The developer’s manager will contact you during Bali working hours.', again: 'Change', err: 'Check the number — it looks incomplete or wrong for this country', search: 'Search country', fail: 'Not sent. Try again or message on Telegram.', sending: 'Sending…', jump: 'Book a call', free: 'free call' },
  id: { price: 'Harga', cap: 'Panggilan dengan pengembang · gratis', tabs: ['Panggilan', 'Telepon saya', 'Kirim pesan'], today: 'hari ini', bali: 'waktu Bali', yours: (t: string) => `${t} waktu Anda`, ph: 'Nomor telepon', book: 'Jadwalkan panggilan', callback: 'Telepon saya', callbackLead: 'Tinggalkan nomor — manajer pengembang akan menelepon atau mengirim pesan.', writeLead: 'Kirim pesan sendiri ke manajer pengembang — formulir singkat akan terbuka.', note: 'Manajer pengembang akan mengonfirmasi waktunya. Balinsky tidak terlibat dalam transaksi.', doneT: 'Permintaan terkirim', done: (s: string | null) => s ? `Manajer pengembang akan menghubungi Anda untuk konfirmasi: ${s}.` : 'Manajer pengembang akan menghubungi Anda pada jam kerja Bali.', again: 'Ubah', err: 'Periksa nomornya — tidak lengkap atau salah untuk negara ini', search: 'Cari negara', fail: 'Gagal terkirim. Coba lagi atau kirim pesan di Telegram.', sending: 'Mengirim…', jump: 'Jadwalkan panggilan', free: 'panggilan gratis' },
  fr: { price: 'Prix', cap: 'Appel avec le promoteur · gratuit', tabs: ['Appel', 'Rappelez-moi', 'Écrire'], today: 'auj.', bali: 'heure de Bali', yours: (t: string) => `${t} chez vous`, ph: 'Numéro de téléphone', book: 'Réserver un appel', callback: 'Rappelez-moi', callbackLead: 'Laissez votre numéro — le responsable du promoteur vous appellera ou vous écrira.', writeLead: 'Écrivez vous-même au responsable — un court formulaire s’ouvre.', note: 'Le responsable du promoteur confirme l’heure. Balinsky ne participe pas à la transaction.', doneT: 'Demande envoyée', done: (s: string | null) => s ? `Le responsable du promoteur vous écrira pour confirmer l’appel : ${s}.` : 'Le responsable du promoteur vous contactera aux heures de bureau de Bali.', again: 'Modifier', err: 'Vérifiez le numéro — incomplet ou incorrect pour ce pays', search: 'Rechercher un pays', fail: 'Échec de l’envoi. Réessayez ou écrivez sur Telegram.', sending: 'Envoi…', jump: 'Réserver un appel', free: 'appel gratuit' },
  de: { price: 'Preis', cap: 'Gespräch mit dem Bauträger · kostenlos', tabs: ['Gespräch', 'Rückruf', 'Schreiben'], today: 'heute', bali: 'Bali-Zeit', yours: (t: string) => `${t} bei Ihnen`, ph: 'Telefonnummer', book: 'Gespräch buchen', callback: 'Rückruf anfordern', callbackLead: 'Nummer hinterlassen — der Ansprechpartner des Bauträgers ruft an oder schreibt.', writeLead: 'Schreiben Sie dem Ansprechpartner selbst — ein kurzes Formular öffnet sich.', note: 'Der Ansprechpartner des Bauträgers bestätigt die Zeit. Balinsky ist am Geschäft nicht beteiligt.', doneT: 'Anfrage gesendet', done: (s: string | null) => s ? `Der Ansprechpartner meldet sich zur Bestätigung: ${s}.` : 'Der Ansprechpartner meldet sich während der Geschäftszeiten auf Bali.', again: 'Ändern', err: 'Bitte Nummer prüfen — für dieses Land unvollständig oder falsch', search: 'Land suchen', fail: 'Nicht gesendet. Erneut versuchen oder per Telegram schreiben.', sending: 'Senden…', jump: 'Gespräch buchen', free: 'kostenloses Gespräch' },
  zh: { price: '价格', cap: '与开发商通话 · 免费', tabs: ['预约通话', '请回电', '留言'], today: '今天', bali: '巴厘岛时间', yours: (t: string) => `您的时间 ${t}`, ph: '电话号码', book: '预约通话', callback: '请回电', callbackLead: '留下号码，开发商经理会致电或发消息。', writeLead: '直接给开发商经理留言，将打开简短表单。', note: '开发商经理会确认时间。Balinsky 不参与交易。', doneT: '已发送', done: (s: string | null) => s ? `开发商经理会联系您确认通话：${s}。` : '开发商经理会在巴厘岛工作时间联系您。', again: '修改', err: '请检查号码：对该国家/地区不完整或不正确', search: '搜索国家/地区', fail: '发送失败，请重试或通过 Telegram 联系。', sending: '发送中…', jump: '预约通话', free: '免费通话' },
  nl: { price: 'Prijs', cap: 'Gesprek met de ontwikkelaar · gratis', tabs: ['Gesprek', 'Bel me terug', 'Bericht'], today: 'vandaag', bali: 'Bali-tijd', yours: (t: string) => `${t} bij u`, ph: 'Telefoonnummer', book: 'Gesprek plannen', callback: 'Bel me terug', callbackLead: 'Laat uw nummer achter — de manager van de ontwikkelaar belt of stuurt een bericht.', writeLead: 'Stuur de manager zelf een bericht — er opent een kort formulier.', note: 'De manager van de ontwikkelaar bevestigt de tijd. Balinsky neemt geen deel aan de deal.', doneT: 'Aanvraag verstuurd', done: (s: string | null) => s ? `De manager neemt contact op om het gesprek te bevestigen: ${s}.` : 'De manager neemt contact op tijdens Bali-kantooruren.', again: 'Wijzigen', err: 'Controleer het nummer — onvolledig of onjuist voor dit land', search: 'Land zoeken', fail: 'Niet verstuurd. Probeer opnieuw of stuur een bericht via Telegram.', sending: 'Versturen…', jump: 'Gesprek plannen', free: 'gratis gesprek' },
  ban: { price: 'Aji', cap: 'Telepon sareng pengembang · gratis', tabs: ['Telepon', 'Telepon tiang', 'Pesan'], today: 'dina mangkin', bali: 'galah Bali', yours: (t: string) => `${t} galah ragane`, ph: 'Nomor telepon', book: 'Jadwalang telepon', callback: 'Telepon tiang', callbackLead: 'Tinggalang nomor — manajer pengembang jagi nelepon utawi ngirim pesan.', writeLead: 'Kirim pesan ring manajer pengembang — formulir cutet jagi kabuka.', note: 'Manajer pengembang jagi ngonfirmasi galah. Balinsky nenten ngiring ring transaksi.', doneT: 'Sampun kakirim', done: (s: string | null) => s ? `Manajer pengembang jagi ngabarin ragane: ${s}.` : 'Manajer pengembang jagi ngabarin ring galah makarya Bali.', again: 'Uah', err: 'Cingakin nomorne — nenten jangkep utawi iwang', search: 'Rereh negara', fail: 'Nenten kakirim. Cobak malih.', sending: 'Ngirim…', jump: 'Jadwalang telepon', free: 'telepon gratis' },
  pl: { price: 'Cena', cap: 'Rozmowa z deweloperem · bezpłatnie', tabs: ['Rozmowa', 'Oddzwońcie', 'Napisz'], today: 'dziś', bali: 'czas Bali', yours: (t: string) => `${t} u ciebie`, ph: 'Numer telefonu', book: 'Umów rozmowę', callback: 'Czekam na telefon', callbackLead: 'Zostaw numer — menedżer dewelopera zadzwoni lub napisze.', writeLead: 'Napisz do menedżera sam — otworzy się krótki formularz.', note: 'Menedżer dewelopera potwierdzi termin. Balinsky nie uczestniczy w transakcji.', doneT: 'Wysłano', done: (s: string | null) => s ? `Menedżer dewelopera napisze, aby potwierdzić rozmowę: ${s}.` : 'Menedżer dewelopera skontaktuje się w godzinach pracy na Bali.', again: 'Zmień', err: 'Sprawdź numer — niepełny lub błędny dla tego kraju', search: 'Szukaj kraju', fail: 'Nie wysłano. Spróbuj ponownie lub napisz w Telegramie.', sending: 'Wysyłanie…', jump: 'Umów rozmowę', free: 'rozmowa bezpłatna' },
  uk: { price: 'Ціна', cap: 'Дзвінок із забудовником · безкоштовно', tabs: ['Дзвінок', 'Передзвоніть', 'Написати'], today: 'сьогодні', bali: 'час Балі', yours: (t: string) => `у вас ${t}`, ph: 'Номер телефону', book: 'Записатися на дзвінок', callback: 'Чекаю дзвінка', callbackLead: 'Залиште номер — менеджер забудовника зателефонує або напише.', writeLead: 'Напишіть менеджеру забудовника самі — відкриється коротка форма.', note: 'Менеджер забудовника підтвердить час. Balinsky в угоді не бере участі.', doneT: 'Заявку надіслано', done: (s: string | null) => s ? `Менеджер забудовника напише вам, щоб підтвердити дзвінок: ${s}.` : 'Менеджер забудовника зв’яжеться з вами в робочий час Балі.', again: 'Змінити', err: 'Перевірте номер — для цієї країни він неповний або неправильний', search: 'Пошук країни', fail: 'Не надіслано. Спробуйте ще раз або напишіть у Telegram.', sending: 'Надсилаємо…', jump: 'Записатися на дзвінок', free: 'дзвінок безкоштовно' },
} as const

const LOCALE: Record<string, string> = { ru: 'ru-RU', en: 'en-GB', id: 'id-ID', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', nl: 'nl-NL', ban: 'id-ID', pl: 'pl-PL', uk: 'uk-UA' }
// Часы созвона по Бали (UTC+8) — рабочий день застройщиков.
const HOURS = [10, 11, 14, 16]
const BALI_MS = 8 * 3600_000
const STORE_KEY = 'bx_lead_contact'

// Полночь дня по Бали, в которой лежит момент t (как UTC-метка).
const baliDayStart = (t: number) => Math.floor((t + BALI_MS) / 86400_000) * 86400_000 - BALI_MS
const slotAt = (day: number, h: number) => day + h * 3600_000

export function LeadHeroCard({ lang, price, priceNote, manager, developerName, managerName, managerId, listingTitle, id, framed = true }: {
  lang: Lang
  price?: ReactNode
  /** «обновлена вчера» — справа от подписи «Цена», как в макете. */
  priceNote?: ReactNode
  /** Кто ответит — фото, имя на языке страницы и языки (вкладка «Написать»). */
  manager?: { photo: string | null; name: string; langs: string[] } | null
  developerName: string | null
  managerName: string | null
  managerId: string | null
  listingTitle: string | null
  id?: string
  /** true — карточка поверх фото (с тенью), false — просто колонка на странице. */
  framed?: boolean
}) {
  const c = pickCopy(COPY, lang)
  const loc = LOCALE[lang] ?? 'en-GB'
  // Первой открывается «Написать» с менеджером (владелец 20.11.2026), созвон — вкладкой рядом.
  const [tab, setTab] = useState(2)
  // Дни и часы зависят от «сейчас» — считаем только у посетителя, иначе ошибка гидрации.
  const [now, setNow] = useState<number | null>(null)
  const [day, setDay] = useState<number | null>(null)
  const [hour, setHour] = useState<number | null>(null)
  const [phone, setPhone] = useState<{ country: CountryCode; national: string }>({ country: 'ID', national: '' })
  const [err, setErr] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [sentSlot, setSentSlot] = useState<string | null>(null)
  const [dialog, setDialog] = useState<LeadChannel | null>(null)

  useEffect(() => {
    const t = Date.now()
    setNow(t)
    let saved: { phone?: string } | null = null
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') } catch { /* приватный режим */ }
    const p = saved?.phone ? parsePhoneNumberFromString(saved.phone) : undefined
    if (p?.country) { setPhone({ country: p.country, national: p.formatNational() }); return }
    setPhone(v => ({ ...v, country: defaultCountry(lang) }))
    void ipCountry().then(cc => { if (cc) setPhone(v => (v.national ? v : { ...v, country: cc })) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const days = useMemo(() => {
    if (now == null) return []
    // Сегодня — только если ещё остался час хотя бы через 2 часа от «сейчас».
    const first = baliDayStart(now)
    const startToday = HOURS.some(h => slotAt(first, h) > now + 2 * 3600_000)
    return Array.from({ length: 5 }, (_, i) => first + (i + (startToday ? 0 : 1)) * 86400_000)
  }, [now])
  const isOpen = (d: number, h: number) => now != null && slotAt(d, h) > now + 2 * 3600_000
  const selDay = day ?? days[0] ?? null
  const selHour = selDay != null && hour != null && isOpen(selDay, hour) ? hour : (selDay != null ? HOURS.find(h => isOpen(selDay, h)) ?? null : null)

  const fmtDay = (d: number) => {
    const dt = new Date(d + BALI_MS)
    return {
      wd: d === baliDayStart(now ?? 0) ? c.today : new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: 'UTC' }).format(dt).replace('.', ''),
      n: dt.getUTCDate(),
      long: new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dt),
    }
  }
  // Подсказка «у вас 06:00» — только если пояс посетителя не совпадает с Бали.
  const localHint = (() => {
    if (selDay == null || selHour == null) return null
    const t = slotAt(selDay, selHour)
    if (new Date(t).getTimezoneOffset() === -480) return null
    return c.yours(new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' }).format(new Date(t)))
  })()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const e164 = phoneE164(phone.country, phone.national)
    if (!e164) { setErr(c.err); return }
    setErr(null)
    const slot = tab === 0 && selDay != null && selHour != null ? `${fmtDay(selDay).long}, ${String(selHour).padStart(2, '0')}:00 (${c.bali})` : null
    setState('sending')
    let name = ''
    try {
      const prev = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Record<string, string>
      name = prev.name ?? ''
      localStorage.setItem(STORE_KEY, JSON.stringify({ ...prev, phone: e164 }))
    } catch { /* не критично */ }
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          phone: e164,
          slot: slot ?? undefined,
          request: tab === 0 ? 'call' : 'callback',
          managerName: managerName ?? undefined,
          developerName: developerName ?? undefined,
          listingTitle: listingTitle ?? undefined,
          page: 'call-request',
          pagePath: window.location.pathname,
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      reportLeadFormEvent('lead', 'other', { managerId: managerId ?? undefined, managerName: managerName ?? undefined, developerName })
      setSentSlot(slot)
      setState('done')
    } catch {
      setErr(c.fail)
      setState('idle')
    }
  }

  const cap = 'text-[12px] uppercase tracking-[0.08em] text-[#6B7570]'
  const cell = (on: boolean, off = false) =>
    `flex-1 min-w-0 cursor-pointer border-0 bg-transparent px-0 transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-default disabled:text-[#C3CAC6] ${on ? 'text-[var(--color-primary)] shadow-[inset_0_-2px_0_var(--color-primary)]' : off ? '' : 'text-[#0F1A15] hover:text-[var(--color-primary)]'}`

  return (
    <div id={id} className={`flex scroll-mt-[136px] flex-col gap-4 bg-white ${framed ? 'rounded-md p-6 shadow-[0_1px_2px_rgb(0_0_0/.05),0_12px_32px_rgb(0_0_0/.14)]' : ''}`}>
      {price && <div className="flex flex-col gap-2"><span className="flex items-baseline justify-between gap-3"><span className={cap}>{c.price}</span>{priceNote}</span>{price}</div>}
      <div className={`flex flex-col gap-3 ${price ? 'border-t border-[#ECEFED] pt-4' : ''}`}>
        <div role="tablist" className="flex gap-5 text-[14px]">
          {[2, 0, 1].map(i => [c.tabs[i], i] as const).map(([t, i]) => (
            <button key={t} type="button" role="tab" aria-selected={tab === i} onClick={() => { setTab(i); setState('idle'); setErr(null) }}
              className={`cursor-pointer border-0 bg-transparent px-0 pb-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${tab === i ? 'font-semibold text-[#0F1A15] shadow-[inset_0_-2px_0_#0F1A15]' : 'text-[#6B7570] hover:text-[#0F1A15]'}`}>{t}</button>
          ))}
        </div>
      </div>

      {state === 'done' ? (
        <div className="flex flex-col gap-2 py-2" role="status">
          <span className="flex items-center gap-2 text-[17px] font-semibold text-[#0F1A15]"><Check size={20} className="text-[var(--color-primary)]" aria-hidden />{c.doneT}</span>
          <span className="text-[14px] leading-[1.55] text-[#4A5550]">{c.done(sentSlot)}</span>
          <button type="button" onClick={() => setState('idle')} className="self-start cursor-pointer border-0 bg-transparent px-0 py-1 text-[14px] text-[#0F1A15] underline underline-offset-4 hover:text-[var(--color-primary)]">{c.again}</button>
        </div>
      ) : tab === 2 ? (
        <div className="flex flex-col gap-3">
          {manager && (
            <div className="flex items-center gap-3">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E8F1EC] text-[18px] font-semibold text-[var(--color-primary)]">
                {manager.photo ? <Image src={manager.photo} alt={manager.name} fill sizes="48px" className="object-cover" /> : manager.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-semibold text-[#0F1A15]">{manager.name}{developerName ? `, ${developerName}` : ''}</span>
                {manager.langs.length > 0 && <span className="truncate text-[13px] text-[#6B7570]">{manager.langs.join(', ')}</span>}
              </span>
            </div>
          )}
          <p className="text-[14px] leading-[1.55] text-[#4A5550]">{c.writeLead}</p>
          <div className="grid grid-cols-2 gap-3">
            {([['telegram', 'Telegram', Send], ['whatsapp', 'WhatsApp', MessageCircle]] as const).map(([ch, label, Icon]) => (
              <button key={ch} type="button" onClick={() => { setDialog(ch); reportLeadFormEvent('click', ch, { managerId: managerId ?? undefined, managerName: managerName ?? undefined, developerName }) }}
                className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-[16px] font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
                <Icon size={18} strokeWidth={1.8} aria-hidden /> {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          {tab === 0 ? (
            <>
              <div className="flex min-h-[62px] border-b border-[#ECEFED]">
                {days.map(d => {
                  const f = fmtDay(d)
                  const on = d === selDay
                  return (
                    <button key={d} type="button" aria-pressed={on} onClick={() => setDay(d)} className={`${cell(on)} flex flex-col items-center gap-0.5 py-2`}>
                      <span className={`text-[12px] ${on ? '' : 'text-[#6B7570]'}`}>{f.wd}</span>
                      <span className="text-[20px] font-semibold leading-[1.1] tabular-nums">{f.n}</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex min-h-[38px] border-b border-[#ECEFED]">
                {selDay != null && HOURS.map(h => {
                  const open = isOpen(selDay, h)
                  return (
                    <button key={h} type="button" disabled={!open} aria-pressed={h === selHour} onClick={() => setHour(h)} className={`${cell(h === selHour, !open)} py-2 text-[15px] tabular-nums ${h === selHour ? 'font-semibold' : ''}`}>
                      {String(h).padStart(2, '0')}:00
                    </button>
                  )
                })}
              </div>
              <span className="-mt-1 text-[12px] text-[#6B7570]">{c.bali}{localHint ? ` · ${localHint}` : ''}</span>
            </>
          ) : (
            <p className="text-[14px] leading-[1.55] text-[#4A5550]">{c.callbackLead}</p>
          )}
          <label className="sr-only" htmlFor={`${id ?? 'lead'}-contact`}>{c.ph}</label>
          <PhoneField id={`${id ?? 'lead'}-contact`} lang={lang} value={phone} onChange={v => { setPhone(v); setErr(null) }} invalid={!!err} placeholder={c.ph} search={c.search} />
          {err && <span className="-mt-1 text-[13px] text-[#B42318]" role="alert">{err}</span>}
          <button type="submit" disabled={state === 'sending'}
            className="mt-1 inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-xl bg-[var(--color-primary)] text-[16px] font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-70">
            {state === 'sending' ? c.sending : tab === 0 ? c.book : c.callback}
          </button>
        </form>
      )}
      <p className="text-center text-[12px] leading-[1.5] text-[#6B7570]">{tab === 2 ? (c.note.split(/(?<=\.)\s/).slice(1).join(' ') || c.note) : c.note}</p>
      {tab !== 2 && (
        <div className="-mt-1 flex justify-center gap-5 text-[14px]">
          {([['telegram', 'Telegram', Send], ['whatsapp', 'WhatsApp', MessageCircle]] as const).map(([ch, label, Icon]) => (
            <button key={ch} type="button" onClick={() => { setDialog(ch); reportLeadFormEvent('click', ch, { managerId: managerId ?? undefined, managerName: managerName ?? undefined, developerName }) }}
              className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent px-0 py-1 text-[#0F1A15] underline underline-offset-4 hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
              <Icon size={16} strokeWidth={1.8} aria-hidden />{label}
            </button>
          ))}
        </div>
      )}
      {dialog && (
        <ContactLeadDialog open onClose={() => setDialog(null)} channel={dialog} lang={lang}
          developerName={developerName} managerName={managerName ?? ''} managerId={managerId ?? ''} listingTitle={listingTitle} />
      )}
    </div>
  )
}

/** Кнопка внизу экрана на телефоне — появляется, когда форма ушла из виду. */
export function LeadStickyBar({ lang, targetId, price }: { lang: Lang; targetId: string; price?: ReactNode }) {
  const c = pickCopy(COPY, lang)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const el = document.getElementById(targetId)
    if (!el) return
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [targetId])
  return (
    <div aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-[60] flex items-center gap-4 border-t border-[#ECEFED] bg-white px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 transition-transform duration-[200ms] ease-[cubic-bezier(.2,.8,.2,1)] lg:hidden ${show ? 'translate-y-0' : 'pointer-events-none translate-y-full'}`}>
      {price && <div className="flex min-w-0 shrink-0 flex-col">{price}<span className="text-[12px] text-[#6B7570]">{c.free}</span></div>}
      <a href={`#${targetId}`} tabIndex={show ? 0 : -1}
        className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 text-[16px] font-semibold text-white no-underline hover:bg-[var(--color-primary-pressed)]">{c.jump}</a>
    </div>
  )
}
