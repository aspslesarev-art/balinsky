'use client'

// CRM по застройщикам: доска воронки, список, отбор и разбор похожих
// карточек.
//
// Отличие от доски агентов: карточка — компания, и главный вопрос при
// взгляде на неё не «когда общались», а «есть ли вообще кому писать».
// Поэтому на карточке видно людей и у скольких из них живая переписка.
//
// «Отбор» — это вся база (220+ компаний), которая в работу пока не
// взята. Держать её на доске нельзя: воронка перестала бы читаться.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Plus, LayoutGrid, Rows3, ListFilter, GitMerge, CalendarDays,
  MessageSquareText, Sparkles, Clock, Users, ExternalLink, Check, X,
} from 'lucide-react'
import {
  PROSPECTS, PROSPECT_LABEL, STATUSES, lastContactAt, staleFirst,
  type DevPartnerCard, type DevStatus, type MergePair, type Prospect,
} from '@/lib/dev-crm/types'
import { DeveloperPanel } from './_panel'

// Оттенок колонки: воронка идёт от нейтрального к зелёному, «Не
// сложилось» — единственный красный. Цвет живёт только в тонкой полоске
// над колонкой и в точке у статуса, тексты остаются на токенах темы.
const STATUS_TINT: Record<DevStatus, string> = {
  new:         'rgba(148,163,184,0.55)',
  contact:     'rgba(224,169,59,0.75)',
  to_schedule: 'rgba(224,169,59,0.95)',
  scheduled:   'rgba(79,192,141,0.65)',
  met:         'rgba(79,192,141,0.9)',
  working:     '#1F8B5F',
  lost:        'rgba(248,113,113,0.7)',
}

// «Отклик» — оценка владельца, а не этап. Своя шкала цвета, приглушённее
// воронки: две ярких шкалы на одной карточке спорят друг с другом.
//
// Цвета берём токенами, а не числами: раздел работает и в тёмной, и в
// светлой теме админки, а янтарный в них разный. «Не знаю» и «Нет»
// нарочно без цвета — но не бледнее fg-muted: на 11px бейдже
// fg-faint даёт контраст 3.6:1 вместо нужных 4.5:1.
const PROSPECT_TINT: Record<Prospect, string> = {
  yes:     'var(--ax-prospect-yes-bg)',
  maybe:   'var(--ax-prospect-maybe-bg)',
  unknown: 'var(--ax-hover)',
  no:      'var(--ax-hover)',
}
const PROSPECT_FG: Record<Prospect, string> = {
  yes:     'var(--ax-prospect-yes-fg)',
  maybe:   'var(--ax-prospect-maybe-fg)',
  unknown: 'var(--ax-fg-soft)',
  no:      'var(--ax-fg-muted)',
}
// Порядок «сначала перспективные» для отбора и сортировки списка.
const PROSPECT_RANK: Record<Prospect, number> = { yes: 0, maybe: 1, unknown: 2, no: 3 }

function relDay(iso: string | null): string | null {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000)
  if (days <= 0) return 'сегодня'
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} дн. назад`
  if (days < 31) return `${Math.floor(days / 7)} нед. назад`
  if (days < 365) return `${Math.floor(days / 30)} мес. назад`
  return `${Math.floor(days / 365)} г. назад`
}

const STALE_DAYS = 90
function isStale(p: DevPartnerCard): boolean {
  const at = lastContactAt(p)
  return !!at && Date.now() - new Date(at).getTime() > STALE_DAYS * 86400_000
}

function meetingWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Кому в компании можно написать. «3 человека» без этого уточнения
// обманывает: у трёх может не быть ни одного ника.
function reachLabel(p: DevPartnerCard): string {
  if (p.people_count === 0) return 'контактов нет'
  const nicks = p.people.filter(x => x.telegram).length
  if (nicks === 0) return `${p.people_count} чел., без Telegram`
  return `${p.people_count} чел., ${nicks} в Telegram`
}

export function DevelopersBoard({
  initialPartners, initialPairs,
}: {
  initialPartners: DevPartnerCard[]
  initialPairs: MergePair[]
}) {
  const [partners, setPartners] = useState<DevPartnerCard[]>(initialPartners)
  const [pairs, setPairs] = useState<MergePair[]>(initialPairs)
  const [view, setView] = useState<'board' | 'list' | 'pool' | 'merge'>('board')
  const [query, setQuery] = useState('')
  const [prospect, setProspect] = useState<'' | Prospect>('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropStatus, setDropStatus] = useState<DevStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const scrolledOnce = useRef(false)

  const reload = useCallback(async () => {
    const r = await fetch('/api/admin/dev-partners', { cache: 'no-store' })
    if (r.status === 401) { window.location.href = '/admin'; return }
    const j = await r.json() as { ok: boolean; partners?: DevPartnerCard[]; pairs?: MergePair[] }
    if (j.ok) { setPartners(j.partners ?? []); setPairs(j.pairs ?? []) }
  }, [])

  // Поиск и фильтр общие для всех видов: искать «Teus» хочется и на
  // доске, и в отборе, а два разных поля путали бы.
  const matched = useMemo(() => {
    const q = query.trim().toLowerCase()
    return partners.filter(p => {
      if (prospect && p.prospect !== prospect) return false
      if (!q) return true
      return [p.name, p.projects, p.next_step, p.telegram, p.email, p.website, p.location]
        .some(v => v?.toLowerCase().includes(q))
        || p.people.some(x => [x.name, x.telegram, x.position].some(v => v?.toLowerCase().includes(q)))
    })
  }, [partners, query, prospect])

  const inWork = useMemo(() => matched.filter(p => p.in_work), [matched])
  const pool = useMemo(() => matched.filter(p => !p.in_work), [matched])

  const byStatus = useMemo(() => {
    const map = new Map<DevStatus, DevPartnerCard[]>(STATUSES.map(s => [s.id, []]))
    for (const p of inWork) map.get(p.status)?.push(p)
    for (const list of map.values()) list.sort(staleFirst)
    return map
  }, [inWork])

  // Доска открывается на первой колонке, в которой кто-то есть.
  //
  // Сразу после переноса все 46 карточек лежат в «Связаться», а слева
  // от неё пустая «Без статуса» — на телефоне это ровно один экран
  // пустоты, и раздел выглядит незаполненным. Прокручиваем один раз
  // при первой отрисовке: дальше положение выбирает владелец.
  useEffect(() => {
    if (scrolledOnce.current || view !== 'board') return
    const box = boardRef.current
    if (!box) return
    const first = STATUSES.findIndex(s => (byStatus.get(s.id)?.length ?? 0) > 0)
    if (first <= 0) { scrolledOnce.current = true; return }
    const col = box.children[first] as HTMLElement | undefined
    if (!col) return
    box.scrollLeft = col.offsetLeft - box.offsetLeft
    scrolledOnce.current = true
  }, [view, byStatus])

  // Оптимистично двигаем карточку и только потом пишем на сервер:
  // перетаскивание, которое «думает» полсекунды, ощущается сломанным.
  const move = async (id: string, status: DevStatus) => {
    const before = partners
    setPartners(prev => prev.map(p => (p.id === id ? { ...p, status } : p)))
    try {
      const r = await fetch(`/api/admin/dev-partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, sort: -Date.now() }),
      })
      if (!r.ok) throw new Error()
    } catch {
      setPartners(before)
      setError('Не удалось сменить статус — попробуйте ещё раз')
    }
  }

  const patch = useCallback((updated: DevPartnerCard) => {
    setPartners(prev => prev.map(p => (p.id === updated.id ? { ...p, ...updated } : p)))
  }, [])

  const takeToWork = async (id: string) => {
    setPartners(prev => prev.map(p => (p.id === id ? { ...p, in_work: true, status: 'contact' as DevStatus } : p)))
    try {
      const r = await fetch(`/api/admin/dev-partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Взяли в работу → сразу «Связаться»: это и есть первый шаг,
        // а «Без статуса» заставляло бы двигать карточку второй раз.
        body: JSON.stringify({ in_work: true, status: 'contact', sort: -Date.now() }),
      })
      if (!r.ok) throw new Error()
      await reload()
    } catch {
      await reload()
      setError('Не удалось взять в работу')
    }
  }

  const addPartner = async (name: string) => {
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/admin/dev-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, in_work: true, status: 'contact' }),
      })
      const j = await r.json() as { ok: boolean; partner?: { id: string }; error?: string }
      if (!j.ok || !j.partner) throw new Error(j.error)
      await reload()
      setOpenId(j.partner.id)
    } catch {
      setError('Не удалось создать карточку')
    } finally {
      setBusy(false)
    }
  }

  const removePartner = async (id: string) => {
    setPartners(prev => prev.filter(p => p.id !== id))
    setOpenId(null)
    await fetch(`/api/admin/dev-partners/${id}`, { method: 'DELETE' })
    await reload()
  }

  const decide = async (pairId: string, decision: 'merged' | 'distinct', keep: 'left' | 'right') => {
    setPairs(prev => prev.filter(x => x.id !== pairId))
    const r = await fetch(`/api/admin/dev-merge/${pairId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, keep }),
    })
    if (!r.ok) setError('Не удалось сохранить решение')
    // Склейка удаляет вторую карточку, а с ней и её остальные пары —
    // список обязан перечитаться, иначе владелец жмёт по мёртвой паре.
    if (decision === 'merged') await reload()
  }

  const open = partners.find(p => p.id === openId) ?? null

  const TABS = [
    { id: 'board', label: 'Доска', Icon: LayoutGrid, count: inWork.length },
    { id: 'list',  label: 'Список', Icon: Rows3, count: null },
    { id: 'pool',  label: 'Отбор', Icon: ListFilter, count: pool.length },
    { id: 'merge', label: 'Похожие', Icon: GitMerge, count: pairs.length },
  ] as const

  return (
    <div className="flex flex-col gap-4 pb-20 md:pb-16">
      {/* Панель управления: вид, поиск, отклик, «новый застройщик» */}
      <div className="flex flex-wrap items-center gap-2">
        {/* На 390px четыре вкладки со счётчиками не влезают, и числа
            переносились на вторую строку — «Отбор 1/9/5». Кнопки не
            сжимаем и не переносим, полоску пускаем в горизонтальную
            прокрутку: так на узком экране теряется край, а не смысл. */}
        <div className="flex max-w-full overflow-x-auto rounded-lg border border-[var(--ax-border)] p-0.5">
          {TABS.map(({ id, label, Icon, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 md:px-3 py-1.5 rounded-md text-[13px] transition-colors duration-[120ms] ${
                view === id
                  ? 'bg-[var(--ax-panel)] text-[var(--ax-fg)]'
                  : 'text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              {label}
              {count ? <span className="tabular-nums text-[var(--ax-fg-faint)]">{count}</span> : null}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-[320px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-fg-faint)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Застройщик, проект, человек…"
            className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] placeholder:text-[var(--ax-fg-faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
          />
        </div>

        <select
          value={prospect}
          onChange={e => setProspect(e.target.value as '' | Prospect)}
          aria-label="Отклик"
          className="h-9 px-3 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
        >
          <option value="">Любой отклик</option>
          {PROSPECTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>

        <button
          type="button"
          disabled={busy}
          onClick={() => { const n = prompt('Название застройщика'); if (n?.trim()) addPartner(n.trim()) }}
          className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium bg-[#1F8B5F] hover:bg-[#197551] text-white disabled:opacity-50 transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
        >
          <Plus size={15} />
          Новый застройщик
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg text-[13px] bg-[var(--ax-error-bg)] border border-[var(--ax-error-border)] text-[var(--ax-error-fg)]">
          {error}
        </div>
      )}

      {view === 'board' && (
        <div ref={boardRef} className="flex gap-3 overflow-x-auto pb-4 -mx-3 px-3 md:-mx-4 md:px-4">
          {STATUSES.map(s => {
            const items = byStatus.get(s.id) ?? []
            return (
              <section
                key={s.id}
                onDragOver={e => { if (dragId) { e.preventDefault(); setDropStatus(s.id) } }}
                onDragLeave={() => setDropStatus(prev => (prev === s.id ? null : prev))}
                onDrop={e => {
                  e.preventDefault()
                  if (dragId) move(dragId, s.id)
                  setDragId(null); setDropStatus(null)
                }}
                className={`shrink-0 w-[272px] rounded-xl border transition-colors duration-[120ms] ${
                  dropStatus === s.id
                    ? 'border-[#4FC08D] bg-[var(--ax-hover)]'
                    : 'border-[var(--ax-border-soft)] bg-[var(--ax-chat-bg)]'
                }`}
              >
                <header className="px-3 pt-3 pb-2">
                  <div className="h-[3px] w-8 rounded-full mb-2" style={{ background: STATUS_TINT[s.id] }} />
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-[13px] font-semibold text-[var(--ax-fg)]">{s.label}</h2>
                    <span className="text-[12px] text-[var(--ax-fg-faint)] tabular-nums">{items.length}</span>
                  </div>
                </header>

                <div className="px-2 pb-2 flex flex-col gap-3 max-h-[calc(100vh-360px)] md:max-h-[calc(100vh-300px)] overflow-y-auto">
                  {items.map(p => (
                    <article
                      key={p.id}
                      draggable
                      onDragStart={() => setDragId(p.id)}
                      onDragEnd={() => { setDragId(null); setDropStatus(null) }}
                      onClick={() => setOpenId(p.id)}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(p.id) } }}
                      className={`cursor-pointer rounded-lg border border-[var(--ax-border-soft)] bg-[var(--ax-panel)] px-3 py-2.5 hover:border-[var(--ax-border)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D] ${
                        dragId === p.id ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0 text-[13.5px] font-medium text-[var(--ax-fg)] leading-snug break-words">
                          {p.name}
                        </div>
                        {p.prospect && <ProspectBadge value={p.prospect} />}
                      </div>

                      {p.next_meeting_at ? (
                        <div className="mt-2 flex items-start gap-1.5 text-[12px] text-[#4FC08D] leading-snug">
                          <CalendarDays size={12} className="mt-0.5 shrink-0" />
                          <span>{meetingWhen(p.next_meeting_at)}{p.next_meeting_place ? `, ${p.next_meeting_place}` : ''}</span>
                        </div>
                      ) : p.next_step ? (
                        <div className="mt-2 text-[12px] text-[var(--ax-fg-soft)] leading-snug line-clamp-2">{p.next_step}</div>
                      ) : null}

                      {/* Две строки подряд одного кегля — «кому писать» и
                          «когда общались». Чтобы они не читались одной
                          серой стеной, первая идёт заметнее: она про
                          возможность работы, а не про историю. */}
                      <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[var(--ax-fg-muted)]">
                        <Users size={11} className="shrink-0" />
                        <span className="truncate">{reachLabel(p)}</span>
                      </div>

                      <div className={`mt-1 flex items-center gap-1.5 text-[11.5px] ${isStale(p) ? 'text-[#E0A93B]' : 'text-[var(--ax-fg-faint)]'}`}>
                        {p.chat_message_count > 0 ? <MessageSquareText size={11} /> : <Clock size={11} />}
                        <span>{relDay(lastContactAt(p)) ?? 'не связывались'}</span>
                        {p.people.some(x => x.ai_summary) && <Sparkles size={11} className="ml-auto text-[#4FC08D]" />}
                      </div>
                    </article>
                  ))}

                  {items.length === 0 && (
                    <p className="px-2 py-6 text-[12px] text-[var(--ax-fg-faint)] leading-snug text-center">
                      {query || prospect ? 'Никто не подходит под фильтр' : s.hint}
                    </p>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {view === 'list' && <PartnersList partners={[...inWork].sort(staleFirst)} onOpen={setOpenId} />}

      {view === 'pool' && (
        <Pool
          partners={pool}
          onOpen={setOpenId}
          onTake={takeToWork}
        />
      )}

      {view === 'merge' && <MergeList pairs={pairs} onDecide={decide} />}

      {open && (
        <DeveloperPanel
          partnerId={open.id}
          onClose={() => setOpenId(null)}
          onPatched={patch}
          onDeleted={removePartner}
          onReload={reload}
        />
      )}
    </div>
  )
}

function ProspectBadge({ value }: { value: Prospect }) {
  return (
    <span
      className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-medium"
      style={{ background: PROSPECT_TINT[value], color: PROSPECT_FG[value] }}
    >
      {PROSPECT_LABEL[value]}
    </span>
  )
}

function PartnersList({ partners, onOpen }: { partners: DevPartnerCard[]; onOpen: (id: string) => void }) {
  if (!partners.length) {
    return <p className="py-16 text-center text-[13px] text-[var(--ax-fg-muted)]">Никого не нашлось</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--ax-border-soft)]">
      <table className="w-full min-w-[880px] text-[13px] border-collapse">
        <thead>
          <tr className="text-left text-[12px] text-[var(--ax-fg-muted)] bg-[var(--ax-chat-bg)]">
            <th className="font-medium px-3 py-2">Застройщик</th>
            <th className="font-medium px-3 py-2">Статус</th>
            <th className="font-medium px-3 py-2">Отклик</th>
            <th className="font-medium px-3 py-2">Люди</th>
            <th className="font-medium px-3 py-2">Последний контакт</th>
            <th className="font-medium px-3 py-2">Следующий шаг</th>
          </tr>
        </thead>
        <tbody>
          {partners.map(p => (
            <tr
              key={p.id}
              onClick={() => onOpen(p.id)}
              className="border-t border-[var(--ax-border-soft)] cursor-pointer hover:bg-[var(--ax-hover)]"
            >
              <td className="px-3 py-2 text-[var(--ax-fg)]">{p.name}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-[var(--ax-fg-soft)]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_TINT[p.status] }} />
                  {STATUSES.find(s => s.id === p.status)?.label}
                </span>
              </td>
              <td className="px-3 py-2">{p.prospect ? <ProspectBadge value={p.prospect} /> : <span className="text-[var(--ax-fg-faint)]">—</span>}</td>
              <td className="px-3 py-2 text-[var(--ax-fg-soft)] tabular-nums">
                {p.people_count === 0 ? '—' : `${p.people_count}${p.linked_count ? ` · ${p.linked_count} с чатом` : ''}`}
              </td>
              <td className="px-3 py-2 text-[var(--ax-fg-muted)]">{relDay(lastContactAt(p)) ?? 'не связывались'}</td>
              <td className="px-3 py-2 text-[var(--ax-fg-soft)] max-w-[28ch] truncate">{p.next_step ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Отбор: вся база, которая в работу не взята. Сортировка — «сначала то,
// с чем есть смысл работать»: отклик, потом наличие живых контактов.
function Pool({
  partners, onOpen, onTake,
}: {
  partners: DevPartnerCard[]
  onOpen: (id: string) => void
  onTake: (id: string) => void
}) {
  const [onlyWithPeople, setOnlyWithPeople] = useState(false)

  const list = useMemo(() => {
    const src = onlyWithPeople ? partners.filter(p => p.people.some(x => x.telegram)) : partners
    return [...src].sort((a, b) => {
      const ra = a.prospect ? PROSPECT_RANK[a.prospect] : 9
      const rb = b.prospect ? PROSPECT_RANK[b.prospect] : 9
      if (ra !== rb) return ra - rb
      const na = a.people.filter(x => x.telegram).length
      const nb = b.people.filter(x => x.telegram).length
      if (na !== nb) return nb - na
      return a.name.localeCompare(b.name, 'ru')
    })
  }, [partners, onlyWithPeople])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[12.5px] text-[var(--ax-fg-muted)] max-w-[68ch] leading-relaxed">
          Вся база застройщиков, которых в работу пока не брали. Сверху — те, по кому отклик лучше
          и есть кому написать. «Взять в работу» переносит карточку на доску в колонку «Связаться».
        </p>
        <label className="ml-auto inline-flex items-center gap-2 text-[12.5px] text-[var(--ax-fg-soft)] cursor-pointer">
          <input
            type="checkbox"
            checked={onlyWithPeople}
            onChange={e => setOnlyWithPeople(e.target.checked)}
            className="w-4 h-4 accent-[#1F8B5F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
          />
          Только с Telegram
        </label>
      </div>

      {list.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-[var(--ax-fg-muted)]">
          {onlyWithPeople ? 'С Telegram в резерве никого не осталось' : 'Резерв пуст — все взяты в работу'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--ax-border-soft)]">
          <table className="w-full min-w-[920px] text-[13px] border-collapse">
            <thead>
              <tr className="text-left text-[12px] text-[var(--ax-fg-muted)] bg-[var(--ax-chat-bg)]">
                <th className="font-medium px-3 py-2">Застройщик</th>
                <th className="font-medium px-3 py-2">Отклик</th>
                <th className="font-medium px-3 py-2">Кому писать</th>
                <th className="font-medium px-3 py-2">Проекты</th>
                <th className="font-medium px-3 py-2">Комиссия</th>
                <th className="font-medium px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id} className="border-t border-[var(--ax-border-soft)] hover:bg-[var(--ax-hover)]">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onOpen(p.id)}
                      className="text-left text-[var(--ax-fg)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                    >
                      {p.name}
                    </button>
                    {p.site_slug && (
                      <a
                        href={`https://balinsky.info/ru/zastrojshhiki/${p.site_slug}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Страница на сайте"
                        className="ml-1.5 inline-flex align-middle text-[var(--ax-fg-faint)] hover:text-[var(--ax-fg)]"
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2">{p.prospect ? <ProspectBadge value={p.prospect} /> : <span className="text-[var(--ax-fg-faint)]">—</span>}</td>
                  <td className="px-3 py-2 text-[var(--ax-fg-soft)]">
                    {p.people.length === 0
                      ? <span className="text-[var(--ax-fg-faint)]">никого не знаем</span>
                      : p.people.slice(0, 2).map(x => x.telegram ? `@${x.telegram}` : x.name).join(', ')
                        + (p.people.length > 2 ? ` +${p.people.length - 2}` : '')}
                  </td>
                  <td className="px-3 py-2 text-[var(--ax-fg-muted)] max-w-[30ch] truncate">{p.projects ?? '—'}</td>
                  <td className="px-3 py-2 text-[var(--ax-fg-muted)] whitespace-nowrap">{p.commission ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onTake(p.id)}
                      className="h-8 px-3 rounded-lg text-[12.5px] font-medium border border-[var(--ax-border)] text-[var(--ax-fg)] hover:bg-[var(--ax-panel)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D] whitespace-nowrap"
                    >
                      Взять в работу
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Похожие карточки: пары, которые импорт не решился склеить сам.
// Показываем обе целиком — решение принимается по проектам и людям, а не
// по одному названию.
function MergeList({
  pairs, onDecide,
}: {
  pairs: MergePair[]
  onDecide: (id: string, decision: 'merged' | 'distinct', keep: 'left' | 'right') => void
}) {
  if (!pairs.length) {
    return (
      <p className="py-16 text-center text-[13px] text-[var(--ax-fg-muted)] max-w-[60ch] mx-auto leading-relaxed">
        Похожих карточек не осталось. Здесь появляются пары, у которых названия совпали не целиком —
        например «Oceaniq» и «OceaniQ Villas»: склеивать их автоматически нельзя, легко слепить разные компании.
      </p>
    )
  }
  return (
    // Между парами воздуха больше, чем внутри пары: иначе двадцать
    // блоков читаются одной простынёй и неясно, где кончается вопрос.
    <div className="flex flex-col gap-6">
      <p className="text-[12.5px] text-[var(--ax-fg-muted)] max-w-[68ch] leading-relaxed">
        Названия совпали не целиком, поэтому импорт оставил две карточки. Посмотрите на проекты и людей.
        Если это одна компания — выберите, под каким названием её оставить, и нажмите «Одна компания»:
        вторая карточка вольётся в выбранную вместе с людьми и заметками. «Разные» значит «больше не спрашивать».
      </p>
      {pairs.map(pair => <MergeRow key={pair.id} pair={pair} onDecide={onDecide} />)}
    </div>
  )
}

function MergeRow({
  pair, onDecide,
}: {
  pair: MergePair
  onDecide: (id: string, decision: 'merged' | 'distinct', keep: 'left' | 'right') => void
}) {
  // По умолчанию остаётся та, что слева: импорт ставит туда карточку,
  // которая знает больше. Но выбрать вправо можно в один клик — после
  // склейки название не переделать.
  const [keep, setKeep] = useState<'left' | 'right'>('left')
  return (
    <article className="rounded-xl border border-[var(--ax-border-soft)] bg-[var(--ax-panel)] p-3 md:p-4">
      <div className="text-[11.5px] text-[var(--ax-fg-faint)] mb-3">Совпало {pair.reason}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <MergeSide card={pair.left} keep={keep === 'left'} onKeep={() => setKeep('left')} />
        <MergeSide card={pair.right} keep={keep === 'right'} onKeep={() => setKeep('right')} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onDecide(pair.id, 'merged', keep)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium bg-[#1F8B5F] hover:bg-[#197551] text-white transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
        >
          <Check size={15} />
          Одна компания
        </button>
        <button
          type="button"
          onClick={() => onDecide(pair.id, 'distinct', keep)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] border border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
        >
          <X size={15} />
          Разные
        </button>
        <span className="text-[12px] text-[var(--ax-fg-faint)] leading-snug">
          останется «{keep === 'left' ? pair.left.name : pair.right.name}»
        </span>
      </div>
    </article>
  )
}

function MergeSide({
  card, keep, onKeep,
}: {
  card: DevPartnerCard
  keep: boolean
  onKeep: () => void
}) {
  return (
    <div
      className={`rounded-lg border p-3 transition-colors duration-[120ms] ${
        keep
          ? 'border-[var(--ax-prospect-yes-fg)] bg-[var(--ax-prospect-yes-bg)]'
          : 'border-[var(--ax-border-soft)] bg-[var(--ax-chat-bg)]'
      }`}
    >
      <div className="flex items-start gap-2">
        <h3 className="flex-1 text-[14px] font-medium text-[var(--ax-fg)] leading-snug break-words">{card.name}</h3>
        {keep ? (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-medium text-[var(--ax-prospect-yes-fg)] bg-[var(--ax-panel)]">
            останется
          </span>
        ) : (
          <button
            type="button"
            onClick={onKeep}
            /* Рамка обязательна: без неё подпись 11px не читается как
               кнопка, и выбор «оставить эту» владелец не находит. */
            className="shrink-0 px-2 py-0.5 rounded border border-[var(--ax-border)] text-[11px] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
          >
            оставить эту
          </button>
        )}
      </div>
      <dl className="mt-2 flex flex-col gap-1.5 text-[12px]">
        <Row label="Проекты" value={card.projects} />
        <Row label="Люди" value={card.people.length ? card.people.map(p => p.telegram ? `${p.name} @${p.telegram}` : p.name).join(', ') : null} />
        <Row
          label="Сайт"
          value={card.site_slug ? 'есть страница' : null}
          href={card.site_slug ? `https://balinsky.info/ru/zastrojshhiki/${card.site_slug}` : undefined}
        />
        <Row label="Комиссия" value={card.commission} />
        <Row label="Откуда" value={card.data?.['Источник'] ?? card.source} />
      </dl>
    </div>
  )
}

function Row({
  label, value, href,
}: {
  label: string
  value: string | null | undefined
  href?: string
}) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 w-[68px] text-[var(--ax-fg-faint)]">{label}</dt>
      <dd className="flex-1 text-[var(--ax-fg-soft)] leading-snug break-words">
        {value && href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 no-underline hover:text-[var(--ax-fg)]"
          >
            {value} <ExternalLink size={10} />
          </a>
        ) : (value || '—')}
      </dd>
    </div>
  )
}
