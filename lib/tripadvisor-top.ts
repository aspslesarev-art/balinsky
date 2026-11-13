// Место в рейтинге TripAdvisor «Things to Do in Bali» (топ‑90), снято вручную
// 13.11.2026 со страниц tripadvisor.com/Attractions-g294226-Activities(-oa30/-oa60)-Bali.
// Ключ — place_id из bali_places (Google). У одного места в Google бывает
// несколько карточек — тогда у всех тот же номер. Спа, круизы, супермаркеты,
// улицы и места без карточки в нашей базе пропущены.
// Обновлять раз в полгода: ранги TripAdvisor плавают.
export const TA_SNAPSHOT = '2026-11'

export const TA_RANK: Record<string, number> = {
  "ChIJ34KP7qNG0i0RpX9A85PWkRI": 1, // Waterbom Bali
  "ChIJZ5sY9kM90i0RVsPvSxZD7LY": 2, // Лес обезьян в Убуде
  "ChIJpe5hQz4-0i0RvsbXvzbr9Ds": 3, // Bali Zoo
  "ChIJ4wD5Iwsi0i0R7QRsOGmJGo0": 4, // Рисовые Террасы Тегалаланг
  "ChIJkYHLIPxP0i0RlQTbpxuNuQw": 5, // Храм Пура Лухур Улувату
  "ChIJq95xT4I30i0RaU3j93Diq8o": 6, // Пура Танах Лот
  "ChIJqZQg4L5G0i0R5l1LCcy5RSU": 7, // Beachwalk Shopping Center
  "ChIJOX0fuEYU0i0R7FQubHicszQ": 8, // Taman Safari
  "ChIJ_Ra6_tZC0i0RUwnl4Ysyp4Q": 9, // Nusa Dua Beach
  "ChIJyRmTmCtD0i0RJYrY25MZwBs": 9, // Пляж Нуса Дуа
  "ChIJ9XP0yms90i0Rn8QbqnT9E3w": 10, // Campuhan Ridge Walk
  "ChIJy3kHnSpu0i0Rbu3sQlSDkLM": 11, // Келингкинг Бич
  "ChIJtTFh4PQY0i0RwewUdwFaolM": 12, // Pura Tirta Empul
  "ChIJwRIJzsFB0i0RQdXwd3GvJvA": 13, // Санур
  "ChIJkxyL4dhB0i0RQ23bDDD-rus": 13, // Sanur Beach
  "ChIJYQy97hsW0i0RXgxBuN15rsE": 15, // Tegenungan Waterfall
  "ChIJfaNsYyRD0i0Rq_QdjiBPS50": 16, // Bali Collection
  "ChIJ0Zo39DZH0i0R0acI0bADr2U": 17, // Водный дворец Тирта Гангга
  "ChIJx97hVM9E0i0RUVpPBj5miBk": 18, // Парк культуры Гаруда Вишну Кэнчана
  "ChIJ790fQLVE0i0R1w-Ejc2k8Po": 18, // Patung Garuda Wisnu Kencana
  "ChIJoQpF2-I90i0R7Q2a3ncHnUA": 19, // Ubud Art Market
  "ChIJNyp2FiCP0S0RNamdBru46Bg": 20, // Sekumpul Waterfall
  "ChIJVwisn2yJ0S0RUxvb5GhlJBg": 21, // Улун дану бератан
  "ChIJRbNf4b5B0i0R5xfnGuTcxjY": 22, // Музей Пасифика
  "ChIJQw23KrxG0i0RjrRKL-Gq_oI": 23, // Kuta Beach
  "ChIJbZgU8gRb0i0RmWRatK3bd3I": 24, // Pandawa Beach
  "ChIJMR-62Hxb0i0RpLJV0F14uEE": 24, // Пляж Пандава
  "ChIJ-9cMAqsn0i0RmoPm81-HDy8": 25, // Jatiluwih Rice Terraces
  "ChIJV-JMXVBF0i0RFUBMWOw7eGQ": 26, // Padang Padang Beach
  "ChIJBysqmWo90i0R2c7LFEyFKOA": 27, // Pura Taman Kemuda Saraswati (Water Palace)
  "ChIJu4w-njEW0i0RRaWY9_yFb88": 29, // Goa Gajah
  "ChIJpQmhxaNG0i0RyWNXbgP7xI8": 30, // Discovery Mall Bali
  "ChIJD0zF-k4-0i0RLDhW9qwgiV8": 31, // Парк Птиц
  "ChIJh9SNZDVA0i0RzptNzMnYR8M": 32, // Sindhu Night Market
  "ChIJf6d0f5Nb0i0Rq_tEZeZB_Nc": 33, // Melasti Beach Ungasan
  "ChIJh8lbxuNb0i0RAgipvy5V2_o": 33, // Пляж Меласти
  "ChIJvbLamO1E0i0R51MpPQg8Ft8": 34, // Samasta Lifestyle Village
  "ChIJBf1LgBxH0i0RgpDcY661wtw": 35, // Seminyak Beach
  "ChIJhQyCoH1d0i0RS12LmePL6Dg": 36, // Гегер Бич
  "ChIJH74r389c0i0RWSMHR349rSc": 36, // Pura Geger Beach
  "ChIJA1q6oNEY0i0RFA_HMCTTWhY": 37, // Mason Elephant Park & Lodge
  "ChIJ-Vswqv5P0i0RZ6Cu8fsieWs": 41, // Suluban Beach
  "ChIJDYFDg0kZ0i0ReamnFXB97-E": 42, // Gunung Kawi Tampaksiring
  "ChIJS7J-82o90i0RMj8cKJr2zUs": 44, // Ubud Palace
  "ChIJ6WxHo60Y0i0RCfAEsPZKqkQ": 45, // Pura Gunung Kawi Sebatu
  "ChIJJ_QeCxRF0i0RPuU1Y3d-RuI": 46, // Balangan Beach
  "ChIJmRTfT9ZC0i0RRB_NXwb5P2k": 48, // Waterblow
  "ChIJkygiUxcH0i0RY5J3_lj9oEA": 49, // Penataran Agung Lempuyang Temple
  "ChIJP7o6M6Mj0i0RVFY5XfkezWY": 50, // Wanna Jungle Pool and Bar
  "ChIJuxVvorlG0i0RG0ye16_GAMU": 51, // Monumen Tragedi Kemanusiaan
  "ChIJ6359VOw90i0RPV9P2Vy-euw": 52, // Satria Agrowisata
  "ChIJQ6ocSKAb0i0RP1CIrkak0ws": 53, // Tukad Cepung Waterfall
  "ChIJ75U-Pw0_0i0RIRFe-_KqAn8": 55, // Living World Mall Denpasar
  "ChIJ1VU59Yg50i0R-l55ykgGTeo": 57, // Mai Main Playground Canggu by Wonderspace
  "ChIJAUB625A70i0R7crEj_IvJq8": 58, // Храм Таман Аюн
  "ChIJM8AfG7JG0i0ReQcuNYYHXhY": 59, // Mal Bali Galeria
  "ChIJ418qTAhu0i0RY8dRJ4VbTk0": 60, // Кристал Бэй Наса Пенида
  "ChIJ32EYUAhu0i0RNeHYNdKWWcw": 60, // Crystal Bay Beach
  "ChIJD8FQucNG0i0RCvgokucgmC4": 62, // Garlic Lane
  "ChIJ0azUW_lP0i0R6y0_eDmg2YA": 63, // Blue Point Beach
  "ChIJW5cRiada0i0RV4fIoPtmw8Q": 64, // Nyang Nyang Beach
  "ChIJFZjn43YI0i0R8hFdqu2zmvw": 65, // Taman Ujung
  "ChIJoQHcmv8X0i0RI6vXSuiyCOo": 66, // Kanto Lampo Waterfall
  "ChIJdegEep2P0S0RlyNNjuDZzE4": 67, // Banyumala Waterfall
  "ChIJh8Ivx7xG0i0Rq4qV4VKa6-k": 68, // Bali Sea Turtle Society (BSTS)
  "ChIJBV2KW_NE0i0ROKlKpKZNLdQ": 69, // Jimbaran Beach
  "ChIJ0Y1znn7_zS0RswAdludqIBA": 70, // Pantai Jemeluk
  "ChIJuTYKlEZF0i0RlR3w5pBjotw": 71, // Bingin Beach
  "ChIJQ65ZWUdF0i0RXWQ95NXJEdg": 71, // Bingin Beach
  "ChIJ--2uiBI90i0ROpqB_tx0Kg8": 72, // Музей искусств Нека
  "ChIJ3Q2bdlkX0i0R_eYgl2LfIf0": 73, // Водопад "Tibumana"
  "ChIJC_kBAJki0i0R8gpLyMN9EUY": 74, // Bali Pulina, Tegallang Gianyar
  "ChIJo-YhLEkj0i0RwrBdmWw4Fbc": 75, // Sangeh Monkey Forest
  "ChIJFyF7mOdG0i0Rrzw9xC_qpOw": 76, // Legian Beach
  "ChIJl3dU9cFG0i0RE_JTvoaxSVQ": 76, // Pantai Legian Bali
  "ChIJMaOrTtM60i0RRirULm_EL5s": 78, // Bali Butterfly Park Tabanan
  "ChIJ19RoPhhiby4RXg2T181MANY": 79, // Banjar Hot Spring
  "ChIJbSwGCOFG0i0RLN-gmWNWN3c": 80, // Double Six Beach
  "ChIJufCSjHtt0i0RUDZ6RUZpJ9c": 81, // Mangrove Point
  "ChIJ8c9PQP2P0S0RNJMC6i4k8iQ": 83, // Aling-Aling Waterfall
  "ChIJ8ajmy0A90i0RyTmTz7x6GEE": 84, // Kajeng Rice Field
  "ChIJQUyGTRVF0i0Ryw_SOxv1xqo": 85, // Пляж Дримлэнд
  "ChIJ5SdV5RpF0i0RWSeph8s7d5M": 85, // Dreamland Beach
  "ChIJPyqq13Nb0i0RTmznt69acQA": 86, // Green Bowl Beach
  "ChIJB79do0Cb0S0RfFIwfg_uAHU": 87, // Ловина
  "ChIJr0vgWkGb0S0RcEtpJ0Ic_RI": 87, // Lovina Beach
  "ChIJ1WOoUVZF0i0Rfa1gH0lW56w": 89, // Thomas Beach
  "ChIJPQXw4T090i0RCcZaEyy2xwM": 90, // Музей Антонио Бланко
}
