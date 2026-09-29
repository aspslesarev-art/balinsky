// Договорённости по людям: кому что обещал Андрей и чего ждём от них.
// Собрано вручную по всей переписке бота (tg_messages) с 1 по 29 сентября,
// включая расшифровки голосовых. Без ИИ-сервисов — прочитано и разобрано
// в сессии Claude Code.
//
// Галочки хранятся в plan_tasks под id задачи (ppl:…), поэтому id менять
// нельзя — отметка держится за него. Новую задачу — с новым id.
//
// Файл импортирует клиентский компонент: никаких серверных зависимостей.

export type PersonKind = 'agent' | 'developer' | 'client' | 'team' | 'other'

export type PersonTask = {
  id: string
  text: string
  /** me — обещал или должен сделать Андрей; them — ждём от человека. */
  who: 'me' | 'them'
  /** Срок, если о нём договорились или он очевиден (день по Бали). */
  due?: string
}

export type Person = {
  chat: number | null
  name: string
  username: string | null
  kind: PersonKind
  /** Кто это, в двух словах. */
  about: string
  /** На чём остановились. */
  status: string
  tasks: PersonTask[]
}

/** Кому писали первыми — ответа нет. Задача одна: дожать или отпустить. */
export type Silent = { chat: number; name: string; username: string | null; kind: PersonKind; sent: string }

/** Разговор закрыт — задач нет. Показаны, чтобы было видно: никто не забыт. */
export type Closed = { chat: number; name: string; username: string | null; kind: PersonKind; why: string }

/** По какое сообщение разобрана переписка. */
export const PEOPLE_AS_OF = '2026-09-29'

const LOCATION = 'Аквамарин 3, лот 5, Переренан'

export const PEOPLE: Person[] = [
  // ─── Своя команда и встреча 2 октября ───────────────────────────────
  {
    chat: 1354493667, name: 'Елена Данилюк', username: 'elenadanilyk', kind: 'team',
    about: 'Ассистент',
    status: '29.09 собрала в таблице «Event 2.10» агентов с 6+ сделками и ждёт, кто пишет им приглашения',
    tasks: [
      { id: 'ppl:elena:1', who: 'me', due: '2026-09-29', text: 'Решить, кто пишет приглашения агентам с 6+ сделками (Лилия, Павел Морозов, Александр, Максим Ширяев; под вопросом Михаил и Евгений) — она ждёт текст' },
      { id: 'ppl:elena:2', who: 'them', due: '2026-10-01', text: `Разослать всем гостям 2.10 локацию (${LOCATION}) и пару слов про анкету — обещали Максу, Катерине, Татьяне` },
      { id: 'ppl:elena:3', who: 'them', due: '2026-10-01', text: 'Меню и закупка на 2.10 через Жасмин из Брейга (+62 857-7290-2812), оператор с дроном' },
      { id: 'ppl:elena:4', who: 'them', due: '2026-10-02', text: 'После встречи 2.10 — follow-up всем гостям в тот же день (правило от 11.09)' },
      { id: 'ppl:elena:5', who: 'them', due: '2026-10-05', text: 'Сверка для First Broker Alliance за сентябрь (1–5 числа, их доля 0,5%)' },
      { id: 'ppl:elena:6', who: 'them', text: 'Вебинар 8.10: Big Waves так и не оплатили — решить, будет ли он' },
      { id: 'ppl:elena:7', who: 'them', text: 'Довести IJI до 7 обучений с агентами Пхукета — после этого они платят $500' },
      { id: 'ppl:elena:8', who: 'them', text: 'Пост Maison Verde: отдать им три варианта, выбрать и опубликовать' },
      { id: 'ppl:elena:9', who: 'them', text: 'Сверить прайсы TEUS и BREIG — давно не обновлялись' },
    ],
  },
  {
    chat: 740013954, name: 'Никита Брейг', username: 'pgodin', kind: 'developer',
    about: 'BREIG, спонсор встречи 2.10',
    status: '29.09 созвонились; ждёт договор Интермарка в PDF, чтобы подписать',
    tasks: [
      { id: 'ppl:breig:1', who: 'me', due: '2026-09-30', text: 'Прислать договор Интермарка в PDF на подпись — как только Юлия впишет их данные' },
      { id: 'ppl:breig:2', who: 'me', due: '2026-09-30', text: 'Ответить на его вопрос от 27.09: стоит ли тратить время на тайских агентов, интересно ли им продавать Бали' },
      { id: 'ppl:breig:3', who: 'me', due: '2026-09-30', text: 'Рассказать, как идёт подготовка к 2.10 — 28.09 обещал «к вечеру отвечу, что и как»' },
      { id: 'ppl:breig:4', who: 'them', text: 'Кого из агентов он обязательно хочет видеть 2.10 (спросил 28.09)' },
      { id: 'ppl:breig:5', who: 'me', text: 'Решить с ним по бюджету Интермарка $5000/мес — после ответа Юлии' },
      { id: 'ppl:breig:6', who: 'me', text: 'Видео подкаста: по желанию вставить картинки по таймкодам (лифт, River Villa, Delmar)' },
    ],
  },
  {
    chat: 379596858, name: 'Виталий', username: 'Vitalii_b2b', kind: 'team',
    about: 'Клоузер по Брейгу',
    status: 'С сентября получает $10 за каждый сданный отчёт. 23.09 назвал, кто сейчас продаёт: Легион, Нексус, Империон',
    tasks: [
      { id: 'ppl:vitalii:1', who: 'them', text: 'Прислать запись зум-обучения по Брейгу с хорошим звуком — для курса агентам (просил 14.09)' },
    ],
  },
  {
    chat: 8036381042, name: 'Игорь Боровский', username: 'igor_nuanu', kind: 'team',
    about: 'Ведущий вебинаров (Nuanu)',
    status: 'Провёл вебинары 10 и 24.09, оплата ушла',
    tasks: [
      { id: 'ppl:igor:1', who: 'me', text: 'Позвать вести следующий вебинар (если 8.10 состоится)' },
      { id: 'ppl:igor:2', who: 'them', text: 'Есть ли у Nuanu застройщики на место в вебинаре (спросил 21.09)' },
    ],
  },
  {
    chat: 208838586, name: 'Павел Лашманов', username: 'pavel_lashmanov', kind: 'other',
    about: 'Альянс брокеров Пхукета',
    status: 'Анонсы в их чат — через Леру',
    tasks: [
      { id: 'ppl:lashmanov:1', who: 'me', text: 'Анонс следующего вебинара для агентов Пхукета — через Леру' },
    ],
  },

  // ─── Гости 2 октября ────────────────────────────────────────────────
  {
    chat: 674088154, name: 'Макс', username: 'max_bali', kind: 'agent',
    about: 'Агент, гость 2.10',
    status: 'Придёт. 28.09 спросил локацию и что за анкета — ответил голосом, локацию обещал «завтра-послезавтра»',
    tasks: [
      { id: 'ppl:maxbali:1', who: 'me', due: '2026-10-01', text: `Скинуть локацию (${LOCATION})` },
    ],
  },
  {
    chat: 552886514, name: 'Катерина Изъюрова', username: 'KATERINAFIN', kind: 'agent',
    about: 'Агент, гость 2.10',
    status: 'Позвал (5 сделок — «вам можно»), программу отправил. Ждёт локацию',
    tasks: [
      { id: 'ppl:izyurova:1', who: 'me', due: '2026-09-30', text: 'Прислать локацию — обещал, что Елена пришлёт «в течение пары дней»' },
    ],
  },
  {
    chat: 251511001, name: 'Кристина', username: 'Kristina_proBali', kind: 'agent',
    about: 'Агент, гость 2.10',
    status: 'Придёт вместе с Антоном, 28.09 подтвердила',
    tasks: [
      { id: 'ppl:kristina:1', who: 'me', due: '2026-10-01', text: 'Локация и напоминание накануне' },
    ],
  },
  {
    chat: 8045344550, name: 'Ольга Жук', username: 'olga_zhuk_bali', kind: 'agent',
    about: 'Агент, гость 2.10',
    status: '«Постараюсь быть», съёмка ей не нужна',
    tasks: [
      { id: 'ppl:zhuk:1', who: 'me', due: '2026-10-01', text: 'Локация и напоминание накануне' },
    ],
  },
  {
    chat: 327525378, name: 'Татьяна', username: 'TatyanaProBali', kind: 'agent',
    about: 'Агент, гость 2.10',
    status: 'Придёт «по плану». Ещё 21.09 просила продублировать локацию',
    tasks: [
      { id: 'ppl:tatyana:1', who: 'me', due: '2026-10-01', text: 'Скинуть локацию' },
    ],
  },
  {
    chat: 799503350, name: 'Жанна Волобуева', username: 'Zhannavolobueva', kind: 'agent',
    about: 'Агент, гость 2.10',
    status: 'Придёт втроём со своими брокерами (говорит, у всех 6+ сделок)',
    tasks: [
      { id: 'ppl:zhanna:1', who: 'them', due: '2026-10-01', text: 'Прислать имена двух своих брокеров (просил 28.09 — встреча по списку)' },
      { id: 'ppl:zhanna:2', who: 'me', due: '2026-10-01', text: 'Локация и напоминание накануне' },
    ],
  },
  {
    chat: 350836747, name: 'Олег', username: 'fed0leg', kind: 'agent',
    about: 'Агент, гость 2.10',
    status: 'Звал 21.09, формат понравился. 28.09 написал «всё в силе» — не ответил',
    tasks: [
      { id: 'ppl:fedoleg:1', who: 'me', due: '2026-10-01', text: 'Убедиться, что придёт, и скинуть локацию' },
      { id: 'ppl:fedoleg:2', who: 'me', text: 'Он хочет увидеть Солонину — спросить про Парк Блу. Позвать её?' },
    ],
  },
  {
    chat: 596603406, name: 'Александр Поляков', username: 'AlexandePoliakov', kind: 'agent',
    about: 'Avega Estate, англоязычные клиенты',
    status: 'Позвал 28.09. Спросил, можно ли с коллегой — ответил: если у коллеги 6 сделок',
    tasks: [
      { id: 'ppl:polyakov:1', who: 'them', due: '2026-10-01', text: 'Подтвердить, что придёт, и про коллегу' },
      { id: 'ppl:polyakov:2', who: 'me', due: '2026-10-01', text: 'Скинуть локацию' },
    ],
  },
  {
    chat: 152029060, name: 'Максим Веселов', username: 'MaxVess', kind: 'agent',
    about: 'Агент (Бали и Грузия)',
    status: 'Программу отправил, дал карту виллы — хочет накидать идей для обзора',
    tasks: [
      { id: 'ppl:veselov:1', who: 'them', due: '2026-10-01', text: 'Подтвердить, что придёт' },
    ],
  },
  {
    chat: 478014633, name: 'Анна Сахарова', username: 'anna_sakharrova', kind: 'agent',
    about: 'Агент',
    status: '22.09 позвал и рассказал формат голосом — ответа нет',
    tasks: [
      { id: 'ppl:sakharova:1', who: 'me', due: '2026-09-30', text: 'Дожать: придёт 2.10 или нет' },
    ],
  },
  {
    chat: 291601250, name: 'Сергей Одиноков', username: 'SergeiOdinokov', kind: 'agent',
    about: 'Агент',
    status: 'Был в отпуске до 28.09. Программу 2.10 отправил 22.09',
    tasks: [
      { id: 'ppl:odinokov:1', who: 'me', due: '2026-09-30', text: 'Написать: придёт ли 2.10. Заодно книги и Boox, как обещал' },
    ],
  },
  {
    chat: 387988140, name: 'Андрей Бойко', username: 'a_boyko', kind: 'agent',
    about: 'Знает всех сильных брокеров на Бали (по словам Alex P)',
    status: 'Звал 22.09, 23.09 переспросил — молчит',
    tasks: [
      { id: 'ppl:boyko:1', who: 'me', text: 'Дожать: позвать 2.10 или на созвон' },
    ],
  },
  {
    chat: 458641939, name: 'Иван Шарапов', username: 'IvanSharapov', kind: 'agent',
    about: 'Агент на Бали',
    status: '29.09 позвал на встречу, если есть 6 сделок за 6 месяцев',
    tasks: [
      { id: 'ppl:sharapov:1', who: 'them', text: 'Ответ: есть ли 6 сделок, придёт ли' },
    ],
  },

  // ─── Агенты ─────────────────────────────────────────────────────────
  {
    chat: 164975495, name: 'Юлия', username: 'js_mo', kind: 'agent',
    about: 'Intermark',
    status: 'Договор с Брейгом прислали пустой. По их бюджету $5000/мес задал вопросы 29.09. На 2.10 не придут — корпоратив',
    tasks: [
      { id: 'ppl:intermark:1', who: 'them', due: '2026-09-30', text: 'Прислать договор с заполненными данными Интермарка (п. 2 и подписи)' },
      { id: 'ppl:intermark:2', who: 'them', text: 'Ответить про $5000/мес: идёт ли в счёт комиссии и что, если сделку с этого бюджета закрыли на другого застройщика' },
      { id: 'ppl:intermark:3', who: 'me', text: 'Как придёт договор — отдать Никите на подпись' },
    ],
  },
  {
    chat: 5211242307, name: 'Лана', username: 'dxbfreedom', kind: 'agent',
    about: 'Агент с Пхукета, первый брокер-тур',
    status: 'Тур 17–24.09 прошёл, «шикарно впечатлена». 23.09 прислала Million Estate 2',
    tasks: [
      { id: 'ppl:lana:1', who: 'me', text: 'Договориться, как делим комиссию — она спрашивала 21.09: пополам? как с Анатолием?' },
      { id: 'ppl:lana:2', who: 'me', text: 'Разобрать Million Estate 2 и ответить' },
      { id: 'ppl:lana:3', who: 'me', text: 'Следующий шаг после тура: кто из её клиентов едет на Бали' },
    ],
  },
  {
    chat: 340484109, name: 'Ольга Адамус', username: 'Adamus_invest', kind: 'agent',
    about: 'Переезжает в Дубай, 5 сделок + 6-я в работе',
    status: 'Договорились созвониться в четверг 1.10',
    tasks: [
      { id: 'ppl:adamus:1', who: 'me', due: '2026-09-29', text: 'Прислать варианты времени на четверг — обещал 29.09' },
      { id: 'ppl:adamus:2', who: 'me', due: '2026-10-01', text: 'Подготовить к созвону: офферы, проценты, с какими застройщиками работаем' },
    ],
  },
  {
    chat: 1236762593, name: 'Виктория', username: 'Viktoriacity', kind: 'agent',
    about: '15 лет в Испании, теперь Пхукет; хочет продавать Бали',
    status: 'Хочет договор и понятные комиссии. 29.09 отправил два оффера Maison Boheme',
    tasks: [
      { id: 'ppl:viktoriacity:1', who: 'me', due: '2026-10-02', text: 'Прислать интервалы для созвона на следующей неделе — обещал на этой' },
      { id: 'ppl:viktoriacity:2', who: 'them', text: 'Даты прилёта на Бали — под брокер-тур' },
    ],
  },
  {
    chat: 968993568, name: 'Андрей', username: 'Larapohlom', kind: 'agent',
    about: 'Агент, аренда и вторичка',
    status: 'Его клиент ушёл в другие виллы. 28.09 предложил выложить его базу вторички на сайт под его именем — «ок»',
    tasks: [
      { id: 'ppl:larapohlom:1', who: 'me', text: 'Прислать видеообзор виллы Maison Boheme — обещал 23.09 «на неделе»' },
      { id: 'ppl:larapohlom:2', who: 'me', text: 'Принять в чат агентов — 23.09 не пустили' },
      { id: 'ppl:larapohlom:3', who: 'me', text: 'Объяснить, как выложить вторичку на сайт' },
    ],
  },
  {
    chat: 133730616, name: 'Илья Василишин', username: 'the_victory_is_predestined', kind: 'agent',
    about: 'Продаёт Бали, сейчас не на острове',
    status: '28.09 договорились на 15-минутный созвон на следующей неделе',
    tasks: [
      { id: 'ppl:vasilishin:1', who: 'me', due: '2026-10-02', text: 'Написать и назначить созвон — обещал «в течение недели»' },
    ],
  },
  {
    chat: 297189047, name: 'Андрей Лиштва', username: 'MrBreadly', kind: 'agent',
    about: 'Агент, не на Бали и не вернётся',
    status: '28.09: «созвонимся завтра» — «Ок, пиши»',
    tasks: [
      { id: 'ppl:lishtva:1', who: 'me', due: '2026-09-29', text: 'Написать и созвониться' },
    ],
  },
  {
    chat: 522486077, name: 'Юлия Козырева', username: 'JK_invest', kind: 'agent',
    about: 'Продаёт Бали с августа, 2 сделки',
    status: 'Спросила про просадку и ЦА — ответил голосом 29.09',
    tasks: [
      { id: 'ppl:kozyreva:1', who: 'me', text: 'Предложить созвон на 15 минут' },
    ],
  },
  {
    chat: 2073785781, name: 'Марина Егорова', username: 'marina_invest', kind: 'agent',
    about: 'Агент на Бали',
    status: '21.09: «созвонимся чуть позже» — так и не созвонились',
    tasks: [
      { id: 'ppl:egorova:1', who: 'me', due: '2026-09-30', text: 'Созвониться и позвать на 2.10' },
    ],
  },
  {
    chat: 86854274, name: 'Женя Левитан', username: 'e_levitan', kind: 'agent',
    about: 'Агент, вернулась на Бали',
    status: '28.09 предложил созвон на 29–30.09 — ответа нет',
    tasks: [
      { id: 'ppl:levitan:1', who: 'me', due: '2026-09-30', text: 'Созвониться' },
    ],
  },
  {
    chat: 521654502, name: 'Тина Бондаренко', username: 'ti_bondarenko', kind: 'agent',
    about: 'Сильный продавец ($1,65 млн), сейчас на Кипре',
    status: '21.09 предложил созвон или голосовые — молчит',
    tasks: [
      { id: 'ppl:bondarenko:1', who: 'me', text: 'Написать ещё раз' },
    ],
  },
  {
    chat: 424357275, name: 'Юрий Красоткин', username: 'KrasotkinYuriy', kind: 'agent',
    about: 'Агент',
    status: 'На визаране в Куала-Лумпуре до конца недели — 2.10 не будет, очень хочет на следующую',
    tasks: [
      { id: 'ppl:krasotkin:1', who: 'me', text: 'Позвать на следующую встречу' },
      { id: 'ppl:krasotkin:2', who: 'me', due: '2026-10-02', text: 'Кольцо Oura из КЛ — договориться, пока он там' },
    ],
  },
  {
    chat: 302202881, name: 'Валерия Танеева', username: 'valeria_taneeva', kind: 'agent',
    about: 'Агент, на Бали с 19.11',
    status: 'Искала клиенту аренду 2BR на 6 мес за $1500–1700. 28.09 дала контакт юриста',
    tasks: [
      { id: 'ppl:taneeva:1', who: 'me', text: 'Созвониться — 21.09 она дважды звонила в WhatsApp и не дозвонилась' },
      { id: 'ppl:taneeva:2', who: 'me', text: 'Уточнить, нашлась ли аренда её клиенту' },
    ],
  },
  {
    chat: 208337048, name: 'Полина', username: 'polinkaay', kind: 'agent',
    about: 'Агент',
    status: 'Прилетит на Бали примерно в конце октября. Обещал ей брокер-тур',
    tasks: [
      { id: 'ppl:polina:1', who: 'them', text: 'Даты прилёта — под брокер-тур' },
    ],
  },
  {
    chat: 1081355721, name: 'Юля', username: 'yulia_sovann', kind: 'agent',
    about: 'Агент',
    status: '2.10 её не будет. Предложила сделать такое же мероприятие на Seven Stones (9 вилл у Буди)',
    tasks: [
      { id: 'ppl:sovann:1', who: 'me', text: 'Уточнить идею с Seven Stones: чей объект, какие условия, когда она на Бали' },
    ],
  },
  {
    chat: 391645890, name: 'Катя', username: 'Elvea', kind: 'agent',
    about: 'Cape Props (ЮАР), от Митюхина',
    status: '25.09 был зум с основателем Даниилом Мазаловым',
    tasks: [
      { id: 'ppl:capeprops:1', who: 'me', text: 'Записать итог зума и следующий шаг' },
    ],
  },
  {
    chat: 1129443662, name: 'Александр Митюхин', username: 'alexandrmityuhin', kind: 'agent',
    about: 'Сильный продавец ($1,93 млн)',
    status: '5.09 согласился: его вторичку листим на сайте за % с комиссии',
    tasks: [
      { id: 'ppl:mityuhin:1', who: 'me', text: 'Залистить его вторичку на сайт' },
    ],
  },
  {
    chat: 785798105, name: 'Виктория Тройная', username: 'viktory_lucky', kind: 'agent',
    about: 'Ведёт переговоры с инвестфондом',
    status: 'Просила офферы по Бали для портфеля фонда. 18.09 потеряла группу партнёрки — спросил, какой запрос, не ответила',
    tasks: [
      { id: 'ppl:troynaya:1', who: 'me', text: 'Вернуть её в группу партнёрки' },
      { id: 'ppl:troynaya:2', who: 'me', text: 'Прислать оформленные офферы по Бали для фонда («есть 10 штук, но не оформлены»)' },
    ],
  },
  {
    chat: 395912391, name: 'Денис Камбалин', username: 'denys_kambalin', kind: 'agent',
    about: 'Агент',
    status: '16.09 созвонились по Edem 2',
    tasks: [
      { id: 'ppl:kambalin:1', who: 'me', text: 'Прислать кадры почти готовой виллы Edem 2 (проходки по 4–5 сек) для его рилса — обещал' },
    ],
  },
  {
    chat: 345384882, name: 'Виктор', username: 'cryptocodeinme', kind: 'agent',
    about: 'Агент в фоне, у него 2 участка земли',
    status: 'На встречи не ходит. Договорились обсудить кодевелопмент на следующей неделе',
    tasks: [
      { id: 'ppl:victorl:1', who: 'me', due: '2026-10-09', text: 'Вернуться к нему по кодевелопменту — обещал на следующей неделе' },
    ],
  },
  {
    chat: 50492124, name: 'Алексей Мишенин', username: 'Alex_AAB_realty', kind: 'agent',
    about: 'Свёл с застройщиками из ОАЭ',
    status: 'Виделись 17.09. Сейчас в Москве, прилетит 7.10',
    tasks: [
      { id: 'ppl:mishenin:1', who: 'me', due: '2026-10-09', text: 'Встретиться после 7.10, узнать про застройщиков из ОАЭ' },
    ],
  },
  {
    chat: 5115723952, name: 'Александра', username: 'saschaSan', kind: 'agent',
    about: 'Агент',
    status: 'Её клиент на Maison Boheme за $250к (торгуется) закреплён за ней. От клоузера отказалась: «дам знать»',
    tasks: [
      { id: 'ppl:sascha:1', who: 'me', text: 'Спросить, что с клиентом' },
    ],
  },
  {
    chat: 6295155117, name: 'Алексей', username: 'AlexlandChoice', kind: 'agent',
    about: 'Агент из чата',
    status: '28.09 нарушил правила чата, извинился и спросил, можно ли постить объявления и какие лимиты — без ответа',
    tasks: [
      { id: 'ppl:alexland:1', who: 'me', text: 'Ответить: правила чата и можно ли объявления' },
    ],
  },
  {
    chat: 462920204, name: 'Александр Мартыненко', username: 'Boss_realtingcom', kind: 'agent',
    about: 'Realting',
    status: '21.09 по просьбе скрыли аккаунт компании и объекты на Realting',
    tasks: [
      { id: 'ppl:martynenko:1', who: 'me', text: 'Проверить, что на Realting не осталось страниц и моих контактов' },
    ],
  },

  // ─── Застройщики ────────────────────────────────────────────────────
  {
    chat: 492123402, name: 'Сандра', username: 'sandramonty', kind: 'developer',
    about: 'Big Waves (от Марины)',
    status: 'Спросила бюджет на 3 месяца эксклюзива и план Б, если продаж не будет',
    tasks: [
      { id: 'ppl:sandra:1', who: 'me', due: '2026-09-28', text: 'Написать бюджет на 3 месяца и план Б — обещал в понедельник 28.09' },
    ],
  },
  {
    chat: 991304951, name: 'Марина', username: 'MarynaBilobrovska', kind: 'developer',
    about: 'CEO Big Waves',
    status: 'Предложил пакет $1500 + 3% — «можно всё с Сандрой решить, интересно»',
    tasks: [
      { id: 'ppl:bigwaves:1', who: 'them', text: 'SALT of Virgin Beach: где документы и почему проект на паузе (спросил 21.09)' },
    ],
  },
  {
    chat: 254443609, name: 'Михаил Пиманов', username: 'PIMA75', kind: 'developer',
    about: 'Застройщик (вместе с White Residence)',
    status: '25.09 прислал 5 вопросов по партнёрке — без ответа. На острове в начале октября',
    tasks: [
      { id: 'ppl:pimanov:1', who: 'me', due: '2026-09-30', text: 'Ответить на 5 вопросов: кто продаёт в сети, откуда лиды, экспертность агентов, тёплая база, платится ли проверка' },
      { id: 'ppl:pimanov:2', who: 'me', text: 'Встретиться, когда прилетит' },
    ],
  },
  {
    chat: 634661208, name: 'Андрей Балута', username: 'Andreybaluta', kind: 'developer',
    about: 'Застройщик',
    status: '25.09 голосом: «Посмотрел? Давай созвонимся» — без ответа',
    tasks: [
      { id: 'ppl:baluta:1', who: 'me', due: '2026-09-30', text: 'Назначить созвон' },
    ],
  },
  {
    chat: 469438, name: 'Алексей Комаров', username: 'alexeyikomarov', kind: 'developer',
    about: 'Surfside',
    status: 'Программа «Переход в Surfside» для вкладчиков замерших проектов (Parq, Магнум, SWOI…). Договорились встретиться в четверг у них на проекте',
    tasks: [
      { id: 'ppl:surfside:1', who: 'me', due: '2026-09-30', text: 'Назначить время встречи в четверг 1.10 на проекте' },
      { id: 'ppl:surfside:2', who: 'me', text: 'Подумать, каких инвесторов из замерших проектов можно им привести' },
    ],
  },
  {
    chat: 6173348711, name: 'Артём', username: 'acitation', kind: 'developer',
    about: 'TEUS, наш клиент',
    status: 'Договор кончается через 3 месяца. Просит «киллер-оффер»: от нас пока 2 агента и ни одной сделки. 22.09 был «в запаре»',
    tasks: [
      { id: 'ppl:teus:1', who: 'me', text: 'Созвон: продление на следующий год и киллер-оффер' },
    ],
  },
  {
    chat: 238542112, name: 'Антон Тараненко', username: 'antagroup', kind: 'developer',
    about: 'Застройщик',
    status: 'Выбрал модель «Результат» ($0 + 5%) и предложил +$1000 за юнит',
    tasks: [
      { id: 'ppl:taranenko:1', who: 'me', due: '2026-10-14', text: 'Дать решение — обещал в течение месяца' },
    ],
  },
  {
    chat: 326043558, name: 'Филипп Орлов', username: 'filipporlov13', kind: 'developer',
    about: 'LOYO',
    status: 'Дал схему кодевелопмента: выкупленная земля от 10 соток, 50/50. Сам готов с февраля–марта 2027 (70/30). Звал на кофе',
    tasks: [
      { id: 'ppl:loyo:1', who: 'me', text: 'Договориться о кофе — заодно вопросы Дмитрия Савичева по вилле 13' },
      { id: 'ppl:loyo:2', who: 'me', text: 'Кинуть клич в чат: ищу выкупленную землю от 10 соток' },
    ],
  },
  {
    chat: 850931785, name: 'Александр Дормидонов', username: 'DormidonovAY', kind: 'developer',
    about: 'Застройщик, новый комплекс 25 вилл до $130к',
    status: 'Фикс не хочет, только % за результат. Я предложил кодевелопмент. В России ещё ~месяц',
    tasks: [
      { id: 'ppl:dormidonov:1', who: 'them', text: 'Ответ по кодевелопменту: его земля и стройка, мой концепт и инвесторы' },
    ],
  },
  {
    chat: 99195368, name: 'Андрей Хазов', username: 'fortunekeep', kind: 'developer',
    about: 'OCEANIQ',
    status: 'Против 10% комиссии. В отчёте по их продажам ошибка — сбор данных по ним отвалился',
    tasks: [
      { id: 'ppl:oceaniq:1', who: 'me', text: 'Починить сбор данных по OCEANIQ — обещал «проверим — поправим»' },
      { id: 'ppl:oceaniq:2', who: 'me', text: 'Пройти первую волну фридайвинга у Кирилла на Пениде — потом поныряем вместе' },
    ],
  },
  {
    chat: 158075739, name: 'Анна', username: 'anna_businessmama', kind: 'developer',
    about: 'Застройщик',
    status: 'Вернётся на Бали 1.10. Отзыв по отчёту о продажах пока не дала',
    tasks: [
      { id: 'ppl:annabm:1', who: 'me', due: '2026-10-03', text: 'Встретиться после 1.10' },
    ],
  },
  {
    chat: 539220299, name: 'Даниил', username: 'DM_projects_Daniel', kind: 'developer',
    about: 'DM projects',
    status: 'Снял виллы с продажи, отдела продаж нет. Зум 22.09 сорвался',
    tasks: [
      { id: 'ppl:dmprojects:1', who: 'me', text: 'Предложить новое время созвона' },
    ],
  },
  {
    chat: 217181035, name: 'Алексей Исаев', username: 'alexisaev85', kind: 'developer',
    about: 'Застройщик',
    status: 'Виделись 17.09. 25.09 попросил данные по земле в Чангу',
    tasks: [
      { id: 'ppl:isaev:1', who: 'them', text: 'Данные по земле в Чангу' },
    ],
  },
  {
    chat: 1093246956, name: 'Валентина', username: 'isaeva_0505', kind: 'developer',
    about: 'Команда Алексея (Serenity)',
    status: 'Подкаст с Алексеем перенесли. Хотели вместе проехать по их объектам. Про вебинар ждала решения Алексея',
    tasks: [
      { id: 'ppl:serenity:1', who: 'me', text: 'Назначить подкаст с Алексеем и поездку по объектам' },
    ],
  },
  {
    chat: 346499742, name: 'Анатолий Канаев', username: 'anatolykanaev', kind: 'developer',
    about: 'Betterplace, 500 объектов в управлении',
    status: '10.09 обещал написать на следующей неделе — тишина. Betterplace есть в списке агентств Брейга',
    tasks: [
      { id: 'ppl:kanaev:1', who: 'me', text: 'Встретиться' },
    ],
  },
  {
    chat: null, name: 'Камиль', username: 'khaf_kam', kind: 'developer',
    about: 'Запускает комплекс в Убуде',
    status: 'Зум 29.09 в 11:00 (назначала Елена): интересует продвижение через наши ресурсы',
    tasks: [
      { id: 'ppl:kamil:1', who: 'me', text: 'Записать итог зума и следующий шаг' },
    ],
  },
  {
    chat: 5596474864, name: 'BIG BALI GROUP', username: 'bigbaligroup', kind: 'developer',
    about: 'Застройщик',
    status: '17.09 просили запостить их форум и разослать контактам — без ответа',
    tasks: [
      { id: 'ppl:bigbali:1', who: 'me', text: 'Ответить: постим или нет' },
    ],
  },
  {
    chat: 6656483854, name: 'Live Like Tom', username: 'liveliketom', kind: 'developer',
    about: 'Земля на Сумбаве',
    status: 'Бухта 50 га одним лотом — не на всех брокеров, только точечно',
    tasks: [
      { id: 'ppl:tom:1', who: 'me', text: 'Если появится покупатель на крупную землю — свести в личке' },
    ],
  },
  {
    chat: 493598948, name: 'Вера Барсук', username: 'Roaming_badger', kind: 'developer',
    about: 'B2B у Maison, EcoInvest, Seven Sky',
    status: '29.09 днём созванивались — обмен опытом B2B',
    tasks: [
      { id: 'ppl:vera:1', who: 'me', text: 'Записать итог созвона' },
    ],
  },
  {
    chat: 127386581, name: 'Миша Звездинский', username: 'Mikhail_Zvezdinskii', kind: 'agent',
    about: 'Агент, ведёт свою базу застройщиков',
    status: '16.09 прислал список общедоступных застройщиков (часть устарела)',
    tasks: [
      { id: 'ppl:zvezdinskii:1', who: 'me', text: 'Разобрать его список — кого из застройщиков взять в работу' },
    ],
  },
  {
    chat: 1039710394, name: 'Данил Котов', username: 'kotovdanil', kind: 'agent',
    about: 'ESTATEWIN, дал контакт Камрана',
    status: '16.09: «чуть позже сформирую информацию и отправлю»',
    tasks: [
      { id: 'ppl:kotov:1', who: 'them', text: 'Прислать обещанную информацию' },
    ],
  },
  {
    chat: 1292382310, name: 'Даниил Богачков', username: 'daniil_phuket', kind: 'other',
    about: 'Платёжный агент с Пхукета',
    status: 'Зум 16.09, ответил на 4 вопроса. Ждёт ответа по партнёрству (обещал к ~18.09)',
    tasks: [
      { id: 'ppl:bogachkov:1', who: 'me', text: 'Ответить: берёмся за партнёрство или нет' },
    ],
  },

  // ─── Клиенты ────────────────────────────────────────────────────────
  {
    chat: 5730402343, name: 'Дмитрий Савичев', username: 'kargo8188', kind: 'client',
    about: 'Инвестор: вилла 13 Pandawa (LOYO), 3 юнита Pandawa Dream, апартамент 104 XOLD',
    status: '28.09 отправил Вадиму Колодию претензию на двух языках по апартаменту 104, срок ответа — 7 дней',
    tasks: [
      { id: 'ppl:savichev:1', who: 'me', due: '2026-09-30', text: 'XOLD 104: нет даты осмотра к среде — напомнить одной строкой «Жду дату осмотра» (и на почту)' },
      { id: 'ppl:savichev:2', who: 'me', text: 'Передать ему контакт индонезийского юриста (дала Валерия Танеева) — на случай somasi' },
      { id: 'ppl:savichev:3', who: 'me', text: 'Сравнительный анализ: сколько сейчас стоит такая вилла, как его 13-я — обещал 22.09' },
      { id: 'ppl:savichev:4', who: 'me', text: 'Найти таблицу повышения цен Pandawa — обещал в течение недели (21.09)' },
      { id: 'ppl:savichev:5', who: 'me', text: 'Созвон с Филиппом (LOYO) по вилле 13 и юнитам в Pandawa Dream' },
      { id: 'ppl:savichev:6', who: 'me', text: 'К осмотру: список от 3.09, фото, раковина с водой, выезд Антона $100. После акта — запросить дату нотариальной аренды на 30 лет' },
    ],
  },
  {
    chat: 545469253, name: 'Арина', username: null, kind: 'client',
    about: 'Ищет готовую виллу для жизни',
    status: '21.09 задал 8 вопросов (бюджет, районы, спальни…) — ответа нет',
    tasks: [
      { id: 'ppl:arina:1', who: 'me', text: 'Напомнить о вопросах' },
    ],
  },

  // ─── Прочее ─────────────────────────────────────────────────────────
  {
    chat: 457118082, name: 'Глеб', username: 'nilevej', kind: 'other',
    about: 'Выиграл наушники на вебинаре 24.09',
    status: 'Обещал отправить с понедельника по среду',
    tasks: [
      { id: 'ppl:gleb:1', who: 'me', due: '2026-09-30', text: 'Отправить наушники' },
    ],
  },
  {
    chat: 1848388243, name: 'Олег', username: 'im_001', kind: 'other',
    about: 'Студия подкастов',
    status: '16.09: RAW не скачивается, попросил камеру C в FullHD',
    tasks: [
      { id: 'ppl:studio:1', who: 'them', text: 'Прислать FullHD с трёх камер (особенно CAM C)' },
    ],
  },
  {
    chat: 8512608118, name: 'Никита Фален', username: 'falenwork', kind: 'other',
    about: 'Монтаж подкаста',
    status: '2.09 попросил вернуть деньги вместо 4 рилсов за $130',
    tasks: [
      { id: 'ppl:falen:1', who: 'them', text: 'Возврат денег за подкаст' },
    ],
  },
  {
    chat: 7439926392, name: 'Артём', username: 'insomniaadesign', kind: 'other',
    about: 'Дизайнер обложек',
    status: 'Сделает пробную обложку под A/B-тест, 22.09 спросил, под какой ролик',
    tasks: [
      { id: 'ppl:designer:1', who: 'me', text: 'Дать новый ролик под пробную обложку' },
    ],
  },
  {
    chat: 159474407, name: 'Юрий Пак', username: 'yury_pak', kind: 'other',
    about: 'Arealisting, обмен базами Таиланд–Бали',
    status: '8.09: со мной должна связаться Татьяна (@tsvetlovskaya)',
    tasks: [
      { id: 'ppl:pak:1', who: 'them', text: 'Связаться по обмену базами' },
    ],
  },
]

export const SILENT: Silent[] = [
  { chat: 280253106, name: 'Елисей Прокопьев', username: 'Elipsys_Bank', kind: 'agent', sent: '28.09' },
  { chat: 469934648, name: 'Катерина Яковенко', username: 'Katrin_Yakovenko', kind: 'agent', sent: '28.09' },
  { chat: 1512214142, name: 'Светлана', username: 'Seda8888', kind: 'agent', sent: '28.09' },
  { chat: 7020948394, name: 'BALISSIMO', username: 'mybalissimo', kind: 'agent', sent: '28.09' },
  { chat: 8158193450, name: 'Borderless Realtor', username: 'borderlessrealtor', kind: 'agent', sent: '28.09' },
  { chat: 1708151537, name: 'Оксана', username: 'oksin_life', kind: 'agent', sent: '28.09' },
  { chat: 8169816265, name: 'Яна', username: 'D_global_realty', kind: 'agent', sent: '28.09' },
  { chat: 6413455648, name: 'Weetsu Group', username: 'weetsu_group', kind: 'agent', sent: '28.09' },
  { chat: 6833390760, name: 'Екатерина Михайлова', username: 'Ekaterina_best_invest', kind: 'agent', sent: '28.09' },
  { chat: 7218183890, name: 'Марина (Offline Bali)', username: 'WTBali2', kind: 'agent', sent: '28.09' },
  { chat: 6600553432, name: 'Оксана Иванова (АН Сова)', username: 'mezregsova72', kind: 'agent', sent: '28.09' },
  { chat: 8640861590, name: 'Юлия Быкова', username: 'Uylia27101979', kind: 'agent', sent: '28.09, пришёл автоответ' },
  { chat: 940299525, name: 'Виктория Рубцова', username: 'Victoriya_Rubtsova', kind: 'agent', sent: '28.09' },
  { chat: 6056508525, name: 'Станислав', username: 'izhe_esi', kind: 'agent', sent: '28.09' },
  { chat: 728868712, name: 'Николай Лукашев', username: 'Nikolay_NL', kind: 'agent', sent: '28.09' },
  { chat: 257514723, name: 'Вячеслав Арсенин', username: 'arseninV', kind: 'agent', sent: '28.09' },
  { chat: 329501872, name: 'Рената', username: 'renata_badiul', kind: 'agent', sent: '22.09' },
  { chat: 8181285468, name: 'Анастасия', username: 'Goddess_nasty', kind: 'agent', sent: '22.09' },
  { chat: 355744363, name: 'Ирина', username: 'cryptoirina18', kind: 'agent', sent: '22.09' },
  { chat: 976302804, name: 'Михаил', username: 'LuciferFree', kind: 'agent', sent: '29.09' },
  { chat: 6964545826, name: 'Дмитрий (Azimut)', username: 'Dmitry_Azimut', kind: 'developer', sent: '25.09, отчёт' },
  { chat: 352097426, name: 'Игорь Базанов', username: 'Igor_Bazanov', kind: 'developer', sent: '25.09, отчёт' },
  { chat: 468776058, name: 'Павел Скандалов', username: 'scandalpro', kind: 'developer', sent: '25.09, отчёт' },
  { chat: 18138652, name: 'Дмитрий Кауфман', username: 'bali_director', kind: 'developer', sent: '25.09, отчёт' },
  { chat: 858073217, name: 'Илья Синяк', username: 'ilia_siniak', kind: 'developer', sent: '25.09, отчёт' },
  { chat: 1159726500, name: 'Феликс Демин', username: 'FelixDemin', kind: 'developer', sent: '25.09, отчёт' },
  { chat: 185841441, name: 'Герман Пантелеев', username: 'GermanPanteleev', kind: 'developer', sent: '25.09, отчёт' },
  { chat: 987207034, name: 'Вадим Луцив', username: 'vadimais', kind: 'developer', sent: '25.09, отчёт' },
  { chat: 93537288, name: 'Виктория', username: 'Vi3333', kind: 'developer', sent: '25.09, отчёт' },
  { chat: 138215577, name: 'Стив Федос (UNIT)', username: 'stevenfedos', kind: 'developer', sent: '28.09, спросил, что полезно в отчёте' },
]

export const CLOSED: Closed[] = [
  { chat: 6291790, name: 'Юрий Лысенко', username: 'Yura_rieltor', kind: 'agent', why: 'Счёл сообщение ложью' },
  { chat: 292092225, name: 'Елена Сорокина', username: 'lenok_sorokin', kind: 'agent', why: '6 сделок нет' },
  { chat: 5791902671, name: 'Дмитрий', username: 'dmitry_invests', kind: 'agent', why: 'В Москве, Бали изредка' },
  { chat: 740918008, name: 'Владимир Тарнакин', username: 'tarnakinestate', kind: 'agent', why: 'В России' },
  { chat: 277807099, name: 'Максим Шевчук', username: 'Maksym_Shevch', kind: 'agent', why: 'Пауза в недвижимости' },
  { chat: 514620936, name: 'Алёна', username: 'Allenush', kind: 'agent', why: 'Работает по Таиланду' },
  { chat: 1001975284, name: 'Валентина Лотц', username: 'Valentina_bali', kind: 'agent', why: 'На встречу не хочет' },
  { chat: 7914150991, name: 'Александр Шамин', username: 'alexschteine', kind: 'agent', why: 'Уходит из недвижимости в ИИ-проекты' },
  { chat: 619913951, name: 'Ксения Гринько', username: 'OksanaGrinko', kind: 'agent', why: 'В Киеве, продаёт Анту и 5 Oceans. «Будем на связи»' },
  { chat: 517657891, name: 'Светлана', username: 'Bali_realestate_Svetlana', kind: 'agent', why: 'Работает удалённо, не на Бали' },
  { chat: 5133890165, name: 'Даниил Залковски', username: 'DanielZalkovski', kind: 'agent', why: 'Пока учится у Эстетико' },
  { chat: 1890600081, name: 'Елена', username: 'elenaorhis', kind: 'agent', why: 'Бали сейчас не продаётся' },
  { chat: 404459885, name: 'Оля Коломоец', username: 'kolomoietsolya', kind: 'agent', why: 'Работает в Авалоне' },
  { chat: 99995425, name: 'Яна Минакова', username: 'yaminakova', kind: 'agent', why: 'Запросов по Бали нет' },
  { chat: 301949415, name: 'Alex P', username: 'Alex013p', kind: 'agent', why: 'Не на Бали, подсказал Андрея Бойко' },
  { chat: 78684493, name: 'Александр Ильин', username: 'Aleks_realty', kind: 'agent', why: 'Не интересно' },
  { chat: 493414721, name: 'Евгений Жуйков', username: 'evgeniizhuikov', kind: 'agent', why: 'Его сайт-оценщик — не интересно' },
  { chat: 1217717398, name: 'Airfreeman', username: 'airfreeman', kind: 'agent', why: 'Аренда техники — пока не интересно' },
  { chat: 5880695955, name: 'Константин (Estetico)', username: 'bali_invests', kind: 'agent', why: 'Клиента по Just Residence добавил в чат' },
  { chat: 5431414, name: 'Евгений Левен', username: 'levenevg', kind: 'agent', why: 'Виллу 10 в Инши Елена опубликовала' },
  { chat: 6212830028, name: 'Ольга Горхиян', username: 'OlgaGorkhiian', kind: 'agent', why: 'Обменялись подходом к доходности' },
  { chat: 612195186, name: 'Камран (Evdekimi)', username: 'KamranAlakbarov', kind: 'agent', why: 'Встретились 18.09' },
  { chat: 172144292, name: 'Василий Минаев', username: 'vasiliyminaev', kind: 'developer', why: 'Только комиссия без фикса — отказал' },
  { chat: 419337984, name: 'Алексей Разуменко', username: 'Aleksei_Rz', kind: 'developer', why: 'Edem Luxury: фикс не подходит, «на других проектах»' },
  { chat: 769274780, name: 'Виктория', username: 'Viktoria_Star1', kind: 'developer', why: 'Уезжает в Албанию' },
  { chat: 310060353, name: 'Алёна Юшина', username: 'Alena_Yushina', kind: 'developer', why: 'Прислала оффер «Горячий октябрь»' },
  { chat: 558232298, name: 'Галочка (Privé Pererenan)', username: 'yakobchuk_13', kind: 'developer', why: 'Рассылка акции' },
  { chat: 31325182, name: 'Дмитрий (Privé)', username: 'dimanze', kind: 'developer', why: 'Встретились 14.09' },
  { chat: 1110986819, name: 'Владислав (Evdekimi)', username: 'EmP1eR', kind: 'agent', why: 'Организовал встречу с Камраном' },
  { chat: 6665682766, name: 'Дарья (ESTATEWIN)', username: 'daria_kors7', kind: 'agent', why: 'Дал ссылку на канал для коллег' },
  { chat: 7105031406, name: 'Ангелина', username: 'Angelina_DreamHouse', kind: 'agent', why: 'Ушла из Dreamhouse, созвонились' },
  { chat: 388790318, name: 'Владислава (Nestra)', username: 'VladisslavaKr', kind: 'agent', why: 'Созвонились 8.09, она в Европе' },
  { chat: 6269929694, name: 'Денис', username: 'Denisterra', kind: 'other', why: 'УК — вернёмся, если партнёрка за 3 месяца не пойдёт' },
  { chat: 6634613236, name: 'Francis', username: 'Francis_Mug', kind: 'other', why: 'Обещал узнать про англоязычное сообщество агентов' },
  { chat: 8202505763, name: 'First Broker Alliance', username: 'firstbrokeralliance', kind: 'other', why: 'Сверка раз в месяц — через Елену' },
  { chat: 293608085, name: 'Максим Ширяев', username: 'maksolfactory', kind: 'other', why: 'Наушники за вебинар 10.09 отправлены' },
  { chat: 479833557, name: 'Антон Кузенский', username: 'AntonKuzenskii', kind: 'other', why: 'Технадзор: отчёт готов, оплата $350' },
  { chat: 147651219, name: 'Антон Каротки', username: 'anton_karotki', kind: 'other', why: 'Ищет спонсора форума в январе (10% за спонсора) — иметь в виду' },
  { chat: 583987741, name: 'Дмитрий Житский', username: 'DmitriyZhitskiy', kind: 'other', why: 'Сейчас в другом бизнесе, вернётся позже' },
  { chat: 107894035, name: 'Равиль Сафиуллин', username: 'RavilSaf', kind: 'other', why: 'Партнёрство по ИИ-продукту — не интересно' },
]

const IDS = new Set(PEOPLE.flatMap(p => p.tasks.map(t => t.id)))

/** Галочки по людям лежат в той же таблице, что и план, — с этим префиксом. */
export const PEOPLE_PREFIX = 'ppl:'

export function isPeopleTask(id: string): boolean {
  return IDS.has(id)
}
