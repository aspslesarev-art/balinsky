// 3D-тур комплекса (поле «3D tours» в raw_complexes) → адрес, который можно
// встроить окном в галерею. Встраиваются Kuula и Flatshow; ссылки на Google
// Диск и документы — не туры, их не показываем.
export function embeddableTourUrl(raw: unknown): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (typeof v !== 'string') return null
  const url = v.trim()
  const kuula = url.match(/^https:\/\/kuula\.co\/(?:post\/[^/]+\/)?(?:share\/)?collection\/([A-Za-z0-9]+)/)
  if (kuula) return `https://kuula.co/share/collection/${kuula[1]}?logo=0&info=0&fs=1&vr=0&thumbs=1`
  if (/^https:\/\/flatshow\.property\//.test(url)) return url
  return null
}
