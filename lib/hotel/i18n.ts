// Строки гостевого портала. На старте три языка (ТЗ 14.4), остальные семь из
// раздела 4.2 добавляются сюда же — ни одной строки интерфейса в компонентах.
//
// Нет перевода — показываем английский, а не ключ и не пустоту (ТЗ 4.2).

export const PORTAL_LANGS = ['en', 'ru', 'zh'] as const
export type PortalLang = (typeof PORTAL_LANGS)[number]

export const LANG_CHIP: Record<PortalLang, string> = { en: 'EN', ru: 'RU', zh: '中文' }
export const LANG_NAME: Record<PortalLang, string> = { en: 'English', ru: 'Русский', zh: '中文' }

export function isPortalLang(v: unknown): v is PortalLang {
  return typeof v === 'string' && (PORTAL_LANGS as readonly string[]).includes(v)
}

type Dict = {
  ask_title: string; ask_sub: string
  sec_hotel: string; sec_bali: string; sec_room: string; sec_every: string
  from: string; included: string; once: string; day: string; hour: string; kg: string
  need_else: string; back: string; order: string; order_title: string
  f_what: string; f_time: string; f_wa: string; f_wa_err: string; send_req: string
  sent_title: string; sent_sub: string; back_cat: string
  chat_ph: string; send: string; chat_empty: string
  or_messenger: string; open_in: string
  reception: string; you: string; hello: string; price_tip: string
  empty_catalog: string; failed: string
}

const EN: Dict = {
  ask_title: 'Ask us anything',
  ask_sub: 'Any language, 24/7. We reply in minutes.',
  sec_hotel: 'At the hotel', sec_bali: 'Popular in Bali', sec_room: 'To your room', sec_every: 'Everyday',
  from: 'from {p}', included: 'Included', once: '', day: '/day', hour: '/h', kg: '/kg',
  need_else: 'Need something else? → Message us',
  back: 'Back', order: 'Order', order_title: 'Order: {item}',
  f_what: 'What do you need? (optional)',
  f_time: 'Convenient time (optional)',
  f_wa: 'Your WhatsApp number',
  f_wa_err: 'Enter a WhatsApp number, at least 6 digits',
  send_req: 'Send request',
  sent_title: 'Request sent', sent_sub: "We'll confirm on WhatsApp within minutes.",
  back_cat: 'Back to catalog',
  chat_ph: 'Write to reception…', send: 'Send',
  chat_empty: 'Write here. Reception sees your room number and language automatically.',
  or_messenger: 'Or continue in your messenger', open_in: 'Open {app}',
  reception: 'Reception', you: 'You', hello: 'Hello!', price_tip: 'Prices in USD',
  empty_catalog: 'The catalog is being filled in. Message us — we will arrange anything.',
  failed: 'Not sent. Check your connection and try again.',
}

const RU: Dict = {
  ask_title: 'Спросите нас о чём угодно',
  ask_sub: 'На любом языке, круглосуточно. Отвечаем за минуты.',
  sec_hotel: 'В отеле', sec_bali: 'Популярное на Бали', sec_room: 'В номер', sec_every: 'Каждый день',
  from: 'от {p}', included: 'Включено', once: '', day: '/день', hour: '/час', kg: '/кг',
  need_else: 'Нужно что-то ещё? → Напишите нам',
  back: 'Назад', order: 'Заказать', order_title: 'Заказ: {item}',
  f_what: 'Что нужно? (необязательно)',
  f_time: 'Удобное время (необязательно)',
  f_wa: 'Ваш номер WhatsApp',
  f_wa_err: 'Введите номер WhatsApp, минимум 6 цифр',
  send_req: 'Отправить заявку',
  sent_title: 'Заявка отправлена', sent_sub: 'Подтвердим в WhatsApp в течение нескольких минут.',
  back_cat: 'Вернуться в каталог',
  chat_ph: 'Написать на ресепшн…', send: 'Отправить',
  chat_empty: 'Пишите здесь. Ресепшн сразу видит номер и ваш язык.',
  or_messenger: 'Или продолжить в мессенджере', open_in: 'Открыть {app}',
  reception: 'Ресепшн', you: 'Вы', hello: 'Здравствуйте!', price_tip: 'Цены в долларах США',
  empty_catalog: 'Каталог ещё наполняется. Напишите нам — организуем что угодно.',
  failed: 'Не отправилось. Проверьте связь и попробуйте ещё раз.',
}

const ZH: Dict = {
  ask_title: '有问题随时问我们',
  ask_sub: '任何语言，全天候。几分钟内回复。',
  sec_hotel: '酒店内', sec_bali: '巴厘岛热门', sec_room: '送到房间', sec_every: '日常',
  from: '{p}起', included: '已包含', once: '', day: '/天', hour: '/小时', kg: '/公斤',
  need_else: '还需要其他服务？→ 联系我们',
  back: '返回', order: '预订', order_title: '预订：{item}',
  f_what: '需要什么？（选填）',
  f_time: '方便的时间（选填）',
  f_wa: '您的WhatsApp号码',
  f_wa_err: '请输入WhatsApp号码，至少6位数字',
  send_req: '发送请求',
  sent_title: '请求已发送', sent_sub: '我们将在几分钟内通过WhatsApp确认。',
  back_cat: '返回目录',
  chat_ph: '给前台留言…', send: '发送',
  chat_empty: '在这里留言。前台会自动看到您的房号和语言。',
  or_messenger: '或在您的聊天软件中继续', open_in: '打开{app}',
  reception: '前台', you: '您', hello: '您好！', price_tip: '价格以美元计',
  empty_catalog: '目录正在完善中。给我们留言，我们可以安排任何服务。',
  failed: '发送失败。请检查网络后重试。',
}

const DICTS: Record<PortalLang, Dict> = { en: EN, ru: RU, zh: ZH }

export function pt(lang: PortalLang, key: keyof Dict, vars?: Record<string, string>): string {
  let s = DICTS[lang]?.[key] ?? EN[key] ?? String(key)
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v)
  return s
}

/** Значение i18n-поля каталога на языке гостя, с откатом на английский. */
export function pick(field: unknown, lang: PortalLang): string {
  if (typeof field === 'string') return field
  if (field && typeof field === 'object') {
    const map = field as Record<string, unknown>
    const v = map[lang] ?? map.en
    if (typeof v === 'string') return v
    // Ни языка гостя, ни английского — берём любое непустое, лишь бы не пустота.
    for (const candidate of Object.values(map)) if (typeof candidate === 'string' && candidate) return candidate
  }
  return ''
}

/** «$40», «$8/day», «Included» — как цена показывается гостю (ТЗ 14.5). */
export function priceLabel(
  price: number | null | undefined, unit: string | null | undefined, lang: PortalLang,
): string {
  if (price == null || price === 0) return pt(lang, 'included')
  const suffix = unit && unit !== 'once' ? pt(lang, unit as 'day' | 'hour' | 'kg') : ''
  return `$${price}${suffix}`
}
