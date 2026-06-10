// Reusable Google-reviews heatmap overlay, framework-agnostic (raw
// google.maps). Used by the catalog maps (@vis.gl) and the detail-page maps
// (raw google.maps via google-maps-loader). Google removed
// visualization.HeatmapLayer in Maps JS v3.65, so we paint our own on a canvas
// OverlayView: accumulate per-point density in screen space, then colourise.
export type HeatCell = { lat: number; lng: number; weight: number }

const BLOB = 42 // on-screen blob radius (px)

function makeBrush(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = BLOB * 2
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(BLOB, BLOB, 0, BLOB, BLOB, BLOB)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, BLOB * 2, BLOB * 2)
  return c
}

function makePalette(): Uint8ClampedArray {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0.0, '#2b6cff')
  g.addColorStop(0.35, '#00c2c7')
  g.addColorStop(0.55, '#8ed11f')
  g.addColorStop(0.78, '#ffd200')
  g.addColorStop(1.0, '#ff2d00')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1, 256)
  return ctx.getImageData(0, 0, 1, 256).data
}

// Build an OverlayView that paints the heat. Call only after google.maps is
// loaded. Use ov.setMap(map) to show, ov.setMap(null) to hide.
export function createHeatOverlay(cells: HeatCell[], max: number): google.maps.OverlayView {
  const brush = makeBrush()
  const palette = makePalette()

  class HeatOverlay extends google.maps.OverlayView {
    canvas: HTMLCanvasElement | null = null
    onAdd() {
      const cv = document.createElement('canvas')
      cv.style.position = 'absolute'
      cv.style.top = '0'
      cv.style.left = '0'
      cv.style.pointerEvents = 'none'
      this.canvas = cv
      // overlayLayer sits below the marker pane, so pins stay on top.
      this.getPanes()?.overlayLayer.appendChild(cv)
    }
    draw() {
      const map = this.getMap() as google.maps.Map | null
      const proj = this.getProjection()
      const cv = this.canvas
      if (!map || !proj || !cv) return
      const center = map.getCenter()
      if (!center) return
      const divC = proj.fromLatLngToDivPixel(center)
      const conC = proj.fromLatLngToContainerPixel(center)
      if (!divC || !conC) return
      // Draw in container (viewport) pixels; cancel this pane's translate so
      // the heat stays locked to the map through pan/zoom.
      cv.style.left = `${divC.x - conC.x}px`
      cv.style.top = `${divC.y - conC.y}px`
      const div = map.getDiv()
      const w = div.offsetWidth, h = div.offsetHeight
      if (w <= 0 || h <= 0) return
      if (cv.width !== w) cv.width = w
      if (cv.height !== h) cv.height = h
      const ctx = cv.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)
      const pad = BLOB * 2

      let minX = w, minY = h, maxX = 0, maxY = 0, drew = false
      for (const cell of cells) {
        const p = proj.fromLatLngToContainerPixel(new google.maps.LatLng(cell.lat, cell.lng))
        if (!p) continue
        const x = p.x, y = p.y
        if (x < -pad || y < -pad || x > w + pad || y > h + pad) continue
        const tt = Math.max(0.08, Math.min(1, Math.sqrt(cell.weight / max)))
        ctx.globalAlpha = tt
        ctx.drawImage(brush, x - BLOB, y - BLOB)
        drew = true
        minX = Math.min(minX, x - BLOB); minY = Math.min(minY, y - BLOB)
        maxX = Math.max(maxX, x + BLOB); maxY = Math.max(maxY, y + BLOB)
      }
      ctx.globalAlpha = 1
      if (!drew) return

      const rx = Math.max(0, Math.floor(minX)), ry = Math.max(0, Math.floor(minY))
      const rw = Math.min(w, Math.ceil(maxX)) - rx, rh = Math.min(h, Math.ceil(maxY)) - ry
      if (rw <= 0 || rh <= 0) return
      const img = ctx.getImageData(rx, ry, rw, rh)
      const d = img.data
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3]
        if (a === 0) continue
        const j = a * 4
        d[i] = palette[j]; d[i + 1] = palette[j + 1]; d[i + 2] = palette[j + 2]
        d[i + 3] = Math.min(210, a + 40)
      }
      ctx.putImageData(img, rx, ry)
    }
    onRemove() {
      this.canvas?.remove()
      this.canvas = null
    }
  }

  return new HeatOverlay()
}

// Lazily fetch the island-wide heat cells (public Storage), cached per page.
let _cache: { cells: HeatCell[]; max: number } | null = null
export async function fetchHeatCells(): Promise<{ cells: HeatCell[]; max: number }> {
  if (_cache) return _cache
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  try {
    const r = await fetch(`${base}/storage/v1/object/public/competitors/_heat_pois.json`)
    if (!r.ok) return { cells: [], max: 1 }
    const j = (await r.json()) as { cells?: HeatCell[]; max?: number }
    _cache = { cells: j.cells ?? [], max: Math.max(1, j.max ?? 1) }
    return _cache
  } catch {
    return { cells: [], max: 1 }
  }
}
