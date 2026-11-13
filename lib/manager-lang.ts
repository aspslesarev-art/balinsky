// Языки менеджера хранятся по-русски («Русский, Английский»). Для не-RU
// страниц, если редактор не заполнил EN-список, переводим по словарю.
const LANG_EN: Record<string, string> = {
  'русский': 'Russian', 'английский': 'English', 'украинский': 'Ukrainian', 'индонезийский': 'Indonesian',
  'немецкий': 'German', 'французский': 'French', 'китайский': 'Chinese', 'испанский': 'Spanish',
  'итальянский': 'Italian', 'польский': 'Polish', 'нидерландский': 'Dutch', 'казахский': 'Kazakh',
  'балийский': 'Balinese', 'турецкий': 'Turkish', 'арабский': 'Arabic', 'японский': 'Japanese', 'корейский': 'Korean',
}
export function managerLanguagesEn(ru: string[], en?: string[] | null): string[] {
  if (en && en.length > 0) return en
  return ru.map(l => LANG_EN[l.trim().toLowerCase()] ?? l)
}
