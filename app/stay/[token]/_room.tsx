'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Baby, Bike, Cake, Camera, Car, Clock, Flower2, Gamepad2, Loader2, Map as MapIcon, MapPin,
  Send, UtensilsCrossed, Waves,
} from 'lucide-react'
import type { CatalogCategory, CatalogSection, HotelMessage, HotelRequest, Item } from '@/lib/hotel/db'
import {
  LANG_CHIP, isPortalLang, pick, priceLabel, pt, type PortalLang,
} from '@/lib/hotel/i18n'

// Портал гостя за QR-кодом (ТЗ раздел 14). Пять экранов: каталог, категория,
// форма заявки, подтверждение, чат со стойкой. Без регистрации и приложения —
// вся «личность» гостя это токен номера в адресе.

type ApiState = {
  hotel: {
    name: string; lang: PortalLang; langs: PortalLang[]
    whatsapp: string | null; telegram: string | null; hasRestaurant: boolean
  }
  room: { label: string }
  stay: { id: number; guest_name: string | null } | null
  catalog: CatalogCategory[]
  messages: HotelMessage[]
  requests: HotelRequest[]
}

type Screen =
  | { name: 'home' }
  | { name: 'cat'; categoryId: number }
  | { name: 'order'; item: Item }
  | { name: 'sent' }
  | { name: 'chat' }

const POLL_MS = 6000
const LS_LANG = 'stay_lang'

// Разделы идут в порядке маржи, а не алфавита: сверху то, на чём отель
// зарабатывает, а не то, что чаще спрашивают (ТЗ 14.1).
const SECTIONS: { id: CatalogSection; key: 'sec_hotel' | 'sec_bali' | 'sec_room' | 'sec_every' }[] = [
  { id: 'hotel', key: 'sec_hotel' },
  { id: 'bali', key: 'sec_bali' },
  { id: 'room', key: 'sec_room' },
  { id: 'every', key: 'sec_every' },
]

const ICONS: Record<string, typeof MapIcon> = {
  map: MapIcon, car: Car, flower: Flower2, ripple: Waves, gamepad: Gamepad2, cake: Cake,
  baby: Baby, camera: Camera, moto: Bike, kitchen: UtensilsCrossed, clock: Clock,
}

function CategoryIcon({ code, className }: { code: string | null; className?: string }) {
  const Icon = (code && ICONS[code]) || MapPin
  return <Icon className={className} strokeWidth={1.6} aria-hidden />
}

function hhmm(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

/** «from $40» по самой дешёвой позиции категории; всё бесплатное — «Included». */
function fromPrice(cat: CatalogCategory, lang: PortalLang): string {
  const cheapest = cat.items.reduce<Item | null>(
    (best, it) => (best == null || (it.price_usd ?? 0) < (best.price_usd ?? 0) ? it : best), null)
  if (!cheapest || !cheapest.price_usd) return pt(lang, 'included')
  return pt(lang, 'from', { p: priceLabel(cheapest.price_usd, cheapest.unit, lang) })
}

/**
 * У отеля без ресторана раздел «В отеле» скрыт, а доставка еды поднимается
 * в «Популярное на Бали» — иначе главный экран открывается пустым разделом
 * (ТЗ 14.5).
 */
function arrangeCatalog(catalog: CatalogCategory[], hasRestaurant: boolean): CatalogCategory[] {
  if (hasRestaurant) return catalog
  return catalog
    .filter(c => c.section !== 'hotel')
    .map(c => (c.code === 'food' ? { ...c, section: 'bali' as CatalogSection, sort: -1 } : c))
}

export function GuestRoom({
  token, hotelName, roomLabel, defaultLang,
}: { token: string; hotelName: string; roomLabel: string; defaultLang: PortalLang }) {
  const [lang, setLang] = useState<PortalLang>(defaultLang)
  const [state, setState] = useState<ApiState | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const threadRef = useRef<HTMLDivElement>(null)

  const t = useCallback(
    (key: Parameters<typeof pt>[1], vars?: Record<string, string>) => pt(lang, key, vars),
    [lang])

  const track = useCallback((type: string, ctx?: Record<string, unknown>) => {
    // Аналитика не должна задерживать переход между экранами.
    void fetch(`/api/stay/${token}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ctx, lang }),
      keepalive: true,
    }).catch(() => {})
  }, [token, lang])

  // Язык гость выбирает на своём телефоне, и выбор переживает перезагрузку —
  // вернувшись на второй день, он не выбирает язык заново (ТЗ 4.2).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_LANG)
      if (isPortalLang(saved)) { setLang(saved); return }
    } catch { /* приватный режим — остаёмся на языке отеля */ }
    const nav = (navigator.language || '').toLowerCase()
    const guess = nav.startsWith('ru') ? 'ru' : nav.startsWith('zh') ? 'zh' : null
    if (guess) setLang(guess)
  }, [])

  const switchLang = (next: PortalLang) => {
    setLang(next)
    try { localStorage.setItem(LS_LANG, next) } catch { /* см. выше */ }
    track('lang_change', { lang: next })
  }

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/stay/${token}`, { cache: 'no-store' })
      if (r.ok) setState(await r.json())
    } catch { /* оффлайн — следующий тик подтянет */ }
  }, [token])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [load])

  const messages = state?.messages ?? []
  useEffect(() => {
    if (screen.name !== 'chat') return
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, screen.name])

  const catalog = useMemo(
    () => arrangeCatalog(state?.catalog ?? [], state?.hotel.hasRestaurant ?? true),
    [state])

  const go = (next: Screen, event?: { type: string; ctx?: Record<string, unknown> }) => {
    setScreen(next)
    if (event) track(event.type, event.ctx)
    window.scrollTo(0, 0)
  }

  const langs = state?.hotel.langs ?? [defaultLang]

  return (
    <main className="mx-auto flex min-h-screen w-full min-w-0 max-w-[460px] flex-col bg-[#F2F5F3] text-[#173430]">
      <header className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
        <div className="min-w-0">
          <div className="truncate text-[18px] font-bold">{state?.hotel.name ?? hotelName}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[15px] text-[#3F5954]">
            <MapPin className="h-4 w-4" strokeWidth={1.8} aria-hidden />
            {state?.room.label ?? roomLabel}
          </div>
        </div>
        {langs.length > 1 && (
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5" role="group" aria-label="Language">
            {langs.map(l => (
              <button
                key={l}
                onClick={() => switchLang(l)}
                aria-pressed={l === lang}
                className={`min-h-11 min-w-11 rounded-full border px-3 text-[15px] font-semibold ${
                  l === lang
                    ? 'border-[#173430] bg-[#173430] text-[#F2F5F3]'
                    : 'border-[#C4D0CC] bg-white text-[#173430]'
                }`}
              >
                {LANG_CHIP[l]}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 px-5 pb-8 pt-2">
        {screen.name === 'home' && (
          <HomeScreen
            catalog={catalog} lang={lang} t={t}
            onChat={() => go({ name: 'chat' }, { type: 'chat_open' })}
            onCategory={c => go({ name: 'cat', categoryId: c.id }, { type: 'category_tap', ctx: { category: c.code } })}
          />
        )}

        {screen.name === 'cat' && (
          <CategoryScreen
            category={catalog.find(c => c.id === screen.categoryId) ?? null}
            lang={lang} t={t}
            onBack={() => go({ name: 'home' })}
            onOrder={item => go({ name: 'order', item }, { type: 'item_tap', ctx: { item: item.code } })}
          />
        )}

        {screen.name === 'order' && (
          <OrderScreen
            token={token} item={screen.item} lang={lang} t={t}
            onBack={() => go({ name: 'home' })}
            onSent={() => { go({ name: 'sent' }); load() }}
          />
        )}

        {screen.name === 'sent' && (
          <div className="flex flex-col items-start">
            <div className="mt-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#2E7D5B] text-[34px] text-white">✓</div>
            <h1 className="mt-5 text-[26px] font-bold leading-tight">{t('sent_title')}</h1>
            <p className="mt-1.5 text-[16px] text-[#3F5954]">{t('sent_sub')}</p>
            <button
              onClick={() => go({ name: 'home' })}
              className="mt-5 min-h-[52px] w-full rounded-xl bg-[#173430] px-4 text-[17px] font-semibold text-[#F2F5F3]"
            >
              {t('back_cat')}
            </button>
          </div>
        )}

        {screen.name === 'chat' && (
          <ChatScreen
            token={token} lang={lang} t={t} state={state} threadRef={threadRef}
            roomLabel={state?.room.label ?? roomLabel}
            onBack={() => go({ name: 'home' })}
            onSent={load}
            onMessenger={app => track('messenger_open', { messenger: app })}
          />
        )}
      </div>
    </main>
  )
}

/* ─────────────────────────── экраны ─────────────────────────── */

type T = (key: Parameters<typeof pt>[1], vars?: Record<string, string>) => string

function HomeScreen({
  catalog, lang, t, onChat, onCategory,
}: {
  catalog: CatalogCategory[]; lang: PortalLang; t: T
  onChat: () => void; onCategory: (c: CatalogCategory) => void
}) {
  return (
    <>
      <button
        onClick={onChat}
        className="mt-3 w-full rounded-xl bg-[#F2C14E] px-[18px] py-5 text-left text-[#2C2100]"
      >
        <span className="block text-[21px] font-bold leading-tight">{t('ask_title')}</span>
        <span className="mt-1.5 block text-[16px] opacity-85">{t('ask_sub')}</span>
      </button>

      {catalog.length === 0 ? (
        <p className="mt-8 text-[16px] leading-relaxed text-[#3F5954]">{t('empty_catalog')}</p>
      ) : SECTIONS.map(section => {
        const cats = catalog
          .filter(c => c.section === section.id)
          .sort((a, b) => a.sort - b.sort)
        if (cats.length === 0) return null
        const compact = section.id === 'hotel'
        // Одинокая категория занимает строку целиком: половина пустой сетки
        // читается как «тут что-то не загрузилось».
        const lonely = cats.length === 1
        return (
          <section key={section.id}>
            <h2 className="mb-2.5 mt-6 text-[15px] font-normal text-[#3F5954]">{t(section.key)}</h2>
            <div className="grid grid-cols-2 gap-3">
              {cats.map(c => (
                <button
                  key={c.id}
                  onClick={() => onCategory(c)}
                  className={`${compact
                    ? 'flex min-h-16 items-center gap-2.5 rounded-xl border border-[#C4D0CC] bg-white p-3.5 text-left'
                    : 'flex flex-col overflow-hidden rounded-xl border border-[#C4D0CC] bg-white text-left'
                  } ${lonely ? 'col-span-2' : ''}`}
                >
                  {compact ? (
                    <>
                      <CategoryIcon code={c.icon} className="h-5 w-5 shrink-0 text-[#3F5954]" />
                      <span className="min-w-0">
                        <span className="block text-[17px] font-semibold leading-tight">{pick(c.title, lang)}</span>
                        {c.caption && (
                          <span className="mt-0.5 block text-[15px] text-[#3F5954]">{pick(c.caption, lang)}</span>
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="relative flex aspect-video items-center justify-center bg-[#E1E8E5] text-[#3F5954]">
                        <CategoryIcon code={c.icon} className="h-7 w-7" />
                        {c.photo_url && (
                          // eslint-disable-next-line @next/next/no-img-element -- фото каталога отеля, не Next-ассет
                          <img
                            src={c.photo_url} alt="" loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        )}
                      </span>
                      <span className="px-3 pb-3.5 pt-3">
                        <span className="block text-[17px] font-semibold leading-tight">{pick(c.title, lang)}</span>
                        {c.caption && (
                          <span className="mt-0.5 block text-[15px] leading-snug text-[#3F5954]">{pick(c.caption, lang)}</span>
                        )}
                        <span className="mt-2 block text-[16px] font-semibold">{fromPrice(c, lang)}</span>
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </section>
        )
      })}

      <hr className="mb-1.5 mt-7 border-[#C4D0CC]" />
      <button onClick={onChat} className="min-h-12 w-full py-3.5 text-left text-[17px] font-semibold text-[#1F6F6B]">
        {t('need_else')}
      </button>
      <p className="text-[15px] text-[#3F5954]">{t('price_tip')}</p>
    </>
  )
}

function BackButton({ onBack, t }: { onBack: () => void; t: T }) {
  return (
    <button onClick={onBack} className="min-h-11 py-2.5 text-[16px] font-semibold text-[#1F6F6B]">
      ‹ {t('back')}
    </button>
  )
}

function CategoryScreen({
  category, lang, t, onBack, onOrder,
}: {
  category: CatalogCategory | null; lang: PortalLang; t: T
  onBack: () => void; onOrder: (item: Item) => void
}) {
  if (!category) return <BackButton onBack={onBack} t={t} />
  return (
    <>
      <BackButton onBack={onBack} t={t} />
      <h1 className="mb-1.5 mt-2 text-[26px] font-bold leading-tight">{pick(category.title, lang)}</h1>
      {category.caption && <p className="mb-4 text-[16px] text-[#3F5954]">{pick(category.caption, lang)}</p>}

      {category.items.map(item => (
        <div key={item.id} className="mb-3 flex gap-3 rounded-xl border border-[#C4D0CC] bg-white p-3">
          <div className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#E1E8E5] text-[#3F5954]">
            <CategoryIcon code={category.icon} className="h-6 w-6" />
            {item.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element -- фото позиции из каталога отеля
              <img src={item.photo_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold leading-tight">{pick(item.title, lang)}</div>
            {item.descr && (
              <div className="mt-1 text-[15px] leading-snug text-[#3F5954]">{pick(item.descr, lang)}</div>
            )}
            <div className="mt-2.5 flex items-center justify-between gap-2.5">
              <span className="text-[16px] font-semibold">{priceLabel(item.price_usd, item.unit, lang)}</span>
              <button
                onClick={() => onOrder(item)}
                className="min-h-11 shrink-0 rounded-xl bg-[#F2C14E] px-4 text-[16px] font-semibold text-[#2C2100]"
              >
                {t('order')}
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

function OrderScreen({
  token, item, lang, t, onBack, onSent,
}: { token: string; item: Item; lang: PortalLang; t: T; onBack: () => void; onSent: () => void }) {
  const [note, setNote] = useState('')
  const [time, setTime] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    // Проверка здесь же, а не только на сервере: гость должен увидеть ошибку
    // под полем сразу, а не после круга по сети.
    if (whatsapp.replace(/\D/g, '').length < 6) { setError(t('f_wa_err')); return }
    setBusy(true); setError(null)
    try {
      const r = await fetch(`/api/stay/${token}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, note, time, whatsapp, lang }),
      })
      if (!r.ok) throw new Error('order failed')
      onSent()
    } catch {
      setError(t('failed'))
    } finally {
      setBusy(false)
    }
  }

  const field = 'min-h-[52px] w-full rounded-xl border border-[#C4D0CC] bg-white px-3.5 py-3 text-[17px] outline-none focus:border-[#1F6F6B]'

  return (
    <>
      <BackButton onBack={onBack} t={t} />
      <h1 className="mb-1.5 mt-2 text-[26px] font-bold leading-tight">
        {t('order_title', { item: pick(item.title, lang) })}
      </h1>
      <p className="mb-4 text-[16px] text-[#3F5954]">
        {item.descr ? `${pick(item.descr, lang)} — ` : ''}{priceLabel(item.price_usd, item.unit, lang)}
      </p>

      <label className="mb-1.5 block text-[15px] text-[#3F5954]" htmlFor="f-what">{t('f_what')}</label>
      <textarea id="f-what" value={note} onChange={e => setNote(e.target.value)} rows={3} className={`${field} mb-4 resize-y`} />

      <label className="mb-1.5 block text-[15px] text-[#3F5954]" htmlFor="f-time">{t('f_time')}</label>
      <input id="f-time" value={time} onChange={e => setTime(e.target.value)} className={`${field} mb-4`} />

      <label className="mb-1.5 block text-[15px] text-[#3F5954]" htmlFor="f-wa">{t('f_wa')}</label>
      <input
        id="f-wa" value={whatsapp} inputMode="tel" autoComplete="tel" placeholder="+62 …"
        onChange={e => { setWhatsapp(e.target.value); setError(null) }}
        className={`${field} ${error ? 'border-2 border-[#B23A3A]' : ''}`}
      />
      <div className="mb-4 mt-1.5 min-h-[1.2em] text-[15px] text-[#B23A3A]">{error}</div>

      <button
        onClick={submit}
        disabled={busy}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#F2C14E] text-[17px] font-semibold text-[#2C2100] disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {t('send_req')}
      </button>
    </>
  )
}

function ChatScreen({
  token, lang, t, state, roomLabel, threadRef, onBack, onSent, onMessenger,
}: {
  token: string; lang: PortalLang; t: T; state: ApiState | null; roomLabel: string
  threadRef: React.RefObject<HTMLDivElement | null>
  onBack: () => void; onSent: () => void; onMessenger: (app: string) => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const messages = state?.messages ?? []

  const send = async () => {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true); setError(false)
    try {
      const r = await fetch(`/api/stay/${token}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body, lang }),
      })
      if (!r.ok) throw new Error('send failed')
      setText('')
      onSent()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  // Метка в первом сообщении — чтобы ресепшн не переспрашивал номер и язык.
  const tag = `[${roomLabel} · ${lang.toUpperCase()}]`
  const greeting = lang === 'en' ? `${tag} Hello!` : `${tag} Hello! / ${t('hello')}`
  const wa = state?.hotel.whatsapp?.replace(/\D/g, '')
  const tg = state?.hotel.telegram?.replace('@', '').trim()

  return (
    <>
      <BackButton onBack={onBack} t={t} />
      <h1 className="mb-1.5 mt-2 text-[26px] font-bold leading-tight">{t('ask_title')}</h1>
      <p className="mb-4 text-[16px] text-[#3F5954]">{t('ask_sub')}</p>

      <div ref={threadRef} className="mb-4 flex max-h-[52vh] flex-col gap-2.5 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="rounded-xl bg-[#E1E8E5] px-4 py-3.5 text-[16px] leading-relaxed text-[#3F5954]">
            {t('chat_empty')}
          </p>
        ) : messages.map(m => (
          <div
            key={m.id}
            className={`max-w-[86%] break-words rounded-[14px] border px-3.5 py-3 text-[16px] leading-snug ${
              m.author === 'guest'
                ? 'self-end border-[#173430] bg-[#173430] text-[#F2F5F3]'
                : 'self-start border-[#C4D0CC] bg-white'
            }`}
          >
            <div className="mb-0.5 text-[13px] opacity-70">
              {m.author === 'guest' ? t('you') : (m.staff_name || t('reception'))}
            </div>
            <div className="whitespace-pre-wrap">{m.body}</div>
            <div className="mt-1 text-[13px] opacity-50">{hhmm(m.created_at)}</div>
          </div>
        ))}
      </div>

      {error && <div className="mb-2 text-[15px] text-[#B23A3A]">{t('failed')}</div>}

      <div className="mb-5 flex items-stretch gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
          placeholder={t('chat_ph')}
          aria-label={t('chat_ph')}
          className="min-h-[52px] flex-1 rounded-xl border border-[#C4D0CC] bg-white px-3.5 text-[17px] outline-none focus:border-[#1F6F6B]"
        />
        <button
          onClick={send}
          disabled={busy || !text.trim()}
          aria-label={t('send')}
          className="flex min-h-[52px] w-[60px] shrink-0 items-center justify-center rounded-xl bg-[#173430] text-[#F2F5F3] disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>

      {(wa || tg) && (
        <>
          <h2 className="mb-2.5 text-[15px] text-[#3F5954]">{t('or_messenger')}</h2>
          {wa && (
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent(greeting)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => onMessenger('whatsapp')}
              className="mb-3 flex min-h-[52px] items-center justify-center rounded-xl border border-[#C4D0CC] bg-white text-[17px] font-semibold no-underline"
            >
              {t('open_in', { app: 'WhatsApp' })}
            </a>
          )}
          {tg && (
            <a
              href={`https://t.me/${tg}?text=${encodeURIComponent(greeting)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => onMessenger('telegram')}
              className="mb-3 flex min-h-[52px] items-center justify-center rounded-xl border border-[#C4D0CC] bg-white text-[17px] font-semibold no-underline"
            >
              {t('open_in', { app: 'Telegram' })}
            </a>
          )}
        </>
      )}
    </>
  )
}
