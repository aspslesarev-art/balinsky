// Trust hub for the foreign-investor flow. Live numbers from raw_*
// tables, an honest description of the operator, the platform's
// editorial standards, and an invitation for buyers to send their
// purchase story for the future case-studies section.

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { loadAllManagers } from '@/lib/managers'
import { botLink } from '@/lib/bot-link'
import {
  Building2, Home, BedDouble, HardHat, UsersRound,
  ShieldCheck, FileSearch, Video, BookOpen, Send,
} from 'lucide-react'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const COPY = {
  ru: {
    home: 'Главная',
    crumb: 'О Balinsky',
    h1: 'Balinsky — что это и почему ему можно доверять',
    intro: 'Balinsky — каталог недвижимости Бали для иностранцев: виллы, апартаменты, жилые комплексы и аренда. На сайте собраны проекты от застройщиков, у которых мы лично проверили документы, посмотрели объекты на земле и сняли видео. Цены — в актуальных USD. Менеджеры по сделкам — реальные люди с фото, рейтингом и языками, на которых они говорят.',

    h2Numbers: 'Цифры на сегодня',
    numbersLead: 'Эти числа обновляются автоматически — на сайте показано столько объектов, сколько реально опубликовано в базе.',
    statVillas: 'вилл и домов',
    statApts: 'апартаментов',
    statComplexes: 'жилых комплексов',
    statDevs: 'застройщиков',
    statMgrs: 'менеджеров на связи',

    h2How: 'Как мы выбираем что публиковать',
    standards: [
      { Icon: FileSearch, title: 'Проверка документов', body: 'У каждого объекта в базе должен быть валидный PBG, понятная структура земли (SHM/HGB/Hak Pakai) и реальный застройщик с PT-регистрацией. Без этого набора объект просто не попадает на сайт.' },
      { Icon: Video,      title: 'Видео и фото с земли', body: 'На большую часть проектов наша команда снимала своё видео — дрон, ход стройки, окрестности. Не пресс-релиз застройщика, а реальное состояние на дату съёмки.' },
      { Icon: UsersRound, title: 'Менеджер с лицом', body: 'У каждого застройщика на сайте есть назначенный менеджер с фото, языками, прямым Telegram и WhatsApp. Не «обезличенный sales department», а конкретный человек, с которым можно созвониться.' },
      { Icon: BookOpen,   title: 'Редакторский шорт-лист', body: 'Мы не публикуем «всё подряд». Объекты, проекты и застройщики, которые не прошли наш внутренний QA по перечисленным выше пунктам, в каталог не попадают.' },
    ],

    h2Stack: 'Что вы получаете',
    stackItems: [
      { title: 'Каталог в актуальных USD', body: 'Цены пересчитываются на текущий курс, валюту переключаете в шапке. Сравнение объектов учитывает курс автоматически.' },
      { title: 'Прозрачная воронка', body: 'От первого нажатия «зарезервировать» до сдачи — каждый шаг и сумма зафиксированы на странице «Бронирование» и «Как купить».' },
      { title: 'Менеджер на связи', body: 'Ответ в Telegram / WhatsApp обычно в течение часа в рабочее время Бали. По крупным сделкам — видеозвонок до перевода депозита.' },
      { title: 'Сравнение и шортлист', body: 'Любой объект сохраняется в избранное, виллы и апартаменты сравниваются по 14 ключевым параметрам инвестора в одной таблице.' },
    ],

    h2Cases: 'Кейсы покупателей',
    pCases: 'Мы собираем истории закрытых сделок наших клиентов — что искали, как искали, на чём согласовывали SPA, что вышло в итоге, какая реальная доходность на сегодня. Каждый кейс — анонимизированный, без имён и адресов, но с реальными цифрами. Раздел будет наполняться по мере того как клиенты соглашаются поделиться. Если вы покупали через Balinsky и хотите рассказать свою историю (анонимно или с именем — на ваш выбор), напишите боту — это обычно занимает 20 минут разговора.',
    casesCta: 'Поделиться историей покупки',

    h2Contact: 'Связаться',
    pContact: 'По любому вопросу — каталог, конкретный объект, due diligence, видеосъёмка для вашей виллы — пишите боту в Telegram. Если Telegram неудобен — почта в подвале сайта.',
    contactBot: 'Написать боту',
    contactGuide: 'Сначала прочитать «Как купить»',
  },
  en: {
    home: 'Home',
    crumb: 'About Balinsky',
    h1: 'Balinsky — what it is and why you can trust it',
    intro: 'Balinsky is a Bali property catalogue for foreign buyers: villas, apartments, residential complexes and rentals. The site lists projects from developers whose documents we personally verified, whose sites we walked, and whose objects we filmed. Prices are shown in current USD. Sales managers are real people with photos, ratings, and the languages they speak.',

    h2Numbers: 'The numbers today',
    numbersLead: 'These figures update automatically — what you see on the site is exactly what is published in the database right now.',
    statVillas: 'villas and houses',
    statApts: 'apartments',
    statComplexes: 'residential complexes',
    statDevs: 'developers',
    statMgrs: 'managers on call',

    h2How: 'How we decide what to publish',
    standards: [
      { Icon: FileSearch, title: 'Document check', body: 'Every property in the catalogue must have a valid PBG, a clear land structure (SHM / HGB / Hak Pakai), and a real developer with a PT registration. Without that set, the property simply doesn’t make it onto the site.' },
      { Icon: Video,      title: 'Video and photos from the site', body: 'For most projects, our crew has shot original footage — drone, construction progress, the surroundings. Not a press release from the developer, but the real state on a known date.' },
      { Icon: UsersRound, title: 'A manager with a face', body: 'Every developer on the site has a named manager with photo, spoken languages, direct Telegram and WhatsApp. Not an anonymous "sales department" — an actual person you can video-call.' },
      { Icon: BookOpen,   title: 'Editorial shortlist', body: 'We don’t publish everything. Properties, projects and developers that don’t pass the QA above never make it into the catalogue.' },
    ],

    h2Stack: 'What you get',
    stackItems: [
      { title: 'Live USD pricing', body: 'Prices recompute against the current rate; the currency switcher is in the header. The comparison view recalculates automatically as you switch.' },
      { title: 'Transparent funnel', body: 'From the first "reserve" tap to handover — every step and amount is documented on the Reservation and Buying-Guide pages.' },
      { title: 'Live manager', body: 'Telegram / WhatsApp reply usually within an hour during Bali working hours. For larger deals — a video call before any deposit moves.' },
      { title: 'Compare and shortlist', body: 'Any listing saves to your shortlist; villas and apartments compare on 14 investor-grade parameters in one table.' },
    ],

    h2Cases: 'Buyer case studies',
    pCases: 'We are collecting closed-deal stories from our clients — what they were looking for, how they searched, where the SPA negotiation landed, what came of it, and the actual yield today. Every case is anonymised — no names or addresses, but with real numbers. This section will grow as clients agree to share. If you bought through Balinsky and want to share your story (anonymous or with name — your call), message the bot — it usually takes a 20-minute call.',
    casesCta: 'Share my purchase story',

    h2Contact: 'Get in touch',
    pContact: 'For anything — the catalogue, a specific property, due diligence, video shoots for your own villa — message the bot on Telegram. If Telegram is inconvenient, the email is in the site footer.',
    contactBot: 'Message the bot',
    contactGuide: 'Read the buying guide first',
  },
  id: {
    home: 'Beranda',
    crumb: 'Tentang Balinsky',
    h1: 'Balinsky — apa itu dan mengapa Anda bisa mempercayainya',
    intro: 'Balinsky adalah katalog properti Bali untuk pembeli asing: vila, apartemen, kompleks hunian, dan sewa. Situs ini menampilkan proyek dari pengembang yang dokumennya kami periksa sendiri, lokasinya kami datangi, dan objeknya kami rekam. Harga ditampilkan dalam USD terkini. Manajer penjualan adalah orang sungguhan dengan foto, peringkat, dan bahasa yang mereka gunakan.',

    h2Numbers: 'Angka hari ini',
    numbersLead: 'Angka-angka ini diperbarui otomatis — yang Anda lihat di situs persis dengan yang dipublikasikan di basis data saat ini.',
    statVillas: 'vila dan rumah',
    statApts: 'apartemen',
    statComplexes: 'kompleks hunian',
    statDevs: 'pengembang',
    statMgrs: 'manajer siap dihubungi',

    h2How: 'Bagaimana kami memutuskan apa yang dipublikasikan',
    standards: [
      { Icon: FileSearch, title: 'Pemeriksaan dokumen', body: 'Setiap properti dalam katalog harus memiliki PBG yang sah, struktur tanah yang jelas (SHM / HGB / Hak Pakai), dan pengembang nyata dengan registrasi PT. Tanpa rangkaian itu, properti tidak akan masuk ke situs.' },
      { Icon: Video,      title: 'Video dan foto dari lokasi', body: 'Untuk sebagian besar proyek, tim kami merekam rekaman asli — drone, kemajuan konstruksi, lingkungan sekitar. Bukan siaran pers dari pengembang, melainkan kondisi nyata pada tanggal yang diketahui.' },
      { Icon: UsersRound, title: 'Manajer dengan wajah', body: 'Setiap pengembang di situs memiliki manajer yang ditunjuk dengan foto, bahasa yang dikuasai, Telegram dan WhatsApp langsung. Bukan "departemen penjualan" anonim — melainkan orang nyata yang bisa Anda ajak panggilan video.' },
      { Icon: BookOpen,   title: 'Daftar pendek editorial', body: 'Kami tidak mempublikasikan semuanya. Properti, proyek, dan pengembang yang tidak lolos QA di atas tidak akan pernah masuk ke katalog.' },
    ],

    h2Stack: 'Apa yang Anda dapatkan',
    stackItems: [
      { title: 'Harga USD terkini', body: 'Harga dihitung ulang terhadap kurs saat ini; pengalih mata uang ada di header. Tampilan perbandingan menghitung ulang otomatis saat Anda beralih.' },
      { title: 'Corong yang transparan', body: 'Dari ketukan "reservasi" pertama hingga serah terima — setiap langkah dan jumlah didokumentasikan di halaman Reservasi dan Panduan Membeli.' },
      { title: 'Manajer siap dihubungi', body: 'Balasan Telegram / WhatsApp biasanya dalam satu jam selama jam kerja Bali. Untuk transaksi besar — panggilan video sebelum deposit dipindahkan.' },
      { title: 'Bandingkan dan daftar pendek', body: 'Setiap listing tersimpan ke daftar pendek Anda; vila dan apartemen dibandingkan berdasarkan 14 parameter kelas investor dalam satu tabel.' },
    ],

    h2Cases: 'Studi kasus pembeli',
    pCases: 'Kami mengumpulkan kisah transaksi yang telah selesai dari klien kami — apa yang mereka cari, bagaimana mereka mencari, di mana negosiasi SPA berakhir, apa hasilnya, dan imbal hasil aktual hari ini. Setiap kasus dianonimkan — tanpa nama atau alamat, tetapi dengan angka nyata. Bagian ini akan bertambah seiring klien setuju untuk berbagi. Jika Anda membeli melalui Balinsky dan ingin berbagi kisah Anda (anonim atau dengan nama — terserah Anda), kirim pesan ke bot — biasanya butuh panggilan 20 menit.',
    casesCta: 'Bagikan kisah pembelian saya',

    h2Contact: 'Hubungi kami',
    pContact: 'Untuk apa pun — katalog, properti tertentu, uji tuntas, pengambilan video untuk vila Anda sendiri — kirim pesan ke bot di Telegram. Jika Telegram tidak nyaman, email ada di footer situs.',
    contactBot: 'Kirim pesan ke bot',
    contactGuide: 'Baca panduan membeli dulu',
  },
  fr: {
    home: 'Accueil',
    crumb: 'À propos de Balinsky',
    h1: 'Balinsky — ce que c’est et pourquoi vous pouvez lui faire confiance',
    intro: 'Balinsky est un catalogue immobilier de Bali pour les acheteurs étrangers : villas, appartements, résidences et locations. Le site répertorie des projets de promoteurs dont nous avons personnellement vérifié les documents, dont nous avons visité les sites et filmé les biens. Les prix sont affichés en USD actuels. Les commerciaux sont de vraies personnes, avec photo, note et langues parlées.',

    h2Numbers: 'Les chiffres aujourd’hui',
    numbersLead: 'Ces chiffres se mettent à jour automatiquement — ce que vous voyez sur le site correspond exactement à ce qui est publié dans la base de données en ce moment.',
    statVillas: 'villas et maisons',
    statApts: 'appartements',
    statComplexes: 'résidences',
    statDevs: 'promoteurs',
    statMgrs: 'gestionnaires disponibles',

    h2How: 'Comment nous décidons ce que nous publions',
    standards: [
      { Icon: FileSearch, title: 'Vérification des documents', body: 'Chaque bien du catalogue doit disposer d’un PBG valide, d’une structure foncière claire (SHM / HGB / Hak Pakai) et d’un vrai promoteur enregistré en PT. Sans cet ensemble, le bien n’apparaît tout simplement pas sur le site.' },
      { Icon: Video,      title: 'Vidéo et photos sur place', body: 'Pour la plupart des projets, notre équipe a tourné ses propres images — drone, avancement du chantier, environs. Pas un communiqué du promoteur, mais l’état réel à une date connue.' },
      { Icon: UsersRound, title: 'Un gestionnaire avec un visage', body: 'Chaque promoteur sur le site a un gestionnaire attitré avec photo, langues parlées, Telegram et WhatsApp directs. Pas un « service commercial » anonyme — une personne réelle que vous pouvez appeler en visio.' },
      { Icon: BookOpen,   title: 'Sélection éditoriale', body: 'Nous ne publions pas tout. Les biens, projets et promoteurs qui ne passent pas le contrôle qualité ci-dessus n’entrent jamais dans le catalogue.' },
    ],

    h2Stack: 'Ce que vous obtenez',
    stackItems: [
      { title: 'Prix en USD en temps réel', body: 'Les prix sont recalculés selon le taux actuel ; le sélecteur de devise est dans l’en-tête. La vue comparative se recalcule automatiquement lorsque vous changez.' },
      { title: 'Un parcours transparent', body: 'Du premier clic sur « réserver » jusqu’à la livraison — chaque étape et chaque montant sont documentés sur les pages Réservation et Guide d’achat.' },
      { title: 'Gestionnaire disponible', body: 'Réponse sur Telegram / WhatsApp généralement en moins d’une heure pendant les heures de bureau de Bali. Pour les transactions importantes — un appel visio avant tout versement d’acompte.' },
      { title: 'Comparer et présélectionner', body: 'Chaque annonce s’enregistre dans votre sélection ; villas et appartements se comparent sur 14 paramètres de niveau investisseur dans un seul tableau.' },
    ],

    h2Cases: 'Études de cas d’acheteurs',
    pCases: 'Nous rassemblons les histoires de transactions conclues de nos clients — ce qu’ils cherchaient, comment ils ont cherché, où la négociation du SPA a abouti, ce qui en est ressorti et le rendement réel aujourd’hui. Chaque cas est anonymisé — sans noms ni adresses, mais avec de vrais chiffres. Cette section s’étoffera à mesure que les clients acceptent de partager. Si vous avez acheté via Balinsky et souhaitez partager votre histoire (anonymement ou avec votre nom — à votre choix), écrivez au bot — cela prend en général un appel de 20 minutes.',
    casesCta: 'Partager mon histoire d’achat',

    h2Contact: 'Nous contacter',
    pContact: 'Pour tout — le catalogue, un bien précis, la due diligence, un tournage vidéo pour votre propre villa — écrivez au bot sur Telegram. Si Telegram ne vous convient pas, l’e-mail est dans le pied de page du site.',
    contactBot: 'Écrire au bot',
    contactGuide: 'Lire d’abord le guide d’achat',
  },
} as const

async function loadCounts() {
  const [v, a, c, d, mgrs] = await Promise.all([
    // Filter on the same `Опубликовать` / `Публикация` flags HomePage uses
    // so the counts on / and /о-balinsky never diverge — auditors flagged
    // 828 (home) vs 1272 (about) when this page counted drafts too.
    sb.from('raw_villas').select('airtable_id', { count: 'exact', head: true }).eq('data->>Опубликовать', 'true' as unknown as string),
    sb.from('raw_apartments').select('airtable_id', { count: 'exact', head: true }).eq('data->>Опубликовать', 'true' as unknown as string),
    sb.from('raw_complexes').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_developers').select('airtable_id', { count: 'exact', head: true }).eq('data->>Публикация', 'true' as unknown as string),
    loadAllManagers(),
  ])
  return {
    villas: v.count ?? 0,
    apartments: a.count ?? 0,
    complexes: c.count ?? 0,
    developers: d.count ?? 0,
    managers: mgrs.length,
  }
}

export async function AboutView({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const counts = await loadCounts()
  const home = switchLangPath('/ru', lang)

  const stats: { Icon: typeof Home; n: number; label: string; href: string }[] = [
    { Icon: Home,       n: counts.villas,     label: c.statVillas,    href: switchLangPath('/ru/villy', lang) },
    { Icon: BedDouble,  n: counts.apartments, label: c.statApts,      href: switchLangPath('/ru/apartamenty', lang) },
    { Icon: Building2,  n: counts.complexes,  label: c.statComplexes, href: switchLangPath('/ru/zhilye-kompleksy', lang) },
    { Icon: HardHat,    n: counts.developers, label: c.statDevs,      href: switchLangPath('/ru/zastrojshhiki', lang) },
    { Icon: UsersRound, n: counts.managers,   label: c.statMgrs,      href: switchLangPath('/ru/zastrojshhiki', lang) },
  ]

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.crumb },
        ]} />

        <article className="mt-4 max-w-[760px]">
          <h1 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-5">
            {c.h1}
          </h1>
          <p className="text-[16px] md:text-[17px] leading-[1.7] text-[var(--color-text)] mb-12">
            {c.intro}
          </p>
        </article>

        {/* Live numbers — pulled from raw_* tables on every render. */}
        <section className="mb-14">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2Numbers}</h2>
          <p className="text-[14px] text-[var(--color-text-muted)] mb-6 max-w-2xl">{c.numbersLead}</p>
          <ul className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stats.map(s => (
              <li key={s.label}>
                <Link href={s.href} className="block rounded-2xl border border-[var(--color-border)] bg-white p-5 hover:border-[var(--color-primary)] transition-colors no-underline">
                  <s.Icon size={20} strokeWidth={1.6} className="text-[var(--color-primary)] mb-2" />
                  <div className="text-[28px] md:text-[32px] font-semibold tabular-nums text-[#111827] leading-none mb-1">{s.n}</div>
                  <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)]">{s.label}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <article className="max-w-[760px]">
          {/* Editorial standards */}
          <section className="mb-14">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">{c.h2How}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {c.standards.map(s => (
                <div key={s.title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                  <s.Icon size={18} strokeWidth={1.8} className="text-[var(--color-primary)] mb-2" />
                  <h3 className="text-[16px] font-semibold mb-1.5">{s.title}</h3>
                  <p className="text-[14px] leading-[1.6] text-[var(--color-text-muted)]">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* What you get */}
          <section className="mb-14">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">{c.h2Stack}</h2>
            <ul className="space-y-3">
              {c.stackItems.map(s => (
                <li key={s.title} className="flex gap-3">
                  <ShieldCheck size={18} strokeWidth={1.8} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[15px] font-semibold text-[#111827]">{s.title}</div>
                    <p className="text-[14px] leading-[1.6] text-[var(--color-text-muted)] mt-0.5">{s.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Case studies — empty by design today, pitched for buyers */}
          <section className="mb-14 rounded-2xl bg-[var(--color-search-bg)] p-6">
            <h2 className="text-[22px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2Cases}</h2>
            <p className="text-[15px] leading-[1.7] text-[var(--color-text)] mb-4">{c.pCases}</p>
            <a
              href={botLink('manager', '')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[13px] font-medium no-underline"
            >
              <Send size={14} /> {c.casesCta}
            </a>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2Contact}</h2>
            <p className="text-[15px] leading-[1.7] text-[var(--color-text)] mb-4">{c.pContact}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={botLink('manager', '')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[13px] font-medium no-underline"
              >
                <Send size={14} /> {c.contactBot}
              </a>
              <Link
                href={switchLangPath('/ru/kak-kupit', lang)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] bg-white"
              >
                {c.contactGuide}
              </Link>
            </div>
          </section>
        </article>

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
