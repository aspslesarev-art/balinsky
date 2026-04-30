'use client'

import { Search } from 'lucide-react'

export function SearchBar({
  value,
  onChange,
  placeholder = 'Поиск',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <Search
        size={20}
        strokeWidth={2}
        className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-14 pl-[52px] pr-5 rounded-xl bg-[var(--color-search-bg)] text-[15px] text-[var(--color-text)] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
      />
    </div>
  )
}
