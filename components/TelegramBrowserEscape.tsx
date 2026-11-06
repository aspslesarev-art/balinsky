'use client'
import { useEffect, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'

// Вход по ссылке из бота открывается во встроенном браузере Телеграма, и вход
// остаётся там: в Safari/Chrome сайт снова просит код (владелец 06.11.2026).
// Вошедшему человеку внутри Телеграма показываем плашку «Открыть в Safari»:
// сервер выдаёт одноразовую ссылку входа (/api/auth/handoff), и она
// открывается уже в обычном браузере — там вход держится 180 дней.

const DISMISS_KEY = 'bx_tg_escape_dismissed'

function inTelegram(): boolean {
  const w = window as unknown as { TelegramWebviewProxy?: unknown }
  return typeof w.TelegramWebviewProxy !== 'undefined' || /Telegram/i.test(navigator.userAgent)
}

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)

function externalUrl(url: string): string {
  // iOS: схема x-safari-https открывает ссылку в Safari из любого приложения.
  if (isIOS()) return url.replace(/^https?:\/\//, 'x-safari-https://')
  // Android: intent без пакета отдаёт ссылку браузеру по умолчанию.
  if (/Android/i.test(navigator.userAgent)) {
    return `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;end`
  }
  return url
}

export function TelegramBrowserEscape() {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  // Запасной путь: если Safari не открылся, ссылку можно скопировать и вставить вручную.
  const [fallback, setFallback] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      if (document.cookie.indexOf('bx_auth=1') === -1) return
      if (sessionStorage.getItem(DISMISS_KEY)) return
      if (inTelegram()) setShow(true)
    } catch {}
  }, [])

  if (!show) return null

  async function open() {
    setBusy(true)
    setFailed(false)
    try {
      const r = await fetch('/api/auth/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next: location.pathname + location.search }),
      })
      if (!r.ok) throw new Error(String(r.status))
      const { url } = (await r.json()) as { url: string }
      window.location.href = externalUrl(url)
      setTimeout(() => { if (document.visibilityState === 'visible') setFallback(url) }, 2000)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
    setShow(false)
  }

  return (
    <div role="region" aria-label="Вход в обычном браузере"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[480px] rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/.04),0_8px_24px_rgb(0_0_0/.10)]">
      <div className="flex items-start gap-3">
        <p className="m-0 flex-1 text-[14px] leading-snug text-[var(--color-text)]">
          Вы во встроенном браузере Телеграма - здесь вход не сохранится. Откройте сайт в {isIOS() ? 'Safari' : 'браузере'}, и входить больше не придётся.
        </p>
        <button type="button" onClick={dismiss} aria-label="Закрыть"
          className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">
          <X size={18} aria-hidden />
        </button>
      </div>
      <button type="button" onClick={open} disabled={busy}
        className="mt-3 inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[var(--color-primary-hover)] px-5 text-[15px] font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
        <ExternalLink size={18} strokeWidth={1.8} aria-hidden />
        {busy ? 'Открываю…' : `Открыть в ${isIOS() ? 'Safari' : 'браузере'}`}
      </button>
      {failed && <p className="mb-0 mt-2 text-[13px] text-[#B42318]">Не получилось. Попробуйте ещё раз через минуту.</p>}
      {fallback && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="m-0 text-[13px] leading-snug text-[var(--color-text-muted)]">
            Если {isIOS() ? 'Safari' : 'браузер'} не открылся: скопируйте ссылку, откройте {isIOS() ? 'Safari' : 'браузер'} и вставьте её в адресную строку. Ссылка работает 15 минут и один раз.
          </p>
          <button type="button"
            onClick={() => { navigator.clipboard?.writeText(fallback).then(() => setCopied(true)).catch(() => {}) }}
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-white px-4 text-[14px] font-semibold text-[var(--color-text)] hover:border-[var(--color-text-muted)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">
            {copied ? 'Ссылка скопирована' : 'Скопировать ссылку'}
          </button>
        </div>
      )}
    </div>
  )
}
