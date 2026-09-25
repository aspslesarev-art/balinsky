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
    h1: 'Balinsky — что это и как мы работаем',
    intro: 'Balinsky — независимый сайт с данными о недвижимости Бали для иностранных покупателей. Мы собираем объекты десятков застройщиков и ставим рядом с каждым цифры, по которым его можно оценить: цена за м² против района, сколько приносят похожие дома рядом в аренде, сколько лет осталось по лизхолду и какой статус разрешений заявляет застройщик. Застройщик указан на каждой странице — общаетесь вы с ним напрямую, не с нами.',

    h2Numbers: 'Цифры на сегодня',
    numbersLead: 'Эти числа обновляются автоматически — на сайте показано столько объектов, сколько реально опубликовано в базе.',
    statVillas: 'вилл и домов',
    statApts: 'апартаментов',
    statComplexes: 'жилых комплексов',
    statDevs: 'застройщиков',
    statMgrs: 'менеджеров застройщиков',

    h2How: 'Что мы проверяем — и чего не проверяем',
    standards: [
      { Icon: FileSearch, title: 'Документы: статус, а не гарантия', body: 'Если застройщик сообщил номера PBG/SLF, тип земли (SHM/HGB/Hak Pakai) и условия лизхолда, мы показываем их в карточке. Юридически мы их не удостоверяем: до оплаты попросите нотариуса PPAT или юриста проверить сертификат и разрешения по официальным реестрам.' },
      { Icon: BookOpen, title: 'Цифры — из данных, метод открыт', body: 'Сравнение цен считаем по нашему каталогу, ставки аренды — по тысячам объектов посуточной аренды на Бали (источник — estatemarket.io). У каждого расчёта указан размер выборки; если объектов меньше 30, цифра помечена как ориентировочная. Весь метод описан на странице «Как мы считаем».' },
      { Icon: Video, title: 'Видео с площадки', body: 'Многие проекты мы снимаем сами — дрон, ход стройки, окрестности. Вы видите состояние на известную дату, а не рендер.' },
      { Icon: UsersRound, title: 'Исправления', body: 'Нашли ошибку в цене, сроке или статусе разрешения? Напишите боту: подтверждённые ошибки исправляем и указываем дату обновления.' },
    ],

    h2Stack: 'Что вы получаете',
    stackItems: [
      { title: 'Каталог в актуальных USD', body: 'Цены пересчитываются на текущий курс, валюту переключаете в шапке. Сравнение объектов учитывает курс автоматически.' },
      { title: 'Как устроена покупка', body: 'Этапы сделки, структуры владения, реальные расходы и подводные камни разобраны на страницах «Как купить» и «Бронирование». Это справочный материал, а не наша услуга: сама сделка проходит между вами и застройщиком.' },
      { title: 'Прямые контакты застройщика', body: 'У каждого проекта на сайте указан назначенный менеджер застройщика с фото, языками, Telegram и WhatsApp. Переписка идёт напрямую с ним — Balinsky в ней не участвует и её не модерирует.' },
      { title: 'Сравнение и шортлист', body: 'Любой объект сохраняется в избранное, виллы и апартаменты сравниваются по 14 ключевым параметрам инвестора в одной таблице.' },
    ],

    h2Model: 'Какую роль играет Balinsky',
    model: [
      { title: 'Площадка только публикует', body: 'Мы собираем объекты, снимаем площадки и считаем рыночные показатели. На публикации роль сайта заканчивается: дальше вы разговариваете с застройщиком или собственником напрямую, без нас в середине.' },
      { title: 'Чем Balinsky не является', body: 'Мы не агентство недвижимости и не брокер. Мы не продаём объекты, не ведём переговоры, не берём комиссию, не принимаем депозиты, не готовим и не удостоверяем договоры, не организуем показы и поездки, не оказываем юридических, нотариальных, налоговых и визовых услуг. Всё это делают сами стороны сделки и привлечённые ими специалисты — застройщик или собственник, нотариус PPAT, юрист.' },
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
    h1: 'Balinsky — what it is and how we work',
    intro: 'Balinsky is an independent Bali property data site for foreign buyers. We collect listings from dozens of developers and put each one next to the numbers you need to judge it: price per m² against the district, what similar homes nearby earn as rentals, how many years are left on the lease and what permit status the developer reports. The developer is named on every page — you deal with them directly, not with us.',

    h2Numbers: 'The numbers today',
    numbersLead: 'These figures update automatically — what you see on the site is exactly what is published in the database right now.',
    statVillas: 'villas and houses',
    statApts: 'apartments',
    statComplexes: 'residential complexes',
    statDevs: 'developers',
    statMgrs: 'developer managers',

    h2How: 'What we check — and what we don’t',
    standards: [
      { Icon: FileSearch, title: 'Documents: a status, not a guarantee', body: 'Where a developer gives us PBG/SLF numbers, the land title type (SHM/HGB/Hak Pakai) and lease terms, we show them on the listing. We do not certify them legally: before you pay, have a PPAT notary or a lawyer check the certificate and permits against the official registers.' },
      { Icon: BookOpen, title: 'Numbers from data, method in the open', body: 'Price comparisons use our catalogue; rental rates come from thousands of Bali holiday rentals we track (source: estatemarket.io). Every figure shows its sample size, and anything based on fewer than 30 listings is marked as indicative. The full method is on the “How we calculate” page.' },
      { Icon: Video, title: 'Video from the site', body: 'For many projects we film the site ourselves — drone, construction progress, surroundings — so you see its state on a known date, not a render.' },
      { Icon: UsersRound, title: 'Corrections', body: 'Found an error in a price, a date or a permit status? Message the bot: we fix confirmed errors and show the date of the update.' },
    ],

    h2Stack: 'What you get',
    stackItems: [
      { title: 'Live USD pricing', body: 'Prices recompute against the current rate; the currency switcher is in the header. The comparison view recalculates automatically as you switch.' },
      { title: 'How a purchase works', body: 'Deal stages, ownership structures, real costs and the traps are laid out on the “How to buy” and “Reservation” pages. That is reference material, not a service we sell: the transaction happens between you and the developer.' },
      { title: 'The developer’s direct contacts', body: 'Every project on the site names the developer’s own manager, with photo, spoken languages, Telegram and WhatsApp. The conversation runs straight to them — Balinsky is not part of it and does not moderate it.' },
      { title: 'Compare and shortlist', body: 'Any listing saves to your shortlist; villas and apartments compare on 14 investor-grade parameters in one table.' },
    ],

    h2Model: 'What role Balinsky plays',
    model: [
      { title: 'The platform only publishes', body: 'We gather listings, film sites and calculate market figures. Publishing is where our role ends: from there you talk to the developer or owner directly, with no one in between.' },
      { title: 'What Balinsky is not', body: 'We are not a real-estate agency or a broker. We do not sell properties, do not negotiate, take no commission, accept no deposits, neither draft nor certify contracts, arrange no viewings or trips, and provide no legal, notarial, tax or visa services. All of that is done by the parties themselves and the professionals they engage — the developer or owner, a PPAT notary, a lawyer.' },
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
    h1: 'Balinsky — apa itu dan bagaimana kami bekerja',
    intro: 'Balinsky adalah situs data properti Bali yang independen untuk pembeli asing. Kami mengumpulkan listing dari puluhan pengembang dan menaruh angka penting di samping masing-masing: harga per m² dibanding kawasan, pendapatan sewa rumah serupa di sekitar, sisa masa leasehold, dan status izin yang dilaporkan pengembang. Pengembang disebutkan di setiap halaman — Anda berurusan langsung dengan mereka, bukan dengan kami.',

    h2Numbers: 'Angka hari ini',
    numbersLead: 'Angka-angka ini diperbarui otomatis — yang Anda lihat di situs persis dengan yang dipublikasikan di basis data saat ini.',
    statVillas: 'vila dan rumah',
    statApts: 'apartemen',
    statComplexes: 'kompleks hunian',
    statDevs: 'pengembang',
    statMgrs: 'manajer pengembang',

    h2How: 'Apa yang kami periksa — dan apa yang tidak',
    standards: [
      { Icon: FileSearch, title: 'Dokumen: status, bukan jaminan', body: 'Jika pengembang memberi nomor PBG/SLF, jenis sertifikat tanah (SHM/HGB/Hak Pakai) dan syarat leasehold, kami menampilkannya di listing. Kami tidak mengesahkannya secara hukum: sebelum membayar, minta notaris PPAT atau pengacara memeriksa sertifikat dan izin di register resmi.' },
      { Icon: BookOpen, title: 'Angka dari data, metode terbuka', body: 'Perbandingan harga memakai katalog kami; tarif sewa dari ribuan sewa liburan di Bali yang kami pantau (sumber: estatemarket.io). Setiap angka menunjukkan ukuran sampel; jika kurang dari 30 listing, angka ditandai sebagai perkiraan. Metode lengkap ada di halaman «Cara kami menghitung».' },
      { Icon: Video, title: 'Video dari lokasi', body: 'Banyak proyek kami rekam sendiri — drone, progres konstruksi, sekitar — sehingga Anda melihat kondisi pada tanggal tertentu, bukan render.' },
      { Icon: UsersRound, title: 'Koreksi', body: 'Menemukan kesalahan harga, tanggal, atau status izin? Kirim pesan ke bot: kesalahan yang terkonfirmasi kami perbaiki dan tanggal pembaruannya dicantumkan.' },
    ],

    h2Stack: 'Apa yang Anda dapatkan',
    stackItems: [
      { title: 'Harga USD terkini', body: 'Harga dihitung ulang terhadap kurs saat ini; pengalih mata uang ada di header. Tampilan perbandingan menghitung ulang otomatis saat Anda beralih.' },
      { title: 'Bagaimana proses pembelian berjalan', body: 'Tahapan transaksi, struktur kepemilikan, biaya nyata, dan jebakannya dijelaskan di halaman «Cara membeli» dan «Reservasi». Itu bahan rujukan, bukan jasa yang kami jual: transaksinya terjadi antara Anda dan pengembang.' },
      { title: 'Kontak langsung pengembang', body: 'Setiap proyek di situs mencantumkan manajer milik pengembang sendiri, lengkap dengan foto, bahasa, Telegram, dan WhatsApp. Percakapan berlangsung langsung dengan mereka — Balinsky tidak ikut dan tidak memoderasinya.' },
      { title: 'Bandingkan dan daftar pendek', body: 'Setiap listing tersimpan ke daftar pendek Anda; vila dan apartemen dibandingkan berdasarkan 14 parameter kelas investor dalam satu tabel.' },
    ],

    h2Model: 'Peran apa yang dijalankan Balinsky',
    model: [
      { title: 'Platform hanya menerbitkan', body: 'Kami mengumpulkan listing, merekam lokasi, dan menghitung angka pasar. Peran kami berakhir saat publikasi: selanjutnya Anda berbicara langsung dengan pengembang atau pemilik, tanpa perantara.' },
      { title: 'Balinsky bukan apa', body: 'Kami bukan agen properti dan bukan broker. Kami tidak menjual objek, tidak bernegosiasi, tidak memungut komisi, tidak menerima deposit, tidak menyusun maupun mengesahkan kontrak, tidak mengatur kunjungan atau perjalanan, dan tidak menyediakan jasa hukum, notaris, pajak, atau visa. Semua itu dilakukan oleh para pihak sendiri dan profesional yang mereka tunjuk — pengembang atau pemilik, notaris PPAT, pengacara.' },
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
    h1: 'Balinsky — ce que c’est et comment nous travaillons',
    intro: 'Balinsky est un site indépendant de données immobilières sur Bali pour les acheteurs étrangers. Nous rassemblons les biens de dizaines de promoteurs et plaçons à côté de chacun les chiffres utiles pour le juger : prix au m² face au quartier, revenus locatifs de biens similaires à proximité, années restantes du bail et statut des permis déclaré par le promoteur. Le promoteur est nommé sur chaque page — vous traitez directement avec lui, pas avec nous.',

    h2Numbers: 'Les chiffres aujourd’hui',
    numbersLead: 'Ces chiffres se mettent à jour automatiquement — ce que vous voyez sur le site correspond exactement à ce qui est publié dans la base de données en ce moment.',
    statVillas: 'villas et maisons',
    statApts: 'appartements',
    statComplexes: 'résidences',
    statDevs: 'promoteurs',
    statMgrs: 'conseillers de promoteurs',

    h2How: 'Ce que nous vérifions — et ce que nous ne vérifions pas',
    standards: [
      { Icon: FileSearch, title: 'Documents : un statut, pas une garantie', body: 'Lorsqu’un promoteur nous communique les numéros PBG/SLF, le type de titre foncier (SHM/HGB/Hak Pakai) et les conditions du bail, nous les affichons. Nous ne les certifions pas juridiquement : avant de payer, faites vérifier le certificat et les permis dans les registres officiels par un notaire PPAT ou un avocat.' },
      { Icon: BookOpen, title: 'Des chiffres issus des données, méthode publique', body: 'Les comparaisons de prix reposent sur notre catalogue ; les loyers sur des milliers de locations saisonnières suivies à Bali (source : estatemarket.io). Chaque chiffre indique la taille de l’échantillon ; en dessous de 30 biens, il est signalé comme indicatif. La méthode complète figure sur la page « Comment nous calculons ».' },
      { Icon: Video, title: 'Vidéo sur place', body: 'Nous filmons nous-mêmes de nombreux projets — drone, avancement du chantier, environs — pour montrer leur état à une date connue, pas un rendu.' },
      { Icon: UsersRound, title: 'Corrections', body: 'Une erreur de prix, de date ou de statut de permis ? Écrivez au bot : nous corrigeons les erreurs confirmées et indiquons la date de mise à jour.' },
    ],

    h2Stack: 'Ce que vous obtenez',
    stackItems: [
      { title: 'Prix en USD en temps réel', body: 'Les prix sont recalculés selon le taux actuel ; le sélecteur de devise est dans l’en-tête. La vue comparative se recalcule automatiquement lorsque vous changez.' },
      { title: 'Comment se déroule un achat', body: 'Les étapes, les structures de propriété, les coûts réels et les pièges sont détaillés sur les pages « Comment acheter » et « Réservation ». C’est de la documentation, pas une prestation que nous vendons : la transaction se fait entre vous et le promoteur.' },
      { title: 'Les contacts directs du promoteur', body: 'Chaque projet du site indique le commercial du promoteur lui-même, avec photo, langues parlées, Telegram et WhatsApp. L’échange se fait directement avec lui — Balinsky n’y participe pas et ne le modère pas.' },
      { title: 'Comparer et présélectionner', body: 'Chaque annonce s’enregistre dans votre sélection ; villas et appartements se comparent sur 14 paramètres de niveau investisseur dans un seul tableau.' },
    ],

    h2Model: 'Le rôle de Balinsky',
    model: [
      { title: 'La plateforme se limite à publier', body: 'Nous rassemblons les biens, filmons les sites et calculons les indicateurs de marché. Notre rôle s’arrête à la publication : ensuite, vous échangez directement avec le promoteur ou le propriétaire, sans intermédiaire.' },
      { title: 'Ce que Balinsky n’est pas', body: 'Nous ne sommes ni une agence immobilière ni un courtier. Nous ne vendons pas de biens, ne négocions pas, ne percevons aucune commission, n’encaissons aucun acompte, ne rédigeons ni ne certifions de contrats, n’organisons ni visites ni voyages et ne fournissons aucune prestation juridique, notariale, fiscale ou en matière de visa. Tout cela relève des parties elles-mêmes et des professionnels qu’elles mandatent — promoteur ou propriétaire, notaire PPAT, avocat.' },
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
    h1: 'Balinsky — was es ist und wie wir arbeiten',
    intro: 'Balinsky ist eine unabhängige Datenseite zu Bali-Immobilien für ausländische Käufer. Wir sammeln Angebote von Dutzenden Bauträgern und stellen jedem die Zahlen zur Seite, mit denen man es beurteilen kann: Preis pro m² im Vergleich zum Viertel, Mieteinnahmen ähnlicher Häuser in der Nähe, verbleibende Pachtjahre und der vom Bauträger gemeldete Genehmigungsstatus. Der Bauträger steht auf jeder Seite — Sie verhandeln direkt mit ihm, nicht mit uns.',

    h2Numbers: 'Die Zahlen heute',
    numbersLead: 'Diese Zahlen aktualisieren sich automatisch — was Sie auf der Website sehen, ist genau das, was gerade in der Datenbank veröffentlicht ist.',
    statVillas: 'Villen und Häuser',
    statApts: 'Apartments',
    statComplexes: 'Wohnanlagen',
    statDevs: 'Bauträger',
    statMgrs: 'Bauträger-Manager',

    h2How: 'Was wir prüfen — und was nicht',
    standards: [
      { Icon: FileSearch, title: 'Dokumente: ein Status, keine Garantie', body: 'Wenn ein Bauträger uns PBG/SLF-Nummern, die Art des Landtitels (SHM/HGB/Hak Pakai) und Pachtbedingungen nennt, zeigen wir sie im Angebot. Rechtlich bestätigen wir sie nicht: Lassen Sie vor der Zahlung Zertifikat und Genehmigungen von einem PPAT-Notar oder Anwalt in den amtlichen Registern prüfen.' },
      { Icon: BookOpen, title: 'Zahlen aus Daten, Methode offen', body: 'Preisvergleiche basieren auf unserem Katalog, Mietpreise auf Tausenden Ferienvermietungen auf Bali, die wir verfolgen (Quelle: estatemarket.io). Jede Zahl nennt ihre Stichprobe; unter 30 Objekten gilt sie als Richtwert. Die ganze Methode steht auf der Seite „So rechnen wir“.' },
      { Icon: Video, title: 'Video vor Ort', body: 'Viele Projekte filmen wir selbst — Drohne, Baufortschritt, Umgebung —, damit Sie den Zustand zu einem bekannten Datum sehen, kein Rendering.' },
      { Icon: UsersRound, title: 'Korrekturen', body: 'Fehler bei Preis, Termin oder Genehmigungsstatus gefunden? Schreiben Sie dem Bot: Bestätigte Fehler korrigieren wir und nennen das Datum der Aktualisierung.' },
    ],

    h2Stack: 'Was Sie bekommen',
    stackItems: [
      { title: 'Preise in Echtzeit-USD', body: 'Preise werden zum aktuellen Kurs neu berechnet; der Währungsumschalter ist im Header. Die Vergleichsansicht berechnet automatisch neu, wenn Sie umschalten.' },
      { title: 'Wie ein Kauf abläuft', body: 'Ablauf, Eigentumsstrukturen, echte Kosten und Fallstricke stehen auf den Seiten „Wie man kauft“ und „Reservierung“. Das ist Nachschlagematerial, keine Leistung, die wir verkaufen: Das Geschäft läuft zwischen Ihnen und dem Bauträger.' },
      { title: 'Direkte Kontakte des Bauträgers', body: 'Zu jedem Projekt ist der Manager des Bauträgers genannt, mit Foto, Sprachen, Telegram und WhatsApp. Die Korrespondenz läuft direkt mit ihm — Balinsky ist daran nicht beteiligt und moderiert sie nicht.' },
      { title: 'Vergleichen und Merkliste', body: 'Jedes Inserat wird in Ihrer Merkliste gespeichert; Villen und Apartments werden anhand von 14 investorenrelevanten Parametern in einer Tabelle verglichen.' },
    ],

    h2Model: 'Welche Rolle Balinsky hat',
    model: [
      { title: 'Die Plattform veröffentlicht nur', body: 'Wir sammeln Angebote, filmen Baustellen und berechnen Marktkennzahlen. Mit der Veröffentlichung endet unsere Rolle: Danach sprechen Sie direkt mit dem Bauträger oder Eigentümer, ohne Vermittler.' },
      { title: 'Was Balinsky nicht ist', body: 'Wir sind weder Immobilienagentur noch Makler. Wir verkaufen keine Objekte, verhandeln nicht, nehmen keine Provision, keine Anzahlungen entgegen, erstellen und beurkunden keine Verträge, organisieren keine Besichtigungen oder Reisen und erbringen keine rechtlichen, notariellen, steuerlichen oder visabezogenen Leistungen. All das übernehmen die Parteien selbst und die von ihnen beauftragten Fachleute — Bauträger oder Eigentümer, PPAT-Notar, Anwalt.' },
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
    h1: 'Balinsky — 我们是谁，如何工作',
    intro: 'Balinsky 是面向境外买家的独立巴厘岛房产数据网站。我们收录数十家开发商的房源，并在每套房源旁列出判断所需的数据：每平方米价格与所在区域对比、周边类似房屋的租金收入、租赁剩余年限，以及开发商申报的许可状态。每页都注明开发商——您直接与开发商沟通，而不是与我们。',

    h2Numbers: '今日数据',
    numbersLead: '这些数字自动更新——您在网站上看到的，正是数据库当前发布的内容。',
    statVillas: '别墅和房屋',
    statApts: '公寓',
    statComplexes: '住宅区',
    statDevs: '开发商',
    statMgrs: '开发商经理',

    h2How: '我们核查什么，不核查什么',
    standards: [
      { Icon: FileSearch, title: '文件：状态而非担保', body: '如果开发商提供了 PBG/SLF 编号、土地证类型（SHM/HGB/Hak Pakai）和租赁条款，我们会在房源页展示。我们不对其作法律认证：付款前，请 PPAT 公证人或律师在官方登记中核实证书和许可。' },
      { Icon: BookOpen, title: '数据来源公开，方法透明', body: '价格对比基于我们的目录；租金来自我们追踪的巴厘岛数千套度假租赁（来源：estatemarket.io）。每个数字都注明样本量；少于 30 套房源的数据标注为参考值。完整方法见“我们如何计算”页面。' },
      { Icon: Video, title: '现场视频', body: '许多项目由我们亲自拍摄——航拍、施工进度、周边环境——让您看到某一确定日期的真实状态，而非效果图。' },
      { Icon: UsersRound, title: '更正', body: '发现价格、日期或许可状态有误？请联系机器人：经确认的错误我们会更正并注明更新日期。' },
    ],

    h2Stack: '您将获得什么',
    stackItems: [
      { title: '实时美元定价', body: '价格按当前汇率重新计算；货币切换器在页眉。切换时对比视图会自动重新计算。' },
      { title: '购买流程是怎样的', body: '交易步骤、持有结构、真实成本和其中的陷阱，都写在《如何购买》和《预订》页面里。那是参考资料，不是我们出售的服务：交易发生在您与开发商之间。' },
      { title: '开发商的直接联系方式', body: '站内每个项目都标明开发商自己的经理，附照片、所用语言、Telegram 和 WhatsApp。沟通直接进行——Balinsky 不参与，也不做审核。' },
      { title: '对比与候选清单', body: '任何房源都可保存到您的候选清单；别墅和公寓在一张表中按 14 项投资级参数进行对比。' },
    ],

    h2Model: 'Balinsky 扮演什么角色',
    model: [
      { title: '平台只负责发布', body: '我们收集房源、拍摄现场并计算市场指标。发布即是我们角色的终点：之后您直接与开发商或业主沟通，没有中间人。' },
      { title: 'Balinsky 不是什么', body: '我们不是房地产中介，也不是经纪人。我们不销售房产、不参与谈判、不收取佣金、不接收定金、不起草也不公证合同、不安排看房或行程，也不提供法律、公证、税务或签证服务。这些均由交易双方及其自行聘请的专业人士完成——开发商或业主、PPAT 公证人、律师。' },
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
    h1: 'Balinsky — wat het is en hoe we werken',
    intro: 'Balinsky is een onafhankelijke site met vastgoeddata over Bali voor buitenlandse kopers. We verzamelen aanbod van tientallen ontwikkelaars en zetten bij elk object de cijfers om het te beoordelen: prijs per m² tegenover de wijk, huuropbrengst van vergelijkbare woningen in de buurt, resterende leasejaren en de vergunningsstatus die de ontwikkelaar opgeeft. De ontwikkelaar staat op elke pagina — u handelt rechtstreeks met hem, niet met ons.',

    h2Numbers: 'De cijfers vandaag',
    numbersLead: 'Deze cijfers werken automatisch bij — wat u op de site ziet is precies wat er op dit moment in de database is gepubliceerd.',
    statVillas: "villa's en huizen",
    statApts: 'appartementen',
    statComplexes: 'wooncomplexen',
    statDevs: 'ontwikkelaars',
    statMgrs: 'managers van ontwikkelaars',

    h2How: 'Wat we controleren — en wat niet',
    standards: [
      { Icon: FileSearch, title: 'Documenten: een status, geen garantie', body: 'Als een ontwikkelaar ons PBG/SLF-nummers, het type grondtitel (SHM/HGB/Hak Pakai) en de leasevoorwaarden geeft, tonen we die bij het object. Juridisch bevestigen we ze niet: laat vóór betaling een PPAT-notaris of advocaat het certificaat en de vergunningen in de officiële registers controleren.' },
      { Icon: BookOpen, title: 'Cijfers uit data, methode openbaar', body: 'Prijsvergelijkingen gebruiken onze catalogus; huurprijzen komen uit duizenden vakantieverhuurobjecten op Bali die we volgen (bron: estatemarket.io). Elk cijfer vermeldt de steekproef; onder 30 objecten geldt het als indicatief. De volledige methode staat op de pagina „Hoe we rekenen”.' },
      { Icon: Video, title: 'Video ter plaatse', body: 'Veel projecten filmen we zelf — drone, bouwvoortgang, omgeving — zodat u de staat op een bekende datum ziet, geen render.' },
      { Icon: UsersRound, title: 'Correcties', body: 'Een fout in een prijs, datum of vergunningsstatus gevonden? Stuur de bot een bericht: bevestigde fouten herstellen we met vermelding van de datum.' },
    ],

    h2Stack: 'Wat u krijgt',
    stackItems: [
      { title: 'Live USD-prijzen', body: 'Prijzen worden herberekend tegen de huidige koers; de valutaschakelaar staat in de header. De vergelijkingsweergave herberekent automatisch wanneer u wisselt.' },
      { title: 'Hoe een aankoop verloopt', body: 'De stappen, eigendomsstructuren, echte kosten en valkuilen staan op de pagina’s „Hoe koopt u” en „Reservering”. Dat is naslagmateriaal, geen dienst die wij verkopen: de transactie loopt tussen u en de ontwikkelaar.' },
      { title: 'Directe contacten van de ontwikkelaar', body: 'Bij elk project op de site staat de eigen manager van de ontwikkelaar, met foto, talen, Telegram en WhatsApp. Het contact loopt rechtstreeks — Balinsky zit er niet tussen en modereert het niet.' },
      { title: 'Vergelijken en shortlist', body: "Elk aanbod wordt in uw shortlist bewaard; villa's en appartementen worden op 14 investeringsparameters in één tabel vergeleken." },
    ],

    h2Model: 'Welke rol Balinsky speelt',
    model: [
      { title: 'Het platform publiceert alleen', body: 'We verzamelen aanbod, filmen locaties en berekenen marktcijfers. Bij publicatie eindigt onze rol: daarna praat u rechtstreeks met de ontwikkelaar of eigenaar, zonder tussenpersoon.' },
      { title: 'Wat Balinsky niet is', body: 'Wij zijn geen makelaar en geen tussenpersoon. Wij verkopen geen objecten, onderhandelen niet, rekenen geen commissie, nemen geen aanbetalingen aan, stellen noch bekrachtigen contracten, organiseren geen bezichtigingen of reizen en verlenen geen juridische, notariële, fiscale of visumdiensten. Dat alles doen de partijen zelf en de professionals die zij inschakelen — de ontwikkelaar of eigenaar, een PPAT-notaris, een jurist.' },
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
    h1: 'Balinsky — apa itu dan bagaimana kami bekerja',
    intro: 'Balinsky adalah situs data properti Bali yang independen untuk pembeli asing. Kami mengumpulkan listing dari puluhan pengembang dan menaruh angka penting di samping masing-masing: harga per m² dibanding kawasan, pendapatan sewa rumah serupa di sekitar, sisa masa leasehold, dan status izin yang dilaporkan pengembang. Pengembang disebutkan di setiap halaman — Anda berurusan langsung dengan mereka, bukan dengan kami.',

    h2Numbers: 'Angka rahinane mangkin',
    numbersLead: 'Angka-angka puniki kaperbarui otomatis — sane cingak Ragane ring situs pateh sareng sane kapublikasi ring basis data mangkin.',
    statVillas: 'vila miwah umah',
    statApts: 'apartemen',
    statComplexes: 'kompleks hunian',
    statDevs: 'pangwangun',
    statMgrs: 'manajer pangwangun',

    h2How: 'Apa yang kami periksa — dan apa yang tidak',
    standards: [
      { Icon: FileSearch, title: 'Dokumen: status, bukan jaminan', body: 'Jika pengembang memberi nomor PBG/SLF, jenis sertifikat tanah (SHM/HGB/Hak Pakai) dan syarat leasehold, kami menampilkannya di listing. Kami tidak mengesahkannya secara hukum: sebelum membayar, minta notaris PPAT atau pengacara memeriksa sertifikat dan izin di register resmi.' },
      { Icon: BookOpen, title: 'Angka dari data, metode terbuka', body: 'Perbandingan harga memakai katalog kami; tarif sewa dari ribuan sewa liburan di Bali yang kami pantau (sumber: estatemarket.io). Setiap angka menunjukkan ukuran sampel; jika kurang dari 30 listing, angka ditandai sebagai perkiraan. Metode lengkap ada di halaman «Cara kami menghitung».' },
      { Icon: Video, title: 'Video dari lokasi', body: 'Banyak proyek kami rekam sendiri — drone, progres konstruksi, sekitar — sehingga Anda melihat kondisi pada tanggal tertentu, bukan render.' },
      { Icon: UsersRound, title: 'Koreksi', body: 'Menemukan kesalahan harga, tanggal, atau status izin? Kirim pesan ke bot: kesalahan yang terkonfirmasi kami perbaiki dan tanggal pembaruannya dicantumkan.' },
    ],

    h2Stack: 'Napi sane kapolihang Ragane',
    stackItems: [
      { title: 'Aji USD kekinian', body: 'Aji kaitung malih manut kurs mangkin; pangalih mata uang wenten ring header. Tampilan pabandingan ngitung malih otomatis rikala Ragane ngalih.' },
      { title: 'Sapunapi proses numbas mamargi', body: 'Tahapan transaksi, struktur kapemilikan, prabéa sujati, miwah pakéwehnyane katlatarang ring kaca «Sapunapi numbas» miwah «Reservasi». Punika bahan rujukan, nénten jasa sane kaadol: transaksinyane mamargi pantaraning Ragane miwah pangwangun.' },
      { title: 'Kontak langsung pangwangun', body: 'Sabilang proyek ring situs nyuratang manajer druwén pangwangun, jangkep antuk foto, basa, Telegram, miwah WhatsApp. Pabaosan mamargi langsung — Balinsky nénten milu tur nénten ngamoderasi.' },
      { title: 'Pabandingan miwah daftar cutet', body: 'Sabilang listing kasimpen ring daftar cutet Ragane; vila miwah apartemen kabandingang manut 14 parameter kelas investor ring satu tabel.' },
    ],

    h2Model: 'Peran napi sane kalaksanayang Balinsky',
    model: [
      { title: 'Platform wantah ngamedalang', body: 'Kami mengumpulkan listing, merekam lokasi, dan menghitung angka pasar. Peran kami berakhir saat publikasi: selanjutnya Anda berbicara langsung dengan pengembang atau pemilik, tanpa perantara.' },
      { title: 'Balinsky nénten napi', body: 'Tiang nénten agen properti tur nénten broker. Tiang nénten ngadol objek, nénten negosiasi, nénten nerima komisi, nénten nerima deposit, nénten nyusun tur nénten ngesahang kontrak, nénten ngatur kunjungan wiadin pamargi, tur nénten ngicén jasa hukum, notaris, pajak, utawi visa. Sami punika kalaksanayang olih para pihak padidi miwah profesional sane kaundang — pangwangun utawi sang druwe, notaris PPAT, advokat.' },
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
    h1: 'Balinsky — czym jest i jak pracujemy',
    intro: 'Balinsky to niezależny serwis z danymi o nieruchomościach na Bali dla zagranicznych kupujących. Zbieramy oferty dziesiątek deweloperów i przy każdej pokazujemy liczby potrzebne do oceny: cenę za m² na tle dzielnicy, przychód z najmu podobnych domów w okolicy, liczbę lat pozostałych z dzierżawy i status pozwoleń deklarowany przez dewelopera. Deweloper jest podany na każdej stronie — rozmawiasz bezpośrednio z nim, nie z nami.',

    h2Numbers: 'Liczby na dziś',
    numbersLead: 'Te dane aktualizują się automatycznie — to, co widzisz na stronie, jest dokładnie tym, co jest teraz opublikowane w bazie danych.',
    statVillas: 'wille i domy',
    statApts: 'apartamenty',
    statComplexes: 'kompleksy mieszkaniowe',
    statDevs: 'deweloperzy',
    statMgrs: 'menedżerów deweloperów',

    h2How: 'Co sprawdzamy — a czego nie',
    standards: [
      { Icon: FileSearch, title: 'Dokumenty: status, nie gwarancja', body: 'Jeśli deweloper poda numery PBG/SLF, rodzaj tytułu do ziemi (SHM/HGB/Hak Pakai) i warunki dzierżawy, pokazujemy je w ofercie. Nie poświadczamy ich prawnie: przed płatnością poproś notariusza PPAT lub prawnika o sprawdzenie certyfikatu i pozwoleń w oficjalnych rejestrach.' },
      { Icon: BookOpen, title: 'Liczby z danych, metoda jawna', body: 'Porównania cen opieramy na naszym katalogu, stawki najmu — na tysiącach obiektów wakacyjnych na Bali, które śledzimy (źródło: estatemarket.io). Każda liczba podaje wielkość próby; poniżej 30 obiektów jest oznaczona jako orientacyjna. Pełna metoda jest na stronie „Jak liczymy”.' },
      { Icon: Video, title: 'Wideo z budowy', body: 'Wiele projektów filmujemy sami — dron, postęp budowy, okolica — żebyś widział stan z konkretnej daty, a nie wizualizację.' },
      { Icon: UsersRound, title: 'Poprawki', body: 'Znalazłeś błąd w cenie, terminie lub statusie pozwolenia? Napisz do bota: potwierdzone błędy poprawiamy i podajemy datę aktualizacji.' },
    ],

    h2Stack: 'Co otrzymujesz',
    stackItems: [
      { title: 'Ceny w USD na żywo', body: 'Ceny przeliczają się według bieżącego kursu; przełącznik waluty jest w nagłówku. Widok porównania przelicza się automatycznie przy zmianie.' },
      { title: 'Jak przebiega zakup', body: 'Etapy transakcji, struktury własności, realne koszty i pułapki opisane są na stronach „Jak kupić” i „Rezerwacja”. To materiał informacyjny, a nie usługa, którą sprzedajemy: transakcja odbywa się między tobą a deweloperem.' },
      { title: 'Bezpośrednie kontakty dewelopera', body: 'Przy każdym projekcie podany jest własny menedżer dewelopera — ze zdjęciem, językami, Telegramem i WhatsAppem. Rozmowa toczy się bezpośrednio z nim; Balinsky nie bierze w niej udziału i jej nie moderuje.' },
      { title: 'Porównaj i zapisz', body: 'Każda oferta zapisuje się na Twojej liście życzeń; wille i apartamenty porównują się według 14 parametrów klasy inwestorskiej w jednej tabeli.' },
    ],

    h2Model: 'Jaką rolę pełni Balinsky',
    model: [
      { title: 'Platforma wyłącznie publikuje', body: 'Zbieramy oferty, filmujemy budowy i liczymy wskaźniki rynkowe. Na publikacji nasza rola się kończy: dalej rozmawiasz bezpośrednio z deweloperem lub właścicielem, bez pośredników.' },
      { title: 'Czym Balinsky nie jest', body: 'Nie jesteśmy agencją nieruchomości ani pośrednikiem. Nie sprzedajemy obiektów, nie prowadzimy negocjacji, nie pobieramy prowizji, nie przyjmujemy depozytów, nie sporządzamy ani nie poświadczamy umów, nie organizujemy oglądania ani wyjazdów i nie świadczymy usług prawnych, notarialnych, podatkowych czy wizowych. Wszystko to robią same strony i zaangażowani przez nie specjaliści — deweloper lub właściciel, notariusz PPAT, prawnik.' },
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
    h1: 'Balinsky — що це і як ми працюємо',
    intro: 'Balinsky — незалежний сайт із даними про нерухомість Балі для іноземних покупців. Ми збираємо об’єкти десятків забудовників і ставимо поруч із кожним цифри, за якими його можна оцінити: ціна за м² проти району, скільки приносять схожі будинки поруч в оренді, скільки років лишилося за лізхолдом і який статус дозволів заявляє забудовник. Забудовник указаний на кожній сторінці — ви спілкуєтеся з ним напряму, не з нами.',

    h2Numbers: 'Цифри на сьогодні',
    numbersLead: 'Ці цифри оновлюються автоматично — те, що ви бачите на сайті, точно відповідає тому, що зараз опубліковано в базі даних.',
    statVillas: 'вілли та будинки',
    statApts: 'апартаменти',
    statComplexes: 'житлові комплекси',
    statDevs: 'забудовники',
    statMgrs: 'менеджерів забудовників',

    h2How: 'Що ми перевіряємо — і чого не перевіряємо',
    standards: [
      { Icon: FileSearch, title: 'Документи: статус, а не гарантія', body: 'Якщо забудовник повідомив номери PBG/SLF, тип землі (SHM/HGB/Hak Pakai) та умови лізхолду, ми показуємо їх у картці. Юридично ми їх не засвідчуємо: до оплати попросіть нотаріуса PPAT або юриста перевірити сертифікат і дозволи за офіційними реєстрами.' },
      { Icon: BookOpen, title: 'Цифри — з даних, метод відкритий', body: 'Порівняння цін рахуємо за нашим каталогом, ставки оренди — за тисячами об’єктів подобової оренди на Балі (джерело — estatemarket.io). У кожного розрахунку вказано розмір вибірки; якщо об’єктів менше 30, цифра позначена як орієнтовна. Увесь метод описаний на сторінці «Як ми рахуємо».' },
      { Icon: Video, title: 'Відео з майданчика', body: 'Багато проєктів ми знімаємо самі — дрон, хід будівництва, околиці. Ви бачите стан на відому дату, а не рендер.' },
      { Icon: UsersRound, title: 'Виправлення', body: 'Знайшли помилку в ціні, строку чи статусі дозволу? Напишіть боту: підтверджені помилки виправляємо й указуємо дату оновлення.' },
    ],

    h2Stack: 'Що ви отримуєте',
    stackItems: [
      { title: 'Ціни в USD у реальному часі', body: 'Ціни перераховуються за поточним курсом; перемикач валюти — у шапці. Порівняльний вигляд перераховується автоматично під час перемикання.' },
      { title: 'Як влаштована покупка', body: 'Етапи угоди, структури володіння, реальні витрати й підводні камені розібрані на сторінках «Як купити» та «Бронювання». Це довідковий матеріал, а не наша послуга: сама угода відбувається між вами і забудовником.' },
      { title: 'Прямі контакти забудовника', body: 'У кожного проєкту на сайті вказаний призначений менеджер забудовника з фото, мовами, Telegram і WhatsApp. Листування йде напряму з ним — Balinsky у ньому не бере участі й не модерує його.' },
      { title: 'Порівняння та обране', body: 'Будь-який обʼєкт зберігається до вашого обраного; вілли та апартаменти порівнюються за 14 параметрами інвесторського рівня в одній таблиці.' },
    ],

    h2Model: 'Яку роль відіграє Balinsky',
    model: [
      { title: 'Майданчик лише публікує', body: 'Ми збираємо об’єкти, знімаємо майданчики й рахуємо ринкові показники. На публікації роль сайту закінчується: далі ви спілкуєтеся із забудовником або власником напряму, без нас посередині.' },
      { title: 'Чим Balinsky не є', body: 'Ми не агентство нерухомості й не брокер. Ми не продаємо обʼєкти, не ведемо переговори, не беремо комісію, не приймаємо депозити, не готуємо й не посвідчуємо договори, не організовуємо покази й поїздки, не надаємо юридичних, нотаріальних, податкових і візових послуг. Усе це роблять самі сторони угоди та залучені ними фахівці — забудовник або власник, нотаріус PPAT, юрист.' },
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

          {/* Роль площадки и перечень того, чем она не является.
              Персональные данные оператора и любые утверждения о доходе
              здесь не публикуются по требованию владельца сайта. Блок
              стоит перед «историями покупателей», чтобы роль сайта
              читалась до любых упоминаний сделок. */}
          <section className="mb-14">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">{c.h2Model}</h2>
            <ul className="grid gap-3 md:grid-cols-2">
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
