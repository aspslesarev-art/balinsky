import { NextResponse } from 'next/server'

// Страна посетителя по IP — заголовок проставляет edge Vercel.
// Единственный потребитель: валюта по умолчанию (внутри Индонезии — рупии).
// Ответ крошечный, клиент кэширует его в localStorage, так что на браузер
// приходится один вызов в неделю.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const raw = request.headers.get('x-vercel-ip-country') ?? ''
  const country = /^[A-Z]{2}$/.test(raw) ? raw : null
  return NextResponse.json({ country }, { headers: { 'Cache-Control': 'no-store' } })
}
