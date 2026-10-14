'use client'

// Личная CRM по всем Telegram-чатам владельца.
//
// Главный вопрос раздела — «кому я должен ответить, что обещал и кто
// кому должен денег». Поэтому вкладки — это не виды, а списки дел:
// открываемся на «Ждут ответа», а «Все» — уже справочник. Список
// приезжает целиком с сервера, всё остальное считается здесь в памяти.

import { useMemo, useState } from 'react'
import { Search, Users, MessageCircleReply, HandCoins, ListChecks, Inbox, Clock } from 'lucide-react'
import { CATEGORIES, openMoney, openPromises, type CrmContact } from '@/lib/tg-crm/types'
import { CrmPanel } from './_panel'
import { MoneyLine, RelScore, relDay } from './_ui'

type Tab = 'reply' | 'promises' | 'money' | 'all'
type RelFilter = '' | 'high' | 'mid' | 'low' | 'none'
type Sort = 'recent' | 'relationship'

const PAGE_SIZE = 80

function matchesRel(v: number | null, f: RelFilter): boolean {
  if (!f) return true
  if (f === 'none') return v == null
  if (v == null) return false
  if (f === 'high') return v >= 8
  if (f === 'mid') return v >= 5 && v <= 7
  return v <= 4
}

const hasOpenPromises = (c: CrmContact) => openPromises(c.my_promises).length > 0
const hasOpenMoney = (c: CrmContact) => openMoney(c.money).length > 0

export function CrmBoard({ contacts }: { contacts: CrmContact[] }) {
  const [tab, setTab] = useState<Tab>('reply')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [rel, setRel] = useState<RelFilter>('')
  const [sort, setSort] = useState<Sort>('recent')
  const [showShort, setShowShort] = useState(false)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [openId, setOpenId] = useState<number | null>(null)

  const shortCount = useMemo(() => contacts.filter(c => !c.analyzed).length, [contacts])

  // Сначала общие фильтры (поиск, категория, отношения, короткие чаты),
  // потом вкладка. Счётчики на вкладках считаются после общих фильтров —
  // иначе «Ждут ответа · 12» обещало бы людей, которых в списке не видно.
  const base = useMemo(() => {
    const q = query.trim().toLowerCase()
    return contacts.filter(c => {
      if (!showShort && !c.analyzed) return false
      if (category && c.category !== category) return false
      if (!matchesRel(c.relationship, rel)) return false
      if (!q) return true
      return [c.name, c.username, c.who, c.summary].some(v => v?.toLowerCase().includes(q))
    })
  }, [contacts, query, category, rel, showShort])

  const counts = useMemo(() => ({
    reply: base.filter(c => c.awaiting_reply).length,
    promises: base.filter(hasOpenPromises).length,
    money: base.filter(hasOpenMoney).length,
    all: base.length,
  }), [base])

  const visible = useMemo(() => {
    const list = base.filter(c =>
      tab === 'reply' ? c.awaiting_reply
      : tab === 'promises' ? hasOpenPromises(c)
      : tab === 'money' ? hasOpenMoney(c)
      : true)
    const byRecent = (a: CrmContact, b: CrmContact) => (b.last_at ?? '').localeCompare(a.last_at ?? '')
    return list.sort(sort === 'relationship'
      ? (a, b) => (b.relationship ?? 0) - (a.relationship ?? 0) || byRecent(a, b)
      : byRecent)
  }, [base, tab, sort])

  // Сводка долгов над списком во вкладке «Деньги»: сколько людей ждут
  // денег от меня и от скольких жду я.
  const moneySplit = useMemo(() => {
    let iOwe = 0, oweMe = 0
    for (const c of base) {
      const open = openMoney(c.money)
      if (open.some(m => m.who_owes === 'я')) iOwe++
      if (open.some(m => m.who_owes === 'мне')) oweMe++
    }
    return { iOwe, oweMe }
  }, [base])

  const filtered = !!(query || category || rel)
  const open = contacts.find(c => c.chat_id === openId) ?? null
  const resetLimit = () => setLimit(PAGE_SIZE)

  const TABS = [
    { id: 'reply', label: 'Ждут ответа', Icon: MessageCircleReply },
    { id: 'promises', label: 'Я обещал', Icon: ListChecks },
    { id: 'money', label: 'Деньги', Icon: HandCoins },
    { id: 'all', label: 'Все', Icon: Inbox },
  ] as const

  const selectCls = 'h-10 md:h-9 w-full md:w-auto px-3 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]'

  return (
    <div className="flex flex-col gap-4 pb-24 md:pb-16 max-w-[1120px]">
      {/* Вкладки-списки дел */}
      <div className="flex max-w-full overflow-x-auto rounded-lg border border-[var(--ax-border)] p-0.5 self-start">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTab(id); resetLimit() }}
            aria-pressed={tab === id}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-[13px] whitespace-nowrap transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D] ${
              tab === id ? 'bg-[var(--ax-panel)] text-[var(--ax-fg)] font-medium' : 'text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]'
            }`}
          >
            <Icon size={14} className="hidden sm:block" />
            {label}
            <span className={`tabular-nums ${tab === id ? 'text-[var(--ax-fg-muted)]' : 'text-[var(--ax-fg-faint)]'}`}>{counts[id]}</span>
          </button>
        ))}
      </div>

      {/* Поиск и фильтры. На телефоне — поиск во всю ширину, под ним сетка */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2">
        <div className="relative md:flex-1 md:min-w-[220px] md:max-w-[360px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-fg-faint)]" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); resetLimit() }}
            placeholder="Имя, ник, кто это, о чём говорили…"
            className="w-full h-10 md:h-9 pl-9 pr-3 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] placeholder:text-[var(--ax-fg-faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
          />
        </div>
        <div className="grid grid-cols-2 md:flex gap-2">
          <select value={category} onChange={e => { setCategory(e.target.value); resetLimit() }} className={selectCls} aria-label="Кто это">
            <option value="">Все категории</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select value={rel} onChange={e => { setRel(e.target.value as RelFilter); resetLimit() }} className={selectCls} aria-label="Отношения">
            <option value="">Любые отношения</option>
            <option value="high">Близкие · 8–10</option>
            <option value="mid">Средние · 5–7</option>
            <option value="low">Слабые · 1–4</option>
            <option value="none">Без оценки</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as Sort)} className={selectCls} aria-label="Порядок">
            <option value="recent">Сначала свежие</option>
            <option value="relationship">Сначала близкие</option>
          </select>
          {shortCount > 0 && (
            <button
              type="button"
              onClick={() => { setShowShort(v => !v); resetLimit() }}
              aria-pressed={showShort}
              title="Короткие и односторонние чаты: карточка без разбора"
              className={`h-10 md:h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg text-[13px] border transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D] ${
                showShort
                  ? 'border-[#1F8B5F] bg-[rgba(31,139,95,0.14)] text-[#4FC08D]'
                  : 'border-[var(--ax-border)] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)]'
              }`}
            >
              Короткие чаты
              <span className="tabular-nums opacity-70">{shortCount}</span>
            </button>
          )}
        </div>
      </div>

      {tab === 'money' && (moneySplit.iOwe > 0 || moneySplit.oweMe > 0) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
          <span className="text-[var(--ax-prospect-maybe-fg)]">Я должен: <b className="font-semibold tabular-nums">{moneySplit.iOwe}</b></span>
          <span className="text-[var(--ax-prospect-yes-fg)]">Мне должны: <b className="font-semibold tabular-nums">{moneySplit.oweMe}</b></span>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState tab={tab} filtered={filtered} total={contacts.length} />
      ) : (
        <ul className="flex flex-col rounded-xl border border-[var(--ax-border-soft)] overflow-hidden">
          {visible.slice(0, limit).map(c => (
            <li key={c.chat_id} className="border-t first:border-t-0 border-[var(--ax-border-soft)]">
              <Row c={c} tab={tab} onOpen={() => setOpenId(c.chat_id)} />
            </li>
          ))}
        </ul>
      )}

      {visible.length > limit && (
        <button
          type="button"
          onClick={() => setLimit(l => l + PAGE_SIZE * 2)}
          className="self-center h-10 px-4 rounded-lg text-[13px] border border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-fg)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
        >
          Показать ещё · осталось {visible.length - limit}
        </button>
      )}

      {open && <CrmPanel contact={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function EmptyState({ tab, filtered, total }: { tab: Tab; filtered: boolean; total: number }) {
  const text = total === 0
    ? 'Контактов пока нет — список появится после выгрузки чатов.'
    : filtered
      ? 'Никто не подходит под фильтр.'
      : tab === 'reply' ? 'Все отвечены. Никто не ждёт твоего ответа.'
      : tab === 'promises' ? 'Открытых обещаний нет.'
      : tab === 'money' ? 'Никто никому не должен.'
      : 'Пусто.'
  return <p className="py-16 text-center text-[13px] text-[var(--ax-fg-muted)] max-w-[52ch] mx-auto leading-relaxed">{text}</p>
}

// Строка списка. Третья строка меняется по вкладке: во «Ждут ответа» —
// чего ждут, в «Я обещал» — первое открытое обещание, в «Деньгах» — долг.
function Row({ c, tab, onOpen }: { c: CrmContact; tab: Tab; onOpen: () => void }) {
  const promise = openPromises(c.my_promises)[0]
  const money = openMoney(c.money)
  const context =
    tab === 'promises' && promise ? { text: promise.text, tone: 'var(--ax-fg-soft)' }
    : tab === 'money' && money.length ? null
    : c.awaiting_reply ? { text: c.awaiting_what || 'Ждёт твоего ответа', tone: 'var(--ax-prospect-maybe-fg)' }
    : c.status ? { text: c.status, tone: 'var(--ax-fg-muted)' }
    : null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left flex items-start gap-3 px-3 md:px-4 py-3 bg-[var(--ax-panel)] hover:bg-[var(--ax-hover)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#4FC08D]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {c.kind === 'group' && <Users size={13} className="shrink-0 text-[var(--ax-fg-faint)]" aria-label="группа" />}
          <span className="truncate text-[14px] font-medium text-[var(--ax-fg)]">{c.name}</span>
          {c.category && (
            <span className="shrink-0 px-1.5 py-px rounded text-[11.5px] text-[var(--ax-fg-soft)] bg-[var(--ax-hover)]">{c.category}</span>
          )}
        </div>
        {c.who && <div className="mt-0.5 text-[12.5px] text-[var(--ax-fg-muted)] leading-snug line-clamp-1 break-words">{c.who}</div>}
        {context && (
          <div className="mt-1 text-[12.5px] leading-snug line-clamp-2 break-words" style={{ color: context.tone }}>{context.text}</div>
        )}
        {tab === 'money' && money.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5">
            {money.slice(0, 2).map((m, i) => <MoneyLine key={i} m={m} />)}
          </div>
        )}
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
        <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--ax-fg-faint)] whitespace-nowrap">
          <Clock size={11} />
          {relDay(c.last_at) ?? '—'}
        </span>
        <RelScore v={c.relationship} />
      </div>
    </button>
  )
}
