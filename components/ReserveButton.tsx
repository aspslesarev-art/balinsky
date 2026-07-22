'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Lock, Loader2, X, CheckCircle2, Calendar, FileText, Wallet, Undo2, ChevronRight } from 'lucide-react'
import { switchLangPath, type Lang, detectLang, pickCopy } from '@/lib/i18n'

const COPY = {
  ru: {
    cta: 'Зарезервировать',
    titleOpen: 'Зарезервировать объект',
    titleDone: 'Бронь принята',
    close: 'Закрыть',
    submitted: 'Заявка отправлена менеджеру',
    explainer: (email: string) => (
      <>В течение часа мы пришлём на <strong className="text-[#111827] break-all">{email}</strong> счёт для оплаты резервационного депозита. Объект забронирован за вами на 14 дней. Паспортные данные пришлёте ответом на тот же email.</>
    ),
    ok: 'Понятно',
    intro: 'Объект встанет на 14-дневный hold. Менеджер пришлёт счёт на оплату депозита на указанный email.',
    name: 'Имя и фамилия', namePh: 'Иван Петров',
    email: 'Email', emailPh: 'ivan@example.com',
    phone: 'Телефон', phonePh: '+7 999 123-45-67',
    consent: 'Согласен с обработкой персональных данных и условиями резервационного депозита.',
    failed: 'Не получилось отправить. Попробуйте ещё раз.',
    sending: 'Отправляем…',
    trustHold: '14-дневный эксклюзивный hold — никто другой не сможет купить в это окно.',
    trustForm: 'Reservation form — короткая бумага, не SPA. Сделку у нотариуса PPAT подписываем позже, после due diligence.',
    trustDeposit: 'Депозит ($2–10k) идёт на счёт нотариуса или эскроу — не на личный счёт менеджера.',
    trustRefund: 'Если в 14 дней вы откажетесь по результатам DD — депозит возвращается полностью.',
    trustMore: 'Подробнее о бронировании',
  },
  en: {
    cta: 'Reserve',
    titleOpen: 'Reserve this property',
    titleDone: 'Reservation received',
    close: 'Close',
    submitted: 'Sent to the manager',
    explainer: (email: string) => (
      <>We will email <strong className="text-[#111827] break-all">{email}</strong> within an hour with an invoice for the reservation deposit. The property is held for you for 14 days. Send your passport details in reply to the same email.</>
    ),
    ok: 'Got it',
    intro: 'The property goes on a 14-day hold. The manager will email an invoice for the deposit to the address you provide.',
    name: 'Full name', namePh: 'John Smith',
    email: 'Email', emailPh: 'john@example.com',
    phone: 'Phone', phonePh: '+1 555 123 45 67',
    consent: 'I agree to the processing of personal data and reservation deposit terms.',
    failed: 'Could not send. Please try again.',
    sending: 'Sending…',
    trustHold: '14-day exclusive hold — no one else can complete a purchase in that window.',
    trustForm: 'Reservation form is a short document, not the SPA. The SPA is signed later before a PPAT notary, after due diligence.',
    trustDeposit: 'Deposit ($2–10k) sits with the notary escrow — never on a personal account.',
    trustRefund: 'If you walk inside 14 days based on DD findings — full refund.',
    trustMore: 'Read the full reservation policy',
  },
  id: {
    cta: 'Reservasi',
    titleOpen: 'Reservasi objek ini',
    titleDone: 'Reservasi diterima',
    close: 'Tutup',
    submitted: 'Terkirim ke manajer',
    explainer: (email: string) => (
      <>Dalam satu jam kami akan mengirim ke <strong className="text-[#111827] break-all">{email}</strong> faktur untuk pembayaran deposit reservasi. Objek ditahan untuk Anda selama 14 hari. Kirim data paspor Anda sebagai balasan ke email yang sama.</>
    ),
    ok: 'Mengerti',
    intro: 'Objek akan ditahan (hold) selama 14 hari. Manajer akan mengirim faktur pembayaran deposit ke alamat yang Anda berikan.',
    name: 'Nama lengkap', namePh: 'John Smith',
    email: 'Email', emailPh: 'john@example.com',
    phone: 'Telepon', phonePh: '+62 812 345 6789',
    consent: 'Saya menyetujui pemrosesan data pribadi dan syarat deposit reservasi.',
    failed: 'Gagal mengirim. Silakan coba lagi.',
    sending: 'Mengirim…',
    trustHold: 'Hold eksklusif 14 hari — tidak ada orang lain yang bisa menyelesaikan pembelian dalam jendela itu.',
    trustForm: 'Reservation form adalah dokumen singkat, bukan SPA. SPA ditandatangani kemudian di hadapan notaris PPAT, setelah due diligence.',
    trustDeposit: 'Deposit ($2–10k) disimpan di escrow notaris — tidak pernah di rekening pribadi.',
    trustRefund: 'Jika Anda mundur dalam 14 hari berdasarkan temuan DD — pengembalian penuh.',
    trustMore: 'Baca kebijakan reservasi selengkapnya',
  },
  fr: {
    cta: 'Réserver',
    titleOpen: 'Réserver ce bien',
    titleDone: 'Réservation reçue',
    close: 'Fermer',
    submitted: 'Envoyé au manager',
    explainer: (email: string) => (
      <>Sous une heure, nous enverrons à <strong className="text-[#111827] break-all">{email}</strong> une facture pour l’acompte de réservation. Le bien est bloqué pour vous pendant 14 jours. Envoyez vos données de passeport en réponse au même email.</>
    ),
    ok: 'Compris',
    intro: 'Le bien est bloqué pendant 14 jours. Le manager enverra une facture pour l’acompte à l’adresse que vous indiquez.',
    name: 'Nom complet', namePh: 'John Smith',
    email: 'Email', emailPh: 'john@example.com',
    phone: 'Téléphone', phonePh: '+33 6 12 34 56 78',
    consent: 'J’accepte le traitement des données personnelles et les conditions de l’acompte de réservation.',
    failed: 'Échec de l’envoi. Veuillez réessayer.',
    sending: 'Envoi…',
    trustHold: 'Blocage exclusif de 14 jours — personne d’autre ne peut finaliser un achat durant cette fenêtre.',
    trustForm: 'Le reservation form est un court document, pas le SPA. Le SPA est signé plus tard devant un notaire PPAT, après la due diligence.',
    trustDeposit: 'L’acompte (2–10k $) est détenu par le séquestre du notaire — jamais sur un compte personnel.',
    trustRefund: 'Si vous vous retirez sous 14 jours sur la base des conclusions de la DD — remboursement intégral.',
    trustMore: 'Lire la politique de réservation complète',
  },
  de: {
    cta: 'Reservieren',
    titleOpen: 'Diese Immobilie reservieren',
    titleDone: 'Reservierung eingegangen',
    close: 'Schließen',
    submitted: 'An den Manager gesendet',
    explainer: (email: string) => (
      <>Wir senden innerhalb einer Stunde eine E-Mail an <strong className="text-[#111827] break-all">{email}</strong> mit einer Rechnung für die Reservierungsanzahlung. Die Immobilie ist 14 Tage lang für Sie reserviert. Senden Sie Ihre Passdaten als Antwort auf dieselbe E-Mail.</>
    ),
    ok: 'Verstanden',
    intro: 'Die Immobilie wird für 14 Tage blockiert. Der Manager sendet eine Rechnung für die Anzahlung an die von Ihnen angegebene Adresse.',
    name: 'Vollständiger Name', namePh: 'John Smith',
    email: 'E-Mail', emailPh: 'john@example.com',
    phone: 'Telefon', phonePh: '+49 151 23456789',
    consent: 'Ich stimme der Verarbeitung personenbezogener Daten und den Bedingungen der Reservierungsanzahlung zu.',
    failed: 'Senden fehlgeschlagen. Bitte versuchen Sie es erneut.',
    sending: 'Wird gesendet…',
    trustHold: '14-tägige exklusive Blockierung — niemand sonst kann in diesem Fenster einen Kauf abschließen.',
    trustForm: 'Das reservation form ist ein kurzes Dokument, nicht der SPA. Der SPA wird später vor einem PPAT-Notar unterzeichnet, nach der Due Diligence.',
    trustDeposit: 'Die Anzahlung (2–10k $) liegt auf dem Notar-Treuhandkonto — niemals auf einem Privatkonto.',
    trustRefund: 'Treten Sie innerhalb von 14 Tagen aufgrund der DD-Ergebnisse zurück — vollständige Rückerstattung.',
    trustMore: 'Vollständige Reservierungsrichtlinie lesen',
  },
  zh: {
    cta: '预订',
    titleOpen: '预订此房产',
    titleDone: '已收到预订',
    close: '关闭',
    submitted: '已发送给经理',
    explainer: (email: string) => (
      <>我们将在一小时内向 <strong className="text-[#111827] break-all">{email}</strong> 发送预订定金的账单。该房产将为您保留 14 天。请回复同一邮件并附上您的护照信息。</>
    ),
    ok: '知道了',
    intro: '房产将被保留 14 天。经理将向您提供的邮箱发送定金账单。',
    name: '全名', namePh: 'John Smith',
    email: '电子邮箱', emailPh: 'john@example.com',
    phone: '电话', phonePh: '+86 138 0013 8000',
    consent: '我同意处理个人数据及预订定金条款。',
    failed: '发送失败，请重试。',
    sending: '发送中…',
    trustHold: '14 天专属保留——在此期间没有其他人能完成购买。',
    trustForm: 'reservation form 是一份简短文件，并非 SPA。SPA 在尽职调查后于 PPAT 公证人面前签署。',
    trustDeposit: '定金（2–10k 美元）存于公证人托管账户——绝不存入个人账户。',
    trustRefund: '若您在 14 天内根据尽职调查结果退出——全额退款。',
    trustMore: '阅读完整预订政策',
  },
  nl: {
    cta: 'Reserveren',
    titleOpen: 'Dit object reserveren',
    titleDone: 'Reservering ontvangen',
    close: 'Sluiten',
    submitted: 'Verzonden naar de manager',
    explainer: (email: string) => (
      <>Wij e-mailen binnen een uur naar <strong className="text-[#111827] break-all">{email}</strong> een factuur voor de reserveringsaanbetaling. Het object wordt 14 dagen voor u vastgehouden. Stuur uw paspoortgegevens in antwoord op dezelfde e-mail.</>
    ),
    ok: 'Begrepen',
    intro: 'Het object wordt 14 dagen vastgehouden. De manager e-mailt een factuur voor de aanbetaling naar het door u opgegeven adres.',
    name: 'Volledige naam', namePh: 'John Smith',
    email: 'E-mail', emailPh: 'john@example.com',
    phone: 'Telefoon', phonePh: '+31 6 12345678',
    consent: 'Ik ga akkoord met de verwerking van persoonsgegevens en de voorwaarden van de reserveringsaanbetaling.',
    failed: 'Verzenden mislukt. Probeer het opnieuw.',
    sending: 'Verzenden…',
    trustHold: 'Exclusieve vasthouding van 14 dagen — niemand anders kan in dat venster een aankoop afronden.',
    trustForm: 'Het reservation form is een kort document, niet de SPA. De SPA wordt later voor een PPAT-notaris ondertekend, na de due diligence.',
    trustDeposit: 'De aanbetaling (2–10k $) staat bij de escrow van de notaris — nooit op een privérekening.',
    trustRefund: 'Ziet u binnen 14 dagen af op basis van DD-bevindingen — volledige restitutie.',
    trustMore: 'Lees het volledige reserveringsbeleid',
  },
  ban: {
    cta: 'Reservasi',
    titleOpen: 'Reservasi objek puniki',
    titleDone: 'Reservasi katampi',
    close: 'Tutup',
    submitted: 'Kakirim ka manajer',
    explainer: (email: string) => (
      <>Ring galah asiki jam tiang jagi ngirim ka <strong className="text-[#111827] break-all">{email}</strong> faktur antuk pambayahan deposit reservasi. Objek katahan antuk Ragane salami 14 dina. Kirim data paspor Ragane dados pasaur ka email sane pateh.</>
    ),
    ok: 'Uning',
    intro: 'Objek jagi katahan salami 14 dina. Manajer jagi ngirim faktur pambayahan deposit ka alamat sane kaicen Ragane.',
    name: 'Wasta jangkep', namePh: 'John Smith',
    email: 'Email', emailPh: 'john@example.com',
    phone: 'Telepon', phonePh: '+62 812 345 6789',
    consent: 'Tiang cumpu ring pamrosesan data pribadi miwah syarat deposit reservasi.',
    failed: 'Nenten prasida ngirim. Ngiring cobain malih.',
    sending: 'Ngirim…',
    trustHold: 'Hold eksklusif 14 dina — nenten wenten anak lianan sane prasida muputang tumbasan ring jendela punika.',
    trustForm: 'Reservation form inggih punika dokumen bawak, boya SPA. SPA katandatangani salanturnyane ring ajeng notaris PPAT, sasampun due diligence.',
    trustDeposit: 'Deposit (2–10k $) kagenahang ring escrow notaris — nenten naenin ring rekening pribadi.',
    trustRefund: 'Yening Ragane mundur ring 14 dina manut temuan DD — pengembalian penuh.',
    trustMore: 'Wacen kebijakan reservasi jangkep',
  },
  pl: {
    cta: 'Zarezerwuj',
    titleOpen: 'Zarezerwuj tę nieruchomość',
    titleDone: 'Rezerwacja przyjęta',
    close: 'Zamknij',
    submitted: 'Wysłano do menedżera',
    explainer: (email: string) => (
      <>W ciągu godziny wyślemy na <strong className="text-[#111827] break-all">{email}</strong> fakturę na wpłatę depozytu rezerwacyjnego. Nieruchomość jest zarezerwowana dla Ciebie na 14 dni. Dane paszportowe prześlij w odpowiedzi na ten sam email.</>
    ),
    ok: 'Rozumiem',
    intro: 'Nieruchomość zostaje zablokowana na 14 dni. Menedżer wyśle fakturę na depozyt na podany adres email.',
    name: 'Imię i nazwisko', namePh: 'John Smith',
    email: 'Email', emailPh: 'john@example.com',
    phone: 'Telefon', phonePh: '+48 512 345 678',
    consent: 'Zgadzam się na przetwarzanie danych osobowych i warunki depozytu rezerwacyjnego.',
    failed: 'Nie udało się wysłać. Spróbuj ponownie.',
    sending: 'Wysyłanie…',
    trustHold: 'Ekskluzywna blokada na 14 dni — nikt inny nie sfinalizuje zakupu w tym oknie.',
    trustForm: 'Reservation form to krótki dokument, nie SPA. SPA podpisuje się później u notariusza PPAT, po due diligence.',
    trustDeposit: 'Depozyt ($2–10k) trafia na escrow notariusza — nigdy na konto osobiste.',
    trustRefund: 'Jeśli wycofasz się w ciągu 14 dni na podstawie wyników DD — pełny zwrot.',
    trustMore: 'Przeczytaj pełną politykę rezerwacji',
  },
  uk: {
    cta: 'Забронювати',
    titleOpen: 'Забронювати цей обʼєкт',
    titleDone: 'Бронь прийнято',
    close: 'Закрити',
    submitted: 'Надіслано менеджеру',
    explainer: (email: string) => (
      <>Протягом години ми надішлемо на <strong className="text-[#111827] break-all">{email}</strong> рахунок для оплати резерваційного депозиту. Обʼєкт заброньовано за вами на 14 днів. Паспортні дані надішліть у відповідь на той самий email.</>
    ),
    ok: 'Зрозуміло',
    intro: 'Обʼєкт стає на 14-денний hold. Менеджер надішле рахунок на депозит на вказаний email.',
    name: 'Імʼя та прізвище', namePh: 'John Smith',
    email: 'Email', emailPh: 'john@example.com',
    phone: 'Телефон', phonePh: '+380 67 123 45 67',
    consent: 'Погоджуюся з обробкою персональних даних та умовами резерваційного депозиту.',
    failed: 'Не вдалося надіслати. Спробуйте ще раз.',
    sending: 'Надсилаємо…',
    trustHold: '14-денний ексклюзивний hold — ніхто інший не зможе купити в цьому вікні.',
    trustForm: 'Reservation form — короткий документ, не SPA. SPA підписуємо пізніше у нотаріуса PPAT, після due diligence.',
    trustDeposit: 'Депозит ($2–10k) лежить на ескроу нотаріуса — ніколи на особистому рахунку.',
    trustRefund: 'Якщо ви відмовитесь протягом 14 днів за результатами DD — повне повернення.',
    trustMore: 'Докладніше про бронювання',
  },
} as const

// Stage-1 reservation flow: visitor leaves name + email + phone. Backend
// records the row and pings the operator on Telegram. The operator then
// emails the invoice manually; payment + passport docs come back through
// that email thread (handled outside this UI).
export function ReserveButton({
  listingKind,
  listingId,
  listingSlug,
  listingTitle,
  listingPriceUsd = null,
  className = '',
}: {
  listingKind: 'villa' | 'apartment'
  listingId: string
  listingSlug: string
  listingTitle: string | null
  listingPriceUsd?: number | null
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const pathname = usePathname() ?? ''
  const lang: Lang = detectLang(pathname)
  const c = pickCopy(COPY, lang)

  const canSubmit = name.trim().length > 0
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    && phone.trim().length >= 6
    && agree
    && !busy

  // Esc closes — kept consistent with the presentation modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy])

  // Prevent the page from scrolling under the modal — important on mobile
  // where pinching/scrolling the body while the keyboard is open is a mess.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_kind: listingKind,
          listing_id: listingId,
          listing_slug: listingSlug,
          listing_title: listingTitle,
          listing_price_usd: listingPriceUsd,
          contact_name: name.trim(),
          contact_email: email.trim(),
          contact_phone: phone.trim(),
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) throw new Error(j?.error ?? 'server_error')
      setDone(true)
    } catch (e) {
      console.error('[reserve] failed', e)
      setError(c.failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setDone(false); setOpen(true) }}
        className={`inline-flex w-full md:w-auto items-center justify-center gap-2 min-h-[54px] py-2 px-6 rounded-[10px] bg-white border border-[var(--color-border)] hover:border-[var(--color-text-muted)] text-[#1A1F1C] text-[15px] md:text-[16px] font-semibold text-center leading-tight transition-colors ${className}`}
      >
        <Lock size={18} strokeWidth={1.6} /> {c.cta}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 sm:px-4 overscroll-contain"
          onClick={() => { if (!busy) setOpen(false) }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full sm:max-w-md bg-white shadow-xl flex flex-col rounded-t-3xl sm:rounded-3xl
                       max-h-[92vh] sm:max-h-[88vh] pb-[max(env(safe-area-inset-bottom),0.5rem)]
                       animate-[reserveSlide_220ms_ease-out]"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag-handle hint on mobile so the bottom-sheet feels native */}
            <div className="sm:hidden mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-black/10" />

            <div className="flex items-start justify-between gap-3 px-5 sm:px-7 pt-3 sm:pt-7 pb-2">
              <h3 className="text-[19px] sm:text-[22px] font-semibold tracking-tight text-[#111827] leading-tight">
                {done ? c.titleDone : c.titleOpen}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 text-[#111827] disabled:opacity-50"
                aria-label={c.close}
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 sm:px-7 pb-5 sm:pb-7">
              {done ? (
                <div>
                  <div className="flex items-center gap-2 text-[var(--color-primary-pressed)] mb-3">
                    <CheckCircle2 size={20} />
                    <span className="text-[15px] font-medium">{c.submitted}</span>
                  </div>
                  <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed mb-5">
                    {c.explainer(email.trim())}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-full inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] font-medium h-12 transition-colors"
                  >
                    {c.ok}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed mb-4">
                    {c.intro}
                  </p>

                  {/* Trust strip — four bullets that close the gap a foreign
                      investor opens up between "I tap reserve" and "I send
                      money". Compact icons + one short line each. */}
                  <ul className="rounded-xl bg-[var(--color-search-bg)] p-3 space-y-2 mb-4">
                    {[
                      { Icon: Calendar, t: c.trustHold },
                      { Icon: FileText, t: c.trustForm },
                      { Icon: Wallet,   t: c.trustDeposit },
                      { Icon: Undo2,    t: c.trustRefund },
                    ].map(({ Icon, t }, i) => (
                      <li key={i} className="flex gap-2 items-start text-[12px] leading-snug text-[var(--color-text)]">
                        <Icon size={13} strokeWidth={1.8} className="text-[var(--color-primary)] shrink-0 mt-[2px]" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={switchLangPath('/ru/rezervirovanie', lang)}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[12px] text-[var(--color-primary)] hover:text-[var(--color-primary-pressed)] mb-5 no-underline"
                  >
                    {c.trustMore} <ChevronRight size={12} />
                  </Link>

                  <form
                    onSubmit={e => { e.preventDefault(); submit() }}
                    className="space-y-3.5"
                  >
                    <Field id="rsv-name" label={c.name} value={name} onChange={setName} placeholder={c.namePh} autoComplete="name" required />
                    <Field id="rsv-email" label={c.email} value={email} onChange={setEmail} placeholder={c.emailPh} inputMode="email" autoComplete="email" required />
                    <Field id="rsv-phone" label={c.phone} value={phone} onChange={setPhone} placeholder={c.phonePh} inputMode="tel" autoComplete="tel" required />
                    <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agree}
                        onChange={e => setAgree(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[var(--color-primary)] shrink-0"
                      />
                      <span className="text-[12px] text-[var(--color-text-muted)] leading-snug">
                        {c.consent}
                      </span>
                    </label>
                    {error && <p className="text-[13px] text-[#B91C1C]">{error}</p>}
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] font-semibold h-12 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busy ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {c.sending}
                        </>
                      ) : (
                        c.cta
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

        </div>
      )}
    </>
  )
}

function Field({
  id, label, value, onChange, placeholder, required, inputMode, autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  inputMode?: 'text' | 'tel' | 'email'
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        autoComplete={autoComplete}
        // 16px font-size suppresses iOS Safari's auto-zoom on focus.
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 h-12 text-[16px] text-[#111827] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-colors"
      />
    </div>
  )
}
