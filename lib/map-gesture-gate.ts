/**
 * Карта, встроенная в длинную страницу, не должна перехватывать жесты, пока
 * по ней не кликнули: иначе колесо зумит карту вместо прокрутки страницы, а
 * свайп на телефоне не даёт пролистать секцию.
 *
 * `gestureHandling: 'none'` отключает только панораму и зум — клики по карте
 * продолжают приходить, поэтому первый же клик или тап снимает блокировку.
 *
 * Страницы-карты (`/karta`, `/mapa`, `/ditu`) намеренно НЕ используют этот
 * гейт: там карта и есть содержимое страницы, прокручивать мимо неё нечего.
 */
export function gateMapGestures(map: google.maps.Map): () => void {
  map.setOptions({ gestureHandling: 'none' })

  const listener = map.addListener('click', () => {
    map.setOptions({ gestureHandling: 'greedy' })
    listener.remove()
  })

  return () => listener.remove()
}
