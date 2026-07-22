import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 травня 2026'

export const metadata: Metadata = {
  title: 'Політика щодо файлів cookie | Balinsky',
  description: 'Які файли cookie використовує Balinsky.info: суворо необхідні, аналітичні, маркетингові — і як їх вимкнути.',
  alternates: {
    canonical: '/ua/cookie',
    languages: {
      ru: `${SITE_URL}/ru/cookie`,
      uk: `${SITE_URL}/ua/cookie`,
      'x-default': `${SITE_URL}/ru/cookie`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="uk" title="Політика щодо файлів cookie" updated={`Останнє оновлення: ${UPDATED}`} breadcrumbLabel="Політика щодо файлів cookie">
      <p>
        Файли cookie — це невеликі текстові файли, які сайт зберігає у вашому браузері. Вони запамʼятовують ваші налаштування й допомагають нам
        зрозуміти, як використовується каталог.
      </p>

      <h2>1. Категорії файлів cookie, які ми використовуємо</h2>
      <h3>Суворо необхідні (без них сайт не працює)</h3>
      <ul>
        <li>Підтримка сесії — запамʼятовує обрану вами мову (RU або EN).</li>
        <li>Захист форм (токени CSRF).</li>
        <li>Локальне зберігання списку обраного — у строгому сенсі це не файл cookie, а технічний елемент.</li>
      </ul>
      <h3>Аналітичні (допомагають нам покращувати сайт)</h3>
      <ul>
        <li><strong>Google Analytics 4</strong> через Google Tag Manager (контейнер GTM-TM6D54Z3) — знеособлена статистика переглядів сторінок і подій.</li>
        <li><strong>Yandex.Metrica</strong> (лічильник 104881153) — поведінкова аналітика, теплові карти, записи сесій.</li>
      </ul>
      <h3>Маркетингові</h3>
      <p>
        Наразі ми не встановлюємо рекламних файлів cookie. Якщо в майбутньому ми запустимо ретаргетинг у Google чи Yandex, відповідні файли cookie буде додано,
        а цю сторінку оновлено.
      </p>

      <h2>2. Як вимкнути файли cookie</h2>
      <p>
        Аналітичні та маркетингові файли cookie можна вимкнути в налаштуваннях браузера. Суворо необхідні файли cookie вимкнути не можна —
        вони потрібні списку обраного та перемикачу мови.
      </p>
      <ul>
        <li>Chrome — <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Налаштування → Конфіденційність і безпека → Файли cookie</a></li>
        <li>Safari — <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener">Параметри → Конфіденційність</a></li>
        <li>Firefox — <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener">Параметри → Приватність і безпека</a></li>
      </ul>
      <p>Ви також можете встановити uBlock Origin, Privacy Badger або увімкнути Do Not Track.</p>

      <h2>3. Повʼязані документи</h2>
      <ul>
        <li><a href="/ua/konfidentsiynist">Політика конфіденційності</a></li>
        <li><a href="/ua/umovy">Умови використання</a></li>
      </ul>

      {/* TODO: when retargeting is enabled, add a Marketing section listing campaign IDs and cookie identifiers. */}
    </LegalLayout>
  )
}
