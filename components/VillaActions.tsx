'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Heart, Share2, Flag, Check, X } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { useWishlist } from '@/components/WishlistContext'
import type { WishlistInput } from '@/components/WishlistButton'

// Действия в полосе под фото (владелец 20.11.2026, макет ActA): значок +
// подпись в строку. «Сохранить» кладёт в избранное — там же сравнение вилл
// таблицей. «Сообщить об ошибке» приходит владельцу в бота.

const COPY = {
  ru: { save: 'Сохранить', saved: 'Сохранено', share: 'Поделиться', copied: 'Ссылка скопирована', print: 'Печать', report: 'Сообщить об ошибке', rTitle: 'Что не так на странице?', rPh: 'Например: цена другая, вилла продана, неверная площадь', rContact: 'Ваш контакт, если нужен ответ (необязательно)', rSend: 'Отправить', rDone: 'Спасибо! Проверим и поправим.', rErr: 'Не отправилось. Попробуйте ещё раз.', rEmpty: 'Напишите, что не так', close: 'Закрыть' },
  en: { save: 'Save', saved: 'Saved', share: 'Share', copied: 'Link copied', print: 'Print', report: 'Report a problem', rTitle: 'What’s wrong on this page?', rPh: 'E.g. the price differs, the villa is sold, wrong area', rContact: 'Your contact if you want a reply (optional)', rSend: 'Send', rDone: 'Thank you! We’ll check and fix it.', rErr: 'Not sent. Please try again.', rEmpty: 'Please describe the problem', close: 'Close' },
  id: { save: 'Simpan', saved: 'Tersimpan', share: 'Bagikan', copied: 'Tautan disalin', print: 'Cetak', report: 'Laporkan masalah', rTitle: 'Apa yang salah di halaman ini?', rPh: 'Mis.: harga berbeda, vila terjual, luas salah', rContact: 'Kontak Anda jika ingin dibalas (opsional)', rSend: 'Kirim', rDone: 'Terima kasih! Akan kami periksa.', rErr: 'Gagal terkirim. Coba lagi.', rEmpty: 'Tuliskan masalahnya', close: 'Tutup' },
  fr: { save: 'Enregistrer', saved: 'Enregistré', share: 'Partager', copied: 'Lien copié', print: 'Imprimer', report: 'Signaler un problème', rTitle: 'Qu’est-ce qui ne va pas ?', rPh: 'Ex. : prix différent, villa vendue, surface erronée', rContact: 'Votre contact pour une réponse (facultatif)', rSend: 'Envoyer', rDone: 'Merci ! Nous allons vérifier.', rErr: 'Échec de l’envoi. Réessayez.', rEmpty: 'Décrivez le problème', close: 'Fermer' },
  de: { save: 'Merken', saved: 'Gemerkt', share: 'Teilen', copied: 'Link kopiert', print: 'Drucken', report: 'Fehler melden', rTitle: 'Was stimmt auf dieser Seite nicht?', rPh: 'Z. B. anderer Preis, Villa verkauft, falsche Fläche', rContact: 'Ihr Kontakt für eine Antwort (optional)', rSend: 'Senden', rDone: 'Danke! Wir prüfen das.', rErr: 'Nicht gesendet. Bitte erneut versuchen.', rEmpty: 'Bitte beschreiben Sie den Fehler', close: 'Schließen' },
  zh: { save: '收藏', saved: '已收藏', share: '分享', copied: '链接已复制', print: '打印', report: '报告问题', rTitle: '页面哪里有问题？', rPh: '例如：价格不同、别墅已售、面积有误', rContact: '如需回复，请留下联系方式（可选）', rSend: '发送', rDone: '谢谢！我们会核实并修正。', rErr: '发送失败，请重试。', rEmpty: '请描述问题', close: '关闭' },
  nl: { save: 'Bewaren', saved: 'Bewaard', share: 'Delen', copied: 'Link gekopieerd', print: 'Afdrukken', report: 'Probleem melden', rTitle: 'Wat klopt er niet?', rPh: 'Bijv. andere prijs, villa verkocht, verkeerde oppervlakte', rContact: 'Uw contact voor een antwoord (optioneel)', rSend: 'Versturen', rDone: 'Bedankt! We controleren het.', rErr: 'Niet verstuurd. Probeer opnieuw.', rEmpty: 'Beschrijf het probleem', close: 'Sluiten' },
  ban: { save: 'Simpen', saved: 'Sampun kasimpen', share: 'Bagiang', copied: 'Tautan kasalin', print: 'Cetak', report: 'Laporang masalah', rTitle: 'Napi sane iwang ring halaman puniki?', rPh: 'Conto: aji malianan, vila sampun kaadol', rContact: 'Kontak ragane (nenten wajib)', rSend: 'Kirim', rDone: 'Suksma! Jagi kacingakin.', rErr: 'Nenten kakirim. Cobak malih.', rEmpty: 'Tulis masalahne', close: 'Tutup' },
  pl: { save: 'Zapisz', saved: 'Zapisano', share: 'Udostępnij', copied: 'Link skopiowany', print: 'Drukuj', report: 'Zgłoś problem', rTitle: 'Co jest nie tak na stronie?', rPh: 'Np. inna cena, willa sprzedana, zła powierzchnia', rContact: 'Twój kontakt, jeśli chcesz odpowiedź (opcjonalnie)', rSend: 'Wyślij', rDone: 'Dziękujemy! Sprawdzimy to.', rErr: 'Nie wysłano. Spróbuj ponownie.', rEmpty: 'Opisz problem', close: 'Zamknij' },
  uk: { save: 'Зберегти', saved: 'Збережено', share: 'Поділитися', copied: 'Посилання скопійовано', print: 'Друк', report: 'Повідомити про помилку', rTitle: 'Що не так на сторінці?', rPh: 'Наприклад: ціна інша, віллу продано, неправильна площа', rContact: 'Ваш контакт, якщо потрібна відповідь (необов’язково)', rSend: 'Надіслати', rDone: 'Дякуємо! Перевіримо й виправимо.', rErr: 'Не надіслано. Спробуйте ще раз.', rEmpty: 'Напишіть, що не так', close: 'Закрити' },
} as const

const ACT = 'inline-flex items-center gap-1.5 cursor-pointer border-0 bg-transparent p-0 py-1 text-[14px] text-[#0F1A15] transition-colors duration-[120ms] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'

// Круглый значок на фото с подписью при наведении (макет BtnA, владелец 20.11.2026).
export const ICON_BTN = 'group/ib relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-white/90 text-[#0F1A15] shadow-[0_1px_2px_rgb(0_0_0/.08),0_4px_12px_rgb(0_0_0/.12)] transition-colors duration-[120ms] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
export function IconTip({ text }: { text: string }) {
  return <span className="pointer-events-none absolute right-0 top-[calc(100%+6px)] whitespace-nowrap rounded bg-[#0F1A15] px-2 py-1 text-[12px] font-normal text-white opacity-0 transition-opacity duration-[120ms] group-hover/ib:opacity-100 group-focus-visible/ib:opacity-100">{text}</span>
}

export function VillaActions({ lang, item, title, proLinks, icons = false }: { lang: Lang; item: WishlistInput; title: string; proLinks?: ReactNode; icons?: boolean }) {
  const c = pickCopy(COPY, lang)
  const { has, toggle, ready } = useWishlist()
  const saved = ready && has(item.kind, item.slug)
  const [copied, setCopied] = useState(false)
  const [report, setReport] = useState(false)

  async function share() {
    const url = window.location.href.split('#')[0]
    if (navigator.share && window.matchMedia('(hover: none)').matches) {
      try { await navigator.share({ title, url }); return } catch { return }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* нет доступа к буферу */ }
  }

  if (icons) return (
    <div className="flex items-center gap-2">
      <button type="button" aria-pressed={saved} aria-label={saved ? c.saved : c.save} onClick={() => toggle({ ...item, savedAt: new Date().toISOString() })} className={`${ICON_BTN} ${saved ? '!text-[var(--color-primary)]' : ''}`}>
        <Heart size={18} strokeWidth={1.8} fill={saved ? 'currentColor' : 'none'} aria-hidden /><IconTip text={saved ? c.saved : c.save} />
      </button>
      <button type="button" aria-label={c.share} onClick={share} className={ICON_BTN}>
        {copied ? <Check size={18} strokeWidth={1.8} aria-hidden /> : <Share2 size={18} strokeWidth={1.8} aria-hidden />}<IconTip text={copied ? c.copied : c.share} />
      </button>
      {proLinks}
      <button type="button" aria-label={c.report} onClick={() => setReport(true)} className={ICON_BTN}>
        <Flag size={18} strokeWidth={1.8} aria-hidden /><IconTip text={c.report} />
      </button>
      {report && <ReportDialog lang={lang} title={title} onClose={() => setReport(false)} />}
    </div>
  )

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <button type="button" aria-pressed={saved} onClick={() => toggle({ ...item, savedAt: new Date().toISOString() })} className={`${ACT} ${saved ? '!text-[var(--color-primary)]' : ''}`}>
        <Heart size={16} strokeWidth={1.7} fill={saved ? 'currentColor' : 'none'} aria-hidden /> {saved ? c.saved : c.save}
      </button>
      {proLinks}
      <button type="button" onClick={share} className={ACT}>
        {copied ? <Check size={16} strokeWidth={1.7} aria-hidden /> : <Share2 size={16} strokeWidth={1.7} aria-hidden />} <span aria-live="polite">{copied ? c.copied : c.share}</span>
      </button>
      <button type="button" onClick={() => setReport(true)} className={ACT}>
        <Flag size={16} strokeWidth={1.7} aria-hidden /> {c.report}
      </button>
      {report && <ReportDialog lang={lang} title={title} onClose={() => setReport(false)} />}
    </div>
  )
}

function ReportDialog({ lang, title, onClose }: { lang: Lang; title: string; onClose: () => void }) {
  const c = pickCopy(COPY, lang)
  const [text, setText] = useState('')
  const [contact, setContact] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [err, setErr] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (text.trim().length < 3) { setErr(c.rEmpty); return }
    setState('sending'); setErr(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 'report', message: text.trim().slice(0, 2000), contactText: contact.trim().slice(0, 100) || undefined, listingTitle: title, pagePath: window.location.pathname }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setState('done')
    } catch { setErr(c.rErr); setState('idle') }
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-[rgb(15_26_21/.45)] p-0 md:items-center md:p-6" onClick={onClose}>
      <form onSubmit={send} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={c.rTitle}
        className="flex w-full max-w-[480px] flex-col gap-4 rounded-t-xl bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/.06),0_16px_40px_rgb(0_0_0/.18)] md:rounded-md">
        <div className="flex items-start justify-between gap-4">
          <span className="text-[20px] font-semibold tracking-[-0.01em] text-[#0F1A15]">{c.rTitle}</span>
          <button type="button" onClick={onClose} aria-label={c.close} className="-m-2 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent text-[#6B7570] hover:text-[#0F1A15]"><X size={20} /></button>
        </div>
        {state === 'done' ? (
          <p className="flex items-center gap-2 text-[15px] text-[#0F1A15]" role="status"><Check size={18} className="text-[var(--color-primary)]" aria-hidden />{c.rDone}</p>
        ) : (<>
          <textarea ref={ref} value={text} onChange={e => { setText(e.target.value); setErr(null) }} placeholder={c.rPh} rows={4} maxLength={2000}
            className="w-full resize-none rounded-md border border-[#D9DFDC] p-3 text-[16px] leading-[1.5] text-[#0F1A15] outline-none placeholder:text-[#9AA39E] focus:border-[var(--color-primary)]" />
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder={c.rContact} maxLength={100}
            className="h-12 w-full rounded-md border border-[#D9DFDC] px-3 text-[16px] text-[#0F1A15] outline-none placeholder:text-[#9AA39E] focus:border-[var(--color-primary)]" />
          {err && <span className="text-[13px] text-[#B42318]" role="alert">{err}</span>}
          <button type="submit" disabled={state === 'sending'} className="inline-flex h-12 cursor-pointer items-center justify-center rounded-xl bg-[var(--color-primary)] text-[16px] font-semibold text-white hover:bg-[var(--color-primary-pressed)] disabled:opacity-70">{c.rSend}</button>
        </>)}
      </form>
    </div>,
    document.body,
  )
}
