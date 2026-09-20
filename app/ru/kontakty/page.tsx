import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'
import { hreflangMap } from '@/lib/hreflang'

const UPDATED = '20 сентября 2026 г.'
const CONTACT_EMAIL = 'i@balinsky.info'

export const metadata: Metadata = {
  title: 'Контакты | Balinsky',
  description: 'Связь с Balinsky: Telegram-бот, Telegram-канал, email и YouTube. Реквизиты оператора сайта и условия размещения рекламы для застройщиков.',
  alternates: {
    canonical: '/ru/kontakty',
    languages: hreflangMap('/ru/kontakty'),
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="ru" title="Контакты" updated={`Информация актуальна на: ${UPDATED}`} breadcrumbLabel="Контакты">
      <p>
        Balinsky.info — информационный каталог. Контакты ниже нужны для вопросов о самом сайте: о данных в карточках,
        о неточностях, о размещении проекта. По конкретному объекту пишите напрямую застройщику — его Telegram и
        WhatsApp указаны в карточке этого объекта.
      </p>

      <h2>Вопросы по сайту и данным</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram-бот</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Вопросы по каталогу и по данным объекта. Если вопрос про цену, сроки или бронь — задавать его нужно застройщику, а не нам.</div>
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
            <strong>Застройщики</strong> — добавить проект в каталог, прислать документы, планировки или видео с площадки:
            пишите на <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Размещение (застройщик)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Агентства недвижимости</strong> — размещение информации о проектах, которые вы представляете:
            пишите на <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Размещение (агентство)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Роль сайта</h2>
      <p>
        Balinsky.info публикует информацию об объектах и не является стороной сделок. Мы не агентство недвижимости: не продаём объекты, не ведём переговоры, не берём комиссию и не принимаем платежи. Для официальных запросов используйте email выше.
      </p>

      <h2>Время ответа</h2>
      <p>
        На вопросы о сайте отвечаем в рабочее время (10:00–20:00 WITA, UTC+8), обычно в течение суток. Скорость ответа
        застройщика от нас не зависит — она указана в карточке объекта справочно.
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
