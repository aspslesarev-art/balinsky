'use client'

import { useCallback, useState } from 'react'
import { Send, MessageCircle, MessagesSquare } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { ContactLeadDialog, type LeadChannel, type OtherMessenger } from '@/components/ContactLeadDialog'
import { MANAGER_COPY } from '@/components/ManagerCard'
import { reportLeadFormEvent } from '@/lib/contact-click'

// Кнопки связи с менеджером на странице виллы в стиле «Журнал» (макет MgrA):
// две равные зелёные кнопки. Как и в ManagerCard, они открывают форму заявки
// (ContactLeadDialog) — в мессенджер не ведут, заявка уходит владельцу в бота.
export function ManagerContactButtons({ lang, managerId, managerName, developerName, listingTitle }: {
  lang: Lang
  managerId: string
  managerName: string
  developerName: string | null
  listingTitle: string | null
}) {
  const [lead, setLead] = useState<{ ch: LeadChannel; m?: OtherMessenger } | null>(null)
  const close = useCallback(() => setLead(null), [])
  const c = pickCopy(MANAGER_COPY, lang)
  // В Китае Telegram и WhatsApp заблокированы — первой идёт WeChat.
  const buttons: { ch: LeadChannel; m?: OtherMessenger; label: string; Icon: typeof Send }[] = [
    lang === 'zh' ? { ch: 'other', m: 'WeChat', label: 'WeChat', Icon: MessagesSquare } : { ch: 'telegram', label: 'Telegram', Icon: Send },
    { ch: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
  ]
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {buttons.map(b => (
          <button key={b.label} type="button"
            onClick={() => { setLead({ ch: b.ch, m: b.m }); reportLeadFormEvent('click', b.ch, { managerId, managerName, developerName }) }}
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-[16px] font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
            <b.Icon size={18} strokeWidth={1.8} aria-hidden /> {b.label}
          </button>
        ))}
      </div>
      <p className="text-[13px] leading-[1.5] text-[#6B7570]">{c.note}</p>
      {lead && (
        <ContactLeadDialog open onClose={close} channel={lead.ch} messenger={lead.m} lang={lang}
          developerName={developerName} managerName={managerName} managerId={managerId} listingTitle={listingTitle} />
      )}
    </div>
  )
}
