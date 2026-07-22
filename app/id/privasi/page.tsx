import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 Mei 2026'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi | Balinsky',
  description: 'Bagaimana Balinsky memproses data pribadi: apa yang kami kumpulkan, mengapa, berapa lama kami menyimpannya, siapa pihak ketiganya, dan cara meminta penghapusan.',
  alternates: {
    canonical: '/id/privasi',
    languages: {
      ru: `${SITE_URL}/ru/politika-konfidencialnosti`,
      en: `${SITE_URL}/en/privacy`,
      id: `${SITE_URL}/id/privasi`,
      'x-default': `${SITE_URL}/ru/politika-konfidencialnosti`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="id" title="Kebijakan Privasi" updated={`Terakhir diperbarui: ${UPDATED}`} breadcrumbLabel="Kebijakan Privasi">
      <p>
        Kebijakan ini menjelaskan data pribadi apa yang dikumpulkan situs <a href="/id">Balinsky.info</a>, mengapa,
        bagaimana data disimpan, dengan siapa data dibagikan, dan hak apa yang Anda miliki sebagai pengguna.
      </p>

      <h2>1. Operator situs</h2>
      <p>
        Balinsky.info dioperasikan oleh Andrei Slesarev (pengusaha perorangan, Georgia). Untuk pertanyaan
        terkait perlindungan data: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>,
        Telegram <a href="https://t.me/itrealtor" target="_blank" rel="noopener">@itrealtor</a>.
      </p>

      <h2>2. Apa yang kami kumpulkan</h2>
      <h3>2.1. Data yang Anda berikan</h3>
      <ul>
        <li>Nama, telepon, dan email saat Anda mengirim permintaan reservasi atau meminta panggilan balik.</li>
        <li>Pesan yang dikirim ke bot Telegram @BalinskyBot dan ke agen kami dalam obrolan langsung.</li>
        <li>Daftar favorit Anda, disimpan hanya secara lokal di browser Anda — tidak pernah diunggah ke server kami.</li>
      </ul>
      <h3>2.2. Data yang dikumpulkan secara otomatis</h3>
      <ul>
        <li>Alamat IP, tipe browser dan perangkat, sistem operasi, resolusi layar.</li>
        <li>URL yang dikunjungi, perujuk, durasi sesi, interaksi di halaman (Google Analytics 4, Yandex.Metrica).</li>
        <li>Cookie — lihat <a href="/id/cookie">Kebijakan Cookie</a> untuk detailnya.</li>
      </ul>

      <h2>3. Mengapa kami memprosesnya</h2>
      <ul>
        <li>Untuk menghubungi Anda mengenai pertanyaan properti tertentu.</li>
        <li>Untuk memahami bagian mana dari situs yang berfungsi dan untuk meningkatkan katalog.</li>
        <li>Untuk mengirim pesan informasional melalui bot Telegram jika Anda memilih untuk menerimanya.</li>
        <li>Keamanan — mendeteksi bot, spam, dan upaya penyusupan.</li>
      </ul>

      <h2>4. Pihak ketiga</h2>
      <p>Situs ini mengandalkan penyedia berikut:</p>
      <ul>
        <li><strong>Vercel</strong> — hosting dan CDN (AS / UE).</li>
        <li><strong>Supabase</strong> — basis data dan penyimpanan media (UE).</li>
        <li><strong>Google Analytics 4</strong> dan <strong>Google Tag Manager</strong> — analitik.</li>
        <li><strong>Yandex.Metrica</strong> — analitik dan sinyal perilaku untuk Yandex Search.</li>
        <li><strong>Telegram</strong> — perutean pesan melalui @BalinskyBot.</li>
        <li><strong>OpenAI / Azure OpenAI</strong> — menjalankan asisten AI Andrei. Jika Anda mengirim pesan ke asisten, pesan Anda dan konteks di sekitarnya dikirim ke API penyedia.</li>
      </ul>

      <h2>5. Penyimpanan</h2>
      <p>
        Pertanyaan dan percakapan disimpan hanya selama diperlukan untuk menangani permintaan Anda dan terus melayani Anda setelahnya.
        Log teknis dan analitik — hingga 14 bulan. Kami akan menghapus data pribadi lebih cepat atas permintaan.
      </p>

      <h2>6. Hak Anda</h2>
      <ul>
        <li>Menerima salinan data pribadi yang kami simpan tentang Anda.</li>
        <li>Meminta koreksi atas data yang tidak akurat.</li>
        <li>Meminta penghapusan data Anda (kecuali kami memiliki kewajiban hukum yang bertentangan untuk menyimpannya).</li>
        <li>Menarik persetujuan untuk komunikasi pemasaran.</li>
        <li>Mengajukan keluhan ke otoritas perlindungan data di negara tempat tinggal Anda.</li>
      </ul>
      <p>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Kami merespons dalam 30 hari.</p>

      <h2>7. Keamanan</h2>
      <p>
        Akses ke back office dibatasi. Koneksi dienkripsi HTTPS. Kami tidak menerima atau menyimpan data pembayaran —
        semua pembayaran langsung ke rekening bank operator properti.
      </p>

      <h2>8. Perubahan</h2>
      <p>
        Kami memperbarui kebijakan ini seiring perubahan praktik penanganan data kami. Versi terkini selalu terlihat di halaman ini;
        tanggal di bagian atas mencerminkan perubahan terbaru.
      </p>

      {/* TODO: legal review once the entity status is final. Sole-proprietor Georgia is the current footer block. */}
    </LegalLayout>
  )
}
