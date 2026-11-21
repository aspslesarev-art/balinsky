// Похоже ли, что страницу открыл робот, а не человек (владелец 21.11.2026:
// загрузка Google-карты платная, роботы не должны её тратить). Роботы,
// которые рендерят страницы (Googlebot, превью соцсетей, headless-браузеры),
// получают кнопку «Показать карту» — нажимать её они не станут.
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|quora|whatsapp|telegram|vkshare|yandex|baidu|bytespider|petal|semrush|ahrefs|mj12|dataforseo|python|curl|wget|node-fetch|axios|go-http|java\//i

export function likelyBot(): boolean {
  if (typeof navigator === 'undefined') return true
  if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return true
  return BOT_UA.test(navigator.userAgent)
}
