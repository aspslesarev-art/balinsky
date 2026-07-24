'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Check, TriangleAlert, Lock } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import type { AuditItem } from '@/lib/legal-audit'

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

function Group({ tone, title, items }: { tone: 'ok' | 'warn'; title: string; items: AuditItem[] }) {
  const Icon = tone === 'ok' ? Check : TriangleAlert
  const wrap = tone === 'ok' ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'
  const iconCls = tone === 'ok' ? 'text-emerald-600' : 'text-amber-600'
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${wrap}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={18} className={iconCls} />
        <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#111827]">{title}</h3>
      </div>
      <div>{items.map((it, i) => <Row key={i} item={it} tone={tone} />)}</div>
    </div>
  )
}

function GatedQuestions({
  lang, slug, count, title, developerName, developerSlug,
}: {
  lang: Lang; slug: string; count: number; title: string
  developerName?: string | null; developerSlug?: string | null
}) {
  const c = pickCopy(COPY, lang)
  const [items, setItems] = useState<AuditItem[] | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')

  const fetchItems = useCallback(async () => {
    try {
      const r = await fetch(`/api/complex/${encodeURIComponent(slug)}/legal?lang=${lang}`, { credentials: 'same-origin' })
      if (!r.ok) return
      const j = (await r.json()) as { items?: AuditItem[] }
      if (j.items && j.items.length > 0) setItems(j.items)
    } catch {
      /* leave locked */
    }
  }, [slug, lang])

  // Returning visitor who already left a lead: reveal without the form.
  useEffect(() => {
    try {
      if (localStorage.getItem('bx_lead') === '1') void fetchItems()
    } catch {
      /* ignore */
    }
  }, [fetchItems])

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
      await fetchItems()
    } catch {
      setStatus('error')
    }
  }, [name, phone, website, slug, developerName, developerSlug, fetchItems])

  if (items) return <Group tone="warn" title={title} items={items} />

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
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

export function LegalAudit({
  lang, slug, okItems, questionsCount, developerName, developerSlug,
}: {
  lang: Lang
  slug: string
  okItems: AuditItem[]
  questionsCount: number
  developerName?: string | null
  developerSlug?: string | null
}) {
  const c = pickCopy(COPY, lang)
  if (okItems.length === 0 && questionsCount === 0) return null
  return (
    <section className="mb-10" id="legal">
      <h2 className="text-[19px] sm:text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-1">{c.title}</h2>
      <p className="text-[13.5px] sm:text-[14px] text-[var(--color-text-soft)] mb-4">{c.subtitle}</p>
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {okItems.length > 0 && <Group tone="ok" title={c.okTitle} items={okItems} />}
        {questionsCount > 0 && (
          <GatedQuestions
            lang={lang} slug={slug} count={questionsCount} title={c.qTitle}
            developerName={developerName} developerSlug={developerSlug}
          />
        )}
      </div>
    </section>
  )
}
