'use client'

// On-site lead capture: a button that opens a modal asking for name +
// phone, posts to /api/contact (→ admin Telegram), and shows a success
// state — instead of sending the visitor off to WhatsApp/Telegram. Drop
// it anywhere a "contact / buy / talk to a manager" CTA is needed.

import { useState, useCallback } from 'react'
import { X, Phone, Check } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    title: 'Оставьте заявку',
    sub: 'Менеджер перезвонит и пришлёт детали — обычно в течение часа в рабочее время Бали.',
    name: 'Ваше имя',
    phone: 'Телефон (WhatsApp/Telegram)',
    submit: 'Жду звонка',
    sending: 'Отправляем…',
    okTitle: 'Спасибо!',
    okSub: 'Заявка принята — менеджер скоро свяжется с вами.',
    errName: 'Введите имя',
    errPhone: 'Введите телефон',
    errSend: 'Не удалось отправить. Попробуйте ещё раз.',
    close: 'Закрыть',
  },
  en: {
    title: 'Leave a request',
    sub: 'A manager will call you back and send details — usually within an hour during Bali working hours.',
    name: 'Your name',
    phone: 'Phone (WhatsApp/Telegram)',
    submit: 'Call me back',
    sending: 'Sending…',
    okTitle: 'Thank you!',
    okSub: 'Got it — a manager will reach out shortly.',
    errName: 'Enter your name',
    errPhone: 'Enter your phone',
    errSend: 'Could not send. Please try again.',
    close: 'Close',
  },
  id: {
    title: 'Kirim permintaan',
    sub: 'Manajer akan menghubungi Anda kembali dan mengirimkan detail — biasanya dalam satu jam pada jam kerja Bali.',
    name: 'Nama Anda',
    phone: 'Telepon (WhatsApp/Telegram)',
    submit: 'Hubungi saya kembali',
    sending: 'Mengirim…',
    okTitle: 'Terima kasih!',
    okSub: 'Diterima — manajer akan segera menghubungi Anda.',
    errName: 'Masukkan nama Anda',
    errPhone: 'Masukkan nomor telepon Anda',
    errSend: 'Gagal mengirim. Silakan coba lagi.',
    close: 'Tutup',
  },
  fr: {
    title: 'Envoyer une demande',
    sub: 'Un conseiller vous rappellera et vous enverra les détails — généralement dans l’heure pendant les horaires de travail de Bali.',
    name: 'Votre nom',
    phone: 'Téléphone (WhatsApp/Telegram)',
    submit: 'Rappelez-moi',
    sending: 'Envoi…',
    okTitle: 'Merci !',
    okSub: 'Bien reçu — un conseiller vous contactera sous peu.',
    errName: 'Saisissez votre nom',
    errPhone: 'Saisissez votre téléphone',
    errSend: 'Échec de l’envoi. Veuillez réessayer.',
    close: 'Fermer',
  },
  de: {
    title: 'Anfrage senden',
    sub: 'Ein Manager ruft Sie zurück und sendet Details — in der Regel innerhalb einer Stunde während der Geschäftszeiten auf Bali.',
    name: 'Ihr Name',
    phone: 'Telefon (WhatsApp/Telegram)',
    submit: 'Rückruf anfordern',
    sending: 'Senden…',
    okTitle: 'Danke!',
    okSub: 'Erhalten — ein Manager meldet sich in Kürze.',
    errName: 'Bitte Namen eingeben',
    errPhone: 'Bitte Telefonnummer eingeben',
    errSend: 'Senden fehlgeschlagen. Bitte erneut versuchen.',
    close: 'Schließen',
  },
  zh: {
    title: '提交请求',
    sub: '经理会给您回电并发送详情 — 通常在巴厘岛工作时间内一小时内。',
    name: '您的姓名',
    phone: '电话 (WhatsApp/Telegram)',
    submit: '请回电给我',
    sending: '发送中…',
    okTitle: '谢谢！',
    okSub: '已收到 — 经理会尽快与您联系。',
    errName: '请输入您的姓名',
    errPhone: '请输入您的电话',
    errSend: '发送失败。请重试。',
    close: '关闭',
  },
  nl: {
    title: 'Aanvraag versturen',
    sub: 'Een manager belt u terug en stuurt de details — meestal binnen een uur tijdens de werkuren op Bali.',
    name: 'Uw naam',
    phone: 'Telefoon (WhatsApp/Telegram)',
    submit: 'Bel me terug',
    sending: 'Versturen…',
    okTitle: 'Bedankt!',
    okSub: 'Ontvangen — een manager neemt binnenkort contact op.',
    errName: 'Voer uw naam in',
    errPhone: 'Voer uw telefoonnummer in',
    errSend: 'Versturen mislukt. Probeer het opnieuw.',
    close: 'Sluiten',
  },
  ban: {
    title: 'Ngirim panagih',
    sub: 'Manajer jaga ngwangsulin telepon lan ngirim detail — biasané ring jero abesik jam ring jam kerja Bali.',
    name: 'Wastan Ragané',
    phone: 'Telepon (WhatsApp/Telegram)',
    submit: 'Telepon tiang malih',
    sending: 'Ngirim…',
    okTitle: 'Suksma!',
    okSub: 'Sampun katrima — manajer jaga gelis nghubungin Ragané.',
    errName: 'Ketik wastan Ragané',
    errPhone: 'Ketik nomor telepon Ragané',
    errSend: 'Nenten prasida ngirim. Cobain malih.',
    close: 'Nutup',
  },
  pl: {
    title: 'Zostaw zgłoszenie',
    sub: 'Menedżer oddzwoni i prześle szczegóły — zwykle w ciągu godziny w godzinach pracy na Bali.',
    name: 'Twoje imię',
    phone: 'Telefon (WhatsApp/Telegram)',
    submit: 'Oddzwońcie do mnie',
    sending: 'Wysyłanie…',
    okTitle: 'Dziękujemy!',
    okSub: 'Przyjęte — menedżer wkrótce się z Tobą skontaktuje.',
    errName: 'Podaj imię',
    errPhone: 'Podaj telefon',
    errSend: 'Nie udało się wysłać. Spróbuj ponownie.',
    close: 'Zamknij',
  },
  uk: {
    title: 'Залишіть заявку',
    sub: 'Менеджер передзвонить і надішле деталі — зазвичай протягом години в робочий час на Балі.',
    name: 'Ваше ім’я',
    phone: 'Телефон (WhatsApp/Telegram)',
    submit: 'Передзвоніть мені',
    sending: 'Надсилаємо…',
    okTitle: 'Дякуємо!',
    okSub: 'Прийнято — менеджер скоро звʼяжеться з вами.',
    errName: 'Введіть імʼя',
    errPhone: 'Введіть телефон',
    errSend: 'Не вдалося надіслати. Спробуйте ще раз.',
    close: 'Закрити',
  },
} as const

export type LeadContext = {
  listingKind?: string | null
  listingSlug?: string | null
  listingTitle?: string | null
  // Developer the lead belongs to — routes it to that developer's Telegram
  // chat. Pass when the form is on a developer-scoped surface.
  developerName?: string | null
  developerSlug?: string | null
  source?: string
}

export function LeadButton({
  label,
  lang = 'ru',
  className,
  context,
  icon,
}: {
  label: string
  lang?: Lang
  className?: string
  context?: LeadContext
  icon?: React.ReactNode
}) {
  const c = pickCopy(COPY, lang)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    // Reset after the close animation window so a re-open is clean.
    setTimeout(() => { setStatus('idle'); setErr(null); setName(''); setPhone('') }, 200)
  }, [])

  const submit = useCallback(async () => {
    if (!name.trim()) { setErr(c.errName); return }
    if (!phone.trim()) { setErr(c.errPhone); return }
    setErr(null); setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          website, // honeypot
          listingKind: context?.listingKind ?? undefined,
          listingSlug: context?.listingSlug ?? undefined,
          listingTitle: context?.listingTitle ?? undefined,
          developerName: context?.developerName ?? undefined,
          developerSlug: context?.developerSlug ?? undefined,
          page: context?.source ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
          // Always send the real page path (independent of the source label)
          // so the lead can link back to the exact source page.
          pagePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setStatus('done')
    } catch {
      setStatus('error'); setErr(c.errSend)
    }
  }, [name, phone, website, context, c])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {icon}{label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={close}
        >
          <div
            className="w-full sm:max-w-[420px] bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-[18px] font-semibold text-[#111827]">{status === 'done' ? c.okTitle : c.title}</h3>
              <button type="button" onClick={close} aria-label={c.close} className="shrink-0 -mr-1 -mt-1 p-1 text-[var(--color-text-muted)] hover:text-[#111827]">
                <X size={20} />
              </button>
            </div>

            {status === 'done' ? (
              <div className="flex items-start gap-3 text-[15px] text-[#1f2937]">
                <span className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center"><Check size={16} /></span>
                <span>{c.okSub}</span>
              </div>
            ) : (
              <>
                <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed mb-4">{c.sub}</p>
                {/* Honeypot — hidden from real users. */}
                <input
                  type="text" tabIndex={-1} autoComplete="off" value={website}
                  onChange={e => setWebsite(e.target.value)}
                  className="hidden" aria-hidden="true"
                />
                <div className="space-y-2.5">
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder={c.name}
                    className="w-full h-11 px-4 rounded-xl border border-[var(--color-border)] bg-white text-[15px] outline-none focus:border-[var(--color-primary)]"
                  />
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder={c.phone} inputMode="tel"
                    className="w-full h-11 px-4 rounded-xl border border-[var(--color-border)] bg-white text-[15px] outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                {err && <div className="mt-2 text-[13px] text-[#DC2626]">{err}</div>}
                <button
                  type="button" onClick={submit} disabled={status === 'sending'}
                  className="mt-4 w-full h-12 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] disabled:opacity-60 text-white text-[15px] font-medium inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone size={16} /> {status === 'sending' ? c.sending : c.submit}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
