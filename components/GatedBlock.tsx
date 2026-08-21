import type { ReactNode } from 'react'
import type { Lang } from '@/lib/i18n'
import { LoginCodeForm } from './LoginCodeForm'

// Registration gate for the analytics blocks (heat map, district stats,
// investment maths, developer reliability).
//
// SEO is the constraint that shapes this: the server HTML is byte-identical
// for every visitor, logged in or not, human or crawler. Nothing is stripped,
// nothing is swapped, so there is no cloaking risk and no cache variance —
// the same ISR-rendered page serves everyone. The gate is purely visual: CSS
// blurs the block unless `<html>` carries `data-auth="1"`, which an inline
// script in app/layout.tsx sets from the `bx_auth` cookie before first paint.
//
// The trade-off is deliberate and worth stating plainly: because the markup
// ships to the browser either way, this drives registrations — it does not
// keep the numbers secret from anyone willing to open the page source. If a
// block ever needs to be genuinely private, it must stop rendering
// server-side for anonymous users, which is a different mechanism.
//
// Закрыты только значения. Что именно закрыто и кому это нужно — написано
// прямо на карточке: посетитель должен понимать, за чем он логинится, а не
// упираться в безымянное мутное пятно.

/** Какая аналитика под гейтом — определяет текст карточки. */
export type GateKind = 'investment' | 'nearby' | 'market' | 'heatmap'

type Pitch = {
  title: string
  what: string
  investor: string
  living: string
  agent: string
}

const KINDS: Record<GateKind, { ru: Pitch; en: Pitch }> = {
  investment: {
    ru: {
      title: 'Расчёт доходности объекта',
      what: 'Цена за м², прогноз аренды, окупаемость и сравнение с соседними объектами на карте района.',
      investor: 'видно, за сколько лет объект вернёт вложенное и не переплачиваете ли вы за метр',
      living: 'понятно, сколько объект сможет приносить, пока вы им не пользуетесь',
      agent: 'готовые цифры для клиента — без ручного счёта в таблице',
    },
    en: {
      title: 'Yield projection for this property',
      what: 'Price per m², rental forecast, payback period and a comparison with neighbouring properties.',
      investor: 'see the payback horizon and whether the price per m² is fair',
      living: 'see what the property can earn while you are away',
      agent: 'ready figures for the client — no manual spreadsheet work',
    },
  },
  nearby: {
    ru: {
      title: 'Что рядом с объектом',
      what: 'Пляжи, школы, клиники, кафе и коворкинги с расстояниями и временем в пути.',
      investor: 'окружение определяет загрузку в аренде сильнее, чем ремонт',
      living: 'сразу видно, сложится ли ежедневная логистика — школа, врач, продукты',
      agent: 'аргументы к локации, которые клиент проверит на карте сам',
    },
    en: {
      title: 'What is nearby',
      what: 'Beaches, schools, clinics, cafés and coworkings with distances and travel times.',
      investor: 'the surroundings drive occupancy more than the finish does',
      living: 'see at once whether daily logistics work — school, doctor, groceries',
      agent: 'location arguments the client can verify on the map',
    },
  },
  market: {
    ru: {
      title: 'Рынок аренды в этом районе',
      what: 'Ставки за ночь, загрузка и сезонность по реальным объявлениям Бали, а не по обещаниям застройщика.',
      investor: 'проверка заявленной доходности по фактическим ставкам соседей',
      living: 'понятно, во сколько обойдётся аренда рядом, пока идёт стройка',
      agent: 'независимая база для разговора о цене',
    },
    en: {
      title: 'Rental market in this area',
      what: 'Nightly rates, occupancy and seasonality from real Bali listings — not developer promises.',
      investor: 'check the promised yield against what neighbours actually charge',
      living: 'see what renting nearby costs while construction finishes',
      agent: 'an independent basis for the price conversation',
    },
  },
  heatmap: {
    ru: {
      title: 'Карта иностранных туристов',
      what: 'Плотность мест, куда реально ходят туристы: рестораны, бары, пляжные клубы, велнес.',
      investor: 'объект в живой зоне сдаётся дороже и простаивает меньше',
      living: 'видно, тихое это место или центр вечернего трафика',
      agent: 'наглядная картинка вместо слов «отличная локация»',
    },
    en: {
      title: 'Where foreign tourists go',
      what: 'Density of places tourists actually visit: restaurants, bars, beach clubs, wellness.',
      investor: 'property in a lively zone rents higher and sits empty less',
      living: 'see whether it is quiet or the centre of evening traffic',
      agent: 'a picture instead of the words “great location”',
    },
  },
}

const COPY = {
  ru: {
    hidden: 'Цифры в этом блоке открываются после входа',
    forInvestor: 'Инвестору',
    forLiving: 'Для жизни',
    forAgent: 'Агенту',
    cta: 'Войти через Telegram',
    note: 'Без пароля: бот пришлёт ссылку — она вернёт вас на эту же страницу уже со входом.',
  },
  en: {
    hidden: 'The figures in this block open after sign-in',
    forInvestor: 'Investor',
    forLiving: 'To live in',
    forAgent: 'Agent',
    cta: 'Sign in with Telegram',
    note: 'No password: the bot sends a link that brings you back to this page, signed in.',
  },
} as const

/** Deep link that makes the bot mint a one-time login link. */
export const LOGIN_URL = 'https://t.me/BalinskyBot?start=login'

export function GatedBlock({
  children,
  lang = 'ru',
  kind = 'investment',
}: {
  children: ReactNode
  lang?: Lang
  kind?: GateKind
}) {
  const ru = lang === 'ru'
  const c = ru ? COPY.ru : COPY.en
  const p = ru ? KINDS[kind].ru : KINDS[kind].en

  return (
    <div className="bx-gate" data-gated>
      <div className="bx-gate-content">{children}</div>
      <div className="bx-gate-veil" aria-hidden="true" />
      <div className="bx-gate-cta">
        <div className="max-w-md rounded-2xl bg-white/95 px-6 py-5 text-left shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
          <p className="text-base font-semibold text-gray-900">{p.title}</p>
          <p className="mt-1 text-sm text-gray-600">{p.what}</p>

          <dl className="mt-3 space-y-1.5 text-[13px] leading-snug text-gray-700">
            <div className="flex gap-2">
              <dt className="shrink-0 font-semibold text-gray-900">{c.forInvestor}:</dt>
              <dd>{p.investor}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 font-semibold text-gray-900">{c.forLiving}:</dt>
              <dd>{p.living}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 font-semibold text-gray-900">{c.forAgent}:</dt>
              <dd>{p.agent}</dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-gray-500">{c.hidden}</p>
          <LoginCodeForm ctaLabel={c.cta} />
          <p className="mt-2 text-xs text-gray-500">{c.note}</p>
        </div>
      </div>
    </div>
  )
}
