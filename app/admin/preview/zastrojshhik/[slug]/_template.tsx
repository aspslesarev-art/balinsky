// Renders the "Urban Escape" developer-page design (handoff 2026-07-30) from
// real Supabase data. Preview-only — see ./page.tsx for the admin gate.

import Link from 'next/link'
import { ScrollRow } from '@/components/preview/ScrollRow'
import { ProjectCard } from '@/components/preview/ProjectCard'
import { ComplexGallery } from '@/components/preview/ComplexGallery'
import { NearbyGoogleMap } from '@/components/preview/NearbyGoogleMap'
import { FaqAccordion } from '@/components/preview/FaqAccordion'
import { DataCoverageHud } from '@/components/preview/DataCoverageHud'
import { compactUsd, fullUsd, plural } from '@/lib/preview/developer-metrics'
import type { DeveloperTemplateData, TplComplex, TplDeveloper } from '@/lib/preview/developer-template'

const MISSING = 'нет в базе'

function Missing({ what }: { what: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 12,
      background: 'rgba(168,51,31,.09)', color: '#a8331f', border: '1px dashed rgba(168,51,31,.4)',
    }}>{what || MISSING}</span>
  )
}


/** Deterministic warm tint per developer, so a logo/placeholder hero still looks intentional. */
function heroTint(seed: string): { from: string; to: string } {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  // Stay inside the sand→gold band of the palette instead of the full wheel.
  const base = 24 + (h % 26)
  return { from: `hsl(${base} 38% 82%)`, to: `hsl(${base + 8} 30% 62%)` }
}

/**
 * The hero image, whatever the developer has. Photo when there is one,
 * otherwise the logo on a tinted plate, otherwise initials — never a broken
 * image and never a flat grey box.
 */
function HeroBackdrop({ dev }: { dev: TplDeveloper }) {
  const tint = heroTint(dev.slug)
  // Sit in the upper third: the lower half of the hero is covered by the
  // cream gradient and the H1, which swallowed a centred logo entirely.
  const plate = {
    position: 'absolute' as const, inset: 0,
    background: `linear-gradient(135deg, ${tint.from} 0%, ${tint.to} 100%)`,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    paddingTop: '9%',
  }

  if (dev.heroKind === 'complex' || dev.heroKind === 'villa') {
    return (
      <div role="img" aria-label={dev.name} style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${JSON.stringify(dev.heroPhoto ?? '').slice(1, -1)})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }} />
    )
  }

  if (dev.heroKind === 'logo' && dev.heroPhoto) {
    return (
      <div style={plate}>
        {/* A white card so light-on-light logos (most of them) still read. */}
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '28px 40px', borderRadius: 18, background: 'rgba(255,255,255,.92)',
          boxShadow: '0 18px 46px rgba(0,0,0,.16)', maxWidth: 'min(440px, 66vw)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dev.heroPhoto} alt={dev.name} style={{
            maxWidth: '100%', maxHeight: 120, objectFit: 'contain', display: 'block',
          }} />
        </span>
      </div>
    )
  }

  const initials = dev.name.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
  return (
    <div style={plate} aria-label={dev.name} role="img">
      <span style={{
        fontSize: 'clamp(96px, 16vw, 200px)', fontWeight: 500, letterSpacing: '-0.05em',
        color: 'rgba(255,255,255,.5)', lineHeight: 1, userSelect: 'none',
      }}>{initials}</span>
    </div>
  )
}

function StatCell({ value, label, first, missing }: { value: string | null; label: string; first?: boolean; missing?: string }) {
  return (
    <div className="stat-cell" style={{
      padding: first ? '28px 32px 28px 0' : '28px 32px',
      borderLeft: first ? undefined : '1px solid var(--color-divider)',
    }}>
      {value
        ? <div style={{ fontSize: 44, fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--color-accent)' }}>{value}</div>
        : <div style={{ fontSize: 20, paddingTop: 12 }}><Missing what={missing ?? MISSING} /></div>}
      <p className="muted" style={{ margin: '8px 0 0', fontSize: 15 }}>{label}</p>
    </div>
  )
}


/**
 * The complex fact line, under the heading rather than opposite it. Missing
 * values are shown as explicit gaps instead of quietly shortening the line —
 * the whole point of the preview is to see which data is absent.
 */
function ComplexFacts({ c }: { c: TplComplex }) {
  const facts: { label: string; value: string | null }[] = [
    { label: 'юнитов', value: c.unitsCount ? String(c.unitsCount) : null },
    { label: 'цена от', value: c.priceFromUsd ? fullUsd(c.priceFromUsd) : null },
    { label: c.status === 'completed' ? 'сдан' : 'сдача', value: c.handoverYear },
    { label: 'разрешение', value: c.permit && c.permit !== 'нет' ? c.permit : null },
    { label: 'построено', value: c.progressPct != null ? `${c.progressPct}%` : null },
  ]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px', marginTop: 14, fontSize: 16 }}>
      {facts.map(f => (
        <span key={f.label} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 7 }}>
          <span className="muted" style={{ fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase' }}>{f.label}</span>
          {f.value
            ? <span>{f.value}</span>
            : <span style={{ color: '#a8331f', opacity: .75, fontSize: 14 }}>нет данных</span>}
        </span>
      ))}
    </div>
  )
}

function ComplexDetail({ c, mapsKey }: { c: TplComplex; mapsKey: string }) {
  return (
    <section id={c.slug} className="uesection" style={{ paddingTop: 112 }}>
      <h2 className="uehead">{c.name}</h2>
      <ComplexFacts c={c} />

      {c.lede
        ? <p className="muted" style={{ margin: '16px 0 0', fontSize: 20, maxWidth: '62ch', lineHeight: 1.55 }}>{c.lede}</p>
        : <p style={{ margin: '16px 0 0' }}><Missing what="описания комплекса нет в базе" /></p>}

      {/* The bar only says something when there is a percentage; the fact row
          above already carries the "нет данных" case. */}
      {c.progressPct != null && (
        <div style={{ marginTop: 28, maxWidth: 520 }}>
          <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span>Готовность строительства{c.handoverYear ? ` · сдача ${c.handoverYear}` : ''}</span>
            <span>{c.progressPct}%</span>
          </div>
          <div style={{ marginTop: 8, height: 4, background: 'var(--color-divider)' }}>
            <div style={{ width: `${c.progressPct}%`, height: '100%', background: 'var(--color-accent)' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginTop: 24 }}>
        <a href="#contacts" className="cta cta-sm">Консультация по {c.name} <span className="cta-arrow">→</span></a>
        <Link href={c.url} style={{ fontSize: 15 }}>Страница комплекса →</Link>
      </div>

      <ComplexGallery photos={c.photos} name={c.name} />

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, marginTop: 56, position: 'relative' }}>
        <div className="vrule" style={{ position: 'absolute', left: 'calc(50% - 0.5px)', top: 0, bottom: 0, width: 1, background: 'var(--color-divider)' }} />
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 24 }}>Юниты и цены</h3>
          {c.units.length ? (
            <>
              <table className="uetable" style={{ marginTop: 20, fontSize: 16 }}>
                <thead><tr><th>Тип</th><th>Спален</th><th>Дом</th><th>Участок</th><th>Цена</th></tr></thead>
                <tbody>
                  {c.units.map((u, i) => (
                    <tr key={i} style={{ opacity: u.sold ? 0.5 : 1 }}>
                      <td>{u.name ? `${u.type} ${u.name}` : u.type}</td>
                      <td>{u.bedrooms ?? '—'}</td>
                      <td>{u.houseM2 ? `${u.houseM2} м²` : '—'}</td>
                      <td>{u.landM2 ? `${u.landM2} м²` : '—'}</td>
                      <td>{u.sold ? 'продана' : fullUsd(u.priceUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted" style={{ margin: '18px 0 0', fontSize: 16 }}>
                {c.unitsCount && c.unitsCount > c.units.length
                  ? `В каталоге ${c.units.length} из ${c.unitsCount} юнитов — остальные не заведены или проданы.`
                  : `${c.units.length} ${plural(c.units.length, 'юнит', 'юнита', 'юнитов')} в продаже.`}
              </p>
            </>
          ) : (
            <p style={{ marginTop: 20 }}><Missing what="юниты комплекса не заведены как листинги вилл" /></p>
          )}
          {c.paymentPlan.length > 0 && (
            <p className="muted" style={{ margin: '14px 0 0', fontSize: 16 }}>
              Оплата по этапам: {c.paymentPlan.join(' / ')}%
            </p>
          )}
          {c.leaseYears && (
            <p className="muted" style={{ margin: '8px 0 0', fontSize: 16 }}>
              Земля в лизхолде на {c.leaseYears} {plural(c.leaseYears, 'год', 'года', 'лет')}
              {c.permit && c.permit !== 'нет' ? ` · разрешение ${c.permit}` : ''}
            </p>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 24 }}>Что рядом</h3>
          {c.geo && c.pois.length
            ? <NearbyGoogleMap center={c.geo} pois={c.pois} title={c.name} photo={c.photos[0] ?? null} apiKey={mapsKey} />
            : <p style={{ marginTop: 20 }}><Missing what={c.geo ? 'POI рядом не собраны для этого комплекса' : 'координат комплекса нет'} /></p>}
        </div>
      </div>
    </section>
  )
}

function CompletedDetail({ c }: { c: TplComplex }) {
  const beds = c.units.map(u => u.bedrooms).filter((n): n is number => !!n)
  const areas = c.units.map(u => u.houseM2).filter((n): n is number => !!n)
  return (
    <section id={c.slug} className="uesection" style={{ paddingTop: 112 }}>
      <h2 className="uehead">{c.name}: уже сдан</h2>
      {c.lede && <p className="muted" style={{ margin: '16px 0 0', fontSize: 20, maxWidth: '62ch', lineHeight: 1.55 }}>{c.lede}</p>}
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 44 }}>
        <div>
          <div style={{ fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--color-accent)' }}>
            {c.unitsCount ?? '—'}
          </div>
          <p className="muted" style={{ margin: '12px 0 0', fontSize: 16, maxWidth: '24ch' }}>
            {plural(c.unitsCount ?? 0, 'юнит в комплексе', 'юнита в комплексе', 'юнитов в комплексе')}
          </p>
        </div>
        <div className="stat-cell" style={{ borderLeft: '1px solid var(--color-divider)', paddingLeft: 36 }}>
          <div style={{ fontSize: 24, paddingTop: 18 }}><Missing what="sold_pct — нет в базе" /></div>
          <p className="muted" style={{ margin: '12px 0 0', fontSize: 16, maxWidth: '24ch' }}>
            в дизайне здесь «100% продано»
          </p>
        </div>
        <div className="stat-cell" style={{ borderLeft: '1px solid var(--color-divider)', paddingLeft: 36 }}>
          <div style={{ fontSize: 24, paddingTop: 18 }}><Missing what="occupancy_pct — нет в базе" /></div>
          <p className="muted" style={{ margin: '12px 0 0', fontSize: 16, maxWidth: '24ch' }}>
            в дизайне здесь «85% загрузки»
          </p>
        </div>
      </div>
      <div style={{ marginTop: 44, paddingTop: 20, borderTop: '1px solid var(--color-divider)' }}>
        <p className="muted" style={{ margin: 0, fontSize: 17 }}>
          {c.handoverYear ? `Сдан в ${c.handoverYear} году. ` : ''}
          {beds.length ? `${Math.min(...beds)}–${Math.max(...beds)} спален, ` : ''}
          {areas.length ? `${Math.min(...areas)}–${Math.max(...areas)} м². ` : ''}
          Таймлайна вех строительства в базе нет — блок дизайна остаётся пустым.
        </p>
      </div>
    </section>
  )
}

export function DeveloperTemplate({ data, allDevelopers, mapsKey }: {
  data: DeveloperTemplateData
  allDevelopers: { slug: string; name: string; complexes: number }[]
  mapsKey: string
}) {
  const { dev, complexes, managers, videos, news, events, promos, faq, gaps } = data
  const building = complexes.filter(c => c.status === 'building')
  const completed = complexes.filter(c => c.status === 'completed')
  const m = dev.metrics

  return (
    <div className="uetpl" style={{ minHeight: '100vh' }}>
      {/* Preview-only switcher: lets one page be checked against many developers. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', fontSize: 13,
        background: '#201f1d', color: '#f5f0e6', flexWrap: 'wrap',
      }}>
        <strong style={{ fontWeight: 500 }}>Прототип шаблона застройщика</strong>
        <span style={{ opacity: 0.6 }}>не индексируется, публичных ссылок нет</span>
        <Link href="/admin/preview/zastrojshhik" style={{ marginLeft: 'auto', color: '#e9d6b1' }}>все застройщики</Link>
        <PreviewNav current={dev.slug} list={allDevelopers} />
      </div>

      <nav style={{
        position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 24, padding: '14px 48px',
        background: 'color-mix(in srgb, var(--color-bg) 92%, transparent)',
        backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--color-divider)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <span style={{ fontSize: 20, fontWeight: 500 }}>Balinsky</span>
          <div className="muted uenav-links" style={{ display: 'flex', gap: 28, fontSize: 15 }}>
            <span>Виллы и дома</span><span>Апартаменты</span><span>Жилые комплексы</span>
            <span style={{ color: 'var(--color-accent-700)', borderBottom: '1px solid var(--color-accent)', paddingBottom: 2 }}>Застройщики</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14 }}>
          {/* Inert in the prototype — the real header owns these controls. */}
          <span style={{ position: 'relative', fontSize: 18, color: 'var(--color-accent-700)' }}>♡</span>
          <span style={{ border: '1px solid var(--color-divider)', borderRadius: 999, padding: '6px 14px' }}>USD ▾</span>
          <span style={{ border: '1px solid var(--color-divider)', borderRadius: 999, padding: '6px 14px' }}>RU ▾</span>
          <a href="#contacts" className="cta cta-sm">Оставить заявку <span className="cta-arrow">→</span></a>
        </div>
      </nav>

      {/* ---- hero */}
      <header style={{ position: 'relative', height: '82vh', minHeight: 560, overflow: 'hidden' }}>
        <HeroBackdrop dev={dev} />
        {/* The handoff's overlay assumed a bright photo: it is only ~55% cream at
            36% height, which is exactly where the H1 sits, so dark text over a
            dark render became unreadable. Kept the same idea (photo dissolving
            into the page) but made the base under the text block opaque. */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top,'
            + ' color-mix(in srgb, var(--color-bg) 99%, transparent) 0%,'
            + ' color-mix(in srgb, var(--color-bg) 97%, transparent) 34%,'
            + ' color-mix(in srgb, var(--color-bg) 88%, transparent) 56%,'
            + ' color-mix(in srgb, var(--color-bg) 45%, transparent) 72%,'
            + ' transparent 88%)',
        }} />
        <div className="glass" style={{
          position: 'absolute', top: 24, left: 48, display: 'flex', gap: 8, padding: '9px 16px',
          borderRadius: 999, fontSize: 13, color: 'color-mix(in srgb, var(--color-text) 62%, transparent)',
        }}>
          <span>Главная</span><span>/</span><span>Застройщики</span><span>/</span>
          <span style={{ color: 'var(--color-text)' }}>{dev.name}</span>
        </div>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 48px 56px',
          maxWidth: 1160, margin: '0 auto', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(40px, 7vw, 92px)', fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1.02 }}>
            {dev.name}
          </h1>
          {dev.tagline && (
            <p style={{ margin: 0, fontSize: 22, color: 'color-mix(in srgb, var(--color-text) 80%, transparent)', maxWidth: '48ch' }}>
              {dev.tagline}
            </p>
          )}
          {/* One line, per the handoff: districts that don't fit are clipped and
              scrollable here — the full list lives in "О застройщике" below. */}
          {(dev.projectsForSale + dev.completedCount + dev.unitsTotal > 0) && <div className="glass" style={{
            display: 'flex', flexWrap: 'nowrap', gap: '0 26px', alignItems: 'baseline',
            fontSize: 17, padding: '16px 24px', borderRadius: 999, width: 'fit-content',
            maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap',
          }}>
            <span>{dev.projectsForSale} {plural(dev.projectsForSale, 'проект', 'проекта', 'проектов')} в продаже</span>
            <span style={{ color: 'var(--color-accent)' }}>·</span>
            <span>{dev.completedCount} сдан{dev.completedCount === 1 ? '' : 'о'}</span>
            <span style={{ color: 'var(--color-accent)' }}>·</span>
            <span>{dev.unitsTotal} {plural(dev.unitsTotal, 'юнит', 'юнита', 'юнитов')}</span>
            {dev.districts.length > 0 && <>
              <span style={{ color: 'var(--color-accent)' }}>·</span>
              <span className="districts" title={dev.districts.join(', ')}>Районы: {dev.districts.join(' · ')}</span>
            </>}
          </div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <a href="#contacts" className="cta">Оставить заявку <span className="cta-arrow">→</span></a>
            <span className="muted" style={{ fontSize: 15 }}>Ответим в течение дня</span>
          </div>
        </div>
      </header>

      {/* ---- managers */}
      <section className="uesection" style={{ paddingTop: 72 }}>
        <h2 className="uehead">Связаться с менеджерами</h2>
        {managers.length ? (
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginTop: 36 }}>
            {managers.slice(0, 4).map(mg => (
              <div key={mg.id} className="glass glass-hover" style={{
                display: 'flex', alignItems: 'center', gap: 24, padding: '26px 28px',
                borderRadius: 14, flexWrap: 'wrap',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', border: '1px solid var(--color-accent)',
                  color: 'var(--color-accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flex: 'none', overflow: 'hidden',
                  backgroundImage: mg.photo ? `url(${JSON.stringify(mg.photo).slice(1, -1)})` : undefined,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }}>{mg.photo ? '' : (mg.name ?? '?').slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div className="kicker">{mg.regalia || 'Менеджер Balinsky'}</div>
                  <div style={{ fontSize: 21, fontWeight: 500, marginTop: 6 }}>{mg.name}</div>
                </div>
                <a href={mg.whatsapp ?? '#contacts'} className="cta">Оставить заявку <span className="cta-arrow">→</span></a>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ marginTop: 24 }}>
            <Missing what="ни один менеджер не привязан к этому застройщику; отделов застройщика в базе нет вовсе" />
          </p>
        )}
      </section>

      {/* ---- developer stats */}
      <section className="uesection" style={{ paddingTop: 72 }}>
        <div className="grid-4" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid var(--color-divider)', borderBottom: '1px solid var(--color-divider)',
        }}>
          <StatCell first value={m.yearsOnMarket ? `${m.yearsOnMarket} ${plural(m.yearsOnMarket, 'год', 'года', 'лет')}` : null}
            label="на рынке недвижимости Бали" missing="years_on_market" />
          <StatCell value={compactUsd(m.portfolioVolumeUsd)} label="объём текущих проектов" missing="portfolio_volume_usd" />
          <StatCell value={m.unitsUnderConstruction ? String(m.unitsUnderConstruction) : null}
            label="юнитов в строительстве сейчас" missing="units_under_construction" />
          <StatCell value={m.unitsRenting ? String(m.unitsRenting) : null}
            label="юнитов уже сдаётся в аренду" missing="units_renting" />
        </div>
        <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
          Числа распознаны из буллет-текста застройщика ({m.parsedCount}/6) — отдельных числовых полей в базе нет.
        </p>

        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '40px 48px', marginTop: 48 }}>
          {dev.bulletCards.map(card => (
            <div key={card.key}>
              <div className="kicker" style={{ paddingBottom: 14, borderBottom: '1px solid var(--color-accent)' }}>
                {card.icon} {card.title}
              </div>
              {card.items.length ? (
                <ul style={{ margin: '16px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 16 }}>
                  {card.items.map((it, i) => <li key={i}>{it}</li>)}
                </ul>
              ) : <p style={{ marginTop: 16 }}><Missing what="поле пустое" /></p>}
            </div>
          ))}
          <div>
            <div className="kicker" style={{ paddingBottom: 14, borderBottom: '1px solid var(--color-accent)' }}>
              📋 Юридика и финансы
            </div>
            <p style={{ marginTop: 16 }}>
              <Missing what="legal_entity, NIB, источник финансирования — таких полей в базе нет" />
            </p>
          </div>
        </div>
      </section>

      {/* ---- about */}
      <section id="about" className="uesection">
        <h2 className="uehead">О застройщике</h2>
        {dev.description
          ? <p className="muted" style={{ margin: '18px 0 0', fontSize: 21, lineHeight: 1.55, maxWidth: '62ch' }}>{dev.description}</p>
          : <p style={{ marginTop: 18 }}><Missing what="описания застройщика нет" /></p>}
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, marginTop: 48, position: 'relative' }}>
          <div className="vrule" style={{ position: 'absolute', left: 'calc(50% - 0.5px)', top: 0, bottom: 0, width: 1, background: 'var(--color-divider)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: 24 }}>Компания</h3>
            <ul style={{ margin: '20px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 17, lineHeight: 1.5 }}>
              {dev.districts.length > 0 && (
                <li>Строит в {dev.districts.length} {plural(dev.districts.length, 'районе', 'районах', 'районах')}: {dev.districts.join(', ')}</li>
              )}
              {dev.website && <li>Сайт: <a href={dev.website} target="_blank" rel="noopener noreferrer">{dev.website.replace(/^https?:\/\//, '')}</a></li>}
              {dev.rating != null && <li>Рейтинг надёжности Balinsky: {dev.rating}</li>}
              <li><Missing what="юрлицо, NIB, основатель, адрес офиса — отдельных полей нет" /></li>
            </ul>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 24 }}>Управляющая компания</h3>
            {(dev.bulletCards.find(c => c.key === 'management')?.items ?? []).length ? (
              <ul style={{ margin: '20px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 17, lineHeight: 1.5 }}>
                {dev.bulletCards.find(c => c.key === 'management')!.items.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            ) : <p style={{ marginTop: 20 }}><Missing what="поле «Управляющая компания» пустое" /></p>}
          </div>
        </div>
      </section>

      {/* ---- projects carousel */}
      <section className="uesection">
        <ScrollRow title="Проекты застройщика" count={`${complexes.length} ${plural(complexes.length, 'комплекс', 'комплекса', 'комплексов')}`}>
          {complexes.map(c => (
            <ProjectCard
              key={c.id}
              href={`#${c.slug}`}
              kicker={`${c.district ?? 'район не указан'} · ${c.statusLabel}`}
              name={c.name}
              meta={c.metaLine || '—'}
              progressPct={c.progressPct}
              photos={c.photos}
              note={c.photos.length < 2 ? 'фото для слайдшоу не хватает' : null}
            />
          ))}
        </ScrollRow>
        {complexes.length > 0 && (
          <p className="muted" style={{ margin: '28px 0 0', fontSize: 17 }}>
            Типы объектов: {[...new Set(complexes.flatMap(c => c.unitTypes))].join(', ') || 'не указаны'}.
          </p>
        )}
      </section>

      {building.map(c => <ComplexDetail key={c.id} c={c} mapsKey={mapsKey} />)}
      {completed.map(c => <CompletedDetail key={c.id} c={c} />)}

      {/* ---- videos */}
      <section className="uesection" style={{ paddingTop: 112 }}>
        <ScrollRow title={`Видео о ${dev.name}`}>
          {videos.length ? videos.map(v => {
            const id = v.embedUrl?.split('/').pop()?.split('?')[0] ?? null
            return (
              <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" style={{
                width: 360, maxWidth: '82vw', border: '1px solid var(--color-divider)',
                borderRadius: 'var(--radius-md)', overflow: 'hidden', color: 'var(--color-text)',
              }}>
                <div style={{
                  height: 200, backgroundColor: 'var(--color-divider)',
                  backgroundImage: id ? `url(https://img.youtube.com/vi/${id}/hqdefault.jpg)` : undefined,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', background: 'color-mix(in srgb, var(--color-bg) 92%, transparent)',
                    color: 'var(--color-accent-700)', fontSize: 20, paddingLeft: 4,
                  }}>▶</span>
                </div>
                <p style={{ margin: 0, padding: '18px 22px', fontSize: 16 }}>{v.name ?? 'Видео'}</p>
              </a>
            )
          }) : <p style={{ paddingTop: 20 }}><Missing what="видео застройщика нет" /></p>}
        </ScrollRow>
      </section>

      {/* ---- news */}
      <section className="uesection" style={{ paddingTop: 112 }}>
        <ScrollRow title={`Новости ${dev.name}`}>
          {news.length ? news.map(n => (
            <Link key={n.id} href={`/ru/novosti/${n.slug}`} style={{
              width: 360, maxWidth: '82vw', border: '1px solid var(--color-divider)',
              borderRadius: 'var(--radius-md)', overflow: 'hidden', color: 'var(--color-text)',
            }}>
              <div style={{
                height: 200, backgroundColor: 'var(--color-divider)',
                backgroundImage: n.photo ? `url(${JSON.stringify(n.photo).slice(1, -1)})` : undefined,
                backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
              <p style={{ margin: 0, padding: '18px 22px', fontSize: 16 }}>{n.title}</p>
            </Link>
          )) : <p style={{ paddingTop: 20 }}><Missing what="новостей застройщика нет" /></p>}
        </ScrollRow>
      </section>

      {/* ---- events + promos */}
      <section className="uesection" style={{ paddingTop: 112 }}>
        <ScrollRow title="Мероприятия и акции">
          {events.length + promos.length ? [
            ...events.map(e => ({ id: e.id, tag: e.format ?? 'Мероприятие', title: e.title, href: `/ru/meropriyatiya/${e.slug}` })),
            ...promos.map(p => ({ id: p.id, tag: 'Акция', title: p.title, href: `/ru/akcii/${p.slug}` })),
          ].map(it => (
            <Link key={it.id} href={it.href} style={{
              width: 320, maxWidth: '82vw', padding: '24px 26px', border: '1px solid var(--color-divider)',
              borderRadius: 'var(--radius-md)', color: 'var(--color-text)',
            }}>
              <div className="kicker">{it.tag}</div>
              <p style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.5 }}>{it.title}</p>
            </Link>
          )) : <p style={{ paddingTop: 20 }}><Missing what="мероприятий и акций нет" /></p>}
        </ScrollRow>
      </section>

      {/* ---- related links */}
      <section className="uesection" style={{ paddingTop: 112 }}>
        <h2 className="uehead">По теме</h2>
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 56px', marginTop: 32, maxWidth: 860, fontSize: 17 }}>
          <Link href="/ru/zastrojshhiki" style={{ padding: '12px 0', borderBottom: '1px solid var(--color-divider)' }}>Все застройщики Бали</Link>
          <Link href="/ru/zhilye-kompleksy" style={{ padding: '12px 0', borderBottom: '1px solid var(--color-divider)' }}>Жилые комплексы Бали</Link>
          <Link href="/ru/villy" style={{ padding: '12px 0', borderBottom: '1px solid var(--color-divider)' }}>Виллы и дома на Бали</Link>
          <Link href="/ru/apartamenty" style={{ padding: '12px 0', borderBottom: '1px solid var(--color-divider)' }}>Апартаменты на Бали</Link>
          {dev.districts.slice(0, 2).map(d => (
            <Link key={d} href="/ru/villy" style={{ padding: '12px 0', borderBottom: '1px solid var(--color-divider)' }}>Виллы в районе {d}</Link>
          ))}
        </div>
      </section>

      {/* ---- faq */}
      <section className="uesection" style={{ paddingTop: 112 }}>
        <h2 className="uehead">Часто задаваемые вопросы</h2>
        {faq.length ? <FaqAccordion items={faq} /> : <p style={{ marginTop: 24 }}><Missing what="данных для FAQ не хватает" /></p>}
      </section>

      {/* ---- dark CTA */}
      <section id="contacts" style={{ margin: '112px 0 0', background: 'color-mix(in srgb, var(--color-neutral-900) 85%, black)', color: 'var(--color-bg)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '88px 48px 72px', boxSizing: 'border-box' }}>
          <h2 className="uehead">Кому это подходит</h2>
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, marginTop: 44 }}>
            {complexes.slice(0, 2).map(c => (
              <div key={c.id}>
                <div className="kicker">{c.name}{c.priceFromUsd ? ` · от ${fullUsd(c.priceFromUsd)}` : ''}</div>
                <h3 style={{ margin: '14px 0 0', fontSize: 24 }}>{c.district ?? 'Бали'}</h3>
                <p style={{ margin: '12px 0 0', fontSize: 17, lineHeight: 1.55, color: 'color-mix(in srgb, var(--color-bg) 70%, transparent)' }}>
                  {c.metaLine}
                </p>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 56, paddingTop: 32, borderTop: '1px solid color-mix(in srgb, var(--color-bg) 22%, transparent)',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24,
          }}>
            <p style={{ margin: 0, fontSize: 17, maxWidth: '56ch', lineHeight: 1.5, color: 'color-mix(in srgb, var(--color-bg) 70%, transparent)' }}>
              Подберём объект у этого застройщика и ответим на вопросы по сделке.
            </p>
            <a href="#contacts" className="cta" style={{ color: 'var(--color-accent-900)' }}>
              Оставить заявку <span className="cta-arrow">→</span>
            </a>
          </div>
        </div>
      </section>

      <DataCoverageHud gaps={gaps} />
    </div>
  )
}

function PreviewNav({ current, list }: { current: string; list: { slug: string; name: string }[] }) {
  const i = list.findIndex(d => d.slug === current)
  const prev = i > 0 ? list[i - 1] : null
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null
  return (
    <span style={{ display: 'flex', gap: 10 }}>
      {prev && <Link href={`/admin/preview/zastrojshhik/${prev.slug}`} style={{ color: '#e9d6b1' }}>← {prev.name}</Link>}
      {next && <Link href={`/admin/preview/zastrojshhik/${next.slug}`} style={{ color: '#e9d6b1' }}>{next.name} →</Link>}
    </span>
  )
}
