'use client'

import { useState } from 'react'

// Вход по коду из Telegram.
//
// Шаг 1 — сайт заводит challenge (POST /api/auth/start) и открывает бота с
// ним в deep-link. Шаг 2 — посетитель вводит четыре цифры, которые прислал
// бот. Код действителен только вместе с challenge из httpOnly-куки этого
// браузера, поэтому перебор чужого аккаунта невозможен.
//
// Challenge выпускается по клику, а не при рендере: гейт живёт внутри
// ISR-страниц, и выпущенный на рендере challenge был бы общим для всех.

type Step = 'idle' | 'code'

const CODE_LENGTH = 4

export function LoginCodeForm({ ctaLabel }: { ctaLabel: string }) {
  const [step, setStep] = useState<Step>('idle')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function start() {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/auth/start', { method: 'POST' })
      const data = await r.json()
      if (!r.ok || !data?.url) throw new Error('start')
      window.open(data.url, '_blank', 'noopener,noreferrer')
      setStep('code')
    } catch {
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
        autoFocus
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
