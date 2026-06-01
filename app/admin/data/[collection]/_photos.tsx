'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Trash2, ArrowUp, ArrowDown, Loader2, Plus, Download } from 'lucide-react'
import type { CollectionConfig } from '@/lib/admin/adapters/types'

// Photo manager for a record: upload, remove, reorder, add-by-URL. Every
// change persists the full ordered list via PUT .../[id]/photos.
export function PhotoManager({ cfg, id }: { cfg: CollectionConfig; id: string }) {
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const base = `/api/admin/data/${cfg.key}/${encodeURIComponent(id)}/photos`

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(base)
      .then(r => r.json())
      .then(j => { if (alive && Array.isArray(j.photos)) setPhotos(j.photos) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.key, id])

  const persist = async (next: string[]) => {
    const prev = photos
    setPhotos(next); setBusy(true); setError(null)
    try {
      const res = await fetch(base, {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ photos: next }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'save_failed'); setPhotos(prev) }
    } catch {
      setError('network_error'); setPhotos(prev)
    } finally {
      setBusy(false)
    }
  }

  const onUpload = async (file: File) => {
    setBusy(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/admin/data/${cfg.key}/upload`, { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok || !j.url) { setError(j.error ?? 'upload_failed'); setBusy(false); return }
      await persist([...photos, j.url])
    } catch {
      setError('upload_error'); setBusy(false)
    }
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= photos.length) return
    const next = [...photos]
    ;[next[i], next[j]] = [next[j], next[i]]
    persist(next)
  }

  const remove = (i: number) => persist(photos.filter((_, k) => k !== i))

  const addUrl = () => {
    const u = urlInput.trim()
    if (!u) return
    setUrlInput('')
    persist([...photos, u])
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] font-medium text-[var(--ax-fg-soft)]">Фото ({photos.length})</span>
        {busy && <Loader2 size={13} className="animate-spin text-[var(--ax-fg-faint)]" />}
      </div>

      {loading ? (
        <div className="text-[12px] text-[var(--ax-fg-faint)]">Загрузка…</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={url + i} className="relative group rounded-lg overflow-hidden border border-[var(--ax-border)] aspect-square bg-[var(--ax-panel)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-end justify-between p-1 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || busy} className="p-1 rounded bg-black/50 text-white disabled:opacity-30"><ArrowUp size={12} /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1 || busy} className="p-1 rounded bg-black/50 text-white disabled:opacity-30"><ArrowDown size={12} /></button>
                </div>
                <div className="flex gap-1">
                  <a href={url} download target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1 rounded bg-black/50 text-white" title="Скачать"><Download size={12} /></a>
                  <button type="button" onClick={() => remove(i)} disabled={busy} className="p-1 rounded bg-red-600/80 text-white"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border border-[var(--ax-border)] hover:bg-[var(--ax-hover)] disabled:opacity-40">
          <Upload size={13} /> Загрузить
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
        <div className="flex-1 flex items-center gap-1">
          <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="URL картинки…"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }}
            className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] outline-none focus:border-[var(--color-primary)]" />
          <button type="button" onClick={addUrl} disabled={busy} className="p-1.5 rounded-lg border border-[var(--ax-border)] hover:bg-[var(--ax-hover)]"><Plus size={14} /></button>
        </div>
      </div>

      {error && <div className="mt-2 text-[12px] text-red-500">{error}</div>}
    </div>
  )
}
