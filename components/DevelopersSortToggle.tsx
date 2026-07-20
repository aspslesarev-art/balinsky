'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { pickCopy, type Lang } from '@/lib/i18n'

export type DevelopersSortKey =
  | 'balanced'
  | 'ready'
  | 'inprogress'
  | 'units-ready'
  | 'units-inprogress'
  | 'experience'
  | 'international'

type Option = { key: DevelopersSortKey; label: string; hint: string }
const OPTIONS_BY_LANG: Record<Lang, Option[]> = {
  ru: [
    { key: 'balanced',         label: 'Сбалансированный',     hint: 'Сданные + в работе + редакторская оценка' },
    { key: 'ready',            label: 'Сданные ЖК',           hint: 'Кто реально построил больше всего' },
    { key: 'inprogress',       label: 'Активные стройки',     hint: 'У кого больше проектов сейчас в работе' },
    { key: 'units-ready',      label: 'Сданные юниты',        hint: 'По общему количеству сданных юнитов' },
    { key: 'units-inprogress', label: 'Юниты в стройке',      hint: 'По общему количеству юнитов в работе' },
    { key: 'experience',       label: 'Опыт и репутация',     hint: 'По данным о репутации, технике, опыте строительства' },
    { key: 'international',    label: '🌍 Международный опыт', hint: 'Девелоперы с историей и проектами за пределами Бали' },
  ],
  en: [
    { key: 'balanced',         label: 'Balanced',           hint: 'Completed + active + editorial score' },
    { key: 'ready',            label: 'Completed projects', hint: 'Who has actually built the most' },
    { key: 'inprogress',       label: 'Active projects',    hint: 'Who has the most ongoing builds' },
    { key: 'units-ready',      label: 'Delivered units',    hint: 'By total number of delivered units' },
    { key: 'units-inprogress', label: 'Units under build',  hint: 'By total number of units currently under construction' },
    { key: 'experience',       label: 'Experience',         hint: 'By depth of editorial data on reputation and team' },
    { key: 'international',    label: '🌍 International',   hint: 'Developers with projects outside Bali' },
  ],
  id: [
    { key: 'balanced',         label: 'Seimbang',              hint: 'Selesai + aktif + skor editorial' },
    { key: 'ready',            label: 'Proyek selesai',        hint: 'Yang paling banyak membangun' },
    { key: 'inprogress',       label: 'Proyek aktif',          hint: 'Yang punya proyek berjalan terbanyak' },
    { key: 'units-ready',      label: 'Unit diserahkan',       hint: 'Berdasarkan total unit yang telah diserahkan' },
    { key: 'units-inprogress', label: 'Unit dalam pembangunan', hint: 'Berdasarkan total unit yang sedang dibangun' },
    { key: 'experience',       label: 'Pengalaman',            hint: 'Berdasarkan kedalaman data editorial tentang reputasi dan tim' },
    { key: 'international',    label: '🌍 Internasional',      hint: 'Pengembang dengan proyek di luar Bali' },
  ],
  fr: [
    { key: 'balanced',         label: 'Équilibré',              hint: 'Livrés + actifs + score éditorial' },
    { key: 'ready',            label: 'Projets livrés',         hint: 'Qui a réellement le plus construit' },
    { key: 'inprogress',       label: 'Projets actifs',         hint: 'Qui a le plus de chantiers en cours' },
    { key: 'units-ready',      label: 'Unités livrées',         hint: "Par nombre total d'unités livrées" },
    { key: 'units-inprogress', label: 'Unités en construction', hint: "Par nombre total d'unités en construction" },
    { key: 'experience',       label: 'Expérience',             hint: "Selon la profondeur des données éditoriales sur la réputation et l'équipe" },
    { key: 'international',    label: '🌍 International',        hint: 'Promoteurs avec des projets hors de Bali' },
  ],
  de: [
    { key: 'balanced',         label: 'Ausgewogen',              hint: 'Fertiggestellt + aktiv + redaktionelle Bewertung' },
    { key: 'ready',            label: 'Fertige Projekte',        hint: 'Wer tatsächlich am meisten gebaut hat' },
    { key: 'inprogress',       label: 'Aktive Projekte',         hint: 'Wer die meisten laufenden Bauten hat' },
    { key: 'units-ready',      label: 'Übergebene Einheiten',    hint: 'Nach Gesamtzahl der übergebenen Einheiten' },
    { key: 'units-inprogress', label: 'Einheiten im Bau',        hint: 'Nach Gesamtzahl der aktuell im Bau befindlichen Einheiten' },
    { key: 'experience',       label: 'Erfahrung',               hint: 'Nach Tiefe der redaktionellen Daten zu Reputation und Team' },
    { key: 'international',    label: '🌍 International',         hint: 'Bauträger mit Projekten außerhalb Balis' },
  ],
  zh: [
    { key: 'balanced',         label: '综合',        hint: '已交付 + 在建 + 编辑评分' },
    { key: 'ready',            label: '已完成项目',  hint: '实际建成最多的开发商' },
    { key: 'inprogress',       label: '在建项目',    hint: '当前在建项目最多的开发商' },
    { key: 'units-ready',      label: '已交付单元',  hint: '按已交付单元总数排序' },
    { key: 'units-inprogress', label: '在建单元',    hint: '按当前在建单元总数排序' },
    { key: 'experience',       label: '经验',        hint: '按声誉与团队的编辑数据深度排序' },
    { key: 'international',    label: '🌍 国际经验', hint: '在巴厘岛以外有项目的开发商' },
  ],
  nl: [
    { key: 'balanced',         label: 'Gebalanceerd',           hint: 'Opgeleverd + actief + redactionele score' },
    { key: 'ready',            label: 'Opgeleverde projecten',  hint: 'Wie feitelijk het meest heeft gebouwd' },
    { key: 'inprogress',       label: 'Actieve projecten',      hint: 'Wie de meeste lopende bouwprojecten heeft' },
    { key: 'units-ready',      label: 'Opgeleverde eenheden',   hint: 'Op totaal aantal opgeleverde eenheden' },
    { key: 'units-inprogress', label: 'Eenheden in aanbouw',    hint: 'Op totaal aantal eenheden momenteel in aanbouw' },
    { key: 'experience',       label: 'Ervaring',               hint: 'Op diepte van redactionele data over reputatie en team' },
    { key: 'international',    label: '🌍 Internationaal',      hint: 'Ontwikkelaars met projecten buiten Bali' },
  ],
  ban: [
    { key: 'balanced',         label: 'Seimbang',               hint: 'Puput + aktif + skor editorial' },
    { key: 'ready',            label: 'Proyek puput',           hint: 'Sane pinih akeh ngwangun' },
    { key: 'inprogress',       label: 'Proyek aktif',           hint: 'Sane pinih akeh proyek mamargi' },
    { key: 'units-ready',      label: 'Unit kaserahang',        hint: 'Manut akeh unit sane sampun kaserahang' },
    { key: 'units-inprogress', label: 'Unit kantun kawangun',   hint: 'Manut akeh unit sane kantun kawangun' },
    { key: 'experience',       label: 'Pengalaman',             hint: 'Manut kedalaman data editorial indik reputasi lan tim' },
    { key: 'international',    label: '🌍 Internasional',       hint: 'Pangwangun sane madue proyek ring jaba Bali' },
  ],
  pl: [
    { key: 'balanced',         label: 'Zrównoważony',           hint: 'Ukończone + w trakcie + ocena redakcyjna' },
    { key: 'ready',            label: 'Ukończone projekty',     hint: 'Kto faktycznie zbudował najwięcej' },
    { key: 'inprogress',       label: 'Aktywne budowy',         hint: 'Kto ma najwięcej trwających budów' },
    { key: 'units-ready',      label: 'Oddane lokale',          hint: 'Według łącznej liczby oddanych lokali' },
    { key: 'units-inprogress', label: 'Lokale w budowie',       hint: 'Według łącznej liczby lokali obecnie w budowie' },
    { key: 'experience',       label: 'Doświadczenie',          hint: 'Według głębi danych redakcyjnych o reputacji i zespole' },
    { key: 'international',    label: '🌍 Międzynarodowy',      hint: 'Deweloperzy z projektami poza Bali' },
  ],
  uk: [
    { key: 'balanced',         label: 'Збалансований',          hint: 'Здані + у роботі + редакційна оцінка' },
    { key: 'ready',            label: 'Здані проєкти',          hint: 'Хто реально збудував найбільше' },
    { key: 'inprogress',       label: 'Активні будови',         hint: 'У кого найбільше проєктів зараз у роботі' },
    { key: 'units-ready',      label: 'Здані юніти',            hint: 'За загальною кількістю зданих юнітів' },
    { key: 'units-inprogress', label: 'Юніти в будівництві',    hint: 'За загальною кількістю юнітів у роботі' },
    { key: 'experience',       label: 'Досвід',                 hint: 'За глибиною редакційних даних про репутацію та команду' },
    { key: 'international',    label: '🌍 Міжнародний',         hint: 'Забудовники з проєктами за межами Балі' },
  ],
}

export function DevelopersSortToggle({ current, lang = 'ru' }: { current: DevelopersSortKey; lang?: Lang }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const apply = (key: DevelopersSortKey) => {
    const next = new URLSearchParams(searchParams.toString())
    if (key === 'balanced') next.delete('sort')
    else next.set('sort', key)
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }

  const options = pickCopy(OPTIONS_BY_LANG, lang)
  return (
    <div className="mb-5 flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={o.key}
          type="button"
          onClick={() => apply(o.key)}
          title={o.hint}
          className={`text-[13px] px-3.5 py-1.5 rounded-full border transition-colors ${
            current === o.key
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white font-medium'
              : 'bg-white border-[var(--color-border)] text-[#111827] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
