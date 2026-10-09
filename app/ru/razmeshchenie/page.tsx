import type { Metadata } from 'next'
import { Languages, LineChart, MessageCircle, Sparkles, ShieldCheck } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { PlacementCalculator } from '@/components/placement/PlacementCalculator'

// Прайс для застройщиков. Страница только по прямой ссылке: нет в меню,
// в sitemap и в поиске — сайт публично не заявляет себя площадкой, которая
// зарабатывает (см. условия использования, раздел 2).
export const metadata: Metadata = {
  title: 'Размещение для застройщиков | Balinsky',
  description: 'Профиль застройщика, жилые комплексы и юниты на balinsky.info на 10 языках. Калькулятор стоимости.',
  robots: { index: false, follow: false, nocache: true },
}

const BENEFITS = [
  { Icon: Languages, title: '10 языков', body: 'Покупатель читает о вас на своём языке: русский, английский, индонезийский, французский, немецкий, китайский, нидерландский, польский, украинский, балийский.' },
  { Icon: LineChart, title: 'Аналитика по каждому ЖК', body: 'Расчёт доходности, рынок аренды рядом, карта и описание района. Покупателю не нужно искать цифры самому.' },
  { Icon: MessageCircle, title: 'Прямые контакты', body: 'Кнопка на карточке ведёт в ваш Telegram или WhatsApp. Покупатель пишет вам напрямую, без посредников.' },
  { Icon: Sparkles, title: 'Видимость в Google и ИИ-поиске', body: 'Страницы открыты для Google, а у каждой есть текстовая версия для ChatGPT, Perplexity и других ИИ-поисковиков.' },
  { Icon: ShieldCheck, title: 'Честные цифры', body: 'Доходность считаем по одной методике для всех. Оплата её не меняет — поэтому покупатели доверяют сайту.' },
]

const TERMS = [
  ['Что нужно от вас', 'Прайс-лист, фото или рендеры, планировки, адрес и срок сдачи, контакт отдела продаж.'],
  ['Срок', 'Страницы на сайте до 5 рабочих дней после оплаты и получения материалов. Перед публикацией покажем вам их на проверку.'],
  ['Оплата', '100% предоплата по счёту. Обновление прайсов — помесячно, отключается в любой момент.'],
  ['Пометка', 'Платные публикации отмечены как реклама.'],
  ['Роль Balinsky', 'Информационная площадка: мы не продаём объекты, не ведём переговоры и не берём комиссию со сделок.'],
]

export default function Page() {
  return (
    <>
      <Header />
      <PageContainer>
        <section className="pt-8 md:pt-12 pb-10 md:pb-14 max-w-[760px]">
          <div className="text-[12px] uppercase tracking-wide text-[var(--color-primary)] font-semibold mb-3">Для застройщиков</div>
          <h1 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[var(--color-text)] leading-[1.1] mb-5">
            Ваши проекты на Balinsky — на 10 языках и с аналитикой
          </h1>
          <p className="text-[16px] md:text-[17px] leading-[1.7] text-[var(--color-text-muted)]">
            Профиль компании, страницы жилых комплексов и юниты с ценами. Покупатель видит цифры по объекту
            и пишет вам напрямую. Посчитайте стоимость ниже — цена фиксированная, без процентов со сделок.
          </p>
        </section>

        <section id="kalkulyator" className="mb-16 md:mb-24 scroll-mt-24">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[var(--color-text)] mb-6">Калькулятор</h2>
          <PlacementCalculator />
        </section>

        <section className="mb-16 md:mb-24">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[var(--color-text)] mb-6">Что вы получаете</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {BENEFITS.map((b, i) => (
              <div key={b.title} className={`${i < 3 ? 'lg:col-span-2' : 'lg:col-span-3'} ${i === 4 ? 'md:col-span-2 lg:col-span-3' : ''} rounded-2xl border border-[var(--color-border)] bg-white p-5`}>
                <b.Icon size={20} strokeWidth={1.6} className="text-[var(--color-primary)] mb-3" />
                <h3 className="text-[16px] font-semibold mb-1.5 text-[var(--color-text)]">{b.title}</h3>
                <p className="text-[14px] leading-[1.6] text-[var(--color-text-muted)]">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16 md:mb-24 max-w-[760px]">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[var(--color-text)] mb-6">Условия</h2>
          <dl className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {TERMS.map(([k, v]) => (
              <div key={k} className="py-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-1 md:gap-6">
                <dt className="text-[14px] font-semibold text-[var(--color-text)]">{k}</dt>
                <dd className="text-[14px] leading-[1.6] text-[var(--color-text-muted)]">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[14px] text-[var(--color-text-muted)] mt-6">
            Вопросы — <a href="mailto:i@balinsky.info" className="text-[var(--color-primary)] font-medium">i@balinsky.info</a>
          </p>
        </section>
      </PageContainer>
    </>
  )
}
