'use client'

// "🔔 Уведомлять в Telegram" pill on catalog pages.
//
// Click flow:
//   1. POST /api/subscriptions/draft with the SubscriptionFilter
//      derived from the URL filters → returns a deepLink
//   2. Open the deepLink in a new tab (works on desktop + mobile;
//      Telegram intercepts it on devices with the app installed)
//   3. Show an inline confirmation strip telling the user what to do
//      next ("в Telegram нажмите Start"). Stays until they refresh,
//      so they can re-tap if the OS swallowed the popup.
//
// We intentionally avoid asking for any contact info — no name, no
// email. The bot itself is the contact. Any extra field doubles
// drop-off rates here.

import { useState } from 'react'
import { Bell, Check, ExternalLink, Loader2, AlertTriangle } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

type SubscriptionFilter = {
  kind: 'villa' | 'apartment' | 'complex' | 'rental'
  district?: string
  bedrooms_min?: number
  bedrooms_max?: number
  price_min_usd?: number
  price_max_usd?: number
  str_only?: boolean
  max_distance_to_beach?: 'beachfront' | 'walking' | 'scooter' | 'any'
  query?: string
}

type State =
  | { stage: 'idle' }
  | { stage: 'loading' }
  | { stage: 'ready'; deepLink: string }
  | { stage: 'error'; message: string }

export function SubscribeCTA({
  filter,
  lang = 'ru',
}: {
  filter: SubscriptionFilter
  lang?: Lang
}) {
  const [state, setState] = useState<State>({ stage: 'idle' })
  const copy = pickCopy(COPY, lang)

  async function subscribe() {
    setState({ stage: 'loading' })
    try {
      const r = await fetch('/api/subscriptions/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filter }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({})) as { error?: string; detail?: string }
        // Friendly wording for the most common pre-launch case where
        // the admin hasn't applied migration 018 yet.
        if (j.error === 'subscriptions_not_set_up') {
          throw new Error(copy.errorNotSetUp)
        }
        throw new Error(j.error ?? `http_${r.status}`)
      }
      const j = await r.json() as { deepLink: string }
      // Open immediately so the user lands in Telegram with one tap.
      // The component then keeps the deepLink visible in case the OS
      // popup-blocked the open or they want to retry.
      window.open(j.deepLink, '_blank', 'noopener,noreferrer')
      setState({ stage: 'ready', deepLink: j.deepLink })
    } catch (e) {
      setState({ stage: 'error', message: e instanceof Error ? e.message : 'unknown' })
    }
  }

  if (state.stage === 'ready') {
    return (
      <div className="rounded-2xl border border-[#1F8B5F]/30 bg-[#1F8B5F]/10 px-4 py-3 flex items-start gap-3">
        <Check size={20} className="shrink-0 mt-0.5 text-[#1F8B5F]" />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-[var(--color-text)]">{copy.openedTitle}</div>
          <div className="text-[12.5px] text-[var(--color-text-muted)] mt-0.5">{copy.openedSubtitle}</div>
          <a
            href={state.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-[13px] font-medium text-[#1F8B5F] hover:text-[#197551] no-underline"
          >
            <ExternalLink size={14} /> {copy.openAgain}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white/60 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-[var(--color-text)]">{copy.idleTitle}</div>
        <div className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{copy.idleSubtitle}</div>
      </div>
      <button
        type="button"
        onClick={subscribe}
        disabled={state.stage === 'loading'}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1F8B5F] text-white text-[13px] font-semibold hover:bg-[#197551] disabled:opacity-60"
      >
        {state.stage === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
        {copy.button}
      </button>
      {state.stage === 'error' && (
        <div className="basis-full flex items-center gap-1.5 text-[12px] text-[var(--color-progress-low)]">
          <AlertTriangle size={12} />
          {copy.errorPrefix}: {state.message}
        </div>
      )}
    </div>
  )
}

const COPY = {
  ru: {
    idleTitle: 'Уведомлять в Telegram о новых под этот фильтр',
    idleSubtitle: 'Раз в день в 10:00 — только новые объекты, без спама.',
    button: 'В Telegram',
    openedTitle: 'Открыл Telegram — нажмите Start в боте',
    openedSubtitle: 'Подписка активируется сразу как откроете чат с ботом и нажмёте Start.',
    openAgain: 'Открыть Telegram ещё раз',
    errorPrefix: 'Не получилось',
    errorNotSetUp: 'Подписки временно недоступны',
  },
  en: {
    idleTitle: 'Get Telegram alerts for new listings under this filter',
    idleSubtitle: 'Once a day at 10:00 — new objects only, no spam.',
    button: 'Open Telegram',
    openedTitle: "Telegram opened — tap Start in the bot",
    openedSubtitle: 'The subscription activates as soon as you open the bot chat and tap Start.',
    openAgain: 'Open Telegram again',
    errorPrefix: 'Failed',
    errorNotSetUp: 'Alerts are temporarily unavailable',
  },
  id: {
    idleTitle: 'Dapatkan notifikasi Telegram untuk objek baru sesuai filter ini',
    idleSubtitle: 'Sekali sehari pukul 10:00 — hanya objek baru, tanpa spam.',
    button: 'Buka Telegram',
    openedTitle: 'Telegram terbuka — tekan Start di bot',
    openedSubtitle: 'Langganan aktif segera setelah Anda membuka chat bot dan menekan Start.',
    openAgain: 'Buka Telegram lagi',
    errorPrefix: 'Gagal',
    errorNotSetUp: 'Langganan untuk sementara tidak tersedia',
  },
  fr: {
    idleTitle: 'Recevez des alertes Telegram pour les nouvelles annonces sous ce filtre',
    idleSubtitle: 'Une fois par jour à 10:00 — uniquement les nouveaux biens, sans spam.',
    button: 'Ouvrir Telegram',
    openedTitle: 'Telegram ouvert — appuyez sur Start dans le bot',
    openedSubtitle: "L'abonnement s'active dès que vous ouvrez le chat du bot et appuyez sur Start.",
    openAgain: 'Ouvrir Telegram à nouveau',
    errorPrefix: 'Échec',
    errorNotSetUp: 'Les alertes sont temporairement indisponibles',
  },
  de: {
    idleTitle: 'Telegram-Benachrichtigungen für neue Objekte mit diesem Filter',
    idleSubtitle: 'Einmal täglich um 10:00 — nur neue Objekte, kein Spam.',
    button: 'Telegram öffnen',
    openedTitle: 'Telegram geöffnet — tippen Sie im Bot auf Start',
    openedSubtitle: 'Das Abo wird sofort aktiviert, sobald Sie den Bot-Chat öffnen und auf Start tippen.',
    openAgain: 'Telegram erneut öffnen',
    errorPrefix: 'Fehlgeschlagen',
    errorNotSetUp: 'Benachrichtigungen sind vorübergehend nicht verfügbar',
  },
  zh: {
    idleTitle: '获取符合此筛选条件的新房源 Telegram 通知',
    idleSubtitle: '每天 10:00 一次 — 仅限新房源，无垃圾信息。',
    button: '打开 Telegram',
    openedTitle: 'Telegram 已打开 — 在机器人中点击 Start',
    openedSubtitle: '订阅将在您打开机器人聊天并点击 Start 后立即激活。',
    openAgain: '再次打开 Telegram',
    errorPrefix: '失败',
    errorNotSetUp: '通知暂时不可用',
  },
  nl: {
    idleTitle: 'Ontvang Telegram-meldingen voor nieuwe objecten met dit filter',
    idleSubtitle: 'Eén keer per dag om 10:00 — alleen nieuwe objecten, geen spam.',
    button: 'Telegram openen',
    openedTitle: 'Telegram geopend — tik op Start in de bot',
    openedSubtitle: 'Het abonnement wordt geactiveerd zodra u de botchat opent en op Start tikt.',
    openAgain: 'Telegram opnieuw openen',
    errorPrefix: 'Mislukt',
    errorNotSetUp: 'Meldingen zijn tijdelijk niet beschikbaar',
  },
  ban: {
    idleTitle: 'Polih pemberitahuan Telegram indik properti anyar sane cocok ring filter puniki',
    idleSubtitle: 'Apisan sadina ring 10:00 — wantah properti anyar, tanpa spam.',
    button: 'Ngabuka Telegram',
    openedTitle: 'Telegram sampun kabuka — tekan Start ring bot',
    openedSubtitle: 'Langganan aktif rikala Ragane ngabuka chat bot tur nekan Start.',
    openAgain: 'Buka Telegram malih',
    errorPrefix: 'Gagal',
    errorNotSetUp: 'Pemberitahuan sementara nenten wenten',
  },
} as const
