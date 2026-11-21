// Документы комплекса для плитки «Документы» в медиаблоке виллы.
// Файлы лежат в закрытом бакете complex-docs/<slug>/<file>.pdf и отдаются
// только через /api/complex/[slug]/docs вошедшим с Pro.
// Паспорта собственников земли (KTP) не публикуем — личные данные.
//
// Пункты «что проверено» — из юр-проверки комплекса (raw_complexes,
// «Юр-проверка: в порядке»), каждый со ссылками на свои документы.

import { loadSiteSection } from './site-content'

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

// EcoWood (PT Our Place Invest) — пакет от застройщика «для работы с партнёрами»
// (TG, 06.11 и 09.11.2026). Паспорта и семейные карты собственника вырезаны,
// номера паспортов директоров закрашены. Два листа PBG, присланные 09.11
// «только для личного пользования», не публикуем — PBG здесь из пакета 06.11.
const ECOWOOD: ComplexDocs = {
  slug: 'ecowood',
  checkedAt: '2025-11',
  docs: [
    { file: 'land-certificates', mb: 2.6, name: { ru: 'Сертификаты на землю SHM 5845 и SHM 1678', en: 'Land certificates SHM 5845 and SHM 1678' }, what: { ru: 'Участки 2000 и 3335 м², Kutuh', en: 'Plots of 2,000 and 3,335 m², Kutuh' } },
    { file: 'land-split', mb: 0.1, name: { ru: 'Раздел участка на две очереди', en: 'Plot split into two phases' }, what: { ru: 'Первая очередь EcoWood - 2000 м²', en: 'EcoWood phase 1 - 2,000 m²' } },
    { file: 'lease', mb: 2.7, name: { ru: 'Договор аренды земли у нотариуса', en: 'Notarial land lease agreement' }, what: { ru: '№ 11 от 19.12.2024', en: 'No. 11 dated 19.12.2024' } },
    { file: 'lease-addendum-17', mb: 1, name: { ru: 'Допсоглашение № 17 к аренде', en: 'Lease addendum No. 17' }, what: { ru: 'Срок аренды до 09.01.2056', en: 'Lease term until 09.01.2056' } },
    { file: 'dd-land-2000m2', mb: 7.3, name: { ru: 'Проверка участка 2000 м² у нотариуса', en: 'Notary due diligence, 2,000 m² plot' }, what: { ru: 'SHM 5845, первая очередь', en: 'SHM 5845, phase 1' } },
    { file: 'dd-land-3335m2', mb: 12, name: { ru: 'Проверка участка 3335 м² у нотариуса', en: 'Notary due diligence, 3,335 m² plot' }, what: { ru: 'SHM 1678, вторая очередь', en: 'SHM 1678, phase 2' } },
    { file: 'pbg', mb: 0.4, name: { ru: 'PBG - разрешение на стройку', en: 'PBG - building permit' }, what: { ru: 'SK-PBG-510305-05062026-009', en: 'SK-PBG-510305-05062026-009' } },
    { file: 'pkkpr', mb: 2.7, name: { ru: 'PKKPR - согласование использования участка', en: 'PKKPR - land use approval' }, what: { ru: 'Туристическая зона W', en: 'Tourism zone W' } },
    { file: 'genplan', mb: 6.5, name: { ru: 'Генплан комплекса', en: 'Site master plan' }, what: { ru: '10 вилл', en: '10 villas' } },
    { file: 'dd-company', mb: 3.9, name: { ru: 'Юридическая проверка Bali Law Consulting', en: 'Legal due diligence by Bali Law Consulting' }, what: { ru: 'Земля, аренда, разрешения, компания', en: 'Land, lease, permits, company' } },
    { file: 'ahu', mb: 0.3, name: { ru: 'Карточка компании в реестре AHU', en: 'AHU company registry profile' }, what: { ru: 'PT Our Place Invest', en: 'PT Our Place Invest' } },
    { file: 'director-deed', mb: 3.1, name: { ru: 'Нотариальный акт о смене директора', en: 'Notarial deed on change of director' }, what: { ru: 'Акт № 04', en: 'Deed No. 04' } },
    { file: 'director-change', mb: 1.6, name: { ru: 'Уведомление о смене данных компании', en: 'Company data change notice' }, what: { ru: 'Директор - Григорий Поршнев', en: 'Director - Grigory Porshnev' } },
    { file: 'contract-booking', mb: 0.1, name: { ru: 'Образец: договор бронирования', en: 'Sample: booking agreement' }, what: { ru: 'На примере виллы № 9', en: 'Villa No. 9 as an example' } },
    { file: 'contract-preliminary', mb: 0.2, name: { ru: 'Образец: предварительный договор', en: 'Sample: preliminary agreement' }, what: { ru: 'На примере виллы № 9', en: 'Villa No. 9 as an example' } },
    { file: 'contract-lease-transfer', mb: 0.6, name: { ru: 'Образец: передача права аренды', en: 'Sample: lease transfer agreement' }, what: { ru: 'На примере виллы № 9', en: 'Villa No. 9 as an example' } },
    { file: 'contract-construction', mb: 2.2, name: { ru: 'Образец: договор на строительство', en: 'Sample: construction agency agreement' }, what: { ru: 'На примере виллы № 9', en: 'Villa No. 9 as an example' } },
    { file: 'mgmt-management', mb: 0.2, name: { ru: 'Образец: договор управления виллой', en: 'Sample: villa management agreement' }, what: { ru: 'Посуточная сдача через УК', en: 'Short-term rental via a management company' } },
    { file: 'mgmt-marketing', mb: 0.3, name: { ru: 'Образец: маркетинговый договор', en: 'Sample: marketing agreement' }, what: { ru: 'Продвижение виллы в аренду', en: 'Rental marketing' } },
  ],
  checks: [
    { title: { ru: 'Земля чистая', en: 'Clean land title' }, text: { ru: 'SHM 5845 и 1678 в собственности, без ипотеки, ареста и споров (BPN, 17.12.2024).', en: 'SHM 5845 and 1678 are freehold, with no mortgage, seizure or disputes (BPN, 17.12.2024).' }, files: ['land-certificates', 'dd-land-2000m2', 'dd-company'] },
    { title: { ru: 'Аренда у нотариуса до 2056', en: 'Notarial lease until 2056' }, text: { ru: 'Договор № 11 от 19.12.2024, срок до 09.01.2056, право продления ещё на 30 лет. На ноябрь 2025 оплачено 8,9 из 10 млрд IDR; письма собственника о полной оплате участка первой очереди пока нет.', en: 'Agreement No. 11 dated 19.12.2024, term until 09.01.2056, with a right to extend for 30 more years. As of November 2025, IDR 8.9 of 10 billion was paid; there is no written confirmation from the landowner yet that the phase 1 plot is paid in full.' }, files: ['lease', 'lease-addendum-17'] },
    { title: { ru: 'Туристическая зона', en: 'Tourism zone' }, text: { ru: 'Зона W (Pariwisata): разрешены виллы и гостиницы.', en: 'Zone W (Pariwisata): villas and hotels are permitted.' }, files: ['pkkpr', 'dd-company'] },
    { title: { ru: 'Разрешение на стройку получено', en: 'Building permit issued' }, text: { ru: 'PBG выдан на гостиничный комплекс Smart Villas Club (официальное название EcoWood), 1 корпус: до 4 этажей и 4 532 м². Под 10 вилл застройщик обещает корректировку (PBG Perubahan) при получении SLF.', en: 'PBG issued for the Smart Villas Club hotel complex (EcoWood’s official name), 1 building: up to 4 floors and 4,532 m². The developer promises an amendment for the 10 villas (PBG Perubahan) when obtaining the SLF.' }, files: ['pbg'] },
    { title: { ru: 'Компания проверена', en: 'Company checked' }, text: { ru: 'PT Our Place Invest - иностранная компания (PMA) с 2022 года, судебных и налоговых рисков проверка не нашла.', en: 'PT Our Place Invest is a foreign-owned company (PMA) since 2022; the check found no court or tax risks.' }, files: ['dd-company', 'ahu', 'director-deed', 'director-change'] },
  ],
  groups: [
    { title: { ru: 'Земля', en: 'Land' }, files: ['land-certificates', 'land-split', 'lease', 'lease-addendum-17', 'dd-land-2000m2', 'dd-land-3335m2'] },
    { title: { ru: 'Разрешения', en: 'Permits' }, files: ['pbg', 'pkkpr', 'genplan'] },
    { title: { ru: 'Независимая проверка', en: 'Independent due diligence' }, files: ['dd-company'] },
    { title: { ru: 'Компания', en: 'Company' }, files: ['ahu', 'director-deed', 'director-change'] },
    { title: { ru: 'Образцы договоров', en: 'Sample contracts' }, files: ['contract-booking', 'contract-preliminary', 'contract-lease-transfer', 'contract-construction', 'mgmt-management', 'mgmt-marketing'] },
  ],
}

// MAISON BOHEME (KAVIAN GROUP) — папка застройщика на Google Диске, 21.11.2026.
// Номера KTP и паспортов, телефоны и почты закрашены. Не публикуем: KTP,
// свидетельство о смерти, справки о наследстве и родстве, «Agreement and
// statement» (номера документов в скане), платёжки за аренду (банковские
// данные), договор по юниту 9 с данными покупателя, юр-проверку Bali Business
// Consulting (оговорка запрещает передачу третьим лицам, решение владельца 21.11.2026).
const MAISON_BOHEME: ComplexDocs = {
  slug: 'maison-boheme',
  checkedAt: '2026-06',
  docs: [
    { file: 'land-certificate', mb: 2.8, name: { ru: 'Сертификат на землю SHM 453', en: 'Land certificate SHM 453' }, what: { ru: 'Участок 2 280 м², Sanur Kaja', en: 'Plot of 2,280 m², Sanur Kaja' } },
    { file: 'bpn-check-2024', mb: 0.3, name: { ru: 'Проверка сертификата в BPN', en: 'BPN certificate check' }, what: { ru: 'От 24.04.2024', en: 'Dated 24.04.2024' } },
    { file: 'dd-notary', mb: 0.6, name: { ru: 'Проверка участка у нотариуса', en: 'Notary due diligence' }, what: { ru: 'Отчёт от 05.02.2025 и выписка BPN', en: 'Report of 05.02.2025 and BPN extract' } },
    { file: 'lease', mb: 2.4, name: { ru: 'Договор аренды земли у нотариуса', en: 'Notarial land lease agreement' }, what: { ru: '№ 08 от 30.05.2024, до 30.01.2055', en: 'No. 08 dated 30.05.2024, until 30.01.2055' } },
    { file: 'lease-transfer', mb: 2.7, name: { ru: 'Передача права аренды застройщику', en: 'Transfer of lease rights to the developer' }, what: { ru: '№ 05 от 03.02.2025', en: 'No. 05 dated 03.02.2025' } },
    { file: 'pkkpr', mb: 0.6, name: { ru: 'KKPR - согласование использования участка', en: 'KKPR - land use approval' }, what: { ru: 'От 21.04.2025, зона K-1', en: 'Dated 21.04.2025, zone K-1' } },
    { file: 'nib', mb: 0.6, name: { ru: 'NIB - регистрация отельного бизнеса', en: 'NIB - hotel business registration' }, what: { ru: 'Отель, апарт-отель, ресторан', en: 'Hotel, apartment hotel, restaurant' } },
    { file: 'sppl', mb: 0.1, name: { ru: 'SPPL - экологическое обязательство', en: 'SPPL - environmental undertaking' }, what: { ru: 'От 24.06.2025', en: 'Dated 24.06.2025' } },
    { file: 'slf-application', mb: 0.1, name: { ru: 'Заявка на SLF', en: 'SLF application' }, what: { ru: '№ 517101-24062025-007, на проверке', en: 'No. 517101-24062025-007, under review' } },
    { file: 'imb', mb: 0.1, name: { ru: 'Табличка IMB № 458', en: 'IMB plate No. 458' }, what: { ru: 'Старое разрешение на стройку, 1998', en: 'Old building permit, 1998' } },
    { file: 'as-built', mb: 7.9, name: { ru: 'Исполнительные чертежи', en: 'As-built drawings' }, what: { ru: 'Отель и ресторан, февраль 2025', en: 'Hotel and restaurant, February 2025' } },
    { file: 'soil-test', mb: 2.8, name: { ru: 'Исследование грунта', en: 'Soil investigation' }, what: { ru: 'Для заявки на SLF, 2025', en: 'For the SLF application, 2025' } },
  ],
  checks: [
    { title: { ru: 'Земля без обременений', en: 'No encumbrances on the land' }, text: { ru: 'SHM 453 (2 280 м²): без залога, ареста и споров - проверки BPN от 24.04.2024 и 04.02.2025.', en: 'SHM 453 (2,280 m²): no mortgage, seizure or disputes - BPN checks of 24.04.2024 and 04.02.2025.' }, files: ['bpn-check-2024', 'dd-notary', 'land-certificate'] },
    { title: { ru: 'Аренда у нотариуса до 2055', en: 'Notarial lease until 2055' }, text: { ru: 'Договор № 08 от 30.05.2024 с наследниками собственника, срок до 30.01.2055, продление по рыночной цене. Права переданы PT Niki Real Estate актом № 05 от 03.02.2025. Платёж за год по договору - до 30 января.', en: 'Agreement No. 08 dated 30.05.2024 with the owner’s heirs, term until 30.01.2055, extension at market price. Rights transferred to PT Niki Real Estate by deed No. 05 of 03.02.2025. The annual payment is due by 30 January.' }, files: ['lease', 'lease-transfer'] },
    { title: { ru: 'Зона торговли и услуг', en: 'Trade and services zone' }, text: { ru: 'KKPR от 21.04.2025: зона K-1, разрешены апарт-отель и ресторан. В отчёте нотариуса от 05.02.2025 участок ещё числился в жилой зоне.', en: 'KKPR of 21.04.2025: zone K-1, apartment hotel and restaurant permitted. The notary report of 05.02.2025 still listed the plot as residential.' }, files: ['pkkpr', 'dd-notary'] },
    { title: { ru: 'SLF пока не выдан', en: 'SLF not issued yet' }, text: { ru: 'Заявка на SLF от 24.06.2025 на проверке комплектности. Лицензии отеля (NIB, KKPR, заявка SLF) оформлены на частное лицо из семьи собственников земли, а не на компанию застройщика.', en: 'The SLF application of 24.06.2025 is under completeness review. The hotel licences (NIB, KKPR, SLF application) are held by an individual from the landowners’ family, not by the developer’s company.' }, files: ['slf-application', 'nib', 'lease-transfer', 'as-built', 'soil-test'] },
  ],
  groups: [
    { title: { ru: 'Земля', en: 'Land' }, files: ['land-certificate', 'bpn-check-2024', 'dd-notary', 'lease', 'lease-transfer'] },
    { title: { ru: 'Разрешения', en: 'Permits' }, files: ['pkkpr', 'nib', 'sppl', 'slf-application', 'imb'] },
    { title: { ru: 'Чертежи и изыскания', en: 'Drawings and surveys' }, files: ['as-built', 'soil-test'] },
  ],
}

// BAMBOOLINA (KAVIAN GROUP) — папка застройщика на Google Диске, 21.11.2026.
// Номера KTP и паспортов, телефоны и почты закрашены; фото к заявке SLF не публикуем.
const BAMBOOLINA: ComplexDocs = {
  slug: 'bamboolina',
  checkedAt: '2025-08',
  docs: [
    { file: 'land-certificate-2', mb: 1.5, name: { ru: 'Сертификат на землю SHM 02291', en: 'Land certificate SHM 02291' }, what: { ru: 'Участок 193 м², Petulu', en: 'Plot of 193 m², Petulu' } },
    { file: 'land-certificate-1', mb: 1.7, name: { ru: 'Сертификат на землю SHM 01986', en: 'Land certificate SHM 01986' }, what: { ru: 'Участок 103 м², Petulu', en: 'Plot of 103 m², Petulu' } },
    { file: 'dd-notary', mb: 0.5, name: { ru: 'Проверка участка SHM 02291 у нотариуса', en: 'Notary due diligence, SHM 02291' }, what: { ru: 'Отчёт от 05.05.2025 и выписка BPN', en: 'Report of 05.05.2025 and BPN extract' } },
    { file: 'lease', mb: 2.3, name: { ru: 'Договор аренды земли у нотариуса', en: 'Notarial land lease agreement' }, what: { ru: 'От 07.07.2023, до 17.07.2048', en: 'Dated 07.07.2023, until 17.07.2048' } },
    { file: 'kkpr', mb: 0.9, name: { ru: 'KKPR - согласование использования участка', en: 'KKPR - land use approval' }, what: { ru: 'От 06.08.2025, зона R-3', en: 'Dated 06.08.2025, zone R-3' } },
    { file: 'nib', mb: 0.5, name: { ru: 'NIB - регистрация виллы под аренду', en: 'NIB - villa rental business registration' }, what: { ru: 'Вилла, KBLI 55193', en: 'Villa, KBLI 55193' } },
    { file: 'slf-application', mb: 0.2, name: { ru: 'Заявка на SLF', en: 'SLF application' }, what: { ru: 'SLF-510405-12072023-01, на проверке', en: 'SLF-510405-12072023-01, under review' } },
    { file: 'slf-inspection', mb: 0.8, name: { ru: 'Технический осмотр здания', en: 'Building inspection report' }, what: { ru: 'Для заявки на SLF', en: 'For the SLF application' } },
    { file: 'slf-wood-moisture', mb: 0.9, name: { ru: 'Проверка влажности древесины', en: 'Timber moisture test' }, what: { ru: 'От 23.06.2025', en: 'Dated 23.06.2025' } },
    { file: 'plans', mb: 0.6, name: { ru: 'Планировки виллы', en: 'Villa floor plans' }, what: { ru: 'Три этажа', en: 'Three floors' } },
  ],
  checks: [
    { title: { ru: 'Земля без обременений', en: 'No encumbrances on the land' }, text: { ru: 'SHM 02291 (193 м²): без залога, ареста и споров, налог на землю оплачен - проверка нотариуса от 05.05.2025. По второму участку SHM 01986 (103 м²) отдельной проверки в пакете нет.', en: 'SHM 02291 (193 m²): no mortgage, seizure or disputes, land tax paid - notary check of 05.05.2025. There is no separate check for the second plot SHM 01986 (103 m²) in the package.' }, files: ['dd-notary', 'land-certificate-2', 'land-certificate-1'] },
    { title: { ru: 'Аренда у нотариуса до 2048', en: 'Notarial lease until 2048' }, text: { ru: 'Договор от 07.07.2023: 25 лет, с 17.07.2023 по 17.07.2048, два участка на 296 м², оплачено 400 млн IDR. Продление ещё на 25 лет - по рыночной цене. В презентации застройщика указан срок 32 года и участок 350 м².', en: 'Agreement of 07.07.2023: 25 years, from 17.07.2023 to 17.07.2048, two plots totalling 296 m², IDR 400 million paid. Extension for another 25 years at market price. The developer’s presentation states a 32-year term and a 350 m² plot.' }, files: ['lease'] },
    { title: { ru: 'Жилая зона с условиями', en: 'Residential zone with conditions' }, text: { ru: 'KKPR от 06.08.2025: зона R-3 (жильё средней плотности), вилла под аренду разрешена с ограничениями, соответствие - частичное, есть отступ от реки.', en: 'KKPR of 06.08.2025: zone R-3 (medium-density housing), villa rental permitted with restrictions, partial compliance, river setback applies.' }, files: ['kkpr'] },
    { title: { ru: 'SLF пока не выдан', en: 'SLF not issued yet' }, text: { ru: 'Заявка SLF-510405-12072023-01 на проверке документов, техосмотр здания - июнь 2025. В заявке 222 м² и 2 этажа, в презентации - 200 м² и 3 этажа. Лицензии виллы оформлены на собственника земли.', en: 'Application SLF-510405-12072023-01 is under document review; building inspection - June 2025. The application states 222 m² and 2 floors, the presentation 200 m² and 3 floors. The villa licences are held by the landowner.' }, files: ['slf-application', 'slf-inspection', 'slf-wood-moisture', 'nib'] },
  ],
  groups: [
    { title: { ru: 'Земля', en: 'Land' }, files: ['land-certificate-2', 'land-certificate-1', 'dd-notary', 'lease'] },
    { title: { ru: 'Разрешения', en: 'Permits' }, files: ['kkpr', 'nib', 'slf-application'] },
    { title: { ru: 'Техническая проверка', en: 'Technical inspection' }, files: ['slf-inspection', 'slf-wood-moisture'] },
    { title: { ru: 'Чертежи', en: 'Drawings' }, files: ['plans'] },
  ],
}

const BY_SLUG: Record<string, ComplexDocs> = { citrine: CITRINE, ecowood: ECOWOOD, 'maison-boheme': MAISON_BOHEME, bamboolina: BAMBOOLINA }

// Значения в коде — запасные. Рабочие данные лежат в базе: site_content,
// раздел 'complex-docs', элемент = slug ЖК (миграция 147, заливка —
// scripts/site-content.mjs seed). Правка строки сама перестраивает страницы ЖК
// и его юнитов. Новый ЖК с документами = новая строка в базе + PDF в бакете
// complex-docs/<slug>/, выкладка сайта не нужна.
export const COMPLEX_DOCS_FALLBACK: Readonly<Record<string, ComplexDocs>> = BY_SLUG

/** Запасной синхронный доступ к значениям из кода. На страницах — loadComplexDocs. */
export function complexDocs(slug: string | null | undefined): ComplexDocs | null {
  return slug ? BY_SLUG[slug] ?? null : null
}

/** Документы ЖК: база, а если там пусто или сбой — значения из кода. */
export async function loadComplexDocs(
  slug: string | null | undefined,
  opts: { fresh?: boolean } = {},
): Promise<ComplexDocs | null> {
  if (!slug) return null
  const all = await loadSiteSection<ComplexDocs>('complex-docs', BY_SLUG, opts)
  const docs = all[slug]
  return docs && Array.isArray(docs.docs) ? { ...docs, slug } : null
}

/** Один файл ЖК. `fresh` — для API выдачи файла: без кэша, новый PDF виден сразу. */
export async function loadComplexDocFile(slug: string, file: string): Promise<ComplexDoc | null> {
  return (await loadComplexDocs(slug, { fresh: true }))?.docs.find(d => d.file === file) ?? null
}
