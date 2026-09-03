// Knowledge articles kept for readers but excluded from search.
//
// The EN knowledge pool is the site's biggest source of impressions (4667 in
// GSC 08.07–04.08) and converts at 0.58% — because a large slice of it is
// tourist trivia that can never bring a buyer or an agent. Sharks, snake
// bites, Balinese castes and air-conditioner settings rank on page two, take
// almost no clicks, and blur what a real-estate domain is about.
//
// These stay live and linked (they are decent articles, and deleting content
// is the editor's call, not SEO's) — they just stop competing for the site's
// topical profile.
//
// The tourist levy piece used to be exempt here on the grounds that it was
// written for investors and was the site's single biggest impression source.
// GSC 03.08–01.09 killed that premise: 511 impressions across fifteen query
// variants, every one of them the tourist's own phrasing («official bali
// tourist levy 150000 idr 2026»), average position 9.0 — and 0 clicks. The
// searcher wants the government payment page and will never want ours, so
// those impressions buy nothing and tilt the domain's topical profile toward
// tourism. It joins the list; the article itself stays live and linked.
//
// Deliberately NOT here:
//   • insurance, sun/shade and noise-measuring tools, earthquake risk by
//     district — all of them feed a buying decision.

const NOINDEX_SLUGS = new Set([
  'traditsii-bali-den-tehniki-galungan-i-nepi-udivitelnye-prazdniki-baliyskoy-kultu',
  '10-luchshih-autentichnyh-podarkov-s-bali-chto-privezti-klientu',
  'baliyskie-kasty-i-imena-kak-po-imeni-uznat-status-i-mesto-v-seme',
  'pochemu-na-bali-vse-vayany-chto-takoe-banzhar-i-zachem-zdes-rezinovoe-vremya-int',
  'interesnye-fakty-o-baliyskoy-kulture-traditsii-podnosheniya-i-semeynye-hramy',
  'luchshie-nastroyki-konditsionera-dlya-krepkogo-sna-na-bali-temperatura-rezhimy-i',
  'chto-delat-esli-v-tebya-vrezalis-na-bali',
  'akuly-na-bali-naskolko-eto-opasno-i-stoit-li-boyatsya-realnye-fakty-i-sovety-dly',
  'opasny-li-ukusy-zmey-na-bali-realnye-riski-i-statistika-smertelnyh-sluchaev',
  'turisticheskiy-sbor-na-bali-idr-150-000-kto-platit-i-zachem-investoru-eto-znat',
])

/** @param ruSlug the Russian slug — the key both locales are indexed by. */
export function isNoindexKnowledge(ruSlug: string): boolean {
  return NOINDEX_SLUGS.has(ruSlug)
}
