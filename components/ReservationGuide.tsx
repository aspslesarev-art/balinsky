// Foreign-investor confidence builder for the reservation step. Explains
// what a "reserve" tap on Balinsky actually commits the visitor to, who
// holds the deposit, and how refunds work. Linked from the reservation
// modal and from the manager card for buyers who want to read first.

import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import {
  Lock, Calendar, FileText, Wallet, Undo2, ArrowRight,
  ShieldCheck, AlertTriangle,
} from 'lucide-react'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    home: 'Главная',
    crumb: 'Бронирование',
    h1: 'Бронирование объекта на Бали — как это устроено',
    intro: 'Когда вы нажимаете «Зарезервировать», объект уходит на 14-дневный hold лично за вами. Эта страница объясняет, что именно происходит дальше, кто держит ваш депозит и как вернуть деньги если вы передумаете.',

    h2What: 'Что такое reservation на Бали',
    pWhat: 'Reservation — это первый юридически фиксируемый шаг сделки. Вы подписываете короткий reservation form (не договор купли-продажи), вносите holding deposit, и объект на 14 дней снимается с продажи: ни один другой покупатель в этот период купить его не может. За это время вы делаете due diligence, обсуждаете правки в SPA с юристом, готовите перевод средств на следующий транш.',

    h2Hold: '14 дней эксклюзивности — что это даёт',
    pHold: 'Stand-still окно работает в обе стороны: цена зафиксирована в reservation form, застройщик не может её поднять; объект гарантированно ждёт вас. Если в эти 14 дней появится покупатель с лучшей ценой — он не получит ничего. Окно достаточное чтобы юрист закончил due diligence (обычно 7–10 дней), а вы успели обсудить правки в SPA.',

    h2Sign: 'Что именно вы подписываете',
    pSign: 'Reservation form — это короткий документ на 1–3 страницы: цена объекта, размер депозита, срок hold (14 дней), условия возврата, и адрес для возвратного перевода если откажетесь. Это НЕ договор купли-продажи (SPA). SPA — отдельный документ, подписывается через 1–2 недели у нотариуса PPAT после прохождения due diligence. Reservation form может включать пункт «non-refundable если откажетесь без юридических причин», но более частая практика — полный возврат при отказе после DD.',

    h2Deposit: 'Где сидит депозит',
    pDeposit: 'Размер holding deposit на Бали — обычно $2 000–10 000 (на премиальных виллах до $25 000). Деньги переводятся одним из трёх способов: на эскроу-счёт нотариуса PPAT (самый безопасный), на корпоративный счёт застройщика (требует доверия к нему), или на счёт юридической фирмы-посредника. Никогда не переводите на личный счёт продавца, директора PT или агента — это самый частый канал мошенничества в индонезийской недвижимости. Реквизиты для перевода обязательно сверяйте с reservation form, а не из переписки в мессенджере.',

    h2Refund: 'Как возвращаются деньги',
    pRefund: 'Стандартная практика: полный возврат депозита если вы отказываетесь в течение 14-дневного окна по результатам due diligence. «Юридические причины отказа» (например выявленные обременения, несоответствие зонирования, проблемы с PBG) — всегда возврат 100%. Отказ «передумал» без причин — некоторые застройщики удерживают депозит как штраф, другие возвращают полностью. Условия возврата всегда явно прописаны в reservation form — прочитайте этот пункт перед подписанием. После истечения 14 дней без подписания SPA депозит обычно засчитывается в первый транш по SPA или возвращается, в зависимости от условий формы.',

    h2After: 'Что после 14 дней',
    pAfter: 'Три сценария. Первый — успешный: к концу окна юрист дал зелёный свет на DD, вы подписываете SPA у нотариуса PPAT, holding deposit засчитывается в первый транш SPA. Второй — продление hold ещё на 7–14 дней (если DD не уложилось в срок), оформляется письменным соглашением. Третий — отказ: депозит возвращается, объект снова появляется в продаже. Молчание после 14 дней без формального решения может трактоваться по-разному в зависимости от reservation form — лучше прислать письменный отказ или продление.',

    h2Risks: 'На что обратить внимание',
    risks: [
      'Реквизиты для перевода депозита должны быть в reservation form — не принимайте их в чате.',
      'Прочитайте пункт о возврате до подписания. «Non-refundable in any case» — красный флаг, договаривайтесь о правке.',
      'Срок hold должен быть явно указан (14 дней или другой). Открытый срок без даты — повод задать вопрос.',
      'Reservation form должен подписать представитель PT застройщика, имя которого указано в Akta Pendirian (учредительных документах). Подпись агента без доверенности — уязвимость.',
      'Сохраните копию подписанной формы (PDF), чек банка о переводе, и переписку с менеджером — пригодится в случае спора.',
    ],

    h2What2: 'Чем reservation отличается от SPA',
    table: {
      headLeft: '',
      headRsv: 'Reservation form',
      headSpa: 'SPA / Lease Agreement',
      rows: [
        { l: 'Когда подписывают',         r: 'В первые 1–3 дня',                          s: 'Через 1–4 недели после reservation' },
        { l: 'Объём документа',           r: '1–3 страницы',                              s: '15–40 страниц' },
        { l: 'Юридическая сила',          r: 'Фиксирует цену и hold; не передаёт право',  s: 'Передаёт лизхолд / HGB; регистрируется в BPN' },
        { l: 'Сумма',                     r: 'Holding deposit ($2k–25k)',                 s: 'Полная цена в траншах' },
        { l: 'Подписание',                r: 'Электронно или у застройщика',              s: 'Только у нотариуса PPAT, лично' },
        { l: 'Возврат денег',             r: 'Обычно полный (см. условия)',               s: 'Только через расторжение SPA с штрафами' },
      ],
    },

    faqHeading: 'Часто задаваемые вопросы',
    faq: [
      { q: 'Я внёс депозит — это значит я уже купил?',
        a: 'Нет. Reservation deposit фиксирует цену и эксклюзивный hold на 14 дней, но не передаёт права на объект. Право собственности (или лизхолда) переходит только после подписания SPA у нотариуса PPAT и регистрации в BPN.' },
      { q: 'Можно ли увеличить срок hold?',
        a: 'Да, обычно бесплатно при заранее обоснованной причине (например юрист не успел закончить DD). Запрашивается письменно у застройщика, оформляется extension reservation form. На практике 7–14 дополнительных дней — стандарт.' },
      { q: 'Можно ли передать reservation другому покупателю?',
        a: 'Часть застройщиков разрешает переуступку до подписания SPA с письменным согласием. На вторичном рынке (resale) — почти всегда нет, надо завершать или отменять.' },
      { q: 'А если застройщик передумает после моего депозита?',
        a: 'В reservation form обычно указан симметричный пункт: если застройщик отказывает без юридических причин, он возвращает депозит и платит штраф (часто равный депозиту). На практике крупные застройщики этого не делают — слишком плохо для репутации.' },
      { q: 'Депозит можно платить криптой?',
        a: 'Нет. Все легальные сделки через PPAT нотариуса фиксируются в IDR/USD на банковский счёт. Криптовалютный перевод не оставляет следа для нотариуса и для налоговой Индонезии — потом доказать что вы что-то платили будет невозможно.' },
    ],

    ctaHeading: 'Готовы зарезервировать',
    ctaText: 'Откройте карточку объекта и нажмите «Зарезервировать» — менеджер пришлёт reservation form в течение часа.',
    ctaVillas: 'К виллам',
    ctaApartments: 'К апартаментам',
    ctaGuide: 'Полный гид «Как купить на Бали»',
  },
  en: {
    home: 'Home',
    crumb: 'Reservation',
    h1: 'How a Bali property reservation works',
    intro: 'When you tap "Reserve" on a listing, the property goes on a 14-day hold for you exclusively. This page explains what happens next, who holds your deposit, and how refunds work if you change your mind.',

    h2What: 'What a Bali reservation is',
    pWhat: 'A reservation is the first legally recorded step in the deal. You sign a short reservation form (not a sale & purchase agreement), pay a holding deposit, and the property is taken off market for 14 days — no other buyer can complete a purchase during that window. You use this time to do due diligence, agree SPA edits with your lawyer, and prepare the next wire.',

    h2Hold: 'The 14 exclusive days — what they buy you',
    pHold: 'The stand-still works both ways: the price is locked in the reservation form, the developer cannot raise it; the property genuinely waits for you. If a higher offer arrives in those 14 days, the developer cannot accept it. The window is enough for a lawyer to finish DD (typically 7–10 days) and for you to negotiate SPA edits.',

    h2Sign: 'What you actually sign',
    pSign: 'The reservation form is a 1–3 page document: property price, deposit amount, hold duration (14 days), refund terms, and your bank details for refund if you walk. It is NOT the sale & purchase agreement (SPA). The SPA is a separate document signed 1–2 weeks later before a PPAT notary, after DD is cleared. Reservation forms may include a "non-refundable without legal cause" clause, but the more common practice is full refund on a post-DD walk-away.',

    h2Deposit: 'Where the deposit sits',
    pDeposit: 'A holding deposit on Bali is typically $2,000–10,000 (premium villas up to $25,000). The funds wire one of three ways: to the PPAT notary escrow (safest), to the developer’s corporate account (requires trust in the developer), or to an intermediary law-firm account. Never to the seller’s personal account, the director’s personal account, or an agent’s account — that is the most common fraud channel in Indonesian real estate. Always cross-check wire instructions against the reservation form itself, never from messenger chat.',

    h2Refund: 'How the money comes back',
    pRefund: 'Standard practice: a full refund if you walk inside the 14-day window based on DD findings. Legal causes (liens, zoning mismatch, PBG issues) always trigger 100% return. A "changed my mind" walk without cause — some developers keep the deposit as a penalty, others refund in full. Refund conditions are always written into the reservation form — read that clause before you sign. Past 14 days without a signed SPA, the deposit either rolls into the first SPA tranche or is refunded, depending on the form.',

    h2After: 'What happens after 14 days',
    pAfter: 'Three paths. Best case: by end of window your lawyer cleared DD, you sign the SPA at the PPAT notary, and the holding deposit counts toward the first SPA tranche. Middle case: you extend the hold by 7–14 days (DD didn’t finish), in writing. Worst case: you walk, deposit is refunded, the property goes back to market. Silence past 14 days without a formal decision is interpreted differently per form — always send a written decision (extend or walk).',

    h2Risks: 'Things to watch',
    risks: [
      'Wire instructions for the deposit must be in the reservation form — never accept them from a chat.',
      'Read the refund clause before you sign. "Non-refundable in any case" is a red flag — push for an edit.',
      'The hold duration must be stated explicitly (14 days or another). An open-ended hold needs a question.',
      'The reservation form must be signed by an officer of the developer’s PT named in the Akta Pendirian (incorporation documents). Agent signature without a power of attorney is a weak link.',
      'Keep a PDF copy of the signed form, the bank wire receipt, and the messenger thread with the manager — they help if a dispute arises.',
    ],

    h2What2: 'Reservation form vs SPA',
    table: {
      headLeft: '',
      headRsv: 'Reservation form',
      headSpa: 'SPA / Lease Agreement',
      rows: [
        { l: 'Signed when',           r: 'First 1–3 days',                              s: '1–4 weeks after reservation' },
        { l: 'Document length',       r: '1–3 pages',                                   s: '15–40 pages' },
        { l: 'Legal weight',          r: 'Locks price and hold; transfers no rights',   s: 'Transfers leasehold / HGB; registered with BPN' },
        { l: 'Money involved',        r: 'Holding deposit ($2k–25k)',                   s: 'Full price in tranches' },
        { l: 'Where signed',          r: 'Online or at developer',                      s: 'PPAT notary only, in person' },
        { l: 'Refunds',               r: 'Usually full (read terms)',                   s: 'Only via SPA termination with penalties' },
      ],
    },

    faqHeading: 'Frequently asked questions',
    faq: [
      { q: 'I paid the deposit — does that mean I bought it?',
        a: 'No. The reservation deposit locks the price and the 14-day hold, but it does not transfer any rights. Ownership (or leasehold) passes only after the SPA is signed before a PPAT notary and registered with BPN.' },
      { q: 'Can I extend the hold?',
        a: 'Yes, usually free of charge with a justified reason (for example, the lawyer hasn’t finished DD). Requested in writing from the developer; documented as an extension to the reservation form. 7–14 extra days is standard.' },
      { q: 'Can I transfer the reservation to another buyer?',
        a: 'Some developers allow assignment before SPA with written consent. On the resale market it is almost always no — you must close or cancel.' },
      { q: 'What if the developer changes their mind after my deposit?',
        a: 'The reservation form usually contains a symmetric clause: if the developer walks without legal cause, they refund the deposit and pay a penalty (often equal to the deposit). In practice large developers don’t do this — too damaging to reputation.' },
      { q: 'Can I pay the deposit in crypto?',
        a: 'No. All legal deals through a PPAT notary are recorded in IDR/USD via bank wire. A crypto wire leaves no trail for the notary or the Indonesian tax office — proving you paid anything later becomes impossible.' },
    ],

    ctaHeading: 'Ready to reserve',
    ctaText: 'Open any listing and tap "Reserve" — the manager will send you a reservation form within an hour.',
    ctaVillas: 'Open villas',
    ctaApartments: 'Open apartments',
    ctaGuide: 'Full "How to buy in Bali" guide',
  },
} as const

export function ReservationGuide({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const home = switchLangPath('/ru', lang)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.crumb },
        ]} />

        <article className="mt-4 max-w-[760px]">
          <h1 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-5">
            {c.h1}
          </h1>
          <p className="text-[16px] md:text-[17px] leading-[1.7] text-[var(--color-text)] mb-8">
            {c.intro}
          </p>

          {/* Five key facts up top — same shape as the buying guide steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-12">
            {[
              { Icon: Lock,        title: c.h2What,    body: c.pWhat },
              { Icon: Calendar,    title: c.h2Hold,    body: c.pHold },
              { Icon: FileText,    title: c.h2Sign,    body: c.pSign },
              { Icon: Wallet,      title: c.h2Deposit, body: c.pDeposit },
              { Icon: Undo2,       title: c.h2Refund,  body: c.pRefund },
              { Icon: ArrowRight,  title: c.h2After,   body: c.pAfter },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                <Icon size={18} strokeWidth={1.8} className="text-[var(--color-primary)] mb-2" />
                <h2 className="text-[16px] font-semibold text-[#111827] mb-2">{title}</h2>
                <p className="text-[14px] leading-[1.65] text-[var(--color-text-muted)]">{body}</p>
              </div>
            ))}
          </div>

          {/* Risks block */}
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">
            {c.h2Risks}
          </h2>
          <ul className="space-y-3 mb-12">
            {c.risks.map((r, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-[#FEF3C7]/40 border border-[#FCD34D]/40 p-4">
                <AlertTriangle size={18} strokeWidth={1.8} className="text-[#92400E] shrink-0 mt-0.5" />
                <span className="text-[14px] leading-[1.6] text-[#1F2937]">{r}</span>
              </li>
            ))}
          </ul>

          {/* Reservation vs SPA comparison table */}
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">
            {c.h2What2}
          </h2>
          <div className="overflow-x-auto -mx-4 px-4 mb-12">
            <table className="w-full border border-[var(--color-border)] rounded-2xl overflow-hidden text-[14px]">
              <thead>
                <tr className="bg-[var(--color-search-bg)]">
                  <th className="px-4 py-3 text-left font-semibold text-[12px] uppercase tracking-wide text-[var(--color-text-muted)]"></th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-text)]">{c.table.headRsv}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-text)]">{c.table.headSpa}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {c.table.rows.map((r, i) => (
                  <tr key={i} className="bg-white align-top">
                    <td className="px-4 py-3 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] font-medium">{r.l}</td>
                    <td className="px-4 py-3 text-[var(--color-text)]">{r.r}</td>
                    <td className="px-4 py-3 text-[var(--color-text)]">{r.s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FAQ */}
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">
            {c.faqHeading}
          </h2>
          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] mb-12">
            {c.faq.map(f => (
              <li key={f.q} className="py-4">
                <h3 className="text-[16px] font-semibold mb-1 text-[#111827]">{f.q}</h3>
                <p className="text-[14px] leading-[1.65] text-[var(--color-text-muted)]">{f.a}</p>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="rounded-2xl bg-[var(--color-search-bg)] p-6 mb-8 flex items-start gap-4">
            <ShieldCheck size={28} strokeWidth={1.6} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[20px] font-semibold text-[#111827] mb-2">{c.ctaHeading}</h2>
              <p className="text-[15px] text-[var(--color-text-muted)] mb-4">{c.ctaText}</p>
              <div className="flex flex-wrap gap-2">
                <Link href={switchLangPath('/ru/villy', lang)}        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[13px] font-medium no-underline">{c.ctaVillas}</Link>
                <Link href={switchLangPath('/ru/apartamenty', lang)}  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] bg-white">{c.ctaApartments}</Link>
                <Link href={switchLangPath('/ru/kak-kupit', lang)}    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] bg-white">{c.ctaGuide}</Link>
              </div>
            </div>
          </div>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
