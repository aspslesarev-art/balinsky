// Masterplan image pinned to the satellite view, framework-agnostic (raw
// google.maps). Same canvas-OverlayView trick as lib/heat-overlay.ts: draw in
// container pixels and cancel the pane's translate, so the image stays welded
// to the ground through pan and zoom.
//
// Google's built-in GroundOverlay takes only a LatLngBounds — no rotation — and
// a masterplan is almost never axis-aligned with north, so it can't be used.

import type { GeoOverlay } from './geo-placement'

export type GeoOverlayPlacement = {
  lat: number
  lng: number
  overlay: GeoOverlay
}

export type GeoImageOverlay = google.maps.OverlayView & {
  /** Re-place without tearing the overlay down — the editor calls this on every nudge. */
  setPlacement(next: GeoOverlayPlacement): void
  /**
   * Container pixel → world coordinate. Direct manipulation needs it: a drag
   * arrives in screen pixels and has to become a lat/lng shift. Null until the
   * projection is ready.
   */
  containerPixelToLatLng(x: number, y: number): google.maps.LatLngLiteral | null
}

const M_PER_DEG_LAT = 111_320

/**
 * Ground width in pixels at the current zoom: project the centre and a point
 * `widthM` to its east, and measure the gap. Going through the live projection
 * means we never have to reason about zoom levels or tile maths.
 */
function groundWidthPx(
  proj: google.maps.MapCanvasProjection,
  lat: number,
  lng: number,
  widthM: number,
): number | null {
  const cosLat = Math.cos((lat * Math.PI) / 180)
  if (cosLat < 1e-6) return null
  const eastLng = lng + widthM / (M_PER_DEG_LAT * cosLat)

  const a = proj.fromLatLngToContainerPixel(new google.maps.LatLng(lat, lng))
  const b = proj.fromLatLngToContainerPixel(new google.maps.LatLng(lat, eastLng))
  if (!a || !b) return null

  const px = Math.abs(b.x - a.x)
  return px > 0 ? px : null
}

/**
 * Build the overlay. Call only after google.maps is loaded. `ov.setMap(map)` to
 * show, `ov.setMap(null)` to hide. The image loads lazily; the overlay draws
 * nothing until it is ready, then repaints itself.
 */
export function createGeoImageOverlay(initial: GeoOverlayPlacement): GeoImageOverlay {
  class GeoOverlayView extends google.maps.OverlayView {
    private canvas: HTMLCanvasElement | null = null
    private image: HTMLImageElement | null = null
    private loadedUrl: string | null = null
    private placement: GeoOverlayPlacement = initial

    containerPixelToLatLng(x: number, y: number): google.maps.LatLngLiteral | null {
      const proj = this.getProjection()
      if (!proj) return null
      const ll = proj.fromContainerPixelToLatLng(new google.maps.Point(x, y))
      return ll ? { lat: ll.lat(), lng: ll.lng() } : null
    }

    setPlacement(next: GeoOverlayPlacement) {
      this.placement = next
      if (next.overlay.imageUrl !== this.loadedUrl) this.loadImage(next.overlay.imageUrl)
      this.draw()
    }

    private loadImage(url: string) {
      this.loadedUrl = url
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        // A late response for a URL we've already moved on from must not win.
        if (this.loadedUrl !== url) return
        this.image = img
        this.draw()
      }
      img.onerror = () => {
        if (this.loadedUrl !== url) return
        this.image = null
        this.draw()
      }
      img.src = url
    }

    onAdd() {
      const cv = document.createElement('canvas')
      cv.style.position = 'absolute'
      cv.style.top = '0'
      cv.style.left = '0'
      cv.style.pointerEvents = 'none'
      this.canvas = cv
      // overlayLayer sits below the marker pane, so the draggable centre pin in
      // the admin editor stays grabbable on top of the masterplan.
      this.getPanes()?.overlayLayer.appendChild(cv)
      this.loadImage(this.placement.overlay.imageUrl)
    }

    draw() {
      const map = this.getMap() as google.maps.Map | null
      const proj = this.getProjection()
      const cv = this.canvas
      const img = this.image
      if (!map || !proj || !cv) return

      const center = map.getCenter()
      if (!center) return
      const divC = proj.fromLatLngToDivPixel(center)
      const conC = proj.fromLatLngToContainerPixel(center)
      if (!divC || !conC) return
      cv.style.left = `${divC.x - conC.x}px`
      cv.style.top = `${divC.y - conC.y}px`

      const div = map.getDiv()
      const w = div.offsetWidth
      const h = div.offsetHeight
      if (w <= 0 || h <= 0) return
      if (cv.width !== w) cv.width = w
      if (cv.height !== h) cv.height = h

      const ctx = cv.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)
      if (!img || !img.naturalWidth || !img.naturalHeight) return

      const { lat, lng, overlay } = this.placement
      const anchor = proj.fromLatLngToContainerPixel(new google.maps.LatLng(lat, lng))
      const widthPx = groundWidthPx(proj, lat, lng, overlay.widthM)
      if (!anchor || !widthPx) return

      const heightPx = widthPx * (img.naturalHeight / img.naturalWidth)
      // Cheap cull: however it's rotated, the image stays inside this circle.
      const reach = Math.hypot(widthPx, heightPx) / 2
      if (anchor.x + reach < 0 || anchor.y + reach < 0 || anchor.x - reach > w || anchor.y - reach > h) return

      ctx.save()
      ctx.globalAlpha = overlay.opacity
      ctx.translate(anchor.x, anchor.y)
      ctx.rotate((overlay.rotationDeg * Math.PI) / 180)
      ctx.drawImage(img, -widthPx / 2, -heightPx / 2, widthPx, heightPx)
      ctx.restore()
    }

    onRemove() {
      this.canvas?.remove()
      this.canvas = null
      this.image = null
      this.loadedUrl = null
    }
  }

  return new GeoOverlayView() as GeoImageOverlay
}
