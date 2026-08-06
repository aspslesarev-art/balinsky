'use client'

// Редактор ориентации и высот модели. Правая колонка — живой предпросмотр:
// крутим ползунок азимута, модель поворачивается на спутниковой подложке,
// тени пересчитываются сразу. Сохранённые значения читает страница ЖК.

import dynamic from 'next/dynamic'
import { useMemo, useState, type ReactNode } from 'react'

import type { SitePlan, SunSettingsInput } from '@/lib/complex-sun'

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
          rowAzimuth={form.rowAzimuth}
          heights={heights}
        />
      </section>
    </main>
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
