import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 травня 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Контакти | Balinsky',
  description: 'Як звʼязатися з Balinsky: Telegram-бот, Telegram-канал, електронна пошта, YouTube. Партнерські контакти для забудовників та агенцій.',
  alternates: {
    canonical: '/uk/kontakty',
    languages: {
      ru: `${SITE_URL}/ru/kontakty`,
      uk: `${SITE_URL}/uk/kontakty`,
      'x-default': `${SITE_URL}/ru/kontakty`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="uk" title="Контакти" updated={`Інформація актуальна станом на: ${UPDATED}`} breadcrumbLabel="Контакти">
      <p>
        Найшвидший шлях — Telegram-бот. Він спрямовує ваш запит до менеджера конкретного обʼєкта й відповідає протягом години в робочий час.
      </p>

      <h2>Для покупців нерухомості</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram-бот</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Запити щодо конкретних вілл, апартаментів і комплексів. Спрямовуються до менеджера оператора.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Mail size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Електронна пошта</strong> — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Для письмових запитів із вкладеннями або звернень щодо захисту даних.</div>
          </div>
        </li>
      </ul>

      <h2>Новини ринку</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MessageCircle size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram-канал</strong> — <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Нові обʼєкти, акції, огляди ринку Балі, інвестиційні кейси.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Play size={20} className="text-[#FF0000] mt-0.5 shrink-0" fill="currentColor" />
          <div>
            <strong>YouTube</strong> — <a href="https://www.youtube.com/@balinsky_info" target="_blank" rel="noopener">@balinsky_info</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Огляди обʼєктів на місці, інтервʼю із забудовниками, аналіз ринку.</div>
          </div>
        </li>
      </ul>

      <h2>Партнерство</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Забудовники</strong> — додайте свій проєкт до каталогу, запустіть платне розміщення або спільний канал залучення клієнтів:
            пишіть на <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Партнерство (забудовник)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Агенції нерухомості</strong> — обмін клієнтами, реферальна програма, каталог white-label:
            пишіть на <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Партнерство (агенція)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Оператор сайту</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            Андрій Слєсарєв, фізична особа-підприємець (Грузія).
            {/* TODO: add registration number / legal address for formal requests. */}
          </div>
        </li>
      </ul>

      <h2>Час відповіді</h2>
      <p>
        Стандарт обслуговування — відповідь протягом однієї години в робочий час (10:00–20:00 WITA, UTC+8).
        Запити, отримані вночі, опрацьовуються наступного ранку.
      </p>

      <h2>Повʼязані документи</h2>
      <ul>
        <li><Link href="/uk/konfidentsiynist">Політика конфіденційності</Link></li>
        <li><Link href="/uk/umovy">Умови користування</Link></li>
        <li><Link href="/uk/pro-nas">Про Balinsky</Link></li>
      </ul>
    </LegalLayout>
  )
}
