// Collection registry — the single source of truth for the admin data engine.
// Adding a table later == adding one entry here (no new code if it reuses an
// existing adapter/store type).
//
// Field keys are the REAL Airtable/JSONB keys / manifest item properties read
// by the public catalog loaders (app/ru/villy/_lib.ts, lib/news.ts, …), so
// admin writes stay compatible with what the site renders.

import type { CollectionConfig } from './adapters/types'
import {
  LEGAL_OK_FIELD, LEGAL_QUESTIONS_FIELD, LEGAL_BALANCE_FIELD, LEGAL_BALANCE_NOTES_FIELD,
} from '@/lib/legal-audit'
import { VOICE_FIELD } from '@/lib/voice-intro'
import { COMPLEX_DESCRIPTION_FIELD } from '@/lib/complex-description'
import { MAP_LINK_FIELD } from '@/lib/map-link'

// --- SQL JSONB catalogs (raw_* tables, PK airtable_id, JSONB `data`) -------

const villas: CollectionConfig = {
  key: 'villas',
  label: 'Виллы',
  store: 'sql_jsonb',
  table: 'raw_villas',
  primaryKey: 'airtable_id',
  photo: { bucket: 'villa-photos' },
  caps: { create: true, update: true, delete: true },
  titleField: 'SEO:Title',
  // The public slug lives in the `data` blob. Declaring it here is what makes
  // the adapter mint one on create — without it a unit added in the admin is
  // dropped by the slug index and never shows up on its complex's page.
  slugField: 'SEO:Slug',
  publishedField: 'Опубликовать',
  defaultSort: { field: 'price', dir: 'desc' },
  revalidateKind: 'villas',
  hideFields: ['photos', 'Renders', 'PDF code', 'Post ID'],
  // Adding a unit = filling these nine and dropping in photos. Title, slug,
  // district, status, handover and terms are derived / inherited from the
  // linked complex (lib/admin/unit-defaults.ts), exactly as the Airtable
  // formulas and lookups used to do.
  createFields: [
    'Опубликовать', 'SEO:Title', 'Developer', 'Комплекс',
    'Заявленная доходность', 'price', 'Земля', 'Площадь', 'Комнаты', 'Type',
  ],
  duplicateSkip: ['SEO:Slug', '_slug_alias'],
  fields: [
    {
      key: 'Опубликовать', label: 'Опубл.', type: 'bool', showInGrid: true, width: 70,
      help: 'Без галочки юнита нет нигде: ни в каталоге, ни в списке на странице комплекса.',
    },
    {
      key: 'SEO:Title', label: 'Название юнита', type: 'text', showInGrid: true, width: 260,
      help: 'Пусто = соберётся само: «Вилла <Комплекс> в <Район> - <Площадь> м², N спальни | Balinsky».',
    },
    { key: 'SEO:Slug', label: 'Slug', type: 'text', showInGrid: true, width: 200 },
    { key: 'Type', label: 'Тип', type: 'enum', enumOptions: ['Villa', 'Townhouse', 'Smart villa'], showInGrid: true, width: 120 },
    { key: 'Статус', label: 'Статус', type: 'enum', enumOptions: ['Строится', 'Построен', 'Под заказ'], showInGrid: true, width: 130 },
    { key: 'Location 2', label: 'Под-район', type: 'enum', showInGrid: true, width: 150 },
    { key: 'Location filter', label: 'Район', type: 'link', link: { collection: 'districts', store: 'id-array', nameField: 'Location' } },
    { key: 'Location', label: 'Район (имя)', type: 'text', readOnly: true },
    { key: 'Комнаты', label: 'Комнаты', type: 'number', showInGrid: true, width: 90 },
    { key: 'price', label: 'Цена $', type: 'number', showInGrid: true, width: 110 },
    { key: 'Площадь', label: 'Площадь', type: 'number' },
    { key: 'Земля', label: 'Земля', type: 'number' },
    { key: 'Year of completion', label: 'Год сдачи', type: 'enum' },
    { key: 'Разрешение', label: 'Разрешение', type: 'enum' },
    { key: 'Тип сделки', label: 'Тип сделки', type: 'enum' },
    { key: 'Developer', label: 'Застройщик', type: 'link', link: { collection: 'developers', store: 'id-array', nameField: 'Developer1' } },
    { key: 'Developer1', label: 'Застройщик (имя)', type: 'text', readOnly: true },
    {
      key: 'Комплекс', label: 'Комплекс', type: 'link',
      link: { collection: 'complexes', store: 'id-array', nameField: 'Комплекс 1' },
      help: 'Выбор из списка — именно он ставит юнит в список на странице комплекса.',
    },
    { key: 'Комплекс 1', label: 'Комплекс (имя)', type: 'text', readOnly: true },
    { key: 'Geo', label: 'Geo (lat,lng)', type: 'geo' },
    { key: 'Geo 2', label: 'Geo 2', type: 'geo' },
    { key: 'Land color', label: 'Land color', type: 'enum' },
    { key: 'Leasehold', label: 'Leasehold', type: 'enum' },
    { key: 'Цена м²', label: 'Цена м²', type: 'number' },
    { key: 'Цена м² в год', label: 'Цена м² в год', type: 'number' },
    { key: 'Заявленная доходность', label: 'Заявл. доходность', type: 'number' },
    { key: 'TOP', label: 'TOP', type: 'bool' },
    { key: 'Notes', label: 'Заметки', type: 'longtext' },
  ],
}

const apartments: CollectionConfig = {
  key: 'apartments',
  label: 'Апартаменты',
  store: 'sql_jsonb',
  table: 'raw_apartments',
  primaryKey: 'airtable_id',
  photo: { bucket: 'apartment-photos' },
  caps: { create: true, update: true, delete: true },
  titleField: 'SEO:Title',
  // Same reason as villas: no slug → dropped by the slug index and by the
  // complex page's unit list.
  slugField: 'SEO:Slug',
  publishedField: 'Опубликовать',
  defaultSort: { field: 'price_usd', dir: 'desc' },
  revalidateKind: 'apartments',
  hideFields: ['photos', 'Renders', 'PDF code', 'Post ID'],
  createFields: [
    'Опубликовать', 'SEO:Title', 'Developer', 'Комплекс',
    'Заявленная доходность', 'price_usd', 'Площадь', 'Комнаты', 'Этаж',
  ],
  duplicateSkip: ['SEO:Slug', '_slug_alias'],
  fields: [
    {
      key: 'Опубликовать', label: 'Опубл.', type: 'bool', showInGrid: true, width: 70,
      help: 'Без галочки юнита нет нигде: ни в каталоге, ни в списке на странице комплекса.',
    },
    {
      key: 'SEO:Title', label: 'Название юнита', type: 'text', showInGrid: true, width: 260,
      help: 'Пусто = соберётся само: «Апартаменты <Комплекс> в <Район> - <Площадь> м², N спальни | Balinsky».',
    },
    { key: 'SEO:Slug', label: 'Slug', type: 'text', showInGrid: true, width: 200 },
    { key: 'Статус', label: 'Статус', type: 'enum', showInGrid: true, width: 130 },
    { key: 'Location', label: 'Район', type: 'link', link: { collection: 'districts', store: 'id-array', nameField: 'Location filter' } },
    { key: 'Location filter', label: 'Район (имя)', type: 'text', readOnly: true, showInGrid: true, width: 150 },
    { key: 'Комнаты', label: 'Комнаты', type: 'number', showInGrid: true, width: 90 },
    { key: 'price_usd', label: 'Цена $', type: 'number', showInGrid: true, width: 110 },
    { key: 'Площадь', label: 'Площадь', type: 'number' },
    { key: 'Этаж', label: 'Этаж', type: 'text' },
    { key: 'Year of completion', label: 'Год сдачи', type: 'enum' },
    { key: 'Разрешение', label: 'Разрешение', type: 'enum' },
    { key: 'Тип сделки', label: 'Тип сделки', type: 'enum' },
    { key: 'Developer', label: 'Застройщик', type: 'link', link: { collection: 'developers', store: 'id-array' } },
    { key: 'Комплекс', label: 'Комплекс', type: 'link', link: { collection: 'complexes', store: 'id-array' } },
    { key: 'Geo', label: 'Geo', type: 'geo' },
    { key: 'Geo 2', label: 'Geo 2', type: 'geo' },
    { key: 'Land color', label: 'Land color', type: 'enum' },
    { key: 'Leasehold', label: 'Leasehold', type: 'enum' },
    { key: 'Цена м²', label: 'Цена м²', type: 'number' },
    { key: 'Цена м² в год', label: 'Цена м² в год', type: 'number' },
    { key: 'Заявленная доходность', label: 'Заявл. доходность', type: 'number' },
    { key: 'TOP', label: 'TOP', type: 'bool' },
    { key: 'Notes', label: 'Заметки', type: 'longtext' },
  ],
}

const complexes: CollectionConfig = {
  key: 'complexes',
  label: 'Жилые комплексы',
  store: 'sql_jsonb',
  table: 'raw_complexes',
  primaryKey: 'airtable_id',
  photo: { bucket: 'complex-photos' },
  caps: { create: true, update: true, delete: true },
  titleField: 'Project',
  publishedField: 'Опубликовать',
  defaultSort: { field: 'Project', dir: 'asc' },
  revalidateKind: 'complexes',
  hideFields: ['photos', 'Renders', 'PDF code', 'Post ID', 'Opt photos'],
  // Everything an editor types by hand for a new project, in the order they
  // type it. The SEO/AI texts, legal-audit blocks and voice-over script stay
  // out of the create form — they are written later, in the record card.
  createFields: [
    'Project', 'slug', 'Developer', 'Статус', 'Статус продаж', 'Готовность',
    'Location', 'Location 2', MAP_LINK_FIELD, 'Типы юнитов', 'Total quantity of units',
    'price_usd', 'Payment plan,%', 'Leasehold', 'Leashold продление',
    'Land color', 'Разрешительные документы', 'PBG', 'Year of completion',
  ],
  // `SEO:Slug` — тот же слаг, что в колонке, только внутри data: по нему ЖК
  // находят база знаний Балины и трекер рынка. Раньше его дублировали руками
  // и забывали, поэтому он проставляется сам (см. adapters/sql-jsonb.ts).
  mirrorSlugField: 'SEO:Slug',
  // Ссылка на локацию имеет ровно один столбец: любой другой ключ, который
  // тоже читается как «ссылка на Google Maps», — заведённый руками дубль.
  // Он прячется из таблицы, а его значение подхватывает канонический ключ.
  dedupe: [{ canonical: MAP_LINK_FIELD, matcher: 'google-map-link' }],
  duplicateSkip: ['slug', 'SEO:Slug'],
  fields: [
    { key: 'Опубликовать', label: 'Опубл.', type: 'bool', showInGrid: true, width: 70 },
    { key: 'Project', label: 'Название', type: 'text', showInGrid: true, width: 240 },
    // Real column, not a `data` key: the detail page resolves /o/<slug>
    // through it, so a complex without a slug is unreachable. Editable
    // because renaming a complex has to be able to move its URL.
    { key: 'slug', label: 'Slug (URL)', type: 'text', column: true, showInGrid: true, width: 200 },
    { key: 'Статус', label: 'Статус', type: 'enum', showInGrid: true, width: 130 },
    { key: 'Статус продаж', label: 'Продажи', type: 'enum', showInGrid: true, width: 130 },
    { key: 'Готовность', label: 'Готовность, %', type: 'percent', showInGrid: true, width: 130 },
    { key: 'price_usd', label: 'Цена $', type: 'number', showInGrid: true, width: 110 },
    { key: 'Year of completion', label: 'Год сдачи', type: 'enum' },
    { key: 'price', label: 'Цена', type: 'number' },
    { key: 'Location', label: 'Локация', type: 'enum' },
    { key: 'Location 2', label: 'Район', type: 'enum' },
    // Карта на странице ЖК рисуется по Geo/Geo 2, а не по этой ссылке, —
    // поэтому при сохранении из неё достаются координаты
    // (lib/admin/map-link-geo.ts). Без ссылки и без Geo блок «Локация» на
    // странице комплекса просто не выводится.
    {
      key: MAP_LINK_FIELD, label: 'Ссылка на локацию (Google Maps)', type: 'text',
      help: 'Вставьте ссылку из Google Maps (в т.ч. короткую maps.app.goo.gl) — координаты для карты подставятся сами.',
    },
    { key: 'Geo', label: 'Geo (широта)', type: 'geo' },
    { key: 'Geo 2', label: 'Geo 2 (долгота)', type: 'geo' },
    { key: 'Developer', label: 'Застройщик', type: 'link', link: { collection: 'developers', store: 'name', nameField: 'Developer1' } },
    { key: 'Developer1', label: 'Застройщик (имя)', type: 'text', readOnly: true },
    { key: 'Типы юнитов', label: 'Типы юнитов', type: 'multienum' },
    { key: 'Total quantity of units', label: 'Всего юнитов', type: 'number' },
    // Условия сделки — то, что редактор дозаполнял вручную в каждом новом ЖК.
    { key: 'Payment plan,%', label: 'Payment plan, %', type: 'text', help: 'Например: 25%+25%+25%+25%' },
    { key: 'Leasehold', label: 'Leasehold, лет', type: 'number' },
    { key: 'Leashold продление', label: 'Leasehold: продление, лет', type: 'text' },
    { key: 'PBG', label: 'PBG (номер)', type: 'text' },
    // Текст блока «О комплексе» на странице ЖК. Панель подставляет сюда то,
    // что сейчас показано на сайте, — правьте прямо в нём. Очистите поле,
    // чтобы вернуться к автоматически сгенерированному тексту.
    // `noAi`: пустое значение здесь осмысленно, автозаполнение его не трогает.
    {
      key: COMPLEX_DESCRIPTION_FIELD, label: 'Описание комплекса (текст на сайте)',
      type: 'longtext', noAi: true,
      help: 'Показывается в блоке «О комплексе». Пусто = автотекст.',
    },
    { key: 'TOP', label: 'TOP', type: 'bool' },
    { key: 'Разрешительные документы', label: 'Документы', type: 'enum' },
    // Legal due-diligence shown on the complex page as two collapsible blocks.
    // ONE ITEM PER LINE — the row headline is the lead of each line, the rest
    // expands. "в порядке" is public; "вопросы" is lead-gated on the site.
    // Сценарий кнопки «Послушать» у названия ЖК. Пишется моделью при первом
    // прослушивании; правка здесь автоматически пересинтезирует аудио.
    { key: VOICE_FIELD, label: 'Озвучка: текст', type: 'longtext' },
    { key: LEGAL_OK_FIELD, label: 'Юр-проверка: в порядке', type: 'longtext' },
    { key: LEGAL_QUESTIONS_FIELD, label: 'Юр-проверка: вопросы (под лидом)', type: 'longtext' },
    { key: LEGAL_BALANCE_FIELD, label: 'Юр-проверка: баланс (0–100 в пользу покупателя)', type: 'text' },
    { key: LEGAL_BALANCE_NOTES_FIELD, label: 'Юр-проверка: баланс обоснование (1-я строка публична)', type: 'longtext' },
  ],
}

const villaUnits: CollectionConfig = {
  key: 'villa_units',
  label: 'Юниты вилл',
  store: 'sql_jsonb',
  table: 'raw_villa_units',
  primaryKey: 'airtable_id',
  caps: { create: true, update: true, delete: true },
  titleField: 'SEO:Title',
  publishedField: 'Опубликовать',
  defaultSort: { field: 'price', dir: 'desc' },
  fields: [
    { key: 'Опубликовать', label: 'Опубл.', type: 'bool', showInGrid: true, width: 70 },
    { key: 'SEO:Title', label: 'Заголовок', type: 'text', showInGrid: true, width: 260 },
    { key: 'Статус', label: 'Статус', type: 'enum', showInGrid: true, width: 130 },
    { key: 'Комнаты', label: 'Комнаты', type: 'number', showInGrid: true, width: 90 },
    { key: 'price', label: 'Цена $', type: 'number', showInGrid: true, width: 110 },
    { key: 'Площадь', label: 'Площадь', type: 'number' },
    { key: 'Developer', label: 'Застройщик', type: 'link', link: { collection: 'developers', store: 'id-array' } },
    { key: 'Комплекс', label: 'Комплекс', type: 'link', link: { collection: 'complexes', store: 'id-array' } },
    { key: 'Geo', label: 'Geo', type: 'geo' },
    { key: 'Notes', label: 'Заметки', type: 'longtext' },
  ],
}

// Юниты от прежней системы парсеров (удалена 2026-08-18 вместе с её
// админкой и кронами). Таблица parser_units осталась с накопленными
// данными и доступна на чтение и ручную правку; рынок теперь ведёт
// трекер — market_units и /admin/market.
const parserUnits: CollectionConfig = {
  key: 'parser_units',
  label: 'Юниты (парсер)',
  store: 'sql_jsonb',
  table: 'parser_units',
  primaryKey: 'unit_key',
  caps: { create: false, update: true, delete: true },
  titleField: 'Name',
  defaultSort: { field: 'Комплекс', dir: 'asc' },
  fields: [
    // Защита: если включено — парсер НЕ перезаписывает и не удаляет эту
    // запись (данные админа приоритетнее), а при расхождении с листом шлёт
    // алерт в Telegram.
    { key: 'Заблокировано', label: '🔒 Защита', type: 'bool', showInGrid: true, width: 90 },
    { key: 'Комплекс', label: 'Комплекс', type: 'text', showInGrid: true, width: 200 },
    { key: 'Name', label: 'Юнит', type: 'text', showInGrid: true, width: 90 },
    { key: 'Тип', label: 'Тип', type: 'enum', enumOptions: ['Вилла', 'Апартаменты'], showInGrid: true, width: 130 },
    { key: 'Статус', label: 'Статус', type: 'enum', enumOptions: ['Доступна', 'Бронь', 'Продана', 'Блок', 'Resale'], showInGrid: true, width: 120 },
    { key: 'Спальни', label: 'Спальни', type: 'number', showInGrid: true, width: 90 },
    { key: 'Цена', label: 'Цена $', type: 'number', showInGrid: true, width: 110 },
    { key: 'Площадь', label: 'Площадь', type: 'number', showInGrid: true, width: 100 },
    { key: 'source', label: 'Источник', type: 'text', readOnly: true, width: 100 },
    { key: 'complex_id', label: 'complex_id', type: 'text', readOnly: true },
  ],
}

const developers: CollectionConfig = {
  key: 'developers',
  label: 'Застройщики',
  store: 'sql_jsonb',
  table: 'raw_developers',
  primaryKey: 'airtable_id',
  // Migration 010 granted service_role full privileges on raw_developers, so
  // the old UPDATE-only restriction is gone and a new developer can be listed
  // here. Delete stays off: complexes/villas/news link to a developer by name
  // and slug, so removing a row would silently orphan those references.
  caps: { create: true, update: true, delete: false },
  titleField: 'Developer',
  // News/promo/events link here with `store: 'name-slug'` and need this slug —
  // it is what the public pages filter those manifests by.
  slugField: 'SEO:Slug',
  publishedField: 'Публикация',
  defaultSort: { field: 'Developer', dir: 'asc' },
  revalidateKind: 'developers',
  uploadBucket: 'developer-logos',
  hideFields: ['Logo'],
  fields: [
    { key: 'logo_url', label: 'Логотип', type: 'image', column: true, showInGrid: true, width: 80 },
    { key: 'Публикация', label: 'Публикация', type: 'bool', showInGrid: true, width: 90 },
    { key: 'Developer', label: 'Название', type: 'text', showInGrid: true, width: 220 },
    { key: 'SEO:Slug', label: 'Slug', type: 'text', showInGrid: true, width: 200 },
    { key: 'telegram_chat_id', label: 'Telegram chat заявок', type: 'text', column: true, showInGrid: true, width: 170 },
    { key: 'Доходность', label: 'Доходность', type: 'longtext' },
    { key: 'Команда', label: 'Команда', type: 'longtext' },
    // Буллиты страницы застройщика: четыре «измерения» (app/ru/zastrojshhiki/
    // [slug]/_detail.tsx) и блок «Бизнес и сервисы». ОДИН ПУНКТ НА СТРОКУ —
    // строки парсятся в список (parseBullets), пустое поле прячет секцию.
    { key: 'Репутация и опыт', label: 'Репутация и опыт', type: 'longtext', help: 'Один пункт на строку' },
    { key: 'Строительство и недвижимость', label: 'Строительство и недвижимость', type: 'longtext', help: 'Один пункт на строку' },
    { key: 'Техника и производство', label: 'Техника и производство', type: 'longtext', help: 'Один пункт на строку' },
    { key: 'Управляющая компания', label: 'Управляющая компания', type: 'longtext', help: 'Один пункт на строку' },
    { key: 'Бизнес и сервисы', label: 'Бизнес и сервисы', type: 'longtext', help: 'Один пункт на строку' },
    { key: 'AI Описание', label: 'AI-описание', type: 'longtext' },
    { key: 'Total quantity of units', label: 'Всего юнитов', type: 'number' },
    { key: 'Активные проекты', label: 'Активные проекты', type: 'text' },
    { key: 'Сданные проекты', label: 'Сданные проекты', type: 'text' },
    { key: 'Location 2', label: 'Район', type: 'enum' },
  ],
}

// --- Storage manifest content ({ generatedAt, count, items: [] }) ----------

const news: CollectionConfig = {
  key: 'news',
  label: 'Новости',
  store: 'storage_manifest',
  bucket: 'news',
  manifestKey: '_news.json',
  itemIdKey: 'id',
  uploadBucket: 'news-photos',
  caps: { create: true, update: true, delete: true },
  titleField: 'title',
  publishedField: 'pinned',
  defaultSort: { field: 'createdAt', dir: 'desc' },
  revalidateKind: 'news',
  fields: [
    // Publication gate for the news-monitor bot: it writes 'draft', and
    // lib/news.ts hides those from every public reader (listing, detail,
    // homepage, developer page, sitemap). Switching to 'published' here is
    // what puts an item on the site. An EMPTY value means published — the
    // records imported before this field existed have none, and they are live.
    {
      key: 'status', label: 'Статус', type: 'enum', enumOptions: ['draft', 'published'],
      showInGrid: true, width: 110,
      help: 'draft — виден только здесь, на сайте его нет. published или пусто — опубликован.',
    },
    { key: 'pinned', label: 'На главной', type: 'bool', showInGrid: true, width: 90 },
    { key: 'title', label: 'Заголовок', type: 'text', showInGrid: true, width: 280 },
    { key: 'slug', label: 'Slug', type: 'text', showInGrid: true, width: 200 },
    { key: 'date', label: 'Дата', type: 'date', showInGrid: true, width: 120 },
    { key: 'createdAt', label: 'Создано', type: 'date', readOnly: true, showInGrid: true, width: 160 },
    { key: 'seoDescription', label: 'SEO-описание', type: 'longtext' },
    { key: 'body', label: 'Текст', type: 'longtext' },
    { key: 'photo', label: 'Фото', type: 'image', showInGrid: true, width: 80 },
    { key: 'externalUrl', label: 'Внешняя ссылка', type: 'text' },
    { key: 'videoUrl', label: 'Видео (URL)', type: 'text' },
    // Airtable used to fill this link (and mirror the name into
    // `complexNames`). Since it was retired, a news item created here had no
    // way to get a developer — and the developer page filters on exactly this
    // (`n.developers.some(d => d.slug === slug)`), so such news never showed
    // up there. The picker restores that, writing the same shape.
    {
      key: 'developers', label: 'Застройщик', type: 'link', showInGrid: true, width: 200,
      link: { collection: 'developers', store: 'name-slug', nameArrayField: 'complexNames' },
    },
    // Despite the name, Airtable filled this with the developer's name, not a
    // complex — kept as a read-only mirror so the detail page chip stays
    // consistent with the 117 records imported before the cutover.
    { key: 'complexNames', label: 'Застройщик (лейбл)', type: 'json', readOnly: true },
  ],
}

const events: CollectionConfig = {
  key: 'events',
  label: 'Мероприятия',
  store: 'storage_manifest',
  bucket: 'events',
  manifestKey: '_events.json',
  itemIdKey: 'id',
  uploadBucket: 'event-photos',
  caps: { create: true, update: true, delete: true },
  titleField: 'title',
  publishedField: 'pinned',
  defaultSort: { field: 'startsAt', dir: 'desc' },
  revalidateKind: 'events',
  fields: [
    { key: 'pinned', label: 'На главной', type: 'bool', showInGrid: true, width: 90 },
    { key: 'title', label: 'Заголовок', type: 'text', showInGrid: true, width: 280 },
    { key: 'slug', label: 'Slug', type: 'text', showInGrid: true, width: 200 },
    // Time matters for an event, and it is Bali local time — the page already
    // renders it that way (components/LocalDateTime.tsx), only the editor was
    // date-only.
    { key: 'startsAt', label: 'Начало (время Бали)', type: 'date', withTime: true, showInGrid: true, width: 170 },
    { key: 'endsAt', label: 'Окончание (время Бали)', type: 'date', withTime: true },
    { key: 'format', label: 'Формат', type: 'enum', showInGrid: true, width: 120 },
    { key: 'seoDescription', label: 'SEO-описание', type: 'longtext' },
    { key: 'body', label: 'Текст', type: 'longtext' },
    { key: 'photo', label: 'Фото', type: 'image', showInGrid: true, width: 80 },
    { key: 'locationUrl', label: 'Локация (URL)', type: 'text' },
    { key: 'registerUrl', label: 'Регистрация (URL)', type: 'text' },
    { key: 'videoUrl', label: 'Видео (URL)', type: 'text' },
    // Declared so a created record is seeded with [] — the events listing
    // reads `e.developers[0]` directly and a missing key 500'd the page.
    // Same picker as news/promo: without it an event never reaches the
    // developer page, which filters on `e.developers[].slug`.
    {
      key: 'developers', label: 'Застройщик', type: 'link', showInGrid: true, width: 200,
      link: { collection: 'developers', store: 'name-slug' },
    },
  ],
}

const promo: CollectionConfig = {
  key: 'promo',
  label: 'Акции',
  store: 'storage_manifest',
  bucket: 'promo',
  manifestKey: '_promo.json',
  itemIdKey: 'id',
  uploadBucket: 'promo-photos',
  caps: { create: true, update: true, delete: true },
  titleField: 'title',
  publishedField: 'pinned',
  defaultSort: { field: 'expiresAt', dir: 'desc' },
  revalidateKind: 'promo',
  fields: [
    { key: 'pinned', label: 'На главной', type: 'bool', showInGrid: true, width: 90 },
    { key: 'top10', label: 'ТОП-10', type: 'bool', showInGrid: true, width: 80 },
    { key: 'title', label: 'Заголовок', type: 'text', showInGrid: true, width: 280 },
    { key: 'slug', label: 'Slug', type: 'text', showInGrid: true, width: 200 },
    { key: 'expiresAt', label: 'Истекает', type: 'date', showInGrid: true, width: 140 },
    { key: 'seoDescription', label: 'SEO-описание', type: 'longtext' },
    { key: 'body', label: 'Текст', type: 'longtext' },
    { key: 'photo', label: 'Фото', type: 'image', showInGrid: true, width: 80 },
    { key: 'externalUrl', label: 'Внешняя ссылка', type: 'text' },
    // Same picker as news — /akcii reads `p.developers[0]` directly and the
    // developer page filters on the slug, so an unlinked promo is invisible
    // there. Seeded as [] on create, which /akcii also relies on.
    {
      key: 'developers', label: 'Застройщик', type: 'link', showInGrid: true, width: 200,
      link: { collection: 'developers', store: 'name-slug', nameArrayField: 'complexNames' },
    },
    { key: 'complexNames', label: 'Застройщик (лейбл)', type: 'json', readOnly: true },
  ],
}

const rental: CollectionConfig = {
  key: 'rental',
  label: 'Аренда',
  store: 'storage_manifest',
  bucket: 'rental',
  manifestKey: '_rental.json',
  itemIdKey: 'id',
  caps: { create: true, update: true, delete: true },
  titleField: 'title',
  defaultSort: { field: 'updatedAt', dir: 'desc' },
  revalidateKind: 'rental',
  fields: [
    { key: 'title', label: 'Заголовок', type: 'text', showInGrid: true, width: 260 },
    { key: 'slug', label: 'Slug', type: 'text', showInGrid: true, width: 180 },
    { key: 'type', label: 'Тип', type: 'enum', showInGrid: true, width: 120 },
    { key: 'bedrooms', label: 'Спальни', type: 'number', showInGrid: true, width: 90 },
    { key: 'location', label: 'Локация', type: 'enum', showInGrid: true, width: 150 },
    { key: 'priceMonthUsd', label: 'Цена/мес $', type: 'number', showInGrid: true, width: 110 },
    { key: 'priceSegment', label: 'Сегмент', type: 'enum' },
    { key: 'notes', label: 'Заметки', type: 'longtext' },
    { key: 'telegram', label: 'Telegram', type: 'text' },
    { key: 'createdTime', label: 'Создано', type: 'date', readOnly: true },
    { key: 'updatedAt', label: 'Обновлено', type: 'date', readOnly: true },
    { key: 'photos', label: 'Фото (массив URL)', type: 'json', readOnly: true },
  ],
}

const knowledge: CollectionConfig = {
  key: 'knowledge',
  label: 'Знания',
  store: 'storage_manifest',
  bucket: 'knowledge',
  manifestKey: '_knowledge.json',
  itemIdKey: 'id',
  uploadBucket: 'knowledge',
  caps: { create: true, update: true, delete: true },
  titleField: 'title',
  defaultSort: { field: 'createdTime', dir: 'desc' },
  revalidateKind: 'knowledge',
  fields: [
    { key: 'title', label: 'Заголовок', type: 'text', showInGrid: true, width: 300 },
    { key: 'slug', label: 'Slug', type: 'text', showInGrid: true, width: 220 },
    { key: 'createdTime', label: 'Создано', type: 'date', readOnly: true, showInGrid: true, width: 160 },
    { key: 'body', label: 'Текст', type: 'longtext' },
    { key: 'photo', label: 'Фото', type: 'image', showInGrid: true, width: 80 },
    { key: 'externalUrl', label: 'Внешняя ссылка', type: 'text' },
  ],
}

const managers: CollectionConfig = {
  key: 'managers',
  label: 'Менеджеры',
  store: 'storage_manifest',
  bucket: 'managers',
  manifestKey: '_managers.json',
  itemIdKey: 'id',
  uploadBucket: 'manager-photos',
  caps: { create: true, update: true, delete: true },
  titleField: 'name',
  defaultSort: { field: 'name', dir: 'asc' },
  revalidateKind: 'managers',
  fields: [
    { key: 'name', label: 'Имя', type: 'text', showInGrid: true, width: 200 },
    { key: 'nameEn', label: 'Имя (EN)', type: 'text', showInGrid: true, width: 200 },
    { key: 'telegram', label: 'Telegram', type: 'text', showInGrid: true, width: 160 },
    { key: 'rating', label: 'Рейтинг', type: 'number', showInGrid: true, width: 90 },
    { key: 'telegramHandle', label: 'TG handle', type: 'text' },
    { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
    { key: 'botRequest', label: 'Bot request', type: 'text' },
    { key: 'photo', label: 'Фото', type: 'image', showInGrid: true, width: 80 },
    { key: 'regalia', label: 'Регалии', type: 'longtext' },
    // Чей это менеджер и его должность. На странице застройщика карточка
    // подписывается только должностью — принадлежность к Balinsky посетителю
    // не показывается.
    { key: 'org', label: 'Чей менеджер', type: 'enum', enumOptions: ['Balinsky', 'Застройщик'], showInGrid: true, width: 130 },
    { key: 'department', label: 'Должность', type: 'enum', showInGrid: true, width: 240,
      enumOptions: ['Руководитель отдела продаж', 'Менеджер отдела продаж', 'Менеджер по работе с агентами'] },
    { key: 'languages', label: 'Языки', type: 'multienum' },
    // Airtable filled this pair through a link column; with Airtable retired the
    // admin owns it — pick застройщиков here and the slug half (what
    // lib/managers.ts filters each developer's page by) is written alongside,
    // index-aligned. Multi: один менеджер может вести несколько застройщиков.
    {
      key: 'developerNames', label: 'Застройщики', type: 'link', showInGrid: true, width: 220,
      link: { collection: 'developers', store: 'name-array', slugArrayField: 'developerSlugs', multi: true },
    },
    { key: 'developerSlugs', label: 'Slugs застройщиков', type: 'json', readOnly: true },
  ],
}

// --- Plain SQL columns (denormalized table) --------------------------------

const baliforumPlaces: CollectionConfig = {
  key: 'baliforum_places',
  label: 'Baliforum места',
  store: 'sql_columns',
  table: 'baliforum_places',
  primaryKey: 'slug',
  uploadBucket: 'viz-photos',
  caps: { create: true, update: true, delete: true },
  titleField: 'name',
  defaultSort: { field: 'rating', dir: 'desc' },
  fields: [
    { key: 'slug', label: 'Slug', type: 'text', showInGrid: true, width: 200 },
    { key: 'name', label: 'Название', type: 'text', showInGrid: true, width: 220 },
    { key: 'category', label: 'Категория', type: 'enum', showInGrid: true, width: 150 },
    { key: 'district', label: 'Район', type: 'enum', showInGrid: true, width: 150 },
    { key: 'rating', label: 'Рейтинг', type: 'number', showInGrid: true, width: 90 },
    { key: 'reviews', label: 'Отзывы', type: 'number', showInGrid: true, width: 90 },
    { key: 'lat', label: 'Lat', type: 'number' },
    { key: 'lng', label: 'Lng', type: 'number' },
    { key: 'address', label: 'Адрес', type: 'text' },
    { key: 'google_place_id', label: 'Google Place ID', type: 'text' },
    { key: 'photo', label: 'Фото', type: 'image', showInGrid: true, width: 80 },
    { key: 'url', label: 'Ссылка', type: 'text' },
    { key: 'tags', label: 'Теги', type: 'json', readOnly: true },
  ],
}

const districts: CollectionConfig = {
  key: 'districts',
  label: 'Районы',
  store: 'storage_manifest',
  bucket: 'districts',
  manifestKey: '_districts.json',
  itemIdKey: 'id',
  caps: { create: true, update: true, delete: true },
  titleField: 'name',
  defaultSort: { field: 'name', dir: 'asc' },
  fields: [
    { key: 'name', label: 'Район', type: 'text', showInGrid: true, width: 200 },
    { key: 'source', label: 'Источник', type: 'text', readOnly: true, showInGrid: true, width: 220 },
    { key: 'descRu', label: 'Описание (RU)', type: 'longtext' },
    { key: 'descEn', label: 'Описание (EN)', type: 'longtext' },
  ],
}

// Видео — карточки YouTube, которые показываются на страницах застройщиков и
// ЖК. Раньше их наливал sync-videos.mjs из Airtable; после его отключения это
// единственный способ их редактировать.
const videos: CollectionConfig = {
  key: 'videos',
  label: 'Видео',
  store: 'storage_manifest',
  bucket: 'feeds',
  manifestKey: '_videos.json',
  itemIdKey: 'id',
  caps: { create: true, update: true, delete: true },
  titleField: 'name',
  defaultSort: { field: 'addedAt', dir: 'desc' },
  revalidateKind: 'videos',
  fields: [
    { key: 'name', label: 'Название', type: 'text', showInGrid: true, width: 280 },
    { key: 'url', label: 'Ссылка YouTube', type: 'text', showInGrid: true, width: 280 },
    { key: 'addedAt', label: 'Добавлено', type: 'date', showInGrid: true, width: 120 },
    // Пусто = видео показывается на всех языках. Иначе список кодов: ["ru"].
    { key: 'languages', label: 'Языки', type: 'multienum' },
    // [{ "name": "XOR", "slug": "xor" }] — slug должен совпадать со slug
    // застройщика/комплекса, иначе видео просто нигде не появится.
    { key: 'developers', label: 'Застройщики [{name, slug}]', type: 'json' },
    { key: 'complexes', label: 'Комплексы [{name, slug}]', type: 'json' },
    // Заполняется автоматически из ссылки (lib/videos.ts), нужен только для
    // JSON-LD. Оставьте пустым, если не хотите переопределять.
    { key: 'embedUrl', label: 'Embed URL (авто)', type: 'text' },
  ],
}

export const COLLECTIONS: Record<string, CollectionConfig> = {
  villas,
  apartments,
  complexes,
  villa_units: villaUnits,
  parser_units: parserUnits,
  developers,
  districts,
  news,
  events,
  promo,
  rental,
  knowledge,
  managers,
  videos,
  baliforum_places: baliforumPlaces,
}

export function getCollection(key: string): CollectionConfig | null {
  return COLLECTIONS[key] ?? null
}

export function listCollections(): CollectionConfig[] {
  return Object.values(COLLECTIONS)
}
