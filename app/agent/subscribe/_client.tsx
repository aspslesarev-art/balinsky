'use client'

import Script from 'next/script'
import { useEffect, useState, useMemo } from 'react'

type Developer = { id: string; name: string; logo: string | null }

// Telegram WebApp SDK types — we only touch what we actually use.
type TWA = {
  initData: string
  ready: () => void
  expand: () => void
  themeParams?: { bg_color?: string; text_color?: string; hint_color?: string; button_color?: string; button_text_color?: string }
  MainButton: {
    setText: (s: string) => void
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
    showProgress: (leaveActive?: boolean) => void
    hideProgress: () => void
    setParams?: (p: { is_active?: boolean }) => void
  }
  HapticFeedback?: { impactOccurred: (style: string) => void; notificationOccurred: (type: 'success' | 'error') => void }
  close: () => void
}
declare global {
  interface Window {
    Telegram?: { WebApp?: TWA }
  }
}

export function AgentSubscribeClient() {
  const [twa, setTwa] = useState<TWA | null>(null)
  const [devs, setDevs] = useState<Developer[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [original, setOriginal] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const start = () => {
      const w = window.Telegram?.WebApp
      if (!w) return
      w.ready()
      w.expand()
      setTwa(w)
    }
    if (window.Telegram?.WebApp) start()
    else {
      // SDK script loads via next/script; poll briefly until it shows up.
      const t = setInterval(() => { if (window.Telegram?.WebApp) { clearInterval(t); start() } }, 50)
      return () => clearInterval(t)
    }
  }, [])

  useEffect(() => {
    if (!twa) return
    let cancelled = false
    ;(async () => {
      try {
        const [devsRes, subsRes] = await Promise.all([
          fetch('/api/agent/developers'),
          fetch('/api/agent/subscriptions', { headers: { 'x-telegram-initdata': twa.initData } }),
        ])
        if (!devsRes.ok) throw new Error(`developers: ${devsRes.status}`)
        if (!subsRes.ok) throw new Error(`subscriptions: ${subsRes.status} ${await subsRes.text()}`)
        if (cancelled) return
        const devsJson = await devsRes.json() as { items: Developer[] }
        const subsJson = await subsRes.json() as { developerIds: string[] }
        setDevs(devsJson.items)
        setSelected(new Set(subsJson.developerIds))
        setOriginal(new Set(subsJson.developerIds))
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'load failed')
        setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [twa])

  const dirty = useMemo(() => {
    if (selected.size !== original.size) return true
    for (const id of selected) if (!original.has(id)) return true
    return false
  }, [selected, original])

  const save = useMemo(() => {
    return async () => {
      if (!twa || status === 'saving') return
      setStatus('saving')
      try {
        const r = await fetch('/api/agent/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-telegram-initdata': twa.initData },
          body: JSON.stringify({ developerIds: [...selected] }),
        })
        if (!r.ok) throw new Error(await r.text())
        setOriginal(new Set(selected))
        setStatus('saved')
        twa.HapticFeedback?.notificationOccurred('success')
        setTimeout(() => twa.close(), 600)
      } catch (e) {
        twa.HapticFeedback?.notificationOccurred('error')
        setError(e instanceof Error ? e.message : 'save failed')
        setStatus('error')
      }
    }
  }, [twa, selected, status])

  // Wire Telegram's native MainButton — the Mini App spec recommends this
  // over a custom button so the UI matches every other bot.
  useEffect(() => {
    if (!twa) return
    twa.MainButton.setText(
      status === 'saving' ? 'Сохраняем…'
      : status === 'saved' ? 'Сохранено ✓'
      : `Сохранить (${selected.size})`
    )
    if (dirty && status !== 'saving') twa.MainButton.show()
    else twa.MainButton.hide()
    twa.MainButton.onClick(save)
    return () => twa.MainButton.offClick(save)
  }, [twa, status, selected.size, dirty, save])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    twa?.HapticFeedback?.impactOccurred('light')
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return devs
    const q = query.trim().toLowerCase()
    return devs.filter(d => d.name.toLowerCase().includes(q))
  }, [devs, query])

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <main style={{ minHeight: '100vh', padding: '16px', maxWidth: 560, margin: '0 auto', fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--tg-theme-text-color, #111827)', background: 'var(--tg-theme-bg-color, white)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '4px 0 4px' }}>Подписки на застройщиков</h1>
        <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6B7280)', margin: '0 0 16px' }}>
          Отметь застройщиков, с которыми работаешь. Когда у них появятся новости, акции, мероприятия или новый объект — пришлю сюда.
        </p>

        {status === 'loading' && <div style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>Загружаем…</div>}
        {status === 'error' && <div style={{ padding: 12, background: '#FEE2E2', color: '#991B1B', borderRadius: 8, fontSize: 13 }}>{error}</div>}

        {status !== 'loading' && status !== 'error' && (
          <>
            <input
              type="search"
              placeholder="Поиск по названию…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', fontSize: 15, borderRadius: 10, border: '1px solid var(--tg-theme-hint-color, #E5E7EB)', background: 'var(--tg-theme-secondary-bg-color, #F9FAFB)', marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6B7280)', margin: '0 0 8px' }}>
              Выбрано: {selected.size} из {devs.length}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, paddingBottom: 80 }}>
              {filtered.map(d => {
                const checked = selected.has(d.id)
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => toggle(d.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 4px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--tg-theme-hint-color, #F3F4F6)', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
                    >
                      <span style={{ flex: '0 0 22px', width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? 'var(--tg-theme-button-color, #2563EB)' : 'var(--tg-theme-hint-color, #D1D5DB)'}`, background: checked ? 'var(--tg-theme-button-color, #2563EB)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tg-theme-button-text-color, white)', fontSize: 14, lineHeight: 1 }}>{checked ? '✓' : ''}</span>
                      {d.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.logo} alt="" width={28} height={28} style={{ borderRadius: 6, objectFit: 'cover', flex: '0 0 28px' }} />
                      )}
                      <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{d.name}</span>
                    </button>
                  </li>
                )
              })}
              {filtered.length === 0 && <li style={{ padding: 16, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>Ничего не найдено</li>}
            </ul>
          </>
        )}
      </main>
    </>
  )
}
