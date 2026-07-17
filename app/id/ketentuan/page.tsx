import type { Metadata } from 'next'
import { LegalLayout } from '@/components/LegalLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 Mei 2026'

export const metadata: Metadata = {
  title: 'Ketentuan Penggunaan | Balinsky',
  description: 'Ketentuan penggunaan katalog Balinsky.info: apa kami ini (dan apa yang bukan), batasan konten, tanggung jawab pembeli dan operator.',
  alternates: {
    canonical: '/id/ketentuan',
    languages: {
      ru: `${SITE_URL}/ru/usloviya`,
      en: `${SITE_URL}/en/terms`,
      id: `${SITE_URL}/id/ketentuan`,
      'x-default': `${SITE_URL}/ru/usloviya`,
    },
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <LegalLayout lang="id" title="Ketentuan Penggunaan" updated={`Terakhir diperbarui: ${UPDATED}`} breadcrumbLabel="Ketentuan Penggunaan">
      <p>
        Dengan menggunakan Balinsky.info, Anda menyetujui ketentuan di bawah ini. Jika ada sesuatu di sini yang tidak cocok bagi Anda, mohon jangan gunakan situs ini.
      </p>

      <h2>1. Apa itu Balinsky.info</h2>
      <p>
        Balinsky.info adalah katalog agregator listing real estat Bali (vila, apartemen, kompleks hunian,
        sewa jangka panjang), informasi pengembang, berita, promosi, dan materi edukasi. Situs ini dibuat untuk pembeli asing.
      </p>
      <p>
        Kami bukan pihak dalam transaksi jual beli apa pun. Kami menampilkan informasi tentang unit yang tersedia dan menghubungkan pembeli
        dengan operator setiap unit (pengembang, agensi, atau pemilik). Kesepakatan ditutup langsung antara pembeli dan operator.
      </p>

      <h2>2. Akurasi</h2>
      <p>
        Kami berupaya menjaga katalog tetap terkini, tetapi harga, ketersediaan, izin (PBG, SLF), dan ketentuan dapat berubah.
        Sebelum menutup kesepakatan, verifikasi data langsung dengan operator dan melalui register resmi Indonesia.
      </p>
      <p>
        Setiap video dan foto diambil pada tanggal tertentu — kami tidak bertanggung jawab atas perubahan setelah pengambilan tersebut.
      </p>

      <h2>3. Konten pengguna</h2>
      <p>
        Saat Anda menghubungi kami melalui Telegram, bot kami, formulir, atau email, Anda mengirimkan teks dan data kontak serta menyatakan bahwa Anda memiliki
        hak untuk membagikannya. Bagaimana data itu digunakan: lihat <a href="/id/privasi">Kebijakan Privasi</a> kami.
      </p>
      <p>
        Dilarang menggunakan situs untuk spam, scraping otomatis, upaya melewati perlindungan, serangan beban, atau rekayasa balik API internal.
      </p>

      <h2>4. Kekayaan intelektual</h2>
      <p>
        Teks, skema, dan materi editorial di situs (kecuali ditandai lain) dilisensikan di bawah
        Creative Commons Attribution 4.0 International — cantumkan penulis dan tautkan ke sumber asli saat menggunakannya kembali.
      </p>
      <p>
        Foto dan video properti tertentu mungkin milik pengembang atau pihak ketiga — mintalah lisensi terpisah untuk penggunaan komersial.
      </p>

      <h2>5. Asisten AI Balina</h2>
      <p>
        Balina adalah asisten AI eksperimental di situs. Jawabannya bersifat informasional dan tidak menggantikan konsultasi dengan agen berlisensi,
        pengacara, atau notaris. Balina bisa membuat kesalahan — konfirmasikan apa pun yang memengaruhi kesepakatan dengan spesialis yang tepat sebelum bertindak atasnya.
      </p>

      <h2>6. Tautan eksternal</h2>
      <p>
        Situs ini menautkan ke sumber daya pihak ketiga (YouTube, Telegram, estatemarket.io, situs pengembang). Kami tidak mengontrol kontennya
        dan tidak bertanggung jawab atas ketersediaan atau kebijakannya.
      </p>

      <h2>7. Tanggung jawab</h2>
      <p>
        Situs disediakan &ldquo;sebagaimana adanya&rdquo;. Kami tidak menjamin ketersediaan tanpa gangguan, tidak adanya masalah teknis, atau bahwa listing
        sesuai dengan tujuan investasi spesifik Anda. Keputusan menjadi risiko pembeli.
      </p>

      <h2>8. Perubahan</h2>
      <p>
        Ketentuan ini dapat berubah. Versi terkini selalu ada di halaman ini. Pembaruan penting diumumkan di
        <a href="https://t.me/itrealtor" target="_blank" rel="noopener"> saluran Telegram @itrealtor</a>.
      </p>

      <h2>9. Hukum yang berlaku dan yurisdiksi</h2>
      <p>
        Sengketa diatur oleh hukum Georgia (negara pendaftaran operator), kecuali aturan wajib di negara tempat tinggal Anda
        menentukan lain.
      </p>

      {/* TODO: confirm jurisdiction / arbitration wording with counsel. Default is Georgia (sole-proprietor country). */}
    </LegalLayout>
  )
}
