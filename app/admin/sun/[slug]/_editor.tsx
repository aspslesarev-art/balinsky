'use client'

// Редактор ориентации и высот модели. Правая колонка — живой предпросмотр:
// крутим ползунок азимута, модель поворачивается на спутниковой подложке,
// тени пересчитываются сразу. Сохранённые значения читает страница ЖК.

import dynamic from 'next/dynamic'
import { useMemo, useState, type ReactNode } from 'react'

import type { SitePlan, SunSettingsInput } from '@/lib/complex-sun-plan'

const SunScene = dynamic(() => import('@/components/sun/SunScene').then((m) => m.SunScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-white/60">
      Загружаю 3D-модель…
    </div>
  ),
})

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const COMPASS_NAMES = [
  'север', 'северо-восток', 'восток', 'юго-восток',
  'юг', 'юго-запад', 'запад', 'северо-запад',
]

/** Куда смотрят дворы с бассейнами при заданном азимуте ряда. */
function courtyardFacing(rowAzimuth: number): string {
  const facing = (((rowAzimuth - 90) % 360) + 360) % 360
  return COMPASS_NAMES[Math.round(facing / 45) % 8]
}

export function SunSettingsEditor({
  slug,
  plan,
  initial,
}: {
  slug: string
  plan: SitePlan
  initial: SunSettingsInput
}) {
  const [form, setForm] = useState<SunSettingsInput>(initial)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof SunSettingsInput>(key: K, value: SunSettingsInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaveState('idle')
  }

  const placement = useMemo(
    () => ({
      rowAzimuth: form.rowAzimuth,
      modelScale: form.modelScale,
      offsetX: form.offsetX,
      offsetZ: form.offsetZ,
      basemapOffsetX: form.basemapOffsetX,
      basemapOffsetZ: form.basemapOffsetZ,
      basemapScale: form.basemapScale,
    }),
    [form.rowAzimuth, form.modelScale, form.offsetX, form.offsetZ,
     form.basemapOffsetX, form.basemapOffsetZ, form.basemapScale],
  )

  const heights = useMemo(
    () => ({
      eaveHeight: form.eaveHeight,
      ridgeRise: form.ridgeRise,
      yardWall: form.yardWall,
    }),
    [form.eaveHeight, form.ridgeRise, form.yardWall],
  )

  const save = async () => {
    setSaveState('saving')
    setError(null)
    try {
      const res = await fetch(`/api/admin/sun/${slug}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
      setSaveState('saved')
    } catch (e: unknown) {
      setSaveState('error')
      setError(e instanceof Error ? e.message : 'Не удалось сохранить')
    }
  }

  return (
    <main className="flex h-[100dvh] flex-col lg:flex-row">
      <section className="w-full shrink-0 overflow-y-auto border-b border-neutral-200 p-5 lg:w-[380px] lg:border-b-0 lg:border-r dark:border-neutral-800">
        <h1 className="text-base font-semibold">{plan.title} — солнце и тень</h1>
        <p className="mt-1 text-xs text-neutral-500">
          {plan.district} · <code>{slug}</code>
        </p>

        <Field
          label="Ориентация ряда"
          value={`${form.rowAzimuth.toFixed(0)}°`}
          hint={`дворы с бассейнами смотрят на ${courtyardFacing(form.rowAzimuth)}`}
        >
          <input
            type="range"
            min={0}
            max={359}
            value={form.rowAzimuth}
            onChange={(e) => update('rowAzimuth', Number(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="mt-2 flex items-center gap-2">
            {[-10, -1, 1, 10].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => update('rowAzimuth', (((form.rowAzimuth + step) % 360) + 360) % 360)}
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {step > 0 ? `+${step}` : step}°
              </button>
            ))}
            <input
              type="number"
              min={0}
              max={359}
              value={Math.round(form.rowAzimuth)}
              onChange={(e) => update('rowAzimuth', Number(e.target.value))}
              className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </Field>

        <Nudge
          label="Масштаб модели"
          current={form.modelScale}
          min={0.5}
          max={2}
          step={0.005}
          value={`${form.modelScale.toFixed(3)}×`}
          steps={[-0.05, -0.01, 0.01, 0.05]}
          format={(v) => `${v > 0 ? '+' : ''}${v}`}
          onChange={(v) => update('modelScale', clamp(v, 0.5, 2))}
          onStep={(d) => update('modelScale', clamp(form.modelScale + d, 0.5, 2))}
          onReset={() => update('modelScale', 1)}
        />

        <Nudge
          label="Модель: запад ↔ восток"
          current={form.offsetX}
          min={-60}
          max={60}
          step={0.5}
          value={`${form.offsetX >= 0 ? '+' : ''}${form.offsetX.toFixed(1)} м`}
          steps={[-2, -0.5, 0.5, 2]}
          format={(v) => `${v > 0 ? '+' : ''}${v}`}
          onChange={(v) => update('offsetX', clamp(v, -60, 60))}
          onStep={(d) => update('offsetX', clamp(form.offsetX + d, -60, 60))}
          onReset={() => update('offsetX', 0)}
        />

        <Nudge
          label="Модель: север ↔ юг"
          current={form.offsetZ}
          min={-60}
          max={60}
          step={0.5}
          value={`${form.offsetZ >= 0 ? '+' : ''}${form.offsetZ.toFixed(1)} м`}
          steps={[-2, -0.5, 0.5, 2]}
          format={(v) => `${v > 0 ? '+' : ''}${v}`}
          onChange={(v) => update('offsetZ', clamp(v, -60, 60))}
          onStep={(d) => update('offsetZ', clamp(form.offsetZ + d, -60, 60))}
          onReset={() => update('offsetZ', 0)}
        />

        <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Подложка</p>
        </div>

        <Nudge
          label="Снимок: запад ↔ восток"
          current={form.basemapOffsetX}
          min={-80}
          max={80}
          step={0.5}
          value={`${form.basemapOffsetX >= 0 ? '+' : ''}${form.basemapOffsetX.toFixed(1)} м`}
          steps={[-2, -0.5, 0.5, 2]}
          format={(v) => `${v > 0 ? '+' : ''}${v}`}
          onChange={(v) => update('basemapOffsetX', clamp(v, -80, 80))}
          onStep={(d) => update('basemapOffsetX', clamp(form.basemapOffsetX + d, -80, 80))}
          onReset={() => update('basemapOffsetX', 0)}
        />

        <Nudge
          label="Снимок: север ↔ юг"
          current={form.basemapOffsetZ}
          min={-80}
          max={80}
          step={0.5}
          value={`${form.basemapOffsetZ >= 0 ? '+' : ''}${form.basemapOffsetZ.toFixed(1)} м`}
          steps={[-2, -0.5, 0.5, 2]}
          format={(v) => `${v > 0 ? '+' : ''}${v}`}
          onChange={(v) => update('basemapOffsetZ', clamp(v, -80, 80))}
          onStep={(d) => update('basemapOffsetZ', clamp(form.basemapOffsetZ + d, -80, 80))}
          onReset={() => update('basemapOffsetZ', 0)}
        />

        <Nudge
          label="Масштаб снимка"
          current={form.basemapScale}
          min={0.5}
          max={2}
          step={0.005}
          value={`${form.basemapScale.toFixed(3)}×`}
          steps={[-0.05, -0.01, 0.01, 0.05]}
          format={(v) => `${v > 0 ? '+' : ''}${v}`}
          onChange={(v) => update('basemapScale', clamp(v, 0.5, 2))}
          onStep={(d) => update('basemapScale', clamp(form.basemapScale + d, 0.5, 2))}
          onReset={() => update('basemapScale', 1)}
        />

        <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Высоты</p>
        </div>

        <Field label="Карниз" value={`${form.eaveHeight.toFixed(1)} м`}>
          <input
            type="range"
            min={3}
            max={20}
            step={0.1}
            value={form.eaveHeight}
            onChange={(e) => update('eaveHeight', Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </Field>

        <Field label="Конёк выше карниза" value={`${form.ridgeRise.toFixed(1)} м`}>
          <input
            type="range"
            min={0}
            max={6}
            step={0.1}
            value={form.ridgeRise}
            onChange={(e) => update('ridgeRise', Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </Field>

        <Field label="Забор двора" value={`${form.yardWall.toFixed(1)} м`}>
          <input
            type="range"
            min={0}
            max={4}
            step={0.1}
            value={form.yardWall}
            onChange={(e) => update('yardWall', Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </Field>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Широта
            <input
              type="number"
              step="0.00001"
              value={form.latitude}
              onChange={(e) => update('latitude', Number(e.target.value))}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Долгота
            <input
              type="number"
              step="0.00001"
              value={form.longitude}
              onChange={(e) => update('longitude', Number(e.target.value))}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => update('enabled', e.target.checked)}
            className="size-4 accent-amber-500"
          />
          Показывать блок на странице ЖК
        </label>

        <button
          type="button"
          onClick={save}
          disabled={saveState === 'saving'}
          className="mt-4 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {saveState === 'saving' ? 'Сохраняю…' : 'Сохранить'}
        </button>

        {saveState === 'saved' && (
          <p className="mt-2 text-xs text-emerald-600">Сохранено. Страница ЖК обновится сразу.</p>
        )}
        {saveState === 'error' && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </section>

      <section className="min-h-[420px] flex-1">
        <SunScene
          plan={plan}
          latitude={form.latitude}
          longitude={form.longitude}
          placement={placement}
          heights={heights}
        />
      </section>
    </main>
  )
}

const clamp = (v: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, v)) * 1000) / 1000

/**
 * Ползунок для грубой наводки плюс кнопки для точной: мышью по ползунку
 * в полметра не попасть, а кнопками долго ехать через весь диапазон.
 */
function Nudge({
  label,
  value,
  current,
  min,
  max,
  step,
  steps,
  format,
  onChange,
  onStep,
  onReset,
}: {
  label: string
  value: string
  current: number
  min: number
  max: number
  step: number
  steps: number[]
  format: (v: number) => string
  onChange: (value: number) => void
  onStep: (delta: number) => void
  onReset: () => void
}) {
  return (
    <div className="mt-4">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</span>
        <b className="text-sm tabular-nums">{value}</b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mb-2 w-full accent-amber-500"
        aria-label={label}
      />
      <div className="flex items-center gap-1.5">
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onStep(step)}
            className="flex-1 rounded-md border border-neutral-300 px-1 py-1 text-xs tabular-nums hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {format(step)}
          </button>
        ))}
        <button
          type="button"
          onClick={onReset}
          title="Сбросить"
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          ↺
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  hint,
  children,
}: {
  label: string
  value: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="mt-5">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</span>
        <b className="text-sm tabular-nums">{value}</b>
      </div>
      {children}
      {hint && <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>}
    </div>
  )
}
