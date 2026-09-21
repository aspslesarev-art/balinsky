// Звуки квеста. Синтезируются на лету через Web Audio — так не нужно
// тащить и грузить mp3, а страница остаётся лёгкой.
//
// Браузер не даёт играть до первого жеста пользователя, но все наши
// звуки и начинаются с клика по галочке, так что это не мешает.

type Ctor = typeof AudioContext

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor }
    const C = w.AudioContext ?? w.webkitAudioContext
    if (!C) return null
    try { ctx = new C() } catch { return null }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

type ToneOpts = {
  freq: number
  at?: number
  dur?: number
  type?: OscillatorType
  gain?: number
  /** Куда уезжает частота к концу — для «вжух» и падающих звуков. */
  to?: number
}

function tone({ freq, at = 0, dur = 0.12, type = 'sine', gain = 0.08, to }: ToneOpts): void {
  const a = audio()
  if (!a) return
  const t0 = a.currentTime + at
  const osc = a.createOscillator()
  const vol = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  // Мгновенная атака и мягкий хвост: без них слышны щелчки на стыках.
  vol.gain.setValueAtTime(0.0001, t0)
  vol.gain.exponentialRampToValueAtTime(gain, t0 + 0.008)
  vol.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(vol).connect(a.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

/** Галочка поставлена — короткий щелчок. */
export function playTick(): void {
  tone({ freq: 660, to: 1180, dur: 0.09, type: 'triangle', gain: 0.07 })
}

/** Галочка снята — тот же щелчок наоборот, тише. */
export function playUndo(): void {
  tone({ freq: 520, to: 240, dur: 0.1, type: 'triangle', gain: 0.04 })
}

/** Задача с деньгами — звон монет. */
export function playCoins(): void {
  const notes = [1245, 1567, 1865, 2349, 1865]
  notes.forEach((f, i) => tone({ freq: f, at: i * 0.045, dur: 0.22, type: 'sine', gain: 0.055 }))
  tone({ freq: 620, at: 0, dur: 0.3, type: 'triangle', gain: 0.03 })
}

/** Награда получена — короткая фанфара. */
export function playAward(): void {
  const notes = [523, 659, 784, 1047]
  notes.forEach((f, i) => tone({ freq: f, at: i * 0.075, dur: 0.3, type: 'triangle', gain: 0.07 }))
  tone({ freq: 1568, at: 0.3, dur: 0.5, type: 'sine', gain: 0.05 })
}

/** Новый уровень — восходящая лесенка. */
export function playLevelUp(): void {
  const notes = [392, 523, 659, 784, 1047, 1319]
  notes.forEach((f, i) => tone({ freq: f, at: i * 0.06, dur: 0.28, type: 'sawtooth', gain: 0.045 }))
  tone({ freq: 1047, at: 0.36, dur: 0.6, type: 'sine', gain: 0.06 })
}

/** Не сохранилось — глухой низкий. */
export function playFail(): void {
  tone({ freq: 220, to: 150, dur: 0.25, type: 'square', gain: 0.035 })
}
