// English-facing slugs for /en/knowledge/* articles.
//
// Knowledge slugs are generated once from the Russian title (slugify in
// scripts/sync-knowledge.mjs) and shared across both languages. On the English
// site that produces a transliterated-Russian URL that reads as gibberish in a
// Google SERP and kills click-through (per GSC: 33 EN knowledge pages, ~657
// impressions, 2 clicks over 180 days). This map overrides the English-facing
// slug per article — derived from each article's English title.
//
// Entries are frozen on publish: once an article has an English slug live,
// changing it costs another redirect + reindex cycle. New articles: add a
// `ru-slug: 'english-slug'` line (lowercase, hyphenated, ASCII, keyword-first).
// The loader, detail paths, sitemap and the middleware 301 all read this map.
export const EN_KNOWLEDGE_SLUG_OVERRIDES: Record<string, string> = {
  "skolko-stoit-villa-na-bali-tseny-po-rayonam-v-2026-godu": "bali-villa-prices-by-area-2026",
  "kak-pereehat-na-bali-iz-rossii-v-2026-vizy-zhile-dengi-poshagovo": "how-to-move-to-bali-visas-housing-money-2026",
  "mozhno-li-rossiyaninu-kupit-nedvizhimost-na-bali-i-kak-eto-sdelat-zakonno-v-2026": "can-foreigners-buy-property-bali-how-2026",
  "zony-zemli-na-bali-tsveta-kody-rdtr-chto-nuzhno-znat-investoru": "bali-land-zones-colors-codes-rdtr-investors",
  "leasehold-ili-freehold-na-bali-dlya-inostrantsa-chto-vybrat-v-2026-godu": "leasehold-freehold-bali-foreigners-choose-2026",
  "kitas-investora-i-pma-kompaniya-na-bali-protsess-sroki-realnye-tseny": "investor-kitas-pma-company-bali-process-timelines",
  "nalogi-na-nedvizhimost-na-bali-pph-pbb-bphtb-i-marka-meterai": "bali-property-taxes-pph-pbb-bphtb-meterai",
  "apoa-novye-pravila-ucheta-arendatorov-na-bali-s-aprelya-2025-chto-eto-znachit-dl": "apoa-new-tenant-registration-rules-bali-april",
  "kak-proverit-zastroyschika-na-bali-chek-list-iz-12-punktov": "how-check-developer-bali-12-point-checklist",
  "changu-dlya-investora-oversupplay-1621-apartament-k-2025-i-chto-s-etim-delat": "canggu-oversupply-1621-apartments-2025",
  "realnaya-dohodnost-nedvizhimosti-na-bali-po-rayonam-tsifry-2024-2025": "real-property-yields-bali-area-2024-2025",
  "off-plan-ili-gotovaya-nedvizhimost-na-bali-gde-dohodnost-gde-riski": "off-plan-completed-property-bali-returns-risks",
  "garantirovannaya-dohodnost-11-13-na-bali-chto-na-samom-dele-za-etim-stoit": "guaranteed-returns-11-13-percent-bali",
  "kak-zarubezhnomu-agentu-nachat-prodavat-nedvizhimost-bali-poshagovyy-plan": "how-foreign-agents-can-start-selling-bali",
  "komissii-v-nedvizhimosti-bali-chto-realno-poluchaet-zarubezhnyy-agent": "real-estate-commissions-bali-foreign-agent-actually",
  "top-nadezhnyh-zastroyschikov-bali-2025-s-kem-rabotat-udalennomu-agentu": "top-reliable-bali-developers-2025-remote-agents",
  "yuridicheskaya-shema-raboty-zarubezhnogo-agenta-s-bali-s-pma-i-bez": "legal-setup-overseas-agents-selling-bali-property",
  "bazy-obektov-nedvizhimosti-bali-dlya-zarubezhnogo-agenta-gde-brat-dannye": "bali-real-estate-databases-overseas-agents-where",
  "6-rabochih-kanalov-privlecheniya-investorov-v-nedvizhimost-bali": "6-effective-channels-attract-bali-real-estate",
  "skam-s-feykovymi-pokupatelyami-na-bali-kak-ne-poteryat-vremya-i-dengi": "scams-fake-buyers-bali-not-lose-time",
  "bezopasnoe-oformlenie-sdelok-s-developerami-bali-gayd-dlya-zarubezhnogo-agenta": "safe-structuring-deals-bali-developers-guide-overseas",
  "sezonnost-arendy-na-bali-kogda-pik-a-kogda-prostoy-dannye-bps": "bali-rental-seasonality-when-peaks-when-sits",
  "turisticheskiy-sbor-na-bali-idr-150-000-kto-platit-i-zachem-investoru-eto-znat": "bali-tourist-levy-idr-150000-who-pays",
  "viza-vtorogo-doma-na-bali-second-home-visa-alternativa-pokupke-dlya-dolgogo-proz": "bali-second-home-visa-alternative-buying-long-term",
  "rupiya-i-dollar-valyutnyy-risk-investora-v-nedvizhimost-bali": "rupiah-dollar-currency-risk-bali-property-investor",
  "dohodnost-arendy-na-bali-chto-realno-pokazyvayut-dannye-2026": "bali-rental-yield-data-actually-shows-2026",
  "leasehold-ili-freehold-na-bali-chto-dostupno-inostrantsu-v-2026": "leasehold-freehold-bali-foreigner-can-hold-2026",
  "nalogi-na-nedvizhimost-na-bali-pokupka-vladenie-arenda-prodazha-2026": "bali-property-taxes-buying-owning-renting-selling",
  "novyy-reglament-ministerstva-investitsiy-5-2025-osnovnye-i-vspomogatelnye-vidy-d": "new-ministry-investment-regulation-no-5-2025",
  "dyshi-legko-prostoe-onlayn-prilozhenie-dlya-dyhatelnyh-praktik-bez-ustanovki-i-e": "breathe-easy-simple-online-app-breathing-exercises",
  "kak-uznat-uroven-shuma-v-ville-ili-apartamentah-prostoy-sposob-zamerit-detsibely": "how-check-noise-levels-villa-apartment",
  "kak-uznat-budet-li-v-vashey-kvartire-vid-na-zakat-prilozhenie-dlya-prosmotra-sol": "how-check-whether-apartment-will-have-sunset",
  "kak-ya-stal-luchshe-spat-s-oura-ring-luchshiy-treker-sna-gde-kupit-v-denpasare": "how-i-started-sleeping-better-oura-ring",
  "kak-legko-progret-klientov-prostoy-sposob-vsegda-byt-na-vidu-bez-spama-i-navyazy": "how-warm-up-clients-easily",
  "top-20-brokerov-bali-chto-vazhno-znat-o-zastroyschikah-dlya-uspeshnyh-prodazh-ne": "top-20-bali-brokers-need-about-developers",
  "top-3-glavnyh-problemy-zastroyschikov-v-rabote-s-agentami-chestnye-otzyvy-develo": "top-3-main-problems-developers-face-when",
  "prilozhenie-dlya-iphone-bystro-formuliruy-mysli-golosom-i-poluchay-chetkiy-tekst": "iphone-app-quickly-turn-voice-into-clear",
  "moshenniki-na-bali-ostorozhno-feykovye-pokupateli-nedvizhimosti-kradut-dannye-ch": "scammers-bali-beware-fake-property-buyers-stealing",
  "luchshaya-strahovka-dlya-zhizni-na-bali-i-po-vsemu-miru-lichnyy-opyt-bystrye-vyp": "best-insurance-living-bali-worldwide-personal-experience",
  "chto-realno-nuzhno-agentam-dlya-uspeshnyh-prodazh-novostroek-klyuchevye-fakty-ke": "what-agents-really-need-sell-new-developments",
  "luchshiy-servis-dlya-skachivaniya-video-s-youtube-besplatno-yt5s-biz": "best-free-service-downloading-youtube-videos-yt5s",
  "traditsii-bali-den-tehniki-galungan-i-nepi-udivitelnye-prazdniki-baliyskoy-kultu": "bali-traditions-tumpek-landep-galungan-nyepi",
  "10-luchshih-autentichnyh-podarkov-s-bali-chto-privezti-klientu": "10-best-authentic-gifts-bali-clients",
  "kak-nachat-bolshe-dvigatsya-bez-sportzala-moy-opyt-s-nintendo-switch-dlya-utrenn": "how-i-started-moving-more-without-gym",
  "baliyskie-kasty-i-imena-kak-po-imeni-uznat-status-i-mesto-v-seme": "balinese-castes-names-tell-status-birth-order",
  "pochemu-na-bali-vse-vayany-chto-takoe-banzhar-i-zachem-zdes-rezinovoe-vremya-int": "why-everyone-bali-wayan-banjar-rubber-time",
  "wellness-nedvizhimost-kak-doma-dlya-zdorovya-stanovyatsya-novym-trendom-i-millia": "wellness-real-estate-health-focused-homes-becoming-new",
  "interesnye-fakty-o-baliyskoy-kulture-traditsii-podnosheniya-i-semeynye-hramy": "balinese-culture-facts-traditions-offerings",
  "pochemu-kreslo-za-2000-eto-vygodnaya-investitsiya-v-zdorove-i-komfort": "why-2000-dollar-chair-health-investment",
  "kak-proverit-brokera-na-bali-sprosite-arenduet-li-on-skuter-i-za-skolko-prostoy-": "how-check-broker-bali-ask-if-they",
  "luchshie-nastroyki-konditsionera-dlya-krepkogo-sna-na-bali-temperatura-rezhimy-i": "best-air-conditioner-settings-deep-sleep-bali",
  "luchshee-prilozhenie-dlya-3d-skanirovaniya-na-iphone-bystro-sohranyayte-planirov": "best-3d-scanning-app-iphone",
  "luchshee-prilozhenie-dlya-3d-skanirovaniya-na-iphone-bystroe-sozdanie-planirovok": "best-3d-scanning-app-iphone-2",
  "strahovka-genki-s-franshizoy-ili-bez-kak-sekonomit-do-576-v-god": "genki-insurance-deductible-not-save-up-576",
  "5-vazhnyh-kart-pered-pokupkoy-zemli-na-bali-chto-proverit-krome-zonirovaniya": "5-important-maps-before-buying-land-bali",
  "kontent-plan-dlya-rieltora-na-30-dney-gotovye-idei-postov-dlya-privlecheniya-kli": "30-day-content-plan-realtors-ready-post-ideas",
  "kak-zakryvat-sdelki-prostye-tehniki-brayana-treysi-dlya-rosta-prodazh-i-uverenny": "how-close-deals-simple-brian-tracy-techniques",
  "kak-proverit-zemlyu-i-dorogu-na-bali-poshagovaya-instruktsiya-servisy-i-karty-dl": "how-check-land-road-access-bali-step-by-step",
  "gde-vygodnee-investirovat-v-kurortnuyu-nedvizhimost-dubay-tailand-ili-bali-sravn": "where-more-profitable-invest-resort-real-estate",
  "kto-i-gde-issleduet-nedvizhimost-i-turizm-na-bali-veduschie-universitety-mezhdun": "who-studies-real-estate-tourism-bali-leading",
  "kak-bystro-ponyat-rabotu-upravlyayuschey-kompanii-prostoe-rukovodstvo-i-poleznye": "how-quickly-understand-management-company-works-simple",
  "12-idey-dlya-instagram-chto-publikovat-agentu-nedvizhimosti-na-bali-chtoby-privl": "12-instagram-ideas-bali-real-estate-agents",
  "dolzhen-li-zastroyschik-platit-brokeru-komissiyu-za-apgreyd-sdelki-realnyy-keys-": "should-developer-pay-broker-commission-deal-upgrade",
  "endel-umnye-zvukovye-fony-dlya-fokusa-relaksa-i-sna-personalnyy-pomoschnik-dlya-": "endel-smart-soundscapes-focus-relaxation-sleep-personal",
  "7-prostyh-pravil-bezopasnosti-dlya-brokerov-na-pokazah-i-stroykah": "7-simple-safety-rules-brokers-viewings-construction",
  "nalog-pri-prodazhe-arendovannoy-nedvizhimosti-na-bali-dlya-inostrantsev-10-a-ne-": "tax-selling-leasehold-property-bali-foreigners-10",
  "roza-vetrov-kak-vybrat-kvartiru-s-idealnym-mikroklimatom-i-komfortom": "wind-rose-choose-apartment-ideal-microclimate-comfort",
  "kak-poluchit-maksimalnuyu-skidku-u-zastroyschika-7-effektivnyh-sposobov-peregovo": "how-get-maximum-discount-developer-7-effective",
  "pondok-wisata-pochemu-litsenziya-ne-podhodit-dlya-inostrannyh-investorov-i-sdach": "pondok-wisata-license-doesn-t-suit-foreign",
  "slf-sertifikat-funktsionalnoy-godnosti-zachem-nuzhen-kak-poluchit-i-chto-grozit-": "slf-certificate-functional-feasibility-matters-get-risks",
  "pbg-razreshenie-na-stroitelstvo-v-indonezii-zachem-nuzhno-riski-bez-nego-i-kak-p": "pbg-building-permit-indonesia-matters-risks-without",
  "chto-delat-esli-v-tebya-vrezalis-na-bali": "what-do-if-someone-hits-bali",
  "prilozhenie-dlya-prosmotra-solnechnogo-sveta-i-teney-na-obekte-v-raznoe-vremya-g": "app-view-sunlight-shadows-property-different-times",
  "kak-uznat-shumno-li-v-dome-prostoy-sposob-izmerit-uroven-shuma-v-ville-ili-apart": "how-tell-if-home-noisy-simple-way",
  "akuly-na-bali-naskolko-eto-opasno-i-stoit-li-boyatsya-realnye-fakty-i-sovety-dly": "sharks-bali-dangerous-they-worried-real-facts",
  "opasny-li-ukusy-zmey-na-bali-realnye-riski-i-statistika-smertelnyh-sluchaev": "are-snake-bites-dangerous-bali-real-risks",
  "gde-na-bali-bezopasnee-vsego-zhit-reyting-rayonov-po-risku-zemletryaseniy-i-tsun": "safest-places-live-bali-earthquake-tsunami-risk",
}

// The English-facing slug for an article, keyed by its shared (Russian) slug:
// the override when present, otherwise the shared slug unchanged.
export function enKnowledgeSlug(ruSlug: string): string {
  return EN_KNOWLEDGE_SLUG_OVERRIDES[ruSlug] ?? ruSlug
}
