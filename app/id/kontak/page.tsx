import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, MapPin, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 Mei 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Kontak | Balinsky',
  description: 'Cara menghubungi Balinsky: bot Telegram, saluran Telegram, email, YouTube. Kontak kemitraan untuk pengembang dan agensi.',
  alternates: {
    canonical: '/id/kontak',
    languages: {
      ru: `${SITE_URL}/ru/kontakty`,
      en: `${SITE_URL}/en/contact`,
      id: `${SITE_URL}/id/kontak`,
      'x-default': `${SITE_URL}/ru/kontakty`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="id" title="Kontak" updated={`Informasi terkini per: ${UPDATED}`} breadcrumbLabel="Kontak">
      <p>
        Cara tercepat adalah bot Telegram. Bot ini meneruskan pertanyaan Anda ke manajer unit tertentu dan membalas dalam satu jam pada jam kerja.
      </p>

      <h2>Untuk pembeli properti</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Bot Telegram</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Pertanyaan tentang vila, apartemen, dan kompleks tertentu. Diteruskan ke manajer operator.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Mail size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Email</strong> — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Untuk pertanyaan tertulis dengan lampiran atau permintaan perlindungan data.</div>
          </div>
        </li>
      </ul>

      <h2>Kabar pasar</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MessageCircle size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Saluran Telegram</strong> — <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Listing baru, promosi, ulasan pasar Bali, kasus investasi.</div>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Play size={20} className="text-[#FF0000] mt-0.5 shrink-0" fill="currentColor" />
          <div>
            <strong>YouTube</strong> — <a href="https://www.youtube.com/@balinsky_info" target="_blank" rel="noopener">@balinsky_info</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Tur properti langsung di lapangan, wawancara pengembang, analisis pasar.</div>
          </div>
        </li>
      </ul>

      <h2>Kemitraan</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Pengembang</strong> — tambahkan proyek Anda ke katalog, jalankan penempatan berbayar, atau luncurkan saluran lead bersama:
            email <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Kemitraan (pengembang)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Agensi real estat</strong> — pertukaran lead, program referral, katalog white-label:
            email <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Kemitraan (agensi)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Operator situs</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <MapPin size={20} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            Andrei Slesarev, pengusaha perorangan (Georgia).
            {/* TODO: add registration number / legal address for formal requests. */}
          </div>
        </li>
      </ul>

      <h2>Waktu respons</h2>
      <p>
        Standar layanan — balasan dalam satu jam pada jam kerja (10:00–20:00 WITA, UTC+8).
        Pertanyaan yang diterima pada malam hari diproses keesokan paginya.
      </p>

      <h2>Dokumen terkait</h2>
      <ul>
        <li><Link href="/id/privasi">Kebijakan Privasi</Link></li>
        <li><Link href="/id/ketentuan">Ketentuan Penggunaan</Link></li>
        <li><Link href="/id/tentang">Tentang Balinsky</Link></li>
      </ul>
    </LegalLayout>
  )
}
