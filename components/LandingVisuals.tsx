// Small, on-brand mini-illustrations for the landing sections. Pure CSS/SVG,
// no image assets, bilingual — they SHOW what each capability looks like
// (a chat, a listing, a request, a yield chart, a map, doc badges, a developer
// profile, site footage, the you→marketplace→developer flow). Each fills an
// `absolute inset-0` parent the consumer sizes/frames.

import { Mic, ArrowUp, Play, MapPin, Footprints, Check, Building2, ShieldCheck, ArrowRight } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

const L = {
  ru: {
    chatAsk: 'Что ищете? Подберу за минуту.',
    listingTitle: 'Вилла 2BR · Чангу',
    requestSent: 'Заявка отправлена',
    managerJoin: 'Менеджер подключится для Zoom-презентации',
    yieldLabel: 'у соседей',
    thisOne: 'этот объект',
    nearby: 'рядом',
    walk: '6 мин',
    beach: 'пляж',
    verified: 'проверено',
    devStat: '12 проектов · 8 сдано',
    siteVideo: 'Видео со стройки',
    you: 'Вы',
    market: 'Маркетплейс',
    marketSub: 'данные и проверка',
    developer: 'Застройщик',
  },
  en: {
    chatAsk: "What are you after? I'll match it.",
    listingTitle: 'Villa 2BR · Canggu',
    requestSent: 'Request sent',
    managerJoin: 'A manager will join for a Zoom presentation',
    yieldLabel: 'nearby',
    thisOne: 'this one',
    nearby: 'nearby',
    walk: '6 min',
    beach: 'beach',
    verified: 'verified',
    devStat: '12 projects · 8 delivered',
    siteVideo: 'Site video',
    you: 'You',
    market: 'Marketplace',
    marketSub: 'data & checks',
    developer: 'Developer',
  },
} as const

const WAVE = [4, 7, 10, 6, 11, 5, 8, 12, 6, 9, 7, 5]

// ===== How-it-works step visuals ===================================

export function StepChat({ lang }: { lang: Lang }) {
  const t = L[lang]
  return (
    <div className="absolute inset-0 p-4 flex flex-col justify-center gap-2">
      <div className="self-start max-w-[82%] rounded-xl rounded-bl-sm bg-white border border-[var(--color-border)] px-3 py-1.5 text-[11.5px] leading-snug text-[#111827]">
        {t.chatAsk}
      </div>
      <div className="self-end max-w-[72%] rounded-xl rounded-br-sm bg-[var(--color-primary)] text-white px-2.5 py-1.5 flex items-center gap-1.5">
        <Play size={9} fill="currentColor" strokeWidth={0} />
        <span className="flex items-end gap-[2px] h-3.5">
          {WAVE.map((h, i) => <span key={i} className="w-[2px] rounded-full bg-white/85" style={{ height: `${h}px` }} />)}
        </span>
        <span className="text-[9px] text-white/85">0:12</span>
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <div className="flex-1 h-6 rounded-full border border-[var(--color-border)] bg-white" />
        <span className="w-6 h-6 rounded-full bg-black/5 inline-flex items-center justify-center text-[#111827]"><Mic size={11} /></span>
        <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] inline-flex items-center justify-center text-white"><ArrowUp size={11} strokeWidth={2.4} /></span>
      </div>
    </div>
  )
}

export function StepStudy({ lang }: { lang: Lang }) {
  const t = L[lang]
  return (
    <div className="absolute inset-0 p-4 flex items-center">
      <div className="w-full rounded-xl bg-white border border-[var(--color-border)] overflow-hidden">
        <div className="relative h-[58px] bg-gradient-to-br from-[#cfe3d6] to-[#eef5f0]">
          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/65 text-white text-[10px] font-semibold">$285k</span>
        </div>
        <div className="p-2.5">
          <div className="text-[12px] font-medium text-[#0E1A14] truncate">{t.listingTitle}</div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] text-[10px] font-semibold">10.4%</span>
            <span className="px-1.5 py-0.5 rounded bg-[var(--color-search-bg)] text-[#4B5563] text-[10px]">PBG</span>
            <span className="px-1.5 py-0.5 rounded bg-[var(--color-search-bg)] text-[#4B5563] text-[10px]">SLF</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function StepRequest({ lang }: { lang: Lang }) {
  const t = L[lang]
  return (
    <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center gap-1.5">
      <div className="w-10 h-10 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center">
        <Check size={20} strokeWidth={2.4} className="text-[var(--color-primary-pressed)]" />
      </div>
      <div className="text-[12.5px] font-medium text-[#0E1A14]">{t.requestSent}</div>
      <div className="text-[10.5px] leading-snug text-[var(--color-text-muted)] max-w-[180px]">{t.managerJoin}</div>
    </div>
  )
}

// ===== Per-property analytics visuals ==============================

export function VizYield({ lang }: { lang: Lang }) {
  const t = L[lang]
  const bars = [42, 55, 50, 68, 74, 88]
  return (
    <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[20px] font-semibold text-[var(--color-primary-pressed)] tabular-nums leading-none">9–11%</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">{t.yieldLabel}</span>
      </div>
      <div className="flex items-end gap-1.5 h-[48px]">
        {bars.map((h, i) => (
          <span key={i} className="flex-1 rounded-t-sm bg-[var(--color-primary)]" style={{ height: `${h}%`, opacity: 0.4 + i * 0.1 }} />
        ))}
      </div>
    </div>
  )
}

export function VizCompetitors({ lang }: { lang: Lang }) {
  const t = L[lang]
  const rows = [
    { l: t.thisOne, w: 84, accent: true },
    { l: t.nearby, w: 62, accent: false },
    { l: t.nearby, w: 71, accent: false },
  ]
  return (
    <div className="absolute inset-0 p-3.5 flex flex-col justify-center gap-2.5">
      {rows.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] w-[58px] shrink-0 truncate" style={{ color: b.accent ? 'var(--color-primary-pressed)' : '#6B7570', fontWeight: b.accent ? 600 : 400 }}>{b.l}</span>
          <span className="flex-1 h-2.5 rounded-full bg-[var(--color-border)] overflow-hidden">
            <span className="block h-full rounded-full" style={{ width: `${b.w}%`, background: b.accent ? 'var(--color-primary)' : '#C2D0C7' }} />
          </span>
        </div>
      ))}
    </div>
  )
}

export function VizNearby({ lang }: { lang: Lang }) {
  const t = L[lang]
  return (
    <div className="absolute inset-0 bg-[#E8F0EA]">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* a route line */}
      <div className="absolute left-[22%] top-[60%] w-[44%] h-[2px] bg-[var(--color-primary)]/50 rotate-[-18deg] rounded-full" />
      <span className="absolute left-[20%] top-[58%] -translate-x-1/2 -translate-y-1/2 text-[var(--color-primary)]"><MapPin size={20} fill="currentColor" strokeWidth={0} /></span>
      <span className="absolute left-[64%] top-[34%] -translate-x-1/2 -translate-y-1/2 text-[#0E1A14]/70"><MapPin size={15} fill="currentColor" strokeWidth={0} /></span>
      <span className="absolute left-[78%] top-[68%] -translate-x-1/2 -translate-y-1/2 text-[#0E1A14]/70"><MapPin size={15} fill="currentColor" strokeWidth={0} /></span>
      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-medium text-[#0E1A14] shadow-sm">
        <Footprints size={11} className="text-[var(--color-primary)]" /> {t.walk} → {t.beach}
      </span>
    </div>
  )
}

export function VizDocs({ lang }: { lang: Lang }) {
  const t = L[lang]
  return (
    <div className="absolute inset-0 p-3 flex flex-col justify-center gap-1.5">
      {['PBG', 'SLF', 'Leasehold'].map(d => (
        <div key={d} className="flex items-center gap-2 rounded-lg bg-white border border-[var(--color-border)] px-2.5 py-1.5">
          <span className="w-4 h-4 rounded-full bg-[var(--color-primary)] inline-flex items-center justify-center shrink-0"><Check size={11} strokeWidth={3} className="text-white" /></span>
          <span className="text-[11.5px] font-medium text-[#0E1A14]">{d}</span>
          <span className="ml-auto text-[9.5px] text-[var(--color-primary-pressed)] uppercase tracking-wide">{t.verified}</span>
        </div>
      ))}
    </div>
  )
}

export function VizDeveloper({ lang }: { lang: Lang }) {
  const t = L[lang]
  return (
    <div className="absolute inset-0 p-3.5 flex flex-col justify-center gap-3">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-full bg-[var(--color-primary-soft)] inline-flex items-center justify-center text-[var(--color-primary-pressed)] shrink-0"><Building2 size={17} /></span>
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-[#0E1A14]">Maison Bali</div>
          <div className="text-[10px] text-[var(--color-text-muted)]">{t.devStat}</div>
        </div>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => <span key={i} className="flex-1 h-7 rounded-md bg-gradient-to-br from-[#dde9e1] to-[#eef5f0]" />)}
      </div>
    </div>
  )
}

export function VizFootage({ lang }: { lang: Lang }) {
  const t = L[lang]
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#1b3a2c] to-[#0E1A14] flex items-center justify-center">
      <span className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm inline-flex items-center justify-center ring-1 ring-white/30">
        <Play size={18} fill="currentColor" strokeWidth={0} className="text-white ml-0.5" />
      </span>
      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-white/90">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A5A]" /> {t.siteVideo}
      </span>
    </div>
  )
}

// ===== Safety flow: you → marketplace → developer ==================

function FlowNode({ icon, title, sub, accent }: { icon: React.ReactNode; title: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`flex-1 min-w-0 rounded-xl border px-3 py-2.5 text-center ${accent ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'bg-white/80 border-[var(--color-border)] text-[#0E1A14]'}`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-[12px] font-medium leading-tight">{title}</div>
      {sub && <div className={`text-[10px] mt-0.5 leading-tight ${accent ? 'text-white/85' : 'text-[var(--color-text-muted)]'}`}>{sub}</div>}
    </div>
  )
}

export function SafetyFlow({ lang }: { lang: Lang }) {
  const t = L[lang]
  return (
    <div className="flex items-center gap-1.5">
      <FlowNode icon={<span className="inline-block w-4 h-4 rounded-full bg-[var(--color-primary-pressed)]" />} title={t.you} />
      <ArrowRight size={16} className="shrink-0 text-[var(--color-primary)]" />
      <FlowNode icon={<ShieldCheck size={16} />} title={t.market} sub={t.marketSub} accent />
      <ArrowRight size={16} className="shrink-0 text-[var(--color-primary)]" />
      <FlowNode icon={<Building2 size={16} className="text-[var(--color-primary-pressed)]" />} title={t.developer} />
    </div>
  )
}
