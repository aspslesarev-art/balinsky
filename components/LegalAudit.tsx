'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Check, TriangleAlert, Lock, Scale } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { LEGAL_OK_FIELD, LEGAL_QUESTIONS_FIELD, LEGAL_BALANCE_NOTES_FIELD, type AuditItem } from '@/lib/legal-audit'

// Admin on-page editing: data-edit-* attrs make the whole block a click-to-edit
// target (components/InlineEditor). Editing the field as one textarea (one item
// per line) rather than per-row keeps this simple and covers add/remove/reorder.
type EditAttrs = Record<string, string>
function editAttrs(id: string | undefined, editable: boolean | undefined, field: string, label: string): EditAttrs {
  return editable && id
    ? { 'data-edit-collection': 'complexes', 'data-edit-id': id, 'data-edit-field': field, 'data-edit-kind': 'longtext', 'data-edit-label': label }
    : {}
}

// Legal due-diligence on the complex page. Two blocks: "что в порядке" (public,
// server-rendered, indexable) and "вопросы / что запросить" (lead-gated — the
// red flags never ship in the public HTML; the visitor leaves a contact and the
// items are fetched from /api/complex/[slug]/legal, which the /api/contact lead
// cookie authorizes). Each row shows a headline and expands to its detail.

const COPY = {
  ru: {
    title: 'Юридическая проверка', subtitle: 'Что мы проверили по документам объекта',
    okTitle: 'Что в порядке', qTitle: 'Вопросы и что запросить',
    lockLead: (n: number) => `Мы нашли пункты, по которым стоит задать вопросы (${n}). Оставьте контакт — пришлём разбор.`,
    namePh: 'Имя', phonePh: 'Телефон / WhatsApp', submit: 'Показать вопросы', sending: 'Отправляем…', err: 'Заполните имя и телефон',
  },
  en: {
    title: 'Legal check', subtitle: 'What we verified against the project documents',
    okTitle: "What's in order", qTitle: 'Questions & what to request',
    lockLead: (n: number) => `We found points worth questioning (${n}). Leave your contact and we'll send the details.`,
    namePh: 'Name', phonePh: 'Phone / WhatsApp', submit: 'Show the questions', sending: 'Sending…', err: 'Enter your name and phone',
  },
  id: {
    title: 'Pemeriksaan hukum', subtitle: 'Apa yang kami verifikasi dari dokumen proyek',
    okTitle: 'Yang sudah beres', qTitle: 'Pertanyaan & yang perlu diminta',
    lockLead: (n: number) => `Kami menemukan poin yang perlu ditanyakan (${n}). Tinggalkan kontak Anda, kami kirimkan rinciannya.`,
    namePh: 'Nama', phonePh: 'Telepon / WhatsApp', submit: 'Tampilkan pertanyaan', sending: 'Mengirim…', err: 'Isi nama dan telepon',
  },
  fr: {
    title: 'Vérification juridique', subtitle: 'Ce que nous avons vérifié dans les documents du projet',
    okTitle: 'Ce qui est en ordre', qTitle: 'Questions & documents à demander',
    lockLead: (n: number) => `Nous avons trouvé des points à éclaircir (${n}). Laissez vos coordonnées, nous vous envoyons le détail.`,
    namePh: 'Nom', phonePh: 'Téléphone / WhatsApp', submit: 'Voir les questions', sending: 'Envoi…', err: 'Indiquez votre nom et téléphone',
  },
  de: {
    title: 'Rechtsprüfung', subtitle: 'Was wir anhand der Projektunterlagen geprüft haben',
    okTitle: 'Was in Ordnung ist', qTitle: 'Fragen & was anzufordern ist',
    lockLead: (n: number) => `Wir haben Punkte gefunden, die zu klären sind (${n}). Hinterlassen Sie Ihre Kontaktdaten, wir senden die Details.`,
    namePh: 'Name', phonePh: 'Telefon / WhatsApp', submit: 'Fragen anzeigen', sending: 'Senden…', err: 'Name und Telefon angeben',
  },
  zh: {
    title: '法律核查', subtitle: '我们根据项目文件核实的内容',
    okTitle: '一切正常', qTitle: '疑问及需索取的文件',
    lockLead: (n: number) => `我们发现了需要核实的疑点（${n}）。留下联系方式，我们把详情发给您。`,
    namePh: '姓名', phonePh: '电话 / WhatsApp', submit: '查看疑问', sending: '发送中…', err: '请填写姓名和电话',
  },
  nl: {
    title: 'Juridische controle', subtitle: 'Wat we hebben gecontroleerd aan de projectdocumenten',
    okTitle: 'Wat in orde is', qTitle: 'Vragen & wat op te vragen',
    lockLead: (n: number) => `We vonden punten om na te vragen (${n}). Laat uw contact achter, we sturen de details.`,
    namePh: 'Naam', phonePh: 'Telefoon / WhatsApp', submit: 'Toon de vragen', sending: 'Versturen…', err: 'Vul naam en telefoon in',
  },
  ban: {
    title: 'Pamariksan hukum', subtitle: 'Sane sampun kacumawisang saking dokumen proyek',
    okTitle: 'Sane sampun beres', qTitle: 'Patakon & sane patut kapinta',
    lockLead: (n: number) => `Wenten poin sane patut katakenang (${n}). Tinggalang kontak Ida, jagi kakirim rincianne.`,
    namePh: 'Wasta', phonePh: 'Telepon / WhatsApp', submit: 'Edengang patakon', sending: 'Ngirim…', err: 'Isinin wasta lan telepon',
  },
  pl: {
    title: 'Weryfikacja prawna', subtitle: 'Co sprawdziliśmy w dokumentach projektu',
    okTitle: 'Co jest w porządku', qTitle: 'Pytania i co poprosić',
    lockLead: (n: number) => `Znaleźliśmy kwestie do wyjaśnienia (${n}). Zostaw kontakt, prześlemy szczegóły.`,
    namePh: 'Imię', phonePh: 'Telefon / WhatsApp', submit: 'Pokaż pytania', sending: 'Wysyłanie…', err: 'Podaj imię i telefon',
  },
  uk: {
    title: 'Юридична перевірка', subtitle: 'Що ми перевірили за документами обʼєкта',
    okTitle: 'Що в порядку', qTitle: 'Питання та що запросити',
    lockLead: (n: number) => `Ми знайшли пункти, які варто уточнити (${n}). Залиште контакт — надішлемо розбір.`,
    namePh: 'Імʼя', phonePh: 'Телефон / WhatsApp', submit: 'Показати питання', sending: 'Надсилаємо…', err: 'Вкажіть імʼя та телефон',
  },
} as const

// Копия для шкалы баланса живёт отдельно от COPY: так добавление блока не
// переписывает десять существующих языковых секций.
const BAL_COPY = {
  ru: {
    balTitle: 'Баланс договора', balBuyer: 'покупатель', balDev: 'застройщик',
    balHint: 'Как договор распределяет права и риски между сторонами. 50 / 50 — паритет.',
    balMore: (n: number) => `Разбор по пунктам (${n}) — после заявки`,
  },
  en: {
    balTitle: 'Contract balance', balBuyer: 'buyer', balDev: 'developer',
    balHint: 'How the contract splits rights and risks between the parties. 50 / 50 is parity.',
    balMore: (n: number) => `Clause-by-clause breakdown (${n}) — after your request`,
  },
  id: {
    balTitle: 'Keseimbangan kontrak', balBuyer: 'pembeli', balDev: 'pengembang',
    balHint: 'Bagaimana kontrak membagi hak dan risiko antara para pihak. 50 / 50 berarti seimbang.',
    balMore: (n: number) => `Rincian per pasal (${n}) — setelah permintaan Anda`,
  },
  fr: {
    balTitle: 'Équilibre du contrat', balBuyer: 'acheteur', balDev: 'promoteur',
    balHint: 'Comment le contrat répartit droits et risques entre les parties. 50 / 50 = parité.',
    balMore: (n: number) => `Analyse clause par clause (${n}) — après votre demande`,
  },
  de: {
    balTitle: 'Vertragsbalance', balBuyer: 'Käufer', balDev: 'Bauträger',
    balHint: 'Wie der Vertrag Rechte und Risiken zwischen den Parteien verteilt. 50 / 50 = Gleichgewicht.',
    balMore: (n: number) => `Analyse nach Klauseln (${n}) — nach Ihrer Anfrage`,
  },
  zh: {
    balTitle: '合同平衡度', balBuyer: '买方', balDev: '开发商',
    balHint: '合同如何在双方之间分配权利与风险。50 / 50 为对等。',
    balMore: (n: number) => `逐条解析（${n}）— 提交咨询后可见`,
  },
  nl: {
    balTitle: 'Contractbalans', balBuyer: 'koper', balDev: 'ontwikkelaar',
    balHint: 'Hoe het contract rechten en risico’s verdeelt tussen de partijen. 50 / 50 is pariteit.',
    balMore: (n: number) => `Analyse per clausule (${n}) — na uw aanvraag`,
  },
  ban: {
    balTitle: 'Kasaimbangan kontrak', balBuyer: 'sane numbas', balDev: 'pangembang',
    balHint: 'Sapunapi kontrak ngedum hak lan resiko ring kalih pihak. 50 / 50 kasaimbangan.',
    balMore: (n: number) => `Rincian saking pasal (${n}) — sasampun permintaan Ida`,
  },
  pl: {
    balTitle: 'Balans umowy', balBuyer: 'kupujący', balDev: 'deweloper',
    balHint: 'Jak umowa dzieli prawa i ryzyka między strony. 50 / 50 to parytet.',
    balMore: (n: number) => `Analiza punkt po punkcie (${n}) — po zgłoszeniu`,
  },
  uk: {
    balTitle: 'Баланс договору', balBuyer: 'покупець', balDev: 'забудовник',
    balHint: 'Як договір розподіляє права та ризики між сторонами. 50 / 50 — паритет.',
    balMore: (n: number) => `Розбір за пунктами (${n}) — після заявки`,
  },
} as const

const INPUT_CLS =
  'flex-1 min-w-0 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-[14px] text-[#111827] outline-none focus:border-[var(--color-primary)]'

function Row({ item, tone }: { item: AuditItem; tone: 'ok' | 'warn' }) {
  const [open, setOpen] = useState(false)
  const hasBody = item.body.length > 0
  const Icon = tone === 'ok' ? Check : TriangleAlert
  const iconCls = tone === 'ok' ? 'text-emerald-600' : 'text-amber-600'
  return (
    <div className="border-b border-black/5 last:border-0">
      <button
        type="button"
        onClick={() => hasBody && setOpen(o => !o)}
        aria-expanded={hasBody ? open : undefined}
        className={`w-full flex items-start gap-2.5 py-3 text-left ${hasBody ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <Icon size={16} className={`${iconCls} shrink-0 mt-0.5`} />
        <span className="flex-1 text-[14px] sm:text-[15px] font-medium text-[#111827] leading-snug">{item.headline}</span>
        {hasBody && (
          <ChevronDown size={16} className={`shrink-0 mt-0.5 text-[var(--color-text-soft)] transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {hasBody && open && (
        <div className="pl-[26px] pb-3.5 -mt-0.5 text-[13.5px] sm:text-[14px] text-[var(--color-text)] leading-relaxed">{item.body}</div>
      )}
    </div>
  )
}

function Group({ tone, title, items, edit }: { tone: 'ok' | 'warn'; title: string; items: AuditItem[]; edit?: EditAttrs }) {
  const Icon = tone === 'ok' ? Check : TriangleAlert
  const wrap = tone === 'ok' ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'
  const iconCls = tone === 'ok' ? 'text-emerald-600' : 'text-amber-600'
  return (
    <div {...edit} className={`rounded-2xl border p-4 sm:p-5 ${wrap}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={18} className={iconCls} />
        <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#111827]">{title}</h3>
      </div>
      <div>{items.map((it, i) => <Row key={i} item={it} tone={tone} />)}</div>
    </div>
  )
}

// Один лид открывает и красные флаги, и разбор баланса, поэтому запрос к
// гейтед-роуту живёт здесь, а не внутри блока вопросов.
type GatedLegal = { items: AuditItem[]; balance: AuditItem[] }

function useGatedLegal(slug: string, lang: Lang) {
  const [data, setData] = useState<GatedLegal | null>(null)

  const reveal = useCallback(async () => {
    try {
      const r = await fetch(`/api/complex/${encodeURIComponent(slug)}/legal?lang=${lang}`, { credentials: 'same-origin' })
      if (!r.ok) return
      const j = (await r.json()) as Partial<GatedLegal>
      const items = j.items ?? []
      const balance = j.balance ?? []
      if (items.length > 0 || balance.length > 0) setData({ items, balance })
    } catch {
      /* leave locked */
    }
  }, [slug, lang])

  // Returning visitor who already left a lead: reveal without the form.
  useEffect(() => {
    try {
      if (localStorage.getItem('bx_lead') === '1') void reveal()
    } catch {
      /* ignore */
    }
  }, [reveal])

  return { data, reveal }
}

function GatedQuestions({
  lang, slug, count, title, items, reveal, developerName, developerSlug, edit,
}: {
  lang: Lang; slug: string; count: number; title: string
  items: AuditItem[] | null; reveal: () => Promise<void>
  developerName?: string | null; developerSlug?: string | null; edit?: EditAttrs
}) {
  const c = pickCopy(COPY, lang)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')

  const submit = useCallback(async () => {
    if (!name.trim() || !phone.trim()) { setStatus('error'); return }
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: name.trim(), phone: phone.trim(), website,
          listingKind: 'complex', listingSlug: slug,
          developerName: developerName ?? undefined, developerSlug: developerSlug ?? undefined,
          page: 'legal-audit',
          pagePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      })
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean }
      if (!res.ok || !j.ok) { setStatus('error'); return }
      try { localStorage.setItem('bx_lead', '1') } catch { /* ignore */ }
      await reveal()
    } catch {
      setStatus('error')
    }
  }, [name, phone, website, slug, developerName, developerSlug, reveal])

  if (items && items.length > 0) return <Group tone="warn" title={title} items={items} edit={edit} />

  return (
    <div {...edit} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <TriangleAlert size={18} className="text-amber-600" />
        <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#111827]">{title}</h3>
      </div>
      <p className="text-[13.5px] sm:text-[14px] text-[var(--color-text)] mb-3 leading-relaxed">{c.lockLead(count)}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder={c.namePh} className={INPUT_CLS} autoComplete="name" />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={c.phonePh} className={INPUT_CLS} inputMode="tel" autoComplete="tel" />
        <input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button
          type="button"
          onClick={submit}
          disabled={status === 'sending'}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60 cursor-pointer whitespace-nowrap"
        >
          {status === 'sending' ? c.sending : (<><Lock size={15} /> {c.submit}</>)}
        </button>
      </div>
      {status === 'error' && <p className="text-[12.5px] text-red-600 mt-2">{c.err}</p>}
    </div>
  )
}

// Шкала «насколько договор клиенто-ориентирован». Само число и итог одним
// предложением — публично (это и есть крючок, и он индексируется), разбор по
// осям — под тем же лидом, что и красные флаги.
function ContractBalance({
  lang, buyer, summary, notes, notesCount, edit,
}: {
  lang: Lang; buyer: number; summary: AuditItem | null
  notes: AuditItem[] | null; notesCount: number; edit?: EditAttrs
}) {
  const c = pickCopy(BAL_COPY, lang)
  const developer = 100 - buyer
  // 45+ — рыночный паритет, 30–45 — умеренный перекос, ниже 30 — сильный.
  const tone = buyer >= 45 ? 'emerald' : buyer >= 30 ? 'amber' : 'rose'
  const wrapCls = tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/50'
    : tone === 'amber' ? 'border-amber-200 bg-amber-50/50'
    : 'border-rose-200 bg-rose-50/50'
  const barCls = tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
  const numCls = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-rose-700'
  const hidden = notes ? notes.slice(1) : []

  return (
    <div {...edit} className={`rounded-2xl border p-4 sm:p-5 mb-4 ${wrapCls}`}>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <Scale size={18} className={numCls} />
          <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#111827]">{c.balTitle}</h3>
        </div>
        <div className={`text-[18px] sm:text-[22px] font-semibold tabular-nums ${numCls}`}>
          {buyer} / {developer}
        </div>
      </div>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/10" aria-hidden>
        <div className={barCls} style={{ width: `${buyer}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[12.5px] text-[var(--color-text-soft)]">
        <span>{c.balBuyer} {buyer}</span>
        <span>{c.balDev} {developer}</span>
      </div>

      <p className="mt-2.5 text-[12.5px] text-[var(--color-text-soft)] leading-relaxed">{c.balHint}</p>
      {summary && (
        <p className="mt-2 text-[13.5px] sm:text-[14px] text-[#111827] leading-relaxed">
          {[summary.headline, summary.body].filter(Boolean).join('. ')}
        </p>
      )}

      {hidden.length > 0 ? (
        <div className="mt-2.5 border-t border-black/5">
          {hidden.map((it, i) => <Row key={i} item={it} tone="ok" />)}
        </div>
      ) : notesCount > 1 && (
        <p className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-soft)]">
          <Lock size={14} /> {c.balMore(notesCount - 1)}
        </p>
      )}
    </div>
  )
}

export function LegalAudit({
  lang, slug, okItems, questionsCount, balanceBuyer, balanceSummary, balanceNotesCount,
  developerName, developerSlug, editId, editable,
}: {
  lang: Lang
  slug: string
  okItems: AuditItem[]
  questionsCount: number
  // Баланс договора: число 0–100 в пользу покупателя, публичный итог одной
  // строкой и сколько всего строк обоснования (остальные — под лидом).
  balanceBuyer?: number | null
  balanceSummary?: AuditItem | null
  balanceNotesCount?: number
  developerName?: string | null
  developerSlug?: string | null
  // Admin on-page editing (RU only — RU is the source of truth).
  editId?: string
  editable?: boolean
}) {
  const c = pickCopy(COPY, lang)
  const { data, reveal } = useGatedLegal(slug, lang)
  // When editing, always render both blocks so an admin can add the first item
  // to an empty field; otherwise hide empty blocks from visitors.
  const hasBalance = typeof balanceBuyer === 'number'
  if (!editable && okItems.length === 0 && questionsCount === 0 && !hasBalance) return null
  const showOk = okItems.length > 0 || editable
  const showQuestions = questionsCount > 0 || editable
  return (
    <section className="mb-10" id="legal">
      <h2 className="text-[19px] sm:text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-1">{c.title}</h2>
      <p className="text-[13.5px] sm:text-[14px] text-[var(--color-text-soft)] mb-4">{c.subtitle}</p>
      {hasBalance && (
        <ContractBalance
          lang={lang} buyer={balanceBuyer} summary={balanceSummary ?? null}
          notes={data?.balance ?? null} notesCount={balanceNotesCount ?? 0}
          edit={editAttrs(editId, editable, LEGAL_BALANCE_NOTES_FIELD, 'Юр-проверка: баланс обоснование')}
        />
      )}
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {showOk && <Group tone="ok" title={c.okTitle} items={okItems} edit={editAttrs(editId, editable, LEGAL_OK_FIELD, 'Юр-проверка: в порядке')} />}
        {showQuestions && (
          <GatedQuestions
            lang={lang} slug={slug} count={questionsCount} title={c.qTitle}
            items={data?.items ?? null} reveal={reveal}
            developerName={developerName} developerSlug={developerSlug}
            edit={editAttrs(editId, editable, LEGAL_QUESTIONS_FIELD, 'Юр-проверка: вопросы (под лидом)')}
          />
        )}
      </div>
    </section>
  )
}
