import { MOVE_SVG, SKETCH_SVG } from '@/lib/syomka/sketches'
import type { Move, Src } from '@/lib/syomka/scenario'
import styles from '../syomka.module.css'

const INK: Record<Src, string> = { real: '#1D1B16', render: '#0F6E68', data: '#6B4A12' }
const BG: Record<Src, string> = { real: '#FFFFFF', render: '#E4EFED', data: '#FBF6EA' }
const TAG: Record<Src, string> = { real: 'СНЯТО', render: 'РЕНДЕР', data: 'ДАННЫЕ' }
export const MOVE_LABEL: Record<Move, string> = {
  walk: 'идёшь вперёд, медленно',
  pan: 'стоишь, поворот слева направо',
  tilt: 'стоишь, ведёшь сверху вниз',
  still: 'стоишь, камера неподвижно',
}

// SVG — наши статичные рисунки (lib/syomka/sketches.ts), пользовательских данных в них нет.
function fit(svg: string, src: Src): string {
  return svg
    .replace('width="330" height="186"', 'width="100%" height="100%" preserveAspectRatio="xMidYMid meet"')
    .replaceAll('__INK__', INK[src])
    .replaceAll('__DASH__', src === 'render' ? '6 5' : 'none')
}

export function Sketch({ kind, src, size, angle, move, left, right }: {
  kind: string; src: Src; size: string; angle: string; move: Move; left?: string; right?: string
}) {
  const split = kind === 'split' || kind === 'splitSite'
  const svg = SKETCH_SVG[kind === 'split' ? 'splitPlot' : kind] ?? SKETCH_SVG.wide
  return (
    <figure className={styles.sketch}>
      <div className={styles.frame} style={{ background: BG[src] }}>
        <span className={`${styles.tag} ${styles['tag_' + (split ? 'real' : src)]}`}>{split ? 'РЕНДЕР + СНЯТО' : TAG[src]}</span>
        <div className={styles.svg} dangerouslySetInnerHTML={{ __html: fit(svg, src) }} />
        {split && <>
          <span className={`${styles.half} ${styles.halfL}`}>{left}</span>
          <span className={`${styles.half} ${styles.halfR}`}>{right}</span>
        </>}
      </div>
      <figcaption className={styles.strip}>
        <span className={styles.op} dangerouslySetInnerHTML={{ __html: MOVE_SVG[move] }} />
        <span className={styles.stripText}>
          <span><b>{size}</b> · {angle}</span>
          <span className={styles.moveLabel}>{MOVE_LABEL[move]}</span>
        </span>
      </figcaption>
    </figure>
  )
}
