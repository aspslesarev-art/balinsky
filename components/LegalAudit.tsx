'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Check, TriangleAlert, Scale, Minus } from 'lucide-react'
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
// server-rendered, indexable) and "вопросы / что запросить" (open to everyone,
// but the red flags never ship in the page HTML — the browser fetches them from
// /api/complex/[slug]/legal, so crawlers don't index them). Each row shows a
// headline and expands to its detail.

const COPY = {
  ru: {
    title: 'Юридическая проверка', subtitle: 'Что мы проверили по документам объекта',
    okTitle: 'Что в порядке', qTitle: 'Вопросы и что запросить',
  },
  en: {
    title: 'Legal check', subtitle: 'What we verified against the project documents',
    okTitle: "What's in order", qTitle: 'Questions & what to request',
  },
  id: {
    title: 'Pemeriksaan hukum', subtitle: 'Apa yang kami verifikasi dari dokumen proyek',
    okTitle: 'Yang sudah beres', qTitle: 'Pertanyaan & yang perlu diminta',
  },
  fr: {
    title: 'Vérification juridique', subtitle: 'Ce que nous avons vérifié dans les documents du projet',
    okTitle: 'Ce qui est en ordre', qTitle: 'Questions & documents à demander',
  },
  de: {
    title: 'Rechtsprüfung', subtitle: 'Was wir anhand der Projektunterlagen geprüft haben',
    okTitle: 'Was in Ordnung ist', qTitle: 'Fragen & was anzufordern ist',
  },
  zh: {
    title: '法律核查', subtitle: '我们根据项目文件核实的内容',
    okTitle: '一切正常', qTitle: '疑问及需索取的文件',
  },
  nl: {
    title: 'Juridische controle', subtitle: 'Wat we hebben gecontroleerd aan de projectdocumenten',
    okTitle: 'Wat in orde is', qTitle: 'Vragen & wat op te vragen',
  },
  ban: {
    title: 'Pamariksan hukum', subtitle: 'Sane sampun kacumawisang saking dokumen proyek',
    okTitle: 'Sane sampun beres', qTitle: 'Patakon & sane patut kapinta',
  },
  pl: {
    title: 'Weryfikacja prawna', subtitle: 'Co sprawdziliśmy w dokumentach projektu',
    okTitle: 'Co jest w porządku', qTitle: 'Pytania i co poprosić',
  },
  uk: {
    title: 'Юридична перевірка', subtitle: 'Що ми перевірили за документами обʼєкта',
    okTitle: 'Що в порядку', qTitle: 'Питання та що запросити',
  },
} as const

// Копия для шкалы баланса живёт отдельно от COPY: так добавление блока не
// переписывает десять существующих языковых секций.
const BAL_COPY = {
  ru: {
    balTitle: 'Баланс договора', balBuyer: 'покупатель', balDev: 'застройщик',
    balHint: 'Как договор распределяет права и риски между сторонами. 50 / 50 — паритет.',
   
    balOpen: (n: number) => `В чём перекосы — ${n} пунктов`, balClose: 'Свернуть',
  },
  en: {
    balTitle: 'Contract balance', balBuyer: 'buyer', balDev: 'developer',
    balHint: 'How the contract splits rights and risks between the parties. 50 / 50 is parity.',
   
    balOpen: (n: number) => `Where the imbalance sits — ${n} points`, balClose: 'Collapse',
  },
  id: {
    balTitle: 'Keseimbangan kontrak', balBuyer: 'pembeli', balDev: 'pengembang',
    balHint: 'Bagaimana kontrak membagi hak dan risiko antara para pihak. 50 / 50 berarti seimbang.',
   
    balOpen: (n: number) => `Di mana ketimpangannya — ${n} poin`, balClose: 'Tutup',
  },
  fr: {
    balTitle: 'Équilibre du contrat', balBuyer: 'acheteur', balDev: 'promoteur',
    balHint: 'Comment le contrat répartit droits et risques entre les parties. 50 / 50 = parité.',
   
    balOpen: (n: number) => `Où se situe le déséquilibre — ${n} points`, balClose: 'Réduire',
  },
  de: {
    balTitle: 'Vertragsbalance', balBuyer: 'Käufer', balDev: 'Bauträger',
    balHint: 'Wie der Vertrag Rechte und Risiken zwischen den Parteien verteilt. 50 / 50 = Gleichgewicht.',
   
    balOpen: (n: number) => `Wo das Ungleichgewicht liegt — ${n} Punkte`, balClose: 'Einklappen',
  },
  zh: {
    balTitle: '合同平衡度', balBuyer: '买方', balDev: '开发商',
    balHint: '合同如何在双方之间分配权利与风险。50 / 50 为对等。',
   
    balOpen: (n: number) => `失衡出在哪里 — ${n} 项`, balClose: '收起',
  },
  nl: {
    balTitle: 'Contractbalans', balBuyer: 'koper', balDev: 'ontwikkelaar',
    balHint: 'Hoe het contract rechten en risico’s verdeelt tussen de partijen. 50 / 50 is pariteit.',
   
    balOpen: (n: number) => `Waar de scheefheid zit — ${n} punten`, balClose: 'Inklappen',
  },
  ban: {
    balTitle: 'Kasaimbangan kontrak', balBuyer: 'sane numbas', balDev: 'pangembang',
    balHint: 'Sapunapi kontrak ngedum hak lan resiko ring kalih pihak. 50 / 50 kasaimbangan.',
   
    balOpen: (n: number) => `Ring dija ketimpanganne — ${n} poin`, balClose: 'Tutup',
  },
  pl: {
    balTitle: 'Balans umowy', balBuyer: 'kupujący', balDev: 'deweloper',
    balHint: 'Jak umowa dzieli prawa i ryzyka między strony. 50 / 50 to parytet.',
   
    balOpen: (n: number) => `Gdzie jest przechył — ${n} punktów`, balClose: 'Zwiń',
  },
  uk: {
    balTitle: 'Баланс договору', balBuyer: 'покупець', balDev: 'забудовник',
    balHint: 'Як договір розподіляє права та ризики між сторонами. 50 / 50 — паритет.',
   
    balOpen: (n: number) => `У чому перекоси — ${n} пунктів`, balClose: 'Згорнути',
  },
} as const

// neutral — для осей баланса: это не «хорошо» и не «плохо», а разбор.
function Row({ item, tone }: { item: AuditItem; tone: 'ok' | 'warn' | 'neutral' }) {
  const [open, setOpen] = useState(false)
  const hasBody = item.body.length > 0
  const Icon = tone === 'ok' ? Check : tone === 'warn' ? TriangleAlert : Minus
  const iconCls = tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-[var(--color-text-soft)]'
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

// Красные флаги и разбор баланса отдаёт отдельный роут: в HTML страницы их
// нет, чтобы поисковик не индексировал претензии к застройщику. Открыты всем —
// браузер забирает их сразу после загрузки страницы.
type LegalDetails = { items: AuditItem[]; balance: AuditItem[] }

function useLegalDetails(slug: string, lang: Lang) {
  const [data, setData] = useState<LegalDetails | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/complex/${encodeURIComponent(slug)}/legal?lang=${lang}`)
      .then(r => (r.ok ? r.json() : null))
      .then((j: Partial<LegalDetails> | null) => {
        if (!cancelled && j) setData({ items: j.items ?? [], balance: j.balance ?? [] })
      })
      .catch(() => { /* блок останется с заголовком без пунктов */ })
    return () => { cancelled = true }
  }, [slug, lang])
  return data
}

// Шкала «насколько договор клиенто-ориентирован». Само число и итог одним
// предложением — публично (это и есть крючок, и он индексируется), разбор по
// осям — с того же роута, что и красные флаги.
function ContractBalance({
  lang, buyer, summary, notes, edit,
}: {
  lang: Lang; buyer: number; summary: AuditItem | null
  notes: AuditItem[] | null; edit?: EditAttrs
}) {
  const c = pickCopy(BAL_COPY, lang)
  const [open, setOpen] = useState(false)
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
    <div {...edit} className={`rounded-2xl border px-4 py-3 sm:px-5 sm:py-3.5 mb-4 ${wrapCls}`}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Scale size={16} className={numCls} />
          <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#111827]">{c.balTitle}</h3>
        </div>
        <div className={`text-[17px] sm:text-[19px] font-semibold tabular-nums ${numCls}`}>
          {buyer} / {developer}
        </div>
      </div>

      <div className="flex h-2 w-full overflow-hidden rounded-full bg-black/10" aria-hidden>
        <div className={barCls} style={{ width: `${buyer}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[12px] text-[var(--color-text-soft)]">
        <span>{c.balBuyer} {buyer}</span>
        <span>{c.balDev} {developer}</span>
      </div>

      {summary && (
        <p className="mt-2 text-[13.5px] sm:text-[14px] text-[#111827] leading-snug">
          {[summary.headline, summary.body].filter(Boolean).join('. ')}
        </p>
      )}

      {hidden.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-soft)] hover:text-[#111827] cursor-pointer"
          >
            {open ? c.balClose : c.balOpen(hidden.length)}
            <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="mt-1 border-t border-black/5">
              <p className="pt-2.5 text-[12.5px] text-[var(--color-text-soft)] leading-relaxed">{c.balHint}</p>
              {hidden.map((it, i) => <Row key={i} item={it} tone="neutral" />)}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

export function LegalAudit({
  lang, slug, okItems, questionsCount, balanceBuyer, balanceSummary, editId, editable,
}: {
  lang: Lang
  slug: string
  okItems: AuditItem[]
  questionsCount: number
  // Баланс договора: число 0–100 в пользу покупателя, публичный итог одной
  // строкой и сколько всего строк обоснования (сами строки приходят с роута).
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
  const data = useLegalDetails(slug, lang)
  // When editing, always render both blocks so an admin can add the first item
  // to an empty field; otherwise hide empty blocks from visitors.
  const hasBalance = typeof balanceBuyer === 'number'
  // Счётчик со страницы бывает нулём при непустых вопросах (данные ЖК на
  // странице кешируются отдельно), поэтому верим и тому, что пришло с роута.
  const hasQuestions = questionsCount > 0 || (data?.items.length ?? 0) > 0
  if (!editable && okItems.length === 0 && !hasQuestions && !hasBalance) return null
  const showOk = okItems.length > 0 || editable
  const showQuestions = hasQuestions || editable
  return (
    <section className="mb-10" id="legal">
      <h2 className="text-[19px] sm:text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-1">{c.title}</h2>
      <p className="text-[13.5px] sm:text-[14px] text-[var(--color-text-soft)] mb-4">{c.subtitle}</p>
      {hasBalance && (
        <ContractBalance
          lang={lang} buyer={balanceBuyer} summary={balanceSummary ?? null}
          notes={data?.balance ?? null}
          edit={editAttrs(editId, editable, LEGAL_BALANCE_NOTES_FIELD, 'Юр-проверка: баланс обоснование')}
        />
      )}
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {showOk && <Group tone="ok" title={c.okTitle} items={okItems} edit={editAttrs(editId, editable, LEGAL_OK_FIELD, 'Юр-проверка: в порядке')} />}
        {showQuestions && (
          <Group
            tone="warn" title={c.qTitle} items={data?.items ?? []}
            edit={editAttrs(editId, editable, LEGAL_QUESTIONS_FIELD, 'Юр-проверка: вопросы')}
          />
        )}
      </div>
    </section>
  )
}
