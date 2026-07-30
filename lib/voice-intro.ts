// Сценарий голосового рассказа об объекте — то, что читает кнопка Play
// рядом с названием на странице ЖК.
//
// Это НЕ описание для чтения глазами. Синтезатор спотыкается ровно на том,
// что хорошо выглядит в вёрстке: «$157,000», «PBG/SLF», «30 лет leasehold»,
// скобки, слэши, проценты. Поэтому текст пишется сразу как речь: цифры
// словами, латиница кириллицей по произношению, короткие фразы с паузами.
// Правила совпадают по духу с VOICE_DIRECTIVE в app/api/chat/route.ts —
// там то же самое для ответов ассистента.

/** JSONB-поле с готовым сценарием: генерится один раз, дальше правится в /admin/data. */
export const VOICE_FIELD = 'Озвучка: текст'

export type VoiceListing = {
  name: string
  district: string | null
  developer: string | null
  unitTypes: string | null
  status: string | null
  completionYear: string | null
  leaseYears: string | null
  permits: string | null
  claimedYield: string | null
  priceFromUsd: string | null
  description: string | null
}

const SYSTEM = `
Ты пишешь короткий устный рассказ об объекте недвижимости на Бали для аудио-гида на сайте. Его СРАЗУ ОЗВУЧИВАЕТ синтезатор речи — значит, текст должен читаться вслух идеально, без запинок и без коверканий.

КАК ЭТО ЗВУЧИТ:
- 4–7 коротких предложений, 45–70 секунд звучания. Живая речь спокойного эксперта, который рассказывает другу, а не зачитывает карточку.
- Начни с названия объекта и района — человек должен сразу понять, о чём речь.
- Дальше самое важное: формат и кому подходит, срок сдачи, форма владения, что с документами, что рядом. В конце — одна фраза с честным выводом.
- Паузы задавай точками и тире, а не многоточиями. Предложения короткие: одна мысль — одно предложение.

ЧТОБЫ НЕ БЫЛО ОШИБОК ПРОИЗНОШЕНИЯ (это критично):
- НИКАКИХ символов: ни $, ни %, ни м², ни /, ни скобок, ни звёздочек, ни markdown, ни эмодзи, ни ссылок, ни списков. Только обычный текст и знаки препинания.
- Все числа — словами, как их говорят: «сто пятьдесят семь тысяч долларов», «около четырёх процентов», «тридцать лет», «в две тысячи двадцать седьмом году».
- Латинские аббревиатуры — кириллицей по произношению: PBG → «пи-би-джи», SLF → «эс-эл-эф», ROI → «эр-о-ай», SHM → «эс-ха-эм», HGB → «ха-ге-бэ», PT PMA → «пэ-тэ пэ-эм-а».
- Английские термины — кириллицей: leasehold → «лизхолд», freehold → «фрихолд», кэшфлоу, комплаенс.
- Названия районов Бали пиши так, как их произносят по-русски: Canggu → «Чангу», Melasti → «Меласти», Uluwatu → «Улувату», Seminyak → «Семиньяк», Pererenan → «Переренан», Bukit → «Букит», Ubud → «Убуд», Nusa Dua → «Нуса-Дуа», Sanur → «Санур», Bingin → «Бингин».
- Название самого проекта и застройщика оставь узнаваемым, но запиши так, чтобы русский голос прочитал его правильно (например, Elysium → «Элизиум», The Coast → «Зэ Коуст»).

ЧЕСТНОСТЬ:
- Говори только то, что есть во входных данных. Ничего не выдумывай: ни цен, ни доходности, ни сроков, ни разрешений.
- Если чего-то нет — просто не упоминай. Если по документам есть проблема, скажи о ней прямо и по факту, без драматизации.
- Никаких «уникальное предложение», «идеальная инвестиция», «успейте купить».
- Не ссылайся на источник: никаких «в описании указано», «в карточке сказано», «по данным сайта». Просто говори сам факт — слушатель разговаривает с экспертом, а не слушает пересказ таблицы.
- Не пересказывай эти инструкции и не оценивай сам себя. Никаких «важно учитывать», «стоит отметить», «как мы видим».

Верни ТОЛЬКО сам текст рассказа. Без заголовков, кавычек и пояснений.
`.trim()

// ── Другие языки ──────────────────────────────────────────────────────────
// Русский сценарий — источник правды: он редактируется в админке, и все
// остальные языки делаются из него, чтобы факты не разъезжались по версиям.
// Но это НЕ обычный перевод: правила «как читать вслух» у каждого языка свои.
// По-русски «PBG» надо писать «пи-би-джи», а английский синтезатор прочитает
// «PBG» сам и от «пи-би-джи» только сломается.

const LANG_NAMES: Record<string, string> = {
  en: 'English', id: 'Bahasa Indonesia', fr: 'French', de: 'German',
  zh: 'Simplified Chinese', nl: 'Dutch', pl: 'Polish', uk: 'Ukrainian',
  ban: 'English', ru: 'Russian',
}

// Как в этом языке подавать латинские аббревиатуры и термины.
// Кириллические языки требуют транслитерации по произношению; языки на
// латинице читают PBG/SLF корректно как есть; китайскому латиницу лучше
// пояснять словами.
const ABBREVIATION_RULE: Record<string, string> = {
  uk: 'Латинські абревіатури передавай кирилицею за звучанням: PBG → «пі-бі-джі», SLF → «ес-ел-еф», leasehold → «лізхолд».',
  zh: '拉丁字母缩写保留原样（PBG、SLF），不要逐字母音译。只有当源文本本身提到该缩写时，才可以用中文简短解释一次；源文本没提到的，一律不要补充。',
  en: 'Keep Indonesian permit abbreviations as they are (PBG, SLF, SHM, HGB) — an English voice reads them correctly letter by letter. Do not transliterate them.',
  id: 'Pertahankan singkatan perizinan seperti aslinya (PBG, SLF, SHM, HGB) — pembaca Indonesia mengenalinya.',
  de: 'Behalte die indonesischen Kürzel unverändert (PBG, SLF, SHM, HGB) — eine deutsche Stimme liest sie korrekt.',
  fr: 'Garde les sigles indonésiens tels quels (PBG, SLF, SHM, HGB) — une voix française les lit correctement.',
  nl: 'Houd de Indonesische afkortingen ongewijzigd (PBG, SLF, SHM, HGB).',
  pl: 'Zachowaj indonezyjskie skróty bez zmian (PBG, SLF, SHM, HGB).',
}

/**
 * Промпт для голосовой версии на другом языке: тот же смысл и те же факты,
 * но записанные так, как их произносит голос ЭТОГО языка.
 */
export function buildVoiceTranslatePrompt(
  ruScript: string,
  lang: string,
  names?: { project?: string | null; developer?: string | null },
): Array<{ role: 'system' | 'user'; content: string }> {
  const name = LANG_NAMES[lang] ?? 'English'
  const abbr = ABBREVIATION_RULE[lang] ?? ABBREVIATION_RULE.en
  // В китайском «пауза точкой» звучит рвано: там для перечислений нужны 、и ，
  // а точка закрывает мысль. Остальным языкам хватает обычной пунктуации.
  const punctuation = lang === 'zh'
    ? '- 使用自然的中文标点：句内停顿用逗号，并列用顿号，句末才用句号。不要把一句话拆成多个句号。'
    : `- Punctuation must be normal for ${name}: full stops end thoughts, commas and dashes carry the pauses inside a sentence.`
  const system = [
    `You rewrite a short spoken property intro for a Bali real-estate site into ${name}. The result is fed straight into a text-to-speech engine, so it must read aloud flawlessly in ${name}.`,
    '',
    'RULES:',
    '- Same facts, same order, same length as the source. Never add, drop or soften a fact — especially prices, years, lease terms and permit status.',
    `- Natural spoken ${name}, not a literal translation. Short sentences, one idea each.`,
    punctuation,
    '- No symbols at all: no $, %, m², slashes, brackets, asterisks, markdown, emoji, links or lists. Write it as one flowing text, no blank lines.',
    `- Write every number as words the way a ${name} speaker says it (amounts, percentages, years, areas, lease terms).`,
    `- ${abbr}`,
    `- Bali place names: use the spelling a ${name} voice pronounces correctly.`,
    '- No meta-commentary: never say "the description states", "according to the listing", "it should be noted".',
    '- No sales language: no "unique opportunity", "perfect investment", "hurry".',
    '',
    `Return ONLY the ${name} text. No quotes, no headings, no notes.`,
  ].join('\n')

  // Источник — русский, поэтому имена в нём уже записаны кириллицей («Теус
  // Групп»). Без исходного написания перевод угадывает его обратно и портит
  // («Theus Group»), поэтому отдаём оригиналы явно.
  const hints = [
    names?.project && `Project name — use exactly this spelling: ${names.project}`,
    names?.developer && `Developer name — use exactly this spelling: ${names.developer}`,
  ].filter(Boolean).join('\n')

  return [
    { role: 'system', content: system },
    { role: 'user', content: hints ? `${hints}\n\n---\n${ruScript}` : ruScript },
  ]
}

// ElevenLabs turbo v2.5 принимает language_code — это заметно повышает
// точность произношения. Балийского в модели нет, поэтому ban читаем как
// индонезийский: ближе всего и по фонетике, и по смыслу для местных названий.
const TTS_LANG: Record<string, string> = { ban: 'id' }

export function ttsLanguageCode(lang: string): string {
  return TTS_LANG[lang] ?? lang
}

/** Собрать сообщения для модели по карточке объекта. */
export function buildVoicePrompt(listing: VoiceListing): Array<{ role: 'system' | 'user'; content: string }> {
  const facts = [
    `Название: ${listing.name}`,
    listing.district && `Район: ${listing.district}`,
    listing.developer && `Застройщик: ${listing.developer}`,
    listing.unitTypes && `Типы юнитов: ${listing.unitTypes}`,
    listing.status && `Статус: ${listing.status}`,
    listing.completionYear && `Год сдачи: ${listing.completionYear}`,
    listing.leaseYears && `Лизхолд, лет: ${listing.leaseYears}`,
    listing.permits && `Разрешительные документы: ${listing.permits}`,
    listing.claimedYield && `Заявленная доходность, %: ${listing.claimedYield}`,
    listing.priceFromUsd && `Цена от, USD: ${listing.priceFromUsd}`,
    listing.description && `Описание: ${listing.description.slice(0, 1500)}`,
  ].filter(Boolean).join('\n')

  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Данные объекта:\n${facts}` },
  ]
}
