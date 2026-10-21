// Фон страницы /pro: панель аналитики виллы, размытая под окном входа, —
// чтобы было видно, что за входом графики и цифры (владелец 21.10.2026,
// «как у AirDNA»). Только декор: aria-hidden, без ссылок и текста для
// чтения. Цифры настоящие: Premier Umalas Villas (доходность 7,5 / 11,5 /
// 16,6% посуточно и 3,0 / 4,7 / 6,5% помесячно, 83% ночей у соседей),
// медианы цены за ночь на Airbnb в Чангу по спальням (69 / 141 / 182 /
// 275 / 561 $, 21.10.2026), рядом 48 объектов Booking и 24 Airbnb.

const CARD = 'rounded-2xl border border-[var(--color-border)] bg-white'

function Bars({ values, max, tones }: { values: number[]; max: number; tones: string[] }) {
  return (
    <div className="flex flex-1 items-end gap-4 border-b border-[var(--color-border)] px-4">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-md" style={{ height: `${(v / max) * 100}%`, background: tones[i] }} />
      ))}
    </div>
  )
}

const DOTS: [number, number, 'b' | 'a'][] = [
  [14, 22, 'b'], [26, 34, 'a'], [40, 26, 'b'], [52, 44, 'b'], [32, 56, 'a'], [66, 36, 'b'],
  [72, 62, 'a'], [55, 72, 'b'], [22, 76, 'b'], [84, 22, 'a'], [80, 80, 'b'], [12, 48, 'a'],
]

export function ProBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex select-none flex-col overflow-hidden blur-[6px]">
      <div className="flex h-[72px] items-center gap-8 border-b border-[var(--color-border)] bg-white px-6 md:px-[104px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="h-10 w-10" />
        <div className="flex-1" />
        <div className="hidden gap-8 text-[16px] font-medium md:flex"><span>Villas</span><span>Apartments</span><span>Residential complexes</span></div>
        <div className="flex-1" />
        <div className="h-8 w-14 rounded-full bg-[var(--color-primary)]" />
      </div>

      <div className="grid flex-1 grid-cols-2 gap-4 px-6 py-8 md:grid-cols-4 md:px-[104px] [grid-auto-rows:120px] md:[grid-template-rows:120px_minmax(300px,1fr)_minmax(300px,1fr)]">
        {[
          ['Yield a year', '11.5%', true],
          ['Nights booked nearby', '83%', false],
          ['Pays back in', '9 yrs', false],
          ['Safety check', 'No risks', true],
        ].map(([label, value, green]) => (
          <div key={label as string} className={`${CARD} flex flex-col gap-2 p-5`}>
            <span className="text-[14px] text-[var(--color-text-muted)]">{label}</span>
            <span className={`font-semibold text-[34px] md:text-[40px] tracking-tight ${green ? 'text-[var(--color-primary-pressed)]' : ''}`}>{value}</span>
          </div>
        ))}

        <div className={`${CARD} col-span-2 row-span-2 flex flex-col gap-4 p-6 md:row-span-1`}>
          <span className="text-[16px] font-semibold">Nightly rate by bedrooms, Canggu</span>
          <Bars values={[69, 141, 182, 275, 561]} max={600} tones={['#9FD3B8', '#6DBD95', '#45A877', '#2A9563', '#17704C']} />
          <div className="flex gap-4 px-4 text-[13px] text-[var(--color-text-muted)]">
            {['1 BR', '2 BR', '3 BR', '4 BR', '5 BR'].map(x => <span key={x} className="flex-1 text-center">{x}</span>)}
          </div>
        </div>

        <div className={`${CARD} row-span-2 flex flex-col gap-4 p-6 md:row-span-1`}>
          <span className="text-[16px] font-semibold">Listings nearby</span>
          <div className="flex flex-1 items-center justify-center">
            <div className="flex h-[150px] w-[150px] items-center justify-center rounded-full" style={{ background: 'conic-gradient(#1F8B5F 0 67%, #E08A3C 67% 100%)' }}>
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-[28px] font-semibold">72</div>
            </div>
          </div>
          <div className="flex justify-center gap-4 text-[13px] text-[var(--color-text-muted)]"><span>Booking 48</span><span>Airbnb 24</span></div>
        </div>

        <div className="relative row-span-2 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[#DCEBE6] md:row-span-1">
          {DOTS.map(([x, y, s], i) => (
            <span key={i} className="absolute h-2.5 w-2.5 rounded-full" style={{ left: `${x}%`, top: `${y}%`, background: s === 'b' ? '#1F8B5F' : '#E08A3C' }} />
          ))}
          <span className="absolute left-[44%] top-[46%] h-6 w-6 rounded-full border-4 border-white bg-[var(--color-text)]" />
        </div>

        <div className={`${CARD} col-span-2 row-span-2 flex flex-col gap-4 p-6 md:row-span-1`}>
          <span className="text-[16px] font-semibold">Yield a year: low, typical, high</span>
          <div className="flex flex-1 items-end gap-12 border-b border-[var(--color-border)] px-6">
            {[[7.5, 3.0, '#6DBD95'], [11.5, 4.7, '#2A9563'], [16.6, 6.5, '#17704C']].map(([d, m, c], i) => (
              <div key={i} className="flex h-full flex-1 items-end gap-2">
                <div className="flex-1 rounded-t-md" style={{ height: `${((d as number) / 18) * 100}%`, background: c as string }} />
                <div className="flex-1 rounded-t-md bg-[#B3BFB9]" style={{ height: `${((m as number) / 18) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="flex gap-12 px-6 text-[13px] text-[var(--color-text-muted)]">
            {['Low', 'Typical', 'High'].map(x => <span key={x} className="flex-1 text-center">{x}</span>)}
          </div>
        </div>

        <div className={`${CARD} col-span-2 row-span-2 flex flex-col gap-3 p-6 md:row-span-1`}>
          <span className="text-[16px] font-semibold">Is it safe?</span>
          {[
            ['Building permit', 100, '#1F8B5F'],
            ['Land lease', 100, '#1F8B5F'],
            ['Flood risk', 20, '#1F8B5F'],
            ['Landslide risk', 12, '#1F8B5F'],
            ['Developer track', 70, '#E08A3C'],
          ].map(([label, w, c]) => (
            <div key={label as string} className="flex items-center gap-3">
              <span className="w-[120px] text-[14px] text-[var(--color-text-muted)]">{label}</span>
              <div className="h-2.5 flex-1 rounded-full bg-[#E8EDEA]">
                <div className="h-2.5 rounded-full" style={{ width: `${w}%`, background: c as string }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
