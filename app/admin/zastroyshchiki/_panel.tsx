'use client'

// Карточка застройщика — выезжающая панель справа (на телефоне во весь
// экран). Правится всё прямо здесь: поле сохраняется, когда из него
// уходишь, без кнопки «Сохранить».
//
// Устройство карточки двухэтажное и это главное её отличие от карточки
// агента: сверху компания и её воронка, ниже список людей. Переписка,
// встречи и ИИ-выжимка живут у человека, а не у компании, — потому что
// в Telegram пишут человеку.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  X, Sparkles, CalendarDays, MessageSquareText, Link2, Unlink, Trash2, Loader2,
  ExternalLink, Send, Plus, ChevronRight, GitMerge, Star,
} from 'lucide-react'
import {
  PROSPECTS, ROLES, ROLE_LABEL, STATUSES, lastContactAt,
  type DevNote, type DevPartnerCard, type DevPersonCard, type DevStatus,
  type PersonRole,
} from '@/lib/dev-crm/types'
import type { ChatOption, SiteFacts } from '@/lib/dev-crm/store'

type ChatMessage = { id: number; direction: 'in' | 'out'; text: string | null; is_voice: boolean; media_type: string | null; ts: string }
type ChatMeeting = { id: number; status: 'agreed' | 'scheduled' | 'cancelled'; topic: string | null; starts_at: string | null; when_text: string | null; place: string | null }
type Tail = { person_id: string; messages: ChatMessage[]; meetings: ChatMeeting[] }

type Payload = {
  partner: DevPartnerCard
  notes: DevNote[]
  chats: ChatOption[]
  partners: Array<{ id: string; name: string }>
  site: SiteFacts | null
  tails: Tail[]
}

function when(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const MEETING_LABEL: Record<ChatMeeting['status'], string> = {
  agreed: 'Договорились', scheduled: 'Назначена', cancelled: 'Отменена',
}

// Поля выгрузок, которые в карточке не показываем: они уже стали
// колонками или это служебные пометки импорта.
const HIDDEN_DATA_FIELDS = new Set(['Источник', 'Сырые контакты'])

export function DeveloperPanel({
  partnerId, onClose, onPatched, onDeleted, onReload,
}: {
  partnerId: string
  onClose: () => void
  onPatched: (p: DevPartnerCard) => void
  onDeleted: (id: string) => void
  onReload: () => Promise<void>
}) {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [openPerson, setOpenPerson] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/dev-partners/${partnerId}`, { cache: 'no-store' })
    if (r.status === 401) { window.location.href = '/admin'; return }
    const j = await r.json() as { ok: boolean } & Partial<Payload>
    if (j.ok && j.partner) setData(j as Payload)
    else setError('Карточка не загрузилась')
  }, [partnerId])

  useEffect(() => { load() }, [load])

  // Esc закрывает панель. Заодно держим фон неподвижным: без этого
  // колесо мыши над доской прокручивает список ПОД панелью, и, закрыв
  // карточку, владелец оказывается не там, где был.
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
    const r = await fetch(`/api/admin/dev-partners/${partnerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const j = await r.json() as { ok: boolean; partner?: DevPartnerCard; error?: string }
    if (!j.ok) { setError('Не удалось сохранить'); return }
    await load()
    if (j.partner) onPatched(j.partner)
    await onReload()
  }

  const savePerson = async (personId: string, patch: Record<string, unknown>) => {
    setError(null)
    const r = await fetch(`/api/admin/dev-people/${personId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const j = await r.json() as { ok: boolean; error?: string; by?: string }
    if (!j.ok) {
      setError(j.error === 'chat_taken' ? `Эта переписка уже привязана к «${j.by}»` : 'Не удалось сохранить')
      return
    }
    await load()
    await onReload()
  }

  const addPerson = async (name: string, role: PersonRole) => {
    const r = await fetch(`/api/admin/dev-partners/${partnerId}/people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role }),
    })
    const j = await r.json() as { ok: boolean; person?: { id: string } }
    if (!j.ok) { setError('Не удалось добавить человека'); return }
    await load()
    await onReload()
    if (j.person) setOpenPerson(j.person.id)
  }

  const removePerson = async (personId: string, name: string) => {
    if (!confirm(`Убрать ${name} из карточки? Переписка в Telegram останется на месте.`)) return
    await fetch(`/api/admin/dev-people/${personId}`, { method: 'DELETE' })
    await load()
    await onReload()
  }

  const addNote = async () => {
    const body = noteDraft.trim()
    if (!body) return
    setNoteDraft('')
    await fetch(`/api/admin/dev-partners/${partnerId}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
    })
    await load()
  }

  const mergeWith = async (otherId: string, otherName: string) => {
    if (!confirm(`Влить «${otherName}» в эту карточку? Люди и заметки переедут сюда, вторая карточка удалится. Отменить нельзя.`)) return
    setMerging(false)
    await save({ merge_with: otherId })
  }

  const p = data?.partner

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/40" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-label="Карточка застройщика"
        className="fixed z-[60] inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[620px] bg-[var(--ax-bg)] md:border-l border-[var(--ax-border)] overflow-y-auto"
      >
        {!p ? (
          <div className="flex items-center justify-center h-full text-[13px] text-[var(--ax-fg-muted)]">
            {error ?? 'Загружаю…'}
          </div>
        ) : (
          <div className="flex flex-col">
            <header className="sticky top-0 z-[1] flex items-start gap-3 px-4 md:px-6 py-4 bg-[var(--ax-bg)] border-b border-[var(--ax-border-soft)]">
              <div className="min-w-0 flex-1">
                <Editable
                  value={p.name}
                  onSave={v => save({ name: v })}
                  className="text-[20px] font-semibold tracking-tight text-[var(--ax-fg)] leading-tight"
                  placeholder="Название застройщика"
                />
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--ax-fg-muted)]">
                  {p.site_slug ? (
                    <a
                      href={`https://balinsky.info/ru/zastrojshhiki/${p.site_slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 no-underline hover:text-[var(--ax-fg)]"
                    >
                      Страница на сайте <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="text-[var(--ax-fg-faint)]">на сайте нет</span>
                  )}
                  {data.site?.rating && (
                    <span className="inline-flex items-center gap-1">
                      <Star size={11} className="text-[#E0A93B]" />{data.site.rating}
                    </span>
                  )}
                  {data.site && !data.site.published && <span className="text-[var(--ax-fg-faint)]">не опубликован</span>}
                </div>
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
              {/* Не в работе — доски эта карточка не видит, и первое, что
                  нужно на ней сделать, это решить, берём или нет. */}
              {!p.in_work && (
                <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--ax-chat-bg)] border border-[var(--ax-border-soft)]">
                  <p className="flex-1 min-w-[16ch] text-[12.5px] text-[var(--ax-fg-soft)] leading-snug">
                    В работу не взят — карточки нет на доске, она лежит в «Отборе».
                  </p>
                  <button
                    type="button"
                    onClick={() => save({ in_work: true, status: 'contact', sort: -Date.now() })}
                    className="h-8 px-3 rounded-lg text-[12.5px] font-medium bg-[#1F8B5F] hover:bg-[#197551] text-white transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                  >
                    Взять в работу
                  </button>
                </div>
              )}

              {/* Воронка */}
              <section className="grid grid-cols-2 gap-3">
                <Field label="Статус">
                  <select
                    value={p.status}
                    onChange={e => save({ status: e.target.value as DevStatus })}
                    className="w-full h-9 px-2.5 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                  >
                    {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Отклик">
                  <select
                    value={p.prospect ?? ''}
                    onChange={e => save({ prospect: e.target.value || null })}
                    className="w-full h-9 px-2.5 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                  >
                    <option value="">не оценён</option>
                    {PROSPECTS.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select>
                </Field>
                <Field label="Следующий шаг" wide>
                  <Editable value={p.next_step ?? ''} onSave={v => save({ next_step: v })} boxed multiline placeholder="Что сделать дальше" />
                </Field>
                <Field label="Следующий контакт">
                  <input
                    type="date"
                    defaultValue={p.next_contact ?? ''}
                    onChange={e => save({ next_contact: e.target.value || null })}
                    className="w-full h-9 px-2.5 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                  />
                </Field>
                <Field label="Последний контакт">
                  <div className="h-9 flex items-center text-[13px] text-[var(--ax-fg-soft)]">
                    {/* Позднее из двух: живые переписки людей и отметка руками */}
                    {lastContactAt(p) ? when(lastContactAt(p)) : 'не связывались'}
                  </div>
                </Field>
                <Field label="Менеджер">
                  <Editable value={p.manager ?? ''} onSave={v => save({ manager: v })} boxed placeholder="—" />
                </Field>
                <Field label="Район">
                  <Editable value={p.location ?? ''} onSave={v => save({ location: v })} boxed placeholder="—" />
                </Field>
              </section>

              {/* Люди */}
              <section>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ax-fg-faint)]">
                    Люди {p.people.length > 0 && <span className="text-[var(--ax-fg-faint)]">· {p.people.length}</span>}
                  </h3>
                  <AddPerson onAdd={addPerson} />
                </div>

                {p.people.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--ax-fg-muted)] leading-relaxed max-w-[68ch]">
                    Никого не знаем. Добавьте основателя или человека из отдела продаж — по вписанному нику
                    карточка сама найдёт переписку у бота.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {p.people.map(person => (
                      <PersonBlock
                        key={person.id}
                        person={person}
                        tail={data.tails.find(t => t.person_id === person.id)}
                        chats={data.chats}
                        expanded={openPerson === person.id}
                        onToggle={() => setOpenPerson(prev => (prev === person.id ? null : person.id))}
                        onSave={patch => savePerson(person.id, patch)}
                        onRemove={() => removePerson(person.id, person.name)}
                        onError={setError}
                        onReloaded={load}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Компания */}
              <section>
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ax-fg-faint)] mb-3">Компания</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Сайт" wide>
                    <Editable value={p.website ?? ''} onSave={v => save({ website: v })} boxed placeholder="—"
                      href={p.website ? (p.website.startsWith('http') ? p.website : `https://${p.website}`) : undefined} />
                  </Field>
                  <Field label="Почта">
                    <Editable value={p.email ?? ''} onSave={v => save({ email: v })} boxed placeholder="—" />
                  </Field>
                  <Field label="Телефон">
                    <Editable value={p.phone ?? ''} onSave={v => save({ phone: v })} boxed placeholder="—" />
                  </Field>
                  <Field label="WhatsApp">
                    <Editable value={p.whatsapp ?? ''} onSave={v => save({ whatsapp: v })} boxed placeholder="—" />
                  </Field>
                  <Field label="Telegram компании">
                    <Editable value={p.telegram ? `@${p.telegram}` : ''} onSave={v => save({ telegram: v })} boxed placeholder="@ник"
                      href={p.telegram ? `https://t.me/${p.telegram}` : undefined} />
                  </Field>
                  <Field label="Instagram" wide>
                    <Editable value={p.instagram ?? ''} onSave={v => save({ instagram: v })} boxed placeholder="—" />
                  </Field>
                  <Field label="Комиссия">
                    <Editable value={p.commission ?? ''} onSave={v => save({ commission: v })} boxed placeholder="—" />
                  </Field>
                  <Field label="Проекты" wide>
                    <Editable value={p.projects ?? ''} onSave={v => save({ projects: v })} boxed multiline placeholder="—" />
                  </Field>
                </div>
              </section>

              {/* Всё, что приехало из выгрузок и не стало колонкой */}
              {Object.keys(p.data ?? {}).filter(k => !HIDDEN_DATA_FIELDS.has(k) && p.data[k]).length > 0 && (
                <section>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ax-fg-faint)] mb-3">Из выгрузок</h3>
                  <dl className="flex flex-col gap-2.5">
                    {Object.keys(p.data).filter(k => !HIDDEN_DATA_FIELDS.has(k) && p.data[k]).sort((a, b) => a.localeCompare(b, 'ru')).map(k => (
                      <div key={k}>
                        <dt className="text-[11.5px] text-[var(--ax-fg-faint)] mb-0.5">{k}</dt>
                        <dd className="text-[13px] text-[var(--ax-fg)] leading-relaxed max-w-[68ch] whitespace-pre-wrap">{p.data[k]}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {/* Сырая строка контактов из общей базы: там и сайт, и почта,
                  и личные ники, и пометки — разбирать её автоматически
                  небезопасно, а терять нельзя. */}
              {p.data?.['Сырые контакты'] && (
                <section>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ax-fg-faint)] mb-3">Контакты как есть в базе</h3>
                  <p className="text-[12.5px] text-[var(--ax-fg-soft)] leading-relaxed max-w-[68ch] whitespace-pre-wrap">
                    {p.data['Сырые контакты']}
                  </p>
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
                    placeholder="Что важно помнить об этом застройщике"
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
                  {data.notes.length === 0 && <p className="text-[12.5px] text-[var(--ax-fg-muted)]">Пока пусто</p>}
                </div>
              </section>

              {/* Склейка и удаление — в самом низу */}
              <section className="pt-2 pb-8 border-t border-[var(--ax-border-soft)]">
                <div className="mt-4 flex flex-col gap-3">
                  {merging ? (
                    <MergePicker
                      partners={data.partners}
                      onPick={mergeWith}
                      onCancel={() => setMerging(false)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMerging(true)}
                      className="self-start inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                    >
                      <GitMerge size={13} />
                      Влить сюда другую карточку
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { if (confirm(`Удалить карточку «${p.name}»? Люди и заметки удалятся вместе с ней, переписка в Telegram останется.`)) onDeleted(p.id) }}
                    className="self-start inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] text-[var(--ax-error-fg)] hover:bg-[var(--ax-error-bg)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                  >
                    <Trash2 size={13} />
                    Удалить карточку
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

// Человек внутри компании. Свёрнут — одна строка: кто это и есть ли
// переписка. Развёрнут — контакты, ИИ-выжимка, встречи и хвост диалога.
function PersonBlock({
  person, tail, chats, expanded, onToggle, onSave, onRemove, onError, onReloaded,
}: {
  person: DevPersonCard
  tail: Tail | undefined
  chats: ChatOption[]
  expanded: boolean
  onToggle: () => void
  onSave: (patch: Record<string, unknown>) => Promise<void>
  onRemove: () => void
  onError: (msg: string | null) => void
  onReloaded: () => Promise<void>
}) {
  const [aiBusy, setAiBusy] = useState(false)
  const [chatQuery, setChatQuery] = useState('')

  const runAi = async () => {
    setAiBusy(true); onError(null)
    try {
      const r = await fetch(`/api/admin/dev-people/${person.id}/summary`, { method: 'POST' })
      const j = await r.json() as { ok: boolean; error?: string; message?: string }
      if (!j.ok) {
        onError(
          j.error === 'cap_reached' ? (j.message ?? 'Дневной лимит трат на ИИ исчерпан')
          : j.error === 'ai_disabled' ? 'ИИ-разбор выключен'
          : j.error === 'no_chat' ? 'Сначала привяжите переписку'
          : 'Модель не ответила — попробуйте позже',
        )
      } else {
        await onReloaded()
      }
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--ax-border-soft)] bg-[var(--ax-chat-bg)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left rounded-xl hover:bg-[var(--ax-hover)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
      >
        <ChevronRight size={14} className={`shrink-0 text-[var(--ax-fg-faint)] transition-transform duration-[120ms] ${expanded ? 'rotate-90' : ''}`} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] text-[var(--ax-fg)] leading-snug truncate">
            {person.name}
            {/* Имени могло не быть вовсе — тогда им стал сам ник, и
                дописывать его второй раз незачем. */}
            {person.telegram && person.name.toLowerCase() !== `@${person.telegram}` && (
              <span className="ml-1.5 text-[12px] text-[var(--ax-fg-faint)]">@{person.telegram}</span>
            )}
          </span>
          <span className="block text-[11.5px] text-[var(--ax-fg-faint)] truncate">
            {ROLE_LABEL[person.role]}{person.position ? ` · ${person.position}` : ''}
          </span>
        </span>
        {person.ai_summary && <Sparkles size={12} className="shrink-0 text-[#4FC08D]" />}
        {person.tg_chat_id != null ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-[11.5px] text-[var(--ax-fg-muted)] tabular-nums">
            <MessageSquareText size={11} />{person.chat_message_count}
          </span>
        ) : (
          <span className="shrink-0 text-[11.5px] text-[var(--ax-fg-faint)]">нет чата</span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Имя" wide>
              <Editable value={person.name} onSave={v => onSave({ name: v })} boxed placeholder="Имя" />
            </Field>
            <Field label="Кто это">
              <select
                value={person.role}
                onChange={e => onSave({ role: e.target.value as PersonRole })}
                className="w-full h-9 px-2.5 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
              >
                {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Должность">
              <Editable value={person.position ?? ''} onSave={v => onSave({ position: v })} boxed placeholder="—" />
            </Field>
            <Field label="Telegram">
              <Editable value={person.telegram ? `@${person.telegram}` : ''} onSave={v => onSave({ telegram: v })} boxed placeholder="@ник"
                href={person.telegram ? `https://t.me/${person.telegram}` : undefined} />
            </Field>
            <Field label="Канал в Telegram">
              <Editable value={person.tg_channel ?? ''} onSave={v => onSave({ tg_channel: v })} boxed placeholder="—" />
            </Field>
            <Field label="WhatsApp">
              <Editable value={person.whatsapp ?? ''} onSave={v => onSave({ whatsapp: v })} boxed placeholder="—" />
            </Field>
            <Field label="Instagram">
              <Editable value={person.instagram ?? ''} onSave={v => onSave({ instagram: v })} boxed placeholder="—" />
            </Field>
            <Field label="Как выйти на него" wide>
              <Editable value={person.access_note ?? ''} onSave={v => onSave({ access_note: v })} boxed multiline
                placeholder="Через кого, на каком языке, где живёт" />
            </Field>
          </div>

          {/* Переписка этого человека */}
          {person.tg_chat_id == null ? (
            <ChatPicker
              chats={chats}
              query={chatQuery}
              suggestFor={person.name}
              onQuery={setChatQuery}
              onPick={id => onSave({ tg_chat_id: id })}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] text-[var(--ax-fg-faint)]">Переписка привязана</span>
                <div className="flex items-center gap-1">
                  <a href="/admin/perepiska" className="inline-flex items-center gap-1 text-[12px] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] no-underline">
                    Открыть чат <ExternalLink size={11} />
                  </a>
                  <button
                    type="button"
                    onClick={() => onSave({ tg_chat_id: null })}
                    aria-label="Отвязать переписку"
                    title="Отвязать переписку"
                    className="w-7 h-7 inline-flex items-center justify-center rounded-md text-[var(--ax-fg-faint)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
                  >
                    <Unlink size={13} />
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--ax-border-soft)] bg-[var(--ax-panel)] p-3">
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
                    {person.ai_summary ? 'Обновить' : 'Разобрать'}
                  </button>
                </div>
                {person.ai_summary ? (
                  <>
                    <p className="text-[13px] text-[var(--ax-fg)] leading-relaxed max-w-[68ch]">{person.ai_summary}</p>
                    {person.ai_next_step && <p className="mt-2 text-[12.5px] text-[#4FC08D] leading-snug">→ {person.ai_next_step}</p>}
                    <p className="mt-2 text-[11.5px] text-[var(--ax-fg-faint)]">Разобрано {when(person.ai_updated_at)}</p>
                  </>
                ) : (
                  <p className="text-[12.5px] text-[var(--ax-fg-muted)] leading-relaxed max-w-[68ch]">
                    Переписку ещё не разбирали. Нажмите «Разобрать» — ИИ прочитает диалог и напишет,
                    о чём договаривались и что делать дальше.
                  </p>
                )}
              </div>

              {tail && tail.meetings.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {tail.meetings.map(m => (
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

              <div className="rounded-lg border border-[var(--ax-border-soft)] max-h-[240px] overflow-y-auto p-3 flex flex-col gap-2">
                {(!tail || tail.messages.length === 0) && (
                  <p className="text-[12.5px] text-[var(--ax-fg-muted)]">Сообщений пока нет</p>
                )}
                {tail?.messages.map(m => (
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

          <button
            type="button"
            onClick={onRemove}
            className="self-start inline-flex items-center gap-1.5 h-8 px-3 -ml-3 rounded-lg text-[12.5px] text-[var(--ax-error-fg)] hover:bg-[var(--ax-error-bg)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
          >
            <Trash2 size={13} />
            Убрать человека
          </button>
        </div>
      )}
    </div>
  )
}

function AddPerson({ onAdd }: { onAdd: (name: string, role: PersonRole) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<PersonRole>('founder')

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12.5px] border border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
      >
        <Plus size={13} />
        Человек
      </button>
    )
  }
  const submit = async () => {
    const n = name.trim()
    if (!n) { setOpen(false); return }
    setName(''); setOpen(false)
    await onAdd(n, role)
  }
  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') { setName(''); setOpen(false) }
        }}
        placeholder="Имя"
        className="w-[128px] h-8 px-2.5 rounded-lg text-[12.5px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] placeholder:text-[var(--ax-fg-faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
      />
      <select
        value={role}
        onChange={e => setRole(e.target.value as PersonRole)}
        aria-label="Кто это"
        className="h-8 px-2 rounded-lg text-[12.5px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
      >
        {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
      <button
        type="button"
        onClick={submit}
        aria-label="Добавить"
        className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg bg-[#1F8B5F] hover:bg-[#197551] text-white transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// Выбор карточки, которую влить в текущую. Списком в 200+ названий
// пользоваться нельзя, поэтому сначала поиск.
function MergePicker({
  partners, onPick, onCancel,
}: {
  partners: Array<{ id: string; name: string }>
  onPick: (id: string, name: string) => void
  onCancel: () => void
}) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const list = needle ? partners.filter(p => p.name.toLowerCase().includes(needle)).slice(0, 20) : []
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--ax-border-soft)] p-3">
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[var(--ax-fg-soft)]">Какую карточку влить сюда?</span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Отменить"
          className="ml-auto w-7 h-7 inline-flex items-center justify-center rounded-md text-[var(--ax-fg-faint)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
        >
          <X size={13} />
        </button>
      </div>
      <input
        autoFocus
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Название второй карточки"
        className="w-full h-9 px-3 rounded-lg text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] placeholder:text-[var(--ax-fg-faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
      />
      {needle && list.length === 0 && (
        <p className="text-[12.5px] text-[var(--ax-fg-muted)]">Такой карточки нет</p>
      )}
      {list.length > 0 && (
        <ul className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
          {list.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p.id, p.name)}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Поиск чата для привязки. Сверху — догадки по имени человека.
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
                {c.taken_by && <div className="text-[11.5px] text-[var(--ax-fg-faint)] mt-0.5">уже привязана к «{c.taken_by}»</div>}
                {/* Чат агента — не запрет, а предупреждение: тот же человек
                    может быть и агентом, но чаще это просто не тот чат. */}
                {!c.taken_by && c.is_agent && (
                  <div className="text-[11.5px] text-[var(--ax-fg-faint)] mt-0.5">это карточка агента «{c.is_agent}»</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
          aria-label="Открыть ссылку"
          className="ml-auto shrink-0 text-[var(--ax-fg-faint)] hover:text-[var(--ax-fg)]"
        >
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}
