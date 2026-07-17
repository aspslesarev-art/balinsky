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
  de: {
    home: 'Startseite',
    crumb: 'Über Balinsky',
    h1: 'Balinsky — was es ist und warum Sie ihm vertrauen können',
    intro: 'Balinsky ist ein Bali-Immobilienkatalog für ausländische Käufer: Villen, Apartments, Wohnanlagen und Vermietungen. Die Website listet Projekte von Bauträgern, deren Unterlagen wir persönlich geprüft, deren Standorte wir begangen und deren Objekte wir gefilmt haben. Preise werden in aktuellen USD angezeigt. Vertriebsmanager sind echte Menschen mit Foto, Bewertung und den Sprachen, die sie sprechen.',

    h2Numbers: 'Die Zahlen heute',
    numbersLead: 'Diese Zahlen aktualisieren sich automatisch — was Sie auf der Website sehen, ist genau das, was gerade in der Datenbank veröffentlicht ist.',
    statVillas: 'Villen und Häuser',
    statApts: 'Apartments',
    statComplexes: 'Wohnanlagen',
    statDevs: 'Bauträger',
    statMgrs: 'Manager erreichbar',

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
      { title: 'Transparenter Ablauf', body: 'Vom ersten „Reservieren“-Tippen bis zur Übergabe — jeder Schritt und Betrag ist auf den Seiten Reservierung und Kaufratgeber dokumentiert.' },
      { title: 'Erreichbarer Manager', body: 'Antwort auf Telegram / WhatsApp meist innerhalb einer Stunde während der Bali-Geschäftszeiten. Bei größeren Deals — ein Videoanruf, bevor eine Anzahlung fließt.' },
      { title: 'Vergleichen und Merkliste', body: 'Jedes Inserat wird in Ihrer Merkliste gespeichert; Villen und Apartments werden anhand von 14 investorenrelevanten Parametern in einer Tabelle verglichen.' },
    ],

    h2Cases: 'Käufer-Fallstudien',
    pCases: 'Wir sammeln Geschichten abgeschlossener Deals unserer Kunden — was sie suchten, wie sie suchten, wo die SPA-Verhandlung landete, was daraus wurde und welche Rendite heute tatsächlich erzielt wird. Jeder Fall ist anonymisiert — ohne Namen oder Adressen, aber mit echten Zahlen. Dieser Bereich wächst, sobald Kunden zustimmen zu teilen. Wenn Sie über Balinsky gekauft haben und Ihre Geschichte teilen möchten (anonym oder mit Namen — Ihre Wahl), schreiben Sie dem Bot — das dauert meist ein 20-minütiges Gespräch.',
    casesCta: 'Meine Kaufgeschichte teilen',

    h2Contact: 'Kontakt aufnehmen',
    pContact: 'Für alles — den Katalog, eine bestimmte Immobilie, Due Diligence, Videoaufnahmen für Ihre eigene Villa — schreiben Sie dem Bot auf Telegram. Wenn Telegram unpraktisch ist, steht die E-Mail im Footer der Website.',
    contactBot: 'Dem Bot schreiben',
    contactGuide: 'Zuerst den Kaufratgeber lesen',
  },
  zh: {
    home: '首页',
    crumb: '关于 Balinsky',
    h1: 'Balinsky——它是什么，以及为什么您可以信任它',
    intro: 'Balinsky 是面向外国买家的巴厘岛房产目录：别墅、公寓、住宅区和租赁。本站列出的项目来自我们亲自核验过文件、实地走访过地块并拍摄过实景的开发商。价格以当前美元显示。销售经理是真实的人，配有照片、评分及所讲语言。',

    h2Numbers: '今日数据',
    numbersLead: '这些数字自动更新——您在网站上看到的，正是数据库当前发布的内容。',
    statVillas: '别墅和房屋',
    statApts: '公寓',
    statComplexes: '住宅区',
    statDevs: '开发商',
    statMgrs: '在线经理',

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
      { title: '透明的流程', body: '从第一次点击"预订"到交付——每一步和每一笔金额都记录在预订页和购买指南页上。' },
      { title: '在线经理', body: '在巴厘岛工作时间内，Telegram / WhatsApp 通常一小时内回复。大额交易——在任何定金转出前先视频通话。' },
      { title: '对比与候选清单', body: '任何房源都可保存到您的候选清单；别墅和公寓在一张表中按 14 项投资级参数进行对比。' },
    ],

    h2Cases: '买家案例',
    pCases: '我们正在收集客户的成交案例——他们在找什么、如何寻找、SPA 谈判落在何处、最终结果如何，以及如今的实际收益。每个案例均已匿名——没有姓名或地址，但有真实数字。随着客户同意分享，本栏目会不断充实。如果您通过 Balinsky 购买并愿意分享您的故事（匿名或署名——由您决定），请给机器人留言——通常需要 20 分钟的通话。',
    casesCta: '分享我的购买故事',

    h2Contact: '联系我们',
    pContact: '任何事宜——目录、某处具体房产、尽职调查、为您自己的别墅拍摄视频——都请在 Telegram 上给机器人留言。如果 Telegram 不方便，邮箱在网站页脚。',
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
    statMgrs: 'managers bereikbaar',

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
      { title: 'Transparant traject', body: 'Van de eerste "reserveren"-tik tot de oplevering — elke stap en elk bedrag is gedocumenteerd op de pagina\'s Reservering en Koopgids.' },
      { title: 'Bereikbare manager', body: 'Antwoord op Telegram / WhatsApp meestal binnen een uur tijdens Bali-kantooruren. Voor grotere deals — een videogesprek voordat er een aanbetaling gaat.' },
      { title: 'Vergelijken en shortlist', body: "Elk aanbod wordt in uw shortlist bewaard; villa's en appartementen worden op 14 investeringsparameters in één tabel vergeleken." },
    ],

    h2Cases: 'Klantcasussen',
    pCases: 'We verzamelen verhalen van afgesloten deals van onze klanten — wat ze zochten, hoe ze zochten, waar de SPA-onderhandeling uitkwam, wat eruit voortkwam en het werkelijke rendement vandaag. Elke casus is geanonimiseerd — zonder namen of adressen, maar met echte cijfers. Deze sectie groeit naarmate klanten instemmen om te delen. Als u via Balinsky heeft gekocht en uw verhaal wilt delen (anoniem of met naam — uw keuze), stuur de bot een bericht — het kost meestal een gesprek van 20 minuten.',
    casesCta: 'Mijn koopverhaal delen',

    h2Contact: 'Neem contact op',
    pContact: 'Voor alles — de catalogus, een specifiek object, due diligence, video-opnames voor uw eigen villa — stuur de bot een bericht op Telegram. Als Telegram onhandig is, staat het e-mailadres in de footer van de site.',
    contactBot: 'Bericht de bot',
    contactGuide: 'Lees eerst de koopgids',
  },
  ban: {
    home: 'Beranda',
    crumb: 'Indik Balinsky',
    h1: 'Balinsky — napi puniki tur ngudiang dados kapracaya',
    intro: 'Balinsky inggih punika katalog properti Bali buat pameli saking dura negara: vila, apartemen, kompleks hunian, miwah sewa. Situs puniki nyantenang proyek saking pangwangun sane dokumenipun sampun periksa titiang padidi, genahipun sampun rauhin titiang, tur objekipun sampun rekam titiang. Aji kasantenang ring USD kekinian. Manajer penjualan inggih punika jadma sujati sareng foto, peringkat, miwah basa sane kaanggen.',

    h2Numbers: 'Angka rahinane mangkin',
    numbersLead: 'Angka-angka puniki kaperbarui otomatis — sane cingak Ragane ring situs pateh sareng sane kapublikasi ring basis data mangkin.',
    statVillas: 'vila miwah umah',
    statApts: 'apartemen',
    statComplexes: 'kompleks hunian',
    statDevs: 'pangwangun',
    statMgrs: 'manajer siap kahubungin',

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
      { title: 'Alur sane transparan', body: 'Saking ketukan "reservasi" kaping pertama kantos serah terima — sabilang langkah miwah jumlah kadokumentasi ring lembar Reservasi miwah Tuntunan Numbas.' },
      { title: 'Manajer siap kahubungin', body: 'Waled Telegram / WhatsApp biasane sajeroning ajam sajeroning jam kerja Bali. Buat transaksi ageng — telpon video sadurung deposit kakirim.' },
      { title: 'Pabandingan miwah daftar cutet', body: 'Sabilang listing kasimpen ring daftar cutet Ragane; vila miwah apartemen kabandingang manut 14 parameter kelas investor ring satu tabel.' },
    ],

    h2Cases: 'Studi kasus pameli',
    pCases: 'Titiang ngumpulang carita transaksi sane sampun puput saking klien titiang — napi sane karereh, sapunapi ngrereh, ring dija negosiasi SPA rauh, napi asilipun, miwah imbal hasil sujati rahinane mangkin. Sabilang kasus kaanonimang — nenten wenten wasta utawi alamat, sakewanten sareng angka sujati. Bagian puniki jagi nincap manut klien sane cumpu maang. Yening Ragane numbas lewat Balinsky tur meled maang carita (anonim utawi sareng wasta — manut pikayun Ragane), kirim pesan ka bot — biasane ngamerluang telpon 20 menit.',
    casesCta: 'Maang carita numbas titiang',

    h2Contact: 'Ngwentenang kontak',
    pContact: 'Buat sakancan — katalog, properti tinutu, due diligence, ngrekam video buat vila Ragane padidi — kirim pesan ka bot ring Telegram. Yening Telegram nenten nyaman, email wenten ring footer situs.',
    contactBot: 'Kirim pesan ka bot',
    contactGuide: 'Wacen dumun tuntunan numbas',
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
