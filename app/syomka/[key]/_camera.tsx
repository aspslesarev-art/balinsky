'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from '../syomka.module.css'

// «Камера по фото»: выбрал ЖК → выбрал фото с сайта → фото лежит
// полупрозрачно поверх камеры → совместил ракурс → снял видео.
// Видео пишется без наложения (MediaRecorder берёт только камеру).

type Complex = { id: string; name: string; district: string | null }
type Photo = { url: string; group: string }
type Obj = { id: string; name: string; photos: Photo[] }

const doneKey = (id: string) => `syomka:cam:${id}`
function loadDone(id: string): string[] {
  try { return JSON.parse(localStorage.getItem(doneKey(id)) ?? '[]') as string[] } catch { return [] }
}
function saveDone(id: string, v: string[]) {
  try { localStorage.setItem(doneKey(id), JSON.stringify(v)) } catch { /* приватный режим */ }
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(String(r.status))
  return (await r.json()) as T
}

export function CameraFlow({ apiKey, onBack }: { apiKey: string; onBack: () => void }) {
  const [obj, setObj] = useState<Obj | null>(null)
  const [loadingObj, setLoadingObj] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [shot, setShot] = useState<number | null>(null)
  const [done, setDone] = useState<string[]>([])

  const open = async (c: Complex) => {
    setLoadingObj(true); setErr(null)
    try {
      const o = await getJson<Obj>(`/api/syomka?key=${encodeURIComponent(apiKey)}&id=${c.id}`)
      setObj(o); setDone(loadDone(o.id)); window.scrollTo({ top: 0 })
    } catch {
      setErr('Не получилось загрузить фото. Проверь интернет и нажми ещё раз.')
    } finally { setLoadingObj(false) }
  }

  const markDone = (url: string) => {
    if (!obj) return
    setDone((d) => {
      if (d.includes(url)) return d
      const next = [...d, url]
      saveDone(obj.id, next)
      return next
    })
  }

  if (obj && shot !== null) {
    return (
      <Camera
        photos={obj.photos}
        index={shot}
        onIndex={setShot}
        onSaved={markDone}
        onClose={() => setShot(null)}
      />
    )
  }

  if (obj) {
    return <PhotoPick obj={obj} done={done} onPick={setShot} onBack={() => setObj(null)} />
  }

  return <ObjPick apiKey={apiKey} onPick={open} onBack={onBack} busy={loadingObj} err={err} />
}

function ObjPick({ apiKey, onPick, onBack, busy, err }: {
  apiKey: string; onPick: (c: Complex) => void; onBack: () => void; busy: boolean; err: string | null
}) {
  const [all, setAll] = useState<Complex[] | null>(null)
  const [fail, setFail] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    let alive = true
    getJson<{ results: Complex[] }>(`/api/syomka?key=${encodeURIComponent(apiKey)}`)
      .then((j) => { if (alive) setAll(j.results) })
      .catch(() => { if (alive) setFail(true) })
    return () => { alive = false }
  }, [apiKey])

  const list = useMemo(() => {
    if (!all) return []
    const n = q.trim().toLowerCase()
    return n ? all.filter((c) => `${c.name} ${c.district ?? ''}`.toLowerCase().includes(n)) : all
  }, [all, q])

  return (
    <>
      <button type="button" className={styles.back} onClick={onBack}>← Назад</button>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Камера по фото · шаг 1 из 2</p>
        <h1 className={styles.h1}>Какой объект снимаешь?</h1>
        <p className={styles.lead}>Выбери ЖК. Дальше покажу его фото с сайта — снимешь с тех же точек.</p>
      </header>
      <input
        className={styles.search}
        type="search"
        inputMode="search"
        placeholder="Название или район"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Поиск ЖК"
      />
      {err && <p className={styles.skipNote}>{err}</p>}
      {fail && <p className={styles.skipNote}>Список не загрузился. Обнови страницу.</p>}
      {!all && !fail && <p className={styles.lead}>Загружаю список…</p>}
      {all && list.length === 0 && <p className={styles.lead}>Ничего не нашёл. Попробуй другое слово.</p>}
      <ul className={styles.objList} aria-busy={busy}>
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" className={styles.objRow} disabled={busy} onClick={() => onPick(c)}>
              <span className={styles.objName}>{c.name}</span>
              {c.district && <span className={styles.choiceHint}>{c.district}</span>}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

function PhotoPick({ obj, done, onPick, onBack }: {
  obj: Obj; done: string[]; onPick: (i: number) => void; onBack: () => void
}) {
  const groups = useMemo(() => {
    const m = new Map<string, number[]>()
    obj.photos.forEach((p, i) => { m.set(p.group, [...(m.get(p.group) ?? []), i]) })
    return [...m.entries()]
  }, [obj])
  const doneCount = obj.photos.filter((p) => done.includes(p.url)).length

  return (
    <>
      <button type="button" className={styles.back} onClick={onBack}>← Другой объект</button>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Камера по фото · шаг 2 из 2</p>
        <h1 className={styles.h1}>{obj.name}</h1>
        <p className={styles.lead}>Нажми на фото — откроется камера, фото будет поверх. Совмести и снимай.</p>
      </header>
      {obj.photos.length === 0 ? (
        <p className={styles.skipNote}>У этого объекта на сайте нет фото. Снимай по раскадровке.</p>
      ) : (
        <>
          <div className={styles.progress} role="status">
            <div className={styles.progressText}>
              <b>Снято {doneCount} из {obj.photos.length}</b>
            </div>
            <div className={styles.bar}><span style={{ width: `${(doneCount / obj.photos.length) * 100}%` }} /></div>
          </div>
          {groups.map(([g, idx]) => (
            <section key={g} className={styles.block}>
              <h2 className={styles.h3}>{g}</h2>
              <ul className={styles.photoGrid}>
                {idx.map((i) => {
                  const on = done.includes(obj.photos[i].url)
                  return (
                    <li key={i}>
                      <button type="button" className={`${styles.photoBtn} ${on ? styles.photoOn : ''}`} onClick={() => onPick(i)}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- фото уже ужаты CDN, next/image тут лишний */}
                        <img src={obj.photos[i].url} alt={`${obj.name}, фото ${i + 1}`} loading="lazy" />
                        {on && <span className={styles.photoTick}>✓ Снято</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </>
  )
}

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const m of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ''
}

function fmt(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

function Camera({ photos, index, onIndex, onSaved, onClose }: {
  photos: Photo[]; index: number; onIndex: (i: number) => void; onSaved: (url: string) => void; onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const [camErr, setCamErr] = useState<string | null>(null)
  const [opacity, setOpacity] = useState(0.45)
  const [hide, setHide] = useState(false)
  const [ratio, setRatio] = useState(16 / 9)
  const [rec, setRec] = useState(false)
  const [sec, setSec] = useState(0)
  const [clip, setClip] = useState<{ blob: Blob; url: string; ext: string } | null>(null)
  const photo = photos[index]

  // Камера + микрофон (голос за кадром из раскадровки пишется сразу).
  useEffect(() => {
    let alive = true
    let lock: { release: () => Promise<void> } | null = null
    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setCamErr('Этот браузер не даёт камеру. Открой ссылку в Safari или Chrome.'); return }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        })
        if (!alive) { s.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = s
        if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}) }
      } catch {
        setCamErr('Нет доступа к камере. Разреши камеру и микрофон для сайта в настройках браузера и открой снова.')
      }
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
        if (wl) lock = await wl.request('screen')
      } catch { /* экран может погаснуть — не критично */ }
    })()
    return () => {
      alive = false
      if (recRef.current?.state === 'recording') recRef.current.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      lock?.release().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!rec) return
    const t = setInterval(() => setSec((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [rec])

  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url) }, [clip])

  const start = useCallback(() => {
    const s = streamRef.current
    if (!s) return
    const mime = pickMime()
    let r: MediaRecorder
    try { r = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s) } catch {
      setCamErr('Этот браузер не умеет записывать видео. Открой ссылку в Safari или Chrome.'); return
    }
    chunks.current = []
    r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
    r.onstop = () => {
      const type = r.mimeType || mime || 'video/mp4'
      const blob = new Blob(chunks.current, { type })
      setClip({ blob, url: URL.createObjectURL(blob), ext: type.includes('webm') ? 'webm' : 'mp4' })
    }
    r.start(1000)
    recRef.current = r
    setSec(0); setRec(true)
  }, [])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setRec(false)
  }, [])

  const save = async () => {
    if (!clip) return
    const name = `kadr-${index + 1}-${Date.now()}.${clip.ext}`
    const file = new File([clip.blob], name, { type: clip.blob.type })
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
    try {
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
      } else {
        const a = document.createElement('a')
        a.href = clip.url; a.download = name; a.click()
      }
      onSaved(photo.url)
    } catch { /* закрыл окно «Поделиться» — видео остаётся, можно нажать ещё раз */ }
  }

  const go = (d: number) => {
    const n = (index + d + photos.length) % photos.length
    setClip(null); onIndex(n)
  }

  return (
    <div className={styles.cam} role="dialog" aria-label="Камера по фото">
      <div className={styles.camStage}>
        <div className={styles.camFrame} style={{ aspectRatio: String(ratio) }}>
          <video ref={videoRef} className={styles.camVideo} playsInline muted autoPlay />
          {!hide && (
            // eslint-disable-next-line @next/next/no-img-element -- полупрозрачный шаблон поверх камеры
            <img
              src={photo.url}
              alt=""
              className={styles.camGhost}
              style={{ opacity }}
              onLoad={(e) => {
                const i = e.currentTarget
                if (i.naturalWidth && i.naturalHeight) setRatio(i.naturalWidth / i.naturalHeight)
              }}
            />
          )}
          {rec && <span className={styles.camRec}>● {fmt(sec)}</span>}
        </div>
        {ratio > 1.15 && <p className={styles.camHint}>Держи телефон боком, как на фото</p>}
      </div>

      {camErr && <p className={styles.camErr}>{camErr}</p>}

      {clip ? (
        <div className={styles.camBar}>
          <p className={styles.camTitle}>Дубль готов · {fmt(sec)}</p>
          <div className={styles.camRow}>
            <button type="button" className={styles.camMain} onClick={save}>Сохранить видео</button>
          </div>
          <div className={styles.camRow}>
            <button type="button" className={styles.camBtn} onClick={() => setClip(null)}>Ещё дубль</button>
            <button type="button" className={styles.camBtn} onClick={() => go(1)}>Следующее фото →</button>
          </div>
        </div>
      ) : (
        <div className={styles.camBar}>
          <div className={styles.camRow}>
            <button type="button" className={styles.camBtn} onClick={onClose} disabled={rec}>✕ Выйти</button>
            <span className={styles.camCount}>Фото {index + 1} из {photos.length}</span>
            <button type="button" className={styles.camBtn} onClick={() => setHide((h) => !h)} aria-pressed={hide}>
              {hide ? 'Показать фото' : 'Скрыть фото'}
            </button>
          </div>
          <label className={styles.camSlider}>
            <span>Прозрачность</span>
            <input type="range" min={0.1} max={0.9} step={0.05} value={opacity} disabled={hide}
              onChange={(e) => setOpacity(Number(e.target.value))} />
          </label>
          <div className={styles.camRow}>
            <button type="button" className={styles.camBtn} onClick={() => go(-1)} disabled={rec} aria-label="Предыдущее фото">←</button>
            <button
              type="button"
              className={`${styles.camShutter} ${rec ? styles.camShutterOn : ''}`}
              onClick={rec ? stop : start}
              disabled={!!camErr}
              aria-label={rec ? 'Остановить запись' : 'Начать запись'}
            ><span /></button>
            <button type="button" className={styles.camBtn} onClick={() => go(1)} disabled={rec} aria-label="Следующее фото">→</button>
          </div>
        </div>
      )}
    </div>
  )
}
