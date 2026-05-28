import type { Metadata } from 'next'
import { AgentSubscribeClient } from './_client'

export const metadata: Metadata = {
  title: 'Подписки на застройщиков',
  robots: { index: false, follow: false },
}

export default function AgentSubscribePage() {
  return <AgentSubscribeClient />
}
