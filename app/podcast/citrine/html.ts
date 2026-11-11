// Сценарий подкаста CITRINE (2026-11-11). Отдаётся целиком как HTML-страница
// через route.ts по прямой ссылке /podcast/citrine. Копия опубликована как artifact.
export const PODCAST_CITRINE_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Подкаст CITRINE</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap">
<style>
/* Layout: рабочий сценарий ведущего - узкая колонка текста, слева таймкоды эфира, сверху липкая лента блоков */
:root {
  --bg: #F7F8F6;
  --surface: #FFFFFF;
  --ink: #17201B;
  --muted: #5B6560;
  --line: #E1E5E2;
  --accent: #1F6B57;
  --accent-soft: #E3EFEA;
  --screen: #2F5DA8; --screen-soft: #E6EDF8;
  --table: #8A5A12; --table-soft: #F6EEDF;
  --pause: #6B4FA0; --pause-soft: #EEE9F6;
  --f-display: "Onest", "Inter", system-ui, sans-serif;
  --f-body: "Inter", system-ui, -apple-system, sans-serif;
  --f-mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #121614; --surface: #1A201D; --ink: #E7ECE9; --muted: #9AA5A0; --line: #2B3330;
  --accent: #6CC3A6; --accent-soft: #1E3029;
  --screen: #8FB2EC; --screen-soft: #1D2638; --table: #E0B56A; --table-soft: #2F271A; --pause: #B9A2E6; --pause-soft: #2A2338;
  color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #121614; --surface: #1A201D; --ink: #E7ECE9; --muted: #9AA5A0; --line: #2B3330;
  --accent: #6CC3A6; --accent-soft: #1E3029;
  --screen: #8FB2EC; --screen-soft: #1D2638; --table: #E0B56A; --table-soft: #2F271A; --pause: #B9A2E6; --pause-soft: #2A2338;
  color-scheme: dark }

* { box-sizing: border-box }
body { background: var(--bg); color: var(--ink); font: 400 16px/1.6 var(--f-body); }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--bg) }
.wrap { max-width: 860px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 40px 80px }

header.top { display: flex; flex-direction: column; gap: 12px; padding-bottom: 24px }
.eyebrow { font: 600 13px/1.2 var(--f-body); letter-spacing: .08em; text-transform: uppercase; color: var(--accent) }
h1 { margin: 0; font: 700 clamp(30px, 5vw, 44px)/1.12 var(--f-display); letter-spacing: -0.02em; text-wrap: balance }
.lede { margin: 0; color: var(--muted); max-width: 62ch }
.meta { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 14px; color: var(--muted) }
.meta b { color: var(--ink); font-weight: 600 }

.legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px }
.tag { display: inline-flex; align-items: center; gap: 6px; font: 500 12px/1 var(--f-mono); padding: 5px 8px; border-radius: 6px; white-space: nowrap; vertical-align: 1px }
.tag.screen { background: var(--screen-soft); color: var(--screen) }
.tag.table { background: var(--table-soft); color: var(--table) }
.tag.pause { background: var(--pause-soft); color: var(--pause) }
.legend span.desc { font-size: 13px; color: var(--muted); align-self: center; margin-right: 8px }

nav.blocks { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); margin-inline: calc(-1 * max(16px, env(safe-area-inset-left, 0px))); padding: 10px max(16px, env(safe-area-inset-left, 0px)); display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none }
nav.blocks a { flex: 0 0 auto; text-decoration: none; color: var(--ink); font-size: 14px; font-weight: 500; padding: 7px 12px; border-radius: 999px; background: var(--surface); border: 1px solid var(--line) }
nav.blocks a:hover { border-color: var(--accent) }
nav.blocks a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }
nav.blocks a.on { background: var(--ink); color: var(--bg); border-color: var(--ink) }
nav.blocks small { font: 500 11px var(--f-mono); opacity: .65; margin-right: 6px }

section.seg { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 24px; padding-block: 40px; border-bottom: 1px solid var(--line); scroll-margin-top: 64px }
.tc { font: 500 13px/1.4 var(--f-mono); color: var(--muted); padding-top: 6px; font-variant-numeric: tabular-nums }
.tc b { display: block; color: var(--accent); font-size: 12px; margin-bottom: 4px }
.body { display: flex; flex-direction: column; gap: 18px; min-width: 0 }
h2 { margin: 0; font: 600 26px/1.2 var(--f-display); letter-spacing: -0.015em; text-wrap: balance }
h2 .main { display: inline-block; font: 600 11px/1 var(--f-body); letter-spacing: .08em; text-transform: uppercase; color: var(--accent); background: var(--accent-soft); padding: 5px 8px; border-radius: 6px; vertical-align: 6px; margin-left: 8px }

.say { margin: 0; padding: 14px 18px; border-left: 3px solid var(--accent); background: var(--surface); border-radius: 0 10px 10px 0; font-size: 17px; line-height: 1.55 }
.say p { margin: 0 }
.say p + p { margin-top: 10px }
.who { display: block; font: 600 12px/1 var(--f-body); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px }

ol.qs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; counter-reset: q }
ol.qs > li { counter-increment: q; display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px }
ol.qs > li > input { appearance: none; width: 22px; height: 22px; margin: 2px 0 0; border: 1.5px solid var(--line); border-radius: 6px; display: grid; place-items: center; cursor: pointer; background: var(--bg) }
ol.qs > li > input::after { content: counter(q); font: 600 12px var(--f-mono); color: var(--muted) }
ol.qs > li > input:checked { background: var(--accent); border-color: var(--accent) }
ol.qs > li > input:checked::after { content: "✓"; color: var(--surface); font-family: var(--f-body) }
ol.qs > li > input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }
ol.qs > li:has(input:checked) .q { color: var(--muted) }
.q { margin: 0; font-weight: 500 }
.push { margin: 6px 0 0; color: var(--muted); font-size: 15px }
.push::before { content: "→ "; color: var(--accent); font-weight: 600 }
.note { margin: 6px 0 0; font-size: 15px; color: var(--muted) }

.take { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 12px; background: var(--accent-soft); font-size: 15px }
.take b { color: var(--accent); white-space: nowrap; font-weight: 600 }

.check { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px }
.check li { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font-size: 15px; display: flex; gap: 10px }
.check li span { font: 500 12px/1.9 var(--f-mono); color: var(--accent) }

.cheat { margin-top: 48px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 24px }
.cheat h2 { font-size: 22px; margin-bottom: 4px }
.cheat .sub { margin: 0 0 16px; color: var(--muted); font-size: 14px }
dl.kv { margin: 0; display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 0 }
dl.kv dt, dl.kv dd { padding: 10px 0; border-top: 1px solid var(--line); margin: 0; font-size: 15px }
dl.kv dt { color: var(--muted); padding-right: 16px }
dl.kv dd { font-variant-numeric: tabular-nums }
.fill { background: var(--table-soft); color: var(--table); padding: 1px 6px; border-radius: 4px; font-weight: 500 }

.reset { margin-top: 16px; font: 500 14px var(--f-body); color: var(--muted); background: none; border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; cursor: pointer }
.reset:hover { color: var(--ink); border-color: var(--ink) }
.reset:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }

@media (max-width: 640px) {
  section.seg { grid-template-columns: minmax(0, 1fr); gap: 10px; padding-block: 32px }
  .tc { display: flex; gap: 10px; padding-top: 0 }
  .tc b { margin: 0 }
  .check { grid-template-columns: minmax(0, 1fr) }
  dl.kv { grid-template-columns: minmax(0, 1fr) }
  dl.kv dt { padding-bottom: 0 } dl.kv dd { border-top: 0; padding-top: 2px }
}
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth } }
</style>
</head>
<body>

<div class="wrap">
  <header class="top">
    <span class="eyebrow">Сценарий подкаста · студия</span>
    <h1>CITRINE, Убуд: проверяем обещание 12% в год</h1>
    <p class="lede">Вилла за $169 000, управляющая компания обещает $20 294 в год. Разбираем, на чём держится цифра, что будет, если что-то пойдёт не так, и как выйти через 10 лет.</p>
    <div class="meta">
      <span>Эфир <b>40-45 мин</b>, в монтаже <b>30-35</b></span>
      <span>Гость: <span class="fill">имя, должность</span>, Kamrita</span>
    </div>
    <div class="legend">
      <span class="tag screen">ЭКРАН</span><span class="desc">графика в монтаже</span>
      <span class="tag table">СТОЛ</span><span class="desc">предмет в кадре</span>
      <span class="tag pause">ПАУЗА</span><span class="desc">молчим 3-4 секунды</span>
    </div>
    <p class="note">На столе: распечатка прогноза УК, ноутбук экраном к камере с вкладками Booking, лист бумаги и ручка, шпаргалка ведущего. Номера вопросов можно отмечать прямо по ходу записи.</p>
  </header>

  <nav class="blocks" aria-label="Блоки сценария">
    <a href="#hook"><small>0:00</small>Хук</a>
    <a href="#intro"><small>0:30</small>Вступление</a>
    <a href="#money"><small>2:00</small>Деньги</a>
    <a href="#land"><small>8:00</small>Земля</a>
    <a href="#build"><small>14:00</small>Стройка</a>
    <a href="#income"><small>18:00</small>Доход и УК</a>
    <a href="#exit"><small>30:00</small>Выход</a>
    <a href="#blitz"><small>35:00</small>Блиц</a>
    <a href="#final"><small>38:00</small>Финал</a>
    <a href="#cheat">Шпаргалка</a>
  </nav>

  <section class="seg" id="hook">
    <div class="tc"><b>Хук</b>0:00-0:30</div>
    <div class="body">
      <h2>Вырезка из блица</h2>
      <div class="say"><span class="who">Ведущий</span><p>Если вилла даёт 12% в год - почему вы её продаёте, а не оставляете себе?</p></div>
      <p class="note"><span class="tag pause">ПАУЗА</span> начало ответа, склейка в заставку.</p>
    </div>
  </section>

  <section class="seg" id="intro">
    <div class="tc"><b>Вступление</b>0:30-2:00</div>
    <div class="body">
      <h2>Что проверяем</h2>
      <div class="say"><span class="who">Ведущий в камеру</span>
        <p>Вилла в Убуде за $169 000. Управляющая компания обещает 12% в год - это $20 294 владельцу. Звучит хорошо. Сегодня проверяем, на чём держится эта цифра, что будет, если что-то пойдёт не так, и как отсюда выйти через 10 лет.</p>
        <p>В студии <span class="fill">имя, должность</span> Kamrita. Мы не будем обсуждать рендеры. Только цифры, документы и риски.</p>
      </div>
      <ol class="qs">
        <li><input type="checkbox" id="q-intro-1" aria-label="Отметить вопрос"><div><p class="q">Одной фразой: что вы строите и сколько уже сдали?</p></div></li>
      </ol>
      <p class="note"><span class="tag screen">ЭКРАН</span> Kamrita - сдано 2 проекта из 5, 3 строятся. CITRINE - 6 вилл, 109,4 м², 2 спальни, бассейн, сдача IV кв. 2027.</p>
    </div>
  </section>

  <section class="seg" id="money">
    <div class="tc"><b>Блок 1</b>2:00-8:00</div>
    <div class="body">
      <h2>Деньги застройщика</h2>
      <div class="say"><span class="who">Переход</span><p>Начнём с самого скучного и самого важного - на что вы строите.</p></div>
      <ol class="qs">
        <li><input type="checkbox" id="q-money-1" aria-label="Отметить вопрос"><div><p class="q">На какие деньги строите CITRINE? Только деньги покупателей, кредит или свои?</p><p class="push">Сколько своих денег уже вложено?</p></div></li>
        <li><input type="checkbox" id="q-money-2" aria-label="Отметить вопрос"><div><p class="q">Сколько вилл из 6 нужно продать, чтобы закрыть стройку? Сколько уже продано?</p><p class="push">Если продадите только 3 - остальные достроите? На что?</p></div></li>
        <li><input type="checkbox" id="q-money-3" aria-label="Отметить вопрос"><div><p class="q">Если продажи встанут на полгода - на сколько месяцев стройки хватит денег?</p></div></li>
        <li><input type="checkbox" id="q-money-4" aria-label="Отметить вопрос"><div><p class="q">Цена $169 000 зафиксирована. Если материалы подорожают на 20% - кто платит?</p></div></li>
        <li><input type="checkbox" id="q-money-5" aria-label="Отметить вопрос"><div><p class="q">PBG получен 6 августа. Сейчас ноябрь, стройка не начата. Почему?</p><p class="note"><span class="tag pause">ПАУЗА</span></p></div></li>
      </ol>
      <div class="take"><b>Зрителю</b><span>Главный риск стройки - не качество, а деньги застройщика. Спрашивайте, сколько продано и что будет, если продажи встанут.</span></div>
    </div>
  </section>

  <section class="seg" id="land">
    <div class="tc"><b>Блок 2</b>8:00-14:00</div>
    <div class="body">
      <h2>Земля и документы</h2>
      <div class="say"><span class="who">Переход</span><p>На Бали иностранец покупает не землю, а аренду. Давайте разберём, что именно покупает человек.</p></div>
      <p class="note"><span class="tag screen">ЭКРАН</span> схема: хозяин земли → аренда у нотариуса до 28.11.2055 → застройщик → субаренда → покупатель.</p>
      <ol class="qs">
        <li><input type="checkbox" id="q-land-1" aria-label="Отметить вопрос"><div><p class="q">С кем подписывает договор покупатель - с вами или с хозяином земли?</p><p class="push">Если ваша компания закроется - что с договором покупателя?</p></div></li>
        <li><input type="checkbox" id="q-land-2" aria-label="Отметить вопрос"><div><p class="q">Продление ещё на 30 лет есть в договоре. Но цена - «по рынку на момент продления». Почему не зафиксировать формулу сейчас?</p><p class="push">Хотя бы примерно - сколько это может стоить?</p></div></li>
        <li><input type="checkbox" id="q-land-3" aria-label="Отметить вопрос"><div><p class="q">PBG есть, зона R-3 подтверждена. SLF дают только после стройки. Что будет, если не дадут?</p></div></li>
        <li><input type="checkbox" id="q-land-4" aria-label="Отметить вопрос"><div><p class="q">Для посуточной сдачи нужна лицензия KBLI 55193. Она на вашей компании? Покажете?</p></div></li>
        <li><input type="checkbox" id="q-land-5" aria-label="Отметить вопрос"><div><p class="q">Если сдача задержится - какая неустойка и когда покупатель может вернуть деньги?</p></div></li>
      </ol>
      <div class="take"><b>Зрителю</b><span>Лизхолд - это аренда с датой окончания. Смотрите три вещи: до какого года, с кем договор и сколько стоит продление.</span></div>
    </div>
  </section>

  <section class="seg" id="build">
    <div class="tc"><b>Блок 3</b>14:00-18:00</div>
    <div class="body">
      <h2>Стройка и климат</h2>
      <div class="say"><span class="who">Переход</span><p>Убуд - это полгода дождей. Всё, что плохо сделано, вылезет в первый сезон.</p></div>
      <ol class="qs">
        <li><input type="checkbox" id="q-build-1" aria-label="Отметить вопрос"><div><p class="q">Кто строит - вы или подрядчик? Кто независимо проверяет то, что потом закроют стенами?</p></div></li>
        <li><input type="checkbox" id="q-build-2" aria-label="Отметить вопрос"><div><p class="q">Что сделано против сырости: гидроизоляция, плесень, вентиляция, проводка?</p></div></li>
        <li><input type="checkbox" id="q-build-3" aria-label="Отметить вопрос"><div><p class="q">Гарантия после сдачи: крыша, бассейн, инженерка - сколько лет? Куда звонить, если протекло?</p></div></li>
      </ol>
      <div class="take"><b>Зрителю</b><span>Попросите показать виллу этого застройщика, которой больше года. Там видно всё.</span></div>
    </div>
  </section>

  <section class="seg" id="income">
    <div class="tc"><b>Блок 4</b>18:00-30:00</div>
    <div class="body">
      <h2>Доход и управляющая компания <span class="main">главный блок</span></h2>
      <div class="say"><span class="who">Переход</span><p>Теперь главное. Ради этого люди и покупают.</p></div>
      <p class="note"><span class="tag table">СТОЛ</span> распечатка прогноза УК. <span class="tag screen">ЭКРАН</span> $119 за ночь · загрузка 73% · выручка $31 909 · владельцу $20 294 в год = 12%.</p>
      <ol class="qs">
        <li><input type="checkbox" id="q-inc-1" aria-label="Отметить вопрос"><div><p class="q">Откуда эти цифры? На каких реальных данных посчитано?</p></div></li>
        <li><input type="checkbox" id="q-inc-2" aria-label="Отметить вопрос"><div><p class="q">Мы посмотрели 29 вилл с 2 спальнями в радиусе 1,5 км по Booking за август-ноябрь. Половина загружена меньше чем на 64%. А УК на эти же месяцы закладывает около 75%. Почему вы будете выше?</p><p class="note"><span class="tag table">СТОЛ</span> график загрузки соседей. <span class="tag screen">ЭКРАН</span> 29 вилл по загрузке и линия прогноза УК. <span class="tag pause">ПАУЗА</span></p></div></li>
        <li><input type="checkbox" id="q-inc-3" aria-label="Отметить вопрос"><div><p class="q">Соседи с 2 спальнями здесь берут от $62 до $149 за ночь. Для гостя в прогнозе $142. Почему гость выберет вас?</p><p class="note"><span class="tag table">СТОЛ</span> ноутбук экраном к камере, Booking.</p></div></li>
        <li><input type="checkbox" id="q-inc-4" aria-label="Отметить вопрос"><div><p class="q">В прогнозе написано «точность 87%». Покажите прогноз и факт по вашим сданным виллам.</p><p class="push">Если есть: откройте календарь вашей сданной виллы - камера на телефон.</p></div></li>
        <li><input type="checkbox" id="q-inc-5" aria-label="Отметить вопрос"><div><p class="q">Посчитайте вместе со мной: загрузка 64%, как у соседей. Сколько получит владелец?</p><p class="note"><span class="tag table">СТОЛ</span> бумага и ручка гостю, камера сверху.</p></div></li>
        <li><input type="checkbox" id="q-inc-6" aria-label="Отметить вопрос"><div><p class="q">УК - ваша компания? Берёт 20% выручки, расходы ещё 15,4%. Кто проверяет эти расходы?</p></div></li>
        <li><input type="checkbox" id="q-inc-7" aria-label="Отметить вопрос"><div><p class="q">Расходы $463 в месяц и 1% на ремонт - $319 в год на виллу с бассейном. Это факт или оценка?</p></div></li>
        <li><input type="checkbox" id="q-inc-8" aria-label="Отметить вопрос"><div><p class="q">12% - это до налога. Сколько остаётся иностранцу на руках? Как деньги приходят: куда, в какой валюте, как часто?</p></div></li>
        <li><input type="checkbox" id="q-inc-9" aria-label="Отметить вопрос"><div><p class="q">Сколько дней в году владелец может жить сам?</p><p class="note"><span class="tag screen">ЭКРАН</span> по прогнозу УК июль и август дают 27% годовой выплаты. Месяц в сезон - минус около 13% дохода.</p></div></li>
        <li><input type="checkbox" id="q-inc-10" aria-label="Отметить вопрос"><div><p class="q">Все 6 вилл одинаковые и в одной УК. Как делятся брони, чтобы одна не стояла пустой, пока соседняя сдаётся?</p></div></li>
      </ol>
      <div class="take"><b>Зрителю</b><span>Просите посчитать доход при загрузке района, а не при обещанной. Просите отчёт по сданной вилле за 12 месяцев. И помните: 12% до налога и 12% на руках - разные цифры.</span></div>
    </div>
  </section>

  <section class="seg" id="exit">
    <div class="tc"><b>Блок 5</b>30:00-35:00</div>
    <div class="body">
      <h2>Перепродажа и рынок</h2>
      <div class="say"><span class="who">Переход</span><p>Хорошо, купили, сдаём. А как отсюда выйти?</p></div>
      <ol class="qs">
        <li><input type="checkbox" id="q-exit-1" aria-label="Отметить вопрос"><div><p class="q">Через 10 лет у виллы останется 19 лет аренды. Кто и за сколько её купит? Помогаете с перепродажей?</p><p class="push">В ваших проектах кто-то уже перепродал? За сколько?</p></div></li>
        <li><input type="checkbox" id="q-exit-2" aria-label="Отметить вопрос"><div><p class="q">Похожие виллы рядом продаются за $188 000 - $242 000. Ваша - $169 000. Почему дешевле? Где сэкономили?</p></div></li>
        <li><input type="checkbox" id="q-exit-3" aria-label="Отметить вопрос"><div><p class="q">В 2 км уже около 60 вилл посуточно. Через 3 года будет больше. Чем ваша вилла удержит гостя?</p></div></li>
      </ol>
      <div class="take"><b>Зрителю</b><span>Лизхолд дешевеет каждый год. Считайте не только доход, но и за сколько продадите.</span></div>
    </div>
  </section>

  <section class="seg" id="blitz">
    <div class="tc"><b>Блиц</b>35:00-38:00</div>
    <div class="body">
      <h2>Коротко, одной фразой</h2>
      <ol class="qs">
        <li><input type="checkbox" id="q-bl-1" aria-label="Отметить вопрос"><div><p class="q">Гарантируете доход - да или нет?</p></div></li>
        <li><input type="checkbox" id="q-bl-2" aria-label="Отметить вопрос"><div><p class="q">Самая большая ошибка вашей компании за 2 года и сколько она стоила?</p></div></li>
        <li><input type="checkbox" id="q-bl-3" aria-label="Отметить вопрос"><div><p class="q">Какой проект конкурентов рядом вы считаете сильным?</p></div></li>
        <li><input type="checkbox" id="q-bl-4" aria-label="Отметить вопрос"><div><p class="q">Три красных флага, при которых инвестору надо уходить от застройщика?</p></div></li>
        <li><input type="checkbox" id="q-bl-5" aria-label="Отметить вопрос"><div><p class="q">Если вилла даёт 12% в год - почему вы её продаёте, а не оставляете себе?</p><p class="note"><span class="tag pause">ПАУЗА</span> этот ответ уходит в хук.</p></div></li>
        <li><input type="checkbox" id="q-bl-6" aria-label="Отметить вопрос"><div><p class="q">Купили бы эту виллу за $169 000 на свои деньги?</p></div></li>
      </ol>
    </div>
  </section>

  <section class="seg" id="final">
    <div class="tc"><b>Финал</b>38:00-40:00</div>
    <div class="body">
      <h2>Вывод и чеклист</h2>
      <div class="say"><span class="who">Ведущий в камеру</span>
        <p>Что я вынес из разговора: <span class="fill">2-3 фразы своими словами</span>.</p>
        <p>И чеклист для любой виллы на Бали - сохраните.</p>
      </div>
      <p class="note"><span class="tag screen">ЭКРАН</span> чеклист:</p>
      <ul class="check">
        <li><span>1</span>Доход при загрузке района, а не при обещанной</li>
        <li><span>2</span>Отчёт по сданному объекту за 12 месяцев</li>
        <li><span>3</span>Чем вилла лучше соседей по цене за ночь</li>
        <li><span>4</span>Расходы в долларах в месяц</li>
        <li><span>5</span>Доход после налога</li>
        <li><span>6</span>Сколько стоит ваш собственный отдых в вилле</li>
        <li><span>7</span>Хватит ли денег достроить</li>
        <li><span>8</span>Цена продажи через 10 лет</li>
      </ul>
      <div class="say"><p><span class="fill">Имя</span>, спасибо, что не ушли от неудобных вопросов.</p></div>
    </div>
  </section>

  <section class="cheat" id="cheat">
    <h2>Шпаргалка ведущего</h2>
    <p class="sub">Не для кадра. Цифры для дожимов.</p>
    <dl class="kv">
      <dt>Вилла</dt><dd>$169 000 · $1 545/м² · 109,4 м², 2 спальни · рассрочка 30/20/20/20/10 · сдача IV кв. 2027</dd>
      <dt>Земля</dt><dd>Аренда 28.11.2025 - 28.11.2055 + ещё 30 лет, цена продления по рынку (ст. 11a)</dd>
      <dt>Документы</dt><dd>PBG 06.08.2026 · KKKPR 19.05.2026, зона R-3 · залогов и споров нет (проверка, август 2026)</dd>
      <dt>Прогноз УК, 2027</dt><dd>$119 за ночь, 73% · выручка $31 909 · УК 20% ($6 382) · расходы 15,4% ($4 913) · ремонт 1% ($319) · владельцу $20 294 · второй год $25 138</dd>
      <dt>Плохой сценарий УК</dt><dd>$103 за ночь, 66% · владельцу $14 934 (8,8%)</dd>
      <dt>Сезоны УК</dt><dd>Январь $90 и 64% · июль-август $151-155 и 84%</dd>
      <dt>Загрузка рядом</dt><dd>29 вилл с 2 спальнями в 1,5 км, Booking, 05.08-11.11.2026 · половина ниже 64%, в среднем 62% · у 12 из 29 - 77% и выше</dd>
      <dt>Цены соседей</dt><dd>$62-149 за ночь на Booking</dd>
      <dt>Помесячная аренда</dt><dd>~$1 283 в месяц (99 объявлений в 2 км)</dd>
      <dt>Продажа рядом</dt><dd>$188 000 - $242 000 (10 вилл)</dd>
      <dt>Застройщик</dt><dd>Kamrita: сдано 2 проекта из 5, ещё 3 строятся</dd>
    </dl>
    <button class="reset" id="reset" type="button">Снять все отметки</button>
  </section>
</div>

<script>
(function () {
  var KEY = 'citrine-podcast-checked';
  var boxes = Array.prototype.slice.call(document.querySelectorAll('ol.qs input[type=checkbox]'));
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
  boxes.forEach(function (b) {
    if (saved[b.id]) b.checked = true;
    b.addEventListener('change', function () {
      saved[b.id] = b.checked;
      try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
    });
  });
  document.getElementById('reset').addEventListener('click', function () {
    boxes.forEach(function (b) { b.checked = false; });
    saved = {};
    try { localStorage.removeItem(KEY); } catch (e) {}
  });

  var links = Array.prototype.slice.call(document.querySelectorAll('nav.blocks a'));
  var map = {};
  links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          links.forEach(function (a) { a.classList.remove('on'); });
          map[e.target.id].classList.add('on');
          map[e.target.id].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      });
    }, { rootMargin: '-80px 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }
})();
</script>

</body>
</html>
`
