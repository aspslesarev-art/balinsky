'use client'

// Оболочка печатной презентации: листы A4 альбомом, всё лишнее с сайта
// (шапка, виджеты) скрыто. Содержимое, которое не влезает в лист,
// уменьшается целиком (CSS zoom), а не обрезается. С ?print=1 окно печати
// открывается само, когда догрузились фото и карты.

import { useEffect, type ReactNode } from 'react'

const CSS = `
body > :not(.pdf-root) { display: none !important; }
html, body { background: #E9ECEA !important; }
.pdf-root { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 24px 0 64px; }
.pdf-page { position: relative; width: 297mm; height: 210mm; overflow: hidden; background: #fff; color: var(--color-text);
  box-shadow: 0 1px 2px rgb(0 0 0 / .04), 0 4px 12px rgb(0 0 0 / .06); break-after: page; page-break-after: always; }
.pdf-inner { position: absolute; inset: 0 0 10mm 0; display: flex; flex-direction: column; overflow: hidden; }
.pdf-body { position: relative; flex: 1; min-height: 0; }
.pdf-foot { position: absolute; left: 12mm; right: 12mm; bottom: 4mm; font-size: 11px; color: var(--color-text-muted);
  border-top: 1px solid var(--color-border); padding-top: 2mm; }
/* Ленты-карусели сайта в печати — сеткой по три, без кнопок «назад / вперёд». */
.pdf-page ul.snap-x { flex-wrap: wrap; overflow: visible; }
.pdf-page ul.snap-x > li { flex-basis: calc((100% - 32px) / 3) !important; }
.pdf-page ul.snap-x + div:has(> button) { display: none; }
.pdf-page ul.snap-x .aspect-\\[3\\/2\\] { aspect-ratio: 16 / 7; }
/* Карточки соседей в листах аренды — фото пониже, чтобы два ряда влезли без мелкого текста. */
.pdf-page .pdf-bands .aspect-\\[3\\/2\\] { aspect-ratio: 16 / 8; }
.pdf-bar { position: sticky; top: 0; z-index: 10; width: 297mm; display: flex; align-items: center; gap: 16px; }
/* Телефон: листы 9:16, блоки идут потоком и сами переносятся на следующий лист. */
.pdf-root.port .pdf-page { width: 408px; height: auto; overflow: visible; box-shadow: none; }
.pdf-root.port .pdf-inner { position: static; overflow: visible; }
.pdf-root.port .pdf-body { flex: none; }
.pdf-root.port .pdf-foot { display: none; }
.pdf-root.port ul.snap-x > li { flex-basis: calc((100% - 16px) / 2) !important; }
.pdf-root.port .pdf-page { padding-bottom: 16px; }
.pdf-root.port .pdf-bar { width: 408px; flex-wrap: wrap; padding-left: 16px; padding-right: 16px; }
.pdf-root.port { gap: 0; padding-top: 0; }
.pdf-root.port .pdf-page section, .pdf-root.port li, .pdf-root.port .pdf-keep { break-inside: avoid; }
@media print {
  html, body { background: #fff !important; }
  .pdf-root { padding: 0; gap: 0; }
  .pdf-page { box-shadow: none; }
  .pdf-bar { display: none; }
}
`

function fitAll() {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('.pdf-body, .pdf-fit'))) {
    const inner = el.firstElementChild as HTMLElement | null
    if (!inner) continue
    inner.style.zoom = ''
    const room = el.clientHeight
    if (room <= 0 || inner.scrollHeight <= room) continue
    // Уменьшенный блок становится шире, и фото с заданными пропорциями растут —
    // одного деления мало, подбираем за несколько шагов.
    let z = room / inner.scrollHeight
    for (let i = 0; i < 6; i++) {
      inner.style.zoom = String(Math.max(0.4, z))
      const h = inner.getBoundingClientRect().height
      if (h <= room + 1 || z <= 0.4) break
      z *= room / h
    }
  }
}

// Телефонный вариант собирается снимками (app/api/pdf): Chrome печатает не
// уже 800 px, и мобильная раскладка блоков в печать не попадает. Здесь
// считаем, где резать каждый раздел на листы 9:16, чтобы разрез не проходил
// через фото, карточку или строку текста.
const ATOMS = 'img, canvas, li, tr, h1, h2, h3, p, a, .pdf-keep, .rounded-lg, .rounded-xl, .rounded-2xl, header'

function portraitCuts(pageH: number): { y: number; h: number }[] {
  const out: { y: number; h: number }[] = []
  for (const sec of Array.from(document.querySelectorAll<HTMLElement>('.pdf-page'))) {
    const r = sec.getBoundingClientRect()
    const top = r.top + scrollY
    const bottom = r.bottom + scrollY
    const atoms = Array.from(sec.querySelectorAll<HTMLElement>(ATOMS))
      .map(el => { const a = el.getBoundingClientRect(); return { t: a.top + scrollY, b: a.bottom + scrollY } })
      .filter(a => a.b - a.t > 0 && a.b - a.t < pageH * 0.9)
    const safe = (y: number) => atoms.every(a => !(a.t < y - 1 && a.b > y + 1))
    const cands = Array.from(new Set(atoms.flatMap(a => [Math.round(a.t) - 6, Math.round(a.b) + 6]))).sort((a, b) => b - a)
    let start = top
    while (bottom - start > pageH) {
      const limit = start + pageH
      const cut = cands.find(y => y <= limit && y > start + pageH * 0.35 && safe(y)) ?? limit
      out.push({ y: Math.round(start), h: Math.round(cut - start) })
      start = cut
    }
    // Хвост в пару строк отступа отдельным листом не нужен.
    if (bottom - start > 40 && atoms.some(a => a.b > start + 8)) out.push({ y: Math.round(start), h: Math.round(bottom - start) })
  }
  return out
}

export function PdfShell({ children, autoPrint, printLabel, printHint, portrait = false }: { children: ReactNode; autoPrint: boolean; printLabel: string; printHint: string; portrait?: boolean }) {
  useEffect(() => {
    let cancelled = false
    // Ленивые картинки за экраном сами не грузятся — в печать они бы ушли пустыми.
    // Каждая догруженная картинка меняет высоту блока — подгоняем листы заново.
    let t: ReturnType<typeof setTimeout> | null = null
    const refit = () => { if (portrait) return; if (t) clearTimeout(t); t = setTimeout(fitAll, 120) }
    for (const img of Array.from(document.images)) {
      img.loading = 'eager'
      img.addEventListener('load', refit)
    }
    const ready = async () => {
      await document.fonts?.ready
      const imgs = Array.from(document.images)
      await Promise.all(imgs.map(i => (i.complete ? null : new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }) }))))
      // Холсты карт рисуются после загрузки клеток тепловой карты.
      await new Promise(r => setTimeout(r, 900))
      if (cancelled) return
      if (!portrait) fitAll()
      // Подменённые после ошибки фото и поздние картинки — ещё один проход.
      await new Promise(r => setTimeout(r, 1200))
      if (cancelled) return
      if (!portrait) fitAll()
      // Метка для серверной сборки PDF (app/api/pdf): можно печатать.
      // Сервер прячет кнопку «Сохранить» и спрашивает разрезы заново.
      if (portrait) (window as unknown as { __pdfCuts: () => unknown }).__pdfCuts = () => portraitCuts(726)
      document.documentElement.setAttribute('data-pdf-ready', '1')
      if (autoPrint) window.print()
    }
    ready()
    const before = () => { if (!portrait) fitAll() }
    window.addEventListener('beforeprint', before)
    return () => { cancelled = true; if (t) clearTimeout(t); window.removeEventListener('beforeprint', before) }
  }, [autoPrint, portrait])

  return (
    <div className={`pdf-root ${portrait ? 'port' : 'land'}`}>
      <style>{(portrait ? '@page { size: 108mm 192mm; margin: 8mm 0; }\n' : '@page { size: A4 landscape; margin: 0; }\n') + CSS}</style>
      <div className="pdf-bar py-3">
        <button type="button" onClick={() => { if (!portrait) fitAll(); window.print() }}
          className="rounded-lg bg-[var(--color-primary)] px-5 py-3 text-[15px] font-semibold text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
          {printLabel}
        </button>
        <span className="text-[14px] text-[var(--color-text-muted)]">{printHint}</span>
      </div>
      {children}
    </div>
  )
}
