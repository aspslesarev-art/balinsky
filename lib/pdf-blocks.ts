// Блоки печатной презентации — общий список для окна выбора (клиент) и
// печатной страницы (сервер), в порядке листов.
export type PdfBlock = 'verdict' | 'photos' | 'facts' | 'about' | 'safety' | 'near' | 'living' | 'heat' | 'daily' | 'monthly' | 'sale' | 'calc'
export const PDF_BLOCKS: PdfBlock[] = ['verdict', 'photos', 'facts', 'about', 'safety', 'near', 'living', 'heat', 'daily', 'monthly', 'sale', 'calc']
