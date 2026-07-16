// Small, on-brand mini-illustrations for the landing sections. Pure CSS/SVG,
// no image assets, bilingual — they SHOW what each capability looks like
// (a chat, a listing, a request, a yield chart, a map, doc badges, a developer
// profile, site footage, the you→marketplace→developer flow). Each fills an
// `absolute inset-0` parent the consumer sizes/frames.

import { Mic, ArrowUp, Play, MapPin, Footprints, Check, Building2, ShieldCheck, ArrowRight } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

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
    perYear: 'годовых',
    neighbours: 'по 8 соседям',
    night: '/ночь',
    sqmTitle: 'Цена за м²',
    heat: 'Карта туризма',
    docsTitle: 'Документы объекта',
    received: 'получено',
    lease: '25 лет',
    devName: 'Maison Bali',
    footageCaption: 'Снято на месте',
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
    perYear: 'a year',
    neighbours: 'across 8 neighbours',
    night: '/night',
    sqmTitle: 'Price per m²',
    heat: 'Tourism map',
    docsTitle: 'Property documents',
    received: 'issued',
    lease: '25 yrs',
    devName: 'Maison Bali',
    footageCaption: 'Filmed on site',
  },
  id: {
    chatAsk: 'Apa yang Anda cari? Saya carikan.',
    listingTitle: 'Vila 2BR · Canggu',
    requestSent: 'Permintaan terkirim',
    managerJoin: 'Manajer akan bergabung untuk presentasi Zoom',
    yieldLabel: 'di sekitar',
    thisOne: 'yang ini',
    nearby: 'di sekitar',
    walk: '6 mnt',
    beach: 'pantai',
    verified: 'terverifikasi',
    devStat: '12 proyek · 8 selesai',
    siteVideo: 'Video lokasi',
    you: 'Anda',
    market: 'Marketplace',
    marketSub: 'data & pemeriksaan',
    developer: 'Pengembang',
    perYear: 'per tahun',
    neighbours: 'dari 8 properti sekitar',
    night: '/malam',
    sqmTitle: 'Harga per m²',
    heat: 'Peta pariwisata',
    docsTitle: 'Dokumen properti',
    received: 'diterbitkan',
    lease: '25 thn',
    devName: 'Maison Bali',
    footageCaption: 'Direkam di lokasi',
  },
  fr: {
    chatAsk: 'Que cherchez-vous ? Je trouve.',
    listingTitle: 'Villa 2BR · Canggu',
    requestSent: 'Demande envoyée',
    managerJoin: 'Un conseiller vous rejoindra pour une présentation Zoom',
    yieldLabel: 'à proximité',
    thisOne: 'ce bien',
    nearby: 'à proximité',
    walk: '6 min',
    beach: 'plage',
    verified: 'vérifié',
    devStat: '12 projets · 8 livrés',
    siteVideo: 'Vidéo du site',
    you: 'Vous',
    market: 'Marketplace',
    marketSub: 'données & vérifications',
    developer: 'Promoteur',
    perYear: 'par an',
    neighbours: 'sur 8 biens voisins',
    night: '/nuit',
    sqmTitle: 'Prix au m²',
    heat: 'Carte du tourisme',
    docsTitle: 'Documents du bien',
    received: 'délivré',
    lease: '25 ans',
    devName: 'Maison Bali',
    footageCaption: 'Filmé sur place',
  },
} as const

const WAVE = [4, 7, 10, 6, 11, 5, 8, 12, 6, 9, 7, 5]

// ===== How-it-works step visuals ===================================

export function StepChat({ lang }: { lang: Lang }) {
  const t = pickCopy(L, lang)
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
  const t = pickCopy(L, lang)
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
  const t = pickCopy(L, lang)
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
// These read like tiny screenshots of the real detail-page widgets, with
// recognizable source cues (Booking / Airbnb), so a visitor recognizes the
// feature when they open an actual listing. The brand chips are plain
// wordmarks in brand colours (a factual data-source reference) — swap in
// official logo assets later if desired.

function BookingChip() {
  return <span className="shrink-0 text-[8.5px] font-bold text-white bg-[#003B95] px-1.5 py-[3px] rounded leading-none">Booking.com</span>
}
function AirbnbChip() {
  return <span className="shrink-0 text-[8.5px] font-bold text-white bg-[#FF5A5F] px-1.5 py-[3px] rounded leading-none">airbnb</span>
}

function RentRow({ brand, price, occ, night }: { brand: 'booking' | 'airbnb'; price: string; occ: string; night: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white border border-[var(--color-border)] px-2 py-1.5">
      {brand === 'booking' ? <BookingChip /> : <AirbnbChip />}
      <span className="text-[11px] font-medium text-[#0E1A14]">{price}<span className="text-[var(--color-text-muted)] font-normal">{night}</span></span>
      <span className="ml-auto text-[10.5px] font-semibold text-[var(--color-primary-pressed)]">{occ}</span>
    </div>
  )
}

export function VizYield({ lang }: { lang: Lang }) {
  const t = pickCopy(L, lang)
  return (
    <div className="absolute inset-0 p-3 flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[19px] font-semibold text-[var(--color-primary-pressed)] tabular-nums leading-none">≈10.4%</span>
          <span className="text-[10px] text-[var(--color-text-muted)]">{t.perYear}</span>
        </div>
        <span className="text-[9.5px] text-[var(--color-text-muted)]">{t.neighbours}</span>
      </div>
      <div className="grid gap-1.5">
        <RentRow brand="booking" price="$180" occ="78%" night={t.night} />
        <RentRow brand="airbnb" price="$165" occ="71%" night={t.night} />
      </div>
    </div>
  )
}

export function VizCompetitors({ lang }: { lang: Lang }) {
  const t = pickCopy(L, lang)
  const rows = [
    { l: t.thisOne, v: '$2 850', w: 70, accent: true },
    { l: t.nearby, v: '$3 100', w: 86, accent: false },
    { l: t.nearby, v: '$2 640', w: 62, accent: false },
  ]
  return (
    <div className="absolute inset-0 p-3 flex flex-col justify-center gap-2">
      <div className="text-[9.5px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{t.sqmTitle}</div>
      {rows.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] w-[50px] shrink-0 truncate" style={{ color: b.accent ? 'var(--color-primary-pressed)' : '#6B7570', fontWeight: b.accent ? 600 : 400 }}>{b.l}</span>
          <span className="flex-1 h-3 rounded-full bg-[var(--color-border)] overflow-hidden">
            <span className="block h-full rounded-full" style={{ width: `${b.w}%`, background: b.accent ? 'var(--color-primary)' : '#C2D0C7' }} />
          </span>
          <span className="text-[10px] tabular-nums w-[40px] text-right" style={{ color: b.accent ? '#0E1A14' : '#6B7570', fontWeight: b.accent ? 600 : 400 }}>{b.v}</span>
        </div>
      ))}
    </div>
  )
}

export function VizNearby({ lang }: { lang: Lang }) {
  const t = pickCopy(L, lang)
  return (
    <div className="absolute inset-0 bg-[#E8F0EA]">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* heatmap blobs hint */}
      <div className="absolute left-[58%] top-[28%] w-16 h-16 rounded-full bg-[#FF5A5A]/25 blur-md" />
      <div className="absolute left-[70%] top-[60%] w-12 h-12 rounded-full bg-[#FFB020]/30 blur-md" />
      {/* a route line */}
      <div className="absolute left-[22%] top-[60%] w-[44%] h-[2px] bg-[var(--color-primary)]/50 rotate-[-18deg] rounded-full" />
      <span className="absolute left-[20%] top-[58%] -translate-x-1/2 -translate-y-1/2 text-[var(--color-primary)]"><MapPin size={20} fill="currentColor" strokeWidth={0} /></span>
      <span className="absolute left-[64%] top-[34%] -translate-x-1/2 -translate-y-1/2 text-[#0E1A14]/70"><MapPin size={15} fill="currentColor" strokeWidth={0} /></span>
      <span className="absolute left-[78%] top-[68%] -translate-x-1/2 -translate-y-1/2 text-[#0E1A14]/70"><MapPin size={15} fill="currentColor" strokeWidth={0} /></span>
      <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 text-[9.5px] font-medium text-[#0E1A14] shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A5A]" /> {t.heat}
      </span>
      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-medium text-[#0E1A14] shadow-sm">
        <Footprints size={11} className="text-[var(--color-primary)]" /> {t.walk} → {t.beach}
      </span>
    </div>
  )
}

export function VizDocs({ lang }: { lang: Lang }) {
  const t = pickCopy(L, lang)
  const rows: [string, string][] = [['PBG', t.received], ['SLF', t.received], ['Leasehold', t.lease]]
  return (
    <div className="absolute inset-0 p-3 flex flex-col gap-1.5">
      <div className="text-[9.5px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{t.docsTitle}</div>
      {rows.map(([d, s]) => (
        <div key={d} className="flex items-center gap-2 rounded-lg bg-white border border-[var(--color-border)] px-2.5 py-1.5">
          <span className="w-4 h-4 rounded-full bg-[var(--color-primary)] inline-flex items-center justify-center shrink-0"><Check size={11} strokeWidth={3} className="text-white" /></span>
          <span className="text-[11.5px] font-medium text-[#0E1A14]">{d}</span>
          <span className="ml-auto text-[10px] text-[var(--color-primary-pressed)]">{s}</span>
        </div>
      ))}
    </div>
  )
}

export function VizDeveloper({ lang }: { lang: Lang }) {
  const t = pickCopy(L, lang)
  return (
    <div className="absolute inset-0 p-3.5 flex flex-col justify-center gap-2.5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white inline-flex items-center justify-center font-semibold text-[14px] shrink-0">M</span>
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-[#0E1A14] flex items-center gap-1">
            {t.devName} <ShieldCheck size={12} className="text-[var(--color-primary)]" />
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)]">{t.devStat}</div>
        </div>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => <span key={i} className="flex-1 h-8 rounded-md bg-gradient-to-br from-[#dde9e1] to-[#eef5f0]" />)}
      </div>
    </div>
  )
}

export function VizFootage({ lang }: { lang: Lang }) {
  const t = pickCopy(L, lang)
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#1b3a2c] to-[#0E1A14] flex items-center justify-center">
      <span className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm inline-flex items-center justify-center ring-1 ring-white/30">
        <Play size={18} fill="currentColor" strokeWidth={0} className="text-white ml-0.5" />
      </span>
      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/45 text-white text-[9px] font-medium tabular-nums">2:14</span>
      <span className="absolute bottom-2.5 left-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-white/90">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A5A]" /> {t.footageCaption}
      </span>
      <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20"><span className="block h-full w-[38%] bg-[#FF5A5A]" /></span>
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
  const t = pickCopy(L, lang)
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
