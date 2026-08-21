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
// `window.open` заводил ВТОРУЮ вкладку, её тут же перехватывало приложение
// Telegram — и поле для кода оставалось в первой, до которой пользователь уже
// не добирался: после возврата в браузер на экране t.me.
//
// Ссылка `https://t.me/...` эту вкладку не спасает: universal link отдаёт
// управление приложению только при настоящем тапе по <a>, а переход из
// JavaScript iOS таким тапом не считает и грузит промежуточную веб-страницу
// «START BOT». Поэтому на touch-устройствах уходим в бота по схеме
// `tg://resolve`: браузер вообще никуда не переходит, приложение открывается
// поверх, и «◀ Safari» возвращает ровно к полю ввода. Если приложения нет,
// переключения не происходит — на этот случай под полем ввода лежит обычная
// ссылка на t.me (почему не таймаут — см. ниже).
//
// На десктопе схемы tg:// у большинства нет, зато новая вкладка ничего не
// теряет — там всё по-прежнему через window.open.
//
// И в том, и в другом случае «ждём код» переживает уход со страницы: флаг
// лежит в sessionStorage, поэтому после возврата (в том числе с перезагрузкой)
// открыт сразу ввод кода, а не кнопка «Получить код». Флаг общий для всех
// гейтов страницы — вводить код можно в том блоке, который перед глазами.

type Step = 'idle' | 'code'

const CODE_LENGTH = 4

/**
 * Ждём код. Время старта — чтобы флаг не пережил сам код; ссылка на бота —
 * чтобы запасной переход на t.me был на месте и после перезагрузки.
 */
const PENDING_KEY = 'bx_login_pending'
const PENDING_TTL_MS = 15 * 60 * 1000
/** Синхронизация всех форм на странице между собой. */
const PENDING_EVENT = 'bx-login-pending'

type Pending = { at: number; url: string }

function readPending(): Pending | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<Pending>
    const at = Number(p?.at)
    if (!Number.isFinite(at) || Date.now() - at > PENDING_TTL_MS) {
      window.sessionStorage.removeItem(PENDING_KEY)
      return null
    }
    return { at, url: typeof p?.url === 'string' ? p.url : '' }
  } catch {
    return null
  }
}

function writePending(url: string | null) {
  try {
    if (url === null) window.sessionStorage.removeItem(PENDING_KEY)
    else window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ at: Date.now(), url }))
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

/**
 * `https://t.me/Bot?start=payload` → `tg://resolve?domain=Bot&start=payload`.
 * null, если ссылка не того вида, — тогда идём обычным путём, без схемы.
 */
function tgAppUrl(webUrl: string): string | null {
  try {
    const u = new URL(webUrl)
    if (u.hostname !== 't.me') return null
    const domain = u.pathname.replace(/^\/+/, '')
    if (!domain || domain.includes('/')) return null
    const q = new URLSearchParams({ domain })
    const start = u.searchParams.get('start')
    if (start) q.set('start', start)
    return `tg://resolve?${q.toString()}`
  } catch {
    return null
  }
}

// Откат на t.me — не по таймеру, а ссылкой под полем ввода.
//
// Таймер здесь выглядит очевидным решением и он же ломает главный случай:
// на переход по схеме iOS показывает диалог «Открыть в программе
// «Telegram»?», документ при этом остаётся видимым, и таймер увёл бы
// страницу на t.me прямо под диалогом — ровно к той промежуточной странице,
// ради ухода от которой всё и делается. Отличить этот диалог от «схему никто
// не обработал» из страницы нельзя, поэтому решает посетитель: если Telegram
// не открылся, он видит поле ввода и под ним ссылку на t.me.

export function LoginCodeForm({ ctaLabel }: { ctaLabel: string }) {
  const [step, setStep] = useState<Step>('idle')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** Ссылка на бота из последнего запроса — для запасного перехода на t.me. */
  const [botUrl, setBotUrl] = useState('')
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
    const sync = () => {
      const p = readPending()
      setStep(p ? 'code' : 'idle')
      if (p) setBotUrl(p.url)
    }
    const onReturn = () => {
      const p = readPending()
      if (!p) return
      setStep('code')
      setBotUrl(p.url)
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

      // Флаг ставим ДО перехода: на десктопе и в запасном сценарии страница
      // может смениться, и возврата в этот обработчик уже не будет.
      writePending(data.url)
      setBotUrl(data.url)
      setStep('code')

      if (isTouchDevice()) {
        // Схема открывает приложение поверх браузера — страница остаётся на
        // месте, и возвращаться к полю ввода не приходится вовсе.
        const app = tgAppUrl(data.url)
        window.location.href = app ?? data.url
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
      writePending(null)
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
        writePending(null)
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
      {botUrl && (
        // Запасной путь, если приложение не открылось. Настоящая ссылка, а не
        // переход из JS: только по такому тапу iOS отдаёт управление
        // приложению напрямую, минуя страницу t.me. Без target="_blank" —
        // новая вкладка и была исходной поломкой.
        <p className="mt-1 text-xs text-gray-500">
          Telegram не открылся?{' '}
          <a href={botUrl} rel="noreferrer" className="underline hover:no-underline">
            Открыть бота
          </a>
        </p>
      )}
    </div>
  )
}
