// Ссылка Google Maps → координаты. Человек копирует ссылку из приложения карт,
// а не две цифры, поэтому принимаем всё, что Google отдаёт в адресной строке
// или в «Поделиться». Короткие maps.app.goo.gl раскрывает сервер
// (app/api/page-edit/geo), здесь — только разбор полной ссылки.
//
// Клиент-безопасный модуль.

export type LatLng = { lat: number; lng: number }

// Бали с запасом: всё за пределами — почти наверняка ошибка копирования
// (перепутаны широта и долгота, ссылка на другую страну).
const inBali = (p: LatLng) => p.lat > -9.2 && p.lat < -7.9 && p.lng > 114.3 && p.lng < 116.1

function pair(a: string, b: string): LatLng | null {
  const lat = Number(a), lng = Number(b)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const p = { lat, lng }
  return inBali(p) ? p : null
}

/** Координаты из текста: полная ссылка Google Maps или просто «-8.65, 115.13». */
export function parseCoords(input: string): LatLng | null {
  const s = decodeURIComponent(input.trim())
  if (!s) return null
  // Точка места (!3d…!4d…) точнее центра карты (@…), поэтому первой.
  const place = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (place) return pair(place[1], place[2])
  const q = s.match(/[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (q) return pair(q[1], q[2])
  const at = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (at) return pair(at[1], at[2])
  const plus = s.match(/(?:^|[/+\s=])([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3})(?=[^23456789CFGHJMPQRVWX]|$)/i)
  if (plus) {
    const p = decodePlusCode(plus[1])
    if (p) return pair(String(p.lat), String(p.lng))
  }
  const bare = s.match(/^(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)$/)
  if (bare) return pair(bare[1], bare[2])
  // Градусы-минуты-секунды из «Поделиться»: 8°49'43.2"S 115°08'47.9"E
  const dms = s.match(/(\d+)°\s*(\d+)['′]\s*([\d.]+)["″]?\s*([NS])\s*,?\s*(\d+)°\s*(\d+)['′]\s*([\d.]+)["″]?\s*([EW])/i)
  if (dms) {
    const toDeg = (d: string, m: string, sec: string, h: string) =>
      (Number(d) + Number(m) / 60 + Number(sec) / 3600) * (/[SW]/i.test(h) ? -1 : 1)
    return pair(String(toDeg(dms[1], dms[2], dms[3], dms[4])), String(toDeg(dms[5], dms[6], dms[7], dms[8])))
  }
  return null
}

// Open Location Code («плюс-код»). Короткая ссылка Google раскрывается в адрес
// вида /maps/place/H77V+G95+Maison+Verde… — координат в ней нет, а плюс-код
// есть. Короткий код восстанавливаем относительно центра Бали (спецификация
// OLC, recoverNearest): для острова размером ~1° это однозначно.
const OLC = '23456789CFGHJMPQRVWX'
const BALI_REF = { lat: -8.45, lng: 115.15 }

function decodePlusCode(input: string): LatLng | null {
  let code = input.toUpperCase()
  const sep = code.indexOf('+')
  if (sep < 0 || sep > 8 || sep % 2) return null
  if (sep < 8) {
    // Короткий код: недостающие старшие пары берём из кода опорной точки.
    const pad = 8 - sep
    const ref = encodePairs(BALI_REF.lat, BALI_REF.lng, pad / 2)
    code = ref + code
    const full = decodePlusCode(code)
    if (!full) return null
    const res = Math.pow(20, 2 - pad / 2)
    const half = res / 2
    let { lat, lng } = full
    if (BALI_REF.lat + half < lat && lat - res >= -90) lat -= res
    else if (BALI_REF.lat - half > lat && lat + res <= 90) lat += res
    if (BALI_REF.lng + half < lng) lng -= res
    else if (BALI_REF.lng - half > lng) lng += res
    return { lat, lng }
  }
  const digits = code.replace('+', '')
  let lat = -90, lng = -180
  let res = 20, latRes = 0, lngRes = 0
  for (let i = 0; i < Math.min(digits.length, 10); i += 2) {
    const a = OLC.indexOf(digits[i]), b = OLC.indexOf(digits[i + 1])
    if (a < 0 || b < 0) return null
    lat += a * res; lng += b * res
    latRes = lngRes = res
    res /= 20
  }
  // 11-й и дальше символы — сетка 4×5 внутри последней клетки.
  for (let i = 10; i < digits.length; i++) {
    const v = OLC.indexOf(digits[i])
    if (v < 0) return null
    latRes /= 5; lngRes /= 4
    lat += Math.floor(v / 4) * latRes; lng += (v % 4) * lngRes
  }
  return { lat: lat + latRes / 2, lng: lng + lngRes / 2 }
}

function encodePairs(lat: number, lng: number, pairs: number): string {
  let la = lat + 90, ln = lng + 180, res = 20, out = ''
  for (let i = 0; i < pairs; i++) {
    const a = Math.floor(la / res), b = Math.floor(ln / res)
    out += OLC[a] + OLC[b]
    la -= a * res; ln -= b * res
    res /= 20
  }
  return out
}

/** Ссылка, которую надо раскрыть на сервере (короткая, без координат внутри). */
export function isShortMapsLink(input: string): boolean {
  return /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(input.trim())
}

export function mapsUrl(p: LatLng): string {
  return `https://www.google.com/maps?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
}
