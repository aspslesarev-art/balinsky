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
    intro: 'Balinsky — независимый каталог недвижимости Бали для иностранцев: виллы, апартаменты, жилые комплексы и аренда. На сайте собраны проекты застройщиков, у которых мы проверили документы, посмотрели объекты на земле и сняли видео. Цены — в актуальных USD. Контакты менеджера застройщика указаны прямо в карточке объекта: писать вы будете ему, а не нам.',

    h2Numbers: 'Цифры на сегодня',
    numbersLead: 'Эти числа обновляются автоматически — на сайте показано столько объектов, сколько реально опубликовано в базе.',
    statVillas: 'вилл и домов',
    statApts: 'апартаментов',
    statComplexes: 'жилых комплексов',
    statDevs: 'застройщиков',
    statMgrs: 'менеджеров застройщиков',

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
      { title: 'Как устроена покупка', body: 'Этапы сделки, структуры владения, реальные расходы и подводные камни разобраны на страницах «Как купить» и «Бронирование». Это справочный материал, а не наша услуга: сама сделка проходит между вами и застройщиком.' },
      { title: 'Прямые контакты застройщика', body: 'У каждого проекта на сайте указан назначенный менеджер застройщика с фото, языками, Telegram и WhatsApp. Переписка идёт напрямую с ним — Balinsky в ней не участвует и её не модерирует.' },
      { title: 'Сравнение и шортлист', body: 'Любой объект сохраняется в избранное, виллы и апартаменты сравниваются по 14 ключевым параметрам инвестора в одной таблице.' },
    ],

    h2Model: 'Кто ведёт сайт и на чём он зарабатывает',
    model: [
      { title: 'Оператор сайта', body: 'Balinsky.info ведёт ИП Andrei Slesarau, зарегистрированное в Грузии: рег. № 316362404 от 06.01.2022, адрес 19 Shartava St., Rustavi. Договоры и счета выставляются от этого лица и по законодательству Грузии.' },
      { title: 'На чём зарабатывает площадка', body: 'Единственный источник дохода — реклама застройщиков: баннеры и информационные материалы на сайте, публикации в Telegram-канале, съёмка видео о проектах. Плата берётся с застройщика по рекламному договору. С покупателей мы не берём ничего.' },
      { title: 'Чем Balinsky не является', body: 'Мы не агентство недвижимости и не брокер. Мы не продаём объекты, не ведём переговоры, не берём комиссию с покупателей, не принимаем депозиты и не сопровождаем сделки. Договор заключается напрямую между покупателем и застройщиком или собственником.' },
    ],

    h2Cases: 'Истории покупателей',
    pCases: 'Мы собираем истории состоявшихся покупок — что искали, как искали, на чём сошлись по SPA, что вышло в итоге и какая реальная доходность сегодня. Каждая история анонимизирована: без имён и адресов, но с реальными цифрами. Раздел будет наполняться по мере того, как читатели соглашаются поделиться. Если вы покупали недвижимость на Бали и готовы рассказать свою историю, напишите боту — это обычно 20 минут разговора.',
    casesCta: 'Поделиться историей покупки',

    h2Contact: 'Связаться',
    pContact: 'По любому вопросу о самом сайте — каталог, конкретная карточка, неточность в данных — пишите боту в Telegram. Если Telegram неудобен, почта в подвале сайта. По конкретному объекту пишите напрямую застройщику: его контакты есть в карточке.',
    contactBot: 'Написать боту',
    contactGuide: 'Сначала прочитать «Как купить»',
  },
  en: {
    home: 'Home',
    crumb: 'About Balinsky',
    h1: 'Balinsky — what it is and why you can trust it',
    intro: 'Balinsky is an independent Bali property catalogue for foreign buyers: villas, apartments, residential complexes and rentals. It lists projects from developers whose documents we checked, whose sites we walked and whose properties we filmed. Prices are shown in current USD. The developer’s manager is listed on the listing page itself — you write to them, not to us.',

    h2Numbers: 'The numbers today',
    numbersLead: 'These figures update automatically — what you see on the site is exactly what is published in the database right now.',
    statVillas: 'villas and houses',
    statApts: 'apartments',
    statComplexes: 'residential complexes',
    statDevs: 'developers',
    statMgrs: 'developer managers',

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
      { title: 'How a purchase works', body: 'Deal stages, ownership structures, real costs and the traps are laid out on the “How to buy” and “Reservation” pages. That is reference material, not a service we sell: the transaction happens between you and the developer.' },
      { title: 'The developer’s direct contacts', body: 'Every project on the site names the developer’s own manager, with photo, spoken languages, Telegram and WhatsApp. The conversation runs straight to them — Balinsky is not part of it and does not moderate it.' },
      { title: 'Compare and shortlist', body: 'Any listing saves to your shortlist; villas and apartments compare on 14 investor-grade parameters in one table.' },
    ],

    h2Model: 'Who runs the site and how it earns',
    model: [
      { title: 'Site operator', body: 'Balinsky.info is run by Andrei Slesarau, a sole proprietor registered in Georgia: reg. no. 316362404 of 06.01.2022, 19 Shartava St., Rustavi. Contracts and invoices are issued by that entity under Georgian law.' },
      { title: 'How the platform earns', body: 'The only source of revenue is developer advertising: banners and informational material on the site, posts in the Telegram channel, and video production about projects. Developers pay under an advertising contract. Buyers are charged nothing.' },
      { title: 'What Balinsky is not', body: 'We are not a real-estate agency or a broker. We do not sell properties, do not conduct negotiations, take no commission from buyers, accept no deposits and do not accompany transactions. The contract is signed directly between the buyer and the developer or owner.' },
    ],

    h2Cases: 'Buyer stories',
    pCases: 'We collect stories of completed purchases — what people were looking for, how they searched, where the SPA landed, what came of it and the actual yield today. Every story is anonymised: no names or addresses, but with real numbers. The section grows as readers agree to share. If you have bought property in Bali and are willing to tell your story, message the bot — it usually takes a 20-minute call.',
    casesCta: 'Share a purchase story',

    h2Contact: 'Get in touch',
    pContact: 'For anything about the site itself — the catalogue, a particular listing, an error in the data — message the bot on Telegram. If Telegram is inconvenient, the email is in the footer. About a specific property, write to the developer directly: their contacts are on the listing.',
    contactBot: 'Message the bot',
    contactGuide: 'Read the buying guide first',
  },
  id: {
    home: 'Beranda',
    crumb: 'Tentang Balinsky',
    h1: 'Balinsky — apa itu dan mengapa Anda bisa mempercayainya',
    intro: 'Balinsky adalah katalog properti Bali yang independen untuk pembeli asing: vila, apartemen, kompleks hunian, dan sewa. Situs ini memuat proyek dari pengembang yang dokumennya kami periksa, lokasinya kami datangi, dan objeknya kami rekam. Harga ditampilkan dalam USD terkini. Manajer pengembang tercantum langsung di halaman objek — Anda menghubungi mereka, bukan kami.',

    h2Numbers: 'Angka hari ini',
    numbersLead: 'Angka-angka ini diperbarui otomatis — yang Anda lihat di situs persis dengan yang dipublikasikan di basis data saat ini.',
    statVillas: 'vila dan rumah',
    statApts: 'apartemen',
    statComplexes: 'kompleks hunian',
    statDevs: 'pengembang',
    statMgrs: 'manajer pengembang',

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
      { title: 'Bagaimana proses pembelian berjalan', body: 'Tahapan transaksi, struktur kepemilikan, biaya nyata, dan jebakannya dijelaskan di halaman «Cara membeli» dan «Reservasi». Itu bahan rujukan, bukan jasa yang kami jual: transaksinya terjadi antara Anda dan pengembang.' },
      { title: 'Kontak langsung pengembang', body: 'Setiap proyek di situs mencantumkan manajer milik pengembang sendiri, lengkap dengan foto, bahasa, Telegram, dan WhatsApp. Percakapan berlangsung langsung dengan mereka — Balinsky tidak ikut dan tidak memoderasinya.' },
      { title: 'Bandingkan dan daftar pendek', body: 'Setiap listing tersimpan ke daftar pendek Anda; vila dan apartemen dibandingkan berdasarkan 14 parameter kelas investor dalam satu tabel.' },
    ],

    h2Model: 'Siapa yang menjalankan situs ini dan dari mana penghasilannya',
    model: [
      { title: 'Operator situs', body: 'Balinsky.info dijalankan oleh Andrei Slesarau, pengusaha perseorangan terdaftar di Georgia: reg. no. 316362404 tanggal 06.01.2022, 19 Shartava St., Rustavi. Kontrak dan faktur diterbitkan oleh badan tersebut menurut hukum Georgia.' },
      { title: 'Dari mana platform ini memperoleh penghasilan', body: 'Satu-satunya sumber pendapatan adalah iklan pengembang: banner dan materi informasi di situs, publikasi di kanal Telegram, serta produksi video tentang proyek. Pengembang membayar berdasarkan kontrak periklanan. Pembeli tidak dikenakan biaya apa pun.' },
      { title: 'Balinsky bukan apa', body: 'Kami bukan agen properti dan bukan broker. Kami tidak menjual objek, tidak melakukan negosiasi, tidak mengambil komisi dari pembeli, tidak menerima deposit, dan tidak mendampingi transaksi. Kontrak ditandatangani langsung antara pembeli dan pengembang atau pemilik.' },
    ],

    h2Cases: 'Kisah pembeli',
    pCases: 'Kami mengumpulkan kisah pembelian yang sudah selesai — apa yang dicari, bagaimana mencarinya, di mana negosiasi SPA berakhir, apa hasilnya, dan berapa imbal hasil nyatanya hari ini. Setiap kisah dianonimkan: tanpa nama atau alamat, tetapi dengan angka nyata. Bagian ini bertambah seiring pembaca bersedia berbagi. Bila Anda pernah membeli properti di Bali dan bersedia bercerita, kirim pesan ke bot — biasanya butuh panggilan 20 menit.',
    casesCta: 'Bagikan kisah pembelian',

    h2Contact: 'Hubungi kami',
    pContact: 'Untuk hal apa pun tentang situs ini — katalog, listing tertentu, kekeliruan data — kirim pesan ke bot di Telegram. Bila Telegram tidak nyaman, email ada di footer. Untuk properti tertentu, hubungi pengembang langsung: kontaknya ada di halaman objek.',
    contactBot: 'Kirim pesan ke bot',
    contactGuide: 'Baca panduan membeli dulu',
  },
  fr: {
    home: 'Accueil',
    crumb: 'À propos de Balinsky',
    h1: 'Balinsky — ce que c’est et pourquoi vous pouvez lui faire confiance',
    intro: 'Balinsky est un catalogue immobilier indépendant de Bali pour les acheteurs étrangers : villas, appartements, résidences et locations. Le site répertorie des projets de promoteurs dont nous avons vérifié les documents, visité les sites et filmé les biens. Les prix sont affichés en USD actuels. Le contact du commercial du promoteur figure sur la page du bien — c’est à lui que vous écrivez, pas à nous.',

    h2Numbers: 'Les chiffres aujourd’hui',
    numbersLead: 'Ces chiffres se mettent à jour automatiquement — ce que vous voyez sur le site correspond exactement à ce qui est publié dans la base de données en ce moment.',
    statVillas: 'villas et maisons',
    statApts: 'appartements',
    statComplexes: 'résidences',
    statDevs: 'promoteurs',
    statMgrs: 'conseillers de promoteurs',

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
      { title: 'Comment se déroule un achat', body: 'Les étapes, les structures de propriété, les coûts réels et les pièges sont détaillés sur les pages « Comment acheter » et « Réservation ». C’est de la documentation, pas une prestation que nous vendons : la transaction se fait entre vous et le promoteur.' },
      { title: 'Les contacts directs du promoteur', body: 'Chaque projet du site indique le commercial du promoteur lui-même, avec photo, langues parlées, Telegram et WhatsApp. L’échange se fait directement avec lui — Balinsky n’y participe pas et ne le modère pas.' },
      { title: 'Comparer et présélectionner', body: 'Chaque annonce s’enregistre dans votre sélection ; villas et appartements se comparent sur 14 paramètres de niveau investisseur dans un seul tableau.' },
    ],

    h2Model: 'Qui édite le site et comment il gagne sa vie',
    model: [
      { title: 'Éditeur du site', body: 'Balinsky.info est édité par Andrei Slesarau, entrepreneur individuel immatriculé en Géorgie : n° 316362404 du 06.01.2022, 19 Shartava St., Rustavi. Les contrats et factures sont émis par cette entité, sous le droit géorgien.' },
      { title: 'Comment la plateforme gagne sa vie', body: 'La seule source de revenus est la publicité des promoteurs : bannières et contenus informatifs sur le site, publications sur la chaîne Telegram, production de vidéos sur les projets. Les promoteurs paient au titre d’un contrat publicitaire. Les acheteurs ne paient rien.' },
      { title: 'Ce que Balinsky n’est pas', body: 'Nous ne sommes ni une agence immobilière ni un courtier. Nous ne vendons pas de biens, ne menons pas de négociations, ne prenons aucune commission aux acheteurs, n’encaissons aucun acompte et n’accompagnons aucune transaction. Le contrat est signé directement entre l’acheteur et le promoteur ou le propriétaire.' },
    ],

    h2Cases: 'Histoires d’acheteurs',
    pCases: 'Nous rassemblons des récits d’achats aboutis — ce que la personne cherchait, comment elle a cherché, où la négociation du SPA a abouti, ce qui en est ressorti et le rendement réel aujourd’hui. Chaque récit est anonymisé : sans nom ni adresse, mais avec de vrais chiffres. La section s’étoffe à mesure que les lecteurs acceptent de partager. Si vous avez acheté un bien à Bali et souhaitez raconter votre histoire, écrivez au bot — cela prend en général vingt minutes.',
    casesCta: 'Partager une histoire d’achat',

    h2Contact: 'Nous contacter',
    pContact: 'Pour tout ce qui concerne le site lui-même — le catalogue, une annonce précise, une donnée erronée — écrivez au bot sur Telegram. Si Telegram ne vous convient pas, l’e-mail est en pied de page. Pour un bien précis, écrivez directement au promoteur : ses coordonnées sont sur l’annonce.',
    contactBot: 'Écrire au bot',
    contactGuide: 'Lire d’abord le guide d’achat',
  },
  de: {
    home: 'Startseite',
    crumb: 'Über Balinsky',
    h1: 'Balinsky — was es ist und warum Sie ihm vertrauen können',
    intro: 'Balinsky ist ein unabhängiger Bali-Immobilienkatalog für ausländische Käufer: Villen, Apartments, Wohnanlagen und Vermietungen. Gelistet sind Projekte von Bauträgern, deren Unterlagen wir geprüft, deren Standorte wir begangen und deren Objekte wir gefilmt haben. Preise erscheinen in aktuellen USD. Der Ansprechpartner des Bauträgers steht direkt auf der Objektseite — Sie schreiben ihm, nicht uns.',

    h2Numbers: 'Die Zahlen heute',
    numbersLead: 'Diese Zahlen aktualisieren sich automatisch — was Sie auf der Website sehen, ist genau das, was gerade in der Datenbank veröffentlicht ist.',
    statVillas: 'Villen und Häuser',
    statApts: 'Apartments',
    statComplexes: 'Wohnanlagen',
    statDevs: 'Bauträger',
    statMgrs: 'Bauträger-Manager',

    h2How: 'Wie wir entscheiden, was wir veröffentlichen',
    standards: [
      { Icon: FileSearch, title: 'Dokumentenprüfung', body: 'Jede Immobilie im Katalog muss ein gültiges PBG, eine klare Landstruktur (SHM / HGB / Hak Pakai) und einen echten Bauträger mit PT-Registrierung haben. Ohne dieses Set schafft es die Immobilie schlicht nicht auf die Website.' },
      { Icon: Video,      title: 'Video und Fotos vor Ort', body: 'Für die meisten Projekte hat unser Team eigenes Material gedreht — Drohne, Baufortschritt, Umgebung. Keine Pressemitteilung des Bauträgers, sondern der reale Zustand zu einem bekannten Datum.' },
      { Icon: UsersRound, title: 'Ein Manager mit Gesicht', body: 'Jeder Bauträger auf der Website hat einen benannten Manager mit Foto, gesprochenen Sprachen, direktem Telegram und WhatsApp. Keine anonyme „Vertriebsabteilung“ — eine echte Person, die Sie per Videoanruf erreichen können.' },
      { Icon: BookOpen,   title: 'Redaktionelle Auswahl', body: 'Wir veröffentlichen nicht alles. Objekte, Projekte und Bauträger, die unsere oben genannte QA nicht bestehen, kommen nie in den Katalog.' },
    ],

    h2Stack: 'Was Sie bekommen',
    stackItems: [
      { title: 'Preise in Echtzeit-USD', body: 'Preise werden zum aktuellen Kurs neu berechnet; der Währungsumschalter ist im Header. Die Vergleichsansicht berechnet automatisch neu, wenn Sie umschalten.' },
      { title: 'Wie ein Kauf abläuft', body: 'Ablauf, Eigentumsstrukturen, echte Kosten und Fallstricke stehen auf den Seiten „Wie man kauft“ und „Reservierung“. Das ist Nachschlagematerial, keine Leistung, die wir verkaufen: Das Geschäft läuft zwischen Ihnen und dem Bauträger.' },
      { title: 'Direkte Kontakte des Bauträgers', body: 'Zu jedem Projekt ist der Manager des Bauträgers genannt, mit Foto, Sprachen, Telegram und WhatsApp. Die Korrespondenz läuft direkt mit ihm — Balinsky ist daran nicht beteiligt und moderiert sie nicht.' },
      { title: 'Vergleichen und Merkliste', body: 'Jedes Inserat wird in Ihrer Merkliste gespeichert; Villen und Apartments werden anhand von 14 investorenrelevanten Parametern in einer Tabelle verglichen.' },
    ],

    h2Model: 'Wer die Website betreibt und womit sie Geld verdient',
    model: [
      { title: 'Betreiber der Website', body: 'Balinsky.info wird von Andrei Slesarau betrieben, einem in Georgien eingetragenen Einzelunternehmer: Reg.-Nr. 316362404 vom 06.01.2022, 19 Shartava St., Rustavi. Verträge und Rechnungen stellt dieses Unternehmen nach georgischem Recht aus.' },
      { title: 'Womit die Plattform Geld verdient', body: 'Einzige Einnahmequelle ist Bauträgerwerbung: Banner und Informationsmaterial auf der Website, Beiträge im Telegram-Kanal und Videoproduktion zu Projekten. Bauträger zahlen auf Basis eines Werbevertrags. Käufern stellen wir nichts in Rechnung.' },
      { title: 'Was Balinsky nicht ist', body: 'Wir sind weder Immobilienagentur noch Makler. Wir verkaufen keine Objekte, führen keine Verhandlungen, nehmen keine Provision von Käufern, keine Anzahlungen entgegen und begleiten keine Transaktionen. Der Vertrag wird unmittelbar zwischen Käufer und Bauträger oder Eigentümer geschlossen.' },
    ],

    h2Cases: 'Käufergeschichten',
    pCases: 'Wir sammeln Berichte über abgeschlossene Käufe — was gesucht wurde, wie gesucht wurde, wo die SPA-Verhandlung endete, was dabei herauskam und wie die reale Rendite heute aussieht. Jeder Bericht ist anonymisiert: ohne Namen und Adressen, aber mit echten Zahlen. Der Bereich wächst, sobald Leserinnen und Leser zustimmen. Wenn Sie auf Bali gekauft haben und Ihre Geschichte erzählen möchten, schreiben Sie dem Bot — das dauert meist zwanzig Minuten.',
    casesCta: 'Eine Kaufgeschichte teilen',

    h2Contact: 'Kontakt aufnehmen',
    pContact: 'Zu allem, was die Website selbst betrifft — Katalog, ein bestimmtes Inserat, ein Datenfehler — schreiben Sie dem Bot auf Telegram. Wenn Telegram unpraktisch ist, steht die E-Mail im Fußbereich. Zu einem konkreten Objekt schreiben Sie direkt dem Bauträger: Seine Kontakte stehen im Inserat.',
    contactBot: 'Dem Bot schreiben',
    contactGuide: 'Zuerst den Kaufratgeber lesen',
  },
  zh: {
    home: '首页',
    crumb: '关于 Balinsky',
    h1: 'Balinsky——它是什么，以及为什么您可以信任它',
    intro: 'Balinsky 是一个面向外国买家的独立巴厘岛房产目录：别墅、公寓、住宅区和租赁。站内收录的是我们核验过文件、实地走访过、并亲自拍摄过的开发商项目。价格以当前美元显示。开发商的对接经理直接列在房源页面上——您联系的是他们，而不是我们。',

    h2Numbers: '今日数据',
    numbersLead: '这些数字自动更新——您在网站上看到的，正是数据库当前发布的内容。',
    statVillas: '别墅和房屋',
    statApts: '公寓',
    statComplexes: '住宅区',
    statDevs: '开发商',
    statMgrs: '开发商经理',

    h2How: '我们如何决定发布什么',
    standards: [
      { Icon: FileSearch, title: '文件核查', body: '目录中的每处房产都必须具备有效的 PBG、清晰的土地结构（SHM / HGB / Hak Pakai）以及拥有 PT 注册的真实开发商。缺少这一套，房产根本无法登上网站。' },
      { Icon: Video,      title: '实地视频与照片', body: '对于大多数项目，我们的团队拍摄了原创素材——无人机、施工进度、周边环境。不是开发商的新闻稿，而是某一确定日期的真实状态。' },
      { Icon: UsersRound, title: '有面孔的经理', body: '网站上每家开发商都有一位指定经理，配有照片、所讲语言、直接的 Telegram 和 WhatsApp。不是匿名的"销售部门"——而是您可以视频通话的真实的人。' },
      { Icon: BookOpen,   title: '编辑精选', body: '我们不会什么都发布。未通过上述质检的房产、项目和开发商，绝不会进入目录。' },
    ],

    h2Stack: '您将获得什么',
    stackItems: [
      { title: '实时美元定价', body: '价格按当前汇率重新计算；货币切换器在页眉。切换时对比视图会自动重新计算。' },
      { title: '购买流程是怎样的', body: '交易步骤、持有结构、真实成本和其中的陷阱，都写在《如何购买》和《预订》页面里。那是参考资料，不是我们出售的服务：交易发生在您与开发商之间。' },
      { title: '开发商的直接联系方式', body: '站内每个项目都标明开发商自己的经理，附照片、所用语言、Telegram 和 WhatsApp。沟通直接进行——Balinsky 不参与，也不做审核。' },
      { title: '对比与候选清单', body: '任何房源都可保存到您的候选清单；别墅和公寓在一张表中按 14 项投资级参数进行对比。' },
    ],

    h2Model: '网站由谁运营，靠什么盈利',
    model: [
      { title: '网站运营方', body: 'Balinsky.info 由在格鲁吉亚注册的个体经营者 Andrei Slesarau 运营：注册号 316362404，注册日期 2022 年 1 月 6 日，地址 19 Shartava St., Rustavi。合同与发票由该主体依据格鲁吉亚法律开具。' },
      { title: '平台如何盈利', body: '唯一收入来源是开发商广告：站内横幅与资讯内容、Telegram 频道发布，以及项目视频制作。开发商依据广告合同付费。我们不向买家收取任何费用。' },
      { title: 'Balinsky 不是什么', body: '我们不是房地产中介，也不是经纪人。我们不销售房产、不参与谈判、不向买家收取佣金、不接收定金、也不陪同交易。合同由买方与开发商或业主直接签署。' },
    ],

    h2Cases: '买家故事',
    pCases: '我们收集已完成交易的经历——当初在找什么、怎么找的、SPA 谈判最终落在哪里、结果如何、今天的真实收益率是多少。每则故事都做匿名处理：不含姓名和地址，但数字是真实的。随着读者愿意分享，这一栏目会不断充实。如果您在巴厘岛买过房产并愿意讲述，请给机器人留言——通常只需二十分钟。',
    casesCta: '分享一段购房经历',

    h2Contact: '联系我们',
    pContact: '关于网站本身的任何问题——目录、某个具体房源、数据有误——请在 Telegram 上联系机器人。若不方便使用 Telegram，邮箱在页脚。关于具体房产，请直接联系开发商：联系方式就在房源页面上。',
    contactBot: '给机器人留言',
    contactGuide: '先阅读购买指南',
  },
  nl: {
    home: 'Home',
    crumb: 'Over Balinsky',
    h1: 'Balinsky — wat het is en waarom u het kunt vertrouwen',
    intro: "Balinsky is een Bali-vastgoedcatalogus voor buitenlandse kopers: villa's, appartementen, wooncomplexen en verhuur. De site toont projecten van ontwikkelaars van wie wij persoonlijk de documenten hebben geverifieerd, de locaties hebben bezocht en de objecten hebben gefilmd. Prijzen worden in actuele USD getoond. Verkoopmanagers zijn echte mensen met foto, beoordeling en de talen die zij spreken.",

    h2Numbers: 'De cijfers vandaag',
    numbersLead: 'Deze cijfers werken automatisch bij — wat u op de site ziet is precies wat er op dit moment in de database is gepubliceerd.',
    statVillas: "villa's en huizen",
    statApts: 'appartementen',
    statComplexes: 'wooncomplexen',
    statDevs: 'ontwikkelaars',
    statMgrs: 'managers van ontwikkelaars',

    h2How: 'Hoe wij beslissen wat we publiceren',
    standards: [
      { Icon: FileSearch, title: 'Documentcontrole', body: 'Elk object in de catalogus moet een geldig PBG, een heldere grondstructuur (SHM / HGB / Hak Pakai) en een echte ontwikkelaar met PT-registratie hebben. Zonder die set haalt het object simpelweg de site niet.' },
      { Icon: Video,      title: 'Video en foto\'s ter plaatse', body: 'Voor de meeste projecten heeft ons team eigen beelden gemaakt — drone, bouwvoortgang, de omgeving. Geen persbericht van de ontwikkelaar, maar de echte staat op een bekende datum.' },
      { Icon: UsersRound, title: 'Een manager met een gezicht', body: 'Elke ontwikkelaar op de site heeft een aangewezen manager met foto, gesproken talen, directe Telegram en WhatsApp. Geen anonieme "verkoopafdeling" — een echt persoon die u kunt videobellen.' },
      { Icon: BookOpen,   title: 'Redactionele selectie', body: 'Wij publiceren niet alles. Objecten, projecten en ontwikkelaars die onze bovenstaande QA niet doorstaan, komen nooit in de catalogus.' },
    ],

    h2Stack: 'Wat u krijgt',
    stackItems: [
      { title: 'Live USD-prijzen', body: 'Prijzen worden herberekend tegen de huidige koers; de valutaschakelaar staat in de header. De vergelijkingsweergave herberekent automatisch wanneer u wisselt.' },
      { title: 'Hoe een aankoop verloopt', body: 'De stappen, eigendomsstructuren, echte kosten en valkuilen staan op de pagina’s „Hoe koopt u” en „Reservering”. Dat is naslagmateriaal, geen dienst die wij verkopen: de transactie loopt tussen u en de ontwikkelaar.' },
      { title: 'Directe contacten van de ontwikkelaar', body: 'Bij elk project op de site staat de eigen manager van de ontwikkelaar, met foto, talen, Telegram en WhatsApp. Het contact loopt rechtstreeks — Balinsky zit er niet tussen en modereert het niet.' },
      { title: 'Vergelijken en shortlist', body: "Elk aanbod wordt in uw shortlist bewaard; villa's en appartementen worden op 14 investeringsparameters in één tabel vergeleken." },
    ],

    h2Model: 'Wie de site beheert en waar het geld vandaan komt',
    model: [
      { title: 'Exploitant van de site', body: 'Balinsky.info wordt beheerd door Andrei Slesarau, eenmanszaak geregistreerd in Georgië: reg.nr. 316362404 van 06.01.2022, 19 Shartava St., Rustavi. Contracten en facturen worden door die entiteit uitgegeven, naar Georgisch recht.' },
      { title: 'Waar het platform zijn geld verdient', body: 'De enige inkomstenbron is advertenties van ontwikkelaars: banners en informatief materiaal op de site, publicaties in het Telegram-kanaal en videoproductie over projecten. Ontwikkelaars betalen op basis van een advertentiecontract. Kopers betalen niets.' },
      { title: 'Wat Balinsky niet is', body: 'Wij zijn geen makelaar en geen tussenpersoon. Wij verkopen geen objecten, voeren geen onderhandelingen, nemen geen commissie van kopers, ontvangen geen aanbetalingen en begeleiden geen transacties. Het contract wordt rechtstreeks gesloten tussen koper en ontwikkelaar of eigenaar.' },
    ],

    h2Cases: 'Verhalen van kopers',
    pCases: 'We verzamelen verhalen van afgeronde aankopen — wat iemand zocht, hoe er gezocht werd, waar de SPA-onderhandeling uitkwam, wat het opleverde en wat het rendement vandaag werkelijk is. Elk verhaal is geanonimiseerd: geen namen of adressen, wel echte cijfers. De rubriek groeit naarmate lezers willen delen. Heeft u op Bali gekocht en wilt u uw verhaal vertellen, stuur dan een bericht naar de bot — meestal is twintig minuten genoeg.',
    casesCta: 'Deel een aankoopverhaal',

    h2Contact: 'Neem contact op',
    pContact: 'Voor alles over de site zelf — de catalogus, een specifieke advertentie, een fout in de gegevens — stuur een bericht naar de bot op Telegram. Is Telegram onhandig, dan staat het e-mailadres in de voettekst. Over een specifiek object schrijft u rechtstreeks de ontwikkelaar: zijn contacten staan bij de advertentie.',
    contactBot: 'Bericht de bot',
    contactGuide: 'Lees eerst de koopgids',
  },
  ban: {
    home: 'Beranda',
    crumb: 'Indik Balinsky',
    h1: 'Balinsky — napi puniki tur ngudiang dados kapracaya',
    intro: 'Balinsky inggih punika katalog properti Bali sane mandiri buat sang numbas saking dura negara: vila, apartemen, kompleks hunian, miwah sewa. Situs puniki muat proyek pangwangun sane dokumennyane sampun katureksain, genahnyane sampun karauhin, tur objeknyane sampun karekam. Aji kasurat ring USD sane anyar. Manajer pangwangun kasurat langsung ring kaca objek — Ragane mabaos sareng dané, nénten sareng tiang.',

    h2Numbers: 'Angka rahinane mangkin',
    numbersLead: 'Angka-angka puniki kaperbarui otomatis — sane cingak Ragane ring situs pateh sareng sane kapublikasi ring basis data mangkin.',
    statVillas: 'vila miwah umah',
    statApts: 'apartemen',
    statComplexes: 'kompleks hunian',
    statDevs: 'pangwangun',
    statMgrs: 'manajer pangwangun',

    h2How: 'Sapunapi titiang mutusang napi sane kapublikasi',
    standards: [
      { Icon: FileSearch, title: 'Pameriksaan dokumen', body: 'Sabilang properti ring katalog patut madue PBG sane sah, struktur tanah sane cetha (SHM / HGB / Hak Pakai), miwah pangwangun sujati sareng registrasi PT. Yening nenten wenten punika, properti nenten jagi ngranjing ka situs.' },
      { Icon: Video,      title: 'Video miwah foto saking genah', body: 'Buat akehan proyek, tim titiang ngrekam gambar padidi — drone, kamajuan konstruksi, wewengkon. Boya siaran pers saking pangwangun, sakewanten kahanan sujati ring tanggal sane kauningin.' },
      { Icon: UsersRound, title: 'Manajer sareng muan', body: 'Sabilang pangwangun ring situs madue manajer sane katunjuk sareng foto, basa sane kaanggen, Telegram miwah WhatsApp langsung. Boya "departemen penjualan" anonim — sakewanten jadma sujati sane dados kahubungin video.' },
      { Icon: BookOpen,   title: 'Daftar cutet editorial', body: 'Titiang nenten mublikasi sami. Properti, proyek, miwah pangwangun sane nenten lulus QA ring baduur nenten jagi ngranjing ka katalog.' },
    ],

    h2Stack: 'Napi sane kapolihang Ragane',
    stackItems: [
      { title: 'Aji USD kekinian', body: 'Aji kaitung malih manut kurs mangkin; pangalih mata uang wenten ring header. Tampilan pabandingan ngitung malih otomatis rikala Ragane ngalih.' },
      { title: 'Sapunapi proses numbas mamargi', body: 'Tahapan transaksi, struktur kapemilikan, prabéa sujati, miwah pakéwehnyane katlatarang ring kaca «Sapunapi numbas» miwah «Reservasi». Punika bahan rujukan, nénten jasa sane kaadol: transaksinyane mamargi pantaraning Ragane miwah pangwangun.' },
      { title: 'Kontak langsung pangwangun', body: 'Sabilang proyek ring situs nyuratang manajer druwén pangwangun, jangkep antuk foto, basa, Telegram, miwah WhatsApp. Pabaosan mamargi langsung — Balinsky nénten milu tur nénten ngamoderasi.' },
      { title: 'Pabandingan miwah daftar cutet', body: 'Sabilang listing kasimpen ring daftar cutet Ragane; vila miwah apartemen kabandingang manut 14 parameter kelas investor ring satu tabel.' },
    ],

    h2Model: 'Sira sane ngamargiang situs puniki tur saking napi pikolihnyane',
    model: [
      { title: 'Operator situs', body: 'Balinsky.info kamargiang olih Andrei Slesarau, pengusaha perseorangan sane kadaftar ring Georgia: reg. no. 316362404 tanggal 06.01.2022, 19 Shartava St., Rustavi. Kontrak miwah faktur kamedalang olih badan punika manut hukum Georgia.' },
      { title: 'Saking napi platform puniki polih pikolih', body: 'Wantah asiki sumber pikolih: iklan pangwangun — banner miwah materi informasi ring situs, publikasi ring kanal Telegram, taler produksi video indik proyek. Pangwangun naur manut kontrak periklanan. Sang numbas nénten kapatut naur napi-napi.' },
      { title: 'Balinsky nénten napi', body: 'Tiang nénten agen properti tur nénten broker. Tiang nénten ngadol objek, nénten ngamargiang negosiasi, nénten nerima komisi saking sang numbas, nénten nerima deposit, tur nénten nyarengin transaksi. Kontrak katandatanganin langsung pantaraning sang numbas miwah pangwangun wiadin sang druwe.' },
    ],

    h2Cases: 'Satua sang numbas',
    pCases: 'Tiang ngapupulang satua indik numbas sane sampun puput — napi sane karerehin, sapunapi ngrereh, ring dija negosiasi SPA puput, napi pikolihnyane, miwah akuda imbal hasil sujatinnyane mangkin. Sabilang satua kaanonimang: nénten wénten wasta wiadin alamat, sakéwanten angkannyane sujati. Bagian puniki pacang nglimbak sasampun sang ngwacén sairing mabaosang. Yening Ragane naenin numbas properti ring Bali tur sairing masatua, kirim pesan ring bot — biasannyane wantah kalih dasa menit.',
    casesCta: 'Baosang satua numbas',

    h2Contact: 'Ngwentenang kontak',
    pContact: 'Buat napi ja indik situs puniki — katalog, listing sane kapastikayang, iwang ring data — kirim pesan ring bot ring Telegram. Yening Telegram nénten nyaman, email wénten ring sor kaca. Buat objek sane kapastikayang, mabaos langsung ring pangwangun: kontaknyane wénten ring kaca objek.',
    contactBot: 'Kirim pesan ka bot',
    contactGuide: 'Wacen dumun tuntunan numbas',
  },
  pl: {
    home: 'Strona główna',
    crumb: 'O Balinsky',
    h1: 'Balinsky — czym jest i dlaczego można mu zaufać',
    intro: 'Balinsky to niezależny katalog nieruchomości na Bali dla zagranicznych kupujących: wille, apartamenty, osiedla i najem. Zebraliśmy projekty deweloperów, których dokumenty sprawdziliśmy, których działki obeszliśmy i których obiekty nagraliśmy. Ceny podane są w aktualnych USD. Kontakt do menedżera dewelopera znajduje się wprost na stronie obiektu — piszesz do niego, nie do nas.',

    h2Numbers: 'Liczby na dziś',
    numbersLead: 'Te dane aktualizują się automatycznie — to, co widzisz na stronie, jest dokładnie tym, co jest teraz opublikowane w bazie danych.',
    statVillas: 'wille i domy',
    statApts: 'apartamenty',
    statComplexes: 'kompleksy mieszkaniowe',
    statDevs: 'deweloperzy',
    statMgrs: 'menedżerów deweloperów',

    h2How: 'Jak decydujemy, co publikujemy',
    standards: [
      { Icon: FileSearch, title: 'Sprawdzenie dokumentów', body: 'Każda nieruchomość w katalogu musi mieć ważne PBG, jasną strukturę gruntu (SHM / HGB / Hak Pakai) i prawdziwego dewelopera z rejestracją PT. Bez tego zestawu nieruchomość po prostu nie trafia na stronę.' },
      { Icon: Video,      title: 'Wideo i zdjęcia z miejsca', body: 'Dla większości projektów nasza ekipa nakręciła własny materiał — dron, postęp budowy, otoczenie. Nie komunikat prasowy dewelopera, lecz rzeczywisty stan na znaną datę.' },
      { Icon: UsersRound, title: 'Menedżer z twarzą', body: 'Każdy deweloper na stronie ma imiennego menedżera ze zdjęciem, znanymi językami, bezpośrednim Telegramem i WhatsAppem. Nie anonimowy „dział sprzedaży” — konkretna osoba, z którą można porozmawiać na wideo.' },
      { Icon: BookOpen,   title: 'Selekcja redakcyjna', body: 'Nie publikujemy wszystkiego. Nieruchomości, projekty i deweloperzy, którzy nie przejdą powyższej kontroli jakości, nigdy nie trafiają do katalogu.' },
    ],

    h2Stack: 'Co otrzymujesz',
    stackItems: [
      { title: 'Ceny w USD na żywo', body: 'Ceny przeliczają się według bieżącego kursu; przełącznik waluty jest w nagłówku. Widok porównania przelicza się automatycznie przy zmianie.' },
      { title: 'Jak przebiega zakup', body: 'Etapy transakcji, struktury własności, realne koszty i pułapki opisane są na stronach „Jak kupić” i „Rezerwacja”. To materiał informacyjny, a nie usługa, którą sprzedajemy: transakcja odbywa się między tobą a deweloperem.' },
      { title: 'Bezpośrednie kontakty dewelopera', body: 'Przy każdym projekcie podany jest własny menedżer dewelopera — ze zdjęciem, językami, Telegramem i WhatsAppem. Rozmowa toczy się bezpośrednio z nim; Balinsky nie bierze w niej udziału i jej nie moderuje.' },
      { title: 'Porównaj i zapisz', body: 'Każda oferta zapisuje się na Twojej liście życzeń; wille i apartamenty porównują się według 14 parametrów klasy inwestorskiej w jednej tabeli.' },
    ],

    h2Model: 'Kto prowadzi serwis i na czym zarabia',
    model: [
      { title: 'Operator serwisu', body: 'Balinsky.info prowadzi Andrei Slesarau, jednoosobowa działalność zarejestrowana w Gruzji: nr rej. 316362404 z 06.01.2022, 19 Shartava St., Rustavi. Umowy i faktury wystawia ten podmiot, zgodnie z prawem gruzińskim.' },
      { title: 'Na czym zarabia platforma', body: 'Jedynym źródłem przychodu jest reklama deweloperów: banery i materiały informacyjne w serwisie, publikacje na kanale Telegram oraz produkcja wideo o projektach. Deweloperzy płacą na podstawie umowy reklamowej. Kupujących nie obciążamy niczym.' },
      { title: 'Czym Balinsky nie jest', body: 'Nie jesteśmy agencją nieruchomości ani pośrednikiem. Nie sprzedajemy obiektów, nie prowadzimy negocjacji, nie pobieramy prowizji od kupujących, nie przyjmujemy depozytów i nie obsługujemy transakcji. Umowa zawierana jest bezpośrednio między kupującym a deweloperem lub właścicielem.' },
    ],

    h2Cases: 'Historie kupujących',
    pCases: 'Zbieramy historie zakończonych zakupów — czego ktoś szukał, jak szukał, na czym stanęły negocjacje SPA, co z tego wyszło i jaka jest dziś realna rentowność. Każda historia jest zanonimizowana: bez nazwisk i adresów, ale z prawdziwymi liczbami. Dział rośnie w miarę jak czytelnicy zgadzają się podzielić. Jeśli kupiłeś nieruchomość na Bali i chcesz opowiedzieć swoją historię, napisz do bota — zwykle wystarczy dwadzieścia minut.',
    casesCta: 'Podziel się historią zakupu',

    h2Contact: 'Skontaktuj się',
    pContact: 'We wszystkim, co dotyczy samego serwisu — katalog, konkretna oferta, błąd w danych — napisz do bota na Telegramie. Jeśli Telegram jest niewygodny, adres e-mail jest w stopce. W sprawie konkretnego obiektu pisz bezpośrednio do dewelopera: jego kontakty są przy ofercie.',
    contactBot: 'Napisz do bota',
    contactGuide: 'Najpierw przeczytaj przewodnik zakupu',
  },
  uk: {
    home: 'Головна',
    crumb: 'Про Balinsky',
    h1: 'Balinsky — що це таке і чому йому можна довіряти',
    intro: 'Balinsky — незалежний каталог нерухомості Балі для іноземців: вілли, апартаменти, житлові комплекси та оренда. На сайті зібрані проєкти забудовників, чиї документи ми перевірили, чиї ділянки обійшли і чиї обʼєкти зняли на відео. Ціни — в актуальних USD. Контакти менеджера забудовника вказані прямо в картці обʼєкта: писати ви будете йому, а не нам.',

    h2Numbers: 'Цифри на сьогодні',
    numbersLead: 'Ці цифри оновлюються автоматично — те, що ви бачите на сайті, точно відповідає тому, що зараз опубліковано в базі даних.',
    statVillas: 'вілли та будинки',
    statApts: 'апартаменти',
    statComplexes: 'житлові комплекси',
    statDevs: 'забудовники',
    statMgrs: 'менеджерів забудовників',

    h2How: 'Як ми вирішуємо, що публікувати',
    standards: [
      { Icon: FileSearch, title: 'Перевірка документів', body: 'Кожен обʼєкт у каталозі повинен мати чинний PBG, зрозумілу структуру землі (SHM / HGB / Hak Pakai) і реального забудовника з реєстрацією PT. Без цього набору обʼєкт просто не потрапляє на сайт.' },
      { Icon: Video,      title: 'Відео та фото з місця', body: 'Для більшості проєктів наша команда відзняла власний матеріал — дрон, хід будівництва, околиці. Не пресреліз від забудовника, а реальний стан на відому дату.' },
      { Icon: UsersRound, title: 'Менеджер з обличчям', body: 'У кожного забудовника на сайті є іменний менеджер з фото, мовами, якими володіє, прямими Telegram і WhatsApp. Не анонімний «відділ продажів» — конкретна людина, з якою можна поспілкуватися по відео.' },
      { Icon: BookOpen,   title: 'Редакційний відбір', body: 'Ми публікуємо не все. Обʼєкти, проєкти та забудовники, які не проходять зазначену вище перевірку якості, ніколи не потрапляють до каталогу.' },
    ],

    h2Stack: 'Що ви отримуєте',
    stackItems: [
      { title: 'Ціни в USD у реальному часі', body: 'Ціни перераховуються за поточним курсом; перемикач валюти — у шапці. Порівняльний вигляд перераховується автоматично під час перемикання.' },
      { title: 'Як влаштована покупка', body: 'Етапи угоди, структури володіння, реальні витрати й підводні камені розібрані на сторінках «Як купити» та «Бронювання». Це довідковий матеріал, а не наша послуга: сама угода відбувається між вами і забудовником.' },
      { title: 'Прямі контакти забудовника', body: 'У кожного проєкту на сайті вказаний призначений менеджер забудовника з фото, мовами, Telegram і WhatsApp. Листування йде напряму з ним — Balinsky у ньому не бере участі й не модерує його.' },
      { title: 'Порівняння та обране', body: 'Будь-який обʼєкт зберігається до вашого обраного; вілли та апартаменти порівнюються за 14 параметрами інвесторського рівня в одній таблиці.' },
    ],

    h2Model: 'Хто веде сайт і на чому він заробляє',
    model: [
      { title: 'Оператор сайту', body: 'Balinsky.info веде ФОП Andrei Slesarau, зареєстрований у Грузії: реєстр. № 316362404 від 06.01.2022, адреса 19 Shartava St., Rustavi. Договори й рахунки виставляються від цієї особи та за законодавством Грузії.' },
      { title: 'На чому заробляє майданчик', body: 'Єдине джерело доходу — реклама забудовників: банери та інформаційні матеріали на сайті, публікації в Telegram-каналі, зйомка відео про проєкти. Плата береться із забудовника за рекламним договором. З покупців ми не беремо нічого.' },
      { title: 'Чим Balinsky не є', body: 'Ми не агентство нерухомості й не брокер. Ми не продаємо обʼєкти, не ведемо переговори, не беремо комісію з покупців, не приймаємо депозити й не супроводжуємо угоди. Договір укладається напряму між покупцем і забудовником або власником.' },
    ],

    h2Cases: 'Історії покупців',
    pCases: 'Ми збираємо історії завершених покупок — що шукали, як шукали, на чому зійшлися щодо SPA, що вийшло в підсумку і яка реальна дохідність сьогодні. Кожна історія анонімізована: без імен та адрес, але з реальними цифрами. Розділ наповнюватиметься в міру того, як читачі погоджуються поділитися. Якщо ви купували нерухомість на Балі й готові розповісти свою історію, напишіть боту — це зазвичай двадцять хвилин розмови.',
    casesCta: 'Поділитися історією покупки',

    h2Contact: 'Звʼязатися',
    pContact: 'З будь-якого питання про сам сайт — каталог, конкретна картка, неточність у даних — пишіть боту в Telegram. Якщо Telegram незручний, пошта в підвалі сайту. Щодо конкретного обʼєкта пишіть напряму забудовнику: його контакти є в картці.',
    contactBot: 'Написати боту',
    contactGuide: 'Спершу прочитайте посібник з покупки',
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

          {/* Кто оператор и на чём он зарабатывает. Раздел прямого
              раскрытия: юрлицо, источник дохода и перечень того, чем
              площадка не является. Стоит перед «историями покупателей»,
              чтобы роль сайта читалась до любых упоминаний сделок. */}
          <section className="mb-14">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">{c.h2Model}</h2>
            <ul className="space-y-3">
              {c.model.map(m => (
                <li key={m.title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                  <div className="text-[15px] font-semibold text-[#111827] mb-1.5">{m.title}</div>
                  <p className="max-w-[68ch] text-[14px] leading-[1.65] text-[var(--color-text-muted)]">{m.body}</p>
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
