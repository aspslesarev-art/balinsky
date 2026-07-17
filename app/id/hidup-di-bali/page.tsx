// EN mirror of /ru/zhizn-na-bali. Relocation hub for foreigners
// considering Bali — visas, taxes, schools, healthcare, monthly budget.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Plane, GraduationCap, Stethoscope, Wallet, Wifi, ChevronRight, FileCheck2 } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 Mei 2026'

export const metadata: Metadata = {
  title: 'Hidup di Bali — Visa, Pajak, Sekolah, Layanan Kesehatan 2026 | Balinsky',
  description: 'Panduan relokasi Bali: KITAS, Second Home Visa, Golden Visa, pajak warga asing yang menetap, sekolah internasional, rumah sakit BIMC dan Siloam, anggaran keluarga nyata.',
  alternates: {
    canonical: '/id/hidup-di-bali',
    languages: {
      ru: `${SITE_URL}/ru/zhizn-na-bali`,
      en: `${SITE_URL}/en/living-in-bali`,
      id: `${SITE_URL}/id/hidup-di-bali`,
      'x-default': `${SITE_URL}/ru/zhizn-na-bali`,
    },
  },
  openGraph: {
    title: 'Hidup di Bali — Panduan Relokasi 2026',
    description: 'KITAS, Second Home Visa, Golden Visa, pajak penetap, sekolah, layanan kesehatan, anggaran keluarga — dari operator yang sudah tinggal di sini 5+ tahun.',
    type: 'article',
    url: '/id/hidup-di-bali',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hidup di Bali — Panduan Relokasi 2026',
    description: 'Visa, pajak, sekolah, layanan kesehatan, anggaran.',
    images: ['/balina.jpg'],
  },
}

const FAQ = [
  { q: 'Visa mana yang cocok untuk relokasi jangka panjang ke Bali?',
    a: 'Dasar: B211A (turis, hingga 6 bulan dengan perpanjangan) untuk masa percobaan. KITAS Investor (1-2 tahun, mulai $40K yang diinvestasikan di PT PMA) untuk wirausahawan dan investor. KITAS Kerja — melalui pemberi kerja Indonesia. Second Home Visa (5-10 tahun, deposito $130K di bank lokal) untuk pemohon yang mandiri secara finansial. Golden Visa (5-10 tahun, investasi $350K+) — tingkat tertinggi untuk individu HNW.' },
  { q: 'Pajak apa yang dibayar warga asing yang menetap di Bali?',
    a: 'Setelah 183 hari di Indonesia dalam satu tahun kalender, Anda menjadi wajib pajak dalam negeri. PPh progresif: 5% hingga IDR 60 juta (~$4K), 15% hingga 250 juta, 25% hingga 500 juta, 30% hingga 5 miliar, 35% di atasnya. Penghasilan seluruh dunia, tetapi ada pengkreditan melalui perjanjian penghindaran pajak berganda (Indonesia memiliki P3B dengan 70+ negara termasuk AS, Inggris, Singapura, Australia, negara anggota UE).' },
  { q: 'Berapa biaya sekolah internasional?',
    a: 'Tingkat standar: Sunrise School, Australian Independent School, Cita Hati — $7-15K/tahun per anak SD. Premium: Green School Bali — $20-28K, Australian International School — $18-25K. Prasekolah (usia 3-5) — $5-10K/tahun. Anggaran untuk dua anak di SMP: $20-35K/tahun.' },
  { q: 'Layanan kesehatan apa yang tersedia?',
    a: 'Standar internasional: BIMC Kuta (afiliasi Cleveland Clinic), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu. Konsultasi spesialis $40-80, CT/MRI $200-400, operasi darurat $5-15K. Asuransi internasional wajib (Allianz, Cigna, Bupa) — $1500-3500/tahun per orang dewasa. Operasi berat dan onkologi biasanya dirujuk ke Singapura atau Malaysia.' },
  { q: 'Berapa anggaran bulanan untuk keluarga beranggota empat?',
    a: 'Nyaman (dua anak di sekolah internasional, rumah 3 kamar dengan taman dan kolam di Umalas, asisten rumah tangga 4 hari/minggu, satu mobil): $5500-7500/bulan = $66-90K/tahun. Premium (Green School, vila di Berawa, sopir dan asisten penuh waktu, dua mobil): $9000-13000/bulan = $108-156K/tahun. Minimum (tanpa sekolah, vila 2 kamar sederhana di Sanur): $2200-3000/bulan.' },
  { q: 'Bisakah saya bekerja jarak jauh dari Bali — internet dan infrastruktur?',
    a: 'Bisa. Infrastruktur bisnisnya solid: fiber 200-1000 Mbps di Canggu, Berawa, Umalas, Sanur, sebagian besar kompleks Bukit. Coworking 24/7 (Outpost, Tropical Nomad, Dojo, Soul & Surf). Listrik stabil, pemadaman jarang. KITAS Investor atau B211A (dengan visa digital nomad E33G baru sejak Oktober 2025) secara legal mencakup pekerjaan jarak jauh.' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Beranda', item: `${SITE_URL}/id` },
      { '@type': 'ListItem', position: 2, name: 'Hidup di Bali', item: `${SITE_URL}/id/hidup-di-bali` },
    ],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  }

  const SECTIONS = [
    { Icon: Plane, title: 'Visa & izin tinggal', body: 'KITAS Investor mulai $40K, Second Home Visa mulai deposito $130K, Golden Visa mulai investasi $350K. B211A turis untuk masa percobaan 6 bulan.' },
    { Icon: FileCheck2, title: 'Pajak penetap', body: 'Wajib pajak dalam negeri setelah 183 hari dalam setahun. Tarif progresif 5-35%. Pengkreditan P3B tersedia dengan 70+ negara — sebagian besar pasar Barat dan CIS tercakup.' },
    { Icon: GraduationCap, title: 'Sekolah', body: 'Sunrise / AIS / Cita Hati: $7-15K/tahun. Premium — Green School ($20-28K) dan AIS Premium. Komunitas internasional yang kuat.' },
    { Icon: Stethoscope, title: 'Layanan kesehatan', body: 'BIMC, Siloam, Kasih Ibu — klinik berstandar internasional. Asuransi wajib ($1500-3500/tahun). Operasi besar dirujuk ke Singapura.' },
    { Icon: Wallet, title: 'Anggaran keluarga', body: 'Keluarga 4 orang: nyaman $66-90K/tahun, premium $108-156K/tahun. Minimum dasar tanpa sekolah — mulai $2200/bulan.' },
    { Icon: Wifi, title: 'Kerja jarak jauh', body: 'Fiber 200-1000 Mbps di semua kawasan investasi. Coworking di Outpost / Tropical Nomad / Dojo. KITAS Investor atau visa digital nomad E33G baru mencakup pekerjaan jarak jauh secara legal.' },
  ]

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Beranda', href: '/id' },
          { label: 'Hidup di Bali' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Hidup di Bali — Panduan Relokasi
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Izin tinggal melalui KITAS, Second Home dan Golden Visa, pajak warga asing yang menetap, anggaran keluarga nyata,
              sekolah internasional, layanan kesehatan, dan infrastruktur kerja jarak jauh — dikumpulkan dari operator yang telah tinggal
              di pulau ini selama 5+ tahun.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Diperbarui: {UPDATED}</p>
          </header>

          <section className="mb-12 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {SECTIONS.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Icon size={22} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[15px] font-semibold text-[#111827] mb-1">{title}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">{body}</p>
              </div>
            ))}
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Visa — mana yang cocok untuk situasi apa</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>B211A — visa turis.</strong> 60 hari dengan perpanjangan hingga 6 bulan. Cocok untuk masa percobaan sebelum memutuskan relokasi. Biaya $50-100 + jasa agen $50-150.</p>
              <p><strong>E33G — visa digital nomad (sejak Oktober 2025).</strong> Hingga 1 tahun, membutuhkan penghasilan terverifikasi $60K+/tahun dari luar Indonesia. Tidak mengizinkan bekerja untuk perusahaan lokal tetapi melegalkan kerja jarak jauh. Ideal untuk pekerja lepas dan pekerja jarak jauh.</p>
              <p><strong>KITAS Investor.</strong> 1-2 tahun dengan perpanjangan, terkait PT PMA dengan investasi minimal $40K. Mengizinkan tinggal, membuka rekening bank lokal, membeli mobil, memperoleh asuransi kesehatan penetap. Format paling populer bagi wirausahawan.</p>
              <p><strong>Second Home Visa.</strong> 5-10 tahun, membutuhkan deposito $130K di bank Indonesia (dapat ditarik bertahap). Untuk pemohon yang mandiri secara finansial, pensiunan, keluarga berkecukupan.</p>
              <p><strong>Golden Visa.</strong> 5-10 tahun, investasi $350K (perorangan) atau $25M (perusahaan). Format tingkat tertinggi — hak maksimal dan pemeriksaan perpanjangan minimal.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Pajak penetap untuk warga asing</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>Setelah 183 hari di Indonesia dalam 12 bulan, Anda menjadi wajib pajak dalam negeri. Sejak 2025 Indonesia menerapkan pemajakan seluruh dunia: PPh dibayar atas seluruh penghasilan global, tidak hanya lokal.</p>
              <p>Tarif progresif: 5% hingga IDR 60 juta (~$4K), 15% hingga 250 juta (~$16K), 25% hingga 500 juta (~$32K), 30% hingga 5 miliar (~$320K), 35% di atasnya. Tahun pajak = tahun kalender, SPT jatuh tempo paling lambat 31 Maret.</p>
              <p>Perjanjian penghindaran pajak berganda mengurangi bebannya. Indonesia memiliki P3B dengan AS, Inggris, Singapura, Australia, seluruh anggota UE, Rusia, Kazakhstan, Belarus, Ukraina — sekitar 70 negara. Pajak yang dibayar di luar negeri dikreditkan terhadap kewajiban pajak Indonesia.</p>
              <p>Untuk penataan penghasilan melalui PT PMA: pajak perusahaan 22% + potongan dividen 10% saat dibayarkan ke non-penduduk (disesuaikan P3B). Sering kali tarif efektifnya lebih rendah daripada PPh pribadi atas penghasilan besar.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Sekolah internasional</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Prasekolah (3-5 tahun):</strong> Sunrise Preschool, Sanggar Anak Tangguh, Australian Independent (early years) — $5-10K/tahun. Program Montessori, Reggio Emilia, Waldorf yang kuat.</p>
              <p><strong>SD dan SMP (tingkat standar):</strong> Sunrise School (Bumin Sanur), Australian Independent School (Sanur), Cita Hati (Denpasar), Bali Island School (Sanur) — $7-15K/tahun. Kurikulum Cambridge dan International Baccalaureate, bahasa Inggris ditambah Spanyol/Mandarin/Indonesia.</p>
              <p><strong>Premium:</strong> Green School Bali ($20-28K/tahun) — sekolah bambu ramah lingkungan yang terkenal di dunia. Australian International School (Sanur, tingkat premium $18-25K) — Cambridge IGCSE / A-level.</p>
              <p>Komunitas internasional yang besar (5000+ keluarga ekspatriat) — jaringan orang tua yang aktif, klub akhir pekan, pertukaran bahasa. Cakupan penuh jenjang 1-12 tersedia.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Layanan kesehatan</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Klinik berstandar internasional:</strong> BIMC Kuta (afiliasi Cleveland Clinic), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu Hospital. Sebagian besar dokter berbahasa Inggris, beberapa memiliki sertifikasi internasional (US Board, AHPRA, GMC).</p>
              <p><strong>Harga bayar sendiri:</strong> konsultasi spesialis $40-80, panel darah lengkap $25-40, CT/MRI $200-400, operasi darurat menengah $5-15K, persalinan normal $2-4K, operasi sesar $4-7K.</p>
              <p><strong>Asuransi wajib:</strong> Allianz Worldwide Care, Cigna Global, Bupa Global, Aetna International. Paket dasar untuk orang dewasa usia 30-40 — $1500-2500/tahun, premium dengan rawat inap di Singapura — $3500-6000/tahun.</p>
              <p>Onkologi berat, operasi jantung, bedah saraf — biasanya dievakuasi ke Singapura (Mount Elizabeth, Gleneagles) atau Malaysia (Sunway Medical). Sebagian besar paket asuransi mencakup evakuasi.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Biaya hidup nyata</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Kategori</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Minimum</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Nyaman</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Premium</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:py-2 [&_td]:px-3 [&_td]:border-b [&_td]:border-[var(--color-border)]">
                  <tr><td className="font-semibold">Sewa (3 kamar)</td><td>$1000-1500</td><td>$2500-3500</td><td>$5000-9000</td></tr>
                  <tr><td className="font-semibold">Transportasi</td><td>$150 (skuter)</td><td>$500 (mobil+skuter)</td><td>$1500 (sopir)</td></tr>
                  <tr><td className="font-semibold">Makan</td><td>$400</td><td>$1200</td><td>$2500</td></tr>
                  <tr><td className="font-semibold">Asisten rumah tangga</td><td>—</td><td>$200 (3 hari/mgg)</td><td>$600 (penuh waktu)</td></tr>
                  <tr><td className="font-semibold">Sekolah (2 anak)</td><td>—</td><td>$1500</td><td>$3500</td></tr>
                  <tr><td className="font-semibold">Asuransi keluarga</td><td>$300</td><td>$600</td><td>$1200</td></tr>
                  <tr><td className="font-semibold">Lainnya</td><td>$200</td><td>$700</td><td>$1500</td></tr>
                  <tr className="font-semibold"><td>TOTAL /bulan</td><td>$2050-2550</td><td>$7200-8200</td><td>$15800-19800</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Pertanyaan yang Sering Diajukan
            </h2>
            <div className="space-y-3">
              {FAQ.map((it, i) => (
                <details key={i} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-semibold text-[#111827]">
                    <span>{it.q}</span>
                    <ChevronRight size={18} className="shrink-0 transition-transform [details[open]_&]:rotate-90" />
                  </summary>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)]">{it.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Langkah berikutnya</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/id/investasi-properti-bali" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Investasi properti Bali</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Imbal hasil, leasehold, pajak, ROI — panduan investor lengkap.</p>
              </Link>
              <Link href="/id/vila/umalas" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Vila di Umalas — kawasan hunian</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Area tenang untuk keluarga dengan anak, sekolah dan infrastruktur di dekatnya.</p>
              </Link>
              <Link href="/id/vila/sanur" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Vila di Sanur — pesisir yang tenang</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Audiens keluarga, promenade tepi pantai, risiko rendah.</p>
              </Link>
              <Link href="/id/kontak" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Kontak</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Telegram, email, kontak mitra.</p>
              </Link>
            </div>
          </section>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </PageContainer>
      <Footer lang="id" />
    </>
  )
}
