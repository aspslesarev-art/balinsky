'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Вход по коду из Telegram.
//
// Шаг 1 — сайт заводит challenge (POST /api/auth/start) и открывает бота с
// ним в deep-link. Шаг 2 — посетитель вводит четыре цифры, которые прислал
// бот. Код действителен только вместе с challenge из httpOnly-куки этого
// браузера, поэтому перебор чужого аккаунта невозможен.
//
// Challenge выпускается по клику, а не при рендере: гейт живёт внутри
// ISR-страниц, и выпущенный на рендере challenge был бы общим для всех.
//
// Почему бот открывается по-разному на мобильном и на десктопе. На телефоне
// `window.open` заводит ВТОРУЮ вкладку, её тут же перехватывает приложение
// Telegram — и поле для кода остаётся в первой, до которой пользователь уже
// не догадывается добраться: экран после возврата показывает t.me. Поэтому
// на touch-устройствах уходим в бота той же вкладкой: универсальная ссылка
// t.me отдаёт управление приложению, а «назад» возвращает ровно на страницу
// с формой. На десктопе новая вкладка удобнее и ничего не теряет.
//
// И в том, и в другом случае «ждём код» переживает уход со страницы: флаг
// лежит в sessionStorage, поэтому после возврата (в том числе с перезагрузкой)
// открыт сразу ввод кода, а не кнопка «Получить код». Флаг общий для всех
// гейтов страницы — вводить код можно в том блоке, который перед глазами.

type Step = 'idle' | 'code'

const CODE_LENGTH = 4

/** Ждём код: время старта, чтобы флаг не пережил сам код. */
const PENDING_KEY = 'bx_login_pending'
const PENDING_TTL_MS = 15 * 60 * 1000
/** Синхронизация всех форм на странице между собой. */
const PENDING_EVENT = 'bx-login-pending'

function readPending(): boolean {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY)
    if (!raw) return false
    const startedAt = Number(raw)
    if (!Number.isFinite(startedAt) || Date.now() - startedAt > PENDING_TTL_MS) {
      window.sessionStorage.removeItem(PENDING_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

function writePending(on: boolean) {
  try {
    if (on) window.sessionStorage.setItem(PENDING_KEY, String(Date.now()))
    else window.sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // Приватный режим Safari — обойдёмся состоянием в памяти.
  }
  window.dispatchEvent(new Event(PENDING_EVENT))
}

/**
 * Телефон/планшет: там новая вкладка и есть источник проблемы.
 *
 * Две проверки, потому что каждой поодиночке мало: iPadOS в Safari
 * представляется десктопом и медиазапрос не спасает, а `maxTouchPoints`
 * бывает ненулевым у ноутбуков с сенсорным экраном — там новая вкладка
 * как раз уместна, но и медиазапрос на них `fine`.
 */
function isTouchDevice(): boolean {
  try {
    if (window.matchMedia('(pointer: coarse)').matches) return true
    return navigator.maxTouchPoints > 0 && !window.matchMedia('(hover: hover)').matches
  } catch {
    return false
  }
}

export function LoginCodeForm({ ctaLabel }: { ctaLabel: string }) {
  const [step, setStep] = useState<Step>('idle')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Возврат из Telegram: показать ввод кода и, если карточка на экране,
  // поставить курсор в поле. Фокус только у видимой формы — иначе три гейта
  // страницы начали бы перетягивать скролл друг у друга.
  const focusIfVisible = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.bottom > 0 && r.top < window.innerHeight) el.focus()
  }, [])

  useEffect(() => {
    const sync = () => setStep(readPending() ? 'code' : 'idle')
    const onReturn = () => {
      if (!readPending()) return
      setStep('code')
      // Ввод появляется в этом же кадре — фокус после отрисовки.
      requestAnimationFrame(focusIfVisible)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') onReturn()
    }

    // На монтировании — сразу onReturn: возврат из Telegram часто приходит
    // с восстановлением страницы, и pageshow успевает отработать до того,
    // как этот эффект повесит слушателя.
    onReturn()
    window.addEventListener(PENDING_EVENT, sync)
    window.addEventListener('pageshow', onReturn)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(PENDING_EVENT, sync)
      window.removeEventListener('pageshow', onReturn)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [focusIfVisible])

  async function start() {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/auth/start', { method: 'POST' })
      const data = await r.json()
      if (!r.ok || !data?.url) throw new Error('start')

      // Флаг ставим ДО ухода со страницы: на мобильном возврата в этот
      // обработчик уже не будет.
      writePending(true)
      setStep('code')

      if (isTouchDevice()) {
        window.location.href = data.url
        return
      }
      // Десктоп: новая вкладка. Если её съел блокировщик всплывающих окон
      // (жест уже «потрачен» ожиданием fetch), уходим той же вкладкой —
      // молча ничего не делать здесь нельзя.
      //
      // `opener` обнуляем вручную, а не флагом `noopener` в features: с ним
      // window.open по спецификации возвращает null всегда, и блокировку
      // всплывающих окон стало бы не отличить от нормально открытой вкладки.
      const opened = window.open(data.url, '_blank')
      if (!opened) {
        window.location.href = data.url
        return
      }
      opened.opener = null
      requestAnimationFrame(focusIfVisible)
    } catch {
      writePending(false)
      setError('Не получилось начать вход. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  async function submit(value: string) {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/auth/code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: value }),
      })
      const data = await r.json()
      if (r.ok && data?.ok) {
        writePending(false)
        // Перезагрузка — самый честный способ показать открытый контент:
        // блюр снимает инлайн-скрипт в layout по куке bx_auth.
        window.location.reload()
        return
      }
      setError(typeof data?.error === 'string' ? data.error : 'Неверный код.')
      setCode('')
    } catch {
      setError('Сеть недоступна. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  function onCodeChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH)
    setCode(digits)
    if (digits.length === CODE_LENGTH) void submit(digits)
  }

  if (step === 'idle') {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-xl bg-[#229ED9] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1b8ec2] disabled:opacity-60"
        >
          {busy ? 'Открываем Telegram…' : ctaLabel}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mt-4">
      <p className="text-sm text-gray-600">Бот прислал четыре цифры — введите их здесь.</p>
      <input
        ref={inputRef}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        value={code}
        disabled={busy}
        onChange={e => onCodeChange(e.target.value)}
        placeholder="0000"
        aria-label="Код из Telegram"
        className="mt-2 w-40 rounded-xl border border-gray-300 px-4 py-2.5 text-center text-2xl font-semibold tracking-[0.4em] text-gray-900 outline-none focus:border-[#229ED9] disabled:opacity-60"
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-500">
        Код действует 15 минут.{' '}
        <button type="button" onClick={start} disabled={busy} className="underline hover:no-underline">
          Прислать новый
        </button>
      </p>
    </div>
  )
}
