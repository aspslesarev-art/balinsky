// Положение солнца по алгоритму Astronomical Almanac (точность ~0.01°).
// Используется 3D-моделью инсоляции ЖК: components/sun/*.

const DEG = Math.PI / 180
const J1970 = 2440588
const J2000 = 2451545

export type SolarPosition = {
  /** Высота над горизонтом, градусы. */
  altitude: number
  /** Азимут от севера по часовой стрелке, градусы. */
  azimuth: number
}

const daysSinceJ2000 = (date: Date) => date.valueOf() / 86400000 - 0.5 + J1970 - J2000

export function solarPosition(date: Date, latDeg: number, lonDeg: number): SolarPosition {
  const n = daysSinceJ2000(date)

  const meanLongitude = 280.46 + 0.9856474 * n
  const meanAnomaly = (357.528 + 0.9856003 * n) * DEG
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG
  const obliquity = (23.439 - 0.0000004 * n) * DEG

  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  )
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))

  const greenwichSiderealTime = 18.697374558 + 24.06570982441908 * n
  const localSiderealTime = ((greenwichSiderealTime % 24) * 15 + lonDeg) * DEG
  const hourAngle = localSiderealTime - rightAscension

  const lat = latDeg * DEG
  const altitude = Math.asin(
    Math.sin(lat) * Math.sin(declination) +
      Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle),
  )
  const azimuth = Math.atan2(
    -Math.sin(hourAngle),
    Math.tan(declination) * Math.cos(lat) - Math.sin(lat) * Math.cos(hourAngle),
  )

  return {
    altitude: altitude / DEG,
    azimuth: (((azimuth / DEG) % 360) + 360) % 360,
  }
}

/** Единичный вектор НА солнце в осях сцены: +X — восток, −Z — север, +Y — вверх. */
export function sunVector({ altitude, azimuth }: SolarPosition) {
  const alt = altitude * DEG
  const az = azimuth * DEG
  const horizontal = Math.cos(alt)
  return {
    x: horizontal * Math.sin(az),
    y: Math.sin(alt),
    z: -horizontal * Math.cos(az),
  }
}

export function formatHours(hours: number | null): string {
  if (hours === null || Number.isNaN(hours)) return '—'
  const total = Math.round(hours * 60)
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

export function formatDayOfYear(dayOfYear: number, year: number): string {
  const date = new Date(Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86400000)
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}

/** Полночь по местному времени площадки, выраженная в UTC. */
export function localDayStartUtc(year: number, dayOfYear: number, utcOffsetHours: number): Date {
  const utcMidnight = Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86400000
  return new Date(utcMidnight - utcOffsetHours * 3600000)
}
