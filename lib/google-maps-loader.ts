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
    const params = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
      libraries: 'marker',
      loading: 'async',
    })
    const script = document.createElement('script')
    script.src = `${SDK_URL}?${params.toString()}`
    script.async = true
    script.defer = true
    script.onload = () => {
      // Google's loader resolves `window.google.maps` synchronously
      // once the bundle parses — no callback needed at this version.
      if (window.google?.maps) resolve()
      else reject(new Error('google.maps not present after script load'))
    }
    script.onerror = () => reject(new Error('google maps script failed to load'))
    document.head.appendChild(script)
  })
  return window.__balinskyGmapLoader
}
