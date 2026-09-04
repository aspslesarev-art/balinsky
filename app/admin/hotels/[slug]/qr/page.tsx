import { notFound, redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { requireAdmin } from '@/lib/admin-auth'
import { hotelBySlug, listRooms } from '@/lib/hotel/db'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'QR-коды номеров' }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

// Лист QR-кодов на печать: по карточке на номер — вырезать и положить
// в номер. Печатается прямо из браузера, поэтому вся страница чёрно-белая
// и без интерфейса (print:hidden на панели сверху).
export default async function HotelQrSheet({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await requireAdmin())) redirect('/admin')
  const { slug } = await params

  const hotel = await hotelBySlug(slug)
  if (!hotel) notFound()

  const rooms = (await listRooms(hotel.id)).filter(r => r.active)
  const cards = await Promise.all(rooms.map(async room => ({
    room,
    url: `${SITE_URL}/stay/${room.token}`,
    // Уровень коррекции M: наклейку затирают руками и заливают кофе,
    // а «тихая зона» в 1 модуль экономит место на карточке.
    svg: await QRCode.toString(`${SITE_URL}/stay/${room.token}`, {
      type: 'svg', errorCorrectionLevel: 'M', margin: 1, width: 320,
    }),
  })))

  return (
    <main className="min-w-0 bg-white p-6 text-neutral-900 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-[20px] font-semibold">{hotel.name} — QR-коды номеров</h1>
          <p className="text-[13px] text-neutral-500">
            {cards.length} карточек. Печатайте из браузера (Ctrl/Cmd+P) — интерфейс на печать не попадёт.
          </p>
        </div>
        <a href={`/admin/hotels/${hotel.slug}`} className="text-[13px] text-neutral-500 no-underline hover:text-neutral-900">
          ← К отелю
        </a>
      </div>

      {cards.length === 0 ? (
        <p className="text-[14px] text-neutral-500">Включённых номеров нет — печатать нечего.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 print:grid-cols-3">
          {cards.map(({ room, url, svg }) => (
            <div
              key={room.id}
              className="flex break-inside-avoid flex-col items-center rounded-2xl border border-neutral-300 p-4 text-center"
            >
              <div className="text-[15px] font-semibold">{hotel.name}</div>
              <div className="mb-2 text-[13px] text-neutral-500">Номер {room.label}</div>
              {/* SVG от библиотеки qrcode — статическая разметка без скриптов */}
              <div className="w-full max-w-[220px]" dangerouslySetInnerHTML={{ __html: svg }} />
              <div className="mt-2 text-[11px] leading-tight text-neutral-500">
                Наведите камеру — напишите на стойку
                <br />
                <span className="break-all">{url}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
