import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 мая 2026 г.'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Контакты | Balinsky',
  description: 'Связь с Balinsky: Telegram-бот, прямой Telegram-канал, email и YouTube. Контакты для сотрудничества с застройщиками и агентствами.',
  alternates: {
    canonical: '/ru/kontakty',
    languages: {
      ru: `${SITE_URL}/ru/kontakty`,
      en: `${SITE_URL}/en/contact`,
      'x-default': `${SITE_URL}/ru/kontakty`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="ru" title="Контакты" updated={`Информация актуальна на: ${UPDATED}`} breadcrumbLabel="Контакты">
      <p>
        Самый быстрый способ связи — Telegram-бот. Он соединит вас с менеджером по конкретному объекту в течение часа в рабочее время.
      </p>

      <h2>Покупателям объектов</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram-бот</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Заявки по конкретным виллам, апартаментам и ЖК. Передаём менеджеру оператора, который ведёт объект.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Mail size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Email</strong> — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Если нужно письменно с прикреплёнными документами или для запросов по данным.</div>
          </div>
        </li>
      </ul>

      <h2>Подписка на новости рынка</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MessageCircle size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram-канал</strong> — <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Новые объекты, акции, обзоры рынка Бали, инвестиционные кейсы.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Play size={20} className="text-[#FF0000] mt-0.5 shrink-0" fill="currentColor" />
          <div>
            <strong>YouTube</strong> — <a href="https://www.youtube.com/@balinsky_info" target="_blank" rel="noopener">@balinsky_info</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Видеообзоры объектов с земли, интервью с застройщиками, аналитика рынка.</div>
          </div>
        </li>
      </ul>

      <h2>Сотрудничество</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Застройщики</strong> — добавить ваш проект в каталог, разместить рекламу, запустить совместный лид-канал:
            пишите на <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Сотрудничество (застройщик)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Агентства недвижимости</strong> — обмен лидами, реферальная программа, белый ярлык каталога:
            пишите на <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Сотрудничество (агентство)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Оператор сайта</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            Андрей Слесарев, индивидуальный предприниматель (Грузия).
            {/* TODO: уточнить регистрационный номер и юридический адрес ИП для официальных запросов. */}
          </div>
        </li>
      </ul>

      <h2>Время ответа</h2>
      <p>
        Стандарт обслуживания — ответ в течение часа в рабочее время (10:00–20:00 WITA, UTC+8). Заявки на объекты,
        отправленные ночью, обрабатываем утром.
      </p>

      <h2>Связанные документы</h2>
      <ul>
        <li><Link href="/ru/politika-konfidencialnosti">Политика конфиденциальности</Link></li>
        <li><Link href="/ru/usloviya">Условия использования</Link></li>
        <li><Link href="/ru/o-balinsky">О Balinsky — кто мы и кому доверяют</Link></li>
      </ul>
    </LegalLayout>
  )
}
