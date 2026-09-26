// Готовый текст первого сообщения в WhatsApp менеджеру застройщика.
// Человек нажимает кнопку на странице объекта — и чат открывается уже с
// «Здравствуйте! Меня интересует …», на языке страницы, с названием,
// комплексом, ценой и ссылкой на страницу Balinsky (по ней менеджер
// сразу видит, о каком юните речь).

import type { Lang } from '@/lib/i18n'

export type ContactInquiry = {
  kind: 'villa' | 'apartment' | 'complex' | 'developer'
  // Заголовок страницы: для юнита — «Вилла X в Y - 160 м², 2 спальни»,
  // для ЖК — его название, для застройщика — название компании.
  name: string
  complexName?: string | null
  priceUsd?: number | null
}

type Copy = {
  unit: (x: string) => string
  complex: (x: string) => string
  developer: (x: string) => string
  complexLabel: string
  priceLabel: string
  // Для ЖК цена — нижняя граница по юнитам.
  priceFromLabel: string
  link: string
}

const RU: Copy = {
  unit: x => `Здравствуйте! Меня интересует объект: ${x}.`,
  complex: x => `Здравствуйте! Меня интересует комплекс ${x}.`,
  developer: x => `Здравствуйте! Меня интересуют проекты ${x}.`,
  complexLabel: 'Комплекс', priceLabel: 'Цена', priceFromLabel: 'Цена от', link: 'Ссылка на Balinsky:',
}
const EN: Copy = {
  unit: x => `Hello! I'm interested in this property: ${x}.`,
  complex: x => `Hello! I'm interested in the ${x} complex.`,
  developer: x => `Hello! I'm interested in ${x} projects.`,
  complexLabel: 'Complex', priceLabel: 'Price', priceFromLabel: 'Price from', link: 'Balinsky link:',
}
const ID: Copy = {
  unit: x => `Halo! Saya tertarik dengan properti ini: ${x}.`,
  complex: x => `Halo! Saya tertarik dengan kompleks ${x}.`,
  developer: x => `Halo! Saya tertarik dengan proyek ${x}.`,
  complexLabel: 'Kompleks', priceLabel: 'Harga', priceFromLabel: 'Harga mulai', link: 'Tautan Balinsky:',
}

const COPY: Record<Lang, Copy> = {
  ru: RU,
  en: EN,
  id: ID,
  // Балийский: менеджеры читают по-индонезийски, а шаблон на балийском
  // без носителя рискует звучать неестественно.
  ban: ID,
  fr: {
    unit: x => `Bonjour ! Ce bien m’intéresse : ${x}.`,
    complex: x => `Bonjour ! La résidence ${x} m’intéresse.`,
    developer: x => `Bonjour ! Les projets de ${x} m’intéressent.`,
    complexLabel: 'Résidence', priceLabel: 'Prix', priceFromLabel: 'Prix à partir de', link: 'Lien Balinsky :',
  },
  de: {
    unit: x => `Hallo! Ich interessiere mich für dieses Objekt: ${x}.`,
    complex: x => `Hallo! Ich interessiere mich für die Wohnanlage ${x}.`,
    developer: x => `Hallo! Ich interessiere mich für die Projekte von ${x}.`,
    complexLabel: 'Wohnanlage', priceLabel: 'Preis', priceFromLabel: 'Preis ab', link: 'Link auf Balinsky:',
  },
  zh: {
    unit: x => `您好！我对这个房源感兴趣：${x}。`,
    complex: x => `您好！我对${x}项目感兴趣。`,
    developer: x => `您好！我对${x}的项目感兴趣。`,
    complexLabel: '项目', priceLabel: '价格', priceFromLabel: '起价', link: 'Balinsky 链接：',
  },
  nl: {
    unit: x => `Hallo! Ik ben geïnteresseerd in dit object: ${x}.`,
    complex: x => `Hallo! Ik ben geïnteresseerd in het complex ${x}.`,
    developer: x => `Hallo! Ik ben geïnteresseerd in de projecten van ${x}.`,
    complexLabel: 'Complex', priceLabel: 'Prijs', priceFromLabel: 'Prijs vanaf', link: 'Link op Balinsky:',
  },
  pl: {
    unit: x => `Dzień dobry! Interesuje mnie ta nieruchomość: ${x}.`,
    complex: x => `Dzień dobry! Interesuje mnie inwestycja ${x}.`,
    developer: x => `Dzień dobry! Interesują mnie inwestycje ${x}.`,
    complexLabel: 'Inwestycja', priceLabel: 'Cena', priceFromLabel: 'Cena od', link: 'Link w Balinsky:',
  },
  uk: {
    unit: x => `Добрий день! Мене цікавить об’єкт: ${x}.`,
    complex: x => `Добрий день! Мене цікавить комплекс ${x}.`,
    developer: x => `Добрий день! Мене цікавлять проєкти ${x}.`,
    complexLabel: 'Комплекс', priceLabel: 'Ціна', priceFromLabel: 'Ціна від', link: 'Посилання на Balinsky:',
  },
}

export function buildInquiryText(lang: Lang, inq: ContactInquiry, pageUrl: string): string {
  const c = COPY[lang] ?? EN
  const name = inq.name.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
  const lines: string[] = []
  if (inq.kind === 'developer') lines.push(c.developer(name))
  else if (inq.kind === 'complex') lines.push(c.complex(name))
  else {
    lines.push(c.unit(name))
    if (inq.complexName && !name.toLowerCase().includes(inq.complexName.toLowerCase())) {
      lines.push(`${c.complexLabel}: ${inq.complexName}`)
    }
  }
  if (inq.priceUsd && inq.kind !== 'developer') {
    const label = inq.kind === 'complex' ? c.priceFromLabel : c.priceLabel
    lines.push(`${label}: $${Math.round(inq.priceUsd).toLocaleString('en-US')}`)
  }
  lines.push(`${c.link} ${pageUrl}`)
  return lines.join('\n')
}
