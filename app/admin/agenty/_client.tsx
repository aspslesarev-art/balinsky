'use client'

// CRM по агентам: доска воронки, список и «входящие» из переписок бота.
//
// Доска — главный вид, как было в Notion: колонка = статус, карточку
// перетаскиваем мышью. На телефоне перетаскивание не работает нигде
// нормально, поэтому статус там меняется выбором в карточке, а колонки
// листаются горизонтально.

import { useCallback, useMemo, useState } from 'react'
import { Search, Plus, Inbox, LayoutGrid, Rows3, BarChart3, CalendarDays, MessageSquareText, Sparkles, X, Clock, Handshake, Send } from 'lucide-react'
import { REACH_HINT, STATUSES, dealsLabel, hasDeals, lastContactAt, staleFirst, telegramReach, type AgentCard, type AgentStatus, type UnlinkedChat } from '@/lib/agents/types'
import { AgentPanel } from './_panel'
import { AgentsDashboard } from './_dash'

// Оттенок колонки: воронка идёт от нейтрального к зелёному, «Не
// сложилось» — единственный красный. Цвет живёт только в тонкой полоске
// над колонкой и в точке у статуса, тексты остаются на токенах темы.
const STATUS_TINT: Record<AgentStatus, string> = {
  new:         'rgba(148,163,184,0.55)',
  contact:     'rgba(224,169,59,0.75)',
  to_schedule: 'rgba(224,169,59,0.95)',
  scheduled:   'rgba(79,192,141,0.65)',
  met:         'rgba(79,192,141,0.9)',
  working:     '#1F8B5F',
  lost:        'rgba(248,113,113,0.7)',
}

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

// Подпись на карточке: когда общались в последний раз. Пусто не бывает —
// «не связывались» это тоже факт, и по доске видно, где он. Слово
// «контакт» не пишем: оно повторялось бы на каждой карточке, а значок
// часов и так говорит, что речь о времени.
function contactLabel(a: AgentCard): string {
  const at = lastContactAt(a)
  return at ? relDay(at)! : 'не связывались'
}

// Разговор, заброшенный на три месяца, подсвечиваем: позиция в колонке
// про это уже говорит, но при беглом взгляде «сегодня» и «год назад»
// выглядят одинаково. Никогда не контактировавшие остаются приглушёнными —
// это не остывший разговор, а нетронутый контакт.
const STALE_DAYS = 90
function isStale(a: AgentCard): boolean {
  const at = lastContactAt(a)
  return !!at && Date.now() - new Date(at).getTime() > STALE_DAYS * 86400_000
}

function meetingWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function AgentsBoard({ initialAgents, initialChats }: { initialAgents: AgentCard[]; initialChats: UnlinkedChat[] }) {
  const [agents, setAgents] = useState<AgentCard[]>(initialAgents)
  const [chats, setChats] = useState<UnlinkedChat[]>(initialChats)
  const [view, setView] = useState<'board' | 'list' | 'inbox' | 'dash'>('board')
  const [query, setQuery] = useState('')
  const [manager, setManager] = useState('')
  const [dealsOnly, setDealsOnly] = useState(false)
  const [reachOnly, setReachOnly] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropStatus, setDropStatus] = useState<AgentStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const r = await fetch('/api/admin/agents', { cache: 'no-store' })
    if (r.status === 401) { window.location.href = '/admin'; return }
    const j = await r.json() as { ok: boolean; agents?: AgentCard[]; chats?: UnlinkedChat[] }
    if (j.ok) { setAgents(j.agents ?? []); setChats(j.chats ?? []) }
  }, [])

  const managers = useMemo(
    () => [...new Set(agents.map(a => a.manager).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, 'ru')),
    [agents],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return agents.filter(a => {
      if (dealsOnly && !hasDeals(a)) return false
      if (reachOnly && a.tg_chat_id == null) return false
      if (manager && a.manager !== manager) return false
      if (!q) return true
      return [a.name, a.agency, a.telegram, a.phone, a.email, a.next_step, a.ai_summary]
        .some(v => v?.toLowerCase().includes(q))
    })
  }, [agents, query, manager, dealsOnly, reachOnly])

  const dealsCount = useMemo(() => agents.filter(hasDeals).length, [agents])
  const reachCount = useMemo(() => agents.filter(a => a.tg_chat_id != null).length, [agents])

  const byStatus = useMemo(() => {
    const map = new Map<AgentStatus, AgentCard[]>(STATUSES.map(s => [s.id, []]))
    for (const a of visible) map.get(a.status)?.push(a)
    for (const list of map.values()) list.sort(staleFirst)
    return map
  }, [visible])

  // Оптимистично двигаем карточку и только потом пишем на сервер:
  // перетаскивание, которое «думает» полсекунды, ощущается сломанным.
  const move = async (id: string, status: AgentStatus) => {
    const before = agents
    setAgents(prev => prev.map(a => (a.id === id ? { ...a, status } : a)))
    try {
      const r = await fetch(`/api/admin/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, sort: -Date.now() }),
      })
      if (!r.ok) throw new Error()
    } catch {
      setAgents(before)
      setError('Не удалось сменить статус — попробуйте ещё раз')
    }
  }

  const patch = useCallback((updated: AgentCard) => {
    setAgents(prev => prev.map(a => (a.id === updated.id ? { ...a, ...updated } : a)))
  }, [])

  const addAgent = async (name: string, from?: UnlinkedChat) => {
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          telegram: from?.username ?? null,
          tg_chat_id: from?.chat_id ?? null,
          source: from ? 'chat' : 'manual',
        }),
      })
      const j = await r.json() as { ok: boolean; agent?: AgentCard; error?: string }
      if (!j.ok || !j.agent) throw new Error(j.error)
      await reload()
      setOpenId(j.agent.id)
      if (from) setChats(prev => prev.filter(c => c.chat_id !== from.chat_id))
    } catch {
      setError('Не удалось создать карточку')
    } finally {
      setBusy(false)
    }
  }

  const removeAgent = async (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id))
    setOpenId(null)
    await fetch(`/api/admin/agents/${id}`, { method: 'DELETE' })
    await reload()
  }

  const open = agents.find(a => a.id === openId) ?? null

  return (
    <div className="flex flex-col gap-4 pb-20 md:pb-16">
      {/* Панель управления: вид, поиск, менеджер, «новый агент» */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-[var(--ax-border)] p-0.5">
          {([
            { id: 'board', label: 'Доска', Icon: LayoutGrid },
            { id: 'list', label: 'Список', Icon: Rows3 },
            { id: 'inbox', label: `Входящие${chats.length ? ` · ${chats.length}` : ''}`, Icon: Inbox },
            { id: 'dash', label: 'Дашборд', Icon: BarChart3 },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-[13px] whitespace-nowrap transition-colors duration-[120ms] ${
                view === id
                  ? 'bg-[var(--ax-panel)] text-[var(--ax-fg)]'
                  : 'text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]'
              }`}
            >
              {/* Значок — украшение: на узком экране место нужнее подписям */}
              <Icon size={14} className="hidden sm:block" />
              {label}
            </button>
          ))}
        </div>

        {view !== 'dash' && (
        <div className="relative flex-1 min-w-[180px] max-w-[320px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-fg-faint)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Имя, агентство, ник…"
            className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] placeholder:text-[var(--ax-fg-faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
          />
        </div>
        )}

        {/* Фильтр правит только доску и список: во «Входящих» карточек ещё нет */}
        {(view === 'board' || view === 'list') && dealsCount > 0 && (
          // Из 187 карточек продавали меньше половины — включённый фильтр
          // оставляет на доске только тех, кто уже приводил клиентов.
          <button
            type="button"
            onClick={() => setDealsOnly(v => !v)}
            aria-pressed={dealsOnly}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] border transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D] ${
              dealsOnly
                ? 'border-[#1F8B5F] bg-[rgba(31,139,95,0.14)] text-[#4FC08D]'
                : 'border-[var(--ax-border)] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)]'
            }`}
          >
            <Handshake size={14} />
            Со сделками
            <span className="tabular-nums opacity-70">{dealsCount}</span>
          </button>
        )}

        {(view === 'board' || view === 'list') && reachCount > 0 && (
          <button
            type="button"
            onClick={() => setReachOnly(v => !v)}
            aria-pressed={reachOnly}
            title="Оставить только тех, кому можно написать из карточки"
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] border transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D] ${
              reachOnly
                ? 'border-[#1F8B5F] bg-[rgba(31,139,95,0.14)] text-[#4FC08D]'
                : 'border-[var(--ax-border)] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)]'
            }`}
          >
            <Send size={14} />
            Можно написать
            <span className="tabular-nums opacity-70">{reachCount}</span>
          </button>
        )}

        {view !== 'dash' && managers.length > 0 && (
          <select
            value={manager}
            onChange={e => setManager(e.target.value)}
            className="h-9 px-3 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
          >
            <option value="">Все менеджеры</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => { const n = prompt('Имя агента'); if (n?.trim()) addAgent(n.trim()) }}
          className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium bg-[#1F8B5F] hover:bg-[#197551] text-white disabled:opacity-50 transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
        >
          <Plus size={15} />
          Новый агент
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg text-[13px] bg-[var(--ax-error-bg)] border border-[var(--ax-error-border)] text-[var(--ax-error-fg)]">
          {error}
        </div>
      )}

      {view === 'board' && (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-3 px-3 md:-mx-4 md:px-4">
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
                  {items.map(a => (
                    <article
                      key={a.id}
                      draggable
                      onDragStart={() => setDragId(a.id)}
                      onDragEnd={() => { setDragId(null); setDropStatus(null) }}
                      onClick={() => setOpenId(a.id)}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(a.id) } }}
                      className={`cursor-pointer rounded-lg border border-[var(--ax-border-soft)] bg-[var(--ax-panel)] px-3 py-2.5 hover:border-[var(--ax-border)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D] ${
                        dragId === a.id ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        <span className="min-w-0 flex-1 text-[13.5px] font-medium text-[var(--ax-fg)] leading-snug break-words">{a.name}</span>
                        <ReachMark agent={a} />
                      </div>

                      {(a.agency || hasDeals(a)) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {a.agency && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[11.5px] text-[var(--ax-fg-soft)] bg-[var(--ax-hover)]">
                              {a.agency}
                            </span>
                          )}
                          {/* Уже продавал — единственная плашка на карточке,
                              которая красится акцентом: по ней доска и
                              читается «кто из этих людей реально работает». */}
                          {hasDeals(a) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11.5px] text-[#4FC08D] bg-[rgba(31,139,95,0.14)]">
                              <Handshake size={11} />
                              {dealsLabel(a)}
                            </span>
                          )}
                        </div>
                      )}

                      {a.next_meeting_at ? (
                        <div className="mt-2 flex items-start gap-1.5 text-[12px] text-[#4FC08D] leading-snug">
                          <CalendarDays size={12} className="mt-0.5 shrink-0" />
                          <span>{meetingWhen(a.next_meeting_at)}{a.next_meeting_place ? `, ${a.next_meeting_place}` : ''}</span>
                        </div>
                      ) : (a.next_step || a.ai_next_step) ? (
                        <div className="mt-2 text-[12px] text-[var(--ax-fg-soft)] leading-snug line-clamp-2">
                          {a.next_step || a.ai_next_step}
                        </div>
                      ) : null}

                      <div className={`mt-2 flex items-center gap-1.5 text-[11.5px] ${isStale(a) ? 'text-[#E0A93B]' : 'text-[var(--ax-fg-faint)]'}`}>
                        {a.chat_message_count > 0 ? <MessageSquareText size={11} /> : <Clock size={11} />}
                        <span>{contactLabel(a)}</span>
                        {a.ai_summary && <Sparkles size={11} className="ml-auto text-[#4FC08D]" />}
                      </div>
                    </article>
                  ))}

                  {items.length === 0 && (
                    <p className="px-2 py-6 text-[12px] text-[var(--ax-fg-faint)] leading-snug text-center">
                      {query || manager || dealsOnly || reachOnly ? 'Никто не подходит под фильтр' : s.hint}
                    </p>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {view === 'list' && (
        // Фильтр «со сделками» включён → вопрос сменился с «кому давно не
        // писали» на «кто больше продал», поэтому меняется и порядок.
        <AgentsList
          agents={[...visible].sort(dealsOnly ? byVolume : staleFirst)}
          byVolume={dealsOnly}
          onOpen={setOpenId}
        />
      )}

      {view === 'inbox' && (
        <InboxList chats={chats} busy={busy} onCreate={c => addAgent(c.name, c)} />
      )}

      {view === 'dash' && <AgentsDashboard onOpen={setOpenId} onInbox={() => setView('inbox')} />}

      {open && (
        <AgentPanel
          agentId={open.id}
          onClose={() => setOpenId(null)}
          onPatched={patch}
          onDeleted={removeAgent}
          onReload={reload}
        />
      )}
    </div>
  )
}

// Значок «до человека можно дотянуться». Залитый зелёный самолётик —
// переписка привязана, из карточки уходит сообщение. Бледный контур —
// есть только ник: такому агенту бот написать первым не может, и обещать
// тут кнопку «отправить» нельзя. Пусто — телеграма нет вовсе.
function ReachMark({ agent, className = '' }: { agent: AgentCard; className?: string }) {
  const reach = telegramReach(agent)
  if (reach === 'none') return null
  return (
    <Send
      size={12}
      aria-label={REACH_HINT[reach]}
      className={`shrink-0 mt-[3px] ${reach === 'chat' ? 'text-[#4FC08D]' : 'text-[var(--ax-fg-faint)] opacity-60'} ${className}`}
    >
      <title>{REACH_HINT[reach]}</title>
    </Send>
  )
}

// Крупные сделки сверху; у кого суммы нет — в конец по алфавиту.
function byVolume(a: AgentCard, b: AgentCard): number {
  const x = a.deals_volume_usd ?? 0, y = b.deals_volume_usd ?? 0
  if (x !== y) return y - x
  return a.name.localeCompare(b.name, 'ru')
}

function AgentsList({ agents, byVolume: sortedByVolume = false, onOpen }: { agents: AgentCard[]; byVolume?: boolean; onOpen: (id: string) => void }) {
  if (!agents.length) {
    return <p className="py-16 text-center text-[13px] text-[var(--ax-fg-muted)]">Никого не нашлось</p>
  }
  const money = (v: number | null) => (v == null ? '—' : `$${Math.round(v).toLocaleString('ru-RU')}`)
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--ax-border-soft)]">
      <table className="w-full min-w-[840px] text-[13px] border-collapse">
        <thead>
          <tr className="text-left text-[12px] text-[var(--ax-fg-muted)] bg-[var(--ax-chat-bg)]">
            {/* Отступ под два слота значков — иначе заголовок стоит левее имён */}
            <th className="font-medium py-2 pl-12 pr-3">Агент</th>
            <th className="font-medium px-3 py-2">Агентство</th>
            <th className="font-medium px-3 py-2">Статус</th>
            <th className="font-medium px-3 py-2">Менеджер</th>
            <th className="font-medium px-3 py-2">Последний контакт</th>
            <th className="font-medium px-3 py-2 text-right">Сделок</th>
            <th className="font-medium px-3 py-2 text-right">
              {sortedByVolume ? <span className="text-[#4FC08D]">Объём ↓</span> : 'Объём'}
            </th>
          </tr>
        </thead>
        <tbody>
          {agents.map(a => (
            <tr
              key={a.id}
              onClick={() => onOpen(a.id)}
              className="border-t border-[var(--ax-border-soft)] cursor-pointer hover:bg-[var(--ax-hover)]"
            >
              <td className="px-3 py-2 text-[var(--ax-fg)]">
                {/* Два узких слота под значки: с ними имена в столбце
                    остаются на одной вертикали, без них — прыгают. */}
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex w-3 justify-center"><ReachMark agent={a} className="mt-0" /></span>
                  <span className="inline-flex w-3 justify-center">
                    {hasDeals(a) && <Handshake size={12} className="shrink-0 text-[#4FC08D]" aria-label="есть сделки" />}
                  </span>
                  {a.name}
                </span>
              </td>
              <td className="px-3 py-2 text-[var(--ax-fg-soft)]">{a.agency ?? '—'}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-[var(--ax-fg-soft)]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_TINT[a.status] }} />
                  {STATUSES.find(s => s.id === a.status)?.label}
                </span>
              </td>
              <td className="px-3 py-2 text-[var(--ax-fg-soft)]">{a.manager ?? '—'}</td>
              <td className="px-3 py-2 text-[var(--ax-fg-muted)]">{relDay(lastContactAt(a)) ?? 'не связывались'}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${hasDeals(a) ? 'text-[#4FC08D]' : 'text-[var(--ax-fg-faint)]'}`}>{a.deals_count ?? '—'}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${hasDeals(a) ? 'text-[#4FC08D] font-medium' : 'text-[var(--ax-fg-faint)]'}`}>{money(a.deals_volume_usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InboxList({ chats, busy, onCreate }: { chats: UnlinkedChat[]; busy: boolean; onCreate: (c: UnlinkedChat) => void }) {
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const rest = chats.filter(c => !hidden.has(c.chat_id))

  if (!chats.length) {
    return (
      <p className="py-16 text-center text-[13px] text-[var(--ax-fg-muted)] max-w-[52ch] mx-auto leading-relaxed">
        Все переписки бота уже разобраны — у каждой есть карточка агента.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] text-[var(--ax-fg-muted)] max-w-[68ch] leading-relaxed">
        Диалоги, которые бот видит в вашем Telegram, но карточки агента для них ещё нет.
        Заведите карточку, если это агент, или скройте — это решение только для вас, чат никуда не денется.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rest.map(c => (
          // flex-col + mt-auto у кнопки: в ряду карточки разной высоты
          // (у кого-то нет последнего сообщения), и без этого «Завести
          // карточку» прыгает по вертикали от карточки к карточке.
          <article key={c.chat_id} className="flex flex-col rounded-xl border border-[var(--ax-border-soft)] bg-[var(--ax-panel)] p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-[var(--ax-fg)] truncate">{c.name}</div>
                {c.username && <div className="text-[12px] text-[var(--ax-fg-faint)]">@{c.username}</div>}
              </div>
              <button
                type="button"
                onClick={() => setHidden(prev => new Set(prev).add(c.chat_id))}
                aria-label="Скрыть из входящих"
                className="shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-md text-[var(--ax-fg-faint)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
              >
                <X size={14} />
              </button>
            </div>
            {c.last_text && (
              <p className="mt-2 text-[12px] text-[var(--ax-fg-muted)] leading-snug line-clamp-2">{c.last_text}</p>
            )}
            <div className="mt-2 flex items-center gap-3 text-[11.5px] text-[var(--ax-fg-faint)]">
              <span>{relDay(c.last_ts)}</span>
              <span>{c.message_count} сообщ.</span>
              {c.meeting_count > 0 && <span className="text-[#4FC08D]">{c.meeting_count} встр.</span>}
            </div>
            <div className="mt-auto pt-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => onCreate(c)}
                className="w-full h-8 rounded-lg text-[12.5px] font-medium border border-[var(--ax-border)] text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] disabled:opacity-50 transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
              >
                Завести карточку
              </button>
            </div>
          </article>
        ))}
      </div>
      {rest.length === 0 && (
        <p className="py-10 text-center text-[13px] text-[var(--ax-fg-muted)]">Все скрыты. Обновите страницу, чтобы вернуть список.</p>
      )}
    </div>
  )
}
