// Информационный гид «как самому организовать поездку на осмотр
// недвижимости на Бали». Раньше здесь был консьерж-лендинг «мы вас
// встретим, повозим и проведём переговоры» — услуга, оказываемая на
// территории Индонезии, с оплатой из комиссии застройщика. Balinsky
// поездок не организует и стороной переговоров не выступает, поэтому
// страница переписана в инструкцию для самостоятельного покупателя.

import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import {
  Plane, Clock, Building2, Users, Scale, MapPin,
  Sparkles, ArrowRight, Info,
} from 'lucide-react'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    home: 'Главная',
    crumb: 'Поездка на осмотр',
    h1: 'Инвест-тур на Бали: как самому организовать поездку на осмотр недвижимости',
    intro: 'Почти все, кто покупает виллу или апартаменты на Бали, сначала прилетают посмотреть объекты вживую. Эта страница — инструкция, как спланировать такую поездку самостоятельно: сколько закладывать дней, что проверять на площадке, о чём говорить с застройщиком и где искать независимого юриста.',
    disclaimer: 'Balinsky — информационная площадка. Мы не организуем поездки, не проводим осмотры и не участвуем в ваших переговорах с застройщиком. Всё, что описано ниже, вы делаете сами или через застройщика, у которого смотрите объект.',
    ctaCatalog: 'Собрать шорт-лист в каталоге',
    ctaGuide: 'Гид «Как купить на Бали»',

    h2Why: 'Зачем лететь смотреть вживую',
    why: [
      { Icon: Sparkles, title: 'Качество стройки видно только на земле',
        body: 'Дрон-видео и PDF-презентации показывают идеализированную картинку. Первые пятнадцать минут на площадке закрывают большую часть вопросов, которые не читаются по фотографиям: качество отделки и материалов, шум вокруг, реальный путь до пляжа, куда выходят окна, как близко соседние стройки, что с водоотведением.' },
      { Icon: Users, title: 'На месте с вами говорят иначе',
        body: 'Когда вы приехали, до вас чаще доходит не скриптованный sales-менеджер, а руководитель проекта. Это шанс спросить про задержки прошлых очередей, фактическую загрузку сданных объектов, условия при срыве сроков и возврат депозита — того, чего не бывает в презентации.' },
      { Icon: Scale, title: 'Документы проверяются на месте',
        body: 'Статус земли, PBG, SLF и структуру владения читает независимый юрист по самим документам, а не по рассказу продавца. Встреча с юристом на Бали занимает час-полтора и стоит несопоставимо меньше, чем ошибка в структуре сделки.' },
    ],

    h2Plan: 'Как спланировать поездку',
    plan: [
      { Icon: Plane, title: 'Виза и въезд',
        body: 'Гражданам США, Канады, Великобритании, стран Шенгена, Австралии и Новой Зеландии достаточно туристической VOA на 30 дней: оформляется по прилёту в Нгурах-Рай примерно за $35 или заранее через официальный портал e-VOA. Приглашение принимающей стороны не требуется, продление ещё на 30 дней делается в иммиграционном офисе на Бали.' },
      { Icon: Clock, title: 'Сколько закладывать дней',
        body: 'На два-три объекта в одном районе хватает двух дней. Полный круг — осмотры, встречи с застройщиками, час с юристом и знакомство с двумя районами — это три-четыре дня. Больше четырёх-пяти осмотров в день не планируйте: между Чангу и Букитом легко уходит полтора часа в одну сторону.' },
      { Icon: Building2, title: 'Что смотреть на площадке',
        body: 'Просите показать не только sample unit, но и строящиеся юниты с техническими зонами: разводку воды, септик, парковку, генератор. Снимайте с привязкой к дате. Сверяйте увиденное с мастер-планом и с тем, что написано в каталоге и в документах.' },
      { Icon: Users, title: 'Встречи с застройщиком',
        body: 'Договаривайтесь заранее — напрямую через контакты застройщика на странице объекта. Полезно прислать список вопросов до встречи: сроки сдачи, этапы платежей, что происходит при задержке, кто управляет объектом после сдачи. Итог встречи попросите продублировать письмом.' },
      { Icon: Scale, title: 'Независимый юрист',
        body: 'Юриста ищите отдельно от продавца: рекомендацию можно взять в консульстве вашей страны, у нотариуса PPAT или в профильных сообществах экспатов. За 60–90 минут разбирают лизхолд против PT PMA, налоги в стране вашего резидентства, визовый путь и рискованные пункты SPA.' },
      { Icon: MapPin, title: 'Районы',
        body: 'Полдня на два-три района дают больше, чем ещё три осмотра. Чангу (Берава, Переренан, Бату-Болонг), Букит (Улувату, Бингин, Пандава), Убуд и Санур живут по-разному: другой арендатор, другая сезонность, другая ликвидность при перепродаже.' },
    ],

    h2Faq: 'Частые вопросы',
    faq: [
      { q: 'Когда лучше ехать по сезону?',
        a: 'Апрель–июнь и сентябрь–ноябрь: меньше пробок, мягкая погода, легче договориться о встречах. Декабрь–март — высокий сезон, можно своими глазами увидеть реальную загрузку сданных вилл, но пробки плотнее, а отели дороже в полтора-два раза. Июль–август — европейские каникулы, ситуация та же.' },
      { q: 'За сколько планировать поездку?',
        a: 'Двух-четырёх недель обычно достаточно, чтобы согласовать встречи. Если нужен слот у нотариуса PPAT и у англоговорящего юриста, закладывайте четыре-шесть недель: у них плотное расписание. На пиковые недели декабря–марта лучше за шесть-восемь недель.' },
      { q: 'Можно ли подписать документы прямо в поездке?',
        a: 'Reservation form иногда подписывают прямо на встрече с застройщиком, а депозит уходит на эскроу-счёт нотариуса. Сама SPA подписывается у нотариуса PPAT обычно через две-четыре недели, после due diligence. Возвращаться ради этого на Бали не обязательно — многие оформляют доверенность.' },
      { q: 'А если ни один объект не подойдёт?',
        a: 'Это нормальный исход. Понять за несколько дней, что конкретные проекты или сам остров не ваш сценарий, дешевле, чем закрыть сделку вслепую. Данные из каталога и заметки с осмотров остаются у вас и пригодятся при следующем заходе.' },
      { q: 'Какой бюджет имеет смысл?',
        a: 'Ориентировочно от $200k для апартаментов в Сануре или off-plan в Убуде и от $300k для виллы на Буките или в Чангу. Ниже этого выбор заметно сужается. Актуальный разброс цен смотрите в каталоге — он пересчитывается по текущему курсу.' },
      { q: 'Balinsky может организовать поездку?',
        a: 'Нет. Balinsky — информационная площадка: каталог, данные по доходности и документам, прямые контакты застройщиков. Транспорт, встречи, юриста и расписание вы организуете сами или через застройщика, у которого смотрите объект.' },
    ],
  },
  en: {
    home: 'Home',
    crumb: 'Viewing trip',
    h1: 'A Bali property viewing trip: how to plan one yourself',
    intro: 'Almost everyone who buys a villa or an apartment in Bali flies over to see the properties first. This page is a guide to planning that trip on your own: how many days to allow, what to check on site, what to ask the developer, and where to find an independent lawyer.',
    disclaimer: 'Balinsky is an information platform. We do not organise trips, do not run viewings and take no part in your negotiations with a developer. Everything described below you arrange yourself, or through the developer whose project you are visiting.',
    ctaCatalog: 'Build a shortlist in the catalogue',
    ctaGuide: 'The “How to buy in Bali” guide',

    h2Why: 'Why it is worth flying over',
    why: [
      { Icon: Sparkles, title: 'Build quality only shows up on site',
        body: 'Drone footage and PDF decks show an idealised picture. The first fifteen minutes on site answer most of the questions photographs never do: the real finish and materials, the noise around it, the actual walk to the beach, which way the windows face, how close the neighbouring construction is, and what happens to drainage.' },
      { Icon: Users, title: 'People talk to you differently once you are there',
        body: 'When you have flown in, you are more likely to end up across the table from the project lead rather than a scripted sales manager. That is your chance to ask about delays on earlier phases, the real occupancy of completed units, what happens if the handover slips, and how deposits are returned — none of which appears in a deck.' },
      { Icon: Scale, title: 'Documents get checked where they live',
        body: 'Land status, PBG, SLF and the ownership structure are read by an independent lawyer from the documents themselves, not from the seller’s account of them. A lawyer meeting in Bali takes an hour or two and costs a tiny fraction of a mistake in the deal structure.' },
    ],

    h2Plan: 'How to plan the trip',
    plan: [
      { Icon: Plane, title: 'Visa and entry',
        body: 'Citizens of the US, Canada, the UK, the Schengen area, Australia and New Zealand can use the 30-day tourist VOA: issued on arrival at Ngurah Rai for around $35, or in advance through the official e-VOA portal. No invitation from a host is required, and a 30-day extension is handled at an immigration office in Bali.' },
      { Icon: Clock, title: 'How many days to allow',
        body: 'Two or three properties in one area fit into two days. The full round — viewings, developer meetings, an hour with a lawyer and a look at two areas — takes three to four days. Do not plan more than four or five viewings a day: the drive between Canggu and the Bukit easily runs to ninety minutes each way.' },
      { Icon: Building2, title: 'What to look at on site',
        body: 'Ask to see more than the sample unit: units under construction and the technical areas too — water runs, septic, parking, the generator. Photograph everything with a date. Check what you see against the master plan, the catalogue listing and the documents.' },
      { Icon: Users, title: 'Meetings with the developer',
        body: 'Arrange them in advance, straight through the developer’s own contacts on the listing page. Sending your questions ahead helps: handover dates, payment milestones, what happens on a delay, who manages the property after completion. Ask for the outcome of the meeting in writing.' },
      { Icon: Scale, title: 'An independent lawyer',
        body: 'Find the lawyer separately from the seller: your consulate, a PPAT notary or established expat communities can all point you somewhere. Sixty to ninety minutes covers leasehold versus PT PMA, tax in your country of residence, the visa route and the clauses in an SPA that carry risk.' },
      { Icon: MapPin, title: 'The areas',
        body: 'Half a day across two or three areas tells you more than three more viewings. Canggu (Berawa, Pererenan, Batu Bolong), the Bukit (Uluwatu, Bingin, Pandawa), Ubud and Sanur each work differently: a different tenant, a different season, a different resale liquidity.' },
    ],

    h2Faq: 'Common questions',
    faq: [
      { q: 'What is the best season to come?',
        a: 'April–June and September–November: lighter traffic, gentler weather, easier to lock in meetings. December–March is high season — you can see the real occupancy of completed villas with your own eyes, but traffic is heavier and hotels cost one and a half to two times more. July–August is the European school holiday, with the same effect.' },
      { q: 'How far ahead should I plan?',
        a: 'Two to four weeks is usually enough to line up meetings. If you need a slot with a PPAT notary and an English-speaking lawyer, allow four to six weeks — their calendars are tight. For the December–March peak, six to eight weeks is safer.' },
      { q: 'Can documents be signed during the trip?',
        a: 'A reservation form is sometimes signed at the developer meeting itself, with the deposit going to a notary escrow account. The SPA is normally signed before a PPAT notary two to four weeks later, after due diligence. You do not have to fly back for it — many buyers use a power of attorney.' },
      { q: 'What if nothing on the trip fits?',
        a: 'That is a normal outcome. Spending a few days to learn that these projects, or the island itself, are not your scenario is cheaper than closing a deal blind. The catalogue data and your own site notes stay with you for the next attempt.' },
      { q: 'What budget makes sense?',
        a: 'Roughly from $200k for an apartment in Sanur or an off-plan unit in Ubud, and from $300k for a villa on the Bukit or in Canggu. Below that the choice narrows sharply. The current spread is in the catalogue, recalculated at today’s rate.' },
      { q: 'Can Balinsky organise the trip?',
        a: 'No. Balinsky is an information platform: the catalogue, yield and document data, and the developers’ direct contacts. Transport, meetings, the lawyer and the schedule you arrange yourself, or through the developer whose project you are visiting.' },
    ],
  },
  id: {
    home: 'Beranda',
    crumb: 'Perjalanan peninjauan',
    h1: 'Tur properti Bali: cara merencanakan perjalanan peninjauan sendiri',
    intro: 'Hampir semua orang yang membeli vila atau apartemen di Bali datang lebih dulu untuk melihat objeknya langsung. Halaman ini adalah panduan merencanakan perjalanan itu sendiri: berapa hari yang perlu disiapkan, apa yang diperiksa di lokasi, apa yang ditanyakan kepada pengembang, dan di mana mencari pengacara independen.',
    disclaimer: 'Balinsky adalah platform informasi. Kami tidak mengorganisasi perjalanan, tidak memandu peninjauan, dan tidak ikut serta dalam negosiasi Anda dengan pengembang. Semua yang dijelaskan di bawah Anda atur sendiri, atau melalui pengembang yang proyeknya Anda kunjungi.',
    ctaCatalog: 'Susun daftar pendek di katalog',
    ctaGuide: 'Panduan «Cara membeli di Bali»',

    h2Why: 'Mengapa perlu datang langsung',
    why: [
      { Icon: Sparkles, title: 'Kualitas bangunan hanya terlihat di lokasi',
        body: 'Video drone dan presentasi PDF menampilkan gambaran yang diidealkan. Lima belas menit pertama di lokasi menjawab sebagian besar pertanyaan yang tidak terbaca dari foto: kualitas finishing dan material, kebisingan sekitar, jarak nyata ke pantai, arah hadap jendela, seberapa dekat konstruksi tetangga, dan bagaimana drainasenya.' },
      { Icon: Users, title: 'Orang berbicara berbeda ketika Anda sudah datang',
        body: 'Setelah Anda terbang ke sana, yang menemui Anda lebih sering adalah pemimpin proyek, bukan manajer penjualan dengan naskah. Itu kesempatan bertanya soal keterlambatan tahap sebelumnya, okupansi nyata unit yang sudah selesai, apa yang terjadi bila serah terima mundur, dan bagaimana deposit dikembalikan — hal yang tidak ada di presentasi.' },
      { Icon: Scale, title: 'Dokumen diperiksa di tempatnya',
        body: 'Status tanah, PBG, SLF, dan struktur kepemilikan dibaca oleh pengacara independen dari dokumen aslinya, bukan dari cerita penjual. Pertemuan dengan pengacara di Bali memakan satu sampai dua jam dan biayanya jauh lebih kecil daripada kesalahan dalam struktur transaksi.' },
    ],

    h2Plan: 'Cara merencanakan perjalanan',
    plan: [
      { Icon: Plane, title: 'Visa dan kedatangan',
        body: 'Warga AS, Kanada, Inggris, kawasan Schengen, Australia, dan Selandia Baru cukup memakai VOA turis 30 hari: diterbitkan saat tiba di Ngurah Rai sekitar $35, atau sebelumnya lewat portal e-VOA resmi. Tidak perlu undangan dari pihak penerima, dan perpanjangan 30 hari diurus di kantor imigrasi di Bali.' },
      { Icon: Clock, title: 'Berapa hari yang perlu disiapkan',
        body: 'Dua atau tiga objek dalam satu kawasan cukup dua hari. Putaran penuh — peninjauan, pertemuan dengan pengembang, satu jam dengan pengacara, dan mengenal dua kawasan — memakan tiga sampai empat hari. Jangan merencanakan lebih dari empat atau lima peninjauan per hari: perjalanan antara Canggu dan Bukit mudah memakan sembilan puluh menit satu arah.' },
      { Icon: Building2, title: 'Apa yang dilihat di lokasi',
        body: 'Mintalah lebih dari sekadar sample unit: unit yang sedang dibangun dan area teknis juga — jalur air, septik, parkir, genset. Foto semuanya dengan penanda tanggal. Cocokkan yang Anda lihat dengan master plan, dengan listing di katalog, dan dengan dokumennya.' },
      { Icon: Users, title: 'Pertemuan dengan pengembang',
        body: 'Aturlah sebelumnya, langsung lewat kontak pengembang di halaman objek. Mengirim daftar pertanyaan lebih dulu sangat membantu: tanggal serah terima, tahapan pembayaran, apa yang terjadi bila terlambat, siapa yang mengelola objek setelah selesai. Minta hasil pertemuan dikirim tertulis.' },
      { Icon: Scale, title: 'Pengacara independen',
        body: 'Cari pengacara terpisah dari penjual: konsulat negara Anda, notaris PPAT, atau komunitas ekspatriat mapan bisa memberi rujukan. Enam puluh sampai sembilan puluh menit cukup untuk membahas leasehold versus PT PMA, pajak di negara domisili Anda, jalur visa, dan pasal-pasal SPA yang berisiko.' },
      { Icon: MapPin, title: 'Kawasan',
        body: 'Setengah hari menyusuri dua atau tiga kawasan memberi lebih banyak daripada tiga peninjauan tambahan. Canggu (Berawa, Pererenan, Batu Bolong), Bukit (Uluwatu, Bingin, Pandawa), Ubud, dan Sanur bekerja berbeda: penyewa berbeda, musim berbeda, likuiditas jual kembali berbeda.' },
    ],

    h2Faq: 'Pertanyaan umum',
    faq: [
      { q: 'Musim terbaik untuk datang?',
        a: 'April–Juni dan September–November: lalu lintas lebih lengang, cuaca lebih bersahabat, pertemuan lebih mudah dijadwalkan. Desember–Maret adalah musim ramai — Anda bisa melihat sendiri okupansi nyata vila yang sudah jadi, tetapi macet lebih padat dan hotel satu setengah hingga dua kali lebih mahal. Juli–Agustus adalah liburan sekolah Eropa, dengan efek serupa.' },
      { q: 'Berapa jauh sebelumnya harus direncanakan?',
        a: 'Dua sampai empat minggu biasanya cukup untuk mengatur pertemuan. Bila Anda butuh slot notaris PPAT dan pengacara berbahasa Inggris, sediakan empat sampai enam minggu — jadwal mereka padat. Untuk puncak Desember–Maret, enam sampai delapan minggu lebih aman.' },
      { q: 'Bisakah dokumen ditandatangani saat perjalanan?',
        a: 'Reservation form kadang ditandatangani langsung pada pertemuan dengan pengembang, dan deposit masuk ke rekening escrow notaris. SPA biasanya ditandatangani di hadapan notaris PPAT dua sampai empat minggu kemudian, setelah uji tuntas. Anda tidak harus terbang kembali — banyak pembeli memakai surat kuasa.' },
      { q: 'Bagaimana bila tidak ada objek yang cocok?',
        a: 'Itu hasil yang wajar. Menghabiskan beberapa hari untuk tahu bahwa proyek-proyek ini, atau pulau ini, bukan skenario Anda lebih murah daripada menutup transaksi tanpa melihat. Data katalog dan catatan Anda sendiri tetap berguna untuk percobaan berikutnya.' },
      { q: 'Anggaran berapa yang masuk akal?',
        a: 'Kira-kira mulai $200k untuk apartemen di Sanur atau unit off-plan di Ubud, dan mulai $300k untuk vila di Bukit atau Canggu. Di bawah itu pilihan menyempit tajam. Rentang harga terkini ada di katalog, dihitung ulang dengan kurs hari ini.' },
      { q: 'Bisakah Balinsky mengatur perjalanannya?',
        a: 'Tidak. Balinsky adalah platform informasi: katalog, data imbal hasil dan dokumen, serta kontak langsung pengembang. Transportasi, pertemuan, pengacara, dan jadwal Anda atur sendiri, atau melalui pengembang yang proyeknya Anda kunjungi.' },
    ],
  },
  fr: {
    home: 'Accueil',
    crumb: 'Voyage de visite',
    h1: 'Voyage immobilier à Bali : comment l’organiser vous-même',
    intro: 'Presque tous ceux qui achètent une villa ou un appartement à Bali viennent d’abord voir les biens sur place. Cette page explique comment préparer ce voyage par vous-même : combien de jours prévoir, quoi vérifier sur le chantier, quoi demander au promoteur et où trouver un avocat indépendant.',
    disclaimer: 'Balinsky est une plateforme d’information. Nous n’organisons pas de voyages, ne conduisons pas de visites et ne participons pas à vos négociations avec un promoteur. Tout ce qui est décrit ci-dessous, vous l’organisez vous-même ou via le promoteur dont vous visitez le projet.',
    ctaCatalog: 'Constituer une sélection dans le catalogue',
    ctaGuide: 'Le guide « Comment acheter à Bali »',

    h2Why: 'Pourquoi le déplacement vaut la peine',
    why: [
      { Icon: Sparkles, title: 'La qualité de construction ne se voit que sur place',
        body: 'Les vidéos par drone et les présentations PDF montrent une image idéalisée. Le premier quart d’heure sur le terrain répond à la plupart des questions que les photos laissent ouvertes : la finition et les matériaux réels, le bruit alentour, le vrai trajet jusqu’à la plage, l’orientation des fenêtres, la proximité des chantiers voisins et la gestion des eaux.' },
      { Icon: Users, title: 'On vous parle autrement une fois sur place',
        body: 'Quand vous avez fait le déplacement, vous avez plus de chances d’avoir en face de vous le responsable du projet plutôt qu’un commercial avec un script. C’est l’occasion d’interroger les retards des tranches précédentes, le taux d’occupation réel des livraisons, ce qui se passe en cas de retard et les conditions de remboursement de l’acompte — rien de tout cela n’est dans une plaquette.' },
      { Icon: Scale, title: 'Les documents se vérifient là où ils sont',
        body: 'Le statut du terrain, le PBG, le SLF et la structure de propriété sont lus par un avocat indépendant dans les documents eux-mêmes, pas dans le récit du vendeur. Un rendez-vous d’avocat à Bali prend une à deux heures et coûte une fraction infime d’une erreur de montage.' },
    ],

    h2Plan: 'Comment préparer le voyage',
    plan: [
      { Icon: Plane, title: 'Visa et entrée',
        body: 'Pour les ressortissants des États-Unis, du Canada, du Royaume-Uni, de l’espace Schengen, d’Australie et de Nouvelle-Zélande, le VOA touristique de 30 jours suffit : délivré à l’arrivée à Ngurah Rai pour environ 35 $, ou à l’avance via le portail officiel e-VOA. Aucune invitation n’est requise, et la prolongation de 30 jours se fait dans un bureau d’immigration à Bali.' },
      { Icon: Clock, title: 'Combien de jours prévoir',
        body: 'Deux ou trois biens dans une même zone tiennent en deux jours. Le tour complet — visites, rendez-vous promoteurs, une heure d’avocat et la découverte de deux quartiers — prend trois à quatre jours. Ne prévoyez pas plus de quatre ou cinq visites par jour : entre Canggu et le Bukit, le trajet atteint facilement quatre-vingt-dix minutes.' },
      { Icon: Building2, title: 'Quoi regarder sur le chantier',
        body: 'Demandez à voir autre chose que l’appartement témoin : les lots en construction et les zones techniques aussi — réseaux d’eau, fosse septique, parking, groupe électrogène. Photographiez en datant. Recoupez ce que vous voyez avec le plan-masse, l’annonce du catalogue et les documents.' },
      { Icon: Users, title: 'Rendez-vous avec le promoteur',
        body: 'Prenez-les à l’avance, directement via les contacts du promoteur sur la page du bien. Envoyer vos questions en amont aide : dates de livraison, échéancier, conséquences d’un retard, gestion du bien après la livraison. Demandez un compte rendu écrit.' },
      { Icon: Scale, title: 'Un avocat indépendant',
        body: 'Cherchez l’avocat en dehors du vendeur : votre consulat, un notaire PPAT ou les communautés d’expatriés établies peuvent vous orienter. Soixante à quatre-vingt-dix minutes suffisent pour couvrir leasehold contre PT PMA, la fiscalité dans votre pays de résidence, la voie visa et les clauses risquées du SPA.' },
      { Icon: MapPin, title: 'Les quartiers',
        body: 'Une demi-journée sur deux ou trois quartiers apprend plus que trois visites de plus. Canggu (Berawa, Pererenan, Batu Bolong), le Bukit (Uluwatu, Bingin, Pandawa), Ubud et Sanur fonctionnent différemment : un autre locataire, une autre saison, une autre liquidité à la revente.' },
    ],

    h2Faq: 'Questions fréquentes',
    faq: [
      { q: 'Quelle est la meilleure saison pour venir ?',
        a: 'Avril–juin et septembre–novembre : moins de circulation, climat plus doux, rendez-vous plus faciles à caler. Décembre–mars est la haute saison — vous voyez de vos yeux le taux d’occupation réel des villas livrées, mais les embouteillages sont plus denses et les hôtels une fois et demie à deux fois plus chers. Juillet–août, ce sont les vacances scolaires européennes, avec le même effet.' },
      { q: 'Combien de temps à l’avance s’organiser ?',
        a: 'Deux à quatre semaines suffisent en général pour caler les rendez-vous. S’il vous faut un créneau chez un notaire PPAT et un avocat anglophone, prévoyez quatre à six semaines : leurs agendas sont chargés. Pour le pic de décembre–mars, six à huit semaines sont plus sûres.' },
      { q: 'Peut-on signer des documents pendant le voyage ?',
        a: 'Le reservation form se signe parfois lors du rendez-vous avec le promoteur, l’acompte partant sur un compte séquestre de notaire. Le SPA se signe en général devant un notaire PPAT deux à quatre semaines plus tard, après la due diligence. Inutile de revenir à Bali pour cela — beaucoup d’acheteurs passent par une procuration.' },
      { q: 'Et si aucun bien ne convient ?',
        a: 'C’est une issue normale. Passer quelques jours pour comprendre que ces projets, ou l’île elle-même, ne correspondent pas à votre scénario coûte moins cher qu’un achat à l’aveugle. Les données du catalogue et vos notes de visite vous restent pour la fois suivante.' },
      { q: 'Quel budget a du sens ?',
        a: 'À partir d’environ 200 000 $ pour un appartement à Sanur ou un off-plan à Ubud, et de 300 000 $ pour une villa sur le Bukit ou à Canggu. En dessous, le choix se réduit nettement. La fourchette actuelle est dans le catalogue, recalculée au taux du jour.' },
      { q: 'Balinsky peut-il organiser le voyage ?',
        a: 'Non. Balinsky est une plateforme d’information : le catalogue, les données de rendement et de documents, et les contacts directs des promoteurs. Le transport, les rendez-vous, l’avocat et le planning, vous les organisez vous-même ou via le promoteur dont vous visitez le projet.' },
    ],
  },
  de: {
    home: 'Startseite',
    crumb: 'Besichtigungsreise',
    h1: 'Immobilienreise nach Bali: wie Sie die Besichtigung selbst organisieren',
    intro: 'Fast alle, die auf Bali eine Villa oder ein Apartment kaufen, fliegen zuerst hin und sehen sich die Objekte an. Diese Seite erklärt, wie Sie eine solche Reise selbst planen: wie viele Tage Sie einrechnen, was Sie vor Ort prüfen, was Sie den Bauträger fragen und wo Sie einen unabhängigen Anwalt finden.',
    disclaimer: 'Balinsky ist eine Informationsplattform. Wir organisieren keine Reisen, führen keine Besichtigungen durch und sind an Ihren Verhandlungen mit einem Bauträger nicht beteiligt. Alles Folgende organisieren Sie selbst oder über den Bauträger, dessen Projekt Sie besuchen.',
    ctaCatalog: 'Auswahl im Katalog zusammenstellen',
    ctaGuide: 'Der Leitfaden „Wie man auf Bali kauft“',

    h2Why: 'Warum sich der Flug lohnt',
    why: [
      { Icon: Sparkles, title: 'Bauqualität zeigt sich nur vor Ort',
        body: 'Drohnenvideos und PDF-Präsentationen zeigen ein idealisiertes Bild. Die ersten fünfzehn Minuten auf der Baustelle beantworten die meisten Fragen, die Fotos offenlassen: tatsächlicher Ausbau und Materialien, Lärm ringsum, der echte Weg zum Strand, die Ausrichtung der Fenster, wie nah die Nachbarbaustellen sind und wie die Entwässerung gelöst ist.' },
      { Icon: Users, title: 'Vor Ort spricht man anders mit Ihnen',
        body: 'Wenn Sie angereist sind, sitzt Ihnen häufiger die Projektleitung gegenüber als ein Vertriebsmitarbeiter mit Skript. Das ist die Gelegenheit, nach Verzögerungen früherer Bauabschnitte, der realen Auslastung fertiger Einheiten, den Folgen einer verspäteten Übergabe und der Rückzahlung der Anzahlung zu fragen — nichts davon steht in einer Präsentation.' },
      { Icon: Scale, title: 'Unterlagen werden dort geprüft, wo sie liegen',
        body: 'Landstatus, PBG, SLF und Eigentumsstruktur liest ein unabhängiger Anwalt in den Dokumenten selbst, nicht in der Erzählung des Verkäufers. Ein Anwaltstermin auf Bali dauert ein bis zwei Stunden und kostet einen Bruchteil dessen, was ein Fehler in der Struktur kostet.' },
    ],

    h2Plan: 'So planen Sie die Reise',
    plan: [
      { Icon: Plane, title: 'Visum und Einreise',
        body: 'Für Staatsangehörige der USA, Kanadas, Großbritanniens, des Schengen-Raums, Australiens und Neuseelands genügt das 30-tägige Touristen-VOA: bei Ankunft in Ngurah Rai für etwa 35 $ oder vorab über das offizielle e-VOA-Portal. Eine Einladung ist nicht nötig, die Verlängerung um 30 Tage erledigt ein Immigrationsbüro auf Bali.' },
      { Icon: Clock, title: 'Wie viele Tage einplanen',
        body: 'Zwei oder drei Objekte in einer Gegend passen in zwei Tage. Die volle Runde — Besichtigungen, Bauträgertermine, eine Stunde Anwalt und zwei Gegenden kennenlernen — braucht drei bis vier Tage. Planen Sie nicht mehr als vier oder fünf Besichtigungen am Tag: zwischen Canggu und dem Bukit sind neunzig Minuten pro Strecke schnell erreicht.' },
      { Icon: Building2, title: 'Worauf Sie vor Ort achten',
        body: 'Verlangen Sie mehr als die Musterwohnung: auch Einheiten im Bau und die Technikbereiche — Wasserführung, Klärgrube, Parkplatz, Generator. Fotografieren Sie mit Datum. Gleichen Sie das Gesehene mit dem Masterplan, dem Katalogeintrag und den Unterlagen ab.' },
      { Icon: Users, title: 'Termine mit dem Bauträger',
        body: 'Vereinbaren Sie sie vorab, direkt über die Kontakte des Bauträgers auf der Objektseite. Es hilft, die Fragen vorher zu schicken: Übergabetermine, Zahlungsstufen, Folgen einer Verzögerung, wer das Objekt nach Fertigstellung verwaltet. Bitten Sie um eine schriftliche Zusammenfassung.' },
      { Icon: Scale, title: 'Ein unabhängiger Anwalt',
        body: 'Suchen Sie den Anwalt getrennt vom Verkäufer: Ihr Konsulat, ein PPAT-Notar oder etablierte Expat-Gemeinschaften können Sie weiterleiten. Sechzig bis neunzig Minuten reichen für Leasehold versus PT PMA, Steuern in Ihrem Wohnsitzland, den Visumsweg und die riskanten Klauseln im SPA.' },
      { Icon: MapPin, title: 'Die Gegenden',
        body: 'Ein halber Tag über zwei oder drei Gegenden bringt mehr als drei weitere Besichtigungen. Canggu (Berawa, Pererenan, Batu Bolong), der Bukit (Uluwatu, Bingin, Pandawa), Ubud und Sanur funktionieren unterschiedlich: anderer Mieter, andere Saison, andere Liquidität beim Wiederverkauf.' },
    ],

    h2Faq: 'Häufige Fragen',
    faq: [
      { q: 'Wann ist die beste Reisezeit?',
        a: 'April–Juni und September–November: weniger Verkehr, mildes Wetter, Termine lassen sich leichter fixieren. Dezember–März ist Hochsaison — Sie sehen die reale Auslastung fertiger Villen mit eigenen Augen, aber der Verkehr ist dichter und Hotels kosten das Anderthalb- bis Zweifache. Juli–August sind die europäischen Schulferien mit demselben Effekt.' },
      { q: 'Wie lange im Voraus planen?',
        a: 'Zwei bis vier Wochen genügen meist, um Termine abzustimmen. Brauchen Sie einen Slot beim PPAT-Notar und bei einem englischsprachigen Anwalt, rechnen Sie mit vier bis sechs Wochen — deren Kalender sind voll. Für die Spitze von Dezember bis März sind sechs bis acht Wochen sicherer.' },
      { q: 'Kann man während der Reise unterschreiben?',
        a: 'Das Reservation Form wird manchmal direkt beim Bauträgertermin unterzeichnet, die Anzahlung geht auf ein Notar-Treuhandkonto. Der SPA wird üblicherweise zwei bis vier Wochen später vor einem PPAT-Notar unterschrieben, nach der Due Diligence. Dafür müssen Sie nicht zurückfliegen — viele Käufer nutzen eine Vollmacht.' },
      { q: 'Und wenn nichts passt?',
        a: 'Das ist ein normales Ergebnis. Ein paar Tage aufzuwenden, um zu erkennen, dass diese Projekte oder die Insel selbst nicht Ihr Szenario sind, ist günstiger als ein Blindkauf. Die Katalogdaten und Ihre eigenen Notizen bleiben Ihnen für den nächsten Anlauf.' },
      { q: 'Welches Budget ist sinnvoll?',
        a: 'Grob ab 200 000 $ für ein Apartment in Sanur oder eine Off-Plan-Einheit in Ubud und ab 300 000 $ für eine Villa auf dem Bukit oder in Canggu. Darunter wird die Auswahl deutlich enger. Die aktuelle Spanne steht im Katalog, umgerechnet zum heutigen Kurs.' },
      { q: 'Kann Balinsky die Reise organisieren?',
        a: 'Nein. Balinsky ist eine Informationsplattform: Katalog, Rendite- und Dokumentendaten sowie die direkten Kontakte der Bauträger. Transport, Termine, Anwalt und Zeitplan organisieren Sie selbst oder über den Bauträger, dessen Projekt Sie besuchen.' },
    ],
  },
  zh: {
    home: '首页',
    crumb: '看房之行',
    h1: '巴厘岛房产考察之行：如何自己安排',
    intro: '几乎每一位在巴厘岛购买别墅或公寓的人，都会先飞过来实地看房。本页讲的是如何自己规划这趟行程：要预留多少天、在工地上查看什么、向开发商问什么，以及去哪里找独立律师。',
    disclaimer: 'Balinsky 是一个信息平台。我们不组织行程、不带看房产，也不参与您与开发商之间的谈判。以下内容均由您自行安排，或通过您所考察项目的开发商安排。',
    ctaCatalog: '在目录中建立候选清单',
    ctaGuide: '《如何在巴厘岛购房》指南',

    h2Why: '为什么值得亲自飞一趟',
    why: [
      { Icon: Sparkles, title: '施工质量只有到现场才看得出来',
        body: '航拍视频和 PDF 演示呈现的是理想化的画面。到工地的头十五分钟，就能回答照片永远答不了的大部分问题：真实的装修与材料、周边噪音、到海滩的实际步行路线、窗户朝向、邻近工地有多近，以及排水如何处理。' },
      { Icon: Users, title: '人到了现场，对话方式就不一样',
        body: '当您已经飞过来，坐在对面的更可能是项目负责人，而不是照本宣科的销售经理。这是提问的机会：前几期的延期情况、已交付单位的真实入住率、延期交房会怎样、定金如何退还——这些在宣传册里从来不会出现。' },
      { Icon: Scale, title: '文件要在它所在的地方查验',
        body: '土地状态、PBG、SLF 和持有结构，应由独立律师直接阅读文件本身，而不是听卖方转述。在巴厘岛与律师会面通常需要一到两小时，费用远低于交易结构出错的代价。' },
    ],

    h2Plan: '如何规划行程',
    plan: [
      { Icon: Plane, title: '签证与入境',
        body: '美国、加拿大、英国、申根区、澳大利亚和新西兰公民可使用 30 天旅游落地签（VOA）：在伍拉·赖机场落地办理约 35 美元，或提前通过官方 e-VOA 门户办理。无需邀请函，延期 30 天在巴厘岛的移民局办理。' },
      { Icon: Clock, title: '要预留多少天',
        body: '同一区域内的两三个项目，两天足够。完整一轮——看房、与开发商会面、一小时律师咨询、走访两个区域——需要三到四天。不要安排每天超过四五处看房：从长谷到武吉，单程很容易就要九十分钟。' },
      { Icon: Building2, title: '在工地上看什么',
        body: '不要只看样板房：也要求看在建单位和技术区域——给排水、化粪池、停车场、发电机。拍照并记录日期。把看到的与总体规划、目录信息和文件逐一核对。' },
      { Icon: Users, title: '与开发商会面',
        body: '提前预约，直接通过房源页面上开发商自己的联系方式。提前发送问题清单很有帮助：交房日期、付款节点、延期如何处理、交付后由谁管理。请对方把会面结论用书面形式发给您。' },
      { Icon: Scale, title: '独立律师',
        body: '律师要与卖方分开寻找：您的领事馆、PPAT 公证人或成熟的外籍人士社群都能提供线索。六十到九十分钟足以讲清租赁权与 PT PMA 的区别、您居住国的税务、签证路径，以及 SPA 中有风险的条款。' },
      { Icon: MapPin, title: '区域',
        body: '用半天走两三个区域，比再多看三处房产收获更大。长谷（Berawa、Pererenan、Batu Bolong）、武吉（Uluwatu、Bingin、Pandawa）、乌布和沙努尔各不相同：租客不同、季节不同、转售流动性也不同。' },
    ],

    h2Faq: '常见问题',
    faq: [
      { q: '什么季节来最合适？',
        a: '四到六月和九到十一月：交通更顺畅、天气温和、更容易约到会面。十二月到三月是旺季——您能亲眼看到已交付别墅的真实入住率，但交通更拥堵，酒店价格高出一点五到两倍。七、八月是欧洲学校假期，情况类似。' },
      { q: '要提前多久安排？',
        a: '通常提前两到四周足以安排好会面。如果需要预约 PPAT 公证人和英语律师，请预留四到六周——他们的日程很满。十二月至三月的高峰期，提前六到八周更稳妥。' },
      { q: '可以在行程中签署文件吗？',
        a: 'Reservation form 有时会在与开发商会面时当场签署，定金进入公证人的托管账户。SPA 通常在尽职调查之后，两到四周内在 PPAT 公证人面前签署。为此不必再飞回巴厘岛——许多买家使用委托书办理。' },
      { q: '如果没有一处合适怎么办？',
        a: '这是正常结果。花几天时间弄清楚这些项目、甚至这座岛并不适合您，比盲目成交便宜得多。目录数据和您自己的看房笔记会保留下来，下次还用得上。' },
      { q: '多少预算才有意义？',
        a: '大致而言，沙努尔的公寓或乌布的期房从 20 万美元起，武吉或长谷的别墅从 30 万美元起。低于这个区间，可选范围会明显收窄。当前价格区间见目录，按当日汇率换算。' },
      { q: 'Balinsky 能安排这趟行程吗？',
        a: '不能。Balinsky 是信息平台：提供目录、收益与文件数据，以及开发商的直接联系方式。交通、会面、律师和日程由您自行安排，或通过您所考察项目的开发商安排。' },
    ],
  },
  nl: {
    home: 'Home',
    crumb: 'Bezichtigingsreis',
    h1: 'Vastgoedreis naar Bali: hoe u de bezichtiging zelf organiseert',
    intro: 'Bijna iedereen die op Bali een villa of appartement koopt, vliegt er eerst heen om de objecten met eigen ogen te zien. Deze pagina legt uit hoe u zo’n reis zelf plant: hoeveel dagen u uittrekt, wat u ter plaatse controleert, wat u de ontwikkelaar vraagt en waar u een onafhankelijke jurist vindt.',
    disclaimer: 'Balinsky is een informatieplatform. Wij organiseren geen reizen, begeleiden geen bezichtigingen en nemen geen deel aan uw onderhandelingen met een ontwikkelaar. Alles hieronder regelt u zelf, of via de ontwikkelaar wiens project u bezoekt.',
    ctaCatalog: 'Stel een shortlist samen in de catalogus',
    ctaGuide: 'De gids „Hoe koopt u op Bali”',

    h2Why: 'Waarom de reis de moeite waard is',
    why: [
      { Icon: Sparkles, title: 'Bouwkwaliteit zie je alleen ter plaatse',
        body: 'Dronebeelden en pdf-presentaties tonen een geïdealiseerd plaatje. De eerste kwartier op de bouwplaats beantwoordt de meeste vragen die foto’s openlaten: de werkelijke afwerking en materialen, het geluid eromheen, de echte route naar het strand, de oriëntatie van de ramen, hoe dichtbij de buurbouw staat en hoe de afwatering geregeld is.' },
      { Icon: Users, title: 'Ter plaatse praat men anders met u',
        body: 'Als u bent overgekomen, zit vaker de projectleider tegenover u dan een verkoper met een script. Dat is het moment om te vragen naar vertragingen bij eerdere fasen, de echte bezetting van opgeleverde units, wat er gebeurt bij uitstel en hoe de aanbetaling wordt terugbetaald — niets daarvan staat in een brochure.' },
      { Icon: Scale, title: 'Documenten worden gecontroleerd waar ze liggen',
        body: 'Landstatus, PBG, SLF en de eigendomsstructuur leest een onafhankelijke jurist in de documenten zelf, niet in het verhaal van de verkoper. Een juristafspraak op Bali duurt één tot twee uur en kost een fractie van een fout in de structuur.' },
    ],

    h2Plan: 'Hoe u de reis plant',
    plan: [
      { Icon: Plane, title: 'Visum en aankomst',
        body: 'Voor burgers van de VS, Canada, het VK, het Schengengebied, Australië en Nieuw-Zeeland volstaat het toeristische VOA van 30 dagen: bij aankomst op Ngurah Rai voor ongeveer $35, of vooraf via het officiële e-VOA-portaal. Een uitnodiging is niet nodig en verlenging met 30 dagen regelt u bij een immigratiekantoor op Bali.' },
      { Icon: Clock, title: 'Hoeveel dagen uittrekken',
        body: 'Twee of drie objecten in één gebied passen in twee dagen. De volledige ronde — bezichtigingen, afspraken met ontwikkelaars, een uur jurist en twee gebieden verkennen — kost drie tot vier dagen. Plan niet meer dan vier of vijf bezichtigingen per dag: tussen Canggu en de Bukit loopt de rit makkelijk op tot negentig minuten enkele reis.' },
      { Icon: Building2, title: 'Waar u op let ter plaatse',
        body: 'Vraag om meer dan de modelwoning: ook units in aanbouw en de technische ruimtes — waterleidingen, septic tank, parkeerplaats, generator. Fotografeer met datum. Leg wat u ziet naast het masterplan, de catalogusvermelding en de documenten.' },
      { Icon: Users, title: 'Afspraken met de ontwikkelaar',
        body: 'Maak ze vooraf, rechtstreeks via de contactgegevens van de ontwikkelaar op de objectpagina. Uw vragen vooraf sturen helpt: opleverdata, betaaltermijnen, wat er gebeurt bij vertraging, wie het object na oplevering beheert. Vraag om een schriftelijke samenvatting.' },
      { Icon: Scale, title: 'Een onafhankelijke jurist',
        body: 'Zoek de jurist los van de verkoper: uw consulaat, een PPAT-notaris of gevestigde expatgemeenschappen kunnen u doorverwijzen. Zestig tot negentig minuten dekt leasehold versus PT PMA, belasting in uw woonland, de visumroute en de risicovolle clausules in een SPA.' },
      { Icon: MapPin, title: 'De gebieden',
        body: 'Een halve dag door twee of drie gebieden levert meer op dan nog drie bezichtigingen. Canggu (Berawa, Pererenan, Batu Bolong), de Bukit (Uluwatu, Bingin, Pandawa), Ubud en Sanur werken anders: een andere huurder, een ander seizoen, een andere liquiditeit bij doorverkoop.' },
    ],

    h2Faq: 'Veelgestelde vragen',
    faq: [
      { q: 'Wat is het beste seizoen om te komen?',
        a: 'April–juni en september–november: minder verkeer, mild weer, afspraken zijn makkelijker vast te leggen. December–maart is hoogseizoen — u ziet met eigen ogen de echte bezetting van opgeleverde villa’s, maar het verkeer is drukker en hotels kosten anderhalf tot twee keer zoveel. Juli–augustus zijn de Europese schoolvakanties, met hetzelfde effect.' },
      { q: 'Hoe lang van tevoren plannen?',
        a: 'Twee tot vier weken is meestal genoeg om afspraken rond te krijgen. Heeft u een slot nodig bij een PPAT-notaris en een Engelssprekende jurist, reken dan op vier tot zes weken: hun agenda’s zitten vol. Voor de piek van december tot maart is zes tot acht weken veiliger.' },
      { q: 'Kunnen documenten tijdens de reis worden getekend?',
        a: 'Het reservation form wordt soms direct bij de afspraak met de ontwikkelaar getekend, waarbij de aanbetaling naar een escrowrekening van de notaris gaat. De SPA wordt doorgaans twee tot vier weken later bij een PPAT-notaris getekend, na de due diligence. Daarvoor hoeft u niet terug te vliegen — veel kopers gebruiken een volmacht.' },
      { q: 'En als niets past?',
        a: 'Dat is een normale uitkomst. Een paar dagen besteden om te ontdekken dat deze projecten, of het eiland zelf, niet uw scenario zijn, is goedkoper dan blind kopen. De catalogusdata en uw eigen aantekeningen blijven bruikbaar voor de volgende poging.' },
      { q: 'Welk budget is zinvol?',
        a: 'Ruwweg vanaf $200k voor een appartement in Sanur of een off-plan unit in Ubud, en vanaf $300k voor een villa op de Bukit of in Canggu. Daaronder wordt de keuze duidelijk smaller. De actuele spreiding staat in de catalogus, herberekend tegen de koers van vandaag.' },
      { q: 'Kan Balinsky de reis organiseren?',
        a: 'Nee. Balinsky is een informatieplatform: de catalogus, rendements- en documentgegevens, en de directe contacten van ontwikkelaars. Vervoer, afspraken, de jurist en het schema regelt u zelf, of via de ontwikkelaar wiens project u bezoekt.' },
    ],
  },
  ban: {
    home: 'Beranda',
    crumb: 'Palancaran nyingakin',
    h1: 'Tur properti Bali: sapunapi carane ngatur pamargi nyingakin padidi',
    intro: 'Sawatara sami sane numbas vila utawi apartemen ring Bali rauh dumun buat nyingakin objek punika langsung. Kaca puniki wantah tuntunan ngrencanayang pamargi punika padidi: akuda dina sane patut kasiagayang, napi sane katureksain ring genah, napi sane katakenang ring pangwangun, miwah ring dija ngrereh advokat independen.',
    disclaimer: 'Balinsky wantah platform informasi. Tiang nénten ngatur pamargi, nénten nuntun peninjauan, tur nénten milu ring negosiasi Ragane sareng pangwangun. Sakancan sane kabaosang ring sor kaatur padidi olih Ragane, utawi malarapan antuk pangwangun sane proyeknyane karauhin.',
    ctaCatalog: 'Nyusun daftar cendek ring katalog',
    ctaGuide: 'Tuntunan «Sapunapi numbas ring Bali»',

    h2Why: 'Napi mawinan patut rauh langsung',
    why: [
      { Icon: Sparkles, title: 'Kualitas wangunan wantah kacingak ring genah',
        body: 'Video drone miwah presentasi PDF nyihnayang gambaran sane sampun kaolah. Limolas menit kapertama ring genah pacang nyawis akéhan patakén sane nénten kapanggih saking foto: kualitas finishing miwah material, uyut ring sisi, margi sujati ka pasisi, ka dija jendelane madep, akuda nampek wangunan pisaga, miwah sapunapi saluran toyane.' },
      { Icon: Users, title: 'Rikala Ragane sampun rauh, baos ipun malianan',
        body: 'Sasampun Ragane rauh, sane nyapa Ragane sering pisan pamimpin proyek, nénten manajer penjualan sane madasar naskah. Punika galah buat naken indik keterlambatan tahap sane sampun lintang, okupansi sujati unit sane sampun usan, napi sane wénten yening serah terima mundur, miwah sapunapi deposit kawaliang — sane nénten naenin wénten ring presentasi.' },
      { Icon: Scale, title: 'Dokumen katureksain ring genah ipun',
        body: 'Status tanah, PBG, SLF, miwah struktur kapemilikan kawacén olih advokat independen saking dokumen ipun padidi, nénten saking satua sang adol. Pasamuhan sareng advokat ring Bali nelasang ajam kantos kalih jam tur prabéannyane doh alitan bandingang ring iwang ring struktur transaksi.' },
    ],

    h2Plan: 'Sapunapi ngrencanayang pamargi',
    plan: [
      { Icon: Plane, title: 'Visa miwah rauh',
        body: 'Warga AS, Kanada, Inggris, wewidangan Schengen, Australia, miwah Selandia Baru cukup nganggén VOA turis 30 dina: kamedalang rikala rauh ring Ngurah Rai sawatara $35, utawi sadurungnyane malarapan portal e-VOA resmi. Nénten perlu undangan saking sang nerima, tur perpanjangan 30 dina kaurus ring kantor imigrasi ring Bali.' },
      { Icon: Clock, title: 'Akuda dina sane kasiagayang',
        body: 'Kalih utawi tigang objek ring wewidangan sane pateh cukup kalih dina. Putaran jangkep — peninjauan, pasamuhan sareng pangwangun, ajam sareng advokat, miwah uning ring kalih wewidangan — nelasang tigang kantos petang dina. Sampunang ngrencanayang langkungan ring petang utawi limang peninjauan sadina: pamargi saking Canggu ka Bukit aluh pisan nelasang sangang dasa menit sapisan margi.' },
      { Icon: Building2, title: 'Napi sane katureksain ring genah',
        body: 'Tunas mangda kacingakin nénten wantah sample unit: unit sane kantun kawangun miwah wewidangan teknis taler — saluran toya, septik, parkir, genset. Potret sami sareng tanggal ipun. Bandingang sane kacingak sareng master plan, sareng listing ring katalog, miwah sareng dokumen ipun.' },
      { Icon: Users, title: 'Pasamuhan sareng pangwangun',
        body: 'Atur dumun, langsung malarapan kontak pangwangun ring kaca objek. Ngirim daftar patakén dumun punika mabuat: tanggal serah terima, tahapan pembayaran, napi sane wénten yening telat, sira sane ngelola objek sasampun usan. Tunas mangda pikolih pasamuhan kakirim antuk surat.' },
      { Icon: Scale, title: 'Advokat independen',
        body: 'Rereh advokat sane malianan saking sang adol: konsulat negara Ragane, notaris PPAT, utawi komunitas ekspatriat sane sampun kukuh prasida nuduhang. Nem dasa kantos sangang dasa menit cukup buat maosang leasehold bandingang PT PMA, pajak ring negara domisili Ragane, margi visa, miwah pasal-pasal SPA sane madue risiko.' },
      { Icon: MapPin, title: 'Wewidangan',
        body: 'Atenga dina nelusurin kalih utawi tigang wewidangan maicayang langkung akéh bandingang tigang peninjauan sane tiosan. Canggu (Berawa, Pererenan, Batu Bolong), Bukit (Uluwatu, Bingin, Pandawa), Ubud, miwah Sanur mamargi malianan: penyewa malianan, musim malianan, likuiditas adol malih taler malianan.' },
    ],

    h2Faq: 'Patakén sane sering',
    faq: [
      { q: 'Masa sane becik buat rauh?',
        a: 'April–Juni miwah September–November: margi nénten padat, cuaca alus, pasamuhan dangan kaatur. Desember–Maret masa ramé — Ragane prasida nyingakin okupansi sujati vila sane sampun usan, sakéwanten macet langkung padat tur hotel aji apisan tengah kantos ping kalih. Juli–Agustus wantah libur sekolah Éropa, pateh dampaknyane.' },
      { q: 'Akuda suwé sadurungnyane patut karencanayang?',
        a: 'Kalih kantos petang minggu biasannyane cukup buat ngatur pasamuhan. Yening Ragane merluang slot notaris PPAT miwah advokat sane mabasa Inggris, siagayang petang kantos nem minggu — jadwal dané padat. Buat puncak Desember–Maret, nem kantos kutus minggu langkung aman.' },
      { q: 'Prasidaké dokumen katandatanganin rikala pamargi?',
        a: 'Reservation form minab katandatanganin langsung ring pasamuhan sareng pangwangun, tur deposit ngranjing ka rekening escrow notaris. SPA biasannyane katandatanganin ring ajeng notaris PPAT kalih kantos petang minggu salanturnyane, sasampun uji tuntas. Ragane nénten patut mawali ka Bali — akéh sang numbas nganggén surat kuasa.' },
      { q: 'Sapunapi yening nénten wénten objek sane manut?',
        a: 'Punika pikolih sane biasa. Nelasang makudang dina buat uning mungguing proyek-proyek puniki, utawi pulone puniki, nénten manut ring skenario Ragane, langkung mudah bandingang nutup transaksi tanpa nyingakin. Data katalog miwah catetan Ragane kantun mabuat buat panyelehan salanturnyane.' },
      { q: 'Anggaran akuda sane masuk akal?',
        a: 'Kirang langkung saking $200k buat apartemen ring Sanur utawi unit off-plan ring Ubud, tur saking $300k buat vila ring Bukit utawi Canggu. Ring sor punika pilihan ipun nyupitang pisan. Rentang aji sane anyar wénten ring katalog, kawilang malih nganggén kurs rahinane mangkin.' },
      { q: 'Prasidaké Balinsky ngatur pamargi punika?',
        a: 'Nénten. Balinsky wantah platform informasi: katalog, data imbal hasil miwah dokumen, taler kontak langsung pangwangun. Transportasi, pasamuhan, advokat, miwah jadwal kaatur padidi olih Ragane, utawi malarapan pangwangun sane proyeknyane karauhin.' },
    ],
  },
  pl: {
    home: 'Strona główna',
    crumb: 'Wyjazd na oglądanie',
    h1: 'Wyjazd po nieruchomość na Bali: jak zorganizować go samemu',
    intro: 'Niemal każdy, kto kupuje na Bali willę albo apartament, najpierw przylatuje obejrzeć obiekty na żywo. Ta strona to instrukcja, jak zaplanować taki wyjazd samodzielnie: ile dni zarezerwować, co sprawdzić na budowie, o co zapytać dewelopera i gdzie szukać niezależnego prawnika.',
    disclaimer: 'Balinsky jest platformą informacyjną. Nie organizujemy wyjazdów, nie prowadzimy oglądania nieruchomości i nie bierzemy udziału w twoich negocjacjach z deweloperem. Wszystko opisane poniżej organizujesz sam albo przez dewelopera, którego projekt oglądasz.',
    ctaCatalog: 'Zbuduj listę w katalogu',
    ctaGuide: 'Przewodnik „Jak kupić na Bali”',

    h2Why: 'Dlaczego warto przylecieć',
    why: [
      { Icon: Sparkles, title: 'Jakość budowy widać tylko na miejscu',
        body: 'Filmy z drona i prezentacje PDF pokazują wyidealizowany obraz. Pierwszy kwadrans na budowie odpowiada na większość pytań, których nie widać na zdjęciach: rzeczywiste wykończenie i materiały, hałas wokół, prawdziwa droga na plażę, w którą stronę wychodzą okna, jak blisko są sąsiednie budowy i jak rozwiązano odwodnienie.' },
      { Icon: Users, title: 'Na miejscu rozmawia się inaczej',
        body: 'Kiedy już przyleciałeś, naprzeciwko częściej siada szef projektu niż handlowiec ze skryptem. To okazja, by zapytać o opóźnienia wcześniejszych etapów, realne obłożenie oddanych lokali, co się dzieje przy poślizgu i jak zwracany jest depozyt — nic z tego nie trafia do prezentacji.' },
      { Icon: Scale, title: 'Dokumenty sprawdza się tam, gdzie są',
        body: 'Status gruntu, PBG, SLF i strukturę własności czyta niezależny prawnik w samych dokumentach, a nie w opowieści sprzedającego. Spotkanie z prawnikiem na Bali zajmuje godzinę do dwóch i kosztuje ułamek tego, co błąd w strukturze transakcji.' },
    ],

    h2Plan: 'Jak zaplanować wyjazd',
    plan: [
      { Icon: Plane, title: 'Wiza i wjazd',
        body: 'Obywatelom USA, Kanady, Wielkiej Brytanii, strefy Schengen, Australii i Nowej Zelandii wystarczy turystyczna VOA na 30 dni: wydawana po przylocie w Ngurah Rai za około 35 $ albo wcześniej przez oficjalny portal e-VOA. Zaproszenie nie jest potrzebne, a przedłużenie o kolejne 30 dni załatwia się w biurze imigracyjnym na Bali.' },
      { Icon: Clock, title: 'Ile dni zarezerwować',
        body: 'Dwa–trzy obiekty w jednej okolicy mieszczą się w dwóch dniach. Pełna runda — oglądanie, spotkania z deweloperami, godzina z prawnikiem i poznanie dwóch dzielnic — to trzy do czterech dni. Nie planuj więcej niż cztery–pięć oględzin dziennie: przejazd między Canggu a Bukit potrafi zająć dziewięćdziesiąt minut w jedną stronę.' },
      { Icon: Building2, title: 'Na co patrzeć na budowie',
        body: 'Proś o więcej niż mieszkanie pokazowe: także o lokale w budowie i strefy techniczne — rozprowadzenie wody, szambo, parking, generator. Rób zdjęcia z datą. Porównuj to, co widzisz, z planem zagospodarowania, z ofertą w katalogu i z dokumentami.' },
      { Icon: Users, title: 'Spotkania z deweloperem',
        body: 'Umawiaj je wcześniej, bezpośrednio przez kontakty dewelopera na stronie obiektu. Warto wysłać pytania z wyprzedzeniem: terminy oddania, etapy płatności, co przy opóźnieniu, kto zarządza obiektem po odbiorze. Poproś o podsumowanie spotkania na piśmie.' },
      { Icon: Scale, title: 'Niezależny prawnik',
        body: 'Prawnika szukaj osobno od sprzedającego: konsulat twojego kraju, notariusz PPAT albo ugruntowane społeczności ekspatów potrafią wskazać kierunek. Sześćdziesiąt do dziewięćdziesięciu minut wystarcza na leasehold kontra PT PMA, podatki w kraju twojej rezydencji, ścieżkę wizową i ryzykowne zapisy SPA.' },
      { Icon: MapPin, title: 'Dzielnice',
        body: 'Pół dnia na dwie–trzy okolice daje więcej niż trzy dodatkowe oględziny. Canggu (Berawa, Pererenan, Batu Bolong), Bukit (Uluwatu, Bingin, Pandawa), Ubud i Sanur działają inaczej: inny najemca, inna sezonowość, inna płynność przy odsprzedaży.' },
    ],

    h2Faq: 'Częste pytania',
    faq: [
      { q: 'Kiedy najlepiej przyjechać?',
        a: 'Kwiecień–czerwiec i wrzesień–listopad: mniejszy ruch, łagodniejsza pogoda, łatwiej umówić spotkania. Grudzień–marzec to wysoki sezon — zobaczysz na własne oczy realne obłożenie oddanych willi, ale korki są gęstsze, a hotele półtora–dwa razy droższe. Lipiec–sierpień to europejskie wakacje szkolne, z tym samym skutkiem.' },
      { q: 'Z jakim wyprzedzeniem planować?',
        a: 'Dwa do czterech tygodni zwykle wystarcza, by pospinać spotkania. Jeśli potrzebujesz terminu u notariusza PPAT i anglojęzycznego prawnika, przewidź cztery do sześciu tygodni — mają napięte kalendarze. Na szczyt od grudnia do marca bezpieczniej sześć–osiem tygodni.' },
      { q: 'Czy można podpisać dokumenty w trakcie wyjazdu?',
        a: 'Reservation form bywa podpisywany wprost na spotkaniu z deweloperem, a depozyt trafia na rachunek powierniczy notariusza. SPA podpisuje się zwykle przed notariuszem PPAT dwa do czterech tygodni później, po due diligence. Nie trzeba wracać na Bali — wielu kupujących korzysta z pełnomocnictwa.' },
      { q: 'A jeśli żaden obiekt nie pasuje?',
        a: 'To normalny wynik. Poświęcić kilka dni, by zrozumieć, że te projekty albo sama wyspa nie są twoim scenariuszem, jest tańsze niż kupowanie w ciemno. Dane z katalogu i własne notatki z oględzin zostają i przydadzą się przy następnym podejściu.' },
      { q: 'Jaki budżet ma sens?',
        a: 'Orientacyjnie od 200 tys. $ za apartament w Sanur albo lokal off-plan w Ubud i od 300 tys. $ za willę na Bukit lub w Canggu. Poniżej wybór wyraźnie się zawęża. Aktualny rozrzut cen jest w katalogu, przeliczany po bieżącym kursie.' },
      { q: 'Czy Balinsky może zorganizować wyjazd?',
        a: 'Nie. Balinsky to platforma informacyjna: katalog, dane o rentowności i dokumentach oraz bezpośrednie kontakty deweloperów. Transport, spotkania, prawnika i harmonogram organizujesz sam albo przez dewelopera, którego projekt oglądasz.' },
    ],
  },
  uk: {
    home: 'Головна',
    crumb: 'Поїздка на огляд',
    h1: 'Інвест-тур на Балі: як самому організувати поїздку на огляд нерухомості',
    intro: 'Майже всі, хто купує віллу чи апартаменти на Балі, спершу прилітають подивитися обʼєкти наживо. Ця сторінка — інструкція, як спланувати таку поїздку самостійно: скільки закладати днів, що перевіряти на майданчику, про що говорити із забудовником і де шукати незалежного юриста.',
    disclaimer: 'Balinsky — інформаційний майданчик. Ми не організовуємо поїздки, не проводимо огляди і не беремо участі у ваших переговорах із забудовником. Усе описане нижче ви робите самі або через забудовника, у якого дивитеся обʼєкт.',
    ctaCatalog: 'Зібрати шорт-лист у каталозі',
    ctaGuide: 'Гід «Як купити на Балі»',

    h2Why: 'Навіщо летіти дивитися наживо',
    why: [
      { Icon: Sparkles, title: 'Якість будівництва видно тільки на землі',
        body: 'Дрон-відео та PDF-презентації показують ідеалізовану картинку. Перші пʼятнадцять хвилин на майданчику закривають більшість питань, яких не видно на фото: якість оздоблення і матеріалів, шум навколо, справжній шлях до пляжу, куди виходять вікна, наскільки близько сусідні будови, що з водовідведенням.' },
      { Icon: Users, title: 'На місці з вами говорять інакше',
        body: 'Коли ви приїхали, до вас частіше виходить керівник проєкту, а не менеджер зі скриптом. Це шанс запитати про затримки попередніх черг, фактичне завантаження зданих обʼєктів, умови за зриву термінів і повернення депозиту — того, чого не буває в презентації.' },
      { Icon: Scale, title: 'Документи перевіряють там, де вони є',
        body: 'Статус землі, PBG, SLF і структуру володіння читає незалежний юрист у самих документах, а не в розповіді продавця. Зустріч із юристом на Балі займає годину-дві й коштує незрівнянно менше, ніж помилка в структурі угоди.' },
    ],

    h2Plan: 'Як спланувати поїздку',
    plan: [
      { Icon: Plane, title: 'Віза і вʼїзд',
        body: 'Громадянам США, Канади, Великої Британії, країн Шенгену, Австралії та Нової Зеландії достатньо туристичної VOA на 30 днів: оформлюється після прильоту в Нгурах-Рай приблизно за $35 або заздалегідь через офіційний портал e-VOA. Запрошення від приймаючої сторони не потрібне, продовження ще на 30 днів роблять в імміграційному офісі на Балі.' },
      { Icon: Clock, title: 'Скільки закладати днів',
        body: 'На два-три обʼєкти в одному районі вистачає двох днів. Повне коло — огляди, зустрічі із забудовниками, година з юристом і знайомство з двома районами — це три-чотири дні. Більше чотирьох-пʼяти оглядів на день не плануйте: між Чангу і Букітом легко йде півтори години в один бік.' },
      { Icon: Building2, title: 'Що дивитися на майданчику',
        body: 'Просіть показати не лише sample unit, а й юніти в будівництві з технічними зонами: розведення води, септик, паркінг, генератор. Знімайте з привʼязкою до дати. Звіряйте побачене з майстер-планом, із карткою в каталозі та з документами.' },
      { Icon: Users, title: 'Зустрічі із забудовником',
        body: 'Домовляйтеся заздалегідь — напряму через контакти забудовника на сторінці обʼєкта. Корисно надіслати перелік питань до зустрічі: терміни здачі, етапи платежів, що відбувається за затримки, хто керує обʼєктом після здачі. Підсумок зустрічі попросіть продублювати листом.' },
      { Icon: Scale, title: 'Незалежний юрист',
        body: 'Юриста шукайте окремо від продавця: рекомендацію можна взяти в консульстві вашої країни, у нотаріуса PPAT або в профільних спільнотах експатів. За 60–90 хвилин розбирають лізхолд проти PT PMA, податки в країні вашого резидентства, візовий шлях і ризиковані пункти SPA.' },
      { Icon: MapPin, title: 'Райони',
        body: 'Півдня на два-три райони дають більше, ніж ще три огляди. Чангу (Берава, Перереран, Бату-Болонг), Букіт (Улувату, Бінгін, Пандава), Убуд і Санур живуть по-різному: інший орендар, інша сезонність, інша ліквідність на перепродажі.' },
    ],

    h2Faq: 'Часті запитання',
    faq: [
      { q: 'Коли краще їхати за сезоном?',
        a: 'Квітень–червень і вересень–листопад: менше заторів, мʼяка погода, легше домовитися про зустрічі. Грудень–березень — високий сезон, можна на власні очі побачити реальне завантаження зданих вілл, але затори щільніші, а готелі дорожчі в півтора-два рази. Липень–серпень — європейські канікули, ситуація та сама.' },
      { q: 'За скільки планувати поїздку?',
        a: 'Двох-чотирьох тижнів зазвичай достатньо, щоб узгодити зустрічі. Якщо потрібен слот у нотаріуса PPAT і в англомовного юриста, закладайте чотири-шість тижнів: у них щільний графік. На пікові тижні грудня–березня краще за шість-вісім тижнів.' },
      { q: 'Чи можна підписати документи просто в поїздці?',
        a: 'Reservation form інколи підписують прямо на зустрічі із забудовником, а депозит іде на ескроу-рахунок нотаріуса. Сама SPA підписується в нотаріуса PPAT зазвичай через два-чотири тижні, після due diligence. Повертатися заради цього на Балі не обовʼязково — багато хто оформлює довіреність.' },
      { q: 'А якщо жоден обʼєкт не підійде?',
        a: 'Це нормальний результат. Зрозуміти за кілька днів, що конкретні проєкти або сам острів не ваш сценарій, дешевше, ніж закрити угоду наосліп. Дані з каталогу і нотатки з оглядів залишаються у вас і знадобляться наступного разу.' },
      { q: 'Який бюджет має сенс?',
        a: 'Орієнтовно від $200k для апартаментів у Санурі чи off-plan в Убуді і від $300k для вілли на Букіті або в Чангу. Нижче цього вибір помітно звужується. Актуальний розкид цін дивіться в каталозі — він перераховується за поточним курсом.' },
      { q: 'Чи може Balinsky організувати поїздку?',
        a: 'Ні. Balinsky — інформаційний майданчик: каталог, дані щодо дохідності й документів, прямі контакти забудовників. Транспорт, зустрічі, юриста і розклад ви організовуєте самі або через забудовника, у якого дивитеся обʼєкт.' },
    ],
  },
} as const

export function InvestTourView({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const home = switchLangPath('/ru', lang)
  const villas = switchLangPath('/ru/villy', lang)
  const guide = switchLangPath('/ru/kak-kupit', lang)

  // FAQ JSON-LD — страница остаётся кандидатом на rich snippet. Прежняя
  // разметка TouristTrip с provider: Balinsky убрана: мы не поставщик
  // никакой поездки, и заявлять обратное в структурированных данных
  // нельзя даже ради выдачи.
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.crumb },
        ]} />

        {/* HERO */}
        <section className="mt-4 mb-12 max-w-[760px]">
          <h1 className="text-[28px] md:text-[44px] font-semibold tracking-tight text-[#111827] leading-[1.05] mb-5">
            {c.h1}
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[1.65] text-[var(--color-text)] mb-6">
            {c.intro}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={villas}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[14px] font-medium no-underline transition-colors"
            >
              {c.ctaCatalog} <ArrowRight size={15} />
            </Link>
            <Link
              href={guide}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[var(--color-border)] bg-white text-[14px] no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
            >
              {c.ctaGuide}
            </Link>
          </div>
        </section>

        {/* ЧТО ТАКОЕ BALINSKY В ЭТОЙ ИСТОРИИ — сразу под первым экраном,
            чтобы роль площадки нельзя было прочитать неправильно. */}
        <section className="mb-14 max-w-[760px]">
          <div className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-search-bg)] p-5">
            <Info size={18} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0 text-[var(--color-text-muted)]" />
            <p className="text-[14px] leading-[1.65] text-[var(--color-text-muted)]">
              {c.disclaimer}
            </p>
          </div>
        </section>

        {/* WHY */}
        <section className="mb-14">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-6">
            {c.h2Why}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {c.why.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                <Icon size={20} strokeWidth={1.6} className="text-[var(--color-primary)] mb-3" />
                <h3 className="text-[16px] font-semibold mb-2">{title}</h3>
                <p className="text-[14px] leading-[1.6] text-[var(--color-text-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PLAN */}
        <section className="mb-14">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-6">
            {c.h2Plan}
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {c.plan.map(({ Icon, title, body }) => (
              <li key={title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5 flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-search-bg)] text-[var(--color-primary)] flex items-center justify-center">
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold mb-1">{title}</h3>
                  <p className="text-[13px] leading-[1.6] text-[var(--color-text-muted)]">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-14 max-w-[760px]">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">
            {c.h2Faq}
          </h2>
          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {c.faq.map(f => (
              <li key={f.q} className="py-4">
                <h3 className="text-[16px] font-semibold mb-1.5 text-[#111827]">{f.q}</h3>
                <p className="text-[14px] leading-[1.65] text-[var(--color-text-muted)]">{f.a}</p>
              </li>
            ))}
          </ul>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
