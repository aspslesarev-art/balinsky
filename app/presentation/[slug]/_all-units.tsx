'use client'

import { useMemo, useState } from 'react'
import { BedDouble } from 'lucide-react'
import { LinkMenu } from './_link-menu'

const PUBLIC_ORIGIN = 'https://presentation.estate'

export type UnitForFilter = {
  id: string
  slug: string
  kind: 'villa' | 'apartment'
  title: string
  bedrooms: number | null
  area: number | null
  priceUsd: number | null
  floor: string | null
  photo: string | null
  project: string
  district: string | null
}

const chip = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-[12.5px] border transition-colors ${
    active
      ? 'bg-[#1F8B5F] text-white border-[#1F8B5F]'
      : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#1F8B5F]'
  }`

export function AllUnitsView({
  units, commissionPct,
}: {
  units: UnitForFilter[]
  commissionPct: number | null
}) {
  const [kind, setKind] = useState<'all' | 'villa' | 'apartment'>('all')
  const [br, setBr] = useState<number | null>(null)
  const [project, setProject] = useState<string>('all')
  const [priceMax, setPriceMax] = useState<string>('')

  const projects = useMemo(
    () => Array.from(new Set(units.map(u => u.project))).sort(),
    [units],
  )
  const priceMaxNum = priceMax ? Number(priceMax.replace(/[^\d]/g, '')) : null

  const filtered = useMemo(() => {
    return units.filter(u => {
      if (kind !== 'all' && u.kind !== kind) return false
      if (br != null) {
        if (br < 4 && u.bedrooms !== br) return false
        if (br === 4 && (u.bedrooms == null || u.bedrooms < 4)) return false
      }
      if (project !== 'all' && u.project !== project) return false
      if (priceMaxNum != null && Number.isFinite(priceMaxNum) && priceMaxNum > 0) {
        if (u.priceUsd == null || u.priceUsd > priceMaxNum) return false
      }
      return true
    }).sort((a, b) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity))
  }, [units, kind, br, project, priceMaxNum])

  return (
    <div>
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 mb-5 space-y-3">
        <div>
          <div className="text-[11.5px] uppercase tracking-wide text-[#6B7280] mb-1.5">Тип</div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setKind('all')} className={chip(kind === 'all')}>Все</button>
            <button type="button" onClick={() => setKind('villa')} className={chip(kind === 'villa')}>Виллы</button>
            <button type="button" onClick={() => setKind('apartment')} className={chip(kind === 'apartment')}>Апартаменты</button>
          </div>
        </div>
        <div>
          <div className="text-[11.5px] uppercase tracking-wide text-[#6B7280] mb-1.5">Спальни</div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setBr(null)} className={chip(br == null)}>Любые</button>
            {[1, 2, 3].map(n => (
              <button key={n} type="button" onClick={() => setBr(n)} className={chip(br === n)}>{n}</button>
            ))}
            <button type="button" onClick={() => setBr(4)} className={chip(br === 4)}>4+</button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[11.5px] uppercase tracking-wide text-[#6B7280] mb-1.5">Проект</div>
            <select
              value={project}
              onChange={e => setProject(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#1F8B5F]"
            >
              <option value="all">Все проекты</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[11.5px] uppercase tracking-wide text-[#6B7280] mb-1.5">Цена до, USD</div>
            <input
              type="text"
              inputMode="numeric"
              value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              placeholder="например, 500000"
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#1F8B5F]"
            />
          </div>
        </div>
        <div className="text-[12px] text-[#6B7280] pt-1">
          Найдено: <b className="text-[#111827]">{filtered.length}</b> из {units.length}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-8 text-center text-[14px] text-[#6B7280]">
          По выбранным фильтрам юнитов нет.
        </div>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(u => {
            const commissionAmount = commissionPct != null && u.priceUsd != null
              ? Math.round(u.priceUsd * commissionPct / 100)
              : null
            return (
              <li key={u.id}>
                <LinkMenu
                  url={`${PUBLIC_ORIGIN}/unit/${u.id}`}
                  className="block w-full text-left bg-white border border-[#E5E7EB] hover:border-[#1F8B5F] rounded-xl overflow-hidden text-[#111827]"
                >
                  {u.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.photo} alt={u.title} className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF]">
                      <BedDouble size={22} />
                    </div>
                  )}
                  <div className="p-2.5">
                    <div className="text-[11px] text-[#6B7280] mb-0.5 truncate">{u.project}</div>
                    <div className="text-[12px] text-[#374151] mb-1 flex items-center gap-1 flex-wrap">
                      <span>{u.kind === 'villa' ? 'Вилла' : 'Апарт.'}</span>
                      {u.bedrooms != null && <span>· {u.bedrooms} BR</span>}
                      {u.area != null && <span>· {u.area} м²</span>}
                      {u.floor && <span>· эт. {u.floor}</span>}
                    </div>
                    {u.priceUsd != null && (
                      <div className="text-[13px] font-semibold text-[#16A34A]">
                        ${u.priceUsd.toLocaleString('en-US')}
                      </div>
                    )}
                    {commissionPct != null && (
                      <div className="text-[11px] text-[#6B7280] mt-0.5">
                        Комиссия {commissionPct}%
                        {commissionAmount != null && <> · <span className="font-semibold text-[#1F8B5F]">${commissionAmount.toLocaleString('en-US')}</span></>}
                      </div>
                    )}
                  </div>
                </LinkMenu>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
