import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'presentation.estate',
  description: 'Сервис презентации проектов для застройщиков и агентов по недвижимости.',
  robots: { index: false, follow: false, nocache: true },
}

export default function PresentationHome() {
  return (
    <div className="min-h-dvh bg-[#FAFAF8] text-[#111827] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <h1 className="text-[28px] sm:text-[34px] leading-[1.15] font-semibold text-[#111827] mb-5">
            Презентационный сервис для застройщиков
          </h1>
          <p className="text-[15px] sm:text-[16px] leading-[1.6] text-[#4B5563]">
            Закрытые страницы проектов для работы с агентами по&nbsp;недвижимости.
            Материалы, шахматки юнитов и&nbsp;готовые посты — в&nbsp;одном месте.
          </p>
        </div>
      </main>
      <footer className="py-6 text-center text-[11.5px] text-[#9CA3AF]">
        Закрытый портал · по приглашению
      </footer>
    </div>
  )
}
