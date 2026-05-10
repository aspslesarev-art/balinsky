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
  Plus, Upload, Trash2, Save, ChevronRight, Image as ImageIcon,
  Loader2, AlertTriangle, Check, X,
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
}
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
  const fileRef = useRef<HTMLInputElement>(null)

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
      const r = await fetch(`/api/admin/visualizations/${encodeURIComponent(complexId)}/layers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          parentLayerId: activeLayerId,   // new layers default to children of current view
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

      <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)_280px] gap-4">
        {/* LEFT: layer tree */}
        <aside className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-3 space-y-2 self-start">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] font-medium">Слои ({layers.length})</div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
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
                <div className="text-[13.5px] font-medium text-[var(--ax-fg)] truncate">{activeLayer.title ?? `Слой #${activeLayer.id}`}</div>
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
                </div>
              </div>
              {/* Canvas: photo grows to fill the available width. The
                  image's intrinsic aspect ratio defines the section
                  height — no centring / no min-height so there are
                  never grey bars above or below. SVG sits on top
                  with viewBox 0..1 so coordinates stay normalised. */}
              <div className="relative bg-black/20">
                <div className="relative w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeLayer.photoUrl}
                    alt={activeLayer.title ?? ''}
                    className="block w-full h-auto select-none"
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
                      return (
                        <polygon
                          key={h.id}
                          points={points}
                          onClick={ev => { ev.stopPropagation(); setSelectedHotspotId(h.id); setDraft(null) }}
                          fill={isSelected ? 'rgba(31,139,95,0.45)' : 'rgba(31,139,95,0.25)'}
                          stroke={isSelected ? '#197551' : '#1F8B5F'}
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
