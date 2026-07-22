'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, X, Trash2, Send, Sparkle, Download, Loader2, UserRound, ChevronLeft, AlertTriangle } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ShortlistSeoContent } from './ShortlistSeoContent'
import { useWishlist } from './WishlistContext'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import { classifyLandUse } from '@/lib/land-use'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import type { WishlistItem } from '@/lib/wishlist'

const COPY = {
  ru: {
    home: 'Главная',
    crumb: 'Избранное',
    h1: 'Избранное',
    intro: 'Виллы и апартаменты в продаже сравниваются в таблице. Жилые комплексы и долгосрочная аренда — отдельными блоками карточек. ✦ — лучший показатель в строке (минимальная цена, длиннее лизхолд, выше доходность и так далее).',
    sectionRental: 'Долгосрочная аренда',
    perMonth: '/ мес',
    bestLabel: 'Лучший показатель в строке',
    sectionRealEstate: 'Виллы и апартаменты',
    sectionComplexes: 'Жилые комплексы',
    bedrooms: 'BR',
    empty: 'Пока ничего не добавлено. Откройте каталог и нажмите на сердце у любого объекта.',
    countOne: 'объект', countFew: 'объекта', countMany: 'объектов',
    clear: 'Очистить всё',
    sendToBot: 'Отправить в Telegram',
    downloadPdf: 'Скачать PDF',
    pdfLimit: (max: number) => `PDF можно скачать, если в подборке не больше ${max} объектов`,
    pdfTooMany: (max: number) => `PDF доступен для подборок до ${max} объектов — уберите лишнее`,
    remove: 'Убрать',
    pdfModalTitle: 'Скачать подборку',
    pdfModalIntro: 'Выберите формат и вариант. Горизонтальный — для экрана, вертикальный — под телефон.',
    pdfOrientLandscape: 'Горизонтально',
    pdfOrientPortrait: 'Для телефона',
    pdfSimple: 'Скачать',
    pdfSimpleNote: 'PDF с карточками объектов и таблицей сравнения',
    pdfAgent: 'Скачать для агента',
    pdfAgentNote: 'На последней странице — ваши имя, Telegram и WhatsApp',
    pdfBack: 'К выбору варианта',
    pdfAgentIntro: 'Ваши контакты попадут на последнюю страницу PDF — клиент сможет связаться напрямую.',
    pdfFieldName: 'Имя',
    pdfFieldTg: 'Telegram',
    pdfFieldWa: 'WhatsApp',
    pdfBuilding: 'Собираем PDF…',
    pdfNeedContact: 'Укажите Telegram или WhatsApp — хотя бы один контакт.',
    pdfError: 'Не получилось собрать PDF. Попробуйте ещё раз.',
    pdfClose: 'Закрыть',
    landWarnTitle: 'Земля не для посуточной аренды',
    landWarnBody: (titles: string) => `В подборке есть объект на земле, официально не предназначенной для посуточной аренды: ${titles}. Уточните легальный статус сдачи у застройщика — это влияет на доходность от Booking/Airbnb.`,
    villasLink: 'К виллам',
    apartmentsLink: 'К апартаментам',
    complexesLink: 'К жилым комплексам',
    rowKind: 'Тип', rowPrice: 'Цена', rowPriceM2: 'Цена за м²', rowPriceM2Year: 'Цена м² / год',
    rowBedrooms: 'Спальни', rowArea: 'Площадь',
    rowLand: 'Земля', rowDistrict: 'Район', rowFloor: 'Этаж',
    rowCompletion: 'Сдача', rowStatus: 'Статус стройки',
    rowDealType: 'Тип сделки', rowLease: 'Лизхолд', rowPermit: 'Разрешение',
    rowYield: 'Заявленная доходность', rowLandUse: 'Назначение земли',
    rowDeveloper: 'Застройщик',
    rowBestRoi: 'ROI (наш расчёт)',
    rowStyle: 'Стиль интерьера',
    sqm: 'м²', years: 'лет',
    devReady: (n: number) => `${n} сдано`,
    devInProgress: (n: number) => `${n} строится`,
    readinessLabel: 'Готовность',
    dealResale: 'Перепродажа', dealSecondary: 'Вторичка', dealPrimary: 'От застройщика',
  },
  en: {
    home: 'Home',
    crumb: 'Shortlist',
    h1: 'Shortlist',
    intro: 'Villas and apartments for sale compare in one table. Residential complexes and long-term rentals get their own card blocks. ✦ marks the best value in each row (lowest price, longest lease, highest yield and so on).',
    sectionRental: 'Long-term rental',
    perMonth: '/ mo',
    bestLabel: 'Best in row',
    sectionRealEstate: 'Villas & apartments',
    sectionComplexes: 'Residential complexes',
    bedrooms: 'BR',
    empty: 'Nothing saved yet. Open a catalogue and tap the heart on any listing.',
    countOne: 'item', countFew: 'items', countMany: 'items',
    clear: 'Clear all',
    sendToBot: 'Send to Telegram',
    downloadPdf: 'Download PDF',
    pdfLimit: (max: number) => `PDF download is available when the shortlist has up to ${max} listings`,
    pdfTooMany: (max: number) => `PDF is available for shortlists up to ${max} listings — remove some first`,
    remove: 'Remove',
    pdfModalTitle: 'Download shortlist',
    pdfModalIntro: 'Pick a format. Landscape suits screens, portrait suits phones.',
    pdfOrientLandscape: 'Landscape',
    pdfOrientPortrait: 'Portrait',
    pdfSimple: 'Download',
    pdfSimpleNote: 'PDF with listing cards and a comparison table',
    pdfAgent: 'Download for agent',
    pdfAgentNote: 'Last page carries your name, Telegram and WhatsApp',
    pdfBack: 'Back to options',
    pdfAgentIntro: 'Your contacts go onto the last page of the PDF — the client can reach you directly.',
    pdfFieldName: 'Name',
    pdfFieldTg: 'Telegram',
    pdfFieldWa: 'WhatsApp',
    pdfBuilding: 'Building PDF…',
    pdfNeedContact: 'Add Telegram or WhatsApp — at least one contact.',
    pdfError: 'Could not build the PDF. Please try again.',
    pdfClose: 'Close',
    landWarnTitle: 'Land not zoned for daily rental',
    landWarnBody: (titles: string) => `Your shortlist contains a listing on land not officially zoned for daily rental: ${titles}. Verify the legal rental status with the developer — it affects revenue from Booking/Airbnb.`,
    villasLink: 'Browse villas',
    apartmentsLink: 'Browse apartments',
    complexesLink: 'Browse complexes',
    rowKind: 'Type', rowPrice: 'Price', rowPriceM2: 'Price / m²', rowPriceM2Year: 'Price m² / year',
    rowBedrooms: 'Bedrooms', rowArea: 'Area',
    rowLand: 'Land', rowDistrict: 'District', rowFloor: 'Floor',
    rowCompletion: 'Completion', rowStatus: 'Build status',
    rowDealType: 'Deal', rowLease: 'Leasehold', rowPermit: 'Permit',
    rowYield: 'Claimed yield', rowLandUse: 'Land use',
    rowDeveloper: 'Developer',
    rowBestRoi: 'ROI (our estimate)',
    rowStyle: 'Interior style',
    sqm: 'm²', years: 'yrs',
    devReady: (n: number) => `${n} delivered`,
    devInProgress: (n: number) => `${n} in progress`,
    readinessLabel: 'Readiness',
    dealResale: 'Resale', dealSecondary: 'Secondary', dealPrimary: 'Developer',
  },
  id: {
    home: 'Beranda',
    crumb: 'Favorit',
    h1: 'Favorit',
    intro: 'Vila dan apartemen yang dijual dibandingkan dalam satu tabel. Kompleks hunian dan sewa jangka panjang memiliki blok kartu tersendiri. ✦ menandai nilai terbaik di setiap baris (harga terendah, masa sewa terpanjang, imbal hasil tertinggi, dan seterusnya).',
    sectionRental: 'Sewa jangka panjang',
    perMonth: '/ bln',
    bestLabel: 'Terbaik di baris',
    sectionRealEstate: 'Vila & apartemen',
    sectionComplexes: 'Kompleks hunian',
    bedrooms: 'KT',
    empty: 'Belum ada yang disimpan. Buka katalog dan ketuk ikon hati pada objek mana pun.',
    countOne: 'objek', countFew: 'objek', countMany: 'objek',
    clear: 'Hapus semua',
    sendToBot: 'Kirim ke Telegram',
    downloadPdf: 'Unduh PDF',
    pdfLimit: (max: number) => `Unduhan PDF tersedia jika daftar berisi maksimal ${max} objek`,
    pdfTooMany: (max: number) => `PDF tersedia untuk daftar hingga ${max} objek — hapus sebagian dulu`,
    remove: 'Hapus',
    pdfModalTitle: 'Unduh daftar',
    pdfModalIntro: 'Pilih format. Lanskap cocok untuk layar, potret cocok untuk ponsel.',
    pdfOrientLandscape: 'Lanskap',
    pdfOrientPortrait: 'Potret',
    pdfSimple: 'Unduh',
    pdfSimpleNote: 'PDF berisi kartu objek dan tabel perbandingan',
    pdfAgent: 'Unduh untuk agen',
    pdfAgentNote: 'Halaman terakhir memuat nama, Telegram, dan WhatsApp Anda',
    pdfBack: 'Kembali ke pilihan',
    pdfAgentIntro: 'Kontak Anda akan muncul di halaman terakhir PDF — klien dapat menghubungi Anda langsung.',
    pdfFieldName: 'Nama',
    pdfFieldTg: 'Telegram',
    pdfFieldWa: 'WhatsApp',
    pdfBuilding: 'Menyusun PDF…',
    pdfNeedContact: 'Tambahkan Telegram atau WhatsApp — minimal satu kontak.',
    pdfError: 'Gagal menyusun PDF. Silakan coba lagi.',
    pdfClose: 'Tutup',
    landWarnTitle: 'Tanah tidak diperuntukkan bagi sewa harian',
    landWarnBody: (titles: string) => `Daftar Anda berisi objek di atas tanah yang tidak secara resmi diperuntukkan bagi sewa harian: ${titles}. Periksa status sewa legal dengan pengembang — ini memengaruhi pendapatan dari Booking/Airbnb.`,
    villasLink: 'Lihat vila',
    apartmentsLink: 'Lihat apartemen',
    complexesLink: 'Lihat kompleks',
    rowKind: 'Tipe', rowPrice: 'Harga', rowPriceM2: 'Harga / m²', rowPriceM2Year: 'Harga m² / tahun',
    rowBedrooms: 'Kamar tidur', rowArea: 'Luas',
    rowLand: 'Luas tanah', rowDistrict: 'Kawasan', rowFloor: 'Lantai',
    rowCompletion: 'Serah terima', rowStatus: 'Status pembangunan',
    rowDealType: 'Transaksi', rowLease: 'Hak sewa', rowPermit: 'Izin',
    rowYield: 'Imbal hasil klaim', rowLandUse: 'Peruntukan tanah',
    rowDeveloper: 'Pengembang',
    rowBestRoi: 'ROI (estimasi kami)',
    rowStyle: 'Gaya interior',
    sqm: 'm²', years: 'thn',
    devReady: (n: number) => `${n} selesai`,
    devInProgress: (n: number) => `${n} dibangun`,
    readinessLabel: 'Kesiapan',
    dealResale: 'Jual kembali', dealSecondary: 'Sekunder', dealPrimary: 'Pengembang',
  },
  fr: {
    home: 'Accueil',
    crumb: 'Sélection',
    h1: 'Sélection',
    intro: 'Les villas et appartements à vendre se comparent dans un seul tableau. Les résidences et les locations longue durée ont leurs propres blocs de fiches. ✦ indique la meilleure valeur de chaque ligne (prix le plus bas, bail le plus long, rendement le plus élevé, etc.).',
    sectionRental: 'Location longue durée',
    perMonth: '/ mois',
    bestLabel: 'Meilleur de la ligne',
    sectionRealEstate: 'Villas & appartements',
    sectionComplexes: 'Résidences',
    bedrooms: 'ch.',
    empty: "Rien d'enregistré pour l'instant. Ouvrez un catalogue et touchez le cœur sur une annonce.",
    countOne: 'bien', countFew: 'biens', countMany: 'biens',
    clear: 'Tout effacer',
    sendToBot: 'Envoyer sur Telegram',
    downloadPdf: 'Télécharger le PDF',
    pdfLimit: (max: number) => `Le téléchargement PDF est disponible lorsque la sélection contient au maximum ${max} annonces`,
    pdfTooMany: (max: number) => `Le PDF est disponible pour les sélections jusqu'à ${max} annonces — retirez-en d'abord`,
    remove: 'Retirer',
    pdfModalTitle: 'Télécharger la sélection',
    pdfModalIntro: 'Choisissez un format. Le paysage convient aux écrans, le portrait aux téléphones.',
    pdfOrientLandscape: 'Paysage',
    pdfOrientPortrait: 'Portrait',
    pdfSimple: 'Télécharger',
    pdfSimpleNote: 'PDF avec fiches des annonces et tableau comparatif',
    pdfAgent: "Télécharger pour l'agent",
    pdfAgentNote: 'La dernière page indique votre nom, Telegram et WhatsApp',
    pdfBack: 'Retour aux options',
    pdfAgentIntro: 'Vos coordonnées figurent sur la dernière page du PDF — le client peut vous contacter directement.',
    pdfFieldName: 'Nom',
    pdfFieldTg: 'Telegram',
    pdfFieldWa: 'WhatsApp',
    pdfBuilding: 'Génération du PDF…',
    pdfNeedContact: 'Ajoutez Telegram ou WhatsApp — au moins un contact.',
    pdfError: 'Impossible de générer le PDF. Veuillez réessayer.',
    pdfClose: 'Fermer',
    landWarnTitle: 'Terrain non zoné pour la location journalière',
    landWarnBody: (titles: string) => `Votre sélection contient une annonce sur un terrain non officiellement zoné pour la location journalière : ${titles}. Vérifiez le statut locatif légal auprès du promoteur — cela influe sur les revenus de Booking/Airbnb.`,
    villasLink: 'Voir les villas',
    apartmentsLink: 'Voir les appartements',
    complexesLink: 'Voir les résidences',
    rowKind: 'Type', rowPrice: 'Prix', rowPriceM2: 'Prix / m²', rowPriceM2Year: 'Prix m² / an',
    rowBedrooms: 'Chambres', rowArea: 'Surface',
    rowLand: 'Terrain', rowDistrict: 'Quartier', rowFloor: 'Étage',
    rowCompletion: 'Livraison', rowStatus: 'État des travaux',
    rowDealType: 'Transaction', rowLease: 'Bail', rowPermit: 'Permis',
    rowYield: 'Rendement annoncé', rowLandUse: 'Usage du terrain',
    rowDeveloper: 'Promoteur',
    rowBestRoi: 'ROI (notre estimation)',
    rowStyle: 'Style intérieur',
    sqm: 'm²', years: 'ans',
    devReady: (n: number) => `${n} livrés`,
    devInProgress: (n: number) => `${n} en cours`,
    readinessLabel: 'Avancement',
    dealResale: 'Revente', dealSecondary: 'Secondaire', dealPrimary: 'Promoteur',
  },
  de: {
    home: 'Startseite',
    crumb: 'Merkliste',
    h1: 'Merkliste',
    intro: 'Villen und Apartments zum Verkauf werden in einer Tabelle verglichen. Wohnanlagen und Langzeitmieten erhalten eigene Kartenblöcke. ✦ markiert den besten Wert in jeder Zeile (niedrigster Preis, längste Pacht, höchste Rendite und so weiter).',
    sectionRental: 'Langzeitmiete',
    perMonth: '/ Mon.',
    bestLabel: 'Bester Wert der Zeile',
    sectionRealEstate: 'Villen & Apartments',
    sectionComplexes: 'Wohnanlagen',
    bedrooms: 'SZ',
    empty: 'Noch nichts gespeichert. Öffnen Sie einen Katalog und tippen Sie bei einem Objekt auf das Herz.',
    countOne: 'Objekt', countFew: 'Objekte', countMany: 'Objekte',
    clear: 'Alle löschen',
    sendToBot: 'An Telegram senden',
    downloadPdf: 'PDF herunterladen',
    pdfLimit: (max: number) => `Der PDF-Download ist verfügbar, wenn die Merkliste höchstens ${max} Objekte enthält`,
    pdfTooMany: (max: number) => `Das PDF ist für Merklisten mit bis zu ${max} Objekten verfügbar — entfernen Sie zuerst einige`,
    remove: 'Entfernen',
    pdfModalTitle: 'Merkliste herunterladen',
    pdfModalIntro: 'Wählen Sie ein Format. Querformat passt zu Bildschirmen, Hochformat zu Telefonen.',
    pdfOrientLandscape: 'Querformat',
    pdfOrientPortrait: 'Hochformat',
    pdfSimple: 'Herunterladen',
    pdfSimpleNote: 'PDF mit Objektkarten und einer Vergleichstabelle',
    pdfAgent: 'Für Makler herunterladen',
    pdfAgentNote: 'Die letzte Seite enthält Ihren Namen, Telegram und WhatsApp',
    pdfBack: 'Zurück zu den Optionen',
    pdfAgentIntro: 'Ihre Kontaktdaten stehen auf der letzten Seite des PDF — der Kunde kann Sie direkt erreichen.',
    pdfFieldName: 'Name',
    pdfFieldTg: 'Telegram',
    pdfFieldWa: 'WhatsApp',
    pdfBuilding: 'PDF wird erstellt…',
    pdfNeedContact: 'Fügen Sie Telegram oder WhatsApp hinzu — mindestens einen Kontakt.',
    pdfError: 'Das PDF konnte nicht erstellt werden. Bitte versuchen Sie es erneut.',
    pdfClose: 'Schließen',
    landWarnTitle: 'Grundstück nicht für Tagesvermietung ausgewiesen',
    landWarnBody: (titles: string) => `Ihre Merkliste enthält ein Objekt auf einem Grundstück, das nicht offiziell für die Tagesvermietung ausgewiesen ist: ${titles}. Prüfen Sie den rechtlichen Mietstatus beim Bauträger — er wirkt sich auf die Einnahmen von Booking/Airbnb aus.`,
    villasLink: 'Villen ansehen',
    apartmentsLink: 'Apartments ansehen',
    complexesLink: 'Wohnanlagen ansehen',
    rowKind: 'Typ', rowPrice: 'Preis', rowPriceM2: 'Preis / m²', rowPriceM2Year: 'Preis m² / Jahr',
    rowBedrooms: 'Schlafzimmer', rowArea: 'Fläche',
    rowLand: 'Grundstück', rowDistrict: 'Lage', rowFloor: 'Etage',
    rowCompletion: 'Fertigstellung', rowStatus: 'Baustatus',
    rowDealType: 'Geschäft', rowLease: 'Leasehold', rowPermit: 'Genehmigung',
    rowYield: 'Angegebene Rendite', rowLandUse: 'Grundstücksnutzung',
    rowDeveloper: 'Bauträger',
    rowBestRoi: 'ROI (unsere Schätzung)',
    rowStyle: 'Interieurstil',
    sqm: 'm²', years: 'J.',
    devReady: (n: number) => `${n} fertiggestellt`,
    devInProgress: (n: number) => `${n} im Bau`,
    readinessLabel: 'Fertigstellungsgrad',
    dealResale: 'Weiterverkauf', dealSecondary: 'Zweitmarkt', dealPrimary: 'Bauträger',
  },
  zh: {
    home: '首页',
    crumb: '收藏',
    h1: '收藏',
    intro: '在售别墅和公寓在一张表格中对比。住宅区和长租各有独立的卡片区块。✦ 标记每行的最佳值（最低价格、最长租期、最高收益率等）。',
    sectionRental: '长期租赁',
    perMonth: '/ 月',
    bestLabel: '本行最佳',
    sectionRealEstate: '别墅和公寓',
    sectionComplexes: '住宅区',
    bedrooms: '卧室',
    empty: '尚未收藏。打开目录并点击任意房源上的爱心。',
    countOne: '项', countFew: '项', countMany: '项',
    clear: '全部清除',
    sendToBot: '发送到 Telegram',
    downloadPdf: '下载 PDF',
    pdfLimit: (max: number) => `当收藏不超过 ${max} 项时可下载 PDF`,
    pdfTooMany: (max: number) => `PDF 仅支持最多 ${max} 项的收藏 — 请先移除一些`,
    remove: '移除',
    pdfModalTitle: '下载收藏',
    pdfModalIntro: '选择格式。横版适合屏幕，竖版适合手机。',
    pdfOrientLandscape: '横版',
    pdfOrientPortrait: '竖版',
    pdfSimple: '下载',
    pdfSimpleNote: '包含房源卡片和对比表的 PDF',
    pdfAgent: '为代理下载',
    pdfAgentNote: '最后一页会显示您的姓名、Telegram 和 WhatsApp',
    pdfBack: '返回选项',
    pdfAgentIntro: '您的联系方式将出现在 PDF 的最后一页 — 客户可直接联系您。',
    pdfFieldName: '姓名',
    pdfFieldTg: 'Telegram',
    pdfFieldWa: 'WhatsApp',
    pdfBuilding: '正在生成 PDF…',
    pdfNeedContact: '请添加 Telegram 或 WhatsApp — 至少一项联系方式。',
    pdfError: '无法生成 PDF，请重试。',
    pdfClose: '关闭',
    landWarnTitle: '土地未划为日租用途',
    landWarnBody: (titles: string) => `您的收藏中包含位于未正式划为日租用途土地上的房源：${titles}。请向开发商核实合法出租状态 — 这会影响 Booking/Airbnb 的收入。`,
    villasLink: '浏览别墅',
    apartmentsLink: '浏览公寓',
    complexesLink: '浏览住宅区',
    rowKind: '类型', rowPrice: '价格', rowPriceM2: '每平方米价格', rowPriceM2Year: '每平方米 / 年价格',
    rowBedrooms: '卧室', rowArea: '面积',
    rowLand: '土地', rowDistrict: '地区', rowFloor: '楼层',
    rowCompletion: '交付', rowStatus: '施工状态',
    rowDealType: '交易', rowLease: '租赁产权', rowPermit: '许可',
    rowYield: '宣称收益率', rowLandUse: '土地用途',
    rowDeveloper: '开发商',
    rowBestRoi: 'ROI（我们的估算）',
    rowStyle: '室内风格',
    sqm: 'm²', years: '年',
    devReady: (n: number) => `${n} 已交付`,
    devInProgress: (n: number) => `${n} 在建`,
    readinessLabel: '完工度',
    dealResale: '转售', dealSecondary: '二手', dealPrimary: '开发商',
  },
  nl: {
    home: 'Home',
    crumb: 'Favorieten',
    h1: 'Favorieten',
    intro: "Villa's en appartementen te koop worden in één tabel vergeleken. Wooncomplexen en langetermijnverhuur krijgen hun eigen kaartblokken. ✦ markeert de beste waarde in elke rij (laagste prijs, langste erfpacht, hoogste rendement enzovoort).",
    sectionRental: 'Langetermijnverhuur',
    perMonth: '/ mnd',
    bestLabel: 'Beste in rij',
    sectionRealEstate: "Villa's & appartementen",
    sectionComplexes: 'Wooncomplexen',
    bedrooms: 'SK',
    empty: 'Nog niets opgeslagen. Open een catalogus en tik op het hartje bij een object.',
    countOne: 'object', countFew: 'objecten', countMany: 'objecten',
    clear: 'Alles wissen',
    sendToBot: 'Naar Telegram sturen',
    downloadPdf: 'PDF downloaden',
    pdfLimit: (max: number) => `PDF-download is beschikbaar wanneer de favorietenlijst maximaal ${max} objecten bevat`,
    pdfTooMany: (max: number) => `PDF is beschikbaar voor lijsten tot ${max} objecten — verwijder er eerst enkele`,
    remove: 'Verwijderen',
    pdfModalTitle: 'Favorieten downloaden',
    pdfModalIntro: 'Kies een formaat. Liggend past bij schermen, staand bij telefoons.',
    pdfOrientLandscape: 'Liggend',
    pdfOrientPortrait: 'Staand',
    pdfSimple: 'Downloaden',
    pdfSimpleNote: 'PDF met objectkaarten en een vergelijkingstabel',
    pdfAgent: 'Downloaden voor makelaar',
    pdfAgentNote: 'De laatste pagina bevat uw naam, Telegram en WhatsApp',
    pdfBack: 'Terug naar opties',
    pdfAgentIntro: 'Uw contactgegevens komen op de laatste pagina van de PDF — de klant kan u rechtstreeks bereiken.',
    pdfFieldName: 'Naam',
    pdfFieldTg: 'Telegram',
    pdfFieldWa: 'WhatsApp',
    pdfBuilding: 'PDF wordt gemaakt…',
    pdfNeedContact: 'Voeg Telegram of WhatsApp toe — minstens één contact.',
    pdfError: 'Kon de PDF niet maken. Probeer het opnieuw.',
    pdfClose: 'Sluiten',
    landWarnTitle: 'Grond niet bestemd voor dagverhuur',
    landWarnBody: (titles: string) => `Uw favorietenlijst bevat een object op grond die niet officieel bestemd is voor dagverhuur: ${titles}. Verifieer de wettelijke verhuurstatus bij de ontwikkelaar — dit beïnvloedt de inkomsten uit Booking/Airbnb.`,
    villasLink: "Villa's bekijken",
    apartmentsLink: 'Appartementen bekijken',
    complexesLink: 'Complexen bekijken',
    rowKind: 'Type', rowPrice: 'Prijs', rowPriceM2: 'Prijs / m²', rowPriceM2Year: 'Prijs m² / jaar',
    rowBedrooms: 'Slaapkamers', rowArea: 'Oppervlakte',
    rowLand: 'Grond', rowDistrict: 'Regio', rowFloor: 'Verdieping',
    rowCompletion: 'Oplevering', rowStatus: 'Bouwstatus',
    rowDealType: 'Transactie', rowLease: 'Erfpacht', rowPermit: 'Vergunning',
    rowYield: 'Opgegeven rendement', rowLandUse: 'Grondgebruik',
    rowDeveloper: 'Ontwikkelaar',
    rowBestRoi: 'ROI (onze schatting)',
    rowStyle: 'Interieurstijl',
    sqm: 'm²', years: 'jr',
    devReady: (n: number) => `${n} opgeleverd`,
    devInProgress: (n: number) => `${n} in aanbouw`,
    readinessLabel: 'Gereedheid',
    dealResale: 'Doorverkoop', dealSecondary: 'Bestaand', dealPrimary: 'Ontwikkelaar',
  },
  ban: {
    home: 'Beranda',
    crumb: 'Sane Kasenengin',
    h1: 'Sane Kasenengin',
    intro: 'Vila lan apartemen sane kaadol kabandingang ring asiki tabel. Kompleks hunian lan sewa jangka panjang madue blok kartu niri. ✦ nyihnayang nilai pinih becik ring soang-soang baris (aji pinih andap, sewa pinih suwe, imbal hasil pinih tegeh, miwah sane lianan).',
    sectionRental: 'Sewa jangka panjang',
    perMonth: '/ bln',
    bestLabel: 'Pinih becik ring baris',
    sectionRealEstate: 'Vila & apartemen',
    sectionComplexes: 'Kompleks hunian',
    bedrooms: 'KT',
    empty: 'Durung wenten sane kasimpen. Bukak katalog raris tekan gambar hati ring objek sane kapilih.',
    countOne: 'objek', countFew: 'objek', countMany: 'objek',
    clear: 'Kosongang makasami',
    sendToBot: 'Kirim ka Telegram',
    downloadPdf: 'Unduh PDF',
    pdfLimit: (max: number) => `Unduhan PDF wenten yening daftar madaging paling akeh ${max} objek`,
    pdfTooMany: (max: number) => `PDF wenten anggen daftar kantos ${max} objek — kaonang dumun makudang`,
    remove: 'Kaonang',
    pdfModalTitle: 'Unduh daftar',
    pdfModalIntro: 'Pilih format. Lanskap cocok anggen layar, potret cocok anggen telepon.',
    pdfOrientLandscape: 'Lanskap',
    pdfOrientPortrait: 'Potret',
    pdfSimple: 'Unduh',
    pdfSimpleNote: 'PDF madaging kartu objek lan tabel bandingan',
    pdfAgent: 'Unduh anggen agen',
    pdfAgentNote: 'Kaca sane pamuput madaging wasta, Telegram, lan WhatsApp Ragane',
    pdfBack: 'Mawali ka pilihan',
    pdfAgentIntro: 'Kontak Ragane jagi medal ring kaca pamuput PDF — klien dados nghubungin Ragane langsung.',
    pdfFieldName: 'Wasta',
    pdfFieldTg: 'Telegram',
    pdfFieldWa: 'WhatsApp',
    pdfBuilding: 'Ngwangun PDF…',
    pdfNeedContact: 'Tambahin Telegram utawi WhatsApp — paling akidik asiki kontak.',
    pdfError: 'Nenten prasida ngwangun PDF. Ngiring cobain malih.',
    pdfClose: 'Tutup',
    landWarnTitle: 'Tanah nenten anggen sewa arahina',
    landWarnBody: (titles: string) => `Daftar Ragane madaging objek ring tanah sane nenten resmi kaanggen sewa arahina: ${titles}. Cek status sewa legal ring pangwangun — puniki mapengaruh ring pikolih saking Booking/Airbnb.`,
    villasLink: 'Cingak vila',
    apartmentsLink: 'Cingak apartemen',
    complexesLink: 'Cingak kompleks',
    rowKind: 'Tipe', rowPrice: 'Aji', rowPriceM2: 'Aji / m²', rowPriceM2Year: 'Aji m² / warsa',
    rowBedrooms: 'Kamar', rowArea: 'Luas',
    rowLand: 'Tanah', rowDistrict: 'Genah', rowFloor: 'Lantai',
    rowCompletion: 'Serah terima', rowStatus: 'Status pembangunan',
    rowDealType: 'Transaksi', rowLease: 'Hak sewa', rowPermit: 'Ijin',
    rowYield: 'Imbal hasil klaim', rowLandUse: 'Peruntukan tanah',
    rowDeveloper: 'Pangwangun',
    rowBestRoi: 'ROI (estimasi tiang)',
    rowStyle: 'Gaya interior',
    sqm: 'm²', years: 'warsa',
    devReady: (n: number) => `${n} puput`,
    devInProgress: (n: number) => `${n} kawangun`,
    readinessLabel: 'Kesiapan',
    dealResale: 'Adol malih', dealSecondary: 'Sekunder', dealPrimary: 'Pangwangun',
  },
  pl: {
    home: 'Strona główna',
    crumb: 'Lista życzeń',
    h1: 'Lista życzeń',
    intro: 'Wille i apartamenty na sprzedaż porównujesz w jednej tabeli. Kompleksy mieszkaniowe i wynajem długoterminowy mają własne bloki kart. ✦ oznacza najlepszą wartość w każdym wierszu (najniższa cena, najdłuższa dzierżawa, najwyższa rentowność i tak dalej).',
    sectionRental: 'Wynajem długoterminowy',
    perMonth: '/ mies.',
    bestLabel: 'Najlepsze w wierszu',
    sectionRealEstate: 'Wille i apartamenty',
    sectionComplexes: 'Kompleksy mieszkaniowe',
    bedrooms: 'Syp.',
    empty: 'Nic jeszcze nie zapisano. Otwórz katalog i dotknij serca przy dowolnej ofercie.',
    countOne: 'obiekt', countFew: 'obiekty', countMany: 'obiektów',
    clear: 'Wyczyść wszystko',
    sendToBot: 'Wyślij na Telegram',
    downloadPdf: 'Pobierz PDF',
    pdfLimit: (max: number) => `Pobieranie PDF jest dostępne, gdy lista zawiera maksymalnie ${max} ofert`,
    pdfTooMany: (max: number) => `PDF jest dostępny dla list do ${max} ofert — najpierw usuń kilka`,
    remove: 'Usuń',
    pdfModalTitle: 'Pobierz listę życzeń',
    pdfModalIntro: 'Wybierz format. Poziomy pasuje do ekranów, pionowy do telefonów.',
    pdfOrientLandscape: 'Poziomy',
    pdfOrientPortrait: 'Pionowy',
    pdfSimple: 'Pobierz',
    pdfSimpleNote: 'PDF z kartami ofert i tabelą porównawczą',
    pdfAgent: 'Pobierz dla agenta',
    pdfAgentNote: 'Na ostatniej stronie znajdą się Twoje imię, Telegram i WhatsApp',
    pdfBack: 'Powrót do opcji',
    pdfAgentIntro: 'Twoje kontakty trafią na ostatnią stronę PDF — klient może skontaktować się z Tobą bezpośrednio.',
    pdfFieldName: 'Imię',
    pdfFieldTg: 'Telegram',
    pdfFieldWa: 'WhatsApp',
    pdfBuilding: 'Tworzenie PDF…',
    pdfNeedContact: 'Dodaj Telegram lub WhatsApp — przynajmniej jeden kontakt.',
    pdfError: 'Nie udało się utworzyć PDF. Spróbuj ponownie.',
    pdfClose: 'Zamknij',
    landWarnTitle: 'Grunt bez przeznaczenia na najem dobowy',
    landWarnBody: (titles: string) => `Twoja lista życzeń zawiera ofertę na gruncie, który nie jest oficjalnie przeznaczony pod najem dobowy: ${titles}. Zweryfikuj legalny status najmu u dewelopera — wpływa on na przychody z Booking/Airbnb.`,
    villasLink: 'Przeglądaj wille',
    apartmentsLink: 'Przeglądaj apartamenty',
    complexesLink: 'Przeglądaj kompleksy',
    rowKind: 'Typ', rowPrice: 'Cena', rowPriceM2: 'Cena / m²', rowPriceM2Year: 'Cena m² / rok',
    rowBedrooms: 'Sypialnie', rowArea: 'Powierzchnia',
    rowLand: 'Działka', rowDistrict: 'Region', rowFloor: 'Piętro',
    rowCompletion: 'Oddanie', rowStatus: 'Status budowy',
    rowDealType: 'Transakcja', rowLease: 'Dzierżawa', rowPermit: 'Pozwolenie',
    rowYield: 'Deklarowana rentowność', rowLandUse: 'Przeznaczenie gruntu',
    rowDeveloper: 'Deweloper',
    rowBestRoi: 'ROI (nasza ocena)',
    rowStyle: 'Styl wnętrza',
    sqm: 'm²', years: 'lat',
    devReady: (n: number) => `${n} oddanych`,
    devInProgress: (n: number) => `${n} w budowie`,
    readinessLabel: 'Gotowość',
    dealResale: 'Odsprzedaż', dealSecondary: 'Wtórny', dealPrimary: 'Deweloper',
  },
  uk: {
    home: 'Головна',
    crumb: 'Обране',
    h1: 'Обране',
    intro: 'Вілли та апартаменти на продаж порівнюються в одній таблиці. Житлові комплекси та довгострокова оренда мають власні блоки карток. ✦ позначає найкращу цінність у кожному рядку (найнижча ціна, найдовша оренда, найвища дохідність тощо).',
    sectionRental: 'Довгострокова оренда',
    perMonth: '/ міс',
    bestLabel: 'Найкраще в рядку',
    sectionRealEstate: 'Вілли та апартаменти',
    sectionComplexes: 'Житлові комплекси',
    bedrooms: 'Спл.',
    empty: 'Поки нічого не збережено. Відкрийте каталог і торкніться сердечка на будь-якому обʼєкті.',
    countOne: 'обʼєкт', countFew: 'обʼєкти', countMany: 'обʼєктів',
    clear: 'Очистити все',
    sendToBot: 'Надіслати в Telegram',
    downloadPdf: 'Завантажити PDF',
    pdfLimit: (max: number) => `Завантаження PDF доступне, коли в списку не більше ${max} обʼєктів`,
    pdfTooMany: (max: number) => `PDF доступний для списків до ${max} обʼєктів — спершу видаліть кілька`,
    remove: 'Видалити',
    pdfModalTitle: 'Завантажити обране',
    pdfModalIntro: 'Оберіть формат. Альбомний пасує екранам, книжковий — телефонам.',
    pdfOrientLandscape: 'Альбомний',
    pdfOrientPortrait: 'Книжковий',
    pdfSimple: 'Завантажити',
    pdfSimpleNote: 'PDF із картками обʼєктів і таблицею порівняння',
    pdfAgent: 'Завантажити для агента',
    pdfAgentNote: 'На останній сторінці будуть ваше імʼя, Telegram і WhatsApp',
    pdfBack: 'Назад до опцій',
    pdfAgentIntro: 'Ваші контакти потраплять на останню сторінку PDF — клієнт зможе звʼязатися з вами напряму.',
    pdfFieldName: 'Імʼя',
    pdfFieldTg: 'Telegram',
    pdfFieldWa: 'WhatsApp',
    pdfBuilding: 'Створення PDF…',
    pdfNeedContact: 'Додайте Telegram або WhatsApp — принаймні один контакт.',
    pdfError: 'Не вдалося створити PDF. Спробуйте ще раз.',
    pdfClose: 'Закрити',
    landWarnTitle: 'Земля без дозволу на подобову оренду',
    landWarnBody: (titles: string) => `У вашому обраному є обʼєкт на землі, офіційно не призначеній для подобової оренди: ${titles}. Перевірте легальний статус оренди в забудовника — це впливає на дохід від Booking/Airbnb.`,
    villasLink: 'Дивитися вілли',
    apartmentsLink: 'Дивитися апартаменти',
    complexesLink: 'Дивитися комплекси',
    rowKind: 'Тип', rowPrice: 'Ціна', rowPriceM2: 'Ціна / м²', rowPriceM2Year: 'Ціна м² / рік',
    rowBedrooms: 'Спальні', rowArea: 'Площа',
    rowLand: 'Земля', rowDistrict: 'Регіон', rowFloor: 'Поверх',
    rowCompletion: 'Здача', rowStatus: 'Статус будівництва',
    rowDealType: 'Угода', rowLease: 'Оренда землі', rowPermit: 'Дозвіл',
    rowYield: 'Заявлена дохідність', rowLandUse: 'Призначення землі',
    rowDeveloper: 'Забудовник',
    rowBestRoi: 'ROI (наша оцінка)',
    rowStyle: 'Стиль інтерʼєру',
    sqm: 'м²', years: 'р.',
    devReady: (n: number) => `${n} здано`,
    devInProgress: (n: number) => `${n} будується`,
    readinessLabel: 'Готовність',
    dealResale: 'Перепродаж', dealSecondary: 'Вторинний', dealPrimary: 'Забудовник',
  },
} as const

type Copy = { countOne: string; countFew: string; countMany: string }
function plural(n: number, lang: Lang, copy: Copy): string {
  if (lang !== 'ru') return n === 1 ? copy.countOne : copy.countMany
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return copy.countOne
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return copy.countFew
  return copy.countMany
}

function detailHref(item: WishlistItem, lang: Lang): string {
  switch (item.kind) {
    case 'villa':     return switchLangPath(`/ru/villy/o/${item.slug}`, lang)
    case 'apartment': return switchLangPath(`/ru/apartamenty/o/${item.slug}`, lang)
    case 'complex':   return switchLangPath(`/ru/zhilye-kompleksy/o/${item.slug}`, lang)
    case 'rental':    return switchLangPath(`/ru/arenda/o/${item.slug}`, lang)
  }
}

export function ShortlistView({ lang }: { lang: Lang }) {
  const { items, ready, remove, clear } = useWishlist()
  const { currency } = useCurrency()
  const c = pickCopy(COPY, lang)
  const home = switchLangPath('/ru', lang)
  const [downloadOpen, setDownloadOpen] = useState(false)
  // Cap PDF generation at a length where the comparison table still
  // fits one landscape page (5 columns) — beyond that we'd be paginating
  // the comparison and the per-listing pages bloat the file too.
  const PDF_MAX_ITEMS = 5
  const pdfDisabled = items.length > PDF_MAX_ITEMS

  const fmt = (v: number | null | undefined) =>
    v != null && Number.isFinite(v) ? formatPrice(v, currency, lang) : null
  const dealTypeLabel = (t: WishlistItem['dealType']): string | null => {
    if (!t) return null
    if (t === 'resale')    return c.dealResale
    if (t === 'secondary') return c.dealSecondary
    return c.dealPrimary
  }

  // Comparison rows ordered roughly by what an investor weighs first —
  // price + price/m², then space, then legal (lease, permit, deal type
  // + claimed yield), then location and physical specs. Empty rows
  // collapse so the table never shows "Land · — · —" for an
  // apartments-only group.
  //
  // `best` rows have an objective winner direction: 'min' for price-ish
  // (cheapest wins) and 'max' for yield / lease / area. Bedrooms,
  // completion, district, status, permit and deal type are subjective
  // or categorical, so we leave them un-highlighted.
  type Verdict = 'best' | 'middle' | 'worst' | 'neutral'
  type Row = {
    key: string; label: string;
    cell: (it: WishlistItem) => string | null;
    // Categorical override — bypasses the numeric `best/num` machinery
    // for rows where "good vs bad" is a label match (e.g. land use:
    // tourism zone = best, residential = worst). Returning null falls
    // through to the numeric path.
    verdict?: (it: WishlistItem) => Verdict | null;
    best?: 'min' | 'max';
    num?: (it: WishlistItem) => number | null;
    // Minimum relative deviation from the "best" value before a cell
    // can be classified as "worst". Default 0.10 (=10%) so a 1900 vs
    // 2000 m² price spread doesn't get the more expensive one painted
    // red just for being 5% above. Year-like metrics override to 0
    // because absolute years matter more than relative %.
    worstMinRelDev?: number
  }
  const rows: Row[] = [
    // Total price isn't a fair "best/worst" metric — a $360k villa
    // and a $120k apartment are different products, not better/worse
    // versions of the same thing. Leave the row neutral; price-per-m²
    // and price-per-m²-per-year below normalise by size and are
    // genuinely comparable, so they keep the highlight.
    { key: 'price',      label: c.rowPrice,      cell: it => fmt(it.priceUsd) },
    { key: 'priceM2',    label: c.rowPriceM2,    cell: it => fmt(it.pricePerSqmUsd),
      best: 'min', num: it => it.pricePerSqmUsd ?? null },
    // "Цена м² в год" = price per m² divided by remaining leasehold
    // years — your effective annual cost per square metre of holding
    // the lease. Min wins: you pay less per m² per year. (Not rental
    // revenue — that one would be max-better.)
    { key: 'priceM2Year', label: c.rowPriceM2Year, cell: it => fmt(it.pricePerSqmYearUsd),
      best: 'min', num: it => it.pricePerSqmYearUsd ?? null },
    { key: 'yield',      label: c.rowYield,      cell: it => it.claimedYieldPct != null ? `${it.claimedYieldPct}%` : null,
      best: 'max', num: it => it.claimedYieldPct ?? null },
    // Best-case ROI from our own calculator (Booking comps + good-
    // scenario occupancy). The developer's claimed yield is marketing
    // copy; this column is what the asset would actually return based
    // on observed market rates. Stored as fraction (0..1), shown as %.
    { key: 'bestRoi',    label: c.rowBestRoi,
      cell: it => it.bestCapRate != null ? `${(it.bestCapRate * 100).toFixed(1)}%` : null,
      best: 'max', num: it => it.bestCapRate ?? null },
    { key: 'lease',      label: c.rowLease,      cell: it => it.leaseYears != null ? `${it.leaseYears} ${c.years}` : null,
      best: 'max', num: it => it.leaseYears ?? null },
    { key: 'permit',     label: c.rowPermit,     cell: it => it.permit ?? null },
    { key: 'dealType',   label: c.rowDealType,   cell: it => dealTypeLabel(it.dealType) },
    // Build status — completed beats under-construction. A delivered
    // asset is real and tour-able; a project still on site carries
    // construction risk (delays, quality, developer solvency).
    // Mapping: Построен → 2 best (green), Под заказ / planned → 1
    // middle, Строится → 0 worst (red).
    { key: 'status',     label: c.rowStatus,     cell: it => it.status ?? null,
      best: 'max',
      num: it => {
        if (!it.status) return null
        const s = it.status.toLowerCase()
        if (/постр|сдан|готов|built|complet|delivered/.test(s)) return 2
        if (/заказ|план|plan|under/.test(s)) return 1
        if (/строит|construc/.test(s)) return 0
        return null
      } },
    // Completion year — earlier = better, but past years are
    // equivalent (anything already delivered is just "delivered").
    // Clamp past values to current year so 2024 and 2025 read the
    // same as 2026 and don't accidentally rank against each other;
    // future years rank later = worse. worstMinRelDev: 0 because a
    // 1-year delta is meaningful but is only 0.05% relative to year
    // numbers — the percentage gate would always fail.
    { key: 'completion', label: c.rowCompletion,
      cell: it => it.completionYear ?? null,
      best: 'min',
      num: it => {
        if (!it.completionYear) return null
        const y = Number(it.completionYear)
        if (!Number.isFinite(y)) return null
        const now = new Date().getFullYear()
        return Math.max(y, now)
      },
      worstMinRelDev: 0 },
    { key: 'bedrooms',   label: c.rowBedrooms,   cell: it => it.bedrooms != null ? String(it.bedrooms) : null,
      best: 'max', num: it => it.bedrooms ?? null },
    { key: 'area',       label: c.rowArea,       cell: it => it.area != null ? `${it.area} ${c.sqm}` : null,
      best: 'max', num: it => it.area ?? null },
    { key: 'land',       label: c.rowLand,       cell: it => it.land != null ? `${it.land} ${c.sqm}` : null,
      best: 'max', num: it => it.land ?? null },
    { key: 'floor',      label: c.rowFloor,      cell: it => it.floor ?? null },
    { key: 'district',   label: c.rowDistrict,   cell: it => it.district ?? null },
    // Land use: tourism / Pariwisata / "красная" zoning is rentable
    // ("best"); residential / yellow / pink is not ("worst"). Anything
    // we can't classify falls through to neutral.
    { key: 'landUse',    label: c.rowLandUse,    cell: it => it.landUse ?? null,
      verdict: it => {
        const status = classifyLandUse(it.landUse)
        if (status === 'allowed')    return 'best'
        if (status === 'restricted') return 'worst'
        return 'neutral'
      } },
    { key: 'style',      label: c.rowStyle,      cell: it => it.interiorStyle ?? null },
    // Developer row: name on its own line, then a small "✓ N · ▲ M"
    // badge of completed / in-progress projects underneath. We pack
    // both into the cell text via a separator the renderer recognises
    // and formats with two lines.
    //
    // Verdict score = built − in-progress. The investor's risk read:
    // delivered projects are evidence the developer can finish; an
    // inflated in-progress pipeline (especially if this listing is
    // itself one of them) raises completion risk. So 2 built / 0
    // in-progress > 2 built / 2 in-progress > 0 built / Y in-progress,
    // and the more in-progress, the lower the rank.
    { key: 'developer',  label: c.rowDeveloper,
      cell: it => {
        if (!it.developerName) return null
        const ready    = it.developerCompletedCount ?? null
        const inProg   = it.developerInProgressCount ?? null
        const tail = [
          ready    != null && ready    > 0 ? c.devReady(ready)    : null,
          inProg   != null && inProg   > 0 ? c.devInProgress(inProg) : null,
        ].filter(Boolean).join(' · ')
        return tail ? `${it.developerName}\n${tail}` : it.developerName
      },
      best: 'max',
      num: it => {
        const ready  = it.developerCompletedCount  ?? null
        const inProg = it.developerInProgressCount ?? null
        if (ready == null && inProg == null) return null
        return (ready ?? 0) - (inProg ?? 0)
      },
      // Counts are small integers (typically -3..+5). The default 10%
      // relative-deviation gate would suppress meaningful 1-unit gaps
      // (one delivered project is signal). Drop the gate.
      worstMinRelDev: 0,
    },
  ]
  // Classify each cell on a 3-step traffic-light scale based on its
  // position within the row's spread. Tightly-grouped values (e.g.
  // 1900 vs 2000 — 5% apart) shouldn't paint the higher one red just
  // because it ranks last; a meaningful relative gap from the best
  // value is required (default 10%, overridable per row).
  const verdictFor = (r: Row, item: WishlistItem, section: WishlistItem[]): Verdict => {
    if (r.verdict) {
      const override = r.verdict(item)
      if (override) return override
    }
    if (!r.best || !r.num) return 'neutral'
    const num = r.num(item)
    if (num == null || !Number.isFinite(num)) return 'neutral'
    const nums = section.map(r.num).filter((v): v is number => v != null && Number.isFinite(v))
    if (nums.length < 2) return 'neutral'
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    if (min === max) return 'neutral'
    const bestVal  = r.best === 'min' ? min : max
    const gap = max - min
    // Position 0 = at best; 1 = at worst.
    const pos = Math.abs(num - bestVal) / gap
    // "Best" — at the best value, or close to it (within 20% of the
    // spread). This covers cases like 1900/1950 where both are
    // effectively cheapest.
    if (pos <= 0.20) return 'best'
    // "Worst" — high in the spread AND meaningfully far from best.
    // The relative gate stops a 5% spread from painting anything red;
    // override `worstMinRelDev` per row when % isn't the right unit.
    const minRel = r.worstMinRelDev ?? 0.10
    const relDev = bestVal !== 0 ? Math.abs(num - bestVal) / Math.abs(bestVal) : Infinity
    if (pos >= 0.80 && relDev >= minRel) return 'worst'
    return 'middle'
  }
  const verdictTextClass = (v: Verdict): string => {
    switch (v) {
      case 'best':   return 'font-semibold text-[var(--color-primary)]'
      case 'middle': return 'font-medium text-[#92400E]'
      case 'worst':  return 'font-medium text-[#B91C1C]'
      case 'neutral': return 'text-[var(--color-text)]'
    }
  }

  // Three render shapes. Villas / apartments share enough fields to
  // compare side-by-side. Complexes sell phases and unit ranges, so
  // they render as plain cards. Rentals have a different price unit
  // (per month) and shorter spec set, so they render as their own
  // card list too.
  const realEstateUnsorted = items.filter(i => i.kind === 'villa' || i.kind === 'apartment')
  const complexes  = items.filter(i => i.kind === 'complex')
  const rentals    = items.filter(i => i.kind === 'rental')

  // Order the comparison columns by overall quality: each `best`
  // verdict counts +1, each `worst` counts −1, neutral / middle
  // contribute 0. Ties keep insertion order (Array.sort is stable).
  // This way the leftmost column is the strongest pick across the
  // measured rows, the rightmost is the weakest.
  const realEstate = [...realEstateUnsorted]
    .map(it => {
      let score = 0
      for (const r of rows) {
        if (!r.best) continue
        const v = verdictFor(r, it, realEstateUnsorted)
        if (v === 'best')  score += 1
        else if (v === 'worst') score -= 1
      }
      return { it, score }
    })
    .sort((a, b) => b.score - a.score)
    .map(x => x.it)

  // Build the shareable Telegram message — one URL per saved item so the
  // recipient can tap straight into each detail page.
  const shareText = items.map(it => `https://balinsky.info${detailHref(it, lang)}`).join('\n')
  const shareHref = `https://t.me/share/url?url=${encodeURIComponent(shareText)}&text=${encodeURIComponent(c.sendToBot)}`

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.crumb },
        ]} />

        <div className="flex items-end justify-between gap-3 mt-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-[var(--color-text)]">
              {c.h1}
            </h1>
            {ready && items.length > 0 && (
              <div className="text-[14px] text-[var(--color-text-muted)] mt-1">
                {items.length} {plural(items.length, lang, c)}
              </div>
            )}
          </div>
          {ready && items.length > 0 && (
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setDownloadOpen(true)}
                disabled={pdfDisabled}
                title={pdfDisabled ? c.pdfTooMany(PDF_MAX_ITEMS) : undefined}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[12px] sm:text-[13px] font-medium disabled:bg-[var(--color-border)] disabled:hover:bg-[var(--color-border)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed"
                aria-label={c.downloadPdf}
              >
                <Download size={14} /> {c.downloadPdf}
              </button>
              <a
                href={shareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border border-[var(--color-border)] hover:border-[var(--color-text-muted)] text-[var(--color-text)] text-[12px] sm:text-[13px] font-medium no-underline"
              >
                <Send size={14} /> {c.sendToBot}
              </a>
              <button
                type="button"
                onClick={() => { if (confirm(pickCopy({ ru: 'Очистить весь шортлист?', en: 'Clear the whole shortlist?', id: 'Kosongkan seluruh shortlist?', fr: 'Vider toute la liste ?', de: 'Die gesamte Merkliste leeren?', zh: '清空整个候选清单？', nl: 'De hele shortlist wissen?', ban: 'Kosongang makasami shortlist?', pl: 'Wyczyścić całą listę życzeń?', uk: 'Очистити весь список обраного?' }, lang))) clear() }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[12px] sm:text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-search-bg)]"
              >
                <Trash2 size={14} /> {c.clear}
              </button>
            </div>
          )}
        </div>

        {ready && items.length > 0 && (
          <div className={`text-[12px] mb-4 -mt-3 ${pdfDisabled ? 'text-[#B91C1C]' : 'text-[var(--color-text-muted)]'}`}>
            {pdfDisabled ? c.pdfTooMany(PDF_MAX_ITEMS) : c.pdfLimit(PDF_MAX_ITEMS)}
          </div>
        )}

        {!ready ? null : items.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-12 text-center">
            <Heart size={36} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
            <div className="text-[15px] text-[var(--color-text)] max-w-md mx-auto mb-6">{c.empty}</div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Link href={switchLangPath('/ru/villy', lang)}                  className="px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-[13px] font-medium no-underline">{c.villasLink}</Link>
              <Link href={switchLangPath('/ru/apartamenty', lang)}        className="px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline">{c.apartmentsLink}</Link>
              <Link href={switchLangPath('/ru/zhilye-kompleksy', lang)}    className="px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline">{c.complexesLink}</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[14px] text-[var(--color-text-muted)] mb-6 max-w-2xl">{c.intro}</p>

            {realEstate.length > 0 && (() => {
              // Surface the rental-zoning risk before the comparison so
              // the visitor reads "this villa is on residential land"
              // up front, not only by spotting a red cell halfway down.
              const restricted = realEstate.filter(it => classifyLandUse(it.landUse) === 'restricted')
              const restrictedNames = restricted.map(it => it.title).join(', ')
              return (
              <section className="mb-10">
                <h2 className="text-[18px] md:text-[20px] font-semibold text-[var(--color-text)] mb-4">
                  {c.sectionRealEstate}
                  <span className="text-[var(--color-text-muted)] font-normal ml-2">· {realEstate.length}</span>
                </h2>

                {restricted.length > 0 && (
                  <div className="mb-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 flex gap-3">
                    <AlertTriangle size={18} className="shrink-0 text-[#B91C1C] mt-0.5" />
                    <div className="text-[13px] text-[#7F1D1D] leading-relaxed">
                      <div className="font-semibold text-[#B91C1C] mb-1">{c.landWarnTitle}</div>
                      {c.landWarnBody(restrictedNames)}
                    </div>
                  </div>
                )}

                {/* Mobile layout: vertical stack of per-item cards with
                    inline label / value rows. Side-by-side comparison
                    on a 400px viewport just doesn't fit, so we drop it
                    on small screens — the visitor scans items one by
                    one. Each card has the same comparison rows as the
                    desktop table, just rotated 90 degrees. */}
                <ul className="md:hidden space-y-4 mb-2">
                  {realEstate.map(it => {
                    const filledRows = rows.filter(r => r.cell(it) != null)
                    return (
                      <li key={`m-${it.kind}:${it.slug}`} className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden relative">
                        <Link href={detailHref(it, lang)} className="block no-underline text-[var(--color-text)]">
                          <div className="relative aspect-[16/9] bg-[var(--color-search-bg)]">
                            {it.photo ? (
                              <Image src={it.photo} alt={it.title} fill sizes="100vw" className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl">🏝️</div>
                            )}
                          </div>
                          <div className="px-4 pt-4">
                            <h3 className="text-[15px] font-semibold leading-snug line-clamp-2 mb-3">{it.title}</h3>
                          </div>
                        </Link>
                        <button
                          type="button"
                          aria-label={c.remove}
                          onClick={() => remove(it.kind, it.slug)}
                          className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm hover:bg-white text-[#1A1F1C] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                        >
                          <X size={14} />
                        </button>
                        <dl className="px-4 pb-4 divide-y divide-[var(--color-border-soft)]">
                          {filledRows.map(r => {
                            const v = r.cell(it)
                            const lines = v != null ? v.split('\n') : []
                            const verdict = verdictFor(r, it, realEstate)
                            return (
                              <div key={r.key} className="flex items-start justify-between gap-3 py-2">
                                <dt className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] shrink-0 pt-0.5">
                                  {r.label}
                                </dt>
                                <dd className={`text-[13px] text-right ${verdictTextClass(verdict)}`}>
                                  <span className="inline-flex items-center gap-1.5 justify-end">
                                    {lines[0]}
                                    {verdict === 'best' && (
                                      <Sparkle size={12} fill="currentColor" strokeWidth={0} aria-label={c.bestLabel} />
                                    )}
                                  </span>
                                  {lines[1] && (
                                    <span className="block text-[11px] font-normal text-[var(--color-text-muted)] mt-0.5">{lines[1]}</span>
                                  )}
                                </dd>
                              </div>
                            )
                          })}
                        </dl>
                      </li>
                    )
                  })}
                </ul>

                {/* Desktop layout: horizontal comparison table. Columns
                    have a 220px minimum each so the table only scrolls
                    horizontally past 5–6 items on a 1280px laptop —
                    below that it fits cleanly, above that the user
                    can swipe through all 10 columns without anything
                    being squished. */}
                <div className="hidden md:block overflow-x-auto pb-4">
                  <table
                    className="table-fixed border-separate border-spacing-x-2 md:border-spacing-x-3 w-full"
                    style={{ minWidth: `${realEstate.length === 1 ? 280 : 88 + realEstate.length * 220}px` }}
                  >
                    <colgroup>
                      <col className="w-[88px] md:w-[120px]" />
                      {realEstate.map(it => <col key={`${it.kind}:${it.slug}`} />)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-[var(--color-bg)] z-10 align-top"></th>
                        {realEstate.map(it => (
                          <th key={`${it.kind}:${it.slug}`} className="text-left align-top snap-start">
                            <div className="relative">
                              <Link href={detailHref(it, lang)} className="block group no-underline text-[var(--color-text)]">
                                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[var(--color-search-bg)] mb-2">
                                  {it.photo ? (
                                    <Image src={it.photo} alt={it.title} fill sizes="(max-width: 768px) 80vw, 320px" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl md:text-3xl">🏝️</div>
                                  )}
                                </div>
                                {/* min-h reserves the height of two
                                    title lines so single-line titles
                                    leave the same gap before the data
                                    rows as multi-line ones — keeps
                                    the comparison rows visually
                                    aligned across columns. */}
                                <div className="text-[13px] md:text-[15px] font-semibold leading-snug line-clamp-2 mb-2 md:mb-3 min-h-[2.6em] md:min-h-[2.6em]">{it.title}</div>
                              </Link>
                              <button
                                type="button"
                                aria-label={c.remove}
                                onClick={() => remove(it.kind, it.slug)}
                                className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/85 backdrop-blur-sm hover:bg-white text-[#1A1F1C] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.filter(r => realEstate.some(it => r.cell(it))).map(r => {
                        return (
                          <tr key={r.key}>
                            <td className="sticky left-0 bg-[var(--color-bg)] z-10 text-[10px] md:text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] py-2 md:py-3 align-top pr-2">
                              {r.label}
                            </td>
                            {realEstate.map(it => {
                              const v = r.cell(it)
                              const verdict = verdictFor(r, it, realEstate)
                              // Cells with a "\n" want a stacked
                              // primary line + muted secondary line —
                              // the developer row uses this to put
                              // "Builder name" above "✓ N · ▲ M".
                              const lines = v != null ? v.split('\n') : []
                              return (
                                <td key={`${r.key}-${it.kind}:${it.slug}`} className="text-[13px] md:text-[14px] py-2 md:py-3 align-top">
                                  {v != null ? (
                                    <span className={`inline-flex flex-col items-start gap-0.5 ${verdictTextClass(verdict)}`}>
                                      <span className="inline-flex items-center gap-1.5">
                                        {lines[0]}
                                        {verdict === 'best' && (
                                          <Sparkle size={12} fill="currentColor" strokeWidth={0} aria-label={c.bestLabel} />
                                        )}
                                      </span>
                                      {lines[1] && (
                                        <span className="text-[11px] md:text-[12px] font-normal text-[var(--color-text-muted)]">{lines[1]}</span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-[var(--color-text-muted)]">—</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
              )
            })()}

            {complexes.length > 0 && (
              <section className="mb-10">
                <h2 className="text-[18px] md:text-[20px] font-semibold text-[var(--color-text)] mb-4">
                  {c.sectionComplexes}
                  <span className="text-[var(--color-text-muted)] font-normal ml-2">· {complexes.length}</span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {complexes.map(item => {
                    const completion = item.completionYear
                    const readiness = item.readinessPct ?? null
                    const devReady    = item.developerCompletedCount  ?? null
                    const devInProg   = item.developerInProgressCount ?? null
                    return (
                      <li key={`${item.kind}:${item.slug}`} className="relative">
                        <Link
                          href={detailHref(item, lang)}
                          className="block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                        >
                          <div className="relative aspect-[4/3] bg-[var(--color-search-bg)]">
                            {item.photo ? (
                              <Image src={item.photo} alt={item.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl">🏝️</div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-[16px] font-semibold leading-snug mb-2 line-clamp-2">{item.title}</h3>
                            {readiness != null && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-[12px] mb-1">
                                  <span className="text-[var(--color-text-muted)]">{c.readinessLabel}</span>
                                  <span className="font-medium text-[var(--color-text)] tabular-nums">{readiness}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[var(--color-search-bg)] overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--color-primary)]"
                                    style={{ width: `${Math.min(100, Math.max(0, readiness))}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {item.developerName && (
                              <div className="mb-2 text-[12px]">
                                <div className="text-[var(--color-text)] truncate">{item.developerName}</div>
                                {(devReady != null && devReady > 0) || (devInProg != null && devInProg > 0) ? (
                                  <div className="text-[var(--color-text-muted)] mt-0.5">
                                    {[
                                      devReady   != null && devReady   > 0 ? c.devReady(devReady)     : null,
                                      devInProg  != null && devInProg  > 0 ? c.devInProgress(devInProg) : null,
                                    ].filter(Boolean).join(' · ')}
                                  </div>
                                ) : null}
                              </div>
                            )}
                            <div className="text-[13px] text-[var(--color-text-muted)] flex items-center gap-3 flex-wrap">
                              {item.district && <span>{item.district}</span>}
                              {completion && <span>{c.rowCompletion}: {completion}</span>}
                            </div>
                          </div>
                        </Link>
                        <button
                          type="button"
                          aria-label={c.remove}
                          onClick={() => remove(item.kind, item.slug)}
                          className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm hover:bg-white text-[#1A1F1C] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                        >
                          <X size={16} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {rentals.length > 0 && (
              <section className="mb-10">
                <h2 className="text-[18px] md:text-[20px] font-semibold text-[var(--color-text)] mb-4">
                  {c.sectionRental}
                  <span className="text-[var(--color-text-muted)] font-normal ml-2">· {rentals.length}</span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rentals.map(item => {
                    const price = item.priceUsd != null && Number.isFinite(item.priceUsd)
                      ? formatPrice(item.priceUsd, currency, lang)
                      : null
                    return (
                      <li key={`${item.kind}:${item.slug}`} className="relative">
                        <Link
                          href={detailHref(item, lang)}
                          className="block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                        >
                          <div className="relative aspect-[4/3] bg-[var(--color-search-bg)]">
                            {item.photo ? (
                              <Image src={item.photo} alt={item.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl">🏝️</div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-[16px] font-semibold leading-snug mb-2 line-clamp-2">{item.title}</h3>
                            {price && (
                              <div className="text-[15px] font-semibold mb-1">
                                {price}
                                <span className="text-[12px] font-normal text-[var(--color-text-muted)]"> {c.perMonth}</span>
                              </div>
                            )}
                            <div className="text-[13px] text-[var(--color-text-muted)] flex items-center gap-3 flex-wrap">
                              {item.bedrooms != null && <span>{item.bedrooms} {c.bedrooms}</span>}
                              {item.district && <span>{item.district}</span>}
                            </div>
                          </div>
                        </Link>
                        <button
                          type="button"
                          aria-label={c.remove}
                          onClick={() => remove(item.kind, item.slug)}
                          className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm hover:bg-white text-[#1A1F1C] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                        >
                          <X size={16} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </>
        )}

        <ShortlistSeoContent lang={lang} />

        <div className="h-16" />
      </PageContainer>

      {downloadOpen && (
        <DownloadShortlistModal
          // Preserve the on-screen ordering: villa+apartment columns
          // are already sorted by overall verdict score (best first),
          // complexes and rentals follow in their saved order. The PDF
          // walks this list as-is, so what the visitor sees in the
          // table is what they get on the cover-to-back of the file.
          items={[...realEstate, ...complexes, ...rentals]}
          lang={lang}
          c={c}
          onClose={() => setDownloadOpen(false)}
        />
      )}
    </>
  )
}

// Modal mirrors the villa presentation download flow: pick orientation,
// pick "simple" vs "agent" variant, and trigger the lazy PDF build. We
// duplicate it here (rather than re-using VillaPresentation's modal)
// because the data shape and PDF builder are different.
function DownloadShortlistModal({
  items, lang, c, onClose,
}: {
  items: WishlistItem[]
  lang: Lang
  c: typeof COPY['ru' | 'en']
  onClose: () => void
}) {
  // Currency at download time. Threaded into the PDF builder so the
  // document prints prices in whichever currency the visitor was
  // browsing in.
  const { currency } = useCurrency()
  const [mode, setMode] = useState<'choose' | 'agent'>('choose')
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [name, setName] = useState('')
  const [telegram, setTelegram] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmedName = name.trim()
  const trimmedTg = telegram.trim()
  const trimmedWa = whatsapp.trim()
  const canSubmitAgent = trimmedName.length > 0 && (trimmedTg.length > 0 || trimmedWa.length > 0) && !busy

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const downloadSimple = async () => {
    setBusy(true)
    setError(null)
    try {
      const { downloadShortlistPdf } = await import('./ShortlistPdf')
      await downloadShortlistPdf(items, null, orientation, lang, currency)
      onClose()
    } catch (e) {
      console.error(e)
      setError(c.pdfError)
    } finally {
      setBusy(false)
    }
  }

  const submitAgent = async () => {
    if (!canSubmitAgent) return
    setBusy(true)
    setError(null)
    try {
      const { downloadShortlistPdf } = await import('./ShortlistPdf')
      await downloadShortlistPdf(
        items,
        { name: trimmedName, telegram: trimmedTg, whatsapp: trimmedWa },
        orientation,
        lang,
        currency,
      )
      onClose()
    } catch (e) {
      console.error(e)
      setError(c.pdfError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4"
      onClick={() => { if (!busy) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortlist-download-title"
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 id="shortlist-download-title" className="text-[20px] md:text-[22px] font-semibold tracking-tight text-[#111827]">
            {c.pdfModalTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={c.pdfClose}
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-[#111827] disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {mode === 'choose' ? (
          <>
            <p className="text-[13px] text-[var(--color-text-muted)] mb-4">{c.pdfModalIntro}</p>
            <div className="mb-4 inline-flex w-full rounded-full border border-[var(--color-border)] p-1 bg-[var(--color-search-bg)]">
              {([
                { v: 'landscape', label: c.pdfOrientLandscape },
                { v: 'portrait',  label: c.pdfOrientPortrait },
              ] as const).map(opt => {
                const isActive = orientation === opt.v
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setOrientation(opt.v)}
                    disabled={busy}
                    className={`flex-1 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                        : 'text-[var(--color-text-muted)] hover:text-[#111827]'
                    } disabled:opacity-50`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={downloadSimple}
                disabled={busy}
                className="w-full text-left rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] bg-white px-4 py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[var(--color-search-bg)] flex items-center justify-center">
                    {busy ? <Loader2 size={18} className="animate-spin text-[var(--color-text-muted)]" /> : <Download size={18} className="text-[#111827]" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[#111827]">{c.pdfSimple}</div>
                    <div className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{c.pdfSimpleNote}</div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('agent')}
                disabled={busy}
                className="w-full text-left rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] bg-white px-4 py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center">
                    <UserRound size={18} className="text-[var(--color-primary-pressed)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[#111827]">{c.pdfAgent}</div>
                    <div className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{c.pdfAgentNote}</div>
                  </div>
                </div>
              </button>
            </div>
            {error && <p className="mt-3 text-[13px] text-[#B91C1C]">{error}</p>}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setMode('choose')}
              disabled={busy}
              className="text-[12px] text-[var(--color-text-muted)] hover:text-[#111827] inline-flex items-center gap-1 mb-3 disabled:opacity-50"
            >
              <ChevronLeft size={13} /> {c.pdfBack}
            </button>
            <p className="text-[13px] text-[var(--color-text-muted)] mb-5">{c.pdfAgentIntro}</p>
            <form
              onSubmit={e => { e.preventDefault(); submitAgent() }}
              className="space-y-3"
            >
              <PdfField id="sl-name" label={c.pdfFieldName} value={name} onChange={setName} placeholder={pickCopy({ ru: 'Андрей', en: 'Andrey', id: 'Budi', fr: 'Antoine', de: 'Andreas', zh: '张伟', nl: 'Jan', ban: 'Wayan', pl: 'Andrzej', uk: 'Андрій' }, lang)} autoFocus required />
              <PdfField id="sl-telegram" label={c.pdfFieldTg} value={telegram} onChange={setTelegram} placeholder="@username" />
              <PdfField id="sl-whatsapp" label={c.pdfFieldWa} value={whatsapp} onChange={setWhatsapp} placeholder="+62 812 345 67 89" inputMode="tel" />
              {!canSubmitAgent && trimmedName.length > 0 && trimmedTg.length === 0 && trimmedWa.length === 0 && !busy && (
                <p className="text-[12px] text-[var(--color-text-muted)]">{c.pdfNeedContact}</p>
              )}
              {error && <p className="text-[13px] text-[#B91C1C]">{error}</p>}
              <button
                type="submit"
                disabled={!canSubmitAgent}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] font-medium px-5 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {c.pdfBuilding}
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    {c.downloadPdf}
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function PdfField({
  id, label, value, onChange, placeholder, autoFocus, required, inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  required?: boolean
  inputMode?: 'text' | 'tel' | 'email' | 'url'
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[12px] font-medium text-[var(--color-text-muted)] mb-1.5">
        {label} {required && <span className="text-[#B91C1C]">*</span>}
      </span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        inputMode={inputMode}
        // 16px font-size suppresses iOS Safari's auto-zoom on focus.
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-[16px] text-[#111827] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
      />
    </label>
  )
}
