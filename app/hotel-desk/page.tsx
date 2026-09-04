import { DeskLogin } from './_login'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Стойка · Balinsky Hotels' }

// Вход в панель стойки. Отеля тут ещё не знаем — его называет сам вошедший.
export default function DeskLoginPage() {
  return <DeskLogin />
}
