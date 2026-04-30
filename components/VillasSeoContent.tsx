import Link from 'next/link'
import type { VillaFilterState } from '@/app/ru/villy/_lib'
import { STATUS_TO_SLUG } from '@/lib/villa-seo-routes'
import { DISTRICT_TO_SLUG, BEDROOM_TO_SLUG } from '@/lib/seo-routes'

const POPULAR_DISTRICTS = ['Berawa', 'Sanur', 'Ubud', 'Uluwatu', 'Pererenan', 'Pandawa', 'Batu Bolong', 'Cemagi']

type Variant = 'list' | 'map'

function intro(f: VillaFilterState, variant: Variant): string {
  const where =
    f.district.length === 1 ? `района ${f.district[0]}` :
    f.district.length > 1 ? `районов ${f.district.join(', ')}` :
    'Бали'
  const beds = f.bedrooms.length === 1 ? ` с ${f.bedrooms[0]} спальней` : f.bedrooms.length > 1 ? ` с ${f.bedrooms.join('/')} спальнями` : ''
  const lead = variant === 'map'
    ? `На странице — виллы и дома${beds} в пределах ${where} с отметками на карте.`
    : `На странице — виллы и дома${beds} в пределах ${where}.`
  return lead + ' Смотрите фото, площадь дома и участка, цены и характеристики.'
}

function context(f: VillaFilterState): string {
  const dist = f.district[0]
  if (dist === 'Ubud') return 'В Убуде — виллы среди джунглей и рисовых террас. Подходит тем, кто ищет приватность и природу подальше от пляжа.'
  if (dist === 'Berawa' || dist === 'Batu Bolong' || dist === 'Pererenan') return `${dist} — Чангу: виллы для жизни на сёрфе, удалённой работы и сдачи в посуточную аренду.`
  if (dist === 'Uluwatu' || dist === 'Pandawa' || dist === 'Melasti') return `${dist} — Букит: видовые виллы на утёсах, премиальный сегмент с высоким спросом на аренду.`
  if (dist === 'Sanur') return 'Санур — виллы для семейного формата и долгосрочного переезда, спокойный восточный берег.'
  return 'Виллы на Бали покупают для жизни, для аренды и под перепродажу. Самые ликвидные локации — Чангу (Berawa, Batu Bolong, Pererenan), Букит (Uluwatu, Pandawa) и Убуд. Большинство сделок — лизхолд от 25 до 80 лет, формат собственности через нотариуса PPAT.'
}

function buildSeoTitle(f: VillaFilterState, variant: Variant): string {
  const adj: string[] = []
  if (f.bedrooms.length === 1) adj.push(`${f.bedrooms[0]}-комнатные`)
  let s = adj.length ? adj.join(' ') + ' виллы и дома' : 'Виллы и дома'
  if (f.district.length === 1) s += ` в районе ${f.district[0]}`
  s += variant === 'map' ? ' на карте Бали' : ' на Бали — каталог'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Чем отличается вилла от апартамента?',
    a: 'Вилла — отдельно стоящий дом с участком, бассейном и приватным двором. Апартамент — юнит в общем комплексе с инфраструктурой и обычно без своей земли.',
  },
  {
    q: 'Сколько стоит вилла на Бали?',
    a: '1-bedroom виллы стартуют от 150–250 тыс. $, 2–3-bedroom в Чангу/Букит — от 350 тыс. $. Премиальные видовые виллы доходят до 1.5–3 млн $.',
  },
  {
    q: 'Можно ли иностранцу купить виллу на Бали?',
    a: 'Да — через лизхолд (долгосрочная аренда земли, обычно 25–80 лет) или через юр. лицо PT PMA. Сделка оформляется у нотариуса PPAT.',
  },
  {
    q: 'Какая доходность у виллы под аренду?',
    a: 'В Чангу и на Буките — 8–12% годовых при загрузке 70–80% через управляющую компанию. Сезонность сильно влияет: декабрь–март и июль–август — пик.',
  },
  {
    q: 'Что важно проверить перед покупкой?',
    a: 'Срок лизхолда и условия продления, разрешения PBG / SLF, назначение земли (зонирование), подключение к воде/электричеству, наличие управляющей компании и путь к собственности (нотариус PPAT).',
  },
]

export function VillasSeoContent({
  filters,
  variant = 'list',
}: {
  filters: VillaFilterState
  variant?: Variant
}) {
  const h2 = buildSeoTitle(filters, variant)
  const currentDistrict = filters.district[0]
  const districts = POPULAR_DISTRICTS.filter(d => d !== currentDistrict).slice(0, 6).map(d => ({ name: d, slug: DISTRICT_TO_SLUG[d] })).filter(x => x.slug)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <section className="mt-12 pt-10 border-t border-[var(--color-border)]">
      <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[var(--color-text)] mb-4">{h2}</h2>
      <div className="prose-balinsky max-w-3xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
        <p>{intro(filters, variant)}</p>
        <p className="text-[var(--color-text-muted)]">{context(filters)}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">Виллы по районам</h3>
          <ul className="flex flex-wrap gap-2">
            {districts.map(d => (
              <li key={d.slug}>
                <Link
                  href={`/ru/villy/${d.slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">По спальням и статусу</h3>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(BEDROOM_TO_SLUG).map(([n, slug]) => (
              <li key={slug}>
                <Link
                  href={`/ru/villy/${slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {n}-комнатные
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`/ru/villy/${STATUS_TO_SLUG.building}`}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                Строящиеся
              </Link>
            </li>
            <li>
              <Link
                href={`/ru/villy/${STATUS_TO_SLUG.built}`}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                Готовые
              </Link>
            </li>
            <li>
              <Link
                href="/ru/zhilye-kompleksy/villy"
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                Виллы в комплексах
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12">
        <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-4">Часто задаваемые вопросы</h3>
        <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
          {FAQ_ITEMS.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-medium text-[var(--color-text)]">
                {item.q}
                <span className="text-[var(--color-text-muted)] text-[20px] leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  )
}
