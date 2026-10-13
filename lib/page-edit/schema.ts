// Человеческая форма правки страницы (застройщик, ЖК, вилла, апартаменты).
//
// Админка /admin/data показывает запись целиком — ~140 сырых ключей вида
// `Year of completion ` и `Land color`. Для робота это удобно, для человека нет.
// Здесь — короткий список того, что реально видно на странице, по разделам,
// с понятными подписями и вводом по типу (кнопки выбора, список пунктов, ссылка
// на карту вместо двух координат).
//
// Ключи — настоящие ключи JSONB `data` (или колонки), те же, что читают
// страницы. Этот же список — белый список записи для /api/page-edit: ничего
// за его пределами через форму не пишется.
//
// Названий (застройщика, ЖК) в форме нет намеренно: ЖК и юниты ссылаются на
// них по имени, и переименование здесь молча оторвало бы их от страницы.
// Переименовывает команда через «Все поля».
//
// Файл клиент-безопасный: его читают и форма, и API.

import { COMPLEX_DESCRIPTION_FIELD } from '@/lib/complex-description'
import { DEVELOPER_DESCRIPTION_FIELD } from '@/lib/developer-description'
import { LEGAL_OK_FIELD, LEGAL_QUESTIONS_FIELD } from '@/lib/legal-audit'

export type EditKind = 'developer' | 'complex' | 'villa' | 'apartment'

export const EDIT_KINDS: readonly EditKind[] = ['developer', 'complex', 'villa', 'apartment']

/** Коллекция админ-движка (lib/admin/collections.ts) для каждого вида. */
export const COLLECTION_OF: Record<EditKind, string> = {
  developer: 'developers',
  complex: 'complexes',
  villa: 'villas',
  apartment: 'apartments',
}

export type InputKind =
  | 'text'      // одна строка
  | 'textarea'  // абзац текста
  | 'list'      // список пунктов, в базе — один пункт на строку
  | 'number'
  | 'money'     // число в долларах
  | 'percent'   // 0–100 на экране, 0–1 в базе
  | 'choice'    // одна кнопка из вариантов (свой вариант — можно)
  | 'chips'     // несколько кнопок
  | 'toggle'
  | 'image'     // одна картинка (логотип)
  | 'map'       // ссылка Google Maps → Geo + Geo 2

export type EditField = {
  key: string
  label: string
  input: InputKind
  hint?: string
  placeholder?: string
  suffix?: string
  options?: string[]
  /** Сначала читаем первый непустой из этих ключей (дубли с разным написанием). */
  readFrom?: string[]
  /** Пишем значение и сюда тоже — чтобы страница, читающая дубль, увидела правку. */
  alsoWrite?: string[]
  /** Настоящая колонка таблицы, а не ключ `data`. */
  column?: boolean
  /** Для toggle: что писать в базу вместо true (поле-строка вроде «Продано»). */
  trueValue?: string
  /** Только для команды Balinsky, застройщику поле не показываем и не даём писать. */
  staffOnly?: boolean
}

export type EditSection = {
  id: string
  title: string
  hint?: string
  fields: EditField[]
  /** Раздел целиком только для команды. */
  staffOnly?: boolean
}

const BUILD_STATUS = ['Строится', 'Построен', 'Под заказ']
const PERMITS = ['нет', 'Заявка PBG', 'PBG', 'Заявка SLF', 'SLF']

const developer: EditSection[] = [
  {
    id: 'main', title: 'Главное',
    fields: [
      { key: 'logo_url', label: 'Логотип', input: 'image', column: true },
      { key: 'Публикация', label: 'Показывать на сайте', input: 'toggle', staffOnly: true },
    ],
  },
  {
    id: 'about', title: 'О компании',
    fields: [
      {
        key: DEVELOPER_DESCRIPTION_FIELD, label: 'Описание', input: 'textarea',
        hint: 'Текст «О застройщике». Если стереть всё - вернётся автоматический текст.',
      },
      { key: 'Строительство и недвижимость', label: 'Проекты и стройка', input: 'list', placeholder: 'Сдано 5 вилл в Чангу' },
      { key: 'Репутация и опыт', label: 'Репутация и опыт', input: 'list', placeholder: 'На рынке Бали с 2018 года' },
      { key: 'Команда', label: 'Команда', input: 'list', placeholder: 'Основатель - Иван Иванов' },
      { key: 'Управляющая компания', label: 'Управляющая компания', input: 'list', placeholder: 'Своя УК, 40 объектов в управлении' },
      { key: 'Техника и производство', label: 'Техника и производство', input: 'list' },
      { key: 'Бизнес и сервисы', label: 'Бизнес и сервисы', input: 'list', placeholder: 'Ресторан, спа, коворкинг' },
    ],
  },
]

const complex: EditSection[] = [
  {
    id: 'main', title: 'Главное',
    fields: [
      { key: 'Статус', label: 'Стройка', input: 'choice', options: BUILD_STATUS },
      { key: 'Готовность', label: 'Готовность', input: 'percent', suffix: '%' },
      {
        key: 'Year of completion', label: 'Срок сдачи', input: 'text', placeholder: '4 кв. 2027',
        readFrom: ['Year of completion ', 'Year of completion'], alsoWrite: ['Year of completion '],
      },
      { key: 'Типы юнитов', label: 'Что продаётся', input: 'chips', options: ['Виллы', 'Апартаменты', 'Таунхаусы', 'Пентхаусы', 'Смарт виллы', 'Hotel', 'Commercial'] },
      { key: 'Total quantity of units', label: 'Всего юнитов', input: 'number' },
      { key: 'Статус продаж', label: 'Всё продано', input: 'toggle', trueValue: 'Продано', hint: 'Включите, когда свободных юнитов не осталось.' },
      { key: 'Опубликовать', label: 'Показывать на сайте', input: 'toggle', staffOnly: true },
    ],
  },
  {
    id: 'place', title: 'Где находится',
    hint: 'Точка на карте нужна для блоков «Как добраться», «Что вокруг» и доходности. Виллы и апартаменты комплекса получат её сами.',
    fields: [
      { key: 'Geo', label: 'Точка на карте', input: 'map' },
      { key: 'Location', label: 'Район', input: 'choice', options: ['Canggu', 'Bukit', 'Ubud', 'Sanur', 'Seminyak', 'Tabanan', 'Mengwi', 'Nusa Penida'] },
      { key: 'Location 2', label: 'Посёлок или улица', input: 'text', placeholder: 'Pererenan' },
    ],
  },
  {
    id: 'terms', title: 'Условия и документы',
    fields: [
      { key: 'Leasehold', label: 'Лизхолд', input: 'number', suffix: 'лет', readFrom: ['Leasehold', 'Leashold'] },
      { key: 'Leashold продление', label: 'Продление лизхолда', input: 'text', placeholder: '25 лет' },
      { key: 'Payment plan,%', label: 'Рассрочка', input: 'text', placeholder: '30% + 30% + 40%' },
      { key: 'Разрешительные документы', label: 'Разрешение на стройку', input: 'choice', options: PERMITS },
      { key: 'PBG', label: 'Номер PBG', input: 'text', placeholder: 'PBG-510406-20032024-01' },
    ],
  },
  {
    id: 'about', title: 'Описание',
    fields: [
      {
        key: COMPLEX_DESCRIPTION_FIELD, label: 'О комплексе', input: 'textarea',
        hint: 'Если стереть всё - вернётся автоматический текст.',
      },
    ],
  },
  {
    id: 'legal', title: 'Юридическая проверка', staffOnly: true,
    fields: [
      { key: LEGAL_OK_FIELD, label: 'Что в порядке', input: 'list' },
      { key: LEGAL_QUESTIONS_FIELD, label: 'Вопросы и что запросить', input: 'list' },
    ],
  },
]

const unitMain = (priceKey: string): EditField[] => [
  { key: 'Опубликовать', label: 'Показывать на сайте', input: 'toggle' },
  { key: priceKey, label: 'Цена', input: 'money', suffix: '$' },
  { key: 'Комнаты', label: 'Спальни', input: 'number' },
  { key: 'Площадь', label: 'Площадь', input: 'number', suffix: 'м²' },
]

const villa: EditSection[] = [
  {
    id: 'main', title: 'Главное',
    fields: [
      ...unitMain('price'),
      { key: 'Земля', label: 'Участок', input: 'number', suffix: 'м²' },
      { key: 'Type', label: 'Тип', input: 'choice', options: ['Villa', 'Townhouse', 'Smart villa'] },
      { key: 'Статус', label: 'Стройка', input: 'choice', options: BUILD_STATUS },
      { key: 'Заявленная доходность', label: 'Доходность по словам застройщика', input: 'number', suffix: '% в год' },
    ],
  },
]

const apartment: EditSection[] = [
  {
    id: 'main', title: 'Главное',
    fields: [
      ...unitMain('price_usd'),
      { key: 'Этаж', label: 'Этаж', input: 'text' },
      { key: 'Статус', label: 'Стройка', input: 'choice', options: BUILD_STATUS },
      { key: 'Заявленная доходность', label: 'Доходность по словам застройщика', input: 'number', suffix: '% в год' },
    ],
  },
]

/** Имя нового ЖК — только при создании (см. комментарий в шапке про названия). */
export const COMPLEX_NAME_FIELD: EditField = { key: 'Project', label: 'Как комплекс называется на сайте', input: 'text', placeholder: 'Например, Green Village' }
export const NEW_COMPLEX_SECTION: EditSection = { id: 'name', title: 'Название', fields: [COMPLEX_NAME_FIELD] }

export const SECTIONS: Record<EditKind, EditSection[]> = { developer, complex, villa, apartment }

export const KIND_LABEL: Record<EditKind, string> = {
  developer: 'Застройщик',
  complex: 'Жилой комплекс',
  villa: 'Вилла',
  apartment: 'Апартаменты',
}

export type EditorRole = 'staff' | 'developer'

/** Поля, которые эта роль видит и может писать. */
export function fieldsFor(kind: EditKind, role: EditorRole): EditField[] {
  const out: EditField[] = []
  for (const s of SECTIONS[kind]) {
    if (s.staffOnly && role !== 'staff') continue
    for (const f of s.fields) {
      if (f.staffOnly && role !== 'staff') continue
      out.push(f)
    }
  }
  return out
}

export function isEditKind(v: string): v is EditKind {
  return (EDIT_KINDS as readonly string[]).includes(v)
}
