import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone } from 'lucide-react'
import { requireAdmin } from '@/lib/admin-auth'
import { listAllReservations, type Reservation, type ReservationStatus } from '@/lib/reservations'
import { ReservationStatusButtons } from './_status'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Брони · Balinsky Admin' }

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: 'Ждёт подтверждения',
  confirmed: 'Подтверждено',
  invoice_sent: 'Счёт отправлен',
  paid: 'Оплачено',
  cancelled: 'Отменено',
  expired: 'Просрочено',
}
const STATUS_TONE: Record<ReservationStatus, string> = {
  pending: 'bg-[#FEF3C7] text-[#92400E]',
  confirmed: 'bg-[#D1FAE5] text-[#065F46]',
  invoice_sent: 'bg-[#DBEAFE] text-[#1E40AF]',
  paid: 'bg-[#D1FAE5] text-[#065F46]',
  cancelled: 'bg-[#E5E7EB] text-[#374151]',
  expired: 'bg-[#FEE2E2] text-[#991B1B]',
}

function fmtDateTime(iso: string): string {
  try { return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

export default async function ReservationsAdmin() {
  if (!(await requireAdmin())) redirect('/admin')
  const items = await listAllReservations()

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin/chats" className="inline-flex items-center gap-1.5 text-[13px] text-[#4B5563] hover:text-[#111827] no-underline">
            <ArrowLeft size={14} /> К чатам
          </Link>
          <h1 className="text-[20px] font-semibold">Брони</h1>
          <span className="text-[12px] text-[#6B7280]">{items.length} {items.length === 1 ? 'заявка' : 'заявок'}</span>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-10 text-center text-[13px] text-[#6B7280]">
            Заявок пока нет. Когда кто-то нажмёт «Зарезервировать» на странице объекта,
            запись появится здесь.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map(r => <Row key={r.id} r={r} />)}
          </ul>
        )}
      </div>
    </div>
  )
}

function Row({ r }: { r: Reservation }) {
  const sectionPath = r.listing_kind === 'villa' ? '/ru/villy/o/' : '/ru/apartamenty/o/'
  const expired = new Date(r.expires_at).getTime() < Date.now() && r.status !== 'paid' && r.status !== 'cancelled'
  const visibleStatus: ReservationStatus = expired && r.status !== 'expired' ? 'expired' : r.status
  return (
    <li className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded ${STATUS_TONE[visibleStatus]}`}>
              {STATUS_LABEL[visibleStatus]}
            </span>
            <span className="text-[11px] text-[#6B7280]">
              {fmtDateTime(r.created_at)} · до {fmtDateTime(r.expires_at)}
            </span>
          </div>
          <div className="text-[14px] font-medium leading-snug mb-2">
            <Link href={`${sectionPath}${r.listing_slug}`} target="_blank" className="text-[#111827] hover:text-[#1F8B5F]">
              {r.listing_title ?? r.listing_slug}
            </Link>
            {r.listing_price_usd != null && (
              <span className="ml-2 text-[12px] text-[#6B7280] font-normal">
                ${Math.round(r.listing_price_usd).toLocaleString('en-US')}
              </span>
            )}
          </div>
          <div className="text-[14px] text-[#111827] mb-1">{r.contact_name}</div>
          <div className="flex items-center gap-3 flex-wrap text-[12px] text-[#4B5563]">
            <a href={`mailto:${r.contact_email}`} className="inline-flex items-center gap-1 hover:text-[#1F8B5F]">
              <Mail size={12} /> {r.contact_email}
            </a>
            <a href={`tel:${r.contact_phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 hover:text-[#1F8B5F]">
              <Phone size={12} /> {r.contact_phone}
            </a>
          </div>
        </div>
        <ReservationStatusButtons id={r.id} current={visibleStatus} />
      </div>
    </li>
  )
}
