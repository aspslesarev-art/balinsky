import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 мая 2026 г.'

export const metadata: Metadata = {
  title: 'Cookie-политика | Balinsky',
  description: 'Какие cookie использует Balinsky.info: технические, аналитические, маркетинговые. Как их отключить.',
  alternates: {
    canonical: '/ru/cookie',
    languages: {
      ru: `${SITE_URL}/ru/cookie`,
      en: `${SITE_URL}/en/cookie`,
      'x-default': `${SITE_URL}/ru/cookie`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="ru" title="Cookie-политика" updated={`Последнее обновление: ${UPDATED}`} breadcrumbLabel="Cookie-политика">
      <p>
        Cookie — небольшие текстовые файлы, которые сайт сохраняет в вашем браузере. Они нужны, чтобы запомнить ваши настройки и
        чтобы мы понимали, как пользователи взаимодействуют с каталогом.
      </p>

      <h2>1. Типы cookie, которые мы используем</h2>
      <h3>Технические (без них сайт не работает)</h3>
      <ul>
        <li>Поддержка сессии (например, что вы уже выбрали язык RU или EN).</li>
        <li>Защита от подбора форм (CSRF-токены).</li>
        <li>Локальное хранение списка избранного — не cookie в строгом смысле, но техническое.</li>
      </ul>
      <h3>Аналитические (помогают нам улучшать сайт)</h3>
      <ul>
        <li><strong>Google Analytics 4</strong> через Google Tag Manager (контейнер GTM-TM6D54Z3): анонимная статистика просмотров и действий.</li>
        <li><strong>Яндекс.Метрика</strong> (счётчик 104881153): поведенческая аналитика, тепловые карты, вебвизор.</li>
      </ul>
      <h3>Маркетинговые</h3>
      <p>
        Сейчас рекламные cookie не устанавливаются. Если мы запустим ретаргетинг в Google или Яндекс — соответствующие cookie появятся,
        и мы дополним эту страницу.
      </p>

      <h2>2. Как отключить cookie</h2>
      <p>
        Аналитические и маркетинговые cookie можно отключить в настройках вашего браузера. Технические cookie отключать нельзя —
        без них корзина избранного и переключение языка работать не будут.
      </p>
      <ul>
        <li>Chrome — <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Settings → Privacy and security → Cookies</a></li>
        <li>Safari — <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener">Preferences → Privacy</a></li>
        <li>Firefox — <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener">Options → Privacy &amp; Security</a></li>
      </ul>
      <p>
        Дополнительно можно установить расширения uBlock Origin, Privacy Badger или включить режим Do Not Track.
      </p>

      <h2>3. Связанные документы</h2>
      <ul>
        <li><a href="/ru/politika-konfidencialnosti">Политика конфиденциальности</a></li>
        <li><a href="/ru/usloviya">Условия использования</a></li>
      </ul>

      {/* TODO: при подключении ретаргетинга добавить раздел Маркетинг с конкретными ID кампаний и идентификаторами cookie. */}
    </LegalLayout>
  )
}
