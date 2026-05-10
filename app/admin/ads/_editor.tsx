'use client'

// Inline CRUD for ad banners. List view shows each banner with its
// stats; clicking opens an inline form for edit; "+ Новый баннер"
// adds a fresh empty row at the top.
//
// Design choice: edit + create both happen inline (no modal) so the
// admin can scan the list, tweak a headline + Save, scan again — no
// context-switch.

import { useRef, useState } from 'react'
import { Plus, Trash2, Save, Loader2, AlertTriangle, X, Upload, Check, Image as ImageIcon } from 'lucide-react'

type Banner = {
  id: string
  imageUrl: string
  linkUrl: string
  alt: string
  headline: string
  sponsor?: string | null
  startsAt?: string | null
  endsAt?: string | null
  active: boolean
  impressionLimit?: number | null
  sortOrder?: number
}
type StatRow = {
  banner_id: string
  impressions_count: number
  clicks_count: number
  last_impression_at: string | null
  last_click_at: string | null
  auto_disabled: boolean
}

export function BannersEditor({
  initialBanners, stats,
}: {
  initialBanners: Banner[]
  stats: Record<string, StatRow>
}) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners)
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createNew() {
    setError(null)
    setCreating(true)
    try {
      // Start with a placeholder image — admin can swap immediately.
      const r = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://via.placeholder.com/600x400.png?text=Upload+banner',
          linkUrl: 'https://balinsky.info',
          alt: '',
          headline: 'Новый баннер',
          active: false,
        }),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? `http_${r.status}`)
      const { banner } = await r.json() as { banner: Banner }
      setBanners(prev => [banner, ...prev])
      setOpenId(banner.id)
    } catch (e) { setError(e instanceof Error ? e.message : 'create_failed') }
    finally { setCreating(false) }
  }

  async function patch(id: string, body: Partial<Banner>) {
    const r = await fetch(`/api/admin/ads/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error((await r.json()).error ?? `http_${r.status}`)
    setBanners(prev => prev.map(b => b.id === id ? { ...b, ...body } : b))
  }

  async function remove(id: string) {
    if (!confirm('Удалить баннер? Стат-счётчики останутся в БД.')) return
    const r = await fetch(`/api/admin/ads/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!r.ok) { setError('delete_failed'); return }
    setBanners(prev => prev.filter(b => b.id !== id))
    if (openId === id) setOpenId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={createNew}
          disabled={creating}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1F8B5F] text-white text-[13px] font-medium hover:bg-[#197551] disabled:opacity-60"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Новый баннер
        </button>
        {error && (
          <div className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ax-error-fg)]">
            <AlertTriangle size={12} /> {error}
            <button type="button" onClick={() => setError(null)} className="ml-1 opacity-60 hover:opacity-100"><X size={12} /></button>
          </div>
        )}
      </div>

      {banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--ax-border)] bg-[var(--ax-panel)] p-10 text-center text-[13px] text-[var(--ax-fg-muted)]">
          Баннеров пока нет — нажмите «Новый баннер».
        </div>
      ) : (
        <ul className="space-y-3">
          {banners.map(b => (
            <BannerRow
              key={b.id}
              banner={b}
              stat={stats[b.id]}
              expanded={openId === b.id}
              onToggle={() => setOpenId(o => o === b.id ? null : b.id)}
              onSave={body => patch(b.id, body)}
              onDelete={() => remove(b.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function BannerRow({
  banner, stat, expanded, onToggle, onSave, onDelete,
}: {
  banner: Banner
  stat: StatRow | undefined
  expanded: boolean
  onToggle: () => void
  onSave: (b: Partial<Banner>) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const status = bannerStatus(banner, stat)
  const ctr = (stat?.impressions_count ?? 0) > 0
    ? ((stat!.clicks_count / stat!.impressions_count) * 100).toFixed(2) + '%'
    : '—'
  const limitProgress = banner.impressionLimit
    ? Math.min(100, Math.round(((stat?.impressions_count ?? 0) / banner.impressionLimit) * 100))
    : null

  return (
    <li className="rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-[var(--ax-hover)]"
      >
        <div className="flex items-start gap-4">
          <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-[#F3F4F6]">
            {banner.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={banner.imageUrl} alt={banner.alt} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded ${
                status.tone === 'live'      ? 'bg-[#D1FAE5] text-[#065F46]'
                : status.tone === 'capped'  ? 'bg-[#FEE2E2] text-[#991B1B]'
                : status.tone === 'paused'  ? 'bg-[var(--ax-hover)] text-[var(--ax-fg-soft)]'
                : status.tone === 'expired' ? 'bg-[#FEF3C7] text-[#92400E]'
                : 'bg-[#DBEAFE] text-[#1E40AF]'
              }`}>{status.label}</span>
              {banner.sponsor && <span className="text-[12px] text-[var(--ax-fg-muted)]">{banner.sponsor}</span>}
            </div>
            <div className="text-[14px] font-medium leading-snug mb-1.5 text-[var(--ax-fg)]">{banner.headline}</div>
            <div className="text-[12px] text-[var(--ax-fg-muted)] truncate">{banner.linkUrl}</div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
              <Stat label="Показы" value={(stat?.impressions_count ?? 0).toLocaleString('ru-RU')} />
              <Stat label="Клики" value={(stat?.clicks_count ?? 0).toLocaleString('ru-RU')} />
              <Stat label="CTR" value={ctr} />
              <Stat label="Последний показ" value={fmtDateTime(stat?.last_impression_at ?? null)} />
            </div>
            {limitProgress != null && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-[var(--ax-fg-muted)] mb-1">
                  <span>Лимит показов</span>
                  <span>{(stat?.impressions_count ?? 0).toLocaleString('ru-RU')} / {banner.impressionLimit!.toLocaleString('ru-RU')}</span>
                </div>
                <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div className={`h-full ${limitProgress >= 100 ? 'bg-[#B91C1C]' : 'bg-[#1F8B5F]'}`} style={{ width: limitProgress + '%' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </button>
      {expanded && (
        <BannerForm
          // re-mount on id change so the form's local useState picks
          // up the freshly-selected banner instead of the previous one
          key={banner.id}
          banner={banner}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </li>
  )
}

function BannerForm({
  banner, onSave, onDelete,
}: {
  banner: Banner
  onSave: (b: Partial<Banner>) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [imageUrl, setImageUrl] = useState(banner.imageUrl)
  const [linkUrl, setLinkUrl] = useState(banner.linkUrl)
  const [alt, setAlt] = useState(banner.alt)
  const [headline, setHeadline] = useState(banner.headline)
  const [sponsor, setSponsor] = useState(banner.sponsor ?? '')
  const [startsAt, setStartsAt] = useState(banner.startsAt?.slice(0, 16) ?? '')
  const [endsAt, setEndsAt] = useState(banner.endsAt?.slice(0, 16) ?? '')
  const [active, setActive] = useState(banner.active)
  const [impressionLimit, setImpressionLimit] = useState(banner.impressionLimit ? String(banner.impressionLimit) : '')
  const [sortOrder, setSortOrder] = useState(String(banner.sortOrder ?? 0))
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setUploading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/admin/ads/upload', { method: 'POST', body: fd })
      if (!r.ok) throw new Error((await r.json()).error ?? `http_${r.status}`)
      const j = await r.json() as { url: string }
      setImageUrl(j.url)
    } catch (e) { setError(e instanceof Error ? e.message : 'upload_failed') }
    finally { setUploading(false) }
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      await onSave({
        imageUrl,
        linkUrl,
        alt,
        headline,
        sponsor: sponsor.trim() || null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        active,
        impressionLimit: impressionLimit.trim() ? Number(impressionLimit) : null,
        sortOrder: Number(sortOrder) || 0,
      })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } catch (e) { setError(e instanceof Error ? e.message : 'save_failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="border-t border-[var(--ax-border-soft)] p-4 bg-[var(--ax-bg)] space-y-3">
      {error && (
        <div className="text-[12px] text-[var(--ax-error-fg)] inline-flex items-center gap-1.5">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      <div>
        <Label>Картинка</Label>
        <div className="flex items-start gap-3">
          <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-[#F3F4F6] shrink-0 border border-[var(--ax-input-border)]">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={alt} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--ax-fg-muted)]"><ImageIcon size={20} /></div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ax-hover)] text-[var(--ax-fg)] text-[12px]"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? 'Загружаю…' : 'Загрузить файл'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async e => {
                const f = e.target.files?.[0]
                if (f) await uploadFile(f)
                e.target.value = ''
              }}
            />
            <input
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="или вставь URL картинки"
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[12px] font-mono text-[var(--ax-fg)]"
            />
          </div>
        </div>
      </div>

      <Field label="Заголовок (видно посетителю)" value={headline} onChange={setHeadline} placeholder="Например: «Новые виллы в Чангу от $185k»" />
      <Field label="Ссылка (куда ведёт клик)" value={linkUrl} onChange={setLinkUrl} placeholder="https://…" />
      <Field label="Alt текст (для SEO + доступности)" value={alt} onChange={setAlt} placeholder="например: вилла в Чангу, бассейн" />
      <Field label="Спонсор (опционально, маленьким шрифтом «от …»)" value={sponsor} onChange={setSponsor} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DateField label="Начало показа" value={startsAt} onChange={setStartsAt} />
        <DateField label="Окончание показа" value={endsAt} onChange={setEndsAt} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Лимит показов (пусто = без лимита)" value={impressionLimit} onChange={setImpressionLimit} type="number" />
        <Field label="Порядок (меньше = выше в ротации)" value={sortOrder} onChange={setSortOrder} type="number" />
      </div>

      <label className="inline-flex items-center gap-2 text-[13px] text-[var(--ax-fg)]">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
        Активен (показывать на сайте)
      </label>

      <div className="flex items-center justify-between pt-1 border-t border-[var(--ax-border-soft)]">
        <button onClick={onDelete} className="text-[12px] text-[var(--ax-error-fg)] inline-flex items-center gap-1 hover:underline">
          <Trash2 size={12} /> Удалить
        </button>
        <div className="inline-flex items-center gap-2">
          {savedFlash && (
            <span className="inline-flex items-center gap-1 text-[12px] text-[#1F8B5F]">
              <Check size={12} /> Сохранено
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F8B5F] text-white text-[13px] font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--ax-border)] bg-[var(--ax-bg)] p-2">
      <div className="text-[10px] uppercase tracking-wide text-[var(--ax-fg-muted)]">{label}</div>
      <div className="text-[14px] font-semibold text-[var(--ax-fg)]">{value}</div>
    </div>
  )
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11.5px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-1">{children}</div>
}
function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[13px] text-[var(--ax-fg)]"
      />
    </div>
  )
}
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="datetime-local"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[13px] text-[var(--ax-fg)]"
      />
    </div>
  )
}

function bannerStatus(b: Banner, s: StatRow | undefined): { label: string; tone: 'live' | 'paused' | 'capped' | 'scheduled' | 'expired' } {
  if (s?.auto_disabled) return { label: 'Лимит исчерпан', tone: 'capped' }
  if (!b.active) return { label: 'Отключён', tone: 'paused' }
  const now = Date.now()
  if (b.startsAt && Date.parse(b.startsAt) > now) return { label: 'Запланирован', tone: 'scheduled' }
  if (b.endsAt && Date.parse(b.endsAt) < now) return { label: 'Истёк', tone: 'expired' }
  return { label: 'Активен', tone: 'live' }
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}
