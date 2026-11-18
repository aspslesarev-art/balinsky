// Блок «Аналитика по объекту»: слева список анализов, справа панель, где
// по кнопке «собираются» данные из источников (Booking, Airbnb, rumah123,
// госплан зон…), потом итог с графиками. Данные уже посчитаны на сервере —
// анимация только раскрывает их по шагам, каждая цифра в ней настоящая.
// Макет: claude.ai/artifact/73dHFjJbNi7Ew85ZUwUzG4 (владелец, 18.11.2026).

/** Суммы в строках записаны как ⟦usd⟧ — валюту подставляет панель (lib/currency). */
export const MONEY_RE = /⟦([\d.]+)⟧/g

export type LatLng = { lat: number; lng: number }

export type SourceItem = { photo: string | null; name: string; meta: string; url: string | null }

export type Source = {
  name: string
  /** Свежесть: «обновлено сегодня в 12:00», «данные на 29.09.2026». */
  fresh: string
  /** Слова поиска — выскакивают по одному. */
  chips: string[]
  /** Счётчик растёт до total во время «сканирования». */
  total: number
  /** Для русского — три формы через «|»: «объект|объекта|объектов». */
  unit: string
  /** Мелькающие строки — настоящие названия/значения из выборки. */
  names: string[]
  result: string
  /** Объекты, взятые в сравнение, — лента с фото. */
  items?: SourceItem[]
  /** Карта, которая рисуется прямо во время сбора (видна и гостю). */
  live?: Viz
}

export type Viz =
  | { kind: 'bars'; title: string; rows: { label: string; value: number; text: string }[]; max: number; color?: string }
  | { kind: 'cols'; title: string; cols: { label: string; value: number; text: string; hot?: boolean }[]; max: number }
  | { kind: 'strip'; title: string; points: number[]; lo: number; hi: number; mark: { value: number; label: string }; self?: { value: number; label: string } | null; loLabel: string; hiLabel: string; note?: string }
  | { kind: 'checks'; title: string; rows: { state: 'ok' | 'warn' | 'info'; label: string; value: string }[] }
  | { kind: 'scatter'; title: string; points: { x: number; y: number; label: string; good: boolean }[]; xLo: number; xHi: number; yLo: number; yHi: number; xLoLabel: string; xHiLabel: string; yLoLabel: string; yHiLabel: string; caption: string }
  | { kind: 'gauge'; title: string; avg: number; min: number | null; max: number | null; caption: string; loLabel: string; hiLabel: string; avgLabel: string }
  | { kind: 'map'; title: string; center: LatLng; zoom: number; aspect: number; base: 'street' | 'sat'
      pins?: { lat: number; lng: number; color: string }[]
      tags?: { lat: number; lng: number; label: string }[]
      lines?: { coords: number[][]; color: string; label: string }[]
      /** Тепловая карта: клетки с весом (туристы), max — вес «самой горячей». */
      heat?: { lat: number; lng: number; w: number }[]
      heatMax?: number
      /** Круги расстояний вокруг центра карты (метры). */
      rings?: { m: number; label: string }[]
      /** Доли ветра по 8 румбам, с севера по часовой. */
      rose?: number[]
      legend?: { color: string; label: string }[]
      credit: string
      alt: string }
  | { kind: 'months'; title: string; months: { label: string; sunny: number; tmax: number | null; wet: number }[]; sunnyLbl: string }
  | { kind: 'image'; title: string; src: string; aspect: number; alt: string; legend?: { color: string; label: string }[]; credit: string }

export type Analysis = {
  id: string
  group: string
  title: string
  sub: string
  sources: Source[]
  bigs: { v: string; l: string }[]
  meaning: string
  footnote?: string
  vizs: Viz[]
}
