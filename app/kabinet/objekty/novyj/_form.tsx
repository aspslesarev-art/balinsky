'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

// Форма добавления объекта. Логика шагов простая: тип → ЖК → юнит → цена.
// Если юнит уже есть в каталоге, агент не переписывает его характеристики —
// они подтягиваются и показываются как есть, редактируются только цена и
// комментарий. Так одна и та же вилла не обрастает тремя разными описаниями.

type Kind = 'villa' | 'apartment'
type ComplexOption = { id: string; name: string; district: string | null }
type UnitOption = { id: string; title: string; rooms: number | null; area: number | null; priceUsd: number | null }
type UnitFacts = { title: string; data: Record<string, unknown>; photos: string[]; priceUsd: number | null }

const INPUT =
  'mt-1 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none focus:border-[var(--color-primary)]'
const LABEL = 'text-[14px] font-medium text-[#111827]'
const CARD = 'rounded-2xl border border-[var(--color-border)] bg-white p-5'

const STATUSES = ['Строится', 'Построен', 'Под заказ']

export default function NewListingForm() {
  const router = useRouter()

  const [kind, setKind] = useState<Kind>('villa')
  const [query, setQuery] = useState('')
  const [allComplexes, setAllComplexes] = useState<ComplexOption[]>([])
  const [listOpen, setListOpen] = useState(false)
  const [complex, setComplex] = useState<ComplexOption | null>(null)
  const [noComplex, setNoComplex] = useState(false)

  const [units, setUnits] = useState<UnitOption[]>([])
  const [unitsLoading, setUnitsLoading] = useState(false)
  const [baseUnitId, setBaseUnitId] = useState<string | null>(null)
  const [facts, setFacts] = useState<UnitFacts | null>(null)

  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [comment, setComment] = useState('')
  const [manual, setManual] = useState<Record<string, string>>({})

  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Весь список ЖК тянем один раз и фильтруем на месте: их две сотни, это
  // пара десятков килобайт, зато список открывается мгновенно и работает как
  // выбор из готового перечня, а не только как поиск по угаданным буквам.
  useEffect(() => {
    let alive = true
    fetch('/api/kabinet/catalog?what=complexes')
      .then(r => r.json())
      .then(j => { if (alive && Array.isArray(j.complexes)) setAllComplexes(j.complexes) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const complexes = useMemo(() => {
    const term = query.trim().toLowerCase()
    const base = term && complex?.name.toLowerCase() !== term
      ? allComplexes.filter(c => c.name.toLowerCase().includes(term))
      : allComplexes
    return base.slice(0, 60)
  }, [allComplexes, query, complex])

  const pickComplex = useCallback(async (c: ComplexOption) => {
    setComplex(c); setListOpen(false); setQuery(c.name)
    setUnits([]); setBaseUnitId(null); setFacts(null); setUnitsLoading(true)
    try {
      const r = await fetch(`/api/kabinet/catalog?what=units&kind=${kind}&complexId=${encodeURIComponent(c.id)}`)
      const j = await r.json()
      setUnits(Array.isArray(j.units) ? j.units : [])
    } catch { setUnits([]) } finally { setUnitsLoading(false) }
  }, [kind])

  const pickUnit = useCallback(async (u: UnitOption) => {
    setBaseUnitId(u.id); setError(null)
    try {
      const r = await fetch(`/api/kabinet/catalog?what=unit&kind=${kind}&id=${encodeURIComponent(u.id)}`)
      const j = await r.json()
      if (j.facts) {
        setFacts(j.facts as UnitFacts)
        setTitle((j.facts as UnitFacts).title)
        if (!price && (j.facts as UnitFacts).priceUsd) setPrice(String((j.facts as UnitFacts).priceUsd))
      }
    } catch { setFacts(null) }
  }, [kind, price])

  const resetUnit = () => { setBaseUnitId(null); setFacts(null); setTitle('') }

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true); setError(null)
    try {
      for (const file of Array.from(files).slice(0, 20 - photos.length)) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('kind', kind)
        const r = await fetch('/api/kabinet/photos', { method: 'POST', body: fd })
        const j = await r.json()
        if (!r.ok) { setError(j.error ?? 'Не удалось загрузить фото'); break }
        setPhotos(prev => [...prev, j.url])
      }
    } finally { setUploading(false) }
  }

  const submit = async () => {
    setError(null)
    const priceNum = Number(price.replace(/[^\d.]/g, ''))
    if (!Number.isFinite(priceNum) || priceNum <= 0) { setError('Укажите цену в долларах'); return }
    if (!title.trim() || title.trim().length < 4) { setError('Укажите название объекта'); return }

    const data: Record<string, unknown> = {}
    if (!baseUnitId) {
      if (manual.rooms) data['Комнаты'] = Number(manual.rooms)
      if (manual.area) data['Площадь'] = Number(manual.area)
      if (manual.land) data[kind === 'villa' ? 'Земля' : 'Этаж'] = kind === 'villa' ? Number(manual.land) : manual.land
      if (manual.district) data['Location 2'] = manual.district
      if (manual.leasehold) data['Leasehold'] = manual.leasehold
      if (manual.status) data['Статус'] = manual.status
      if (manual.year) data['Year of completion'] = manual.year
      if (complex) data['Комплекс 1'] = complex.name
    }

    setSaving(true)
    try {
      const r = await fetch('/api/kabinet/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          complexId: complex?.id ?? null,
          baseUnitId,
          title: title.trim(),
          priceUsd: priceNum,
          comment: comment.trim() || null,
          data,
          photos,
        }),
      })
      const j = await r.json()
      if (!r.ok) { setError(j.error ?? 'Не удалось сохранить объект'); return }
      router.push(`/ru/pereprodazha/o/${j.slug}`)
    } catch {
      setError('Сеть недоступна. Попробуйте ещё раз.')
    } finally { setSaving(false) }
  }

  const showManualFields = !baseUnitId

  return (
    <div className="space-y-5">
      {/* 1. тип */}
      <section className={CARD}>
        <p className={LABEL}>Тип объекта</p>
        <div className="mt-3 flex gap-3">
          {(['villa', 'apartment'] as Kind[]).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => { setKind(k); setUnits([]); resetUnit() }}
              className={`rounded-xl border px-5 py-2.5 text-[15px] ${
                kind === k
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border)] bg-white text-[#111827]'
              }`}
            >
              {k === 'villa' ? 'Вилла' : 'Апартаменты'}
            </button>
          ))}
        </div>
      </section>

      {/* 2. ЖК */}
      <section className={CARD}>
        <label className={LABEL} htmlFor="complex">Жилой комплекс</label>
        {noComplex ? (
          <p className="mt-2 text-[15px] text-[var(--color-text-muted)]">
            Объект вне комплекса.{' '}
            <button type="button" className="underline" onClick={() => setNoComplex(false)}>Выбрать комплекс</button>
          </p>
        ) : (
          <>
            <input
              id="complex"
              className={INPUT}
              placeholder={allComplexes.length ? `Выберите из списка (${allComplexes.length}) или начните вводить` : 'Загружаю список комплексов…'}
              value={query}
              onFocus={() => setListOpen(true)}
              onChange={e => { setQuery(e.target.value); setListOpen(true); setComplex(null); setUnits([]); resetUnit() }}
              autoComplete="off"
            />
            {listOpen && complexes.length > 0 && (
              <ul className="mt-2 max-h-72 divide-y divide-[var(--color-border)] overflow-y-auto rounded-xl border border-[var(--color-border)]">
                {complexes.map(c => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pickComplex(c)}
                      className="w-full px-4 py-2.5 text-left text-[15px] hover:bg-[#f9fafb]"
                    >
                      {c.name}
                      {c.district && <span className="text-[var(--color-text-muted)]"> · {c.district}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="mt-3 text-[14px] text-[var(--color-text-muted)] underline"
              onClick={() => { setNoComplex(true); setComplex(null); setUnits([]); resetUnit() }}
            >
              Объект без жилого комплекса
            </button>
          </>
        )}
      </section>

      {/* 3. юнит */}
      {complex && (
        <section className={CARD}>
          <p className={LABEL}>Юнит в «{complex.name}»</p>
          {unitsLoading && <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">Загружаю юниты…</p>}
          {!unitsLoading && units.length === 0 && (
            <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
              В каталоге нет юнитов этого комплекса — заполните характеристики ниже.
            </p>
          )}
          {units.length > 0 && (
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {units.map(u => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => pickUnit(u)}
                    className={`w-full rounded-xl border px-4 py-2.5 text-left text-[14px] ${
                      baseUnitId === u.id
                        ? 'border-[var(--color-primary)] bg-[#f0f9ff]'
                        : 'border-[var(--color-border)] hover:bg-[#f9fafb]'
                    }`}
                  >
                    <span className="font-medium text-[#111827]">{u.title}</span>
                    <span className="block text-[13px] text-[var(--color-text-muted)]">
                      {[u.rooms ? `${u.rooms} спален` : null, u.area ? `${u.area} м²` : null,
                        u.priceUsd ? `от $${u.priceUsd.toLocaleString('en-US')}` : null]
                        .filter(Boolean).join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {baseUnitId && (
            <button type="button" className="mt-3 text-[14px] underline" onClick={resetUnit}>
              Моего юнита здесь нет — заполню сам
            </button>
          )}
        </section>
      )}

      {/* 4. подтянутые факты */}
      {facts && (
        <section className={CARD}>
          <p className={LABEL}>Характеристики из каталога</p>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Подставлены автоматически — менять их не нужно, вы указываете только цену и комментарий.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[14px] sm:grid-cols-3">
            {Object.entries(facts.data).slice(0, 12).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12px] text-[var(--color-text-muted)]">{k}</dt>
                <dd className="text-[#111827]">{String(Array.isArray(v) ? v[0] : v)}</dd>
              </div>
            ))}
          </dl>
          {facts.photos.length > 0 && (
            <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
              Фото из каталога ({facts.photos.length}) подставятся автоматически, если не загрузите свои.
            </p>
          )}
        </section>
      )}

      {/* 5. поля объекта */}
      <section className={CARD}>
        {baseUnitId ? (
          // Юнит выбран из каталога: название и характеристики уже известны,
          // агенту остаётся цена и комментарий. Показывать ему поле названия
          // здесь — предлагать переписать то, что и так верно.
          <p className="text-[15px] text-[#111827]">
            <span className="text-[13px] text-[var(--color-text-muted)]">Объект</span>
            <br />
            {title}
          </p>
        ) : (
          <div>
            <label className={LABEL} htmlFor="title">Название объекта</label>
            <input id="title" className={INPUT} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Например: Вилла Amara, 3 спальни, Чангу" />
          </div>
        )}

        {showManualFields && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="rooms">Спальни</label>
              <input id="rooms" inputMode="numeric" className={INPUT} value={manual.rooms ?? ''}
                onChange={e => setManual(m => ({ ...m, rooms: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL} htmlFor="area">Площадь, м²</label>
              <input id="area" inputMode="numeric" className={INPUT} value={manual.area ?? ''}
                onChange={e => setManual(m => ({ ...m, area: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL} htmlFor="land">{kind === 'villa' ? 'Участок, м²' : 'Этаж'}</label>
              <input id="land" className={INPUT} value={manual.land ?? ''}
                onChange={e => setManual(m => ({ ...m, land: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL} htmlFor="district">Район</label>
              <input id="district" className={INPUT} placeholder="Canggu, Ubud, Bukit…" value={manual.district ?? ''}
                onChange={e => setManual(m => ({ ...m, district: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL} htmlFor="leasehold">Leasehold, лет</label>
              <input id="leasehold" inputMode="numeric" className={INPUT} value={manual.leasehold ?? ''}
                onChange={e => setManual(m => ({ ...m, leasehold: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL} htmlFor="status">Статус</label>
              <select id="status" className={INPUT} value={manual.status ?? ''}
                onChange={e => setManual(m => ({ ...m, status: e.target.value }))}>
                <option value="">—</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="year">Год сдачи</label>
              <input id="year" inputMode="numeric" className={INPUT} placeholder="2027" value={manual.year ?? ''}
                onChange={e => setManual(m => ({ ...m, year: e.target.value }))} />
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className={LABEL} htmlFor="price">Цена, $</label>
          <input id="price" inputMode="numeric" className={INPUT} value={price}
            onChange={e => setPrice(e.target.value)} placeholder="350000" />
        </div>

        <div className="mt-4">
          <label className={LABEL} htmlFor="comment">Комментарий</label>
          <textarea id="comment" rows={4} className={INPUT} value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Условия сделки, что важно знать покупателю, срок актуальности цены" />
        </div>
      </section>

      {/* 6. фото */}
      <section className={CARD}>
        <p className={LABEL}>Фотографии — необязательно</p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          {facts
            ? 'Фото объекта уже есть в каталоге и подставятся сами. Свои можно добавить, если они лучше.'
            : 'JPG, PNG или WebP, до 8 МБ каждая. Без фото карточка тоже опубликуется, просто будет выглядеть скромнее.'}
        </p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={uploading || photos.length >= 20}
          onChange={e => uploadPhotos(e.target.files)}
          className="mt-3 block w-full text-[14px]"
        />
        {uploading && <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">Загружаю…</p>}
        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {photos.map(u => (
              <div key={u} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-20 w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos(p => p.filter(x => x !== u))}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-[12px] text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-900">{error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="w-full rounded-xl bg-[var(--color-primary)] px-6 py-3.5 text-[15px] font-semibold text-white disabled:opacity-60 sm:w-auto"
      >
        {saving ? 'Сохраняю…' : 'Опубликовать объект'}
      </button>
    </div>
  )
}
