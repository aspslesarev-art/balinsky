import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 Mei 2026'

export const metadata: Metadata = {
  title: 'Kebijakan Cookie | Balinsky',
  description: 'Cookie mana yang digunakan Balinsky.info: benar-benar diperlukan, analitik, pemasaran — dan cara mematikannya.',
  alternates: {
    canonical: '/id/cookie',
    languages: {
      ru: `${SITE_URL}/ru/cookie`,
      en: `${SITE_URL}/en/cookie`,
      id: `${SITE_URL}/id/cookie`,
      'x-default': `${SITE_URL}/ru/cookie`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="id" title="Kebijakan Cookie" updated={`Terakhir diperbarui: ${UPDATED}`} breadcrumbLabel="Kebijakan Cookie">
      <p>
        Cookie adalah berkas teks kecil yang disimpan situs di browser Anda. Cookie menjaga preferensi Anda tetap tersimpan dan membantu kami memahami
        bagaimana katalog digunakan.
      </p>

      <h2>1. Kategori cookie yang kami gunakan</h2>
      <h3>Benar-benar diperlukan (situs tidak berfungsi tanpanya)</h3>
      <ul>
        <li>Dukungan sesi — mengingat bahasa yang Anda pilih (RU atau EN).</li>
        <li>Perlindungan formulir (token CSRF).</li>
        <li>Penyimpanan lokal daftar favorit Anda — bukan cookie dalam arti sebenarnya, tetapi bersifat teknis.</li>
      </ul>
      <h3>Analitik (membantu kami meningkatkan situs)</h3>
      <ul>
        <li><strong>Google Analytics 4</strong> melalui Google Tag Manager (kontainer GTM-TM6D54Z3) — statistik tampilan halaman dan peristiwa yang dianonimkan.</li>
        <li><strong>Yandex.Metrica</strong> (penghitung 104881153) — analitik perilaku, peta panas, pemutaran ulang sesi.</li>
      </ul>
      <h3>Pemasaran</h3>
      <p>
        Saat ini kami tidak menyetel cookie iklan. Jika di masa depan kami menjalankan penargetan ulang di Google atau Yandex, cookie yang relevan akan ditambahkan
        dan halaman ini akan diperbarui.
      </p>

      <h2>2. Cara menonaktifkan cookie</h2>
      <p>
        Cookie analitik dan pemasaran dapat dimatikan di pengaturan browser Anda. Cookie yang benar-benar diperlukan tidak dapat dinonaktifkan —
        daftar favorit dan pengalih bahasa membutuhkannya.
      </p>
      <ul>
        <li>Chrome — <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Setelan → Privasi dan keamanan → Cookie</a></li>
        <li>Safari — <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener">Preferensi → Privasi</a></li>
        <li>Firefox — <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener">Opsi → Privasi &amp; Keamanan</a></li>
      </ul>
      <p>Anda juga dapat memasang uBlock Origin, Privacy Badger, atau mengaktifkan Do Not Track.</p>

      <h2>3. Dokumen terkait</h2>
      <ul>
        <li><a href="/id/privasi">Kebijakan Privasi</a></li>
        <li><a href="/id/ketentuan">Ketentuan Penggunaan</a></li>
      </ul>

      {/* TODO: when retargeting is enabled, add a Marketing section listing campaign IDs and cookie identifiers. */}
    </LegalLayout>
  )
}
