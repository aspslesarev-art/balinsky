import { NextResponse } from 'next/server'

// Фото Google Places отключены (владелец 21.11.2026): сервис платный за каждый
// вызов, сайт берёт только свои фото. Маршрут оставлен, чтобы старые ссылки
// получали понятный ответ, а не 404.
export function GET() {
  return NextResponse.json({ error: 'disabled' }, { status: 410 })
}
