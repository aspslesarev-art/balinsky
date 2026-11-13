// Ссылка «открыть точку в Google Картах» (работает и в приложении на телефоне).
export const googleMapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

export const OPEN_GMAPS = { ru: 'Открыть в Google Картах', en: 'Open in Google Maps', id: 'Buka di Google Maps', fr: 'Ouvrir dans Google Maps', de: 'In Google Maps öffnen', zh: '在 Google 地图中打开', nl: 'Openen in Google Maps', ban: 'Buka ring Google Maps', pl: 'Otwórz w Mapach Google', uk: 'Відкрити в Google Картах' }
