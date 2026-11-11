// Документы комплекса для плитки «Документы» в медиаблоке виллы.
// Файлы лежат в закрытом бакете complex-docs/<slug>/<file>.pdf и отдаются
// только через /api/complex/[slug]/docs вошедшим с Pro.
// Паспорта собственников земли (KTP) не публикуем — личные данные.
//
// Пункты «что проверено» — из юр-проверки комплекса (raw_complexes,
// «Юр-проверка: в порядке»), каждый со ссылками на свои документы.

type Copy = { ru: string; en: string }

export type ComplexDoc = { file: string; name: Copy; what: Copy; mb: number }
export type ComplexDocCheck = { title: Copy; text: Copy; files: string[] }
export type ComplexDocGroup = { title: Copy; files: string[] }
export type ComplexDocs = {
  slug: string
  checkedAt: string
  docs: ComplexDoc[]
  checks: ComplexDocCheck[]
  groups: ComplexDocGroup[]
}

const CITRINE: ComplexDocs = {
  slug: 'citrine',
  checkedAt: '2026-08',
  docs: [
    { file: 'shm-21562-797m2', mb: 0.3, name: { ru: 'Сертификат на землю SHM 21562', en: 'Land certificate SHM 21562' }, what: { ru: 'Участок 797 м²', en: 'Plot 797 m²' } },
    { file: 'shm-21561-100m2', mb: 0.3, name: { ru: 'Сертификат на землю SHM 21561', en: 'Land certificate SHM 21561' }, what: { ru: 'Участок 100 м²', en: 'Plot 100 m²' } },
    { file: 'bpn-check-797m2', mb: 1, name: { ru: 'Проверка сертификата в BPN, 797 м²', en: 'BPN certificate check, 797 m²' }, what: { ru: 'Ответ земельного ведомства', en: 'Land office response' } },
    { file: 'bpn-check-100m2', mb: 0.4, name: { ru: 'Проверка сертификата в BPN, 100 м²', en: 'BPN certificate check, 100 m²' }, what: { ru: 'Ответ земельного ведомства', en: 'Land office response' } },
    { file: 'notary-covernote-797m2', mb: 0.2, name: { ru: 'Справка нотариуса, 797 м²', en: 'Notary covernote, 797 m²' }, what: { ru: 'Аренда земли оформлена у нотариуса', en: 'Land lease registered with a notary' } },
    { file: 'notary-covernote-100m2', mb: 0.1, name: { ru: 'Справка нотариуса, 100 м²', en: 'Notary covernote, 100 m²' }, what: { ru: 'Аренда земли оформлена у нотариуса', en: 'Land lease registered with a notary' } },
    { file: 'itr-797m2', mb: 1.4, name: { ru: 'Справка о зонировании (ITR), 797 м²', en: 'Zoning information (ITR), 797 m²' }, what: { ru: 'Что можно строить на участке', en: 'What may be built on the plot' } },
    { file: 'itr-100m2', mb: 0.7, name: { ru: 'Справка о зонировании (ITR), 100 м²', en: 'Zoning information (ITR), 100 m²' }, what: { ru: 'Что можно строить на участке', en: 'What may be built on the plot' } },
    { file: 'pkkpr', mb: 1.6, name: { ru: 'PKKPR', en: 'PKKPR' }, what: { ru: 'Согласование использования участка', en: 'Land use approval' } },
    { file: 'pbg', mb: 3.7, name: { ru: 'PBG - разрешение на стройку', en: 'PBG - building permit' }, what: { ru: 'Выдан 06.08.2026', en: 'Issued 06.08.2026' } },
    { file: 'dd-08-kkkpr', mb: 21.7, name: { ru: 'KKKPR и валидация PUPR', en: 'KKKPR and PUPR validation' }, what: { ru: 'Участок под виллы, зона R-3', en: 'Plot approved for villas, zone R-3' } },
    { file: 'dd-shm-21562', mb: 0.2, name: { ru: 'Проверка участка SHM 21562', en: 'Due diligence, SHM 21562' }, what: { ru: 'Сводный отчёт проверки', en: 'Summary report' } },
    { file: 'dd-01-land-certificate', mb: 0.3, name: { ru: 'Сертификат на землю', en: 'Land certificate' }, what: { ru: 'Приложение 1 к проверке', en: 'Attachment 1' } },
    { file: 'dd-02-bhumi-land', mb: 0.05, name: { ru: 'Данные BHUMI по участку', en: 'BHUMI land data' }, what: { ru: 'Государственная карта участков', en: 'State land map' } },
    { file: 'dd-03-bpn-check', mb: 1.3, name: { ru: 'Проверка в BPN', en: 'BPN check' }, what: { ru: 'Обременения и владельцы', en: 'Encumbrances and owners' } },
    { file: 'dd-04-court-cases', mb: 0.1, name: { ru: 'Проверка судебных дел', en: 'Court case search' }, what: { ru: 'Споры по участку', en: 'Disputes over the plot' } },
    { file: 'dd-05-zoning', mb: 0.1, name: { ru: 'Проверка зонирования (GISTARU)', en: 'Zoning check (GISTARU)' }, what: { ru: 'Зона по карте', en: 'Zone on the official map' } },
    { file: 'dd-06-perbup-gianyar-7-2023', mb: 7.1, name: { ru: 'Постановление Бупати Гианьяра № 7/2023', en: 'Gianyar Regent Regulation 7/2023' }, what: { ru: 'Правила застройки района', en: 'Area zoning rules' } },
    { file: 'dd-07-bhumi-lsd', mb: 0.04, name: { ru: 'Проверка защищённых рисовых полей (LSD)', en: 'Protected rice field check (LSD)' }, what: { ru: 'Данные BHUMI', en: 'BHUMI data' } },
    { file: 'dd-09-activities', mb: 0.1, name: { ru: 'Разрешённые виды деятельности', en: 'Permitted activities' }, what: { ru: 'Приложение 9 к проверке', en: 'Attachment 9' } },
    { file: 'dd-10-perbup-lampiran-xv', mb: 0.9, name: { ru: 'Приложение XV к постановлению № 7/2023', en: 'Regulation 7/2023, appendix XV' }, what: { ru: 'Таблица разрешённого использования', en: 'Permitted use table' } },
    { file: 'dd-11-satellite', mb: 0.1, name: { ru: 'Спутниковый осмотр участка', en: 'Satellite inspection' }, what: { ru: 'Снимок участка', en: 'Satellite image of the plot' } },
    { file: 'topo-survey', mb: 0.4, name: { ru: 'Топосъёмка участка', en: 'Topographic survey' }, what: { ru: 'Границы и высоты', en: 'Boundaries and levels' } },
    { file: 'terrain-3d', mb: 0.3, name: { ru: '3D-модель рельефа', en: '3D terrain model' }, what: { ru: 'Как лежит участок', en: 'How the plot lies' } },
  ],
  checks: [
    { title: { ru: 'Разрешение на стройку получено', en: 'Building permit issued' }, text: { ru: 'PBG от 06.08.2026, выдан администрацией Гианьяра.', en: 'PBG dated 06.08.2026, issued by Gianyar regency.' }, files: ['pbg'] },
    { title: { ru: 'Участок одобрен под виллы', en: 'Plot approved for villas' }, text: { ru: 'KKKPR от 19.05.2026, зона R-3, подтверждён ведомством PUPR Гианьяра.', en: 'KKKPR dated 19.05.2026, zone R-3, validated by Gianyar PUPR.' }, files: ['dd-08-kkkpr', 'pkkpr'] },
    { title: { ru: 'Сертификаты на землю проверены', en: 'Land certificates checked' }, text: { ru: 'Два сертификата SHM на 797 и 100 м², проверка в земельном ведомстве BPN.', en: 'Two SHM certificates for 797 and 100 m², checked with the BPN land office.' }, files: ['shm-21562-797m2', 'shm-21561-100m2', 'bpn-check-797m2', 'bpn-check-100m2'] },
    { title: { ru: 'Аренда земли у нотариуса до 2055', en: 'Land lease with a notary until 2055' }, text: { ru: 'Два нотариальных акта, срок 28.11.2025 - 28.11.2055.', en: 'Two notarial deeds, term 28.11.2025 - 28.11.2055.' }, files: ['notary-covernote-797m2', 'notary-covernote-100m2'] },
    { title: { ru: 'Без обременений и споров', en: 'No encumbrances or disputes' }, text: { ru: 'Проверка за август 2026 не нашла залогов и судебных дел.', en: 'The August 2026 check found no liens or court cases.' }, files: ['dd-04-court-cases', 'dd-03-bpn-check'] },
  ],
  groups: [
    { title: { ru: 'Земля', en: 'Land' }, files: ['shm-21562-797m2', 'shm-21561-100m2', 'bpn-check-797m2', 'bpn-check-100m2', 'notary-covernote-797m2', 'notary-covernote-100m2', 'itr-797m2', 'itr-100m2'] },
    { title: { ru: 'Разрешения', en: 'Permits' }, files: ['pbg', 'pkkpr', 'dd-08-kkkpr'] },
    { title: { ru: 'Независимая проверка', en: 'Independent due diligence' }, files: ['dd-shm-21562', 'dd-01-land-certificate', 'dd-02-bhumi-land', 'dd-03-bpn-check', 'dd-04-court-cases', 'dd-05-zoning', 'dd-07-bhumi-lsd', 'dd-09-activities', 'dd-11-satellite', 'dd-06-perbup-gianyar-7-2023', 'dd-10-perbup-lampiran-xv'] },
    { title: { ru: 'Чертежи', en: 'Drawings' }, files: ['topo-survey', 'terrain-3d'] },
  ],
}

const BY_SLUG: Record<string, ComplexDocs> = { citrine: CITRINE }

export function complexDocs(slug: string | null | undefined): ComplexDocs | null {
  return slug ? BY_SLUG[slug] ?? null : null
}

export function complexDocFile(slug: string, file: string): ComplexDoc | null {
  return complexDocs(slug)?.docs.find(d => d.file === file) ?? null
}
