// «650 000 долларов» не должно рваться между строк на «650» и «000»:
// пробел между группами разрядов меняем на неразрывный.
export function glueNumbers(text: string): string {
  return text.replace(/(\d)[ \u202f](?=\d{3}(?!\d))/g, '$1\u00a0')
}
