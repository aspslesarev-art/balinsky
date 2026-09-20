import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'
import { hreflangMap } from '@/lib/hreflang'

const UPDATED = '15 травня 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Контакти | Balinsky',
  description: 'Як звʼязатися з Balinsky: Telegram-бот, Telegram-канал, електронна пошта, YouTube. Партнерські контакти для забудовників та агенцій.',
  alternates: {
    canonical: '/ua/kontakty',
    languages: hreflangMap('/ru/kontakty'),
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="uk" title="Контакти" updated={`Інформація актуальна станом на: ${UPDATED}`} breadcrumbLabel="Контакти">
      <p>
        Balinsky.info — інформаційний каталог. Контакти нижче потрібні для питань про сам сайт: про дані в картці, про неточність, про розміщення проєкту. Щодо конкретного обʼєкта пишіть напряму забудовнику — його Telegram і WhatsApp вказані в картці цього обʼєкта.
      </p>

      <h2>Питання щодо сайту та даних</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Telegram-бот</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Питання щодо каталогу та даних обʼєкта. Якщо питання про ціну, строки або бронь — ставити його треба забудовнику, а не нам.</div>
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
            <strong>Забудовники</strong> — додайте свій проєкт до каталогу, запустіть платне розміщення або замовте відеоогляд:
            пишіть на <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Партнерство (забудовник)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Агенції нерухомості</strong> — розміщення інформації про проєкти, які ви представляєте, і реклама на сайті:
            пишіть на <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Партнерство (агенція)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Оператор сайту</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            <strong>ФОП Andrei Slesarau</strong>, Грузія.<br />
            Реєстраційний номер 316362404, зареєстровано 06.01.2022.<br />
            Юридична адреса: 19 Shartava St., Rustavi, Georgia.<br />
            <span className="text-[13px] text-[var(--color-text-muted)]">
              Усі договори на розміщення реклами та рахунки виставляються від цієї особи, за законодавством Грузії.
              Послуг на території Індонезії оператор сайту не надає.
            </span>
          </div>
        </li>
      </ul>

      <h2>Час відповіді</h2>
      <p>
        На питання щодо сайту відповідаємо в робочий час (10:00–20:00 WITA, UTC+8), зазвичай протягом доби.
        Швидкість відповіді забудовника від нас не залежить — значення в картці обʼєкта наведене довідково.
      </p>

      <h2>Повʼязані документи</h2>
      <ul>
        <li><Link href="/ua/konfidentsiynist">Політика конфіденційності</Link></li>
        <li><Link href="/ua/umovy">Умови користування</Link></li>
        <li><Link href="/ua/pro-nas">Про Balinsky</Link></li>
      </ul>
    </LegalLayout>
  )
}
