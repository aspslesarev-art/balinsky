'use client'

// Карточка агента — выезжающая панель справа (на телефоне во весь экран).
//
// Правится всё прямо здесь: поле сохраняется, когда из него уходишь, без
// кнопки «Сохранить». Так было в Notion, и переучиваться владельцу незачем.
//
// Блок «Переписка» ничего не хранит: сообщения, встречи и ИИ-выжимка
// подтягиваются по привязанному чату бота. Пока чат не привязан, на его
// месте поиск по диалогам.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  X, Sparkles, CalendarDays, MessageSquareText, Link2, Unlink, Trash2, Loader2, ExternalLink, Send,
} from 'lucide-react'
import {
  PROFILE_GROUPS, STATUSES, extraProfileFields, lastContactAt,
  type AgentCard, type AgentNote, type AgentStatus,
} from '@/lib/agents/types'

type ChatMessage = { id: number; direction: 'in' | 'out'; text: string | null; is_voice: boolean; media_type: string | null; ts: string }
type ChatMeeting = { id: number; status: 'agreed' | 'scheduled' | 'cancelled'; topic: string | null; starts_at: string | null; when_text: string | null; place: string | null }
type ChatOption = { chat_id: number; name: string; username: string | null; last_ts: string; message_count: number; taken_by: string | null }

type Payload = {
  agent: AgentCard
  notes: AgentNote[]
  messages: ChatMessage[]
  meetings: ChatMeeting[]
  chats: ChatOption[]
}

function when(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
const MEETING_LABEL: Record<ChatMeeting['status'], string> = {
  agreed: 'Договорились', scheduled: 'Назначена', cancelled: 'Отменена',
}

export function AgentPanel({
  agentId, onClose, onPatched, onDeleted, onReload,
}: {
  agentId: string
  onClose: () => void
  onPatched: (a: AgentCard) => void
  onDeleted: (id: string) => void
  onReload: () => Promise<void>
}) {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [chatQuery, setChatQuery] = useState('')

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/agents/${agentId}`, { cache: 'no-store' })
    if (r.status === 401) { window.location.href = '/admin'; return }
    const j = await r.json() as { ok: boolean } & Partial<Payload>
    if (j.ok && j.agent) setData(j as Payload)
    else setError('Карточка не загрузилась')
  }, [agentId])

  useEffect(() => { load() }, [load])

  // Esc закрывает панель — привычка из Notion и из остальной админки.
  // Заодно держим фон неподвижным: без этого колесо мыши над доской
  // прокручивает список ПОД панелью, и, закрыв карточку, владелец
  // оказывается не там, где был.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const save = async (patch: Record<string, unknown>) => {
    setError(null)
    const r = await fetch(`/api/admin/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const j = await r.json() as { ok: boolean; agent?: AgentCard; error?: string; by?: string }
    if (!j.ok) {
      setError(j.error === 'chat_taken' ? `Эта переписка уже привязана к карточке «${j.by}»` : 'Не удалось сохранить')
      return
    }
    await load()
    if (j.agent) onPatched(j.agent)
    await onReload()
  }

  const runAi = async () => {
    setAiBusy(true); setError(null)
    try {
      const r = await fetch(`/api/admin/agents/${agentId}/summary`, { method: 'POST' })
      const j = await r.json() as { ok: boolean; error?: string; message?: string }
      if (!j.ok) {
        setError(
          j.error === 'cap_reached' ? (j.message ?? 'Дневной лимит трат на ИИ исчерпан')
          : j.error === 'ai_disabled' ? 'ИИ-разбор выключен'
          : j.error === 'no_chat' ? 'Сначала привяжите переписку'
          : 'Модель не ответила — попробуйте позже',
        )
      } else {
        await load()
      }
    } finally {
      setAiBusy(false)
    }
  }

  const addNote = async () => {
    const body = noteDraft.trim()
    if (!body) return
    setNoteDraft('')
    await fetch(`/api/admin/agents/${agentId}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
    })
    await load()
  }

  const a = data?.agent

  return (
    <>
      {/* Подложка: клик мимо панели закрывает её */}
      <div className="fixed inset-0 z-[55] bg-black/40" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-label="Карточка агента"
        className="fixed z-[60] inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[560px] bg-[var(--ax-bg)] md:border-l border-[var(--ax-border)] overflow-y-auto"
      >
        {!a ? (
          <div className="flex items-center justify-center h-full text-[13px] text-[var(--ax-fg-muted)]">
            {error ?? 'Загружаю…'}
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Шапка */}
            <header className="sticky top-0 z-[1] flex items-start gap-3 px-4 md:px-6 py-4 bg-[var(--ax-bg)] border-b border-[var(--ax-border-soft)]">
              <div className="min-w-0 flex-1">
                <Editable
                  value={a.name}
                  onSave={v => save({ name: v })}
                  className="text-[20px] font-semibold tracking-tight text-[var(--ax-fg)] leading-tight"
                  placeholder="Имя агента"
                />
                <Editable
                  value={a.agency ?? ''}
                  onSave={v => save({ agency: v })}
                  className="mt-1 text-[13px] text-[var(--ax-fg-muted)]"
                  placeholder="Агентство"
                />
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
              >
                <X size={16} />
              </button>
            </header>

            {error && (
              <div className="mx-4 md:mx-6 mt-4 px-3 py-2 rounded-lg text-[12.5px] bg-[var(--ax-error-bg)] border border-[var(--ax-error-border)] text-[var(--ax-error-fg)]">
                {error}
              </div>
            )}

            <div className="px-4 md:px-6 pt-5 pb-10 flex flex-col gap-8">
              {/* Воронка и ответственный */}
              <section className="grid grid-cols-2 gap-3">
                <Field label="Статус">
                  <select
                    value={a.status}
                    onChange={e => save({ status: e.target.value as AgentStatus })}
                    className="w-full h-9 px-2.5 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                  >
                    {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Менеджер">
                  <Editable value={a.manager ?? ''} onSave={v => save({ manager: v })} boxed placeholder="—" />
                </Field>
                <Field label="Следующий шаг" wide>
                  <Editable value={a.next_step ?? ''} onSave={v => save({ next_step: v })} boxed multiline placeholder="Что сделать дальше" />
                </Field>
                <Field label="Следующий контакт">
                  <input
                    type="date"
                    defaultValue={a.next_contact ?? ''}
                    onChange={e => save({ next_contact: e.target.value || null })}
                    className="w-full h-9 px-2.5 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                  />
                </Field>
                <Field label="Последний контакт">
                  <div className="h-9 flex items-center text-[13px] text-[var(--ax-fg-soft)]">
                    {/* Позднее из двух: живая переписка и отметка руками */}
                    {lastContactAt(a) ? when(lastContactAt(a)) : 'не связывались'}
                  </div>
                </Field>
              </section>

              {/* Контакты */}
              <section>
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ax-fg-faint)] mb-3">Связь</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Telegram">
                    <Editable value={a.telegram ? `@${a.telegram}` : ''} onSave={v => save({ telegram: v })} boxed placeholder="@ник"
                      href={a.telegram ? `https://t.me/${a.telegram}` : undefined} />
                  </Field>
                  <Field label="WhatsApp">
                    <Editable value={a.whatsapp ?? ''} onSave={v => save({ whatsapp: v })} boxed placeholder="—" />
                  </Field>
                  <Field label="Телефон">
                    <Editable value={a.phone ?? ''} onSave={v => save({ phone: v })} boxed placeholder="—" />
                  </Field>
                  <Field label="Почта">
                    <Editable value={a.email ?? ''} onSave={v => save({ email: v })} boxed placeholder="—" />
                  </Field>
                  <Field label="Должность">
                    <Editable value={a.position ?? ''} onSave={v => save({ position: v })} boxed placeholder="—" />
                  </Field>
                  <Field label="Локация">
                    <Editable value={a.location ?? ''} onSave={v => save({ location: v })} boxed placeholder="—" />
                  </Field>
                </div>
              </section>

              {/* Сделки */}
              <section>
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ax-fg-faint)] mb-3">Сделки</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Сделок, шт">
                    <Editable value={a.deals_count == null ? '' : String(a.deals_count)}
                      onSave={v => save({ deals_count: v ? Number(v.replace(/\D/g, '')) || null : null })} boxed placeholder="—" />
                  </Field>
                  <Field label="Объём, $">
                    <Editable value={a.deals_volume_usd == null ? '' : String(Math.round(a.deals_volume_usd))}
                      onSave={v => save({ deals_volume_usd: v ? Number(v.replace(/[^\d.]/g, '')) || null : null })} boxed placeholder="—" />
                  </Field>
                </div>
              </section>

              {/* Переписка бота */}
              <section>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ax-fg-faint)]">Переписка</h3>
                  {a.tg_chat_id != null && (
                    <div className="flex items-center gap-1">
                      <a
                        href="/admin/perepiska"
                        className="inline-flex items-center gap-1 text-[12px] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] no-underline"
                      >
                        Открыть чат <ExternalLink size={11} />
                      </a>
                      <button
                        type="button"
                        onClick={() => save({ tg_chat_id: null })}
                        aria-label="Отвязать переписку"
                        title="Отвязать переписку"
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-[var(--ax-fg-faint)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                      >
                        <Unlink size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {a.tg_chat_id == null ? (
                  <ChatPicker
                    chats={data.chats}
                    query={chatQuery}
                    suggestFor={a.name}
                    onQuery={setChatQuery}
                    onPick={id => save({ tg_chat_id: id })}
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* ИИ-выжимка */}
                    <div className="rounded-xl border border-[var(--ax-border-soft)] bg-[var(--ax-chat-bg)] p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={13} className="text-[#4FC08D]" />
                        <span className="text-[12px] font-medium text-[var(--ax-fg-soft)]">О чём переписка</span>
                        <button
                          type="button"
                          onClick={runAi}
                          disabled={aiBusy}
                          className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] border border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] disabled:opacity-50 transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                        >
                          {aiBusy ? <Loader2 size={12} className="animate-spin" /> : null}
                          {a.ai_summary ? 'Обновить' : 'Разобрать'}
                        </button>
                      </div>
                      {a.ai_summary ? (
                        <>
                          <p className="text-[13px] text-[var(--ax-fg)] leading-relaxed max-w-[68ch]">{a.ai_summary}</p>
                          {a.ai_next_step && (
                            <p className="mt-2 text-[12.5px] text-[#4FC08D] leading-snug">→ {a.ai_next_step}</p>
                          )}
                          <p className="mt-2 text-[11.5px] text-[var(--ax-fg-faint)]">Разобрано {when(a.ai_updated_at)}</p>
                        </>
                      ) : (
                        <p className="text-[12.5px] text-[var(--ax-fg-muted)] leading-relaxed max-w-[68ch]">
                          Переписку ещё не разбирали. Нажмите «Разобрать» — ИИ прочитает диалог и напишет, о чём договаривались и что делать дальше.
                        </p>
                      )}
                    </div>

                    {/* Встречи */}
                    {data.meetings.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {data.meetings.map(m => (
                          <div key={m.id} className="flex items-start gap-2 text-[12.5px] leading-snug">
                            <CalendarDays size={13} className={`mt-0.5 shrink-0 ${m.status === 'cancelled' ? 'text-[var(--ax-fg-faint)]' : 'text-[#4FC08D]'}`} />
                            <span className={m.status === 'cancelled' ? 'text-[var(--ax-fg-faint)] line-through' : 'text-[var(--ax-fg-soft)]'}>
                              {m.starts_at ? when(m.starts_at) : (m.when_text ?? 'без даты')}
                              {m.place ? `, ${m.place}` : ''}
                              {m.topic ? ` — ${m.topic}` : ''}
                            </span>
                            <span className="ml-auto shrink-0 text-[11.5px] text-[var(--ax-fg-faint)]">{MEETING_LABEL[m.status]}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Хвост диалога */}
                    <div className="rounded-xl border border-[var(--ax-border-soft)] max-h-[280px] overflow-y-auto p-3 flex flex-col gap-2">
                      {data.messages.length === 0 && (
                        <p className="text-[12.5px] text-[var(--ax-fg-muted)]">Сообщений пока нет</p>
                      )}
                      {data.messages.map(m => (
                        <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] px-2.5 py-1.5 rounded-lg text-[12.5px] leading-snug whitespace-pre-wrap break-words ${
                              m.direction === 'out'
                                ? 'bg-[var(--ax-bubble-user-bg)] text-[var(--ax-bubble-user-fg)]'
                                : 'bg-[var(--ax-bubble-bot-bg)] text-[var(--ax-bubble-bot-fg)]'
                            }`}
                          >
                            {m.text ?? (m.media_type ? `[${m.media_type}]` : '[без текста]')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Анкета из Notion */}
              {PROFILE_GROUPS.map(g => {
                const filled = g.fields.filter(f => a.data?.[f])
                // Пустую группу не показываем целиком, иначе карточка на
                // три экрана прочерков — в базе анкета заполнена у трети.
                if (!filled.length) return null
                return (
                  <section key={g.title}>
                    <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ax-fg-faint)] mb-3">{g.title}</h3>
                    <dl className="flex flex-col gap-2.5">
                      {filled.map(f => (
                        <div key={f}>
                          <dt className="text-[11.5px] text-[var(--ax-fg-faint)] mb-0.5">{f}</dt>
                          <dd>
                            <Editable
                              value={a.data[f] ?? ''}
                              onSave={v => save({ data: { ...a.data, [f]: v || undefined } })}
                              multiline
                              className="text-[13px] text-[var(--ax-fg)] leading-relaxed max-w-[68ch]"
                            />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )
              })}

              {extraProfileFields(a.data ?? {}).length > 0 && (
                <section>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ax-fg-faint)] mb-3">Прочее из Notion</h3>
                  <dl className="flex flex-col gap-2.5">
                    {extraProfileFields(a.data).map(f => (
                      <div key={f}>
                        <dt className="text-[11.5px] text-[var(--ax-fg-faint)] mb-0.5">{f}</dt>
                        <dd className="text-[13px] text-[var(--ax-fg)] leading-relaxed max-w-[68ch]">{a.data[f]}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {/* Заметки */}
              <section>
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ax-fg-faint)] mb-3">Заметки</h3>
                <div className="flex items-end gap-2">
                  <textarea
                    value={noteDraft}
                    onChange={e => setNoteDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
                    rows={2}
                    placeholder="Что важно помнить об этом агенте"
                    className="flex-1 px-3 py-2 rounded-lg text-[13px] leading-snug resize-y bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] placeholder:text-[var(--ax-fg-faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                  />
                  <button
                    type="button"
                    onClick={addNote}
                    disabled={!noteDraft.trim()}
                    aria-label="Добавить заметку"
                    className="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-lg bg-[#1F8B5F] hover:bg-[#197551] text-white disabled:opacity-40 transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                  >
                    <Send size={14} />
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {data.notes.map(n => (
                    <div key={n.id} className="flex flex-col gap-0.5">
                      <p className={`text-[13px] leading-relaxed max-w-[68ch] ${n.kind === 'system' ? 'text-[var(--ax-fg-muted)] italic' : 'text-[var(--ax-fg)]'}`}>
                        {n.body}
                      </p>
                      <span className="text-[11.5px] text-[var(--ax-fg-faint)]">
                        {when(n.created_at)}{n.author ? ` · ${n.author}` : ''}
                      </span>
                    </div>
                  ))}
                  {data.notes.length === 0 && (
                    <p className="text-[12.5px] text-[var(--ax-fg-muted)]">Пока пусто</p>
                  )}
                </div>
              </section>

              {/* Удаление — в самом низу и с подтверждением */}
              <section className="pt-2 pb-8 border-t border-[var(--ax-border-soft)]">
                <button
                  type="button"
                  onClick={() => { if (confirm(`Удалить карточку «${a.name}»? Переписка в Telegram останется на месте.`)) onDeleted(a.id) }}
                  className="inline-flex items-center gap-1.5 mt-4 h-8 px-3 rounded-lg text-[12.5px] text-[var(--ax-error-fg)] hover:bg-[var(--ax-error-bg)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                >
                  <Trash2 size={13} />
                  Удалить карточку
                </button>
              </section>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

// Поле формы: подпись сверху, контрол снизу.
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <div className="text-[11.5px] text-[var(--ax-fg-faint)] mb-1">{label}</div>
      {children}
    </div>
  )
}

// Текст, который превращается в поле ввода по клику и сохраняется при
// уходе фокуса. Enter сохраняет, Esc отменяет.
function Editable({
  value, onSave, className = '', placeholder = '', boxed = false, multiline = false, href,
}: {
  value: string
  onSave: (v: string) => void | Promise<void>
  className?: string
  placeholder?: string
  boxed?: boolean
  multiline?: boolean
  href?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (next !== (value ?? '').trim()) onSave(next)
  }

  const box = boxed
    ? 'w-full min-h-9 px-2.5 py-1.5 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[13px] text-[var(--ax-fg)]'
    : ''

  if (editing) {
    const shared = {
      ref: ref as never,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit() }
      },
      className: `${box || 'w-full px-2 py-1 -mx-2 -my-1 rounded-md bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)]'} ${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]`,
    }
    return multiline ? <textarea rows={2} {...shared} /> : <input type="text" {...shared} />
  }

  const empty = !value
  return (
    <div className={`${box} ${boxed ? 'flex items-center' : ''}`}>
      <span
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setEditing(true) } }}
        className={`${boxed ? '' : className} block w-full cursor-text rounded-md hover:bg-[var(--ax-hover)] whitespace-pre-wrap break-words ${empty ? 'text-[var(--ax-fg-faint)]' : ''} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]`}
      >
        {value || placeholder || '—'}
      </span>
      {href && !empty && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          aria-label="Открыть в Telegram"
          className="ml-auto shrink-0 text-[var(--ax-fg-faint)] hover:text-[var(--ax-fg)]"
        >
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}

// Поиск чата для привязки. Сверху — догадки по имени карточки: в базе
// имя обычно совпадает с тем, как контакт подписан в Telegram.
function ChatPicker({
  chats, query, suggestFor, onQuery, onPick,
}: {
  chats: ChatOption[]
  query: string
  suggestFor: string
  onQuery: (v: string) => void
  onPick: (id: number) => void
}) {
  const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const words = norm(suggestFor).split(' ').filter(w => w.length >= 3)

  const q = norm(query)
  const list = q
    ? chats.filter(c => norm(`${c.name} ${c.username ?? ''}`).includes(q))
    : chats.filter(c => words.some(w => norm(`${c.name} ${c.username ?? ''}`).includes(w)))

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-fg-faint)]" />
        <input
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Найти переписку по имени или нику"
          className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] placeholder:text-[var(--ax-fg-faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
        />
      </div>

      {list.length === 0 ? (
        <p className="text-[12.5px] text-[var(--ax-fg-muted)] leading-relaxed max-w-[68ch]">
          {query ? 'Такой переписки у бота нет.' : 'Похожей переписки не нашлось — найдите её по имени или нику.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-1 max-h-[240px] overflow-y-auto">
          {list.slice(0, 40).map(c => (
            <li key={c.chat_id}>
              <button
                type="button"
                onClick={() => onPick(c.chat_id)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--ax-hover)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[var(--ax-fg)] truncate">{c.name}</span>
                  {c.username && <span className="text-[12px] text-[var(--ax-fg-faint)] truncate">@{c.username}</span>}
                  <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[11.5px] text-[var(--ax-fg-faint)]">
                    <MessageSquareText size={11} />{c.message_count}
                  </span>
                </div>
                {c.taken_by && (
                  <div className="text-[11.5px] text-[var(--ax-fg-faint)] mt-0.5">уже привязана к «{c.taken_by}»</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
