'use client'

// "Скопировать пост" — copies a ready-made Telegram-style snippet
// about a complex to the clipboard. Lets the agent paste it into
// any chat in two seconds without thinking about wording.

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyPostButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback: prompt user manually if clipboard API is blocked.
      window.prompt('Скопируйте текст вручную (⌘C):', text)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F8B5F] text-white text-[12px] font-medium hover:bg-[#197551]"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Скопировано' : 'Скопировать пост'}
    </button>
  )
}
