'use client'

import { useState } from 'react'

/** Main photo + 4 thumbnails; click a thumb to swap, click the main one for a lightbox. */
export function ComplexGallery({ photos, name }: { photos: string[]; name: string }) {
  const [main, setMain] = useState(0)
  const [zoom, setZoom] = useState(false)
  if (!photos.length) {
    return (
      <div className="muted" style={{
        marginTop: 40, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px dashed var(--color-divider)', borderRadius: 'var(--radius-md)', fontSize: 15,
      }}>
        Фотографий комплекса нет в базе
      </div>
    )
  }
  const thumbs = photos.filter((_, i) => i !== main).slice(0, 4)
  const url = (u: string) => JSON.stringify(u).slice(1, -1)

  return (
    <>
      <div className="gallery" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 28, marginTop: 40 }}>
        <figure style={{ margin: 0, height: 520, cursor: 'zoom-in' }} onClick={() => setZoom(true)}
          title="Нажмите, чтобы открыть во весь экран">
          <div role="img" aria-label={`${name} — фото`} style={{
            width: '100%', height: '100%', borderRadius: 'var(--radius-md)',
            backgroundImage: `url(${url(photos[main])})`, backgroundSize: 'cover', backgroundPosition: 'center',
          }} />
        </figure>
        <div className="gallery-thumbs" style={{ display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: 14 }}>
          {thumbs.map(p => (
            <button key={p} type="button" onClick={() => setMain(photos.indexOf(p))} aria-label="Показать фото"
              style={{
                padding: 0, border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)',
                overflow: 'hidden', cursor: 'pointer', background: 'none', minHeight: 80,
              }}>
              <span style={{
                display: 'block', width: '100%', height: '100%',
                backgroundImage: `url(${url(p)})`, backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
            </button>
          ))}
        </div>
      </div>
      <p className="muted" style={{ margin: '12px 0 0', fontSize: 14 }}>
        {photos.length < 5
          ? `В базе ${photos.length} фото — дизайн рассчитан на 5 и больше`
          : 'Нажмите на фото, чтобы рассмотреть во весь экран'}
      </p>
      {zoom && (
        <div onClick={() => setZoom(false)} style={{
          position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(20,18,16,.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
          animation: 'ue-lb-in .2s ease',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[main]} alt={name} style={{ maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain' }} />
        </div>
      )}
    </>
  )
}
