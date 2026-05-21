// Russian noun plural picker. Russian uses three numeric forms — for 1
// (singular), 2–4 (paucal "few"), and 5+ / 0 ("many"). The 11–19 range
// is a quirk: even 21 is "1-form" but 11 is "many", because the genitive
// plural overrides on the teens. This function applies that.
//
// Usage:
//   pluralRu(1,  ['спальня', 'спальни', 'спален'])   // → 'спальня'
//   pluralRu(3,  ['спальня', 'спальни', 'спален'])   // → 'спальни'
//   pluralRu(23, ['юнит',    'юнита',   'юнитов'])   // → 'юнита'
//   pluralRu(11, ['объект',  'объекта', 'объектов']) // → 'объектов'
export function pluralRu(n: number, [one, few, many]: [string, string, string]): string {
  const abs = Math.abs(Math.trunc(n))
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

// Shortcut that returns "{n} {right form}". Saves a template literal at
// every call site.
export function nPluralRu(n: number, forms: [string, string, string]): string {
  return `${n} ${pluralRu(n, forms)}`
}
