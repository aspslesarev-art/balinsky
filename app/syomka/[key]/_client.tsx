'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AFTER, BEFORE, DONT_SAY, SIZES, STAGES, TIPS, TYPES,
  buildScenario, type ObjType, type Stage,
} from '@/lib/syomka/scenario'
import { Sketch } from './_sketch'
import { CameraFlow } from './_camera'
import styles from '../syomka.module.css'

type Done = Record<string, boolean>

// Галочки живут в браузере телефона: каждая съёмка — свой объект,
// «Начать заново» очищает. Хранилище может быть недоступно — тогда просто без памяти.
function load(k: string): Done {
  try { return JSON.parse(localStorage.getItem(k) ?? '{}') as Done } catch { return {} }
}
function save(k: string, v: Done) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* приватный режим */ }
}

function setUrl(t: ObjType | null, s: Stage | null, cam = false) {
  const u = new URL(window.location.href)
  u.search = ''
  if (cam) u.searchParams.set('cam', '1')
  if (t) u.searchParams.set('t', t)
  if (t && s) u.searchParams.set('s', s)
  window.history.pushState(null, '', u)
  window.scrollTo({ top: 0 })
}

export function SyomkaClient({ apiKey, initialCam, initialType, initialStage }: {
  apiKey: string; initialCam: boolean; initialType: ObjType | null; initialStage: Stage | null
}) {
  const [cam, setCam] = useState(initialCam)
  const [t, setT] = useState<ObjType | null>(initialType)
  const [s, setS] = useState<Stage | null>(initialStage)

  // Кнопка «назад» в телефоне ходит по шагам, а не уводит со страницы.
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search)
      const pt = p.get('t'); const ps = p.get('s')
      setCam(p.get('cam') === '1')
      setT(TYPES.some((x) => x.id === pt) ? pt as ObjType : null)
      setS(pt && STAGES.some((x) => x.id === ps) ? ps as Stage : null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const pickType = (v: ObjType) => { setT(v); setS(null); setUrl(v, null) }
  const pickStage = (v: Stage) => { setS(v); setUrl(t, v) }
  const toStart = () => { setCam(false); setT(null); setS(null); setUrl(null, null) }
  const toCam = () => { setCam(true); setT(null); setS(null); setUrl(null, null, true) }
  const toStage = () => { setS(null); setUrl(t, null) }

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        {cam && <CameraFlow apiKey={apiKey} onBack={toStart} />}
        {!cam && !t && <ChooseType onPick={pickType} onCam={toCam} />}
        {!cam && t && !s && <ChooseStage type={t} onPick={pickStage} onBack={toStart} />}
        {!cam && t && s && <Shoot type={t} stage={s} onBack={toStage} onHome={toStart} />}
      </div>
    </main>
  )
}

function ChooseType({ onPick, onCam }: { onPick: (v: ObjType) => void; onCam: () => void }) {
  return (
    <>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Шаг 1 из 2</p>
        <h1 className={styles.h1}>Что снимаешь?</h1>
      </header>
      <div className={styles.choices}>
        {TYPES.map((x) => (
          <button key={x.id} type="button" className={styles.choice} onClick={() => onPick(x.id)}>
            <span className={styles.choiceName}>{x.name}</span>
            <span className={styles.choiceHint}>{x.hint}</span>
          </button>
        ))}
      </div>
      <button type="button" className={`${styles.choice} ${styles.choiceCam}`} onClick={onCam}>
        <span className={styles.choiceName}>Камера по фото</span>
        <span className={styles.choiceHint}>Выбери объект с сайта — его фото будет поверх камеры, снимешь с тех же точек</span>
      </button>
      <Guide />
    </>
  )
}

function ChooseStage({ type, onPick, onBack }: { type: ObjType; onPick: (v: Stage) => void; onBack: () => void }) {
  const name = TYPES.find((x) => x.id === type)?.name
  return (
    <>
      <button type="button" className={styles.back} onClick={onBack}>← {name}</button>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Шаг 2 из 2 · {name}</p>
        <h1 className={styles.h1}>Какой этап?</h1>
      </header>
      <div className={styles.choices}>
        {STAGES.map((x) => (
          <button key={x.id} type="button" className={styles.choice} onClick={() => onPick(x.id)}>
            <span className={styles.choiceName}>{x.name}</span>
            <span className={styles.choiceHint}>{x.hint}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function Shoot({ type, stage, onBack, onHome }: { type: ObjType; stage: Stage; onBack: () => void; onHome: () => void }) {
  const sc = useMemo(() => buildScenario(type, stage), [type, stage])
  const storeKey = `syomka:${type}:${stage}`
  const [done, setDone] = useState<Done>({})
  const [ready, setReady] = useState(false)
  useEffect(() => { setDone(load(storeKey)); setReady(true) }, [storeKey])

  const toggle = (id: string) => setDone((d) => {
    const next = { ...d, [id]: !d[id] }
    save(storeKey, next)
    return next
  })
  const reset = () => { setDone({}); save(storeKey, {}) }

  const film = sc.shots.filter((x) => x.film)
  const filmed = film.filter((x) => done['shot' + x.n]).length
  const allDone = ready && filmed === film.length

  return (
    <>
      <div className={styles.topRow}>
        <button type="button" className={styles.back} onClick={onBack}>← Этап</button>
        <button type="button" className={styles.back} onClick={onHome}>Другой объект</button>
      </div>
      <header className={styles.head}>
        <p className={styles.eyebrow}>15 кадров · ролик 5 минут</p>
        <h1 className={styles.h1}>{sc.title}</h1>
        <p className={styles.lead}>{sc.desc}</p>
        <p className={styles.note}>{sc.typeNote}</p>
      </header>

      <div className={styles.progress} role="status" aria-live="polite">
        <div className={styles.progressText}>
          <b>{allDone ? 'Всё снято' : `Снято ${filmed} из ${film.length}`}</b>
          <span>{sc.shots.length - film.length} кадров соберу сам</span>
        </div>
        <div className={styles.bar}><span style={{ width: `${(filmed / film.length) * 100}%` }} /></div>
      </div>

      <section className={styles.block}>
        <h2 className={styles.h2}>Перед съёмкой</h2>
        <Checks items={BEFORE} prefix="before" done={done} onToggle={toggle} />
      </section>

      <ol className={styles.shots}>
        {sc.shots.map((x) => {
          const id = 'shot' + x.n
          const on = !!done[id]
          // Кадры, которые соберу сам, на объекте не нужны — свёрнуты, чтобы меньше листать.
          if (!x.film) return (
            <li key={x.n} className={`${styles.shot} ${styles.shotSkip}`}>
              <div className={styles.shotHead}>
                <span className={styles.num}>{x.n}</span>
                <span className={styles.blockName}>{x.block}</span>
                <span className={styles.time}>{x.time}</span>
              </div>
              <p className={styles.skipNote}>Снимать не нужно — {x.src === 'render' ? 'картинки застройщика' : 'цифры'} поставлю сам</p>
              <details className={styles.more}>
                <summary>Что будет в ролике</summary>
                <dl className={styles.rows}>
                  <div><dt>Сказать</dt><dd>«{x.voice}»</dd></div>
                  <div><dt>На экране</dt><dd className={styles.screen}>{x.screen}</dd></div>
                  <div><dt>Зачем</dt><dd className={styles.why}>{x.why}</dd></div>
                </dl>
              </details>
            </li>
          )
          return (
            <li key={x.n} className={`${styles.shot} ${on ? styles.shotDone : ''}`}>
              <div className={styles.shotHead}>
                <span className={styles.num}>{x.n}</span>
                <span className={styles.blockName}>{x.block}</span>
                <span className={styles.time}>{x.time}</span>
              </div>
              <Sketch kind={x.kind} src={x.src} size={x.size} angle={x.angle} move={x.move} left={x.left} right={x.right} />
              <dl className={styles.rows}>
                <div><dt>Снять</dt><dd>{x.shoot}</dd></div>
                <div><dt>Сказать</dt><dd>«{x.voice}»</dd></div>
                <div><dt>На экране</dt><dd className={styles.screen}>{x.screen}</dd></div>
                <div><dt>Зачем</dt><dd className={styles.why}>{x.why}</dd></div>
              </dl>
              <button type="button" aria-pressed={on} className={`${styles.check} ${on ? styles.checkOn : ''}`} onClick={() => toggle(id)}>
                {on ? '✓ Снято' : 'Отметить: снял'}
              </button>
            </li>
          )
        })}
      </ol>

      <section className={styles.block}>
        <h2 className={styles.h2}>В конце</h2>
        <Checks items={AFTER} prefix="after" done={done} onToggle={toggle} />
      </section>

      <Guide />

      <button type="button" className={styles.reset} onClick={reset}>Начать заново — снять все галочки</button>
    </>
  )
}

function Checks({ items, prefix, done, onToggle }: { items: string[]; prefix: string; done: Done; onToggle: (id: string) => void }) {
  return (
    <ul className={styles.checks}>
      {items.map((txt, i) => {
        const id = `${prefix}${i}`
        const on = !!done[id]
        return (
          <li key={id}>
            <button type="button" aria-pressed={on} className={`${styles.checkRow} ${on ? styles.checkRowOn : ''}`} onClick={() => onToggle(id)}>
              <span className={styles.box} aria-hidden="true">{on ? '✓' : ''}</span>
              <span>{txt}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function Guide() {
  return (
    <details className={styles.guide}>
      <summary>Как снимать: размер кадра, советы, что не говорить</summary>
      <div className={styles.guideBody}>
        <div className={styles.sizes}>
          {SIZES.map((x) => (
            <div key={x.name} className={styles.size}>
              <Sketch kind={x.kind} src="real" size={x.name} angle="уровень глаз" move="still" />
              <p><b>{x.name}.</b> {x.text}</p>
            </div>
          ))}
        </div>
        <h3 className={styles.h3}>Советы</h3>
        <ul className={styles.plain}>{TIPS.map((x) => <li key={x}>{x}</li>)}</ul>
        <h3 className={styles.h3}>Метки на рисунках</h3>
        <ul className={styles.plain}>
          <li><b>СНЯТО</b> — снимаешь сам на объекте</li>
          <li><b>РЕНДЕР</b> — картинка застройщика</li>
          <li><b>ДАННЫЕ</b> — цифры с сайта поверх кадра</li>
        </ul>
        <h3 className={styles.h3}>Не говорить</h3>
        <p className={styles.dont}>{DONT_SAY}</p>
      </div>
    </details>
  )
}
