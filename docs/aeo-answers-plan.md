# AEO «Данные и ответы» — план страниц и разметки

Цель: попасть в цитирование ChatGPT / Perplexity / Gemini / Google AI. Формат —
раздел `/ru/answers/<slug>` (+ EN-зеркало `/en/answers/<slug>`), одна страница =
один вопрос. Жёсткая структура каждой страницы:

1. **H1** = вопрос словами человека.
2. **Первый абзац** = прямой ответ с конкретной цифрой и **датой** + источником
   («по данным N листингов Balinsky на <месяц год>»). Этот кусок AI выдёргивает в ответ.
3. **Таблица** с данными по районам/сегментам.
4. **FAQ** из 3–5 смежных вопросов (→ ссылки на соседние страницы).
5. **Дата обновления + методология + ссылка на полный отчёт/каталог.**

`[AUTO]` — цифры считаются из базы листингов (Supabase) и обновляются скриптом
ежемесячно. `[ED]` — редакционная/юридическая страница (цифры меняются редко).

---

## Кластер 1. Цены `[AUTO]`
1. Сколько стоит вилла на Бали в 2026 — `skolko-stoit-villa-na-bali`
2. Средняя цена виллы 2BR в Чангу — `cena-villa-2br-changu`
3. Сколько стоит апартамент на Бали — `skolko-stoit-apartament-na-bali`
4. Цена за м² по районам Бали — `cena-za-m2-po-rajonam`
5. Самые дешёвые районы для покупки виллы — `deshevye-rajony-villy`
6. Сколько стоит вилла с бассейном на Бали — `cena-villa-s-bassejnom`

## Кластер 2. Доходность и окупаемость `[AUTO]`
7. Какая доходность у вилл на Бали — `dohodnost-villy-bali`
8. Доходность аренды в Чангу — `dohodnost-arendy-changu`
9. За сколько лет окупается вилла на Бали — `okupaemost-villy-bali`
10. Сколько можно заработать на сдаче виллы — `zarabotok-na-arende-villy`
11. Какие районы Бали дают 10%+ годовых — `rajony-10-procentov`
12. Загрузка вилл на Booking и Airbnb по районам — `zagruzka-bronirovaniya`

## Кластер 3. Районы `[AUTO]` + `[ED]`
13. Где лучше купить недвижимость на Бали — `gde-luchshe-kupit`
14. Чангу или Убуд — что выбрать для инвестиций — `changu-ili-ubud`
15. Букит (Улувату) для покупки виллы — `bukit-uluvatu-obzor`
16. Санур — стоит ли покупать — `sanur-obzor`
17. Переренан — обзор района — `pererenan-obzor`
18. Нуса-Дуа для семьи и аренды — `nusa-dua-obzor`

## Кластер 4. Право: лизхолд / фрихолд `[ED]`
19. Чем лизхолд отличается от фрихолда на Бали — `lizhold-vs-frihold`
20. Может ли иностранец владеть землёй на Бали — `inostranec-vladenie-zemlej`
21. Что такое Hak Pakai (право пользования) — `hak-pakai`
22. Что такое номинальная структура (nominee) и риски — `nominee-riski`
23. Продление лизхолда — как работает — `prodlenie-lizholda`
24. На сколько лет даётся лизхолд на Бали — `srok-lizholda`

## Кластер 5. Процесс покупки `[ED]`
25. Как купить недвижимость на Бали — пошагово — `kak-kupit-poshagovo`
26. Какие документы проверять перед покупкой — `kakie-dokumenty-proveryat`
27. Что такое PBG и SLF и зачем — `pbg-slf`
28. Роль нотариуса PPAT в сделке — `notarius-ppat`
29. Можно ли купить виллу удалённо, без перелёта — `pokupka-udalenno`
30. Как проверить застройщика на Бали — `kak-proverit-zastrojshhika`
31. Сколько стоит сделка: налоги и сборы — `stoimost-sdelki-sbory`

## Кластер 6. Риски `[ED]`
32. Какие риски при покупке недвижимости на Бали — `riski-pokupki`
33. Можно ли потерять виллу, купленную на номинала — `risk-nominee`
34. Риски покупки на стадии котлована (off-plan) — `riski-off-plan`
35. Как не попасть на серую землю (зонирование) — `seraya-zemlya-zonirovanie`
36. Что будет с виллой после окончания лизхолда — `posle-lizholda`

## Кластер 7. Налоги и расходы `[ED]`
37. Какие налоги при покупке недвижимости на Бали — `nalogi-pri-pokupke`
38. Налог на аренду на Бали для иностранца — `nalog-na-arendu`
39. Ежегодные расходы на содержание виллы — `rashody-na-soderzhanie`
40. Нужно ли платить налог в своей стране — `nalog-v-svoej-strane`

## Кластер 8. Застройщики `[AUTO]` + `[ED]`
41. Список надёжных застройщиков Бали — `nadezhnye-zastrojshhiki`
42. Лучшие жилые комплексы Бали 2026 — `luchshie-kompleksy-2026`
43. Какие комплексы сдаются в 2026 — `sdacha-2026`

## Кластер 9. Сравнения `[ED]` (контент уже частично есть)
44. Бали или Пхукет — где выгоднее инвестировать — `bali-ili-phuket`
45. Бали или Дубай для инвестиций в недвижимость — `bali-ili-dubai`
46. Бали или Самуи — сравнение — `bali-ili-samui`
47. Купить виллу на Бали или вложиться в апартаменты — `villa-ili-apartamenty`

## Кластер 10. Жизнь и визы `[ED]`
48. Как получить ВНЖ на Бали через покупку недвижимости — `vnzh-cherez-nedvizhimost`
49. Сколько стоит жизнь на Бали в месяц — `stoimost-zhizni`
50. Школы для детей на Бали — `shkoly-dlya-detej`

---

## Шаблоны JSON-LD (через `lib/json-ld.ts` + `<JsonLd>`)

Каждая `/answers/<slug>` отдаёт массив: `Dataset` (для `[AUTO]`) или `Article`
(для `[ED]`) + `FAQPage` + `BreadcrumbList`.

### FAQPage (помощник `faqPageLd(items)`)
```jsonc
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "Какая доходность у вилл в Чангу?",
      "acceptedAnswer": { "@type": "Answer",
        "text": "На <месяц год> средняя валовая доходность 2BR-виллы в Чангу — ~10–11% годовых по данным N листингов Balinsky и аренды соседей с Booking/Airbnb." } }
  ]
}
```

### Dataset (помощник `datasetLd({...})`) — для страниц с живыми цифрами
```jsonc
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "Цены на виллы по районам Бали",
  "description": "Средняя цена и цена за м² по N листингам Balinsky, обновляется ежемесячно.",
  "url": "https://balinsky.info/ru/answers/cena-za-m2-po-rajonam",
  "dateModified": "2026-06-01",
  "isAccessibleForFree": true,
  "creator": { "@id": "https://balinsky.info/#organization" }
}
```

### Article (помощник `articleLd({...})`) — для `[ED]`-страниц
```jsonc
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Чем лизхолд отличается от фрихолда на Бали",
  "datePublished": "2026-06-01",
  "dateModified": "2026-06-01",
  "inLanguage": "ru",
  "author":    { "@id": "https://balinsky.info/#organization" },
  "publisher": { "@id": "https://balinsky.info/#organization" }
}
```

## Источники живых цифр (Supabase)
- `raw_villas` / `raw_apartments` / `raw_complexes` — цена, м², спальни, район, статус,
  застройщик (через `app/ru/*/_lib.ts` лоадеры).
- Доходность/аренда соседей — `competitors` + investment-скоры (`lib/investment/*`).
- Агрегаты считаются билд-тайм/ISR и кэшируются (`unstable_cache`), как и каталог;
  цифры в первом абзаце + таблице тянутся из одного агрегата, чтобы текст и разметка
  не расходились.

## Не-кодовая часть (за пользователем / Cloud Agent)
- Bing Webmaster Tools + IndexNow (ChatGPT тянет индекс Bing).
- Reddit (r/bali, r/expats) и X — пара постов с цифрами и ссылкой на answers-страницу.
- Партнёрские ссылки «данные рынка: Balinsky» у застройщиков.
- Контроль: раз в 2 недели прогон 40–60 вопросов в ChatGPT/Perplexity/Gemini +
  логи на визиты GPTBot/PerplexityBot.
