import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Send, Play, MessageCircle, Briefcase } from 'lucide-react'
import { LegalLayout } from '@/components/LegalLayout'
import { hreflangMap } from '@/lib/hreflang'

const UPDATED = '15 Mei 2026'
const CONTACT_EMAIL = 'i@balinsky.info'

export const metadata: Metadata = {
  title: 'Kontak | Balinsky',
  description: 'Cara menghubungi Balinsky: bot Telegram, saluran Telegram, email, YouTube. Kontak kemitraan untuk pengembang dan agensi.',
  alternates: {
    canonical: '/id/kontak',
    languages: hreflangMap('/ru/kontakty'),
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="id" title="Kontak" updated={`Informasi terkini per: ${UPDATED}`} breadcrumbLabel="Kontak">
      <p>
        Balinsky.info adalah katalog informasi. Kontak di bawah untuk pertanyaan tentang situs itu sendiri: data pada halaman objek, kekeliruan yang Anda temukan, pemuatan proyek. Untuk properti tertentu, hubungi pengembang secara langsung — Telegram dan WhatsApp mereka ada di halaman objek tersebut.
      </p>

      <h2>Pertanyaan tentang situs dan datanya</h2>
      <ul className="!pl-0 !list-none space-y-3 !my-5">
        <li className="flex items-start gap-3">
          <Send size={20} className="text-[#229ED9] mt-0.5 shrink-0" />
          <div>
            <strong>Bot Telegram</strong> — <a href="https://t.me/BalinskyBot" target="_blank" rel="noopener">@BalinskyBot</a>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Pertanyaan tentang katalog dan data objek. Bila pertanyaannya soal harga, jadwal, atau reservasi, itu untuk pengembang, bukan untuk kami.</div>
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
            <strong>Pengembang</strong> — tambahkan proyek Anda ke katalog, kirim dokumen, denah, atau rekaman dari lokasi:
            email <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Kemitraan (pengembang)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Briefcase size={20} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div>
            <strong>Agensi real estat</strong> — penerbitan informasi tentang proyek yang Anda wakili:
            email <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Kemitraan (agensi)')}`}>{CONTACT_EMAIL}</a>.
          </div>
        </li>
      </ul>

      <h2>Peran situs</h2>
      <p>
        Balinsky.info menerbitkan informasi tentang properti dan bukan pihak dalam transaksi apa pun. Kami bukan agen properti: kami tidak menjual objek, tidak bernegosiasi, tidak memungut komisi, dan tidak menerima pembayaran. Untuk permintaan resmi, gunakan email di atas.
      </p>

      <h2>Waktu respons</h2>
      <p>
        Pertanyaan tentang situs kami jawab pada jam kerja (10:00–20:00 WITA, UTC+8), biasanya dalam sehari.
        Seberapa cepat pengembang membalas bukan urusan kami — angka pada halaman objek hanya sebagai rujukan.
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
