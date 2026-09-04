import { translit } from '@/lib/translit'

// Slug для карточки агента.
//
// Хвост из id обязателен: два агента заводят один и тот же юнит одного ЖК,
// и по названию slug у них совпадёт. Без хвоста вторая вставка падала бы на
// unique-индексе, а агент видел бы непонятную ошибку вместо своей страницы.
export function listingSlug(title: string, id: string): string {
  const base = translit(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '')
  const tail = id.replace(/-/g, '').slice(0, 6)
  return base ? `${base}-${tail}` : `obekt-${tail}`
}
