// Single global loader for the Google Maps JS SDK. Replaces
// @vis.gl/react-google-maps' APIProvider — ~50 KB gzip savings on
// every chunk that needed it. The Map API itself still ships from
// Google's CDN (~120 KB), but cleanly cached cross-origin and lazy
// per route. Idempotent: multiple components hitting load() share
// the same in-flight promise so we never inject the script twice.

declare global {
  interface Window {
    google?: typeof google
    __balinskyGmapLoader?: Promise<void>
  }
}

const SDK_URL = 'https://maps.googleapis.com/maps/api/js'

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.maps) return Promise.resolve()
  if (window.__balinskyGmapLoader) return window.__balinskyGmapLoader

  window.__balinskyGmapLoader = new Promise<void>((resolve, reject) => {
    // No `loading=async` here — that mode requires the importLibrary()
    // API to access constructors. We use the legacy synchronous shape
    // (new google.maps.Map, new google.maps.Marker, etc.), and those
    // are only attached straight to window.google.maps when the script
    // is loaded in classic mode. The script tag still gets async +
    // defer so it doesn't block HTML parsing.
    const params = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
    })
    const script = document.createElement('script')
    script.src = `${SDK_URL}?${params.toString()}`
    script.async = true
    script.defer = true
    script.onload = () => {
      // Even in classic mode there's a tiny gap where script.onload
      // fires before all `google.maps.*` namespaces are populated.
      // Poll briefly until the Map constructor shows up (or bail out
      // after 5 s and let the caller fall through to the unavailable
      // tile).
      const start = Date.now()
      const tick = () => {
        if (window.google?.maps?.Map) { resolve(); return }
        if (Date.now() - start > 5000) { reject(new Error('google.maps.Map not ready in time')); return }
        setTimeout(tick, 50)
      }
      tick()
    }
    script.onerror = () => reject(new Error('google maps script failed to load'))
    document.head.appendChild(script)
  })
  return window.__balinskyGmapLoader
}
