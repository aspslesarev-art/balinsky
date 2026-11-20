// Главная на всех десяти языках (20.11.2026) — макет HomeB в Claude Design:
// «маркетплейс недвижимости Бали для иностранцев». Вся недвижимость здесь в
// лизхолде — то, что законно может купить человек без индонезийского паспорта.
//   1. Фото на весь экран, заголовок и поиск поверх
//   2. Цифры каталога
//   3. 01 Каждый объект проверяет ИИ (13 проверок)
//      02 Почему здесь всё в лизхолде
//   4. 03 Виллы с лучшей доходностью
//   5. 04 Для тех, кто покупает издалека
// Balinsky в сделке не участвует (project_balinsky_info_only) — это сказано внизу.
// Тексты — в COPY ниже, по одному блоку на язык; русский — источник.

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Header } from '@/components/Header'
import { HomeSearch } from '@/components/HomeSearch'
import { VillaCard } from '@/components/VillaCard'
import { loadStats, loadTopVillas } from '@/components/HomeLanding'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const CAP = 'text-[12px] uppercase tracking-[0.08em]'
const H2 = 'text-[28px] md:text-[36px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#0F1A15]'

// Славянские формы: 1 / 2–4 / 5+. Русский и украинский — 21 = «one»,
// польский — только ровно 1 (21 willi, 22 wille).
const slavic = (n: number, f: [string, string, string], pl = false) => {
  const m10 = n % 10, m100 = n % 100
  if (pl ? n === 1 : m10 === 1 && m100 !== 11) return f[0]
  return m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? f[1] : f[2]
}
const two = (n: number, one: string, many: string) => (n === 1 ? one : many)

type Copy = {
  locale: string
  heroAlt: string
  eyebrow: string
  h1: string
  sub: string
  stats: { villas: (n: number) => string; apartments: (n: number) => string; developers: (n: number) => string; langs: string }
  ai: { title: string; lead: string; groups: [string, string, string, string]; items: [string[], string[], string[], string[]]; cta: string; ctaNote: string }
  why: { title: string; items: { t: string; d: string }[]; guide: string }
  villas: { title: string; all: string }
  far: { title: string; text: string; disclaimer: string }
}

// 13 проверок ИИ на странице каждого объекта (lib/analytics-panel/villa.ts), по темам —
// как в окне «Проверьте виллу с ИИ» (владелец 20.11.2026, макет HomeAI_A).
const COPY: Record<Lang, Copy> = {
  ru: {
    locale: 'ru-RU',
    heroAlt: 'Вилла на Бали из каталога Balinsky',
    eyebrow: 'Маркетплейс недвижимости Бали для иностранцев',
    h1: 'Недвижимость на Бали для тех, у кого нет индонезийского паспорта',
    sub: 'Всё в лизхолде. Цены, документы и доход — по каждому объекту.',
    stats: {
      villas: n => slavic(n, ['вилла', 'виллы', 'вилл']),
      apartments: n => slavic(n, ['апартамент', 'апартамента', 'апартаментов']),
      developers: n => slavic(n, ['застройщик', 'застройщика', 'застройщиков']),
      langs: 'языков сайта',
    },
    ai: {
      title: 'Не просто объявления: каждый объект проверяет ИИ',
      lead: '13 проверок по открытым данным: документы, цена против соседей, доход от аренды, что рядом, погода. Всё это — до звонка застройщику.',
      groups: ['Деньги', 'Документы и участок', 'Место', 'Жизнь в доме'],
      items: [
        ['Как сдавать посуточно?', 'Как оценят на Booking?', 'Как сдавать помесячно?', 'Как не переплатить?'],
        ['Что с документами?', 'Сколько стоит земля?', 'Что с участком?'],
        ['Что рядом?', 'Какой уровень туризма?', 'Как добраться?'],
        ['Какая погода и ветер?', 'Какой воздух?', 'Какой климат к 2050?'],
      ],
      cta: 'Посмотреть на примере виллы',
      ctaNote: 'Откроется проверка MAISON BOHEME в Сануре',
    },
    why: {
      title: 'Почему здесь всё в лизхолде',
      items: [
        { t: 'Это может купить иностранец', d: 'Землю в собственность на Бали иностранцу оформить нельзя. Долгая аренда земли — лизхолд — законный путь, и на сайте только он.' },
        { t: 'Срок аренды у каждого дома', d: 'Сколько лет аренды земли осталось и до какого года — прямо в карточке объекта.' },
        { t: 'Как купить — по шагам', d: 'Договор, нотариус, проверка документов и налоги — понятным языком.' },
      ],
      guide: 'Читать гид',
    },
    villas: { title: 'Виллы с лучшей доходностью', all: 'Весь каталог' },
    far: {
      title: 'Для тех, кто покупает издалека',
      text: 'Сайт на 10 языках, цены в вашей валюте. Созвониться с застройщиком по видео можно из любой страны — запись прямо на странице объекта.',
      disclaimer: 'Balinsky — каталог и аналитика. Мы не продаём объекты и не участвуем в сделке: договор вы заключаете с застройщиком.',
    },
  },
  en: {
    locale: 'en-US',
    heroAlt: 'A Bali villa from the Balinsky catalogue',
    eyebrow: 'Bali property marketplace for foreigners',
    h1: 'Bali property for people without an Indonesian passport',
    sub: 'Everything is leasehold. Prices, documents and income — for every property.',
    stats: {
      villas: n => two(n, 'villa', 'villas'),
      apartments: n => two(n, 'apartment', 'apartments'),
      developers: n => two(n, 'developer', 'developers'),
      langs: 'site languages',
    },
    ai: {
      title: 'More than listings: AI checks every property',
      lead: '13 checks against open data: documents, price vs the neighbours, rental income, what’s nearby, the weather. All before you call the developer.',
      groups: ['Money', 'Documents & land', 'Location', 'Living'],
      items: [
        ['How does short-term renting work out?', 'How will Booking guests rate it?', 'How does monthly renting work out?', 'Am I overpaying?'],
        ['What about the documents?', 'What is the land worth?', 'What about the plot?'],
        ['What’s nearby?', 'How touristy is it?', 'How do I get around?'],
        ['What are the weather and wind like?', 'How clean is the air?', 'What will the climate be by 2050?'],
      ],
      cta: 'See it on a real villa',
      ctaNote: 'Opens the check for MAISON BOHEME in Sanur',
    },
    why: {
      title: 'Why everything here is leasehold',
      items: [
        { t: 'A foreigner can buy it', d: 'Foreigners can’t own freehold land in Bali. A long-term land lease — leasehold — is the legal route, and it’s the only one on this site.' },
        { t: 'The lease term on every home', d: 'How many years are left on the land lease, and until which year — right on the property card.' },
        { t: 'How to buy, step by step', d: 'The contract, the notary, document checks and taxes — in plain language.' },
      ],
      guide: 'Read the guide',
    },
    villas: { title: 'Villas with the best yield', all: 'Full catalogue' },
    far: {
      title: 'For those buying from abroad',
      text: 'The site in 10 languages, prices in your currency. You can video-call the developer from any country — book the call right on the property page.',
      disclaimer: 'Balinsky is a catalogue and analytics. We don’t sell property and take no part in the deal: you sign the contract with the developer.',
    },
  },
  de: {
    locale: 'de-DE',
    heroAlt: 'Eine Villa auf Bali aus dem Balinsky-Katalog',
    eyebrow: 'Immobilienmarktplatz Bali für Ausländer',
    h1: 'Immobilien auf Bali für alle ohne indonesischen Pass',
    sub: 'Alles als Leasehold (Erbpacht). Preise, Dokumente und Ertrag – zu jedem Objekt.',
    stats: {
      villas: n => two(n, 'Villa', 'Villen'),
      apartments: n => two(n, 'Apartment', 'Apartments'),
      developers: () => 'Bauträger',
      langs: 'Sprachen der Website',
    },
    ai: {
      title: 'Mehr als Inserate: Jedes Objekt prüft eine KI',
      lead: '13 Prüfungen anhand offener Daten: Dokumente, Preis im Vergleich zur Nachbarschaft, Mieteinnahmen, Umgebung, Wetter. Alles, bevor Sie den Bauträger anrufen.',
      groups: ['Geld', 'Dokumente & Grundstück', 'Lage', 'Wohnen'],
      items: [
        ['Wie läuft die Kurzzeitvermietung?', 'Wie bewerten Booking-Gäste das Objekt?', 'Wie läuft die Monatsvermietung?', 'Zahle ich zu viel?'],
        ['Wie steht es um die Dokumente?', 'Was ist das Land wert?', 'Was ist mit dem Grundstück?'],
        ['Was gibt es in der Nähe?', 'Wie touristisch ist die Gegend?', 'Wie kommt man hin?'],
        ['Wie sind Wetter und Wind?', 'Wie ist die Luft?', 'Wie wird das Klima 2050?'],
      ],
      cta: 'Am Beispiel einer Villa ansehen',
      ctaNote: 'Öffnet die Prüfung von MAISON BOHEME in Sanur',
    },
    why: {
      title: 'Warum hier alles Leasehold ist',
      items: [
        { t: 'Das dürfen Ausländer kaufen', d: 'Grundeigentum auf Bali können Ausländer nicht erwerben. Die langfristige Pacht des Grundstücks – Leasehold – ist der legale Weg, und nur den gibt es auf dieser Website.' },
        { t: 'Pachtdauer bei jedem Haus', d: 'Wie viele Jahre die Grundstückspacht noch läuft und bis zu welchem Jahr – direkt in der Objektkarte.' },
        { t: 'Kaufen – Schritt für Schritt', d: 'Vertrag, Notar, Prüfung der Dokumente und Steuern – verständlich erklärt.' },
      ],
      guide: 'Zum Ratgeber',
    },
    villas: { title: 'Villen mit der besten Rendite', all: 'Ganzer Katalog' },
    far: {
      title: 'Für alle, die aus der Ferne kaufen',
      text: 'Die Website in 10 Sprachen, Preise in Ihrer Währung. Ein Videocall mit dem Bauträger ist aus jedem Land möglich – den Termin buchen Sie direkt auf der Objektseite.',
      disclaimer: 'Balinsky ist Katalog und Analyse. Wir verkaufen keine Objekte und sind am Kauf nicht beteiligt: Den Vertrag schließen Sie mit dem Bauträger.',
    },
  },
  fr: {
    locale: 'fr-FR',
    heroAlt: 'Une villa à Bali du catalogue Balinsky',
    eyebrow: 'La place de marché immobilière de Bali pour les étrangers',
    h1: 'L’immobilier à Bali pour ceux qui n’ont pas de passeport indonésien',
    sub: 'Tout en leasehold (bail de longue durée). Prix, documents et revenus — pour chaque bien.',
    stats: {
      villas: n => (n > 1 ? 'villas' : 'villa'),
      apartments: n => (n > 1 ? 'appartements' : 'appartement'),
      developers: n => (n > 1 ? 'promoteurs' : 'promoteur'),
      langs: 'langues du site',
    },
    ai: {
      title: 'Plus que des annonces : chaque bien est vérifié par l’IA',
      lead: '13 vérifications sur données ouvertes : documents, prix face aux voisins, revenus locatifs, environs, météo. Le tout avant d’appeler le promoteur.',
      groups: ['Argent', 'Documents et terrain', 'Emplacement', 'Vivre sur place'],
      items: [
        ['Que rapporte la location courte durée ?', 'Quelle note sur Booking ?', 'Que rapporte la location au mois ?', 'Comment ne pas payer trop cher ?'],
        ['Où en sont les documents ?', 'Combien vaut le terrain ?', 'Qu’en est-il de la parcelle ?'],
        ['Qu’y a-t-il à proximité ?', 'Quel est le niveau de tourisme ?', 'Comment s’y rendre ?'],
        ['Quel temps et quel vent ?', 'Quelle qualité de l’air ?', 'Quel climat en 2050 ?'],
      ],
      cta: 'Voir sur l’exemple d’une villa',
      ctaNote: 'Ouvre la vérification de MAISON BOHEME à Sanur',
    },
    why: {
      title: 'Pourquoi tout est en leasehold ici',
      items: [
        { t: 'Un étranger peut l’acheter', d: 'À Bali, un étranger ne peut pas être propriétaire du terrain. Le bail foncier de longue durée — le leasehold — est la voie légale, et c’est la seule proposée sur le site.' },
        { t: 'La durée du bail pour chaque maison', d: 'Combien d’années de bail il reste et jusqu’à quelle année — directement sur la fiche du bien.' },
        { t: 'Acheter, étape par étape', d: 'Contrat, notaire, vérification des documents et impôts — expliqués simplement.' },
      ],
      guide: 'Lire le guide',
    },
    villas: { title: 'Les villas les plus rentables', all: 'Tout le catalogue' },
    far: {
      title: 'Pour ceux qui achètent à distance',
      text: 'Le site en 10 langues, les prix dans votre devise. Un appel vidéo avec le promoteur est possible depuis n’importe quel pays — la réservation se fait directement sur la page du bien.',
      disclaimer: 'Balinsky est un catalogue et un outil d’analyse. Nous ne vendons pas de biens et ne participons pas à la transaction : vous signez le contrat avec le promoteur.',
    },
  },
  nl: {
    locale: 'nl-NL',
    heroAlt: 'Een villa op Bali uit de Balinsky-catalogus',
    eyebrow: 'Vastgoedmarktplaats van Bali voor buitenlanders',
    h1: 'Vastgoed op Bali voor wie geen Indonesisch paspoort heeft',
    sub: 'Alles in leasehold (erfpacht). Prijzen, documenten en rendement — per object.',
    stats: {
      villas: n => two(n, 'villa', 'villa’s'),
      apartments: n => two(n, 'appartement', 'appartementen'),
      developers: n => two(n, 'ontwikkelaar', 'ontwikkelaars'),
      langs: 'talen op de site',
    },
    ai: {
      title: 'Meer dan advertenties: AI checkt elk object',
      lead: '13 checks op basis van open data: documenten, prijs tegenover de buren, huurinkomsten, wat er in de buurt is, het weer. Allemaal voordat je de ontwikkelaar belt.',
      groups: ['Geld', 'Documenten & grond', 'Locatie', 'Wonen'],
      items: [
        ['Wat levert kortetermijnverhuur op?', 'Hoe beoordelen Booking-gasten het?', 'Wat levert maandverhuur op?', 'Betaal ik niet te veel?'],
        ['Hoe zit het met de documenten?', 'Wat is de grond waard?', 'Hoe zit het met het perceel?'],
        ['Wat is er in de buurt?', 'Hoe toeristisch is het?', 'Hoe kom je er?'],
        ['Hoe zijn het weer en de wind?', 'Hoe schoon is de lucht?', 'Hoe is het klimaat in 2050?'],
      ],
      cta: 'Bekijk het bij een echte villa',
      ctaNote: 'Opent de check van MAISON BOHEME in Sanur',
    },
    why: {
      title: 'Waarom hier alles leasehold is',
      items: [
        { t: 'Dit mag een buitenlander kopen', d: 'Grond in eigendom kan een buitenlander op Bali niet krijgen. Langdurige grondhuur — leasehold — is de legale weg, en op deze site staat alleen die.' },
        { t: 'Looptijd van de grondhuur bij elk huis', d: 'Hoeveel jaar grondhuur er nog over is en tot welk jaar — direct op de objectkaart.' },
        { t: 'Kopen, stap voor stap', d: 'Contract, notaris, controle van documenten en belastingen — in begrijpelijke taal.' },
      ],
      guide: 'Lees de gids',
    },
    villas: { title: 'Villa’s met het beste rendement', all: 'Hele catalogus' },
    far: {
      title: 'Voor wie op afstand koopt',
      text: 'De site in 10 talen, prijzen in je eigen valuta. Videobellen met de ontwikkelaar kan vanuit elk land — plan het gesprek direct op de objectpagina.',
      disclaimer: 'Balinsky is een catalogus en analyseplatform. Wij verkopen geen objecten en zijn geen partij bij de koop: het contract sluit je met de ontwikkelaar.',
    },
  },
  pl: {
    locale: 'pl-PL',
    heroAlt: 'Willa na Bali z katalogu Balinsky',
    eyebrow: 'Marketplace nieruchomości na Bali dla obcokrajowców',
    h1: 'Nieruchomości na Bali dla tych, którzy nie mają indonezyjskiego paszportu',
    sub: 'Wszystko w leasehold, czyli długoterminowej dzierżawie. Ceny, dokumenty i dochód — dla każdej oferty.',
    stats: {
      villas: n => slavic(n, ['willa', 'wille', 'willi'], true),
      apartments: n => slavic(n, ['apartament', 'apartamenty', 'apartamentów'], true),
      developers: n => slavic(n, ['deweloper', 'deweloperzy', 'deweloperów'], true),
      langs: 'języków strony',
    },
    ai: {
      title: 'Nie tylko ogłoszenia: każdą ofertę sprawdza AI',
      lead: '13 analiz na podstawie otwartych danych: dokumenty, cena na tle sąsiadów, dochód z najmu, co jest w pobliżu, pogoda. Wszystko, zanim zadzwonisz do dewelopera.',
      groups: ['Pieniądze', 'Dokumenty i działka', 'Lokalizacja', 'Życie w domu'],
      items: [
        ['Jak wynajmować na doby?', 'Jak ocenią na Booking?', 'Jak wynajmować na miesiące?', 'Jak nie przepłacić?'],
        ['Co z dokumentami?', 'Ile kosztuje ziemia?', 'Co z działką?'],
        ['Co jest w pobliżu?', 'Jaki jest poziom turystyki?', 'Jak dojechać?'],
        ['Jaka pogoda i wiatr?', 'Jakie jest powietrze?', 'Jaki klimat w 2050 roku?'],
      ],
      cta: 'Zobacz na przykładzie willi',
      ctaNote: 'Otworzy się analiza MAISON BOHEME w Sanur',
    },
    why: {
      title: 'Dlaczego wszystko tutaj jest w leasehold',
      items: [
        { t: 'To może kupić cudzoziemiec', d: 'Cudzoziemiec nie może na Bali nabyć ziemi na własność. Długoterminowa dzierżawa gruntu — leasehold — to legalna droga i tylko ona jest na tej stronie.' },
        { t: 'Okres dzierżawy przy każdym domu', d: 'Ile lat dzierżawy gruntu zostało i do którego roku — bezpośrednio na karcie oferty.' },
        { t: 'Jak kupić — krok po kroku', d: 'Umowa, notariusz, weryfikacja dokumentów i podatki — prostym językiem.' },
      ],
      guide: 'Czytaj poradnik',
    },
    villas: { title: 'Wille o najwyższej rentowności', all: 'Cały katalog' },
    far: {
      title: 'Dla tych, którzy kupują na odległość',
      text: 'Strona w 10 językach, ceny w Twojej walucie. Wideorozmowa z deweloperem jest możliwa z każdego kraju — umówisz ją bezpośrednio na stronie oferty.',
      disclaimer: 'Balinsky to katalog i analityka. Nie sprzedajemy nieruchomości i nie uczestniczymy w transakcji: umowę zawierasz z deweloperem.',
    },
  },
  uk: {
    locale: 'uk-UA',
    heroAlt: 'Вілла на Балі з каталогу Balinsky',
    eyebrow: 'Маркетплейс нерухомості Балі для іноземців',
    h1: 'Нерухомість на Балі для тих, у кого немає індонезійського паспорта',
    sub: 'Усе в лізхолді. Ціни, документи й дохід — по кожному об’єкту.',
    stats: {
      villas: n => slavic(n, ['вілла', 'вілли', 'вілл']),
      apartments: n => slavic(n, ['апартамент', 'апартаменти', 'апартаментів']),
      developers: n => slavic(n, ['забудовник', 'забудовники', 'забудовників']),
      langs: 'мов сайту',
    },
    ai: {
      title: 'Не просто оголошення: кожен об’єкт перевіряє ШІ',
      lead: '13 перевірок за відкритими даними: документи, ціна порівняно із сусідами, дохід від оренди, що поруч, погода. Усе це — ще до дзвінка забудовнику.',
      groups: ['Гроші', 'Документи й ділянка', 'Місце', 'Життя в домі'],
      items: [
        ['Як здавати подобово?', 'Як оцінять на Booking?', 'Як здавати помісячно?', 'Як не переплатити?'],
        ['Що з документами?', 'Скільки коштує земля?', 'Що з ділянкою?'],
        ['Що поруч?', 'Який рівень туризму?', 'Як дістатися?'],
        ['Яка погода й вітер?', 'Яке повітря?', 'Який клімат до 2050?'],
      ],
      cta: 'Подивитися на прикладі вілли',
      ctaNote: 'Відкриється перевірка MAISON BOHEME у Санурі',
    },
    why: {
      title: 'Чому тут усе в лізхолді',
      items: [
        { t: 'Це може купити іноземець', d: 'Оформити землю у власність на Балі іноземцю не можна. Довгострокова оренда землі — лізхолд — законний шлях, і на сайті тільки він.' },
        { t: 'Строк оренди в кожного будинку', d: 'Скільки років оренди землі залишилося і до якого року — просто в картці об’єкта.' },
        { t: 'Як купити — крок за кроком', d: 'Договір, нотаріус, перевірка документів і податки — зрозумілою мовою.' },
      ],
      guide: 'Читати гід',
    },
    villas: { title: 'Вілли з найкращою дохідністю', all: 'Увесь каталог' },
    far: {
      title: 'Для тих, хто купує здалеку',
      text: 'Сайт 10 мовами, ціни у вашій валюті. Зідзвонитися із забудовником по відео можна з будь-якої країни — запис просто на сторінці об’єкта.',
      disclaimer: 'Balinsky — каталог і аналітика. Ми не продаємо об’єкти й не беремо участі в угоді: договір ви укладаєте із забудовником.',
    },
  },
  id: {
    locale: 'id-ID',
    heroAlt: 'Vila di Bali dari katalog Balinsky',
    eyebrow: 'Marketplace properti Bali untuk warga asing',
    h1: 'Properti di Bali bagi Anda yang tidak memiliki paspor Indonesia',
    sub: 'Semuanya leasehold (hak sewa tanah jangka panjang). Harga, dokumen, dan pendapatan — untuk setiap properti.',
    stats: {
      villas: () => 'vila',
      apartments: () => 'apartemen',
      developers: () => 'pengembang',
      langs: 'bahasa situs',
    },
    ai: {
      title: 'Bukan sekadar iklan: setiap properti diperiksa AI',
      lead: '13 pemeriksaan berdasarkan data terbuka: dokumen, harga dibanding properti sekitar, pendapatan sewa, apa saja yang ada di dekatnya, cuaca. Semuanya sebelum Anda menelepon pengembang.',
      groups: ['Uang', 'Dokumen & lahan', 'Lokasi', 'Tinggal di rumah'],
      items: [
        ['Bagaimana jika disewakan harian?', 'Bagaimana penilaian di Booking?', 'Bagaimana jika disewakan bulanan?', 'Bagaimana agar tidak kemahalan?'],
        ['Bagaimana dokumennya?', 'Berapa harga tanahnya?', 'Bagaimana kondisi lahannya?'],
        ['Ada apa di sekitar?', 'Seberapa ramai turis?', 'Bagaimana aksesnya?'],
        ['Bagaimana cuaca dan anginnya?', 'Bagaimana kualitas udaranya?', 'Bagaimana iklimnya pada 2050?'],
      ],
      cta: 'Lihat contohnya pada sebuah vila',
      ctaNote: 'Membuka pemeriksaan MAISON BOHEME di Sanur',
    },
    why: {
      title: 'Mengapa semua di sini leasehold',
      items: [
        { t: 'Boleh dibeli warga asing', d: 'Warga asing tidak bisa memiliki tanah dengan hak milik di Bali. Sewa tanah jangka panjang — leasehold — adalah jalur yang sah, dan hanya itu yang ada di situs ini.' },
        { t: 'Masa sewa di setiap rumah', d: 'Berapa tahun sisa sewa tanah dan sampai tahun berapa — langsung di kartu properti.' },
        { t: 'Cara membeli, langkah demi langkah', d: 'Perjanjian, notaris, pemeriksaan dokumen, dan pajak — dengan bahasa yang mudah dipahami.' },
      ],
      guide: 'Baca panduan',
    },
    villas: { title: 'Vila dengan imbal hasil terbaik', all: 'Seluruh katalog' },
    far: {
      title: 'Bagi yang membeli dari jauh',
      text: 'Situs dalam 10 bahasa, harga dalam mata uang Anda. Panggilan video dengan pengembang bisa dilakukan dari negara mana pun — jadwalkan langsung di halaman properti.',
      disclaimer: 'Balinsky adalah katalog dan analitik. Kami tidak menjual properti dan tidak terlibat dalam transaksi: perjanjian Anda buat langsung dengan pengembang.',
    },
  },
  ban: {
    locale: 'id-ID',
    heroAlt: 'Vila ring Bali saking katalog Balinsky',
    eyebrow: 'Pasar properti Bali majeng wong dura negara',
    h1: 'Properti ring Bali majeng sane nenten madué paspor Indonesia',
    sub: 'Sami leasehold (sewa tanah makudang-kudang warsa). Aji, dokumen, lan pikolih — sabilang properti.',
    stats: {
      villas: () => 'vila',
      apartments: () => 'apartemen',
      developers: () => 'pangwangun',
      langs: 'basa situs',
    },
    ai: {
      title: 'Nenten wantah iklan: sabilang properti kapriksa olih AI',
      lead: '13 pamriksan saking data sane terbuka: dokumen, aji bandingang ring pisaga, pikolih sewa, napi sane nampek, cuaca. Sami puniki sadurung Ragane nelepon pangwangun.',
      groups: ['Jinah', 'Dokumen lan tanah', 'Genah', 'Urip ring umah'],
      items: [
        ['Sapunapi yening kasewaang harian?', 'Sapunapi nilai ring Booking?', 'Sapunapi yening kasewaang bulanan?', 'Sapunapi mangda nenten kamahalan?'],
        ['Sapunapi dokumenne?', 'Asapunapi aji tanahne?', 'Sapunapi kawentenan pekarangane?'],
        ['Napi sane nampek?', 'Asapunapi rame turise?', 'Sapunapi carane rauh?'],
        ['Sapunapi cuaca lan angin?', 'Sapunapi kawentenan udarane?', 'Sapunapi iklim ring warsa 2050?'],
      ],
      cta: 'Cingakin conto ring silih tunggil vila',
      ctaNote: 'Pacang kabuka pamriksan MAISON BOHEME ring Sanur',
    },
    why: {
      title: 'Napi mawinan sami ring riki leasehold',
      items: [
        { t: 'Wong dura negara dados numbas', d: 'Wong dura negara nenten dados madué tanah hak milik ring Bali. Sewa tanah sane suwe — leasehold — inggih punika margi sane sah, lan ring situs puniki wantah punika.' },
        { t: 'Suen sewa ring sabilang umah', d: 'Kudang warsa sewa tanahe kantun lan nyantos warsa kuda — langsung ring kartu properti.' },
        { t: 'Carane numbas — sabilang langkah', d: 'Perjanjian, notaris, pamriksan dokumen, lan pajeg — antuk basa sane aluh.' },
      ],
      guide: 'Wacen panuntun',
    },
    villas: { title: 'Vila sane pikolihnyane pinih becik', all: 'Sami katalog' },
    far: {
      title: 'Majeng sane numbas saking doh',
      text: 'Situs ring 10 basa, aji ring jinah Ragane. Video call sareng pangwangun prasida saking negara napi kémanten — daftar langsung ring kaca properti.',
      disclaimer: 'Balinsky inggih punika katalog lan analitik. Iraga nenten ngadol properti lan nenten milu ring transaksi: perjanjian kakaryanin olih Ragane sareng pangwangun.',
    },
  },
  zh: {
    locale: 'zh-CN',
    heroAlt: 'Balinsky 目录中的巴厘岛别墅',
    eyebrow: '面向外国人的巴厘岛房产平台',
    h1: '为没有印尼护照的人准备的巴厘岛房产',
    sub: '全部为租赁产权（Leasehold）。每套房源的价格、文件和收益一目了然。',
    stats: {
      villas: () => '栋别墅',
      apartments: () => '套公寓',
      developers: () => '家开发商',
      langs: '种网站语言',
    },
    ai: {
      title: '不只是房源信息：每套房产都经过 AI 核查',
      lead: '基于公开数据的 13 项核查：文件、与周边房源的价格对比、租金收益、周边配套、天气。这一切，都在您联系开发商之前完成。',
      groups: ['资金', '文件与地块', '位置', '居住'],
      items: [
        ['短租收益如何？', '在 Booking 上评分会怎样？', '月租收益如何？', '如何避免买贵？'],
        ['文件情况如何？', '土地值多少钱？', '地块情况如何？'],
        ['周边有什么？', '游客多不多？', '交通是否便利？'],
        ['天气和风况如何？', '空气质量如何？', '2050 年气候会怎样？'],
      ],
      cta: '以一栋别墅为例查看',
      ctaNote: '将打开沙努尔 MAISON BOHEME 的核查',
    },
    why: {
      title: '为什么这里全部是租赁产权',
      items: [
        { t: '外国人可以合法购买', d: '在巴厘岛，外国人无法取得土地所有权。长期土地租赁（Leasehold）是合法途径，本站只提供这一种。' },
        { t: '每套房都标明租期', d: '土地租期还剩多少年、到哪一年为止——直接显示在房源卡片上。' },
        { t: '购买流程，一步一步', d: '合同、公证、文件核查和税费——用通俗的语言讲清楚。' },
      ],
      guide: '阅读指南',
    },
    villas: { title: '收益最高的别墅', all: '查看全部' },
    far: {
      title: '为远程购房者而设',
      text: '网站支持 10 种语言，价格以您的货币显示。无论身在哪个国家，都可以与开发商视频通话——直接在房源页面预约。',
      disclaimer: 'Balinsky 是房产目录与分析平台。我们不出售房产，也不参与交易：合同由您与开发商直接签订。',
    },
  },
}

const AI_STYLE = [
  { bg: '#E8F1EC', ink: '#1F8B5F' },
  { bg: '#F6EEE4', ink: '#C9772B' },
  { bg: '#E8EFF8', ink: '#2E7DD1' },
  { bg: '#EFEAF7', ink: '#8E5BD0' },
] as const
const AI_DEMO = '/ru/villy/o/maison-boheme-sanur-108m2-2-bedroom#analitika'

// Картинка темы — без цифр, только образ (точки соседей, галочки, метки, солнце).
function AiCover({ i, ink }: { i: number; ink: string }) {
  const shapes = [
    [[60, 100], [110, 70], [150, 110], [205, 60], [245, 100]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="8" className="ap-float" style={{ animationDelay: `${-k * 0.7}s` }} />),
    [0, 1, 2].map(k => <g key={k} className="ap-breathe" style={{ animationDelay: `${-k * 1.2}s` }}><circle cx={80 + k * 70} cy="86" r="22" fill="none" stroke={ink} strokeWidth="4" /><path d={`M${70 + k * 70} 86l7 8 14-16`} fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></g>),
    [[90, 70], [160, 105], [215, 60]].map(([x, y], k) => <path key={k} className="ap-bob" style={{ animationDelay: `${-k}s` }} d={`M${x} ${y + 22}c-12-14-18-22-18-30a18 18 0 0 1 36 0c0 8-6 16-18 30z`} />),
    [<circle key="s" cx="150" cy="86" r="26" className="ap-pulse" />, ...[0, 45, 90, 135, 180, 225, 270, 315].map(a => <line key={a} x1={150 + 38 * Math.cos(a * Math.PI / 180)} y1={86 + 38 * Math.sin(a * Math.PI / 180)} x2={150 + 50 * Math.cos(a * Math.PI / 180)} y2={86 + 50 * Math.sin(a * Math.PI / 180)} stroke={ink} strokeWidth="4" strokeLinecap="round" />)],
  ][i]
  return <svg viewBox="0 0 300 172" className="ap-cover block h-full w-full" aria-hidden><g fill={ink} opacity=".85">{shapes}</g></svg>
}

// Названия языков — на самих языках, как в переключателе.
const LANGS = [
  ['🇬🇧', 'English'], ['🇫🇷', 'Français'], ['🇩🇪', 'Deutsch'], ['🇳🇱', 'Nederlands'], ['🇵🇱', 'Polski'],
  ['🇷🇺', 'Русский'], ['🇺🇦', 'Українська'], ['🇨🇳', '中文'], ['🇮🇩', 'Indonesia'],
] as const

function Head({ no, title, link }: { no: string; title: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <h2 className="flex items-baseline gap-4"><span className="text-[13px] font-normal tabular-nums text-[#6B7570]">{no}</span><span className={H2}>{title}</span></h2>
      {link && <Link href={link.href} className="text-[15px] text-[#0F1A15] underline underline-offset-4 hover:text-[var(--color-primary)]">{link.label}</Link>}
    </div>
  )
}

export async function HomeJournal({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const fmt = (n: number) => n.toLocaleString(c.locale)
  const [stats, villas] = await Promise.all([
    loadStats().catch(() => null),
    loadTopVillas(lang).catch(() => []),
  ])
  const hero = villas.find(v => v.photos[0])?.photos[0] ?? null
  // По одной вилле от комплекса — иначе витрина из четырёх одинаковых таунхаусов.
  const seen = new Set<string>()
  // Переведённые названия пишутся по-разному («Townhouse X in Umalas» / «X Townhouse…»),
  // поэтому сверяем ещё и слаг без площади и спален: premier-umalas-villas-74m2-… → premier-umalas.
  const picks = villas.filter(v => {
    const key = v.title.split(/\s[-—–]\s/)[0].replace(/^(Вилла|Таунхаус|Villa|Vila|Townhouse)\s+/i, '').trim().toLowerCase()
    const base = 'slug:' + v.slug.replace(/-\d+m2-.*$/, '').replace(/-villas?$/, '')
    if (seen.has(key) || seen.has(base)) return false
    seen.add(key)
    seen.add(base)
    return true
  })
  // Гид «Как купить» есть на всех языках (app/<lang>/<kak-kupit>), см. SEGMENT_TABLE.
  const guideHref = switchLangPath('/ru/kak-kupit', lang)

  return (
    <div className="min-h-screen bg-white text-[#0F1A15]">
      <Header />

      {/* 1. Фото на весь экран, заголовок и поиск поверх */}
      <section className="relative flex min-h-[640px] items-end overflow-hidden bg-[#1B211E] md:min-h-[680px]">
        {hero && <Image src={hero} alt={c.heroAlt} fill priority sizes="100vw" className="object-cover" />}
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgb(15_26_21/.25),rgb(15_26_21/.7))]" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-6 pb-10 pt-24 text-white md:gap-6 md:pb-16">
          <p className={`${CAP} text-white/85`}>{c.eyebrow}</p>
          <h1 className="w-full min-w-0 max-w-[980px] text-[29px] font-semibold leading-[1.1] tracking-[-0.03em] [overflow-wrap:normal] [word-break:normal] sm:text-[40px] md:text-[60px] md:leading-[1.06] md:tracking-[-0.035em] md:[text-wrap:balance]">
            {c.h1}
          </h1>
          <p className="max-w-[720px] text-[17px] leading-[1.5] text-white/90 md:text-[19px]">
            {c.sub}
          </p>
          <div className="mt-2 max-w-[880px]"><HomeSearch lang={lang} /></div>
        </div>
      </section>

      {/* 2. Цифры каталога */}
      {stats && (
        <section className="border-b border-[#ECEFED]">
          <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-6 px-6 py-8 md:flex md:gap-14 md:py-10">
            {([
              [stats.villas, c.stats.villas(stats.villas)],
              [stats.apartments, c.stats.apartments(stats.apartments)],
              [stats.developers, c.stats.developers(stats.developers)],
              [10, c.stats.langs],
            ] as const).map(([v, l]) => (
              <span key={l} className="flex flex-col gap-0.5">
                <span className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] tabular-nums md:text-[32px]">{fmt(v)}</span>
                <span className="text-[14px] text-[#6B7570]">{l}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mx-auto flex max-w-[1280px] flex-col gap-16 px-6 py-16 md:gap-24 md:py-24">
        {/* 3. ИИ проверяет каждый объект */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <Head no="01" title={c.ai.title} />
            <p className="max-w-[68ch] text-[17px] leading-[1.6] text-[#4A5550] md:text-[18px]">{c.ai.lead}</p>
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {c.ai.groups.map((g, i) => (
              <div key={g} className="flex flex-col gap-3">
                <div className="aspect-[300/172] overflow-hidden rounded-md" style={{ background: AI_STYLE[i].bg }}><AiCover i={i} ink={AI_STYLE[i].ink} /></div>
                <span className={`${CAP} text-[#6B7570]`}>{g}</span>
                <ul className="m-0 flex list-none flex-col p-0">
                  {c.ai.items[i].map(it => (
                    <li key={it} className="flex items-center gap-2 border-t border-[#ECEFED] py-2.5 text-[16px]"><span style={{ color: AI_STYLE[i].ink }} aria-hidden>✓</span>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href={switchLangPath(AI_DEMO, lang)} className="inline-flex h-[52px] items-center rounded-xl bg-[var(--color-primary)] px-7 text-[16px] font-semibold text-white no-underline transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
              {c.ai.cta}
            </Link>
            <span className="text-[14px] text-[#6B7570]">{c.ai.ctaNote}</span>
          </div>
        </section>

        {/* 4. Почему лизхолд */}
        <section className="flex flex-col gap-8">
          <Head no="02" title={c.why.title} />
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
            {c.why.items.map((w, i) => (
              <div key={w.t} className="flex flex-col gap-2.5 border-t-2 border-[#0F1A15] pt-4">
                <span className="text-[20px] font-semibold tracking-[-0.01em]">{w.t}</span>
                <span className="max-w-[68ch] text-[16px] leading-[1.6] text-[#4A5550]">{w.d}</span>
                {i === 2 && <Link href={guideHref} className="mt-1 inline-flex items-center gap-1.5 self-start text-[15px] font-semibold text-[var(--color-primary)] no-underline hover:underline">{c.why.guide} <ArrowRight size={15} aria-hidden /></Link>}
              </div>
            ))}
          </div>
        </section>

        {/* 5. Виллы */}
        {picks.length > 0 && (
          <section className="flex flex-col gap-8">
            <Head no="03" title={c.villas.title} link={{ href: switchLangPath('/ru/villy', lang), label: c.villas.all }} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {picks.slice(0, 6).map(v => <VillaCard key={v.slug} a={v} lang={lang} />)}
            </div>
          </section>
        )}

        {/* 6. Издалека */}
        <section className="grid grid-cols-1 items-center gap-8 border-t border-[#ECEFED] pt-16 md:grid-cols-2 md:gap-16 md:pt-24">
          <div className="flex flex-col gap-4">
            <Head no="04" title={c.far.title} />
            <p className="max-w-[60ch] text-[17px] leading-[1.6] text-[#4A5550]">{c.far.text}</p>
            <p className="max-w-[60ch] text-[14px] leading-[1.6] text-[#6B7570]">{c.far.disclaimer}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {LANGS.map(([f, n]) => (
              <span key={n} lang={n === 'Русский' ? 'ru' : n === 'Українська' ? 'uk' : undefined} className="inline-flex items-center gap-2.5 rounded-full border border-[#ECEFED] px-4 py-2 text-[15px]">
                <span aria-hidden className="text-[20px] leading-none">{f}</span>{n}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
