'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download, QrCode, RefreshCw } from 'lucide-react'
import type { CatalogCategory, CatalogSection, Room } from '@/lib/hotel/db'
import { PORTAL_LANGS, LANG_NAME, pick, type PortalLang } from '@/lib/hotel/i18n'

// Всё, что делается с отелем после создания: доступ стойки, номера с QR,
// каталог по разделам и выгрузка журнала.

const SECTIONS: { id: CatalogSection; label: string }[] = [
  { id: 'hotel', label: 'В отеле' },
  { id: 'bali', label: 'Популярное на Бали' },
  { id: 'room', label: 'В номер' },
  { id: 'every', label: 'Каждый день' },
]
const ICONS = ['kitchen', 'clock', 'map', 'car', 'flower', 'ripple', 'gamepad', 'cake', 'baby', 'camera', 'moto']
const UNITS: { id: string; label: string }[] = [
  { id: 'once', label: 'разово' }, { id: 'day', label: 'за день' },
  { id: 'hour', label: 'за час' }, { id: 'kg', label: 'за кг' },
]

const card = 'rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-5'
const input = 'rounded-xl border border-[var(--ax-input-border)] bg-[var(--ax-input-bg)] px-3.5 py-2.5 text-[15px] text-[var(--ax-fg)] outline-none focus:border-[var(--color-primary)]'
const btn = 'rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-50'
const mini = 'rounded-lg border border-[var(--ax-border)] px-2.5 py-1 text-[12px]'

type HotelSettings = {
  whatsapp: string; telegram_username: string; has_restaurant: boolean; langs: PortalLang[]
}
type I18nDraft = Record<string, string>

export function HotelEditor({
  hotelId, slug, hotel, rooms, catalog, staffCode,
}: {
  hotelId: number; slug: string; hotel: HotelSettings
  rooms: Room[]; catalog: CatalogCategory[]; staffCode: string
}) {
  const [labels, setLabels] = useState('')
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState(staffCode)
  const [settings, setSettings] = useState(hotel)
  const [cat, setCat] = useState({ code: '', section: 'bali' as CatalogSection, icon: 'map', photo: '', title: {} as I18nDraft, caption: {} as I18nDraft })
  const [item, setItem] = useState({ categoryId: catalog[0]?.id ?? 0, code: '', price: '', unit: 'once', photo: '', title: {} as I18nDraft, descr: {} as I18nDraft })

  const reload = () => window.location.reload()
  const api = (path: string, method: string, body: unknown) =>
    fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  const addRooms = async () => {
    const list = labels.split('\n').map(l => l.trim()).filter(Boolean)
    if (list.length === 0 || busy) return
    setBusy(true)
    try { await api(`/api/admin/hotels/${hotelId}/rooms`, 'POST', { labels: list }); reload() }
    finally { setBusy(false) }
  }

  const patchRoom = async (roomId: number, patch: { active?: boolean; rotate?: boolean }) => {
    if (patch.rotate && !confirm('Перевыпустить код номера? Старая наклейка перестанет работать.')) return
    await api(`/api/admin/hotels/${hotelId}/rooms`, 'PATCH', { roomId, ...patch })
    reload()
  }

  const saveSettings = async () => {
    setBusy(true)
    try {
      await api('/api/admin/hotels', 'PATCH', { id: hotelId, ...settings })
      reload()
    } finally { setBusy(false) }
  }

  const rotateStaffCode = async () => {
    if (!confirm('Выдать новый код смены? Все, кто сейчас в панели, разлогинятся.')) return
    const r = await api('/api/admin/hotels', 'PATCH', { id: hotelId, newStaffCode: true })
    const { staffCode: next } = await r.json().catch(() => ({ staffCode: null }))
    if (next) setCode(next)
  }

  const addCategory = async () => {
    if (!cat.code.trim() || !cat.title.en?.trim() || busy) return
    setBusy(true)
    try {
      await api(`/api/admin/hotels/${hotelId}/catalog`, 'POST', {
        kind: 'category', code: cat.code, section: cat.section, icon: cat.icon,
        photo_url: cat.photo, title: cat.title, caption: cat.caption,
      })
      reload()
    } finally { setBusy(false) }
  }

  const addItem = async () => {
    if (!item.categoryId || !item.code.trim() || !item.title.en?.trim() || busy) return
    setBusy(true)
    try {
      await api(`/api/admin/hotels/${hotelId}/catalog`, 'POST', {
        kind: 'item', categoryId: item.categoryId, code: item.code, title: item.title,
        descr: item.descr, price_usd: item.price ? Number(item.price) : undefined,
        unit: item.unit, photo_url: item.photo,
      })
      reload()
    } finally { setBusy(false) }
  }

  const toggle = async (kind: 'category' | 'item', targetId: number, active: boolean) => {
    await api(`/api/admin/hotels/${hotelId}/catalog`, 'PATCH', { kind, targetId, active })
    reload()
  }

  const removeItem = async (itemId: number, title: string) => {
    if (!confirm(`Удалить «${title}» из каталога?`)) return
    await api(`/api/admin/hotels/${hotelId}/catalog`, 'DELETE', { itemId })
    reload()
  }

  // Три языка в одну строку: без английского портал не откроется вообще,
  // поэтому он и обязателен (остальные подставятся из него).
  const langRow = (
    value: I18nDraft, onChange: (v: I18nDraft) => void, placeholder: string,
  ) => (
    <div className="grid gap-2 md:grid-cols-3">
      {PORTAL_LANGS.map(l => (
        <input
          key={l}
          value={value[l] ?? ''}
          onChange={e => onChange({ ...value, [l]: e.target.value })}
          placeholder={`${placeholder} · ${LANG_NAME[l]}${l === 'en' ? ' (обязательно)' : ''}`}
          className={input}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-medium">Доступ стойки</div>
            <div className="text-[13px] text-[var(--ax-fg-muted)]">
              Вход на <Link href="/hotel-desk" className="underline">/hotel-desk</Link>: код отеля <b>{slug}</b> и код смены.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="rounded-lg bg-[var(--ax-hover)] px-3 py-1.5 text-[15px] tracking-widest">{code}</code>
            <button onClick={rotateStaffCode} aria-label="Новый код" className="rounded-xl border border-[var(--ax-border)] px-3 py-2">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="mb-3 text-[15px] font-medium">Портал гостя</div>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            value={settings.whatsapp}
            onChange={e => setSettings({ ...settings, whatsapp: e.target.value })}
            placeholder="WhatsApp ресепшн с кодом страны (6281…)"
            className={input}
          />
          <input
            value={settings.telegram_username}
            onChange={e => setSettings({ ...settings, telegram_username: e.target.value })}
            placeholder="Telegram ресепшн, username"
            className={input}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              checked={settings.has_restaurant}
              onChange={e => setSettings({ ...settings, has_restaurant: e.target.checked })}
              className="h-4 w-4"
            />
            Есть ресторан — показывать раздел «В отеле»
          </label>
          <div className="flex items-center gap-3 text-[14px]">
            Языки:
            {PORTAL_LANGS.map(l => (
              <label key={l} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={settings.langs.includes(l)}
                  onChange={e => setSettings({
                    ...settings,
                    langs: e.target.checked
                      ? [...settings.langs, l]
                      : settings.langs.filter(x => x !== l),
                  })}
                  className="h-4 w-4"
                />
                {LANG_NAME[l]}
              </label>
            ))}
          </div>
          <button onClick={saveSettings} disabled={busy} className={`${btn} ml-auto`}>Сохранить</button>
        </div>
      </section>

      <section className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[15px] font-medium">Номера</div>
          <div className="flex items-center gap-4">
            <a
              href={`/api/admin/hotels/${hotelId}/events?days=30`}
              className="flex items-center gap-1.5 text-[13px] text-[var(--ax-fg-muted)] no-underline hover:text-[var(--ax-fg)]"
            >
              <Download className="h-4 w-4" /> Журнал за 30 дней, CSV
            </a>
            {rooms.length > 0 && (
              <a
                href={`/admin/hotels/${slug}/qr`}
                className="flex items-center gap-1.5 text-[13px] text-[var(--ax-fg-muted)] no-underline hover:text-[var(--ax-fg)]"
              >
                <QrCode className="h-4 w-4" /> Лист QR-кодов на печать
              </a>
            )}
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start">
          <textarea
            value={labels}
            onChange={e => setLabels(e.target.value)}
            rows={3}
            placeholder={'Номера пачкой, по одному на строку:\n101\n102\nVilla Frangipani'}
            className={`${input} min-h-[92px] flex-1 resize-y`}
          />
          <button onClick={addRooms} disabled={busy || !labels.trim()} className={btn}>Добавить</button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-[13px] text-[var(--ax-fg-muted)]">Номеров пока нет.</p>
        ) : (
          <ul className="divide-y divide-[var(--ax-border)]">
            {rooms.map(r => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className={`text-[15px] ${r.active ? '' : 'text-[var(--ax-fg-faint)] line-through'}`}>{r.label}</span>
                <code className="text-[12px] text-[var(--ax-fg-muted)]">/stay/{r.token}</code>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => patchRoom(r.id, { rotate: true })} className={mini}>Новый код</button>
                  <button onClick={() => patchRoom(r.id, { active: !r.active })} className={mini}>
                    {r.active ? 'Выключить' : 'Включить'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <div className="mb-1 text-[15px] font-medium">Каталог</div>
        <p className="mb-3 text-[13px] text-[var(--ax-fg-muted)]">
          Разделы идут в порядке маржи: «В отеле», «Популярное на Бали», «В номер», «Каждый день».
          Категория без позиций гостю не показывается.
        </p>

        <div className="mb-4 space-y-2 rounded-xl border border-dashed border-[var(--ax-border)] p-3">
          <div className="text-[13px] text-[var(--ax-fg-muted)]">Новая категория</div>
          <div className="grid gap-2 md:grid-cols-4">
            <input value={cat.code} onChange={e => setCat({ ...cat, code: e.target.value })} placeholder="код (tours)" className={input} />
            <select value={cat.section} onChange={e => setCat({ ...cat, section: e.target.value as CatalogSection })} className={input}>
              {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select value={cat.icon} onChange={e => setCat({ ...cat, icon: e.target.value })} className={input}>
              {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <input value={cat.photo} onChange={e => setCat({ ...cat, photo: e.target.value })} placeholder="ссылка на фото 16:9" className={input} />
          </div>
          {langRow(cat.title, v => setCat({ ...cat, title: v }), 'Название')}
          {langRow(cat.caption, v => setCat({ ...cat, caption: v }), 'Подпись')}
          <button onClick={addCategory} disabled={busy || !cat.code.trim() || !cat.title.en?.trim()} className={btn}>
            Добавить категорию
          </button>
        </div>

        {catalog.length > 0 && (
          <div className="mb-4 space-y-2 rounded-xl border border-dashed border-[var(--ax-border)] p-3">
            <div className="text-[13px] text-[var(--ax-fg-muted)]">Новая позиция</div>
            <div className="grid gap-2 md:grid-cols-5">
              <select value={item.categoryId} onChange={e => setItem({ ...item, categoryId: Number(e.target.value) })} className={input}>
                {catalog.map(c => <option key={c.id} value={c.id}>{pick(c.title, 'ru') || pick(c.title, 'en')}</option>)}
              </select>
              <input value={item.code} onChange={e => setItem({ ...item, code: e.target.value })} placeholder="код (ubud)" className={input} />
              <input value={item.price} onChange={e => setItem({ ...item, price: e.target.value })} inputMode="decimal" placeholder="цена $" className={input} />
              <select value={item.unit} onChange={e => setItem({ ...item, unit: e.target.value })} className={input}>
                {UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
              <input value={item.photo} onChange={e => setItem({ ...item, photo: e.target.value })} placeholder="ссылка на фото" className={input} />
            </div>
            {langRow(item.title, v => setItem({ ...item, title: v }), 'Название')}
            {langRow(item.descr, v => setItem({ ...item, descr: v }), 'Что входит')}
            <button onClick={addItem} disabled={busy || !item.code.trim() || !item.title.en?.trim()} className={btn}>
              Добавить позицию
            </button>
          </div>
        )}

        {catalog.length === 0 ? (
          <p className="text-[13px] text-[var(--ax-fg-muted)]">Каталог пуст — гость увидит только чат со стойкой.</p>
        ) : SECTIONS.map(section => {
          const cats = catalog.filter(c => c.section === section.id)
          if (cats.length === 0) return null
          return (
            <div key={section.id} className="mb-4">
              <div className="mb-2 text-[12px] uppercase tracking-wide text-[var(--ax-fg-faint)]">{section.label}</div>
              {cats.map(c => (
                <div key={c.id} className="mb-2 rounded-xl border border-[var(--ax-border)] p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-[15px] font-medium ${c.active ? '' : 'text-[var(--ax-fg-faint)] line-through'}`}>
                      {pick(c.title, 'ru') || pick(c.title, 'en')}
                    </span>
                    <code className="text-[12px] text-[var(--ax-fg-muted)]">{c.code}</code>
                    <span className="text-[12px] text-[var(--ax-fg-muted)]">{c.items.length} позиций</span>
                    <button onClick={() => toggle('category', c.id, !c.active)} className={`${mini} ml-auto`}>
                      {c.active ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>
                  {c.items.length > 0 && (
                    <ul className="mt-2 divide-y divide-[var(--ax-border)]">
                      {c.items.map(it => (
                        <li key={it.id} className="flex flex-wrap items-center gap-3 py-2">
                          <span className={`text-[14px] ${it.active ? '' : 'text-[var(--ax-fg-faint)] line-through'}`}>
                            {pick(it.title, 'ru') || pick(it.title, 'en')}
                          </span>
                          <span className="text-[13px] text-[var(--ax-fg-muted)]">
                            {it.price_usd ? `$${it.price_usd}` : 'включено'}
                          </span>
                          <div className="ml-auto flex gap-2">
                            <button onClick={() => toggle('item', it.id, !it.active)} className={mini}>
                              {it.active ? 'Скрыть' : 'Показать'}
                            </button>
                            <button
                              onClick={() => removeItem(it.id, pick(it.title, 'ru') || pick(it.title, 'en'))}
                              className={mini}
                            >
                              Удалить
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </section>
    </div>
  )
}
