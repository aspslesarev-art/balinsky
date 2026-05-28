'use client'

import Script from 'next/script'
import { useEffect, useMemo, useRef, useState } from 'react'

type Developer = { id: string; name: string; logo: string | null }

type TWA = {
  initData: string
  ready: () => void
  expand: () => void
  HapticFeedback?: { impactOccurred: (style: string) => void; notificationOccurred: (type: 'success' | 'error') => void }
  MainButton?: { hide: () => void }
}
declare global {
  interface Window {
    Telegram?: { WebApp?: TWA }
  }
}

export function AgentSubscribeClient() {
  const [twa, setTwa] = useState<TWA | null>(null)
  const [devs, setDevs] = useState<Developer[]>([])
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Set<string>>(new Set())
  // Single in-flight POST at a time — keeps the optimistic UI from racing
  // against itself when the user taps quickly across multiple rows.
  const queuedRef = useRef<{ ids: Set<string> } | null>(null)
  const sendingRef = useRef(false)

  useEffect(() => {
    const start = () => {
      const w = window.Telegram?.WebApp
      if (!w) return
      w.ready()
      w.expand()
      w.MainButton?.hide()
      setTwa(w)
    }
    if (window.Telegram?.WebApp) start()
    else {
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
        setSubscribed(new Set(subsJson.developerIds))
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'load failed')
        setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [twa])

  // Push the current `subscribed` set to the server. Coalesces rapid toggles
  // — if the user taps three rows in a row we only send the final state.
  async function sync(nextIds: Set<string>) {
    queuedRef.current = { ids: nextIds }
    if (sendingRef.current) return
    sendingRef.current = true
    try {
      while (queuedRef.current) {
        const { ids } = queuedRef.current
        queuedRef.current = null
        const r = await fetch('/api/agent/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-telegram-initdata': twa?.initData ?? '' },
          body: JSON.stringify({ developerIds: [...ids] }),
        })
        if (!r.ok) {
          twa?.HapticFeedback?.notificationOccurred('error')
          throw new Error(await r.text())
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed')
    } finally {
      sendingRef.current = false
    }
  }

  function toggle(devId: string, subscribe: boolean) {
    twa?.HapticFeedback?.impactOccurred('light')
    setPending(prev => new Set(prev).add(devId))
    setSubscribed(prev => {
      const next = new Set(prev)
      if (subscribe) next.add(devId)
      else next.delete(devId)
      sync(next).finally(() => setPending(p => { const n = new Set(p); n.delete(devId); return n }))
      return next
    })
  }

  const mySubs = useMemo(
    () => devs.filter(d => subscribed.has(d.id)).sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [devs, subscribed],
  )
  const others = useMemo(() => {
    const q = query.trim().toLowerCase()
    return devs
      .filter(d => !subscribed.has(d.id))
      .filter(d => !q || d.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [devs, subscribed, query])

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <main style={{ minHeight: '100vh', padding: '14px 16px 32px', maxWidth: 560, margin: '0 auto', fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--tg-theme-text-color, #111827)', background: 'var(--tg-theme-bg-color, white)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '4px 0 4px' }}>Подписки на застройщиков</h1>
        <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6B7280)', margin: '0 0 16px' }}>
          Новости, акции, мероприятия и новые объекты выбранных застройщиков прилетают в этот чат.
        </p>

        {status === 'loading' && <div style={{ padding: 24, textAlign: 'center', color: '#6B7280' }}>Загружаем…</div>}
        {status === 'error' && <div style={{ padding: 12, background: '#FEE2E2', color: '#991B1B', borderRadius: 8, fontSize: 13 }}>{error}</div>}

        {status === 'ready' && (
          <>
            <Section title={`Мои подписки (${mySubs.length})`}>
              {mySubs.length === 0 ? (
                <EmptyHint>Пока пусто. Выбери застройщиков ниже.</EmptyHint>
              ) : (
                <RowList>
                  {mySubs.map(d => (
                    <Row key={d.id} dev={d} variant="unsub" pending={pending.has(d.id)} onClick={() => toggle(d.id, false)} />
                  ))}
                </RowList>
              )}
            </Section>

            <Section title="Другие застройщики">
              <input
                type="search"
                placeholder="Поиск по названию…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', fontSize: 15, borderRadius: 10, border: '1px solid var(--tg-theme-hint-color, #E5E7EB)', background: 'var(--tg-theme-secondary-bg-color, #F9FAFB)', margin: '4px 0 10px', outline: 'none', boxSizing: 'border-box', color: 'inherit' }}
              />
              <RowList>
                {others.length === 0 ? (
                  <EmptyHint>{query ? 'Ничего не найдено' : 'Все застройщики уже в подписках'}</EmptyHint>
                ) : others.map(d => (
                  <Row key={d.id} dev={d} variant="sub" pending={pending.has(d.id)} onClick={() => toggle(d.id, true)} />
                ))}
              </RowList>
            </Section>
          </>
        )}
      </main>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--tg-theme-hint-color, #6B7280)', margin: '0 0 8px' }}>{title}</h2>
      {children}
    </section>
  )
}

function RowList({ children }: { children: React.ReactNode }) {
  return <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{children}</ul>
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '14px 4px', color: 'var(--tg-theme-hint-color, #9CA3AF)', fontSize: 13 }}>{children}</div>
}

// Uniform square tile, white background, source image fits inside via
// object-fit: contain — so a tall narrow logo and a square logo both occupy
// the exact same footprint in the list.
function LogoTile({ src, alt }: { src: string | null; alt: string }) {
  const size = 40
  const wrap: React.CSSProperties = {
    flex: `0 0 ${size}px`,
    width: size,
    height: size,
    borderRadius: 8,
    background: '#FFFFFF',
    border: '1px solid rgba(0,0,0,0.06)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box',
  }
  if (!src) {
    return <span style={wrap} aria-hidden="true" />
  }
  return (
    <span style={wrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" style={{ maxWidth: '85%', maxHeight: '85%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} />
    </span>
  )
}

function Row({ dev, variant, pending, onClick }: { dev: Developer; variant: 'sub' | 'unsub'; pending: boolean; onClick: () => void }) {
  // Icon-only round buttons — Telegram Desktop opens the Mini App in a
  // narrow ~500px panel and any text label here gets clipped. The icon
  // pair (+ / ✓) reads instantly and never overflows.
  const label = variant === 'sub' ? 'Подписаться' : 'Отписаться'
  const symbol = pending ? '…' : variant === 'sub' ? '+' : '✓'
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <LogoTile src={dev.logo} alt={dev.name} />
      <span style={{ fontSize: 15, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dev.name}</span>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={label}
        title={label}
        style={{
          flex: '0 0 36px', width: 36, height: 36, padding: 0, fontSize: 18, fontWeight: 600, borderRadius: 999, cursor: pending ? 'default' : 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          border: variant === 'sub' ? 'none' : '1px solid var(--tg-theme-hint-color, #4A5568)',
          background: variant === 'sub' ? 'var(--tg-theme-button-color, #2563EB)' : 'transparent',
          color: variant === 'sub' ? 'var(--tg-theme-button-text-color, white)' : 'var(--tg-theme-text-color, #E5E7EB)',
          opacity: pending ? 0.55 : 1,
        }}
      >
        {symbol}
      </button>
    </li>
  )
}
