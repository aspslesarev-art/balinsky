'use client'

// Interactive visualisation editor.
//
// Two columns:
//   - LEFT  — sidebar with the layer tree (root → child) + "add layer"
//             button at top. Selecting a layer loads it on the canvas.
//   - RIGHT — canvas: the layer's photo with an SVG overlay showing
//             existing hotspots + the in-progress polygon being drawn.
//             Toolbar above with: "Add hotspot" (enters draw mode),
//             "Save", "Delete layer", inspector panel for the
//             selected hotspot (label + target picker).
//
// Polygon drawing: click on the photo to add vertices, double-click
// to close + save. Coordinates stored as normalised 0..1 pairs.
//
// Hotspot inspector lets you set:
//   - label (optional, shown on hover)
//   - target = next layer (dropdown of this complex's layers) OR
//     unit (dropdown of villas + apartments inside the complex)

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Plus, Upload, Trash2, Save, ChevronRight, ChevronLeft, Image as ImageIcon,
  Loader2, AlertTriangle, Check, X, Maximize2, Minimize2, ZoomIn, ZoomOut, ArrowLeft,
} from 'lucide-react'

type Layer = {
  id: number
  parentLayerId: number | null
  title: string | null
  photoUrl: string
  sortOrder: number
}
type Hotspot = {
  id: number
  layerId: number
  label: string | null
  polygon: [number, number][]
  targetType: 'layer' | 'unit'
  targetLayerId: number | null
  targetUnitKind: 'villa' | 'apartment' | null
  targetUnitSlug: string | null
  availability?: 'free' | 'reserved' | 'sold' | null
}

// Per-status polygon palette, mirrors the public viewer.
// `neutral` covers hotspots where the owner hasn't set a status yet
// — keeps the canvas readable for plain layer→layer drill-downs.
const HOTSPOT_PALETTE = {
  neutral:  { fill: 'rgba(31,139,95,0.25)',  fillSelected: 'rgba(31,139,95,0.45)',  stroke: '#1F8B5F', strokeSelected: '#197551' },
  free:     { fill: 'rgba(22,163,74,0.30)',  fillSelected: 'rgba(22,163,74,0.50)',  stroke: '#16A34A', strokeSelected: '#0F7A39' },
  reserved: { fill: 'rgba(245,158,11,0.30)', fillSelected: 'rgba(245,158,11,0.55)', stroke: '#F59E0B', strokeSelected: '#B45309' },
  sold:     { fill: 'rgba(220,38,38,0.30)',  fillSelected: 'rgba(220,38,38,0.55)',  stroke: '#DC2626', strokeSelected: '#991B1B' },
} as const
type UnitOption = {
  kind: 'villa' | 'apartment'
  slug: string
  title: string
  bedrooms: number | null
  area: number | null
  priceUsd: number | null
}

type DraftHotspot = {
  layerId: number
  polygon: [number, number][]   // in-progress vertices, normalised
}

export function VisualizationEditor({
  complexId, complexSlug, complexName,
  initialLayers, initialHotspots, units,
}: {
  complexId: string
  complexSlug: string
  complexName: string
  initialLayers: Layer[]
  initialHotspots: Hotspot[]
  units: UnitOption[]
}) {
  const [layers, setLayers] = useState<Layer[]>(initialLayers)
  const [hotspots, setHotspots] = useState<Hotspot[]>(initialHotspots)
  const [activeLayerId, setActiveLayerId] = useState<number | null>(initialLayers[0]?.id ?? null)
  const [draft, setDraft] = useState<DraftHotspot | null>(null)
  const [selectedHotspotId, setSelectedHotspotId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Cursor position in normalised 0..1 — drives the live-preview
  // line from the last drawn vertex to where the pen is hovering,
  // Figma-style. null when not drawing or not hovering.
  const [cursor, setCursor] = useState<[number, number] | null>(null)
  // Fullscreen overlay — covers the whole viewport so the photo
  // gets max real-estate for accurate polygon drawing. Esc exits.
  const [fullscreen, setFullscreen] = useState(false)
  // Photo zoom — only applied in fullscreen. 1.0 = fit, up to 4×.
  // When zoomed, the canvas container scrolls so the admin can pan
  // around. Mouse wheel + ⌘/Ctrl shortcuts also adjust it.
  const [zoom, setZoom] = useState(1)
  // Drag-to-pan state for zoomed canvas (fullscreen + zoom > 1).
  const [dragging, setDragging] = useState(false)
  const dragStateRef = useRef<{ pageX: number; pageY: number; scrollLeft: number; scrollTop: number; moved: boolean } | null>(null)
  const canvasScrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Pre-uploaded complex photos (already optimised, webp, 2000px wide)
  // pulled from the complex-photos/_manifest.json. Shown in the
  // "Добавить слой" modal so the editor can pick one in one click
  // instead of finding a file on disk and uploading.
  const [complexPhotos, setComplexPhotos] = useState<string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
        const r = await fetch(`${supabase}/storage/v1/object/public/complex-photos/_manifest.json`, { cache: 'no-store' })
        if (!r.ok) return
        const j = await r.json() as Record<string, string[]>
        if (cancelled) return
        setComplexPhotos(j[complexId] ?? [])
      } catch {}
    })()
    return () => { cancelled = true }
  }, [complexId])

  const activeLayer = useMemo(() => layers.find(l => l.id === activeLayerId) ?? null, [layers, activeLayerId])
  const layerHotspots = useMemo(
    () => hotspots.filter(h => h.layerId === activeLayerId),
    [hotspots, activeLayerId],
  )
  const selectedHotspot = useMemo(
    () => hotspots.find(h => h.id === selectedHotspotId) ?? null,
    [hotspots, selectedHotspotId],
  )

  // === layer ops ==========================================================

  async function uploadPhoto(file: File): Promise<string | null> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('complexId', complexId)
    const r = await fetch('/api/admin/visualizations/upload', { method: 'POST', body: fd })
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      throw new Error(j.error ?? `http_${r.status}`)
    }
    const j = await r.json() as { url: string }
    return j.url
  }

  async function addLayer(file: File, title: string | null) {
    setSaving(true); setError(null)
    try {
      const photoUrl = await uploadPhoto(file)
      if (!photoUrl) throw new Error('upload_failed')
      await addLayerFromUrl(photoUrl, title)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown')
    } finally { setSaving(false) }
  }

  // Create a layer from an existing public URL — used by the
  // "pick from complex photos" path so we skip the re-upload step
  // (the photo is already in the complex-photos bucket).
  async function addLayerFromUrl(photoUrl: string, title: string | null) {
    setSaving(true); setError(null)
    try {
      const r = await fetch(`/api/admin/visualizations/${encodeURIComponent(complexId)}/layers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          parentLayerId: activeLayerId,
          title,
          photoUrl,
        }),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? `http_${r.status}`)
      const { layer } = await r.json() as { layer: Layer }
      setLayers(prev => [...prev, layer])
      setActiveLayerId(layer.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown')
    } finally { setSaving(false) }
  }

  async function removeLayer(id: number) {
    if (!confirm('Удалить слой со всеми зонами и дочерними слоями?')) return
    const r = await fetch(`/api/admin/visualizations/layers/${id}`, { method: 'DELETE' })
    if (!r.ok) { setError('delete_failed'); return }
    setLayers(prev => prev.filter(l => l.id !== id))
    setHotspots(prev => prev.filter(h => h.layerId !== id))
    if (activeLayerId === id) setActiveLayerId(layers.find(l => l.id !== id)?.id ?? null)
  }

  // === hotspot ops ========================================================

  function startDrawing() {
    if (activeLayerId == null) return
    setDraft({ layerId: activeLayerId, polygon: [] })
    setSelectedHotspotId(null)
  }

  function cancelDrawing() {
    setDraft(null)
  }

  async function finishDrawing() {
    if (!draft || draft.polygon.length < 3) {
      setDraft(null)
      return
    }
    setSaving(true); setError(null)
    try {
      const r = await fetch('/api/admin/visualizations/hotspots', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          layerId: draft.layerId,
          polygon: draft.polygon,
          targetType: 'unit',          // sensible default; admin sets it next
          targetLayerId: null,
          targetUnitKind: null,
          targetUnitSlug: null,
        }),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? `http_${r.status}`)
      const { hotspot } = await r.json() as { hotspot: Hotspot }
      setHotspots(prev => [...prev, hotspot])
      setSelectedHotspotId(hotspot.id)
      setDraft(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown')
    } finally { setSaving(false) }
  }

  async function patchHotspot(id: number, patch: Partial<Omit<Hotspot, 'id' | 'layerId'>>) {
    const r = await fetch(`/api/admin/visualizations/hotspots/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!r.ok) { setError('save_failed'); return }
    setHotspots(prev => prev.map(h => h.id === id ? { ...h, ...patch } : h))
  }

  async function deleteHotspot(id: number) {
    if (!confirm('Удалить эту зону?')) return
    const r = await fetch(`/api/admin/visualizations/hotspots/${id}`, { method: 'DELETE' })
    if (!r.ok) { setError('delete_failed'); return }
    setHotspots(prev => prev.filter(h => h.id !== id))
    if (selectedHotspotId === id) setSelectedHotspotId(null)
  }

  // === canvas events ======================================================

  function onCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!draft) return
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setDraft({ ...draft, polygon: [...draft.polygon, [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]] })
  }

  function onCanvasDoubleClick() {
    if (draft) finishDrawing()
  }

  function onCanvasMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!draft) return
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setCursor([x, y])
  }

  function onCanvasMouseLeave() {
    setCursor(null)
  }

  // Esc → exit fullscreen + cancel in-progress drawing.
  // ⌘/Ctrl + +/- → zoom in/out. ⌘/Ctrl + 0 → reset to 100 %.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (draft) cancelDrawing()
        else if (fullscreen) setFullscreen(false)
      }
      if (fullscreen && (e.metaKey || e.ctrlKey)) {
        if (e.key === '=' || e.key === '+') { e.preventDefault(); setZoom(z => Math.min(4, +(z + 0.25).toFixed(2))) }
        if (e.key === '-')                   { e.preventDefault(); setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2))) }
        if (e.key === '0')                   { e.preventDefault(); setZoom(1) }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [draft, fullscreen])

  // Reset zoom whenever fullscreen toggles or the active layer
  // changes — otherwise an old zoom level lingers and a smaller
  // photo lands at the wrong scale.
  useEffect(() => { setZoom(1) }, [fullscreen, activeLayerId])

  // Drag-to-pan listeners (only active while a drag is in progress).
  useEffect(() => {
    if (!dragging) return
    function onMove(e: MouseEvent) {
      const s = dragStateRef.current
      const el = canvasScrollRef.current
      if (!s || !el) return
      const dx = e.pageX - s.pageX
      const dy = e.pageY - s.pageY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) s.moved = true
      el.scrollLeft = s.scrollLeft - dx
      el.scrollTop = s.scrollTop - dy
    }
    function onUp() {
      setDragging(false)
      const s = dragStateRef.current
      // Defer clearing so the synthetic click after mouseup still
      // sees moved=true and doesn't add a polygon point.
      setTimeout(() => { if (dragStateRef.current === s) dragStateRef.current = null }, 0)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  function onCanvasMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    // Only enable drag-pan when zoomed AND not actively drawing —
    // otherwise we'd hijack pen-tool clicks for panning.
    if (!fullscreen || zoom <= 1 || draft) return
    if (e.button !== 0) return
    const el = canvasScrollRef.current
    if (!el) return
    dragStateRef.current = {
      pageX: e.pageX, pageY: e.pageY,
      scrollLeft: el.scrollLeft, scrollTop: el.scrollTop,
      moved: false,
    }
    setDragging(true)
  }

  // === render =============================================================

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[12.5px] text-[var(--ax-fg-muted)]">
          <Link href="/admin/visualizations" className="hover:underline text-[var(--ax-fg-soft)]">← Все ЖК</Link>
          <span className="mx-2 opacity-60">·</span>
          <Link href={`/ru/zhilye-kompleksy/o/${complexSlug}`} target="_blank" className="hover:underline text-[var(--ax-fg-soft)]">Открыть страницу ЖК ↗</Link>
        </div>
        {error && (
          <div className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ax-error-fg)]">
            <AlertTriangle size={12} /> {error}
            <button type="button" onClick={() => setError(null)} className="ml-1 opacity-60 hover:opacity-100"><X size={12} /></button>
          </div>
        )}
      </div>

      <div className={
        fullscreen
          ? 'fixed inset-0 z-50 bg-[var(--ax-bg)] grid grid-cols-[240px_minmax(0,1fr)_280px] gap-2 p-2'
          : 'grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)_280px] gap-4'
      }>
        {/* LEFT: layer tree */}
        <aside className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-3 space-y-2 self-start">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] font-medium">Слои ({layers.length})</div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={saving}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1F8B5F] hover:text-[#197551] disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Добавить
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async e => {
                const f = e.target.files?.[0]
                if (!f) return
                const title = prompt('Название слоя (например, «Общий план», «Корпус А», «Этаж 3»)?', '')
                await addLayer(f, title?.trim() || null)
                e.target.value = ''
                setPickerOpen(false)
              }}
            />
          </div>
          {layers.length === 0 ? (
            <div className="text-[12px] text-[var(--ax-fg-faint)] py-4 text-center">
              Загрузите первое фото — оно станет корневой панорамой ЖК.
            </div>
          ) : (
            <ul className="space-y-1">
              {layers.map(l => {
                const isActive = l.id === activeLayerId
                const childCount = layers.filter(c => c.parentLayerId === l.id).length
                const hsCount = hotspots.filter(h => h.layerId === l.id).length
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => { setActiveLayerId(l.id); setSelectedHotspotId(null); setDraft(null) }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[13px] flex items-center gap-2 ${
                        isActive ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--ax-hover)] text-[var(--ax-fg)]'
                      }`}
                    >
                      <ImageIcon size={14} className={isActive ? 'opacity-90' : 'opacity-60'} />
                      <span className="flex-1 truncate">{l.title ?? `Слой #${l.id}`}</span>
                      <span className={`text-[10.5px] ${isActive ? 'text-white/80' : 'text-[var(--ax-fg-faint)]'}`}>{hsCount}з{childCount > 0 ? ` ${childCount}↳` : ''}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* CENTER: canvas */}
        <main className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] overflow-hidden flex flex-col">
          {activeLayer ? (
            <>
              <div className="px-4 py-3 border-b border-[var(--ax-border-soft)] flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Back-to-list button — visible in BOTH normal
                      and fullscreen modes, since the breadcrumb
                      bar above the editor is hidden when fullscreen
                      covers the whole viewport. */}
                  <Link
                    href="/admin/visualizations"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--ax-hover)] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] text-[12px]"
                    title="Назад к списку всех ЖК"
                  >
                    <ArrowLeft size={12} /> Все ЖК
                  </Link>
                  <div className="text-[13.5px] font-medium text-[var(--ax-fg)] truncate">{activeLayer.title ?? `Слой #${activeLayer.id}`}</div>
                </div>
                <div className="flex items-center gap-2">
                  {draft ? (
                    <>
                      <span className="text-[11.5px] text-[var(--ax-fg-muted)]">{draft.polygon.length} точек · двойной клик чтобы закрыть</span>
                      <button onClick={finishDrawing} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1F8B5F] text-white text-[12px]">
                        <Check size={12} /> Готово
                      </button>
                      <button onClick={cancelDrawing} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--ax-hover)] text-[var(--ax-fg-soft)] text-[12px]">
                        <X size={12} /> Отмена
                      </button>
                    </>
                  ) : (
                    <button onClick={startDrawing} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1F8B5F] text-white text-[12px] font-medium">
                      <Plus size={12} /> Нарисовать зону
                    </button>
                  )}
                  <button onClick={() => removeLayer(activeLayer.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--ax-hover)] text-[var(--ax-error-fg)] text-[12px]">
                    <Trash2 size={12} /> Слой
                  </button>

                  {/* Zoom controls — fullscreen only, where they
                      actually matter. Pre-fullscreen the photo
                      already fits the column. */}
                  {fullscreen && (
                    <div className="inline-flex items-center gap-0.5 rounded-lg bg-[var(--ax-hover)] p-0.5">
                      <button
                        onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                        disabled={zoom <= 0.5}
                        title="Уменьшить (⌘−)"
                        className="px-2 py-1 rounded text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] disabled:opacity-40"
                      >
                        <ZoomOut size={12} />
                      </button>
                      <button
                        onClick={() => setZoom(1)}
                        title="100% (⌘0)"
                        className="px-2 py-1 rounded text-[11px] tabular-nums text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] min-w-[44px]"
                      >
                        {Math.round(zoom * 100)}%
                      </button>
                      <button
                        onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
                        disabled={zoom >= 4}
                        title="Увеличить (⌘+)"
                        className="px-2 py-1 rounded text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] disabled:opacity-40"
                      >
                        <ZoomIn size={12} />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setFullscreen(v => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--ax-hover)] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] text-[12px]"
                    title={fullscreen ? 'Свернуть (Esc)' : 'Полный экран'}
                  >
                    {fullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    {fullscreen ? 'Свернуть' : 'Полный экран'}
                  </button>
                </div>
              </div>
              {/* Canvas: in normal mode the photo's intrinsic aspect
                  drives section height (no centring, no grey bands).
                  In fullscreen we let the parent flex-fill the
                  viewport and the photo uses object-contain so the
                  whole image is visible regardless of aspect. */}
              {/* In fullscreen the outer container scrolls when zoom
                  > 1 so the admin can pan around. Pre-fullscreen
                  there's no scroll — photo fits inline. */}
              <div
                ref={canvasScrollRef}
                onMouseDown={onCanvasMouseDown}
                className={`relative bg-black/20 ${fullscreen ? 'flex-1 min-h-0 overflow-auto p-2' : ''} ${fullscreen && zoom > 1 && !draft ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
              >
                {/* The flex centring is on a separate inner so the
                    scroll container above still grows to fit the
                    zoomed image. inline-block wrapper sizes to
                    image (and scales with it via transform), so the
                    SVG overlay always aligns pixel-perfect. */}
                <div className={fullscreen ? 'min-h-full min-w-full flex items-center justify-center' : ''}>
                  <div
                    className={fullscreen ? 'relative inline-block' : 'relative w-full'}
                    style={fullscreen
                      ? { transform: `scale(${zoom})`, transformOrigin: 'center center', willChange: 'transform' }
                      : undefined}
                  >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeLayer.photoUrl}
                    alt={activeLayer.title ?? ''}
                    className={`block select-none ${fullscreen ? 'max-h-[calc(100vh-110px)] max-w-[calc(100vw-560px)] w-auto h-auto' : 'w-full h-auto'}`}
                    draggable={false}
                  />
                  <svg
                    viewBox="0 0 1 1"
                    preserveAspectRatio="none"
                    className={`absolute inset-0 w-full h-full ${draft ? 'cursor-crosshair' : ''}`}
                    onClick={onCanvasClick}
                    onDoubleClick={onCanvasDoubleClick}
                    onMouseMove={onCanvasMouseMove}
                    onMouseLeave={onCanvasMouseLeave}
                  >
                    {layerHotspots.map(h => {
                      const isSelected = h.id === selectedHotspotId
                      const points = h.polygon.map(([x, y]) => `${x},${y}`).join(' ')
                      // Mirror the public viewer's status palette so
                      // the editor canvas previews exactly what the
                      // visitor will see (green / yellow / red /
                      // brand-green default).
                      const palette = HOTSPOT_PALETTE[h.availability ?? 'neutral'] ?? HOTSPOT_PALETTE.neutral
                      const fill = isSelected ? palette.fillSelected : palette.fill
                      const stroke = isSelected ? palette.strokeSelected : palette.stroke
                      return (
                        <polygon
                          key={h.id}
                          points={points}
                          onClick={ev => { ev.stopPropagation(); setSelectedHotspotId(h.id); setDraft(null) }}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={isSelected ? 0.005 : 0.003}
                          vectorEffect="non-scaling-stroke"
                          className="cursor-pointer"
                        />
                      )
                    })}
                    {draft && draft.polygon.length > 0 && (
                      <>
                        {/* Solid green line through all confirmed
                            vertices — Figma-pen feel. */}
                        <polyline
                          points={draft.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
                          fill="none"
                          stroke="#1F8B5F"
                          strokeWidth={0.004}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                        {/* Dashed live-preview from the last vertex
                            to the cursor — and a closing hint back
                            to the first vertex, so the admin sees
                            the polygon shape before double-clicking. */}
                        {cursor && (
                          <>
                            <line
                              x1={draft.polygon[draft.polygon.length - 1][0]}
                              y1={draft.polygon[draft.polygon.length - 1][1]}
                              x2={cursor[0]}
                              y2={cursor[1]}
                              stroke="#1F8B5F"
                              strokeWidth={0.003}
                              strokeDasharray="0.008,0.008"
                              vectorEffect="non-scaling-stroke"
                            />
                            {draft.polygon.length >= 2 && (
                              <line
                                x1={cursor[0]}
                                y1={cursor[1]}
                                x2={draft.polygon[0][0]}
                                y2={draft.polygon[0][1]}
                                stroke="#1F8B5F"
                                strokeWidth={0.002}
                                strokeDasharray="0.004,0.012"
                                strokeOpacity={0.5}
                                vectorEffect="non-scaling-stroke"
                              />
                            )}
                          </>
                        )}
                        {draft.polygon.map(([x, y], i) => (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r={0.007}
                            fill={i === 0 ? '#FFFFFF' : '#1F8B5F'}
                            stroke="#1F8B5F"
                            strokeWidth={0.003}
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                      </>
                    )}
                  </svg>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[14px] text-[var(--ax-fg-muted)] p-8 text-center">
              Загрузите первое фото — это будет корневая панорама ЖК.
            </div>
          )}
        </main>

        {/* RIGHT: inspector */}
        <aside className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-3 space-y-3 self-start">
          {selectedHotspot ? (
            <HotspotInspector
              // key forces React to unmount + remount when the
              // selected hotspot changes, so the inspector's
              // internal useState fields (label / target / etc.)
              // re-initialise from the new hotspot's props
              // instead of showing stale data from the previous one.
              key={selectedHotspot.id}
              hotspot={selectedHotspot}
              layers={layers.filter(l => l.id !== selectedHotspot.layerId)}
              units={units}
              onPatch={patch => patchHotspot(selectedHotspot.id, patch)}
              onDelete={() => deleteHotspot(selectedHotspot.id)}
            />
          ) : (
            <div>
              <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] font-medium mb-1.5">Зоны на слое ({layerHotspots.length})</div>
              {layerHotspots.length === 0 ? (
                <div className="text-[12px] text-[var(--ax-fg-faint)] py-2">
                  Нажмите «Нарисовать зону» и кликайте по фото — каждая точка добавляет вершину полигона. Двойной клик — закрыть.
                </div>
              ) : (
                <ul className="space-y-1">
                  {layerHotspots.map(h => {
                    const target = formatTarget(h, layers, units)
                    return (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedHotspotId(h.id)}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-[12.5px] hover:bg-[var(--ax-hover)] text-[var(--ax-fg)] flex items-center gap-2"
                        >
                          <span className="flex-1 truncate">{h.label || target.summary}</span>
                          <ChevronRight size={12} className="opacity-60" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>

      {pickerOpen && (
        <LayerPickerModal
          photos={complexPhotos}
          saving={saving}
          onClose={() => setPickerOpen(false)}
          onPick={async (url) => {
            const title = prompt('Название слоя (например, «Общий план», «Корпус А», «Этаж 3»)?', '')
            await addLayerFromUrl(url, title?.trim() || null)
            setPickerOpen(false)
          }}
          onUpload={() => fileRef.current?.click()}
        />
      )}
    </div>
  )
}

function HotspotInspector({
  hotspot, layers, units, onPatch, onDelete,
}: {
  hotspot: Hotspot
  layers: Layer[]
  units: UnitOption[]
  onPatch: (p: Partial<Omit<Hotspot, 'id' | 'layerId'>>) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [label, setLabel] = useState(hotspot.label ?? '')
  const [targetType, setTargetType] = useState<'layer' | 'unit'>(hotspot.targetType)
  const [targetLayerId, setTargetLayerId] = useState<number | null>(hotspot.targetLayerId)
  const [targetUnitSlug, setTargetUnitSlug] = useState<string | null>(hotspot.targetUnitSlug)
  const [availability, setAvailability] = useState<'free' | 'reserved' | 'sold' | null>(hotspot.availability ?? null)
  const [savingNow, setSavingNow] = useState(false)

  async function save() {
    setSavingNow(true)
    const unit = units.find(u => u.slug === targetUnitSlug) ?? null
    await onPatch({
      label: label.trim() || null,
      targetType,
      targetLayerId: targetType === 'layer' ? targetLayerId : null,
      targetUnitSlug: targetType === 'unit' ? targetUnitSlug : null,
      targetUnitKind: targetType === 'unit' ? (unit?.kind ?? null) : null,
      availability,
    })
    setSavingNow(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] font-medium">Зона #{hotspot.id}</div>
        <button onClick={onDelete} className="text-[11px] text-[var(--ax-error-fg)] hover:underline inline-flex items-center gap-1">
          <Trash2 size={10} /> Удалить
        </button>
      </div>

      <div>
        <div className="text-[11.5px] text-[var(--ax-fg-muted)] mb-1">Название (видно при наведении)</div>
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="например, Корпус А"
          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[13px] text-[var(--ax-fg)]"
        />
      </div>

      <div>
        <div className="text-[11.5px] text-[var(--ax-fg-muted)] mb-1">Куда ведёт</div>
        <div className="flex gap-1 mb-2">
          <button
            type="button"
            onClick={() => setTargetType('layer')}
            className={`flex-1 px-2 py-1.5 rounded-lg text-[12px] ${targetType === 'layer' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--ax-hover)] text-[var(--ax-fg-soft)]'}`}
          >
            Слой
          </button>
          <button
            type="button"
            onClick={() => setTargetType('unit')}
            className={`flex-1 px-2 py-1.5 rounded-lg text-[12px] ${targetType === 'unit' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--ax-hover)] text-[var(--ax-fg-soft)]'}`}
          >
            Юнит
          </button>
        </div>
        {targetType === 'layer' ? (
          <select
            value={targetLayerId ?? ''}
            onChange={e => setTargetLayerId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[13px] text-[var(--ax-fg)]"
          >
            <option value="">— выбрать слой —</option>
            {layers.map(l => (
              <option key={l.id} value={l.id}>{l.title ?? `Слой #${l.id}`}</option>
            ))}
          </select>
        ) : (
          <select
            value={targetUnitSlug ?? ''}
            onChange={e => setTargetUnitSlug(e.target.value || null)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[13px] text-[var(--ax-fg)]"
          >
            <option value="">— выбрать юнит —</option>
            {units.map(u => (
              <option key={`${u.kind}-${u.slug}`} value={u.slug}>
                [{u.kind === 'villa' ? 'V' : 'A'}] {u.title}
                {u.bedrooms != null ? ` · ${u.bedrooms}BR` : ''}
                {u.priceUsd != null ? ` · $${(u.priceUsd / 1000).toFixed(0)}k` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Per-hotspot availability override. Drives the polygon
          colour on the public viewer + the badge in the popup —
          green / yellow / red / no-badge. */}
      <div>
        <div className="text-[11.5px] text-[var(--ax-fg-muted)] mb-1">Статус продажи</div>
        <div className="grid grid-cols-4 gap-1">
          {([
            { v: null,        label: '—',        cls: 'bg-[var(--ax-hover)] text-[var(--ax-fg-soft)]' },
            { v: 'free',      label: 'Свободно', cls: 'bg-[#16A34A] text-white' },
            { v: 'reserved',  label: 'Бронь',    cls: 'bg-[#F59E0B] text-white' },
            { v: 'sold',      label: 'Продано',  cls: 'bg-[#DC2626] text-white' },
          ] as const).map(opt => {
            const active = availability === opt.v
            return (
              <button
                key={String(opt.v)}
                type="button"
                onClick={() => setAvailability(opt.v)}
                className={`px-2 py-1.5 rounded-lg text-[11.5px] font-medium ${active ? opt.cls : 'bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)]'}`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={savingNow}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1F8B5F] text-white text-[13px] font-medium disabled:opacity-50"
      >
        {savingNow ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
        Сохранить
      </button>
    </div>
  )
}

function formatTarget(h: Hotspot, layers: Layer[], units: UnitOption[]): { summary: string } {
  if (h.targetType === 'layer') {
    const l = layers.find(x => x.id === h.targetLayerId)
    return { summary: l ? `→ ${l.title ?? `Слой #${l.id}`}` : '→ слой не выбран' }
  }
  const u = units.find(x => x.slug === h.targetUnitSlug)
  return { summary: u ? `→ ${u.title}` : '→ юнит не выбран' }
}

// Picker modal — shows the complex's pre-optimised cover photos as
// clickable thumbnails plus a "upload my own" fallback. Both paths
// end up creating a new layer with the chosen photoUrl.
function LayerPickerModal({
  photos, saving, onClose, onPick, onUpload,
}: {
  photos: string[]
  saving: boolean
  onClose: () => void
  onPick: (url: string) => Promise<void>
  onUpload: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[920px] max-h-[88vh] bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl shadow-2xl flex flex-col"
      >
        <div className="px-5 py-4 border-b border-[var(--ax-border-soft)] flex items-center justify-between">
          <div>
            <div className="text-[14px] font-semibold text-[var(--ax-fg)]">Добавить слой</div>
            <div className="text-[12px] text-[var(--ax-fg-muted)] mt-0.5">Выбери фото комплекса или загрузи свою картинку</div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--ax-hover)] text-[var(--ax-fg-muted)]" aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {photos.length === 0 ? (
            <div className="text-[12.5px] text-[var(--ax-fg-faint)] py-6 text-center">
              Фото комплекса в complex-photos не нашлось. Используй кнопку «Загрузить файл» внизу.
            </div>
          ) : (
            <>
              <div className="text-[11px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-2">
                Фото этого комплекса ({photos.length}) — оптимизированы, webp, до 2000px
              </div>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map(url => (
                  <li key={url}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onPick(url)}
                      className="group block w-full rounded-xl overflow-hidden border border-[var(--ax-border)] hover:border-[#1F8B5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="w-full aspect-[4/3] object-cover group-hover:scale-[1.03] transition-transform"
                        loading="lazy"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[var(--ax-border-soft)] flex items-center justify-between">
          <div className="text-[11.5px] text-[var(--ax-fg-faint)]">
            {saving ? 'Сохраняю слой…' : 'Клик по фото — создаёт слой сразу'}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onUpload}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--ax-hover)] hover:bg-[var(--ax-hover-strong)] text-[13px] text-[var(--ax-fg)] disabled:opacity-50"
          >
            <Upload size={13} /> Загрузить файл
          </button>
        </div>
      </div>
    </div>
  )
}
