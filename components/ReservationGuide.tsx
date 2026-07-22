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
  de: {
    home: 'Startseite',
    crumb: 'Reservierung',
    h1: 'Wie eine Immobilienreservierung auf Bali funktioniert',
    intro: 'Wenn Sie bei einem Angebot auf „Reservieren“ tippen, wird die Immobilie exklusiv für Sie 14 Tage lang blockiert. Diese Seite erklärt, was danach passiert, wer Ihre Anzahlung hält und wie die Rückerstattung funktioniert, falls Sie es sich anders überlegen.',

    h2What: 'Was eine Reservierung auf Bali ist',
    pWhat: 'Eine Reservierung ist der erste rechtlich erfasste Schritt im Geschäft. Sie unterschreiben ein kurzes reservation form (keinen Kaufvertrag), zahlen ein holding deposit, und die Immobilie wird für 14 Tage vom Markt genommen — kein anderer Käufer kann in diesem Zeitfenster einen Kauf abschließen. Diese Zeit nutzen Sie für die Due Diligence, stimmen SPA-Änderungen mit Ihrem Anwalt ab und bereiten die nächste Überweisung vor.',

    h2Hold: 'Die 14 exklusiven Tage — was sie Ihnen bringen',
    pHold: 'Der Stillstand wirkt in beide Richtungen: Der Preis ist im reservation form festgeschrieben, der Bauträger kann ihn nicht erhöhen; die Immobilie wartet wirklich auf Sie. Trifft in diesen 14 Tagen ein höheres Angebot ein, darf der Bauträger es nicht annehmen. Das Fenster reicht dem Anwalt, um die DD abzuschließen (in der Regel 7–10 Tage), und Ihnen, um SPA-Änderungen zu verhandeln.',

    h2Sign: 'Was Sie tatsächlich unterschreiben',
    pSign: 'Das reservation form ist ein 1–3-seitiges Dokument: Immobilienpreis, Höhe der Anzahlung, Dauer der Blockierung (14 Tage), Rückerstattungsbedingungen und Ihre Bankverbindung für die Rückerstattung, falls Sie zurücktreten. Es ist NICHT der Kaufvertrag (SPA). Der SPA ist ein separates Dokument, das 1–2 Wochen später vor einem PPAT-Notar unterzeichnet wird, nachdem die DD abgeschlossen ist. Reservation forms können eine Klausel „nicht erstattungsfähig ohne rechtlichen Grund“ enthalten, doch üblicher ist die vollständige Rückerstattung bei einem Rücktritt nach der DD.',

    h2Deposit: 'Wo die Anzahlung liegt',
    pDeposit: 'Ein holding deposit auf Bali beträgt in der Regel 2.000–10.000 $ (Premium-Villen bis zu 25.000 $). Die Gelder werden auf eine von drei Arten überwiesen: auf das Treuhandkonto des PPAT-Notars (am sichersten), auf das Firmenkonto des Bauträgers (setzt Vertrauen in ihn voraus) oder auf das Konto einer vermittelnden Anwaltskanzlei. Niemals auf das Privatkonto des Verkäufers, das Privatkonto des Direktors oder das Konto eines Maklers — das ist der häufigste Betrugsweg in der indonesischen Immobilienbranche. Prüfen Sie die Überweisungsdaten stets anhand des reservation form selbst, niemals aus einem Messenger-Chat.',

    h2Refund: 'Wie das Geld zurückkommt',
    pRefund: 'Übliche Praxis: vollständige Rückerstattung, wenn Sie innerhalb des 14-Tage-Fensters aufgrund von DD-Ergebnissen zurücktreten. Rechtliche Gründe (Belastungen, Zonierungswidersprüche, PBG-Probleme) lösen immer eine 100%ige Rückzahlung aus. Ein Rücktritt „habe es mir anders überlegt“ ohne Grund — manche Bauträger behalten die Anzahlung als Strafe, andere erstatten sie vollständig. Die Rückerstattungsbedingungen stehen immer im reservation form — lesen Sie diese Klausel, bevor Sie unterschreiben. Nach 14 Tagen ohne unterzeichneten SPA wird die Anzahlung je nach Formular entweder mit der ersten SPA-Rate verrechnet oder zurückerstattet.',

    h2After: 'Was nach 14 Tagen passiert',
    pAfter: 'Drei Wege. Bestfall: Zum Ende des Fensters hat Ihr Anwalt die DD freigegeben, Sie unterschreiben den SPA beim PPAT-Notar, und das holding deposit wird auf die erste SPA-Rate angerechnet. Mittelfall: Sie verlängern die Blockierung schriftlich um 7–14 Tage (DD nicht fertig). Schlimmster Fall: Sie treten zurück, die Anzahlung wird erstattet, die Immobilie kommt zurück auf den Markt. Schweigen nach 14 Tagen ohne formelle Entscheidung wird je nach Formular unterschiedlich ausgelegt — senden Sie immer eine schriftliche Entscheidung (verlängern oder zurücktreten).',

    h2Risks: 'Worauf Sie achten sollten',
    risks: [
      'Die Überweisungsdaten für die Anzahlung müssen im reservation form stehen — akzeptieren Sie sie nie aus einem Chat.',
      'Lesen Sie die Rückerstattungsklausel vor der Unterschrift. „Non-refundable in any case“ ist ein Warnsignal — bestehen Sie auf einer Änderung.',
      'Die Dauer der Blockierung muss ausdrücklich angegeben sein (14 Tage oder anders). Eine unbefristete Blockierung ist zu hinterfragen.',
      'Das reservation form muss von einem im Akta Pendirian (Gründungsurkunde) genannten Vertreter der PT des Bauträgers unterzeichnet werden. Eine Maklerunterschrift ohne Vollmacht ist eine Schwachstelle.',
      'Bewahren Sie eine PDF-Kopie des unterzeichneten Formulars, den Überweisungsbeleg der Bank und den Messenger-Verlauf mit dem Manager auf — sie helfen im Streitfall.',
    ],

    h2What2: 'Reservation form vs SPA',
    table: {
      headLeft: '',
      headRsv: 'Reservation form',
      headSpa: 'SPA / Lease Agreement',
      rows: [
        { l: 'Wann unterzeichnet',     r: 'Erste 1–3 Tage',                              s: '1–4 Wochen nach der Reservierung' },
        { l: 'Dokumentlänge',          r: '1–3 Seiten',                                  s: '15–40 Seiten' },
        { l: 'Rechtliche Wirkung',     r: 'Sperrt Preis und Blockierung; überträgt keine Rechte', s: 'Überträgt Leasehold / HGB; beim BPN registriert' },
        { l: 'Beteiligter Betrag',     r: 'Holding deposit (2k–25k $)',                  s: 'Vollständiger Preis in Raten' },
        { l: 'Wo unterzeichnet',       r: 'Online oder beim Bauträger',                  s: 'Nur beim PPAT-Notar, persönlich' },
        { l: 'Rückerstattung',         r: 'Meist vollständig (Bedingungen lesen)',       s: 'Nur über SPA-Kündigung mit Strafen' },
      ],
    },

    faqHeading: 'Häufige Fragen',
    faq: [
      { q: 'Ich habe die Anzahlung gezahlt — heißt das, ich habe gekauft?',
        a: 'Nein. Die Reservierungsanzahlung sperrt den Preis und die 14-tägige Blockierung, überträgt aber keine Rechte. Das Eigentum (oder Leasehold) geht erst über, nachdem der SPA vor einem PPAT-Notar unterzeichnet und beim BPN registriert wurde.' },
      { q: 'Kann ich die Blockierung verlängern?',
        a: 'Ja, meist kostenlos mit begründetem Anlass (zum Beispiel hat der Anwalt die DD nicht abgeschlossen). Schriftlich beim Bauträger anzufragen; als Nachtrag zum reservation form dokumentiert. 7–14 zusätzliche Tage sind Standard.' },
      { q: 'Kann ich die Reservierung auf einen anderen Käufer übertragen?',
        a: 'Manche Bauträger erlauben eine Übertragung vor dem SPA mit schriftlicher Zustimmung. Auf dem Zweitmarkt ist es fast immer nein — Sie müssen abschließen oder stornieren.' },
      { q: 'Was, wenn der Bauträger es sich nach meiner Anzahlung anders überlegt?',
        a: 'Das reservation form enthält meist eine symmetrische Klausel: Tritt der Bauträger ohne rechtlichen Grund zurück, erstattet er die Anzahlung und zahlt eine Strafe (oft in Höhe der Anzahlung). In der Praxis tun große Bauträger das nicht — zu schädlich für den Ruf.' },
      { q: 'Kann ich die Anzahlung in Krypto zahlen?',
        a: 'Nein. Alle legalen Geschäfte über einen PPAT-Notar werden in IDR/USD per Banküberweisung erfasst. Eine Krypto-Überweisung hinterlässt keine Spur für den Notar oder das indonesische Finanzamt — später zu beweisen, dass Sie etwas gezahlt haben, wird unmöglich.' },
    ],

    ctaHeading: 'Bereit zu reservieren',
    ctaText: 'Öffnen Sie ein beliebiges Angebot und tippen Sie auf „Reservieren“ — der Manager sendet Ihnen innerhalb einer Stunde ein reservation form.',
    ctaVillas: 'Villen ansehen',
    ctaApartments: 'Apartments ansehen',
    ctaGuide: 'Vollständiger Leitfaden „Auf Bali kaufen“',
  },
  zh: {
    home: '首页',
    crumb: '预订',
    h1: '巴厘岛房产预订如何运作',
    intro: '当您在房源上点击“预订”时，该房产将为您专属保留 14 天。本页说明接下来会发生什么、谁保管您的定金，以及如果您改变主意如何退款。',

    h2What: '什么是巴厘岛的预订',
    pWhat: '预订是交易中第一个有法律记录的步骤。您签署一份简短的 reservation form（并非买卖合同），支付 holding deposit，房产将下架 14 天——在此期间没有其他买家能够完成购买。您可利用这段时间进行尽职调查（due diligence），与律师商定 SPA 的修改，并准备下一笔汇款。',

    h2Hold: '专属的 14 天——它们为您带来什么',
    pHold: '这种冻结是双向的：价格锁定在 reservation form 中，开发商不能提价；房产确实为您保留。若在这 14 天内出现更高报价，开发商也不能接受。这个窗口足够律师完成尽职调查（通常 7–10 天），也足够您协商 SPA 的修改。',

    h2Sign: '您实际签署的是什么',
    pSign: 'reservation form 是一份 1–3 页的文件：房产价格、定金金额、保留期限（14 天）、退款条款，以及您退出时用于退款的银行信息。它不是买卖合同（SPA）。SPA 是另一份文件，在尽职调查通过后 1–2 周于 PPAT 公证人面前签署。reservation form 可能包含“无法律理由不予退款”的条款，但更常见的做法是在尽职调查后退出时全额退款。',

    h2Deposit: '定金存放在哪里',
    pDeposit: '巴厘岛的 holding deposit 通常为 2,000–10,000 美元（高端别墅可达 25,000 美元）。资金以三种方式之一汇出：汇入 PPAT 公证人的托管账户（最安全）、汇入开发商的公司账户（需信任开发商），或汇入中介律师事务所账户。切勿汇入卖方个人账户、董事个人账户或中介账户——这是印度尼西亚房地产中最常见的欺诈渠道。务必对照 reservation form 本身核对汇款信息，绝不要凭消息聊天。',

    h2Refund: '钱如何退回',
    pRefund: '标准做法：若您根据尽职调查结果在 14 天窗口内退出，全额退款。法律理由（留置权、分区不符、PBG 问题）始终触发 100% 退还。无理由的“改变主意”退出——有些开发商将定金作为罚金扣留，有些则全额退还。退款条件始终写在 reservation form 中——签署前请阅读该条款。超过 14 天仍未签署 SPA，定金将根据表格计入第一期 SPA 款项或予以退还。',

    h2After: '14 天后会发生什么',
    pAfter: '三种路径。最佳情况：窗口结束时您的律师已通过尽职调查，您在 PPAT 公证人处签署 SPA，holding deposit 计入第一期 SPA 款项。中间情况：您以书面形式将保留期延长 7–14 天（尽职调查未完成）。最坏情况：您退出，定金退还，房产重新上市。14 天后不作正式决定而保持沉默，会因表格不同而有不同解释——请务必发送书面决定（延长或退出）。',

    h2Risks: '需要注意的事项',
    risks: [
      '定金的汇款信息必须写在 reservation form 中——切勿从聊天中接受。',
      '签署前阅读退款条款。“Non-refundable in any case”（任何情况下不退款）是危险信号——坚持要求修改。',
      '保留期限必须明确说明（14 天或其他）。无期限的保留应当质疑。',
      'reservation form 必须由 Akta Pendirian（公司设立文件）中列明的开发商 PT 高管签署。中介无授权书的签名是薄弱环节。',
      '保存已签署表格的 PDF 副本、银行汇款回执，以及与经理的消息记录——发生争议时会有帮助。',
    ],

    h2What2: 'Reservation form 与 SPA 对比',
    table: {
      headLeft: '',
      headRsv: 'Reservation form',
      headSpa: 'SPA / Lease Agreement',
      rows: [
        { l: '何时签署',   r: '最初 1–3 天',                                 s: '预订后 1–4 周' },
        { l: '文件长度',   r: '1–3 页',                                      s: '15–40 页' },
        { l: '法律效力',   r: '锁定价格与保留；不转移任何权利',              s: '转移 leasehold / HGB；在 BPN 登记' },
        { l: '涉及金额',   r: 'Holding deposit（2k–25k 美元）',              s: '分期支付全款' },
        { l: '签署地点',   r: '线上或在开发商处',                            s: '仅在 PPAT 公证人处，亲自办理' },
        { l: '退款',       r: '通常全额（阅读条款）',                        s: '仅通过解除 SPA 并支付罚金' },
      ],
    },

    faqHeading: '常见问题',
    faq: [
      { q: '我付了定金——这意味着我已经买下了吗？',
        a: '不。预订定金锁定价格和 14 天保留，但不转移任何权利。所有权（或 leasehold）只有在 SPA 于 PPAT 公证人面前签署并在 BPN 登记后才转移。' },
      { q: '我可以延长保留期吗？',
        a: '可以，通常在有正当理由时免费（例如律师尚未完成尽职调查）。以书面形式向开发商申请；作为 reservation form 的补充记录。7–14 天的额外时间是标准做法。' },
      { q: '我可以把预订转让给其他买家吗？',
        a: '部分开发商允许在签署 SPA 前经书面同意转让。在二手市场几乎总是不行——您必须完成或取消。' },
      { q: '如果开发商在我付定金后改变主意怎么办？',
        a: 'reservation form 通常包含对称条款：若开发商无法律理由退出，须退还定金并支付罚金（通常与定金相等）。实践中大型开发商不会这样做——对声誉损害太大。' },
      { q: '定金可以用加密货币支付吗？',
        a: '不。所有通过 PPAT 公证人的合法交易均以 IDR/USD 通过银行汇款记录。加密货币汇款不会为公证人或印度尼西亚税务机关留下痕迹——日后要证明您支付过任何款项将变得不可能。' },
    ],

    ctaHeading: '准备好预订了',
    ctaText: '打开任意房源并点击“预订”——经理将在一小时内向您发送 reservation form。',
    ctaVillas: '查看别墅',
    ctaApartments: '查看公寓',
    ctaGuide: '完整的“如何在巴厘岛购房”指南',
  },
  nl: {
    home: 'Home',
    crumb: 'Reservering',
    h1: 'Hoe een vastgoedreservering op Bali werkt',
    intro: 'Wanneer u bij een aanbod op „Reserveren“ tikt, wordt het object 14 dagen exclusief voor u vastgehouden. Deze pagina legt uit wat er daarna gebeurt, wie uw aanbetaling beheert en hoe restitutie werkt als u van gedachten verandert.',

    h2What: 'Wat een reservering op Bali is',
    pWhat: 'Een reservering is de eerste juridisch vastgelegde stap in de transactie. U ondertekent een kort reservation form (geen koopovereenkomst), betaalt een holding deposit, en het object wordt 14 dagen uit de markt gehaald — geen andere koper kan in dat venster een aankoop afronden. Deze tijd gebruikt u voor due diligence, om SPA-aanpassingen met uw advocaat af te stemmen en de volgende overboeking voor te bereiden.',

    h2Hold: 'De 14 exclusieve dagen — wat ze u opleveren',
    pHold: 'De stilstand werkt beide kanten op: de prijs staat vast in het reservation form, de ontwikkelaar kan hem niet verhogen; het object wacht echt op u. Komt er in die 14 dagen een hoger bod, dan mag de ontwikkelaar het niet accepteren. Het venster is voldoende voor een advocaat om de DD af te ronden (doorgaans 7–10 dagen) en voor u om SPA-aanpassingen te onderhandelen.',

    h2Sign: 'Wat u daadwerkelijk ondertekent',
    pSign: 'Het reservation form is een document van 1–3 pagina’s: objectprijs, hoogte van de aanbetaling, duur van de vasthouding (14 dagen), restitutievoorwaarden en uw bankgegevens voor restitutie als u afziet. Het is NIET de koopovereenkomst (SPA). De SPA is een apart document dat 1–2 weken later voor een PPAT-notaris wordt ondertekend, nadat de DD is afgerond. Reservation forms kunnen een clausule „niet-restitueerbaar zonder juridische grond“ bevatten, maar gebruikelijker is volledige restitutie bij afzien na de DD.',

    h2Deposit: 'Waar de aanbetaling staat',
    pDeposit: 'Een holding deposit op Bali is doorgaans $2.000–10.000 (premium villa’s tot $25.000). Het geld wordt op een van drie manieren overgemaakt: naar de escrow van de PPAT-notaris (het veiligst), naar de zakelijke rekening van de ontwikkelaar (vereist vertrouwen in de ontwikkelaar), of naar de rekening van een tussenkomend advocatenkantoor. Nooit naar de privérekening van de verkoper, de privérekening van de directeur of de rekening van een makelaar — dat is het meest voorkomende fraudekanaal in het Indonesische vastgoed. Controleer de overboekingsgegevens altijd aan de hand van het reservation form zelf, nooit uit een messengerchat.',

    h2Refund: 'Hoe het geld terugkomt',
    pRefund: 'Standaardpraktijk: volledige restitutie als u binnen het venster van 14 dagen afziet op basis van DD-bevindingen. Juridische gronden (beslagen, bestemmingsconflict, PBG-problemen) leiden altijd tot 100% teruggave. Een „ik heb me bedacht“-afzien zonder grond — sommige ontwikkelaars houden de aanbetaling als boete, andere betalen volledig terug. De restitutievoorwaarden staan altijd in het reservation form — lees die clausule voordat u tekent. Na 14 dagen zonder ondertekende SPA wordt de aanbetaling ofwel met de eerste SPA-termijn verrekend, ofwel terugbetaald, afhankelijk van het formulier.',

    h2After: 'Wat er na 14 dagen gebeurt',
    pAfter: 'Drie paden. Beste geval: aan het einde van het venster heeft uw advocaat de DD goedgekeurd, tekent u de SPA bij de PPAT-notaris en telt het holding deposit mee voor de eerste SPA-termijn. Middengeval: u verlengt de vasthouding schriftelijk met 7–14 dagen (DD niet klaar). Slechtste geval: u ziet af, de aanbetaling wordt terugbetaald, het object gaat terug de markt op. Stilte na 14 dagen zonder formeel besluit wordt per formulier anders uitgelegd — stuur altijd een schriftelijk besluit (verlengen of afzien).',

    h2Risks: 'Waar u op moet letten',
    risks: [
      'De overboekingsgegevens voor de aanbetaling moeten in het reservation form staan — accepteer ze nooit uit een chat.',
      'Lees de restitutieclausule voordat u tekent. „Non-refundable in any case“ is een rode vlag — dring aan op een aanpassing.',
      'De duur van de vasthouding moet expliciet vermeld zijn (14 dagen of anders). Een vasthouding zonder einddatum vraagt om een vraag.',
      'Het reservation form moet worden ondertekend door een functionaris van de PT van de ontwikkelaar die in de Akta Pendirian (oprichtingsdocumenten) is genoemd. Een makelaarshandtekening zonder volmacht is een zwakke schakel.',
      'Bewaar een pdf-kopie van het ondertekende formulier, het bankoverschrijvingsbewijs en de messengerthread met de manager — die helpen bij een geschil.',
    ],

    h2What2: 'Reservation form vs SPA',
    table: {
      headLeft: '',
      headRsv: 'Reservation form',
      headSpa: 'SPA / Lease Agreement',
      rows: [
        { l: 'Wanneer ondertekend',    r: 'Eerste 1–3 dagen',                            s: '1–4 weken na de reservering' },
        { l: 'Documentlengte',         r: '1–3 pagina’s',                                s: '15–40 pagina’s' },
        { l: 'Juridisch gewicht',      r: 'Zet prijs en vasthouding vast; draagt geen rechten over', s: 'Draagt leasehold / HGB over; geregistreerd bij BPN' },
        { l: 'Betrokken bedrag',       r: 'Holding deposit ($2k–25k)',                   s: 'Volledige prijs in termijnen' },
        { l: 'Waar ondertekend',       r: 'Online of bij de ontwikkelaar',               s: 'Alleen bij PPAT-notaris, in persoon' },
        { l: 'Restitutie',             r: 'Meestal volledig (lees voorwaarden)',         s: 'Alleen via SPA-beëindiging met boetes' },
      ],
    },

    faqHeading: 'Veelgestelde vragen',
    faq: [
      { q: 'Ik heb de aanbetaling betaald — betekent dat dat ik het gekocht heb?',
        a: 'Nee. De reserveringsaanbetaling zet de prijs en de vasthouding van 14 dagen vast, maar draagt geen rechten over. Eigendom (of leasehold) gaat pas over nadat de SPA voor een PPAT-notaris is ondertekend en bij BPN is geregistreerd.' },
      { q: 'Kan ik de vasthouding verlengen?',
        a: 'Ja, meestal kosteloos met een gegronde reden (bijvoorbeeld de advocaat heeft de DD niet afgerond). Schriftelijk aan te vragen bij de ontwikkelaar; gedocumenteerd als aanvulling op het reservation form. 7–14 extra dagen is standaard.' },
      { q: 'Kan ik de reservering overdragen aan een andere koper?',
        a: 'Sommige ontwikkelaars staan overdracht vóór de SPA toe met schriftelijke toestemming. Op de doorverkoopmarkt is het bijna altijd nee — u moet afronden of annuleren.' },
      { q: 'Wat als de ontwikkelaar zich bedenkt na mijn aanbetaling?',
        a: 'Het reservation form bevat meestal een symmetrische clausule: ziet de ontwikkelaar zonder juridische grond af, dan betaalt hij de aanbetaling terug en een boete (vaak gelijk aan de aanbetaling). In de praktijk doen grote ontwikkelaars dit niet — te schadelijk voor de reputatie.' },
      { q: 'Kan ik de aanbetaling in crypto betalen?',
        a: 'Nee. Alle legale transacties via een PPAT-notaris worden in IDR/USD via bankoverschrijving vastgelegd. Een crypto-overboeking laat geen spoor na voor de notaris of de Indonesische Belastingdienst — later bewijzen dat u iets betaald hebt, wordt onmogelijk.' },
    ],

    ctaHeading: 'Klaar om te reserveren',
    ctaText: 'Open een willekeurig aanbod en tik op „Reserveren“ — de manager stuurt u binnen een uur een reservation form.',
    ctaVillas: 'Villa’s bekijken',
    ctaApartments: 'Appartementen bekijken',
    ctaGuide: 'Volledige gids „Kopen op Bali“',
  },
  ban: {
    home: 'Beranda',
    crumb: 'Reservasi',
    h1: 'Sapunapi carane reservasi properti ring Bali',
    intro: 'Rikala Ragane nyentuh „Reservasi“ ring listing, properti punika katahan khusus antuk Ragane salami 14 dina. Kaca puniki nlatarang napi sane wenten salanturnyane, sira sane ngamong deposit Ragane, miwah sapunapi carane ngwaliang jinah yening Ragane magentos pikayun.',

    h2What: 'Napi reservasi ring Bali punika',
    pWhat: 'Reservasi inggih punika langkah kapertama sane kacatet secara hukum ring transaksi. Ragane nandatangani reservation form sane bawak (boya perjanjian adol-tumbas), mayah holding deposit, tur properti kaangkat saking pasar salami 14 dina — nenten wenten pembeli lianan sane prasida muputang tumbasan ring periode punika. Galah puniki kanggen due diligence, ngraosang revisi SPA sareng pengacara, tur nyiagayang transfer jinah salanturnyane.',

    h2Hold: '14 dina eksklusif — napi paikenan ipun',
    pHold: 'Stand-still puniki mamargi kalih arah: aji kakunci ring reservation form, pangwangun nenten prasida ngunggahang; properti janten nyantosang Ragane. Yening ring 14 dina punika wenten penawaran sane luwihan, pangwangun nenten dados nampi. Jendela puniki cukup antuk pengacara muputang due diligence (biasane 7–10 dina) tur antuk Ragane ngraosang revisi SPA.',

    h2Sign: 'Napi sane sujatinnyane katandatangani Ragane',
    pSign: 'Reservation form inggih punika dokumen 1–3 kaca: aji properti, ageng deposit, durasi hold (14 dina), syarat pengembalian, miwah rekening bank Ragane antuk pengembalian yening mundur. Puniki BOYA perjanjian adol-tumbas (SPA). SPA inggih punika dokumen sane malianan, katandatangani 1–2 minggu salanturnyane ring ajeng notaris PPAT, sasampun due diligence puput. Reservation form dados madaging klausul „non-refundable tanpa alasan hukum“, nanging praktik sane lumrah inggih punika pengembalian penuh yening mundur sasampun DD.',

    h2Deposit: 'Ring dija deposit kagenahang',
    pDeposit: 'Holding deposit ring Bali biasane $2.000–10.000 (vila premium ngantos $25.000). Jinah katransfer nganggen silih tunggil saking tigang cara: ka rekening escrow notaris PPAT (pinih aman), ka rekening korporat pangwangun (merluang kapercayan ring pangwangun), utawi ka rekening firma hukum perantara. Sampunang pisan ka rekening pribadi sang adol, rekening pribadi direktur, utawi rekening agen — punika kanal penipuan sane pinih lumrah ring properti Indonesia. Setata cocokang instruksi transfer sareng reservation form punika newek, boya saking chat messenger.',

    h2Refund: 'Sapunapi jinah kawaliang',
    pRefund: 'Praktik standar: pengembalian penuh yening Ragane mundur ring jendela 14 dina manut temuan DD. Alasan hukum (sita, zonasi nenten cocok, pikobet PBG) setata ngwetuang pengembalian 100%. Mundur „magentos pikayun“ tanpa alasan — wenten pangwangun sane nahan deposit dados denda, wenten sane ngwaliang penuh. Syarat pengembalian setata kasurat ring reservation form — wacen klausul punika sadurung nandatangani. Sasampun 14 dina tanpa SPA sane katandatangani, deposit kaetang ring termin SPA kapertama utawi kawaliang, manut isin form.',

    h2After: 'Napi sane wenten sasampun 14 dina',
    pAfter: 'Tigang skenario. Pinih becik: ring pamuput jendela pengacara Ragane sampun muputang DD, Ragane nandatangani SPA ring notaris PPAT, tur holding deposit kaetang ring termin SPA kapertama. Tengah: Ragane ngelanturang hold 7–14 dina (DD durung puput), secara tertulis. Pinih kaon: Ragane mundur, deposit kawaliang, properti mawali ka pasar. Meneng sasampun 14 dina tanpa kaputusan formal kaartiang malianan manut form — setata kirim kaputusan tertulis (lanturang utawi mundur).',

    h2Risks: 'Sane patut kauratiang',
    risks: [
      'Instruksi transfer antuk deposit patut wenten ring reservation form — sampunang pisan nampi saking chat.',
      'Wacen klausul pengembalian sadurung nandatangani. „Non-refundable in any case“ inggih punika tanda bahaya — tunas revisi.',
      'Durasi hold patut kasurat secara jelas (14 dina utawi lianan). Hold tanpa wates galah patut katakenang.',
      'Reservation form patut katandatangani olih pejabat PT pangwangun sane kasebut ring Akta Pendirian (dokumen pendirian). Tandatangan agen tanpa surat kuasa inggih punika titik lemah.',
      'Simpen salinan PDF form sane katandatangani, bukti transfer bank, miwah percakapan messenger sareng manajer — sami nulungin yening wenten sengketa.',
    ],

    h2What2: 'Reservation form vs SPA',
    table: {
      headLeft: '',
      headRsv: 'Reservation form',
      headSpa: 'SPA / Lease Agreement',
      rows: [
        { l: 'Rikala katandatangani',  r: '1–3 dina kapertama',                          s: '1–4 minggu sasampun reservasi' },
        { l: 'Panjang dokumen',        r: '1–3 kaca',                                    s: '15–40 kaca' },
        { l: 'Kekuatan hukum',         r: 'Ngunci aji lan hold; nenten ngalihang hak',   s: 'Ngalihang leasehold / HGB; kadaftar ring BPN' },
        { l: 'Nominal jinah',          r: 'Holding deposit ($2k–25k)',                   s: 'Aji penuh ring termin' },
        { l: 'Genah tandatangan',      r: 'Online utawi ring pangwangun',                s: 'Wantah ring notaris PPAT, secara langsung' },
        { l: 'Pengembalian jinah',     r: 'Biasane penuh (wacen syarat)',                s: 'Wantah malarapan pembatalan SPA madaging denda' },
      ],
    },

    faqHeading: 'Patakon sane sering katakenang',
    faq: [
      { q: 'Tiang sampun mayah deposit — punapi mateges tiang sampun numbas?',
        a: 'Nenten. Deposit reservasi ngunci aji lan hold 14 dina, nanging nenten ngalihang hak napi ja. Kepemilikan (utawi leasehold) wau mawali sasampun SPA katandatangani ring ajeng notaris PPAT tur kadaftar ring BPN.' },
      { q: 'Punapi hold prasida kalanturang?',
        a: 'Inggih, biasane gratis yening wenten alasan sane wajar (upami pengacara durung muputang DD). Katunas secara tertulis ring pangwangun; kadokumentasiang dados perpanjangan reservation form. 7–14 dina tambahan inggih punika hal standar.' },
      { q: 'Punapi reservasi prasida kaalihang ka pembeli lianan?',
        a: 'Wenten pangwangun sane ngwehin pengalihan sadurung SPA madasar persetujuan tertulis. Ring pasar sekunder (resale) meh setata nenten — Ragane patut muputang utawi mbatalang.' },
      { q: 'Sapunapi yening pangwangun magentos pikayun sasampun deposit tiang?',
        a: 'Reservation form biasane madaging klausul simetris: yening pangwangun mundur tanpa alasan hukum, ipun ngwaliang deposit tur mayah denda (sering pateh sareng deposit). Ring praktik, pangwangun ageng nenten nglaksanayang puniki — kaon pisan antuk reputasi.' },
      { q: 'Punapi deposit prasida kabayah nganggen kripto?',
        a: 'Nenten. Sami transaksi legal malarapan notaris PPAT kacatet ring IDR/USD via transfer bank. Transfer kripto nenten ninggalang jejak antuk notaris utawi kantor pajak Indonesia — ngwuktiang Ragane naenin mayah punapa-punapi salanturnyane dados nenten mresidayang.' },
    ],

    ctaHeading: 'Sampun sayaga reservasi',
    ctaText: 'Bukak listing sane encen ja tur cotot „Reservasi“ — manajer jagi ngirim reservation form ring galah asiki jam.',
    ctaVillas: 'Ka vila',
    ctaApartments: 'Ka apartemen',
    ctaGuide: 'Panduan lengkap „Sapunapi numbas ring Bali“',
  },
  pl: {
    home: 'Strona główna',
    crumb: 'Rezerwacja',
    h1: 'Jak działa rezerwacja nieruchomości na Bali',
    intro: 'Gdy dotkniesz „Rezerwuj” przy ofercie, nieruchomość zostaje zablokowana na 14 dni wyłącznie dla ciebie. Ta strona wyjaśnia, co dzieje się dalej, kto przechowuje twój depozyt i jak działają zwroty, jeśli zmienisz zdanie.',

    h2What: 'Czym jest rezerwacja na Bali',
    pWhat: 'Rezerwacja to pierwszy prawnie odnotowany krok w transakcji. Podpisujesz krótki formularz rezerwacji (nie umowę sprzedaży), wpłacasz zadatek rezerwacyjny, a nieruchomość zostaje wycofana z rynku na 14 dni — żaden inny kupujący nie może w tym oknie sfinalizować zakupu. Ten czas wykorzystujesz na due diligence, uzgodnienie zmian w SPA z prawnikiem i przygotowanie kolejnego przelewu.',

    h2Hold: '14 dni wyłączności — co ci dają',
    pHold: 'Wstrzymanie działa w obie strony: cena jest zablokowana w formularzu rezerwacji, deweloper nie może jej podnieść; nieruchomość rzeczywiście na ciebie czeka. Jeśli w ciągu tych 14 dni pojawi się wyższa oferta, deweloper nie może jej przyjąć. Okno wystarcza, by prawnik zakończył DD (zwykle 7–10 dni) i byś wynegocjował zmiany w SPA.',

    h2Sign: 'Co faktycznie podpisujesz',
    pSign: 'Formularz rezerwacji to dokument na 1–3 strony: cena nieruchomości, kwota depozytu, czas trwania blokady (14 dni), warunki zwrotu i twoje dane bankowe do zwrotu, jeśli się wycofasz. To NIE jest umowa sprzedaży (SPA). SPA to osobny dokument podpisywany 1–2 tygodnie później przed notariuszem PPAT, po zakończeniu DD. Formularze rezerwacji mogą zawierać klauzulę „bezzwrotny bez podstawy prawnej”, ale częstszą praktyką jest pełny zwrot przy wycofaniu się po DD.',

    h2Deposit: 'Gdzie trzymany jest depozyt',
    pDeposit: 'Zadatek rezerwacyjny na Bali to zwykle 2 000–10 000 $ (wille premium do 25 000 $). Środki trafiają na jeden z trzech sposobów: na escrow notariusza PPAT (najbezpieczniej), na rachunek firmowy dewelopera (wymaga zaufania do dewelopera) lub na rachunek pośredniczącej kancelarii. Nigdy na prywatne konto sprzedającego, prywatne konto dyrektora ani konto agenta — to najczęstszy kanał oszustwa w indonezyjskiej nieruchomości. Zawsze weryfikuj instrukcje przelewu z samym formularzem rezerwacji, nigdy z czatu w komunikatorze.',

    h2Refund: 'Jak wracają pieniądze',
    pRefund: 'Standardowa praktyka: pełny zwrot, jeśli wycofasz się w oknie 14 dni na podstawie ustaleń DD. Podstawy prawne (obciążenia, niezgodność zonowania, problemy z PBG) zawsze uruchamiają 100% zwrot. Wycofanie „zmieniłem zdanie” bez podstawy — niektórzy deweloperzy zatrzymują depozyt jako karę, inni zwracają w całości. Warunki zwrotu są zawsze zapisane w formularzu rezerwacji — przeczytaj tę klauzulę przed podpisaniem. Po 14 dniach bez podpisanego SPA depozyt albo przechodzi na pierwszą transzę SPA, albo jest zwracany, zależnie od formularza.',

    h2After: 'Co dzieje się po 14 dniach',
    pAfter: 'Trzy ścieżki. Najlepszy przypadek: do końca okna prawnik zakończył DD, podpisujesz SPA u notariusza PPAT, a zadatek rezerwacyjny zalicza się na pierwszą transzę SPA. Przypadek pośredni: przedłużasz blokadę o 7–14 dni (DD się nie zakończyło), na piśmie. Najgorszy przypadek: wycofujesz się, depozyt jest zwracany, nieruchomość wraca na rynek. Milczenie po 14 dniach bez formalnej decyzji jest różnie interpretowane w zależności od formularza — zawsze wysyłaj decyzję na piśmie (przedłużenie lub rezygnacja).',

    h2Risks: 'Na co uważać',
    risks: [
      'Instrukcje przelewu depozytu muszą być w formularzu rezerwacji — nigdy nie przyjmuj ich z czatu.',
      'Przeczytaj klauzulę zwrotu przed podpisaniem. „Bezzwrotny w każdym przypadku” to czerwona flaga — nalegaj na zmianę.',
      'Czas trwania blokady musi być wyraźnie określony (14 dni lub inny). Blokada bezterminowa wymaga pytania.',
      'Formularz rezerwacji musi być podpisany przez osobę uprawnioną z PT dewelopera wskazaną w Akta Pendirian (dokumentach założycielskich). Podpis agenta bez pełnomocnictwa to słabe ogniwo.',
      'Zachowaj kopię PDF podpisanego formularza, potwierdzenie przelewu bankowego i wątek z menedżerem w komunikatorze — pomogą, jeśli powstanie spór.',
    ],

    h2What2: 'Formularz rezerwacji a SPA',
    table: {
      headLeft: '',
      headRsv: 'Formularz rezerwacji',
      headSpa: 'SPA / umowa leasehold',
      rows: [
        { l: 'Kiedy podpisywany',      r: 'Pierwsze 1–3 dni',                            s: '1–4 tygodnie po rezerwacji' },
        { l: 'Długość dokumentu',      r: '1–3 strony',                                  s: '15–40 stron' },
        { l: 'Waga prawna',            r: 'Blokuje cenę i termin; nie przenosi praw',    s: 'Przenosi leasehold / HGB; rejestrowany w BPN' },
        { l: 'Zaangażowane pieniądze', r: 'Zadatek rezerwacyjny (2–25 tys. $)',          s: 'Pełna cena w transzach' },
        { l: 'Gdzie podpisywany',      r: 'Online lub u dewelopera',                     s: 'Wyłącznie u notariusza PPAT, osobiście' },
        { l: 'Zwroty',                 r: 'Zwykle pełne (czytaj warunki)',               s: 'Tylko przez rozwiązanie SPA z karami' },
      ],
    },

    faqHeading: 'Najczęściej zadawane pytania',
    faq: [
      { q: 'Wpłaciłem depozyt — czy to znaczy, że kupiłem?',
        a: 'Nie. Depozyt rezerwacyjny blokuje cenę i 14-dniowy termin, ale nie przenosi żadnych praw. Własność (lub leasehold) przechodzi dopiero po podpisaniu SPA przed notariuszem PPAT i rejestracji w BPN.' },
      { q: 'Czy mogę przedłużyć blokadę?',
        a: 'Tak, zwykle bezpłatnie z uzasadnionym powodem (na przykład prawnik nie zakończył DD). Zgłaszane na piśmie do dewelopera; dokumentowane jako przedłużenie formularza rezerwacji. Standardem jest 7–14 dodatkowych dni.' },
      { q: 'Czy mogę przenieść rezerwację na innego kupującego?',
        a: 'Niektórzy deweloperzy dopuszczają cesję przed SPA za pisemną zgodą. Na rynku wtórnym prawie zawsze nie — musisz sfinalizować lub anulować.' },
      { q: 'Co, jeśli deweloper zmieni zdanie po moim depozycie?',
        a: 'Formularz rezerwacji zwykle zawiera symetryczną klauzulę: jeśli deweloper wycofa się bez podstawy prawnej, zwraca depozyt i płaci karę (często równą depozytowi). W praktyce duzi deweloperzy tego nie robią — zbyt szkodliwe dla reputacji.' },
      { q: 'Czy mogę wpłacić depozyt w kryptowalucie?',
        a: 'Nie. Wszystkie legalne transakcje przez notariusza PPAT są rejestrowane w IDR/USD przelewem bankowym. Przelew krypto nie zostawia śladu dla notariusza ani indonezyjskiego urzędu skarbowego — udowodnienie, że cokolwiek zapłaciłeś, staje się później niemożliwe.' },
    ],

    ctaHeading: 'Gotowy do rezerwacji',
    ctaText: 'Otwórz dowolną ofertę i dotknij „Rezerwuj” — menedżer prześle ci formularz rezerwacji w ciągu godziny.',
    ctaVillas: 'Otwórz wille',
    ctaApartments: 'Otwórz apartamenty',
    ctaGuide: 'Pełny przewodnik „Jak kupić na Bali”',
  },
  uk: {
    home: 'Головна',
    crumb: 'Бронювання',
    h1: 'Як працює бронювання нерухомості на Балі',
    intro: 'Коли ви натискаєте «Забронювати» на обʼєкті, нерухомість блокується на 14 днів виключно для вас. Ця сторінка пояснює, що відбувається далі, хто зберігає ваш депозит і як працюють повернення, якщо ви передумаєте.',

    h2What: 'Що таке бронювання на Балі',
    pWhat: 'Бронювання — це перший юридично зафіксований крок в угоді. Ви підписуєте коротку форму бронювання (не договір купівлі-продажу), вносите завдаток, і нерухомість знімають з ринку на 14 днів — жоден інший покупець не може завершити купівлю в цьому вікні. Цей час ви використовуєте для дью-ділідженс, узгодження правок SPA з юристом і підготовки наступного переказу.',

    h2Hold: '14 днів ексклюзиву — що вони вам дають',
    pHold: 'Призупинення діє в обидва боки: ціна зафіксована у формі бронювання, забудовник не може її підняти; нерухомість справді чекає на вас. Якщо за ці 14 днів надійде вища пропозиція, забудовник не може її прийняти. Вікна достатньо, щоб юрист завершив DD (зазвичай 7–10 днів) і щоб ви домовилися про правки SPA.',

    h2Sign: 'Що ви насправді підписуєте',
    pSign: 'Форма бронювання — це документ на 1–3 сторінки: ціна нерухомості, сума депозиту, тривалість блокування (14 днів), умови повернення та ваші банківські реквізити для повернення, якщо ви відмовитесь. Це НЕ договір купівлі-продажу (SPA). SPA — окремий документ, який підписують через 1–2 тижні перед нотаріусом PPAT, після завершення DD. Форми бронювання можуть містити пункт «безповоротний без правової підстави», але поширенішою практикою є повне повернення при відмові після DD.',

    h2Deposit: 'Де зберігається депозит',
    pDeposit: 'Завдаток на Балі зазвичай становить 2 000–10 000 $ (преміум-вілли до 25 000 $). Кошти йдуть одним із трьох способів: на ескроу нотаріуса PPAT (найбезпечніше), на корпоративний рахунок забудовника (потребує довіри до забудовника) або на рахунок юридичної фірми-посередника. Ніколи на особистий рахунок продавця, особистий рахунок директора чи рахунок агента — це найпоширеніший канал шахрайства в індонезійській нерухомості. Завжди звіряйте реквізити переказу із самою формою бронювання, ніколи з чату в месенджері.',

    h2Refund: 'Як повертаються гроші',
    pRefund: 'Стандартна практика: повне повернення, якщо ви відмовляєтесь у вікні 14 днів на основі висновків DD. Правові підстави (обтяження, невідповідність зонування, проблеми з PBG) завжди дають 100% повернення. Відмова «передумав» без підстави — деякі забудовники утримують депозит як штраф, інші повертають повністю. Умови повернення завжди прописані у формі бронювання — прочитайте цей пункт перед підписанням. Після 14 днів без підписаного SPA депозит або переходить у перший транш SPA, або повертається, залежно від форми.',

    h2After: 'Що відбувається після 14 днів',
    pAfter: 'Три шляхи. Найкращий випадок: до кінця вікна ваш юрист завершив DD, ви підписуєте SPA в нотаріуса PPAT, а завдаток зараховується в перший транш SPA. Проміжний випадок: ви продовжуєте блокування на 7–14 днів (DD не завершився), письмово. Найгірший випадок: ви відмовляєтесь, депозит повертається, нерухомість повертається на ринок. Мовчання після 14 днів без формального рішення трактується по-різному залежно від форми — завжди надсилайте письмове рішення (продовжити чи відмовитись).',

    h2Risks: 'На що звертати увагу',
    risks: [
      'Реквізити переказу депозиту мають бути у формі бронювання — ніколи не приймайте їх із чату.',
      'Прочитайте пункт про повернення перед підписанням. «Безповоротний у будь-якому разі» — червоний прапорець, наполягайте на правці.',
      'Тривалість блокування має бути вказана явно (14 днів або інша). Безстрокове блокування потребує запитання.',
      'Форму бронювання має підписати посадовець PT забудовника, названий в Akta Pendirian (установчих документах). Підпис агента без довіреності — слабка ланка.',
      'Зберігайте PDF-копію підписаної форми, банківську квитанцію про переказ і листування з менеджером у месенджері — вони допоможуть, якщо виникне спір.',
    ],

    h2What2: 'Форма бронювання проти SPA',
    table: {
      headLeft: '',
      headRsv: 'Форма бронювання',
      headSpa: 'SPA / договір leasehold',
      rows: [
        { l: 'Коли підписується',      r: 'Перші 1–3 дні',                               s: '1–4 тижні після бронювання' },
        { l: 'Обсяг документа',        r: '1–3 сторінки',                                s: '15–40 сторінок' },
        { l: 'Юридична вага',          r: 'Фіксує ціну і термін; не передає прав',       s: 'Передає leasehold / HGB; реєструється в BPN' },
        { l: 'Задіяні гроші',          r: 'Завдаток (2–25 тис. $)',                      s: 'Повна ціна траншами' },
        { l: 'Де підписується',        r: 'Онлайн або в забудовника',                    s: 'Лише в нотаріуса PPAT, особисто' },
        { l: 'Повернення',             r: 'Зазвичай повне (читайте умови)',              s: 'Лише через розірвання SPA зі штрафами' },
      ],
    },

    faqHeading: 'Часті запитання',
    faq: [
      { q: 'Я вніс депозит — це означає, що я купив?',
        a: 'Ні. Депозит бронювання фіксує ціну і 14-денний термін, але не передає жодних прав. Власність (або leasehold) переходить лише після підписання SPA перед нотаріусом PPAT і реєстрації в BPN.' },
      { q: 'Чи можу я продовжити блокування?',
        a: 'Так, зазвичай безкоштовно з обґрунтованою причиною (наприклад, юрист не завершив DD). Запитується письмово у забудовника; документується як продовження форми бронювання. Стандарт — 7–14 додаткових днів.' },
      { q: 'Чи можу я передати бронювання іншому покупцю?',
        a: 'Деякі забудовники дозволяють переуступку до SPA за письмовою згодою. На вторинному ринку майже завжди ні — треба закрити або скасувати.' },
      { q: 'Що, якщо забудовник передумає після мого депозиту?',
        a: 'Форма бронювання зазвичай містить симетричний пункт: якщо забудовник відмовляється без правової підстави, він повертає депозит і сплачує штраф (часто рівний депозиту). На практиці великі забудовники цього не роблять — надто шкідливо для репутації.' },
      { q: 'Чи можу я внести депозит у криптовалюті?',
        a: 'Ні. Усі легальні угоди через нотаріуса PPAT реєструються в IDR/USD банківським переказом. Крипто-переказ не залишає сліду для нотаріуса чи індонезійської податкової — довести, що ви щось заплатили, пізніше стає неможливо.' },
    ],

    ctaHeading: 'Готові забронювати',
    ctaText: 'Відкрийте будь-який обʼєкт і натисніть «Забронювати» — менеджер надішле вам форму бронювання протягом години.',
    ctaVillas: 'Відкрити вілли',
    ctaApartments: 'Відкрити апартаменти',
    ctaGuide: 'Повний посібник «Як купити на Балі»',
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
