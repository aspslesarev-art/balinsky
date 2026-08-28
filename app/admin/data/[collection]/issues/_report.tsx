'use client'

// Вкладка «Проблемы»: что в базе мешает объектам нормально жить на сайте.
//
// Два взгляда на один список. «По проблемам» — рабочий режим: одна карточка =
// одна причина, под ней все записи, которые ею страдают, так что одинаковую
// дыру закрывают одним заходом. «По записям» — когда нужно довести до ума
// конкретный объект.

import { useMemo, useState } from 'react'
import { AlertTriangle, Info, XCircle, ArrowUpRight, Check } from 'lucide-react'
import type { IssueReport, Severity } from '@/lib/admin/data-quality'

const SEVERITY_STYLE: Record<Severity, { chip: string; icon: typeof XCircle; tint: string }> = {
  critical: { chip: 'bg-red-500/15 text-red-500 border-red-500/30', icon: XCircle, tint: 'text-red-500' },
  warning: { chip: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: AlertTriangle, tint: 'text-amber-500' },
  info: { chip: 'bg-[var(--ax-hover)] text-[var(--ax-fg-muted)] border-[var(--ax-border)]', icon: Info, tint: 'text-[var(--ax-fg-faint)]' },
}

const FILTERS: { key: Severity; label: string }[] = [
  { key: 'critical', label: 'Не работает' },
  { key: 'warning', label: 'Неполно' },
  { key: 'info', label: 'К сведению' },
]

export function IssuesReport({ report, collection }: { report: IssueReport; collection: string }) {
  // «К сведению» выключено по умолчанию: там осознанные решения вроде «пока не
  // опубликован», и они утопили бы настоящие проблемы.
  const [shown, setShown] = useState<Set<Severity>>(new Set<Severity>(['critical', 'warning']))
  const [view, setView] = useState<'rules' | 'records'>('rules')

  const toggle = (s: Severity) => setShown(prev => {
    const next = new Set(prev)
    if (next.has(s)) next.delete(s); else next.add(s)
    return next
  })

  const ruleById = useMemo(() => new Map(report.rules.map(r => [r.id, r])), [report.rules])
  const rules = useMemo(() => report.rules.filter(r => shown.has(r.severity)), [report.rules, shown])
  const records = useMemo(() => report.records
    .map(rec => ({ ...rec, rules: rec.rules.filter(id => shown.has(ruleById.get(id)?.severity ?? 'info')) }))
    .filter(rec => rec.rules.length > 0), [report.records, ruleById, shown])

  const affected = report.counts.critical + report.counts.warning + report.counts.info

  if (report.error) {
    return (
      <div className="max-w-[980px] mx-auto rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-[13px] text-[var(--ax-fg)]">
        Не удалось проверить базу: <span className="font-mono">{report.error}</span>
      </div>
    )
  }

  return (
    <div className="max-w-[980px] mx-auto pb-16">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Summary value={report.counts.critical} label="не работает" tone="critical" />
        <Summary value={report.counts.warning} label="неполно" tone="warning" />
        <Summary value={report.counts.info} label="к сведению" tone="info" />
        <div className="text-[12.5px] text-[var(--ax-fg-faint)] ml-1">проверено записей: {report.scanned}</div>
      </div>

      {affected === 0 ? (
        <div className="rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-8 text-center">
          <Check size={26} className="mx-auto mb-2 text-[var(--color-primary)]" />
          <div className="text-[15px] font-semibold text-[var(--ax-fg)]">Всё заполнено</div>
          <div className="text-[13px] text-[var(--ax-fg-muted)] mt-1">
            Проверено записей: {report.scanned}. Ни одной дыры, из-за которой объект пропал бы с сайта.
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {FILTERS.map(f => {
              const active = shown.has(f.key)
              const n = report.rules.filter(r => r.severity === f.key).reduce((acc, r) => acc + r.count, 0)
              return (
                <button key={f.key} type="button" onClick={() => toggle(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-[12.5px] border ${
                    active ? SEVERITY_STYLE[f.key].chip : 'border-[var(--ax-border)] text-[var(--ax-fg-faint)]'
                  }`}>
                  {f.label} · {n}
                </button>
              )
            })}
            <div className="flex-1" />
            <div className="flex items-center gap-1 text-[12.5px]">
              {(['rules', 'records'] as const).map(v => (
                <button key={v} type="button" onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg border ${
                    view === v
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--ax-fg-muted)] hover:bg-[var(--ax-hover)]'
                  }`}>
                  {v === 'rules' ? 'По проблемам' : 'По записям'}
                </button>
              ))}
            </div>
          </div>

          {view === 'rules' ? (
            <div className="flex flex-col gap-3">
              {rules.map(rule => {
                const S = SEVERITY_STYLE[rule.severity]
                const Icon = S.icon
                return (
                  <section key={rule.id} className="rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)]">
                    <div className="px-4 pt-4 pb-3 flex items-start gap-2.5">
                      <Icon size={17} className={`${S.tint} mt-0.5 shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h2 className="text-[15.5px] font-semibold text-[var(--ax-fg)]">{rule.title}</h2>
                          <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold border ${S.chip}`}>{rule.count}</span>
                        </div>
                        <p className="text-[13px] text-[var(--ax-fg-soft)] mt-1 leading-snug">{rule.consequence}</p>
                        <p className="text-[13px] text-[var(--ax-fg-muted)] mt-1.5 leading-snug">
                          <span className="text-[var(--color-primary)] font-medium">Что сделать: </span>{rule.fix}
                        </p>
                      </div>
                    </div>
                    <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                      {rule.records.map(rec => (
                        <a key={rec.id} href={`/admin/data/${collection}?open=${encodeURIComponent(rec.id)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12.5px] no-underline border border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                          {rec.title}
                          <ArrowUpRight size={12} />
                        </a>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] divide-y divide-[var(--ax-border)]">
              {records.map(rec => (
                <div key={rec.id} className="px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <a href={`/admin/data/${collection}?open=${encodeURIComponent(rec.id)}`}
                    className="inline-flex items-center gap-1 text-[14px] font-medium text-[var(--ax-fg)] no-underline hover:text-[var(--color-primary)] min-w-[180px]">
                    {rec.title}
                    <ArrowUpRight size={13} />
                  </a>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.rules.map(id => {
                      const rule = ruleById.get(id)
                      if (!rule) return null
                      return (
                        <span key={id} title={rule.consequence}
                          className={`px-2 py-0.5 rounded-md text-[11.5px] border ${SEVERITY_STYLE[rule.severity].chip}`}>
                          {rule.title}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Summary({ value, label, tone }: { value: number; label: string; tone: Severity }) {
  return (
    <div className={`inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-xl border ${SEVERITY_STYLE[tone].chip}`}>
      <span className="text-[17px] font-semibold tabular-nums">{value}</span>
      <span className="text-[12.5px]">{label}</span>
    </div>
  )
}
