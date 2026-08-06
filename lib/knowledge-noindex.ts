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
// Deliberately NOT here:
//   • the tourist levy piece — written for investors, and the single biggest
//     impression source on the site;
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
])

/** @param ruSlug the Russian slug — the key both locales are indexed by. */
export function isNoindexKnowledge(ruSlug: string): boolean {
  return NOINDEX_SLUGS.has(ruSlug)
}
