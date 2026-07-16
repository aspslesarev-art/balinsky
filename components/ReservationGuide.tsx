// Foreign-investor confidence builder for the reservation step. Explains
// what a "reserve" tap on Balinsky actually commits the visitor to, who
// holds the deposit, and how refunds work. Linked from the reservation
// modal and from the manager card for buyers who want to read first.

import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import {
  Lock, Calendar, FileText, Wallet, Undo2, ArrowRight,
  ShieldCheck, AlertTriangle,
} from 'lucide-react'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    home: 'Главная',
    crumb: 'Бронирование',
    h1: 'Бронирование объекта на Бали — как это устроено',
    intro: 'Когда вы нажимаете «Зарезервировать», объект уходит на 14-дневный hold лично за вами. Эта страница объясняет, что именно происходит дальше, кто держит ваш депозит и как вернуть деньги если вы передумаете.',

    h2What: 'Что такое reservation на Бали',
    pWhat: 'Reservation — это первый юридически фиксируемый шаг сделки. Вы подписываете короткий reservation form (не договор купли-продажи), вносите holding deposit, и объект на 14 дней снимается с продажи: ни один другой покупатель в этот период купить его не может. За это время вы делаете due diligence, обсуждаете правки в SPA с юристом, готовите перевод средств на следующий транш.',

    h2Hold: '14 дней эксклюзивности — что это даёт',
    pHold: 'Stand-still окно работает в обе стороны: цена зафиксирована в reservation form, застройщик не может её поднять; объект гарантированно ждёт вас. Если в эти 14 дней появится покупатель с лучшей ценой — он не получит ничего. Окно достаточное чтобы юрист закончил due diligence (обычно 7–10 дней), а вы успели обсудить правки в SPA.',

    h2Sign: 'Что именно вы подписываете',
    pSign: 'Reservation form — это короткий документ на 1–3 страницы: цена объекта, размер депозита, срок hold (14 дней), условия возврата, и адрес для возвратного перевода если откажетесь. Это НЕ договор купли-продажи (SPA). SPA — отдельный документ, подписывается через 1–2 недели у нотариуса PPAT после прохождения due diligence. Reservation form может включать пункт «non-refundable если откажетесь без юридических причин», но более частая практика — полный возврат при отказе после DD.',

    h2Deposit: 'Где сидит депозит',
    pDeposit: 'Размер holding deposit на Бали — обычно $2 000–10 000 (на премиальных виллах до $25 000). Деньги переводятся одним из трёх способов: на эскроу-счёт нотариуса PPAT (самый безопасный), на корпоративный счёт застройщика (требует доверия к нему), или на счёт юридической фирмы-посредника. Никогда не переводите на личный счёт продавца, директора PT или агента — это самый частый канал мошенничества в индонезийской недвижимости. Реквизиты для перевода обязательно сверяйте с reservation form, а не из переписки в мессенджере.',

    h2Refund: 'Как возвращаются деньги',
    pRefund: 'Стандартная практика: полный возврат депозита если вы отказываетесь в течение 14-дневного окна по результатам due diligence. «Юридические причины отказа» (например выявленные обременения, несоответствие зонирования, проблемы с PBG) — всегда возврат 100%. Отказ «передумал» без причин — некоторые застройщики удерживают депозит как штраф, другие возвращают полностью. Условия возврата всегда явно прописаны в reservation form — прочитайте этот пункт перед подписанием. После истечения 14 дней без подписания SPA депозит обычно засчитывается в первый транш по SPA или возвращается, в зависимости от условий формы.',

    h2After: 'Что после 14 дней',
    pAfter: 'Три сценария. Первый — успешный: к концу окна юрист дал зелёный свет на DD, вы подписываете SPA у нотариуса PPAT, holding deposit засчитывается в первый транш SPA. Второй — продление hold ещё на 7–14 дней (если DD не уложилось в срок), оформляется письменным соглашением. Третий — отказ: депозит возвращается, объект снова появляется в продаже. Молчание после 14 дней без формального решения может трактоваться по-разному в зависимости от reservation form — лучше прислать письменный отказ или продление.',

    h2Risks: 'На что обратить внимание',
    risks: [
      'Реквизиты для перевода депозита должны быть в reservation form — не принимайте их в чате.',
      'Прочитайте пункт о возврате до подписания. «Non-refundable in any case» — красный флаг, договаривайтесь о правке.',
      'Срок hold должен быть явно указан (14 дней или другой). Открытый срок без даты — повод задать вопрос.',
      'Reservation form должен подписать представитель PT застройщика, имя которого указано в Akta Pendirian (учредительных документах). Подпись агента без доверенности — уязвимость.',
      'Сохраните копию подписанной формы (PDF), чек банка о переводе, и переписку с менеджером — пригодится в случае спора.',
    ],

    h2What2: 'Чем reservation отличается от SPA',
    table: {
      headLeft: '',
      headRsv: 'Reservation form',
      headSpa: 'SPA / Lease Agreement',
      rows: [
        { l: 'Когда подписывают',         r: 'В первые 1–3 дня',                          s: 'Через 1–4 недели после reservation' },
        { l: 'Объём документа',           r: '1–3 страницы',                              s: '15–40 страниц' },
        { l: 'Юридическая сила',          r: 'Фиксирует цену и hold; не передаёт право',  s: 'Передаёт лизхолд / HGB; регистрируется в BPN' },
        { l: 'Сумма',                     r: 'Holding deposit ($2k–25k)',                 s: 'Полная цена в траншах' },
        { l: 'Подписание',                r: 'Электронно или у застройщика',              s: 'Только у нотариуса PPAT, лично' },
        { l: 'Возврат денег',             r: 'Обычно полный (см. условия)',               s: 'Только через расторжение SPA с штрафами' },
      ],
    },

    faqHeading: 'Часто задаваемые вопросы',
    faq: [
      { q: 'Я внёс депозит — это значит я уже купил?',
        a: 'Нет. Reservation deposit фиксирует цену и эксклюзивный hold на 14 дней, но не передаёт права на объект. Право собственности (или лизхолда) переходит только после подписания SPA у нотариуса PPAT и регистрации в BPN.' },
      { q: 'Можно ли увеличить срок hold?',
        a: 'Да, обычно бесплатно при заранее обоснованной причине (например юрист не успел закончить DD). Запрашивается письменно у застройщика, оформляется extension reservation form. На практике 7–14 дополнительных дней — стандарт.' },
      { q: 'Можно ли передать reservation другому покупателю?',
        a: 'Часть застройщиков разрешает переуступку до подписания SPA с письменным согласием. На вторичном рынке (resale) — почти всегда нет, надо завершать или отменять.' },
      { q: 'А если застройщик передумает после моего депозита?',
        a: 'В reservation form обычно указан симметричный пункт: если застройщик отказывает без юридических причин, он возвращает депозит и платит штраф (часто равный депозиту). На практике крупные застройщики этого не делают — слишком плохо для репутации.' },
      { q: 'Депозит можно платить криптой?',
        a: 'Нет. Все легальные сделки через PPAT нотариуса фиксируются в IDR/USD на банковский счёт. Криптовалютный перевод не оставляет следа для нотариуса и для налоговой Индонезии — потом доказать что вы что-то платили будет невозможно.' },
    ],

    ctaHeading: 'Готовы зарезервировать',
    ctaText: 'Откройте карточку объекта и нажмите «Зарезервировать» — менеджер пришлёт reservation form в течение часа.',
    ctaVillas: 'К виллам',
    ctaApartments: 'К апартаментам',
    ctaGuide: 'Полный гид «Как купить на Бали»',
  },
  en: {
    home: 'Home',
    crumb: 'Reservation',
    h1: 'How a Bali property reservation works',
    intro: 'When you tap "Reserve" on a listing, the property goes on a 14-day hold for you exclusively. This page explains what happens next, who holds your deposit, and how refunds work if you change your mind.',

    h2What: 'What a Bali reservation is',
    pWhat: 'A reservation is the first legally recorded step in the deal. You sign a short reservation form (not a sale & purchase agreement), pay a holding deposit, and the property is taken off market for 14 days — no other buyer can complete a purchase during that window. You use this time to do due diligence, agree SPA edits with your lawyer, and prepare the next wire.',

    h2Hold: 'The 14 exclusive days — what they buy you',
    pHold: 'The stand-still works both ways: the price is locked in the reservation form, the developer cannot raise it; the property genuinely waits for you. If a higher offer arrives in those 14 days, the developer cannot accept it. The window is enough for a lawyer to finish DD (typically 7–10 days) and for you to negotiate SPA edits.',

    h2Sign: 'What you actually sign',
    pSign: 'The reservation form is a 1–3 page document: property price, deposit amount, hold duration (14 days), refund terms, and your bank details for refund if you walk. It is NOT the sale & purchase agreement (SPA). The SPA is a separate document signed 1–2 weeks later before a PPAT notary, after DD is cleared. Reservation forms may include a "non-refundable without legal cause" clause, but the more common practice is full refund on a post-DD walk-away.',

    h2Deposit: 'Where the deposit sits',
    pDeposit: 'A holding deposit on Bali is typically $2,000–10,000 (premium villas up to $25,000). The funds wire one of three ways: to the PPAT notary escrow (safest), to the developer’s corporate account (requires trust in the developer), or to an intermediary law-firm account. Never to the seller’s personal account, the director’s personal account, or an agent’s account — that is the most common fraud channel in Indonesian real estate. Always cross-check wire instructions against the reservation form itself, never from messenger chat.',

    h2Refund: 'How the money comes back',
    pRefund: 'Standard practice: a full refund if you walk inside the 14-day window based on DD findings. Legal causes (liens, zoning mismatch, PBG issues) always trigger 100% return. A "changed my mind" walk without cause — some developers keep the deposit as a penalty, others refund in full. Refund conditions are always written into the reservation form — read that clause before you sign. Past 14 days without a signed SPA, the deposit either rolls into the first SPA tranche or is refunded, depending on the form.',

    h2After: 'What happens after 14 days',
    pAfter: 'Three paths. Best case: by end of window your lawyer cleared DD, you sign the SPA at the PPAT notary, and the holding deposit counts toward the first SPA tranche. Middle case: you extend the hold by 7–14 days (DD didn’t finish), in writing. Worst case: you walk, deposit is refunded, the property goes back to market. Silence past 14 days without a formal decision is interpreted differently per form — always send a written decision (extend or walk).',

    h2Risks: 'Things to watch',
    risks: [
      'Wire instructions for the deposit must be in the reservation form — never accept them from a chat.',
      'Read the refund clause before you sign. "Non-refundable in any case" is a red flag — push for an edit.',
      'The hold duration must be stated explicitly (14 days or another). An open-ended hold needs a question.',
      'The reservation form must be signed by an officer of the developer’s PT named in the Akta Pendirian (incorporation documents). Agent signature without a power of attorney is a weak link.',
      'Keep a PDF copy of the signed form, the bank wire receipt, and the messenger thread with the manager — they help if a dispute arises.',
    ],

    h2What2: 'Reservation form vs SPA',
    table: {
      headLeft: '',
      headRsv: 'Reservation form',
      headSpa: 'SPA / Lease Agreement',
      rows: [
        { l: 'Signed when',           r: 'First 1–3 days',                              s: '1–4 weeks after reservation' },
        { l: 'Document length',       r: '1–3 pages',                                   s: '15–40 pages' },
        { l: 'Legal weight',          r: 'Locks price and hold; transfers no rights',   s: 'Transfers leasehold / HGB; registered with BPN' },
        { l: 'Money involved',        r: 'Holding deposit ($2k–25k)',                   s: 'Full price in tranches' },
        { l: 'Where signed',          r: 'Online or at developer',                      s: 'PPAT notary only, in person' },
        { l: 'Refunds',               r: 'Usually full (read terms)',                   s: 'Only via SPA termination with penalties' },
      ],
    },

    faqHeading: 'Frequently asked questions',
    faq: [
      { q: 'I paid the deposit — does that mean I bought it?',
        a: 'No. The reservation deposit locks the price and the 14-day hold, but it does not transfer any rights. Ownership (or leasehold) passes only after the SPA is signed before a PPAT notary and registered with BPN.' },
      { q: 'Can I extend the hold?',
        a: 'Yes, usually free of charge with a justified reason (for example, the lawyer hasn’t finished DD). Requested in writing from the developer; documented as an extension to the reservation form. 7–14 extra days is standard.' },
      { q: 'Can I transfer the reservation to another buyer?',
        a: 'Some developers allow assignment before SPA with written consent. On the resale market it is almost always no — you must close or cancel.' },
      { q: 'What if the developer changes their mind after my deposit?',
        a: 'The reservation form usually contains a symmetric clause: if the developer walks without legal cause, they refund the deposit and pay a penalty (often equal to the deposit). In practice large developers don’t do this — too damaging to reputation.' },
      { q: 'Can I pay the deposit in crypto?',
        a: 'No. All legal deals through a PPAT notary are recorded in IDR/USD via bank wire. A crypto wire leaves no trail for the notary or the Indonesian tax office — proving you paid anything later becomes impossible.' },
    ],

    ctaHeading: 'Ready to reserve',
    ctaText: 'Open any listing and tap "Reserve" — the manager will send you a reservation form within an hour.',
    ctaVillas: 'Open villas',
    ctaApartments: 'Open apartments',
    ctaGuide: 'Full "How to buy in Bali" guide',
  },
  id: {
    home: 'Beranda',
    crumb: 'Reservasi',
    h1: 'Cara kerja reservasi properti di Bali',
    intro: 'Ketika Anda menekan «Reservasi» pada sebuah objek, properti tersebut ditahan (hold) khusus untuk Anda selama 14 hari. Halaman ini menjelaskan apa yang terjadi selanjutnya, siapa yang memegang deposit Anda, dan bagaimana pengembalian dana bila Anda berubah pikiran.',

    h2What: 'Apa itu reservasi di Bali',
    pWhat: 'Reservasi adalah langkah pertama transaksi yang tercatat secara hukum. Anda menandatangani reservation form singkat (bukan perjanjian jual beli), membayar holding deposit, dan properti ditarik dari pasar selama 14 hari — tidak ada pembeli lain yang bisa menyelesaikan pembelian pada periode itu. Waktu ini Anda gunakan untuk due diligence, menyepakati revisi SPA bersama pengacara, dan menyiapkan transfer dana berikutnya.',

    h2Hold: '14 hari eksklusivitas — apa manfaatnya',
    pHold: 'Stand-still bekerja dua arah: harga dikunci dalam reservation form, pengembang tidak bisa menaikkannya; properti benar-benar menunggu Anda. Jika dalam 14 hari itu muncul penawaran lebih tinggi, pengembang tidak boleh menerimanya. Jendela ini cukup bagi pengacara untuk menyelesaikan due diligence (biasanya 7–10 hari) dan bagi Anda untuk menegosiasikan revisi SPA.',

    h2Sign: 'Apa persisnya yang Anda tanda tangani',
    pSign: 'Reservation form adalah dokumen 1–3 halaman: harga properti, besar deposit, durasi hold (14 hari), syarat pengembalian, dan rekening bank Anda untuk pengembalian dana bila mundur. Ini BUKAN perjanjian jual beli (SPA). SPA adalah dokumen terpisah yang ditandatangani 1–2 minggu kemudian di hadapan notaris PPAT, setelah due diligence selesai. Reservation form bisa memuat klausul «non-refundable tanpa alasan hukum», tetapi praktik yang lebih umum adalah pengembalian penuh saat mundur setelah DD.',

    h2Deposit: 'Di mana deposit disimpan',
    pDeposit: 'Holding deposit di Bali biasanya $2.000–10.000 (vila premium hingga $25.000). Dana ditransfer melalui salah satu dari tiga cara: ke rekening escrow notaris PPAT (paling aman), ke rekening korporat pengembang (butuh kepercayaan pada pengembang), atau ke rekening firma hukum perantara. Jangan pernah ke rekening pribadi penjual, rekening pribadi direktur, atau rekening agen — itulah kanal penipuan paling umum dalam properti Indonesia. Selalu cocokkan instruksi transfer dengan reservation form itu sendiri, bukan dari chat messenger.',

    h2Refund: 'Bagaimana uang dikembalikan',
    pRefund: 'Praktik standar: pengembalian penuh jika Anda mundur dalam jendela 14 hari berdasarkan temuan DD. Alasan hukum (sitaan, ketidaksesuaian zonasi, masalah PBG) selalu memicu pengembalian 100%. Mundur karena «berubah pikiran» tanpa alasan — sebagian pengembang menahan deposit sebagai penalti, sebagian lain mengembalikan penuh. Syarat pengembalian selalu tertulis dalam reservation form — baca klausul itu sebelum Anda menandatangani. Setelah 14 hari tanpa SPA yang ditandatangani, deposit diperhitungkan ke termin SPA pertama atau dikembalikan, tergantung isi form.',

    h2After: 'Apa yang terjadi setelah 14 hari',
    pAfter: 'Tiga skenario. Terbaik: di akhir jendela pengacara Anda menuntaskan DD, Anda menandatangani SPA di notaris PPAT, dan holding deposit diperhitungkan ke termin SPA pertama. Tengah: Anda memperpanjang hold 7–14 hari (DD belum selesai), secara tertulis. Terburuk: Anda mundur, deposit dikembalikan, properti kembali ke pasar. Diam setelah 14 hari tanpa keputusan formal ditafsirkan berbeda-beda per form — selalu kirim keputusan tertulis (perpanjang atau mundur).',

    h2Risks: 'Hal yang perlu diperhatikan',
    risks: [
      'Instruksi transfer untuk deposit harus ada di reservation form — jangan pernah menerimanya dari chat.',
      'Baca klausul pengembalian sebelum menandatangani. «Non-refundable in any case» adalah bendera merah — mintalah revisi.',
      'Durasi hold harus dinyatakan secara eksplisit (14 hari atau lainnya). Hold tanpa batas waktu perlu dipertanyakan.',
      'Reservation form harus ditandatangani oleh pejabat PT pengembang yang tercantum dalam Akta Pendirian (dokumen pendirian). Tanda tangan agen tanpa surat kuasa adalah titik lemah.',
      'Simpan salinan PDF form yang ditandatangani, bukti transfer bank, dan percakapan messenger dengan manajer — semuanya membantu bila timbul sengketa.',
    ],

    h2What2: 'Reservation form vs SPA',
    table: {
      headLeft: '',
      headRsv: 'Reservation form',
      headSpa: 'SPA / Lease Agreement',
      rows: [
        { l: 'Kapan ditandatangani',   r: '1–3 hari pertama',                            s: '1–4 minggu setelah reservasi' },
        { l: 'Panjang dokumen',        r: '1–3 halaman',                                 s: '15–40 halaman' },
        { l: 'Kekuatan hukum',         r: 'Mengunci harga dan hold; tidak mengalihkan hak', s: 'Mengalihkan leasehold / HGB; terdaftar di BPN' },
        { l: 'Nominal uang',           r: 'Holding deposit ($2k–25k)',                   s: 'Harga penuh dalam termin' },
        { l: 'Tempat tanda tangan',    r: 'Online atau di pengembang',                   s: 'Hanya di notaris PPAT, secara langsung' },
        { l: 'Pengembalian dana',      r: 'Biasanya penuh (baca syarat)',                s: 'Hanya melalui pembatalan SPA dengan penalti' },
      ],
    },

    faqHeading: 'Pertanyaan yang sering diajukan',
    faq: [
      { q: 'Saya sudah bayar deposit — apakah berarti sudah beli?',
        a: 'Tidak. Deposit reservasi mengunci harga dan hold 14 hari, tetapi tidak mengalihkan hak apa pun. Kepemilikan (atau leasehold) baru berpindah setelah SPA ditandatangani di hadapan notaris PPAT dan terdaftar di BPN.' },
      { q: 'Bisakah hold diperpanjang?',
        a: 'Ya, biasanya gratis dengan alasan yang wajar (misalnya pengacara belum menyelesaikan DD). Diminta secara tertulis kepada pengembang; didokumentasikan sebagai perpanjangan reservation form. 7–14 hari tambahan adalah hal standar.' },
      { q: 'Bisakah reservasi dialihkan ke pembeli lain?',
        a: 'Sebagian pengembang mengizinkan pengalihan sebelum SPA dengan persetujuan tertulis. Di pasar sekunder (resale) hampir selalu tidak — Anda harus menyelesaikan atau membatalkan.' },
      { q: 'Bagaimana jika pengembang berubah pikiran setelah deposit saya?',
        a: 'Reservation form biasanya memuat klausul simetris: jika pengembang mundur tanpa alasan hukum, mereka mengembalikan deposit dan membayar penalti (sering setara deposit). Dalam praktik, pengembang besar tidak melakukan ini — terlalu merusak reputasi.' },
      { q: 'Bisakah deposit dibayar dengan kripto?',
        a: 'Tidak. Semua transaksi legal melalui notaris PPAT dicatat dalam IDR/USD via transfer bank. Transfer kripto tidak meninggalkan jejak bagi notaris maupun kantor pajak Indonesia — membuktikan bahwa Anda pernah membayar kelak menjadi mustahil.' },
    ],

    ctaHeading: 'Siap memesan',
    ctaText: 'Buka objek mana pun dan tekan «Reservasi» — manajer akan mengirimkan reservation form dalam waktu satu jam.',
    ctaVillas: 'Ke vila',
    ctaApartments: 'Ke apartemen',
    ctaGuide: 'Panduan lengkap «Cara membeli di Bali»',
  },
  fr: {
    home: 'Accueil',
    crumb: 'Réservation',
    h1: 'Comment fonctionne la réservation d’un bien à Bali',
    intro: 'Lorsque vous appuyez sur « Réserver » sur une annonce, le bien est bloqué pendant 14 jours exclusivement pour vous. Cette page explique ce qui se passe ensuite, qui détient votre acompte et comment se déroule le remboursement si vous changez d’avis.',

    h2What: 'Ce qu’est une réservation à Bali',
    pWhat: 'La réservation est la première étape juridiquement enregistrée de la transaction. Vous signez un court reservation form (et non un contrat de vente), versez un holding deposit, et le bien est retiré du marché pendant 14 jours — aucun autre acheteur ne peut finaliser un achat durant cette fenêtre. Vous utilisez ce temps pour la due diligence, négocier les modifications du SPA avec votre avocat et préparer le virement suivant.',

    h2Hold: 'Les 14 jours exclusifs — ce qu’ils vous apportent',
    pHold: 'Le gel fonctionne dans les deux sens : le prix est verrouillé dans le reservation form, le promoteur ne peut pas l’augmenter ; le bien vous attend réellement. Si une offre plus élevée arrive durant ces 14 jours, le promoteur ne peut pas l’accepter. La fenêtre suffit à l’avocat pour finir la DD (généralement 7–10 jours) et à vous pour négocier les modifications du SPA.',

    h2Sign: 'Ce que vous signez réellement',
    pSign: 'Le reservation form est un document de 1 à 3 pages : prix du bien, montant de l’acompte, durée du blocage (14 jours), conditions de remboursement, et vos coordonnées bancaires pour le remboursement en cas de retrait. Ce n’est PAS le contrat de vente (SPA). Le SPA est un document distinct signé 1 à 2 semaines plus tard devant un notaire PPAT, une fois la DD validée. Le reservation form peut inclure une clause « non remboursable sans motif légal », mais la pratique la plus courante est un remboursement intégral en cas de retrait après DD.',

    h2Deposit: 'Où se trouve l’acompte',
    pDeposit: 'Un holding deposit à Bali est généralement de 2 000 à 10 000 $ (villas premium jusqu’à 25 000 $). Les fonds sont virés de trois manières : vers le compte séquestre du notaire PPAT (le plus sûr), vers le compte de société du promoteur (exige de lui faire confiance), ou vers le compte d’un cabinet d’avocats intermédiaire. Jamais vers le compte personnel du vendeur, le compte personnel du dirigeant, ou le compte d’un agent — c’est le canal de fraude le plus courant dans l’immobilier indonésien. Vérifiez toujours les instructions de virement sur le reservation form lui-même, jamais depuis une messagerie.',

    h2Refund: 'Comment l’argent revient',
    pRefund: 'Pratique standard : remboursement intégral si vous vous retirez dans la fenêtre de 14 jours sur la base des conclusions de la DD. Les motifs légaux (charges, non-conformité de zonage, problèmes de PBG) déclenchent toujours un remboursement à 100 %. Un retrait « j’ai changé d’avis » sans motif — certains promoteurs conservent l’acompte à titre de pénalité, d’autres remboursent intégralement. Les conditions de remboursement sont toujours inscrites dans le reservation form — lisez cette clause avant de signer. Passé 14 jours sans SPA signé, l’acompte est soit imputé sur la première tranche du SPA, soit remboursé, selon le formulaire.',

    h2After: 'Ce qui se passe après 14 jours',
    pAfter: 'Trois scénarios. Meilleur cas : en fin de fenêtre votre avocat a validé la DD, vous signez le SPA chez le notaire PPAT, et le holding deposit s’impute sur la première tranche du SPA. Cas intermédiaire : vous prolongez le blocage de 7 à 14 jours (DD non terminée), par écrit. Pire cas : vous vous retirez, l’acompte est remboursé, le bien retourne sur le marché. Le silence après 14 jours sans décision formelle est interprété différemment selon le formulaire — envoyez toujours une décision écrite (prolonger ou se retirer).',

    h2Risks: 'Points de vigilance',
    risks: [
      'Les instructions de virement de l’acompte doivent figurer dans le reservation form — ne les acceptez jamais depuis une messagerie.',
      'Lisez la clause de remboursement avant de signer. « Non-refundable in any case » est un signal d’alerte — exigez une modification.',
      'La durée du blocage doit être indiquée explicitement (14 jours ou autre). Un blocage à durée indéterminée doit être questionné.',
      'Le reservation form doit être signé par un dirigeant de la PT du promoteur nommé dans l’Akta Pendirian (documents constitutifs). Une signature d’agent sans procuration est un point faible.',
      'Conservez une copie PDF du formulaire signé, le reçu du virement bancaire et l’échange de messagerie avec le manager — ils aident en cas de litige.',
    ],

    h2What2: 'Reservation form vs SPA',
    table: {
      headLeft: '',
      headRsv: 'Reservation form',
      headSpa: 'SPA / Lease Agreement',
      rows: [
        { l: 'Signé quand',            r: 'Les 1–3 premiers jours',                      s: '1–4 semaines après la réservation' },
        { l: 'Longueur du document',   r: '1–3 pages',                                   s: '15–40 pages' },
        { l: 'Portée juridique',       r: 'Verrouille le prix et le blocage ; ne transfère aucun droit', s: 'Transfère le leasehold / HGB ; enregistré au BPN' },
        { l: 'Montant en jeu',         r: 'Holding deposit (2k–25k $)',                  s: 'Prix total en tranches' },
        { l: 'Lieu de signature',     r: 'En ligne ou chez le promoteur',               s: 'Notaire PPAT uniquement, en personne' },
        { l: 'Remboursements',         r: 'Généralement intégral (lire les conditions)', s: 'Uniquement via résiliation du SPA avec pénalités' },
      ],
    },

    faqHeading: 'Questions fréquentes',
    faq: [
      { q: 'J’ai payé l’acompte — cela signifie-t-il que j’ai acheté ?',
        a: 'Non. L’acompte de réservation verrouille le prix et le blocage de 14 jours, mais ne transfère aucun droit. La propriété (ou le leasehold) n’est transférée qu’après la signature du SPA devant un notaire PPAT et son enregistrement au BPN.' },
      { q: 'Puis-je prolonger le blocage ?',
        a: 'Oui, généralement gratuitement avec un motif justifié (par exemple, l’avocat n’a pas terminé la DD). Demandé par écrit au promoteur ; documenté comme un avenant au reservation form. 7 à 14 jours supplémentaires sont la norme.' },
      { q: 'Puis-je céder la réservation à un autre acheteur ?',
        a: 'Certains promoteurs autorisent la cession avant le SPA avec accord écrit. Sur le marché de la revente, c’est presque toujours non — vous devez conclure ou annuler.' },
      { q: 'Que se passe-t-il si le promoteur change d’avis après mon acompte ?',
        a: 'Le reservation form contient généralement une clause symétrique : si le promoteur se retire sans motif légal, il rembourse l’acompte et paie une pénalité (souvent égale à l’acompte). En pratique, les grands promoteurs ne le font pas — trop néfaste pour la réputation.' },
      { q: 'Puis-je payer l’acompte en crypto ?',
        a: 'Non. Toutes les transactions légales passant par un notaire PPAT sont enregistrées en IDR/USD par virement bancaire. Un virement crypto ne laisse aucune trace pour le notaire ni pour le fisc indonésien — prouver que vous avez payé quoi que ce soit deviendrait impossible.' },
    ],

    ctaHeading: 'Prêt à réserver',
    ctaText: 'Ouvrez n’importe quelle annonce et appuyez sur « Réserver » — le manager vous enverra un reservation form sous une heure.',
    ctaVillas: 'Voir les villas',
    ctaApartments: 'Voir les appartements',
    ctaGuide: 'Guide complet « Comment acheter à Bali »',
  },
} as const

export function ReservationGuide({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const home = switchLangPath('/ru', lang)

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

        <article className="mt-4 max-w-[760px]">
          <h1 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-5">
            {c.h1}
          </h1>
          <p className="text-[16px] md:text-[17px] leading-[1.7] text-[var(--color-text)] mb-8">
            {c.intro}
          </p>

          {/* Five key facts up top — same shape as the buying guide steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-12">
            {[
              { Icon: Lock,        title: c.h2What,    body: c.pWhat },
              { Icon: Calendar,    title: c.h2Hold,    body: c.pHold },
              { Icon: FileText,    title: c.h2Sign,    body: c.pSign },
              { Icon: Wallet,      title: c.h2Deposit, body: c.pDeposit },
              { Icon: Undo2,       title: c.h2Refund,  body: c.pRefund },
              { Icon: ArrowRight,  title: c.h2After,   body: c.pAfter },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                <Icon size={18} strokeWidth={1.8} className="text-[var(--color-primary)] mb-2" />
                <h2 className="text-[16px] font-semibold text-[#111827] mb-2">{title}</h2>
                <p className="text-[14px] leading-[1.65] text-[var(--color-text-muted)]">{body}</p>
              </div>
            ))}
          </div>

          {/* Risks block */}
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">
            {c.h2Risks}
          </h2>
          <ul className="space-y-3 mb-12">
            {c.risks.map((r, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-[#FEF3C7]/40 border border-[#FCD34D]/40 p-4">
                <AlertTriangle size={18} strokeWidth={1.8} className="text-[#92400E] shrink-0 mt-0.5" />
                <span className="text-[14px] leading-[1.6] text-[#1F2937]">{r}</span>
              </li>
            ))}
          </ul>

          {/* Reservation vs SPA comparison table */}
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">
            {c.h2What2}
          </h2>
          <div className="overflow-x-auto -mx-4 px-4 mb-12">
            <table className="w-full border border-[var(--color-border)] rounded-2xl overflow-hidden text-[14px]">
              <thead>
                <tr className="bg-[var(--color-search-bg)]">
                  <th className="px-4 py-3 text-left font-semibold text-[12px] uppercase tracking-wide text-[var(--color-text-muted)]"></th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-text)]">{c.table.headRsv}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-text)]">{c.table.headSpa}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {c.table.rows.map((r, i) => (
                  <tr key={i} className="bg-white align-top">
                    <td className="px-4 py-3 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] font-medium">{r.l}</td>
                    <td className="px-4 py-3 text-[var(--color-text)]">{r.r}</td>
                    <td className="px-4 py-3 text-[var(--color-text)]">{r.s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FAQ */}
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">
            {c.faqHeading}
          </h2>
          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] mb-12">
            {c.faq.map(f => (
              <li key={f.q} className="py-4">
                <h3 className="text-[16px] font-semibold mb-1 text-[#111827]">{f.q}</h3>
                <p className="text-[14px] leading-[1.65] text-[var(--color-text-muted)]">{f.a}</p>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="rounded-2xl bg-[var(--color-search-bg)] p-6 mb-8 flex items-start gap-4">
            <ShieldCheck size={28} strokeWidth={1.6} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[20px] font-semibold text-[#111827] mb-2">{c.ctaHeading}</h2>
              <p className="text-[15px] text-[var(--color-text-muted)] mb-4">{c.ctaText}</p>
              <div className="flex flex-wrap gap-2">
                <Link href={switchLangPath('/ru/villy', lang)}        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[13px] font-medium no-underline">{c.ctaVillas}</Link>
                <Link href={switchLangPath('/ru/apartamenty', lang)}  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] bg-white">{c.ctaApartments}</Link>
                <Link href={switchLangPath('/ru/kak-kupit', lang)}    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] bg-white">{c.ctaGuide}</Link>
              </div>
            </div>
          </div>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
