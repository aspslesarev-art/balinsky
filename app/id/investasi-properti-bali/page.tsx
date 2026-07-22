// EN mirror of /ru/investicii-v-nedvizhimost-bali. Same pillar, same
// schema markup, English tone calibrated for foreign investors searching
// «bali property investment», «bali real estate ROI», «bali leasehold».

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp, Building2, FileCheck2, Calculator, ShieldCheck, BarChart3, ChevronRight, AlertTriangle, MapPin } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = '15 Mei 2026'

export const metadata: Metadata = {
  title: 'Investasi Properti Bali 2026 — Imbal Hasil Nyata, Leasehold, Pajak | Balinsky',
  description: 'Panduan lengkap investasi properti Bali untuk warga asing: imbal hasil bersih nyata 8-15%, struktur leasehold vs PT PMA, pajak, perhitungan ROI, dan studi kasus di Canggu, Bukit, Ubud.',
  alternates: {
    canonical: '/id/investasi-properti-bali',
    languages: {
      ru: `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
      en: `${SITE_URL}/en/bali-property-investment`,
      id: `${SITE_URL}/id/investasi-properti-bali`,
      'x-default': `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
    },
  },
  openGraph: {
    title: 'Investasi Properti Bali 2026 — Panduan Lengkap untuk Warga Asing',
    description: 'Imbal hasil bersih 8-15%, leasehold vs PT PMA, pajak, ROI per kawasan. Angka nyata dari analitik setara Booking dan studi kasus pembeli.',
    type: 'article',
    url: '/id/investasi-properti-bali',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Investasi Properti Bali 2026',
    description: 'Imbal hasil nyata, leasehold, pajak, ROI per kawasan. Data terverifikasi.',
    images: ['/andrei.jpg'],
  },
}

const FAQ = [
  { q: 'Berapa imbal hasil sewa yang realistis untuk vila di Bali pada 2026?',
    a: 'Berdasarkan data langsung setara Booking melalui estatemarket.io: imbal hasil bersih tahunan 8-12% di Canggu dan Bukit dengan okupansi 70-80% dan pengelolaan profesional. Vila segmen premium (bangunan baru dengan pemandangan laut, 4+ kamar tidur) mencapai hingga 15%. Ubud dan Sanur menghasilkan 6-9% karena ADR lebih rendah. Ini angka bersih, setelah biaya pengelolaan (15-20% dari pendapatan), utilitas, penyusutan, pajak, dan periode kosong.' },
  { q: 'Leasehold atau PT PMA — struktur mana yang sebaiknya dipilih investor asing?',
    a: 'Leasehold (sewa tanah jangka panjang, 25-80 tahun) cocok untuk pembelian 1-2 properti secara individu. Lebih murah, lebih cepat (1-2 bulan), tanpa perlu struktur perusahaan. PT PMA (perusahaan Indonesia dengan pemegang saham asing) masuk akal untuk portofolio 3+ unit atau properti komersial. Struktur ini memungkinkan kepemilikan freehold tetapi membutuhkan modal disetor $25K, pelaporan tahunan, dan pajak perusahaan.' },
  { q: 'Pajak apa saja yang dibayar warga asing saat membeli dan memiliki properti di Bali?',
    a: 'Saat pembelian: pajak perolehan 5% (BPHTB) + 1-2% notaris + 3-5% komisi agen bila berlaku. Saat kepemilikan: PBB (pajak properti) 0,1-0,3% dari nilai kadastral per tahun. Atas pendapatan sewa: pajak penghasilan pribadi 20% untuk warga asing (dapat dikurangi melalui PT PMA). Saat penjualan: pajak penghasilan 2,5% dari harga jual.' },
  { q: 'Berapa tahun hingga vila di Bali balik modal?',
    a: 'Pada imbal hasil tahunan 10% — 10 tahun. Pada 12% — 8,3 tahun. Dalam praktik: 7-10 tahun di Canggu/Bukit dengan pengelolaan aktif; 12-15 tahun di kawasan yang lebih tenang. Waspadai leasehold dengan sisa di bawah 30 tahun saat pembelian — sering kali tidak menyelesaikan siklus balik modal penuh ditambah penjualan kembali yang menguntungkan.' },
  { q: 'Apa itu PBG dan SLF, dan mengapa keduanya krusial?',
    a: 'PBG (Persetujuan Bangunan Gedung) adalah izin bangunan, diterbitkan sebelum konstruksi. SLF (Sertifikat Laik Fungsi) adalah sertifikat kelaikan fungsi, diterbitkan setelah selesai. Tanpa SLF, unit tidak dapat disewakan secara legal — model investasi Anda tidak berjalan secara resmi. Setiap properti dalam katalog Balinsky diperiksa QA untuk dokumen-dokumen ini sebelum dipublikasikan — itulah yang membuat kami menjadi daftar pilihan editorial, bukan agregator.' },
  { q: 'Bisakah saya memperoleh izin tinggal Indonesia melalui investasi properti?',
    a: 'Tidak ada skema «properti untuk izin tinggal» langsung. Yang ada adalah KITAS Investor Visa (mulai $40K yang diinvestasikan di PT PMA), Second Home Visa (mulai $130K yang disimpan di bank Indonesia), Golden Visa (mulai $350K investasi perorangan, $25M untuk perusahaan). Membeli vila saja tidak memberikan izin tinggal — Anda memerlukan struktur perusahaan atau deposito.' },
]

const REGIONS = [
  { name: 'Canggu', slug: 'canggu', yieldRange: '10-13%', priceFrom: '$180K', niche: 'kawasan tren, acara, networking, sewa harian' },
  { name: 'Bukit (Uluwatu/Pandawa/Ungasan)', slug: 'uluwatu', yieldRange: '10-15%', priceFrom: '$130K', niche: 'pemandangan laut premium, komunitas surfing, ADR tinggi' },
  { name: 'Ubud', slug: 'ubud', yieldRange: '6-9%', priceFrom: '$120K', niche: 'wellness, wisata yoga, masa inap lebih lama' },
  { name: 'Sanur', slug: 'sanur', yieldRange: '5-8%', priceFrom: '$150K', niche: 'segmen keluarga, risiko rendah, permintaan stabil' },
  { name: 'Nusa Dua', slug: 'nusa-dua', yieldRange: '7-10%', priceFrom: '$200K', niche: 'hotel premium di sekitar, perjalanan korporat' },
  { name: 'Pererenan', slug: 'pererenan', yieldRange: '9-12%', priceFrom: '$160K', niche: 'lebih tenang, bersebelahan dengan Canggu, kawasan tren yang berkembang' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Beranda', item: `${SITE_URL}/id` },
      { '@type': 'ListItem', position: 2, name: 'Investasi properti Bali', item: `${SITE_URL}/id/investasi-properti-bali` },
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

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Beranda', href: '/id' },
          { label: 'Investasi properti Bali' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Investasi Properti Bali — Panduan 2026
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Imbal hasil bersih tahunan nyata 8-15%, rincian ROI di 6 kawasan, struktur hukum (leasehold dan PT PMA),
              pajak untuk pemilik asing, dan daftar pilihan editorial properti dengan izin terverifikasi.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Diperbarui: {UPDATED}</p>
          </header>

          <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { Icon: TrendingUp, n: '8–15%', label: 'imbal hasil bersih tahunan' },
              { Icon: Building2, n: '828+', label: 'unit dalam katalog' },
              { Icon: ShieldCheck, n: '100%', label: 'PBG + SLF terverifikasi' },
              { Icon: BarChart3, n: '6', label: 'kawasan investasi' },
            ].map(({ Icon, n, label }) => (
              <div key={label} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Icon size={20} className="text-[var(--color-primary)] mb-2" />
                <div className="text-[24px] font-semibold text-[#111827]">{n}</div>
                <div className="text-[13px] text-[var(--color-text-muted)]">{label}</div>
              </div>
            ))}
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Mengapa Bali Menjadi Pasar #1 bagi Investor Asing pada 2026
            </h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>
                Bali adalah satu-satunya pasar wisata di Asia Tenggara di mana warga asing dapat memiliki properti secara legal
                meski Indonesia melarang freehold untuk warga asing. Melalui struktur leasehold dan PT PMA, transaksi selesai
                cepat dan bersih, serta tarif pajaknya termasuk yang terendah di kawasan ini.
              </p>
              <p>
                Sejalan dengan itu, pulau ini mempertahankan posisinya sebagai raksasa pariwisata kawasan: 6-7 juta pengunjung
                internasional per tahun, okupansi 70-85% pada hotel dan sewa di Canggu dan Bukit, average daily rate (ADR) tumbuh
                8-12% dari tahun ke tahun sejak 2023. Menurut <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a> —
                analitik Booking publik yang kami tampilkan di setiap kartu properti — data imbal hasil nyata tingkat tetangga tersedia
                secara harfiah jalan demi jalan dalam radius 1 km.
              </p>
              <p>
                Itulah kombinasi langka: <strong>permintaan wisata tinggi + struktur legal yang ramah warga asing + biaya masuk rendah</strong>
                ($120-200K untuk unit pemula). Tidak ada pasar Asia Tenggara lain yang memadukan ketiganya — Phuket dan Ho Chi Minh
                lebih mahal dan lebih sulit dalam transaksi, Samui dan Langkawi permintaannya lebih lemah.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Imbal Hasil per Kawasan — Angka Nyata 2026
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-6">
              Rentang ini merata-ratakan tetangga Booking yang sebanding selama 12 bulan terakhir, bersih dari biaya pengelolaan,
              penyusutan, dan pajak. Sebaran ditampilkan sebagai persentil ke-5 dan ke-95.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Kawasan</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Imbal hasil</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Mulai</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)] hidden md:table-cell">Karakter</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {REGIONS.map(r => (
                    <tr key={r.slug} className="border-b border-[var(--color-border)]">
                      <td className="py-3 px-3 font-semibold text-[#111827]">{r.name}</td>
                      <td className="py-3 px-3 text-[var(--color-primary)] font-semibold">{r.yieldRange}</td>
                      <td className="py-3 px-3">{r.priceFrom}</td>
                      <td className="py-3 px-3 hidden md:table-cell text-[var(--color-text-muted)]">{r.niche}</td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/id/vila`} className="text-[var(--color-primary)] text-[13px] inline-flex items-center gap-1 no-underline hover:underline">
                          lihat <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Struktur Hukum — Leasehold vs PT PMA
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">Leasehold</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Sewa tanah jangka panjang dari pemilik lokal — 25-80 tahun, sering kali dapat diperpanjang.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Dokumen dan formalitas minimal</li>
                  <li>Selesai dalam 1-2 bulan di hadapan notaris PPAT</li>
                  <li>Cocok untuk pembelian 1-2 unit secara individu</li>
                  <li>Lebih murah dari PT PMA sekitar $5-15K per transaksi</li>
                  <li className="text-[var(--color-text-muted)]">Anda tidak memiliki tanahnya — hanya hak pakai</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">PT PMA</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Perusahaan Indonesia dengan pemegang saham asing — dapat memiliki tanah freehold.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Kepemilikan freehold</li>
                  <li>Cocok untuk portofolio 3+ unit</li>
                  <li>Memungkinkan operasi penyewaan yang legal</li>
                  <li>Modal disetor $25K + pelaporan tahunan</li>
                  <li className="text-[var(--color-text-muted)]">Pajak penghasilan perusahaan 22%</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
              Panduan transaksi lengkap ada di halaman <Link href="/id/cara-beli" className="text-[var(--color-primary)] no-underline hover:underline">«Cara membeli properti di Bali»</Link>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Perhitungan ROI — Kasus Umum
            </h2>
            <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={20} className="text-[var(--color-primary)]" />
                <strong>Vila 2 kamar di Canggu, $250K, leasehold 30 tahun</strong>
              </div>
              <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                <li>Harga beli: $250.000</li>
                <li>Biaya transaksi (notaris, pajak BPHTB, due diligence): ~$15.000</li>
                <li>Tarif rata-rata: $200/malam × okupansi 75% × 365 hari = $54.750/tahun</li>
                <li>Pengeluaran (pengelolaan 18%, utilitas, penyusutan perabot, pajak 20%): ~$23.500/tahun</li>
                <li>Arus kas bersih: ~$31.250/tahun → imbal hasil tahunan 12,5% atas modal $250K</li>
                <li>Balik modal: ~8 tahun untuk impas, tersisa 22 tahun sewa produktif pada leasehold</li>
              </ul>
              <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
                Kalkulator serupa berjalan otomatis di setiap halaman vila dalam katalog kami, terisi dengan data tetangga
                nyata dari <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a>.
              </p>
            </div>
          </section>

          <section className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Risiko yang Tidak Diceritakan Penjual</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li><strong>Leasehold di bawah 30 tahun.</strong> Anda tidak akan menutup investasi sekaligus menjual kembali dengan untung. Tuntut sisa 35+ tahun saat pembelian.</li>
                  <li><strong>Properti tanpa SLF.</strong> Penyewaan legal mustahil — model imbal hasil Anda tidak ada di atas kertas.</li>
                  <li><strong>Pengembang tanpa PBG.</strong> Konstruksi bisa dihentikan otoritas dan uang muka Anda tidak akan dikembalikan.</li>
                  <li><strong>Tanah zona pertanian.</strong> Sebagian lahan Canggu/Pererenan sedang direklasifikasi — periksa rencana RDTR.</li>
                  <li><strong>Okupansi nyata di bawah yang dijanjikan.</strong> Imbal hasil yang dijamin pengembang biasanya digelembungkan 30-50%. Verifikasi silang dengan data tetangga Booking.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Cara Kami Memverifikasi Properti Katalog
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-4">
              Setiap properti di Balinsky melewati QA editorial sebelum dipublikasikan. Ini bukan agregator serba ada —
              hanya proyek yang izinnya (PBG, SLF), struktur tanahnya (zonasi, RDTR), dan pengembangnya (registrasi PT) telah
              diverifikasi secara manual.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <FileCheck2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Dokumen</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">PBG, SLF, IMB, AJB / Akta Notaris — diperiksa terhadap register kementerian ATR/BPN.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Building2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Pengembang</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Registrasi PT, portofolio proyek yang telah selesai, reputasi di komunitas agen lokal.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <MapPin size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Lokasi</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Kunjungan langsung ke lokasi, foto dan video dari lahan, cek infrastruktur dalam radius 500m.</p>
              </div>
            </div>
            <div className="mt-6 text-[14px]">
              Selengkapnya di <Link href="/id/tentang" className="text-[var(--color-primary)] no-underline hover:underline">«Tentang Balinsky»</Link>.
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Langkah Berikutnya
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/id/vila" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Katalog vila</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Setiap vila dengan foto, harga, izin, dan perhitungan ROI.</p>
              </Link>
              <Link href="/id/apartemen" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Katalog apartemen</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Unit di kompleks terkelola — ambang masuk terendah.</p>
              </Link>
              <Link href="/id/kompleks" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Kompleks hunian</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Kompleks inden dan siap huni dengan pengelolaan, render, dan tanggal serah terima.</p>
              </Link>
              <Link href="/id/cara-beli" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Cara membeli — langkah demi langkah</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Tujuh langkah transaksi, struktur kepemilikan, biaya nyata, dan jebakannya.</p>
              </Link>
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
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </PageContainer>
      <Footer lang="id" />
    </>
  )
}
