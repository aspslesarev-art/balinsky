// Невидимая метка источника в текстах сайта.
//
// Зачем: если кто-то скопирует или спарсит наши тексты, по метке видно, что
// они взяты с balinsky.info и с какой именно страницы. Проверка — /admin/metka.
//
// Как: адрес страницы кодируется символами нулевой ширины (4 символа = 2 бита)
// и дописывается в конец абзаца. Их не видно, они не меняют ни букв, ни цифр,
// но уходят вместе с текстом при копировании и остаются в HTML для парсера.
// Метка стоит только после текста абзаца — не внутри слов и не в цифрах,
// чтобы не мешать поиску и копированию значений.

const ALPHABET = ['​', '‌', '‍', '⁠'] as const
const PREFIX = 'bx:'
const ZW_RUN = /[​‌‍⁠]+/g

/** Путь без служебного сегмента /q (фильтры каталога переписываются на него),
 *  чтобы сервер и браузер кодировали одно и то же. */
export function normalizeMarkPath(pathname: string): string {
  return pathname.replace(/\/q(?=\/|$)/, '') || '/'
}

export function encodeSourceMark(pathname: string): string {
  const bytes = new TextEncoder().encode(PREFIX + normalizeMarkPath(pathname))
  let out = ''
  for (const b of bytes) {
    for (let shift = 6; shift >= 0; shift -= 2) out += ALPHABET[(b >> shift) & 3]
  }
  return out
}

/** Все метки, найденные в тексте, — адреса страниц balinsky.info без повторов. */
export function decodeSourceMarks(text: string): string[] {
  const found = new Set<string>()
  for (const run of text.match(ZW_RUN) ?? []) {
    if (run.length % 4 !== 0) continue
    const bytes = new Uint8Array(run.length / 4)
    for (let i = 0; i < bytes.length; i++) {
      let b = 0
      for (let j = 0; j < 4; j++) b = (b << 2) | ALPHABET.indexOf(run[i * 4 + j] as (typeof ALPHABET)[number])
      bytes[i] = b
    }
    const s = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    if (s.startsWith(PREFIX)) found.add('balinsky.info' + s.slice(PREFIX.length))
  }
  return [...found]
}
